import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundModel} from './ground-models.js';

test('keys lie on the floor as a small iron model, one for every key', () => {
  for (const name of ['skeleton key', 'key', 'master key']) {
    const m = createGroundModel({name, label: name, class: 6});
    assert(m, `${name} has a floor model`);
    const size = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
    assert(size.x > .2 && size.x < .5, `${name} length ${size.x}`);
    assert(size.y < .1, `${name} lies flat`);
    m.userData.dispose();
  }
});
