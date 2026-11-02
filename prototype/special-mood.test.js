import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSpecialMood, specialMoodFor, SPECIAL_MOODS} from './special-mood.js';
import {liveSource} from './live-source.js';

test('the bridge\'s level names find their looks; ordinary levels have none', () => {
  const cases = {oracle: 'oracle', 'minetn-3': 'minetown', 'bigrm-7': 'bigroom', 'medusa-2': 'medusa', 'castle-1': 'castle', 'valley-2': 'valley', 'knox-1': 'ludios',
    tower2: 'vlad', fakewiz1: 'wizard', wizard3: 'wizard', sanctum: 'sanctum', 'juiblex': 'juiblex', 'baalz-1': 'baalzebub', earth: 'earth', air: 'air', fire: 'fire', water: 'water', astral: 'astral', 'sheolmid': 'sheol'};
  for (const [name, key] of Object.entries(cases)) assert.equal(specialMoodFor(name), key, name);
  for (const name of ['', 'soko1-1', 'minefill', 'Val-strt', null]) assert.equal(specialMoodFor(name), null, String(name));
  for (const look of Object.values(SPECIAL_MOODS)) assert.ok(new THREE.Color(look.fog) && look.reach > 0);
});

function rig() {
  const group = new THREE.Group(), fog = new THREE.Fog('#05080b', 10, 30), background = new THREE.Color('#05080b');
  let reach = 1;const cavern = {fog, background, setFogReach: k => { reach = k; }, get reach() { return reach; }};
  const hemi = new THREE.HemisphereLight(0x92bfc4, 0x333025, 1), sun = new THREE.DirectionalLight(0x9fb9ca, 2);
  const mood = createSpecialMood({group, cavern, ambient: [{light: hemi}, {light: sun}], doc: null});
  return {group, fog, background, cavern, hemi, sun, mood};
}
const run = (mood, secs, step = .1) => { for (let t = 0; t < secs; t += step) mood.update(t, step, {x: 0, z: 0}); };

test('a special level eases its fog, reach and light tint in, and adds its air; leaving eases back', () => {
  const r = rig(), calm = r.hemi.color.clone();
  r.mood.frame('oracle');run(r.mood, 6);
  assert.ok(r.fog.color.equals(new THREE.Color(SPECIAL_MOODS.oracle.fog)) || r.fog.color.distanceTo?.(new THREE.Color(SPECIAL_MOODS.oracle.fog)) < .01 || Math.abs(r.fog.color.b - new THREE.Color(SPECIAL_MOODS.oracle.fog).b) < .01, 'the fog took the Oracle\'s colour');
  assert.ok(Math.abs(r.cavern.reach - 1.2) < .02);
  assert.ok(r.hemi.color.b > calm.b - .001 && !r.hemi.color.equals(calm), 'the light leans toward the moonlit tint');
  assert.ok(r.mood.points.visible && r.mood.points.material.opacity > 0);
  r.mood.frame('');run(r.mood, 8);
  assert.ok(Math.abs(r.cavern.reach - 1) < .02 && Math.abs(r.fog.color.r - new THREE.Color('#05080b').r) < .01, 'back to the usual fog');
  assert.equal(r.mood.points.visible, false, 'no air on an ordinary level');
  assert.ok(Math.abs(r.hemi.color.r - calm.r) < .01, 'and the usual light');
});

test('the Castle\'s lightning lifts the ambient for a moment and puts it back exactly', () => {
  const r = rig(), calm = [r.hemi.intensity, r.sun.intensity];
  r.mood.frame('castle-2');
  let peak = 0;for (let t = 0; t < 20; t += .05) { r.mood.update(t, .05, {x: 0, z: 0});peak = Math.max(peak, r.hemi.intensity); }
  assert.ok(peak > calm[0] * 1.5, 'a flash');
  for (let t = 20; t < 21; t += .05) r.mood.update(t, .05, {x: 0, z: 0});
  // between flashes the lights sit at their own strength again
  let settled = false;for (let t = 21; t < 40 && !settled; t += .05) { r.mood.update(t, .05, {x: 0, z: 0});settled = r.hemi.intensity === calm[0] && r.sun.intensity === calm[1]; }
  assert.ok(settled);
});

test('live.js gives every frame\'s level to the mood and runs it each frame; the cavern fog reach follows it', () => {
  const src = liveSource();
  assert.match(src, /specialMood\.frame\(frame\.special\)/);
  assert.match(src, /specialMood\.update\(t,dt,hero\.g\.position\)/);
  assert.match(src, /createSpecialMood\(\{group,cavern,ambient:ambientLights\}\)/);
});
