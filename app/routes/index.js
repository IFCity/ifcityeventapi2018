const pageRoutes = require('./page');
const eventRoutes = require('./event');
const categoryRoutes = require('./category');
const usereRoutes = require('./user');
const authorizationRoutes = require('./authorization');
const aggregationsRoutes = require('./aggregations');
const tagsLookupRoutes = require('./tagslookup');


module.exports = function(app, db, fb) {
    pageRoutes(app, db);
    eventRoutes(app, db);
    categoryRoutes(app, db);
    usereRoutes(app, db);
    authorizationRoutes(app, db, fb);
    aggregationsRoutes(app, db);
    tagsLookupRoutes(app, db);
};