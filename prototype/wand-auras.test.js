import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {wandAuraKind, magicAuraKind, particleAt, crackleAt, createWandAura, syncWandAura, WAND_AURAS, MAGIC_AURAS, WAND_CLASS, TOOL_CLASS} from './wand-auras.js';

const wand = (label, extra = {}) => ({class: WAND_CLASS, name: 'sleep', appearance: 'oak', label, ...extra});

test('the hero-known name picks an aura; a big wand shows its true type unidentified', () => {
  assert.equal(wandAuraKind(wand('wand of death')), 'death');
  assert.equal(wandAuraKind(wand('wand of sleep')), 'sleep');
  // The big wands: their true type shows through, whatever the hero calls them.
  for (const type of ['death', 'fire', 'cold', 'lightning', 'striking', 'cancellation', 'digging']) {
    assert.equal(wandAuraKind(wand('oak wand', {name: type})), type);
    assert.equal(wandAuraKind(wand('wand called sleep', {name: type})), type);
  }
  assert.equal(wandAuraKind({class: WAND_CLASS, name: 'wand of death'}), 'death');
  assert.equal(wandAuraKind(wand('wands of fire')), 'fire');
  assert.equal(wandAuraKind(wand('2 wands of cold')), 'cold');
  assert.equal(wandAuraKind(wand('wand of magic missile named zap')), 'magic missile');
  // Unidentified small wands: the true name is right there on the object, and must not leak.
  assert.equal(wandAuraKind(wand('oak wand')), null);
  assert.equal(wandAuraKind(wand('wand')), null);
  assert.equal(wandAuraKind(wand(undefined)), null);
  assert.equal(wandAuraKind(wand('oak wand', {name: 'teleportation'})), null);
  // Player guesses and names are not identification.
  assert.equal(wandAuraKind(wand('wand called death')), null);
  assert.equal(wandAuraKind(wand('wand called wand of death')), null);
  assert.equal(wandAuraKind(wand('oak wand named wand of death')), null);
  // Nothing shows nothing; other classes never glow.
  assert.equal(wandAuraKind(wand('wand of nothing')), null);
  assert.equal(wandAuraKind({class: 6, label: 'wand of death'}), null);
  assert.equal(wandAuraKind({class: 6, name: 'death'}), null);
});

test('every style keeps particles finite and near the wand', () => {
  const styles = Object.values({...WAND_AURAS, ...MAGIC_AURAS}).flatMap(s => s.core ? [s, s.core] : [s]);
  for (const style of styles) for (let k = 0; k < 20; k++) {
    const seed = [k / 20, (k * 7 % 20) / 20, (k * 13 % 20) / 20, (k * 3 % 20) / 20];
    for (let p = 0; p <= 1.0001; p += .05) {
      const q = particleAt(style.motion, seed, Math.min(p, 1));
      for (const v of Object.values(q)) assert.ok(Number.isFinite(v), `${style.motion} ${JSON.stringify(q)}`);
      assert.ok(Math.abs(q.x) <= .45 && Math.abs(q.z) <= .3, `${style.motion} spread ${q.x},${q.z}`);
      assert.ok(q.y >= 0 && q.y <= .65, `${style.motion} height ${q.y}`);
      assert.ok(q.alpha >= 0 && q.alpha <= 1 && q.size > 0 && q.size <= 1.01);
    }
    // Born and gone invisible, so the loop never pops.
    assert.ok(particleAt(style.motion, [.3, .6, .2, .8], 0).alpha < 1e-6);
    assert.ok(particleAt(style.motion, [.3, .6, .2, .8], 1).alpha < 1e-6);
  }
});

test('lightning crackles in short flashes', () => {
  let on = 0, samples = 0, runs = 0, run = 0, longest = 0;
  for (let t = 0; t < 30; t += 1 / 240, samples++) {
    const c = crackleAt(t, 1234);
    assert.equal(c.pts.length, 21);
    assert.ok(c.pts.every(Number.isFinite));
    if (c.on) { on++; run++; } else { if (run) runs++; longest = Math.max(longest, run); run = 0; }
  }
  const share = on / samples;
  assert.ok(share > .02 && share < .15, `on ${share}`);
  assert.ok(runs > 30, `flashes ${runs}`);
  assert.ok(longest / 240 <= .08, `longest flash ${longest / 240}s`);
});

test('auras build, animate and dispose cleanly', () => {
  for (const kind of Object.keys({...WAND_AURAS, ...MAGIC_AURAS})) {
    const aura = createWandAura(kind, 'x');
    let meshes = 0;
    for (const t of [0, .37, 1.9, 12.5, 1000.1]) {
      aura.userData.update(t);
      aura.traverse(o => {
        if (!o.geometry) return;
        for (const attr of Object.values(o.geometry.attributes)) assert.ok(attr.array.every(Number.isFinite), kind);
      });
    }
    aura.traverse(o => { if (o.geometry) meshes++; });
    assert.ok(meshes >= 1 && meshes <= 3, `${kind} draw calls ${meshes}`);
    aura.userData.dispose();
  }
  // Same seed, same particles; the aura is a function of time.
  const a = createWandAura('fire', 'k'), b = createWandAura('fire', 'k');
  a.userData.update(3.3); b.userData.update(3.3);
  assert.deepEqual([...a.children[0].geometry.attributes.position.array], [...b.children[0].geometry.attributes.position.array]);
  assert.equal(createWandAura('nothing'), null);
});

test('the aura follows the name as it changes', () => {
  const item = new THREE.Group();
  assert.equal(syncWandAura(item, wand('oak wand')), null);
  assert.equal(item.children.length, 0);
  const death = syncWandAura(item, wand('wand of death'), 'k');
  assert.equal(death.userData.kind, 'death');
  assert.equal(syncWandAura(item, wand('wand of death'), 'k'), death, 'kept, not rebuilt');
  let freed = false;
  const dispose = death.userData.dispose;
  death.userData.dispose = () => { freed = true; dispose(); };
  const fire = syncWandAura(item, wand('wand of fire'), 'k');
  assert.ok(freed && fire.userData.kind === 'fire' && item.children.length === 1 && item.children[0] === fire);
  assert.equal(syncWandAura(item, wand('wand called fire')), null);
  assert.equal(item.children.length, 0);
});

test('a wielded wand glows in the hand once its name says so, or at once for a big wand', async () => {
  const {syncHeldWandAura, updateHeldWandAura, heldWandObject} = await import('./wand-auras.js');
  // A stand-in hero: root, a posed arm and a socket, like main.js's player.
  const g = new THREE.Group(), arm = new THREE.Group(), weaponSocket = new THREE.Group();
  arm.position.set(.34, .92, 0); arm.rotation.x = -.8; weaponSocket.rotation.x = Math.PI / 4 + .65;
  g.add(arm); arm.add(weaponSocket); g.position.set(3, 0, -2); g.rotation.y = 1.1;
  const hero = {g, weaponSocket};
  const held = name => ({name, otyp: 400, class: WAND_CLASS});
  assert.equal(heldWandObject(null), null);
  assert.equal(syncHeldWandAura(hero, null), null);
  assert.equal(syncHeldWandAura(hero, held('oak wand')), null);
  assert.equal(syncHeldWandAura(hero, held('wand called death')), null);
  assert.equal(heldWandObject({name: 'oak wand', otyp: 400, class: WAND_CLASS, type: 'sleep'}).name, 'sleep');
  assert.equal(syncHeldWandAura(hero, {name: 'oak wand', otyp: 400, class: WAND_CLASS, type: 'sleep'}), null);
  assert.equal(syncHeldWandAura(hero, {name: 'oak wand', otyp: 401, class: WAND_CLASS, type: 'digging'}).userData.kind, 'digging');
  assert.equal(syncHeldWandAura(hero, null), null);
  assert.equal(syncHeldWandAura(hero, {name: 'long sword', otyp: 28, class: 2}), null);
  assert.equal(syncHeldWandAura(hero, {name: 'magic lamp', otyp: 200, class: TOOL_CLASS}), null);
  assert.equal(g.userData.heldWand.visible, false);
  const aura = syncHeldWandAura(hero, held('wand of fire'));
  assert.equal(aura.userData.kind, 'fire');
  assert.equal(syncHeldWandAura(hero, held('wand of fire')), aura, 'kept, not rebuilt');
  // Sampled over time while the arm swings: the aura tracks the rod and stays finite.
  const tip = new THREE.Vector3();
  for (let i = 0; i <= 40; i++) {
    const t = i * .137;
    arm.rotation.x = -.8 + Math.sin(t * 3) * .9;
    updateHeldWandAura(hero, t);
    g.updateMatrixWorld(true);
    tip.set(0, .3, 0).applyMatrix4(weaponSocket.matrixWorld);
    const at = g.userData.heldWand.getWorldPosition(new THREE.Vector3());
    assert.ok(at.distanceTo(tip) < 1e-6, `aura on the rod at t=${t}`);
    assert.ok(g.userData.heldWand.position.y > .2 && g.userData.heldWand.position.y < 1.6);
    for (const v of aura.children[0].geometry.attributes.position.array) assert.ok(Number.isFinite(v));
  }
  // Unwielding, or a name that stops saying, takes it away.
  assert.equal(syncHeldWandAura(hero, held('wand of fire named x')).userData.kind, 'fire');
  assert.equal(syncHeldWandAura(hero, null), null);
  assert.equal(g.userData.heldWand.children.length, 0);
  assert.equal(g.userData.heldWand.visible, false);
  // A hero without a hand socket (a GLB model) never shows it.
  const bare = {g: new THREE.Group()};
  assert.ok(syncHeldWandAura(bare, held('wand of cold')));
  assert.equal(bare.g.userData.heldWand.visible, false);
  updateHeldWandAura(bare, 1);
});

test('a magic lamp hums only once the hero knows it for one', () => {
  const lamp = (label, name = 'magic lamp') => ({class: TOOL_CLASS, name, appearance: 'lamp', label});
  assert.equal(magicAuraKind(lamp('magic lamp')), 'magic lamp');
  assert.equal(magicAuraKind(lamp('magic lamp (lit)')), 'magic lamp');
  assert.equal(magicAuraKind(lamp('magic lamp named genie')), 'magic lamp');
  // Unidentified it is just "lamp", the same as an oil lamp; the true name must not leak.
  assert.equal(magicAuraKind(lamp('lamp')), null);
  assert.equal(magicAuraKind(lamp(undefined)), null);
  assert.equal(magicAuraKind(lamp('lamp called magic')), null);
  assert.equal(magicAuraKind(lamp('lamp named magic lamp')), null);
  assert.equal(magicAuraKind(lamp('oil lamp', 'oil lamp')), null);
  assert.equal(magicAuraKind({class: WAND_CLASS, label: 'magic lamp'}), null);
  // On the floor it goes through the same sync as wands.
  const item = new THREE.Group();
  assert.equal(syncWandAura(item, lamp('lamp'), 'k'), null);
  const hum = syncWandAura(item, lamp('magic lamp'), 'k');
  assert.equal(hum.userData.kind, 'magic lamp');
  assert.equal(syncWandAura(item, lamp('magic lamp (lit)'), 'k'), hum, 'lighting it keeps the hum');
  // Sampled over time: motes rise from the spout, the halo circles the bowl, and all stay near the lamp.
  let maxY = 0, spoutSide = 0, samples = 0;
  for (let t = 0; t < 12; t += .21) {
    hum.userData.update(t);
    const [halo, motes] = hum.children.map(o => o.geometry.attributes.position.array);
    for (let i = 0; i < halo.length; i += 3) {
      const r = Math.hypot(halo[i], halo[i + 2] / .85);
      assert.ok(r > .17 && r < .3 && halo[i + 1] > .04 && halo[i + 1] < .2, `halo ${r} ${halo[i + 1]}`);
    }
    for (let i = 0; i < motes.length; i += 3, samples++) {
      assert.ok([motes[i], motes[i + 1], motes[i + 2]].every(Number.isFinite));
      maxY = Math.max(maxY, motes[i + 1]);
      if (motes[i] > .2) spoutSide++;
    }
  }
  assert.ok(maxY > .45 && maxY < .6, `motes top ${maxY}`);
  assert.ok(spoutSide / samples > .95, 'motes stay over the spout');
  // Forgetting (or a mistaken name) takes the hum away.
  assert.equal(syncWandAura(item, lamp('lamp')), null);
  assert.equal(item.children.length, 0);
});

test('a crystal ball swirls only once the hero knows it for one, and stays inside the glass', () => {
  const ball = label => ({class: TOOL_CLASS, name: 'crystal ball', appearance: 'glass orb', label});
  assert.equal(magicAuraKind(ball('crystal ball')), 'crystal ball');
  assert.equal(magicAuraKind(ball('crystal ball (0:5)')), 'crystal ball');
  assert.equal(magicAuraKind(ball('2 crystal balls')), 'crystal ball');
  assert.equal(magicAuraKind(ball('crystal ball named seer')), 'crystal ball');
  assert.equal(magicAuraKind(ball('glass orb')), null);
  assert.equal(magicAuraKind(ball('glass orb (0:5)')), null);
  assert.equal(magicAuraKind(ball('glass orb called crystal ball')), null);
  assert.equal(magicAuraKind(ball('glass orb named crystal ball')), null);
  assert.equal(magicAuraKind({class: WAND_CLASS, label: 'crystal ball'}), null);
  const item = new THREE.Group();
  assert.equal(syncWandAura(item, ball('glass orb'), 'k'), null);
  const swirl = syncWandAura(item, ball('crystal ball'), 'k');
  assert.equal(swirl.userData.kind, 'crystal ball');
  assert.equal(swirl.children.length, 2);
  // Every particle stays well inside the orb (centre y .14, radius .105) and the colours are real.
  const colors = swirl.children[0].geometry.attributes.aColor.array;
  assert.ok(Array.from(colors).every(v => Number.isFinite(v) && v >= 0 && v <= 1));
  let seenVision = 0, frames = 0;
  for (let t = 0; t < 15; t += .13, frames++) {
    swirl.userData.update(t);
    const [mist, vision] = swirl.children.map(o => o.geometry.attributes);
    for (const layer of [mist, vision]) for (let i = 0; i < layer.position.count; i++) {
      const [x, y, z] = [layer.position.getX(i), layer.position.getY(i), layer.position.getZ(i)];
      assert.ok(Math.hypot(x, y - .14, z) < .09, `outside the glass ${x},${y},${z}`);
      assert.ok(Number.isFinite(layer.aAlpha.getX(i)) && layer.aAlpha.getX(i) >= 0 && layer.aSize.getX(i) > 0);
    }
    if (Array.from(vision.aAlpha.array).some(a => a > .3)) seenVision++;
  }
  assert.ok(seenVision > frames * .2 && seenVision < frames, `visions glint now and then (${seenVision}/${frames})`);
  // The mist really turns: one particle's angle moves steadily over a short span.
  const at = t => { swirl.userData.update(t); const p = swirl.children[0].geometry.attributes.position; return Math.atan2(p.getZ(3), p.getX(3)); };
  assert.notEqual(at(1), at(1.2));
  assert.equal(syncWandAura(item, ball('glass orb')), null, 'forgetting stops the swirl');
  assert.equal(item.children.length, 0);
});

test('only the identified real Amulet of Yendor glows, never a fake that reads the same', async () => {
  const {AMULET_CLASS} = await import('./wand-auras.js');
  const amulet = (label, identified, name = 'Amulet of Yendor') =>
    ({class: AMULET_CLASS, name, appearance: 'Amulet of Yendor', label, ...(identified === undefined ? {} : {identified})});
  assert.equal(magicAuraKind(amulet('Amulet of Yendor', true)), 'amulet of yendor');
  assert.equal(magicAuraKind(amulet('the Amulet of Yendor named mine', true)), 'amulet of yendor');
  // Unidentified, real or fake, it reads "Amulet of Yendor" and stays dark.
  assert.equal(magicAuraKind(amulet('Amulet of Yendor')), null);
  assert.equal(magicAuraKind(amulet('Amulet of Yendor', false)), null);
  assert.equal(magicAuraKind(amulet('Amulet of Yendor', false, 'cheap plastic imitation of the Amulet of Yendor')), null);
  // An identified fake says so and stays dark; names and guesses don't count.
  assert.equal(magicAuraKind(amulet('cheap plastic imitation of the Amulet of Yendor', true, 'cheap plastic imitation of the Amulet of Yendor')), null);
  assert.equal(magicAuraKind(amulet('amulet called Amulet of Yendor', true)), null);
  assert.equal(magicAuraKind(amulet('amulet', true)), null);
  assert.equal(magicAuraKind({class: TOOL_CLASS, label: 'Amulet of Yendor', identified: true}), null);
  assert.equal(magicAuraKind({class: 4, label: 'Amulet of Yendor', identified: true}), null);

  // The heartbeat is in step across its points and beats twice a period.
  const style = MAGIC_AURAS['amulet of yendor'];
  const aura = createWandAura('amulet of yendor', 'k'), [spiral, heart] = aura.children;
  assert.equal(aura.children.length, 2);
  let peaks = 0, prev = 0, rising = false;
  for (let i = 0; i <= 320; i++) {
    const t = i / 200 * style.core.period;
    aura.userData.update(t);
    const alpha = [...heart.geometry.attributes.aAlpha.array];
    assert.ok(alpha.every(a => Math.abs(a - alpha[0]) < 1e-9), 'beats in step');
    if (alpha[0] < prev && rising) peaks++;
    rising = alpha[0] > prev; prev = alpha[0];
    // Everything stays round the pendant (z .09) and above the floor.
    const pos = [...spiral.geometry.attributes.position.array, ...heart.geometry.attributes.position.array];
    for (let k = 0; k < pos.length; k += 3) {
      assert.ok(pos.slice(k, k + 3).every(Number.isFinite));
      assert.ok(Math.hypot(pos[k], pos[k + 2] - .09) <= .11 && pos[k + 1] >= 0 && pos[k + 1] <= .45, `in bounds ${pos.slice(k, k + 3)}`);
    }
  }
  assert.ok(peaks >= 3 && peaks <= 4, `two beats a period, ${peaks} in 1.6 periods`);
  // Rests dark between beats.
  aura.userData.update(style.core.period * .7);
  assert.ok(heart.geometry.attributes.aAlpha.array.every(a => a < .02));

  // Following the flag: identifying adds it, a new unidentified one on top takes it away.
  const item = new THREE.Group();
  assert.equal(syncWandAura(item, amulet('Amulet of Yendor', undefined)), null);
  assert.equal(syncWandAura(item, amulet('Amulet of Yendor', true), 'k').userData.kind, 'amulet of yendor');
  assert.equal(syncWandAura(item, amulet('Amulet of Yendor')), null);
  assert.equal(item.children.length, 0);
  aura.userData.dispose();
});

test('a bag of holding shows stars at its mouth only once the hero knows it for one', () => {
  const bag = (label, name = 'bag of holding') => ({class: TOOL_CLASS, name, appearance: 'bag', label});
  assert.equal(magicAuraKind(bag('bag of holding')), 'bag of holding');
  assert.equal(magicAuraKind(bag('bag of holding named stash')), 'bag of holding');
  assert.equal(magicAuraKind(bag('bag')), null);
  assert.equal(magicAuraKind(bag('bag called holding')), null);
  assert.equal(magicAuraKind(bag('bag of tricks')), null);
  assert.equal(magicAuraKind(bag('sack')), null);
  const item = new THREE.Group();
  assert.equal(syncWandAura(item, bag('bag'), 'k'), null);
  const stars = syncWandAura(item, bag('bag of holding'), 'k');
  assert.equal(stars.userData.kind, 'bag of holding');
  for (let t = 0; t < 12; t += .17) {
    stars.userData.update(t);
    const l = stars.children[0].geometry.attributes;
    for (let i = 0; i < l.position.count; i++) {
      const [x, y, z] = [l.position.getX(i), l.position.getY(i), l.position.getZ(i)];
      assert.ok(Math.hypot(x - .03, z) < .06 && y > .37 && y < .53, `off the mouth ${x},${y},${z}`);
      assert.ok(Number.isFinite(l.aAlpha.getX(i)) && l.aAlpha.getX(i) >= 0 && l.aSize.getX(i) > 0);
    }
  }
  assert.equal(syncWandAura(item, bag('bag')), null);
  assert.equal(item.children.length, 0);
});
