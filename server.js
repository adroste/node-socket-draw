var express = require('express')
    ,   app = express()
    ,   server = require('http').createServer(app)
    ,   io = require('socket.io').listen(server)
    ,   conf = require('./config.json');

// Webserver
// auf den Port x schalten
server.listen(conf.port);


// statische Dateien ausliefern
app.use(express.static(__dirname + '/public'));


// wenn der Pfad / aufgerufen wird
app.get('/', function (req, res) {
    // so wird die Datei index.html ausgegeben
    res.sendfile(__dirname + '/public/index.html');
});


// data
var clickX = new Array();
var clickY = new Array();
var clickDrag = new Array();

function clear(){
    clickX.splice(0, clickX.length);
    clickY.splice(0, clickY.length);
    clickDrag.splice(0, clickDrag.length);
}

function syncarrays(x, y, d) {
    //TODO
}


// Websocket
io.sockets.on('connection', function (socket) {

    socket.on('latency', function (data) {
        socket.emit('latency');
    });

    // wenn ein Benutzer einen Pfad sendet
    socket.on('path', function (data) {

        clickX.push(data.x);
        clickY.push(data.y);
        clickDrag.push(data.d);

        // send to everyone but sender
        socket.broadcast.emit('path', { t: data.t, x: data.x, y: data.y, d: data.d });
    });

    socket.on('sync', function (data) {
        syncarrays(data.x, data.y, data.d);

        // sync all clients
        io.sockets.emit('sync', { new: 1, x: clickX, y: clickY, d: clickDrag });
    });

    socket.on('clear', function (data) {
        clear();
        socket.broadcast.emit('clear');
    })
});

// Portnummer in die Konsole schreiben
console.log('Der Server läuft nun unter http://127.0.0.1:' + conf.port + '/');