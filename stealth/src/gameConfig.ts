/** Portrait mobile canvas — matches sibling demos */
export const GAME_W = 480;
export const GAME_H = 800;

export const TILE = 48; // 16px art × 3
export const TILE_SCALE = 3;
export const SPEED = 130;

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
