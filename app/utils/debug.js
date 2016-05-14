'use strict';

module.exports = {
  createStateDisplay(game, stateName) {
    return game.add.text(
      0, 0,
      `state: ${stateName}`,
      {
        font:     'Lora',
        fontSize: 36,

        fill:   '#fff',
        stroke: '#000',

        strokeThickness: 3,
      }
    );
  },
};
