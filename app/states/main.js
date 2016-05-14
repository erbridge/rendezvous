'use strict';

const config = require('../config/index.js');

const Overlay      = require('../components/overlay');
const SpeechBubble = require('../components/speech-bubble');

const debugUtils = require('../utils/debug');

const setBackgroundColour = function setBackgroundColour(game, value) {
  const hex = value.toString(16);

  game.stage.backgroundColor = `#${hex.substr(hex.length - 6)}`;
};

const tweenBackgroundColour = function tweenBackgroundColour(
  game, startColour, endColour, duration, delay
) {
  const colourBlend = {
    step: 0,
  };

  // create the tween on this object and tween its step property to 100
  const colourTween = game.add.tween(colourBlend).to(
    {
      step: 100,
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

const constrainVelocity = function constrainVelocity(sprite, maxVelocity) {
  let vx = sprite.body.velocity.x;
  let vy = sprite.body.velocity.y;

  if (vx * vx + vy * vy > maxVelocity * maxVelocity) {
    const angle = Math.atan2(vy, vx);

    vx = Math.cos(angle) * maxVelocity;
    vy = Math.sin(angle) * maxVelocity;

    sprite.body.velocity.x = vx;
    sprite.body.velocity.y = vy;
  }
};

module.exports = {
  init(lastState) {
    this.stateDisplay = lastState.stateDisplay;
    this.characterAssets = lastState.characterAssets || {};
    this.lastBabyData = lastState.babyData || [];
    this.roundCount = lastState.roundCount || 0;
    this.sounds = lastState.sounds || [];
  },

  create() {
    this.setupPhysics();
    this.setupScene();
    this.setupRooms();
    this.setupInput();

    this.addBabies();
    this.addCharacters();

    this.setupForeground();
    this.setupSounds();
    this.setupTransitions();

    this.world.bringToTop(this.speechBubbles);

    this.setupOverlay();

    if (config.game.debug) {
      if (this.stateDisplay.parent) {
        this.stateDisplay.setText('state: main');
      } else {
        this.stateDisplay = debugUtils.createStateDisplay(this.game, 'main');
      }
    }
  },

  update() {
    this.constrainCharacters();

    this.updateCharacters();
    this.updateSpeechBubbles();
  },

  render() {
    this.renderCharactersInfo();
  },

  shutdown() {
    this.settleFloaters();
    this.stopSpeechBubbles();
  },

  setupPhysics() {
    this.physics.startSystem(Phaser.Physics.P2JS);

    this.floorCollisionGroup = this.physics.p2.createCollisionGroup();
    this.characterCollisionGroup = this.physics.p2.createCollisionGroup();

    this.physics.p2.gravity.y = config.physics.gravity;
    this.physics.p2.friction = 1;
    this.physics.p2.restitution = 0;
  },

  setupScene() {
    setBackgroundColour(this.game, config.colours.day);

    this.stars = this.add.image(0, 0, 'stars');
    this.stars.alpha = 0;

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

    const birdSfx = this.add.audio('bird-sfx', 0.2);

    birdSfx.play();

    this.sounds.push(birdSfx);
  },

  setupRooms() {
    this.rooms = {};

    const roomData = this.cache.getJSON('room-data');

    for (const roomName in roomData) {
      const data = roomData[roomName];

      const room = {
        shape: new Phaser.Polygon(data.bounds),
      };

      room.floor = this.add.graphics();

      this.physics.p2.enable(room.floor, config.physics.debug, false);

      const bounds = this.calculateRoomBounds(room);

      room.floor.body.setRectangle(
        bounds.x.max - bounds.x.min,
        config.rooms.floorThickness,
        bounds.x.min + (bounds.x.max - bounds.x.min) / 2,
        bounds.y.max - config.rooms.floorThickness / 2
      );

      room.floor.body.setCollisionGroup(this.floorCollisionGroup);
      room.floor.body.collides(this.characterCollisionGroup);

      room.floor.body.static = true;

      if (config.physics.debug) {
        const debugShape = this.add.graphics();

        debugShape.lineStyle(1, 0x000000);
        debugShape.beginFill(0x000000, 0.5);
        debugShape.drawPolygon(room.shape);
        debugShape.endFill();
      }

      this.rooms[roomName] = room;
    }
  },

  setupInput() {
    this.pointerBody = new p2.Body();

    this.physics.p2.world.addBody(this.pointerBody);

    this.input.onDown.add(this.onPointerDown, this);
    this.input.onUp.add(this.onPointerUp, this);
    this.input.addMoveCallback(this.onPointerMove, this);
  },

  setupForeground() {
    this.add.image(0, 0, 'house-foreground');

    this.houseForegroundNight = this.add.image(0, 0, 'house-foreground-night');
    this.houseForegroundNight.alpha = 0;

    const houseExternal = this.add.image(0, 0, 'house-external');

    this.add.tween(houseExternal).to(
      {
        alpha: 0,
      },
      1000,
      Phaser.Easing.Linear.InOut,
      true,
      3000
    );
  },

  setupSounds() {
    this.nightSounds = [
      this.add.audio('night-sfx', 0),
    ];

    this.sounds = this.sounds.concat(this.nightSounds);

    for (let i = 0; i < this.nightSounds.length; i++) {
      this.nightSounds[i].loopFull();
    }
  },

  setupTransitions() {
    const skyColourNow = Phaser.Color.interpolateColor(
      config.colours.day, config.colours.night, 6, 1, 1
    );

    const skyColourAtEnd = Phaser.Color.interpolateColor(
      config.colours.night, config.colours.day, 24, 5, 1
    );

    tweenBackgroundColour(
      this.game,
      config.colours.day,
      skyColourNow,
      250
    );

    tweenBackgroundColour(
      this.game,
      skyColourNow,
      config.colours.night,
      config.rounds.durationMs / 6,
      250
    );

    tweenBackgroundColour(
      this.game,
      config.colours.night,
      skyColourAtEnd,
      5 * config.rounds.durationMs / 24,
      19 * config.rounds.durationMs / 24
    );

    this.add.tween(this.stars).to(
      {
        alpha: 1,
      },
      config.rounds.durationMs / 6,
      Phaser.Easing.Linear.InOut,
      true,
      config.rounds.durationMs / 8
    );

    this.sky.rotation -= Math.PI / 4;
    this.moon.rotation += Math.PI / 4;

    this.add.tween(this.sky).to(
      {
        rotation: Math.PI,
      },
      config.rounds.durationMs,
      Phaser.Easing.Linear.InOut,
      true
    ).onComplete.add(this.endRound, this);

    this.add.tween(this.moon).to(
      {
        rotation: -Math.PI,
      },
      config.rounds.durationMs,
      Phaser.Easing.Linear.InOut,
      true
    );

    this.add.tween(this.houseBackgroundNight).to(
      {
        alpha: 1,
      },
      config.rounds.durationMs / 50,
      Phaser.Easing.Linear.InOut,
      true,
      config.rounds.durationMs / 8
    );

    this.add.tween(this.houseForegroundNight).to(
      {
        alpha: 1,
      },
      config.rounds.durationMs / 50,
      Phaser.Easing.Linear.InOut,
      true,
      config.rounds.durationMs / 8
    );

    for (let i = 0; i < this.nightSounds.length; i++) {
      this.add.tween(this.nightSounds[i]).to(
        {
          volume: 1,
        },
        config.rounds.durationMs / 10,
        Phaser.Easing.Linear.InOut,
        true,
        config.rounds.durationMs / 5
      );
    }
  },

  setupOverlay() {
    this.overlay = new Overlay(this.game, 1);

    this.world.add(this.overlay);

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

  onPointerDown(pointer) {
    const bodies = this.physics.p2.hitTest(
      pointer.position,
      this.characters.children
    );

    if (!bodies.length) {
      return;
    }

    const physicsPos = [
      this.physics.p2.pxmi(pointer.position.x),
      this.physics.p2.pxmi(pointer.position.y),
    ];

    const localPointInBody = [ 0, 0 ];

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

  onPointerUp() {
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

  onPointerMove(pointer) {
    this.pointerBody.position[0] = this.physics.p2.pxmi(pointer.position.x);
    this.pointerBody.position[1] = this.physics.p2.pxmi(pointer.position.y);
  },

  addBabies() {
    this.babies = this.add.group();
    this.babyData = [];

    for (let i = 0; i < this.lastBabyData.length; i++) {
      const data = this.lastBabyData[i];

      this.addBaby(data.x, data.y, data.type, data.room);
    }
  },

  addBaby(x, y, type, roomName) {
    const baby = this.babies.create(x, y, type);

    baby.anchor.set(0.5, 1);

    baby.room = roomName;

    this.babyData.push({
      x:    x,
      y:    y,
      type: type,
      room: roomName,
    });
  },

  addCharacters() {
    this.characters = this.add.group();
    this.speechBubbles = this.add.group();

    const characterData = this.cache.getJSON('character-data');

    for (let i = 0; i < characterData.all.length; i++) {
      const type = characterData.all[i];

      const data = this.cache.getJSON(`${type}-data`);

      const room = this.rooms[data.rooms.home];

      const bounds = this.calculateRoomBounds(room);

      if (!this.characterAssets[type]) {
        this.characterAssets[type] = this.rnd.pick(data.assets);
      }

      this.addCharacter(
        this.rnd.integerInRange(
          bounds.x.min + config.rooms.widthPadding,
          bounds.x.max - config.rooms.widthPadding
        ),
        bounds.y.max - config.rooms.floorThickness,
        this.characterAssets[type],
        type,
        data
      );
    }

    this.speechBubbleTimer = this.time.events.loop(
      5 * Phaser.Timer.SECOND, this.createRandomSpeechBubble, this
    );

    this.createRandomSpeechBubble();
  },

  addCharacter(x, y, assets, type, rawData) {
    const character = this.characters.create(x, y, assets.base);

    character.position.y -= character.height / 2;

    character.type = type;
    character.assets = assets;
    character.name = rawData.name;
    character.rawData = rawData;

    this.physics.p2.enable(character, config.physics.debug, false);

    character.body.fixedRotation = true;

    character.body.setCollisionGroup(this.characterCollisionGroup);
    character.body.collides(this.floorCollisionGroup);

    if (config.game.debug) {
      const style = {
        font:     'Lora',
        fontSize: 24,

        fill:   '#fff',
        stroke: '#000',

        strokeThickness: 2,
      };

      let labelY = -character.height / 2;

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

  createRandomSpeechBubble() {
    const character = this.characters.getRandom();

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

  createSpeechBubble(character, text) {
    const style = {
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

  constrainCharacters() {
    this.characters.forEachExists(this.constrainCharacter, this);
  },

  constrainCharacter(character) {
    if (character === this.touchedCharacter) {
      return;
    }

    constrainVelocity(character, config.physics.maxCharacterSpeed);
  },

  updateCharacters() {
    this.characters.forEachExists(this.updateRoom, this);

    for (const roomName in this.rooms) {
      const characters = this.getCharactersInRoom(roomName);

      let character = characters.first;

      while (characters.position < characters.total) {
        character.babyReaction = this.getBabyReaction(roomName);

        character.personReaction = this.getPersonReaction(
          character.rawData, characters
        );

        character.roomReaction = this.getRoomReaction(
          character.rawData, roomName
        );

        const totalHappiness = character.babyReaction.happiness +
          character.personReaction.happiness +
          character.roomReaction.happiness;
        let asset;

        // Don't respond to a room unless someone else is in it, too.
        if (characters.total < 2) {
          asset = character.assets.base;
          character.roomReaction.responses = [];
        } else if (totalHappiness > 0) {
          asset = character.assets.love;
        } else if (totalHappiness < 0) {
          asset = character.assets.hate;
        } else {
          asset = character.assets.base;
        }

        // if (totalHappiness > 1) {
        //   asset = character.assets.love;
        // } else if (totalHappiness === 1) {
        //   asset = character.assets.like;
        // } else if (totalHappiness === -1) {
        //   asset = character.assets.dislike;
        // } else if (totalHappiness < -1) {
        //   asset = character.assets.hate;
        // } else {
        //   asset = character.assets.base;
        // }

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

  updateRoom(character) {
    if (character === this.touchedCharacter) {
      return;
    }

    if (
      character.room && character.position.equals(character.previousPosition)
    ) {
      return;
    }

    let newRoomName;

    for (const roomName in this.rooms) {
      const room = this.rooms[roomName];

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

  getCharactersInRoom(roomName) {
    return this.characters.filter(
      function isInRoom(character) {
        return character.room === roomName;
      },
      true
    );
  },

  getBabyReaction(roomName) {
    const babies = this.babies.filter(
      function isInRoom(baby) {
        return baby.room === roomName;
      }, true
    );

    if (babies.total) {
      return {
        happiness: -2,
        responses: [
          'Not with the baby around...',
        ],
      };
    }

    return {
      happiness: 0,
      responses: [],
    };
  },

  // Assume we only have one of each type.
  getPersonReaction(characterData, characters) {
    const hatedTypes = Object.keys(characterData.people.hates);

    for (let i = 0; i < hatedTypes.length; i++) {
      const hatedType = hatedTypes[i];

      if (!characters.getByKey('type', hatedType)) {
        continue;
      }

      return {
        happiness: -1,
        responses: characterData.people.hates[hatedType],
      };
    }

    const lovedTypes = Object.keys(characterData.people.loves);

    for (let j = 0; j < lovedTypes.length; j++) {
      const lovedType = lovedTypes[j];

      if (!characters.getByKey('type', lovedType)) {
        continue;
      }

      return {
        happiness: 1,
        responses: characterData.people.loves[lovedType],
      };
    }

    const traitData = this.cache.getJSON('trait-data');

    let happiness = 0;
    const responses = [];

    for (let k = 0; k < characters.list.length; k++) {
      const target = characters.list[k];

      if (target.name === characterData.name) {
        continue;
      }

      let trait;

      for (let l = 0; l < characterData.traits.dislikes.length; l++) {
        trait = characterData.traits.dislikes[l];

        if (target.rawData.traits.own.indexOf(trait) !== -1) {
          happiness--;

          responses.push(traitData[trait].negative);
        }
      }

      for (let m = 0; m < characterData.traits.likes.length; m++) {
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

  getRoomReaction(characterData, roomName) {
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

  maybeSetResponse(character) {
    if (character === this.touchedCharacter) {
      delete character.response;

      return;
    }

    if (character.response) {
      return;
    }

    let response;

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
      const allResponses = character.personReaction.responses.concat(
        character.roomReaction.responses
      );

      response = this.rnd.pick(allResponses);
    }

    character.response = response;
  },

  updateRoomStates(character) {
    if (character.previousRoom) {
      this.updateRoomState(character.previousRoom);
    }

    if (character.room) {
      this.updateRoomState(character.room);
    }
  },

  updateRoomState(roomName) {
    const room = this.rooms[roomName];

    room.completed = false;

    const characters = this.getCharactersInRoom(roomName);

    if (characters.total < 1) {
      return;
    }

    let completed = characters.total > 1;

    let character = characters.first;

    while (characters.position < characters.total) {
      delete character.response;

      if (
        character.babyReaction &&
        character.roomReaction &&
        character.personReaction
      ) {
        const happiness = character.babyReaction.happiness +
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

  updateCharacterPosition(character) {
    if (character.room) {
      character.body.data.gravityScale = 1;

      return;
    }

    if (character === this.touchedCharacter) {
      return;
    }

    character.body.data.gravityScale = 0;

    const data = this.findNearestRoom(character.position.x, character.position.y);

    const speed = 1000;
    const diagSpeed = speed * Math.sqrt(2);

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

  calculateRoomBounds(room) {
    const roomPoints = room.shape.toNumberArray();

    const x = {
      min: this.world.width,
      max: 0,
    };

    const y = {
      min: this.world.height,
      max: 0,
    };

    for (let j = 0; j < roomPoints.length; j++) {
      const coord = roomPoints[j];

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

  findNearestRoom(x, y) {
    let nearestRoom;
    let roomDirection;
    let roomDistanceSquared = Number.MAX_VALUE;

    for (const roomName in this.rooms) {
      const room = this.rooms[roomName];

      const bounds = this.calculateRoomBounds(room);

      const xMinDistance = bounds.x.min - x;
      const xMaxDistance = x - bounds.x.max;
      const yMinDistance = bounds.y.min - y;
      const yMaxDistance = y - bounds.y.max;

      let direction = '';
      let distanceSquared = 0;

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

  updateSpeechBubbles() {
    this.characters.forEachExists(this.updateSpeechBubble, this);
  },

  updateSpeechBubble(character) {
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

  renderCharactersInfo() {
    this.characters.forEachExists(this.renderCharacterInfo, this);
  },

  renderCharacterInfo(character) {
    if (config.game.debug) {
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

  endRound() {
    this.createBabies();

    this.roundCount++;

    this.state.start('results', false, false, this);
  },

  createBabies() {
    const babyTypes = [
      'black',
      'brown',
      'blond',
    ];

    for (const roomName in this.rooms) {
      const room = this.rooms[roomName];

      if (!room.completed) {
        continue;
      }

      const bounds = this.calculateRoomBounds(room);

      const x = this.rnd.integerInRange(
        bounds.x.min + config.rooms.widthPadding,
        bounds.x.max - config.rooms.widthPadding
      );
      const y = bounds.y.max - config.rooms.floorThickness;

      const type = `baby-${this.rnd.pick(babyTypes)}`;

      this.addBaby(x, y, type, roomName);
    }
  },

  settleFloaters() {
    if (this.touchedCharacter) {
      const room   = this.rooms[this.touchedCharacter.room];
      const bounds = this.calculateRoomBounds(room);

      const x = this.rnd.integerInRange(
        bounds.x.min + config.rooms.widthPadding,
        bounds.x.max - config.rooms.widthPadding
      );
      const y = bounds.y.max - config.rooms.floorThickness - this.touchedCharacter.height / 2;

      this.touchedCharacter.body.x = x;
      this.touchedCharacter.body.y = y;
    }

    this.onPointerUp();
  },

  stopSpeechBubbles() {
    this.time.events.remove(this.speechBubbleTimer);
    this.speechBubbles.destroy();
  },
};
