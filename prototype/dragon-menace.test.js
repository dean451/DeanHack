import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue} from './actions.js';
import {updateDragonMenace, menaces, mantleWeight, mantleLength, lashCurve, aimAt, LASH_S, OPEN_S, HOLD_S, REST, FURL, YAW, SMOKE_ALPHA, SIZE1} from './dragon-menace.js';

const D = 'D'.charCodeAt(0);
const dragon = (name = 'draken') => { const a = createCreature({name, symbol: D, color: 1}); a.actions = createActionQueue(); a.species = name; return a; };
const snap = a => ({heads: a.heads.map(h => [h.rotation.x, h.rotation.y]), inner: a.wings.map(w => [w.userData.inner.rotation.x, w.userData.inner.rotation.z]), tailY: a.tail.rotation.y});

test('the mantle snaps open, holds and folds; the lash cracks out and ripples back to nothing', () => {
  let prev = 0;
  for (let i = 0; i <= 2000; i++) {
    const s = mantleLength() * i / 2000, v = mantleWeight(s);
    assert(v >= 0 && v <= 1 && Math.abs(v - prev) < .02, `${s} ${v}`);
    prev = v;
  }
  assert.equal(mantleWeight(OPEN_S + HOLD_S / 2), 1);
  assert.equal(mantleWeight(mantleLength()), 0);
  assert.equal(mantleWeight(NaN), 0);
  prev = 0;
  for (let i = 0; i <= 3000; i++) {
    const s = LASH_S * i / 3000, v = lashCurve(s);
    assert(Number.isFinite(v) && Math.abs(v) <= 1 && Math.abs(v - prev) < .05, `${s} ${v}`);
    prev = v;
  }
  assert(lashCurve(.14 - 1e-6) > .99, 'full crack at the end of the snap');
  assert(Math.min(...Array.from({length: 100}, (_, i) => lashCurve(.14 + i * .01))) < -.2, 'it ripples back past rest');
  assert.equal(lashCurve(LASH_S), 0);
});

test('only dragon() dragons menace; the jabberwock and others are left alone', () => {
  for (const name of ['draken', 'wyvern', 'tiamat', 'guivre', 'leviathan', 'baby amphitere']) assert(menaces(dragon(name)), name);
  assert.equal(dragon('tiamat').heads.length, 5);
  assert(!menaces(createCreature({name: 'jabberwock', symbol: D, color: 1})));
  assert(!menaces(createCreature({name: 'jackal', symbol: 'd'.charCodeAt(0), color: 3})));
  assert.equal(updateDragonMenace(createCreature({name: 'jackal', symbol: 'd'.charCodeAt(0), color: 3}), .016, 0, false), null);
});

test('heads swing round to face the hero and glide after them', () => {
  const a = dragon(), h = a.heads[0], base = h.rotation.y;
  a.g.position.set(0, 0, 0); a.g.rotation.y = 0;
  const hero = new THREE.Vector3(2, 0, 3), want = Math.atan2(2, 3);
  assert(Math.abs(aimAt(a, hero).yaw - want) < 1e-9);
  assert.equal(aimAt(a, new THREE.Vector3(20, 0, 0)), null, 'out of range');
  assert.equal(aimAt(a, null), null);
  for (let i = 0; i < 180; i++) updateDragonMenace(a, 1 / 60, i / 60, true, false, hero);
  assert(Math.abs(h.rotation.y - base - want) < .02, `${h.rotation.y - base}`);
  // behind it: turns as far as it can toward that side
  for (let i = 0; i < 240; i++) updateDragonMenace(a, 1 / 60, 3 + i / 60, true, false, new THREE.Vector3(-1, 0, -3));
  assert(Math.abs(h.rotation.y - base + YAW) < .02, `${h.rotation.y - base}`);
});

test('sixty seconds of a dragon: finite, bounded, furls to walk, and death settles it exactly', () => {
  for (const name of ['draken', 'tiamat', 'guivre', 'wyvern']) {
    const a = dragon(name), rest = snap(a), dt = 1 / 60;
    let mantles = 0, lashes = 0, wasCur = null, maxStep = 0, prevTail = a.tail.rotation.z;
    for (let i = 0; i < 3600; i++) {
      const t = i * dt, walking = t > 20 && t < 25, look = t > 30 ? new THREE.Vector3(2, 0, 1) : null;
      if (t >= 50 && !a.actions.dead) a.actions.dead = true;
      const r = updateDragonMenace(a, dt, t, walking, walking, look);
      const cur = a.menace.cur?.kind;
      if (cur && cur !== wasCur) cur === 'mantle' ? mantles++ : lashes++;
      wasCur = cur;
      for (const v of [r.mantle, r.lash, r.furl, a.tail.rotation.z, a.tail.rotation.y, ...a.heads.flatMap(h => [h.rotation.x, h.rotation.y]), ...a.wings.flatMap(w => [w.rotation.y, w.userData.inner.rotation.z])]) assert(Number.isFinite(v), `${name} ${t}`);
      assert(Math.abs(a.tail.rotation.z) < .8, `${name} tail ${a.tail.rotation.z}`);
      for (const [k, h] of a.heads.entries()) assert(Math.abs(h.rotation.y - rest.heads[k][1]) <= YAW + 1e-9);
      if (walking && t > 21) for (const w of a.wings) assert(Math.abs(w.rotation.y - w.userData.side * (REST + FURL)) < .02, `${name} furled while walking`);
      maxStep = Math.max(maxStep, Math.abs(a.tail.rotation.z - prevTail)); prevTail = a.tail.rotation.z;
    }
    assert(mantles >= 1 && lashes >= 1, `${name} ${mantles} mantles ${lashes} lashes`);
    assert(maxStep < .2, `${name} tail step ${maxStep}`);
    // dead: heads, inner wings and tail yaw exactly back at rest; the tail hangs still
    const end = snap(a);
    for (const [k, [x, y]] of end.heads.entries()) { assert(Math.abs(x - rest.heads[k][0]) < 1e-9 && Math.abs(y - rest.heads[k][1]) < 1e-9, name); }
    assert(Math.abs(end.tailY - rest.tailY) < 1e-9 && Math.abs(a.tail.rotation.z) < 1e-9, name);
    for (const w of a.wings) assert(Math.abs(w.rotation.y - w.userData.side * (REST + FURL)) < 1e-3, `${name} wings folded in death`);
  }
});

const smokeOf = a => a.g.children.find(o => o.userData.part === 'dragonSmoke');
const alphas = a => { const c = smokeOf(a).geometry.attributes.aColor.array; return Array.from({length: c.length / 4}, (_, i) => c[i * 4 + 3]); };

test('smoke curls from the nostrils in breaths, snorts after a mantle, and thins away on death', () => {
  for (const name of ['draken', 'tiamat', 'tatzelworm', 'baby amphitere']) {
    const a = dragon(name), dt = 1 / 60;
    updateDragonMenace(a, dt, 0, false);
    const p = smokeOf(a);
    assert(p && p.isPoints, name);
    assert.equal(a.menace.smoke.noses.length, name === 'tiamat' ? 10 : name === 'tatzelworm' ? 1 : 2, `${name} nostrils`);
    let shown = 0, snorts = 0, huffs = 0, peak = 0, minCount = Infinity, maxCount = 0;
    for (let i = 1; i < 2400; i++) {
      const t = i * dt;
      if (t >= 30 && !a.actions.dead) a.actions.dead = true;
      const r = updateDragonMenace(a, dt, t, false, false, null);
      if (r.snort) snorts++;
      if (r.huff) huffs++;
      // a fresh wisp starts at a nostril, and smoke stays near the head and above the floor
      for (const w of a.menace.smoke.wisps) {
        for (const v of [w.x, w.y, w.z, w.vx, w.vy, w.vz]) assert(Number.isFinite(v), `${name} ${t}`);
        assert(w.y > 0 && w.y < 2.5 && Math.abs(w.x) < 2 && Math.abs(w.z) < 2, `${name} wisp ${w.x} ${w.y} ${w.z}`);
      }
      const al = alphas(a);
      for (const v of al) assert(Number.isFinite(v) && v >= 0 && v <= SMOKE_ALPHA + 1e-9);
      for (const v of p.geometry.attributes.aSize.array) assert(Number.isFinite(v) && v >= 0 && v <= SIZE1 + 1e-9);
      if (t < 30) { const n = r.smoke; minCount = Math.min(minCount, t > 5 ? n : Infinity); maxCount = Math.max(maxCount, n); if (n) shown++; peak = Math.max(peak, ...al); }
    }
    assert(shown > 1000, `${name} smokes most of the time: ${shown}`);
    assert(peak > SMOKE_ALPHA * .5, `${name} peak ${peak}`);
    assert(maxCount > minCount + 2, `${name} comes in breaths: ${minCount}..${maxCount}`);
    assert(snorts + huffs >= 1, `${name} snorted or huffed`);
    // dead ten seconds: nothing left
    assert.equal(a.menace.smoke.wisps.length, 0, name);
    assert(alphas(a).every(v => v === 0), name);
  }
});

test('a fresh wisp leaves the nostril, and smoke hangs in place when the dragon turns and walks on', () => {
  const a = dragon(), dt = 1 / 60;
  let t = 0;
  while (!a.menace?.smoke.wisps.length) updateDragonMenace(a, dt, t += dt, false);
  const w = a.menace.smoke.wisps.at(-1), nose = a.menace.smoke.noses.map(n => { const v = n.at.clone(); for (let o = n.head; o !== a.g; o = o.parent) { o.updateMatrix(); v.applyMatrix4(o.matrix); } return v; });
  assert(Math.min(...nose.map(v => Math.hypot(v.x - w.x, v.y - w.y, v.z - w.z))) < .03, 'born at a nostril');
  for (let i = 0; i < 30; i++) updateDragonMenace(a, dt, t += dt, false);
  a.g.updateMatrixWorld(true);
  const before = a.menace.smoke.wisps.map(w => new THREE.Vector3(w.x, w.y, w.z).applyMatrix4(a.g.matrixWorld));
  a.g.rotation.y += 1.1; a.g.position.x += .6; a.g.position.z -= .3;
  updateDragonMenace(a, 0, t, false);
  a.g.updateMatrixWorld(true);
  const after = a.menace.smoke.wisps.map(w => new THREE.Vector3(w.x, w.y, w.z).applyMatrix4(a.g.matrixWorld));
  assert(before.length > 0 && before.length === after.length);
  for (const [i, v] of before.entries()) assert(v.distanceTo(after[i]) < 1e-6, `${v.toArray()} ${after[i].toArray()}`);
  // a jump (a new level, a teleport) drops the old smoke
  a.g.position.x += 5;
  updateDragonMenace(a, 0, t, false);
  assert.equal(a.menace.smoke.wisps.length, 0);
});

test('dragon wings are torn, with holes cut in the membrane; feathered amphiteres are spared', () => {
  const verts = a => { let n = 0; a.wings[0].traverse(o => { if (o.isMesh && o.geometry.type === 'ShapeGeometry') n = o.geometry.attributes.position.count; }); return n; };
  assert(verts(dragon('draken')) > verts(dragon('amphitere')) + 5, 'holes add vertices (a plain outline has 27)');
});

test('a dragon head carries two long upper fangs (the merged head grows by their vertices)', () => {
  let n = 0; dragon('draken').heads[0].traverse(o => { if (o.isMesh) n += o.geometry.attributes.position.count; });
  assert(n >= 2900, `head has ${n} vertices; 2866 without the fangs`);
});

test('dragon heads carry a scar mark on the snout', () => {
  const a = dragon('red dragon'); let scar = false;
  a.heads[0].traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHexString() === '3a0e0c') scar = true; });
  assert(scar, 'scar material present on the head');
});
