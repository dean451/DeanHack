import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const base = {lich: 16000, demilich: 16900, 'master lich': 18600, 'arch-lich': 20500};

test('liches carry a cracked skull and a snapped ear and still fit their tile', () => {
  for (const name of ['lich', 'demilich', 'master lich', 'arch-lich']) {
    const c = createCreature({name, symbol: 76, color: 1});
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c.g, true);
    assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.6, name + ' fits its tile');
    let tris = 0;
    c.g.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    assert(tris > base[name], name + ' carries the crack and the snapped ear');
  }
});
