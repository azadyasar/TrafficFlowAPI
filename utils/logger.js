const { createLogger, format, transports } = require('winston')
const { combine, timestamp, label, printf } = format;

/**
 * Custom format type to print into log files
 * Structure:
 * timestamp - label of the logger - log level (error, warn, info, etc.) - message
 */
const customFormat = printf( ({ level, message, label, timestamp }) => {
    return `${timestamp} [${label} ${level.toUpperCase()}]: ${message}`;
});


const logger = createLogger({
    level: 'debug',
    format: combine(
        label({ label: 'label' }),
        timestamp(),
        customFormat
    ),
    transports: [
        new transports.File({ filename: 'logs/error.log', level: 'error', colorize: true }),
        new transports.File({ filename: 'logs/warn.log', level: 'warn', colorize: true }),
        new transports.File({ filename: 'logs/info.log', level: 'info', colorize: true }),
        new transports.File({ filename: 'logs/debug.log', level: 'debug', colorize: true })
    ],
    exceptionHandlers: [
        new transports.File({ filename: 'logs/exceptions.log', colorize: true })
    ]
});

module.exports = logger;