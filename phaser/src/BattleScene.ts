import Phaser from "phaser";
import { createMobileControls, type MobileControls } from "./MobileControls";
import { BATTLE_SCALE, GAME_H, GAME_W } from "./gameConfig";

const PLAYER_MAX = 30;
const ENEMY_MAX = 24;
const PLAYER_ATK = 8;
const ENEMY_ATK = 6;
const ASSET = "assets/kenney-tiny-dungeon/Tiles";

export class BattleScene extends Phaser.Scene {
  private playerHp = PLAYER_MAX;
  private enemyHp = ENEMY_MAX;
  private playerHpText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private log!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private touch!: MobileControls;
  private busy = false;
  private over = false;

  constructor() {
    super("Battle");
  }

  preload() {
    this.load.image("floor", `${ASSET}/tile_0000.png`);
    this.load.image("player", `${ASSET}/tile_0097.png`);
    this.load.image("npc", `${ASSET}/tile_0084.png`);
  }

  create() {
    this.playerHp = PLAYER_MAX;
    this.enemyHp = ENEMY_MAX;
    this.busy = false;
    this.over = false;

    this.cameras.main.setBackgroundColor("#1b263b");
    this.add
      .tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, "floor")
      .setTileScale(4)
      .setTint(0x415a77);

    // Portrait battle: foe above, hero below
    this.add.image(GAME_W / 2, 220, "npc").setScale(BATTLE_SCALE);
    this.add.image(GAME_W / 2, 480, "player").setScale(BATTLE_SCALE);

    this.add
      .text(12, 10, "Phaser · Battle", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "16px",
        color: "#e0e1dd",
      })
      .setDepth(10);

    this.enemyHpText = this.add
      .text(GAME_W / 2, 120, "", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "18px",
        color: "#c77dff",
      })
      .setOrigin(0.5);

    this.playerHpText = this.add
      .text(GAME_W / 2, 560, "", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "18px",
        color: "#90e0ef",
      })
      .setOrigin(0.5);

    this.log = this.add
      .text(GAME_W / 2, 320, "A wizard blocks your path!", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "18px",
        color: "#e0e1dd",
        align: "center",
        wordWrap: { width: GAME_W - 48 },
      })
      .setOrigin(0.5);

    this.prompt = this.add
      .text(GAME_W / 2, 52, "Tap Attack", {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "16px",
        color: "#fff",
        backgroundColor: "#000000aa",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5);

    if (this.input.keyboard) {
      this.keys = {
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      };
    }

    this.touch = createMobileControls(this);
    this.touch.showDpad(false);
    this.touch.setActionLabel("Attack");

    this.refreshHp();
  }

  update() {
    if (this.busy) return;

    const keyAttack =
      !!this.keys &&
      (Phaser.Input.Keyboard.JustDown(this.keys.a) ||
        Phaser.Input.Keyboard.JustDown(this.keys.space));
    const attack = keyAttack || this.touch.consumeAction();

    if (!attack) return;

    if (this.over) {
      this.scene.start("Overworld");
      return;
    }

    this.busy = true;
    this.enemyHp = Math.max(0, this.enemyHp - PLAYER_ATK);
    this.refreshHp();
    this.log.setText(`You strike for ${PLAYER_ATK} damage!`);

    this.time.delayedCall(550, () => {
      if (this.enemyHp <= 0) {
        this.finish(true);
        return;
      }

      this.playerHp = Math.max(0, this.playerHp - ENEMY_ATK);
      this.refreshHp();
      this.log.setText(`Wizard hits you for ${ENEMY_ATK} damage!`);

      this.time.delayedCall(550, () => {
        if (this.playerHp <= 0) {
          this.finish(false);
          return;
        }
        this.log.setText("Your turn.");
        this.busy = false;
      });
    });
  }

  private refreshHp() {
    this.playerHpText.setText(`You  HP ${this.playerHp}/${PLAYER_MAX}`);
    this.enemyHpText.setText(`Foe  HP ${this.enemyHp}/${ENEMY_MAX}`);
  }

  private finish(won: boolean) {
    this.over = true;
    this.busy = false;
    this.log.setText(won ? "Victory!" : "Defeated...");
    this.prompt.setText("Tap OK to return");
    this.touch.setActionLabel("OK");
  }
}
