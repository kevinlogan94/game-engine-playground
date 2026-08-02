import Phaser from "phaser";
import { WORLD_H, WORLD_W } from "./gameConfig";

// Source art is 32px LPC terrain; we render it at 2x so it lines up with the 64px player grid.
export const TERRAIN_SCALE = 2;

const TERRAIN_PATH = "assets/terrain";

export const TERRAIN_KEYS = {
  grass: "terrain-grass",
  dirt: "terrain-dirt",
  pond: "terrain-pond",
};

const PROPS = [
  "oak1",
  "oak2",
  "oak3",
  "pine1",
  "pine2",
  "stump",
  "bush1",
  "bush2",
  "bush3",
  "fern",
  "lily1",
  "lily2",
  "reed",
  "flower_white",
  "flower_red",
  "flower_yellow",
  "mushroom_red",
  "mushroom_cluster",
  "wildflower",
  "rock_big",
  "rock_small",
] as const;

type PropKey = (typeof PROPS)[number];

const propKey = (name: PropKey) => `terrain-prop-${name}`;

export function preloadTerrain(scene: Phaser.Scene) {
  scene.load.image(TERRAIN_KEYS.grass, `${TERRAIN_PATH}/grass_tile.png`);
  scene.load.image(TERRAIN_KEYS.dirt, `${TERRAIN_PATH}/dirt_tile.png`);
  scene.load.image(TERRAIN_KEYS.pond, `${TERRAIN_PATH}/pond.png`);
  for (const name of PROPS) {
    scene.load.image(propKey(name), `${TERRAIN_PATH}/props/${name}.png`);
  }
}

// Straight dirt-path segments, in world space, that together form a bent trail.
const PATH_SEGMENTS = [
  { x: 704, y: 0, w: 128, h: 620 },
  { x: 704, y: 560, w: 448, h: 128 },
  { x: 1088, y: 624, w: 128, h: 576 },
];

const POND = { x: 1300, y: 260, size: 96 * TERRAIN_SCALE };

// Circles/rects that decoration must avoid so the path, pond, and spawn stay clear.
type Keepout = { x: number; y: number; radius: number };

const SPAWN_KEEPOUT: Keepout = { x: WORLD_W / 2, y: WORLD_H / 2, radius: 110 };

function pathKeepouts(): Keepout[] {
  return PATH_SEGMENTS.map((seg) => ({
    x: seg.x + seg.w / 2,
    y: seg.y + seg.h / 2,
    radius: Math.max(seg.w, seg.h) / 2 + 40,
  }));
}

const POND_KEEPOUT: Keepout = { x: POND.x, y: POND.y, radius: POND.size / 2 + 36 };

function isBlocked(x: number, y: number, keepouts: Keepout[]): boolean {
  return keepouts.some((k) => Phaser.Math.Distance.Between(x, y, k.x, k.y) < k.radius);
}

// Sprites use a bottom-center origin so their y-coordinate is their "feet" position;
// setting depth to that y gives correct top-down draw order against the player.
function placeProp(
  scene: Phaser.Scene,
  name: PropKey,
  x: number,
  y: number,
  scale = TERRAIN_SCALE,
) {
  const sprite = scene.add.image(x, y, propKey(name));
  sprite.setOrigin(0.5, 1);
  sprite.setScale(scale);
  sprite.setDepth(y);
  return sprite;
}

// Adds the visual sprite plus a small invisible collision box at its base, sized in
// world pixels so it stays independent of the sprite's texture scale.
function addCollidableProp(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  name: PropKey,
  x: number,
  y: number,
  bodyWidthFrac: number,
  bodyHeightFrac: number,
) {
  const sprite = placeProp(scene, name, x, y);
  const w = sprite.displayWidth * bodyWidthFrac;
  const h = sprite.displayHeight * bodyHeightFrac;
  const collider = scene.add.rectangle(x, y - h / 2, w, h);
  scene.physics.add.existing(collider, true);
  collider.setVisible(false);
  group.add(collider);
  return sprite;
}

function scatter(
  count: number,
  keepouts: Keepout[],
  margin: number,
  place: (x: number, y: number) => void,
) {
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 20) {
    attempts++;
    const x = Phaser.Math.Between(margin, WORLD_W - margin);
    const y = Phaser.Math.Between(margin, WORLD_H - margin);
    if (isBlocked(x, y, keepouts)) continue;
    place(x, y);
    placed++;
  }
}

export function buildTerrain(scene: Phaser.Scene): Phaser.Physics.Arcade.StaticGroup {
  scene.add
    .tileSprite(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, TERRAIN_KEYS.grass)
    .setTileScale(TERRAIN_SCALE, TERRAIN_SCALE)
    .setDepth(-100);

  for (const seg of PATH_SEGMENTS) {
    scene.add
      .tileSprite(seg.x + seg.w / 2, seg.y + seg.h / 2, seg.w, seg.h, TERRAIN_KEYS.dirt)
      .setTileScale(TERRAIN_SCALE, TERRAIN_SCALE)
      .setDepth(-90);
  }

  scene.add.image(POND.x, POND.y, TERRAIN_KEYS.pond).setScale(TERRAIN_SCALE).setDepth(-80);

  const obstacles = scene.physics.add.staticGroup();

  const pondBody = scene.add.rectangle(POND.x, POND.y, POND.size * 0.62, POND.size * 0.62);
  scene.physics.add.existing(pondBody, true);
  obstacles.add(pondBody);
  pondBody.setVisible(false);

  const keepouts = [SPAWN_KEEPOUT, POND_KEEPOUT, ...pathKeepouts()];

  // Lily pads float on the pond itself; reeds line its edge.
  for (const [dx, dy] of [
    [-30, -20],
    [25, 15],
    [-10, 30],
  ]) {
    placeProp(scene, Phaser.Math.RND.pick(["lily1", "lily2"]), POND.x + dx, POND.y + dy);
  }
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const r = POND.size / 2 + 6;
    placeProp(scene, "reed", POND.x + Math.cos(angle) * r, POND.y + Math.sin(angle) * r);
  }

  scatter(55, keepouts, 48, (x, y) => {
    const name = Phaser.Math.RND.pick(["oak1", "oak2", "oak3", "pine1", "pine2"] as const);
    addCollidableProp(scene, obstacles, name, x, y, 0.35, 0.3);
  });

  scatter(14, keepouts, 40, (x, y) => {
    addCollidableProp(scene, obstacles, "rock_big", x, y, 0.7, 0.5);
  });

  scatter(30, keepouts, 32, (x, y) => {
    placeProp(scene, Phaser.Math.RND.pick(["bush1", "bush2", "bush3", "fern"] as const), x, y);
  });

  scatter(18, keepouts, 24, (x, y) => {
    placeProp(scene, "stump", x, y);
  });

  scatter(12, keepouts, 24, (x, y) => {
    placeProp(scene, "rock_small", x, y);
  });

  scatter(22, keepouts, 24, (x, y) => {
    const name = Phaser.Math.RND.pick([
      "flower_white",
      "flower_red",
      "flower_yellow",
      "wildflower",
    ] as const);
    placeProp(scene, name, x, y);
  });

  scatter(14, keepouts, 24, (x, y) => {
    placeProp(scene, Phaser.Math.RND.pick(["mushroom_red", "mushroom_cluster"] as const), x, y);
  });

  return obstacles;
}
