import Phaser from "phaser";
import {
  COBBLE,
  GAME_H,
  GAME_W,
  PLAYER,
  TILE,
  TILE_SCALE,
  dirFromVector,
  facingOffset,
  type Dir,
} from "./gameConfig";
import {
  attachLpcSprite,
  createPlayerAnims,
  frameKey,
  PLAYER_DISPLAY,
  preloadLpcPlayer,
} from "./lpcAssets";

const ASSET = "assets/lpc";

/** Outside the fog gate — walk north into the mist to begin. */
export class ApproachScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private keyAttack!: Phaser.Input.Keyboard.Key;
  private keyDodge!: Phaser.Input.Keyboard.Key;
  private facing: Dir = "up";
  private dodgeUntil = 0;
  private dodgeReadyAt = 0;
  private attackUntil = 0;
  private entered = false;

  constructor() {
    super("Approach");
  }

  preload() {
    this.load.spritesheet("floors", `${ASSET}/tiles/castlefloors.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    preloadLpcPlayer(this);
  }

  create() {
    this.entered = false;
    this.facing = "up";
    this.dodgeUntil = this.dodgeReadyAt = this.attackUntil = 0;
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

    this.tweens.add({
      targets: fog,
      alpha: { from: 0.7, to: 1 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
    });

    createPlayerAnims(this);

    this.player = this.physics.add
      .sprite(GAME_W / 2, GAME_H - TILE * 2 + 48, frameKey("p", "walk", "down", 1))
      .setDepth(4)
      .setCollideWorldBounds(true);
    attachLpcSprite(this.player, PLAYER_DISPLAY, 33, 42);

    this.physics.add.collider(this.player, this.walls);

    const gateZone = this.add.zone(fogX, fogY + 16, 100, 80);
    this.physics.add.existing(gateZone, true);
    this.physics.add.overlap(this.player, gateZone, () => this.enterFog());

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.keyAttack = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.keyDodge = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
    );

    this.add
      .text(
        GAME_W / 2,
        GAME_H - 18,
        "WASD move · Space attack · Shift dodge · approach the fog gate",
        {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#9aa3b2",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);
  }

  update() {
    if (this.entered) return;

    const now = this.time.now;
    if (now < this.dodgeUntil) return;
    if (now < this.attackUntil) return;

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
      this.player.setVelocity(vx * PLAYER.speed, vy * PLAYER.speed);
    } else {
      this.player.setVelocity(0, 0);
      this.player.anims.play(`p-idle-${this.facing}`, true);
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keyDodge) &&
      now >= this.dodgeReadyAt
    ) {
      const off = facingOffset(this.facing, 1);
      this.player.anims.play(`p-run-${this.facing}`, true);
      this.player.setVelocity(
        (vx || off.x) * PLAYER.dodgeSpeed,
        (vy || off.y) * PLAYER.dodgeSpeed,
      );
      this.dodgeUntil = now + PLAYER.dodgeMs;
      this.dodgeReadyAt = now + PLAYER.dodgeCooldownMs;
      this.player.setAlpha(0.45);
      this.time.delayedCall(PLAYER.iFrameMs, () => this.player.setAlpha(1));
    } else if (Phaser.Input.Keyboard.JustDown(this.keyAttack)) {
      this.attackUntil = now + PLAYER.attackMs;
      this.player.setVelocity(0, 0);
      this.player.anims.play(`p-slash-${this.facing}`, true);
    }
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
