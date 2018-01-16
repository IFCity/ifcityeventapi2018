let ObjectID = require('mongodb').ObjectID;
let _ = require('lodash');
let moment = require('moment');


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
                    $and: [{invalid: { $ne: true}}, {
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
        db.collection('events').insert(req.body, (err, result) => {
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
        db.collection('events').findOne(details, (err, item) => {
            if (err) {
                res.send({'error':'An error has occurred'});
            } else {
                //item = req.body;
                if (req.body.name) {
                    item.name = req.body.name;
                }
                if (req.body.category) {
                    item.category = req.body.category;
                }
                if (req.body.description || req.body.description === '') {
                    item.description = req.body.description;
                }
                if (req.body.start_time) {
                    item.start_time = req.body.start_time;
                }
                if (req.body.end_time) {
                    item.end_time = req.body.end_time;
                }
                if (req.body.price) {
                    item.price = req.body.price;
                }
                if (req.body.date) {
                    item.date = req.body.date;
                }
                if (req.body.cover) {
                    item.cover = req.body.cover;
                }
                item.invalid = !!req.body.invalid;
                item.integrate = !!req.body.integrate;
                item.promo = !!req.body.promo;
                if (req.body.updated) {
                    item.updated = req.body.updated;
                }
                if (req.body.added) {
                    item.added = req.body.added;
                }
                if (req.body.source) {
                    item.source = req.body.source;
                }
                if (req.body.tags) {
                    item.tags = req.body.tags;
                }
                if (req.body.author) {
                    item.author = req.body.author;
                }
                if (req.body.place) {
                    item.place = req.body.place;
                }
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
            $and: [
                {invalid: { $ne: !req.body.show_invalid}},
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

