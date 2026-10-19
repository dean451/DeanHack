import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {roundCone, ellipsoid, trunkField, sculptFeline, EYE, TRUNK} from './feline-sculpt.js';
import {felineBuild} from './feline.js';
import {createSkinnedFeline} from './feline-skin.js';

test('the distance pieces: negative inside, zero on the surface, about the distance outside', () => {
  const c = roundCone([0, 0, 0], [0, 1, 0], .2, .1);
  assert.ok(c(0, 0, 0) < 0 && Math.abs(c(.2, 0, 0)) < 1e-9 && Math.abs(c(0, 1.1, 0)) < 1e-9 && Math.abs(c(.5, .5, 0) - (.5 - .15)) < .01);
  const e = ellipsoid([1, 0, 0], [.3, .1, .2]);
  assert.ok(e(1, 0, 0) < 0 && Math.abs(e(1.3, 0, 0)) < 1e-6 && Math.abs(e(1, .1, 0)) < 1e-6 && Math.abs(e(1.5, 0, 0) - .2) < .01);
  const t = trunkField(.3);
  assert.ok(t(0, .3, 0) < 0 && t(0, .3, TRUNK.rear - .01) > 0 && t(0, .3, TRUNK.front + .01) > 0 && t(.2, .3, 0) > 0, 'the trunk ends where it says');
});

// The head's own field (head space), with its joins and the eye dishes.
function headField() {
  const {L} = felineBuild('kitten'), {parts} = sculptFeline(L, {tail: [[0, .3, -.29], [0, .4, -.35]], headM: new THREE.Matrix4()});
  const pieces = parts.find(p => p.group === 'head').pieces.filter(p => p.type === 'sdf');
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
  return (x, y, z) => { let d = 1; for (const p of pieces) d = p.cut ? -smin(-d, p.field(x, y, z), p.blend) : smin(d, p.field(x, y, z), p.blend); return d; };
}

test('the head is a cat\'s wedge, not a ball: the forehead slopes from the crown to the nose, the face narrows to the muzzle, and the eyes sit in it', () => {
  const f = headField(), top = z => { for (let y = .2; y > -.15; y -= .0005) if (f(0, y, z) < 0) return y; return -1; };
  const front = (x, y) => { for (let z = .25; z > -.1; z -= .0005) if (f(x, y, z) < 0) return z; return -1; };
  const half = (y, from = -.04) => { let best = 0; for (let z = from; z < .15; z += .005) for (let x = .15; x > 0; x -= .001) if (f(x, y, z) < 0) { best = Math.max(best, x); break; } return best; };
  const crown = top(.03), brow = top(.1), nose = top(.13);
  assert.ok(crown - brow > .025 && brow - nose > .02, `forehead slopes: crown ${crown.toFixed(3)}, brow ${brow.toFixed(3)}, nose bridge ${nose.toFixed(3)}`);
  const cheeks = half(-.005), muzzle = half(-.025, .11), brows = half(.06);
  assert.ok(cheeks > brows && cheeks > muzzle * 1.5, `widest at the cheeks: ${cheeks.toFixed(3)} vs the brow ${brows.toFixed(3)} and the muzzle in front ${muzzle.toFixed(3)}`);
  const face = front(EYE.x, EYE.y), proud = EYE.z + EYE.r[2] - face;
  assert.ok(proud > 0 && proud < .015, `the eye stands ${proud.toFixed(3)} proud of the face`);
});

test('the sculpted pet: one skin over the same skeleton, on the floor, a tail about two thirds its length, and no tear where the parts meet', () => {
  for (const name of ['kitten', 'housecat', 'large cat']) {
    const t0 = performance.now(), a = createSkinnedFeline(name, undefined, {sculpt: true}), ms = performance.now() - t0;
    const skinned = []; a.g.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
    assert.equal(skinned.length, 3, `${name}: fur, details (whiskers, pupils, ears), eyes`);
    assert.ok(skinned.every(m => m.skeleton === skinned[0].skeleton) && skinned[0].skeleton.bones.length === 24, 'the rig the gait drives');
    for (const m of skinned) { const w = m.geometry.attributes.skinWeight; for (let i = 0; i < w.count; i += 7) assert.ok(Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-4); }
    a.g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(a.g, true);
    assert.ok(Math.abs(box.min.y) < .02, `${name} stands on the floor: ${box.min.y.toFixed(3)}`);
    assert.ok(ms < 8000, `${name} grown in ${ms.toFixed(0)} ms`);
    if (name !== 'kitten') continue;
    // proportions in body units: head and body from the nose to the rump, the tail along its curve
    const g = a.fur.geometry; g.computeBoundingBox();
    const {tailCurve} = felineBuild(name); let tail = 0; for (let i = 1; i < tailCurve.length; i++) tail += Math.hypot(...tailCurve[i].map((v, k) => v - tailCurve[i - 1][k]));
    const ratio = tail / (g.boundingBox.max.z - TRUNK.rear);
    assert.ok(ratio > .5 && ratio < .8, `tail ${ratio.toFixed(2)} of head and body`);
    // across every edge of the skin, the bone weights change gradually except along the tail's own joints
    const idx = g.index.array, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, names = a.fur.skeleton.bones.map(b => b.name);
    const vec = i => { const m = new Map(); for (let c = 0; c < 4; c++) m.set(si.getComponent(i, c), (m.get(si.getComponent(i, c)) || 0) + sw.getComponent(i, c)); return m; };
    const jump = (p, q) => { const a = vec(p), b = vec(q); let d = 0; for (const k of new Set([...a.keys(), ...b.keys()])) d += Math.abs((a.get(k) || 0) - (b.get(k) || 0)); return d; };
    let tears = 0;
    for (let i = 0; i < idx.length; i += 3) for (const [p, q] of [[idx[i], idx[i + 1]], [idx[i + 1], idx[i + 2]], [idx[i + 2], idx[i]]]) if (jump(p, q) > 1.2 && !(names[si.getX(p)].startsWith('tail') && names[si.getX(q)].startsWith('tail'))) tears++;
    assert.equal(tears, 0, 'no edge hands its skin from one part to another at once');
  }
});
