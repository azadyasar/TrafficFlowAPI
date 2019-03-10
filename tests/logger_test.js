const logger = require('../utils/logger');
const { sep:path_separator } = require('path');

// Get the name of current module (aka filename)
var filenameTokens = __filename.split(path_separator);
const currentModuleName = filenameTokens[filenameTokens.length - 1];

const testBasicLogging = () => {
    logger.log({
        level: 'info',
        message: currentModuleName + ' Logging info level from log method'
    });

    logger.debug(`[${currentModuleName}] Logging debug`);
    logger.info(`[${currentModuleName}] Logging info`);
    logger.warn(`[${currentModuleName}] Logging info`);
    logger.error(`[${currentModuleName}] Loggin error`);
};

module.exports = {
    testBasicLogging: testBasicLogging
};
