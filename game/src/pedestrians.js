// Pejalan kaki: berjalan di trotoar, menyeberang sesekali, dan lari
// ketakutan kalau ada kekerasan di dekatnya (pukulan, tembakan, atau
// mobil yang ugal-ugalan). Mereka juga saksi pencurian mobil.
import { dist } from './rng.js';
import { collideCircle, randomSidewalkPoint } from './world.js';

const PED_COLORS = ['#f97316', '#ec4899', '#06b6d4', '#a3e635', '#f43f5e', '#eab308', '#d6d3d1', '#60a5fa'];
const TARGET_PEDS = 26;

export function spawnPeds(G, count) {
  for (let i = 0; i < count; i += 1) {
    const p = randomSidewalkPoint(G.rng);
    G.peds.push({
      x: p.x, y: p.y,
      angle: G.rng.range(0, Math.PI * 2),
      speed: G.rng.range(35, 70),
      state: 'walk', // walk | flee | down
      fleeT: 0,
      down: 0,
      color: G.rng.pick(PED_COLORS),
      walkT: G.rng.range(2, 6),
    });
  }
}

// Kekerasan di (x, y): semua pejalan kaki dekat lari menjauh.
export function scarePeds(G, x, y, radius) {
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    if (dist(x, y, ped.x, ped.y) < radius) {
      ped.state = 'flee';
      ped.fleeT = 3 + G.rng.range(0, 2);
      ped.angle = Math.atan2(ped.y - y, ped.x - x);
    }
  }
}

export function updatePeds(G, dt) {
  const cx = G.cam.x + 640;
  const cy = G.cam.y + 400;
  const near = G.peds.filter((p) => dist(p.x, p.y, cx, cy) < 900).length;
  if (near < TARGET_PEDS) spawnPeds(G, 1);
  for (let i = G.peds.length - 1; i >= 0; i -= 1) {
    const ped = G.peds[i];
    if (dist(ped.x, ped.y, cx, cy) > 1400) {
      G.peds.splice(i, 1);
      continue;
    }
    if (ped.state === 'down') {
      ped.down -= dt;
      if (ped.down <= 0) {
        ped.state = 'flee';
        ped.fleeT = 3;
      }
      continue;
    }
    if (ped.state === 'flee') {
      ped.fleeT -= dt;
      if (ped.fleeT <= 0) ped.state = 'walk';
    } else {
      ped.walkT -= dt;
      if (ped.walkT <= 0) {
        ped.walkT = G.rng.range(2, 6);
        ped.angle = G.rng.range(0, Math.PI * 2);
      }
    }
    const speed = ped.state === 'flee' ? 240 : ped.speed;
    const nx = ped.x + Math.cos(ped.angle) * speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * speed * dt;
    const pos = { x: nx, y: ny };
    if (collideCircle(G.world, pos, 12)) {
      ped.angle += Math.PI / 2;
    } else {
      ped.x = pos.x;
      ped.y = pos.y;
    }
    // Mobil pemain yang ngebut di dekat trotoar menakuti mereka.
    if (G.player.inCar && G.player.car && Math.abs(G.player.car.speed) > 320 && dist(ped.x, ped.y, G.player.x, G.player.y) < 130) {
      ped.state = 'flee';
      ped.fleeT = 2.5;
      ped.angle = Math.atan2(ped.y - G.player.y, ped.x - G.player.x);
    }
  }
}
