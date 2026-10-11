import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('jabberwocks carry old chest scars and still fit their tile and the floor', () => {
  for (const name of ['jabberwock', 'vorpal jabberwock']) {
    const c = createCreature({name, symbol: 68, color: 1});
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, name + ' stands on the floor');
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, name + ' fits its tile');
    let tris = 0;
    c.g.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    assert(tris > 27420, name + ' carries the scar ridges');
  }
});
