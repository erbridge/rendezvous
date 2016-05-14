'use strict';

const config = require('../config/index.js');

const Overlay = require('../components/overlay');

const debugUtils = require('../utils/debug');

module.exports = {
  init: function init(lastState) {
    this.stateDisplay = lastState.stateDisplay;
    this.characterAssets = lastState.characterAssets || {};
    this.babyData = lastState.babyData || [];
    this.roundCount = lastState.roundCount || 0;
    this.rooms = lastState.rooms || {};
  },

  create: function create() {
    this.setupOverlay();
    this.setupResultsInfo();
    this.setupInput();

    if (config.game.debug) {
      if (this.stateDisplay.parent) {
        this.stateDisplay.setText('state: main');
      } else {
        this.stateDisplay = debugUtils.createStateDisplay(this.game, 'main');
      }
    }
  },

  setupOverlay: function setupOverlay() {
    this.overlay = new Overlay(this.game, 0);

    this.world.add(this.overlay);

    this.add.tween(this.overlay).to(
      {
        alpha: 0.5,
      },
      250,
      Phaser.Easing.Linear.InOut,
      true
    );
  },

  setupResultsInfo: function setupResultsInfo() {
    this.roundsToGo = config.rounds.maxCount - this.roundCount;

    let resultText;
    let subResultText;

    if (this.roundsToGo > 0) {
      resultText = `${this.roundsToGo} year`;
      resultText += this.roundsToGo === 1 ? '' : 's';
      resultText += ' ago...';
    } else {
      const score =  this.getScore();

      resultText = `Congratulations! You had ${score} bab`;
      resultText += score === 1 ? 'y' : 'ies';
      resultText += '!';

      const roomCount = Object.keys(this.rooms).length;

      if (score >= roomCount) {
        subResultText = 'Just don\'t question their lineage...';
      } else if (score > 0) {
        subResultText = `But ${roomCount - score} room`;
        subResultText += roomCount - score === 1 ? '' : 's';
        subResultText += ' were left joyless!';
      } else {
        subResultText = 'Looks like you kept them under control!';
      }
    }

    const resultStyle = {
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

    const subResultStyle = {
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
    this.add.tween(this.sound).to(
      {
        volume: 0,
      },
      1000,
      Phaser.Easing.Linear.InOut,
      true
    ).onComplete.add(
      function removeNightSounds() {
        this.sound.destroy();

        this.sound.volume = 1;
      },
      this
    );

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
          this.state.start('main-menu', false, false, this);
        }
      },
      this
    );
  },
};
