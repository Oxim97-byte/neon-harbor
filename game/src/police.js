// Polisi & wanted: bintang 0–5, polisi jalan kaki mengejar dan
// menangkap (Busted), mobil polisi mengejar dan menabrak, bintang
// turun kalau pemain sembunyi cukup lama tanpa kejahatan baru.
import { WANTED } from './config.js';
import { clamp, dist } from './rng.js';
import { collideCircle, randomRoadPoint } from './world.js';
import { driveStep, makeCar } from './vehicles.js';

export function updateWanted(G, dt) {
  const p = G.player;
  if (p.wanted === 0) return;
  const quietFor = G.time - G.lastCrime;
  const copNear = G.cops.some((c) => dist(c.x, c.y, p.x, p.y) < 420);
  if (quietFor > WANTED.decayQuietSec && !copNear) {
    G.wantedDecayT = (G.wantedDecayT || 0) + dt;
    if (G.wantedDecayT >= WANTED.decayStepSec) {
      G.wantedDecayT = 0;
      p.wanted = Math.max(0, p.wanted - 1);
      if (p.wanted === 0) {
        G.message = 'Polisi kehilangan jejakmu.';
        G.messageT = 3;
      }
    }
  } else {
    G.wantedDecayT = 0;
  }
}

// Hilangkan semua wanted sekaligus (persembunyian misi 4).
export function clearWanted(G, reason) {
  G.player.wanted = 0;
  G.wantedDecayT = 0;
  G.cops.length = 0;
  for (const car of G.cars) {
    if (car.kind === 'cop') car.driver = 'none';
  }
  if (reason) {
    G.message = reason;
    G.messageT = 3;
  }
}

function spawnCopCar(G) {
  const p = randomRoadPoint(G.rng);
  // Spawn di jalan agak jauh dari pemain supaya kejarannya terlihat.
  let tries = 0;
  let point = p;
  while (dist(point.x, point.y, G.player.x, G.player.y) < 500 && tries < 8) {
    point = randomRoadPoint(G.rng);
    tries += 1;
  }
  const car = makeCar('cop', point.x, point.y, 0, 'cop', G.rng);
  car.ai = true;
  G.cars.push(car);
  return car;
}

function spawnFootCop(G) {
  const ang = G.rng.range(0, Math.PI * 2);
  const x = G.player.x + Math.cos(ang) * 420;
  const y = G.player.y + Math.sin(ang) * 420;
  const pos = { x, y };
  collideCircle(G.world, pos, 14);
  G.cops.push({ x: pos.x, y: pos.y, angle: 0, speed: 0, hp: 60, punchCd: 0 });
}

export function updatePolice(G, dt) {
  const p = G.player;
  const wanted = p.wanted;
  const wantCars = Math.min(3, wanted);
  const wantFoot = wanted >= 1 ? Math.min(4, wanted + 1) : 0;
  const copCars = G.cars.filter((c) => c.kind === 'cop' && c.driver === 'cop');
  const footCops = G.cops;
  if (wanted > 0) {
    if (copCars.length < wantCars && G.rng.chance(dt * 0.8)) spawnCopCar(G);
    if (footCops.length < wantFoot && G.rng.chance(dt * 1.2)) spawnFootCop(G);
  }

  // Mobil polisi: kejar pemain, belok langsung ke arahnya.
  for (const car of copCars) {
    car.ramCd = Math.max(0, (car.ramCd || 0) - dt);
    const targetAngle = Math.atan2(p.y - car.y, p.x - car.x);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = clamp(diff * 1.6, -1, 1);
    driveStep(G, car, 1, 0, steer, dt);
    // Menabrak pemain yang jalan kaki: pemain terpental & terluka.
    if (!p.inCar && dist(car.x, car.y, p.x, p.y) < 34) {
      const push = Math.atan2(p.y - car.y, p.x - car.x);
      p.x += Math.cos(push) * 26;
      p.y += Math.sin(push) * 26;
      const pos = { x: p.x, y: p.y };
      collideCircle(G.world, pos, 16);
      p.x = pos.x;
      p.y = pos.y;
      if (p.invuln <= 0) {
        p.hp = Math.max(0, p.hp - 12);
        p.invuln = 0.7;
        G.audio.hurt();
      }
      car.speed *= 0.4;
    }
    // Menabrak mobil pemain: dorongan sekali per 0,6 detik, bukan
    // potongan kecepatan tiap frame (itu akan mematikan mobil).
    if (p.inCar && p.car && dist(car.x, car.y, p.car.x, p.car.y) < 56 && car.ramCd <= 0) {
      car.ramCd = 0.6;
      p.car.speed *= 0.85;
      car.speed *= 0.7;
      if (p.invuln <= 0 && Math.abs(car.speed) > 200) {
        p.hp = Math.max(0, p.hp - 4);
        p.invuln = 0.6;
        G.audio.hurt();
      }
    }
  }
  // Mobil polisi yang sudah tidak dibutuhkan (wanted 0) pergi.
  if (wanted === 0) {
    for (let i = G.cars.length - 1; i >= 0; i -= 1) {
      const car = G.cars[i];
      if (car.kind === 'cop' && car.driver === 'cop' && dist(car.x, car.y, p.x, p.y) > 1000) {
        G.cars.splice(i, 1);
      }
    }
    G.cops.length = 0;
    return;
  }

  // Polisi jalan kaki: lari ke pemain, tangkap kalau sudah dekat.
  for (let i = G.cops.length - 1; i >= 0; i -= 1) {
    const cop = G.cops[i];
    const d = dist(cop.x, cop.y, p.x, p.y);
    if (d > 1100) {
      G.cops.splice(i, 1);
      continue;
    }
    cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
    const speed = 265;
    const nx = cop.x + Math.cos(cop.angle) * speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * speed * dt;
    const pos = { x: nx, y: ny };
    if (!collideCircle(G.world, pos, 14)) {
      cop.x = pos.x;
      cop.y = pos.y;
    }
    cop.punchCd -= dt;
    // Tangkap: hanya saat pemain jalan kaki dan wanted masih ada.
    if (!p.inCar && d < 30) {
      G.busted();
      return;
    }
    // Pukul pemain dari dekat kalau belum bisa menangkap (mis. wanted 0).
    if (!p.inCar && d < 40 && cop.punchCd <= 0) {
      cop.punchCd = 1;
      p.hp = Math.max(0, p.hp - 8);
      G.audio.hurt();
    }
  }
}
