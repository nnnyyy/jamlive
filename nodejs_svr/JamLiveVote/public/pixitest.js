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
    if( this.active ) {
        this.active.x += 1;
        console.log('#');
    }
}

SetGame.prototype.show = function() {
    var img = this.setCardsSprites.get('000');
    img.x = 0;
    img.y = 0;
    this.active = img;
    this.app.stage.addChild(img);
};