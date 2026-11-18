// Menggambar saja: dunia kota, kendaraan, orang, efek, lalu minimap,
// HUD, dialog, dan layar-layar (title, pause, help, busted, wasted,
// misi selesai/gagal). Tidak ada aturan game di sini.
import { CONTROLS, PALETTE, VIEW, WORLD, font } from './config.js';
import { fmtMoney } from './rng.js';
import { ROAD_W, ROADS_H, ROADS_V, SIDEWALK } from './world.js';
import { drawMinimap } from './minimap.js';
import { drawDialog, drawHud } from './hud.js';
import { MISSION_DEFS } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_HELP = 'help';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_MISSION_OK = 'mission-ok';
export const SCREEN_MISSION_FAIL = 'mission-fail';

const INTRO = 'Rico Vale, sopir lepas tanpa pelanggan. Mara Quinn menawarinya satu pekerjaan — lalu satu lagi. Di Neon Harbor, setiap jalan punya harga.';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function text(value, x, y, size, color, align = 'left', weight = 700) {
    ctx.font = font(size, weight);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  }

  function drawWorld(G) {
    const cam = G.cam;
    const world = G.world;
    // Tanah.
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(cam.x, cam.y, VIEW.width, VIEW.height);
    // Air pelabuhan.
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(cam.x, Math.max(cam.y, world.waterTop), VIEW.width, VIEW.height);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let i = 0; i < 40; i += 1) {
      const wx = ((i * 173) % 3200);
      const wy = world.waterTop + 20 + ((i * 91) % 120);
      ctx.fillRect(wx, wy, 60, 3);
    }
    // Trotoar di sekeliling jalan.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const vx of ROADS_V) ctx.fillRect(vx - ROAD_W / 2 - SIDEWALK, 0, ROAD_W + SIDEWALK * 2, 2260);
    for (const hy of ROADS_H) ctx.fillRect(0, hy - ROAD_W / 2 - SIDEWALK, WORLD.width, ROAD_W + SIDEWALK * 2);
    // Jalan.
    ctx.fillStyle = PALETTE.road;
    for (const vx of ROADS_V) ctx.fillRect(vx - ROAD_W / 2, 0, ROAD_W, 2260);
    for (const hy of ROADS_H) ctx.fillRect(0, hy - ROAD_W / 2, WORLD.width, ROAD_W);
    // Garis tengah jalan putus-putus.
    ctx.fillStyle = PALETTE.roadLine;
    for (const vx of ROADS_V) {
      for (let y = 0; y < 2260; y += 64) ctx.fillRect(vx - 2, y, 4, 30);
    }
    for (const hy of ROADS_H) {
      for (let x = 0; x < WORLD.width; x += 64) ctx.fillRect(x, hy - 2, 30, 4);
    }
    // Dermaga kayu + kapal.
    ctx.fillStyle = '#5b4632';
    for (let i = 0; i < 4; i += 1) ctx.fillRect(500 + i * 640, 2180, 120, 90);
    for (const boat of world.boats) {
      ctx.fillStyle = boat.color;
      ctx.fillRect(boat.x, boat.y, boat.w, boat.h);
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(boat.x + 40, boat.y - 18, 30, 18);
    }
    // Gedung: atap + jendela neon + papan nama.
    for (const b of world.buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = PALETTE.buildingRoof;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = b.neon;
      const cols = b.windows;
      for (let i = 0; i < cols; i += 1) {
        const wx = b.x + 14 + (i * (b.w - 28)) / Math.max(1, cols - 1 || 1);
        ctx.fillRect(wx, b.y + 14, 8, 10);
        ctx.fillRect(wx, b.y + b.h - 26, 8, 10);
      }
      if (b.sign) {
        ctx.font = font(13);
        ctx.fillStyle = b.neon;
        ctx.textAlign = 'center';
        ctx.fillText(b.sign, b.x + b.w / 2, b.y + b.h / 2 + 5);
        ctx.textAlign = 'left';
      }
    }
    // Pohon & lampu.
    for (const t of world.trees) {
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const lamp of world.lamps) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Label landmark — dijepit ke dalam layar saat bermain.
    ctx.font = font(13);
    ctx.textAlign = 'center';
    for (const key of Object.keys(world.landmarks)) {
      const lm = world.landmarks[key];
      ctx.fillStyle = 'rgba(10,12,20,0.7)';
      const w = ctx.measureText(lm.label).width + 16;
      let lx = lm.x;
      let top = lm.y - 52;
      if (G.screen === SCREEN_PLAY) {
        const half = w / 2;
        const sx = Math.max(half + 8, Math.min(lm.x - cam.x, VIEW.width - half - 8));
        const sy = Math.max(8, Math.min(top - cam.y, VIEW.height - 8 - 22));
        lx = sx + cam.x;
        top = sy + cam.y;
      }
      ctx.fillRect(lx - w / 2, top, w, 22);
      ctx.fillStyle = PALETTE.neonCyan;
      ctx.fillText(lm.label, lx, top + 16);
    }
    ctx.textAlign = 'left';
  }

  function drawMarker(G) {
    const target = G.missionTarget;
    if (!target || G.screen !== SCREEN_PLAY) return;
    const pulse = 26 + Math.sin(G.time * 5) * 6;
    ctx.save();
    ctx.strokeStyle = PALETTE.neonPink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.neonPink;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
    ctx.fill();
    // Garis penunjuk dari pemain ke marker (tipis, membantu navigasi).
    ctx.strokeStyle = 'rgba(255,46,136,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(G.player.x, G.player.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawCarShape(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-28, -14, 56, 30);
    ctx.fillStyle = car.color;
    ctx.fillRect(-27, -13, 54, 26);
    // Kaca depan & atap.
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(6, -10, 12, 20);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-8, -10, 12, 20);
    // Lampu depan.
    ctx.fillStyle = '#fef9c3';
    ctx.fillRect(25, -11, 3, 6);
    ctx.fillRect(25, 5, 3, 6);
    // Lampu belakang merah.
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-28, -11, 3, 6);
    ctx.fillRect(-28, 5, 3, 6);
    if (car.kind === 'cop') {
      // Lightbar polisi berkedip.
      const on = Math.floor(performance.now() / 280) % 2 === 0;
      ctx.fillStyle = on ? '#ef4444' : '#3b82f6';
      ctx.fillRect(-4, -13, 8, 5);
      ctx.fillStyle = on ? '#3b82f6' : '#ef4444';
      ctx.fillRect(-4, 8, 8, 5);
      ctx.fillStyle = '#ffffff';
      ctx.font = font(9);
      ctx.textAlign = 'center';
      ctx.fillText('POLISI', 0, 4);
      ctx.textAlign = 'left';
    }
    if (car.kind === 'taxi') {
      ctx.fillStyle = '#111827';
      ctx.font = font(8);
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, 4);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  function drawPerson(x, y, angle, color, opts = {}) {
    ctx.save();
    ctx.translate(x, y);
    // Bayangan.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(angle);
    // Badan (jaket) + kepala.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5c99b';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    // Arah hadap: hidung / pistol.
    ctx.fillStyle = opts.weapon === 'pistol' ? '#111827' : color;
    ctx.fillRect(8, -2, opts.weapon === 'pistol' ? 14 : 8, 4);
    // Ayunan pukul.
    if (opts.punching) {
      ctx.fillStyle = '#f5c99b';
      ctx.beginPath();
      ctx.arc(20, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (opts.hp != null && opts.hp < 70) {
      ctx.fillStyle = '#1f2436';
      ctx.fillRect(x - 14, y - 26, 28, 5);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - 14, y - 26, Math.max(0, 28 * (opts.hp / 70)), 5);
    }
  }

  function drawPickups(G) {
    for (const pk of G.pickups) {
      const bob = Math.sin(G.time * 4 + pk.x) * 3;
      ctx.save();
      ctx.translate(pk.x, pk.y + bob);
      if (pk.kind === 'ammo') {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(-9, -9, 18, 18);
        ctx.fillStyle = '#052e16';
        ctx.font = font(11);
        ctx.textAlign = 'center';
        ctx.fillText('AMMO', 0, 4);
      } else if (pk.kind === 'health') {
        ctx.fillStyle = '#f87171';
        ctx.fillRect(-9, -9, 18, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillRect(-6, -2, 12, 4);
      } else {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#713f12';
        ctx.font = font(11);
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 4);
      }
      ctx.restore();
    }
    ctx.textAlign = 'left';
  }

  function drawPanel(title, lines, prompt, accent = PALETTE.neonPink) {
    const w = 680;
    const h = 190 + lines.length * 34;
    const x = (VIEW.width - w) / 2;
    const y = (VIEW.height - h) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    text(title, VIEW.width / 2, y + 72, 44, PALETTE.text, 'center');
    lines.forEach((line, i) => {
      text(line, VIEW.width / 2, y + 128 + i * 34, 20, PALETTE.muted, 'center', 500);
    });
    text(prompt, VIEW.width / 2, y + h - 34, 20, PALETTE.neonYellow, 'center');
  }

  function drawTitle(G) {
    // Kota hidup di belakang judul.
    drawWorld(G);
    for (const car of G.cars) drawCarShape(car);
    for (const ped of G.peds) drawPerson(ped.x, ped.y, ped.angle, ped.color);
    ctx.fillStyle = 'rgba(5, 7, 14, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    // Judul neon.
    ctx.save();
    ctx.shadowColor = PALETTE.neonPink;
    ctx.shadowBlur = 26;
    text('NEON HARBOR', VIEW.width / 2, 168, 84, PALETTE.neonPink, 'center', 900);
    ctx.restore();
    text('KOTA YANG TIDAK PERNAH TIDUR  •  RICO VALE  •  MARA QUINN', VIEW.width / 2, 208, 17, PALETTE.neonCyan, 'center', 600);
    // Intro cerita.
    ctx.font = font(17, 500);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    wrapCenter(INTRO, VIEW.width / 2, 248, 760, 26);
    // Menu.
    const items = G.saveExists
      ? ['NEW GAME', 'CONTINUE', 'BANTUAN']
      : ['NEW GAME', 'BANTUAN'];
    G.menuRects = [];
    items.forEach((label, i) => {
      const y = 330 + i * 62;
      const selected = G.menuIndex === i;
      const w = 340;
      const x = (VIEW.width - w) / 2;
      ctx.fillStyle = selected ? PALETTE.neonPink : 'rgba(255,255,255,0.08)';
      ctx.fillRect(x, y, w, 48);
      ctx.strokeStyle = selected ? '#ffffff' : PALETTE.panelEdge;
      ctx.strokeRect(x, y, w, 48);
      text(label, VIEW.width / 2, y + 33, 22, selected ? '#ffffff' : PALETTE.text, 'center');
      G.menuRects.push({ x, y, w, h: 48, index: i, label });
    });
    // Kontrol singkat.
    text('WASD jalan  •  Shift lari  •  E masuk mobil  •  F pukul  •  Klik tembak  •  Esc pause', VIEW.width / 2, 560, 16, PALETTE.muted, 'center', 500);
    text('5 misi cerita  •  Wanted 0–5 bintang  •  Save otomatis + manual  •  M matikan suara', VIEW.width / 2, 588, 16, PALETTE.muted, 'center', 500);
    text('Enter / klik untuk memilih  •  Atas-Bawah untuk pindah menu', VIEW.width / 2, 640, 15, PALETTE.neonYellow, 'center', 500);
    if (G.saveExists) {
      text('Save ditemukan — CONTINUE melanjutkan cerita.', VIEW.width / 2, 676, 15, PALETTE.neonGreen, 'center', 500);
    }
  }

  function wrapCenter(str, cx, y, maxW, lineH) {
    const words = str.split(' ');
    let line = '';
    let cy = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cx, cy);
        line = word;
        cy += lineH;
      } else line = test;
    }
    ctx.fillText(line, cx, cy);
  }

  function drawHelp() {
    const lines = CONTROLS.map(([k, v]) => `${k}  —  ${v}`);
    drawPanel('BANTUAN', lines, 'Esc / H untuk kembali', PALETTE.neonCyan);
  }

  function drawPaused(G) {
    drawPanel('PAUSE', [
      `Misi: ${G.mission ? `Misi ${G.mission.def.id} — ${G.mission.def.title}` : 'bebas'}`,
      `Uang ${fmtMoney(G.player.money)}  •  Misi selesai ${G.stats.missions}/5`,
      'S — simpan manual    R — mulai ulang    T — kembali ke judul',
    ], 'Esc / P untuk lanjut', PALETTE.neonCyan);
  }

  function drawBusted(G) {
    const fine = G.lastFine || 0;
    drawPanel('BUSTED', [
      'Polisi menangkapmu di jalan.',
      `Denda ${fmtMoney(fine)}  •  Senjata disita sebagian  •  Wanted kembali 0`,
      'Kamu dilepas di Kantor Polisi. Lain kali, kabur lebih cepat.',
    ], 'Enter / klik untuk lanjut', '#3b82f6');
  }

  function drawWasted(G) {
    drawPanel('WASTED', [
      'Rico tumbang. Klinik Pelabuhan menjahitmu kembali.',
      `Biaya rumah sakit ${fmtMoney(G.lastFine || 0)}  •  Amunisi berkurang`,
      'Neon Harbor tidak menunggu siapa pun. Bangun dan lanjut.',
    ], 'Enter / klik untuk lanjut', '#ef4444');
  }

  function drawMissionEnd(G) {
    const r = G.missionResult;
    if (!r) return;
    if (G.screen === SCREEN_MISSION_OK) {
      const next = r.index + 1 < MISSION_DEFS.length
        ? `Misi berikutnya: ${MISSION_DEFS[r.index + 1].title}`
        : 'Cerita selesai! Neon Harbor milikmu.';
      drawPanel('MISI SELESAI', [
        `${r.title} — selesai.`,
        `Hadiah ${fmtMoney(r.reward)} masuk ke kantongmu.`,
        next,
        'Progress tersimpan otomatis.',
      ], 'Enter / klik untuk misi berikutnya', PALETTE.neonGreen);
    } else {
      drawPanel('MISI GAGAL', [
        `${r.title} — gagal.`,
        r.failReason || 'Sesuatu berjalan salah.',
        'Coba lagi — Mara tidak suka menunggu, tapi dia memberimu satu kesempatan lagi.',
      ], 'Enter / klik untuk mengulang misi', '#ef4444');
    }
  }

  function draw(G) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (G.screen === SCREEN_TITLE) {
      drawTitle(G);
      return;
    }
    // Dunia + entitas (kamera).
    ctx.save();
    ctx.translate(-Math.round(G.cam.x), -Math.round(G.cam.y));
    drawWorld(G);
    drawMarker(G);
    drawPickups(G);
    for (const car of G.cars) drawCarShape(car);
    for (const ped of G.peds) {
      if (ped.state === 'down') {
        ctx.save();
        ctx.translate(ped.x, ped.y);
        ctx.rotate(Math.PI / 2);
        drawPerson(0, 0, 0, ped.color);
        ctx.restore();
      } else {
        drawPerson(ped.x, ped.y, ped.angle, ped.color);
      }
    }
    for (const cop of G.cops) drawPerson(cop.x, cop.y, cop.angle, '#3b82f6', { hp: cop.hp });
    for (const g of G.gang) drawPerson(g.x, g.y, g.angle, g.color, { hp: g.hp, weapon: 'pistol' });
    // Rico — selalu di atas kendaraan saat mengemudi.
    const p = G.player;
    if (!p.inCar) {
      const blink = p.invuln > 0 && Math.floor(G.time * 12) % 2 === 0;
      if (!blink) drawPerson(p.x, p.y, p.angle, PALETTE.player, { weapon: p.weapon, punching: p.punchAnim > 0 });
    }
    // Peluru.
    for (const b of G.bullets) {
      ctx.fillStyle = b.from === 'player' ? '#facc15' : '#f87171';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Partikel.
    for (const pt of G.parts) {
      ctx.globalAlpha = Math.max(0, pt.life / 0.4);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    // Teks melayang.
    ctx.font = font(15);
    ctx.textAlign = 'center';
    for (const f of G.floats) {
      ctx.globalAlpha = Math.max(0, f.t);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.restore();

    // Lapisan layar (tanpa kamera): HUD, minimap, dialog, panel.
    drawHud(ctx, G);
    drawMinimap(ctx, G);
    drawDialog(ctx, G);
    if (G.screen === SCREEN_PAUSED) drawPaused(G);
    else if (G.screen === SCREEN_HELP) drawHelp();
    else if (G.screen === SCREEN_BUSTED) drawBusted(G);
    else if (G.screen === SCREEN_WASTED) drawWasted(G);
    else if (G.screen === SCREEN_MISSION_OK || G.screen === SCREEN_MISSION_FAIL) drawMissionEnd(G);
  }

  return { draw };
}
