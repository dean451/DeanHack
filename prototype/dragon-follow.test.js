import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

// Every dragon form the builder knows (DRAGON_FORMS in creatures.js) and a baby; one name each.
const FORMS = ['draken', 'wyvern', 'sarkany', 'amphitere', 'lindworm', 'tatzelworm', 'guivre', 'leviathan', 'sirrush', 'tiamat', 'chromatic dragon', 'ixoth', 'baby draken'];
const ANGLE = .5;

const world = o => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
const under = (o, j) => { for (let p = o; p; p = p.parent) if (p === j) return true; return false; };
const meshes = actor => { const l = []; actor.g.traverse(o => { if (o.isMesh) l.push(o); }); return l; };
const centre = m => { m.geometry.computeBoundingBox(); return m.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(m.matrixWorld); };
// where a skinned vertex ends up, through the bones as they stand
const vertex = (m, k) => { const v = new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position, k); m.applyBoneTransform(k, v); return v.applyMatrix4(m.matrixWorld); };
const heaviest = (m, k) => { const w = m.geometry.attributes.skinWeight, i = m.geometry.attributes.skinIndex; return m.skeleton.bones[w.getX(k) >= w.getY(k) ? i.getX(k) : i.getY(k)]; };
// a chain is a run of bones from one that has no bone for a parent: neck, spine and tail (nested bones), legs (hinged bones)
const chains = actor => Object.values(actor.joints).filter(b => b.isBone && !b.parent.isBone).map(root => { const run = [root]; for (let b = root; ;) { const next = b.children.find(c => c.isBone); if (!next) break; run.push(next); b = next; } return run; });
const distToSegment = (p, a, b) => { const ab = b.clone().sub(a), u = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, u)); };

const loose = (rigid, root, pts, scale) => rigid.filter(m => { const c = centre(m); return !under(m, root) && pts.slice(1, -1).some((p, i) => distToSegment(c, p, pts[i + 2]) < .03 * scale); });

test('the check sees a loose part: a spike left on the body beside the tail is found, the same spike hung on a tail bone is not', () => {
  const a = createCreature({name: 'draken', symbol: 68}), root = a.joints.tail0;
  const run = chains(a).find(r => r[0] === root), spike = new THREE.Mesh(new THREE.ConeGeometry(.02, .06, 4), new THREE.MeshBasicMaterial());
  a.g.add(spike); spike.position.copy(a.g.worldToLocal(world(run[3])));
  a.g.updateMatrixWorld(true);
  const rigid = () => meshes(a).filter(m => !m.isSkinnedMesh), pts = run.map(world);
  assert(loose(rigid(), root, pts, a.g.scale.x).includes(spike), 'a spike on the body beside tail3 is loose');
  run[3].add(spike); spike.position.set(0, 0, 0); a.g.updateMatrixWorld(true);
  assert(!loose(rigid(), root, pts, a.g.scale.x).includes(spike), 'hung on tail3 it follows');
});

test('bend the first joint of every chain of every dragon form: what lies along the chain turns with it, nothing is left behind', () => {
  for (const name of FORMS) {
    const a = createCreature({name, symbol: 68}), scale = a.g.scale.x;
    a.g.updateMatrixWorld(true);
    const all = meshes(a), skinned = all.filter(m => m.isSkinnedMesh), rigid = all.filter(m => !m.isSkinnedMesh);
    const list = chains(a);
    assert(list.length >= 2, `${name}: ${list.length} chains`);
    for (const run of list) {
      const root = run[0], pts = run.map(world);
      // the rigid meshes whose middle lies within 3 cm of the chain beyond its first link (the first link sits in the body)
      const along = loose(rigid, root, pts, scale);
      assert.deepEqual(along.map(m => m.parent && m.parent.name), [], `${name}: ${root.name}: rigid meshes lie along the chain but are not hung on it`);
      const mine = skinned.flatMap(m => { const l = []; for (let k = 0; k < m.geometry.attributes.position.count; k++) if (under(heaviest(m, k), root)) l.push([m, k]); return l; });
      skinned.forEach(m => m.skeleton.update());
      const before = mine.map(([m, k]) => vertex(m, k));
      const turn = root.rotation.x;
      root.rotation.x = turn + ANGLE; a.g.updateMatrixWorld(true); skinned.forEach(m => m.skeleton.update());
      const after = mine.map(([m, k]) => vertex(m, k));
      const axis = new THREE.Vector3(1, 0, 0).transformDirection(root.matrixWorld), origin = world(root);
      root.rotation.x = turn; a.g.updateMatrixWorld(true); skinned.forEach(m => m.skeleton.update());
      // every vertex the skin hangs on this chain moves as far as the turn should carry it (a third of that, to allow for the blend)
      const still = before.filter((p, i) => { const r = p.clone().sub(origin), arm = r.sub(axis.clone().multiplyScalar(r.dot(axis))).length(); return arm > .04 * scale && p.distanceTo(after[i]) < ANGLE * arm / 3; });
      assert.equal(still.length, 0, `${name}: ${root.name}: ${still.length} of ${mine.length} skinned vertices stay behind`);
    }
  }
});
