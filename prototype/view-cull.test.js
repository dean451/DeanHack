import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createViewCull, restsUnseen} from './view-cull.js';

const camera = new THREE.PerspectiveCamera(36, 1.5, .1, 100); camera.position.set(0, 10, 8); camera.lookAt(0, 0, 0);
const at = (x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); return {g, actions: {queue: []}}; };

test('a monster in view animates; one far outside the view, idle, rests', () => {
  const cull = createViewCull(); cull.update(camera);
  const near = at(1, 1), far = at(60, 0);
  assert.equal(restsUnseen(near, false, cull), false);
  assert.equal(restsUnseen(far, false, cull), true);
});

test('walking, acting, dying monsters and the pet always animate, seen or not', () => {
  const cull = createViewCull(); cull.update(camera);
  const far = () => at(60, 0);
  assert.equal(restsUnseen(far(), true, cull), false, 'walking');
  const acting = far(); acting.actions.current = {kind: 'attack'}; assert.equal(restsUnseen(acting, false, cull), false);
  const queued = far(); queued.actions.queue.push({}); assert.equal(restsUnseen(queued, false, cull), false);
  const dead = far(); dead.actions.dead = true; assert.equal(restsUnseen(dead, false, cull), false);
  const pet = far(); pet.petCat = true; assert.equal(restsUnseen(pet, false, cull), false);
});

test('a monster just past the edge still animates (its reach), so nothing pops as the camera turns', () => {
  const cull = createViewCull(); cull.update(camera);
  // find the view's right edge on the ground at z=0, then stand just past it
  let x = 0; while (cull.sees(at(x, 0).g)) x += .25;
  const edge = at(x - 1.5, 0); assert.equal(restsUnseen(edge, false, cull), false);
});

test('live.js skips only after the slide, and updates the view once a frame', () => {
  const live = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  const slide = live.indexOf('slideTo(a,dt);if(a.legs)'), skip = live.indexOf('if(restsUnseen(a,walking,viewCull))continue;');
  assert.ok(slide > 0 && skip > slide && skip - slide < 200);
  assert.match(live, /viewCull\.update\(camera\);for\(const a of actors\.values\(\)\)\{clearActionPose/);
});
