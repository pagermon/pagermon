const express = require('express');
const logger = require('../../log');

const messagesRouter = require('./messages').router;
const capcodesRouter = require('./capcodes').router;
const usersRouter = require('./users').router;

const router = express.Router();

router.use(function (req, res, next) {
        res.locals.login = req.isAuthenticated();
        res.locals.user = req.user || false;
        next();
});

router.use(messagesRouter);
router.use(capcodesRouter);
router.use(usersRouter);

function handleError(err, req, res, next) {
        logger.main.error(err);

        const output = {
                error: {
                        name: err.name,
                        message: err.message,
                },
        };

        // Don't show true error message to user if not in development mode. Otherwise, use original message if error is not custom or use generic message.
        if (process.env.NODE_ENV === 'development') {
                output.error.stack = err.stack;
                output.error.text = err.toString();
        } else if (!err.status) output.error.message = 'Internal Server Error';

        const statusCode = err.status || 500;
        res.status(statusCode).json(output);
}

router.use(handleError);

module.exports = router;
