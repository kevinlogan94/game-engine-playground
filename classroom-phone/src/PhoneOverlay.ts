import Phaser from "phaser";
import { GAME_W, GAME_H } from "./gameConfig";

export interface PhoneMessage {
  fromId: string;
  fromName: string;
  text: string;
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

const PANEL_W = 320;
const PANEL_H = 420;

export class PhoneOverlay {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container | null = null;
  private onResult: ((result: PhoneResult) => void) | null = null;
  private message: PhoneMessage | null = null;
  private replies: ReplyOption[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(
    message: PhoneMessage,
    replies: ReplyOption[],
    onResult: (result: PhoneResult) => void,
  ): void {
    this.closeImmediate();
    this.message = message;
    this.replies = replies;
    this.onResult = onResult;

    const dim = this.scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55);
    dim.setInteractive();

    const panel = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x1c1c1e);
    panel.setStrokeStyle(3, 0x3a3a3c);

    const bezel = this.scene.add.rectangle(0, -PANEL_H / 2 + 18, 90, 8, 0x2c2c2e);

    const header = this.scene.add
      .text(0, -PANEL_H / 2 + 48, "Messages", {
        fontSize: "14px",
        color: "#8e8e93",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);

    const fromLabel = this.scene.add
      .text(0, -PANEL_H / 2 + 78, message.fromName, {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const bubble = this.scene.add.rectangle(0, -40, PANEL_W - 48, 120, 0x2c2c2e);
    bubble.setStrokeStyle(1, 0x48484a);

    const msgText = this.scene.add
      .text(0, -40, message.text, {
        fontSize: "15px",
        color: "#f2f2f7",
        fontFamily: "Arial",
        wordWrap: { width: PANEL_W - 72 },
        align: "left",
      })
      .setOrigin(0.5);

    this.root = this.scene.add.container(GAME_W / 2, GAME_H / 2, [
      dim,
      panel,
      bezel,
      header,
      fromLabel,
      bubble,
      msgText,
    ]);
    this.root.setDepth(1000);
    this.root.setAlpha(0);

    this.buildChoiceButtons();

    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      duration: 250,
      ease: "Quad.easeOut",
    });
  }

  private buildChoiceButtons(): void {
    if (!this.root) return;

    const ignoreBtn = this.makeButton(-70, 130, 120, 40, "Ignore", 0x3a3a3c, "#ffffff", () => {
      this.finish({ action: "ignore" });
    });
    const respondBtn = this.makeButton(70, 130, 120, 40, "Respond", 0x34c759, "#ffffff", () => {
      this.showReplyOptions();
    });

    this.root.add(ignoreBtn);
    this.root.add(respondBtn);
  }

  private showReplyOptions(): void {
    if (!this.root || !this.message) return;

    // Remove choice buttons (last two children are button containers)
    // Rebuild content area with reply options
    this.clearInteractiveChildren();

    const prompt = this.scene.add
      .text(0, 70, "Choose a reply:", {
        fontSize: "13px",
        color: "#8e8e93",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.root.add(prompt);

    const startY = 110;
    this.replies.forEach((reply, i) => {
      const y = startY + i * 48;
      const deltaLabel =
        reply.friendshipDelta > 0
          ? `+${reply.friendshipDelta}`
          : `${reply.friendshipDelta}`;
      const btn = this.makeButton(
        0,
        y,
        PANEL_W - 48,
        40,
        `${reply.label}  (${deltaLabel})`,
        i === 0 ? 0x34c759 : i === 1 ? 0x0a84ff : 0xff9f0a,
        "#ffffff",
        () => this.finish({ action: "respond", reply }),
      );
      this.root!.add(btn);
    });
  }

  private makeButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    fill: number,
    textColor: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.scene.add.rectangle(0, 0, w, h, fill);
    bg.setStrokeStyle(1, 0xffffff, 0.15);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => bg.setAlpha(0.85));
    bg.on("pointerout", () => bg.setAlpha(1));
    bg.on("pointerdown", onClick);

    const text = this.scene.add
      .text(0, 0, label, {
        fontSize: "14px",
        color: textColor,
        fontFamily: "Arial",
        align: "center",
        wordWrap: { width: w - 16 },
      })
      .setOrigin(0.5);

    return this.scene.add.container(x, y, [bg, text]);
  }

  private clearInteractiveChildren(): void {
    if (!this.root) return;
    // Keep dim + panel chrome (indices 0-6), remove buttons/prompt after
    while (this.root.length > 7) {
      const child = this.root.getAt(this.root.length - 1);
      this.root.remove(child, true);
    }
  }

  private finish(result: PhoneResult): void {
    const cb = this.onResult;
    this.onResult = null;
    this.close(() => cb?.(result));
  }

  close(onDone?: () => void): void {
    if (!this.root) {
      onDone?.();
      return;
    }
    const root = this.root;
    this.root = null;
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
    if (this.root) {
      this.root.destroy(true);
      this.root = null;
    }
    this.onResult = null;
  }
}
