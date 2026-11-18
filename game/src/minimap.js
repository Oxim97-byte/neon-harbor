// Minimap live: kota diperkecil — jalan, air, pemain (kuning),
// mobil (putih), polisi (biru/merah), geng (ungu), marker misi
// (berdenyut pink). Digambar di pojok kanan atas canvas utama.
import { WORLD } from './config.js';
import { ROADS_H, ROADS_V } from './world.js';
import { missionTargetPos } from './missions.js';

const MW = 220;
const MH = 165;
const MX = 1280 - MW - 16;
const MY = 16;

export function drawMinimap(ctx, G) {
  const sx = MW / WORLD.width;
  const sy = MH / WORLD.height;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 18, 0.85)';
  ctx.fillRect(MX - 6, MY - 6, MW + 12, MH + 12);
  ctx.strokeStyle = '#3b4364';
  ctx.lineWidth = 1;
  ctx.strokeRect(MX - 6, MY - 6, MW + 12, MH + 12);
  // Air pelabuhan.
  ctx.fillStyle = '#0a2e4a';
  ctx.fillRect(MX, MY + G.world.waterTop * sy, MW, MH - G.world.waterTop * sy);
  // Jalan.
  ctx.fillStyle = '#2c3145';
  for (const vx of ROADS_V) ctx.fillRect(MX + vx * sx - 2, MY, 4, MH);
  for (const hy of ROADS_H) ctx.fillRect(MX, MY + hy * sy - 2, MW, 4);
  // Gedung.
  ctx.fillStyle = '#454c6b';
  for (const b of G.world.buildings) {
    ctx.fillRect(MX + b.x * sx, MY + b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
  }
  // Marker misi berdenyut.
  const target = missionTargetPos(G);
  if (target) {
    const pulse = 4 + Math.sin(G.time * 5) * 2;
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath();
    ctx.arc(MX + target.x * sx, MY + target.y * sy, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(MX + target.x * sx, MY + target.y * sy, pulse + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Mobil sipil.
  ctx.fillStyle = '#e5e7eb';
  for (const car of G.cars) {
    if (car.kind === 'cop') continue;
    ctx.fillRect(MX + car.x * sx - 1.5, MY + car.y * sy - 1.5, 3, 3);
  }
  // Polisi (mobil + jalan kaki): biru dengan titik merah.
  for (const car of G.cars) {
    if (car.kind !== 'cop') continue;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(MX + car.x * sx, MY + car.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of G.cops) {
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(MX + cop.x * sx - 2, MY + cop.y * sy - 2, 4, 4);
  }
  // Geng ungu.
  ctx.fillStyle = '#c084fc';
  for (const g of G.gang) {
    ctx.fillRect(MX + g.x * sx - 2, MY + g.y * sy - 2, 4, 4);
  }
  // Pemain: kuning + cincin putih, selalu di atas.
  const px = MX + G.player.x * sx;
  const py = MY + G.player.y * sy;
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px, py, 7.5, 0, Math.PI * 2);
  ctx.stroke();
  // Bingkai kamera (area yang terlihat di layar).
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(MX + G.cam.x * sx, MY + G.cam.y * sy, 1280 * sx, 800 * sy);
  ctx.restore();
}
