const logger = require('../utils/logger');



logger.log({
    level: 'info',
    message: 'Logging info level from log method'
});

logger.debug("Logging debug");
logger.info("Logging info");
logger.warn("Logging info");
logger.error("Loggin error");