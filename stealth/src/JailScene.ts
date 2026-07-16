import Phaser from "phaser";
import {
  createGuard,
  drawVisionCone,
  hasLineOfSight,
  inVisionCone,
  updateGuard,
  type Guard,
} from "./Guard";
import { createMobileControls, type MobileControls } from "./MobileControls";
import {
  GAME_H,
  GAME_W,
  MAP_ROWS,
  SPEED,
  TILE,
  TILE_SCALE,
} from "./gameConfig";

const ASSET = "assets/kenney-tiny-dungeon/Tiles";

type Cell = "." | "#" | "C" | "P" | "G" | "E";

export class JailScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private exit!: Phaser.GameObjects.Image;
  private guards: Guard[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private crates!: Phaser.Physics.Arcade.StaticGroup;
  private blocked = new Set<string>();
  private touch!: MobileControls;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private status!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private hiding = false;
  private nearCrate = false;
  private ended = false;
  private playerStart = { x: TILE * 1.5, y: TILE * 1.5 };

  constructor() {
    super("Jail");
  }

  preload() {
    this.load.image("floor", `${ASSET}/tile_0000.png`);
    this.load.image("wall", `${ASSET}/tile_0014.png`);
    this.load.image("crate", `${ASSET}/tile_0012.png`);
    this.load.image("door", `${ASSET}/tile_0025.png`);
    this.load.image("player", `${ASSET}/tile_0085.png`);
    this.load.image("guard", `${ASSET}/tile_0097_knight_original.png`);
  }

  create() {
    this.ended = false;
    this.hiding = false;
    this.guards = [];
    this.blocked.clear();

    this.walls = this.physics.add.staticGroup();
    this.crates = this.physics.add.staticGroup();

    const guardSpawns: { x: number; y: number; col: number; row: number }[] = [];
    let exitPos = { x: TILE * 8.5, y: TILE * 1.5 };

    for (let row = 0; row < MAP_ROWS.length; row++) {
      const line = MAP_ROWS[row]!;
      for (let col = 0; col < line.length; col++) {
        const ch = line[col] as Cell;
        const x = col * TILE + TILE / 2;
        const y = row * TILE + TILE / 2;

        if (ch !== "#") {
          this.add
            .image(x, y, "floor")
            .setScale(TILE_SCALE)
            .setDepth(0)
            .setTint(ch === "E" ? 0xa8d08d : 0xffffff);
        }

        if (ch === "#") {
          this.add.image(x, y, "wall").setScale(TILE_SCALE).setDepth(1);
          this.addStaticBlock(this.walls, x, y);
          this.blocked.add(`${col},${row}`);
        } else if (ch === "C") {
          this.add.image(x, y, "crate").setScale(TILE_SCALE).setDepth(3);
          this.addStaticBlock(this.crates, x, y, 36, 36);
          this.blocked.add(`${col},${row}`);
        } else if (ch === "P") {
          this.playerStart = { x, y };
        } else if (ch === "E") {
          exitPos = { x, y };
        } else if (ch === "G") {
          guardSpawns.push({ x, y, col, row });
        }
      }
    }

    this.exit = this.add.image(exitPos.x, exitPos.y, "door").setScale(TILE_SCALE).setDepth(2);

    this.player = this.physics.add.image(this.playerStart.x, this.playerStart.y, "player");
    this.player.setScale(TILE_SCALE);
    this.player.setDepth(6);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(10, 10);
    this.player.body.setOffset(3, 3);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.crates);

    // Horizontal patrols through corridor gaps near each spawn
    for (const spawn of guardSpawns) {
      const left = this.findOpenAlongRow(spawn.row, spawn.col, -1);
      const right = this.findOpenAlongRow(spawn.row, spawn.col, 1);
      const waypoints = [
        { x: left * TILE + TILE / 2, y: spawn.y },
        { x: right * TILE + TILE / 2, y: spawn.y },
      ];
      const guard = createGuard(this, spawn.x, spawn.y, waypoints);
      this.physics.add.collider(guard.sprite, this.walls);
      this.physics.add.collider(guard.sprite, this.crates);
      this.guards.push(guard);
    }

    this.status = this.add
      .text(12, GAME_H - 28, "Sneak to the exit · avoid the yellow cones", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "13px",
        color: "#e8dcc8",
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.add
      .text(12, 10, "Phaser · Jailbreak", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "16px",
        color: "#e8dcc8",
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.banner = this.add
      .text(GAME_W / 2, GAME_H / 2 - 40, "", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "28px",
        color: "#fff8e7",
        backgroundColor: "#000000cc",
        padding: { x: 18, y: 14 },
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30)
      .setVisible(false);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = {
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        e: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        r: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      };
    }

    this.touch = createMobileControls(this);
    this.touch.setActionLabel("Hide");
    this.touch.showDpad(true);
  }

  private addStaticBlock(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    w = TILE,
    h = TILE,
  ) {
    const block = this.add.rectangle(x, y, w, h, 0x000000, 0);
    this.physics.add.existing(block, true);
    group.add(block);
  }

  private findOpenAlongRow(row: number, startCol: number, dir: -1 | 1): number {
    let col = startCol;
    const line = MAP_ROWS[row]!;
    while (true) {
      const next = col + dir;
      if (next < 0 || next >= line.length) break;
      const ch = line[next]!;
      if (ch === "#" || ch === "C") break;
      col = next;
    }
    return col;
  }

  private isBlockedCell = (gx: number, gy: number) => this.blocked.has(`${gx},${gy}`);

  private nearestCrateDist(): number {
    let best = Infinity;
    for (const child of this.crates.getChildren()) {
      const r = child as Phaser.GameObjects.Rectangle;
      best = Math.min(best, Phaser.Math.Distance.Between(this.player.x, this.player.y, r.x, r.y));
    }
    return best;
  }

  private endGame(won: boolean) {
    this.ended = true;
    this.player.setVelocity(0, 0);
    for (const g of this.guards) {
      g.sprite.setVelocity(0, 0);
      g.alert = !won;
      drawVisionCone(g);
    }
    this.banner
      .setText(won ? "You escaped!\nTap Restart / R" : "Caught!\nTap Restart / R")
      .setVisible(true);
    this.touch.setActionLabel("Restart");
    this.touch.showDpad(false);
    this.status.setText(won ? "Freedom." : "The guards spotted you.");
  }

  update(_time: number, delta: number) {
    const keyConfirm =
      !!this.keys &&
      (Phaser.Input.Keyboard.JustDown(this.keys.e) ||
        Phaser.Input.Keyboard.JustDown(this.keys.space));
    const keyRestart = !!this.keys && Phaser.Input.Keyboard.JustDown(this.keys.r);
    const confirm = keyConfirm || this.touch.consumeAction();

    if (this.ended) {
      if (confirm || keyRestart) this.scene.restart();
      return;
    }

    this.nearCrate = this.nearestCrateDist() < 52;
    if (confirm && this.nearCrate) {
      this.hiding = !this.hiding;
    } else if (!this.nearCrate) {
      this.hiding = false;
    }

    if (this.hiding) {
      this.player.setVelocity(0, 0);
      this.player.setAlpha(0.35);
      this.touch.setActionLabel("Leave");
      this.status.setText("Hiding behind a crate…");
    } else {
      this.player.setAlpha(1);
      this.touch.setActionLabel(this.nearCrate ? "Hide" : "…");

      let vx = 0;
      let vy = 0;
      if (this.cursors?.left.isDown || this.keys?.a.isDown || this.touch.left) vx -= 1;
      if (this.cursors?.right.isDown || this.keys?.d.isDown || this.touch.right) vx += 1;
      if (this.cursors?.up.isDown || this.keys?.w.isDown || this.touch.up) vy -= 1;
      if (this.cursors?.down.isDown || this.keys?.s.isDown || this.touch.down) vy += 1;
      const len = Math.hypot(vx, vy) || 1;
      this.player.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);

      if (this.nearCrate) this.status.setText("Near a crate — tap Hide");
      else this.status.setText("Sneak to the exit · avoid the yellow cones");
    }

    for (const guard of this.guards) {
      updateGuard(guard, delta);
      const spotted =
        !this.hiding &&
        inVisionCone(guard, this.player.x, this.player.y) &&
        hasLineOfSight(
          guard.sprite.x,
          guard.sprite.y,
          this.player.x,
          this.player.y,
          this.isBlockedCell,
        );
      guard.alert = spotted;
      drawVisionCone(guard);
      if (spotted) {
        this.endGame(false);
        return;
      }
    }

    const toExit = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.exit.x,
      this.exit.y,
    );
    if (toExit < 36) this.endGame(true);
  }
}
