import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as C from './cobra-rear.js';

const dt = 1 / 60;
function snake(name) { const a = createCreature({name}); a.species = name; return a; }
const pose = a => {
  const h = a.hood.parent;
  return [h.position.x, h.position.y, h.position.z, h.rotation.x, h.rotation.y, h.rotation.z, a.body.rotation.y];
};

test('only the cobra rears', () => {
  for (const name of ['snake', 'garter snake', 'python', 'electric eel', 'guardian naga']) assert.equal(C.updateCobraRear(snake(name), dt, 0, false), null, name);
  const st = C.updateCobraRear(snake('cobra'), dt, 0, false);
  assert.ok(st.tongue, 'finds the tongue');
  assert.ok(st.neck && st.spray);
});

test('helpers stay in bounds and come back to rest', () => {
  for (let u = 0; u <= 1.0001; u += .01) {
    for (const p of [C.strikePose(u), C.spitPose(u)]) assert.ok(Object.values(p).every(v => Number.isFinite(v) && Math.abs(v) < .6), `${u}`);
    const h = C.hissCurve(u), f = C.flick(u);
    assert.ok(h >= 0 && h <= 1 && f.out >= 0 && f.out <= 1 && f.quiver >= 0 && f.quiver <= 1);
  }
  for (const p of [C.strikePose(0), C.strikePose(1), C.spitPose(0), C.spitPose(1)]) assert.deepEqual(p, {dy: 0, dz: 0, pitch: 0});
  // the strike draws back, then reaches forward and down
  assert.ok(C.strikePose(.25).dz < -.05 && C.strikePose(.48).dz > .25 && C.strikePose(.48).dy < -.2);
  // the sour head shake on the way back up: pitch swings both ways around the plain recovery, and is gone by the end
  const sw = []; for (let u = .6; u <= 1; u += .005) sw.push(C.strikePose(u).pitch - .55 * (1 - Math.min(1, Math.max(0, (u - .55) / .45)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (u - .55) / .45)))));
  assert.ok(Math.max(...sw) > .04 && Math.min(...sw) < -.04, 'shakes its head');
  assert.ok(Math.abs(C.strikePose(.999).pitch) < .01);
  assert.ok(C.spitPose(.3).dz < -.03 && C.spitPose(.47).dz > .08);
});

test('the cobra lies low and folded alone, rears and spreads at the hero, strikes, spits and rests after death', () => {
  const a = snake('cobra'), rest = pose(a), head = a.hood.parent, ry0 = rest[1];
  let t = 0, flicks = {far: 0, near: 0}, maxHood = 0, hisses = 0, last = pose(a);
  const run = (secs, look, tag) => {
    for (let i = 0; i < secs * 60; i++) {
      t += dt;
      const was = a.cobraRear?.flick, hissed = a.cobraRear?.hiss;
      updateFidget(a, dt, t, !!a.actions?.current, look);
      const st = a.cobraRear, p = pose(a);
      assert.ok(p.every(Number.isFinite));
      p.forEach((v, k) => assert.ok(Math.abs(v - rest[k]) < 1.3, `pose ${k} ${v}`));
      if (!a.actions?.current) p.forEach((v, k) => assert.ok(Math.abs(v - last[k]) < .06, `smooth ${k} ${v} ${last[k]} ${t}`));
      last = p;
      assert.ok(a.hood.scale.x >= C.HOOD_FOLD - 1e-9 && a.hood.scale.x <= 1 + C.HOOD_FLARE + 1e-9);
      if (st.flick && !was) flicks[tag]++;
      if (st.hiss && !hissed) hisses++;
      if (tag === 'near') maxHood = Math.max(maxHood, a.hood.scale.x);
      assert.ok(st.neck.instanceMatrix.array.every(Number.isFinite));
    }
  };
  run(20, null, 'far');
  assert.ok(Math.abs(a.hood.scale.x - C.HOOD_FOLD) < .01, `folded alone (${a.hood.scale.x})`);
  assert.ok(head.position.y < ry0 && !a.cobraRear.neck.visible, 'lies low');
  a.g.position.set(0, 0, 0);
  run(20, {x: 1.2, z: 1.2}, 'near');
  assert.ok(head.position.y - ry0 > C.REAR_UP * .8, `rears (${head.position.y - ry0})`);
  assert.ok(a.cobraRear.neck.visible, 'its neck shows');
  assert.ok(maxHood > 1.05, `spreads and flares (${maxHood})`);
  assert.ok(hisses >= 2, `hisses (${hisses})`);
  assert.ok(flicks.near > flicks.far * 1.5 && flicks.far >= 3, `flicks more near (${flicks.far}, ${flicks.near})`);
  assert.ok(a.body.rotation.y > .4, `turns to the hero (${a.body.rotation.y})`);
  // the neck runs from the coil to the head
  const n = a.cobraRear.neck, top = n.instanceMatrix.array.slice(16 * (C.BEADS - 1) + 12, 16 * (C.BEADS - 1) + 15);
  assert.ok(top[1] > ry0 + .1, `the neck's top is up by the head (${top[1]})`);

  // a strike: back, then forward and down, and back up
  const atk = {kind: 'attack', attack: 'bite'}, z0 = head.position.z, y0 = head.position.y;
  let minZ = 0, maxZ = 0, minY = 0;
  for (let i = 0; i <= 40; i++) {
    a.actions = {current: atk, age: 1, u: i / 40, queue: [], dead: false};
    t += dt; updateFidget(a, dt, t, true, {x: 1.2, z: 1.2});
    minZ = Math.min(minZ, head.position.z - z0); maxZ = Math.max(maxZ, head.position.z - z0); minY = Math.min(minY, head.position.y - y0);
  }
  assert.ok(minZ < -.04 && maxZ > .25 && minY < -.2, `strikes (${minZ}, ${maxZ}, ${minY})`);
  // a spit: a spray of droplets flying forward
  const spit = {kind: 'attack', attack: 'spit'};
  let most = 0, far = 0;
  for (let i = 0; i <= 40; i++) {
    a.actions = {current: spit, age: 1, u: i / 40, queue: [], dead: false};
    t += dt; updateFidget(a, dt, t, true, {x: 1.2, z: 1.2});
    const st = a.cobraRear;
    most = Math.max(most, st.drops.length);
    for (const d of st.drops) { assert.ok(d.p.every(Number.isFinite) && d.p[1] > -1 && d.p[1] < 2); far = Math.max(far, d.p[2]); }
  }
  assert.equal(most, C.DROPS);
  assert.ok(far > .8, `the spit flies at the target (${far})`);

  // death: back to rest, hood folded, no drops, neck hidden
  a.actions = {current: null, age: 0, u: 0, queue: [], dead: true};
  for (let i = 0; i < 60 * 6; i++) { t += dt; updateFidget(a, dt, t, false, {x: 1.2, z: 1.2}); }
  pose(a).forEach((v, k) => assert.ok(Math.abs(v - rest[k]) < 1e-6, `rest ${k}: ${v} vs ${rest[k]}`));
  assert.ok(Math.abs(a.hood.scale.x - C.HOOD_FOLD) < 1e-3);
  assert.equal(a.cobraRear.drops.length, 0);
  assert.ok(!a.cobraRear.neck.visible);
});

test('a hiss drops the jaw open and it closes again, sharing the jaw with the action layer', () => {
  const a = snake('cobra'), rest = a.jaw.rotation.x, look = {x: 1.5, z: 1.5};
  assert.ok(a.jaw, 'cobra has a jaw');
  let t = 0, most = 0;
  for (let i = 0; i < 40 * 60; i++) {
    t += dt;
    updateFidget(a, dt, t, false, look);
    const g = a.jaw.rotation.x - rest;
    assert.ok(Number.isFinite(g) && g >= -1e-9 && g <= C.MAX_GAPE + 1e-9, `gape ${g}`);
    assert.ok(Math.abs(g - a.cobraRear.gape) < 1e-9, 'jaw is rest plus its own gape');
    most = Math.max(most, g);
  }
  assert.ok(most > .3, `hissed open (${most})`);
  // away from the hero it sinks, stops hissing, and the jaw shuts
  for (let i = 0; i < 10 * 60; i++) { t += dt; updateFidget(a, dt, t, false, null); }
  assert.ok(Math.abs(a.jaw.rotation.x - rest) < 1e-9);
});
