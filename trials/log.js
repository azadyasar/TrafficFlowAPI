const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format ;

/**
 * Custom format type to print into log files.
 */
const customFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label} ${level.toUpperCase()}]: ${message}`;
});

/**
 * Check if the information inside the log message is private.
 * If so discard the log message.
 */
const ignorePrivate = format((info, options) => {
    if (info.private) {
        console.log("Intervening private information logging");
        return false;
    }
    return info;
});


const logger = createLogger({
    level: 'debug',
    format: combine(
        label({ label: 'ay' }),
        timestamp(),
        customFormat
    ),
    transports: [
        new transports.File({ filename: './logs/error.log', colorize: true, level: 'error', json: false}),
        new transports.File({ filename: './logs/info.log', level: 'info'}),
        new transports.File({ filename: './logs/warn.log', level: 'warn' })
        //new transports.console()
    ],
    exceptionHandlers: [
        new transports.File({ filename: 'exceptions/exceptions.log' })
    ]
});

module.exports = logger;
