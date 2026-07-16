import Phaser from "phaser";
import { ClassroomScene } from "./ClassroomScene";
import { GAME_W, GAME_H } from "./gameConfig";

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: "game",
  backgroundColor: "#1a1a2e",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [ClassroomScene],
});
