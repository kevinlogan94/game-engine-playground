# Topdown (simple demo)

A minimal 2D top-down movement demo built with [Phaser 3](https://phaser.io/).

## What it does

1. Draws a scrollable forest world: grass field, a winding dirt path, a pond with lily pads
   and reeds, plus scattered trees, rocks, bushes, flowers, and mushrooms
2. Spawns a player made of layered LPC sprites (body, pants, shirt, head, hair)
   that walks in 4 directions with WASD / arrow keys, colliding with trees/rocks/water
3. Camera follows the player around the world, with y-sorted depth so foliage can
   overlap the player correctly

## Run it

```bash
cd topdown
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5174`).

## Assets

The player character is composited at runtime from several layered walk-cycle spritesheets
(body, pants, shirt, head, hair), and the terrain (ground, path, pond, trees, rocks, bushes,
flowers, mushrooms) is cropped from the `Terrain/` tileset — all sourced from the
[ElizaWy/LPC](https://github.com/ElizaWy/LPC) revised Liberated Pixel Cup asset set
(CC-BY-SA 3.0 / GPL 3.0). See the `CREDITS*.txt` files in `public/assets/player/` and
`public/assets/terrain/` for attribution.
