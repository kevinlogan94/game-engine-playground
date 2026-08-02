import Phaser from "phaser";
import { GAME_H, GAME_W } from "./gameConfig";
import { TopDownScene } from "./TopDownScene";

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: "game",
  backgroundColor: "#0b1020",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [TopDownScene],
});
