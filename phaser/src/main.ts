import Phaser from "phaser";
import { OverworldScene } from "./OverworldScene";
import { BattleScene } from "./BattleScene";
import { GAME_H, GAME_W } from "./gameConfig";

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
  input: {
    activePointers: 3,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [OverworldScene, BattleScene],
});
