let app;
let initError = null;

try {
    app = require('../admin/server');
} catch (err) {
    initError = err;
    console.error('Initialization error loading server.js:', err);
}

module.exports = (req, res) => {
    if (initError) {
        return res.status(500).json({
            error: 'API initialization failed',
            message: initError.message,
            stack: initError.stack
        });
    }

    if (req.headers && req.headers['x-matched-path']) {
        req.url = req.headers['x-matched-path'];
    }

    try {
        return app(req, res);
    } catch (err) {
        return res.status(500).json({
            error: 'Handler invocation error',
            message: err.message,
            stack: err.stack
        });
    }
};
