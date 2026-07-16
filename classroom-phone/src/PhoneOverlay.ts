import Phaser from "phaser";
import { GAME_W, GAME_H } from "./gameConfig";

export type MessageSender = "them" | "me";

export interface ThreadMessage {
  from: MessageSender;
  text: string;
}

export interface PhoneMessage {
  fromId: string;
  fromName: string;
  thread: ThreadMessage[];
}

export interface ReplyOption {
  id: string;
  label: string;
  /** Friendship delta applied when this reply is chosen */
  friendshipDelta: number;
}

export type PhoneResult =
  | { action: "ignore" }
  | { action: "respond"; reply: ReplyOption };

const PHONE_W = 300;
const PHONE_H = 500;
const SCREEN_PAD = 14;
const BUBBLE_MAX_W = 190;
const BUBBLE_PAD_X = 12;
const BUBBLE_PAD_Y = 8;
const BUBBLE_GAP = 8;
const THREAD_TOP = -PHONE_H / 2 + 88;
const THREAD_BOTTOM = PHONE_H / 2 - 150;
const THREAD_H = THREAD_BOTTOM - THREAD_TOP;

export class PhoneOverlay {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container | null = null;
  private threadContainer: Phaser.GameObjects.Container | null = null;
  private replyContainer: Phaser.GameObjects.Container | null = null;
  private maskGraphics: Phaser.GameObjects.Graphics | null = null;
  private onResult: ((result: PhoneResult) => void) | null = null;
  private replies: ReplyOption[] = [];
  private thread: ThreadMessage[] = [];
  private threadContentH = 0;
  private scrollY = 0;
  private deciding = false;
  private dragLastY = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(
    message: PhoneMessage,
    replies: ReplyOption[],
    onResult: (result: PhoneResult) => void,
  ): void {
    this.closeImmediate();
    this.replies = replies;
    this.thread = [...message.thread];
    this.onResult = onResult;
    this.deciding = false;
    this.scrollY = 0;

    const dim = this.scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55);
    dim.setInteractive();

    const phoneBody = this.scene.add.rectangle(0, 0, PHONE_W, PHONE_H, 0x111113);
    phoneBody.setStrokeStyle(4, 0x2c2c2e);

    const screen = this.scene.add.rectangle(
      0,
      0,
      PHONE_W - 10,
      PHONE_H - 10,
      0x000000,
    );

    const notch = this.scene.add.rectangle(
      0,
      -PHONE_H / 2 + 22,
      96,
      22,
      0x1c1c1e,
    );

    const statusTime = this.scene.add
      .text(-PHONE_W / 2 + 22, -PHONE_H / 2 + 22, "9:41", {
        fontSize: "12px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    const headerBg = this.scene.add.rectangle(
      0,
      -PHONE_H / 2 + 58,
      PHONE_W - 10,
      44,
      0x1c1c1e,
    );

    const backBtn = this.scene.add
      .text(-PHONE_W / 2 + 22, -PHONE_H / 2 + 58, "‹ Not now", {
        fontSize: "13px",
        color: "#0a84ff",
        fontFamily: "Arial",
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    backBtn.on("pointerdown", () => {
      if (this.deciding) return;
      this.finish({ action: "ignore" });
    });

    const fromLabel = this.scene.add
      .text(0, -PHONE_H / 2 + 52, message.fromName, {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const subLabel = this.scene.add
      .text(0, -PHONE_H / 2 + 70, "iMessage", {
        fontSize: "11px",
        color: "#8e8e93",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);

    const homeIndicator = this.scene.add.rectangle(
      0,
      PHONE_H / 2 - 14,
      110,
      5,
      0x3a3a3c,
    );

    this.root = this.scene.add.container(GAME_W / 2, GAME_H / 2, [
      dim,
      phoneBody,
      screen,
      notch,
      statusTime,
      headerBg,
      backBtn,
      fromLabel,
      subLabel,
      homeIndicator,
    ]);
    this.root.setDepth(1000);
    this.root.setAlpha(0);

    this.buildThreadArea();
    this.buildReplyOptions();

    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      duration: 250,
      ease: "Quad.easeOut",
    });
  }

  private buildThreadArea(): void {
    if (!this.root) return;

    this.threadContainer = this.scene.add.container(0, THREAD_TOP);
    this.root.add(this.threadContainer);

    this.maskGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(
      GAME_W / 2 - PHONE_W / 2 + SCREEN_PAD,
      GAME_H / 2 + THREAD_TOP,
      PHONE_W - SCREEN_PAD * 2,
      THREAD_H,
    );
    this.threadContainer.setMask(this.maskGraphics.createGeometryMask());

    // Invisible zone for dragging to scroll prior messages
    const dragZone = this.scene.add
      .rectangle(0, THREAD_TOP + THREAD_H / 2, PHONE_W - 24, THREAD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.root.add(dragZone);

    dragZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.dragLastY = pointer.y;
    });
    dragZone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || this.deciding) return;
      const delta = pointer.y - this.dragLastY;
      this.dragLastY = pointer.y;
      this.applyScroll(this.scrollY + delta);
    });

    this.scene.input.on("wheel", this.onWheel, this);

    this.layoutThread(true);
  }

  private onWheel(
    _pointer: Phaser.Input.Pointer,
    _gOs: Phaser.GameObjects.GameObject[],
    _dx: number,
    dy: number,
  ): void {
    if (!this.root || this.deciding) return;
    this.applyScroll(this.scrollY - dy * 0.4);
  }

  private applyScroll(nextY: number): void {
    if (!this.threadContainer) return;
    const minScroll = Math.min(0, THREAD_H - this.threadContentH - 8);
    this.scrollY = Phaser.Math.Clamp(nextY, minScroll, 0);
    this.threadContainer.y = THREAD_TOP + this.scrollY;
  }

  private layoutThread(scrollToBottom: boolean): void {
    if (!this.threadContainer) return;

    this.threadContainer.removeAll(true);

    let y = 8;
    for (const msg of this.thread) {
      const bubble = this.makeBubble(msg, y);
      this.threadContainer.add(bubble.container);
      y += bubble.height + BUBBLE_GAP;
    }
    this.threadContentH = y + 4;

    if (scrollToBottom || this.threadContentH > THREAD_H) {
      const minScroll = Math.min(0, THREAD_H - this.threadContentH - 8);
      this.scrollY = minScroll;
    } else {
      this.scrollY = 0;
    }
    this.threadContainer.y = THREAD_TOP + this.scrollY;
  }

  private makeBubble(
    msg: ThreadMessage,
    y: number,
  ): { container: Phaser.GameObjects.Container; height: number } {
    const mine = msg.from === "me";
    const fill = mine ? 0x0a84ff : 0x3a3a3c;

    const text = this.scene.add.text(0, 0, msg.text, {
      fontSize: "14px",
      color: "#ffffff",
      fontFamily: "Arial",
      wordWrap: { width: BUBBLE_MAX_W - BUBBLE_PAD_X * 2 },
      align: "left",
    });

    const bw = Math.min(BUBBLE_MAX_W, text.width + BUBBLE_PAD_X * 2);
    const bh = text.height + BUBBLE_PAD_Y * 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 14);
    text.setPosition(-bw / 2 + BUBBLE_PAD_X, -bh / 2 + BUBBLE_PAD_Y);

    const edgeX = PHONE_W / 2 - SCREEN_PAD - 8;
    const x = mine ? edgeX - bw / 2 : -edgeX + bw / 2;

    const container = this.scene.add.container(x, y + bh / 2, [bg, text]);
    return { container, height: bh };
  }

  private buildReplyOptions(): void {
    if (!this.root) return;

    this.replyContainer = this.scene.add.container(0, 0);
    this.root.add(this.replyContainer);

    const prompt = this.scene.add
      .text(0, THREAD_BOTTOM + 14, "What do you say?", {
        fontSize: "12px",
        color: "#8e8e93",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.replyContainer.add(prompt);

    const startY = THREAD_BOTTOM + 40;
    this.replies.forEach((reply, i) => {
      const y = startY + i * 36;
      const btn = this.makeReplyChip(0, y, reply, () => this.selectReply(reply));
      this.replyContainer!.add(btn);
    });
  }

  private makeReplyChip(
    x: number,
    y: number,
    reply: ReplyOption,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const w = PHONE_W - 40;
    const h = 32;
    const bg = this.scene.add.rectangle(0, 0, w, h, 0x1c1c1e);
    bg.setStrokeStyle(1.5, 0x0a84ff);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => bg.setFillStyle(0x0a84ff, 0.2));
    bg.on("pointerout", () => bg.setFillStyle(0x1c1c1e, 1));
    bg.on("pointerdown", onClick);

    const text = this.scene.add
      .text(0, 0, reply.label, {
        fontSize: "13px",
        color: "#0a84ff",
        fontFamily: "Arial",
        align: "center",
        wordWrap: { width: w - 16 },
      })
      .setOrigin(0.5);

    return this.scene.add.container(x, y, [bg, text]);
  }

  private selectReply(reply: ReplyOption): void {
    if (this.deciding || !this.replyContainer) return;
    this.deciding = true;

    // Hide reply chips so the choice reads as “sent”
    this.replyContainer.setVisible(false);

    this.thread.push({ from: "me", text: reply.label });
    this.layoutThread(true);

    // Brief beat so the blue bubble lands in the thread
    this.scene.time.delayedCall(900, () => {
      this.finish({ action: "respond", reply });
    });
  }

  private finish(result: PhoneResult): void {
    const cb = this.onResult;
    this.onResult = null;
    this.scene.input.off("wheel", this.onWheel, this);
    this.close(() => cb?.(result));
  }

  close(onDone?: () => void): void {
    if (!this.root) {
      onDone?.();
      return;
    }
    const root = this.root;
    this.root = null;
    this.threadContainer = null;
    this.replyContainer = null;
    if (this.maskGraphics) {
      this.maskGraphics.destroy();
      this.maskGraphics = null;
    }
    this.scene.tweens.add({
      targets: root,
      alpha: 0,
      duration: 200,
      ease: "Quad.easeIn",
      onComplete: () => {
        root.destroy(true);
        onDone?.();
      },
    });
  }

  private closeImmediate(): void {
    this.scene.input.off("wheel", this.onWheel, this);
    if (this.maskGraphics) {
      this.maskGraphics.destroy();
      this.maskGraphics = null;
    }
    if (this.root) {
      this.root.destroy(true);
      this.root = null;
    }
    this.threadContainer = null;
    this.replyContainer = null;
    this.onResult = null;
  }
}
