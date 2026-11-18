// Keyboard + mouse. Tombol yang ditahan dibaca tiap frame; tekanan
// sekali (pause, pukul, masuk mobil, ...) dikoleksi sebagai bit flag
// dan diambil sekali oleh loop, jadi tidak hilang dan tidak dobel.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_PUNCH = 4;
export const ACTION_ENTER = 8;
export const ACTION_RESTART = 16;
export const ACTION_MUTE = 32;
export const ACTION_HELP = 64;
export const ACTION_SAVE = 128;
export const ACTION_WEAPON_FIST = 256;
export const ACTION_WEAPON_GUN = 512;
export const ACTION_TITLE = 1024;
export const ACTION_UP = 2048;
export const ACTION_DOWN = 4096;

const MOVE = {
  up: new Set(['KeyW', 'ArrowUp']),
  down: new Set(['KeyS', 'ArrowDown']),
  left: new Set(['KeyA', 'ArrowLeft']),
  right: new Set(['KeyD', 'ArrowRight']),
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseX = 640;
  let mouseY = 400;
  let clicked = false;
  let clickX = 0;
  let clickY = 0;

  function press(code) {
    switch (code) {
      case 'Enter':
      case 'Space':
        actions |= ACTION_CONFIRM;
        break;
      case 'Escape':
      case 'KeyP':
        actions |= ACTION_PAUSE;
        break;
      case 'KeyF':
        actions |= ACTION_PUNCH;
        break;
      case 'KeyE':
        actions |= ACTION_ENTER;
        break;
      case 'KeyR':
        actions |= ACTION_RESTART;
        break;
      case 'KeyM':
        actions |= ACTION_MUTE;
        break;
      case 'KeyH':
        actions |= ACTION_HELP;
        break;
      case 'Digit1':
        actions |= ACTION_WEAPON_FIST;
        break;
      case 'Digit2':
        actions |= ACTION_WEAPON_GUN;
        break;
      case 'KeyT':
        actions |= ACTION_TITLE;
        break;
      case 'ArrowUp':
      case 'KeyW':
        actions |= ACTION_UP;
        break;
      case 'ArrowDown':
      case 'KeyS':
        actions |= ACTION_DOWN;
        break;
      default:
        break;
    }
    // S juga berarti simpan manual (dipakai layar Pause); di layar main
    // S adalah tombol gerak, jadi main hanya membaca SAVE saat Pause.
    if (code === 'KeyS') actions |= ACTION_SAVE;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (MOVE.up.has(event.code) || MOVE.down.has(event.code) || MOVE.left.has(event.code) || MOVE.right.has(event.code)) {
        held.add(event.code);
      }
      return;
    }
    held.add(event.code);
    press(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    clickX = mouseX;
    clickY = mouseY;
    clicked = true;
    actions |= ACTION_CONFIRM;
  });

  function axis(keys) {
    let v = 0;
    for (const code of keys) if (held.has(code)) v += 1;
    return v;
  }

  return {
    held,
    // -1..1 untuk gerak: X kanan positif, Y bawah positif.
    moveX() {
      return axis(MOVE.right) - axis(MOVE.left);
    },
    moveY() {
      return axis(MOVE.down) - axis(MOVE.up);
    },
    run() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    gas() {
      return axis(MOVE.up);
    },
    brake() {
      return axis(MOVE.down);
    },
    steer() {
      return axis(MOVE.right) - axis(MOVE.left);
    },
    mouse() {
      return { x: mouseX, y: mouseY };
    },
    // Klik mouse terakhir yang belum dikonsumsi (untuk tembak / menu).
    takeClick() {
      if (!clicked) return null;
      clicked = false;
      return { x: clickX, y: clickY };
    },
    hasClick() {
      return clicked;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    // Dipakai demo screenshot: meniru tombol ditahan tanpa keyboard.
    fakeHold(code, on) {
      if (on) held.add(code);
      else held.delete(code);
    },
    fakePress(code) {
      press(code);
    },
    fakeMouse(x, y) {
      mouseX = x;
      mouseY = y;
    },
    fakeClick(x, y) {
      clickX = x;
      clickY = y;
      clicked = true;
      actions |= ACTION_CONFIRM;
    },
  };
}
