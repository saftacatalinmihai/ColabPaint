$(document).ready( function() {
    var app = new PIXI.Application(600, 400);
    $(".app").append(app.view);

    function getName(){
        return $("#nameInput")[0].value
    }

    var nameText = new PIXI.Text(getName(), {fontFamily : 'Arial', fontSize: 16, fill : 0xffffff, align : 'center'});
    nameText.interactive = true;
    nameText.x = 30;
    nameText.y = 90;

    app.stage.addChild(nameText);

    var cursors = {};

    var ws = new WebSocket("ws://" + window.location.hostname + ":8080/chat");

    ws.onopen = function(e) {
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
            var msgType = data["msgType"];
            var cursorOwner = data["cursorOwner"];
            switch (msgType) {
                case "updateCursor": {
                    var X = data["x"];
                    var Y = data["y"];
                    var cursorText;
                    if (!(cursorOwner in cursors)) {
                        cursorText = new PIXI.Text(cursorOwner, {
                            fontFamily: 'Arial',
                            fontSize: 16,
                            fill: 0xffffff,
                            align: 'center'
                        });
                        cursorText.interactive = true;
                        app.stage.addChild(cursorText);
                        cursors[cursorOwner] = cursorText;
                    }
                    else {
                        cursorText = cursors[cursorOwner];
                    }
                    cursorText.x = X;
                    cursorText.y = Y;
                } break;
                case "disconnected": {
                    cursorText = cursors[cursorOwner];
                    cursorText.destroy();
                    delete cursors[cursorOwner]
                }
            }
        };

        $("#nameInput").keyup(function(){
            nameText.text = this.value;
            ws.send(JSON.stringify({
                "msgType": "updateCursor",
                "cursorOwner": this.value,
                "x": nameText.x,
                "y": nameText.y
            }));
        })
    };
});