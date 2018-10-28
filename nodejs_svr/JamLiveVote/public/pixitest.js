/**
 * Created by nnnyyy on 2018-10-26.
 */
var G;
function init() {
    $(document).ready(function() {
        G = new Global();
    });
}

var Global = function() {
    this.setGameObj = new SetGame();
    this.setGameObj.init();

    this.vApp = new Vue({
        el: '#app',
        data: {

        },
        methods: {
            onBtnAction: function() {
                G.setGameObj.show();
            }
        }
    })
}

var SetGame = function() {
    console.log('SetGame Object Created');
};

SetGame.prototype.init = function() {
    console.log('initialize start');
    var sg = this;

    this.pos = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
        { x: 0, y: 100 },
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 0, y: 200 },
        { x: 100, y: 200 },
        { x: 200, y: 200 },
        { x: 0, y: 300 },
        { x: 100, y: 300 },
        { x: 200, y: 300 }
    ];

    this.app = new PIXI.Application(400, 400, {backgroundColor : 0x1099bb});
    $('#game-view').append(this.app.view);

    this.setCardsSprites = new Map();
    this.active = null;
    for( var i = 0 ; i < 27 ; ++i ) {
        var a = Math.floor(i / 9);
        var b = Math.floor(i / 3) % 3;
        var c = i % 3;
        var t = a.toString() + b.toString() + c.toString();
        var path = '/images/set/s' + t + '.jpg';
        var newSprite = PIXI.Sprite.fromImage(path);
        this.setCardsSprites.put(t, newSprite);
        newSprite.anchor.set(0);
    }
    

    this.app.ticker.add(function() {
        var tCur = new Date();
        sg.update(tCur);
    });
};

SetGame.prototype.update = function( tCur ) {
}

SetGame.prototype.show = function() {
    var i = 0;
    for (var value of this.setCardsSprites.values()) {
        var img = value;
        console.log(img);
        img.x = this.pos[i%12].x;
        img.y = this.pos[i%12].y;
        i++;
        this.app.stage.addChild(img);
    }
};