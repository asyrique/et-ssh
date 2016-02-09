'use strict';

const http = require('http'),
  server = require('socket.io'),
  path = require('path'),
  express = require('express'),
  boxList = {},
  connectedBoxes = {};

function PipeStruct(boxSock, controlSock, boxId) {
  this.boxSock = boxSock;
  this.controlSock = controlSock;
  this.boxId = boxId;
}

PipeStruct.prototype.inputpipe = function inputPipe(data) {
  this.boxSock.emit('input', data);
};
PipeStruct.prototype.resizepipe = function resizePipe(data) {
  this.boxSock.emit('resize', data);
};
PipeStruct.prototype.outputpipe = function outputPipe(data) {
  this.controlSock.emit('output', data);
};
PipeStruct.prototype.controldisconnect = function controlDisconnect(id) {
  if (id) {
    console.log('Received term-disconnect from control for ' + this.boxId + '. Client sent ' + id);
  } else {
    console.log('Control websocket disconnected');
  }
  this.boxSock.emit('term-disconnect', {});
  this.unsetListeners();
  connectedBoxes[this.boxId] = null;
  console.log('deleted object ? ' + delete connectedBoxes[this.boxId]);
};

PipeStruct.prototype.boxdisconnect = function boxDisconnect() {
  console.log('Box disconnected');
  this.controlSock.emit('box-disconnect', this.boxId);
  this.unsetListeners();
  connectedBoxes[this.boxId] = null;
  console.log('deleted object ? ' + delete connectedBoxes[this.boxId]);
};

PipeStruct.prototype.setListeners = function pipeStructSet() {
  this.controlSock.on('input', this.inputpipe.bind(this));
  this.controlSock.on('resize', this.resizepipe.bind(this));
  this.controlSock.on('term-disconnect', this.controldisconnect.bind(this));
  this.controlSock.on('disconnect', this.controldisconnect.bind(this));
  this.boxSock.on('output', this.outputpipe.bind(this));
  this.boxSock.on('box-disconnect', this.boxdisconnect.bind(this));
};

PipeStruct.prototype.unsetListeners = function pipeStructUnset() {
  // TODO: Figure out if there's a better way than removing all listeners
  this.controlSock.removeAllListeners('input');
  this.controlSock.removeAllListeners('resize');
  this.controlSock.removeAllListeners('term-disconnect');
  this.controlSock.removeAllListeners('disconnect');
  this.boxSock.removeAllListeners('output');
  this.boxSock.removeAllListeners('box-disconnect');
};

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
      console.log('received connect signal from ' + socket.request.connection.remoteAddress + ' requesting connection to ' + boxId);

      let pipeStruct = new PipeStruct(boxList[boxId], socket, boxId);
      pipeStruct.setListeners();
      connectedBoxes[boxId] = pipeStruct;

      // Notify box of incoming connection request
      pipeStruct.boxSock.emit('term-connect', {source: pipeStruct.controlSock.request.connection.remoteAddress});
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
