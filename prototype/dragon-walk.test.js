import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue} from './actions.js';
import {updateDragonMenace} from './dragon-menace.js';
import {WALK} from './dragon-walk.js';
import {MEASURES} from './creature-measures.js';

const D = 68, FPS = 60, dt = 1 / FPS;
const COLORS = Object.fromEntries(JSON.parse(readFileSync(new URL('./tools/creature-names.json', import.meta.url))).filter(m => m.letter === 'D').map(m => [m.name.toLowerCase(), m.color]));
const dragon = name => { const a = createCreature({name, symbol: D, color: COLORS[name]}); a.actions = createActionQueue(); a.species = name; return a; };
// one frame as live.js runs it: its generic leg swing, body bob and roll first, then the dragon's own update
function frame(a, t, walking, busy = walking) {
  a.legs.forEach((l, i) => { l.rotation.x = walking ? Math.sin(t * 22 + i * 2) * .4 : 0; });
  a.body.position.y = Math.sin(t * (walking ? 22 : 2.5)) * .035;
  a.g.rotation.z = Math.sin(t * 1.7) * .025;
  a.wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (-.18 + Math.sin(t * 5) * .12); });
  return updateDragonMenace(a, dt, t, busy, walking, null);
}
const v = new THREE.Vector3(), q = new THREE.Quaternion();
// in the dragon's own frame (its group), so the roll live.js gives the whole group doesn't count
const local = (a, o) => { a.g.updateMatrixWorld(true); return a.g.worldToLocal(o.getWorldPosition(new THREE.Vector3())); };
const yawOf = (a, o) => { a.g.updateMatrixWorld(true); o.getWorldQuaternion(q); q.premultiply(a.g.getWorldQuaternion(new THREE.Quaternion()).invert()); v.set(0, 0, 1).applyQuaternion(q); return Math.atan2(v.x, v.z); };
const STRIDE = 2 * Math.PI / WALK.rate;
// the measured lizard: head yaw against trunk yaw, each with its spread (Goyens and Aerts 2018)
const L = MEASURES.dragon.lizard, HEAD_RATIO = [(L.headYaw - .99) / (L.trunkYaw + 3.8), (L.headYaw + .99) / (L.trunkYaw - 3.8)];

test('walking, the neck holds the head level against the body\'s bob: under 1 cm of rise and fall over a stride', () => {
  for (const name of ['draken', 'wyvern', 'tiamat', 'chromatic dragon', 'baby draken', 'leviathan']) {
    const a = dragon(name); let t = 0;
    for (; t < 1.5; t += dt) frame(a, t, true);
    const heads = a.heads.map(() => [Infinity, -Infinity]);
    for (const end = t + STRIDE; t < end; t += dt) { frame(a, t, true); a.heads.forEach((h, i) => { const y = local(a, h).y; heads[i][0] = Math.min(heads[i][0], y); heads[i][1] = Math.max(heads[i][1], y); }); }
    heads.forEach(([lo, hi], i) => assert(hi - lo < .01, `${name} head ${i} rises and falls ${((hi - lo) * 100).toFixed(2)} cm`));
    // (without the neck's hold the bob alone moves it 7 cm: check the body really does move)
    let bodyLo = Infinity, bodyHi = -Infinity;
    for (const end = t + STRIDE; t < end; t += dt) { frame(a, t, true); const y = a.body.position.y; bodyLo = Math.min(bodyLo, y); bodyHi = Math.max(bodyHi, y); }
    if (!a.joints.spine0) assert(bodyHi - bodyLo > .005, `${name} the body bobs`);
  }
});

test('walking, the trunk swings and the head turns about a sixth as far, within the lizard\'s measured range', () => {
  for (const name of ['draken', 'wyvern', 'tiamat', 'baby draken']) {
    // (walking, an idle head stops scanning and settles to look ahead: give it time to settle)
    const a = dragon(name); let t = 0;
    for (; t < 6; t += dt) frame(a, t, true);
    let trunk = 0; const head = a.heads.map(() => 0);
    for (const end = t + STRIDE; t < end; t += dt) { frame(a, t, true); trunk = Math.max(trunk, Math.abs(a.body.rotation.y)); a.heads.forEach((h, i) => { head[i] = Math.max(head[i], Math.abs(yawOf(a, h) - yawOf(a, a.g))); }); }
    assert(Math.abs(trunk - WALK.trunk) < .01, `${name} trunk swings ${trunk.toFixed(3)}`);
    // (each head's yaw against the trunk's swing, about its own resting heading)
    const rest = dragon(name); rest.g.updateMatrixWorld(true);
    a.heads.forEach((h, i) => {
      const base = Math.abs(yawOf(rest, rest.heads[i]));
      const ratio = (head[i] - base) / trunk;
      assert(ratio >= HEAD_RATIO[0] && ratio <= HEAD_RATIO[1], `${name} head ${i}: ${ratio.toFixed(3)} of the trunk's yaw, the lizard's ${HEAD_RATIO.map(x => x.toFixed(3)).join('..')}`);
    });
  }
});

test('walking, the tail swings the other way to the hips, as far as the trunk swings, its curve unchanged', () => {
  for (const name of ['draken', 'wyvern', 'tiamat']) {
    const a = dragon(name); let t = 0;
    for (; t < 1.5; t += dt) frame(a, t, true);
    const tail = []; for (let i = 0; a.joints['tail' + i]; i++) tail.push(a.joints['tail' + i]);
    const hip = a.legs.find(l => l.name === 'lhind'), bend0 = tail.slice(1).map(b => b.rotation.y);
    let same = 0, opposite = 0, baseYaw = 0;
    for (const end = t + STRIDE; t < end; t += dt) {
      frame(a, t, true);
      const hx = local(a, hip).x - (hip.userData.restX ??= local(dragon(name), dragon(name).legs.find(l => l.name === 'lhind')).x);
      const tx = local(a, tail.at(-1)).x - (tail.at(-1).userData.restX ??= local(dragon(name), dragon(name).joints['tail' + (tail.length - 1)]).x);
      if (Math.abs(hx) > .005) (Math.sign(hx) === Math.sign(tx) ? same++ : opposite++);
      baseYaw = Math.max(baseYaw, Math.abs(a.body.rotation.y + a.joints.tail0.rotation.y - (a.jointRest.rest.tail0.y)));
      tail.slice(1).forEach((b, k) => assert.equal(b.rotation.y, bend0[k], `${name} the curve past the base is unchanged`));
    }
    assert(opposite > 10 && same === 0, `${name} tail tip against the hips: ${opposite} opposite, ${same} the same way`);
    // (the tail's base turns as far as the trunk, the other way: the trunk's measured 27 ± 3.8° spread around it)
    assert(Math.abs(baseYaw - WALK.tail * WALK.trunk) <= WALK.trunk * 3.8 / L.trunkYaw, `${name} tail base swings ${baseYaw.toFixed(3)}`);
  }
});

test('the legs step in diagonal pairs: the left fore with the right hind', () => {
  const a = dragon('draken'); let t = 0;
  for (; t < 1.5; t += dt) frame(a, t, true);
  const leg = n => a.legs.find(l => l.name === n).rotation.x;
  for (const end = t + STRIDE; t < end; t += dt) {
    frame(a, t, true);
    if (Math.abs(leg('lfore')) > .05) { assert(Math.sign(leg('lfore')) === Math.sign(leg('rhind')), 'lfore with rhind'); assert(Math.sign(leg('lfore')) !== Math.sign(leg('rfore')), 'lfore against rfore'); }
  }
});

test('a serpent sends a wave back down its spine; stopping puts every joint and the body exactly back', () => {
  const a = dragon('leviathan'); let t = 0;
  for (; t < 1.5; t += dt) frame(a, t, true);
  const s0 = a.joints.spine0.rotation.y, s4 = a.joints.spine4.rotation.y;
  frame(a, t + dt, true);
  assert(Math.abs(a.joints.spine0.rotation.y - s0) > 1e-4 && Math.abs(s4 - s0) > 1e-3, 'the spine bends along its length as it goes');
  for (const name of ['draken', 'tiamat', 'leviathan', 'wyvern']) {
    const b = dragon(name);
    for (let i = 0; i < 30; i++) frame(b, i * dt, false, true);
    const rest = Object.fromEntries(Object.entries(b.joints).map(([n, o]) => [n, o.rotation.clone()])), body = b.body.rotation.y;
    let s = 30 * dt; for (; s < 4; s += dt) frame(b, s, true);
    // stopped, kept busy (so it neither mantles nor lashes): the walk blends out
    let r; for (const end = s + 4; s < end; s += dt) r = frame(b, s, false, true);
    assert.equal(r.walk, 0, name);
    // (the wings are the breath's and the furl's, which eases off slowly, and the heads are their scan's: the walk writes neither)
    for (const [n, o] of Object.entries(b.joints)) if (!/^head|wing/.test(n)) for (const ax of ['x', 'y', 'z']) assert.equal(o.rotation[ax], rest[n][ax], `${name} ${n}.${ax}`);
    assert.equal(b.body.rotation.y, body, `${name} body yaw`);
  }
});
