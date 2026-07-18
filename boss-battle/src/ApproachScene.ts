import Phaser from "phaser";
import {
  DIRS,
  GAME_H,
  GAME_W,
  PLAYER,
  SPRITE_SCALE,
  TILE,
  TILE_SCALE,
  dirFromVector,
  type Dir,
} from "./gameConfig";

const ASSET = "assets/lpc";

/** Outside the fog gate — walk north into the mist to begin. */
export class ApproachScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private facing: Dir = "up";
  private entered = false;

  constructor() {
    super("Approach");
  }

  preload() {
    this.load.spritesheet("floor", `${ASSET}/tiles/castlefloors.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("outside", `${ASSET}/tiles/castle_outside.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("walls", `${ASSET}/tiles/castlewalls.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("walk", `${ASSET}/sprites/male_walkcycle.png`, {
      frameWidth: 64,
      frameHeight: 64,
    });
  }

  create() {
    this.entered = false;
    this.facing = "up";
    this.walls = this.physics.add.staticGroup();

    const cols = Math.ceil(GAME_W / TILE);
    const rows = Math.ceil(GAME_H / TILE);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE / 2;
        const edge = r === 0 || c === 0 || c === cols - 1 || r === rows - 1;
        const gate = r === 0 && c >= cols / 2 - 1 && c <= cols / 2;
        if (edge && !gate) {
          this.add.image(x, y, "walls", 1).setScale(TILE_SCALE).setDepth(1);
          this.walls.create(x, y, "walls", 1).setScale(TILE_SCALE).refreshBody();
        } else {
          const key = r < 3 ? "outside" : "floor";
          const frame = r < 3 ? 4 : 0;
          this.add.image(x, y, key, frame).setScale(TILE_SCALE).setDepth(0);
        }
      }
    }

    // Foggy entryway (center-top)
    const fogX = GAME_W / 2;
    const fogY = TILE * 1.2;
    const fog = this.add.graphics().setDepth(5);
    for (let i = 0; i < 5; i++) {
      fog.fillStyle(0xc8d0dc, 0.12 + i * 0.05);
      fog.fillEllipse(fogX, fogY + i * 6, 140 - i * 10, 70 - i * 6);
    }
    this.add
      .text(fogX, fogY - 28, "FOG GATE", {
        fontFamily: "serif",
        fontSize: "14px",
        color: "#d8dee8",
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setAlpha(0.7);

    this.tweens.add({
      targets: fog,
      alpha: { from: 0.65, to: 1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
    });

    this.anims.create({
      key: "p-idle",
      frames: [{ key: "walk", frame: 18 }],
      frameRate: 1,
    });
    for (let i = 0; i < DIRS.length; i++) {
      const dir = DIRS[i]!;
      this.anims.create({
        key: `p-walk-${dir}`,
        frames: this.anims.generateFrameNumbers("walk", {
          start: i * 9 + 1,
          end: i * 9 + 8,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    this.player = this.physics.add
      .sprite(GAME_W / 2, GAME_H - TILE * 2, "walk", 18)
      .setScale(SPRITE_SCALE)
      .setDepth(4)
      .setCollideWorldBounds(true);
    this.player.body.setSize(22, 28).setOffset(21, 28);

    this.physics.add.collider(this.player, this.walls);

    const gateZone = this.add.zone(fogX, fogY + 10, 90, 70);
    this.physics.add.existing(gateZone, true);
    this.physics.add.overlap(this.player, gateZone, () => this.enterFog());

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.add
      .text(GAME_W / 2, GAME_H - 18, "WASD / arrows — approach the fog gate", {
        fontFamily: "serif",
        fontSize: "14px",
        color: "#9aa3b2",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);
  }

  update() {
    if (this.entered) return;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
      this.facing = dirFromVector(vx, vy);
      this.player.anims.play(`p-walk-${this.facing}`, true);
    } else {
      this.player.anims.play("p-idle", true);
    }
    this.player.setVelocity(vx * PLAYER.speed, vy * PLAYER.speed);
  }

  private enterFog() {
    if (this.entered) return;
    this.entered = true;
    this.player.setVelocity(0, 0);
    this.cameras.main.fadeOut(700, 10, 10, 14);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Boss", { skipIntro: false });
    });
  }
}
