import Phaser from "phaser";
import { createMobileControls, type MobileControls } from "./MobileControls";
import { GAME_H, GAME_W, SPEED, TILE_SCALE, WORLD } from "./gameConfig";

const ASSET = "assets/kenney-tiny-dungeon/Tiles";

export class OverworldScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private npc!: Phaser.GameObjects.Image;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private touch!: MobileControls;
  private prompt!: Phaser.GameObjects.Text;
  private dialogue!: Phaser.GameObjects.Text;
  private talking = false;
  private nearNpc = false;

  constructor() {
    super("Overworld");
  }

  preload() {
    this.load.image("floor", `${ASSET}/tile_0000.png`);
    this.load.image("wall", `${ASSET}/tile_0014.png`);
    this.load.image("player", `${ASSET}/tile_0097.png`);
    this.load.image("npc", `${ASSET}/tile_0084.png`);
  }

  create() {
    this.add
      .tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, "floor")
      .setTileScale(TILE_SCALE)
      .setDepth(-2);

    const walls = this.physics.add.staticGroup();
    for (const w of WORLD.walls) {
      this.add
        .tileSprite(w.x, w.y, w.w, w.h, "wall")
        .setTileScale(TILE_SCALE)
        .setDepth(-1);
      const block = this.add.rectangle(w.x, w.y, w.w, w.h, 0x000000, 0);
      this.physics.add.existing(block, true);
      walls.add(block);
    }

    // Path up the center
    this.add
      .tileSprite(GAME_W / 2, 460, 96, 520, "floor")
      .setTileScale(TILE_SCALE)
      .setTint(0xc4a574)
      .setDepth(-1);

    this.player = this.physics.add.image(WORLD.playerStart.x, WORLD.playerStart.y, "player");
    this.player.setScale(TILE_SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(12, 12);
    this.player.body.setOffset(2, 2);
    this.physics.add.collider(this.player, walls);

    this.npc = this.add.image(WORLD.npc.x, WORLD.npc.y, "npc").setScale(TILE_SCALE);

    this.add
      .text(12, 10, "Phaser · Overworld", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "16px",
        color: "#d8f3dc",
      })
      .setScrollFactor(0)
      .setDepth(10);

    this.prompt = this.add
      .text(GAME_W / 2, 52, "", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "16px",
        color: "#fff",
        backgroundColor: "#000000aa",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.dialogue = this.add
      .text(GAME_W / 2, 140, "", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "17px",
        color: "#1a1a2e",
        backgroundColor: "#f8f9fa",
        padding: { x: 14, y: 12 },
        align: "center",
        wordWrap: { width: GAME_W - 48 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)
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
      };
    }

    this.touch = createMobileControls(this);
    this.touch.showDpad(true);
    this.touch.setActionLabel("Talk");
  }

  update() {
    const keyConfirm =
      !!this.keys &&
      (Phaser.Input.Keyboard.JustDown(this.keys.e) ||
        Phaser.Input.Keyboard.JustDown(this.keys.space));
    const confirm = keyConfirm || this.touch.consumeAction();

    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.npc.x,
      this.npc.y,
    );
    this.nearNpc = dist < 64;

    if (this.talking) {
      this.player.setVelocity(0, 0);
      this.prompt.setText("Tap Fight to begin");
      this.touch.setActionLabel("Fight");
      this.touch.showDpad(false);
      if (confirm) {
        this.talking = false;
        this.dialogue.setVisible(false);
        this.scene.start("Battle");
      }
      return;
    }

    this.touch.showDpad(true);

    let vx = 0;
    let vy = 0;
    if (this.cursors?.left.isDown || this.keys?.a.isDown || this.touch.left) vx -= 1;
    if (this.cursors?.right.isDown || this.keys?.d.isDown || this.touch.right) vx += 1;
    if (this.cursors?.up.isDown || this.keys?.w.isDown || this.touch.up) vy -= 1;
    if (this.cursors?.down.isDown || this.keys?.s.isDown || this.touch.down) vy += 1;
    const len = Math.hypot(vx, vy) || 1;
    this.player.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);

    if (this.nearNpc) {
      this.prompt.setText("Tap Talk");
      this.touch.setActionLabel("Talk");
      if (confirm) {
        this.talking = true;
        this.dialogue
          .setText('Wizard: "The road ahead is mine. Face me in battle!"')
          .setVisible(true);
      }
    } else {
      this.prompt.setText("Walk up to the wizard");
      this.touch.setActionLabel("OK");
    }
  }
}
