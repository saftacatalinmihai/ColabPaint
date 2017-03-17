$(document).ready( function() {
    // GLOBAL STATE VARIABLES:
    var cursors = {};

    $("#nameInput").val(readCookie("name"));

    var app = new PIXI.Application(600, 400,{antialias: true });
    $(".app").append(app.view);
    app.stage.interactive = true;
    app.stage.hitArea = new PIXI.Rectangle(0, 0, 1000, 1000);

    var graphics = new PIXI.Graphics();
    graphics.lineStyle(0);
    app.stage.addChild(graphics);

    applyEvent({"msgType": "newCursor", "cursorOwner": getName()});

    var ws = new WebSocket("ws://" + window.location.hostname + ":8080/paint");
    ws.onopen = function() {
        ws.send(JSON.stringify({"msgType": "newCursor", "cursorOwner": getName()}));
        $("#reset").click(function() {
            var event = {
                "msgType": "reset",
                "cursorOwner": getName()
            };
            applyEvent(event);
            ws.send(JSON.stringify(event))
        });
        $("#nameInput").keyup(function(){
            var event = {
                "msgType": "updateCursor",
                "cursorOwner": this.value,
                "x": cursors[getName()]["name"].x,
                "y": cursors[getName()]["name"].y
            };
            applyEvent(event);
            createCookie("name", this.value, 3);
            ws.send(JSON.stringify(event));
        });
        cursors[getName()]["name"].on('pointermove', function(e) {
            var event = {
                "msgType": "updateCursor",
                "cursorOwner": getName(),
                "x": e.data.originalEvent.pageX,
                "y": e.data.originalEvent.pageY
            };
            applyEvent(event);
            ws.send(JSON.stringify(event));
        });
        app.stage.on('pointerdown', function(){
            var event = {
                "msgType": "cursorDown",
                "cursorOwner": getName()
            };
            applyEvent(event);
            ws.send(JSON.stringify(event))
        });
        app.stage.on('pointermove', function(e) {
            var event = {
                "msgType": "cursorMove",
                "cursorOwner": getName(),
                "x": e.data.originalEvent.pageX,
                "y": e.data.originalEvent.pageY,
                "color": getColor()
            };
            applyEvent(event);
            if (cursors[getName()]["down"]) {
                ws.send(JSON.stringify(event))
            }
        });
        app.stage.on('pointerup', function() {
            var event = {
                "msgType": "cursorUp",
                "cursorOwner": getName()
            };
            applyEvent(event);
            ws.send(JSON.stringify(event))
        });

        ws.onmessage = function(e) {
            // console.log(e);
            var data = JSON.parse(e.data);
            // console.log(data);
            var cursorOwner = data["cursorOwner"];
            if (cursorOwner == getName()) {return}

            applyEvent(data)
        };
    };
    function applyEvent(event){
        switch (event["msgType"]) {
            case "newCursor":
                if (!(event["cursorOwner"] in cursors)) {
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
                }
                break;
            case "bulkDraw":
                var events = event["events"];
                events.forEach(function(ev){
                    applyEvent(ev, cursors)
                });
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
                cursors[event["cursorOwner"]]["name"] = cursors[event["cursorOwner"]];
                cursors[event["cursorOwner"]]["name"].destroy();
                delete cursors[event["cursorOwner"]];
                break;
            default:
                console.log("Unknown message type: " + event["msgType"])
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
        graphics.drawCircle(x, y, 6);
        graphics.endFill();
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
});
