(function() {

'use strict';

var DEBUG = true;

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

var displayState = function displayState(game, stateLabel) {
  var stateDisplay = game.add.text(
    0, 0,
    'state: ' + stateLabel,
    {
      font:     'Lora',
      fontSize: 36,

      fill:   '#fff',
      stroke: '#000',

      strokeThickness: 3,
    }
  );
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

    if (DEBUG) {
      displayState(this.game, 'loading');
    }

    this.load.image('house', 'assets/house.jpg');

    this.load.physics('physics-data', 'assets/physics.json');

    this.load.onLoadComplete.add(function() {
      this.state.start('main');
    }, this);

    this.load.start();
  },
};

var mainState = {
  create: function create() {
    this.setupPhysics();

    this.createHouse();

    if (DEBUG) {
      displayState(this.game, 'main');
    }
  },

  update: function update() {},

  setupPhysics: function setupPhysics() {
    this.physics.startSystem(Phaser.Physics.P2JS);

    this.physics.setBoundsToWorld();
  },

  createHouse: function createHouse() {
    this.house = this.add.sprite(
      this.world.centerX, this.world.centerY, 'house'
    );

    this.physics.p2.enable(this.house, DEBUG);

    this.house.body.clearShapes();
    this.house.body.loadPolygon('physics-data', 'house');

    this.house.body.static = true;
  },
};

})();
