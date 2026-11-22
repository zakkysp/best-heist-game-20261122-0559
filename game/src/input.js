// Keyboard and mouse, read fresh every frame. The canvas reports clicks in
// logical playfield coordinates, so the world never has to know the window size.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';

export function createInput(canvas, toLogical) {
  const keys = new Set();
  const pressed = new Set();
  const clicks = [];
  let mouse = { x: 0, y: 0 };

  function code(e) {
    return e.code;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse = toLogical(e.clientX - rect.left, e.clientY - rect.top);
  });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const p = toLogical(e.clientX - rect.left, e.clientY - rect.top);
    clicks.push({ x: p.x, y: p.y, button: e.button });
  });

  return {
    /** A unit move vector from WASD or the arrow keys. */
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.sqrt(2);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    wasPressed(...codes) {
      return codes.some((c) => pressed.has(c));
    },
    consumePresses() {
      pressed.clear();
    },
    takeClicks() {
      const out = clicks.splice(0, clicks.length);
      return out;
    },
    mouse() {
      return mouse;
    },
    actionPressed() {
      if (this.wasPressed('Enter', 'Space')) return ACTION_CONFIRM;
      if (this.wasPressed('Escape', 'KeyP')) return ACTION_PAUSE;
      if (this.wasPressed('KeyR')) return ACTION_RESTART;
      if (this.wasPressed('KeyM')) return ACTION_MUTE;
      return null;
    },
  };
}
