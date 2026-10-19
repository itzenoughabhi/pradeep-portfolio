const app = require('../admin/server');

module.exports = (req, res) => {
  return app(req, res);
};
