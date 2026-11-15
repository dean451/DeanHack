import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createGoblin} from './goblin.js';
import {shufflePose, turnPlan, turnAt, turns, TURN} from './lich-turn.js';
import {REST} from './lich-rest.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';
import {LICH} from './creature-measures.js';

// Stage 4 of the creature plan for the liches (family L), step 2: the signature, the turn in one piece.
const FAMILY = [['lich', 2], ['demilich', 1], ['master lich', 5], ['arch-lich', 6], ['unknown L', 3]];
const make = ([name, color]) => { const a = createCreature({name, symbol: 76, color}); a.g.updateMatrixWorld(true); return a; };
const solved = new Map(), shuffle = (f, side) => { const k = `${f[0]}${side}`; if (!solved.has(k)) solved.set(k, shufflePose(make(f), side)); return solved.get(k); };
const vertices = a => { const out = [], v = new THREE.Vector3(); a.g.updateMatrixWorld(true);
  a.g.traverse(m => { if (!m.isMesh) return; if (m.isSkinnedMesh) m.skeleton.update(); const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) out.push((m.isSkinnedMesh ? m.getVertexPosition(i, v) : v.fromBufferAttribute(p, i)).applyMatrix4(m.matrixWorld).clone()); });
  return out; };
const find = (a, test) => { let hit = null; a.g.traverse(m => { if (!hit && m.isMesh && test(m)) hit = m; }); return hit; };
const hoodOf = a => find(a, m => m.geometry.type === 'SphereGeometry' && m.geometry.parameters.radius === .24);
const staffOf = a => find(a, m => m.parent === a.body && m.geometry.type !== 'SphereGeometry' && new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).y > 1);
const SIDES = [-1, 1];

test('every lich turns; a goblin does not', () => {
  for (const f of FAMILY) assert(turns(make(f)), f[0]);
  assert(!turns(createGoblin('goblin')) && !turns(null));
});

test('each shuffle meets every goal under 2 cm on every lich, both feet', () => {
  for (const f of FAMILY) for (const side of SIDES) { const worst = Math.max(...shuffle(f, side).residuals.flat().map(v => Math.abs(v) * 100));
    assert(worst < 2, `${f[0]} ${side}: worst goal ${worst.toFixed(2)} cm`); }
});

test('the weight rocks over the foot on its side, the stoop kept', () => {
  for (const f of FAMILY) for (const side of SIDES) { const a = make(f), P = rolesOf(a), r = shuffle(f, side);
    birdPoser(a).apply(r.pose);
    const d = P.withers().sub(P.rump()), foot = P[`paw:${side < 0 ? 'l' : 'r'}h`]().x - a.g.position.x;
    // out over the foot, at least half the roll's reach, and the right way
    assert(Math.sign(d.x) === side && Math.sign(foot) === side, `${f[0]} ${side}: leans ${(d.x * 100).toFixed(1)} cm`);
    assert(Math.abs(d.x) > .5 * Math.sin(TURN.roll) * r.trunk, `${f[0]} ${side}: leans only ${(d.x * 100).toFixed(1)} cm`);
    // forward by the stoop, as at rest
    const lean = Math.atan2(d.z, d.y);
    assert(Math.abs(lean - REST.stoop) < 2 * Math.PI / 180, `${f[0]} ${side}: stoops ${(lean * 180 / Math.PI).toFixed(1)} degrees`);
    assert(P.rump().distanceTo(r.rump) < 1e-6, `${f[0]} ${side}: the waist stays where it stood`); }
});

test('in one piece: the neck is never posed, the face keeps its place in the hood, the staff stays planted', () => {
  for (const f of FAMILY) for (const side of SIDES) { const a = make(f), r = shuffle(f, side), staff = staffOf(a), at = staff.getWorldPosition(new THREE.Vector3());
    for (const n of Object.keys(r.pose)) assert(!/^neck|^head|^jaw/.test(n), `${f[0]}: ${n} posed`);
    const hood = hoodOf(a), head = a.joints.head, eyes = () => [-.06, .06].map(x => hood.worldToLocal(head.localToWorld(new THREE.Vector3(x, .13, .18))));
    const before = eyes();
    birdPoser(a).apply(r.pose);
    assert(staff.getWorldPosition(new THREE.Vector3()).distanceTo(at) < 1e-6, `${f[0]} ${side}: the staff moved`);
    eyes().forEach((e, i) => assert(e.distanceTo(before[i]) < .002, `${f[0]} ${side}: an eye moved ${(e.distanceTo(before[i]) * 100).toFixed(1)} cm in the hood`)); }
});

test('the free hand hangs plumb outside the robe, the staff hand on its grip', () => {
  for (const f of FAMILY) for (const side of SIDES) { const a = make(f), P = rolesOf(a), r = shuffle(f, side), s = a.g.scale.x;
    birdPoser(a).apply(r.pose);
    const h = P['paw:lf'](), sh = P['shoulder:l']();
    assert(Math.hypot(h.x - sh.x, h.z - sh.z) < .02, `${f[0]} ${side}: the hand off plumb`);
    const y = (h.y - a.g.position.y) / s, robe = (.32 - .15 * Math.min(1, y / .7)) * s;
    assert(Math.hypot(h.x - a.g.position.x, h.z - a.g.position.z) > robe, `${f[0]} ${side}: the hand inside the robe`);
    assert(P['paw:rf']().distanceTo(r.grip) < .01, `${f[0]} ${side}: the staff hand off its grip`); }
});

test('nothing goes through the floor and the hem stays down', () => {
  for (const f of FAMILY) for (const side of SIDES) { const a = make(f), floor = a.g.position.y, standing = Math.min(...vertices(a).map(v => v.y));
    birdPoser(a).apply(shuffle(f, side).pose);
    const low = Math.min(...vertices(a).map(v => v.y));
    assert(low > Math.min(standing, floor) - .005, `${f[0]} ${side}: lowest ${((low - floor) * 100).toFixed(1)} cm`);
    assert(Math.abs(low - standing) < .005, `${f[0]} ${side}: the hem lifted`); }
});

test('solving returns every joint and the body exactly to the built values', () => {
  for (const f of FAMILY) { const a = make(f), built = {};
    for (const [n, o] of Object.entries(a.joints)) built[n] = o.rotation.toArray().slice(0, 3);
    const body = a.body.position.toArray();
    shufflePose(a, 1); shufflePose(a, -1);
    for (const [n, o] of Object.entries(a.joints)) assert.deepEqual(o.rotation.toArray().slice(0, 3), built[n], `${f[0]} ${n}`);
    assert.deepEqual(a.body.position.toArray(), body); }
});

test('a half turn takes the measured slow time in the measured steps, after a pause', () => {
  const p = turnPlan(Math.PI);
  assert.equal(p.steps, LICH.turnSteps);
  assert(Math.abs(p.seconds - 2.18) < 1e-9, `a half turn in ${p.seconds} s`);
  assert(p.delay > 0);
  // a smaller turn is shorter and takes fewer shuffles, never none; past a half turn it is the half turn's
  const q = turnPlan(-Math.PI / 4);
  assert(q.steps === 1 && Math.abs(q.seconds - p.seconds / 4) < 1e-9);
  assert.equal(turnPlan(Math.PI / 2).steps, 2);
  assert.equal(turnPlan(1.5 * Math.PI).seconds, p.seconds);
});

test('the yaw ratchets: still through the pause, moving then held in each step, ending exactly on the angle with no sway', () => {
  for (const angle of [Math.PI, -Math.PI / 2, .3]) { const p = turnPlan(angle), dt = 1 / 240;
    assert.deepEqual(turnAt(p, 0), {yaw: 0, side: 0, sway: 0, done: false});
    assert.equal(turnAt(p, p.delay * .99).yaw, 0);
    let last = 0, held = 0, n = 0;
    for (let t = p.delay; t < p.delay + p.seconds; t += dt, n++) { const s = turnAt(p, t);
      assert(s.yaw >= last - 1e-12 && s.yaw <= 1 && s.sway >= 0 && s.sway <= 1, `${angle} at ${t}`);
      if (s.yaw === last) held++; last = s.yaw; }
    // held still for a good share of the turn (the ratchet), never a smooth spin
    assert(held / n > .4, `${angle}: held ${(held / n * 100).toFixed(0)}% of the turn`);
    for (const t of [p.delay + p.seconds, p.delay + p.seconds + 5]) assert.deepEqual(turnAt(p, t), {yaw: 1, side: 0, sway: 0, done: true});
    // each step's yaw lands on its share, and the sway is back to nothing at every step's end
    const step = p.seconds / p.steps;
    for (let i = 1; i < p.steps; i++) { const s = turnAt(p, p.delay + i * step - 1e-9);
      assert(Math.abs(s.yaw - i / p.steps) < 1e-6 && s.sway < 1e-6, `${angle}: step ${i}`); } }
});

test('the weight starts on the outside foot of the turn and alternates', () => {
  for (const angle of [Math.PI, -Math.PI]) { const p = turnPlan(angle), step = p.seconds / p.steps;
    const sides = [...Array(p.steps)].map((_, i) => turnAt(p, p.delay + (i + .5) * step).side);
    assert.equal(sides[0], angle > 0 ? -1 : 1, `${angle}: first on ${sides[0]}`);
    sides.forEach((s, i) => i && assert.equal(s, -sides[i - 1])); }
});
