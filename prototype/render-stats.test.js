import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sceneCounts, formatStats, createRenderStats} from './render-stats.js';

// Mimics WebGLInfo: each render call adds to the counts, and resets them first
// when autoReset is on (which is what hid the earlier passes).
function fakeRenderer() {
  const info = {
    autoReset: true,
    render: {frame: 0, calls: 0, triangles: 0, points: 0, lines: 0},
    memory: {geometries: 12, textures: 5},
    reset() { Object.assign(this.render, {calls: 0, triangles: 0, points: 0, lines: 0}); },
  };
  return {info, pass(calls, triangles) {
    if (info.autoReset) info.reset();
    info.render.calls += calls; info.render.triangles += triangles;
  }};
}

function fakeDoc() {
  const body = {children: [], append(el) { this.children.push(el); el.parent = this; }};
  return {body, createElement(tag) {
    return {tag, style: {}, hidden: false, textContent: '', attrs: {},
      setAttribute(k, v) { this.attrs[k] = v; },
      remove() { const i = body.children.indexOf(this); if (i >= 0) body.children.splice(i, 1); }};
  }};
}

function testScene() {
  const scene = new THREE.Scene();
  const shared = new THREE.MeshBasicMaterial(), other = new THREE.MeshBasicMaterial();
  const box = new THREE.BoxGeometry();
  for (let i = 0; i < 4; i++) scene.add(new THREE.Mesh(box, shared));
  scene.add(new THREE.Mesh(box, [shared, other]));
  scene.add(new THREE.InstancedMesh(box, other, 9));
  scene.add(new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial()));
  const hidden = new THREE.Mesh(box, new THREE.MeshBasicMaterial());
  hidden.visible = false;
  scene.add(hidden);
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  scene.add(sun, new THREE.AmbientLight());
  return scene;
}

test('sceneCounts counts visible meshes, unique materials, instances and shadow lights', () => {
  const c = sceneCounts(testScene());
  assert.equal(c.meshes, 7);
  assert.equal(c.materials, 3);
  assert.equal(c.instances, 9);
  assert.equal(c.lights, 2);
  assert.equal(c.shadowLights, 1);
});

test('formatStats never prints NaN and compacts big numbers', () => {
  const blank = formatStats({fps: NaN, ms: NaN, calls: 0, triangles: 0, geometries: 0, textures: 0, counts: null});
  assert.doesNotMatch(blank, /NaN|undefined/);
  const busy = formatStats({fps: 59.6, ms: 16.8, calls: 1234, triangles: 2_345_678, geometries: 40, textures: 12_000,
    counts: {meshes: 300, materials: 20, lights: 4, shadowLights: 1}});
  assert.match(busy, /fps\s+60\s+\(16\.8 ms\)/);
  assert.match(busy, /triangles 2\.35M/);
  assert.match(busy, /textures 12\.0k/);
  assert.match(busy, /shadow 1/);
});

test('whole-frame totals add up every composer pass', () => {
  const r = fakeRenderer();
  const stats = createRenderStats(r, testScene(), {doc: null});
  assert.equal(r.info.autoReset, false);
  for (let f = 0; f < 3; f++) {
    stats.begin();
    r.pass(40, 9000); r.pass(30, 8000); r.pass(1, 2);
    stats.end(1 / 60);
  }
  assert.deepEqual(stats.frame(), {calls: 71, triangles: 17002, points: 0, lines: 0});
  stats.dispose();
  assert.equal(r.info.autoReset, true);
});

test('the panel samples fps while shown, toggles and is removed on dispose', () => {
  const r = fakeRenderer(), doc = fakeDoc();
  const stats = createRenderStats(r, testScene(), {doc, visible: false});
  assert.equal(doc.body.children.length, 0);
  assert.equal(stats.toggle(), true);
  const panel = doc.body.children[0];
  assert.equal(panel.attrs['aria-label'], 'Render stats');
  for (let f = 0; f < 60; f++) { stats.begin(); r.pass(10, 100); stats.end(1 / 60); }
  const s = stats.summary();
  assert.ok(Math.abs(s.fps - 60) < 1e-6, `fps ${s.fps}`);
  assert.ok(Number.isFinite(s.ms));
  assert.equal(s.counts.meshes, 7);
  assert.match(panel.textContent, /calls\s+10/);
  assert.doesNotMatch(panel.textContent, /NaN/);
  assert.equal(stats.toggle(), false);
  assert.equal(panel.hidden, true);
  stats.dispose();
  assert.equal(doc.body.children.length, 0);
});
