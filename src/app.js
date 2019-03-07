var express = require("express");
var app = express();
const request = require('request');


app.listen(3000, () => {
 console.log("Server running on port 3000");
});

// //localhost:3000/url route on listen
// app.get("/url", (req, res, next) => {
//     res.json(["Tony","Lisa","Michael","Ginger","Food"]);
//    });
   
var input_X
var input_Y

// make request from browser such as http://localhost:3000/?X=40.972949&Y=29.254903
app.get('/', function (req, res) {
  res.send('Listening /')
  console.log(req.query);
  console.log(req.query.X)
  console.log(req.query.Y)
  input_X = req.query.X  
  input_Y = req.query.Y
  
  res.on("finish", function() {
    console.log("done")
    external_request()
});
  
})


// requires unrestricted network 
function external_request(){
var baseUrl = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/22/xml'
var key = 'VKqgZWu9YLsgzzeEfiikfqx2r9k61825'
// var point_X = 40.972949
// var point_Y = 29.254903
var point_X = input_X
var point_Y = input_Y
var url = `${baseUrl}?key=${key}&point=${point_X},${point_Y}`

console.log('\n')
console.log(`requesting url -> ${url}`)
console.log(`given points -> ${point_X}, ${point_Y}`)
console.log('\n\n')

request(url, { json: true }, (err, res, body) => {
  if (err) { return console.log(err); }
  console.log(body);
});

}
