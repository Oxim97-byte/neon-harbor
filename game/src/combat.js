// Combat: pukulan jarak dekat, pistol + peluru, musuh geng, pickup
// (amunisi / nyawa / uang), partikel dan teks melayang. Menembak atau
// memukul di depan saksi menaikkan wanted.
import { PLAYER, WANTED } from './config.js';
import { angleDiff, dist } from './rng.js';
import { addWanted, damagePlayer } from './vehicles.js';
import { scarePeds } from './pedestrians.js';

export function punch(G) {
  const p = G.player;
  if (p.inCar || p.punchCd > 0) return;
  p.punchCd = PLAYER.punchCooldown;
  p.punchAnim = 0.22;
  G.audio.punch();
  scarePeds(G, p.x, p.y, 260);
  let hitSomething = false;
  // Pukul geng / polisi jalan kaki di depan.
  for (const foe of [...G.gang, ...G.cops]) {
    const d = dist(p.x, p.y, foe.x, foe.y);
    if (d > PLAYER.punchRange + 14) continue;
    const ang = Math.atan2(foe.y - p.y, foe.x - p.x);
    if (Math.abs(angleDiff(p.angle, ang)) > 1.1) continue;
    foe.hp -= PLAYER.punchDamage;
    hitSomething = true;
    addFloater(G, foe.x, foe.y - 24, `-${PLAYER.punchDamage}`, '#facc15');
    spawnSparks(G, foe.x, foe.y, '#facc15');
  }
  // Pukul pejalan kaki: jatuh, lari, wanted naik.
  for (const ped of G.peds) {
    const d = dist(p.x, p.y, ped.x, ped.y);
    if (d > PLAYER.punchRange + 12) continue;
    const ang = Math.atan2(ped.y - p.y, ped.x - p.x);
    if (Math.abs(angleDiff(p.angle, ang)) > 1.1) continue;
    ped.state = 'down';
    ped.down = 2.5;
    hitSomething = true;
    addWanted(G, WANTED.punchPed, 'Kekerasan di jalan! Polisi dipanggil.');
    scarePeds(G, p.x, p.y, 320);
  }
  // Pukul mobil di depan: kaca pecah, alarm, sopir kabur.
  for (const car of G.cars) {
    if (car.driver === 'player') continue;
    const d = dist(p.x, p.y, car.x, car.y);
    if (d > PLAYER.punchRange + 26) continue;
    hitSomething = true;
    car.hp -= 20;
    spawnSparks(G, car.x, car.y, '#e5e7eb');
    if (car.driver === 'ped') {
      G.peds.push({ x: car.x + 34, y: car.y, angle: 0, speed: 0, state: 'flee', fleeT: 4, color: '#f97316', down: 0, walkT: 3 });
      car.driver = 'none';
      addWanted(G, WANTED.punchPed, 'Merusak mobil di depan saksi!');
    }
  }
  if (!hitSomething) {
    // Pukulan kosong: tetap ada ayunan (animasi), tanpa efek.
  }
}

export function shoot(G, worldX, worldY) {
  const p = G.player;
  if (p.inCar || p.weapon !== 'pistol') return;
  if (p.ammo <= 0) {
    G.message = 'Amunisi habis! Cari pickup hijau / toko amunisi.';
    G.messageT = 2.5;
    G.audio.click();
    return;
  }
  p.ammo -= 1;
  G.stats.shots += 1;
  const ang = Math.atan2(worldY - p.y, worldX - p.x);
  p.angle = ang;
  const bx = p.x + Math.cos(ang) * 26;
  const by = p.y + Math.sin(ang) * 26;
  G.bullets.push({ x: bx, y: by, vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900, from: 'player', dmg: 34, life: 0.9 });
  G.audio.shoot();
  scarePeds(G, p.x, p.y, 320);
  // Tembakan terdengar polisi / saksi di dekat.
  let seen = false;
  for (const cop of G.cops) if (dist(p.x, p.y, cop.x, cop.y) < 500) seen = true;
  for (const ped of G.peds) if (ped.state !== 'down' && dist(p.x, p.y, ped.x, ped.y) < 260) seen = true;
  if (seen) addWanted(G, WANTED.shootWitness, 'Tembakan terdengar! Polisi dipanggil.');
}

export function spawnGang(G, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    G.gang.push({
      x: x + G.rng.range(-70, 70),
      y: y + G.rng.range(-70, 70),
      angle: 0,
      hp: 70,
      shootCd: G.rng.range(0.5, 1.6),
      moveT: 0,
      color: '#c084fc',
    });
  }
  G.message = 'Geng Pelabuhan menyerang! Habisi mereka.';
  G.messageT = 3;
}

export function spawnPickup(G, x, y, kind) {
  G.pickups.push({ x, y, kind, t: 0 });
}

export function spawnSparks(G, x, y, color) {
  for (let i = 0; i < 8; i += 1) {
    const a = G.rng.range(0, Math.PI * 2);
    const s = G.rng.range(60, 220);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4, color, size: 3 });
  }
}

export function addFloater(G, x, y, text, color) {
  G.floats.push({ x, y, text, color, t: 1 });
}

export function updateCombat(G, dt) {
  const p = G.player;
  // Peluru bergerak & mengenai sasaran.
  for (let i = G.bullets.length - 1; i >= 0; i -= 1) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead) {
      if (b.from === 'player') {
        for (const foe of [...G.gang, ...G.cops]) {
          if (dist(b.x, b.y, foe.x, foe.y) < 20) {
            foe.hp -= b.dmg;
            spawnSparks(G, b.x, b.y, '#f87171');
            addFloater(G, foe.x, foe.y - 24, `-${b.dmg}`, '#f87171');
            dead = true;
            break;
          }
        }
      } else if (dist(b.x, b.y, p.x, p.y) < (p.inCar ? 30 : 18)) {
        damagePlayer(G, b.dmg * 0.6);
        G.audio.hurt();
        spawnSparks(G, b.x, b.y, '#f87171');
        dead = true;
      }
      // Peluru menabrak gedung: hilang + percikan.
      if (!dead) {
        const bx = Math.max(0, Math.min(3199, b.x));
        const by = Math.max(0, Math.min(2399, b.y));
        if (b.x !== bx || b.y !== by) dead = true;
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
  // Geng mati: jatuh, kadang menjatuhkan uang / amunisi.
  for (let i = G.gang.length - 1; i >= 0; i -= 1) {
    const g = G.gang[i];
    if (g.hp <= 0) {
      G.stats.kills += 1;
      addFloater(G, g.x, g.y - 20, '+$40', '#4ade80');
      p.money += 40;
      if (G.rng.chance(0.5)) spawnPickup(G, g.x, g.y, 'ammo');
      else if (G.rng.chance(0.4)) spawnPickup(G, g.x, g.y, 'money');
      spawnSparks(G, g.x, g.y, '#c084fc');
      G.gang.splice(i, 1);
      continue;
    }
    // Geng mendekat sampai jarak tembak, lalu menembak pemain.
    const d = dist(g.x, g.y, p.x, p.y);
    g.angle = Math.atan2(p.y - g.y, p.x - g.x);
    g.shootCd -= dt;
    g.moveT -= dt;
    if (d > 260) {
      const nx = g.x + Math.cos(g.angle) * 150 * dt;
      const ny = g.y + Math.sin(g.angle) * 150 * dt;
      g.x = nx;
      g.y = ny;
    } else if (d > 120 && g.moveT <= 0) {
      g.moveT = 0.8;
      const strafe = g.angle + (G.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
      g.x += Math.cos(strafe) * 90 * dt * 8;
      g.y += Math.sin(strafe) * 90 * dt * 8;
    }
    if (g.shootCd <= 0 && d < 420) {
      g.shootCd = G.rng.range(0.9, 1.7);
      const ang = g.angle + G.rng.range(-0.12, 0.12);
      G.bullets.push({ x: g.x + Math.cos(ang) * 24, y: g.y + Math.sin(ang) * 24, vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, from: 'gang', dmg: 10, life: 1.1 });
      G.audio.shoot();
    }
    // Geng menyentuh pemain jalan kaki: pukulan.
    if (!p.inCar && d < 30) {
      damagePlayer(G, 10);
      G.audio.hurt();
      g.shootCd = Math.max(g.shootCd, 0.8);
    }
  }
  // Polisi jalan kaki yang tertembak sampai mati: hilang, wanted naik.
  for (let i = G.cops.length - 1; i >= 0; i -= 1) {
    if (G.cops[i].hp <= 0) {
      addWanted(G, 2, 'Polisi tertembak! Seluruh kota memburumu.');
      G.cops.splice(i, 1);
    }
  }
  // Pickup: diambil saat disentuh.
  for (let i = G.pickups.length - 1; i >= 0; i -= 1) {
    const pk = G.pickups[i];
    pk.t += dt;
    const d = dist(p.x, p.y, pk.x, pk.y);
    const radius = p.inCar ? 44 : 30;
    if (d < radius) {
      if (pk.kind === 'ammo') {
        p.ammo += 24;
        addFloater(G, pk.x, pk.y - 20, '+24 peluru', '#4ade80');
      } else if (pk.kind === 'health') {
        p.hp = Math.min(100, p.hp + 40);
        addFloater(G, pk.x, pk.y - 20, '+40 nyawa', '#4ade80');
      } else {
        p.money += 60;
        addFloater(G, pk.x, pk.y - 20, '+$60', '#facc15');
      }
      G.audio.pickup();
      G.pickups.splice(i, 1);
    }
  }
  // Partikel & teks melayang menua.
  for (let i = G.parts.length - 1; i >= 0; i -= 1) {
    const pt = G.parts[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) G.parts.splice(i, 1);
  }
  for (let i = G.floats.length - 1; i >= 0; i -= 1) {
    const f = G.floats[i];
    f.y -= 34 * dt;
    f.t -= dt;
    if (f.t <= 0) G.floats.splice(i, 1);
  }
}
