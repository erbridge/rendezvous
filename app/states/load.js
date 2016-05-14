'use strict';

const config = require('../config');

const debugUtils = require('../utils/debug');

module.exports = {
  create() {
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;

    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically = true;

    this.stage.disableVisibilityChange = true;

    const style = {
      font:     'Lora',
      fontSize: 36,

      fill:   '#fff',
      stroke: '#000',

      strokeThickness: 3,
    };

    const progressDisplay = this.add.text(0, 0, '', style);

    if (config.game.debug) {
      this.stateDisplay = debugUtils.createStateDisplay(this.game, 'load');
    }

    this.load.image('splash', 'assets/splash.png');

    this.load.audio(
      'night-sfx', 'assets/sfx/202988__tonant__nightsounds3.mp3'
    );

    this.load.audio(
      'bird-sfx', 'assets/sfx/182502__swiftoid__birds-chirping-02.mp3'
    );

    this.load.image('sun', 'assets/sun.png');
    this.load.image('moon', 'assets/moon.png');
    this.load.image('stars', 'assets/stars.png');

    this.load.image('house-background', 'assets/house-background.png');
    this.load.image('house-foreground', 'assets/house-foreground.png');
    this.load.image('house-external', 'assets/house-external.png');

    this.load.image(
      'house-background-night', 'assets/house-background-night.png'
    );
    this.load.image(
      'house-foreground-night', 'assets/house-foreground-night.png'
    );

    const characters = [
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

    for (let i = 0; i < characters.length; i++) {
      const type = characters[i];

      this.load.image(`${type}-love`, `assets/characters/${type}/love.png`);
      this.load.image(`${type}-like`, `assets/characters/${type}/like.png`);
      this.load.image(type, `assets/characters/${type}/base.png`);
      this.load.image(
        `${type}-dislike`, `assets/characters/${type}/dislike.png`
      );
      this.load.image(`${type}-hate`, `assets/characters/${type}/hate.png`);
    }

    this.load.image('baby-black', 'assets/characters/baby/black.png');
    this.load.image('baby-blond', 'assets/characters/baby/blond.png');
    this.load.image('baby-brown', 'assets/characters/baby/brown.png');

    this.load.spritesheet('speech-bubble', 'assets/speech-bubble.png', 15, 15);
    this.load.image('speech-bubble-tail', 'assets/speech-bubble-tail.png');

    this.load.json('room-data', 'assets/data/rooms.json');
    this.load.json('trait-data', 'assets/data/traits.json');

    this.load.json('character-data', 'assets/data/characters/index.json');
    this.load.json('cook-data', 'assets/data/characters/cook.json');
    this.load.json('gardener-data', 'assets/data/characters/gardener.json');
    this.load.json('lady-data', 'assets/data/characters/lady.json');
    this.load.json('lord-data', 'assets/data/characters/lord.json');
    this.load.json('maid-data', 'assets/data/characters/maid.json');
    this.load.json('mother-data', 'assets/data/characters/mother.json');
    this.load.json('stable-boy-data', 'assets/data/characters/stable-boy.json');

    this.load.onFileComplete.add(function handleProgress(progress, cacheKey) {
      progressDisplay.setText(`${progress}%`);

      if (cacheKey === 'splash') {
        this.world.sendToBack(this.add.image(0, 0, 'splash'));
      }

      if (cacheKey === 'night-sfx') {
        const nightSfx = this.add.audio('night-sfx');

        nightSfx.loopFull();
      }
    }, this);

    this.load.onLoadComplete.add(function startNextState() {
      this.state.start('main-menu', false, false, this);
    }, this);

    this.load.start();
  },
};
