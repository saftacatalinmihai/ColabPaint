$(document).ready( function() {
    // GLOBAL STATE VARIABLES:
    var cursors = {};
    var pointerDown = false;

    var app = new PIXI.Application(600, 400,{antialias: true });
    $(".app").append(app.view);
    app.stage.interactive = true;
    app.stage.hitArea = new PIXI.Rectangle(0, 0, 1000, 1000);

    var nameText = new PIXI.Text(getName(), {fontFamily : 'Arial', fontSize: 16, fill : 0xffffff, align : 'center'});
    nameText.interactive = true;
    nameText.x = 30;
    nameText.y = 90;
    app.stage.addChild(nameText);

    var graphics = new PIXI.Graphics();
    graphics.lineStyle(0);
    app.stage.addChild(graphics);


    var ws = new WebSocket("ws://" + window.location.hostname + ":8080/chat");
    ws.onopen = function() {
        $("#nameInput").keyup(function(){
            nameText.text = this.value;
            ws.send(JSON.stringify({
                "msgType": "updateCursor",
                "cursorOwner": this.value,
                "x": nameText.x,
                "y": nameText.y
            }));
        });
        nameText.on('pointermove', function(e) {
            var ev = e.data.originalEvent;
            nameText.x = ev.pageX;
            nameText.y = ev.pageY;
            var data = JSON.stringify({
                "msgType": "updateCursor",
                "cursorOwner": getName(),
                "x": ev.pageX,
                "y": ev.pageY
            });
            ws.send(data);
        });

        ws.onmessage = function(e) {
            var data = JSON.parse(e.data);
            // console.log(data);
            var msgType = data["msgType"];
            var cursorOwner = data["cursorOwner"];
            if (cursorOwner == getName()) {return}

            var cursorGraphics;
            switch (msgType) {
                case "updateCursor":
                    var X = data["x"];
                    var Y = data["y"];
                    var cursorName;
                    if (!(cursorOwner in cursors)) {
                        cursorName = new PIXI.Text(cursorOwner, {
                            fontFamily: 'Arial',
                            fontSize: 16,
                            fill: 0xffffff,
                            align: 'center'
                        });
                        cursorName.interactive = true;
                        app.stage.addChild(cursorName);

                        cursorGraphics = new PIXI.Graphics();
                        graphics.lineStyle(0);
                        app.stage.addChild(cursorGraphics);
                        cursors[cursorOwner] = {
                            "name": cursorName,
                            "graphics": cursorGraphics,
                            "down": false
                        };
                    }
                    else {
                        cursorName = cursors[cursorOwner]["name"];
                    }
                    cursorName.x = X;
                    cursorName.y = Y;
                    break;
                case "cursorDown":
                    console.log("cursor Down");
                    cursorGraphics = cursors[cursorOwner]["graphics"];
                    cursors[cursorOwner]["down"] = true;
                    break;
                case "cursorMove":
                    console.log("cursor move");
                    cursorGraphics = cursors[cursorOwner]["graphics"];
                    if (cursors[cursorOwner]["down"] == true) {
                        var x = data["x"];
                        var y = data["y"];
                        var color = data["color"];
                        drawCircle(x, y, graphics, color)
                    }
                    break;
                case "cursorUp":
                    console.log("cursor up");
                    cursorGraphics = cursors[cursorOwner]["graphics"];
                    cursors[cursorOwner]["down"] = false;
                    break;
                case "disconnected":
                    cursorName = cursors[cursorOwner];
                    cursorName.destroy();
                    delete cursors[cursorOwner];
                    break;
                default:
                    console.log("Unknown message type: " + msgType)
            }
        };

        app.stage.on('pointerdown', function(){
            pointerDown = true;
            ws.send(JSON.stringify({
                "msgType": "cursorDown",
                "cursorOwner": getName()
            }))
        });
        app.stage.on('pointermove', function(e) {
            if (pointerDown) {
                var x = e.data.originalEvent.pageX;
                var y = e.data.originalEvent.pageY;
                drawCircle(x, y, graphics, getColor());
                ws.send(JSON.stringify({
                    "msgType": "cursorMove",
                    "cursorOwner": getName(),
                    "x": nameText.x,
                    "y": nameText.y,
                    "color": getColor()
                }))
            }
        });
        app.stage.on('pointerup', function() {
            pointerDown = false;
            ws.send(JSON.stringify({
                "msgType": "cursorUp",
                "cursorOwner": getName()
            }))
        })
    };

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
});
