# Game engine playground

Small demos for comparing engines and game patterns in Cursor.

## Projects

| Folder | Engine | Demo |
|--------|--------|------|
| `phaser` | Phaser | Top-down JRPG stub (explore → talk → battle) |
| `kaplay` | KAPLAY | Same JRPG stub |
| `stealth` | Phaser | Jailbreak stealth (vision cones + hide behind crates) |
| `jigsaw` | Phaser | Separate puzzle experiment |
| `classroom-phone` | Phaser | Classroom idle → phone rings (music notes) → message overlay → choice → classmate reaction & friendship stat |

## Run

```bash
cd phaser && npm install && npm run dev              # http://localhost:5173
cd kaplay && npm install && npm run dev             # http://localhost:5174
cd stealth && npm install && npm run dev            # http://localhost:5175
cd classroom-phone && npm install && npm run dev    # http://localhost:5176
```

## Art

JRPG + stealth demos use **[Kenney Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon)** (CC0) under `public/assets/kenney-tiny-dungeon/`.

`classroom-phone` uses **[Cool School tileset](https://opengameart.org/content/cool-school-tileset)** by NettySvit (CC0) under `classroom-phone/public/assets/cool-school/` (layered floor/chair/desk tiles), plus Kenney Tiny Dungeon characters seated between chair and desk.

## JRPG stub notes

Portrait canvas (**480×800**), on-screen d-pad + action button. Classic flat top-down — not true Octopath HD-2D (that needs 3D environments + 2D sprites).

## Stealth stub notes

Sneak from the cell to the exit door. Guards patrol with vision cones; **walking** radiates a noise ring that pulls them into a faster investigate, while holding **Sneak** keeps footsteps quiet. Crates block line of sight and can be used to hide. Same mobile-first portrait setup as the JRPG demos.
