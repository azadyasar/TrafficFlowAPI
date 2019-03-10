const logger_test = require('./logger_test');
const config_test = require('./config_test');
const chalk = require('chalk');

console.log(chalk.cyan("Testing logger.js"));
logger_test.testBasicLogging();

console.log(chalk.cyan("Testing config"));
config_test.testBasicConfig();
