var term;
var socket = io('/control', {path: '/control/socket.io'});
var buf = '';

function Wetty(argv) {
  this.argv_ = argv;
  this.io = null;
  this.pid_ = -1;
}

Wetty.prototype.run = function() {
  this.io = this.argv_.io.push();

  this.io.onVTKeystroke = this.sendString_.bind(this);
  this.io.sendString = this.sendString_.bind(this);
  this.io.onTerminalResize = this.onTerminalResize.bind(this);
}

Wetty.prototype.sendString_ = function(str) {
  socket.emit('input', str);
};

Wetty.prototype.onTerminalResize = function(col, row) {
  socket.emit('resize', { col: col, row: row });
};

socket.on('connect', () => {
  socket.emit('list', {});

  lib.init(() => { // lib defined in gterm_all.js
    hterm.defaultStorage = new lib.Storage.Local(); // hterm global defined in hterm_all
    term = new hterm.Terminal(); // hterm global defined in hterm_all
    window.term = term;
    term.decorate(document.getElementById('terminal'));

    term.setCursorPosition(0, 0);
    term.setCursorVisible(true);
    term.prefs_.set('ctrl-c-copy', true);
    term.prefs_.set('ctrl-v-paste', true);
    term.prefs_.set('use-default-window-copy', true);

    term.runCommandClass(Wetty, document.location.hash.substr(1));
    socket.emit('resize', {
      col: term.screenSize.width,
      row: term.screenSize.height,
    });

    if (buf && buf !== '') {
      term.io.writeUTF16(buf);
      buf = '';
    }
  });
});

socket.on('term-list', (data) => {
  console.log('Success!');
  console.log(data);
  // Change to selection logic later
  socket.emit('term-connect', data[0]);
});

socket.on('output', (data) => {
  if (!term) {
    buf += data;
    return;
  }
  term.io.writeUTF16(data);
});

socket.on('disconnect', () => {
  console.log("Socket.io connection closed");
});
