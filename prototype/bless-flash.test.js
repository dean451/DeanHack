import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPose, fleckPose, blessKind, BLESS, BLESS_COLORS} from './bless-flash.js';

test('only the glow messages trigger it, and they name the kind', () => {
  assert.equal(blessKind('Your dagger softly glows light blue.'), 'blessed');
  assert.equal(blessKind('Your long sword glows black.'), 'cursed');
  assert.equal(blessKind('Your pack softly glows amber.'), 'lifted');
  for (const t of ['Your dagger glows silver for a moment.', 'You see here a dagger.', null]) assert.equal(blessKind(t), null, String(t));
});

test('everything returns exactly to rest', () => {
  for (const k of Object.keys(BLESS_COLORS)) for (const t of [0, BLESS.total]) { assert.equal(ringPose(k, t).alpha, 0); assert.equal(ringPose(k, t).radius, 0); }
  for (let i = 0; i < BLESS.flecks; i++) for (const t of [0, BLESS.total]) assert.equal(fleckPose(i, t).alpha, 0);
});

test('the blessing lets go: the ring sags a little as it fades', () => {
  const peak = Math.max(...Array.from({length: 180}, (_, i) => ringPose('blessed', i * .01).lift));
  assert.ok(ringPose('blessed', BLESS.total - .01).lift < peak - .03);
});

test('poses stay in bounds, the blessing rises, the curse closes, flecks fall', () => {
  for (const k of Object.keys(BLESS_COLORS)) {
    let peak = 0;
    for (let t = 0; t <= BLESS.total; t += .01) {
      const p = ringPose(k, t);
      assert.ok(p.alpha >= 0 && p.alpha <= .7 + 1e-9 && p.radius >= 0 && p.radius < .6 && p.lift >= 0 && p.lift <= .5 + 1e-9, `${k} ${t}`);
      peak = Math.max(peak, p.alpha);
    }
    assert.ok(peak > .25, k);
  }
  assert.ok(ringPose('blessed', 1.2).lift > ringPose('blessed', .3).lift);
  assert.ok(ringPose('cursed', 1.2).radius < ringPose('cursed', .2).radius);
  for (let i = 0; i < BLESS.flecks; i++) {
    let top = 0;
    for (let t = 0; t <= BLESS.total; t += .01) { const q = fleckPose(i, t); assert.ok(q.y >= 0 && q.y <= .46 && q.alpha >= 0 && q.alpha <= 1); top = Math.max(top, q.y); }
    assert.ok(top > .3 && fleckPose(i, BLESS.total * .9).y < top);
  }
});

test('the curse snaps back out once as it closes', () => {
  const at = u => ringPose('cursed', u * BLESS.total).radius;
  assert.ok(at(.7) > at(.62) - .001 && at(.7) - at(.62) > -.02, 'the closing pauses and rebounds');
});

test('the last shaken-off fleck is tugged back toward the item before it falls', () => {
  const last = BLESS.flecks - 1, r = (i, t) => Math.hypot(fleckPose(i, t).x, fleckPose(i, t).z);
  const t = .45 * BLESS.total;
  assert.ok(r(last, t) < r(last, .3 * BLESS.total) * .9, 'pulled inward');
  assert.ok(r(last, .7 * BLESS.total) > r(last, t), 'then let go');
  for (let tt = 0; tt <= BLESS.total; tt += .01) assert.ok(r(last, tt) < .35);
});

test('the blessing ring trembles at the top of its rise before letting go', () => {
  const u = x => ringPose('blessed', x * BLESS.total).lift;
  let dips = 0;
  for (let x = .64; x < .8; x += .004) if (u(x) < .5 * 1 - .004 && u(x + .004) > u(x) + 1e-4) dips++;
  assert.ok(dips > 3, 'the lift shivers rather than gliding');
});

test('a lifted curse is shaken: the ring shudders early, then settles, never leaving bounds', () => {
  let flips = 0, last = 0;
  for (let t = .02; t < BLESS.total * .3; t += .004) { const d = ringPose('lifted', t + .004).radius - ringPose('lifted', t).radius; if (last && Math.sign(d) !== Math.sign(last)) flips++; last = d; }
  assert.ok(flips >= 4, `shudders (${flips})`);
  for (let t = BLESS.total * .5; t < BLESS.total - .02; t += .01) assert.ok(ringPose('lifted', t + .01).radius >= ringPose('lifted', t).radius - 1e-9, 'smooth once calm');
  for (let t = .01; t < BLESS.total; t += .01) { const p = ringPose('lifted', t); assert.ok(p.radius >= .2 && p.radius <= .5 && p.alpha >= 0 && p.alpha <= .3 + 1e-9); }
});

test('the cursed ring twitches off the floor on each stutter beat, and rests flat at the ends', () => {
  const lifts = Array.from({length: 180}, (_, i) => ringPose('cursed', i * .01).lift);
  assert.ok(Math.max(...lifts) > .015 && Math.max(...lifts) < .05, 'a finger-width twitch');
  assert.ok(lifts.some(l => l === 0), 'and flat between beats');
  assert.equal(ringPose('cursed', 0).lift, 0);
  assert.equal(ringPose('cursed', BLESS.total).lift, 0);
});

test('shaken-off flecks gutter as they fall, each at its own pitch, never leaving bounds', () => {
  const a = i => Array.from({length: 100}, (_, k) => fleckPose(i, k * .018).alpha);
  for (let i = 0; i < BLESS.flecks; i++) assert.ok(a(i).every(x => x >= 0 && x <= 1), String(i));
  assert.notDeepEqual(a(0), a(1));
  const early = fleckPose(0, .2 * BLESS.total).alpha;
  assert.ok(Math.abs(early - 1) < .05, 'steady at first');
  const dips = Array.from({length: 40}, (_, k) => fleckPose(2, (.45 + k * .005) * BLESS.total).alpha), up = dips.filter((x, k) => k && x > dips[k - 1]).length;
  assert.ok(up > 0, 'catches again');
  assert.equal(fleckPose(0, BLESS.total).alpha, 0);
});

test('the lifted ring gutters once mid-fade then rests', async () => {
  const {ringPose, BLESS} = await import('./bless-flash.js');
  const a = u => ringPose('lifted', u * BLESS.total).alpha;
  assert.ok(a(.43) < a(.34) * .6);
  assert.equal(ringPose('lifted', BLESS.total).alpha, 0);
  for (let u = 0; u < 1; u += .005) assert.ok(a(u) >= 0 && a(u) <= .3 + 1e-9);
});

test('the cursed ring dims on its stutter beats and stays within bounds', () => {
  let dim = 0, lit = 0;
  for (let t = 0.2; t < BLESS.total * .6; t += .004) {
    const a = ringPose('cursed', t).alpha, u = t / BLESS.total;
    assert.ok(a >= 0 && a <= .7 + 1e-9, `t=${t}`);
    if (Math.floor(u * 9) % 2) dim++; else lit++;
  }
  assert.ok(dim > 0 && lit > 0);
  const u = .3 / BLESS.total, on = ringPose('cursed', BLESS.total * (Math.floor(u * 9) + .5) / 9);
  assert.ok(on.alpha > 0);
  assert.equal(ringPose('cursed', BLESS.total).alpha, 0);
});
