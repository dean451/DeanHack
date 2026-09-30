import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {deathStyle} from './deaths.js';
import {groundSamples, groundLift, grounds, SETTLE, MAX_SAMPLES} from './ground.js';

const box = new THREE.Box3();
const lowest = g => { g.updateMatrixWorld(true); return box.setFromObject(g, true).min.y; };

test('samples are sparse, finite and in the actor\'s own space', () => {
  const d = createCreature({name: 'dwarf'});
  d.g.position.set(4, 0, 7); d.g.rotation.y = 1.2;
  const s = groundSamples(d.g);
  assert.ok(s.pts.length / 3 <= MAX_SAMPLES * 1.5, `${s.pts.length / 3} points`);
  assert.ok(s.pts.every(Number.isFinite));
  assert.ok(Math.abs(s.low) < .05, `rest low ${s.low}`);
  assert.equal(groundSamples(new THREE.Group()), null);
  // standing at rest nothing needs lifting
  assert.equal(groundLift(d.g, s, d.g.position.y), 0);
});

test('a dense merged mesh keeps its box corners when rolled', () => {
  // one mesh, like a merged model: a head, a body and two box soles; the even spread alone
  // skips most of the sole corners, which then poke .2 through the floor on a roll
  const parts = [new THREE.SphereGeometry(.3, 48, 32).translate(0, .8, 0),
    new THREE.CylinderGeometry(.2, .25, .6, 48, 8).translate(0, .4, 0),
    new THREE.BoxGeometry(.3, .08, .5).translate(.12, .04, .05),
    new THREE.BoxGeometry(.3, .08, .5).translate(-.12, .04, .05)];
  const g = new THREE.Group();
  g.add(new THREE.Mesh(mergeGeometries(parts.map(p => p.toNonIndexed())), new THREE.MeshBasicMaterial()));
  const s = groundSamples(g);
  assert.ok(s.pts.length / 3 <= MAX_SAMPLES, `${s.pts.length / 3} points`);
  for (let k = 0; k < 64; k++) {
    g.rotation.set(Math.sin(k * 1.7) * 1.6, k * .4, Math.cos(k * 2.3) * 1.6);
    g.position.y = 0;
    g.position.y = groundLift(g, s, 0, 0);
    assert.ok(lowest(g) > -.01, `roll ${k} sank to ${lowest(g).toFixed(3)}`);
  }
});

test('only lying-down actions are grounded', () => {
  assert.ok(grounds({kind: 'die'}));
  assert.ok(grounds({kind: 'die'}, 'topple'));
  assert.ok(grounds({kind: 'die'}, 'odd'));
  assert.ok(!grounds({kind: 'die'}, 'splat'));
  assert.ok(!grounds({kind: 'die'}, 'dissipate'));
  assert.ok(grounds({kind: 'rise', buried: false}));
  assert.ok(!grounds({kind: 'rise', buried: true}));
  assert.ok(!grounds({kind: 'attack'}));
  assert.ok(!grounds(null));
});

test('a toppled body stays on the floor, moves smoothly, and a revived one gets back to rest', () => {
  for (const name of ['housecat', 'tiger', 'jackal', 'wolf', 'dwarf', 'hill orc', 'giant rat', 'pony',
    'hobbit', 'gnome', 'bugbear', 'troll', 'imp', 'jabberwock', 'mind flayer', 'hell hound', 'soldier']) {
    const a = createCreature({name});
    a.g.position.set(2, 0, 3);
    const q = createActionQueue();
    enqueueAction(q, {kind: 'die', dir: [0, 1], style: deathStyle(name)});
    let prev = a.g.position.y, low = Infinity;
    for (let i = 0; i < 90; i++) {
      clearActionPose(a, q); updateActions(a, q, 1 / 60);
      assert.ok(Number.isFinite(a.g.position.y));
      assert.ok(Math.abs(a.g.position.y - prev) < .08, `${name} jumped at frame ${i}`);
      prev = a.g.position.y;
      low = Math.min(low, lowest(a.g));
    }
    assert.ok(q.finished, name);
    // it used to sink .2 (cats) to .7 (dwarf); now only a settle, plus sampling slack (worst: jabberwock .02)
    assert.ok(low > -(SETTLE + .03), `${name} sank to ${low.toFixed(3)}`);
    assert.ok(q.applied.dy < .8, `${name} lifted ${q.applied.dy}`);
    clearActionPose(a, q);
    assert.ok(Math.abs(a.g.position.y) < 1e-9);

    // the same kind of body getting back up from that pose
    const r = createCreature({name}), rq = createActionQueue();
    enqueueAction(rq, {kind: 'rise', from: [0, 0], buried: false});
    let rlow = Infinity;
    for (let i = 0; i < 200; i++) { clearActionPose(r, rq); updateActions(r, rq, 1 / 60); rlow = Math.min(rlow, lowest(r.g)); }
    assert.ok(rlow > -(SETTLE + .03), `${name} rose from ${rlow.toFixed(3)}`);
    clearActionPose(r, rq);
    assert.equal(rq.current, null);
    assert.ok(Math.abs(r.g.position.y) < 1e-9 && Math.abs(r.g.rotation.z) < 1e-9, `${name} back at rest`);
  }
});

test('a buried corpse still climbs up out of the ground', () => {
  const r = createCreature({name: 'troll'}), q = createActionQueue();
  enqueueAction(q, {kind: 'rise', from: [0, 0], buried: true});
  clearActionPose(r, q); updateActions(r, q, 1 / 60);
  assert.equal(q.ground, null);
});
