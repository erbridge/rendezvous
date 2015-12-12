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

    this.load.image('null',       'assets/null.png');
    this.load.image('background', 'assets/background.png');

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

    this.setupScene();

    if (DEBUG) {
      displayState(this.game, 'main');
    }
  },

  update: function update() {},

  setupPhysics: function setupPhysics() {
    this.physics.startSystem(Phaser.Physics.P2JS);

    // FIXME: Do we need this?
    this.physics.setBoundsToWorld();
  },

  setupScene: function setupScene() {
    this.add.sprite(0, 0, 'background');

    var floor = this.add.sprite(0, 0, 'null');

    this.physics.p2.enable(floor, DEBUG);

    floor.body.clearShapes();
    floor.body.loadPolygon('physics-data', 'floor');

    floor.body.static = true;
  },
};

})();
