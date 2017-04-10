// guid generator
function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

// point class
function Point(x, y) {
    this.x = x;
    this.y = y;
}

function createPointFromPoint(p) {
    return new Point(p.x, p.y);
}

function distanceOfPoints(p1, p2) {
    var dx = p1.x - p2.x;
    var dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// line class
function Line(strokeId, p1, p2, color, thickness) {
    // strokeID consists of sessionID + stroke num.
    this.strokeId = strokeId;
    this.p1 = createPointFromPoint(p1);
    this.p2 = createPointFromPoint(p2);
    this.color = color;
    this.thickness = thickness;
}

function isPointOnLine(p, line, threshold) {
    return distanceOfPoints(p, line.p1) + distanceOfPoints(p, line.p2) - distanceOfPoints(line.p1, line.p2) < threshold;
}



$(document).ready(function(){

    ///////////
    // Drawing
    ///////////

    // settings
    var enabled = true;
    var sessionId = guid();

    // vars
    var paths = [];
    var lastPoint = new Point(-1, -1);
    var strokeNum = 0;
    var paint = false;
    var erase = false;

    // drawing context
    drawbox = $('#drawbox');
    context = drawbox[0].getContext("2d");

    // draw context settings
    context.lineJoin = "round";

    // events
    drawbox.mousedown(function(e){
        var mouseX = e.pageX - this.offsetLeft;
        var mouseY = e.pageY - this.offsetTop;

        if($('#eraser').prop('checked')) {
            eraseStroke(mouseX, mouseY);
            erase = true;
            return;
        }

        paint = true;
        lastPoint.x = mouseX;
        lastPoint.y = mouseY;
    });

    drawbox.mousemove(function(e){
        var mouseX = e.pageX - this.offsetLeft;
        var mouseY = e.pageY - this.offsetTop;

        if(paint){
            addLine(lastPoint, new Point(mouseX, mouseY));
            lastPoint.x = mouseX;
            lastPoint.y = mouseY;
        }
        else if (erase) {
            eraseStroke(mouseX, mouseY);
        }
    });

    drawbox.mouseup(function(e){
        var mouseX = e.pageX - this.offsetLeft;
        var mouseY = e.pageY - this.offsetTop;
        if (paint && lastPoint.x === mouseX && lastPoint.y === mouseY)
            addLine(lastPoint, new Point(lastPoint.x - 1, lastPoint.y - 1));
        paint = false;
        erase = false;
        strokeNum++;
    });

    drawbox.mouseleave(function(e){
        paint = false;
        erase = false;
    });

    $('#clear').mouseup(function (e) {
        clear();
        sendClear();
    });


    // methods drawing / paths
    function addLine(p1, p2) {
        var thickness = 5;
        if ($('#radio_thickness_s').prop('checked'))
            thickness = 2;
        else if ($('#radio_thickness_l').prop('checked'))
            thickness = 8;

        paths.push(new Line(sessionId + '_' + strokeNum, p1, p2, $('#color').val(), thickness));
        drawPath(paths.length - 1);
        sendPath(paths.length - 1);
    }

    function drawPath(i){
        context.beginPath();
        context.strokeStyle = paths[i].color;
        context.lineWidth = paths[i].thickness;
        context.moveTo(paths[i].p1.x, paths[i].p1.y);
        context.lineTo(paths[i].p2.x, paths[i].p2.y);
        context.closePath();
        context.stroke();
    }

    function redraw(){
        context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas

        for(var i=0; i < paths.length; i++) {
            drawPath(i);
        }
    }

    function clear(){
        paths.splice(0, paths.length);
        paint = false;
        redraw();
    }

    function eraseStroke(x, y) {
        // find stroke to remove
        var ids = [];
        for (var i = 0; i < paths.length; i++) {
            if (isPointOnLine(new Point(x, y), paths[i], paths[i].thickness)) {
                ids.push(paths[i].strokeId);
            }
        }
        sendRemoveLines(ids);
        removeLinesByID(ids);
    }

    function removeLinesByID(ids) {
        // remove strokes
        for (var j = 0; j < ids.length; j++) {
            var k = paths.length;
            while (k--) {
                if (paths[k].strokeId === ids[j])
                    paths.splice(k, 1);
            }
        }
        redraw();
    }


    /////////////
    // WebSocket
    /////////////

    var socket = io.connect();

    // latency
    var latencyavg = 0;
    var latencymax = 0;
    var latencynr = 0;

    function calcLatencyAvg(newVal) {
        latencymax = Math.max(latencymax, newVal);
        latencyavg = (latencyavg * latencynr + newVal) / (latencynr + 1);
        latencynr = latencynr + 1;
         //reset after some time
        if (latencynr > 10)
            latencynr = 0;

        $('#latency').text(Math.round(latencyavg) + " (max: " + latencymax + ")");
    }

    var startTime = 0;

    setInterval(function() {
        startTime = Date.now();
        socket.emit('latency');
    }, 2000);

    // events
    socket.on('latency', function() {
        var t = Date.now() - startTime;
        // time out
        if (t < 10000)
            calcLatencyAvg(t);
    });

    socket.on('path', function (data) {
        paths.push(data.line);
        drawPath(paths.length - 1);
    });

    socket.on('clear', function (data) {
        clear();
    });

    socket.on('removeLines', function (data) {
        removeLinesByID(data.ids);
    });

    socket.on('connect', function (e) {
        var state = $('#state');
        state.text("wait for sync");
        state.removeClass();
        state.addClass('text-yellow');

        enabled = false;
        socket.emit('sync', { paths: paths });
    });


    socket.on('sync', function(data) {
        var state = $('#state');
        state.text("wait for sync");
        state.removeClass();
        state.addClass('text-yellow');

        enabled = false;

        if (data.new) {
            paths = data.paths;
            redraw();
        }

        state.text("connected");
        state.removeClass();
        state.addClass('text-green');

        enabled = true;
    });

    socket.on('connect_error', function (e) {
        var state = $('#state');
        state.text("not connected");
        state.removeClass();
        state.addClass('text-red');

        // if app looses connection before server sends sync message
        enabled = true;
    });

    // send methods
    function sendPath(i){
        socket.emit('path', { line: paths[i] });
    }

    function sendClear(){
        socket.emit('clear');
    }

    function sendRemoveLines(ids) {
        socket.emit('removeLines', { ids: ids });
    }
});