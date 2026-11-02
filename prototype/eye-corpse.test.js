import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createCorpse} from './corpse.js';
import {motePose, MOTES} from './eye-corpse.js';
import {liveSource} from './live-source.js';

const factory = {creatureFactory: createCreature, symbol: 'e'.charCodeAt(0)};
const parts = g => { const out = {}; g.traverse(o => { if (o.isMesh) out[o.userData.part] = o; }); return out; };

test('the floating eye leaves a burst eye of its own, iris up, not its live model tipped over', () => {
  const c = createCorpse('floating eye', 4, 0, factory), p = parts(c);
  for (const need of ['corpse', 'iris', 'pupil', 'pool', 'halo', 'motes']) assert(p[need], need);
  assert.equal(c.userData.plan, 'eye');
  assert.equal(c.userData.lie, 'burst');
  c.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(p.corpse), size = b.getSize(new THREE.Vector3());
  assert(b.min.y > -.005 && b.min.y < .01, `rests on the floor (${b.min.y})`);
  assert(size.y < .1, `deflated, ${size.y} tall`);
  assert(Math.max(size.x, size.z) < .8, 'inside its tile');
  // The iris lies on top of the slumped skin and faces up, so the top-down camera sees it.
  const iris = new THREE.Box3().setFromObject(p.iris);
  assert(iris.max.y >= b.max.y - .02, 'the iris is on top');
  const n = p.iris.geometry.attributes.normal; let up = 0;
  for (let i = 0; i < n.count; i++) up += n.getY(i);
  assert(up / n.count > .8, 'the iris faces up');
  // It is not the live model: no ball, no glance pivot.
  assert(!p.ball);
  c.userData.dispose();
});

test('it reads differently from every other corpse: a glowing halo, a lit iris and rising motes', () => {
  const c = createCorpse('floating eye', 4, 0, factory), p = parts(c);
  assert.equal(p.halo.material.blending, THREE.AdditiveBlending);
  assert.equal(p.halo.material.depthWrite, false);
  assert(p.iris.material.emissiveIntensity > 0);
  let lights = 0; c.traverse(o => { if (o.isLight) lights++; });
  assert.equal(lights, 0, 'no real lights');
  for (const name of ['jackal', 'newt', 'lichen', 'acid blob', 'giant ant', 'human', 'gas spore', 'evil eye']) {
    const other = createCorpse(name, 4, 0, {creatureFactory: createCreature});
    let glow = false; other.traverse(o => { if (o.isMesh && (o.material.blending === THREE.AdditiveBlending || o.userData.part === 'halo')) glow = true; });
    assert(!glow, `${name} has a halo too`);
    assert.notEqual(other.userData.plan, 'eye', name);
    other.userData.dispose();
  }
  c.userData.dispose();
});

test('the halo breathes and the motes rise and fade, all through userData.fx', () => {
  const c = createCorpse('floating eye', 4, 0, factory), p = parts(c), fx = c.userData.fx;
  assert.equal(typeof fx.userData.update, 'function');
  const seen = new Set();
  for (let t = 0; t < 6; t += .25) { fx.userData.update(t); seen.add(p.halo.material.opacity.toFixed(2)); }
  assert(seen.size > 5, 'the halo pulses');
  for (const o of seen) assert(+o > .1 && +o < .7, `halo opacity ${o}`);
  assert.equal(p.motes.count, MOTES);
  assert(MOTES <= 8, 'a few motes, not a particle system');
  for (let i = 0; i < MOTES; i++) {
    let lo = Infinity, hi = -Infinity;
    for (let t = 0; t < 8; t += .1) { const {pos, scale} = motePose(i, t); lo = Math.min(lo, pos.y); hi = Math.max(hi, pos.y); assert(scale >= 0 && scale < 1.4); }
    assert(hi - lo > .15 && hi < .4, `mote ${i} rises from ${lo} to ${hi}`);
  }
  c.userData.dispose();
});

test('the eye corpse stays inside the floor-item mesh and material caps and shares its geometry', () => {
  const a = createCorpse('floating eye', 4, 0, factory), b = createCorpse('floating eye', 4, 40, factory);
  const meshes = [], materials = new Set();
  a.traverse(o => { if (o.isMesh) { meshes.push(o); materials.add(o.material); } });
  assert(meshes.length <= 8, `${meshes.length} meshes`);
  assert(materials.size <= 8, `${materials.size} materials`);
  assert.equal(parts(a).corpse.geometry, parts(b).corpse.geometry, 'geometry is built once');
  a.userData.dispose(); b.userData.dispose();
});

test('the live scene animates the eye corpse from its ground-items loop', async () => {
  const live = liveSource();
  assert.match(live, /icon\.userData\.corpseFx=corpse\.userData\.fx/);
  assert.match(live, /item\.userData\.corpseFx\?\.userData\.update\(t\)/);
});
