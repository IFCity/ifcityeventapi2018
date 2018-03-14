let ObjectID = require('mongodb').ObjectID;
let _ = require('lodash');
let moment = require('moment');
moment.locale('uk');


const getToday = () => {
    return moment(moment().format('YYYY-MM-DDT00:00:00[+0200]')).toISOString();
};

const ALL_DAYS = [2, 4, 8, 16, 32, 64, 128];
const bitToDays = bits => {
    let result = [];
    for (let i = 0; i < ALL_DAYS.length; i++) {
        result.push(!!(bits & ALL_DAYS[i]));
    }
    return result;
};
const MOST_VIEWED_LIMIT = 20;

const parseEvents = (items, body) => {
    let filteredEvents = _(items)
        .map(item => {
            const todayButTime = moment(item.start_time).set({
                'year': moment().get('year'),
                'month': moment().get('month'),
                'date': moment().get('date')
            });
            item.startCalcDate = moment(item.start_time) < moment() ? todayButTime.format('YYYY-MM-DDTHH:mm:00[+0200]') : item.start_time;
            if (item.weeklyRecurrence) {
                const days = bitToDays(item.weeklyRecurrence);
                const todayDayNumber = moment(item.startCalcDate).day();
                let newDays = [];
                for (let i = todayDayNumber; i < ALL_DAYS.length; i++) {
                    newDays.push(days[i]);
                }
                for (let i = 0; i < todayDayNumber; i++) {
                    newDays.push(days[i]);
                }
                for (let i = 0; i < newDays.length; i++) {
                    if (newDays[i]) {
                        item.startCalcDate = moment(item.startCalcDate).add(i, 'days').format('YYYY-MM-DDTHH:mm:00.000[+0200]');
                        break;
                    }
                }
            }
            return item;
        })
        .orderBy([item => moment(item.startCalcDate)])
        .value();
    if (body.weekend) {
        filteredEvents = _(filteredEvents)
            .filter(item => {
                if (!item.weeklyRecurrence) {
                    return true;
                }
                const days = bitToDays(item.weeklyRecurrence);
                return days[6] || days[7];
            })
            .value();
    }
    /* if (req.body.page) {
        const page = parseInt(req.body.page || 1);
        const itemsPerPage = parseInt(req.body.itemsPerPage || 5);
        res.send(filteredEvents.slice((page - 1) * itemsPerPage, itemsPerPage));
    } else { */
    return filteredEvents;
    // }
};

module.exports = function (app, db) {
    app.all('*', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });


    app.get('/events', (req, res) => {
        const today = moment().format('YYYY-MM-DDT00:00:00.000[Z]');
        db.collection('events')
            .aggregate([
                {
                    $match: {
                        $and: [
                            {invalid: {$ne: true}},
                            {hidden: {$ne: true}},
                            {
                                $or: [
                                    {start_time: {$gte: today}},
                                    {$and: [{start_time: {$lte: today}}, {end_time: {$gte: today}}]}
                                ]
                            }
                        ]
                    }
                },
                {
                    $addFields: {
                        startCalcDate: {
                            $cond: {if: {$lt: ["$start_time", today]}, then: today, else: "$start_time"}
                        }
                    }
                }
            ])
            .sort({startCalcDate: 1, update_time: 1, name: 1})
            .toArray((err, items) => {
                if (err) {
                    res.send({'error': 'An error has occurred'});
                } else {
                    res.send(items);
                }
            });
    });

    app.get('/events/mostviewed', (req, res) => {
        let today = getToday();
        db.collection('events')
            .find(
                {
                    $and: [
                        {invalid: {$ne: true}},
                        {hidden: {$ne: true}},
                        {
                            $or: [
                                {start_time: {$gte: today}},
                                {$and: [{start_time: {$lte: today}}, {end_time: {$gte: today}}]}
                            ]
                        }
                    ]
                }
            )
            .sort({editorChoice: -1, view_count: -1, start_time: 1, name: 1})
            .limit(MOST_VIEWED_LIMIT)
            .toArray((err, items) => {
                if (err) {
                    res.send({'error': 'An error has occurred'});
                } else {
                    let filteredEvents = _(items)
                        .map(item => {
                            const todayButTime = moment(item.start_time).set({
                                'year': moment().get('year'),
                                'month': moment().get('month'),
                                'date': moment().get('date')
                            });
                            item.startCalcDate = moment(item.start_time) < moment() ? todayButTime.format('YYYY-MM-DDTHH:mm:00[+0200]') : item.start_time;
                            if (item.weeklyRecurrence) {
                                const days = bitToDays(item.weeklyRecurrence);
                                const todayDayNumber = moment(item.startCalcDate).day();
                                let newDays = [];
                                for (let i = todayDayNumber; i < ALL_DAYS.length; i++) {
                                    newDays.push(days[i]);
                                }
                                for (let i = 0; i < todayDayNumber; i++) {
                                    newDays.push(days[i]);
                                }
                                for (let i = 0; i < newDays.length; i++) {
                                    if (newDays[i]) {
                                        item.startCalcDate = moment(item.startCalcDate).add(i, 'days').format('YYYY-MM-DDTHH:mm:00.000[+0200]');
                                        break;
                                    }
                                }
                            }
                            return item;
                        })
                        .value();
                    res.send(filteredEvents);
                }
            });
    });

    app.get('/events/fb/:id', (req, res) => {
        const id = req.params.id;
        const details = {'id': id};
        db.collection('events').findOne(details, (err, item) => {
            if (err) {
                res.send({'error': 'An error has occurred'});
            } else {
                res.send(item);
            }
        });
    });

    app.get('/events/:id', (req, res) => {
        const id = req.params.id;
        const details = {'_id': new ObjectID(id)};
        db.collection('events').findOne(details, (err, item) => {
            if (err) {
                res.send({'error': 'An error has occurred'});
            } else {
                res.send(item);
            }
        });
    });

    app.post('/events', (req, res) => {
        const now = new Date(Date.now()).toISOString();
        const events = _(req.body)
            .map(event => {
                event.create_time = now;
                event.update_time = now;
                event.view_count = 0;
                event.isSync = false;
                event.start_time = moment(event.start_time).toISOString();
                if (event.end_time) {
                    event.end_time = moment(event.end_time).toISOString();
                } else {
                    event.end_time = undefined;
                }
                return event;
            })
            .value();
        db.collection('events').insert(events, (err, result) => {
            if (err) {
                res.send({'error': err});
            } else {
                res.send(result.ops);
            }
        });
    });

    app.put('/events/:id', (req, res) => {
        const id = req.params.id;
        const details = {'_id': new ObjectID(id)};
        const now = new Date(Date.now()).toISOString();
        db.collection('events').findOne(details, (err, item) => {
            if (err) {
                res.send({'error': 'An error has occurred'});
            } else {
                item.update_time = now;
                item.name = req.body.name;
                item.category = req.body.category;
                item.description = req.body.description;
                item.start_time = moment(req.body.start_time).toISOString();
                item.end_time = moment(req.body.end_time).toISOString();
                item.price = req.body.price;
                item.cover = req.body.cover;
                item.invalid = !!req.body.invalid;
                item.hidden = !!req.body.hidden;
                item.source = req.body.source;
                item.tags = req.body.tags;
                item.author = req.body.author;
                item.place = req.body.place;
                item.weeklyRecurrence = req.body.weeklyRecurrence;
                item.phone = req.body.phone;
                item.ticketUrl = req.body.ticketUrl;
                item.tags = req.body.tags;
                item.metadata = req.body.metadata;
                item.isSync = req.body.isSync;
                item.syncId = req.body.syncId;
                item.editorChoice = !!req.body.editorChoice;
                db.collection('events').update(details, item, (err, result) => {
                    if (err) {
                        res.send({'error': 'An error has occurred'});
                    } else {
                        res.send(item);
                    }
                });

            }
        });
    });

    app.delete('/events/:id', (req, res) => {
        const id = req.params.id;
        const details = {'_id': new ObjectID(id)};
        db.collection('events').remove(details, (err, item) => {
            if (err) {
                res.send({'error': 'An error has occurred'});
            } else {
                res.send(item);
            }
        });
    });

    app.put('/events/view/:id', (req, res) => {
        const id = req.params.id;
        const details = {'_id': new ObjectID(id)};
        db.collection('events').findOne(details, (err, item) => {
            if (err) {
                res.send({'error': 'An error has occurred'});
            } else {
                item.view_count = (item.view_count || (item.view_count === 0)) ? item.view_count + 1 : 1;
                db.collection('events').update(details, item, (err, result) => {
                    if (err) {
                        res.send({'error': 'An error has occurred'});
                    } else {
                        res.send(item);
                    }
                });

            }
        });
    });

    app.post('/events/search', (req, res) => {
        const today = getToday();
        let searchCondition = {
            $and: []
        };
        const showInvalid = !!req.body.show_invalid;
        const showHidden = !!req.body.show_hidden;
        const showNotSync = !!req.body.show_not_sync;
        if (!showInvalid) {
            searchCondition.$and.push({
                invalid: {$ne: true}
            });
        }
        if (!showHidden) {
            searchCondition.$and.push({
                hidden: {$ne: true}
            });
        }
        if (showNotSync) {
            searchCondition.$and.push({
                isSync: {$ne: true}
            });
        }
        if (!req.body.show_all) {
            searchCondition.$and.push({
                $or: [
                    {start_time: {$gte: today}},
                    {$and: [{start_time: {$lte: today}}, {end_time: {$gte: today}}]}
                ]
            });
        }
        if (req.body.new) {
            searchCondition.$and.push({
                $and: [
                    {update_time: {$lt: moment().hours(0).minutes(0).seconds(0).milliseconds(0).add(1, 'days').toISOString()}},
                    {update_time: {$gte: moment().hours(0).minutes(0).seconds(0).milliseconds(0).toISOString()}}
                ]
            });
        }
        if (req.body.categories) {
            searchCondition.$and.push({
                category: {
                    $in: req.body.categories
                }
            });
        }
        if (req.body.tag) {
            const tags = _(req.body.tag.split(','))
                .map(item => ({tags: {$regex: `.*${item.trim()}.*`}}))
                .value();
            if (tags.length > 1) {
                searchCondition.$and.push({
                    $or: tags
                });
            } else {
                searchCondition.$and.push(tags[0]);
            }
        }
        if (req.body.weekend) {
            const from = moment().day(6).format('YYYY-MM-DDT00:00:00[+0200]');
            const to = moment().day(7).add(1, 'day').format('YYYY-MM-DDT00:00:00[+0200]');
            searchCondition.$and.push({
                $or: [
                    {$and: [{start_time: {$lte: to}}, {start_time: {$gte: from}}]},
                    {$and: [{start_time: {$lte: to}}, {end_time: {$gte: from}}]}
                ]
            });
        }
        db.collection('events')
            .aggregate([
                {
                    $match: searchCondition
                },
                {
                    $addFields: {
                        startCalcDate: {
                            $cond: {if: {$lt: ["$start_time", today]}, then: today, else: "$start_time"}
                        }
                    }
                }
            ])
            .sort({startCalcDate: 1, update_time: -1, name: 1})
            .toArray((err, items) => {
                if (err) {
                    res.send({'error': 'An error has occurred'});
                } else {
                    const result = parseEvents(items, req.body);
                    res.send(result);
                }
            });
    });
};

