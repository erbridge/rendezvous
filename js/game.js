(function() {

'use strict';

var DEBUG = true;

var GAME_WIDTH  = 1920;
var GAME_HEIGHT = 1080;

var GRAVITY = 10000;

var MAX_CHARACTER_SPEED = 50;

var ROOM_WIDTH_PADDING = 50;

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

    this.load.json('room-data',  'assets/data/rooms.json');
    this.load.json('trait-data', 'assets/data/traits.json');

    this.load.json('character-data',  'assets/data/characters/index.json');
    this.load.json('cook-data',       'assets/data/characters/cook.json');
    this.load.json('gardener-data',   'assets/data/characters/gardener.json');
    this.load.json('lady-data',       'assets/data/characters/lady.json');
    this.load.json('lord-data',       'assets/data/characters/lord.json');
    this.load.json('maid-data',       'assets/data/characters/maid.json');
    this.load.json('mother-data',     'assets/data/characters/mother.json');
    this.load.json('stable-boy-data', 'assets/data/characters/stable-boy.json');

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

    this.updateCharacters();
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

    var floors = this.add.sprite(0, 0, 'null');

    this.physics.p2.enable(floors, DEBUG);

    floors.body.clearShapes();
    floors.body.loadPolygon('physics-data', 'floors');

    floors.body.setCollisionGroup(this.floorCollisionGroup);
    floors.body.collides(this.characterCollisionGroup);

    floors.body.static = true;
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

    this.touchedCharacter = bodies[0].parent.sprite;

    this.touchedCharacter.body.toLocalFrame(localPointInBody, physicsPos);

    this.pointerConstraint = this.physics.p2.createLockConstraint(
      this.pointerBody,
      this.touchedCharacter.body,
      [
        this.physics.p2.mpxi(localPointInBody[0]),
        this.physics.p2.mpxi(localPointInBody[1]),
      ]
    );

    this.touchedCharacter.body.removeCollisionGroup(this.floorCollisionGroup);
  },

  onPointerUp: function onPointerUp() {
    if (this.pointerConstraint) {
      this.physics.p2.removeConstraint(this.pointerConstraint);

      delete this.pointerConstraint;
    }

    if (this.touchedCharacter) {
      this.touchedCharacter.body.collides(this.floorCollisionGroup);

      delete this.touchedCharacter;
    }
  },

  onPointerMove: function onPointerMove(pointer) {
    this.pointerBody.position[0] = this.physics.p2.pxmi(pointer.position.x);
    this.pointerBody.position[1] = this.physics.p2.pxmi(pointer.position.y);
  },

  addCharacters: function addCharacters() {
    this.characters = this.add.group();

    var characterData = this.cache.getJSON('character-data');

    for (var i = 0; i < characterData.all.length; i++) {
      var type = characterData.all[i];

      var data = this.cache.getJSON(type + '-data');

      var room = this.rooms[data.rooms.home];

      var bounds = this.calculateRoomBounds(room);

      this.addCharacter(
        this.rnd.integerInRange(
          bounds.x.min + ROOM_WIDTH_PADDING,
          bounds.x.max - ROOM_WIDTH_PADDING
        ),
        (bounds.y.min + bounds.y.max) / 2,
        this.rnd.pick(data.assets),
        type,
        data
      );
    }
  },

  addCharacter: function addCharacter(x, y, assetName, type, rawData) {
    var character = this.characters.create(x, y, assetName);

    character.type    = type;
    character.rawData = rawData;

    this.physics.p2.enable(character, DEBUG);

    character.body.fixedRotation = true;

    character.body.setCollisionGroup(this.characterCollisionGroup);
    character.body.collides(this.floorCollisionGroup);

    return character;
  },

  constrainCharacters: function constrainCharacters() {
    this.characters.forEachExists(function constrainCharacter(character) {
      constrainVelocity(character, MAX_CHARACTER_SPEED);
    }, this);
  },

  updateRooms: function updateRooms() {
    this.characters.forEachExists(this.updateRoom, this);
  },

  updateRoom: function updateRoom(character) {
    if (character.position.equals(character.previousPosition)) {
      return;
    }

    character.room = null;

    for (var roomName in this.rooms) {
      var room = this.rooms[roomName];

      if (room.shape.contains(character.position.x, character.position.y)) {
        character.room = roomName;
      }
    }
  },

  updateCharacters: function updateCharacters() {
    for (var roomName in this.rooms) {
      var characters = this.characters.filter(
        function isInRoom(character) {
          return character.room === roomName;
        },
        true
      );

      var character = characters.first;

      while (characters.position < characters.total) {
        character.personHappiness = this.calculatePersonHappiness(
          character.rawData, characters
        );

        character.roomHappiness = this.calculateRoomHappiness(
          character.rawData, roomName
        );

        character = characters.next;
      }
    }

    this.characters.forEachExists(this.updateCharacterPosition, this);
  },

  // Assume we only have one of each type.
  calculatePersonHappiness: function calculatePersonHappiness(
    characterData, characters
  ) {
    for (var i = 0; i < characterData.people.hates.length; i++) {
      if (!characters.getByKey('type', characterData.people.hates[i])) {
        continue;
      }

      return -1;
    }

    for (var j = 0; j < characterData.people.loves.length; j++) {
      if (!characters.getByKey('type', characterData.people.loves[j])) {
        continue;
      }

      return 1;
    }

    var happiness = 0;

    for (var k = 0; k < characters.list.length; k++) {
      var target = characters.list[k];

      if (target.type === characterData.type) {
        continue;
      }

      var trait;

      for (var l = 0; l < characterData.traits.dislikes; l++) {
        trait = characterData.traits.dislikes[l];

        if (target.rawData.traits.own.indexOf(trait) !== -1) {
          happiness--;
        }
      }

      for (var m = 0; m < characterData.traits.likes; m++) {
        trait = characterData.traits.likes[m];

        if (target.rawData.traits.own.indexOf(trait) !== -1) {
          happiness++;
        }
      }
    }

    if (happiness < 0) {
      return -1;
    }

    if (happiness > 0) {
      return 1;
    }

    return 0;
  },

  calculateRoomHappiness: function calculateRoomHappiness(characterData, roomName) {
    if (characterData.rooms.dislikes.indexOf(roomName) !== -1) {
      return -1;
    }

    if (characterData.rooms.likes.indexOf(roomName) !== -1) {
      return 1;
    }

    return 0;
  },

  updateCharacterPosition: function updateCharacterPosition(character) {
    if (character.room) {
      character.body.data.gravityScale = 1;
      return;
    }

    if (character === this.touchedCharacter) {
      return;
    }

    character.body.data.gravityScale = 0;

    var data = this.findNearestRoom(character.position.x, character.position.y);

    var speed = 1000;
    var diagSpeed = speed * Math.sqrt(2);

    switch (data.direction) {
      case 'left': {
        character.body.moveLeft(speed);
        break;
      }
      case 'right': {
        character.body.moveRight(speed);
        break;
      }
      case 'up': {
        character.body.moveUp(speed);
        break;
      }
      case 'down': {
        character.body.moveDown(speed);
        break;
      }
      case 'leftup': {
        character.body.moveLeft(diagSpeed);
        character.body.moveUp(diagSpeed);
        break;
      }
      case 'leftdown': {
        character.body.moveLeft(diagSpeed);
        character.body.moveDown(diagSpeed);
        break;
      }
      case 'rightup': {
        character.body.moveRight(diagSpeed);
        character.body.moveUp(diagSpeed);
        break;
      }
      case 'rightdown': {
        character.body.moveRight(diagSpeed);
        character.body.moveDown(diagSpeed);
        break;
      }
      default: {
        break;
      }
    }
  },

  calculateRoomBounds: function calculateRoomBounds(room) {
    var roomPoints = room.shape.toNumberArray();

    var x = {
      min: this.world.width,
      max: 0,
    };

    var y = {
      min: this.world.height,
      max: 0,
    };

    for (var j = 0; j < roomPoints.length; j++) {
      var coord = roomPoints[j];

      if (j % 2) {
        y.min = Math.min(y.min, coord);
        y.max = Math.max(y.max, coord);
      } else {
        x.min = Math.min(x.min, coord);
        x.max = Math.max(x.max, coord);
      }
    }

    return {
      x: x,
      y: y,
    };
  },

  findNearestRoom: function findNearestRoom(x, y) {
    var nearestRoom;
    var roomDirection;
    var roomDistanceSquared = Number.MAX_VALUE;

    for (var roomName in this.rooms) {
      var room = this.rooms[roomName];

      var bounds = this.calculateRoomBounds(room);

      var xMinDistance = bounds.x.min - x;
      var xMaxDistance = x - bounds.x.max;
      var yMinDistance = bounds.y.min - y;
      var yMaxDistance = y - bounds.y.max;

      var direction = '';
      var distanceSquared = 0;

      if (xMinDistance > 0) {
        direction += 'right';
        distanceSquared += xMinDistance * xMinDistance;
      } else if (xMaxDistance > 0) {
        direction += 'left';
        distanceSquared += xMaxDistance * xMaxDistance;
      }

      if (yMinDistance > 0) {
        direction += 'down';
        distanceSquared += yMinDistance * yMinDistance;
      } else if (yMaxDistance > 0) {
        direction += 'up';
        distanceSquared += yMaxDistance * yMaxDistance;
      }

      if (distanceSquared < roomDistanceSquared) {
        nearestRoom = room;
        roomDirection = direction;
        roomDistanceSquared = distanceSquared;
      }
    }

    return {
      room:      nearestRoom,
      direction: roomDirection,
    };
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
