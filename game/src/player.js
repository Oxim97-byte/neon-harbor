// Rico Vale — gerak jalan kaki, hadap mouse, pukul, masuk/keluar mobil,
// regenerasi nyawa pelan, kamera mengikuti, dan mati (Wasted).
import { PLAYER } from './config.js';
import { ACTION_ENTER } from './input.js';
import { clamp } from './rng.js';
import { collideCircle } from './world.js';
import { driveStep, exitCar, tryEnterCar } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    hp: PLAYER.maxHp,
    money: PLAYER.startMoney,
    wanted: 0,
    weapon: 'pistol', // fist | pistol
    ammo: PLAYER.startAmmo,
    inCar: false,
    car: null,
    punchCd: 0,
    punchAnim: 0,
    invuln: 0,
    walkPhase: 0,
    moving: false,
  };
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.punchCd > 0) p.punchCd -= dt;
  if (p.punchAnim > 0) p.punchAnim -= dt;

  if (p.inCar && p.car) {
    const car = p.car;
    driveStep(G, car, input.gas(), input.brake(), input.steer(), dt);
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.moving = Math.abs(car.speed) > 20;
    G.speed01 = clamp(Math.abs(car.speed) / 720, 0, 1);
    return;
  }
  G.speed01 = 0;

  const mx = input.moveX();
  const my = input.moveY();
  const len = Math.hypot(mx, my) || 1;
  const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  p.moving = mx !== 0 || my !== 0;
  if (p.moving) {
    const nx = p.x + (mx / len) * speed * dt;
    const ny = p.y + (my / len) * speed * dt;
    const pos = { x: nx, y: ny };
    collideCircle(G.world, pos, PLAYER.radius);
    p.x = pos.x;
    p.y = pos.y;
    p.walkPhase += dt * (input.run() ? 11 : 7);
  }
  // Hadap mouse (arah bidik / pukul) saat jalan kaki.
  const mouse = input.mouse();
  const wx = G.cam.x + mouse.x;
  const wy = G.cam.y + mouse.y;
  if (dist2(wx, wy, p.x, p.y) > 24) {
    p.angle = Math.atan2(wy - p.y, wx - p.x);
  }
  // Regenerasi pelan kalau tidak sedang diburu.
  if (p.wanted === 0 && p.hp > 0 && p.hp < PLAYER.maxHp) {
    p.hp = Math.min(PLAYER.maxHp, p.hp + PLAYER.regenPerSec * dt);
  }
  if (p.hp <= 0) {
    G.wasted();
  }
}

function dist2(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Kamera mengikuti pemain / mobil, dijepit ke batas dunia.
export function updateCamera(G) {
  const p = G.player;
  const tx = clamp(p.x - 640, 0, 3200 - 1280);
  const ty = clamp(p.y - 400, 0, 2400 - 800);
  G.cam.x += (tx - G.cam.x) * 0.12;
  G.cam.y += (ty - G.cam.y) * 0.12;
}

export function handlePlayerActions(G, actions) {
  const p = G.player;
  if (actions & ACTION_ENTER) {
    if (p.inCar) exitCar(G);
    else tryEnterCar(G);
  }
}
