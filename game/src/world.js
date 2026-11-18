// Kota Neon Harbor: jaringan jalan grid, blok gedung, trotoar, dan
// pelabuhan di selatan. Semua posisi lahir dari RNG seed, jadi kota
// yang sama muncul di setiap kunjungan dengan seed yang sama.
import { WORLD } from './config.js';

export const ROAD_W = 120;
export const SIDEWALK = 36;

// Sumbu jalan vertikal & horizontal (pusat jalan).
export const ROADS_V = [400, 800, 1200, 1600, 2000, 2400, 2800];
export const ROADS_H = [400, 800, 1200, 1600, 2000];
const WATER_TOP = 2260;

const NEON_SIGNS = ['BAR', 'HOTEL', 'PIER', 'DOCK', '24H', 'NEON', 'CLUB', 'CAFE', 'TAXI', 'PORT'];

export function buildWorld(rng) {
  const buildings = [];
  const lamps = [];
  const trees = [];
  const boats = [];
  const colors = ['#2b3048', '#332f4d', '#2d3a4d', '#3a2f4d', '#2f4038', '#40342a'];
  const neon = ['#ff2e88', '#22d3ee', '#facc15', '#4ade80', '#a78bfa'];

  // Satu gedung (atau dua) di tiap blok di antara jalan.
  for (let vi = 0; vi < ROADS_V.length - 1; vi += 1) {
    for (let hi = 0; hi < ROADS_H.length - 1; hi += 1) {
      const x0 = ROADS_V[vi] + ROAD_W / 2 + SIDEWALK + 8;
      const x1 = ROADS_V[vi + 1] - ROAD_W / 2 - SIDEWALK - 8;
      const y0 = ROADS_H[hi] + ROAD_W / 2 + SIDEWALK + 8;
      const y1 = ROADS_H[hi + 1] - ROAD_W / 2 - SIDEWALK - 8;
      if (y1 > 2140) continue; // blok pelabuhan: kosong, dermaga saja
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      const count = rng.chance(0.45) ? 2 : 1;
      for (let b = 0; b < count; b += 1) {
        const w = rng.range(70, Math.max(80, (x1 - x0) / count - 14));
        const h = rng.range(70, Math.max(80, y1 - y0 - 14));
        const x = x0 + (b * (x1 - x0)) / count + rng.range(4, Math.max(5, (x1 - x0) / count - w - 4));
        const y = y0 + rng.range(4, Math.max(5, y1 - y0 - h - 4));
        buildings.push({
          x, y, w, h,
          color: rng.pick(colors),
          neon: rng.pick(neon),
          sign: rng.chance(0.5) ? rng.pick(NEON_SIGNS) : '',
          windows: rng.int(2, 5),
        });
      }
    }
  }

  // Lampu jalan di tiap persimpangan, pohon di trotoar.
  for (const vx of ROADS_V) {
    for (const hy of ROADS_H) {
      lamps.push({ x: vx + ROAD_W / 2 + 12, y: hy - ROAD_W / 2 - 12 });
      if (rng.chance(0.5)) trees.push({ x: vx - ROAD_W / 2 - 18, y: hy + rng.range(-140, 140) });
    }
  }
  // Kapal di pelabuhan.
  for (let i = 0; i < 5; i += 1) {
    boats.push({ x: 300 + i * 520 + rng.range(-40, 40), y: WATER_TOP + 60 + rng.range(0, 70), w: 150, h: 42, color: rng.pick(['#7c2d12', '#1e3a5f', '#3f3f46']) });
  }

  // Titik penting cerita — semuanya di jalan / trotoar, bukan di gedung.
  const landmarks = {
    spawn: { x: 400, y: 640, label: 'Apartemen Rico' },
    maraBar: { x: 800, y: 460, label: 'Bar Mara' },
    hotel: { x: 2400, y: 860, label: 'Hotel Lumen' },
    dock: { x: 2800, y: 2060, label: 'Dermaga 9' },
    hideout: { x: 400, y: 1960, label: 'Persembunyian' },
    harbor: { x: 2000, y: 2140, label: 'Pelabuhan' },
    hospital: { x: 1200, y: 1960, label: 'Klinik Pelabuhan' },
    policeStation: { x: 1600, y: 460, label: 'Kantor Polisi' },
    gunShop: { x: 1200, y: 860, label: 'Toko Amunisi' },
  };

  return { buildings, lamps, trees, boats, landmarks, waterTop: WATER_TOP };
}

export function isOnRoad(x, y) {
  for (const vx of ROADS_V) if (Math.abs(x - vx) <= ROAD_W / 2) return true;
  for (const hy of ROADS_H) if (Math.abs(y - hy) <= ROAD_W / 2) return true;
  return false;
}

export function nearestRoadAxis(x, y) {
  let bestV = ROADS_V[0];
  let bestD = Infinity;
  for (const vx of ROADS_V) {
    const d = Math.abs(x - vx);
    if (d < bestD) { bestD = d; bestV = vx; }
  }
  let bestH = ROADS_H[0];
  let bestHd = Infinity;
  for (const hy of ROADS_H) {
    const d = Math.abs(y - hy);
    if (d < bestHd) { bestHd = d; bestH = hy; }
  }
  return bestD <= bestHd ? { axis: 'v', at: bestV } : { axis: 'h', at: bestH };
}

// Dorong lingkaran (x, y, r) keluar dari gedung dan batas dunia.
// Mengubah objek pos di tempat; mengembalikan true bila menabrak.
export function collideCircle(world, pos, r) {
  let hit = false;
  pos.x = Math.max(r + 8, Math.min(WORLD.width - r - 8, pos.x));
  pos.y = Math.max(r + 8, Math.min(WORLD.height - r - 8, pos.y));
  for (const b of world.buildings) {
    const cx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(pos.y, b.y + b.h));
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 0.01) {
      const d = Math.sqrt(d2);
      pos.x = cx + (dx / d) * r;
      pos.y = cy + (dy / d) * r;
    } else {
      // Tepat di dalam gedung: dorong ke sisi terdekat.
      const left = pos.x - b.x;
      const right = b.x + b.w - pos.x;
      const top = pos.y - b.y;
      const bottom = b.y + b.h - pos.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = b.x - r;
      else if (m === right) pos.x = b.x + b.w + r;
      else if (m === top) pos.y = b.y - r;
      else pos.y = b.y + b.h + r;
    }
  }
  return hit;
}

export function pointInBuilding(world, x, y) {
  for (const b of world.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// Titik acak di jalan, untuk spawn mobil / polisi.
export function randomRoadPoint(rng) {
  if (rng.chance(0.5)) {
    return { x: rng.pick(ROADS_V) + rng.range(-30, 30), y: rng.range(150, 2150), vertical: true };
  }
  return { x: rng.range(150, 3050), y: rng.pick(ROADS_H) + rng.range(-30, 30), vertical: false };
}

// Titik acak di trotoar (tepi jalan), untuk pejalan kaki.
export function randomSidewalkPoint(rng) {
  const p = randomRoadPoint(rng);
  if (p.vertical) p.x += rng.chance(0.5) ? 78 : -78;
  else p.y += rng.chance(0.5) ? 78 : -78;
  return p;
}
