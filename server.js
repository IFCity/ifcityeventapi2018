const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const db = require('./config/db');
const fb = require('./config/fb');
const app = express();

var fs = require('fs');
var http = require('http');
var https = require('https');

var privateKey  = fs.readFileSync('./cert/private.key');
var certificate = fs.readFileSync('./cert/server.crt');
var credentials = {key: privateKey, cert: certificate};

const port = 80;
app.use(express.static('dist'));
app.use(bodyParser.json());

// your express configuration here

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

MongoClient.connect(db.url, (err, database) => {
    if (err) return console.log(err);
    require('./app/routes')(app, database, fb);
    /* app.listen(port, () => {
        console.log('We are live on ' + port);
    }); */
    httpServer.listen(80, () => {
        console.log('We are live on 80');
    });
    httpsServer.listen(443, () => {
        console.log('We are live on 443');
    });
});
