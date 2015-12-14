(function() {

'use strict';

var GAME_DEBUG    = true;
var PHYSICS_DEBUG = false;

var GAME_WIDTH  = 1920;
var GAME_HEIGHT = 1080;

var GRAVITY = 10000;

var MAX_CHARACTER_SPEED = 1000;

var FLOOR_THICKNESS    = 25;
var ROOM_WIDTH_PADDING = 60;

var ROUND_DURATION_MS = 2.5 * 60 * 1000;

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
  var vx = sprite.body.velocity.x;
  var vy = sprite.body.velocity.y;

  if (vx * vx + vy * vy > maxVelocity * maxVelocity) {
    var angle = Math.atan2(vy, vx);

    vx = Math.cos(angle) * maxVelocity;
    vy = Math.sin(angle) * maxVelocity;

    sprite.body.velocity.x = vx;
    sprite.body.velocity.y = vy;
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

    if (GAME_DEBUG) {
      displayState(this.game, 'loading');
    }

    this.load.image('sun',  'assets/sun.png');
    this.load.image('moon', 'assets/moon.png');

    this.load.image('treeline',         'assets/treeline.png');
    this.load.image('house-background', 'assets/house-background.png');
    this.load.image('house-foreground', 'assets/house-foreground.png');

    this.load.image('cook-f',       'assets/characters/cook-f.png');
    this.load.image('cook-m',       'assets/characters/cook-m.png');
    this.load.image('gardener-f',   'assets/characters/gardener-f.png');
    this.load.image('gardener-m',   'assets/characters/gardener-m.png');
    this.load.image('lady',         'assets/characters/lady.png');
    this.load.image('lord',         'assets/characters/lord.png');
    this.load.image('maid-f',       'assets/characters/maid-f.png');
    this.load.image('maid-m',       'assets/characters/maid-m.png');
    this.load.image('mother',       'assets/characters/mother.png');
    this.load.image('stable-boy-f', 'assets/characters/stable-boy-f.png');
    this.load.image('stable-boy-m', 'assets/characters/stable-boy-m.png');

    this.load.spritesheet('speech-bubble', 'assets/speech-bubble.png', 15, 15);
    this.load.image('speech-bubble-tail', 'assets/speech-bubble-tail.png');

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

    this.setupForeground();

    this.world.bringToTop(this.speechBubbles);

    if (GAME_DEBUG) {
      displayState(this.game, 'main');
    }
  },

  update: function update() {
    this.constrainCharacters();

    this.updateCharacters();
    this.updateSpeechBubbles();
  },

  render: function render() {
    this.renderCharactersInfo();
  },

  setupPhysics: function setupPhysics() {
    this.physics.startSystem(Phaser.Physics.P2JS);

    this.floorCollisionGroup     = this.physics.p2.createCollisionGroup();
    this.characterCollisionGroup = this.physics.p2.createCollisionGroup();

    this.physics.p2.gravity.y = GRAVITY;
    this.physics.p2.friction = 1;
    this.physics.p2.restitution = 0;
  },

  setupScene: function setupScene() {
    var axis = this.add.graphics(
      this.game.world.centerX + 50, this.game.world.centerY + 200
    );

    var sun = this.make.image(this.game.world.centerX - 140, 0, 'sun');

    sun.anchor.set(0.5);

    var moon = this.make.image(100 - this.game.world.centerX, 0, 'moon');

    moon.anchor.set(0.5);

    axis.addChild(sun);
    axis.addChild(moon);

    axis.rotation -= Math.PI / 4;
    moon.rotation += Math.PI / 4;

    this.add.tween(axis).to(
      {
        rotation: Math.PI,
      },
      ROUND_DURATION_MS,
      Phaser.Easing.Linear.InOut,
      true
    );

    this.add.tween(moon).to(
      {
        rotation: -Math.PI,
      },
      ROUND_DURATION_MS,
      Phaser.Easing.Linear.InOut,
      true
    );

    this.add.image(0, 0, 'treeline');
    this.add.image(0, 0, 'house-background');
  },

  setupRooms: function setupRooms() {
    this.rooms = {};

    var roomData = this.cache.getJSON('room-data');

    for (var roomName in roomData) {
      var data = roomData[roomName];

      var room = {
        shape: new Phaser.Polygon(data.bounds),
      };

      room.floor = this.add.graphics();

      this.physics.p2.enable(room.floor, PHYSICS_DEBUG, false);

      var bounds = this.calculateRoomBounds(room);

      room.floor.body.setRectangle(
        bounds.x.max - bounds.x.min,
        FLOOR_THICKNESS,
        bounds.x.min + (bounds.x.max - bounds.x.min) / 2,
        bounds.y.max - FLOOR_THICKNESS / 2
      );

      room.floor.body.setCollisionGroup(this.floorCollisionGroup);
      room.floor.body.collides(this.characterCollisionGroup);

      room.floor.body.static = true;

      if (PHYSICS_DEBUG) {
        var debugShape = this.add.graphics();

        debugShape.lineStyle(1, 0x000000);
        debugShape.beginFill(0x000000, 0.5);
        debugShape.drawPolygon(room.shape);
        debugShape.endFill();
      }

      this.rooms[roomName] = room;
    }
  },

  setupInput: function setupInput() {
    this.pointerBody = new p2.Body();

    this.physics.p2.world.addBody(this.pointerBody);

    this.input.onDown.add(this.onPointerDown, this);
    this.input.onUp.add(this.onPointerUp, this);
    this.input.addMoveCallback(this.onPointerMove, this);
  },

  setupForeground: function setupForeground() {
    this.add.image(0, 0, 'house-foreground');
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
    this.characters    = this.add.group();
    this.speechBubbles = this.add.group();

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
        bounds.y.max - FLOOR_THICKNESS,
        this.rnd.pick(data.assets),
        type,
        data
      );
    }
  },

  addCharacter: function addCharacter(x, y, assetName, type, rawData) {
    var character = this.characters.create(x, y, assetName);

    character.position.y -= character.height / 2;

    character.type    = type;
    character.name    = rawData.name;
    character.rawData = rawData;

    this.physics.p2.enable(character, PHYSICS_DEBUG, false);

    character.body.fixedRotation = true;

    character.body.setCollisionGroup(this.characterCollisionGroup);
    character.body.collides(this.floorCollisionGroup);

    if (GAME_DEBUG) {
      var style = {
        font:     'Lora',
        fontSize: 24,

        fill:   '#fff',
        stroke: '#000',

        strokeThickness: 2,
      };

      var labelY = -character.height / 2;

      character.personHappinessLabel = this.game.make.text(0, labelY, 0, style);
      character.personHappinessLabel.anchor.set(0.5, 1);
      character.addChild(character.personHappinessLabel);

      labelY -= character.personHappinessLabel.height;

      character.roomHappinessLabel = this.game.make.text(0, labelY, 0, style);
      character.roomHappinessLabel.anchor.set(0.5, 1);
      character.addChild(character.roomHappinessLabel);

      labelY -= character.roomHappinessLabel.height;

      var typeLabel = this.game.make.text(0, labelY, character.type, style);
      typeLabel.anchor.set(0.5, 1);
      character.addChild(typeLabel);

      labelY -= typeLabel.height;

      var nameLabel = this.game.make.text(0, labelY, character.name, style);
      nameLabel.anchor.set(0.5, 1);
      character.addChild(nameLabel);
    }

    return character;
  },

  createSpeechBubble: function createSpeechBubble(character, text) {
    var style = {
      font:     'Lora',
      fontSize: 18,

      fill:   '#000',
    };

    return new SpeechBubble(
      this.game,
      Math.round(character.position.x + character.width / 2),
      Math.round(character.position.y - character.height / 2),
      400,
      text,
      style
    );
  },

  constrainCharacters: function constrainCharacters() {
    this.characters.forEachExists(this.constrainCharacter, this);
  },

  constrainCharacter: function constrainCharacter(character) {
    if (character === this.touchedCharacter) {
      return;
    }

    constrainVelocity(character, MAX_CHARACTER_SPEED);
  },

  updateCharacters: function updateCharacters() {
    this.characters.forEachExists(this.updateRoom, this);

    for (var roomName in this.rooms) {
      var characters = this.getCharactersInRoom(roomName);

      var character = characters.first;

      while (characters.position < characters.total) {
        character.personReaction = this.getPersonReaction(
          character.rawData, characters
        );

        // Don't react to a room unless someone else is in it, too.
        if (characters.total > 1) {
          character.roomReaction = this.getRoomReaction(
            character.rawData, roomName
          );
        } else {
          character.roomReaction = 0;
        }

        character = characters.next;
      }
    }

    this.characters.forEachExists(this.maybeSetResponse, this);
    this.characters.forEachExists(this.updateCharacterPosition, this);
  },

  updateRoom: function updateRoom(character) {
    if (character === this.touchedCharacter) {
      return;
    }

    if (
      character.room && character.position.equals(character.previousPosition)
    ) {
      return;
    }

    var newRoomName;

    for (var roomName in this.rooms) {
      var room = this.rooms[roomName];

      if (room.shape.contains(character.position.x, character.position.y)) {
        newRoomName = roomName;

        if (newRoomName !== character.room) {
          this.resetResponses(character.room);
          this.resetResponses(newRoomName);
        }

        break;
      }
    }

    if (newRoomName) {
      character.room = newRoomName;
    } else {
      delete character.room;
    }
  },

  getCharactersInRoom: function getCharactersInRoom(roomName) {
    return this.characters.filter(
      function isInRoom(character) {
        return character.room === roomName;
      },
      true
    );
  },

  // Assume we only have one of each type.
  getPersonReaction: function getPersonReaction(characterData, characters) {
    var hatedTypes = Object.keys(characterData.people.hates);

    for (var i = 0; i < hatedTypes.length; i++) {
      var hatedType = hatedTypes[i];

      if (!characters.getByKey('type', hatedType)) {
        continue;
      }

      return {
        happiness: -1,
        responses: characterData.people.hates[hatedType],
      };
    }

    var lovedTypes = Object.keys(characterData.people.loves);

    for (var j = 0; j < lovedTypes.length; j++) {
      var lovedType = lovedTypes[j];

      if (!characters.getByKey('type', lovedType)) {
        continue;
      }

      return {
        happiness: 1,
        responses: characterData.people.loves[lovedType],
      };
    }

    var traitData = this.cache.getJSON('trait-data');

    var happiness = 0;
    var responses = [];

    for (var k = 0; k < characters.list.length; k++) {
      var target = characters.list[k];

      if (target.name === characterData.name) {
        continue;
      }

      var trait;

      for (var l = 0; l < characterData.traits.dislikes.length; l++) {
        trait = characterData.traits.dislikes[l];

        if (target.rawData.traits.own.indexOf(trait) !== -1) {
          happiness--;

          responses.push(traitData[trait].negative);
        }
      }


      for (var m = 0; m < characterData.traits.likes.length; m++) {
        trait = characterData.traits.likes[m];

        if (target.rawData.traits.own.indexOf(trait) !== -1) {
          happiness++;

          responses.push(traitData[trait].positive);
        }
      }
    }

    if (happiness < 0) {
      return {
        happiness: -1,
        responses: responses,
      };
    }

    if (happiness > 0) {
      return {
        happiness: 1,
        responses: responses,
      };
    }

    return {
      happiness: 0,
      responses: responses,
    };
  },

  getRoomReaction: function getRoomReaction(characterData, roomName) {
    if (characterData.rooms.dislikes[roomName]) {
      return {
        happiness: -1,
        responses: characterData.rooms.dislikes[roomName],
      };
    }

    if (characterData.rooms.likes[roomName]) {
      return {
        happiness: 1,
        responses: characterData.rooms.likes[roomName],
      };
    }

    return {
      happiness: 0,
      responses: [],
    };
  },

  maybeSetResponse: function maybeSetResponse(character) {
    if (character === this.touchedCharacter) {
      delete character.response;

      return;
    }

    if (character.response) {
      return;
    }

    var response;

    if (
      character.personReaction.happiness >= 0 &&
      character.roomReaction.happiness < 0
    ) {
      response = this.rnd.pick(character.roomReaction.responses);
    }

    if (!response && character.personReaction.happiness < 0) {
      response = this.rnd.pick(character.personReaction.responses);
    }

    if (!response) {
      var allResponses = character.personReaction.responses.concat(
        character.roomReaction.responses
      );

      response = this.rnd.pick(allResponses);
    }

    character.response = response;
  },

  resetResponses: function resetResponses(roomName) {
    var characters = this.getCharactersInRoom(roomName);

    var character = characters.first;

    while (characters.position < characters.total) {
      delete character.response;

      character = characters.next;
    }
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

  updateSpeechBubbles: function updateSpeechBubbles() {
    this.characters.forEachExists(this.updateSpeechBubble, this);
  },

  updateSpeechBubble: function updateSpeechBubble(character) {
    if (character.speechBubble) {
      character.speechBubble.position.x = Math.round(
        character.position.x + character.width / 2
      );

      character.speechBubble.position.y = Math.round(
        character.position.y - character.height / 2
      );
    }

    var response = character.response || '';

    if (
      character.speechBubble &&
      response !== character.speechBubble.text.text
    ) {
      character.speechBubble.destroy();

      delete character.speechBubble;
    }

    if (response && !character.speechBubble) {
      character.speechBubble = this.speechBubbles.add(
        this.createSpeechBubble(character, response)
      );
    }
  },

  renderCharactersInfo: function renderCharactersInfo() {
    this.characters.forEachExists(this.renderCharacterInfo, this);
  },

  renderCharacterInfo: function renderCharacterInfo(character) {
    if (GAME_DEBUG) {
      character.personHappinessLabel.setText(
        character.personReaction ? character.personReaction.happiness : 0
      );

      character.roomHappinessLabel.setText(
        character.roomReaction ? character.roomReaction.happiness : 0
      );
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
