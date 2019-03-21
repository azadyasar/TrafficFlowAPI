const config = require('config');
const logger = require('./utils/logger');
const logger_test = require('./tests/logger_test');
const config_test = require('./tests/config_test');

var express= require('express');
var app = express();

var routes = require('./routes/routes')
app.use('/', routes)

var server = app.listen(3000, function(){
    console.log('Listening on port ' + server.address().port);
  });
  
