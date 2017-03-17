function updateColor(picker){
    createCookie("color", picker.toHEXString(), 3);
}
function createCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}
function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
var timerID=0;
$(document).ready( function() {
    // GLOBAL STATE VARIABLES:
    var cursors = {};
    var connected = false;
    var firstConnect = true;
    var ws;
    var bufferedDrawEventList = [];

    var nameInput = $("#nameInput");
    if (readCookie("name")) {
        nameInput.val(readCookie("name"));
    }
    if (readCookie("color")) {
        document.getElementById('jscolor').jscolor.fromString(readCookie("color"));
    }

    var app = new PIXI.Application(600, 400,{antialias: true });
    $(".app").append(app.view);
    app.stage.interactive = true;
    app.stage.hitArea = new PIXI.Rectangle(0, 0, 1000, 1000);
    var graphics = new PIXI.Graphics();
    graphics.lineStyle(0);
    app.stage.addChild(graphics);

    applyEvent({"eventType": "newCursor", "cursorOwner": getName()});
    function startWebSocket(){
        console.log("WS connected");

        ws = new WebSocket("ws://" + window.location.hostname + ":8080/paint");
        ws.onopen = function() {
            if(window.timerID){ /* a setInterval has been fired */
                window.clearInterval(window.timerID);
                window.timerID=0;
            }
            connected = true;
            if (firstConnect) {
                sendEvent({"eventType": "getEvents", "cursorOwner": getName()});
                firstConnect = false;
            }
            if (bufferedDrawEventList.length > 0) {
                sendEvent({"eventType": "bulkDraw", "cursorOwner": getName(), "events": bufferedDrawEventList});
                bufferedDrawEventList = [];
            }
        };
        ws.onmessage = function(e) {
            // console.log(e);
            var data = JSON.parse(e.data);
            // console.log(data);
            var cursorOwner = data["cursorOwner"];
            if (cursorOwner == getName()) {return}
            applyEvent(data)
        };
        ws.onclose = function(){
            if(!window.timerID){ /* avoid firing a new setInterval, after one has been done */
                window.timerID=setInterval(function(){startWebSocket()}, 5000);
            }
            connected = false;
            console.log("WS disconnected");
        };
    }
    startWebSocket();

    sendEvent({"eventType": "newCursor", "cursorOwner": getName()});
    $("#reset").click(function() {
        var event = {
            "eventType": "reset",
            "cursorOwner": getName()
        };
        applyEvent(event);
        sendEvent(event)
    });
    nameInput.keyup(function(){
        createCookie("name", this.value, 3);
        var event = {
            "eventType": "updateCursor",
            "cursorOwner": this.value
        };
        applyEvent(event);
        sendEvent(event);
    });
    cursors[getName()]["name"].on('pointermove', function(e) {
        var event = {
            "eventType": "updateCursor",
            "cursorOwner": getName(),
            "x": e.data.originalEvent.pageX,
            "y": e.data.originalEvent.pageY
        };
        applyEvent(event);
        sendEvent(event);
    });
    app.stage.on('pointerdown', function(){
        var event = {
            "eventType": "cursorDown",
            "cursorOwner": getName()
        };
        applyEvent(event);
        sendEvent(event)
    });
    app.stage.on('pointermove', function(e) {
        var event = {
            "eventType": "cursorMove",
            "cursorOwner": getName(),
            "x": e.data.originalEvent.pageX,
            "y": e.data.originalEvent.pageY,
            "color": getColor()
        };
        applyEvent(event);
        if (cursors[getName()]["down"]) {
            sendEvent(event)
        }
    });
    app.stage.on('pointerup', function() {
        var event = {
            "eventType": "cursorUp",
            "cursorOwner": getName()
        };
        applyEvent(event);
        sendEvent(event)
    });

    function sendEvent(event){
        if (connected) {
            ws.send(JSON.stringify(event))
        } else {
            if ($.inArray(event["eventType"], ["newCursor", "cursorDown", "cursorMove", "cursorUp"])){
                bufferedDrawEventList.push(event);
            }
        }
    }

    function applyEvent(event){
        if (event["eventType"] == "newCursor" && !(event["cursorOwner"] in cursors)) {
            var cursorNameText = new PIXI.Text(event["cursorOwner"], {
                fontFamily: 'Arial',
                fontSize: 16,
                fill: 0xffffff,
                align: 'center'
            });
            cursorNameText.interactive = true;
            app.stage.addChild(cursorNameText);

            cursors[event["cursorOwner"]] = {
                "name": cursorNameText,
                "down": false
            };
            return;
        }
        if (!(event["cursorOwner"] in cursors)){
            applyEvent({"eventType": "newCursor", "cursorOwner": event["cursorOwner"]});
            applyEvent(event);
        }
        switch (event["eventType"]) {
            case "bulkDraw":
                var events = event["events"];
                events.forEach(function(ev){ applyEvent(ev, cursors) });
                break;
            case "reset":
                resetGraphics(graphics);
                break;
            case "updateCursor":
                cursors[event["cursorOwner"]]["name"].text = event["cursorOwner"];
                cursors[event["cursorOwner"]]["name"].x = event["x"];
                cursors[event["cursorOwner"]]["name"].y = event["y"];
                break;
            case "cursorDown":
                cursors[event["cursorOwner"]]["down"] = true;
                break;
            case "cursorMove":
                if (cursors[event["cursorOwner"]]["down"] == true) {
                    var x = event["x"];
                    var y = event["y"];
                    var color = event["color"];
                    drawCircle(x, y, graphics, color)
                }
                break;
            case "cursorUp":
                cursors[event["cursorOwner"]]["down"] = false;
                break;
            case "disconnected":
                cursors[event["cursorOwner"]]["name"].destroy();
                delete cursors[event["cursorOwner"]];
                break;
            default:
                console.log("Unknown message type: " + event["eventType"]);
                console.log(event);
        }
    }
    function resetGraphics(graphics){
        graphics.clear();
        app.stage.addChild(graphics);
    }
    function getName(){
        return $("#nameInput")[0].value
    }
    function getColor() {
        return $(".jscolor").val()
    }
    function drawCircle(x, y, graphics, color) {
        graphics.beginFill("0x"+color, 0.5);
        graphics.drawCircle(x - 10, y - 10, 6);
        graphics.endFill();
    }
});
