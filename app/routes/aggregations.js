let moment = require('moment');
moment.locale('uk');


const getToday = () => {
    return moment(moment().format('YYYY-MM-DDT00:00:00[+0200]')).toISOString();
};

module.exports = function (app, db) {
    app.all('*', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });


    app.get('/authors', (req, res) => {
        let today = getToday();
        db.collection('events')
            .aggregate(
                [
                    {
                        $match: {
                            $and: [{
                                invalid: {$ne: true},
                                hidden: {$ne: true}
                            }],
                            $or: [
                                {start_time: {$gte: today}},
                                {$and: [{start_time: {$lte: today}}, {end_time: {$gte: today}}]}
                            ]
                        }
                    },
                    {
                        $group: {
                            _id: "$author",
                            events: { $push: "$$ROOT" },
                            count: {$sum: 1}
                        }
                    }
                ]
            )
            .sort({count: -1})
            .toArray((err, items) => {
                if (err) {
                    res.send({'error': 'An error has occurred'});
                } else {
                    res.send(items);
                }
            });
    });
};
