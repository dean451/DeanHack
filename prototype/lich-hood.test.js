// Review finding 2026-11-16: the lich's hood was a smooth sphere, the lead shape of the stoop in play. It is now a
// faceted, peaked cowl (lich-hood.js), seated on the robe's shoulders, the skull in its opening.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {COWL, PEAK, cowlRim} from './lich-hood.js';
import {surfaceGap} from './fit-check.js';
import {birdPoser} from './cockatrice-rest.js';
import {REST_POSES} from './lich-rest-poses.js';

const MEMBERS = [['lich', 2], ['demilich', 1], ['master lich', 5], ['arch-lich', 6]];
const make = ([name, color]) => { const a = createCreature({name, symbol: 76, color}); a.g.updateMatrixWorld(true); return a; };
const hoodOf = a => { let h = null; a.g.traverse(o => { if (!h && o.isMesh && o.name === 'hood') h = o; }); return h; };
const robeOf = a => { let r = null; a.g.traverse(o => { if (!r && o.isSkinnedMesh && o.material.vertexColors && o.skeleton.bones.includes(a.joints.hips)) r = o; }); return r; };
// the skull's centre (creatures.js: the cranium at .13 over the head's pivot and .04 ahead), in the hood's space
const skullIn = (a, hood) => { a.g.updateMatrixWorld(true); return hood.worldToLocal(a.joints.head.localToWorld(new THREE.Vector3(0, .13, .04))); };
// inside the cowl's shell at the point's height: the rings' ellipses, interpolated between the two either side
function inside(p) {
  const k = COWL.findIndex((r, i) => i + 1 < COWL.length && r[0] <= p.y && COWL[i + 1][0] >= p.y);
  if (k < 0) return false;
  const [y0, ...a] = COWL[k], [y1, ...b] = COWL[k + 1], t = (p.y - y0) / (y1 - y0), [rx, rz, cz] = a.map((v, i) => v + (b[i] - v) * t);
  return (p.x / rx) ** 2 + ((p.z - cz) / rz) ** 2 < 1;
}

test('no lich wears a sphere for a hood: a faceted cowl, peaked behind the skull', () => {
  for (const m of MEMBERS) { const a = make(m), hood = hoodOf(a);
    assert(hood, `${m[0]}: a hood`);
    hood.traverse(o => assert(!(o.geometry instanceof THREE.SphereGeometry), `${m[0]}: a sphere in the hood`));
    assert(hood.material.flatShading, `${m[0]}: flat shaded facets`);
    const box = new THREE.Box3().setFromBufferAttribute(hood.geometry.attributes.position);
    assert(Math.abs(box.max.y - PEAK[1]) < 1e-6 && PEAK[2] < -.15, `${m[0]}: the peak is the top, raked back`);
    // the rings are seven-sided, not a smooth surface of revolution
    assert(hood.geometry.attributes.position.count < 300, `${m[0]}: ${hood.geometry.attributes.position.count} vertices`); }
  assert(COWL.slice(1).every((r, i) => r[4] <= COWL[i][4]), 'the opening narrows toward the brow');
  assert(COWL.at(-1)[4] === 0 && COWL[0][4] > .8, 'open over the face, closed at the top');
});

test('the cowl is seated: its rim lies on the robe within 1.5 cm', () => {
  for (const m of MEMBERS) { const a = make(m), hood = hoodOf(a), robe = robeOf(a);
    assert(robe, `${m[0]}: the robe's hide`);
    // the rim as its own mesh on the hood's frame, so surfaceGap measures only the rim's points
    const rim = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(cowlRim()));
    hood.add(rim);
    // and the robe's own surface alone (its skeleton, and the hood on it, hang under the hide; the bind pose is the built pose)
    const shell = new THREE.Mesh(robe.geometry); shell.matrixAutoUpdate = false; shell.matrix.copy(robe.matrixWorld);
    const gap = surfaceGap(rim, shell); hood.remove(rim);
    assert(gap < .015, `${m[0]}: the rim ${(gap * 100).toFixed(1)} cm off the robe`); }
});

test('the skull sits in the cowl\'s opening, standing and in the baked stoop', () => {
  for (const m of MEMBERS) { const a = make(m), hood = hoodOf(a);
    const at = skullIn(a, hood);
    assert(inside(at), `${m[0]}: the skull's centre out of the cowl standing (${at.toArray().map(v => v.toFixed(3))})`);
    const baked = REST_POSES[m[0]];
    assert(baked?.ok, `${m[0]}: a baked stoop`);
    birdPoser(a).apply(baked.pose);
    const bent = skullIn(a, hood);
    assert(inside(bent), `${m[0]}: the skull's centre out of the cowl in the stoop (${bent.toArray().map(v => v.toFixed(3))})`);
    // the face still looks out of the opening: the eyes are ahead of the cowl's front at their height
    const eye = hood.worldToLocal(a.joints.head.localToWorld(new THREE.Vector3(.06, .13, .18)));
    assert(!inside(eye) || eye.z > .1, `${m[0]}: the eyes buried in the cowl`); }
});
