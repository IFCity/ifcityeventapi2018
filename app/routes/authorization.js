const fetch = require('node-fetch');

module.exports = function(app, db, fb) {

    app.post('/authorization/gettoken', (req, res) => {
        const url = `${fb.url}/oauth/access_token?grant_type=fb_exchange_token&client_id=${fb.appId}&client_secret=${fb.secret}&fb_exchange_token=${req.body.shortLiveToken}`;
        fetch(url)
            .then(response => {
                return response.json();
            })
            .then(json => {
                const id = req.body.userId;
                const details = { 'userID': id };
                db.collection('users').findOne(details, (err, item) => {
                    if (err) {
                        res.send({'error': 'An error has occurred'});
                    } else {
                        if (item) {
                            item.accessToken = json.access_token;
                            db.collection('users').update(details, item, (err, result) => {
                                if (err) {
                                    res.send({'error':'An error has occurred'});
                                } else {
                                    res.send(item);
                                }
                            });
                        } else {
                            item = {
                                userID: req.body.userId,
                                accessToken: json.access_token,
                                role: 'user'
                            };
                            db.collection('users').insert(item, (err, result) => {
                                if (err) {
                                    res.send({ 'error': err });
                                } else {
                                    res.send(result.ops[0]);
                                }
                            });
                        }
                    }
                });
            })
            .catch(ex => {
                console.log(ex);
                res.send({'error': 'An error has occurred'});
            });
    });
};
