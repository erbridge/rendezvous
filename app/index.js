/* eslint-env browser */

'use strict';

const config = require('./config/index.js');

const loadState     = require('./states/load');
const mainState     = require('./states/main');
const mainMenuState = require('./states/main-menu');
const resultsState  = require('./states/results');

document.addEventListener('DOMContentLoaded', function startGame() {
  const game = new Phaser.Game(
    config.game.width, config.game.height,
    Phaser.AUTO
  );

  game.state.add('load', loadState);

  game.state.add('main-menu', mainMenuState);
  game.state.add('results', resultsState);

  game.state.add('main', mainState);

  game.state.start('load');
});
