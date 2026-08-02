/** Landscape desktop canvas */
export const GAME_W = 960;
export const GAME_H = 540;

export const TILE = 48; // 32px LPC × 1.5
export const TILE_SCALE = 1.5;
export const SPRITE_SCALE = 1.5;
export const BOSS_SCALE = 2.4;

/** castlefloors.png is 10 cols — grey cobble interiors */
export const COBBLE = [55, 56, 65, 66] as const;
/** Solid red arena tile */
export const ARENA_FLOOR = 72;

export const PLAYER = {
  speed: 160,
  hp: 5,
  attackMs: 280,
  attackReach: 42,
  dodgeSpeed: 420,
  dodgeMs: 220,
  dodgeCooldownMs: 480,
  iFrameMs: 260,
};

export const BOSS = {
  name: "Ashen Lord",
  hp: 20,
  speed: 70,
  speedP2: 105,
  windupMs: 520,
  strikeMs: 220,
  recoverMs: 480,
  windupMsP2: 380,
  recoverMsP2: 320,
  damage: 1,
  reach: 58,
};

export const DIRS = ["up", "left", "down", "right"] as const;
export type Dir = (typeof DIRS)[number];

export function dirFromVector(x: number, y: number): Dir {
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? "left" : "right";
  return y < 0 ? "up" : "down";
}

export function facingOffset(dir: Dir, reach: number): { x: number; y: number } {
  if (dir === "up") return { x: 0, y: -reach };
  if (dir === "down") return { x: 0, y: reach };
  if (dir === "left") return { x: -reach, y: 0 };
  return { x: reach, y: 0 };
}
