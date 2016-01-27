'use strict';

const io = require('socket.io-client'),
  https = require('https'),
  spawn = require('child_process').spawn,
  pty = require('pty.js');

const server = io('http://localhost:8080/box');
let term;
const sshuser = 'asyrique' + '@'; // SET USER HERE
const sshhost = 'localhost'; // Should be localhost
const sshport = 22;
const sshauth = 'publickey,password';

function getURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    }).on('error', (e) => {
      // reject(e);
      resolve({ip: "fake-ip"});
    });
  });
}

server.on('connect', () => {
  console.log('connected to server');
  const ls = spawn('cat', ['proc/cpuinfo']);
  let printout = '';

  ls.stdout.on('data', (data) => {
    printout = printout + data.toString();
  });
  ls.stdout.on('end', () => {
    console.log('grabbed /proc/cpuinfo');
    const serialnumber = (printout.indexOf('Serial') > -1)
    ? new Promise((resolve) => {resolve(printout.slice(printout.indexOf('Serial') + 6).split(':')[1].trim());})
    : getURL('https://ip.wearevase.com')
      .then((data) => {
        return 'FakePi-' + data.ip;
      })
      .catch((err) => {
        console.log(err);
      });
    serialnumber.then((serial) => {
      server.emit('identity', {identity: serial});
    });
  });
});

server.on('term-connect', (data) => {
  console.log('Connection incoming from ' + data.source);
  term = pty.spawn('ssh', [sshuser + sshhost, '-p', sshport, '-o', 'PreferredAuthentications=' + sshauth], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30
  });
  term.on('data', (data) => {
    server.emit('output', data);
  });
  term.on('exit', (code) => {
    console.log((new Date()) + " PID=" + term.pid + " ENDED")
  });
});

server.on('resize', (data) => {
  term.resize(data.col, data.row);
});
server.on('input', (data) => {
  term.write(data);
});
server.on('term-disconnect', () => {
  console.log('Terminal disconnected');
  term.end();
});
server.on('disconnect', () => {
  console.log('Websocket disconnected');
  // Handle reconnect retry here
});
