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
const MOST_VIEWED_LIMIT = 10;

module.exports = function(app, db) {
    app.all('*', function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });


    app.get('/events', (req, res) => {
        let today = getToday();
        db.collection('events')
            .find(
                {
                    $and: [
                        {invalid: { $ne: true}},
                        {hidden: { $ne: true}},
                        {
                            $or: [
                                {start_time: { $gte: today } },
                                { $and: [{start_time: { $lte: today } }, {end_time: { $gte: today } }] }
                            ]
                        }
                    ]
                }
            )
            .sort({start_time: 1, name: 1})
            .toArray((err, items) => {
                if (err) {
                    res.send({'error':'An error has occurred'});
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
                        {invalid: { $ne: true}},
                        {hidden: { $ne: true}},
                        {
                            $or: [
                                {start_time: { $gte: today } },
                                { $and: [{start_time: { $lte: today } }, {end_time: { $gte: today } }] }
                            ]
                        }
                    ]
                }
            )
            .sort({view_count: -1, start_time: 1, name: 1})
            .limit(MOST_VIEWED_LIMIT)
            .toArray((err, items) => {
                if (err) {
                    res.send({'error':'An error has occurred'});
                } else {
                    res.send(items);
                }
            });
    });

    app.get('/events/fb/:id', (req, res) => {
        const id = req.params.id;
        const details = { 'id': id };
        db.collection('events').findOne(details, (err, item) => {
            if (err) {
                res.send({'error':'An error has occurred'});
            } else {
                res.send(item);
            }
        });
    });

    app.get('/events/:id', (req, res) => {
        const id = req.params.id;
        const details = { '_id': new ObjectID(id) };
        db.collection('events').findOne(details, (err, item) => {
            if (err) {
                res.send({'error':'An error has occurred'});
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
                event.end_time = moment(event.end_time).toISOString();
                return event;
            })
            .value();
        db.collection('events').insert(events, (err, result) => {
            if (err) {
                res.send({ 'error': err });
            } else {
                res.send(result.ops);
            }
        });
    });

    app.put('/events/:id', (req, res) => {
        const id = req.params.id;
        const details = { '_id': new ObjectID(id) };
        const now = new Date(Date.now()).toISOString();
        db.collection('events').findOne(details, (err, item) => {
            if (err) {
                res.send({'error':'An error has occurred'});
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
                db.collection('events').update(details, item, (err, result) => {
                    if (err) {
                        res.send({'error':'An error has occurred'});
                    } else {
                        res.send(item);
                    }
                });

            }
        });
    });

    app.delete('/events/:id', (req, res) => {
        const id = req.params.id;
        const details = { '_id': new ObjectID(id) };
        db.collection('events').remove(details, (err, item) => {
            if (err) {
                res.send({'error':'An error has occurred'});
            } else {
                res.send(item);
            }
        });
    });

    app.put('/events/view/:id', (req, res) => {
        const id = req.params.id;
        const details = { '_id': new ObjectID(id) };
        db.collection('events').findOne(details, (err, item) => {
            if (err) {
                res.send({'error':'An error has occurred'});
            } else {
                item.view_count = (item.view_count || (item.view_count === 0)) ? item.view_count + 1 : 1;
                db.collection('events').update(details, item, (err, result) => {
                    if (err) {
                        res.send({'error':'An error has occurred'});
                    } else {
                        res.send(item);
                    }
                });

            }
        });
    });

    app.post('/events/search', (req, res) => {
        let today = getToday();
        let searchCondition = {
            $and: []
        };
        const showInvalid = !!req.body.show_invalid;
        const showHidden = !!req.body.show_hidden;
        if (!showInvalid) {
            searchCondition.$and.push({
                invalid: { $ne: true }
            });
        }
        if (!showHidden) {
            searchCondition.$and.push({
                hidden: { $ne: true }
            });
        }
        if (!req.body.show_all) {
            searchCondition.$and.push({
                $or: [
                    {start_time: { $gte: today } },
                    { $and: [{start_time: { $lte: today } }, {end_time: { $gte: today } }] }
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
        db.collection('events')
            .find(searchCondition)
            .sort({start_time: 1, name: 1})
            .toArray((err, items) => {
                if (err) {
                    res.send({'error':'An error has occurred'});
                } else {
                    //smart sorting
                    const today = moment();
                    const isToday = event => {
                        let result = moment(event.start_time).format('YYYY-MM-DD') <= today.format('YYYY-MM-DD');
                        if (result) {
                            if (!event.weeklyRecurrence) {
                                result = true;
                            } else {
                                const days = bitToDays(event.weeklyRecurrence);
                                result = days[moment().day()];
                            }
                        }
                        return result;
                    };
                    let todayEvents = _(items)
                        .filter(event => isToday(event))
                        .orderBy(event => moment(event.update_time))
                        .reverse()
                        .value();
                    let laterEvents = _(items)
                        .filter(event => !isToday(event))
                        .value();
                    res.send([...todayEvents, ...laterEvents]);
                }
            });
    });
};

