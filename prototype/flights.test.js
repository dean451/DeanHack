import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fxTimeline} from './fx.js';
import {flightShape, flightMetal, flightsFromFx, flightFrame, createFlights, STYLES, LAUNCH_Y, LAND_Y} from './flights.js';

// A flash-mode throw from the hero at (2, 2) towards +x, one cell per tick.
const throwTo = (endX, effect, dz = 0) => {
  const steps = [{op: 'start', mode: 'flash', effect}];
  for (let x = 3, z = 2; x <= endX; x++, z += dz) steps.push({op: 'draw', x, z}, {op: 'tick'});
  steps.push({op: 'end'});
  return fxTimeline({type: 'fx', steps});
};
const ARROW = {kind: 'object', otyp: 30, class: 2, material: 11, shape: 'arrow'};

test('flight shapes come from class, bridge shape and material only', () => {
  assert.equal(flightShape(ARROW), 'arrow');
  assert.equal(flightShape({kind: 'object', class: 2, shape: 'dagger'}), 'dagger');
  assert.equal(flightShape({kind: 'object', class: 2}), 'weapon', 'older bridge without shape');
  assert.equal(flightShape({kind: 'object', class: 2, shape: 'boulder'}), 'weapon');
  assert.equal(flightShape({kind: 'object', class: 13, material: 19}), 'gem');
  assert.equal(flightShape({kind: 'object', class: 13, material: 20}), 'gem', 'real gems look like glass');
  assert.equal(flightShape({kind: 'object', class: 13, material: 21}), 'stone');
  assert.equal(flightShape({kind: 'object', class: 14}), 'boulder');
  assert.equal(flightShape({kind: 'object', class: 8}), 'flask');
  assert.equal(flightShape({kind: 'object', class: 17}), null, 'venom.js draws venom');
  assert.equal(flightShape({kind: 'zap'}), null);
  assert.equal(flightMetal(14), 'silver');
  assert.equal(flightMetal(8), 'wood');
  assert.equal(flightMetal(11), 'steel');
});

test('a flight starts one cell behind the first drawn cell and lands on the last', () => {
  const [f, ...rest] = flightsFromFx(throwTo(7, ARROW));
  assert.equal(rest.length, 0);
  assert.equal(f.shape, 'arrow');
  assert.deepEqual(f.knots[0], {x: 2, z: 2, t: 0});
  assert.deepEqual(f.knots.at(-1), {x: 7, z: 2, t: 250});
  assert.equal(f.start, 0);
  assert.equal(f.end, 250);
  // Diagonal throws step back diagonally.
  const [d] = flightsFromFx(throwTo(5, ARROW, 1));
  assert.deepEqual(d.knots[0], {x: 2, z: 1, t: 0});
  // Zaps and explosions are not flights.
  assert.deepEqual(flightsFromFx(throwTo(5, {kind: 'zap', zap: 'fire'})), []);
});

test('an arrow flies nose-first on a shallow arc and is gone when it lands', () => {
  const [f] = flightsFromFx(throwTo(8, ARROW));
  assert.equal(flightFrame(f, -1), null);
  assert.equal(flightFrame(f, f.end), null);
  let prevX = -Infinity, peak = 0;
  for (let t = 0; t < f.end; t += 5) {
    const fr = flightFrame(f, t);
    for (const v of Object.values(fr)) assert.ok(Number.isFinite(v));
    assert.ok(fr.x >= prevX, 'moves forward');
    prevX = fr.x;
    assert.ok(Math.abs(fr.yaw - Math.PI / 2) < 1e-9, 'faces +x');
    assert.equal(fr.spin, 0);
    assert.ok(fr.y > .3 && fr.y < LAUNCH_Y + STYLES.arrow.maxArc + 1e-9);
    assert.ok(Math.abs(fr.pitch) < .6);
    peak = Math.max(peak, fr.y);
  }
  assert.ok(peak > LAUNCH_Y, 'rises before it falls');
  const early = flightFrame(f, 10), late = flightFrame(f, f.end - 5);
  assert.ok(early.pitch > 0 && late.pitch < 0, 'nose up, then down');
  assert.ok(Math.abs(late.y - LAND_Y) < .05);
  assert.ok(Math.abs(late.x - 8) < .1);
});

test('daggers tumble, shuriken spin flat and boulders roll on the floor', () => {
  const [dagger] = flightsFromFx(throwTo(6, {kind: 'object', class: 2, shape: 'dagger'}));
  assert.ok(flightFrame(dagger, 150).spin > flightFrame(dagger, 50).spin);
  const [boulder] = flightsFromFx(throwTo(6, {kind: 'object', class: 14, material: 21}));
  for (let t = 0; t < boulder.end; t += 10) {
    const fr = flightFrame(boulder, t);
    assert.equal(fr.y, STYLES.boulder.radius);
    assert.equal(fr.pitch, 0);
  }
  // Rolled distance over radius: 3 cells in, it has turned 3 / radius.
  assert.ok(Math.abs(flightFrame(boulder, 150).spin - 3 / STYLES.boulder.radius) < 1e-9);
});

test('a volley of arrows makes one flight per sequence', () => {
  const steps = [];
  for (let n = 0; n < 3; n++) {
    steps.push({op: 'start', mode: 'flash', ...{glyph: 1}, effect: ARROW});
    for (let x = 3; x <= 6; x++) steps.push({op: 'draw', x, z: 2}, {op: 'tick'});
    steps.push({op: 'end'});
  }
  const flights = flightsFromFx(fxTimeline({type: 'fx', steps}));
  assert.equal(flights.length, 3);
  assert.deepEqual(flights.map(f => f.start), [0, 200, 400]);
});

test('createFlights draws each flight while it is in the air and then removes it', () => {
  const scene = new THREE.Group();
  const fl = createFlights(THREE, scene);
  const shapes = ['arrow', 'bolt', 'dart', 'spear', 'dagger', 'shuriken', 'weapon'];
  for (const [i, shape] of shapes.entries()) fl.play(throwTo(6, {kind: 'object', class: 2, material: i ? 11 : 8, shape}));
  for (const [cls, material] of [[13, 21], [13, 19], [12, 15], [8, 19], [15, 11], [14, 21], [6, 8]]) fl.play(throwTo(6, {kind: 'object', class: cls, material}));
  assert.equal(fl.count, 12, 'capped');
  assert.equal(scene.children.length, 12);
  fl.update(.1, {x: 2, z: 2});
  for (const o of scene.children) {
    assert.ok(o.visible);
    const box = new THREE.Box3().setFromObject(o, true);
    for (const v of [box.min, box.max]) for (const c of v.toArray()) assert.ok(Number.isFinite(c));
    assert.ok(box.min.y >= -.01, 'above the floor');
    assert.ok(box.max.y < 2);
  }
  fl.update(.2, {x: 2, z: 2});
  assert.equal(fl.count, 0);
  assert.equal(scene.children.length, 0);
  fl.dispose();
});
