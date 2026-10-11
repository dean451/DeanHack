import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

// The evil glow used to be loose glowing capsules on the chest and little glowing cubes hanging in the
// air, which read as sprinkles. It is now one jagged fissure network laid on the chest, and the pool.
test('demons wear their evil glow as cracks in the chest, not sprinkles', () => {
  for (const name of ['succubus', 'incubus', 'vrock', 'bone devil', 'ice devil', 'water demon', 'horned devil', 'pit fiend', 'balrog', 'nalfeshnee']) {
    const a = createCreature({name, symbol: 38, color: 1});
    a.g.updateMatrixWorld(true);
    const glows = [];
    a.g.traverse(o => { if (o.isMesh && o.material.name === 'evil-glow') glows.push(o); });
    assert(glows.length <= 2, `${name}: ${glows.length} glow meshes (cracks and the pool)`);
    assert(!glows.some(o => o.geometry.type === 'RoundedBoxGeometry'), `${name}: no glowing capsules or cubes`);
    const cracks = glows.map(o => new THREE.Box3().setFromObject(o)).find(b => b.max.y > .2);
    assert(cracks, `${name} has its chest fissure`);
    const size = cracks.getSize(new THREE.Vector3());
    assert(size.y > size.x * .8, `${name}: the fissure runs down the chest`);
    for (const o of glows) for (const v of o.geometry.attributes.position.array) assert(Number.isFinite(v));
  }
});
