import Phaser from "phaser";
import {
  COBBLE,
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
  private pants!: Phaser.GameObjects.Sprite;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private facing: Dir = "up";
  private entered = false;

  constructor() {
    super("Approach");
  }

  preload() {
    this.load.spritesheet("floors", `${ASSET}/tiles/castlefloors.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("walk", `${ASSET}/sprites/male_walkcycle.png`, {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("pants", `${ASSET}/sprites/male_pants.png`, {
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
        const gate =
          r <= 1 && c >= Math.floor(cols / 2) - 1 && c <= Math.floor(cols / 2);
        const edge = r === 0 || c === 0 || c === cols - 1 || r === rows - 1;

        this.add
          .image(x, y, "floors", COBBLE[(r + c) % COBBLE.length]!)
          .setScale(TILE_SCALE)
          .setDepth(0)
          .setTint(r < 3 ? 0xc8d0dc : 0xa8b0bc);

        if (edge && !gate) {
          const block = this.add
            .rectangle(x, y, TILE, TILE, 0x3e4854)
            .setDepth(1)
            .setStrokeStyle(2, 0x5a6570);
          this.physics.add.existing(block, true);
          this.walls.add(block);
        }
      }
    }

    const fogX = GAME_W / 2;
    const fogY = TILE * 1.1;
    this.add.rectangle(fogX - 70, fogY, 18, TILE * 2.2, 0x3a424c).setDepth(2);
    this.add.rectangle(fogX + 70, fogY, 18, TILE * 2.2, 0x3a424c).setDepth(2);
    this.add.rectangle(fogX, fogY - 40, 160, 16, 0x3a424c).setDepth(2);

    const fog = this.add.graphics().setDepth(5);
    for (let i = 0; i < 8; i++) {
      fog.fillStyle(0xe8eef6, 0.1 + i * 0.06);
      fog.fillEllipse(fogX, fogY + 8 + i * 4, 170 - i * 8, 88 - i * 5);
    }
    this.add
      .text(fogX, fogY - 56, "FOG GATE", {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: "#e8eef6",
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setAlpha(0.85);

    this.tweens.add({
      targets: fog,
      alpha: { from: 0.7, to: 1 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
    });

    this.ensureAnims();

    this.player = this.physics.add
      .sprite(GAME_W / 2, GAME_H - TILE * 2, "walk", 18)
      .setScale(SPRITE_SCALE)
      .setDepth(4)
      .setCollideWorldBounds(true);
    this.player.body.setSize(22, 28).setOffset(21, 28);

    this.pants = this.add
      .sprite(this.player.x, this.player.y, "pants", 18)
      .setScale(SPRITE_SCALE)
      .setDepth(5)
      .setTint(0x3a4558);

    this.physics.add.collider(this.player, this.walls);

    const gateZone = this.add.zone(fogX, fogY + 16, 100, 80);
    this.physics.add.existing(gateZone, true);
    this.physics.add.overlap(this.player, gateZone, () => this.enterFog());

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.add
      .text(GAME_W / 2, GAME_H - 18, "WASD / arrows — approach the fog gate", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#9aa3b2",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);
  }

  private ensureAnims() {
    if (!this.anims.exists("p-idle")) {
      this.anims.create({
        key: "p-idle",
        frames: [{ key: "walk", frame: 18 }],
        frameRate: 1,
      });
    }
    for (let i = 0; i < DIRS.length; i++) {
      const dir = DIRS[i]!;
      const key = `p-walk-${dir}`;
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers("walk", {
          start: i * 9 + 1,
          end: i * 9 + 8,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  update() {
    if (this.entered) return;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
      this.facing = dirFromVector(vx, vy);
      this.player.anims.play(`p-walk-${this.facing}`, true);
    } else {
      this.player.anims.play("p-idle", true);
    }
    this.player.setVelocity(vx * PLAYER.speed, vy * PLAYER.speed);
    this.pants.setPosition(this.player.x, this.player.y);
    this.pants.setFrame(this.player.frame.name);
  }

  private enterFog() {
    if (this.entered) return;
    this.entered = true;
    this.player.setVelocity(0, 0);
    this.cameras.main.fadeOut(700, 10, 10, 14);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Boss");
    });
  }
}
