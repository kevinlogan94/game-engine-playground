import Phaser from "phaser";
import { GAME_H, GAME_W } from "./gameConfig";

export type MobileControls = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  action: boolean;
  actionPressed: boolean;
  consumeAction: () => boolean;
  setActionLabel: (label: string) => void;
  showDpad: (visible: boolean) => void;
  setVisible: (visible: boolean) => void;
};

/** On-screen d-pad + action button sized for portrait phones. */
export function createMobileControls(scene: Phaser.Scene): MobileControls {
  const state = {
    left: false,
    right: false,
    up: false,
    down: false,
    action: false,
    actionPressed: false,
  };

  const depth = 1000;
  const btn = (x: number, y: number, w: number, h: number, label: string) => {
    const bg = scene.add
      .rectangle(x, y, w, h, 0x000000, 0.45)
      .setStrokeStyle(2, 0xffffff, 0.55)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });
    const text = scene.add
      .text(x, y, label, {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    return { bg, text };
  };

  const bindHold = (
    target: Phaser.GameObjects.Rectangle,
    key: "left" | "right" | "up" | "down" | "action",
  ) => {
    const set = (v: boolean) => {
      state[key] = v;
      target.setFillStyle(v ? 0x4cc9f0 : 0x000000, v ? 0.55 : 0.45);
    };
    target.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.preventDefault?.();
      if (key === "action") state.actionPressed = true;
      set(true);
    });
    target.on("pointerup", () => set(false));
    target.on("pointerout", () => set(false));
    target.on("pointerupoutside", () => set(false));
  };

  const baseY = GAME_H - 100;
  const up = btn(88, baseY - 52, 64, 52, "▲");
  const left = btn(28, baseY, 64, 52, "◀");
  const down = btn(88, baseY, 64, 52, "▼");
  const right = btn(148, baseY, 64, 52, "▶");
  const action = btn(GAME_W - 72, baseY - 20, 104, 72, "Hide");

  bindHold(up.bg, "up");
  bindHold(left.bg, "left");
  bindHold(down.bg, "down");
  bindHold(right.bg, "right");
  bindHold(action.bg, "action");

  const dpad = [up, left, down, right];
  const all = [...dpad, action];

  return {
    get left() {
      return state.left;
    },
    get right() {
      return state.right;
    },
    get up() {
      return state.up;
    },
    get down() {
      return state.down;
    },
    get action() {
      return state.action;
    },
    get actionPressed() {
      return state.actionPressed;
    },
    consumeAction() {
      if (!state.actionPressed) return false;
      state.actionPressed = false;
      return true;
    },
    setActionLabel(label: string) {
      action.text.setText(label);
    },
    showDpad(visible: boolean) {
      for (const b of dpad) {
        b.bg.setVisible(visible);
        b.text.setVisible(visible);
      }
    },
    setVisible(visible: boolean) {
      for (const b of all) {
        b.bg.setVisible(visible);
        b.text.setVisible(visible);
      }
    },
  };
}
