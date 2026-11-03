import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {bridgeKind, featureKind} from './terrain-feature.js';
import {dressFeature} from './live-tile-dress.js';

// The user lost a game on Vlad's Tower grounds (tower.des tower4: a raised drawbridge at (16,13) right next to a lowered
// one at (17,13)) beside a drawbridge that was not drawn. A lowered bridge with anything on it (the hero, a monster, a
// corpse) used to be reported as bare floor, and a bridge first seen occupied was never built. Drawbridges must always show.

test('the bridge field names the drawbridge whatever symbol covers it', () => {
  assert.equal(bridgeKind({bridge: 'down', symbol: 100}), 'bridge-down');
  assert.equal(bridgeKind({bridge: 'up'}), 'bridge-up');
  assert.equal(bridgeKind({symbol: 46, color: 3}), null);
  assert.equal(featureKind(100, 3), null, 'a jackal\'s d alone would not say bridge');
});

const tile = () => { const t = new THREE.Group();t.userData.slab = new THREE.Mesh();t.add(t.userData.slab);return t; };
const deps = {animated: new Set(), tileInstances: {add() {}, refresh() {}}};

test('a lowered drawbridge first seen with a monster on it is built as a drawbridge, not left blank', () => {
  const t = tile();
  dressFeature(t, {x: 17, z: 13, symbol: 'd'.charCodeAt(0), color: 3, terrain: 'feature', kind: 'monster', bridge: 'down'}, deps);
  assert.equal(t.userData.featureKey, 'bridge-down');
  assert.equal(t.userData.feature.name, 'Feature (bridge-down)');let deck = false;t.userData.feature.traverse(o => { if (/drawbridge/i.test(o.name)) deck = true; });assert.ok(deck, 'the drawbridge model is in it');
  assert.ok(t.userData.axisFeature, 'turned across its moat like any bridge');
});

test('a raised drawbridge is built from the field too, and a bridge stays a bridge when the occupant leaves', () => {
  const t = tile();
  dressFeature(t, {x: 15, z: 13, symbol: 35, color: 3, terrain: 'feature', bridge: 'up'}, deps);
  assert.equal(t.userData.featureKey, 'bridge-up');
  const u = tile();
  dressFeature(u, {x: 17, z: 13, symbol: 64, color: 15, terrain: 'feature', kind: 'monster', bridge: 'down'}, deps);
  const model = u.userData.feature;
  dressFeature(u, {x: 17, z: 13, symbol: 46, color: 3, terrain: 'feature', bridge: 'down'}, deps);
  assert.equal(u.userData.feature, model, 'the same bridge, not rebuilt');
});

test('the engine keeps a drawbridge under an occupant and tags it for the client', () => {
  const bridge = readFileSync(new URL('./engine/bridge.c', import.meta.url), 'utf8');
  const under = bridge.slice(bridge.indexOf('static int under_glyph'), bridge.indexOf('static const char *object_kind'));
  for (const c of ['S_vodbridge', 'S_hodbridge', 'S_vcdbridge', 'S_hcdbridge']) assert.match(under, new RegExp(c), `${c} survives under an occupant`);
  assert.match(bridge, /if\(tc==S_vodbridge\|\|tc==S_hodbridge\)printf\(",\\"bridge\\":\\"down\\""\);/);
  assert.match(bridge, /else if\(tc==S_vcdbridge\|\|tc==S_hcdbridge\)printf\(",\\"bridge\\":\\"up\\""\);/);
  assert.match(readFileSync(new URL('./live-tile-dress.js', import.meta.url), 'utf8'), /other=trap\?null:bridgeKind\(cell\)\?\?featureKind\(cell\.symbol,cell\.color\)/);
});
