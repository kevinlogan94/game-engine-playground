import Phaser from "phaser";
import { ApproachScene } from "./ApproachScene";
import { BossScene } from "./BossScene";
import { TitleScene } from "./TitleScene";
import { GAME_H, GAME_W } from "./gameConfig";

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: "game",
  backgroundColor: "#0a0a0c",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [TitleScene, ApproachScene, BossScene],
});
