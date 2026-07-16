# Jailbreak Stealth (Phaser)

A tiny **top-down stealth** demo: sneak out of jail without being seen.

## Play

1. You start in the top-left cell
2. Guards patrol corridors with **yellow vision cones**
3. Duck behind **crates** (tap **Hide** / E / Space) to break line of sight
4. Reach the **door** in the top-right to escape
5. Get spotted → restart (tap **Restart** / R)

## Controls

- **WASD / arrows** or on-screen d-pad
- **E / Space / Hide** near a crate to crouch
- Mobile-first portrait canvas (**480×800**)

## Run

```bash
cd stealth && npm install && npm run dev   # http://localhost:5175
```

## Art

Sprites from **[Kenney Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon)** (CC0), same pack as the `phaser` JRPG stub.

| Role   | Tile |
|--------|------|
| Floor  | `tile_0000.png` |
| Wall   | `tile_0014.png` |
| Crate  | `tile_0012.png` |
| Exit   | `tile_0025.png` |
| Player | `tile_0085.png` |
| Guard  | `tile_0097_knight_original.png` |
