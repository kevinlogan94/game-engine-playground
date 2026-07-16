/** Portrait mobile canvas — matches sibling demos */
export const GAME_W = 480;
export const GAME_H = 800;

export const TILE = 48; // 16px art × 3
export const TILE_SCALE = 3;
export const SPEED = 130;
/** Hold sneak: slower, much quieter footsteps */
export const SNEAK_SPEED = 55;

/** Footstep noise while moving (radius the player radiates) */
export const NOISE = {
  walk: 110,
  sneak: 28,
  idle: 0,
  color: 0x88ccee,
};

export const HEARING = {
  /** Guard hears if within this of the noise edge… i.e. dist < noiseRadius + margin */
  margin: 8,
  investigateMs: 2800,
};

/** Grid legend: # wall · . floor · C crate · P player · G guard · E exit · S spawn */
export const MAP_ROWS = [
  "##########",
  "#P...#..E#",
  "#....#...#",
  "##.###.###",
  "#........#",
  "#.C....C.#",
  "#....G...#",
  "#.######.#",
  "#........#",
  "#.C......#",
  "#....G.C.#",
  "#.##.##..#",
  "#........#",
  "#.C......#",
  "#....G...#",
  "##########",
] as const;

export const VISION = {
  range: 140,
  halfAngleDeg: 32,
  color: 0xffcc66,
  alertColor: 0xff3344,
};

export const GUARD_SPEED = 55;
/** When chasing a heard noise */
export const GUARD_INVESTIGATE_SPEED = 105;
