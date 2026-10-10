import test from 'node:test';
import assert from 'node:assert/strict';
import {chunkPose, dustPose, speckPose, isPitFallMessage, isPitSpikeMessage, createPitFall, PENDING_WAIT, PIT, COUGH_DELAY} from './pit-fall.js';

test('only the hero falling in triggers it', () => {
  assert.ok(isPitFallMessage('You fall into a pit!'));
  assert.ok(isPitSpikeMessage('You land on a set of sharp iron spikes!'));
  for (const t of ['The newt falls into a pit!', 'There is a pit here.', null]) assert.ok(!isPitFallMessage(t), String(t));
  assert.ok(!isPitSpikeMessage('You fall into a pit!'));
});

test('everything ends invisible and chunks start at rest on the rim', () => {
  for (let i = 0; i < PIT.chunks; i++) { assert.equal(chunkPose(i, PIT.total).alpha, 0); assert.equal(chunkPose(i, 0).alpha, 0); }
  for (let i = 0; i < PIT.dust; i++) for (const t of [0, PIT.total]) assert.equal(dustPose(i, t).alpha, 0);
  for (let i = 0; i < PIT.specks; i++) for (const t of [0, PIT.speckTotal]) assert.equal(speckPose(i, t).alpha, 0);
});

test('chunks slide inward and drop out of sight, the last one hanging longest', () => {
  const gone = i => { for (let t = 0; t < PIT.total; t += .005) if (chunkPose(i, t).alpha === 0 && t > .02) return t; return PIT.total; };
  for (let i = 0; i < PIT.chunks; i++) {
    let last = Infinity;
    for (let t = .005; t < PIT.total; t += .005) {
      const p = chunkPose(i, t);
      assert.ok(Math.hypot(p.x, p.z) <= .6 && p.y <= .08 + 1e-9 && p.alpha >= 0 && p.alpha <= .9 + 1e-9, `${i} ${t}`);
      if (i !== 2 || t > .08) { assert.ok(Math.hypot(p.x, p.z) <= last + 1e-9, `${i} ${t}`); } last = Math.hypot(p.x, p.z);
    }
    assert.ok(chunkPose(i, .02).y > -.01);
  }
  assert.ok(gone(PIT.chunks - 1) > gone(0));
});

test('dust rises and fades; spike flecks arc up and stay in bounds', () => {
  for (let i = 0; i < PIT.dust; i++) {
    let top = 0;
    for (let t = 0; t <= PIT.total; t += .01) { const p = dustPose(i, t); assert.ok(p.y <= .6 && Math.hypot(p.x, p.z) <= .5 && p.alpha >= 0 && p.alpha <= .5 + 1e-9, `${i} ${t}`); top = Math.max(top, p.alpha); }
    assert.ok(top > .3);
  }
  for (let i = 0; i < PIT.specks; i++) {
    let high = 0;
    for (let t = 0; t <= PIT.speckTotal; t += .01) { const p = speckPose(i, t); assert.ok(p.alpha === 0 || p.y >= .02 - 1e-9, `${i} ${t}`); assert.ok(p.y <= 1.1 && Math.hypot(p.x, p.z) <= .2 && p.alpha >= 0, `${i} ${t}`); high = Math.max(high, p.y); }
    assert.ok(high > .3);
  }
});

test('the effect waits for the next frame and lands on the trap square', () => {
  const added = [];
  const THREE = new Proxy({}, {get: () => class { constructor() { this.position = {set: (x, y, z) => added.push([x, z]), y: 0}; this.rotation = {}; this.scale = {setScalar() {}, set() {}}; this.material = {}; } add() {} dispose() {} }});
  const fx = createPitFall(THREE, {add() {}, remove() {}});
  fx.message('You fall into a pit!', 1, 1);
  assert.equal(fx.active, 0);
  fx.settle(2, 1);
  assert.equal(fx.active, 1);
  assert.deepEqual(added[0], [2, 1]);
  fx.message('You land on a set of sharp iron spikes!', 2, 1);
  assert.equal(fx.active, 2);
  fx.update(PIT.total + .1);
  assert.equal(fx.active, 0);
  fx.message('You fall into a pit!', 5, 5);
  fx.update(PENDING_WAIT + .01);
  assert.equal(fx.active, 1);
  fx.clear();
  assert.equal(fx.active, 0);
});

test('the last dust puff is a late second cough', () => {
  const first = i => { for (let t = 0; t < PIT.total; t += .005) if (dustPose(i, t).alpha > .01) return t; return PIT.total; };
  assert.ok(first(PIT.dust - 1) >= COUGH_DELAY);
  assert.ok(first(0) < COUGH_DELAY);
  assert.equal(dustPose(PIT.dust - 1, PIT.total).alpha, 0);
});

test('the last spike fleck lands, hops once and is still visible after the others are gone', () => {
  const n = PIT.specks - 1, t0 = n * .03 + .55;
  assert.equal(speckPose(0, .7).alpha, 0);
  assert.ok(speckPose(n, .7).alpha > .1);
  assert.ok(speckPose(n, t0 + .07).y > speckPose(n, t0 + .01).y + .02, 'hop');
  assert.ok(speckPose(n, t0 + .12).y < speckPose(n, t0 + .07).y, 'settling');
});

test('the last chunk shivers sideways on the lip, the others hang still', async () => {
  const {chunkPose, PIT} = await import('./pit-fall.js');
  const last = PIT.chunks - 1, hang = .04 * last + .18, r0 = .42 + .05 * (last % 3);
  const angs = []; for (let t = .01; t < hang; t += .005) { const p = chunkPose(last, t); angs.push(Math.atan2(p.z, p.x)); assert.ok(Math.abs(Math.hypot(p.x, p.z) - r0) < 1e-9); }
  assert.ok(Math.max(...angs) - Math.min(...angs) > .02, 'shiver');
  const q = t => chunkPose(2, t);
  assert.ok(Math.abs(q(.01).x - q(.05).x) < 1e-9 && Math.abs(q(.01).z - q(.05).z) < 1e-9, 'others still');
});

test('chunk 2 teeters up on the rim before it slides', () => {
  assert.ok(chunkPose(2, .04).y > chunkPose(2, 0.001).y + .03, 'tips up');
  assert.ok(Math.abs(chunkPose(2, .08).y - .03) < 1e-6, 'level again');
  assert.equal(chunkPose(1, .02).y, .03, 'others stay flat');
});
