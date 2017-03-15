$(document).ready( function() {
    var app = new PIXI.Application(600, 400);
    $(".app").append(app.view);
    var graphics = new PIXI.Graphics();

    function getName(){
        return $("#nameInput")[0].value
    }

    var nameText = new PIXI.Text(getName(), {fontFamily : 'Arial', fontSize: 16, fill : 0xffffff, align : 'center'});
    nameText.interactive = true;
    nameText.x = 30;
    nameText.y = 90;

    app.stage.addChild(nameText);

    var cursors = {};
    console.log(window.location.hostname);

    var ws = new WebSocket("ws://" + window.location.hostname + ":8080/chat");

    ws.onopen = function(e) {
        ws.send("connected" + "|" + getName());
        nameText.on('pointermove', function(e) {
            var ev = e.data.originalEvent;
            nameText.x = ev.pageX;
            nameText.y = ev.pageY;
            ws.send(getName() + "|" + ev.pageX + "|" + ev.pageY);
        });
        ws.onmessage = function(e) {
            var pos = e.data.split("|");
            var name = pos[0];
            var X = pos[1];
            var Y = pos[2];
            var nameT;
            if (!(name in cursors)) {
                nameT = new PIXI.Text(name, {
                    fontFamily: 'Arial',
                    fontSize: 16,
                    fill: 0xffffff,
                    align: 'center'
                });
                nameT.interactive = true;
                app.stage.addChild(nameT);
                cursors[name] = nameT;
            }
            else {
                nameT = cursors[name];
            }
            nameT.x = X;
            nameT.y = Y;
        };

        $("#nameInput").keyup(function(){
            nameText.text = this.value;
            ws.send(getName() + "|" + nameText.x + "|" + nameText.y);
        })
    };
});