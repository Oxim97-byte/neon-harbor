// Demo deterministik ?shot=title|street|chase|mission. Tiap scene
// memainkan aturan asli dari dunia segar (seed 7) beberapa detik
// dengan autopilot sederhana, jadi screenshot yang sama selalu
// memberi frame yang sama.
import { SHOT_SEED, STEP } from './config.js';
import { clamp } from './rng.js';
import { makeCar, addWanted } from './vehicles.js';
import { spawnPickup } from './combat.js';
import { SCREEN_MISSION_OK, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function snapCamera(G) {
  G.cam.x = clamp(G.player.x - 640, 0, 3200 - 1280);
  G.cam.y = clamp(G.player.y - 400, 0, 2400 - 800);
}

function stepSeconds(G, api, seconds, hold) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (hold) hold(i);
    api.stepWorld(G, STEP, 0, null);
    if (G.screen !== SCREEN_PLAY) break;
  }
}

export function stageShot(name, G, api) {
  const key = name === 'street' || name === 'chase' || name === 'mission' ? name : 'title';
  api.resetRun(G, SHOT_SEED);
  G.dialog = null; // briefing dilewati: shot menunjukkan dunia, bukan teks
  const input = G.input;

  if (key === 'title') {
    G.mission = null;
    G.missionIndex = 0;
    G.screen = SCREEN_TITLE;
    snapCamera(G);
    for (let i = 0; i < 300; i += 1) api.ambientStep(G, STEP);
    return { screen: SCREEN_TITLE };
  }

  if (key === 'street') {
    // Rico jalan kaki di persimpangan ramai, mobil parkir di dekatnya.
    G.player.x = 1200;
    G.player.y = 820;
    G.player.inCar = false;
    const parked = makeCar('sedan', 1290, 820, 0, 'none', G.rng);
    G.cars.push(parked);
    spawnPickup(G, 1130, 770, 'ammo');
    spawnPickup(G, 1260, 900, 'health');
    snapCamera(G);
    G.screen = SCREEN_PLAY;
    input.fakeHold('KeyW', true);
    stepSeconds(G, api, 2.2);
    input.fakeHold('KeyW', false);
    input.fakeHold('KeyA', true);
    stepSeconds(G, api, 1.4);
    input.fakeHold('KeyA', false);
    // Arahkan hadap ke jalan supaya pose terlihat hidup.
    G.player.angle = -0.6;
    return { screen: SCREEN_PLAY };
  }

  if (key === 'chase') {
    // Rico mengemudi kencang di jalan lurus, wanted 3, 3 mobil polisi mengejar.
    G.player.x = 1600;
    G.player.y = 1200;
    const sport = makeCar('sport', 1600, 1200, 0, 'player', G.rng);
    sport.speed = 420;
    G.cars.push(sport);
    G.player.inCar = true;
    G.player.car = sport;
    addWanted(G, 3, '');
    G.message = 'Polisi mengejarmu! Kabur atau sembunyi.';
    G.messageT = 5;
    const copSpots = [
      [1350, 1200, 0],
      [1300, 1140, 0.2],
      [1400, 1260, -0.2],
    ];
    for (const [x, y, a] of copSpots) {
      const cop = makeCar('cop', x, y, a, 'cop', G.rng);
      cop.speed = 380;
      G.cars.push(cop);
    }
    const taxi = makeCar('taxi', 2800, 1200, 0, 'ped', G.rng);
    taxi.aiDir = 0;
    taxi.aiSpeed = 200;
    G.cars.push(taxi);
    snapCamera(G);
    G.screen = SCREEN_PLAY;
    // Lurus di jalan — tanpa belok, supaya mobil tidak menabrak gedung.
    input.fakeHold('KeyW', true);
    stepSeconds(G, api, 2.0);
    input.fakeHold('KeyW', false);
    return { screen: SCREEN_PLAY };
  }

  // mission: selesaikan Misi 1 secara nyata (jalan ke Bar Mara),
  // supaya screenshot menunjukkan layar "MISI SELESAI" + hadiah.
  const bar = G.world.landmarks.maraBar;
  G.player.x = bar.x;
  G.player.y = bar.y + 40;
  snapCamera(G);
  G.screen = SCREEN_PLAY;
  for (let i = 0; i < 120 && G.screen === SCREEN_PLAY; i += 1) {
    api.stepWorld(G, STEP, 0, null);
  }
  if (G.screen !== SCREEN_MISSION_OK) {
    // Cadangan kalau autopilot tidak sampai: paksakan posisi tepat.
    G.player.x = bar.x;
    G.player.y = bar.y;
    for (let i = 0; i < 30 && G.screen === SCREEN_PLAY; i += 1) {
      api.stepWorld(G, STEP, 0, null);
    }
  }
  return { screen: G.screen };
}
