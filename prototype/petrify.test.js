import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {deathPose, DEATH_TIME, DEATH_STYLES} from './deaths.js';
import {deathAction} from './combat-events.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose, queueDeath} from './actions.js';
import {applyStone, restoreStone, createPetrify, stoneAt, STONE} from './petrify.js';

// The live weeping angel: an 'A' in grey (the bridge's symbol and colour).
const A = 'A'.charCodeAt(0), GRAY = 7;
function angel() { const a = createCreature({name: 'weeping angel', symbol: A, color: GRAY}); a.species = 'weeping angel'; return a; }
const meshes = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
const dist = (c, d) => Math.hypot(c.r - d.r, c.g - d.g, c.b - d.b);

test('a stoned death gasps and sets standing, without falling or fading', () => {
  assert.ok(DEATH_STYLES.includes('petrify') && DEATH_TIME.petrify > 1);
  for (let u = 0; u <= 1.0001; u += .01) {
    const p = deathPose('petrify', u, [1, 0]);
    for (const v of Object.values(p)) assert.ok(Number.isFinite(v));
    assert.equal(p.fade, 1);
    assert.ok(Math.abs(p.roll) < .03 && Math.abs(p.pitch) < .2 && p.dy >= 0 && p.dy < .05, `${u}`);
    assert.ok(p.stone >= 0 && p.stone <= 1);
  }
  const gasp = deathPose('petrify', .12), end = deathPose('petrify', 1);
  assert.ok(gasp.pitch < -.15 && gasp.wing > .5, 'gasps back with wings flared');
  assert.equal(end.stone, 1);
  assert.ok(Math.abs(end.roll) < 1e-9 && end.pitch > gasp.pitch, 'sets in what is left of the gasp');
});

test('the bridge\'s stoned flag picks the petrify death', () => {
  const d = deathAction({type: 'death', x: 3, z: 4, name: 'weeping angel', pet: false, stoned: true});
  assert.equal(d.stoned, true);
  assert.equal(deathAction({type: 'death', x: 3, z: 4, name: 'weeping angel'}).stoned, false);
  const a = angel();
  queueDeath(d, () => a);
  assert.equal(a.actions.queue[0].style, 'petrify');
  const b = angel();
  queueDeath({...d, stoned: false}, () => b);
  assert.notEqual(b.actions.queue[0].style, 'petrify');
});

test('a statue built from the bridge\'s letter and colour is the live angel\'s model', () => {
  const live = angel(), statue = createCreature({name: 'weeping angel', symbol: A, color: GRAY});
  assert.equal(meshes(statue.g).length, meshes(live.g).length);
  assert.equal(statue.wings.length, 2, 'winged');
});

test('stone creeps up from the feet, greys and dims everything, and leaves other angels alone', () => {
  const a = angel(), other = angel();
  const glow = meshes(a.g).filter(m => m.material.emissiveIntensity > 1).length;
  assert.ok(glow > 0, 'the angel has glowing parts');
  applyStone(a, .4);
  const s = a.stone.saved, low = s.filter(x => x.h < .2), high = s.filter(x => x.h > .8);
  assert.ok(low.length && high.length);
  const grey = x => 1 - dist(x.m.color, x.stone) / Math.max(1e-6, dist(x.color, x.stone));
  const avg = l => l.reduce((t, x) => t + (dist(x.color, x.stone) < 1e-3 ? 1 : grey(x)), 0) / l.length;
  assert.ok(avg(low) > avg(high) + .3, `feet first (${avg(low)} vs ${avg(high)})`);
  assert.ok(stoneAt(.4, 0) > stoneAt(.4, 1));
  applyStone(a, 1);
  for (const x of a.stone.saved) {
    assert.ok(dist(x.m.color, x.stone) < 1e-6);
    assert.ok(!(x.m.emissiveIntensity > 0));
  }
  // the other angel's shared materials are untouched
  assert.ok(meshes(other.g).some(m => m.material.emissiveIntensity > 1));
  assert.ok(meshes(other.g).every(m => dist(m.material.color, STONE) > 1e-3 || m.userData.outline));
  restoreStone(a);
  assert.equal(meshes(a.g).filter(m => m.material.emissiveIntensity > 1).length, glow);
});

test('the wings and hover bob are held still as it sets', () => {
  const a = angel(), q = a.actions = createActionQueue();
  enqueueAction(q, {kind: 'die', style: 'petrify'});
  let t = 0, frozenY = null;
  for (let i = 0; i < 150; i++) {
    t += 1 / 60;
    clearActionPose(a, q);
    // what live.js writes every frame for a hovering angel
    a.wings.forEach((w, k) => { w.rotation.y = (k ? 1 : -1) * (-.18 + Math.sin(t * 5) * .12); });
    a.body.position.y = Math.sin(t * 3) * .05;
    updateActions(a, q, 1 / 60);
    if (q.finished) { frozenY ??= [a.wings[0].rotation.y, a.body.position.y]; }
  }
  assert.ok(q.finished && frozenY);
  // after it's set, the beat no longer moves it
  for (let i = 0; i < 30; i++) {
    t += 1 / 60;
    a.wings.forEach((w, k) => { w.rotation.y = (k ? 1 : -1) * (-.18 + Math.sin(t * 5) * .12); });
    a.body.position.y = Math.sin(t * 3) * .05;
    applyStone(a, 1);
    assert.ok(Math.abs(a.wings[0].rotation.y - frozenY[0]) < 1e-9 && Math.abs(a.body.position.y - frozenY[1]) < 1e-9);
  }
});

test('the statue on the square is the stoned angel itself, and finishes setting there', () => {
  const group = new THREE.Group(), a = angel(), bursts = [];
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
  let disposed = 0;
  sprite.userData.dispose = () => disposed++;
  a.g.add(sprite);
  a.g.position.set(2, 0, 3); a.target = new THREE.Vector3(2, 0, 3); a.g.rotation.y = .7;
  group.add(a.g);
  const q = a.actions = createActionQueue();
  enqueueAction(q, {kind: 'die', style: 'petrify'});
  for (let i = 0; i < 20; i++) { clearActionPose(a, q); updateActions(a, q, 1 / 60); }
  const body = a.g, actors = new Map([['2,3:1', a]]), petrify = createPetrify({onBurst: (b, at) => bursts.push([b.style, at])});
  const cell = {kind: 'object', object: {kind: 'statue', name: 'statue', creature: 'weeping angel', creatureSymbol: A, creatureColor: GRAY}};
  assert.equal(petrify.adopt(actors, {...cell, object: {...cell.object, creature: 'jackal'}}, 2, 3), null, 'only its own statue');
  assert.equal(petrify.adopt(actors, cell, 5, 3), null, 'only on its square');
  const icon = petrify.adopt(actors, cell, 2, 3);
  assert.ok(icon && icon.children[0] === body, 'the body is the statue');
  assert.ok(Math.abs(body.position.x) < .1 && Math.abs(body.position.z) < .1 && body.rotation.y === .7, 'same spot and facing');
  assert.ok(!body.children.includes(sprite) && disposed === 1, 'the label went with the monster');
  assert.ok(a.g !== body && a.actions.dead && a.actions.finished, 'the actor left behind is a dead stub');
  icon.position.set(2, 0, 3); group.add(icon);
  for (let i = 0; i < 200 && petrify.size; i++) petrify.update(1 / 60);
  assert.equal(petrify.size, 0);
  assert.equal(bursts.length, 1);
  assert.equal(bursts[0][0], 'petrify');
  assert.ok(meshes(body).every(m => m.userData.outline || dist(m.material.color, STONE) < .12), 'all stone');
  icon.userData.dispose();
});
