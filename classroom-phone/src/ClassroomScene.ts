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
  /** Beat between ring VFX and the iPhone overlay */
  private phoneOpenDelay = 1800;
  /** Wait after notes start before the startled line */
  private playerPanicDelay = 500;

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

    const classmate =
      this.gameState.getClassmate("bob") ?? this.gameState.getAllClassmates()[0];

    this.beginPhoneSequence(classmate);
  }

  private beginPhoneSequence(classmate: Classmate): void {
    this.isPhoneActive = true;
    this.emitMusicNoteParticles();
    this.statusText.setText("Your phone is ringing…");
    this.time.delayedCall(this.playerPanicDelay, () => {
      if (!this.isPhoneActive) return;
      this.showPlayerPhonePanic();
    });

    this.time.delayedCall(this.phoneOpenDelay, () => {
      if (!this.isPhoneActive) return;
      this.statusText.setText(`Opening texts from ${classmate.name}…`);
      this.phoneOverlay.show(
        {
          fromId: classmate.id,
          fromName: classmate.name,
          thread: classmate.thread,
        },
        classmate.replies,
        (result) => this.handlePhoneResult(result, classmate),
      );
    });
  }

  private emitMusicNoteParticles(): void {
    const notes = ["♪", "♫", "♩", "♬"];
    // Sprite origin is near the feet (0.85); float notes from above the head.
    const headY = this.playerSprite.y - this.playerSprite.displayHeight * 0.9;
    for (let i = 0; i < 5; i++) {
      const note = this.add
        .text(
          this.playerSprite.x + Phaser.Math.Between(-10, 10),
          headY,
          notes[i % notes.length],
          {
            fontSize: "20px",
            color: "#FFD700",
            stroke: "#000000",
            strokeThickness: 4,
          },
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

  /** Startled “someone’s texting me in class” beat before the phone UI. */
  private showPlayerPhonePanic(): void {
    const baseY = this.playerSprite.y;
    const baseAngle = this.playerSprite.angle;

    this.tweens.add({
      targets: this.playerSprite,
      y: baseY - 5,
      angle: -8,
      duration: 90,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.playerSprite.y = baseY;
        this.playerSprite.angle = baseAngle;
      },
    });

    const lines = ["oh crap—", "who's texting?!", "not now…"];
    const line = Phaser.Utils.Array.GetRandom(lines);

    const bubble = this.add
      .text(this.playerSprite.x, this.playerSprite.y - 40, line, {
        fontSize: "13px",
        color: "#1a1a1a",
        backgroundColor: "#fff8c6",
        padding: { x: 6, y: 4 },
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui)
      .setAlpha(0);

    this.tweens.add({
      targets: bubble,
      alpha: 1,
      y: bubble.y - 6,
      duration: 180,
      ease: "Back.easeOut",
    });

    // Fade out as the phone is about to open (panic starts after playerPanicDelay)
    const fadeDelay = Math.max(
      0,
      this.phoneOpenDelay - this.playerPanicDelay - 350,
    );
    this.tweens.add({
      targets: bubble,
      alpha: 0,
      y: bubble.y - 18,
      duration: 400,
      delay: fadeDelay,
      onComplete: () => bubble.destroy(),
    });

    // Sweat-drop flair
    const sweat = this.add
      .text(this.playerSprite.x + 14, this.playerSprite.y - 28, "💦", {
        fontSize: "14px",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui)
      .setAlpha(0);

    this.tweens.add({
      targets: sweat,
      alpha: 1,
      y: sweat.y + 10,
      duration: 500,
      delay: 120,
      ease: "Quad.easeIn",
      onComplete: () => {
        this.tweens.add({
          targets: sweat,
          alpha: 0,
          duration: 250,
          onComplete: () => sweat.destroy(),
        });
      },
    });
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

      const classmate = Phaser.Utils.Array.GetRandom(
        this.gameState.getAllClassmates(),
      );
      this.beginPhoneSequence(classmate);
    });
  }
}
