import Phaser from "phaser";
import { GAME_H, SPRITE_SCALE, seatWorld, type SeatId } from "./gameConfig";
import type { Classmate } from "./GameState";
import { GameState } from "./GameState";
import { PhoneOverlay } from "./PhoneOverlay";
import type { PhoneResult, ReplyOption } from "./PhoneOverlay";
import { ClassroomBuilder, DEPTH } from "./ClassroomBuilder";

export class ClassroomScene extends Phaser.Scene {
  private gameState!: GameState;
  private phoneOverlay!: PhoneOverlay;
  private builder!: ClassroomBuilder;
  private playerSprite!: Phaser.GameObjects.Image;
  private classmateSpriteMap = new Map<string, Phaser.GameObjects.Image>();
  private statusText!: Phaser.GameObjects.Text;
  private friendshipHud!: Phaser.GameObjects.Text;
  private isPhoneActive = false;
  private phoneRingDelay = 2500;

  constructor() {
    super("ClassroomScene");
  }

  preload(): void {
    this.builder = new ClassroomBuilder(this);
    this.builder.preload();
    this.load.image("player", "assets/characters/player.png");
    this.load.image("alice", "assets/characters/alice.png");
    this.load.image("bob", "assets/characters/bob.png");
    this.load.image("charlie", "assets/characters/charlie.png");
  }

  create(): void {
    this.gameState = new GameState();
    this.phoneOverlay = new PhoneOverlay(this);

    this.cameras.main.setBackgroundColor("#1a1a2e");
    this.builder.buildShell();

    // Player seat
    const playerSeat: SeatId = "L1";
    const occupied: SeatId[] = [
      playerSeat,
      ...this.gameState.getAllClassmates().map((c) => c.seat),
    ];

    this.builder.setupSeats(occupied);

    const playerPos = seatWorld(playerSeat);
    this.playerSprite = this.placeSeated(playerPos.x, playerPos.y, "player");
    this.addNameTag(playerPos.x, playerPos.y, "You");

    for (const classmate of this.gameState.getAllClassmates()) {
      const sprite = this.placeSeated(
        classmate.x,
        classmate.y,
        classmate.spriteKey,
      );
      this.classmateSpriteMap.set(classmate.id, sprite);
      this.addNameTag(classmate.x, classmate.y, classmate.name);
    }

    // Desks in front of occupied seats (covers lower body → "sitting")
    this.builder.placeOccupiedDesks();

    this.statusText = this.add
      .text(8, 8, "Classroom — wait for your phone…", {
        fontSize: "13px",
        color: "#ffffff",
        backgroundColor: "#00000099",
        padding: { x: 8, y: 5 },
      })
      .setDepth(DEPTH.ui)
      .setScrollFactor(0);

    this.friendshipHud = this.add
      .text(8, GAME_H - 28, this.friendshipSummary(), {
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#00000099",
        padding: { x: 8, y: 5 },
      })
      .setDepth(DEPTH.ui)
      .setScrollFactor(0);

    this.time.delayedCall(this.phoneRingDelay, () => this.triggerPhoneRing());
  }

  private placeSeated(
    x: number,
    y: number,
    textureKey: string,
  ): Phaser.GameObjects.Image {
    const sprite = this.add.image(x, y, textureKey);
    sprite.setScale(SPRITE_SCALE);
    sprite.setOrigin(0.5, 0.85);
    sprite.setDepth(DEPTH.character);
    return sprite;
  }

  private addNameTag(x: number, y: number, label: string): void {
    this.add
      .text(x, y - 22, label, {
        fontSize: "10px",
        color: "#1a1a1a",
        backgroundColor: "#ffffffcc",
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.desk + 1);
  }

  private friendshipSummary(): string {
    return this.gameState
      .getAllClassmates()
      .map((c) => `${c.name}: ${c.friendship}`)
      .join("   ");
  }

  private refreshHud(): void {
    this.friendshipHud.setText(this.friendshipSummary());
  }

  private triggerPhoneRing(): void {
    if (this.isPhoneActive) return;

    this.emitMusicNoteParticles();
    this.statusText.setText("Your phone is ringing…");

    const classmate =
      this.gameState.getClassmate("bob") ?? this.gameState.getAllClassmates()[0];

    this.isPhoneActive = true;
    this.phoneOverlay.show(
      {
        fromId: classmate.id,
        fromName: classmate.name,
        text: classmate.message,
      },
      classmate.replies,
      (result) => this.handlePhoneResult(result, classmate),
    );
  }

  private emitMusicNoteParticles(): void {
    const notes = ["♪", "♫", "♩", "♬"];
    for (let i = 0; i < 5; i++) {
      const note = this.add
        .text(
          this.playerSprite.x + Phaser.Math.Between(-10, 10),
          this.playerSprite.y - 8,
          notes[i % notes.length],
          { fontSize: "20px", color: "#FFD700" },
        )
        .setDepth(DEPTH.ui);

      this.tweens.add({
        targets: note,
        y: note.y - 80 - i * 6,
        x: note.x + Phaser.Math.Between(-24, 24),
        alpha: 0,
        duration: 1400,
        delay: i * 120,
        ease: "Quad.easeOut",
        onComplete: () => note.destroy(),
      });
    }
  }

  private handlePhoneResult(result: PhoneResult, classmate: Classmate): void {
    this.isPhoneActive = false;

    if (result.action === "ignore") {
      this.statusText.setText(`Ignored ${classmate.name}'s text.`);
      this.time.delayedCall(2200, () => {
        this.statusText.setText("Classroom — idle");
        this.scheduleNextRing();
      });
      return;
    }

    const reply: ReplyOption = result.reply;
    this.gameState.addFriendship(classmate.id, reply.friendshipDelta);
    this.refreshHud();

    const sign = reply.friendshipDelta > 0 ? "+" : "";
    this.statusText.setText(
      `Replied to ${classmate.name}: "${reply.label}"  (${sign}${reply.friendshipDelta})`,
    );

    const sprite = this.classmateSpriteMap.get(classmate.id);
    if (sprite) {
      this.showClassmateReaction(sprite, classmate.name, reply.friendshipDelta);
    }

    this.time.delayedCall(2500, () => {
      this.statusText.setText("Classroom — idle");
      this.scheduleNextRing();
    });
  }

  private showClassmateReaction(
    sprite: Phaser.GameObjects.Image,
    name: string,
    delta: number,
  ): void {
    this.tweens.add({
      targets: sprite,
      y: sprite.y - 6,
      duration: 160,
      yoyo: true,
    });

    const reaction =
      delta > 1 ? "😊 Nice!" : delta > 0 ? "👍" : delta === 0 ? "…" : "😕";

    const bubble = this.add
      .text(sprite.x, sprite.y - 36, `${name}: ${reaction}`, {
        fontSize: "12px",
        color: "#222222",
        backgroundColor: "#ffffff",
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    this.tweens.add({
      targets: bubble,
      y: bubble.y - 12,
      alpha: 0,
      duration: 1500,
      delay: 400,
      onComplete: () => bubble.destroy(),
    });
  }

  private scheduleNextRing(): void {
    this.time.delayedCall(this.phoneRingDelay + 1500, () => {
      if (this.isPhoneActive) return;

      this.emitMusicNoteParticles();
      this.statusText.setText("Your phone is ringing…");

      const classmate = Phaser.Utils.Array.GetRandom(
        this.gameState.getAllClassmates(),
      );

      this.isPhoneActive = true;
      this.phoneOverlay.show(
        {
          fromId: classmate.id,
          fromName: classmate.name,
          text: classmate.message,
        },
        classmate.replies,
        (result) => this.handlePhoneResult(result, classmate),
      );
    });
  }
}
