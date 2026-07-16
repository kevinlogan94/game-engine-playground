/** Tile-aligned classroom (Cool School is 48×48). */
export const TILE = 48;
export const COLS = 16;
export const ROWS = 12;

export const GAME_W = COLS * TILE; // 768
export const GAME_H = ROWS * TILE; // 576

/** Kenney characters are 16×16. */
export const SPRITE_SCALE = 2.25;

/**
 * Seat anchors (tile coords). Layout is stacked in one cell:
 * desk slightly north, character on the chair, chair at the anchor.
 */
export const SEATS = {
  L0: { col: 4, row: 5 },
  L1: { col: 4, row: 7 },
  L2: { col: 4, row: 9 },
  R0: { col: 11, row: 5 },
  R1: { col: 11, row: 7 },
  R2: { col: 11, row: 9 },
} as const;

export type SeatId = keyof typeof SEATS;

/** Pixel offsets from the seat tile center for the layered sit illusion. */
export const SEAT_LAYOUT = {
  /** Desk sits across the lower body so heads peek out above it */
  deskY: 10,
  /** Character slightly north of desk center (head above desk) */
  charY: -6,
  /** Chair south — backrest behind the sitter */
  chairY: 16,
} as const;

export function seatCenter(seat: SeatId): { x: number; y: number } {
  const { col, row } = SEATS[seat];
  return {
    x: col * TILE + TILE / 2,
    y: row * TILE + TILE / 2,
  };
}

export function seatWorld(seat: SeatId): { x: number; y: number } {
  const c = seatCenter(seat);
  return { x: c.x, y: c.y + SEAT_LAYOUT.charY };
}
