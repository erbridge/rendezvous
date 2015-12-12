(function() {

'use strict';

var DEBUG = true;

var GAME_WIDTH  = 1920;
var GAME_HEIGHT = 1080;

var GRAVITY = 10000;

var MAX_CHARACTER_VELOCITY = 50;

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

var constrainVelocity = function constrainVelocity(sprite, maxVelocity) {
  var vx = sprite.body.data.velocity[0];
  var vy = sprite.body.data.velocity[1];

  if (vx * vx + vy * vy > maxVelocity * maxVelocity) {
    var angle = Math.atan2(vy, vx);

    vx = Math.cos(angle) * maxVelocity;
    vy = Math.sin(angle) * maxVelocity;

    sprite.body.data.velocity[0] = vx;
    sprite.body.data.velocity[1] = vy;
  }
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

    this.load.json('room-data', 'assets/data/rooms.json');

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
    this.setupRooms();
    this.setupInput();

    this.addCharacters();

    if (DEBUG) {
      displayState(this.game, 'main');
    }
  },

  update: function update() {
    this.constrainCharacters();

    this.updateRooms();
  },

  setupPhysics: function setupPhysics() {
    this.physics.startSystem(Phaser.Physics.P2JS);

    this.floorCollisionGroup     = this.physics.p2.createCollisionGroup();
    this.characterCollisionGroup = this.physics.p2.createCollisionGroup();

    this.physics.p2.updateBoundsCollisionGroup();

    this.physics.p2.gravity.y = GRAVITY;
  },

  setupScene: function setupScene() {
    this.add.image(0, 0, 'background');

    this.add.image(80, 100, 'moon');

    var floor = this.add.sprite(0, 0, 'null');

    this.physics.p2.enable(floor, DEBUG);

    floor.body.clearShapes();
    floor.body.loadPolygon('physics-data', 'floor');

    floor.body.setCollisionGroup(this.floorCollisionGroup);
    floor.body.collides(this.characterCollisionGroup);

    floor.body.static = true;
  },

  setupRooms: function setupRooms() {
    this.rooms = {};

    var roomData = this.cache.getJSON('room-data');

    for (var roomName in roomData) {
      var data = roomData[roomName];

      var shape = new Phaser.Polygon(data.bounds);

      if (DEBUG) {
        var debugShape = this.add.graphics();

        debugShape.lineStyle(1, 0x000000);
        debugShape.beginFill(0x000000, 0.5);
        debugShape.drawPolygon(shape);
        debugShape.endFill();
      }

      this.rooms[roomName] = {
        shape: shape,
      };
    }
  },

  setupInput: function setupInput() {
    this.pointerBody = new p2.Body();

    this.physics.p2.world.addBody(this.pointerBody);

    this.input.onDown.add(this.onPointerDown, this);
    this.input.onUp.add(this.onPointerUp, this);
    this.input.addMoveCallback(this.onPointerMove, this);
  },

  onPointerDown: function onPointerDown(pointer) {
    // FIMXE: Only do this for the alive children...
    var bodies = this.physics.p2.hitTest(
      pointer.position,
      this.characters.children
    );

    if (!bodies.length) {
      return;
    }

    var physicsPos = [
      this.physics.p2.pxmi(pointer.position.x),
      this.physics.p2.pxmi(pointer.position.y),
    ];

    var localPointInBody = [ 0, 0 ];

    this.touchedCharacterBody = bodies[0].parent;

    this.touchedCharacterBody.toLocalFrame(localPointInBody, physicsPos);

    this.pointerConstraint = this.physics.p2.createLockConstraint(
      this.pointerBody,
      this.touchedCharacterBody,
      [
        this.physics.p2.mpxi(localPointInBody[0]),
        this.physics.p2.mpxi(localPointInBody[1]),
      ]
    );

    this.touchedCharacterBody.removeCollisionGroup(this.floorCollisionGroup);
  },

  onPointerUp: function onPointerUp() {
    if (this.pointerConstraint) {
      this.physics.p2.removeConstraint(this.pointerConstraint);

      delete this.pointerConstraint;
    }

    if (this.touchedCharacterBody) {
      this.touchedCharacterBody.collides(this.floorCollisionGroup);

      delete this.touchedCharacterBody;
    }
  },

  onPointerMove: function onPointerMove(pointer) {
    this.pointerBody.position[0] = this.physics.p2.pxmi(pointer.position.x);
    this.pointerBody.position[1] = this.physics.p2.pxmi(pointer.position.y);
  },

  addCharacters: function addCharacters() {
    this.characters = this.add.group();

    this.addCharacter(500, 0, 'male');

    this.addCharacter(1000, 0, 'female');
  },

  addCharacter: function addCharacter(x, y, assetName) {
    var character = this.characters.create(x, y, assetName);

    this.physics.p2.enable(character, DEBUG);

    character.body.fixedRotation = true;

    character.body.setCollisionGroup(this.characterCollisionGroup);
    character.body.collides(this.floorCollisionGroup);

    return character;
  },

  constrainCharacters: function constrainCharacters() {
    this.characters.forEachAlive(function constrain(character) {
      constrainVelocity(character, MAX_CHARACTER_VELOCITY);
    }, this);
  },

  updateRooms: function updateRooms() {
    this.characters.forEachAlive(this.updateRoom, this);
  },

  updateRoom: function updateRoom(character) {
    if (character.position.equals(character.previousPosition)) {
      return;
    }

    for (var roomName in this.rooms) {
      var room = this.rooms[roomName];

      if (room.shape.contains(character.position.x, character.position.y)) {
        character.room = roomName;
      }
    }
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
