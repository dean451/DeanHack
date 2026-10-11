import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('mind flayers wear torn robe hems and stay on the floor and inside their tile', () => {
  for (const name of ['mind flayer', 'master mind flayer']) {
    const c = createCreature({name, symbol: 104, color: 5});
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, name + ' stands on the floor');
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 0.9, name + ' fits its tile');
    let tris = 0;
    c.g.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    assert(tris > 12200, name + ' carries the extra hem detail');
  }
});
