// Originally from: http://jsfiddle.net/lewster32/81pzgs4z/

var SpeechBubble = function SpeechBubble(game, x, y, width, text, style) {
  Phaser.Sprite.call(this, game, x, y);

  var height = 18;
  var borderWidth = 15;

  width = width || 27;

  style.wordWrap      = true;
  style.wordWrapWidth = width;

  this.text = game.make.text(
    x + borderWidth + 4, y + borderWidth + 4, text, style
  );

  var bounds = this.text.getLocalBounds();

  if (bounds.width + 2 * borderWidth > width) {
    width = bounds.width + 2 * borderWidth;
  }

  if (bounds.height + 2 * borderWidth > height) {
    height = bounds.height + 2 * borderWidth;
  }

  this.addChild(game.make.tileSprite(
      x + borderWidth, y + borderWidth,
      width - borderWidth, height - borderWidth,
      'speech-bubble', 4
  ));

  this.border = [
    game.make.image(x,         y,          'speech-bubble', 0),
    game.make.image(x + width, y,          'speech-bubble', 2),
    game.make.image(x + width, y + height, 'speech-bubble', 8),
    game.make.image(x,         y + height, 'speech-bubble', 6),
    game.make.tileSprite(
      x + borderWidth, y,
      width - borderWidth, borderWidth,
      'speech-bubble', 1
    ),
    game.make.tileSprite(
      x + width, y + borderWidth,
      borderWidth, height - borderWidth,
      'speech-bubble', 5
    ),
    game.make.tileSprite(
      x + borderWidth, y + height,
      width - borderWidth, borderWidth,
      'speech-bubble', 7
    ),
    game.make.tileSprite(
      x, y + borderWidth,
      borderWidth, height - borderWidth,
      'speech-bubble', 3
    ),
  ];

  // Add all of the above to this sprite
  for (var b = 0, len = this.border.length; b < len; b++) {
    this.addChild(this.border[b]);
  }

  this.addChild(game.make.image(x + 18, y + height + 6, 'speech-bubble-tail'));

  this.addChild(this.text);

  this.pivot.set(x + 18, y + height + 40);
};

SpeechBubble.prototype = Object.create(Phaser.Sprite.prototype);
SpeechBubble.prototype.constructor = SpeechBubble;
