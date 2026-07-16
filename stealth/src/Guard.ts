import Phaser from "phaser";
import { GUARD_SPEED, TILE, VISION } from "./gameConfig";

export type Guard = {
  sprite: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  cone: Phaser.GameObjects.Graphics;
  waypoints: { x: number; y: number }[];
  waypointIndex: number;
  facing: number; // radians
  alert: boolean;
};

export function createGuard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  waypoints: { x: number; y: number }[],
): Guard {
  const sprite = scene.physics.add.image(x, y, "guard");
  sprite.setScale(3);
  sprite.setDepth(5);
  sprite.body.setSize(12, 12);
  sprite.body.setOffset(2, 2);
  sprite.body.setImmovable(true);

  const cone = scene.add.graphics().setDepth(2);

  return {
    sprite,
    cone,
    waypoints: waypoints.length ? waypoints : [{ x, y }],
    waypointIndex: 0,
    facing: Math.PI / 2, // down
    alert: false,
  };
}

export function updateGuard(guard: Guard, dt: number) {
  const target = guard.waypoints[guard.waypointIndex]!;
  const dx = target.x - guard.sprite.x;
  const dy = target.y - guard.sprite.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 4) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.sprite.setVelocity(0, 0);
  } else {
    const nx = dx / dist;
    const ny = dy / dist;
    guard.sprite.setVelocity(nx * GUARD_SPEED, ny * GUARD_SPEED);
    guard.facing = Math.atan2(ny, nx);
  }

  // slight smoothing when idle at a point
  void dt;
}

export function drawVisionCone(guard: Guard) {
  const g = guard.cone;
  g.clear();

  const range = VISION.range;
  const half = Phaser.Math.DegToRad(VISION.halfAngleDeg);
  const color = guard.alert ? VISION.alertColor : VISION.color;

  g.fillStyle(color, guard.alert ? 0.35 : 0.18);
  g.lineStyle(1, color, guard.alert ? 0.9 : 0.45);
  g.beginPath();
  g.moveTo(guard.sprite.x, guard.sprite.y);
  g.arc(
    guard.sprite.x,
    guard.sprite.y,
    range,
    guard.facing - half,
    guard.facing + half,
    false,
  );
  g.closePath();
  g.fillPath();
  g.strokePath();
}

/** True if point is inside the guard's vision wedge. */
export function inVisionCone(guard: Guard, px: number, py: number): boolean {
  const dx = px - guard.sprite.x;
  const dy = py - guard.sprite.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION.range || dist < 1) return dist <= 18; // very close = spotted

  const angle = Math.atan2(dy, dx);
  let delta = Phaser.Math.Angle.Wrap(angle - guard.facing);
  return Math.abs(delta) <= Phaser.Math.DegToRad(VISION.halfAngleDeg);
}

/**
 * Simple grid LOS: sample points along the segment; blocked if any hits a wall cell.
 * `blocked` is true for wall/crate cells.
 */
export function hasLineOfSight(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  isBlocked: (gx: number, gy: number) => boolean,
): boolean {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (TILE / 3));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const gx = Math.floor(x / TILE);
    const gy = Math.floor(y / TILE);
    if (isBlocked(gx, gy)) return false;
  }
  return true;
}
