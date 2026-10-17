import test from 'node:test';
import assert from 'node:assert/strict';
import {spiralValue, spiralChar, spiralFrame, createAsciiSpiral, DESCENT, SPIRAL, RAMP} from './ascii-spiral.js';

test('the spiral flows outward from the centre as time passes, winds, and darkens toward the rim', () => {
  const cols = 160, rows = 60, s = SPIRAL;
  // a band at radius r now was at a smaller radius a moment ago: the field at (r, t+dt) equals (r·e^(-zoom·dt/twist), t)
  const dt = .1, k = Math.exp(-s.zoom * dt / s.twist);
  let close = 0, n = 0;
  for (let y = 10; y < rows - 10; y += 7) for (let x = 20; x < cols - 20; x += 11) {
    const dx = x - cols / 2, dy = y - rows / 2;
    const a = spiralValue(x, y, 1 + dt, cols, rows), b = spiralValue(cols / 2 + dx * k, rows / 2 + dy * k, 1, cols, rows);
    // the vignette differs with the radius, so compare the band term through its ratio
    const va = a / (1 - s.dark * Math.min(1, Math.hypot(dx * 7.8, dy * 15) / (Math.hypot(cols * 7.8, rows * 15) / 2)));
    const vb = b / (1 - s.dark * Math.min(1, Math.hypot(dx * k * 7.8, dy * k * 15) / (Math.hypot(cols * 7.8, rows * 15) / 2)));
    if (Math.abs(va - vb) < .03) close++; n++;
  }
  assert.ok(close / n > .9, `${close}/${n} samples flow outward`);
  // brighter in the middle than at the rim, on average
  const mean = (x0, x1) => { let sum = 0, c = 0; for (let y = 0; y < rows; y++) for (let x = x0; x < x1; x++) { sum += spiralValue(x, y, .5, cols, rows); c++; } return sum / c; };
  assert.ok(mean(cols * .4, cols * .6) > mean(0, cols * .1) * 1.5, 'the centre is lit, the rim dark');
  // the arms wind: going round at a fixed radius crosses `arms` bands
  let crossings = 0, prev = null;
  for (let i = 0; i <= 360; i += 2) { const a = i * Math.PI / 180, v = spiralValue(cols / 2 + Math.cos(a) * 30, rows / 2 + Math.sin(a) * 30 * 7.8 / 15, 0, cols, rows) > .3; if (prev !== null && v !== prev) crossings++; prev = v; }
  assert.equal(crossings, s.arms * 2, `${crossings} crossings round the ring`);
});

test('characters come from the ramp, dark for the low field, and a frame is the grid of them', () => {
  assert.equal(spiralChar(0), ' '); assert.equal(spiralChar(.1), ' '); assert.equal(spiralChar(1), RAMP[RAMP.length - 1]);
  assert.ok(RAMP.indexOf(spiralChar(.5)) > 0 && RAMP.indexOf(spiralChar(.5)) < RAMP.indexOf(spiralChar(.8)));
  const f = spiralFrame(40, 12, 0).split('\n');
  assert.equal(f.length, 12); assert.ok(f.every(l => l.length === 40));
  assert.notEqual(spiralFrame(40, 12, 0), spiralFrame(40, 12, .5), 'it moves');
  assert.equal(spiralFrame(0, 0, 0), '');
});

test('the element draws on its own clock while started, slows with its speed without a jump, and stays still for reduced motion', () => {
  let now = 0; const timers = [];
  const win = {innerWidth: 390, innerHeight: 150, setInterval: (f, ms) => { timers.push({f, ms}); return 1; }, clearInterval: () => { timers.length = 0; }, matchMedia: () => ({matches: false})};
  const doc = {hidden: false, defaultView: win, createElement: () => ({className: '', textContent: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, clientWidth: 0, clientHeight: 0})};
  const sp = createAsciiSpiral({doc, win, now: () => now});
  assert.equal(sp.el.className, 'start-spiral'); assert.equal(sp.el.attrs['aria-hidden'], 'true'); assert.ok(!sp.still);
  sp.start();
  assert.ok(sp.playing); assert.equal(timers[0].ms, DESCENT.frameMs);
  const first = sp.el.textContent; assert.equal(first.split('\n').length, 11);
  now = 100; timers[0].f(); assert.ok(Math.abs(sp.phase - .1) < 1e-9, 'a tenth of a second of phase'); assert.notEqual(sp.el.textContent, first);
  sp.speed = DESCENT.rest; now = 200; timers[0].f(); assert.ok(Math.abs(sp.phase - (.1 + .1 * DESCENT.rest)) < 1e-9, 'slower, continuous');
  now = 5000; timers[0].f(); assert.ok(sp.phase < .1 + .1 * DESCENT.rest + .25 * DESCENT.rest + 1e-9, 'a long stall is clamped');
  sp.stop(); assert.ok(!sp.playing);
  const stillOne = createAsciiSpiral({doc, win, reduced: true, now: () => 0}); stillOne.start(); assert.ok(stillOne.still && !stillOne.playing);
});
