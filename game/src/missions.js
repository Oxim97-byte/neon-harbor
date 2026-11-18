// Cerita & misi: 5 misi berantai Rico Vale & Mara Quinn. Tiap misi
// punya briefing dialog, tahap-tahap dengan marker di peta, dan
// hadiah uang. Selesai → layar misi selesai + auto-save; gagal
// (timer habis / Busted / Wasted) → layar gagal + bisa diulang.
import { MISSION_REWARDS, WANTED } from './config.js';
import { dist } from './rng.js';
import { addWanted, makeCar } from './vehicles.js';
import { clearWanted } from './police.js';
import { spawnGang, spawnPickup } from './combat.js';

export const MISSION_DEFS = [
  {
    id: 1,
    title: 'Kenalan dengan Mara',
    briefing: [
      'Mara Quinn: "Rico Vale. Sopir lepas yang katanya paling cepat di Neon Harbor."',
      'Mara Quinn: "Aku butuh orang yang bisa dipegang janjinya. Temui aku di bar — kita bicara kerja."',
      'Rico: "Satu syarat: aku tidak kerja gratis."',
    ],
    objective: 'Temui Mara di Bar Mara',
    target: 'maraBar',
    reward: MISSION_REWARDS[0],
  },
  {
    id: 2,
    title: 'Paket Kilat',
    briefing: [
      'Mara Quinn: "Paket di Dermaga 9 harus sampai ke Hotel Lumen. 90 detik. Jangan dibuka."',
      'Mara Quinn: "Telat sedikit saja, pembelinya hilang — dan bayaranmu ikut hilang."',
    ],
    objective: 'Ambil paket di Dermaga 9, antar ke Hotel Lumen (90 dtk)',
    target: 'dock',
    reward: MISSION_REWARDS[1],
    timer: 90,
  },
  {
    id: 3,
    title: 'Kejar Kurir',
    briefing: [
      'Mara Quinn: "Kurir kita kabur bawa uang muka. Mobil oranye, plat palsu."',
      'Mara Quinn: "Pepet dia sampai dia menyerah. Jangan sampai lolos dari kota."',
    ],
    objective: 'Pepet mobil kurir oranye sampai dia menyerah',
    target: null,
    reward: MISSION_REWARDS[2],
  },
  {
    id: 4,
    title: 'Kabur dari Razia',
    briefing: [
      'Mara Quinn: "Razia besar-besaran. Polisi sudah mengendusmu — tiga bintang."',
      'Mara Quinn: "Sembunyi di rumah persembunyian sampai mereka kehilangan jejak."',
    ],
    objective: 'Lolos dari polisi — sembunyi di Persembunyian',
    target: 'hideout',
    reward: MISSION_REWARDS[3],
  },
  {
    id: 5,
    title: 'Tukar Terakhir',
    briefing: [
      'Mara Quinn: "Tukar terakhir di Pelabuhan. Geng Pelabuhan sudah menunggu — mereka mau kopernya."',
      'Mara Quinn: "Habisi mereka, bawa kopernya kembali padaku. Setelah ini, kau bebas, Rico."',
    ],
    objective: 'Ke Pelabuhan, habisi geng, bawa koper ke Bar Mara',
    target: 'harbor',
    reward: MISSION_REWARDS[4],
  },
];

export function currentDef(G) {
  return MISSION_DEFS[G.missionIndex] || null;
}

export function missionTargetPos(G) {
  const m = G.mission;
  if (!m) return null;
  if (m.stage === 'chase') {
    const t = G.cars.find((c) => c.driver === 'target');
    return t ? { x: t.x, y: t.y } : null;
  }
  if (m.stage === 'fight') return { x: G.world.landmarks.harbor.x, y: G.world.landmarks.harbor.y };
  if (m.stage === 'deliver-case') return { x: G.world.landmarks.maraBar.x, y: G.world.landmarks.maraBar.y };
  if (m.targetKey) {
    const lm = G.world.landmarks[m.targetKey];
    return lm ? { x: lm.x, y: lm.y } : null;
  }
  return null;
}

export function missionObjectiveText(G) {
  const m = G.mission;
  if (!m) return 'Cerita selesai — jelajahi Neon Harbor sesukamu.';
  if (m.stage === 'chase') return `Misi ${m.def.id}: Pepet kurir — ${Math.max(0, Math.ceil(m.pegT))} dtk lagi (${m.pegs}/3 pepet)`;
  if (m.stage === 'fight') return `Misi ${m.def.id}: Habisi geng Pelabuhan (${G.gang.length} tersisa)`;
  if (m.stage === 'deliver-case') return `Misi ${m.def.id}: Bawa koper ke Bar Mara`;
  if (m.def.timer && m.stage === 'deliver') return `Misi ${m.def.id}: Antar paket ke Hotel Lumen — ${Math.max(0, Math.ceil(m.timer))} dtk`;
  return `Misi ${m.def.id}: ${m.def.objective}`;
}

export function startMission(G, index) {
  const def = MISSION_DEFS[index];
  if (!def) {
    G.mission = null;
    return;
  }
  G.missionIndex = index;
  G.mission = {
    def,
    stage: 'go',
    targetKey: def.target,
    timer: def.timer || 0,
    pegT: 6, // misi 3: total detik pepet yang dibutuhkan
    pegs: 0,
    pegCd: 0,
    gangSpawned: false,
    hasCase: false,
  };
  G.dialog = { lines: def.briefing, i: 0, title: `MISI ${def.id} — ${def.title}` };
  G.audio.jingle();
}

function completeMission(G) {
  const m = G.mission;
  if (!m) return;
  const reward = m.def.reward;
  G.player.money += reward;
  G.stats.missions += 1;
  G.missionResult = { title: m.def.title, reward, index: G.missionIndex };
  G.mission = null;
  G.screen = 'mission-ok';
  G.audio.jingle();
  G.saveGame();
}

export function failMission(G, reason) {
  const m = G.mission;
  if (!m) return;
  G.missionResult = { title: m.def.title, reward: 0, failReason: reason, index: G.missionIndex };
  G.mission = null;
  G.screen = 'mission-fail';
  G.audio.fail();
  // Bersihkan sisa misi: mobil target & geng.
  for (let i = G.cars.length - 1; i >= 0; i -= 1) {
    if (G.cars[i].driver === 'target') G.cars.splice(i, 1);
  }
  G.gang.length = 0;
}

export function retryMission(G) {
  const index = G.missionResult ? G.missionResult.index : G.missionIndex;
  G.missionResult = null;
  G.screen = 'play';
  startMission(G, index);
}

export function nextMission(G) {
  const index = G.missionResult ? G.missionResult.index + 1 : G.missionIndex + 1;
  G.missionResult = null;
  G.screen = 'play';
  if (index < MISSION_DEFS.length) {
    startMission(G, index);
  } else {
    G.mission = null;
    G.message = 'Cerita selesai. Neon Harbor milikmu sekarang, Rico.';
    G.messageT = 5;
  }
}

export function updateMission(G, dt) {
  const m = G.mission;
  if (!m || G.dialog) return;
  const p = G.player;

  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      failMission(G, 'Waktu habis — paket tidak sampai tepat waktu.');
      return;
    }
  }

  const target = missionTargetPos(G);
  if (m.stage === 'go' || m.stage === 'deliver') {
    if (target && dist(p.x, p.y, target.x, target.y) < 90) {
      if (m.def.id === 2 && m.stage === 'go') {
        // Ambil paket di dermaga, lanjut antar.
        m.stage = 'deliver';
        m.targetKey = 'hotel';
        G.message = 'Paket didapat! Antar ke Hotel Lumen — cepat!';
        G.messageT = 3;
        G.audio.pickup();
        return;
      }
      if (m.def.id === 2 && m.stage === 'deliver') {
        completeMission(G);
        return;
      }
      if (m.def.id === 5 && m.stage === 'go') {
        // Sampai pelabuhan: geng muncul.
        m.stage = 'fight';
        spawnGang(G, G.world.landmarks.harbor.x, G.world.landmarks.harbor.y, 4);
        spawnPickup(G, G.world.landmarks.harbor.x - 120, G.world.landmarks.harbor.y + 60, 'ammo');
        spawnPickup(G, G.world.landmarks.harbor.x + 120, G.world.landmarks.harbor.y - 40, 'health');
        return;
      }
      if (m.def.id === 4 && m.stage === 'go') {
        clearWanted(G, 'Bersembunyi — polisi kehilangan jejakmu.');
        completeMission(G);
        return;
      }
      completeMission(G);
      return;
    }
  }

  if (m.stage === 'chase') {
    const t = G.cars.find((c) => c.driver === 'target');
    if (!t) return;
    m.pegCd -= dt;
    const d = dist(p.x, p.y, t.x, t.y);
    const close = p.inCar ? d < 130 : d < 90;
    if (close) {
      m.pegT -= dt;
      if (m.pegCd <= 0) {
        m.pegCd = 1;
        m.pegs += 1;
        G.message = `Kurir terpepet! (${m.pegs}/3)`;
        G.messageT = 1.5;
      }
      if (m.pegT <= 0) {
        G.cars.splice(G.cars.indexOf(t), 1);
        G.peds.push({ x: t.x + 30, y: t.y, angle: 0, speed: 0, state: 'flee', fleeT: 4, color: '#f97316', down: 0, walkT: 3 });
        G.player.money += 0;
        completeMission(G);
      }
    }
  }

  if (m.stage === 'fight') {
    if (G.gang.length === 0 && m.gangSpawned) {
      m.stage = 'deliver-case';
      m.hasCase = true;
      G.message = 'Koper didapat! Bawa ke Bar Mara.';
      G.messageT = 3;
      G.audio.pickup();
    } else if (G.gang.length > 0) {
      m.gangSpawned = true;
    }
  }

  if (m.stage === 'deliver-case') {
    const bar = G.world.landmarks.maraBar;
    if (dist(p.x, p.y, bar.x, bar.y) < 90) {
      completeMission(G);
    }
  }
}

// Dipanggil saat misi 3 & 4 dimulai (butuh setup khusus).
export function setupMissionStage(G) {
  const m = G.mission;
  if (!m) return;
  if (m.def.id === 3) {
    m.stage = 'chase';
    const p = G.player;
    const tx = p.x + 500;
    const ty = p.y - 260;
    const car = makeCar('sedan', tx, ty, 0, 'target', G.rng);
    car.color = '#f97316';
    car.aiSpeed = 300;
    G.cars.push(car);
    G.message = 'Itu dia — mobil kurir oranye! Pepet dia!';
    G.messageT = 3;
  }
  if (m.def.id === 4) {
    addWanted(G, 3, 'Razia! Polisi mengejarmu.');
  }
}
