// The descent: when the player clicks Descend, the splash's wavy field gives way to an ASCII
// spiral that the eye falls into, a logarithmic spiral whose bands flow outward from the centre
// (the way a tunnel's walls do as you move down it) while its arms turn. It zooms for
// DESCENT.ms, then rests, dim and slow, behind the engine's opening text (the legacy, "It is
// written in the Book of ...") until the first frame of the dungeon lands, and fades. Like the
// waves it is text in a <pre>, so it costs nothing and never touches the 3D scene. Reduced
// motion skips it altogether.
import {CELL_W, CELL_H, gridFor} from './ascii-waves.js';

export const RAMP = ' .·:-~=+*#@';
export const DESCENT = {ms: 1700, frameMs: 40, rest: .22};
// arms: how many spiral arms; twist: how tightly they wind (phase per log-radius); zoom: how
// fast the bands flow outward (phase per second); dark: how much the rim darkens toward the edge.
export const SPIRAL = {arms: 2, twist: 6, zoom: 3.4, dark: .62};

// The field at a cell, in 0..1, for a cols x rows grid at time t (seconds).
export function spiralValue(x, y, t, cols, rows, s = SPIRAL) {
  const dx = (x - cols / 2) * CELL_W, dy = (y - rows / 2) * CELL_H;
  const r = Math.hypot(dx, dy), rmax = Math.hypot(cols * CELL_W, rows * CELL_H) / 2 || 1, th = Math.atan2(dy, dx);
  const band = Math.sin(s.arms * th + s.twist * Math.log(r / rmax + .015) - t * s.zoom);
  const vignette = 1 - s.dark * Math.min(1, r / rmax);
  return (band * .5 + .5) * vignette;
}

// Dark through most of the field, the characters spent on the crests, and the brightest few
// only near the centre where the vignette lets them through.
export function spiralChar(v) {
  const k = Math.max(0, Math.min(1, (v - .22) / .7)) ** 1.6;
  return RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(k * RAMP.length)))];
}

export function spiralFrame(cols, rows, t, s = SPIRAL) {
  cols = Math.max(0, cols | 0); rows = Math.max(0, rows | 0);
  const lines = [];
  for (let y = 0; y < rows; y++) { let line = ''; for (let x = 0; x < cols; x++) line += spiralChar(spiralValue(x, y, t, cols, rows, s)); lines.push(line); }
  return lines.join('\n');
}

// A <pre class="start-spiral"> that draws itself while started. `speed` scales how fast its own
// clock runs (1 while zooming, DESCENT.rest while resting behind the opening text), without a
// jump when it changes. `reduced` (prefers-reduced-motion) makes it still and the descent skips it.
export function createAsciiSpiral({doc = document, win = doc.defaultView, reduced = null, now = null, frameMs = DESCENT.frameMs} = {}) {
  const el = doc.createElement('pre');
  el.className = 'start-spiral'; el.setAttribute('aria-hidden', 'true');
  const still = reduced ?? !!win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const clock = now ?? (() => (win?.performance ?? performance).now());
  let timer = null, cols = 0, rows = 0, phase = 0, last = null, speed = 1;
  const size = () => { const w = el.clientWidth || win?.innerWidth || 0, h = el.clientHeight || win?.innerHeight || 0; ({cols, rows} = gridFor(w, h)); };
  const advance = () => { const t = clock(); if (last !== null) phase += Math.max(0, Math.min(.25, (t - last) / 1000)) * speed; last = t; };
  const draw = () => { if (!cols || !rows) size(); el.textContent = spiralFrame(cols, rows, phase); };
  const tick = () => { if (doc.hidden) return; advance(); draw(); };
  const onResize = () => { size(); draw(); };
  return {
    el,
    get playing() { return timer !== null; },
    get still() { return still; },
    get phase() { return phase; },
    get speed() { return speed; }, set speed(v) { speed = Math.max(0, +v || 0); },
    start() {
      last = clock(); size(); draw();
      if (still || timer !== null || !win?.setInterval) return;
      timer = win.setInterval(tick, frameMs);
      win.addEventListener?.('resize', onResize);
    },
    stop() { if (timer !== null) { win.clearInterval(timer); timer = null; win.removeEventListener?.('resize', onResize); } last = null; },
    frame: tick,
  };
}
