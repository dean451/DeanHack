import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {updateTouristGawk, gawkPoseAt, gawks, MAP_LIFT, READ_DIP, STARE_TURN, STARE_COCK, STARE_BODY, DART_LIFT, DART_LEVEL, FEINT, LEN, FIRST_MIN, FIRST_SPAN} from './tourist-gawk.js';

const make = name => {
  const a = createCreature({name, symbol: 64, color: 1});
  a.species = name; a.actions = createActionQueue();
  return a;
};
function frame(a, dt, walking = false) {
  clearActionPose(a, a.actions);
  updateActions(a, a.actions, dt);
  return updateTouristGawk(a, dt, 0, walking || !!a.actions.current || !!a.actions.queue.length);
}
const parts = a => [a.head.rotation, a.body.rotation, ...a.arms.map(r => r.rotation), a.weaponSocket.rotation];
const snap = a => parts(a).flatMap(r => [r.x, r.y, r.z]);
// a point in a part's own space, in the model's space
function inModel(a, part, p = new THREE.Vector3()) {
  a.g.updateMatrixWorld(true);
  return p.applyMatrix4(part.matrixWorld).applyMatrix4(a.g.matrixWorld.clone().invert());
}
const posed = (kind, u) => { const b = make('tourist'), p = gawkPoseAt(kind, u); updateTouristGawkApply(b, p); return b; };
function updateTouristGawkApply(b, p) {
  b.head.rotation.x += p.pitch; b.head.rotation.y += p.yaw; b.head.rotation.z += p.roll; b.body.rotation.y += p.turn;
  b.arms[0].rotation.x += p.map; b.arms[0].rotation.z += p.mapIn; b.arm.rotation.x += p.arm; b.weaponSocket.rotation.x += p.level;
}

test('both gawk poses stay in bounds, move smoothly and start and end at rest', () => {
  const n = 6000;
  for (const kind of ['map', 'dart']) {
    let prev = gawkPoseAt(kind, 0), lo = {yaw: 0}, hi = {yaw: 0};
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = gawkPoseAt(kind, u);
      for (const v of Object.values(p)) assert(Number.isFinite(v));
      assert(p.map >= MAP_LIFT - 1e-12 && p.map <= 1e-12 && p.arm >= DART_LIFT - 1e-12 && p.arm <= FEINT + 1e-12);
      assert(p.pitch <= READ_DIP + 1e-12 && p.pitch >= -.07 && Math.abs(p.roll) <= STARE_COCK + 1e-12 && Math.abs(p.turn) <= STARE_BODY + 1e-12);
      assert(p.level >= -1e-12 && p.level <= DART_LEVEL + 1e-12 && Math.abs(p.yaw) <= STARE_TURN + 1e-12);
      for (const k of Object.keys(p)) assert(Math.abs(p[k] - prev[k]) < .01, `${kind} ${k} jumps at ${u}`);
      lo.yaw = Math.min(lo.yaw, p.yaw); hi.yaw = Math.max(hi.yaw, p.yaw);
      prev = p;
    }
    for (const p of [gawkPoseAt(kind, 0), gawkPoseAt(kind, 1), gawkPoseAt(kind, .5, 0), gawkPoseAt(kind, NaN)]) assert(Object.values(p).every(v => v === 0));
    if (kind === 'map') assert(lo.yaw < -.15 && hi.yaw > STARE_TURN * .95, 'reads both ways, then turns round to stare');
  }
});

test('only tourists gawk', () => {
  assert(gawks(make('tourist')));
  for (const name of ['healer', 'rogue', 'ranger', 'archeologist', 'watchman', 'shopkeeper']) assert(!gawks(make(name)), name);
});

test('the map comes up in front of the chest, and the dart up to the eye', () => {
  const a = make('tourist'), hand = arm => new THREE.Vector3(0, -.37, 0);
  const restMap = inModel(a, a.arms[0], hand()), reading = posed('map', .3), map = inModel(reading, reading.arms[0], hand());
  assert(map.y > restMap.y + .12 && map.z > restMap.z + .05, `map up and forward (${restMap.y.toFixed(3)},${restMap.z.toFixed(3)} → ${map.y.toFixed(3)},${map.z.toFixed(3)})`);
  assert(map.x > restMap.x + .05 && map.x < 0, `map swung in toward the middle (${restMap.x.toFixed(3)} → ${map.x.toFixed(3)})`);
  assert(map.y > .6 && map.y < 1, `map at chest height (${map.y})`);
  const aim = posed('dart', .42), dart = inModel(aim, aim.weaponSocket), restDart = inModel(a, a.weaponSocket);
  assert(dart.y > restDart.y + .2 && dart.y > .72 && dart.y < 1.1, `dart at eye level (${restDart.y.toFixed(3)} → ${dart.y.toFixed(3)})`);
  assert(dart.z > restDart.z, 'held out in front');
  // the point: the dart's farthest vertex from the hand
  const geo = aim.weaponSocket.children[0].geometry.attributes.position, v = new THREE.Vector3(); let tip = null;
  for (let i = 0; i < geo.count; i++) { v.fromBufferAttribute(geo, i); if (!tip || v.length() > tip.length()) tip = v.clone(); }
  const dir = inModel(aim, aim.weaponSocket, tip).sub(dart).normalize();
  assert(dir.z > .85 && Math.abs(dir.y) < .45, `point aimed forward, about level (${dir.x.toFixed(2)},${dir.y.toFixed(2)},${dir.z.toFixed(2)})`);
});

test('a standing tourist reads the map, then sights the dart, and goes back exactly to rest', () => {
  const a = make('tourist'), rest = snap(a), dt = 1 / 60;
  let t = 0, started = null;
  for (let i = 0; i < 60 * 30 && !started; i++) { if (frame(a, dt)) started = t; t += dt; }
  assert(started != null && started >= FIRST_MIN - .1 && started <= FIRST_MIN + FIRST_SPAN + .1, `started at ${started}`);
  const seen = [];
  for (let i = 0; i < 60 * 40; i++) {
    frame(a, dt);
    const kind = a.touristGawk.cur?.kind;
    if (kind && seen.at(-1) !== kind) seen.push(kind);
    for (const v of snap(a)) assert(Number.isFinite(v));
  }
  assert.deepEqual(seen.slice(0, 2), ['map', 'dart']);
  while (a.touristGawk.cur) frame(a, dt);
  snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `part ${i} back at rest`));
  assert(LEN.map > 3 && LEN.dart > 3, 'slow enough to glide');
});

test('walking, an attack or death fades the gawk out within ~0.1 s and leaves it at rest', () => {
  for (const [kind, at] of [['map', .3], ['map', .7], ['dart', .2], ['dart', .55]]) for (const cut of ['walk', 'attack', 'die']) {
    const a = make('tourist'), rest = snap(a), dt = 1 / 60, name = `${kind}@${at} ${cut}`;
    for (let i = 0; i < 60 * 60 && !(a.touristGawk?.cur?.kind === kind && a.touristGawk.cur.u > at); i++) frame(a, dt);
    assert(a.touristGawk.cur?.u > at, name);
    if (cut === 'attack') enqueueAction(a.actions, {kind: 'attack', type: 'weapon', dir: [1, 0]});
    if (cut === 'die') enqueueAction(a.actions, {kind: 'die'});
    for (let i = 0; i < 8; i++) frame(a, dt, cut === 'walk');
    assert(a.touristGawk.f < .2, `${name}: faded to ${a.touristGawk.f}`);
    for (let i = 0; i < 60 * 3; i++) frame(a, dt, cut === 'walk');
    assert.equal(a.touristGawk.cur, null, name);
    if (cut !== 'die') snap(a).forEach((v, i) => assert(Math.abs(v - rest[i]) < 1e-9, `${name}: part ${i} back at rest`));
    else assert.equal(updateTouristGawk(a, dt, 0, false), null, 'the dead do not gawk');
  }
});
