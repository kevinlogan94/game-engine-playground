import Phaser from "phaser";
import { BOSS_SCALE, DIRS, SPRITE_SCALE, type Dir } from "./gameConfig";

const ASSET = "assets/lpc";

/** Target on-screen width for a 64px LPC frame */
export const PLAYER_DISPLAY = 64 * SPRITE_SCALE;
export const BOSS_DISPLAY = 64 * BOSS_SCALE;

/** Spritesheet frame indices (0-based); PNG file = index + 1 */
const CYCLE = {
  walk: [1, 2, 3, 4, 5, 6, 7, 8],
  slash: [0, 1, 2, 3, 4, 5],
  run: [0, 1, 2, 3, 4, 5, 6, 7],
  thrust: [0, 1, 2, 3, 4, 5, 6, 7],
  idle: [0, 0, 1],
  hurt: [0, 1, 2, 3, 4, 5],
} as const;

export function frameKey(prefix: string, anim: string, dir: string, i: number) {
  return `${prefix}-${anim}-${dir}-${i}`;
}

function loadDirFrames(
  scene: Phaser.Scene,
  prefix: string,
  anim: string,
  path: string,
  dir: Dir,
  n: number,
) {
  for (let i = 1; i <= n; i++) {
    scene.load.image(frameKey(prefix, anim, dir, i), `${ASSET}/${path}/${dir}/${i}.png`);
  }
}

export function preloadLpcPlayer(scene: Phaser.Scene) {
  for (const dir of DIRS) {
    loadDirFrames(scene, "p", "walk", "player/custom/walk_128", dir, 9);
    loadDirFrames(scene, "p", "slash", "player/custom/slash_128", dir, 6);
    loadDirFrames(scene, "p", "run", "player/standard/run", dir, 8);
  }
  for (let i = 1; i <= 6; i++) {
    scene.load.image(frameKey("p", "hurt", "up", i), `${ASSET}/player/standard/hurt/up/${i}.png`);
  }
}

export function preloadLpcBoss(scene: Phaser.Scene) {
  for (const dir of DIRS) {
    loadDirFrames(scene, "b", "walk", "boss/standard/walk", dir, 9);
    loadDirFrames(scene, "b", "idle", "boss/standard/idle", dir, 2);
    loadDirFrames(scene, "b", "slash", "boss/custom/slash_oversize", dir, 6);
    loadDirFrames(scene, "b", "slash-reverse", "boss/custom/slash_reverse_oversize", dir, 6);
    loadDirFrames(scene, "b", "thrust", "boss/custom/thrust_oversize", dir, 8);
  }
  for (let i = 1; i <= 6; i++) {
    scene.load.image(frameKey("b", "hurt", "up", i), `${ASSET}/boss/standard/hurt/up/${i}.png`);
  }
}

function cycleFrames(prefix: string, anim: string, dir: Dir, cycle: readonly number[]) {
  return cycle.map((i) => ({ key: frameKey(prefix, anim, dir, i + 1) }));
}

function makeAnim(
  scene: Phaser.Scene,
  key: string,
  prefix: string,
  anim: string,
  dir: Dir,
  cycle: readonly number[],
  frameRate: number,
  repeat: number,
) {
  if (scene.anims.exists(key)) return;
  scene.anims.create({
    key,
    frames: cycleFrames(prefix, anim, dir, cycle),
    frameRate,
    repeat,
  });
}

export function createPlayerAnims(scene: Phaser.Scene) {
  for (const dir of DIRS) {
    makeAnim(scene, `p-walk-${dir}`, "p", "walk", dir, CYCLE.walk, 10, -1);
    makeAnim(scene, `p-slash-${dir}`, "p", "slash", dir, [5, 4, 3, 2, 1, 0], 12, 0);
    makeAnim(scene, `p-run-${dir}`, "p", "run", dir, CYCLE.run, 36, 0);
  }
  if (!scene.anims.exists("p-idle")) {
    scene.anims.create({
      key: "p-idle",
      frames: [{ key: frameKey("p", "walk", "down", 1) }],
    });
  }
  if (!scene.anims.exists("p-hurt")) {
    scene.anims.create({
      key: "p-hurt",
      frames: cycleFrames("p", "hurt", "up", CYCLE.hurt),
      frameRate: 10,
      repeat: 0,
    });
  }
}

export function createBossAnims(scene: Phaser.Scene) {
  for (const dir of DIRS) {
    makeAnim(scene, `b-walk-${dir}`, "b", "walk", dir, CYCLE.walk, 10, -1);
    makeAnim(scene, `b-idle-${dir}`, "b", "idle", dir, CYCLE.idle, 3, -1);
    makeAnim(scene, `b-slash-${dir}`, "b", "slash", dir, CYCLE.slash, 12, 0);
    makeAnim(scene, `b-slash-reverse-${dir}`, "b", "slash-reverse", dir, CYCLE.slash, 12, 0);
    makeAnim(scene, `b-thrust-${dir}`, "b", "thrust", dir, CYCLE.thrust, 14, 0);
  }
  if (!scene.anims.exists("b-hurt")) {
    scene.anims.create({
      key: "b-hurt",
      frames: cycleFrames("b", "hurt", "up", CYCLE.hurt),
      frameRate: 10,
      repeat: 0,
    });
  }
}

/** LPC base frame; oversize canvases center the same art in a larger pad */
const LPC_BASE = 64;

/** Keep constant on-screen size + feet anchored as frame canvas changes */
export function attachLpcSprite(
  sprite: Phaser.Physics.Arcade.Sprite,
  displayW: number,
  bodyW: number,
  bodyH: number,
) {
  // Scale from base art size, not canvas width (128/192 frames are padded, not bigger)
  const s = displayW / LPC_BASE;
  sprite.setScale(s);
  const fit = () => {
    const fw = sprite.frame.width;
    const fh = sprite.frame.height;
    // Character sits in the centered LPC_BASE×LPC_BASE region
    const feetY = (fh + LPC_BASE) / 2;
    sprite.setOrigin(0.5, feetY / fh);
    const bw = bodyW / s;
    const bh = bodyH / s;
    sprite.body!.setSize(bw, bh).setOffset((fw - bw) / 2, feetY - bh);
  };
  sprite.on(Phaser.Animations.Events.ANIMATION_START, fit);
  sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, fit);
  fit();
}

export function bossFacingToward(bx: number, by: number, px: number, py: number): Dir {
  const dx = px - bx;
  const dy = py - by;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}
