$(document).ready(function(){


    var enabled = true;

    // drawing context
    context = $('#drawbox')[0].getContext("2d");
    context.strokeStyle = "#ff0000";
    context.lineJoin = "round";
    context.lineWidth = 5;

    $('#drawbox').mousedown(function(e){
        var mouseX = e.pageX - this.offsetLeft;
        var mouseY = e.pageY - this.offsetTop;

        paint = true;
        addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, 0);
        //redraw();
    });

    $('#drawbox').mousemove(function(e){
        if(paint){
            addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, 1);
            //redraw();
        }
    });

    $('#drawbox').mouseup(function(e){
        paint = false;
    });

    $('#drawbox').mouseleave(function(e){
        paint = false;
    });

    var clickX = new Array();
    var clickY = new Array();
    var clickDrag = new Array();
    var paint;

    function addClick(x, y, dragging){
        clickX.push(x);
        clickY.push(y);
        clickDrag.push(dragging);

        // draw only new part #performance
        drawPath(clickX.length - 1);
        sendPath(clickX.length - 1);
    }

    function drawPath(i){
        context.beginPath();
        if(clickDrag[i] && i){
            context.moveTo(clickX[i-1], clickY[i-1]);
        }else{
            // -1 in case you want to make a point otherwise nothing will get drawn
            context.moveTo(clickX[i]-1, clickY[i]);
        }
        context.lineTo(clickX[i], clickY[i]);
        context.closePath();
        context.stroke();
    }

    function redraw(){
        context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas

        for(var i=0; i < clickX.length; i++) {
            drawPath(i);
        }
    }

    $('#clear').mouseup(function (e) {
        clear();
        sendClear();
    });

    function clear(){
        clickX.splice(0, clickX.length);
        clickY.splice(0, clickY.length);
        clickDrag.splice(0, clickDrag.length);
        paint = false;
        redraw();
    }



    // WebSocket
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


    var socket = io.connect();


    setInterval(function() {
        startTime = Date.now();
        socket.emit('latency');
    }, 2000);

    socket.on('latency', function() {
        var t = Date.now() - startTime;
        // time out
        if (t < 10)
            calcLatencyAvg(t);
    });

    // neue Nachricht
    socket.on('path', function (data) {
        clickX.push(data.x);
        clickY.push(data.y);
        clickDrag.push(data.d);
        drawPath(clickX.length - 1);
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
        socket.emit('sync', { x: clickX, y: clickY, d: clickDrag });
    });


    socket.on('sync', function(data) {
        var state = $('#state');
        state.text("wait for sync");
        state.removeClass();
        state.addClass('text-yellow');

        enabled = false;

        if (data.new) {
            clickX = data.x;
            clickY = data.y;
            clickDrag = data.d;
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
        socket.emit('path', { x: clickX[i], y: clickY[i], d: clickDrag[i] });
    }

    function sendClear(){
        socket.emit('clear');
    }
});