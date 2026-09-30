import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {MONSTER_ATTACKS, monsterAttackPose, restAttackPose, foreLegs} from './monster-attacks.js';
import {ACTION_TIME, createActionQueue, enqueueAction, updateActions, clearActionPose, actionsForCombat} from './actions.js';

const r6 = n => +n.toFixed(6);
// Every transform an attack can touch, including all legs and wings.
const snap = a => JSON.stringify({
  pos: a.g.position.toArray().map(r6), rot: a.g.rotation.toArray().slice(0, 3).map(r6), scale: a.g.scale.toArray().map(r6),
  body: a.body ? r6(a.body.position.y) : null, head: a.head ? r6(a.head.rotation.x) : null,
  tail: a.tail ? r6(a.tail.rotation.x) : null,
  legs: (a.legs || []).map(l => r6(l.rotation.x)), wings: (a.wings || []).map(w => r6(w.rotation.z))});

const CREATURES = ['jackal', 'kitten', 'giant bat', 'red dragon', 'soldier ant', 'floating eye', 'ochre jelly', 'dwarf', 'giant eel'];

test('attack poses rest at both ends and stay finite and bounded', () => {
  const rest = restAttackPose();
  for (const type of MONSTER_ATTACKS) for (const result of ['hit', 'miss']) {
    for (const u of [0, 1]) {
      const p = monsterAttackPose(type, u, result);
      for (const k of Object.keys(rest)) assert.ok(Math.abs(p[k] - rest[k]) < 1e-12, `${type} ${result} ${k} at ${u}`);
    }
    for (let u = 0; u <= 1; u += .01) {
      const p = monsterAttackPose(type, u, result);
      for (const [k, v] of Object.entries(p)) assert.ok(Number.isFinite(v), `${type} ${k}`);
      assert.ok(Math.abs(p.lunge) < .45 && Math.abs(p.pitch) < .6 && Math.abs(p.twist) < .6, type);
      assert.ok(p.scale > .9 && p.scale < 1.4 && p.stretch > .85 && p.stretch < 1.15, type);
      assert.ok(Math.abs(p.fore) < 2 && Math.abs(p.tail) < 2.2 && Math.abs(p.arm) < 2.5, type);
    }
  }
});

test('each attack type moves differently', () => {
  const sig = type => JSON.stringify([.2, .3, .45, .6].map(u => Object.values(monsterAttackPose(type, u)).map(v => +v.toFixed(3))));
  const kinds = MONSTER_ATTACKS.filter(t => !['hug', 'boom', 'other'].includes(t));
  assert.equal(new Set(kinds.map(sig)).size, kinds.length);
  // Signature beats: claw raises the forelegs, sting curls the tail, butt backs off first,
  // engulf swells, bite snaps the head forward at the strike.
  assert.ok(monsterAttackPose('claw', .28).fore < -1);
  assert.ok(monsterAttackPose('sting', .3).tail > 1.3);
  assert.ok(monsterAttackPose('butt', .28).lunge < -.08 && monsterAttackPose('butt', .45).lunge > .2);
  assert.ok(monsterAttackPose('engulf', .28).scale > 1.2);
  assert.ok(monsterAttackPose('bite', .45).head > .4);
  // A miss carries further than a hit.
  assert.ok(monsterAttackPose('bite', .45, 'miss').lunge > monsterAttackPose('bite', .45, 'hit').lunge);
});

test('an engulf opens its maw, then gulps a hit down in a squeeze and a bulge; a miss deflates', () => {
  const at = (u, r = 'hit') => monsterAttackPose('engulf', u, r);
  assert.ok(at(.28).head < -.15 && at(.45).head > at(.28).head + .3, 'maw rears open then snaps shut');
  const hit = [], miss = [];
  for (let u = .5; u <= 1; u += .005) { hit.push(at(u)); miss.push(at(u, 'miss')); }
  // Squeeze: taller than rest and smaller than the surge; then a bulge that sits lower.
  const squeeze = hit.reduce((b, p) => p.stretch > b.stretch ? p : b);
  assert.ok(squeeze.stretch > 1.02, `squeeze ${squeeze.stretch}`);
  assert.ok(hit.some(p => p.stretch < .98 && p.dy < -.015), 'heavy bulge settles');
  assert.ok(Math.min(...miss.map(p => p.scale)) < .97, 'a miss deflates');
  assert.ok(miss.every(p => p.stretch <= 1 + 1e-9), 'a miss never gulps');
  assert.ok(miss.some(p => Math.abs(p.twist) > .01), 'a miss shudders');
});

test('forelegs are the forward legs of four-or-more-legged creatures only', () => {
  const jackal = createCreature({name: 'jackal'});
  const fore = foreLegs(jackal);
  assert.ok(jackal.legs.length >= 4 && fore.length >= 2 && fore.length < jackal.legs.length);
  for (const l of fore) assert.ok(l.position.z > 0);
  assert.equal(foreLegs(createCreature({name: 'soldier ant'})).length, 2);
  assert.equal(foreLegs(createCreature({name: 'dwarf'})).length, 0);
  assert.deepEqual(foreLegs(null), []);
});

test('every attack on real creatures plays through the queue and returns exactly to rest', () => {
  for (const name of CREATURES) for (const attack of MONSTER_ATTACKS) {
    const a = createCreature({name}), q = createActionQueue();
    a.g.position.set(3, 0, 5); a.g.rotation.y = -.4;
    const rest = snap(a);
    assert.ok(enqueueAction(q, {kind: 'attack', attack, result: 'hit', dir: [1, 0]}), `${name} ${attack}`);
    let moved = 0;
    for (let t = 0; t < ACTION_TIME.attack + .1; t += 1 / 120) {
      clearActionPose(a, q);
      updateActions(a, q, 1 / 120);
      const s = JSON.parse(snap(a));
      for (const v of Object.values(s).flat()) assert.ok(v === null || Number.isFinite(v), `${name} ${attack}`);
      moved = Math.max(moved, Math.hypot(a.g.position.x - 3, a.g.position.z - 5));
    }
    assert.ok(moved > .02 && moved < .45, `${name} ${attack} moved ${moved}`);
    clearActionPose(a, q);
    const end = JSON.parse(snap(a)), start = JSON.parse(rest);
    // It ends facing where it struck (+x); everything else is back where it was.
    assert.ok(Math.abs(end.rot[1] - Math.PI / 2) < 1e-6, `${name} ${attack} faces target`);
    end.rot[1] = start.rot[1];
    assert.deepEqual(end, start, `${name} ${attack}`);
  }
});

test('the attacker action carries the seen defender name', () => {
  const seen = actionsForCombat({attack: 'weapon', result: 'hit', dir: [1, 0], attacker: {you: true}, defender: {seen: true, x: 1, z: 0, name: 'skeleton'}});
  assert.equal(seen.attacker.target, 'skeleton');
  const unseen = actionsForCombat({attack: 'weapon', result: 'hit', dir: [1, 0], attacker: {you: true}, defender: {seen: false}});
  assert.equal(unseen.attacker.target, null);
});

test('a mind flayer\'s tentacle attack lashes its face tentacles forward at the victim, not back into its chest', () => {
  for (const name of ['mind flayer', 'master mind flayer']) {
    const a = createCreature({name, symbol: 'h'.charCodeAt(0), color: 5});
    // the lowest tentacle vertex (the tips), in the model's own space
    const tip = () => {
      a.g.updateMatrixWorld(true);
      const inv = a.g.matrixWorld.clone().invert(), v = new THREE.Vector3();
      let lo = null;
      a.tail.traverse(o => {
        const p = o.geometry?.attributes?.position; if (!p) return;
        for (let i = 0; i < p.count; i += 3) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); if (!lo || v.y < lo.y) lo = v.clone(); }
      });
      return lo;
    };
    const rest = tip(), pivot = a.tail.getWorldPosition(new THREE.Vector3());
    let u = 0, peak = 0;
    for (let k = 0; k <= 100; k++) { const t = monsterAttackPose('tentacle', k / 100).tail; if (Math.abs(t) > Math.abs(peak)) { peak = t; u = k / 100; } }
    a.tail.rotation.x += peak;
    const lash = tip();
    assert.ok(lash.z > rest.z + .1, `${name} tips reach forward at u ${u} (z ${rest.z.toFixed(3)} -> ${lash.z.toFixed(3)})`);
    assert.ok(lash.y > rest.y && lash.y < pivot.y, `${name} tips rise toward the victim's head but stay below the mouth (y ${lash.y.toFixed(3)})`);
  }
});
