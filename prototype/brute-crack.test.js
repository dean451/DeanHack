import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as M from './orc-crack.js';

const dt = 1 / 60;

test('ogres and giants expose a head, so they work the neck like orcs', () => {
  for (const [name, symbol] of [['ogre', 79], ['ogre lord', 79], ['hill giant', 72], ['ettin', 72]]) {
    const a = createCreature({name, symbol, color: 1});
    assert.ok(a.head, name + ' has a head');
    assert.ok(a.g.getObjectById(a.head.id), name + ' head is in the model');
    assert.ok(M.cracks(a), name);
  }
});

test('a standing ogre and giant crack their necks, stay in bounds and end exactly at rest', () => {
  for (const [name, symbol] of [['ogre', 79], ['hill giant', 72]]) {
    const a = createCreature({name, symbol, color: 1});
    const rest = {z: a.head.rotation.z, y: a.head.rotation.y, b: a.body.rotation.z};
    let seen = 0;
    for (let i = 0; i < 60 * 40; i++) {
      updateFidget(a, dt, i * dt, false, null);
      if (a.orcCrack?.s != null) seen++;
      assert.ok(Math.abs(a.head.rotation.z - rest.z) <= M.CANT + 1e-9, name + ' head z');
      assert.ok(Math.abs(a.head.rotation.y - rest.y) <= M.GLOWER + 1e-9, name + ' head y');
      assert.ok(Math.abs(a.body.rotation.z - rest.b) <= M.JOLT + 1e-9, name + ' body z');
    }
    assert.ok(seen > 60, name + ' moved');
    for (let i = 0; i < 120; i++) updateFidget(a, dt, i * dt, true, null);
    assert.ok(Math.abs(a.head.rotation.z - rest.z) < 1e-9 && Math.abs(a.head.rotation.y - rest.y) < 1e-9 && Math.abs(a.body.rotation.z - rest.b) < 1e-9, name + ' back at rest');
  }
});
