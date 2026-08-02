import Phaser from "phaser";
import { SPEED, TILE, WORLD_H, WORLD_W } from "./gameConfig";
import { buildTerrain, preloadTerrain } from "./terrain";

type Direction = "up" | "down" | "left" | "right";

const DIRECTION_ROW: Record<Direction, number> = {
  up: 0,
  left: 1,
  down: 2,
  right: 3,
};

// Draw order matters: body first, then clothing, then head/hair on top.
const PLAYER_LAYERS = ["body", "pants", "shirt", "head", "hair"] as const;
const FRAMES_PER_ROW = 8;
const WALK_FRAME_RATE = 10; // frames per second

export class TopDownScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private outfitLayers: Phaser.GameObjects.Sprite[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private facing: Direction = "down";
  private walkClockMs = 0;

  constructor() {
    super("TopDown");
  }

  preload() {
    this.load.spritesheet("body", "assets/player/walk.png", {
      frameWidth: TILE,
      frameHeight: TILE,
    });
    this.load.spritesheet("pants", "assets/player/pants.png", {
      frameWidth: TILE,
      frameHeight: TILE,
    });
    this.load.spritesheet("shirt", "assets/player/shirt.png", {
      frameWidth: TILE,
      frameHeight: TILE,
    });
    this.load.spritesheet("head", "assets/player/head.png", {
      frameWidth: TILE,
      frameHeight: TILE,
    });
    this.load.spritesheet("hair", "assets/player/hair.png", {
      frameWidth: TILE,
      frameHeight: TILE,
    });

    preloadTerrain(this);
  }

  create() {
    this.cameras.main.setBackgroundColor("#4f8a3d");
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    const obstacles = buildTerrain(this);

    const startFrame = 8 * DIRECTION_ROW.down;
    this.player = this.physics.add.sprite(WORLD_W / 2, WORLD_H / 2, "body", startFrame);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(TILE * 0.5, TILE * 0.4);
    this.player.body.setOffset(TILE * 0.25, TILE * 0.55);
    this.physics.add.collider(this.player, obstacles);

    this.outfitLayers = PLAYER_LAYERS.filter((key) => key !== "body").map((key, i) =>
      this.add.sprite(this.player.x, this.player.y, key, startFrame).setDepth(2 + i),
    );

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.add
      .text(12, 10, "Topdown · WASD / Arrows to move", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "16px",
        color: "#f1faee",
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(10);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = {
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  update(_time: number, delta: number) {
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.keys.a.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.keys.d.isDown) vx += 1;
    if (this.cursors.up.isDown || this.keys.w.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.keys.s.isDown) vy += 1;

    const len = Math.hypot(vx, vy) || 1;
    this.player.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      if (Math.abs(vx) > Math.abs(vy)) this.facing = vx > 0 ? "right" : "left";
      else this.facing = vy > 0 ? "down" : "up";
    }

    // Every layer reads from this single clock, so they can never drift out of sync
    // the way independent per-sprite animations could.
    let column = 0;
    if (moving) {
      this.walkClockMs += delta;
      column = Math.floor(this.walkClockMs / (1000 / WALK_FRAME_RATE)) % FRAMES_PER_ROW;
    } else {
      this.walkClockMs = 0;
    }

    const frame = DIRECTION_ROW[this.facing] * FRAMES_PER_ROW + column;
    this.player.setFrame(frame);
    this.player.setDepth(this.player.y);
    for (const [i, sprite] of this.outfitLayers.entries()) {
      sprite.setPosition(this.player.x, this.player.y);
      sprite.setFrame(frame);
      sprite.setDepth(this.player.y + i + 1);
    }
  }
}
