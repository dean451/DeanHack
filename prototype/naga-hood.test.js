import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature, bakeDraws} from './creatures.js';
import {rearPose, spreadHood, hoodSpread, hoodParts, HOOD} from './naga-rear.js';
import {coilRings, coilDepth} from './naga-rest.js';
import {birdPoser} from './cockatrice-rest.js';

// Stage 4 of the creature plan for the nagas (family N), step 3: the hood spreads with the rear, as a threatened
// cobra's does (CREATURE-MEASURES.md, Nagas): the fan widens sideways about the head's centre line, behind the face.
const GROWN = ['red', 'black', 'golden', 'guardian', 'white'].map(k => `${k} naga`);
const make = name => { const a = createCreature({name, symbol: 78}); a.g.updateMatrixWorld(true); return a; };
const fanOf = a => hoodParts(a).find(o => o.userData.part === 'hood');
const skullOf = a => a.joints.head.children.find(o => o.userData.part === 'head');
// the part's vertices in the head bone's frame, and in the world
const local = m => { m.updateMatrix(); const p = m.geometry.attributes.position, out = []; for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrix)); return out; };
const world = m => { m.updateMatrixWorld(true); const p = m.geometry.attributes.position, out = []; for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld)); return out; };
const span = (pts, k) => { const v = pts.map(p => p[k]); return [Math.min(...v), Math.max(...v)]; };

test('every grown naga has a hood fan of its own on the head bone, and it survives bakeDraws unmerged', () => {
  for (const n of GROWN) {
    const a = make(n), fan = fanOf(a);
    assert.ok(fan, `${n}: a hood`);
    assert.equal(fan.parent, a.joints.head, `${n}: the hood rides the head bone`);
    bakeDraws(a);
    const after = fanOf(a);
    assert.equal(after, fan, `${n}: the same hood mesh after bakeDraws`);
    assert.equal(after.geometry.attributes.position.count, fan.geometry.attributes.position.count, `${n}: nothing merged into it`);
    spreadHood(a, 1);
    assert.ok(after.scale.x > 1, `${n}: the baked naga's hood still spreads`);
  }
  assert.equal(hoodParts(make('guardian naga')).length, 2, 'the guardian\'s eye spots spread with its hood');
});

test('the hatchlings have no hood and spread nothing', () => {
  for (const k of ['red', 'black', 'golden', 'guardian', 'white']) {
    const a = make(`${k} naga hatchling`);
    assert.equal(hoodParts(a).length, 0, k);
    assert.equal(hoodSpread(a), 1, k);
    assert.equal(spreadHood(a, 1), 1, k);
  }
});

test('spread, the hood is HOOD.wide of the skull across (or at least HOOD.least wider), sideways only, about the head\'s centre', () => {
  for (const n of GROWN) {
    const a = make(n), fan = fanOf(a), skull = span(local(skullOf(a)), 'x'), before = local(fan);
    const bx = span(before, 'x'), by = span(before, 'y'), bz = span(before, 'z');
    spreadHood(a, 1);
    const after = local(fan), ax = span(after, 'x'), w = ax[1] - ax[0], built = bx[1] - bx[0];
    assert.ok(w >= Math.max(HOOD.wide * (skull[1] - skull[0]), HOOD.least * built) - 1e-6, `${n}: ${(w * 100).toFixed(1)} cm across, ${(w / built).toFixed(2)} of its built width`);
    assert.ok(w > 1.9 * (skull[1] - skull[0]), `${n}: the hood ${(w / (skull[1] - skull[0])).toFixed(2)} of the skull across`);
    // the centre line stays where it was, and the height and depth do not change: it opens sideways, behind the face
    assert.ok(Math.abs((ax[0] + ax[1]) / 2 - (bx[0] + bx[1]) / 2) < .015, `${n}: centred`);
    assert.deepEqual(span(after, 'y'), by, `${n}: height`);
    assert.deepEqual(span(after, 'z'), bz, `${n}: depth`);
  }
});

test('half spread is half the way, and folding returns the hood exactly to its built scale', () => {
  for (const n of GROWN) {
    const a = make(n), f = hoodSpread(a);
    assert.ok(Math.abs(spreadHood(a, .5) - (1 + (f - 1) / 2)) < 1e-12, n);
    assert.equal(spreadHood(a, 7), f, `${n}: clamped`);
    spreadHood(a, 0);
    for (const o of hoodParts(a)) assert.deepEqual(o.scale.toArray(), [1, 1, 1], `${n} ${o.userData.part}`);
  }
});

test('reared with the hood spread: the hood clears the floor and the coil, and rearPose reports the spread', () => {
  for (const n of GROWN) {
    const a = make(n), r = rearPose(a), floor = a.g.position.y, {apply} = birdPoser(a);
    assert.equal(r.hood, hoodSpread(a), n);
    apply(r.pose); spreadHood(a, 1);
    const pts = world(fanOf(a)), rings = coilRings(a);
    assert.ok(Math.min(...pts.map(p => p.y)) > floor + .1, `${n}: the hood well off the floor`);
    const deep = Math.max(...pts.map(p => coilDepth(rings, p)));
    assert.ok(deep < .02, `${n}: the hood ${(deep * 100).toFixed(1)} cm into the coil`);
    apply({}); spreadHood(a, 0);
  }
});
