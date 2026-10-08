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

test('a wielded Excalibur carries its lit shape on the blade face; a plain sword and a dagger artifact do not', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {syncHeldMagic} = await import('./weapon-magic.js');
  const THREE = await import('three');
  const socket = new THREE.Group(), hero = {weaponSocket: socket};
  const wield = item => { socket.children.slice().forEach(c => socket.remove(c)); socket.add(createHeldWeapon(item)); syncHeldMagic(hero, item, {clock: () => 0}); };
  wield({name: 'Excalibur', base: 'long sword', class: 2});
  const shape = socket.children[0].children.find(o => o.userData.magicShell && o.isMesh);
  assert.ok(shape, 'Excalibur has a lit shape');
  shape.geometry.computeBoundingBox();
  const b = shape.geometry.boundingBox;
  assert.ok(b.min.y > .1 && b.max.y < .8, 'it runs along the blade');
  assert.ok(b.min.z > .02 && b.max.z < .04, 'it sits on the +z face');
  assert.ok(Math.abs(b.min.x) < .08 && Math.abs(b.max.x) < .08, 'it stays inside the blade width');
  wield({name: 'long sword', class: 2});
  assert.equal(socket.children[0].children.filter(o => o.userData.magicShell && o.isMesh).length, 0);
});

test('a wielded Frost Brand and Fire Brand carry their lit shapes on the long-sword blade', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {syncHeldMagic} = await import('./weapon-magic.js');
  const THREE = await import('three');
  const socket = new THREE.Group(), hero = {weaponSocket: socket};
  for (const name of ['Frost Brand', 'Fire Brand']) {
    const item = {name, base: 'long sword', class: 2};
    socket.children.slice().forEach(c => socket.remove(c)); socket.add(createHeldWeapon(item)); syncHeldMagic(hero, item, {clock: () => 0});
    const shape = socket.children[0].children.find(o => o.userData.magicShell && o.isMesh);
    assert.ok(shape, name + ' has a lit shape');
    shape.geometry.computeBoundingBox();
    const b = shape.geometry.boundingBox;
    assert.ok(b.min.y > .1 && b.max.y < .8, name + ' runs along the blade');
  }
});

test('wielded Stormbringer, Dragonbane, Orcrist, Demonbane, Giantslayer and Thiefbane carry their lit shapes on the broad blade', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {syncHeldMagic} = await import('./weapon-magic.js');
  const THREE = await import('three');
  const socket = new THREE.Group(), hero = {weaponSocket: socket};
  for (const [name, base] of [['Stormbringer', 'runesword'], ['Dragonbane', 'broadsword'], ['Orcrist', 'elven broadsword'], ['Demonbane', 'long sword'], ['Giantslayer', 'long sword'], ['Thiefbane', 'long sword']]) {
    const item = {name, base, class: 2};
    socket.children.slice().forEach(c => socket.remove(c)); socket.add(createHeldWeapon(item)); syncHeldMagic(hero, item, {clock: () => 0});
    const shape = socket.children[0].children.find(o => o.userData.magicShell && o.isMesh);
    assert.ok(shape, name + ' has a lit shape');
    shape.geometry.computeBoundingBox();
    const b = shape.geometry.boundingBox;
    assert.ok(b.min.y > .1 && b.max.y < .85, name + ' runs along the blade');
    assert.ok(b.min.z > .02, name + ' sits on the +z face');
  }
});

test('a wielded Sunsword carries its lit sun disc on the long-sword blade', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {syncHeldMagic} = await import('./weapon-magic.js');
  const THREE = await import('three');
  const socket = new THREE.Group(), hero = {weaponSocket: socket};
  const item = {name: 'Sunsword', base: 'long sword', class: 2};
  socket.add(createHeldWeapon(item)); syncHeldMagic(hero, item, {clock: () => 0});
  const shape = socket.children[0].children.find(o => o.userData.magicShell && o.isMesh);
  assert.ok(shape, 'Sunsword has a lit shape');
  shape.geometry.computeBoundingBox();
  const b = shape.geometry.boundingBox;
  assert.ok(b.min.y > .1 && b.max.y < .85, 'runs along the blade');
  assert.ok(b.min.z > .02, 'sits on the +z face');
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

test('the Master Key of Thievery wears a lit halo and shaft line as one extra mesh on the iron key', () => {
  const count = m => { let n = 0; m.traverse(o => { if (o.isMesh) n++; }); return n; };
  const plain = createGroundModel({name: 'skeleton key', label: 'skeleton key', class: 6});
  const art = createGroundModel({name: 'skeleton key', label: 'the Master Key of Thievery', class: 6});
  assert.equal(art.userData.artifact, 'master key of thievery');
  assert.equal(count(art), count(plain) + 1);
  assert(art.children.at(-1).userData.magicShell);
  const w = b => new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3());
  assert(w(art).x < w(plain).x * 1.4 && w(art).y < .1);
  plain.userData.dispose(); art.userData.dispose();
});

test('the Staff of Aesculapius wears a lit serpent as the last mesh on the staff', () => {
  const art = createGroundModel({name: 'quarterstaff', label: 'the Staff of Aesculapius', class: 2});
  assert.equal(art.userData.artifact, 'staff of aesculapius');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .1 && Math.hypot(w.x, w.z) < .6);
  art.userData.dispose();
});

test('the Sceptre of Might wears a lit crown of spikes as the last mesh on the sceptre', () => {
  const art = createGroundModel({name: 'mace', label: 'the Sceptre of Might', class: 2});
  assert.equal(art.userData.artifact, 'sceptre of might');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .15 && Math.hypot(w.x, w.z) < .6);
  art.userData.dispose();
});

test('Mjollnir wears a lit bolt and binding ring as the last mesh on the hammer', () => {
  const art = createGroundModel({name: 'war hammer', label: 'Mjollnir', class: 2});
  assert.equal(art.userData.artifact, 'mjollnir');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .15 && Math.hypot(w.x, w.z) < .6);
  art.userData.dispose();
});

test('Stormbringer wears a lit jagged crack as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'runesword', label: 'Stormbringer', class: 2});
  assert.equal(art.userData.artifact, 'stormbringer');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .1 && w.x < .62 && w.z < .4);
  art.userData.dispose();
});

test('Frost Brand wears lit shards of rime along its edge as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'runesword', label: 'Frost Brand', class: 2});
  assert.equal(art.userData.artifact, 'frost brand');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .1 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Fire Brand wears lit flame tongues as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'long sword', label: 'Fire Brand', class: 2});
  assert.equal(art.userData.artifact, 'fire brand');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Sunsword wears lit disc and rays as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'long sword', label: 'Sunsword', class: 2});
  assert.equal(art.userData.artifact, 'sunsword');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Vorpal Blade wears lit edge lines and nicks as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'long sword', label: 'Vorpal Blade', class: 2});
  assert.equal(art.userData.artifact, 'vorpal blade');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Excalibur wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'long sword', label: 'Excalibur', class: 2});
  assert.equal(art.userData.artifact, 'excalibur');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Grayswandir wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'silver saber', label: 'Grayswandir', class: 2});
  assert.equal(art.userData.artifact, 'grayswandir');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Orcrist wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'elven broadsword', label: 'Orcrist', class: 2});
  assert.equal(art.userData.artifact, 'orcrist');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Sting wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'elven dagger', label: 'Sting', class: 2});
  assert.equal(art.userData.artifact, 'sting');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Dragonbane wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'broadsword', label: 'Dragonbane', class: 2});
  assert.equal(art.userData.artifact, 'dragonbane');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Demonbane wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'long sword', label: 'Demonbane', class: 2});
  assert.equal(art.userData.artifact, 'demonbane');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Werebane wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'long sword', label: 'Werebane', class: 2});
  assert.equal(art.userData.artifact, 'werebane');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Cleaver wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'battle-axe', label: 'Cleaver', class: 2});
  assert.equal(art.userData.artifact, 'cleaver');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Giantslayer wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'two-handed sword', label: 'Giantslayer', class: 2});
  assert.equal(art.userData.artifact, 'giantslayer');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Trollsbane wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'morning star', label: 'Trollsbane', class: 2});
  assert.equal(art.userData.artifact, 'trollsbane');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Magicbane wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'athame', label: 'Magicbane', class: 2});
  assert.equal(art.userData.artifact, 'magicbane');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Ogresmasher wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'war hammer', label: 'Ogresmasher', class: 2});
  assert.equal(art.userData.artifact, 'ogresmasher');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Thiefbane wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'long sword', label: 'Thiefbane', class: 2});
  assert.equal(art.userData.artifact, 'thiefbane');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Grimtooth wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'orcish dagger', label: 'Grimtooth', class: 2});
  assert.equal(art.userData.artifact, 'grimtooth');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

test('Snickersnee wears its lit shape as the last mesh on the blade', () => {
  const art = createGroundModel({name: 'katana', label: 'Snickersnee', class: 2});
  assert.equal(art.userData.artifact, 'snickersnee');
  assert(art.children.at(-1).userData.magicShell);
  const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
  assert(w.y < .12 && w.x < .62 && w.z < .45);
  art.userData.dispose();
});

for (const [name, label, key] of [['short sword', 'Luck Blade', 'luck blade'], ['tsurugi', 'Tsurugi of Muramasa', 'tsurugi of muramasa'], ['bow', 'Longbow of Diana', 'longbow of diana']]) {
  test(`${label} wears its lit shape as the last mesh on the blade`, () => {
    const art = createGroundModel({name, label, class: 2});
    assert.equal(art.userData.artifact, key);
    assert(art.children.at(-1).userData.magicShell);
    const w = new THREE.Box3().setFromObject(art).getSize(new THREE.Vector3());
    assert(w.y < .12 && w.x < .62 && w.z < .45);
    art.userData.dispose();
  });
}

test('a wielded Sting and Grimtooth carry their lit shapes on the dagger blade', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  for (const [name, label, kind] of [['elven dagger', 'Sting', 'sting'], ['orcish dagger', 'Grimtooth', 'grimtooth']]) {
    const {applyArtifactTwist} = await import('./artifact-twist.js');
    const dagger = createHeldWeapon({name, class: 2});
    applyArtifactTwist(dagger, {label, class: 2}, {clone: true, held: true});
    const shell = dagger.children.at(-1);
    assert.equal(dagger.userData.artifact, kind);
    assert(shell.userData.magicShell, kind);
    const b = new THREE.Box3().setFromObject(shell);
    assert(b.min.y > .1 && b.max.y < .36, `${kind} y ${b.min.y}..${b.max.y}`);
    assert(b.max.z < .08 && b.min.z > -.08 && b.max.x - b.min.x < .12, kind);
    assert(b.min.z > -.01, `${kind} sits on the +z face`);
  }
});

test('a wielded Magicbane carries its lit loops and motes squeezed onto the dagger blade', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {applyArtifactTwist} = await import('./artifact-twist.js');
  const dagger = createHeldWeapon({name: 'athame', class: 2});
  applyArtifactTwist(dagger, {label: 'Magicbane', class: 2}, {clone: true, held: true});
  const shell = dagger.children.at(-1);
  assert.equal(dagger.userData.artifact, 'magicbane');
  assert(shell.userData.magicShell);
  const b = new THREE.Box3().setFromObject(shell);
  assert(b.min.y > .13 && b.max.y < .34, `y ${b.min.y}..${b.max.y}`);
  assert(b.max.z < .08 && b.min.z > -.01 && b.max.x - b.min.x < .12);
});

test('a wielded Tsurugi of Muramasa carries its lit shape on the +x flat of the straight blade', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {applyArtifactTwist} = await import('./artifact-twist.js');
  const sword = createHeldWeapon({name: 'tsurugi', class: 2});
  applyArtifactTwist(sword, {label: 'Tsurugi of Muramasa', class: 2}, {clone: true, held: true});
  const shell = sword.children.at(-1);
  assert.equal(sword.userData.artifact, 'tsurugi of muramasa');
  assert(shell.userData.magicShell);
  const b = new THREE.Box3().setFromObject(shell);
  assert(b.min.y > .078 && b.max.y < 1, `y ${b.min.y}..${b.max.y}`);
  assert(b.min.x > .004 && b.max.x < .012, `sits on the +x flat ${b.min.x}..${b.max.x}`);
  assert(b.max.z < .05 && b.min.z > -.05);
});

test('a wielded Snickersnee carries its lit hairline and nicks on the +x flat of the curved katana blade', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {applyArtifactTwist} = await import('./artifact-twist.js');
  const sword = createHeldWeapon({name: 'katana', class: 2});
  applyArtifactTwist(sword, {label: 'Snickersnee', class: 2}, {clone: true, held: true});
  const shell = sword.children.at(-1);
  assert.equal(sword.userData.artifact, 'snickersnee');
  assert(shell.userData.magicShell);
  const b = new THREE.Box3().setFromObject(shell);
  assert(b.min.y > .078 && b.max.y < .86, `y ${b.min.y}..${b.max.y}`);
  assert(b.min.x > .002 && b.max.x < .01, `sits on the +x flat ${b.min.x}..${b.max.x}`);
  assert(b.max.z < .02 && b.min.z > -.03, `z ${b.min.z}..${b.max.z}`);
  // the winding is flipped with the mirrored z, so the closed shapes keep a positive signed volume (faces look outward)
  const g = shell.geometry, p = g.attributes.position, ix = g.index.array, v = i => new THREE.Vector3().fromBufferAttribute(p, ix[i]);
  let vol = 0;
  for (let i = 0; i < ix.length; i += 3) vol += v(i).dot(new THREE.Vector3().crossVectors(v(i + 1), v(i + 2)));
  assert(vol > 0, `faces look outward (${vol})`);
});

test('a wielded Grayswandir and Werebane carry their lit shapes on the +z flat of the curved silver saber', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {applyArtifactTwist} = await import('./artifact-twist.js');
  for (const label of ['Grayswandir', 'Werebane']) {
    const sword = createHeldWeapon({name: 'silver saber', class: 2});
    applyArtifactTwist(sword, {label, class: 2}, {clone: true, held: true});
    const shell = sword.children.at(-1);
    assert.equal(sword.userData.artifact, label.toLowerCase());
    assert(shell.userData.magicShell);
    const b = new THREE.Box3().setFromObject(shell);
    assert(b.min.y > .115 && b.max.y < .915, `${label} y ${b.min.y}..${b.max.y}`);
    assert(b.min.z > .0 && b.max.z < .013, `${label} sits on the +z flat ${b.min.z}..${b.max.z}`);
    assert(b.min.x > -.07 && b.max.x < .04, `${label} x ${b.min.x}..${b.max.x}`);
  }
});

test('a wielded Ogresmasher carries its lit skull-ring on the striking face of the war hammer', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {applyArtifactTwist} = await import('./artifact-twist.js');
  const hammer = createHeldWeapon({name: 'war hammer', class: 2});
  applyArtifactTwist(hammer, {label: 'Ogresmasher', class: 2}, {clone: true, held: true});
  const shell = hammer.children.at(-1);
  assert.equal(hammer.userData.artifact, 'ogresmasher');
  assert(shell.userData.magicShell);
  const b = new THREE.Box3().setFromObject(shell);
  assert(b.max.x < -.18 && b.min.x > -.2, `sits on the face cap ${b.min.x}..${b.max.x}`);
  assert(b.min.y > .4 && b.max.y < .56 && b.min.z > -.06 && b.max.z < .06, `y ${b.min.y}..${b.max.y} z ${b.min.z}..${b.max.z}`);
});

test('a wielded Cleaver carries its lit chop line along the edge of the battle-axe blade', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {applyArtifactTwist} = await import('./artifact-twist.js');
  const axe = createHeldWeapon({name: 'battle-axe', class: 2});
  applyArtifactTwist(axe, {label: 'Cleaver', class: 2}, {clone: true, held: true});
  const shell = axe.children.at(-1);
  assert.equal(axe.userData.artifact, 'cleaver');
  assert(shell.userData.magicShell);
  const b = new THREE.Box3().setFromObject(shell);
  assert(b.min.y > .29 && b.max.y < .63, `y ${b.min.y}..${b.max.y}`);
  assert(b.min.x > .02 && b.max.x < .29, `x ${b.min.x}..${b.max.x}`);
  assert(b.min.z > .015 && b.max.z < .024, `sits on the +z face ${b.min.z}..${b.max.z}`);
});

test('a wielded Trollsbane carries its lit burn-ring on the haft and its cuts on the ball of the morning star', async () => {
  const {createHeldWeapon} = await import('./equipment.js');
  const {applyArtifactTwist} = await import('./artifact-twist.js');
  const star = createHeldWeapon({name: 'morning star', class: 2});
  applyArtifactTwist(star, {label: 'Trollsbane', class: 2}, {clone: true, held: true});
  const shell = star.children.at(-1);
  assert.equal(star.userData.artifact, 'trollsbane');
  assert(shell.userData.magicShell);
  const b = new THREE.Box3().setFromObject(shell);
  assert(b.min.y > .25 && b.max.y < .7, `y ${b.min.y}..${b.max.y}`);
  assert(b.min.x > -.045 && b.max.x < .045 && b.min.z > -.045 && b.max.z < .1, `x ${b.min.x}..${b.max.x} z ${b.min.z}..${b.max.z}`);
});
