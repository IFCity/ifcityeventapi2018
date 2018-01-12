const pageRoutes = require('./page');
const eventRoutes = require('./event');
const categoryRoutes = require('./category');
const authorizationRoutes = require('./authorization');


module.exports = function(app, db, fb) {
    pageRoutes(app, db);
    eventRoutes(app, db);
    categoryRoutes(app, db);
    authorizationRoutes(app, db, fb);
};