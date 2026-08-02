import Phaser from "phaser";
import {
  ARENA_FLOOR,
  BOSS,
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
  BOSS_DISPLAY,
  bossFacingToward,
  createBossAnims,
  createPlayerAnims,
  frameKey,
  PLAYER_DISPLAY,
  preloadLpcBoss,
  preloadLpcPlayer,
} from "./lpcAssets";

const ASSET = "assets/lpc";

type Mode = "intro" | "fight" | "shift" | "dead" | "won";
type Attack = "slam" | "slash" | "charge";
type BossState = "chase" | "windup" | "strike" | "recover";

/** Arena fight with Dark Souls-style intro and two phases. */
export class BossScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private boss!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private keyAttack!: Phaser.Input.Keyboard.Key;
  private keyDodge!: Phaser.Input.Keyboard.Key;

  private facing: Dir = "up";
  private bossFacing: Dir = "down";
  private mode: Mode = "intro";
  private phase = 1;
  private playerHp = PLAYER.hp;
  private bossHp = BOSS.hp;
  private invulnUntil = 0;
  private dodgeUntil = 0;
  private dodgeReadyAt = 0;
  private attackUntil = 0;
  private bossState: BossState = "chase";
  private bossAttack: Attack = "slam";
  private bossStateAt = 0;
  private chargeDir = { x: 0, y: 0 };
  private chargeHitThisStrike = false;
  private bossBar!: Phaser.GameObjects.Graphics;
  private playerBar!: Phaser.GameObjects.Graphics;
  private banner!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private telegraph!: Phaser.GameObjects.Rectangle;
  private skipIntro = false;

  constructor() {
    super("Boss");
  }

  init(data: { skipIntro?: boolean }) {
    this.skipIntro = !!data.skipIntro;
  }

  preload() {
    this.load.spritesheet("floors", `${ASSET}/tiles/castlefloors.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    preloadLpcPlayer(this);
    preloadLpcBoss(this);
  }

  create() {
    this.mode = this.skipIntro ? "fight" : "intro";
    this.phase = 1;
    this.playerHp = PLAYER.hp;
    this.bossHp = BOSS.hp;
    this.invulnUntil = this.dodgeUntil = this.dodgeReadyAt = 0;
    this.attackUntil = 0;
    this.bossState = "chase";
    this.facing = "up";
    this.bossFacing = "down";

    this.buildArena();
    createPlayerAnims(this);
    createBossAnims(this);

    this.player = this.physics.add
      .sprite(GAME_W / 2, GAME_H - TILE * 2.2 + 48, frameKey("p", "walk", "down", 1))
      .setDepth(4)
      .setCollideWorldBounds(true);
    attachLpcSprite(this.player, PLAYER_DISPLAY, 33, 42);

    this.boss = this.physics.add
      .sprite(GAME_W / 2, TILE * 3.2 + 77, frameKey("b", "walk", "down", 1))
      .setDepth(4)
      .setImmovable(true);
    attachLpcSprite(this.boss, BOSS_DISPLAY, 82, 96);

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.boss, this.walls);
    this.physics.add.collider(this.player, this.boss);

    this.telegraph = this.add
      .rectangle(0, 0, 40, 40, 0xff4422, 0.35)
      .setDepth(3)
      .setVisible(false);

    this.bossBar = this.add.graphics().setDepth(30).setScrollFactor(0);
    this.playerBar = this.add.graphics().setDepth(30).setScrollFactor(0);

    this.banner = this.add
      .text(GAME_W / 2, GAME_H / 2, "", {
        fontFamily: "Georgia, serif",
        fontSize: "42px",
        color: "#e8e0d4",
        stroke: "#1a120c",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setAlpha(0);

    this.hint = this.add
      .text(GAME_W / 2, GAME_H - 16, "WASD move · Space attack · Shift dodge", {
        fontFamily: "serif",
        fontSize: "13px",
        color: "#8a909c",
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setScrollFactor(0);

    this.add
      .text(GAME_W / 2, 6, BOSS.name, {
        fontFamily: "Georgia, serif",
        fontSize: "12px",
        color: "#d8d0c4",
      })
      .setOrigin(0.5, 0)
      .setDepth(31)
      .setScrollFactor(0);

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

    this.drawBars();
    this.cameras.main.fadeIn(500, 10, 10, 14);

    if (this.mode === "intro") this.playIntro();
    else this.bossStateAt = this.time.now + 400;
  }

  private buildArena() {
    this.walls = this.physics.add.staticGroup();
    const cols = Math.ceil(GAME_W / TILE);
    const rows = Math.ceil(GAME_H / TILE);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE / 2;
        const edge = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
        if (edge) {
          const block = this.add
            .rectangle(x, y, TILE, TILE, 0x2a2430)
            .setDepth(1)
            .setStrokeStyle(2, 0x4a4050);
          this.physics.add.existing(block, true);
          this.walls.add(block);
        } else {
          const center =
            r >= Math.floor(rows / 2) - 2 &&
            r <= Math.floor(rows / 2) + 1 &&
            c >= Math.floor(cols / 2) - 3 &&
            c <= Math.floor(cols / 2) + 2;
          this.add
            .image(
              x,
              y,
              "floors",
              center ? ARENA_FLOOR : COBBLE[(r + c) % COBBLE.length]!,
            )
            .setScale(TILE_SCALE)
            .setDepth(0)
            .setTint(center ? 0xd0a080 : 0x8a8890);
        }
      }
    }
    this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0a0810, 0.22)
      .setDepth(2);
  }

  private playIntro() {
    this.player.setVelocity(0, 0);
    this.boss.setVelocity(0, 0);
    this.cameras.main.zoomTo(1.35, 1200, "Sine.easeInOut");
    this.cameras.main.pan(this.boss.x, this.boss.y - 20, 1200, "Sine.easeInOut");
    this.time.delayedCall(900, () => {
      this.banner.setText(BOSS.name).setAlpha(0).setScale(1.2);
      this.tweens.add({
        targets: this.banner,
        alpha: 1,
        scale: 1,
        duration: 700,
      });
    });
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: this.banner,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.cameras.main.zoomTo(1, 600);
          this.cameras.main.pan(GAME_W / 2, GAME_H / 2, 600);
          this.mode = "fight";
          this.bossStateAt = this.time.now + 300;
        },
      });
    });
  }

  update() {
    this.drawBars();
    if (this.mode === "intro" || this.mode === "shift") {
      this.player.setVelocity(0, 0);
      this.boss.setVelocity(0, 0);
      return;
    }
    if (this.mode === "dead" || this.mode === "won") {
      this.player.setVelocity(0, 0);
      this.boss.setVelocity(0, 0);
      if (Phaser.Input.Keyboard.JustDown(this.keyAttack)) {
        this.scene.start("Boss", { skipIntro: true });
      }
      return;
    }

    this.updatePlayer();
    this.updateBoss();
  }

  private updatePlayer() {
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
      this.player.anims.play("p-idle", true);
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
      this.invulnUntil = now + PLAYER.iFrameMs;
      this.player.setAlpha(0.45);
      this.time.delayedCall(PLAYER.iFrameMs, () => this.player.setAlpha(1));
    } else if (Phaser.Input.Keyboard.JustDown(this.keyAttack)) {
      this.attackUntil = now + PLAYER.attackMs;
      this.player.setVelocity(0, 0);
      this.player.anims.play(`p-slash-${this.facing}`, true);
      const off = facingOffset(this.facing, PLAYER.attackReach);
      const bossR = 28 * 2.4 * 0.45;
      if (
        Math.hypot(this.boss.x - (this.player.x + off.x), this.boss.y - (this.player.y + off.y)) <
        bossR + 22
      ) {
        this.damageBoss();
      }
    }
  }

  private damageBoss() {
    if (this.mode !== "fight") return;
    this.bossHp = Math.max(0, this.bossHp - 1);
    this.boss.setTintFill(0xffffff);
    this.time.delayedCall(80, () => {
      this.boss.clearTint();
      if (this.phase === 2) this.boss.setTint(0xff6655);
    });
    if (this.bossHp <= 0) {
      this.win();
      return;
    }
    if (this.phase === 1 && this.bossHp <= BOSS.hp / 2) this.startPhase2();
  }

  private startPhase2() {
    this.phase = 2;
    this.mode = "shift";
    this.boss.setVelocity(0, 0);
    this.player.setVelocity(0, 0);
    this.telegraph.setVisible(false);
    this.boss.setTint(0xff6655);
    this.banner.setText("SECOND FORM").setAlpha(0);
    this.cameras.main.flash(400, 180, 40, 20);
    this.tweens.add({ targets: this.banner, alpha: 1, duration: 400 });
    this.time.delayedCall(1400, () => {
      this.tweens.add({
        targets: this.banner,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          this.mode = "fight";
          this.bossState = "chase";
          this.bossStateAt = this.time.now + 200;
        },
      });
    });
  }

  private updateBoss() {
    const now = this.time.now;
    const speed = this.phase === 1 ? BOSS.speed : BOSS.speedP2;
    const windup = this.phase === 1 ? BOSS.windupMs : BOSS.windupMsP2;
    const recover = this.phase === 1 ? BOSS.recoverMs : BOSS.recoverMsP2;
    this.bossFacing = bossFacingToward(
      this.boss.x,
      this.boss.y,
      this.player.x,
      this.player.y,
    );
    const walkKey = `b-walk-${this.bossFacing}`;
    const idleKey = `b-idle-${this.bossFacing}`;

    if (this.bossState === "chase") {
      const dx = this.player.x - this.boss.x;
      const dy = this.player.y - this.boss.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.boss.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      this.boss.anims.play(walkKey, true);
      if (now >= this.bossStateAt) {
        if (dist > 80) {
          if (this.phase !== 2) return;
          this.bossAttack = "charge";
          this.chargeDir = { x: dx / dist, y: dy / dist };
        } else {
          this.pickAttack();
        }
        this.boss.setVelocity(0, 0);
        this.bossState = "windup";
        this.bossStateAt = now + windup;
        this.showTelegraph();
      }
    } else if (this.bossState === "windup") {
      this.boss.setVelocity(0, 0);
      this.boss.anims.play(idleKey, true);
      this.showTelegraph();
      if (now >= this.bossStateAt) {
        this.bossState = "strike";
        this.bossStateAt =
          now + (this.bossAttack === "charge" ? 320 : BOSS.strikeMs);
        this.doStrike();
      }
    } else if (this.bossState === "strike") {
      if (this.bossAttack === "charge") {
        this.boss.setVelocity(
          this.chargeDir.x * speed * 3.2,
          this.chargeDir.y * speed * 3.2,
        );
        this.boss.anims.play(walkKey, true);
        this.showTelegraph();
        if (!this.chargeHitThisStrike && this.chargeHitsPlayer()) {
          this.chargeHitThisStrike = true;
          this.hurtPlayer();
        }
      } else {
        const atkKey =
          this.bossAttack === "slam"
            ? `b-thrust-${this.bossFacing}`
            : `b-slash-${this.bossFacing}`;
        this.boss.anims.play(atkKey, true);
        this.boss.setVelocity(0, 0);
      }
      if (now >= this.bossStateAt) {
        this.telegraph.setVisible(false);
        this.bossState = "recover";
        this.bossStateAt = now + recover;
        this.boss.setVelocity(0, 0);
      }
    } else if (this.bossState === "recover") {
      this.boss.setVelocity(0, 0);
      this.boss.anims.play(idleKey, true);
      if (now >= this.bossStateAt) {
        this.bossState = "chase";
        this.bossStateAt = now + (this.phase === 1 ? 700 : 420);
      }
    }
  }

  private pickAttack() {
    const roll = Math.random();
    if (roll < 0.5) this.bossAttack = "slam";
    else this.bossAttack = "slash";

    const dx = this.player.x - this.boss.x;
    const dy = this.player.y - this.boss.y;
    const len = Math.hypot(dx, dy) || 1;
    this.chargeDir = { x: dx / len, y: dy / len };
  }

  private showTelegraph() {
    if (this.bossAttack === "charge") {
      this.telegraph
        .setPosition(
          this.boss.x + this.chargeDir.x * 50,
          this.boss.y + this.chargeDir.y * 50,
        )
        .setSize(48, 110)
        .setRotation(
          Math.atan2(this.chargeDir.y, this.chargeDir.x) + Math.PI / 2,
        )
        .setVisible(true);
    } else if (this.bossAttack === "slam") {
      this.telegraph
        .setPosition(
          this.boss.x + this.chargeDir.x * 40,
          this.boss.y + this.chargeDir.y * 40,
        )
        .setSize(52, 72)
        .setRotation(0)
        .setVisible(true);
    } else {
      const d = BOSS.reach * 2 + 20;
      this.telegraph
        .setPosition(this.boss.x, this.boss.y)
        .setSize(d, d)
        .setRotation(0)
        .setVisible(true);
    }
  }

  private doStrike() {
    this.telegraph.setFillStyle(0xff2200, 0.55);
    this.time.delayedCall(120, () =>
      this.telegraph.setFillStyle(0xff4422, 0.35),
    );
    this.chargeHitThisStrike = false;

    if (this.bossAttack === "slam") {
      const tx = this.boss.x + this.chargeDir.x * 40;
      const ty = this.boss.y + this.chargeDir.y * 40;
      if (Math.hypot(this.player.x - tx, this.player.y - ty) < 48) {
        this.hurtPlayer();
      }
    } else if (this.bossAttack === "slash") {
      if (
        Math.hypot(this.player.x - this.boss.x, this.player.y - this.boss.y) <
        BOSS.reach + 10
      ) {
        this.hurtPlayer(160);
      }
      if (this.phase === 2) {
        this.time.delayedCall(200, () => {
          if (this.mode !== "fight") return;
          this.boss.anims.play(`b-slash-reverse-${this.bossFacing}`, true);
          if (
            Math.hypot(this.player.x - this.boss.x, this.player.y - this.boss.y) <
            BOSS.reach + 14
          ) {
            this.hurtPlayer();
          }
        });
      }
    }
  }

  private chargeHitsPlayer() {
    const dx = this.player.x - this.boss.x;
    const dy = this.player.y - this.boss.y;
    const along = dx * this.chargeDir.x + dy * this.chargeDir.y;
    const perp = Math.abs(dx * -this.chargeDir.y + dy * this.chargeDir.x);
    return along > -10 && along < 90 && perp < 28;
  }

  private hurtPlayer(iFrameMs = 700) {
    const now = this.time.now;
    if (now < this.invulnUntil || this.mode !== "fight") return;
    this.playerHp -= BOSS.damage;
    this.invulnUntil = now + iFrameMs;
    this.cameras.main.shake(120, 0.01);
    this.player.setTintFill(0xffaaaa);
    this.time.delayedCall(100, () => this.player.clearTint());
    if (this.playerHp <= 0) this.die();
  }

  private die() {
    this.mode = "dead";
    this.telegraph.setVisible(false);
    this.player.setVelocity(0, 0);
    this.player.anims.play("p-hurt");
    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.player.anims.stop();
    });
    this.banner.setText("YOU DIED").setColor("#a01818").setAlpha(1);
    this.hint.setText("Space — retry fight");
  }

  private win() {
    this.mode = "won";
    this.telegraph.setVisible(false);
    this.boss.setVelocity(0, 0);
    this.boss.anims.play("b-hurt");
    this.boss.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.boss.anims.stop();
    });
    this.banner.setText("VICTORY").setColor("#e8dcc0").setAlpha(1);
    this.hint.setText("Space — fight again");
  }

  private drawBars() {
    this.bossBar.clear();
    this.playerBar.clear();
    const bw = 420;
    const bx = (GAME_W - bw) / 2;
    this.bossBar.fillStyle(0x1a1210, 0.85);
    this.bossBar.fillRect(bx - 2, 22, bw + 4, 14);
    this.bossBar.fillStyle(0x5a1010, 1);
    this.bossBar.fillRect(bx, 24, bw, 10);
    this.bossBar.fillStyle(this.phase === 1 ? 0xc4a46a : 0xe05030, 1);
    this.bossBar.fillRect(bx, 24, bw * (this.bossHp / BOSS.hp), 10);

    const pw = 160;
    this.playerBar.fillStyle(0x1a1210, 0.85);
    this.playerBar.fillRect(18, GAME_H - 36, pw + 4, 14);
    this.playerBar.fillStyle(0x203018, 1);
    this.playerBar.fillRect(20, GAME_H - 34, pw, 10);
    this.playerBar.fillStyle(0x6ecf6a, 1);
    this.playerBar.fillRect(20, GAME_H - 34, pw * (this.playerHp / PLAYER.hp), 10);
  }
}
