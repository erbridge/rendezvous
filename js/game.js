(function() {

'use strict';

var DEBUG = true;

var GAME_WIDTH  = 1920;
var GAME_HEIGHT = 1080;

var GRAVITY = 1000;

window.WebFontConfig = {
  google: {
    families: [
      'Lora',
    ],
  },
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
    this.load.image('moon',       'assets/moon.png');

    this.load.image('male',   'assets/characters/male.png');
    this.load.image('female', 'assets/characters/female.png');

    this.load.physics('physics-data', 'assets/data/physics.json');

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

    this.addCharacters();

    if (DEBUG) {
      displayState(this.game, 'main');
    }
  },

  update: function update() {},

  setupPhysics: function setupPhysics() {
    this.physics.startSystem(Phaser.Physics.P2JS);

    // FIXME: Do we need this?
    this.physics.setBoundsToWorld();

    this.physics.p2.gravity.y = GRAVITY;
  },

  setupScene: function setupScene() {
    this.add.image(0, 0, 'background');

    this.add.image(80, 100, 'moon');

    var floor = this.add.sprite(0, 0, 'null');

    this.physics.p2.enable(floor, DEBUG);

    floor.body.clearShapes();
    floor.body.loadPolygon('physics-data', 'floor');

    floor.body.static = true;
  },

  addCharacters: function addCharacters() {
    this.characters = this.add.group();

    this.addCharacter(500, 0, 'male');

    this.addCharacter(1000, 0, 'female');
  },

  addCharacter: function addCharacter(x, y, assetName) {
    var character = this.characters.create(x, y, assetName);

    this.physics.p2.enable(character, DEBUG);

    return character;
  },
};

window.startGame = function startGame() {
  var game = new Phaser.Game(
    GAME_WIDTH, GAME_HEIGHT,
    Phaser.AUTO
  );

  game.state.add('load', loadState);
  game.state.add('main', mainState);

  game.state.start('load');
};

})();
