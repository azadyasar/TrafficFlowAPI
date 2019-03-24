const config = require('config');
require('dotenv').config();

console.log(`Name: ${config.get('name')}`);
console.log(`Secret key from dotenv: ${process.env.JWT_SECRET_KEY}`);
console.log(config.get('jwt_secret_key'));

var express = require('express');
var app = express();

var routes = require('./src/api/routes')
app.use('/', routes)

var server = app.listen(3000, function(){
    console.log('Listening on port ' + server.address().port);
  });
  
