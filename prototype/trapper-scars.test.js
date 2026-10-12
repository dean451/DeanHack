import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

test('trappers and lurkers carry pale claw gouges and still fit their tile', () => {
  for (const name of ['trapper', 'lurker above']) {
    const c = createCreature({name, symbol: 116, color: 10});
    let tris = 0;
    c.g.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    assert(tris > 14300, name + ' carries the gouge ridges');
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(b.min.y > -0.05, name + ' lies on the floor');
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.2, name + ' fits its tile');
  }
});
