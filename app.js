const config = require('config');
const logger = require('./utils/logger');
const logger_test = require('./tests/logger_test');
const config_test = require('./tests/config_test');
require('dotenv').config();

console.log(`Name: ${config.get('name')}`);
console.log(`Secret key from dotenv: ${process.env.JWT_SECRET_KEY}`);
console.log(config.get('jwt_secret_key'));
