import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {birdPoser} from './cockatrice-rest.js';
import {HALT_POSES} from './kop-halt-poses.js';
import {PALM} from './kop-glove.js';

// Review finding 2026-11-15: the halt throws the left arm out at the hero, and its glove was one white sphere. It is now
// an open, flat glove with a thumb and four fingers on the wrist bone `lfore_2`, turned so that in each Kop's baked
// halt (the pose the game plays) the palm faces the hero and the fingers point up.
const NAMES = ['keystone kop', 'kop sergeant', 'kop lieutenant', 'kop kaptain'];
const build = n => { const a = createCreature({name: n, symbol: 75, color: 4}); a.g.updateMatrixWorld(true); return a; };
const gloveOf = a => { let m = null; a.joints.lfore_2.traverse(o => { if (o.name === 'KopGloveHand') m = o; }); return m; };
// the glove's own axis (its frame: palm +z, fingers +y, thumb +x) in the model's frame
const axis = (a, m, v) => {
  a.g.updateMatrixWorld(true);
  const q = a.g.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(m.getWorldQuaternion(new THREE.Quaternion()));
  return new THREE.Vector3(...v).applyQuaternion(q);
};
// the vertices of one named group of the glove's geometry, in the glove's frame
const groupVerts = (geo, i) => {
  const {start, count} = geo.groups[i], p = geo.attributes.position, out = [];
  for (let k = start; k < start + count; k++) out.push(new THREE.Vector3().fromBufferAttribute(p, geo.index ? geo.index.getX(k) : k));
  return out;
};

test('the left glove is no longer one sphere: a palm, four fingers and a thumb on lfore_2', () => {
  for (const n of NAMES) {
    const a = build(n), m = gloveOf(a);
    assert(m, `${n}: an open glove rides lfore_2`);
    assert(!(m.geometry instanceof THREE.SphereGeometry), `${n}: not a sphere`);
    let spheres = 0; a.joints.lfore_2.traverse(o => { if (o.isMesh && o.geometry.type === 'SphereGeometry') spheres++; });
    assert.equal(spheres, 0, `${n}: no ball left on the wrist`);
    const parts = m.geometry.userData.parts;
    assert.equal(m.geometry.groups.length, parts.length, `${n}: one geometry group per named part`);
    const digits = parts.filter(p => p === 'finger' || p === 'thumb');
    assert(digits.length >= 5, `${n}: ${digits.length} finger or thumb parts`);
    assert.equal(parts.filter(p => p === 'thumb').length, 1, `${n}: one thumb`);
    // each digit is a real piece reaching off the palm: a finger past its top, the thumb out past its side
    const top = .016 + PALM.h;
    parts.forEach((p, i) => {
      const v = groupVerts(m.geometry, i);
      if (p === 'finger') assert(Math.max(...v.map(u => u.y)) > top + .03, `${n}: finger ${i} stands past the palm`);
      if (p === 'thumb') assert(Math.max(...v.map(u => u.x)) > PALM.w / 2 + .015, `${n}: the thumb sticks out the side`);
    });
    // flat, not a ball: past the cuff (y above .03), much wider and taller than it is thick
    const box = new THREE.Box3(), pos = m.geometry.attributes.position, u = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) { u.fromBufferAttribute(pos, k); if (u.y > .03) box.expandByPoint(u); }
    const s = box.getSize(new THREE.Vector3());
    assert(s.x > 2 * s.z && s.y > 3 * s.z, `${n}: an open flat hand (${s.toArray().map(x => x.toFixed(3))})`);
  }
});

test('in each Kop\'s baked halt the palm faces the hero (+z) and the fingers point up, thumb toward the middle', () => {
  for (const n of NAMES) {
    const a = build(n), m = gloveOf(a), {apply} = birdPoser(a);
    apply(HALT_POSES[n].pose);
    const palm = axis(a, m, [0, 0, 1]), up = axis(a, m, [0, 1, 0]), thumb = axis(a, m, [1, 0, 0]);
    assert(palm.z > .95, `${n}: palm faces ahead (${palm.toArray().map(x => x.toFixed(2))})`);
    assert(up.y > .95, `${n}: fingers up (${up.toArray().map(x => x.toFixed(2))})`);
    // the left hand is at -x, so the middle is +x
    assert(thumb.x > .95, `${n}: thumb toward the body's middle`);
    const wrist = a.joints.lfore_2.getWorldPosition(new THREE.Vector3()), box = new THREE.Box3().setFromObject(m);
    assert(box.max.y > wrist.y + .08 * a.g.scale.x, `${n}: the hand stands up off the wrist`);
    apply({});
  }
});

test('turning the glove leaves the Kop at rest exactly as built, and the glove rides the wrist', () => {
  for (const n of NAMES) {
    const a = build(n);
    for (const o of Object.values(a.joints)) assert.deepEqual(o.rotation.toArray().slice(0, 3), [0, 0, 0], `${n} ${o.name}: built rotation untouched`);
    const m = gloveOf(a), before = new THREE.Box3().setFromObject(m);
    a.joints.lfore_1.rotation.z += .6; a.g.updateMatrixWorld(true);
    const after = new THREE.Box3().setFromObject(m);
    assert(after.getCenter(new THREE.Vector3()).distanceTo(before.getCenter(new THREE.Vector3())) > .02, `${n}: bending the elbow carries the glove`);
  }
});
