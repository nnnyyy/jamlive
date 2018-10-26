/**
 * Created by nnnyyy on 2018-10-26.
 */
function init() {
    $(document).ready(function() {


        var app = new PIXI.Application(800, 600, {backgroundColor : 0x1099bb});
        document.body.appendChild(app.view);

// create a new Sprite from an image path
        var setCardsSprites = [];
        for( var i = 0 ; i < 27 ; ++i ) {
            var a = i / 9;
            var b = i / 3 % 3;
            var c = i % 3;
            var newSprite = PIXI.Sprite.fromImage('/images/set/s' + a.toString() + b.toString() + c.toString() + '.jpg');
            setCardsSprites.push(newSprite);
            newSprite.anchor.set(0.5);
            newSprite.x = app.screen.width / 9;
            newSprite.y = app.screen.height / 9 + ( a * 120 );
            app.stage.addChild(newSprite);
        }

// center the sprite's anchor point


// move the sprite to the center of the screen

// Listen for animate update
        app.ticker.add(function(delta) {
            // just for fun, let's rotate mr rabbit a little
            // delta is 1 if running at 100% performance
            // creates frame-independent transformation
           // bunny.rotation += 0.1 * delta;
        });


    });
}