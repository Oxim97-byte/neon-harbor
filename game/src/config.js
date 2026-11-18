// NEON HARBOR — semua angka tuning dan warna di satu tempat.
// Canvas logis 1280x800; dunia kota 3200x2400. Semua aset prosedural.
export const VIEW = { width: 1280, height: 800 };
export const WORLD = { width: 3200, height: 2400 };
export const STEP = 1 / 60;
export const SAVE_KEY = 'neon-harbor-save-v1';
export const SHOT_SEED = 7;

export const PLAYER = {
  radius: 16,
  walkSpeed: 210,
  runSpeed: 330,
  maxHp: 100,
  punchRange: 46,
  punchDamage: 30,
  punchCooldown: 0.38,
  regenPerSec: 1.5,
  startMoney: 250,
  startAmmo: 24,
};

export const CAR = {
  accel: 520,
  brake: 760,
  reverseMax: 150,
  maxSpeed: 620,
  sportMax: 720,
  copMax: 660,
  steer: 2.6,
  drag: 0.55,
  length: 52,
  width: 26,
};

export const WANTED = {
  max: 5,
  stealWitness: 2,
  punchPed: 1,
  killPed: 2,
  shootWitness: 1,
  decayQuietSec: 12,
  decayStepSec: 8,
  bustFineBase: 150,
  bustFinePerStar: 50,
  wastedLoss: 200,
};

export const MISSION_REWARDS = [150, 300, 450, 500, 1000];

export const PALETTE = {
  ground: '#14161f',
  sidewalk: '#232636',
  road: '#1b1e2b',
  roadLine: '#3a4060',
  water: '#0a2e4a',
  waterDeep: '#072238',
  building: '#2b3048',
  buildingRoof: '#232839',
  neonPink: '#ff2e88',
  neonCyan: '#22d3ee',
  neonYellow: '#facc15',
  neonGreen: '#4ade80',
  neonPurple: '#a78bfa',
  text: '#eef1f5',
  muted: '#9aa3b5',
  panel: 'rgba(10, 12, 20, 0.82)',
  panelEdge: '#3b4364',
  hp: '#4ade80',
  hpLow: '#ef4444',
  money: '#facc15',
  cop: '#3b82f6',
  copLight: '#ef4444',
  gang: '#c084fc',
  player: '#facc15',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export function font(px, weight = 700) {
  return `${weight} ${px}px ${FONT}`;
}

export const CONTROLS = [
  ['WASD / Panah', 'Jalan / mengemudi (gas, rem, belok)'],
  ['Shift', 'Lari'],
  ['F / Klik kiri', 'Pukul (jalan kaki)'],
  ['Klik kiri', 'Tembak pistol (jalan kaki)'],
  ['1 / 2', 'Pilih tangan kosong / pistol'],
  ['E', 'Masuk / keluar mobil'],
  ['Esc / P', 'Pause / lanjut'],
  ['M', 'Suara mati / hidup'],
  ['S (di Pause)', 'Simpan manual'],
  ['R', 'Mulai ulang'],
  ['H', 'Bantuan'],
];
