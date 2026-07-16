# Classroom Phone

Phaser 3 prototype: idle in class → phone rings (music notes) → message overlay → Ignore / Respond with reply options → classmate reaction + friendship update.

## Run

```bash
npm install
npm run dev    # http://localhost:5176
```

## Structure

| File | Role |
|------|------|
| `src/ClassroomScene.ts` | Main scene / interaction loop |
| `src/ClassroomBuilder.ts` | Tile-layered classroom (floor → chair → char → desk) |
| `src/PhoneOverlay.ts` | Reusable phone UI |
| `src/GameState.ts` | Classmates + friendship stats |
| `src/gameConfig.ts` | Grid, seats, layout offsets |

## Art

See `public/assets/CREDIT.txt` — Cool School (CC0) tiles + Kenney Tiny Dungeon (CC0) characters.
