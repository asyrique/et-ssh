var socket = io('/control', {path: '/control/socket.io', 'forceNew':true});
var buf = '';
var connected = {
  connection: false,
  boxId: '',
};

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
});

socket.on('term-list', (data) => {
  // Change to selection logic later
  data.forEach((item) => {
    var elem = $('<div class="box"></div>');
    elem.text(item);
    elem.attr('data-boxid', item);
    elem.appendTo('.boxes');
    elem.on('click', (e) => {
      if (connected.connection) {
        socket.emit('term-disconnect', connected.boxId);
        console.log('disconnected');
        delete window.term;
        $('#terminal').remove();
        $('.console-wrapper').append('<div id="terminal" class="terminal"></div>');
      }
      lib.init(() => { // lib defined in gterm_all.js
        hterm.defaultStorage = new lib.Storage.Local(); // hterm global defined in hterm_all
        console.log('create new term');
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
      socket.emit('term-connect', $(e.currentTarget).attr('data-boxid'));
      connected.connection = true;
      connected.boxId = $(e.currentTarget).attr('data-boxid');
    });
  });
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

socket.on('box-disconnect', (id) => {
  console.log(id + ' disconnected!');
});
