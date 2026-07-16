# Phaser Jigsaw (simple demo)

A tiny drag-and-drop jigsaw puzzle built with [Phaser 3](https://phaser.io/) and [rex CutJigsawImage](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/cutjigsawimage/).

## What it does

1. Loads puzzle art from `public/puzzle.jpg` (your portrait photo)
2. Scales it to fit the board, then cuts **interlocking** jigsaw pieces via rex
3. Scatters the pieces
4. Lets you drag them back into place (pixel-perfect hit testing + snap)
5. Shows a win message when every piece is locked

Swap in any other JPEG/PNG by replacing `public/puzzle.jpg` (or change the path in `preload()`).
The board auto-scales to fit portrait or landscape images.

## Run it

```bash
cd jigsaw
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5174`).

## Tweaks

In `src/scenes/PuzzleScene.ts`:

- `COLS` / `ROWS` — how many pieces
- `EDGE_WIDTH` / `EDGE_HEIGHT` — tab/slot size
- `SNAP_DISTANCE` — how close a piece must be to snap
