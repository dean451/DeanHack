import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {artifactKind, heldArtifactKind, artifactFromName, glintAt, gleamParticle, createArtifactGleam, syncArtifactGleam,
  syncHeldGleam, updateHeldGleam, heldReach, ARTIFACTS, GLEAM_STYLES} from './artifact-gleam.js';
import {createHeldWeapon} from './equipment.js';

const floor = (label, cls = 2) => ({class: cls, name: 'long sword', label});

test('only a name the hero could not have written picks a gleam', () => {
  assert.equal(artifactKind(floor('long sword named Excalibur')), 'excalibur');
  assert.equal(artifactKind(floor('Excalibur')), 'excalibur');
  assert.equal(artifactKind(floor('runed dagger named Sting')), 'sting');
  assert.equal(artifactKind(floor('elven broadsword named Orcrist')), 'orcrist');
  assert.equal(artifactKind(floor('glass orb named The Orb of Fate', 6)), 'orb of fate');
  assert.equal(artifactKind(floor('Orb of Fate', 6)), 'orb of fate');
  assert.equal(artifactKind(floor('diamond named The Sunstone', 13)), 'sunstone');
  // Plain and unidentified things, and the true name, never leak.
  assert.equal(artifactKind(floor('long sword')), null);
  assert.equal(artifactKind({class: 2, name: 'Excalibur'}), null);
  assert.equal(artifactKind(null), null);
  // Names a player can write on the wrong thing: a runesword looks like a runed broadsword,
  // worthless glass like a gem, and a dagger can be called anything.
  assert.equal(artifactKind(floor('runed broadsword named Orcrist')), null);
  assert.equal(artifactKind(floor('dagger named Sting')), null);
  assert.equal(artifactKind(floor('white gem named The Sunstone', 13)), null);
  // A slipped hand scuffs a letter; guesses and the wrong class show nothing.
  assert.equal(artifactKind(floor('long sword named Excalibar')), null);
  assert.equal(artifactKind(floor('long sword called Excalibur')), null);
  assert.equal(artifactKind(floor('Excalibur', 7)), null, 'a fruit named Excalibur');
  assert.equal(heldArtifactKind({name: 'long sword named Excalibur', otyp: 28, class: 2}), 'excalibur');
  assert.equal(heldArtifactKind({name: 'long sword', otyp: 28, class: 2}), null);
  for (const [key, art] of Object.entries(ARTIFACTS)) assert.equal(artifactFromName(key, art.cls), key);
});

test('glints flare briefly and fade to nothing', () => {
  for (const style of Object.values(GLEAM_STYLES)) {
    let on = 0, total = 0;
    for (let t = 0; t < 30; t += .01, total++) {
      const v = glintAt(t, style.period, style.flash, .3);
      assert.ok(v >= 0 && v <= 1);
      if (v > .01) on++;
    }
    const share = on / total;
    assert.ok(share > .05 && share < .3, `on ${share}`);
    assert.ok(glintAt(0, style.period, style.flash, 0) < 1e-9, 'starts dark');
    assert.ok(glintAt(style.flash - 1e-9, style.period, style.flash, 0) < 1e-6, 'ends dark');
  }
});

test('every particle stays finite and near the item or on the blade', () => {
  for (const style of Object.values(GLEAM_STYLES)) for (let k = 0; k < 12; k++) {
    const seeds = Array.from({length: 1 + style.motes}, (_, i) => [(k * 7 + i) % 12 / 12, (k * 5 + i * 3) % 12 / 12, (k + i * 5) % 12 / 12, (k * 11 + i) % 12 / 12]);
    for (let t = 0; t < 12; t += .037) for (let i = 0; i <= style.motes; i++) {
      const q = gleamParticle(style, i, seeds, t);
      for (const v of Object.values(q)) assert.ok(Number.isFinite(v));
      assert.ok(Math.abs(q.x) <= .3 && Math.abs(q.z) <= .2 && q.y >= 0 && q.y <= .35, `floor ${JSON.stringify(q)}`);
      assert.ok(q.alpha >= 0 && q.alpha <= 1 && q.size > 0 && q.size <= 1);
      const h = gleamParticle(style, i, seeds, t, {held: true, y0: .13, y1: .88});
      assert.ok(Math.abs(h.x) <= .03 && Math.abs(h.z) <= .03 && h.y >= .13 - 1e-9 && h.y <= .88 + 1e-9, `held ${JSON.stringify(h)}`);
    }
  }
});

test('the floor glint is one draw, deterministic, and follows the name', () => {
  const a = createArtifactGleam('excalibur', {seedText: 'x'}), b = createArtifactGleam('excalibur', {seedText: 'x'});
  assert.equal(createArtifactGleam('long sword'), null);
  let draws = 0;a.traverse(o => { if (o.isPoints) draws++; });
  assert.equal(draws, 1);
  for (const t of [0, .7, 3.3, 1000]) {
    a.userData.update(t); b.userData.update(t);
    const pa = a.children[0].geometry.attributes, pb = b.children[0].geometry.attributes;
    assert.deepEqual([...pa.position.array], [...pb.position.array]);
    for (const v of [...pa.position.array, ...pa.aAlpha.array, ...pa.aSize.array]) assert.ok(Number.isFinite(v));
  }
  a.userData.dispose(); b.userData.dispose();
  const item = new THREE.Group();
  assert.equal(syncArtifactGleam(item, floor('long sword')), null);
  const g = syncArtifactGleam(item, floor('long sword named Excalibur'), 'k');
  assert.equal(g.parent, item);
  assert.equal(syncArtifactGleam(item, floor('Excalibur'), 'k'), g, 'fully identified: same artifact, kept');
  assert.equal(syncArtifactGleam(item, floor('long sword')), null);
  assert.equal(g.parent, null);
});

test('a wielded artifact gleams up its whole blade and follows the swing', () => {
  const g = new THREE.Group(), arm = new THREE.Group(), weaponSocket = new THREE.Group();
  g.add(arm); arm.add(weaponSocket); arm.position.set(.2, .7, 0); weaponSocket.rotation.x = Math.PI / 4 + .65;
  let held = null;
  const hero = {g, weaponSocket, setWeapon(item) { if (held) weaponSocket.remove(held); held = createHeldWeapon(item); weaponSocket.add(held); }};
  const wield = w => { hero.setWeapon(w); return syncHeldGleam(hero, w); };
  assert.equal(wield(null), null);
  assert.equal(wield({name: 'long sword', otyp: 28, class: 2}), null);
  const sword = {name: 'long sword named Excalibur', otyp: 28, class: 2};
  const gleam = wield(sword);
  assert.ok(gleam && gleam.parent === weaponSocket);
  assert.equal(syncHeldGleam(hero, sword), gleam, 'kept, not rebuilt');
  const reach = heldReach(weaponSocket, gleam);
  assert.ok(reach > .7 && reach < 1.1, `long sword reach ${reach}`);
  // Over a swing the glint runs hilt to tip, and every buffer stays finite.
  const ys = [];
  for (let t = 0; t < 6; t += .02) {
    arm.rotation.x = -Math.sin(t * 3) * 1.9;
    updateHeldGleam(hero, t);
    const at = gleam.children[0].geometry.attributes;
    for (const v of [...at.position.array, ...at.aAlpha.array, ...at.aSize.array, ...at.aSpin.array]) assert.ok(Number.isFinite(v));
    if (at.aAlpha.array[0] > .05) ys.push(at.position.array[1]);
  }
  assert.ok(ys.length > 5, 'it glinted');
  assert.ok(Math.min(...ys) < .35 && Math.max(...ys) > reach - .2, `ran ${Math.min(...ys)}–${Math.max(...ys)}`);
  // A dagger's gleam is short; unwielding or forgetting removes it.
  const sting = wield({name: 'runed dagger named Sting', otyp: 20, class: 2});
  assert.equal(gleam.parent, null);
  assert.ok(sting.userData.kind === 'sting' && heldReach(weaponSocket, sting) < .6);
  assert.equal(wield(null), null);
  assert.equal(sting.parent, null);
  // No socket (a GLB hero): nothing.
  assert.equal(syncHeldGleam({g: new THREE.Group()}, sword), null);
});

test('the great non-weapon artifacts glint in the grand style', () => {
  for (const k of ['heart of ahriman', 'orb of fate', 'palantir of westernesse', 'eye of the aethiopica']) {
    assert.equal(ARTIFACTS[k].style, 'grand', k);
    assert(GLEAM_STYLES.grand.motes > GLEAM_STYLES.artifact.motes);
  }
});
