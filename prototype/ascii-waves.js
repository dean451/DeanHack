// The splash's wavy ASCII background. Behind the dragon and the card, a field of characters
// drifts in slow bands, the way a new-window screen draws its ascii weather: a few sines over
// the column and row, summed and sent through a sparse ramp, so most of the field is dark with
// ridges of . : - ~ = rolling across it. It is text in a <pre>, redrawn ten times a second, so it
// costs almost nothing and never touches the 3D scene (which does not draw while the splash is
// open at all). Reduced motion gets a single still frame.

export const RAMP = '  .·:-~=+*';
export const FRAME_MS = 100;
// Cell size for the 13px/15px monospace the stylesheet gives .start-waves.
export const CELL_W = 7.8, CELL_H = 15;

// The field at a cell, in 0..1. The first term is a wave whose phase itself waves down the
// rows, which bends the bands instead of leaving them straight.
export function waveValue(x, y, t) {
  const a = Math.sin(x * .085 + t * .7 + Math.sin(y * .19 + t * .35) * 1.6);
  const b = Math.sin(y * .14 - t * .45 + x * .03);
  const c = Math.sin(x * .05 + y * .09 + t * .25);
  return (a * .6 + b * .4 + c * .3 + 1.3) / 2.6;
}

// The summed sines crowd the middle of 0..1, so the ramp is read through a curve that keeps the
// low half dark and spends the characters on the crests.
export function waveChar(v) {
  const s = Math.max(0, Math.min(1, (v - .3) / .65)), k = s * s;
  const i = Math.max(0, Math.min(RAMP.length - 1, Math.floor(k * RAMP.length)));
  return RAMP[i];
}

// One frame of cols x rows as text lines.
export function waveFrame(cols, rows, t) {
  cols = Math.max(0, cols | 0); rows = Math.max(0, rows | 0);
  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) line += waveChar(waveValue(x, y, t));
    lines.push(line);
  }
  return lines.join('\n');
}

// How many cells cover a box of w x h pixels (one spare each way for the rounding).
export function gridFor(w, h) {
  return {cols: Math.ceil(Math.max(0, w) / CELL_W) + 1, rows: Math.ceil(Math.max(0, h) / CELL_H) + 1};
}

// A <pre class="start-waves"> that redraws itself while started. `reduced` (prefers-reduced-motion)
// draws once and never moves. The clock is the window's performance.now, or `now` for tests.
export function createAsciiWaves({doc = document, win = doc.defaultView, reduced = null, now = null} = {}) {
  const el = doc.createElement('pre');
  el.className = 'start-waves'; el.setAttribute('aria-hidden', 'true');
  const still = reduced ?? !!win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const clock = now ?? (() => (win?.performance ?? performance).now());
  let timer = null, cols = 0, rows = 0;
  const size = () => {
    const w = el.clientWidth || win?.innerWidth || 0, h = el.clientHeight || win?.innerHeight || 0;
    ({cols, rows} = gridFor(w, h));
  };
  const draw = () => { if (!cols || !rows) size(); el.textContent = waveFrame(cols, rows, clock() / 1000); };
  const tick = () => { if (doc.hidden) return; draw(); };
  const onResize = () => { size(); draw(); };
  return {
    el,
    get playing() { return timer !== null; },
    get still() { return still; },
    // Draws now and keeps drawing (unless reduced motion).
    start() {
      size(); draw();
      if (still || timer !== null || !win?.setInterval) return;
      timer = win.setInterval(tick, FRAME_MS);
      win.addEventListener?.('resize', onResize);
    },
    stop() {
      if (timer !== null) { win.clearInterval(timer); timer = null; win.removeEventListener?.('resize', onResize); }
    },
    frame: draw,
  };
}
