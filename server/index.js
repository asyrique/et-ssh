'use strict';

const http = require('http'),
  server = require('socket.io'),
  path = require('path'),
  express = require('express'),
  boxList = {},
  connectedBoxes = {};


const app = express();
app.use('/', express.static(path.join(__dirname, 'public')));

const httpserv = http.createServer(app).listen(8080, () => {
    console.log('http on port ' + 8080);
});

const control = server(httpserv, {path: '/control/socket.io'})
  .of('/control')
  .on('connection', (socket) => {
    console.log('control client connected.');

    socket.on('list', () => {
      socket.emit('term-list', Object.keys(boxList));
    });

    socket.on('term-connect', (boxId) => {
      console.log('received connect signal.');
      console.log(boxId);

      let pipeStruct = {};
      pipeStruct.controlSock = socket;
      pipeStruct.boxSock = boxList[boxId];
      pipeStruct.boxId = boxId;
      connectedBoxes[boxId] = pipeStruct;

      // Notify box of incoming connection request
      pipeStruct.boxSock.emit('term-connect', {source: pipeStruct.controlSock.request.connection.remoteAddress});

      // Wire up inputs from control to box
      pipeStruct.controlSock.on('input', (data) => {
        pipeStruct.boxSock.emit('input', data);
      });
      pipeStruct.controlSock.on('resize', (data) => {
        pipeStruct.boxSock.emit('resize', data);
      });

      // Wire up responses from box to control
      pipeStruct.boxSock.on('output', (data) => {
        pipeStruct.controlSock.emit('output', data);
      });

      // Bind disconnect listeners
      pipeStruct.controlSock.on('disconnect', () => {
        pipeStruct.boxSock.emit('term-disconnect', {});
        console.log(connectedBoxes);
        delete connectedBoxes[pipeStruct.boxId];
        console.log(connectedBoxes);
      });
    });
  });

const boxes = server(httpserv)
  .of('/box')
  .on('connection', (socket) => {
    console.log((new Date()) + ' Connection accepted.');

    socket.on('identity', (data) => {
      boxList[data.identity] = socket;
    });

    socket.on('list', () => {
      console.log(boxList);
    });
  });
