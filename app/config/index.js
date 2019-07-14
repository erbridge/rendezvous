'use strict';

module.exports = {
  game: {
    width:  1920,
    height: 1080,
    debug:  false,
  },
  physics: {
    gravity:           10000,
    maxCharacterSpeed: 1000,
    debug:             false,
  },
  rooms: {
    floorThickness: 25,
    widthPadding:   60,
  },
  colours: {
    day:   0x6bbfc9,
    night: 0x03031b,
  },
  rounds: {
    durationMs: Phaser.Timer.MINUTE / 2,
    maxCount:   5,
  },
};
