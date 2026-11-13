// Review finding 2026-11-13: the air elemental's wind streaks were 60% opaque dark hoops circling its chest and waist,
// and its chest bolt three white boxes crossed into a flat X sticker. The wind is now faint air, as on the stalker, and
// the bolt a forked seam of cold blue sunk into the trunk, its pale streaks seated in the skin.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const build = () => { const a = createCreature({name: 'air elemental', symbol: 69, color: 7}); a.g.updateMatrixWorld(true); return a; };
const meshes = o => { const out = []; o.traverse(m => { if (m.isMesh) out.push(m); }); return out; };
const trunkOf = a => a.body.children.filter(m => m.isMesh && m.geometry.type === 'CylinderGeometry');
const seamOf = a => a.body.children.filter(m => m.isMesh && m.material.emissive && m.material.emissiveIntensity >= 2 && !a.head.getObjectById(m.id));

// how far each vertex of `m` stands in front of the trunk's skin straight behind it, in model units: [most proud, deepest]
function depth(a, m) {
  const trunk = trunkOf(a), rc = new THREE.Raycaster(), p = m.geometry.attributes.position, v = new THREE.Vector3(), s = a.g.scale.x;
  let proud = -Infinity, deep = Infinity;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
    rc.set(new THREE.Vector3(v.x, v.y, 10), new THREE.Vector3(0, 0, -1));
    const hit = rc.intersectObjects(trunk)[0];
    assert(hit, 'a chest mark hangs off the side of the trunk');
    proud = Math.max(proud, (v.z - hit.point.z) / s); deep = Math.min(deep, (v.z - hit.point.z) / s);
  }
  return [proud, deep];
}

test('the wind streaks are faint short arcs, never hoops round the chest', () => {
  const a = build();
  const rings = meshes(a.g).filter(m => m.geometry.type === 'TorusGeometry');
  assert(rings.length >= 3);
  for (const r of rings) {
    assert(r.parent === a.swirl, 'a ring outside the wind');
    assert(r.material.transparent && r.material.opacity <= .15, `a solid hoop, opacity ${r.material.opacity}`);
    assert(r.geometry.parameters.arc < Math.PI, 'a streak, not a hoop');
    assert(r.geometry.parameters.tube <= .005, 'a band, not a streak');
    assert(r.material.color.getHSL({}).l > .5, 'dark wind reads as a hoop; faint air is pale');
  }
});

test('the bolt is one forked seam of cold blue sunk in the chest, not a white X on it', () => {
  const a = build();
  const seam = seamOf(a);
  assert.equal(seam.length, 1, 'one seam mesh');
  const c = seam[0].material.color.getHSL({}), e = seam[0].material.emissive.getHSL({});
  assert(c.l < .75 && e.s > .6 && e.h > .55 && e.h < .7, 'cold blue lightning, not white');
  const [proud, deep] = depth(a, seam[0]);
  assert(proud < .008, `the seam stands ${proud.toFixed(4)} proud of the skin`);
  assert(proud > 0, 'the seam breaks the surface');
  assert(deep > -.05, 'the seam stays in the chest');
  // forked: it runs down the chest, taller than it is wide
  const b = new THREE.Box3().setFromObject(seam[0]), size = b.getSize(new THREE.Vector3());
  assert(size.y > size.x, 'a seam running down, not a cross');
  assert(a.g.userData.storm);
});

test('the pale streaks on the trunk lie in its skin, no end standing off it', () => {
  const a = build();
  const streaks = a.body.children.filter(m => m.userData.streak);
  assert.equal(streaks.length, 3);
  for (const m of streaks) {
    const [proud, deep] = depth(a, m);
    assert(proud < .006 && proud > 0, `a streak stands ${proud.toFixed(4)} off the chest`);
    assert(deep > -.04);
  }
});
