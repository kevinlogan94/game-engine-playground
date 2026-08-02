import Phaser from "phaser";
import { ApproachScene } from "./ApproachScene";
import { BossScene } from "./BossScene";
import { TitleScene } from "./TitleScene";
import { GAME_H, GAME_W } from "./gameConfig";

function isMobileOrTablet(): boolean {
  const mq = window.matchMedia.bind(window);
  const touchPrimary = mq("(hover: none) and (pointer: coarse)").matches;
  const narrowTouch = mq("(max-width: 1024px)").matches && navigator.maxTouchPoints > 0;
  return touchPrimary || narrowTouch;
}

/** Ash drift — mirrors TitleScene particle loop. */
function startAshDrift(container: HTMLElement) {
  const between = (min: number, max: number) => min + Math.random() * (max - min);
  const drift = (dot: HTMLElement) => {
    const { clientWidth: w, clientHeight: h } = container;
    dot.style.left = `${between(0, w)}px`;
    dot.style.top = `${h + 4}px`;
    dot.style.opacity = "0.45";
    const driftX = between(-12, 12);
    dot.animate(
      [
        { transform: "translate(0, 0)", opacity: 0.45 },
        { transform: `translate(${driftX}px, ${-(h + 12)}px)`, opacity: 0 },
      ],
      { duration: between(6000, 12000), fill: "forwards" },
    ).onfinish = () => drift(dot);
  };

  for (let i = 0; i < 18; i++) {
    const dot = document.createElement("div");
    dot.className = "ash-dot";
    container.appendChild(dot);
    setTimeout(() => drift(dot), between(0, 6000));
  }
}

if (isMobileOrTablet()) {
  const gate = document.getElementById("mobile-gate");
  gate?.classList.add("visible");
  const ash = gate?.querySelector<HTMLElement>(".gate-ash");
  if (ash) startAshDrift(ash);
} else {
  new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    parent: "game",
    backgroundColor: "#0a0a0c",
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [TitleScene, ApproachScene, BossScene],
  });
}
