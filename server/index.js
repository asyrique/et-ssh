'use strict';

const http = require('http'),
      server = require('socket.io'),
      fs = require('fs'),
      path = require('path'),
      boxList = {};

function handler (req, res) {
  res.writeHead(200);
  res.end('Hello World!');
}

const httpserv = http.createServer(handler).listen(8080, () => {
    console.log('http on port ' + 8080);
});

let boxes = server(httpserv)
  .of('/box')
  .on('connection', (socket) => {
    console.log((new Date()) + ' Connection accepted.');

    socket.on('identity', (data) => {
      boxList[data.identity] = socket;
    });

    socket.on('data-here', (data) => {
      console.log(data.line);
    });

    socket.on('list', () => {
      console.log(boxList);
    })
  });

  let control = server(httpserv)
    .of('/control')
    .on('connection', (socket) => {

    });
