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
