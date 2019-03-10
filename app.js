const logger = require('./utils/logger');
const test_logger = require('./tests/logger_test');

// const logger = loggers.get('general-logger');

logger.info('Testing info logger from main');
logger.debug('Testing debug logger from main');
logger.warn('Testing warn logger from main');
logger.log({
    level: 'error',
    message: 'Testing error logger from main'
});

test_logger.test_logging();

