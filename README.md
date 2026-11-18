# NEON HARBOR

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Oxim97-byte/neon-harbor/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Oxim97-byte/neon-harbor/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Game open-world crime 2D top-down orisinal (vanilla JS, canvas 1280×800, tanpa library, tanpa aset eksternal — semua prosedural). Dibangun untuk lomba make.fun **gta6-01**.

## Cerita

Neon Harbor, kota yang tidak pernah tidur. **Rico Vale**, sopir lepas tanpa pelanggan, ditemui fixer **Mara Quinn** dengan satu pekerjaan — lalu satu lagi. Lima misi berantai: kenalan di bar, antar paket kilat, kejar kurir kabur, kabur dari razia polisi, sampai tukar terakhir di Pelabuhan melawan Geng Pelabuhan. Setiap jalan punya harga.

Semua nama, karakter, dan kota di sini orisinal — bukan dari franchise mana pun.

## Fitur

- **Kota hidup**: jalan grid, gedung neon, pelabuhan, lalu lintas AI yang ikut jalan, pejalan kaki di trotoar yang lari ketakutan kalau ada kekerasan.
- **Jalan kaki & mengemudi**: WASD + Shift lari, pukul (F), pistol (klik, amunisi + pickup), masuk/keluar mobil (E), tabrakan dengan gedung & traffic, kecepatan tampil di HUD.
- **Curi mobil**: tarik sopir keluar; kalau ada saksi/polisi yang melihat, wanted naik.
- **Wanted 0–5 bintang**: kejahatan menaikkan bintang; mobil polisi + polisi jalan kaki mengejar; bintang turun kalau sembunyi/lolos; **Busted** (ditangkap, denda) & **Wasted** (mati, biaya rumah sakit) + respawn.
- **5 misi cerita** dengan marker, briefing dialog, objektif (pergi, antar, kejar, kabur), timer, hadiah $, layar misi selesai/gagal.
- **HUD lengkap**: uang, bar nyawa, bintang wanted, jam, senjata/amunisi, kecepatan, teks objektif, **minimap live** (pemain, mobil, polisi, marker misi).
- **Save**: localStorage — auto-save tiap 20 detik & tiap misi selesai, save manual dari Pause, Continue di title screen.
- **Suara prosedural WebAudio**: mesin, sirene, tembakan, pickup, jingle misi, loop musik bass. M untuk mute.
- **Pause (Esc/P), bantuan (H), restart (R)**.
- **Demo deterministik**: `?shot=title|street|chase|mission` (dengan `&seed=N`) untuk screenshot yang bisa diulang.

## Kontrol

| Tombol | Aksi |
|---|---|
| WASD / Panah | Jalan / mengemudi (gas, rem, belok) |
| Shift | Lari |
| F / Klik kiri | Pukul (jalan kaki) |
| Klik kiri | Tembak pistol (jalan kaki) |
| 1 / 2 | Tangan kosong / pistol |
| E | Masuk / keluar mobil |
| Esc / P | Pause / lanjut |
| M | Suara mati / hidup |
| S (di Pause) | Simpan manual |
| R | Mulai ulang |
| H | Bantuan |

## Cara jalanin

```bash
node serve.ts
# buka http://localhost:8080
```

Tanpa build, tanpa install. Demo screenshot: buka `http://localhost:8080/?shot=chase`.

## Struktur source

Satu tugas satu file di `game/src/`: `config.js`, `rng.js`, `input.js`, `audio.js`, `world.js`, `traffic.js`, `pedestrians.js`, `police.js`, `vehicles.js`, `player.js`, `missions.js`, `combat.js`, `render.js`, `minimap.js`, `hud.js`, `save.js`, `shots.js`, `main.js`. `game/index.html` memuat `main.js` sebagai modul.

## Screenshot

1. `1-title.jpg` — start screen · 2. `2-street.jpg` — jalan kaki, HUD + minimap + traffic · 3. `3-chase.jpg` — kejar-kejaran polisi sambil mengemudi · 4. `4-mission.jpg` — misi selesai.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
