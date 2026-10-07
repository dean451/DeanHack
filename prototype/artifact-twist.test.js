import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundModel} from './ground-models.js';

const AMULET = 5;
const glow = m => { let e = 0; m.traverse(o => { if (o.material?.emissiveIntensity > e) e = o.material.emissiveIntensity; }); return e; };
const hexOf = m => { let hex = 0; m.traverse(o => { if (o.material?.emissiveIntensity > 0 && !hex) hex = o.material.emissive.getHex(); }); return hex; };

test('a floor artifact glows in its own colour', () => {
  const s = createGroundModel({name: 'amulet of life saving', label: 'the Eye of the Aethiopica', class: AMULET});
  assert.equal(s.userData.artifact, 'eye of the aethiopica');
  assert(glow(s) > 0);
  assert.equal(hexOf(s), 0xd0e8ff);
  s.userData.dispose();
});

test('plain and forged names are left alone', () => {
  for (const label of ['amulet of life saving', 'circular amulet named Hope']) {
    const m = createGroundModel({name: 'amulet of life saving', label, class: AMULET});
    assert.equal(m.userData.artifact, undefined, label);
    m.userData.dispose();
  }
});

test('artifact weapons lie on the floor as a weapon, tinted by their glint', () => {
  const WEAPON = 2;
  for (const [label, hex] of [['Excalibur', 0xffe7a1], ['Mjollnir', 0xa8d4ff], ['the Staff of Aesculapius', 0xb8ffcf], ['Sting', null]]) {
    const m = createGroundModel({name: 'long sword', label: label === 'Sting' ? 'elven dagger named Sting' : label, class: WEAPON});
    assert(m, label);
    assert(m.userData.artifact, label);
    assert(glow(m) > 0, label);
    if (hex) assert.equal(hexOf(m), hex, label);
    m.userData.dispose();
  }
  assert.equal(createGroundModel({name: 'long sword', label: 'long sword', class: WEAPON}), null);
});
