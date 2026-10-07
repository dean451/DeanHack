import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundModel} from './ground-models.js';
import * as THREE from 'three';

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

test('a wielded artifact takes its glint in its own steel, not the shared material', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {syncHeldMagic} = await import('./weapon-magic.js');
  const THREE = await import('three');
  const socket = new THREE.Group(), hero = {weaponSocket: socket};
  const wield = item => { socket.children.slice().forEach(c => socket.remove(c)); socket.add(createHeldWeapon(item)); return syncHeldMagic(hero, item, {clock: () => 0}); };
  const lit = () => { let e = 0; socket.traverse(o => { if (!o.userData.magicShell && o.material?.emissive?.getHex() === 0xffe7a1) e = Math.max(e, o.material.emissiveIntensity); }); return e; };
  assert.ok(wield({name: 'Excalibur', base: 'long sword', class: 2}));
  assert.ok(lit() >= .3, 'Excalibur smoulders gold');
  assert.ok(wield({name: 'long sword', class: 2}) === null);
  assert.equal(lit(), 0, 'a plain long sword stays dull');
});

test('the great non-weapon artifacts smoulder harder than a lesser one', () => {
  const heart = createGroundModel({name: 'luckstone', label: 'the Heart of Ahriman', class: 13});
  const eye = createGroundModel({name: 'amulet of life saving', label: 'the Eye of the Aethiopica', class: AMULET});
  assert(heart && eye);
  assert(glow(heart) >= .38, 'the Heart burns hardest');
  assert(glow(eye) >= .32);
  heart.userData.dispose(); eye.userData.dispose();
});

test('the Magic Mirror wears a crown of thorns and the Express Card a lit edge, each as one mesh', () => {
  for (const [name, label] of [['magic mirror', 'the Magic Mirror of Merlin'], ['credit card', 'the Platinum Yendorian Express Card']]) {
    const plain = createGroundModel({name, label: name, class: 6}), art = createGroundModel({name, label, class: 6});
    let count = m => { let n = 0; m.traverse(o => { if (o.isMesh) n++; }); return n; };
    assert.equal(count(art), count(plain) + 1, label);
    assert(art.children.at(-1).userData.magicShell, label);
    plain.userData.dispose(); art.userData.dispose();
  }
});

test('the Iron Ball of Liberation wears a lit seam and a broken shackle as one extra mesh', () => {
  const plain = createGroundModel({name: 'heavy iron ball', label: 'heavy iron ball', class: 15}), art = createGroundModel({name: 'heavy iron ball', label: 'the Iron Ball of Liberation', class: 15});
  const count = m => { let n = 0; m.traverse(o => { if (o.isMesh) n++; }); return n; };
  assert.equal(art.userData.artifact, 'iron ball of liberation');
  assert.equal(count(art), count(plain) + 1);
  assert(art.children.at(-1).userData.magicShell);
  plain.userData.dispose(); art.userData.dispose();
});

test('the Eye of the Aethiopica wears a lit lid and the Heart of Ahriman a ring of shards, each as one extra mesh', () => {
  const count = m => { let n = 0; m.traverse(o => { if (o.isMesh) n++; }); return n; };
  for (const [name, label, cls] of [['amulet of life saving', 'the Eye of the Aethiopica', AMULET], ['luckstone', 'the Heart of Ahriman', 13]]) {
    const plain = createGroundModel({name, label: name, class: cls}), art = createGroundModel({name, label, class: cls});
    assert(art.userData.artifact, label);
    assert.equal(count(art), count(plain) + 1, label);
    assert(art.children.at(-1).userData.magicShell, label);
    plain.userData.dispose(); art.userData.dispose();
  }
});

test('the sun-, moon- and earthstones each wear one extra lit mesh', () => {
  const count = m => { let n = 0; m.traverse(o => { if (o.isMesh) n++; }); return n; };
  for (const [name, label] of [['diamond', 'the sunstone'], ['black opal', 'the moonstone'], ['sapphire', 'the earthstone']]) {
    const plain = createGroundModel({name, label: name, class: 13}), art = createGroundModel({name, label, class: 13});
    assert(art.userData.artifact, label);
    assert.equal(count(art), count(plain) + 1, label);
    assert(art.children.at(-1).userData.magicShell, label);
    plain.userData.dispose(); art.userData.dispose();
  }
});

test('the Eyes of the Overworld wear a lit ring and slit over each lens as one extra mesh', () => {
  const count = m => { let n = 0; m.traverse(o => { if (o.isMesh) n++; }); return n; };
  const plain = createGroundModel({name: 'lenses', label: 'lenses', class: 6}), art = createGroundModel({name: 'lenses', label: 'the Eyes of the Overworld', class: 6});
  assert.equal(art.userData.artifact, 'eyes of the overworld');
  assert.equal(count(art), count(plain) + 1);
  assert(art.children.at(-1).userData.magicShell);
  plain.userData.dispose(); art.userData.dispose();
});

test('the Mitre of Holiness and Itlachiayaque wear a lit shape as one extra mesh, sized to the base', () => {
  const count = m => { let n = 0; m.traverse(o => { if (o.isMesh) n++; }); return n; };
  for (const [plain, label, kind] of [['helmet', 'the Mitre of Holiness', 'mitre of holiness'], ['small shield', 'Itlachiayaque', 'itlachiayaque'], ['dwarvish roundshield', 'Itlachiayaque', 'itlachiayaque']]) {
    const base = createGroundModel({name: plain, label: plain, class: 3}), art = createGroundModel({name: plain, label, class: 3});
    assert.equal(art.userData.artifact, kind, label);
    assert.equal(count(art), count(base) + 1, label);
    assert(art.children.at(-1).userData.magicShell, label);
    const w = b => new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3());
    assert(w(art).x < w(base).x * 1.15, `${plain} shape stays near the base`);
    base.userData.dispose(); art.userData.dispose();
  }
});

test('the Orb of Fate and the palantir wear a lit shape as one extra mesh on the crystal ball', () => {
  const count = m => { let n = 0; m.traverse(o => { if (o.isMesh) n++; }); return n; };
  const plain = createGroundModel({name: 'crystal ball', label: 'crystal ball', class: 6});
  for (const [label, kind] of [['the Orb of Fate', 'orb of fate'], ['the Palantir of Westernesse', 'palantir of westernesse']]) {
    const art = createGroundModel({name: 'crystal ball', label, class: 6});
    assert.equal(art.userData.artifact, kind, label);
    assert.equal(count(art), count(plain) + 1, label);
    assert(art.children.at(-1).userData.magicShell, label);
    art.userData.dispose();
  }
  plain.userData.dispose();
});
