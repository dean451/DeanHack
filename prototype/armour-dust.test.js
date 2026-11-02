import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {armourDust, ashAt, createArmourDust, SLOTS} from './armour-dust.js';
import {liveSource} from './live-source.js';

// a 1.8-tall hero: legs, a torso, a head, and a shield arm
function hero() {
  const g = new THREE.Group(), shieldArm = new THREE.Group();g.add(shieldArm);
  const box = (h, y, color, p = g) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.3, h, .3, 2, 6, 2), new THREE.MeshStandardMaterial({color}));m.position.y = y;p.add(m);return m; };
  const legs = box(.8, .4, 0x332211), torso = box(.7, 1.15, 0x8899aa), head = box(.3, 1.65, 0xd6a88c), shield = box(.5, 1, 0x664422, shieldArm);
  shield.position.x = .4;
  return {g, parts: {shieldArm}, legs, torso, head, shield, mats: [legs.material, torso.material, head.material, shield.material]};
}
let seed = 1;const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test('each line destroy_arm() prints names its piece', () => {
  assert.equal(armourDust('Your cloak crumbles and turns to dust!'), 'cloak');
  assert.equal(armourDust('Your armor turns to dust and falls to the floor!'), 'suit');
  assert.equal(armourDust('Your dragon scales turn to dust and fall to the ground!'), 'suit');
  assert.equal(armourDust('Your shirt crumbles into tiny threads and falls apart!'), 'shirt');
  assert.equal(armourDust('Your helmet turns to dust and is blown away!'), 'helm');
  assert.equal(armourDust('Your gloves vanish!'), 'gloves');
  assert.equal(armourDust('Your boots disintegrate!'), 'boots');
  assert.equal(armourDust('Your shield crumbles away!'), 'shield');
  assert.equal(armourDust('Your cloak is protected!'), null);
  assert.equal(armourDust('You hear a crumbling sound.'), null);
  for (const s of Object.values(SLOTS)) assert.ok(s.band[0] < s.band[1] && s.life > 0);
});

test('the ash tint comes up fast, holds, and goes back', () => {
  assert.equal(ashAt(0, 2), 0);assert.equal(ashAt(.4, 2), 1);assert.equal(ashAt(5, 2), 0);assert.ok(ashAt(1.1, 2) > 0 && ashAt(1.1, 2) < 1);
});

test('a helm blown away: dust from the head only, carried off, the head ashen while it goes, then put back', () => {
  const scene = new THREE.Group(), h = hero(), dust = createArmourDust(THREE, scene, {rnd});
  assert.equal(dust.message('Your helmet turns to dust and is blown away!', h), true);
  assert.ok(dust.active && dust.count > 20);
  const pts = scene.getObjectByName('armourDust'), p = pts.geometry.attributes.position;
  let low = Infinity;for (let i = 0; i < p.count; i++) low = Math.min(low, p.getY(i));
  assert.ok(low > 1.45, 'nothing below the head');
  assert.notEqual(h.head.material, h.mats[2]);assert.equal(h.legs.material, h.mats[0], 'the legs are untouched');
  const start = new THREE.Vector3().fromBufferAttribute(p, 0);
  for (let i = 0; i < 10; i++) dust.update(.1);
  assert.ok(new THREE.Vector3().fromBufferAttribute(p, 0).distanceTo(start) > .2, 'the gust carries it');
  for (let i = 0; i < 30; i++) dust.update(.1);
  assert.equal(dust.active, false);assert.equal(scene.children.length, 0);
  assert.equal(h.head.material, h.mats[2], 'the head has its own material back');
  assert.equal(h.head.material.color.getHex(), 0xd6a88c);
});

test('a suit falls to the floor and settles round the feet', () => {
  const scene = new THREE.Group(), h = hero(), dust = createArmourDust(THREE, scene, {rnd});
  dust.message('Your plate mail turns to dust and falls to the floor!', h);
  const p = scene.getObjectByName('armourDust').geometry.attributes.position;
  for (let i = 0; i < 18; i++) dust.update(.1);
  let floor = 0;for (let i = 0; i < p.count; i++) if (p.getY(i) < .05) floor++;
  assert.ok(floor > p.count * .8, `most of it lies on the floor (${floor}/${p.count})`);
  dust.clear();assert.equal(scene.children.length, 0);assert.equal(h.torso.material, h.mats[1]);
});

test('a shield crumbles from the shield arm, not the body', () => {
  const scene = new THREE.Group(), h = hero(), dust = createArmourDust(THREE, scene, {rnd});
  dust.message('Your shield crumbles away!', h);
  const p = scene.getObjectByName('armourDust').geometry.attributes.position;
  for (let i = 0; i < p.count; i++) assert.ok(p.getX(i) > .2);
  assert.equal(h.torso.material, h.mats[1]);dust.clear();assert.equal(h.shield.material, h.mats[3]);
});

test('other lines and a missing hero do nothing', () => {
  const scene = new THREE.Group(), dust = createArmourDust(THREE, scene, {rnd});
  assert.equal(dust.message('You feel a strange vibration.', hero()), false);
  assert.equal(dust.message('Your gloves vanish!', null), false);
  assert.equal(scene.children.length, 0);
});

test('the live game crumbles armour from the message line, runs it each frame and clears it with the level', () => {
  const src = liveSource();
  assert.match(src, /createArmourDust\(THREE,group\)/);
  assert.match(src, /armourDust\.message\(text,hero\)/);
  assert.match(src, /armourDust\.update\(dt\)/);
  assert.match(src, /armourDust\.clear\(\)/);
});
