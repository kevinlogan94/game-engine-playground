# Jailbreak Stealth (Phaser)

A tiny **top-down stealth** demo: sneak out of jail without being seen.

## Play

1. You start in the top-left cell
2. Guards patrol with **yellow vision cones** (orange while investigating noise)
3. **Walk** normally → big **blue noise ring**; nearby guards hear you and rush toward the sound
4. Hold **Sneak** → slower, quieter footsteps (tiny ring) so you can slip past
5. Duck behind **crates** (tap **Hide**) to break line of sight
6. Reach the **door** in the top-right to escape
7. Get spotted → restart (tap **Restart** / R)

## Controls

- **WASD / arrows** or on-screen d-pad
- **Hold Shift / Sneak** to move quietly
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
