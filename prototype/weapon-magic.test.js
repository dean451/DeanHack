import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeldWeapon} from './equipment.js';
import {weaponMagic, enchantTheme, particleAt, THEMES, createMagicFx, shellPulse, syncHeldMagic, syncFloorMagic} from './weapon-magic.js';

const W = 2;

test('magic shows only what the hero knows', () => {
  assert.equal(weaponMagic({name: 'long sword', class: W}), null, 'unknown enchantment: plain');
  assert.equal(weaponMagic({name: 'long sword', class: W, buc: 'uncursed', spe: 0}), null);
  assert.equal(weaponMagic({name: 'long sword', class: W, spe: 3}).kind, 'enchant');
  assert.equal(weaponMagic({name: 'long sword', class: W, spe: -2}).kind, 'enchant');
  assert.equal(weaponMagic({name: 'long sword', class: W, spe: 0, buc: 'blessed'}).kind, 'enchant');
  assert.equal(weaponMagic({name: 'potion', class: 8, spe: 3}), null);
  const ex = weaponMagic({name: 'Excalibur', class: W, base: 'long sword'});
  assert.deepEqual([ex.kind, ex.key], ['artifact', 'excalibur']);
  assert.equal(ex.theme, THEMES.excalibur);
  assert.equal(weaponMagic({name: 'Cleaver', class: W}).kind, 'artifact', 'artifacts without a signature still glow');
  assert.equal(weaponMagic({label: 'Fire Brand', class: W}, {floor: true}).key, 'fire brand');
  // a player-written Sting on the wrong base is just a dagger
  assert.equal(weaponMagic({label: 'orcish dagger named Sting', class: W}, {floor: true}), null);
  // more enchantment, more glow; cursed and blessed change colour
  assert.ok(enchantTheme(5).glow > enchantTheme(1).glow);
  assert.notEqual(enchantTheme(3, 'blessed').shell, enchantTheme(3, 'cursed').shell);
  assert.equal(enchantTheme(2).trail != null, true);
  assert.equal(enchantTheme(1).trail, null);
});

test('every particle motion stays finite and near the blade', () => {
  const layers = [...Object.values(THEMES).flatMap(t => t.layers), ...[-3, 1, 3, 7].flatMap(s => enchantTheme(s, 'blessed').layers)];
  for (const layer of layers) for (let k = 0; k < 6; k++) {
    const seed = [k / 6, (k * 7 % 6) / 6, (k * 5 % 6) / 6, (k * 3 % 6) / 6];
    for (let t = 0; t < 12; t += .037) {
      const q = particleAt(layer, seed, t, .1, .9, .05);
      for (const v of Object.values(q)) assert.ok(Number.isFinite(v), `${layer.motion} finite`);
      assert.ok(Math.hypot(q.x, q.z) < .45 && q.y > -.6 && q.y < 1.4, `${layer.motion} in bounds`);
      assert.ok(q.alpha >= -1e-9 && q.alpha <= 1 + 1e-9);
    }
  }
  for (const theme of Object.values(THEMES)) for (let t = 0; t < 5; t += .05) { const s = shellPulse(theme, t); assert.ok(s > 0 && s <= 1.01); }
});

test('the held effect lights the steel and gives it back on dispose', () => {
  const sword = createHeldWeapon({name: 'long sword'});
  const steel = sword.children.find(m => m.material.metalness >= .75).material, was = steel.emissive.getHex();
  const fx = createMagicFx(weaponMagic({name: 'Fire Brand', class: W}), sword, {y0: .13, y1: .9, w: .06});
  assert.ok(fx.userData.shell.count > 0);
  fx.userData.update(1.3);
  assert.ok(steel.emissiveIntensity > 0 && steel.emissive.getHex() !== was);
  fx.traverse(o => { if (o.isPoints) for (const v of o.geometry.attributes.position.array) assert.ok(Number.isFinite(v)); });
  fx.userData.dispose();
  assert.equal(steel.emissive.getHex(), was);
  assert.equal(sword.children.some(m => m.children.length), false, 'skins removed');
});

test('the hero and floor sync follow the wielded weapon and the seen label', () => {
  const g = new THREE.Group(), socket = new THREE.Group(), world = new THREE.Group();
  g.add(socket); world.add(g);
  const hero = {g, weaponSocket: socket};
  const wield = item => { socket.children.filter(c => !c.userData.magicShell).forEach(c => socket.remove(c)); socket.add(createHeldWeapon(item)); return syncHeldMagic(hero, item, {clock: () => 0}); };
  assert.equal(wield({name: 'long sword', class: W}), null);
  const a = wield({name: 'long sword', class: W, spe: 4, buc: 'blessed'});
  assert.ok(a && a.blade.y1 > .7 && a.tint?.length === 3);
  a.fx.userData.update(.5);
  assert.equal(syncHeldMagic(hero, {name: 'long sword', class: W, spe: 4, buc: 'blessed'}), a, 'same weapon: kept');
  assert.equal(wield({name: 'long sword', class: W, spe: 1}).tint, null, '+1 keeps the plain trail');
  assert.equal(wield(null), null);
  assert.equal(socket.children.some(c => c.userData.magicShell), false);

  const item = new THREE.Group();
  item.add(createHeldWeapon({name: 'long sword'}));
  const fx = syncFloorMagic(item, {class: W, label: 'Excalibur'});
  assert.ok(fx && fx.getObjectByName('artifact pillar'));
  assert.equal(syncFloorMagic(item, {class: W, label: 'Excalibur'}), fx);
  assert.equal(syncFloorMagic(item, {class: W, label: 'long sword'}), null);
  assert.equal(item.children.length, 1);
  assert.ok(syncFloorMagic(item, {class: W, label: 'long sword', spe: 2}));
});

test('Cleaver, Thiefbane, Luck Blade and Dragonbane each have their own signature', () => {
  const keys = ['cleaver', 'thiefbane', 'luck blade', 'dragonbane'];
  for (const k of keys) assert.ok(THEMES[k], k);
  assert.equal(new Set(keys.map(k => THEMES[k].shell)).size, keys.length);
  assert.ok(THEMES.cleaver.shell >> 16 > 0xa0 && (THEMES.cleaver.shell & 0xff) < 0x30, 'Cleaver burns blood red');
  assert.equal(weaponMagic({name: 'Cleaver', class: W}).theme, THEMES.cleaver);
});

test('the bane and slayer blades each have their own signature', () => {
  const keys = ['werebane', 'grayswandir', 'giantslayer', 'ogresmasher', 'trollsbane'];
  for (const k of keys) assert.ok(THEMES[k], k);
  assert.equal(new Set(keys.map(k => THEMES[k].shell)).size, keys.length);
  assert.equal(weaponMagic({name: 'Trollsbane', class: W}).theme, THEMES.trollsbane);
});

test('the Longbow of Diana has its own moonlit signature', () => {
  assert.ok(THEMES['longbow of diana']);
  const others = Object.entries(THEMES).filter(([k]) => k !== 'longbow of diana');
  assert.ok(others.every(([, t]) => t.shell !== THEMES['longbow of diana'].shell));
  assert.equal(weaponMagic({name: 'Longbow of Diana', class: W}).theme, THEMES['longbow of diana']);
});

test('the Sceptre of Might pulses in heavy gold', () => {
  const t = THEMES['sceptre of might'];
  assert.ok(t && t.beat);
  assert.ok(Object.entries(THEMES).every(([k, o]) => k === 'sceptre of might' || o.shell !== t.shell));
  assert.equal(weaponMagic({name: 'Sceptre of Might', class: W}).theme, t);
});
