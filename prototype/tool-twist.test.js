import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundModel} from './ground-models.js';
import {toolTwistKind} from './tool-twist.js';

const make = name => createGroundModel({name, class: 6, color: 1});
const emissive = m => { let e = 0; m.traverse(o => { if (o.material?.emissiveIntensity > e) e = o.material.emissiveIntensity; }); return e; };

test('magic tools take their effect in the material', () => {
  for (const name of ['frost horn', 'fire horn', 'horn of plenty', 'magic harp', 'magic flute', 'magic whistle', 'bag of tricks', 'drum of earthquake', 'magic marker', 'unicorn horn']) {
    const m = make(name);
    assert.equal(m.userData.twist, name);
    assert(emissive(m) > 0, name);
    m.userData.dispose();
  }
});

test('mundane tools are left alone', () => {
  for (const name of ['tooled horn', 'wooden flute', 'tin whistle', 'drum']) {
    const m = make(name);
    assert.equal(m.userData.twist, undefined, name);
    m.userData.dispose();
  }
  assert.equal(toolTwistKind('2 frost horns'), null);
  assert.equal(toolTwistKind('a fire horn (0:5)'), 'fire horn');
});

test('the fire horn glows warmer than the frost horn', () => {
  const f = make('fire horn'), c = make('frost horn');
  const glowOf = m => { let hex = 0; m.traverse(o => { if (o.material?.emissiveIntensity > 0 && !hex) hex = o.material.emissive.getHex(); }); return hex; };
  assert((glowOf(f) >> 16) > (glowOf(c) >> 16));
  f.userData.dispose(); c.userData.dispose();
});
