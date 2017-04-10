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
var paths = [];

function clear(){
    paths.splice(0, paths.length);
}

function syncpaths(paths) {
    //TODO
}


// Websocket
io.sockets.on('connection', function (socket) {

    socket.on('latency', function (data) {
        socket.emit('latency');
    });

    // wenn ein Benutzer einen Pfad sendet
    socket.on('path', function (data) {

        paths.push(data.line);

        // send to everyone but sender
        socket.broadcast.emit('path', { line: data.line });
    });

    socket.on('sync', function (data) {
        syncpaths(data.paths);

        // sync all clients
        io.sockets.emit('sync', { new: 1, paths: paths });
    });

    socket.on('clear', function (data) {
        clear();
        socket.broadcast.emit('clear');
    })
});

// Portnummer in die Konsole schreiben
console.log('Der Server läuft nun unter http://127.0.0.1:' + conf.port + '/');