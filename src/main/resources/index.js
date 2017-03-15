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

    var ws = new WebSocket("ws://" + window.location.hostname + ":8080/paint");
    ws.onopen = function() {
        $("#reset").submit(function( event ) {
            alert( "Handler for .submit() called." );
            event.preventDefault();
        });
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
        });

        ws.onmessage = function(e) {
            // console.log(e);
            var data = JSON.parse(e.data);
            // console.log(data);
            var msgType = data["msgType"];
            var cursorOwner = data["cursorOwner"];
            if (cursorOwner == getName()) {return}

            var cursorNameText;
            var cursorGraphics;
            if (!(cursorOwner in cursors)) {
                cursorNameText = new PIXI.Text(cursorOwner, {
                    fontFamily: 'Arial',
                    fontSize: 16,
                    fill: 0xffffff,
                    align: 'center'
                });
                cursorNameText.interactive = true;
                app.stage.addChild(cursorNameText);

                cursorGraphics = new PIXI.Graphics();
                graphics.lineStyle(0);
                app.stage.addChild(cursorGraphics);
                cursors[cursorOwner] = {
                    "name": cursorNameText,
                    "graphics": cursorGraphics,
                    "down": false
                };
            } else {
                cursorNameText = cursors[cursorOwner]["name"];
                cursorGraphics = cursors[cursorOwner]["graphics"];
            }
            applyEvent(msgType, data, cursorOwner, cursorNameText, cursorGraphics)

        };
    };
    function applyEvent(msgType, data, cursorOwner, cursorNameText, cursorGraphics){
        switch (msgType) {
            case "bulkDraw":
                console.log("Bulk");
                var events = data["events"];
                console.log(events);
                events.forEach(function(ev){
                    applyEvent(ev["msgType"], ev, cursorOwner, cursorNameText, cursorGraphics)
                });
                break;
            case "updateCursor":
                cursorNameText.x = data["x"];
                cursorNameText.y = data["y"];
                break;
            case "cursorDown":
                console.log("down");
                cursors[cursorOwner]["down"] = true;
                console.log(cursors[cursorOwner]["down"]);
                console.log("down");
                break;
            case "cursorMove":
                console.log("move");
                console.log(cursors[cursorOwner]["down"]);
                if (cursors[cursorOwner]["down"] == true) {
                    console.log("moving");
                    var x = data["x"];
                    var y = data["y"];
                    var color = data["color"];
                    drawCircle(x, y, cursorGraphics, color)
                }
                break;
            case "cursorUp":
                console.log("up");
                cursors[cursorOwner]["down"] = false;
                break;
            case "disconnected":
                cursorNameText = cursors[cursorOwner];
                cursorNameText.destroy();
                delete cursors[cursorOwner];
                break;
            default:
                console.log("Unknown message type: " + msgType)
        }
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
});
