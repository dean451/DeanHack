import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEffectLights, EFFECT_LIGHTS, shareFlash} from './effect-lights.js';
import {createTeleportBlink} from './teleport-blink.js';
import {createFireTrapJet} from './fire-trap-jet.js';
import {createMagicPortal} from './magic-portal.js';

const visibleLights = root => { let n = 0; root.traverseVisible(o => { if (o.isLight) n++; }); return n; };

test('the pool keeps the scene light count constant through effects building and dropping', () => {
  const scene = new THREE.Scene(), lights = createEffectLights(THREE, scene);
  assert.equal(visibleLights(scene), EFFECT_LIGHTS);
  const blink = createTeleportBlink(THREE, scene, {lights}), jet = createFireTrapJet(THREE, scene, {lights}), portal = createMagicPortal(THREE, scene, {lights});
  blink.hop({x: 0, z: 0}, {x: 4, z: 4}); jet.message('A tower of flame bursts from the floor!', 1, 1); portal.message('You activated a magic portal!', 2, 2);
  jet.settle(1, 1); // the jet builds once the next frame says where the trap is
  assert.equal(lights.free, 0, 'blink out, jet and portal each hold a light');
  assert.equal(visibleLights(scene), EFFECT_LIGHTS, 'borrowed lights move into the effects, none are added');
  for (let t = 0; t < 8; t += .02) { blink.update(.02); jet.update(.02); portal.update(.02); }
  assert.equal(visibleLights(scene), EFFECT_LIGHTS, 'and they come home');
  assert.equal(lights.free, EFFECT_LIGHTS);
  assert.ok(lights.lights.every(l => l.parent === scene && l.intensity === 0));
});

test('a spent pool hands out invisible lights rather than new ones in the scene', () => {
  const scene = new THREE.Scene(), lights = createEffectLights(THREE, scene, {size: 1});
  const a = lights.acquire(0xff0000, 4), b = lights.acquire(0x00ff00, 6);
  assert.ok(a.visible && a.color.getHex() === 0xff0000 && a.distance === 4);
  assert.ok(!b.visible && b.userData.overflow, 'overflow lights never count');
  const g = new THREE.Group(); scene.add(g); g.add(a); g.add(b);
  assert.equal(visibleLights(scene), 1);
  lights.release(a); lights.release(b);
  assert.equal(a.parent, scene); assert.equal(b.parent, null); assert.equal(lights.free, 1);
});

test('the ray flash, a blast and a breath share one light: the brightest this frame gets it', () => {
  const light = new THREE.PointLight(0xffffff, 0, 5);
  const ray = {intensity: 30, color: 0xdce6ff, x: 1, y: 3.2, z: 2, distance: 18, decay: 1.2}, blast = {intensity: 45, color: 0xffa050, x: 4, y: 1.2, z: 5, distance: 9, decay: 1.4};
  assert.equal(shareFlash(light, [ray, blast]), blast);
  assert.equal(light.intensity, 45); assert.equal(light.color.getHex(), 0xffa050); assert.deepEqual(light.position.toArray(), [4, 1.2, 5]); assert.equal(light.distance, 9);
  shareFlash(light, [ray, {...blast, intensity: 0}]);
  assert.equal(light.intensity, 30); assert.equal(light.distance, 18); assert.equal(light.decay, 1.2);
  assert.equal(shareFlash(light, [{...ray, intensity: 0}, null]), null); assert.equal(light.intensity, 0);
});

test('live.js keeps one flash light, not a ray light and a blast light', async () => {
  const live = (await import('node:fs')).readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  assert.equal((live.match(/new THREE\.PointLight\(/g) || []).length, 3, 'the lantern, the torch pool and the one flash light');
  assert.ok(!/rayFlashLight|blastLight/.test(live));
});
