import Phaser from "phaser";
import { GAME_H, GAME_W } from "./gameConfig";

/** Blood & ash title — Press Space or click to begin. */
export class TitleScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super("Title");
  }

  create() {
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(0, GAME_W);
      const dot = this.add.circle(x, GAME_H + 4, 1, 0xe8dcc0, 0.45).setDepth(1);
      const drift = () => {
        dot.setPosition(Phaser.Math.Between(0, GAME_W), GAME_H + 4).setAlpha(0.45);
        this.tweens.add({
          targets: dot,
          y: -8,
          x: dot.x + Phaser.Math.Between(-12, 12),
          alpha: 0,
          duration: Phaser.Math.Between(6000, 12000),
          onComplete: drift,
        });
      };
      this.time.delayedCall(Phaser.Math.Between(0, 6000), drift);
    }

    const ruleY = GAME_H * 0.54;
    this.add
      .graphics()
      .setDepth(2)
      .fillGradientStyle(0, 0, 0xa01818, 0xa01818, 0, 0, 0.65, 0.65)
      .fillRect(GAME_W / 2 - 90, ruleY, 180, 1);

    const title = this.add
      .text(GAME_W / 2, GAME_H * 0.4, "LORD OF ASH", {
        fontFamily: "Georgia, serif",
        fontSize: "48px",
        color: "#f0e6d0",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0);

    const prompt = this.add
      .text(GAME_W / 2, GAME_H * 0.66, "Press Space", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#b0a090",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0);

    const footer = this.add
      .text(GAME_W / 2, GAME_H * 0.92, "A soul awaits", {
        fontFamily: "Georgia, serif",
        fontSize: "11px",
        color: "#9aa3b2",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0);

    this.tweens.add({ targets: title, alpha: 1, duration: 1500 });
    this.tweens.add({
      targets: prompt,
      alpha: 1,
      duration: 1500,
      delay: 700,
      onComplete: () =>
        this.tweens.add({
          targets: prompt,
          alpha: { from: 0.35, to: 0.95 },
          duration: 2200,
          yoyo: true,
          repeat: -1,
        }),
    });
    this.tweens.add({ targets: footer, alpha: 0.45, duration: 1500, delay: 1000 });

    this.cameras.main.fadeIn(500, 10, 10, 14);
    this.input.keyboard!.once("keydown-SPACE", () => this.begin());
    this.input.once("pointerdown", () => this.begin());
  }

  private begin() {
    if (this.started) return;
    this.started = true;
    this.cameras.main.fadeOut(700, 10, 10, 14);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Approach"));
  }
}
