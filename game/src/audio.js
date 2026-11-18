// Suara prosedural WebAudio — tanpa file audio eksternal.
// Mesin (oscillator kontinyu), sirene (bip dua nada), tembakan (noise),
// pickup, jingle misi, dan loop musik bass sederhana. Semua dibungkus
// try/catch: di headless tanpa audio, game tetap jalan diam-diam.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let musicOsc = null;
  let musicGain = null;
  let muted = false;
  let sirenT = 0;
  let sirenHigh = false;
  let musicStep = 0;
  let musicT = 0;
  // Pola bass loop (Hz): 0 = diam. Tempo ~132 bpm, 8 langkah per bar.
  const BASS = [55, 0, 55, 65.41, 0, 55, 49, 58.27, 55, 0, 55, 65.41, 73.42, 0, 82.41, 73.42];

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      musicOsc = ctx.createOscillator();
      musicOsc.type = 'triangle';
      musicOsc.frequency.value = 55;
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.0;
      musicOsc.connect(musicGain);
      musicGain.connect(master);
      musicOsc.start();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || !master) return;
    try {
      const t0 = ctx.currentTime + when;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch {
      // Abaikan: suara tidak boleh mematikan game.
    }
  }

  function noise(dur, vol, lowpass = 1200) {
    if (!ctx || !master) return;
    try {
      const t0 = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = lowpass;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(filt);
      filt.connect(g);
      g.connect(master);
      src.start(t0);
    } catch {
      // Abaikan.
    }
  }

  return {
    get muted() {
      return muted;
    },
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
      if (master && ctx) master.gain.value = muted ? 0 : 0.5;
    },
    click() {
      tone(660, 0.06, 'square', 0.12);
    },
    punch() {
      noise(0.09, 0.3, 500);
      tone(140, 0.08, 'sine', 0.25);
    },
    shoot() {
      noise(0.14, 0.5, 2800);
      tone(180, 0.1, 'square', 0.2);
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.25);
      tone(1320, 0.12, 'sine', 0.2, 0.08);
    },
    coin() {
      tone(1046, 0.08, 'sine', 0.22);
      tone(1568, 0.14, 'sine', 0.2, 0.07);
    },
    hurt() {
      tone(110, 0.18, 'sawtooth', 0.3);
    },
    busted() {
      tone(392, 0.16, 'square', 0.2);
      tone(311, 0.16, 'square', 0.2, 0.16);
      tone(233, 0.3, 'square', 0.2, 0.32);
    },
    jingle() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => tone(f, 0.22, 'triangle', 0.25, i * 0.11));
    },
    fail() {
      tone(220, 0.2, 'sawtooth', 0.2);
      tone(174, 0.35, 'sawtooth', 0.2, 0.18);
    },
    // Dipanggil tiap frame: mesin ikut kecepatan, sirene saat wanted,
    // dan langkah bass loop musik.
    update(dt, speed01, wanted, playing) {
      if (!ctx) return;
      try {
        if (engineGain && engineOsc) {
          const target = playing ? 0.02 + speed01 * 0.06 : 0.0;
          engineGain.gain.value += (target - engineGain.gain.value) * 0.2;
          engineOsc.frequency.value = 45 + speed01 * 130;
        }
        if (wanted >= 2 && playing) {
          sirenT -= dt;
          if (sirenT <= 0) {
            sirenT = 0.42;
            sirenHigh = !sirenHigh;
            tone(sirenHigh ? 960 : 700, 0.36, 'sine', 0.07);
          }
        } else {
          sirenT = 0;
        }
        if (playing && musicGain && musicOsc) {
          musicGain.gain.value = 0.05;
          musicT -= dt;
          if (musicT <= 0) {
            musicT = 0.22;
            const f = BASS[musicStep % BASS.length];
            musicStep += 1;
            if (f > 0) musicOsc.frequency.value = f;
          }
        } else if (musicGain) {
          musicGain.gain.value = 0;
        }
      } catch {
        // Abaikan.
      }
    },
  };
}
