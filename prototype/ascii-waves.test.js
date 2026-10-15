import test from 'node:test';
import assert from 'node:assert/strict';
import {RAMP, waveValue, waveChar, waveFrame, gridFor, createAsciiWaves, FRAME_MS} from './ascii-waves.js';

test('the field stays in 0..1 and is mostly dark with ridges', () => {
  let dark = 0, total = 0;
  for (let y = 0; y < 40; y++) for (let x = 0; x < 120; x++) {
    const v = waveValue(x, y, 3.7);
    assert.ok(v >= 0 && v <= 1, `${x},${y}: ${v}`);
    total++; if (waveChar(v) === ' ') dark++;
  }
  assert.ok(dark / total > .25 && dark / total < .75, String(dark / total));
  assert.equal(waveChar(0), ' '); assert.equal(waveChar(1), RAMP.at(-1)); assert.equal(waveChar(2), RAMP.at(-1)); assert.equal(waveChar(-1), ' ');
});

test('a frame is cols by rows of ramp characters, and moves with time', () => {
  const f = waveFrame(30, 8, 1), lines = f.split('\n');
  assert.equal(lines.length, 8);
  for (const l of lines) { assert.equal(l.length, 30); for (const c of l) assert.ok(RAMP.includes(c), c); }
  assert.notEqual(f, waveFrame(30, 8, 2.5));
  assert.equal(waveFrame(30, 8, 1), f, 'deterministic');
  assert.equal(waveFrame(0, 0, 1), '');
});

test('the grid covers the box with a spare cell', () => {
  assert.deepEqual(gridFor(780, 600), {cols: 101, rows: 41});
  assert.deepEqual(gridFor(0, 0), {cols: 1, rows: 1});
});

const fakeDoc = (hidden = false) => {
  const timers = new Map(); let id = 0;
  const win = {innerWidth: 390, innerHeight: 150, listeners: {},
    setInterval(fn, ms) { timers.set(++id, {fn, ms}); return id; }, clearInterval(i) { timers.delete(i); },
    addEventListener(k, fn) { this.listeners[k] = fn; }, removeEventListener(k) { delete this.listeners[k]; },
    matchMedia: () => ({matches: false}), timers};
  const doc = {hidden, defaultView: win, createElement: () => ({className: '', textContent: '', clientWidth: 0, clientHeight: 0, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }})};
  return {doc, win, timers};
};

test('started, it draws at once, redraws on a timer and on resize, and stops cleanly', () => {
  const {doc, win, timers} = fakeDoc();
  let t = 1000;
  const w = createAsciiWaves({doc, win, now: () => t});
  assert.equal(w.el.className, 'start-waves'); assert.equal(w.el.attrs['aria-hidden'], 'true');
  assert.ok(!w.playing && !w.still);
  w.start();
  const first = w.el.textContent;
  assert.equal(first.split('\n').length, gridFor(390, 150).rows);
  assert.ok(w.playing && timers.size === 1 && [...timers.values()][0].ms === FRAME_MS);
  t = 2600; [...timers.values()][0].fn();
  assert.notEqual(w.el.textContent, first, 'the timer redraws');
  w.start(); assert.equal(timers.size, 1, 'start twice keeps one timer');
  win.innerWidth = 780; win.listeners.resize();
  assert.equal(w.el.textContent.split('\n')[0].length, gridFor(780, 150).cols);
  w.stop();
  assert.ok(!w.playing && timers.size === 0 && !win.listeners.resize);
});

test('a hidden tab skips the redraw; reduced motion draws one still frame and no timer', () => {
  const {doc, win, timers} = fakeDoc(true);
  let t = 1000;
  const w = createAsciiWaves({doc, win, now: () => t});
  w.start(); const first = w.el.textContent; t = 5000; [...timers.values()][0].fn();
  assert.equal(w.el.textContent, first); w.stop();
  const r = createAsciiWaves({doc, win, reduced: true, now: () => t});
  r.start();
  assert.ok(r.still && !r.playing && timers.size === 0 && r.el.textContent.length > 0);
});
