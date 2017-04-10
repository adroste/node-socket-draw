// point class
function Point(x, y) {
    this.x = x;
    this.y = y;
}

function createPointFromPoint(p) {
    return new Point(p.x, p.y);
}

// line class
function Line(strokeId, p1, p2, color) {
    this.strokeId = strokeId;
    this.p1 = createPointFromPoint(p1);
    this.p2 = createPointFromPoint(p2);
    this.color = color;
}



$(document).ready(function(){

    ///////////
    // Drawing
    ///////////

    // settings
    var enabled = true;

    // vars
    var paths = [];
    var lastPoint = new Point(-1, -1);
    var paint = false;

    // drawing context
    drawbox = $('#drawbox');
    context = drawbox[0].getContext("2d");

    // draw context settings
    context.lineJoin = "round";
    context.lineWidth = 5;

    // events
    drawbox.mousedown(function(e){
        var mouseX = e.pageX - this.offsetLeft;
        var mouseY = e.pageY - this.offsetTop;

        paint = true;
        lastPoint.x = mouseX;
        lastPoint.y = mouseY;
    });

    drawbox.mousemove(function(e){
        if(paint){
            var mouseX = e.pageX - this.offsetLeft;
            var mouseY = e.pageY - this.offsetTop;

            addLine(lastPoint, new Point(mouseX, mouseY));
            lastPoint.x = mouseX;
            lastPoint.y = mouseY;
        }
    });

    drawbox.mouseup(function(e){
        var mouseX = e.pageX - this.offsetLeft;
        var mouseY = e.pageY - this.offsetTop;
        if (lastPoint.x === mouseX && lastPoint.y === mouseY)
            addLine(lastPoint, new Point(lastPoint.x - 1, lastPoint.y - 1));
        paint = false;
    });

    drawbox.mouseleave(function(e){
        paint = false;
    });

    $('#clear').mouseup(function (e) {
        clear();
        sendClear();
    });


    // methods drawing / paths
    function addLine(p1, p2) {
        paths.push(new Line(p1, p2, $('#color').val()));
        drawPath(paths.length - 1);
        sendPath(paths.length - 1);
    }

    function drawPath(i){
        context.beginPath();
        context.strokeStyle = paths[i].color;
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

    // Nachricht senden
    function sendPath(i){
        // Socket senden
        socket.emit('path', { line: paths[i] });
    }

    function sendClear(){
        socket.emit('clear');
    }
});