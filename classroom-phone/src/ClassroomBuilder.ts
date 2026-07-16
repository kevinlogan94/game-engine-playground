import Phaser from "phaser";
import {
  TILE,
  COLS,
  ROWS,
  SEATS,
  SEAT_LAYOUT,
  seatCenter,
  type SeatId,
} from "./gameConfig";

/** Depth bands so desks always draw in front of seated characters. */
export const DEPTH = {
  floor: 0,
  wall: 1,
  chair: 5,
  character: 10,
  desk: 20,
  decor: 25,
  ui: 100,
} as const;

/**
 * Builds a Cool School classroom from individual tiles:
 * floor → chairs → (characters added by scene) → desks in front.
 */
export class ClassroomBuilder {
  private pendingOccupiedDesks: SeatId[] = [];

  constructor(private scene: Phaser.Scene) {}

  preload(): void {
    const base = "assets/cool-school/parts";
    const keys = [
      "floor",
      "wall",
      "chair_back",
      "desk_student",
      "swivel_back",
      "teacher_l",
      "teacher_r",
      "monitor",
      "board_tl",
      "board_tm",
      "board_tr",
      "board_bl",
      "board_bm",
      "board_br",
      "window_tl",
      "window_tr",
      "window_bl",
      "window_br",
      "shelf_t",
      "shelf_m",
      "shelf_b",
    ];
    for (const key of keys) {
      this.scene.load.image(key, `${base}/${key}.png`);
    }
  }

  buildShell(): void {
    this.paintFloor();
    this.paintBackWall();
    this.paintTeacherArea();
    this.paintFillerColumn();
  }

  /**
   * Chairs for every seat; empty seats also get a desk now.
   * Occupied desks wait until after characters are added.
   */
  setupSeats(occupied: SeatId[]): void {
    const occupiedSet = new Set(occupied);

    for (const seatId of Object.keys(SEATS) as SeatId[]) {
      this.placeChair(seatId);
      if (!occupiedSet.has(seatId)) {
        this.placeDesk(seatId);
      }
    }

    this.pendingOccupiedDesks = [...occupied];
  }

  /** Call after character sprites so desk draws on top of them. */
  placeOccupiedDesks(): void {
    for (const seatId of this.pendingOccupiedDesks) {
      this.placeDesk(seatId);
    }
    this.pendingOccupiedDesks = [];
  }

  private tile(key: string, col: number, row: number, depth: number): void {
    this.scene.add
      .image(col * TILE + TILE / 2, row * TILE + TILE / 2, key)
      .setDepth(depth);
  }

  private paintFloor(): void {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        this.tile("floor", col, row, DEPTH.floor);
      }
    }
  }

  private paintBackWall(): void {
    for (let col = 0; col < COLS; col++) {
      this.tile("wall", col, 0, DEPTH.wall);
      this.tile("wall", col, 1, DEPTH.wall);
    }

    this.tile("window_tl", 1, 0, DEPTH.wall + 1);
    this.tile("window_tr", 2, 0, DEPTH.wall + 1);
    this.tile("window_bl", 1, 1, DEPTH.wall + 1);
    this.tile("window_br", 2, 1, DEPTH.wall + 1);

    this.tile("board_tl", 6, 0, DEPTH.wall + 1);
    this.tile("board_tm", 7, 0, DEPTH.wall + 1);
    this.tile("board_tr", 8, 0, DEPTH.wall + 1);
    this.tile("board_bl", 6, 1, DEPTH.wall + 1);
    this.tile("board_bm", 7, 1, DEPTH.wall + 1);
    this.tile("board_br", 8, 1, DEPTH.wall + 1);

    this.tile("shelf_t", 13, 0, DEPTH.wall + 1);
    this.tile("shelf_m", 13, 1, DEPTH.wall + 1);
    this.tile("shelf_b", 13, 2, DEPTH.decor);
    this.tile("shelf_t", 14, 0, DEPTH.wall + 1);
    this.tile("shelf_m", 14, 1, DEPTH.wall + 1);
    this.tile("shelf_b", 14, 2, DEPTH.decor);
  }

  private paintTeacherArea(): void {
    this.tile("teacher_l", 7, 2, DEPTH.desk);
    this.tile("teacher_r", 8, 2, DEPTH.desk);
    this.tile("swivel_back", 7, 3, DEPTH.chair);
    this.tile("monitor", 8, 2, DEPTH.decor);
  }

  /** Middle column of empty desk+chair units (no props). */
  private paintFillerColumn(): void {
    for (const row of [5, 7, 9]) {
      const x = 7 * TILE + TILE / 2;
      const y = row * TILE + TILE / 2;
      this.scene.add
        .image(x, y + SEAT_LAYOUT.chairY, "chair_back")
        .setDepth(DEPTH.chair);
      this.scene.add
        .image(x, y + SEAT_LAYOUT.deskY, "desk_student")
        .setDepth(DEPTH.desk);
    }
  }

  private placeChair(seatId: SeatId): void {
    const { x, y } = seatCenter(seatId);
    this.scene.add
      .image(x, y + SEAT_LAYOUT.chairY, "chair_back")
      .setDepth(DEPTH.chair);
  }

  private placeDesk(seatId: SeatId): void {
    const { x, y } = seatCenter(seatId);
    // Wooden desk top north of the sitter — covers lower body when depth > character
    this.scene.add
      .image(x, y + SEAT_LAYOUT.deskY, "desk_student")
      .setDepth(DEPTH.desk);
  }
}
