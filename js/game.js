(function() {

'use strict';

var GAME_DEBUG    = false;
var PHYSICS_DEBUG = false;

var GAME_WIDTH  = 1920;
var GAME_HEIGHT = 1080;

var GRAVITY = 10000;

var MAX_CHARACTER_SPEED = 1000;

var FLOOR_THICKNESS    = 25;
var ROOM_WIDTH_PADDING = 60;

var ROUND_DURATION_MS = 1 * Phaser.Timer.MINUTE;

var DAY_COLOUR   = 0x6bbfc9;
var NIGHT_COLOUR = 0x03031b;

var MAX_ROUND_COUNT = 5;

window.WebFontConfig = {
  google: {
    families: [
      'Lora',
    ],
  },
};

var setBackgroundColour = function setBackgroundColour(game, value) {
  var hex = value.toString(16);

  game.stage.backgroundColor = '#' + hex.substr(hex.length - 6);
};

var createStateDisplay = function createStateDisplay(game, stateName) {
  return game.add.text(
    0, 0,
    'state: ' + stateName,
    {
      font:     'Lora',
      fontSize: 36,

      fill:   '#fff',
      stroke: '#000',

      strokeThickness: 3,
    }
  );
};

var tweenBackgroundColour = function tweenBackgroundColour(
  game, startColour, endColour, duration, delay
) {
  var colourBlend = {
    step: 0,
  };

  // create the tween on this object and tween its step property to 100
  var colourTween = game.add.tween(colourBlend).to(
    {
      step: 100
    },
    duration,
    Phaser.Easing.Linear.InOut,
    false,
    delay
  );

  colourTween.onUpdateCallback(function setColour() {
    setBackgroundColour(
      game,
      Phaser.Color.interpolateColor(
        startColour, endColour, 100, colourBlend.step, 1
      )
    );
  });

  setBackgroundColour(game, startColour);

  colourTween.start();
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

var createOverlay = function createOverlay(game) {
  var overlay = game.add.graphics();

  overlay.beginFill(0x000000, 1);
  overlay.drawRect(0, 0, game.world.width, game.world.height);
  overlay.endFill();

  return overlay;
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

    this.stage.disableVisibilityChange = true;

    if (GAME_DEBUG) {
      this.stateDisplay = createStateDisplay(this.game, 'load');
    }

    this.load.image('sun',  'assets/sun.png');
    this.load.image('moon', 'assets/moon.png');

    this.load.image('house-background', 'assets/house-background.png');
    this.load.image('house-foreground', 'assets/house-foreground.png');

    this.load.image(
      'house-background-night', 'assets/house-background-night.png'
    );
    this.load.image(
      'house-foreground-night', 'assets/house-foreground-night.png'
    );

    var characters = [
      'cook-f',
      'cook-m',
      'gardener-f',
      'gardener-m',
      'lady',
      'lord',
      'maid-f',
      'maid-m',
      'mother',
      'stable-boy-f',
      'stable-boy-m',
    ];

    for (var i = 0; i < characters.length; i++) {
      var type = characters[i];

      this.load.image(
        type + '-love', 'assets/characters/' + type + '/love.png'
      );
      this.load.image(
        type + '-like', 'assets/characters/' + type + '/like.png'
      );
      this.load.image(
        type, 'assets/characters/' + type + '/base.png'
      );
      this.load.image(
        type + '-dislike', 'assets/characters/' + type + '/dislike.png'
      );
      this.load.image(
        type + '-hate', 'assets/characters/' + type + '/hate.png'
      );
    }

    this.load.image('baby-black', 'assets/characters/baby/black.png');
    this.load.image('baby-blond', 'assets/characters/baby/blond.png');
    this.load.image('baby-brown', 'assets/characters/baby/brown.png');

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
      this.state.start('results', false, false, this);
    }, this);

    this.load.start();
  },
};

var startState = {
  init: function init(lastState) {
    this.stateDisplay = lastState.stateDisplay;
  },

  create: function create() {
    if (GAME_DEBUG) {
      if (this.stateDisplay.parent) {
        this.stateDisplay.setText('state: start');
      } else {
        this.stateDisplay = createStateDisplay(this.game, 'start');
      }
    }

    this.state.start('results', false, false, this);
  },
};

var mainState = {
  init: function init(lastState) {
    this.stateDisplay = lastState.stateDisplay;
    this.lastBabyData = lastState.babyData || [];
    this.roundCount   = lastState.roundCount || 0;
  },

  create: function create() {
    this.setupPhysics();
    this.setupScene();
    this.setupRooms();
    this.setupInput();

    this.addBabies();
    this.addCharacters();

    this.setupForeground();
    this.setupTransitions();

    this.world.bringToTop(this.speechBubbles);

    this.setupOverlay();

    if (GAME_DEBUG) {
      if (this.stateDisplay.parent) {
        this.stateDisplay.setText('state: main');
      } else {
        this.stateDisplay = createStateDisplay(this.game, 'main');
      }
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

  shutdown: function shutdown() {
    this.settleFloaters();
    this.stopSpeechBubbles();
  },

  setupPhysics: function setupPhysics() {
    this.physics.startSystem(Phaser.Physics.P2JS);

    this.floorCollisionGroup     = this.physics.p2.createCollisionGroup();
    this.characterCollisionGroup = this.physics.p2.createCollisionGroup();

    this.physics.p2.gravity.y   = GRAVITY;
    this.physics.p2.friction    = 1;
    this.physics.p2.restitution = 0;
  },

  setupScene: function setupScene() {
    setBackgroundColour(this.game, DAY_COLOUR);

    this.sky = this.add.graphics(
      this.world.centerX + 50, this.world.centerY + 200
    );

    this.sun = this.make.image(this.world.centerX - 140, 0, 'sun');
    this.sun.anchor.set(0.5);

    this.moon = this.make.image(100 - this.world.centerX, 0, 'moon');
    this.moon.anchor.set(0.5);

    this.sky.addChild(this.sun);
    this.sky.addChild(this.moon);

    this.add.image(0, 0, 'house-background');

    this.houseBackgroundNight = this.add.image(0, 0, 'house-background-night');
    this.houseBackgroundNight.alpha = 0;
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

    this.houseForegroundNight = this.add.image(0, 0, 'house-foreground-night');
    this.houseForegroundNight.alpha = 0;
  },

  setupTransitions: function setupTransitions() {
    var skyColourNow = Phaser.Color.interpolateColor(
      DAY_COLOUR, NIGHT_COLOUR, 6, 1, 1
    );

    var skyColourAtEnd = Phaser.Color.interpolateColor(
      NIGHT_COLOUR, DAY_COLOUR, 24, 5, 1
    );

    tweenBackgroundColour(
      this.game,
      DAY_COLOUR,
      skyColourNow,
      250
    );

    tweenBackgroundColour(
      this.game,
      skyColourNow,
      NIGHT_COLOUR,
      ROUND_DURATION_MS / 6,
      250
    );

    tweenBackgroundColour(
      this.game,
      NIGHT_COLOUR,
      skyColourAtEnd,
      5 * ROUND_DURATION_MS / 24,
      19 * ROUND_DURATION_MS / 24
    );

    this.sky.rotation  -= Math.PI / 4;
    this.moon.rotation += Math.PI / 4;

    this.add.tween(this.sky).to(
      {
        rotation: Math.PI,
      },
      ROUND_DURATION_MS,
      Phaser.Easing.Linear.InOut,
      true
    ).onComplete.add(this.endRound, this);

    this.add.tween(this.moon).to(
      {
        rotation: -Math.PI,
      },
      ROUND_DURATION_MS,
      Phaser.Easing.Linear.InOut,
      true
    );

    this.add.tween(this.houseBackgroundNight).to(
      {
        alpha: 1,
      },
      ROUND_DURATION_MS / 100,
      Phaser.Easing.Linear.InOut,
      true,
      ROUND_DURATION_MS / 8
    );

    this.add.tween(this.houseForegroundNight).to(
      {
        alpha: 1,
      },
      ROUND_DURATION_MS / 100,
      Phaser.Easing.Linear.InOut,
      true,
      ROUND_DURATION_MS / 8
    );
  },

  setupOverlay: function setupOverlay() {
    this.overlay = createOverlay(this.game);

    this.add.tween(this.overlay).to(
      {
        alpha: 0,
      },
      1000,
      Phaser.Easing.Linear.InOut,
      true,
      500
    );
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
      if (this.touchedCharacter.body) {
        this.touchedCharacter.body.collides(this.floorCollisionGroup);
      }

      delete this.touchedCharacter;
    }
  },

  onPointerMove: function onPointerMove(pointer) {
    this.pointerBody.position[0] = this.physics.p2.pxmi(pointer.position.x);
    this.pointerBody.position[1] = this.physics.p2.pxmi(pointer.position.y);
  },

  addBabies: function addBabies() {
    this.babies   = this.add.group();
    this.babyData = [];

    for (var i = 0; i < this.lastBabyData.length; i++) {
      var data = this.lastBabyData[i];

      this.addBaby(data.x, data.y, data.type, data.room);
    }
  },

  addBaby: function addBaby(x, y, type, roomName) {
    var baby = this.babies.create(x, y, type);

    baby.anchor.set(0.5, 1);

    baby.room = roomName;

    this.babyData.push({
      x:    x,
      y:    y,
      type: type,
      room: roomName,
    });
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

    this.speechBubbleTimer = this.time.events.loop(
      5 * Phaser.Timer.SECOND, this.createRandomSpeechBubble, this
    );

    this.createRandomSpeechBubble();
  },

  addCharacter: function addCharacter(x, y, assets, type, rawData) {
    var character = this.characters.create(x, y, assets.base);

    character.position.y -= character.height / 2;

    character.type    = type;
    character.assets  = assets;
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

      character.babyHappinessLabel = this.game.make.text(0, labelY, 0, style);
      character.babyHappinessLabel.anchor.set(0.5, 1);
      character.addChild(character.babyHappinessLabel);

      labelY -= character.babyHappinessLabel.height;

      character.personHappinessLabel = this.game.make.text(0, labelY, 0, style);
      character.personHappinessLabel.anchor.set(0.5, 1);
      character.addChild(character.personHappinessLabel);

      labelY -= character.personHappinessLabel.height;

      character.roomHappinessLabel = this.game.make.text(0, labelY, 0, style);
      character.roomHappinessLabel.anchor.set(0.5, 1);
      character.addChild(character.roomHappinessLabel);
    }

    return character;
  },

  createRandomSpeechBubble: function createRandomSpeechBubble() {
    var character = this.characters.getRandom();

    if (!character.response || character.speechBubble) {
      this.time.events.add(
        Phaser.Timer.SECOND / 100, this.createRandomSpeechBubble, this
      );

      return;
    }

    character.speechBubble = this.speechBubbles.add(
      this.createSpeechBubble(character, character.response)
    );

    this.time.events.add(
      5 * Phaser.Timer.SECOND,
      function destroy() {
        character.speechBubble.destroy();

        delete character.speechBubble;
      },
      this
    );
  },

  createSpeechBubble: function createSpeechBubble(character, text) {
    var style = {
      font:     'Lora',
      fontSize: 18,

      fill: '#000',
    };

    return new SpeechBubble(
      this.game,
      Math.round(character.position.x + character.width / 2),
      Math.round(character.position.y - character.height / 2),
      200,
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
        character.babyReaction = this.getBabyReaction(roomName);

        character.personReaction = this.getPersonReaction(
          character.rawData, characters
        );

        character.roomReaction = this.getRoomReaction(
          character.rawData, roomName
        );

        // Don't respond to a room unless someone else is in it, too.
        if (characters.total < 2) {
          character.roomReaction.responses = [];
        }

        var totalHappiness = character.babyReaction.happiness +
          character.personReaction.happiness +
          character.roomReaction.happiness;
        var asset;

        if (totalHappiness > 1) {
          asset = character.assets.love;
        } else if (totalHappiness === 1) {
          asset = character.assets.like;
        } else if (totalHappiness === -1) {
          asset = character.assets.dislike;
        } else if (totalHappiness < -1) {
          asset = character.assets.hate;
        } else {
          asset = character.assets.base;
        }

        if (asset !== character.key) {
          character.loadTexture(asset);
        }

        character = characters.next;
      }
    }

    this.characters.forEachExists(this.updateRoomStates, this);
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

        break;
      }
    }

    if (newRoomName) {
      if (newRoomName !== character.room) {
        character.previousRoom = character.room;
      }

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

  getBabyReaction: function getBabyReaction(roomName) {
    var babies = this.babies.filter(
      function isInRoom(baby) {
        return baby.room === roomName;
      }, true
    );

    if (babies.total) {
      return {
        happiness: -2,
        responses: [
          "Not with the baby around...",
        ],
      };
    }

    return {
      happiness: 0,
      responses: [],
    };
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

    if (character.babyReaction.happiness < 0) {
      response = this.rnd.pick(character.babyReaction.responses);
    }

    if (
      !response &&
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

  updateRoomStates: function updateRoomStates(character) {
    if (character.previousRoom) {
      this.updateRoomState(character.previousRoom);
    }

    if (character.room) {
      this.updateRoomState(character.room);
    }
  },

  updateRoomState: function updateRoomState(roomName) {
    var room = this.rooms[roomName];

    room.completed = false;

    var characters = this.getCharactersInRoom(roomName);

    if (characters.total < 1) {
      return;
    }

    var completed = characters.total > 1;

    var character = characters.first;

    while (characters.position < characters.total) {
      delete character.response;

      if (
        character.babyReaction &&
        character.roomReaction &&
        character.personReaction
      ) {
        var happiness = character.babyReaction.happiness +
          character.personReaction.happiness +
          character.roomReaction.happiness;

        if (happiness < 1) {
          completed = false;
        }
      } else {
        completed = false;
      }

      character = characters.next;
    }

    room.completed = completed;
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
    if (!character.speechBubble) {
      return;
    }

    character.speechBubble.position.x = Math.round(
      character.position.x + character.width / 2
    );

    character.speechBubble.position.y = Math.round(
      character.position.y - character.height / 2
    );
  },

  renderCharactersInfo: function renderCharactersInfo() {
    this.characters.forEachExists(this.renderCharacterInfo, this);
  },

  renderCharacterInfo: function renderCharacterInfo(character) {
    if (GAME_DEBUG) {
      character.babyHappinessLabel.setText(
        character.babyReaction ? character.babyReaction.happiness : 0
      );

      character.personHappinessLabel.setText(
        character.personReaction ? character.personReaction.happiness : 0
      );

      character.roomHappinessLabel.setText(
        character.roomReaction ? character.roomReaction.happiness : 0
      );
    }
  },

  endRound: function endRound() {
    this.createBabies();

    this.roundCount++;

    this.state.start('results', false, false, this);
  },

  createBabies: function createBabies() {
    var babyTypes = [
      'black',
      'brown',
      'blond',
    ];

    for (var roomName in this.rooms) {
      var room = this.rooms[roomName];

      if (!room.completed) {
        continue;
      }

      var bounds = this.calculateRoomBounds(room);

      var x = this.rnd.integerInRange(
        bounds.x.min + ROOM_WIDTH_PADDING,
        bounds.x.max - ROOM_WIDTH_PADDING
      );
      var y = bounds.y.max - FLOOR_THICKNESS;

      var type = 'baby-' + this.rnd.pick(babyTypes);

      this.addBaby(x, y, type, roomName);
    }
  },

  settleFloaters: function settleFloaters() {
    if (this.touchedCharacter) {
      var room   = this.rooms[this.touchedCharacter.room];
      var bounds = this.calculateRoomBounds(room);

      var x = this.rnd.integerInRange(
        bounds.x.min + ROOM_WIDTH_PADDING,
        bounds.x.max - ROOM_WIDTH_PADDING
      );
      var y = bounds.y.max - FLOOR_THICKNESS - this.touchedCharacter.height / 2;

      this.touchedCharacter.body.x = x;
      this.touchedCharacter.body.y = y;
    }

    this.onPointerUp();
  },

  stopSpeechBubbles: function stopSpeechBubbles() {
    this.time.events.remove(this.speechBubbleTimer);
    this.speechBubbles.destroy();
  },
};

var resultsState = {
  init: function init(lastState) {
    this.stateDisplay = lastState.stateDisplay;
    this.babyData     = lastState.babyData || [];
    this.roundCount   = lastState.roundCount || 0;
    this.rooms        = lastState.rooms || {};
  },

  create: function create() {
    this.setupOverlay();
    this.setupResultsInfo();
    this.setupInput();

    if (GAME_DEBUG) {
      if (this.stateDisplay.parent) {
        this.stateDisplay.setText('state: main');
      } else {
        this.stateDisplay = createStateDisplay(this.game, 'main');
      }
    }
  },

  setupOverlay: function setupOverlay() {
    this.overlay = createOverlay(this.game);

    this.overlay.alpha = 0;

    this.add.tween(this.overlay).to(
      {
        alpha: 0.7,
      },
      250,
      Phaser.Easing.Linear.InOut,
      true
    );
  },

  setupResultsInfo: function setupResultsInfo() {
    this.roundsToGo = MAX_ROUND_COUNT - this.roundCount;

    var resultText;
    var subResultText;

    if (this.roundsToGo > 0) {
      resultText = this.roundsToGo + ' year';
      resultText += this.roundsToGo === 1 ? '' : 's';
      resultText += ' ago...';
    } else {
      var score =  this.getScore();

      resultText = 'Congratulations! You had ' + score + ' bab';
      resultText += score === 1 ? 'y' : 'ies';
      resultText += '!';

      var roomCount = Object.keys(this.rooms).length;

      if (score >= roomCount) {
        subResultText = 'Just don\'t question their lineage...';
      } else if (score > 0) {
        subResultText = 'But ' + (roomCount - score) + ' room';
        subResultText += (roomCount - score) === 1 ? '' : 's';
        subResultText += ' were left joyless!';
      } else {
        subResultText = 'Looks like you kept them under control!';
      }
    }

    var resultStyle = {
      font:     'Lora',
      fontSize: 36,

      align: 'center',

      fill:   '#fff',
      stroke: '#000',

      strokeThickness: 2,
    };

    this.result = this.add.text(
      this.world.centerX, this.world.centerY, resultText, resultStyle
    );

    this.result.anchor.set(0.5);

    var subResultStyle = {
      font:     'Lora',
      fontSize: 24,

      align: 'center',

      fill:   '#fff',
      stroke: '#000',

      strokeThickness: 2,
    };

    this.subResult = this.add.text(
      this.world.centerX, this.world.centerY + 48,
      subResultText, subResultStyle
    );

    this.subResult.anchor.set(0.5);
  },

  setupInput: function setupInput() {
    this.input.onDown.add(this.onPointerDown, this);
    this.input.onUp.add(this.onPointerUp, this);
  },

  onPointerDown: function onPointerDown() {
    this.pointerDown = true;
  },

  onPointerUp: function onPointerUp() {
    if (this.pointerDown) {
      this.restartMain();
    }

    delete this.pointerDown;
  },

  getScore: function getScore() {
    return this.babyData.length;
  },

  restartMain: function restartMain() {
    this.add.tween(this.overlay).to(
      {
        alpha: 1,
      },
      1500,
      Phaser.Easing.Linear.InOut,
      true
    );

    this.add.tween(this.subResult).to(
      {
        alpha: 0,
      },
      250,
      Phaser.Easing.Linear.InOut,
      true,
      1000
    );

    this.add.tween(this.result).to(
      {
        alpha: 0,
      },
      500,
      Phaser.Easing.Linear.InOut,
      true,
      1250
    ).onComplete.add(
      function restart() {
        if (this.roundsToGo > 0) {
          this.state.start('main', true, false, this);
        } else {
          this.state.start('start', false, false, this);
        }
      },
      this
    );
  },
};

window.startGame = function startGame() {
  var game = new Phaser.Game(
    GAME_WIDTH, GAME_HEIGHT,
    Phaser.AUTO
  );

  game.state.add('load',    loadState);
  game.state.add('start',   startState);
  game.state.add('main',    mainState);
  game.state.add('results', resultsState);

  game.state.start('load');
};

})();
