import kaplay from "kaplay";

/** Shared with phaser/src/gameConfig.ts */
const GAME_W = 480;
const GAME_H = 800;
const WORLD = {
  walls: [
    { x: 240, y: 20, w: 480, h: 40 },
    { x: 240, y: 780, w: 480, h: 40 },
    { x: 20, y: 400, w: 40, h: 800 },
    { x: 460, y: 400, w: 40, h: 800 },
    { x: 140, y: 280, w: 100, h: 80 },
    { x: 340, y: 420, w: 120, h: 70 },
    { x: 160, y: 560, w: 90, h: 70 },
  ],
  playerStart: { x: 240, y: 680 },
  npc: { x: 240, y: 200 },
};

const SPEED = 160;
const SCALE = 3;
const BATTLE_SCALE = 6;
const ASSET = "/assets/kenney-tiny-dungeon/Tiles";
const PLAYER_MAX = 30;
const ENEMY_MAX = 24;
const PLAYER_ATK = 8;
const ENEMY_ATK = 6;

const k = kaplay({
  width: GAME_W,
  height: GAME_H,
  background: [11, 16, 32],
  root: document.querySelector("#game") as HTMLElement,
  global: false,
  crisp: true,
  letterbox: true,
  stretch: true,
  touchToMouse: true,
});

k.setGravity(0);

k.loadSprite("floor", `${ASSET}/tile_0000.png`);
k.loadSprite("wall", `${ASSET}/tile_0014.png`);
k.loadSprite("player", `${ASSET}/tile_0097.png`);
k.loadSprite("npc", `${ASSET}/tile_0084.png`);

function makeButton(x: number, y: number, w: number, h: number, label: string) {
  const bg = k.add([
    k.rect(w, h, { radius: 8 }),
    k.pos(x, y),
    k.anchor("center"),
    k.color(0, 0, 0),
    k.opacity(0.45),
    k.area(),
    k.fixed(),
    k.z(1000),
  ]);

  const text = k.add([
    k.text(label, { size: 20 }),
    k.pos(x, y),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.fixed(),
    k.z(1001),
  ]);

  return { bg, text };
}

function held(btn: { bg: { isHovering: () => boolean; opacity: number } }) {
  const on = btn.bg.isHovering() && k.isMouseDown("left");
  btn.bg.opacity = on ? 0.7 : 0.45;
  return on;
}

function paintFloor() {
  const step = 16 * SCALE;
  for (let y = 0; y < GAME_H; y += step) {
    for (let x = 0; x < GAME_W; x += step) {
      k.add([k.sprite("floor"), k.pos(x, y), k.scale(SCALE), k.z(-2)]);
    }
  }
}

function paintWallBlock(x: number, y: number, w: number, h: number) {
  const step = 16 * SCALE;
  const left = x - w / 2;
  const top = y - h / 2;
  for (let py = top; py < top + h; py += step) {
    for (let px = left; px < left + w; px += step) {
      k.add([k.sprite("wall"), k.pos(px, py), k.scale(SCALE), k.z(-1)]);
    }
  }
  k.add([
    k.rect(w, h),
    k.pos(left, top),
    k.opacity(0),
    k.area(),
    k.body({ isStatic: true }),
    "wall",
  ]);
}

k.scene("overworld", () => {
  paintFloor();

  k.add([
    k.rect(96, 520),
    k.pos(GAME_W / 2 - 48, 200),
    k.color(k.Color.fromHex("#c4a574")),
    k.opacity(0.35),
    k.z(-1),
  ]);

  for (const w of WORLD.walls) {
    paintWallBlock(w.x, w.y, w.w, w.h);
  }

  const player = k.add([
    k.sprite("player"),
    k.pos(WORLD.playerStart.x - 8 * SCALE, WORLD.playerStart.y - 8 * SCALE),
    k.scale(SCALE),
    k.area(),
    k.body(),
    "player",
  ]);

  const npc = k.add([
    k.sprite("npc"),
    k.pos(WORLD.npc.x - 8 * SCALE, WORLD.npc.y - 8 * SCALE),
    k.scale(SCALE),
    k.area(),
    "npc",
  ]);

  k.add([
    k.text("KAPLAY · Overworld", { size: 16 }),
    k.pos(12, 10),
    k.color(k.Color.fromHex("#d8f3dc")),
    k.fixed(),
  ]);

  const prompt = k.add([
    k.text("Walk up to the wizard", { size: 16 }),
    k.pos(GAME_W / 2, 52),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.fixed(),
  ]);

  const dialogue = k.add([
    k.text("", { size: 17, width: GAME_W - 48 }),
    k.pos(GAME_W / 2, 140),
    k.anchor("center"),
    k.color(k.Color.fromHex("#1a1a2e")),
    k.fixed(),
    k.opacity(0),
  ]);

  const baseY = GAME_H - 100;
  const up = makeButton(88, baseY - 52, 64, 52, "▲");
  const left = makeButton(28, baseY, 64, 52, "◀");
  const down = makeButton(88, baseY, 64, 52, "▼");
  const right = makeButton(148, baseY, 64, 52, "▶");
  const action = makeButton(GAME_W - 72, baseY - 20, 104, 72, "Talk");
  const dpad = [up, left, down, right];

  let talking = false;
  let actionQueued = false;

  action.bg.onClick(() => {
    actionQueued = true;
  });

  function setDpadVisible(visible: boolean) {
    for (const b of dpad) {
      b.bg.hidden = !visible;
      b.text.hidden = !visible;
    }
  }

  function nearNpc() {
    return player.pos.dist(npc.pos) < 64;
  }

  function doConfirm() {
    if (talking) {
      k.go("battle");
      return;
    }
    if (!nearNpc()) return;
    talking = true;
    dialogue.text = 'Wizard: "The road ahead is mine. Face me in battle!"';
    dialogue.opacity = 1;
    prompt.text = "Tap Fight to begin";
    action.text.text = "Fight";
    setDpadVisible(false);
  }

  k.onUpdate(() => {
    if (actionQueued) {
      actionQueued = false;
      doConfirm();
    }

    if (talking) {
      player.vel = k.vec2(0, 0);
      return;
    }

    setDpadVisible(true);

    const dir = k.vec2(0, 0);
    if (k.isKeyDown("left") || k.isKeyDown("a") || held(left)) dir.x -= 1;
    if (k.isKeyDown("right") || k.isKeyDown("d") || held(right)) dir.x += 1;
    if (k.isKeyDown("up") || k.isKeyDown("w") || held(up)) dir.y -= 1;
    if (k.isKeyDown("down") || k.isKeyDown("s") || held(down)) dir.y += 1;
    if (dir.len() > 0) {
      player.move(dir.unit().scale(SPEED));
    }

    if (nearNpc()) {
      prompt.text = "Tap Talk";
      action.text.text = "Talk";
    } else {
      prompt.text = "Walk up to the wizard";
      action.text.text = "OK";
    }
  });

  k.onKeyPress(["e", "space"], () => doConfirm());
});

k.scene("battle", () => {
  k.setBackground(k.Color.fromHex("#1b263b"));

  const step = 16 * 4;
  for (let y = 0; y < GAME_H; y += step) {
    for (let x = 0; x < GAME_W; x += step) {
      k.add([
        k.sprite("floor"),
        k.pos(x, y),
        k.scale(4),
        k.color(65, 90, 119),
        k.z(-2),
      ]);
    }
  }

  k.add([k.sprite("npc"), k.pos(GAME_W / 2 - 8 * BATTLE_SCALE, 220 - 8 * BATTLE_SCALE), k.scale(BATTLE_SCALE)]);
  k.add([
    k.sprite("player"),
    k.pos(GAME_W / 2 - 8 * BATTLE_SCALE, 480 - 8 * BATTLE_SCALE),
    k.scale(BATTLE_SCALE),
  ]);

  k.add([
    k.text("KAPLAY · Battle", { size: 16 }),
    k.pos(12, 10),
    k.color(k.Color.fromHex("#e0e1dd")),
    k.fixed(),
  ]);

  let playerHp = PLAYER_MAX;
  let enemyHp = ENEMY_MAX;
  let busy = false;
  let over = false;
  let actionQueued = false;

  const enemyHpText = k.add([
    k.text("", { size: 18 }),
    k.pos(GAME_W / 2, 120),
    k.anchor("center"),
    k.color(k.Color.fromHex("#c77dff")),
    k.fixed(),
  ]);
  const playerHpText = k.add([
    k.text("", { size: 18 }),
    k.pos(GAME_W / 2, 560),
    k.anchor("center"),
    k.color(k.Color.fromHex("#90e0ef")),
    k.fixed(),
  ]);
  const log = k.add([
    k.text("A wizard blocks your path!", { size: 18, width: GAME_W - 48 }),
    k.pos(GAME_W / 2, 320),
    k.anchor("center"),
    k.color(k.Color.fromHex("#e0e1dd")),
    k.fixed(),
  ]);
  const prompt = k.add([
    k.text("Tap Attack", { size: 16 }),
    k.pos(GAME_W / 2, 52),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.fixed(),
  ]);

  const action = makeButton(GAME_W - 72, GAME_H - 120, 104, 72, "Attack");
  action.bg.onClick(() => {
    actionQueued = true;
  });

  function refreshHp() {
    playerHpText.text = `You  HP ${playerHp}/${PLAYER_MAX}`;
    enemyHpText.text = `Foe  HP ${enemyHp}/${ENEMY_MAX}`;
  }
  refreshHp();

  function finish(won: boolean) {
    over = true;
    busy = false;
    log.text = won ? "Victory!" : "Defeated...";
    prompt.text = "Tap OK to return";
    action.text.text = "OK";
  }

  async function doAttack() {
    if (busy) return;
    if (over) {
      k.go("overworld");
      return;
    }

    busy = true;
    enemyHp = Math.max(0, enemyHp - PLAYER_ATK);
    refreshHp();
    log.text = `You strike for ${PLAYER_ATK} damage!`;
    await k.wait(0.55);

    if (enemyHp <= 0) {
      finish(true);
      return;
    }

    playerHp = Math.max(0, playerHp - ENEMY_ATK);
    refreshHp();
    log.text = `Wizard hits you for ${ENEMY_ATK} damage!`;
    await k.wait(0.55);

    if (playerHp <= 0) {
      finish(false);
      return;
    }

    log.text = "Your turn.";
    busy = false;
  }

  k.onUpdate(() => {
    if (actionQueued) {
      actionQueued = false;
      void doAttack();
    }
  });

  k.onKeyPress(["a", "space"], () => {
    void doAttack();
  });
});

k.onLoad(() => {
  k.go("overworld");
});
