import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTrap, trapKind} from './trap.js';
import {animatePortal, createSheolVortex, funnelY, intoEye, VORTEX} from './portal-fx.js';
import {createVibratingSquare, humBeat, plateShake, ripple, VIBRATE} from './vibrating-square.js';
import {createElberethWard, syncWard, wardGlow, wardMote, WARD_COLUMN, WARD_RADIUS} from './elbereth-ward.js';
import {createThroneVanish, thronePose, glyphFlight, VANISH, LOGIC} from './throne-vanish.js';

// World-space bounds of everything visible under o (sprites and points by position).
function bounds(o) {
  o.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  o.traverse(c => {
    if (!c.visible) return;
    if (c.isSprite) { box.expandByPoint(v.setFromMatrixPosition(c.matrixWorld)); return; }
    const p = c.geometry?.attributes?.position;
    if (!p) return;
    if (c.isInstancedMesh) { const m = new THREE.Matrix4(); for (let i = 0; i < c.count; i++) { c.getMatrixAt(i, m); box.expandByPoint(v.setFromMatrixPosition(m).applyMatrix4(c.matrixWorld)); } return; }
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(c.matrixWorld));
  });
  return box;
}
const finiteBox = b => [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite);
function countDisposed(o) {
  let n = 0; const seen = new Set();
  o.traverse(c => { for (const m of [c.material].flat()) if (m && !seen.has(m)) { seen.add(m); m.addEventListener('dispose', () => n++); } });
  return () => n;
}

test('the trap name tells the vibrating square apart from the teleport trap', () => {
  assert.equal(trapKind(94, 5), 'teleport');
  assert.equal(trapKind(94, 5, 'teleportation trap'), 'teleport');
  assert.equal(trapKind(94, 5, 'vibrating square'), 'vibrating');
  assert.equal(trapKind(94, 13, 'magic portal'), 'portal');
});

test('ordinary portals turn, breathe and draw their motes in, tinted by where they lead', () => {
  for (const style of ['other', 'quest', 'ludios', 'planes']) {
    const m = createTrap('portal', 3);
    assert.equal(animatePortal(m, style, 3), true);
    const rift = m.getObjectByName('rift'), arc = rift.children.find(o => o.geometry?.type === 'TorusGeometry');
    const r0 = arc.rotation.z;
    for (let t = 0; t < 6; t += .1) {
      m.userData.animate(t);
      assert(finiteBox(bounds(m)));
    }
    assert.notEqual(arc.rotation.z, r0, 'arcs spin');
    const b = bounds(m);
    assert(b.max.x <= .5 && b.min.x >= -.5 && b.min.y >= -.01 && b.max.y < 1.2, `${style} stays in its tile`);
    if (style === 'quest') assert(arc.material.color.r > arc.material.color.b, 'quest portal is amber');
    const disposed = countDisposed(m); m.userData.dispose(); assert(disposed() > 0);
  }
  assert.equal(animatePortal(createTrap('pit', 1), 'other'), false);
});

test('the Sheol vortex is an icy funnel that swallows shards and snow, inside its tile', () => {
  assert.equal(funnelY(VORTEX.radius), 0);
  assert(funnelY(0) <= -VORTEX.depth + 1e-9 && funnelY(0) < funnelY(.2) && funnelY(.2) < funnelY(.4));
  // shards spiral in: radius shrinks, and they end low in the eye
  const start = intoEye(0, 1, .6), end = intoEye(.999, 1, .6);
  assert(Math.hypot(start.x, start.z) > .4 && Math.hypot(end.x, end.z) < .03 && end.y < 0);
  let lastR = Infinity;
  for (let u = 0; u <= 1; u += .05) { const p = intoEye(u, 2, .5), r = Math.hypot(p.x, p.z); assert(r <= lastR + 1e-9); lastR = r; }
  const g = createSheolVortex(9);
  assert.equal(g.userData.hidesFloor, true);
  for (let t = 0; t < 10; t += 1 / 30) {
    g.userData.animate(t);
    const b = bounds(g);
    assert(finiteBox(b));
    assert(b.min.x >= -.51 && b.max.x <= .51 && b.min.z >= -.51 && b.max.z <= .51, 'inside the tile');
    assert(b.min.y >= -VORTEX.depth - .01 && b.max.y <= VORTEX.height, 'from the eye to the ribbon tops');
  }
  const disposed = countDisposed(g); g.userData.dispose(); assert(disposed() >= 6);
});

test('the vibrating square trembles, beats and sends ripples out to the tile edge', () => {
  let lo = 1, hi = 0;
  for (let t = 0; t < 2.5; t += .01) {
    const b = humBeat(t); lo = Math.min(lo, b); hi = Math.max(hi, b);
    const s = plateShake(t); assert(Math.abs(s.x) <= VIBRATE.shake && Math.abs(s.y) <= VIBRATE.shake && Math.abs(s.z) <= VIBRATE.shake);
    for (let i = 0; i < VIBRATE.ripples; i++) { const r = ripple(i, t); assert(r.size >= VIBRATE.plate && r.size <= VIBRATE.reach && r.alpha >= 0 && r.alpha <= 1); }
  }
  assert(lo < .02 && hi > .98, 'the hum beats');
  const g = createVibratingSquare(4);
  let meshes = 0; g.traverse(o => { if (o.isMesh) meshes++; });
  assert(meshes <= 8, `few draws (${meshes})`);
  for (let t = 0; t < 4; t += 1 / 60) {
    g.userData.animate(t);
    const b = bounds(g);
    assert(finiteBox(b) && b.min.x >= -.5 && b.max.x <= .5 && b.min.z >= -.5 && b.max.z <= .5 && b.max.y < .1);
  }
  const disposed = countDisposed(g); g.userData.dispose(); assert(disposed() >= 4);
});

test('an Elbereth ward glows in its engraving\'s colour, turns, and comes and goes with the cell', () => {
  for (const type of ['dust', 'engrave', 'burn', 'mark', 'blood']) {
    for (let t = 0; t < 8; t += .05) { const v = wardGlow(type, t, 1); assert(v >= .4 && v <= 1.01, `${type} ${v}`); }
  }
  for (let i = 0; i < 10; i++) for (let t = 0; t < 7; t += .1) {
    const m = wardMote(i, t); assert(m.y >= 0 && m.y <= WARD_COLUMN + .05 && Math.hypot(m.x, m.z) <= WARD_RADIUS && m.alpha >= 0 && m.alpha <= 1);
  }
  const w = createElberethWard('burn', 2);
  for (let t = 0; t < 5; t += .1) { w.userData.animate(t); const b = bounds(w); assert(finiteBox(b) && b.max.x <= .5 && b.min.x >= -.5 && b.max.y <= WARD_COLUMN + .05); }
  const tile = new THREE.Group(); tile.userData = {};
  assert.equal(syncWard(tile, {x: 1, z: 2}), null);
  assert.equal(syncWard(tile, {x: 1, z: 2, engraving: {type: 'dust', elbereth: false}}), null, 'other writing is no ward');
  const a = syncWard(tile, {x: 1, z: 2, engraving: {type: 'dust', elbereth: true}});
  assert(a && tile.children.includes(a) && a.userData.wardType === 'dust');
  assert.equal(syncWard(tile, {x: 1, z: 2, engraving: {type: 'dust', elbereth: true}}), a, 'kept while unchanged');
  const disposedA = countDisposed(a);
  const b = syncWard(tile, {x: 1, z: 2, engraving: {type: 'burn', elbereth: true}});
  assert(b !== a && disposedA() > 0 && !tile.children.includes(a) && b.userData.wardType === 'burn');
  assert.equal(syncWard(tile, {x: 1, z: 2}), null);
  assert(!tile.children.includes(b) && tile.userData.ward === null, 'gone once the hero no longer believes it is there');
});

test('a vanishing throne glitches, collapses in a puff of logic, and tidies itself away', () => {
  assert.equal(thronePose(0).wire, false);
  assert(thronePose(.14).wire && thronePose(.28).wire && thronePose(.42).wire, 'three wireframe flickers');
  assert.equal(thronePose(VANISH.poof - .01).sy, 1);
  assert(thronePose(VANISH.poof + VANISH.collapse * .4).sy > 1.3, 'pulls up tall');
  assert(thronePose(VANISH.poof + VANISH.collapse).gone);
  for (let i = 0; i < LOGIC.length; i++) {
    assert.equal(glyphFlight(i, .2).alpha, 0, 'no symbols before the poof');
    const mid = glyphFlight(i, 1.2); assert(mid.alpha > .5 && mid.y > .5);
    assert(glyphFlight(i, VANISH.total).alpha < .01, 'faded by the end');
  }
  const parent = new THREE.Group(), fx = createThroneVanish(THREE, parent);
  fx.add(3, -2, 1);
  assert.equal(fx.active, 1); assert.equal(parent.children.length, 1);
  const g = parent.children[0], throne = g.getObjectByName('Throne (vanishing)');
  assert(throne);
  let sawWire = false, t = 0;
  while (fx.active && t < 5) {
    fx.update(1 / 60); t += 1 / 60;
    if (fx.active) {
      const b = bounds(g); assert(finiteBox(b));
      assert(b.max.y < 3 && Math.abs(b.max.x - 3) < 2 && Math.abs(b.min.z + 2) < 2, 'stays near the throne square');
      throne.traverse(o => { if (o.isMesh && o.material.wireframe) sawWire = true; });
    }
  }
  assert(sawWire);
  assert(Math.abs(t - VANISH.total) < .05, `done after ${t.toFixed(2)}s`);
  assert.equal(parent.children.length, 0);
  fx.add(0, 0); fx.clear(); assert.equal(fx.active, 0); assert.equal(parent.children.length, 0);
});
