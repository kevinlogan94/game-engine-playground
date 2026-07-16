import Phaser from 'phaser';
import CutJigsawImagePlugin from 'phaser3-rex-plugins/plugins/cutjigsawimage-plugin.js';
import { PuzzleScene } from './scenes/PuzzleScene';

const parent = document.getElementById('game');

new Phaser.Game({
  type: Phaser.AUTO,
  parent: parent ?? undefined,
  backgroundColor: '#1a2332',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Portrait canvas so the photo + scatter tray both fit
    width: 720,
    height: 1100,
  },
  scene: [PuzzleScene],
  plugins: {
    global: [
      {
        key: 'rexCutJigsawImage',
        plugin: CutJigsawImagePlugin,
        start: true,
      },
    ],
  },
});
