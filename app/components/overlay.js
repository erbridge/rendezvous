'use strict';

class Overlay extends Phaser.Graphics {
  constructor(game, alpha) {
    super(game);

    this.beginFill(0x000000, 1);
    this.drawRect(0, 0, game.world.width, game.world.height);
    this.endFill();

    this.alpha = alpha;
  }
}

module.exports = Overlay;
