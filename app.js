const axios = require('axios');
const fs = require('fs');
const path = require('path');

const urlList = ["https://api.tomtom.com/map/1/tile/basic/main/17/76136/49144.png?key=pyz5ihbPy6l84gHd2vUO0CZ5VCJaTGJA&tileSize=512&language=tr",
            'https://unsplash.com/photos/AaEQmoufHLk/download?force=true'];

async function downloadImage() {
  const url = urlList[1];
  
  const response = await axios.get(url, {
    responseType: 'stream',
  });
  
  const contentType = response.headers['content-type'];
  const imageFormat = contentType.split("/")[1];
  const path1 = path.join(__dirname, 'code.' + imageFormat);
  console.log(path1);
  const writer = fs.createWriteStream(path1);
  console.log(contentType, imageFormat);
  console.log(`Data: ${response.data}`);

  console.log("piping..");
  response.data.pipe(writer);
  console.log("piped..");

  return new Promise( (resolve, reject) => {
    writer.on('finish', () => {
      console.log("finished");
      resolve;
    });
    writer.on('error', reject);
  });
}

async function startTest() {
  await downloadImage();
}

startTest();
console.log('EOF');


































/*
const { StringDecoder } = require("string_decoder");

const TextEncoder = require("util").TextEncoder;

const decoder = new StringDecoder("utf-8");
// const queuingStrategy = new CountQueuingStrategy({ highWaterMark: 1 });

let result = "";

const writableStream = new stream.Writable({
  write(chunk, controller) {
    console.log(`Received chunk: ${chunk}, controller: ${controller}`);
    new TextDecoder

    return new Promise( (resolve, reject) => {
      var buffer = new ArrayBuffer(2);
      var view = new Uint16Array(buffer);
      view[0] = chunk;
      var decoded = decoder.decode(view, { stream: true });
      console.log(`Chunk decoded: ${decoded}`);
      result += decoded;
      resolve();
    });
  },

  close() {
    console.log("Closing stream.. Result: " + result);
  },

  abort(err) {
    console.log("Sink error: " + err);
  }
}, { highWaterMark: 1 });



let message = "Hello, World";
function sendMessage(message, _writableStream) {
  // const defaultWriter = writableStream.getWriter();
  const encoder = new TextEncoder("utf-8");
  const encoded = encoder.encode(message, { stream: true });
  
  _writableStream.on('writable', () => {
    console.log("ready");
  })
  
  /* encoded.forEach( (chunk) => {
    console.log(`encoded.forEach: ${chunk}`);
    if (_writableStream.Writable) {
      return _writableStream.write(chunk);
    }
    _writableStream.ready
    .then(() => {
      return _writableStream.write(chunk);
      })
      .then(() => {
        console.log("Chunk written to sink.");
      })
      .catch( (err) => {
        console.error("Chunk error: " + err);
      });
    });
    
    _writableStream.ready
    .then(() => {
      _writableStream.close();
    })
    .then(() => {
      console.log("All chunks are written");
    })
    .catch((err) => {
      console.log("Stream error: ", err);
    }) 
  }
sendMessage(message, writableStream); */
  /* const sPath = path.resolve(__dirname, "test.txt");
  
  function testBinarySave() {
    const obj = {
      name: 'azad',
      sayIt: () => console.log(name),
    }
  
  
    for (var i = 0; i < 1000; i++) 
      obj[`attr${i}`] = i;
  
  
    const writer = fs.createWriteStream(sPath);
    writer.write(JSON.stringify(obj, null, 2));
  
    writer.on('finish', () => {
      console.log('finished');
    });
    writer.on('error', () => {
      console.error('error');
    });
  }
  
  function testRead() {
    const src = fs.createReadStream(sPath);
  
    src.pipe(new Echostream());
  
    function printIt (chunk) {
      console.log(`chunk: ${chunk}`);
    }
  }
  
  class Echostream extends stream.Writable {
    constructor() {
      super();
    }
    _write(chunk, encoding, done) {
      console.log(`chunk: ${chunk.toString()}`);
      done();
    }
  } */