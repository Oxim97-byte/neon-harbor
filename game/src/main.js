// NEON HARBOR — boot & loop utama. Input dibaca tiap frame, dunia
// maju dalam langkah tetap 1/60 detik, renderer menggambar hasilnya.
// Layar: title, play, paused, help, busted, wasted, mission-ok,
// mission-fail. ?shot=title|street|chase|mission (dengan &seed=N)
// menampilkan scene demo deterministik lalu menandai window.__shotReady.
import { STEP, WANTED } from './config.js';
import { clamp, createRng } from './rng.js';
import {
  ACTION_CONFIRM, ACTION_DOWN, ACTION_ENTER, ACTION_HELP, ACTION_MUTE,
  ACTION_PAUSE, ACTION_PUNCH, ACTION_RESTART, ACTION_SAVE, ACTION_TITLE,
  ACTION_UP, ACTION_WEAPON_FIST, ACTION_WEAPON_GUN, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { buildWorld } from './world.js';
import { spawnTraffic, updateTargetCar, updateTraffic } from './traffic.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updatePolice, updateWanted } from './police.js';
import { createPlayer, handlePlayerActions, updateCamera, updatePlayer } from './player.js';
import { punch, shoot, updateCombat } from './combat.js';
import {
  failMission, missionTargetPos, nextMission, retryMission,
  setupMissionStage, startMission, updateMission,
} from './missions.js';
import { applySave, hasSave, loadSave, saveGame } from './save.js';
import { exitCar, makeCar, separateCars } from './vehicles.js';
import {
  SCREEN_BUSTED, SCREEN_HELP, SCREEN_MISSION_FAIL, SCREEN_MISSION_OK,
  SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED, createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);

function createGame() {
  const rng = createRng(seed);
  const world = buildWorld(rng);
  const G = {
    seed,
    rng,
    world,
    screen: SCREEN_TITLE,
    time: 0,
    clock: 8 * 60,
    player: createPlayer(world.landmarks.spawn.x, world.landmarks.spawn.y),
    cars: [],
    peds: [],
    cops: [],
    gang: [],
    bullets: [],
    pickups: [],
    parts: [],
    floats: [],
    missionIndex: 0,
    mission: null,
    missionResult: null,
    missionTarget: null,
    dialog: null,
    message: '',
    messageT: 0,
    cam: { x: 0, y: 0 },
    stats: { kills: 0, stolen: 0, missions: 0, shots: 0 },
    lastCrime: -999,
    wantedDecayT: 0,
    speed01: 0,
    muted: false,
    saveExists: hasSave(),
    menuIndex: 0,
    menuRects: [],
    helpFrom: SCREEN_TITLE,
    lastFine: 0,
    autoSaveT: 20,
    input,
    audio,
  };
  G.saveGame = () => saveGame(G);
  G.busted = () => doBusted(G);
  G.wasted = () => doWasted(G);
  return G;
}

const G = createGame();

function doBusted(G) {
  if (G.screen !== SCREEN_PLAY) return;
  const p = G.player;
  const fine = Math.min(p.money, WANTED.bustFineBase + WANTED.bustFinePerStar * p.wanted);
  p.money -= fine;
  G.lastFine = fine;
  p.wanted = 0;
  p.ammo = Math.floor(p.ammo / 2);
  p.hp = 100;
  G.cops.length = 0;
  if (p.inCar) exitCar(G);
  const st = G.world.landmarks.policeStation;
  p.x = st.x;
  p.y = st.y;
  audio.busted();
  if (G.mission) failMission(G, 'Ditangkap polisi saat misi berjalan.');
  else G.screen = SCREEN_BUSTED;
  G.cam.x = clamp(p.x - 640, 0, 1920);
  G.cam.y = clamp(p.y - 400, 0, 1600);
}

function doWasted(G) {
  if (G.screen !== SCREEN_PLAY) return;
  const p = G.player;
  const loss = Math.min(p.money, WANTED.wastedLoss);
  p.money -= loss;
  G.lastFine = loss;
  p.hp = 100;
  p.wanted = 0;
  p.ammo = 12;
  G.cops.length = 0;
  if (p.inCar) exitCar(G);
  const h = G.world.landmarks.hospital;
  p.x = h.x;
  p.y = h.y;
  audio.busted();
  if (G.mission) failMission(G, 'Rico tumbang saat misi berjalan.');
  else G.screen = SCREEN_WASTED;
  G.cam.x = clamp(p.x - 640, 0, 1920);
  G.cam.y = clamp(p.y - 400, 0, 1600);
}

// Mulai run segar: kota baru dari seed, traffic + pejalan kaki,
// mobil parkir di dekat spawn, lalu Misi 1.
function resetRun(G, seedOverride) {
  const s = seedOverride ?? Math.floor(Math.random() * 4294967296);
  G.seed = s;
  G.rng = createRng(s);
  G.world = buildWorld(G.rng);
  const spawn = G.world.landmarks.spawn;
  G.player = createPlayer(spawn.x, spawn.y);
  G.cars.length = 0;
  G.peds.length = 0;
  G.cops.length = 0;
  G.gang.length = 0;
  G.bullets.length = 0;
  G.pickups.length = 0;
  G.parts.length = 0;
  G.floats.length = 0;
  G.missionIndex = 0;
  G.mission = null;
  G.missionResult = null;
  G.missionTarget = null;
  G.dialog = null;
  G.message = '';
  G.messageT = 0;
  G.time = 0;
  G.clock = 8 * 60;
  G.stats = { kills: 0, stolen: 0, missions: 0, shots: 0 };
  G.lastCrime = -999;
  G.wantedDecayT = 0;
  G.speed01 = 0;
  G.autoSaveT = 20;
  G.lastFine = 0;
  G.cam.x = clamp(spawn.x - 640, 0, 1920);
  G.cam.y = clamp(spawn.y - 400, 0, 1600);
  spawnTraffic(G, 12);
  spawnPeds(G, 22);
  // Mobil parkir di jalan dekat apartemen Rico.
  for (const [kind, x, y, a] of [
    ['sedan', 460, 700, 0],
    ['taxi', 340, 560, Math.PI],
    ['sedan', 860, 460, Math.PI / 2],
  ]) {
    G.cars.push(makeCar(kind, x, y, a, 'none', G.rng));
  }
  G.screen = SCREEN_PLAY;
  startMission(G, 0);
}

// Lanjutkan dari save: run segar, lalu timpa dengan data simpanan.
function continueGame(G) {
  const data = loadSave();
  if (!data) return false;
  resetRun(G);
  applySave(G, data);
  G.mission = null;
  G.dialog = null;
  if (G.missionIndex < 5) startMission(G, G.missionIndex);
  G.screen = SCREEN_PLAY;
  G.message = 'Lanjutan dimuat. Selamat datang kembali, Rico.';
  G.messageT = 3;
  return true;
}

function advanceDialog(G) {
  const d = G.dialog;
  if (!d) return;
  audio.click();
  d.i += 1;
  if (d.i >= d.lines.length) {
    G.dialog = null;
    if (G.mission && !G.mission.setupDone) {
      G.mission.setupDone = true;
      setupMissionStage(G);
    }
  }
}

// Satu langkah dunia (dipakai loop & demo shot).
function stepWorld(G, dt, actions = 0, click = null) {
  if (G.screen !== SCREEN_PLAY) return;
  G.time += dt;
  G.clock += dt * 0.5;
  if (G.messageT > 0) G.messageT -= dt;
  if (G.dialog) {
    if ((actions & ACTION_CONFIRM) || click) advanceDialog(G);
    audio.update(dt, 0, G.player.wanted, false);
    return;
  }
  if (actions & ACTION_PAUSE) {
    G.screen = SCREEN_PAUSED;
    return;
  }
  if (actions & ACTION_RESTART) {
    resetRun(G);
    return;
  }
  if (actions & ACTION_PUNCH) punch(G);
  if (actions & ACTION_ENTER) handlePlayerActions(G, actions);
  if (actions & ACTION_WEAPON_FIST) G.player.weapon = 'fist';
  if (actions & ACTION_WEAPON_GUN) G.player.weapon = 'pistol';
  if (click && G.player.weapon === 'pistol' && !G.player.inCar) {
    shoot(G, G.cam.x + click.x, G.cam.y + click.y);
  }
  updatePlayer(G, dt);
  updateTraffic(G, dt);
  updateTargetCar(G, dt);
  updatePeds(G, dt);
  updatePolice(G, dt);
  updateWanted(G, dt);
  updateCombat(G, dt);
  updateMission(G, dt);
  separateCars(G.cars);
  updateCamera(G);
  G.missionTarget = missionTargetPos(G);
  G.autoSaveT -= dt;
  if (G.autoSaveT <= 0) {
    G.autoSaveT = 20;
    saveGame(G);
  }
  audio.update(dt, G.speed01, G.player.wanted, true);
}

function ambientStep(G, dt) {
  G.time += dt;
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updateCamera(G);
  audio.update(dt, 0, 0, false);
}

// Aksi layar non-play (title, pause, help, akhir misi, busted/wasted).
function handleScreenActions(G, actions, click) {
  const screen = G.screen;
  if (screen === SCREEN_TITLE) {
    const items = G.saveExists ? 3 : 2;
    if (actions & ACTION_UP) G.menuIndex = (G.menuIndex + items - 1) % items;
    if (actions & ACTION_DOWN) G.menuIndex = (G.menuIndex + 1) % items;
    if (actions & ACTION_HELP) {
      G.helpFrom = SCREEN_TITLE;
      G.screen = SCREEN_HELP;
      return;
    }
    let chosen = -1;
    if (actions & ACTION_CONFIRM) chosen = G.menuIndex;
    if (click) {
      for (const r of G.menuRects) {
        if (click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h) {
          chosen = r.index;
          break;
        }
      }
    }
    if (chosen === 0) {
      audio.unlock();
      audio.click();
      resetRun(G);
    } else if (chosen === 1 && G.saveExists) {
      audio.unlock();
      audio.click();
      continueGame(G);
    } else if (chosen >= 1) {
      G.helpFrom = SCREEN_TITLE;
      G.screen = SCREEN_HELP;
    }
    return;
  }
  if (screen === SCREEN_PAUSED) {
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) G.screen = SCREEN_PLAY;
    else if (actions & ACTION_SAVE) saveGame(G);
    else if (actions & ACTION_RESTART) resetRun(G);
    else if (actions & ACTION_TITLE) {
      G.screen = SCREEN_TITLE;
      G.saveExists = hasSave();
      G.menuIndex = 0;
    } else if (actions & ACTION_HELP) {
      G.helpFrom = SCREEN_PAUSED;
      G.screen = SCREEN_HELP;
    }
    return;
  }
  if (screen === SCREEN_HELP) {
    if (actions & (ACTION_PAUSE | ACTION_HELP | ACTION_CONFIRM) || click) {
      G.screen = G.helpFrom || SCREEN_TITLE;
    }
    return;
  }
  if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) {
    if (actions & ACTION_CONFIRM || click) G.screen = SCREEN_PLAY;
    return;
  }
  if (screen === SCREEN_MISSION_OK) {
    if (actions & ACTION_CONFIRM || click) nextMission(G);
    return;
  }
  if (screen === SCREEN_MISSION_FAIL) {
    if (actions & ACTION_CONFIRM || click) retryMission(G);
    return;
  }
}

function announce(message) {
  status.textContent = message;
}

function runGame() {
  let last = performance.now();
  let accumulator = 0;
  // Aksi yang belum dikonsumsi step dunia. Diambil tiap frame tapi
  // baru dihapus setelah sebuah step memakainya — kalau satu frame
  // lebih pendek dari STEP dan tidak ada step yang jalan, tekanan
  // tombol tidak hilang begitu saja.
  let pendingActions = 0;
  let pendingClick = null;
  // Kota latar untuk title screen.
  resetRun(G, seed);
  G.screen = SCREEN_TITLE;
  G.dialog = null;
  G.mission = null;
  G.menuIndex = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    pendingActions |= input.takeActions();
    const clickNow = input.takeClick();
    if (clickNow) pendingClick = clickNow;
    if (pendingActions & ACTION_MUTE) {
      audio.setMuted(!audio.muted);
      G.muted = audio.muted;
      pendingActions &= ~ACTION_MUTE;
    }
    const screenBefore = G.screen;
    if (G.screen !== SCREEN_PLAY) {
      handleScreenActions(G, pendingActions, pendingClick);
      pendingActions = 0;
      pendingClick = null;
    }
    // Tekanan yang memindahkan layar (mis. Enter memulai game) tidak
    // boleh ikut terbaca oleh layar barunya (dialog / pause).
    if (screenBefore !== G.screen) {
      pendingActions = 0;
      pendingClick = null;
    }
    let first = true;
    let stepped = false;
    while (accumulator >= STEP) {
      if (G.screen === SCREEN_PLAY) {
        stepWorld(G, STEP, first ? pendingActions : 0, first ? pendingClick : null);
        stepped = true;
      } else if (G.screen === SCREEN_TITLE) {
        ambientStep(G, STEP);
      } else {
        break;
      }
      accumulator -= STEP;
      first = false;
      if (G.screen !== SCREEN_PLAY && G.screen !== SCREEN_TITLE) break;
    }
    if (stepped) {
      pendingActions = 0;
      pendingClick = null;
    }
    if (G.screen !== SCREEN_PLAY && G.screen !== SCREEN_TITLE) accumulator = 0;
    renderer.draw(G);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === SCREEN_PLAY) {
      G.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  announce('NEON HARBOR. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

window.__nh = { G, reset: (s) => resetRun(G, s), version: 'neon-harbor-1' };

if (shot) {
  // Mode demo: stage scene, gambar dua kali, tandai siap screenshot.
  stageShot(shot, G, { resetRun, stepWorld, ambientStep });
  let painted = 0;
  const paint = () => {
    renderer.draw(G);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  runGame();
}
