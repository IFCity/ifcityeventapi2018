var ObjectID = require('mongodb').ObjectID;


module.exports = function (app, db) {
    app.all('*', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });


    app.get('/tagslookup', (req, res) => {
        db.collection('tagslookup')
            .find({})
            .toArray((err, items) => {
                if (err) {
                    res.send({'error': 'An error has occurred'});
                } else {
                    res.send(items);
                }
            });
    });

};