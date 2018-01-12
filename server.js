const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const db = require('./config/db');
const fb = require('./config/fb');
const app = express();

const port = 80;
app.use(bodyParser.json());
MongoClient.connect(db.url, (err, database) => {
    if (err) return console.log(err);
    require('./app/routes')(app, database, fb);
    app.listen(port, () => {
        console.log('We are live on ' + port);
    });
});
