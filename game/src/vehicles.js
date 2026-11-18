// Mobil: pabrik, fisika mengemudi, tabrakan dengan gedung dan mobil lain,
// serta masuk / keluar mobil. Satu mobil = satu objek dengan posisi,
// sudut, kecepatan, dan siapa pengemudinya.
import { CAR, WANTED } from './config.js';
import { clamp, dist } from './rng.js';
import { collideCircle, isOnRoad } from './world.js';

const CAR_COLORS = ['#e11d48', '#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#e5e7eb', '#f97316', '#14b8a6'];
const TAXI_COLOR = '#facc15';

let nextId = 1;

export function makeCar(kind, x, y, angle, driver, rng) {
  const color = kind === 'taxi' ? TAXI_COLOR : kind === 'cop' ? '#2563eb' : kind === 'sport' ? '#e11d48' : rng ? rng.pick(CAR_COLORS) : '#94a3b8';
  return {
    id: nextId,
    kind, // sedan | taxi | sport | truck | cop
    x, y, angle,
    speed: 0,
    color,
    driver, // 'player' | 'ped' | 'cop' | 'none' | 'target'
    ai: driver !== 'player',
    aiDir: 0, // 0 kanan, 1 bawah, 2 kiri, 3 atas (untuk traffic)
    aiSpeed: 0,
    aiTimer: 0,
    hp: 100,
    honkT: 0,
  };
}

export function maxSpeedOf(car) {
  if (car.kind === 'sport') return CAR.sportMax;
  if (car.kind === 'cop') return CAR.copMax;
  if (car.kind === 'truck') return 420;
  return CAR.maxSpeed;
}

// Satu langkah fisika: gas maju, rem / mundur, belok ikut kecepatan.
export function driveStep(G, car, gas, brake, steer, dt) {
  const max = maxSpeedOf(car);
  if (gas > 0) car.speed += CAR.accel * gas * dt;
  if (brake > 0) {
    if (car.speed > 20) car.speed -= CAR.brake * brake * dt;
    else car.speed -= CAR.accel * 0.55 * brake * dt;
  }
  car.speed -= car.speed * CAR.drag * dt;
  if (car.speed > max) car.speed = max;
  if (car.speed < -CAR.reverseMax) car.speed = -CAR.reverseMax;
  if (Math.abs(car.speed) < 6 && gas === 0 && brake === 0) car.speed = 0;
  const turn = steer * CAR.steer * clamp(car.speed / 260, -1, 1) * dt;
  car.angle += turn;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const pos = { x: nx, y: ny };
  if (collideCircle(G.world, pos, 24)) {
    // Menabrak gedung: kecepatan hilang sebagian, mobil memantul pelan.
    car.speed *= 0.35;
    if (Math.abs(car.speed) > 300 && car.driver === 'player') {
      damagePlayer(G, 6);
      G.audio.hurt();
    }
  }
  car.x = pos.x;
  car.y = pos.y;
}

// Dorong mobil yang saling tumpuk agar tidak menembus satu sama lain.
export function separateCars(cars) {
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      const d = dist(a.x, a.y, b.x, b.y);
      if (d >= 52 || d === 0) continue;
      const push = (52 - d) / 2;
      const nx = (b.x - a.x) / d;
      const ny = (b.y - a.y) / d;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      a.speed *= 0.9;
      b.speed *= 0.9;
    }
  }
}

// Mobil terdekat dari (x, y) dalam radius r.
export function nearestCar(cars, x, y, r) {
  let best = null;
  let bestD = r;
  for (const car of cars) {
    const d = dist(x, y, car.x, car.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function damagePlayer(G, amount) {
  const p = G.player;
  if (p.invuln > 0) return;
  p.hp = Math.max(0, p.hp - amount);
  p.invuln = 0.4;
}

// E di dekat mobil: masuk. Sopir yang ada ditarik keluar jadi pejalan
// kaki; kalau ada saksi / polisi yang melihat, wanted naik.
export function tryEnterCar(G) {
  const p = G.player;
  if (p.inCar) {
    exitCar(G);
    return;
  }
  const car = nearestCar(G.cars, p.x, p.y, 64);
  if (!car) {
    G.message = 'Tidak ada mobil di dekatmu.';
    G.messageT = 2;
    return;
  }
  if (car.driver === 'ped' || car.driver === 'target') {
    // Tarik sopir keluar.
    G.peds.push({ x: car.x + 30, y: car.y + 30, angle: 0, speed: 0, state: 'flee', fleeT: 4, color: '#f97316', down: 0 });
    const witness = hasWitness(G, car.x, car.y);
    if (witness) {
      addWanted(G, WANTED.stealWitness, 'Mencuri mobil di depan saksi!');
    } else {
      G.message = 'Mobil diambil diam-diam.';
      G.messageT = 2.5;
    }
    G.stats.stolen += 1;
  }
  car.driver = 'player';
  car.ai = false;
  p.inCar = true;
  p.car = car;
  p.x = car.x;
  p.y = car.y;
  G.audio.click();
}

export function exitCar(G) {
  const p = G.player;
  if (!p.car) return;
  const car = p.car;
  car.driver = 'none';
  car.ai = true;
  car.speed = 0;
  p.inCar = false;
  p.car = null;
  p.x = car.x - Math.cos(car.angle) * 40;
  p.y = car.y - Math.sin(car.angle) * 40;
  const pos = { x: p.x, y: p.y };
  collideCircle(G.world, pos, 16);
  p.x = pos.x;
  p.y = pos.y;
  G.audio.click();
}

// Ada pejalan kaki / polisi dalam radius lihat yang menyaksikan?
export function hasWitness(G, x, y) {
  for (const ped of G.peds) {
    if (ped.state !== 'down' && dist(x, y, ped.x, ped.y) < 300) return true;
  }
  for (const cop of G.cops) {
    if (dist(x, y, cop.x, cop.y) < 420) return true;
  }
  return false;
}

// Naikkan wanted (dipakai juga oleh combat & police).
export function addWanted(G, n, reason) {
  const p = G.player;
  const before = p.wanted;
  p.wanted = Math.min(WANTED.max, p.wanted + n);
  G.lastCrime = G.time;
  if (p.wanted > before && reason) {
    G.message = reason;
    G.messageT = 3;
  }
  if (p.wanted >= 3 && before < 3) {
    G.message = 'Polisi mengejarmu! Kabur atau sembunyi.';
    G.messageT = 3;
  }
}

// Apakah posisi ini di jalan (untuk spawn / parkir yang masuk akal).
export function carOnRoad(x, y) {
  return isOnRoad(x, y);
}
