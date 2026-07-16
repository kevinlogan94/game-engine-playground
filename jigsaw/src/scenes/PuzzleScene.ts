import Phaser from 'phaser';
import type CutJigsawImagePlugin from 'phaser3-rex-plugins/plugins/cutjigsawimage-plugin.js';

/** Grid size — change these to get more/fewer pieces. */
const COLS = 3;
const ROWS = 4;

/** How close (in px) a piece must be to its slot to snap. */
const SNAP_DISTANCE = 48;

/** Max on-screen board size (photo is scaled to fit). */
const MAX_BOARD_WIDTH = 420;
const MAX_BOARD_HEIGHT = 620;

const SOURCE_KEY = 'puzzle-source';
const BOARD_KEY = 'puzzle-board';

type PieceData = {
  correctX: number;
  correctY: number;
  placed: boolean;
};

/**
 * Phaser jigsaw using rex CutJigsawImage for interlocking piece shapes.
 * Puzzle art comes from public/puzzle.jpg.
 */
export class PuzzleScene extends Phaser.Scene {
  private placedCount = 0;
  private totalPieces = COLS * ROWS;
  private statusText!: Phaser.GameObjects.Text;
  private boardOriginX = 0;
  private boardOriginY = 0;
  private puzzleWidth = 0;
  private puzzleHeight = 0;

  constructor() {
    super('PuzzleScene');
  }

  preload(): void {
    this.load.image(SOURCE_KEY, 'puzzle.jpg');
  }

  create(): void {
    this.placedCount = 0;
    this.totalPieces = COLS * ROWS;

    this.createBoardTexture();

    this.boardOriginX = (this.scale.width - this.puzzleWidth) / 2;
    this.boardOriginY = 80;

    this.drawBoardGuide();
    this.createPieces();
    this.setupDrag();

    this.add
      .text(this.scale.width / 2, 24, 'Phaser Jigsaw', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#f0e6d2',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(this.scale.width / 2, 54, `Place the pieces · 0 / ${this.totalPieces}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#a8b4c4',
      })
      .setOrigin(0.5);
  }

  /**
   * Draw the photo into a 1:1 board-sized canvas texture.
   * Rex's gridCut subtracts edge padding in texture pixels (not display pixels),
   * so cutting a scaled Image misaligns pieces — this avoids that.
   */
  private createBoardTexture(): void {
    const source = this.textures.get(SOURCE_KEY).getSourceImage() as HTMLImageElement;
    const scale = Math.min(MAX_BOARD_WIDTH / source.width, MAX_BOARD_HEIGHT / source.height);
    this.puzzleWidth = Math.round(source.width * scale);
    this.puzzleHeight = Math.round(source.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = this.puzzleWidth;
    canvas.height = this.puzzleHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D canvas context');
    }
    ctx.drawImage(source, 0, 0, this.puzzleWidth, this.puzzleHeight);

    if (this.textures.exists(BOARD_KEY)) {
      this.textures.remove(BOARD_KEY);
    }
    this.textures.addCanvas(BOARD_KEY, canvas);
  }

  /** Faint full image + outline so slots are easier to read. */
  private drawBoardGuide(): void {
    this.add
      .image(
        this.boardOriginX + this.puzzleWidth / 2,
        this.boardOriginY + this.puzzleHeight / 2,
        BOARD_KEY,
      )
      .setAlpha(0.22)
      .setDepth(-2);

    const g = this.add.graphics().setDepth(-1);
    g.lineStyle(2, 0x6a7a8c, 0.7);
    g.strokeRect(this.boardOriginX, this.boardOriginY, this.puzzleWidth, this.puzzleHeight);
  }

  private createPieces(): void {
    const source = this.add
      .image(
        this.boardOriginX + this.puzzleWidth / 2,
        this.boardOriginY + this.puzzleHeight / 2,
        BOARD_KEY,
      )
      .setVisible(false);

    const edgeWidth = Math.max(12, Math.round((this.puzzleWidth / COLS) * 0.14));
    const edgeHeight = Math.max(12, Math.round((this.puzzleHeight / ROWS) * 0.14));

    const plugin = this.plugins.get('rexCutJigsawImage') as CutJigsawImagePlugin;
    const pieces = plugin.gridCut(source, {
      columns: COLS,
      rows: ROWS,
      edgeWidth,
      edgeHeight,
      // Canvas texture required for pixelPerfect hit testing on tabbed outlines
      useDynamicTexture: false,
      align: true,
      add: true,
    }) as Phaser.GameObjects.Image[];

    source.destroy();

    pieces.forEach((piece) => {
      piece.setData({
        correctX: piece.x,
        correctY: piece.y,
        placed: false,
      } satisfies PieceData);

      piece.setInteractive({
        draggable: true,
        useHandCursor: true,
        pixelPerfect: true,
      });
    });

    Phaser.Utils.Array.Shuffle(pieces);
    pieces.forEach((piece, index) => {
      const cellW = this.scale.width / COLS;
      const scatterX = cellW * (index % COLS) + cellW / 2 + Phaser.Math.Between(-24, 24);
      const scatterY =
        this.boardOriginY + this.puzzleHeight + 80 + Math.floor(index / COLS) * 70 +
        Phaser.Math.Between(-10, 16);

      piece.setPosition(
        Phaser.Math.Clamp(scatterX, 80, this.scale.width - 80),
        Phaser.Math.Clamp(scatterY, 80, this.scale.height - 60),
      );
    });
  }

  private setupDrag(): void {
    this.input.on(
      'dragstart',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
        if (gameObject.getData('placed')) {
          return;
        }
        this.children.bringToTop(gameObject);
        gameObject.setTint(0xffffcc);
      },
    );

    this.input.on(
      'drag',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Image,
        dragX: number,
        dragY: number,
      ) => {
        if (gameObject.getData('placed')) {
          return;
        }
        gameObject.setPosition(dragX, dragY);
      },
    );

    this.input.on(
      'dragend',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
        if (gameObject.getData('placed')) {
          return;
        }

        gameObject.clearTint();

        const correctX = gameObject.getData('correctX') as number;
        const correctY = gameObject.getData('correctY') as number;
        const dist = Phaser.Math.Distance.Between(gameObject.x, gameObject.y, correctX, correctY);

        if (dist <= SNAP_DISTANCE) {
          gameObject.setPosition(correctX, correctY);
          gameObject.setData('placed', true);
          gameObject.disableInteractive();
          gameObject.setDepth(-1);
          this.placedCount += 1;
          this.updateStatus();
        }
      },
    );
  }

  private updateStatus(): void {
    if (this.placedCount >= this.totalPieces) {
      this.statusText.setText('Complete! Nice work.');
      this.statusText.setColor('#8fd48f');
      return;
    }
    this.statusText.setText(`Place the pieces · ${this.placedCount} / ${this.totalPieces}`);
  }
}
