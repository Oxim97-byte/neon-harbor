// Save: localStorage. Auto-save tiap 20 detik & tiap misi selesai,
// save manual dari layar Pause (tombol S). Continue di title memuatnya.
import { SAVE_KEY } from './config.js';

export function hasSave() {
  try {
    return window.localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function collectSave(G) {
  return {
    v: 1,
    money: Math.floor(G.player.money),
    hp: Math.floor(G.player.hp),
    ammo: G.player.ammo,
    weapon: G.player.weapon,
    wanted: G.player.wanted,
    missionIndex: G.missionIndex,
    x: Math.floor(G.player.x),
    y: Math.floor(G.player.y),
    clock: G.clock,
    stats: { ...G.stats },
    savedAt: new Date().toISOString(),
  };
}

export function saveGame(G) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(collectSave(G)));
    G.message = 'Tersimpan.';
    G.messageT = 2;
    return true;
  } catch {
    G.message = 'Gagal menyimpan (penyimpanan browser mati).';
    G.messageT = 3;
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function applySave(G, data) {
  G.player.money = data.money;
  G.player.hp = data.hp;
  G.player.ammo = data.ammo;
  G.player.weapon = data.weapon || 'pistol';
  G.player.wanted = 0; // Wanted tidak ikut tersimpan: lanjut dengan bersih.
  G.player.x = data.x;
  G.player.y = data.y;
  G.clock = data.clock || 8 * 60;
  G.stats = { ...G.stats, ...(data.stats || {}) };
  G.missionIndex = data.missionIndex || 0;
}
