const logger = require('../utils/logger');

const test_logging = () => {
    var funName = arguments.callee.name;
    console.log(funName);
    console.log(test_logging.name);
    console.log(module.name);
    console.log(new Error().stack);
    console.error('aaa')
    console.trace("here I am");
    logger.log({
        level: 'info',
        message: '[TEST]Logging info level from log method'
    });

    logger.debug("[TEST] Logging debug");
    logger.info("[TEST] Logging info");
    logger.warn("[TEST] Logging info");
    logger.error("[TEST] Loggin error");
};

module.exports = {
    test_logging
};
