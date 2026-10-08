import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fxTimeline} from './fx.js';
import {flightShape, flightMetal, flightLook, flightsFromFx, flightFrame, createFlights, STYLES, LAUNCH_Y, LAND_Y, thongTrail, THONG_LEN, THONG_SEGS} from './flights.js';

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
    assert.ok(Math.abs(fr.yaw - Math.PI / 2) <= STYLES.arrow.wag + 1e-9, 'faces +x');
    assert.ok(Math.abs(fr.spin - STYLES.arrow.roll * t / 1000) < 1e-9);
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

test('a thrown shuriken is the real star, laid flat, banked and spinning point-first', () => {
  const scene = new THREE.Group();
  const fl = createFlights(THREE, scene);
  const [f] = fl.play(throwTo(6, {kind: 'object', class: 2, material: 11, shape: 'shuriken'}));
  const star = scene.children[0].children[0].children[0];
  assert.equal(star.userData.part, 'star');
  const box = new THREE.Box3().setFromBufferAttribute(star.geometry.attributes.position);
  assert.ok(box.max.y - box.min.y < .015, 'flat in xz');
  for (const c of [...box.min.toArray(), ...box.max.toArray()]) assert.ok(Math.abs(c) < .09, 'centred');
  // The raked tips sit ahead of their points in the +y spin sense (atan2(-z, x) grows).
  const p = star.geometry.attributes.position;
  let lead = 0, tips = 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    if (Math.hypot(x, z) < .075) continue;
    const a = Math.atan2(-z, x), axis = Math.round((a - Math.PI / 2) / (Math.PI / 3)) * Math.PI / 3 + Math.PI / 2;
    tips++;
    if (a - axis > 0) lead++;
  }
  assert.ok(tips > 0 && lead === tips);
  let lo = Infinity, hi = -Infinity;
  for (let t = 0; t < f.end; t += 8) {
    const fr = flightFrame(f, t);
    if (!fr) continue;
    lo = Math.min(lo, fr.bank); hi = Math.max(hi, fr.bank);
  }
  const S = STYLES.shuriken;
  assert.ok(lo >= S.bank - S.wobble - 1e-9 && hi <= S.bank + S.wobble + 1e-9 && hi > lo, 'leans and wobbles');
  assert.equal(flightFrame(flightsFromFx(throwTo(6, ARROW))[0], 50).bank, 0);
  fl.update(.05, {x: 0, z: 0});
  const o = scene.children[0];
  assert.equal(o.children[0].rotation.order, 'ZYX');
  const wb = new THREE.Box3().setFromObject(o, true);
  for (const c of [...wb.min.toArray(), ...wb.max.toArray()]) assert.ok(Number.isFinite(c));
  assert.ok(wb.max.y - wb.min.y < .1, 'banked, not on edge');
  fl.dispose();
});

test('a thrown dart is the real dart, point first, rolling on its flights', () => {
  const scene = new THREE.Group();
  const fl = createFlights(THREE, scene);
  const [f] = fl.play(throwTo(6, {kind: 'object', class: 2, material: 11, shape: 'dart'}));
  const meshes = scene.children[0].children[0].children;
  assert.deepEqual(meshes.map(m => m.userData.part).sort(), ['head', 'shaft']);
  const box = new THREE.Box3();
  for (const m of meshes) box.union(new THREE.Box3().setFromBufferAttribute(m.geometry.attributes.position));
  assert.ok(Math.abs(box.min.z + box.max.z) < 1e-6, 'centred on its length');
  assert.ok(box.max.z - box.min.z > .25 && Math.max(-box.min.x, box.max.x, -box.min.y, box.max.y) < .03, 'long along z');
  const head = meshes.find(m => m.userData.part === 'head');
  const hb = new THREE.Box3().setFromBufferAttribute(head.geometry.attributes.position);
  assert.ok(Math.abs(hb.max.z - box.max.z) < 1e-6, 'the point leads');
  // It rolls at a steady rate about its length, faster than an arrow.
  const a = flightFrame(f, 40), b = flightFrame(f, 140);
  assert.ok(Math.abs(b.spin - a.spin - STYLES.dart.roll * .1) < 1e-9);
  assert.ok(STYLES.dart.roll > STYLES.arrow.roll);
  fl.update(.12, {x: 0, z: 0});
  const inner = scene.children[0].children[0];
  assert.ok(Math.abs(inner.rotation.z - STYLES.dart.roll * .12) < 1e-9);
  assert.equal(inner.rotation.x, 0);
  fl.dispose();
});

test('shot arrows and bolts are the real arrow.js models, in the look the glyph shows', () => {
  assert.equal(flightLook(ARROW, 'arrow'), 'arrow');
  assert.equal(flightLook({...ARROW, material: 8, appearance: 'runed arrow'}, 'arrow'), 'runed arrow');
  assert.equal(flightLook({...ARROW, appearance: 'crude arrow'}, 'arrow'), 'crude arrow');
  assert.equal(flightLook({...ARROW, material: 14}, 'arrow'), 'silver arrow');
  assert.equal(flightLook({...ARROW, shape: 'bolt'}, 'bolt'), 'crossbow bolt');
  assert.equal(flightLook({kind: 'object', class: 2, material: 11, shape: 'dart'}, 'dart'), '');
  const cases = [[ARROW, 'arrow'], [{...ARROW, material: 8, appearance: 'runed arrow'}, 'elven'],
    [{...ARROW, appearance: 'crude arrow'}, 'orcish'], [{...ARROW, material: 14}, 'silver'],
    [{...ARROW, material: 12, appearance: 'bamboo arrow'}, 'ya'], [{...ARROW, shape: 'bolt'}, 'bolt']];
  const scene = new THREE.Group();
  const fl = createFlights(THREE, scene);
  for (const [effect, kind] of cases) {
    const [f] = fl.play(throwTo(6, effect));
    assert.equal(f.shape, effect.shape);
    const inner = scene.children[scene.children.length - 1].children[0];
    assert.equal(inner.userData.arrow.kind, kind);
    assert.equal(inner.userData.arrow.count, 1);
    const meshes = inner.children;
    assert.deepEqual(meshes.map(m => m.userData.part).sort(), ['head', 'shaft']);
    const box = new THREE.Box3();
    for (const m of meshes) box.union(new THREE.Box3().setFromBufferAttribute(m.geometry.attributes.position));
    for (const c of [...box.min.toArray(), ...box.max.toArray()]) assert.ok(Number.isFinite(c));
    assert.ok(Math.abs(box.min.z + box.max.z) < 1e-6, 'centred on its length');
    assert.ok(box.max.z - box.min.z > .3 && Math.max(-box.min.x, box.max.x, -box.min.y, box.max.y) < .05, 'long along z');
    const head = meshes.find(m => m.userData.part === 'head');
    const hb = new THREE.Box3().setFromBufferAttribute(head.geometry.attributes.position);
    assert.ok(Math.abs(hb.max.z - box.max.z) < 1e-6, 'the point leads');
  }
  // Two arrows of one look share the template's geometry.
  fl.play(throwTo(6, ARROW));
  const kids = scene.children.map(o => o.children[0]);
  assert.equal(kids[kids.length - 1].children[0].geometry, kids[0].children[0].geometry);
  fl.dispose();
});

// boomhit() (zap.c): from the hero at (hx, hz) thrown along (dx, dz), the cells it draws.
const XDIR = [-1, -1, 0, 1, 1, 1, 0, -1], YDIR = [0, -1, -1, -1, 0, 1, 1, 1];
const boomerangFx = (hx, hz, dx, dz, stopAfter = 99) => {
  const boom = c => ({kind: 'boomerang', cmap: c});
  const steps = [{op: 'start', mode: 'flash', effect: boom(37)}];
  let i = XDIR.findIndex((x, j) => x === dx && YDIR[j] === dz), x = hx, z = hz, c = 37;
  for (let ct = 0; ct < 10; ct++) {
    i = (i + 8) % 8;
    c = 37 + 38 - c;
    steps.push({op: 'change', effect: boom(c)});
    x += XDIR[i]; z += YDIR[i];
    if (x === hx && z === hz) break;
    if (ct >= stopAfter) break;
    steps.push({op: 'draw', x, z}, {op: 'tick'});
    if (ct % 5 !== 0) i++;
  }
  steps.push({op: 'end'});
  return fxTimeline({type: 'fx', steps});
};

test('a boomerang whirls round its loop, banked into the turn, and flies back to the hand', () => {
  assert.equal(flightShape({kind: 'boomerang', cmap: 37}), 'boomerang');
  const [f, ...rest] = flightsFromFx(boomerangFx(10, 10, 1, 0));
  assert.equal(rest.length, 0);
  assert.equal(f.shape, 'boomerang');
  assert.deepEqual(f.knots[0], {x: 10, z: 10, t: 0});
  assert.deepEqual(f.knots.at(-1), {x: 10, z: 10, t: 500}, 'nine cells, then home');
  assert.equal(f.knots.length, 11);
  assert.equal(f.endY, LAUNCH_Y);
  assert.equal(f.turn, -1, 'xdir order turns it toward -x from +z');
  // boomhit() always loops the same way (a right-handed throw), whatever the direction.
  assert.equal(flightsFromFx(boomerangFx(10, 10, -1, 0))[0].turn, -1);
  assert.equal(flightsFromFx(boomerangFx(10, 10, 0, 1))[0].turn, -1);
  let prev = null, maxStep = 0;
  for (let t = 0; t < f.end; t += 1000 / 60) {
    const fr = flightFrame(f, t);
    for (const v of Object.values(fr)) assert.ok(Number.isFinite(v));
    assert.ok(fr.y > .8 && fr.y < LAUNCH_Y + STYLES.boomerang.maxArc + 1e-9, 'flies level at hand height');
    assert.ok(fr.bank * -f.turn >= STYLES.boomerang.bank - STYLES.boomerang.wobble - 1e-9, 'leans into the turn');
    assert.ok(fr.x > 8.5 && fr.x < 13.5 && fr.z > 8.5 && fr.z < 13.5);
    if (prev) maxStep = Math.max(maxStep, Math.hypot(fr.x - prev.x, fr.z - prev.z));
    prev = fr;
  }
  assert.ok(maxStep < .6, "smooth (a diagonal cell per tick is .47 a frame)");
  const near = flightFrame(f, f.end - 1);
  assert.ok(Math.hypot(near.x - 10, near.z - 10) < .05, 'back at the hand');
  // Cut short (it hit something): ends on its last cell and drops.
  const [s] = flightsFromFx(boomerangFx(10, 10, 1, 0, 4));
  assert.equal(s.knots.length, 5);
  assert.equal(s.endY, undefined);
  // Drawn: the real boomerang laid flat, spinning and leaning about its line of flight.
  const scene = new THREE.Group();
  const fl = createFlights(THREE, scene);
  fl.play(boomerangFx(10, 10, 1, 0));
  const inner = scene.children[0].children[0];
  assert.deepEqual(inner.children.map(m => m.userData.part).sort(), ['fittings', 'stick']);
  const box = new THREE.Box3();
  for (const m of inner.children) box.union(new THREE.Box3().setFromBufferAttribute(m.geometry.attributes.position));
  assert.ok(box.max.y - box.min.y < .04 && box.max.x - box.min.x > .3, 'flat in xz');
  for (const c of [...box.min.toArray(), ...box.max.toArray()]) assert.ok(Math.abs(c) < .25, 'centred');
  fl.update(.2, {x: 10, z: 10});
  assert.equal(inner.rotation.order, 'ZYX');
  assert.ok(Math.abs(inner.rotation.y) > 1 && inner.rotation.z !== 0);
  assert.equal(fl.update(.4, {x: 10, z: 10}), 0, 'gone once home');
  fl.dispose();
});

test('a shot arrow rolls slowly on its fletching and fishtails off the string; a bolt only rolls', () => {
  const [f] = flightsFromFx(throwTo(8, ARROW));
  const [g] = flightsFromFx(throwTo(8, {...ARROW, shape: 'bolt'}));
  const line = Math.atan2(1, 0);
  assert.ok(Math.abs(flightFrame(f, f.start).yaw - line) < 1e-9, 'leaves on the line');
  let peak = 0, late = 0, prev = flightFrame(f, f.start);
  for (let t = f.start + 5; t < f.end; t += 5) {
    const fr = flightFrame(f, t);
    for (const v of Object.values(fr)) assert.ok(Number.isFinite(v));
    const off = Math.abs(fr.yaw - line);
    assert.ok(off <= STYLES.arrow.wag + 1e-9);
    if (t - f.start < 120) peak = Math.max(peak, off);
    else late = Math.max(late, off);
    // Roll is steady and slow: a fraction of a turn per frame-sized step.
    assert.ok(Math.abs(fr.spin - prev.spin - STYLES.arrow.roll * .005) < 1e-9);
    prev = fr;
    const fg = flightFrame(g, t);
    if (fg) { assert.ok(Math.abs(fg.yaw - line) < 1e-9, 'a bolt flies true'); assert.ok(Math.abs(fg.spin - STYLES.bolt.roll * (t - g.start) / 1000) < 1e-9); }
  }
  assert.ok(peak > STYLES.arrow.wag * .4, 'a visible fishtail early');
  assert.ok(f.end - f.start <= 120 || late < peak * .5, 'dies away');
  // The arrow's model rolls about its own length (inner z), not end over end.
  const scene = new THREE.Group();
  const fl = createFlights(THREE, scene);
  fl.play(throwTo(8, ARROW));
  fl.update(.1, {x: 0, z: 0});
  const inner = scene.children[0].children[0];
  assert.ok(Math.abs(inner.rotation.z - STYLES.arrow.roll * .1) < 1e-9);
  assert.equal(inner.rotation.x, 0);
  fl.dispose();
});

test('a thrown aklys tumbles with its thong trailing, sagging and whipping behind it', () => {
  const AKLYS = {kind: 'object', class: 2, material: 8, shape: 'aklys', appearance: 'thonged club'};
  assert.equal(flightShape(AKLYS), 'aklys');
  const [f] = flightsFromFx(throwTo(7, AKLYS));
  assert.equal(thongTrail(f, -1), null);
  assert.equal(thongTrail(f, f.end), null);
  let maxWhip = 0;
  for (let t = 0; t < f.end; t += 5) {
    const fr = flightFrame(f, t), pts = thongTrail(f, t);
    assert.equal(pts.length, THONG_SEGS + 1);
    assert.deepEqual(pts[0], {x: fr.x, y: fr.y, z: fr.z}, 'tied to the club');
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i], q = pts[i - 1];
      for (const v of [p.x, p.y, p.z]) assert.ok(Number.isFinite(v));
      assert.ok(p.y >= .02 && p.y < 1.5);
      assert.ok(p.x <= fr.x + .1, 'trails behind the club');
      assert.ok(p.x >= 2 - .2, 'never behind the thrower');
      maxWhip = Math.max(maxWhip, Math.abs(p.z - 2));
      len += Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    }
    assert.ok(len < THONG_LEN * 1.6, 'never stretches far past its length');
    if (t > 120) assert.ok(len > THONG_LEN * .8, 'fully paid out in mid-flight');
  }
  assert.ok(maxWhip > .02 && maxWhip < .1, 'whips a little side to side');

  const scene = new THREE.Group();
  const fl = createFlights(THREE, scene);
  fl.play(throwTo(7, AKLYS));
  assert.equal(scene.children.length, 1);
  for (let i = 0; i < 14; i++) {
    fl.update(1 / 60, {x: 2, z: 2});
    const o = scene.children[0];
    if (!o.visible) continue;
    o.updateMatrixWorld(true);
    const thong = o.children.find(c => !c.matrixAutoUpdate);
    assert.ok(thong, 'has a thong');
    const box = new THREE.Box3().setFromObject(o, true);
    for (const c of [...box.min.toArray(), ...box.max.toArray()]) assert.ok(Number.isFinite(c));
    assert.ok(box.min.y >= -.01 && box.max.y < 2);
    // The links join end to end, starting at the club's iron eye.
    const ends = thong.children.filter(m => m.visible).map(m => [
      new THREE.Vector3(0, 0, 0).applyMatrix4(m.matrixWorld), new THREE.Vector3(0, 1, 0).applyMatrix4(m.matrixWorld)]);
    for (let k = 1; k < ends.length; k++) assert.ok(ends[k][0].distanceTo(ends[k - 1][1]) < 1e-6);
    assert.ok(ends[0][0].distanceTo(o.position) < .35, 'tied near the club');
  }
  fl.update(1, {x: 2, z: 2});
  assert.equal(scene.children.length, 0);
  fl.dispose();
});

test('a rolling boulder is the real granite mesh, centred so it tumbles about its middle', () => {
  const scene = new THREE.Scene(), fl = createFlights(THREE, scene);
  fl.play(throwTo(6, {kind: 'object', class: 14, material: 21}));
  fl.update(.05);
  const rock = scene.children[0].children[0].children[0];
  assert.ok(rock.geometry.attributes.color, 'carries the baked vertex colours of the floor boulder');
  rock.geometry.computeBoundingSphere();
  const c = rock.geometry.boundingSphere.center;
  assert.ok(Math.hypot(c.x, c.y, c.z) < 1e-6, 'centred on its pivot');
  assert.ok(rock.geometry.boundingSphere.radius * rock.scale.x <= STYLES.boulder.radius + 1e-6, 'no corner digs into the floor');
  fl.dispose();
});
