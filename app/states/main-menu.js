'use strict';

const config = require('../config');

const Overlay = require('../components/overlay');

const debugUtils = require('../utils/debug');

module.exports = {
  init(lastState) {
    this.stateDisplay = lastState.stateDisplay;
    this.sounds = lastState.sounds || [];
  },

  create() {
    this.add.image(0, 0, 'splash');

    this.setupOverlay();
    this.setupInput();

    if (config.game.debug) {
      if (this.stateDisplay.parent) {
        this.stateDisplay.setText('state: start');
      } else {
        this.stateDisplay = debugUtils.createStateDisplay(
          this.game, 'main-menu'
        );
      }
    }
  },

  setupOverlay() {
    this.overlay = new Overlay(this.game, 0);

    this.world.add(this.overlay);
  },

  setupInput() {
    this.input.onDown.add(this.onPointerDown, this);
    this.input.onUp.add(this.onPointerUp, this);
  },

  onPointerDown() {
    this.pointerDown = true;
  },

  onPointerUp() {
    if (this.pointerDown) {
      this.startGame();
    }

    delete this.pointerDown;
  },

  startGame() {
    // FIXME: Add fading methods to Overlay.
    this.add.tween(this.overlay).to(
      {
        alpha: 1,
      },
      2000,
      Phaser.Easing.Linear.InOut,
      true
    ).onComplete.add(
      function start() {
        this.state.start('results', false, false, this);
      },
      this
    );
  },
};
