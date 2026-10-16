import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

// The cloak used to be a flat slab (a 0.46 x 0.86 rounded box) with flat boards for flaps and collar.
test('vampires wear a draped cloth cloak, not boards: curved, folded, lined, with a torn hem', () => {
  for (const name of ['vampire', 'vampire lord', 'vampire mage', 'vlad the impaler']) {
    const a = createCreature({name, symbol: 86, color: 1});
    const capeMeshes = a.cape.children.filter(o => o.isMesh);
    assert(capeMeshes.length >= 2, `${name}: cloth and lining`);
    for (const m of capeMeshes) {
      assert.equal(m.geometry.type, 'CylinderGeometry', `${name}: draped, not a box`);
      for (const v of m.geometry.attributes.position.array) assert(Number.isFinite(v));
    }
    for (const f of a.flaps) assert(f.children.some(o => o.geometry?.type === 'CylinderGeometry'), `${name}: side panels drape too`);
    a.g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(a.cape), size = box.getSize(new THREE.Vector3());
    assert(size.z > .3, `${name}: the cloth wraps round the back (${size.z})`);
    const b = new THREE.Box3().setFromObject(a.g);
    assert(b.min.y > -.01, `${name}: the hem clears the floor (${b.min.y})`);
  }
});
