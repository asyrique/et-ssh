'use strict';

const io = require('socket.io-client'),
      readline = require('readline'),
      https = require('https'),
      spawn = require('child_process').spawn;

const server = io('http://localhost:8080/box');

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
      reject(e);
    });
  });
}

server.on('connect', () => {
  console.log('connected to server');
  const ls = spawn('cat', ['/proc/cpuinfo']);
  let printout = '';
  let serialnumber = '';

  ls.stdout.on('data', (data) => {
    printout = printout + data.toString();
  });
  ls.stdout.on('end', () => {
    console.log("exit");
    serialnumber = (printout.indexOf('Serial') > -1)
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
process.stdin.setEncoding('utf8');
const rl = readline.createInterface({
  input: process.stdin,
});
rl.prompt();
rl.on('line', (line) => {
  server.emit('list', {line: line});
});
