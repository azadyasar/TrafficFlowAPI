const logger = require('./log');


logger.log({
    level: 'info',
    message: 'Logging info level from log method'
});

logger.log({
    level: 'silly',
    message: "Logging silly from log method"
});

logger.debug("Logging debug");
logger.info("Logging info level with info method");
logger.warn("Logging warn level with warn method");
logger.error("Logging error level with error method");

