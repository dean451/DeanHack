import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions} from './actions.js';
import {createElectricEel, jagged, snapTimes, MAX_ARCS, ARC_SEGS, SPARKS, FIZZLE_S} from './electric-eel.js';

const eel = seed => { const a = createElectricEel({seed}); a.actions = createActionQueue(); return a; };
const electricity = a => a.body.children.filter(o => o.userData.part === 'electricity');
const finite = o => { const e = o.matrixWorld.elements; return e.every(Number.isFinite); };

test('jagged bolts keep their ends and stay near the line; snaps are spaced', () => {
  let s = 1; const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 50; k++) {
    const a = [rand(), rand(), rand()], b = [rand(), rand(), rand()], pts = jagged(a, b, ARC_SEGS, .35, rand);
    assert.equal(pts.length, ARC_SEGS + 1);
    assert.deepEqual(pts[0], a); assert.deepEqual(pts.at(-1), b);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    for (const p of pts) for (let i = 0; i < 3; i++) assert(Math.abs(p[i] - (a[i] + b[i]) / 2) <= len * .9 + 1e-9);
  }
  const times = snapTimes(0, 60, rand);
  assert(times.length > 20 && times.length < 80, String(times.length));
  times.forEach((t, i) => assert(t - (times[i - 1] ?? 0) >= .8 - 1e-9));
});

test('createCreature gives the electric eel its crackling model, sized like a creature', () => {
  const a = createCreature({name: 'electric eel', symbol: ';'.charCodeAt(0), color: 4});
  assert.equal(typeof a.g.userData.updateEel, 'function');
  assert(a.jaw && a.head && a.tail);
  // The size stageCreature (readability.js, browser-only) measures: the union of every mesh's
  // geometry bounds. The unit-size arc and flash meshes must not count toward it.
  a.g.updateMatrixWorld(true);
  const box = new THREE.Box3(), inverse = a.g.matrixWorld.clone().invert(), local = new THREE.Box3();
  a.g.traverse(m => { if (!m.isMesh) return; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); local.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld).applyMatrix4(inverse); box.union(local); });
  const size = box.getSize(new THREE.Vector3()).multiplyScalar(a.g.scale.x);
  assert(size.y > .5 && size.y < .9 && Math.max(size.x, size.z) < .95, JSON.stringify(size));
  assert(!createCreature({name: 'giant eel', symbol: ';'.charCodeAt(0), color: 4}).g.userData.updateEel);
});

test('it crackles all the time, snaps to the floor, pops on a bite, and fizzles out on death', () => {
  for (const seed of [1, 7, 42, 99]) {
    const a = eel(seed), q = a.actions;
    let arcFrames = 0, frames = 0, maxSparks = 0, flashes = 0, bitePop = false, deathAt = null;
    const dt = 1 / 60;
    for (let i = 0; i <= 60 * 40; i++) {
      const t = i * dt;
      if (i === 60 * 20) enqueueAction(q, {kind: 'attack', attack: 'bite', result: 'hit', dir: {x: 0, z: 1}});
      if (i === 60 * 30) { enqueueAction(q, {kind: 'die', dir: {x: 0, z: 1}}); }
      updateActions(a, q, dt);
      if (i >= 60 * 30 && deathAt === null && q.dead) deathAt = t;
      if (i === 60 * 30 + 30 && !q.dead) { q.dead = true; deathAt = t; }
      const s = a.g.userData.updateEel(t, q);
      a.g.updateMatrixWorld(true);
      for (const v of [s.arcs, s.sparks, s.flash, s.spike, s.intensity]) assert(Number.isFinite(v), `${seed} ${t}`);
      assert(s.arcs <= MAX_ARCS * ARC_SEGS && s.sparks <= SPARKS && s.flash <= 1 && s.spike <= 1);
      for (const o of electricity(a)) assert(finite(o));
      const [core] = electricity(a);
      for (let k = 0; k < core.count; k++) {
        const m = new THREE.Matrix4(); core.getMatrixAt(k, m);
        const p = new THREE.Vector3().setFromMatrixPosition(m);
        assert(p.length() < 1.2, `arc segment far off the eel: ${p.toArray()}`);
      }
      if (t < 20) { frames++; if (s.arcs) arcFrames++; if (s.flash > .5) flashes++; maxSparks = Math.max(maxSparks, s.sparks); }
      if (t > 20 && t < 20.6 && s.flash > .5 && s.spike > .5) bitePop = true;
    }
    assert(arcFrames / frames > .8, `${seed}: idle crackle only ${arcFrames}/${frames}`);
    assert(flashes > 5 && maxSparks > 10, `${seed}: floor snaps ${flashes} ${maxSparks}`);
    assert(bitePop, `${seed}: no pop on the bite`);
    assert(deathAt !== null && deathAt + FIZZLE_S + .6 < 40);
    const end = a.g.userData.updateEel(40 + 1 / 60, q);
    assert.equal(end.arcs, 0); assert.equal(end.sparks, 0); assert.equal(end.flash, 0); assert.equal(end.intensity, 0);
  }
});

test('two eels crackle differently, and dispose cleanly', () => {
  const a = eel(3), b = eel(4), seen = [];
  for (const x of [a, b]) { const counts = []; for (let i = 0; i < 300; i++) counts.push(x.g.userData.updateEel(i / 60, x.actions).arcs); seen.push(counts.join()); }
  assert.notEqual(seen[0], seen[1]);
  assert.doesNotThrow(() => a.g.userData.dispose());
});
