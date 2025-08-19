// middlewares/admin.js
const { requireAdmin } = require('./auth');
module.exports = requireAdmin;
