import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {growHull, pieceField, HULL} from './feline-hull.js';
import {felineBuild} from './feline.js';
import {createSkinnedFeline} from './feline-skin.js';

const catParts = name => {
  const {S, L} = felineBuild(name);
  const headM = new THREE.Matrix4().compose(new THREE.Vector3(...L.neck), new THREE.Quaternion(), new THREE.Vector3().setScalar(L.headSize || 1));
  const parts = [{group: 'body', M: null, pieces: S.body.userData.pieces}, {group: 'head', M: headM, pieces: S.head.userData.pieces}, {group: 'tail', M: new THREE.Matrix4().makeTranslation(0, L.Y + .05, -.29), pieces: S.tail.userData.pieces}];
  for (const side of [-1, 1]) for (const fore of [false, true]) { const [rx, ry, rz] = fore ? L.shoulder : L.hip; parts.push({group: (side < 0 ? 'l' : 'r') + (fore ? 'fore' : 'hind'), M: new THREE.Matrix4().makeTranslation(side * rx, ry, rz).multiply(new THREE.Matrix4().makeScale(side, 1, 1)), pieces: (fore ? S.fore : S.hind).userData.pieces}); }
  return {parts, S, L};
};

test('a piece becomes a signed distance in its own frame: negative inside, zero on the surface, scaled and placed', () => {
  const rec = {type: 'SphereGeometry', parameters: {radius: .1}, matrix: new THREE.Matrix4().compose(new THREE.Vector3(1, 2, 3), new THREE.Quaternion(), new THREE.Vector3(2, 1, 1)), colour: [1, 0, 0]};
  const f = pieceField(rec, null);
  assert.ok(Math.abs(f.sdf(new THREE.Vector3(1, 2, 3)) + .1) < 1e-9, 'the centre is a radius deep');
  assert.ok(Math.abs(f.sdf(new THREE.Vector3(1.2, 2, 3))) < 1e-9, 'the stretched side is on the surface');
  assert.ok(Math.abs(f.sdf(new THREE.Vector3(1, 2.1, 3))) < 1e-9, 'and the unstretched one');
  assert.ok(f.sdf(new THREE.Vector3(1, 2.5, 3)) > .3, 'outside is positive');
  assert.deepEqual(f.colourAt(new THREE.Vector3()), [1, 0, 0]);
  const cyl = pieceField({type: 'CylinderGeometry', parameters: {radiusTop: .02, radiusBottom: .02, height: .2}, matrix: null, colour: [0, 1, 0]}, null);
  assert.ok(cyl.sdf(new THREE.Vector3(0, 0, 0)) < 0 && Math.abs(cyl.sdf(new THREE.Vector3(.02, 0, 0))) < 1e-9 && Math.abs(cyl.sdf(new THREE.Vector3(0, .1, 0))) < 1e-9);
  // the shaped torso: a radius per direction, smooth between bins
  const {S} = felineBuild('kitten'), torso = S.body.userData.pieces.find(r => r.type === 'shaped');
  assert.ok(torso && torso.positions.length > 3000, 'the torso is recorded by its points');
  const t = pieceField(torso, null), c = new THREE.Vector3(); for (let i = 0; i < torso.positions.length; i += 3) c.add(new THREE.Vector3(torso.positions[i], torso.positions[i + 1], torso.positions[i + 2])); c.divideScalar(torso.positions.length / 3);
  assert.ok(t.sdf(c) < -.05, 'deep inside at the centre');
  let onSurface = 0; for (let i = 0; i < 300; i++) { const k = (i * 97) % (torso.positions.length / 3); if (Math.abs(t.sdf(new THREE.Vector3(torso.positions[k * 3], torso.positions[k * 3 + 1], torso.positions[k * 3 + 2]))) < .012) onSurface++; }
  assert.ok(onSurface > 240, `${onSurface}/300 of its own points sit on the surface`);
});

test('the kitten grows one welded, painted, weighted skin, with the thin pieces kept apart and the fur tufts left to the paint', () => {
  const {parts, S} = catParts('kitten');
  const weigh = (group, x, y, z) => [[group === 'head' ? 1 : 0, 1]];
  const r = growHull(parts, {res: 48, weigh});
  const g = r.geometry;
  assert.ok(g.index && g.attributes.position.count > 2000 && g.attributes.position.count < g.index.count / 3, 'welded: shared vertices, far fewer than triangle corners');
  assert.ok(g.attributes.normal && g.attributes.color && g.attributes.skinIndex && g.attributes.skinWeight);
  const col = g.attributes.color, w = g.attributes.skinWeight;
  for (let i = 0; i < col.count; i += 97) { for (const k of [0, 1, 2]) assert.ok(col.getComponent(i, k) >= 0 && col.getComponent(i, k) <= 1); assert.ok(Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-4); }
  const groups = new Set(g.userData.groups); for (const name of ['body', 'head', 'tail', 'lfore', 'rhind']) assert.ok(groups.has(name), `${name} vertices`);
  const box = new THREE.Box3().setFromBufferAttribute(g.attributes.position);
  assert.ok(box.min.y > -.03 && box.min.y < .02, `stands on the floor: ${box.min.y}`);
  assert.ok(r.details && r.details.attributes.color && r.details.attributes.skinWeight, 'whiskers, pupils and claws are their own geometry');
  assert.ok(r.thin >= 8 && r.thin < 60, `${r.thin} thin pieces`);
  const tufts = S.body.userData.pieces.filter(p => p.type === 'ConeGeometry' && p.parameters.height < .025).length;
  assert.ok(tufts > 0 && r.pieces + r.thin <= parts.reduce((n, p) => n + p.pieces.length, 0) - tufts, 'the squat tuft cones are not in the field');
  assert.ok(r.ms < 4000, `built in ${r.ms.toFixed(0)} ms at res 48`);
});

test('the skinned cat wears the hull by default, shares it between cats of a look, and can still be built from its parts', () => {
  const a = createSkinnedFeline('kitten'), b = createSkinnedFeline('kitten'), parts = createSkinnedFeline('kitten', undefined, {hull: false});
  assert.equal(a.fur.geometry, b.fur.geometry, 'grown once per look');
  assert.ok(a.details?.isSkinnedMesh && a.details.skeleton === a.fur.skeleton, 'the details ride the same skeleton');
  assert.ok(a.fur.geometry.index && !parts.fur.geometry.index, 'the hull is welded, the parts are not');
  assert.ok(!parts.details);
  const ha = new THREE.Box3().setFromObject(a.g, true), hp = new THREE.Box3().setFromObject(parts.g, true);
  assert.ok(ha.getSize(new THREE.Vector3()).distanceTo(hp.getSize(new THREE.Vector3())) < .08, 'the same cat, within a whisker');
});
