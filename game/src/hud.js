// HUD: uang, bar nyawa, bintang wanted, jam, senjata/amunisi,
// kecepatan saat mengemudi, teks objektif, pesan, dan kotak dialog
// cerita. Semua digambar di canvas utama, di atas dunia.
import { PALETTE, VIEW, font } from './config.js';
import { fmtClock, fmtMoney } from './rng.js';
import { missionObjectiveText } from './missions.js';

export function drawHud(ctx, G) {
  const p = G.player;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Panel kiri atas: uang + nyawa + wanted + jam.
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(14, 14, 300, 96);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.strokeRect(14, 14, 300, 96);
  ctx.fillStyle = PALETTE.money;
  ctx.font = font(26);
  ctx.textAlign = 'left';
  ctx.fillText(fmtMoney(p.money), 28, 44);
  // Bar nyawa + angka di dalam bar.
  ctx.fillStyle = '#1f2436';
  ctx.fillRect(28, 56, 170, 14);
  ctx.fillStyle = p.hp > 35 ? PALETTE.hp : PALETTE.hpLow;
  ctx.fillRect(28, 56, Math.max(0, 170 * (p.hp / 100)), 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = font(11);
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.ceil(p.hp)}`, 28 + 85, 67);
  ctx.textAlign = 'left';
  // Bintang wanted.
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < p.wanted ? '#facc15' : '#3a4060';
    drawStar(ctx, 30 + i * 26, 92, i < p.wanted ? 9 : 7);
  }
  // Jam.
  ctx.fillStyle = PALETTE.text;
  ctx.font = font(22);
  ctx.textAlign = 'right';
  ctx.fillText(fmtClock(G.clock), 300, 44);
  ctx.font = font(12);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('NEON HARBOR', 300, 66);
  ctx.textAlign = 'left';

  // Senjata / amunisi di bawah minimap.
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(VIEW.width - 236, 196, 220, 44);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.strokeRect(VIEW.width - 236, 196, 220, 44);
  ctx.fillStyle = PALETTE.text;
  ctx.font = font(17);
  const weaponText = p.weapon === 'pistol' ? `Pistol  ${p.ammo} peluru` : 'Tangan kosong';
  ctx.fillText(weaponText, VIEW.width - 222, 225);

  // Objektif di tengah atas.
  const objective = missionObjectiveText(G);
  ctx.font = font(16);
  const ow = ctx.measureText(objective).width;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect((VIEW.width - ow) / 2 - 14, 14, ow + 28, 34);
  ctx.strokeStyle = PALETTE.neonPink;
  ctx.strokeRect((VIEW.width - ow) / 2 - 14, 14, ow + 28, 34);
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = 'center';
  ctx.fillText(objective, VIEW.width / 2, 37);
  ctx.textAlign = 'left';

  // Kecepatan saat mengemudi.
  if (p.inCar && p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.36);
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(VIEW.width - 170, VIEW.height - 78, 154, 62);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.strokeRect(VIEW.width - 170, VIEW.height - 78, 154, 62);
    ctx.fillStyle = PALETTE.neonCyan;
    ctx.font = font(34);
    ctx.textAlign = 'right';
    ctx.fillText(String(kmh), VIEW.width - 72, VIEW.height - 34);
    ctx.font = font(14);
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('km/h', VIEW.width - 26, VIEW.height - 34);
    ctx.textAlign = 'left';
  }

  // Pesan singkat (toast) di bawah objektif.
  if (G.messageT > 0 && G.message) {
    ctx.font = font(16);
    const mw = ctx.measureText(G.message).width;
    ctx.fillStyle = 'rgba(10, 12, 20, 0.75)';
    ctx.fillRect((VIEW.width - mw) / 2 - 12, 58, mw + 24, 30);
    ctx.fillStyle = PALETTE.neonYellow;
    ctx.textAlign = 'center';
    ctx.fillText(G.message, VIEW.width / 2, 79);
    ctx.textAlign = 'left';
  }

  // Petunjuk konteks di bawah layar.
  let hint = '';
  if (!p.inCar) {
    const near = G.cars.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 64);
    if (near) hint = 'Tekan E untuk masuk mobil';
    else if (G.mission) hint = 'Ikuti marker pink di minimap  •  F pukul  •  Klik tembak';
    else hint = 'WASD jalan  •  Shift lari  •  E masuk mobil  •  H bantuan';
  } else {
    hint = 'W gas  •  S rem  •  A/D belok  •  E keluar mobil';
  }
  ctx.font = font(14);
  ctx.fillStyle = 'rgba(238,241,245,0.75)';
  ctx.textAlign = 'center';
  ctx.fillText(hint, VIEW.width / 2, VIEW.height - 16);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const ang = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// Kotak dialog cerita di bawah layar (briefing misi).
export function drawDialog(ctx, G) {
  const d = G.dialog;
  if (!d) return;
  ctx.save();
  const w = 860;
  const h = 150;
  const x = (VIEW.width - w) / 2;
  const y = VIEW.height - h - 48;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.neonPink;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = PALETTE.neonPink;
  ctx.font = font(17);
  ctx.textAlign = 'left';
  ctx.fillText(d.title, x + 22, y + 32);
  ctx.fillStyle = PALETTE.text;
  ctx.font = font(18);
  wrapText(ctx, d.lines[d.i], x + 22, y + 62, w - 44, 26);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = font(14);
  ctx.textAlign = 'right';
  ctx.fillText(`Enter / klik untuk lanjut (${d.i + 1}/${d.lines.length})`, x + w - 22, y + h - 16);
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, cy);
}
