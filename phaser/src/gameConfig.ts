/** Shared game size + layout — keep Phaser & KAPLAY in sync */
export const GAME_W = 480;
export const GAME_H = 800;

export const WORLD = {
  walls: [
    // border
    { x: 240, y: 20, w: 480, h: 40 },
    { x: 240, y: 780, w: 480, h: 40 },
    { x: 20, y: 400, w: 40, h: 800 },
    { x: 460, y: 400, w: 40, h: 800 },
    // interior blocks
    { x: 140, y: 280, w: 100, h: 80 },
    { x: 340, y: 420, w: 120, h: 70 },
    { x: 160, y: 560, w: 90, h: 70 },
  ],
  playerStart: { x: 240, y: 680 },
  npc: { x: 240, y: 200 },
};

export const SPEED = 160;
export const TILE_SCALE = 3;
export const BATTLE_SCALE = 6;
