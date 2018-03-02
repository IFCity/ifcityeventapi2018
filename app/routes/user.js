var ObjectID = require('mongodb').ObjectID;


module.exports = function (app, db) {
    app.all('*', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });


    app.get('/users', (req, res) => {
        db.collection('users')
            .find({})
            .sort({name: 1, userID: 1})
            .toArray((err, items) => {
                if (err) {
                    res.send({'error': 'An error has occurred'});
                } else {
                    res.send(items);
                }
            });
    });

    app.get('/users/:id', (req, res) => {
        const id = req.params.id;
        const details = {'_id': new ObjectID(id)};
        db.collection('users').findOne(details, (err, item) => {
            if (err) {
                res.send({'error': 'An error has occurred'});
            } else {
                res.send(item);
            }
        });
    });

    app.put('/users/:id', (req, res) => {
        const id = req.params.id;
        const details = {'userID': id};
        db.collection('users').findOne(details, (err, item) => {
            if (err) {
                res.send({'error': 'An error has occurred'});
            } else {
                item.name = req.body.first_name + ' ' + req.body.last_name;
                db.collection('users').update(details, item, (err, result) => {
                    if (err) {
                        res.send({'error': 'An error has occurred'});
                    } else {
                        res.send(item);
                    }
                });
            }
        });
    });

};
