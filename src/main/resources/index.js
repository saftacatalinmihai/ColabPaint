$(document).ready( function() {
    var app = new PIXI.Application(800, 600);
    $(".app").append(app.view);
    var graphics = new PIXI.Graphics();

    function getName(){
        return $("#nameInput")[0].value
    }

    var basicText = new PIXI.Text(getName(), {fontFamily : 'Arial', fontSize: 16, fill : 0xff1010, align : 'center'});
    basicText.x = 30;
    basicText.y = 90;

    app.stage.addChild(basicText);

    var ws = new WebSocket("ws://localhost:8080/chat");

    ws.onopen = function(e) {
        ws.send("connected" + "|" + getName());
        $("body").mousemove(function(e) {
            basicText.x = e.pageX;
            basicText.y = e.pageY;
            ws.send(getName() + "|" + e.pageX + "|" + e.pageY);
        })
        ws.onmessage = function(e) {
//            console.log(e.data);
            var pos = e.data.split("|");
            var name = pos[0];
            var X = pos[1];
            var Y = pos[2];
            basicText.x = X;
            basicText.y = Y;
        };
    };
})