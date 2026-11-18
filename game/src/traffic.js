// Lalu lintas AI: mobil sipil mengikuti jalan, belok di persimpangan,
// mengerem kalau ada mobil di depan. Jumlah dijaga di sekitar kamera
// supaya jalan selalu hidup tapi tidak membebani.
import { clamp, dist } from './rng.js';
import { ROADS_H, ROADS_V, collideCircle, randomRoadPoint } from './world.js';
import { driveStep, makeCar, maxSpeedOf } from './vehicles.js';

const TARGET_CARS = 14;
const DIRS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

export function spawnTraffic(G, count) {
  for (let i = 0; i < count; i += 1) {
    const p = randomRoadPoint(G.rng);
    const dir = p.vertical ? (G.rng.chance(0.5) ? 1 : 3) : (G.rng.chance(0.5) ? 0 : 2);
    const kind = G.rng.chance(0.12) ? 'taxi' : G.rng.chance(0.12) ? 'sport' : G.rng.chance(0.1) ? 'truck' : 'sedan';
    const car = makeCar(kind, p.x, p.y, dir * (Math.PI / 2), 'ped', G.rng);
    car.aiDir = dir;
    car.aiSpeed = G.rng.range(150, 260);
    G.cars.push(car);
  }
}

// Mobil di depan dalam jalur yang sama (untuk mengerem).
function carAhead(G, car) {
  const d = DIRS[car.aiDir];
  let best = Infinity;
  for (const other of G.cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * d.x + dy * d.y;
    const side = Math.abs(dx * -d.y + dy * d.x);
    if (along > 0 && along < 110 && side < 30 && along < best) best = along;
  }
  return best;
}

function atIntersection(car) {
  for (const vx of ROADS_V) {
    for (const hy of ROADS_H) {
      if (Math.abs(car.x - vx) < 26 && Math.abs(car.y - hy) < 26) return true;
    }
  }
  return false;
}

export function updateTraffic(G, dt) {
  // Jaga jumlah mobil AI di sekitar kamera.
  const near = G.cars.filter((c) => c.ai && c.driver !== 'cop' && c.driver !== 'target' && dist(c.x, c.y, G.cam.x + 640, G.cam.y + 400) < 900).length;
  if (near < TARGET_CARS) {
    spawnTraffic(G, 1);
  }
  // Buang mobil AI yang sudah jauh dari kamera.
  for (let i = G.cars.length - 1; i >= 0; i -= 1) {
    const car = G.cars[i];
    if (car.ai && car.driver !== 'cop' && car.driver !== 'target' && dist(car.x, car.y, G.cam.x + 640, G.cam.y + 400) > 1400) {
      G.cars.splice(i, 1);
    }
  }

  for (const car of G.cars) {
    if (!car.ai || car.driver === 'cop' || car.driver === 'target') continue;
    car.aiTimer -= dt;
    // Di persimpangan, kadang belok kiri / kanan / lurus.
    if (atIntersection(car) && car.aiTimer <= 0) {
      car.aiTimer = 1.2;
      const roll = G.rng.next();
      if (roll < 0.3) car.aiDir = (car.aiDir + 1) % 4;
      else if (roll < 0.55) car.aiDir = (car.aiDir + 3) % 4;
    }
    // Ujung dunia: putar balik.
    if (car.x < 140 || car.x > 3060 || car.y < 140 || car.y > 2180) {
      car.aiDir = (car.aiDir + 2) % 4;
      car.aiTimer = 1.5;
    }
    const targetAngle = car.aiDir * (Math.PI / 2);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    const ahead = carAhead(G, car);
    const want = ahead < 110 ? 0 : car.aiSpeed;
    car.speed += clamp(want - car.speed, -500 * dt, 260 * dt);
    if (car.speed < 0) car.speed = 0;
    if (car.speed > maxSpeedOf(car)) car.speed = maxSpeedOf(car);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const pos = { x: nx, y: ny };
    if (collideCircle(G.world, pos, 24)) car.speed *= 0.5;
    car.x = pos.x;
    car.y = pos.y;
    // Tetap di lajur jalan: tarik pelan ke pusat jalan terdekat.
    const d = DIRS[car.aiDir];
    if (d.x !== 0) {
      let best = ROADS_H[0];
      let bd = Infinity;
      for (const hy of ROADS_H) {
        const dd = Math.abs(car.y - hy);
        if (dd < bd) { bd = dd; best = hy; }
      }
      car.y += clamp(best + 28 * (d.x > 0 ? 1 : -1) - car.y, -40 * dt, 40 * dt);
    } else {
      let best = ROADS_V[0];
      let bd = Infinity;
      for (const vx of ROADS_V) {
        const dd = Math.abs(car.x - vx);
        if (dd < bd) { bd = dd; best = vx; }
      }
      car.x += clamp(best + 28 * (d.y > 0 ? -1 : 1) - car.x, -40 * dt, 40 * dt);
    }
  }
}

// Dipakai misi kejar-kejaran: mobil target kabur menjauh dari pemain.
export function updateTargetCar(G, dt) {
  const target = G.cars.find((c) => c.driver === 'target');
  if (!target) return;
  const away = Math.atan2(target.y - G.player.y, target.x - G.player.x);
  let diff = away - target.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  target.angle += clamp(diff, -2.2 * dt, 2.2 * dt);
  driveStep(G, target, 1, 0, 0, dt);
  // Target menabrak gedung: pelankan, jangan macet selamanya.
  if (target.speed < 40) {
    target.angle += 1.6 * dt;
    target.speed = 120;
  }
}
