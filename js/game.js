(function() {

'use strict';

// TODO: Specify fonts.
window.WebFontConfig = {
  google: {
    families: [
      'Lora',
    ],
  },
};

window.startGame = function startGame() {
  var game = new Phaser.Game(
    1920, 1080,
    Phaser.AUTO
  );

  game.state.add('load', loadState);
  game.state.add('main', mainState);

  game.state.start('load');
};

var loadState = {
  preload: function preload() {
    this.load.script(
      'webfont', '//ajax.googleapis.com/ajax/libs/webfont/1/webfont.js'
    );
  },

  create: function create() {
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;

    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically   = true;

    // TODO: Load the assets.

    this.load.onLoadComplete.add(function() {
      this.state.start('main');
    }, this);

    this.load.start();
  },
};

var mainState = {
  create: function create() {
    this.setupPhysics();
  },

  update: function update() {},

  setupPhysics: function setupPhysics() {
    this.physics.startSystem(Phaser.Physics.P2JS);

    this.physics.setBoundsToWorld();
  },
};

})();
