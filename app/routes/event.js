let ObjectID = require('mongodb').ObjectID;
let _ = require('lodash');
let moment = require('moment');
moment.locale('uk');


const getToday = () => {
    let t = new Date();
    t.setHours(0,0,0,0);
    return t.toISOString();
};

const formatPlace = place => {
    let address = _.get(place, 'location.street');
    let name = _.get(place, 'name');
    if (name) {
        if (address) {
            return `${name} (${address})`;
        } else {
            return name;
        }
    } else {
        if (address) {
            return address;
        } else {
            return ''
        }
    }
};

const formatPrice = price => {
    let from = _.get(price, 'from', -1) + '';
    let to = _.get(price, 'to', -1) + '';
    let notes = _.get(price, 'notes', -1) + '';
    if (notes !== '-1') {
        return notes;
    }
    if ((from === '-1') && (to === '-1')) {
        return '';
    }
    if ((from === '0') && (to === '-1')) {
        return 'Безкоштовно';
    }
    if ((from !== '-1') && (to !== '-1')) {
        return `${from}-${to} грн.`;
    }
    if (to !== '-1') {
        return `до ${to} грн.`;
    }
    return `${from} грн.`;
};

const formatDate = timestamp => {
    if (!timestamp) {
        return '';
    }
    let m = moment(timestamp, 'YYYY-MM-DDTHH:mm:ss');
    return m.format('YYYY-MM-DDTHH:mm:ss') + '.000Z';
};

const formatPhone = phone => {
    return phone || '';
};

const formatImageLink = cover => {
    return _.get(cover, 'source', '');
};

const categoryMap = {
    not_set: 4,
    concert: 0,
    sport: 1,
    teatr: 2,
    exibition: 3,
    film: 5,
    disco: 6,
    promo: 7,
    attention: 8
};

const formatCategory = category => {
    return _.get(categoryMap, category, 4);
};

const integrationsParseItem = item => {
    return {
        integration: {
            id: item._id,
            updatedAt: formatDate(item.updated)
        },
        place: formatPlace(item.place),
        price: formatPrice(item.price),
        phone: formatPhone(item.phone),
        startDate: formatDate(item.start_time),
        endDate: formatDate(item.end_time),
        imageLink: formatImageLink(item.cover),
        title: item.name,
        type: formatCategory(item.category),
        description: item.description || '',
        weeklyRecurrence: item.weeklyRecurrence || '',
        schedule: item.schedule || ''
    }
};

const integrationsParse = items => {
    return _(items)
        .map(item => integrationsParseItem(item))
        .value();
};

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
                        {invalid: { $ne: true}}, {
                    $or: [
                        {start_time: { $gte: today } },
                        { $and: [{start_time: { $lte: today } }, {end_time: { $gte: today } }] }
                    ]}]
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

    app.put ('/events/:id', (req, res) => {
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
                item.start_time = req.body.start_time;
                item.end_time = req.body.end_time;
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
                    res.send(items);
                }
            });
    });

    app.get('/integration/events', (req, res) => {
        let today = getToday();

        let searchCondition = {
            $and: [
                {integrate: { $eq: true}},
                {invalid: { $ne: true}},
                {
                    $or: [
                        {start_time: { $gte: today } },
                        { $and: [{start_time: { $lte: today } }, {end_time: { $gte: today } }] }
                    ]
                }
            ]
        };

        if (req.body.categories) {
            searchCondition.$and.push({
                category: {
                    $in: req.body.categories
                }
            });
        }

        if (req.body.facebookOnly) {
            searchCondition.$and.push({
                source: {
                    $eq: 'facebook'
                }
            });
        }

        if (req.body.lastUpdate) {
            searchCondition.$and.push({
                updated: {
                    $gte: req.body.lastUpdate
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
                    res.send(integrationsParse(items));
                }
            });
    });
};

