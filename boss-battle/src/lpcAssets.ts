import Phaser from "phaser";
import { BOSS_SCALE, DIRS, type Dir } from "./gameConfig";

const ASSET = "assets/lpc";

export const PLAYER_WALK_SCALE = 0.75; // 128px frames → ~96px on screen
export const PLAYER_RUN_SCALE = 1.5; // 64px run frames
export const BOSS_ATTACK_SCALE = BOSS_SCALE * (64 / 192);

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

function makeAnim(
  scene: Phaser.Scene,
  key: string,
  prefix: string,
  anim: string,
  dir: Dir,
  n: number,
  frameRate: number,
  repeat: number,
) {
  if (scene.anims.exists(key)) return;
  scene.anims.create({
    key,
    frames: Array.from({ length: n }, (_, i) => ({
      key: frameKey(prefix, anim, dir, i + 1),
    })),
    frameRate,
    repeat,
  });
}

export function createPlayerAnims(scene: Phaser.Scene) {
  for (const dir of DIRS) {
    makeAnim(scene, `p-walk-${dir}`, "p", "walk", dir, 9, 10, -1);
    makeAnim(scene, `p-slash-${dir}`, "p", "slash", dir, 6, 12, 0);
    makeAnim(scene, `p-run-${dir}`, "p", "run", dir, 8, 36, 0);
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
      frames: Array.from({ length: 6 }, (_, i) => ({
        key: frameKey("p", "hurt", "up", i + 1),
      })),
      frameRate: 10,
      repeat: 0,
    });
  }
}

export function createBossAnims(scene: Phaser.Scene) {
  for (const dir of DIRS) {
    makeAnim(scene, `b-walk-${dir}`, "b", "walk", dir, 9, 10, -1);
    makeAnim(scene, `b-idle-${dir}`, "b", "idle", dir, 2, 3, -1);
    makeAnim(scene, `b-slash-${dir}`, "b", "slash", dir, 6, 12, 0);
    makeAnim(scene, `b-slash-reverse-${dir}`, "b", "slash-reverse", dir, 6, 12, 0);
    makeAnim(scene, `b-thrust-${dir}`, "b", "thrust", dir, 8, 14, 0);
  }
  if (!scene.anims.exists("b-hurt")) {
    scene.anims.create({
      key: "b-hurt",
      frames: Array.from({ length: 6 }, (_, i) => ({
        key: frameKey("b", "hurt", "up", i + 1),
      })),
      frameRate: 10,
      repeat: 0,
    });
  }
}

export function setPlayerWalkBody(sprite: Phaser.Physics.Arcade.Sprite) {
  sprite.body!.setSize(44, 56).setOffset(42, 56);
}

export function setPlayerRunBody(sprite: Phaser.Physics.Arcade.Sprite) {
  sprite.body!.setSize(22, 28).setOffset(21, 28);
}

export function setBossWalkBody(sprite: Phaser.Physics.Arcade.Sprite) {
  sprite.body!.setSize(34, 40).setOffset(15, 22);
}

export function setBossAttackBody(sprite: Phaser.Physics.Arcade.Sprite) {
  sprite.body!.setSize(34, 40).setOffset(79, 118);
}

export function bossFacingToward(bx: number, by: number, px: number, py: number): Dir {
  const dx = px - bx;
  const dy = py - by;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}
