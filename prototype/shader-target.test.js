import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createWarmTarget, compileFor} from './shader-target.js';
import {liveSource} from './live-source.js';

test('a warm-up compile runs with a render target bound, and the bound target is put back', () => {
  let bound = 'canvas';
  const renderer = {getRenderTarget: () => bound, setRenderTarget(t) { bound = t; }};
  const target = createWarmTarget(THREE);
  assert.ok(target.isWebGLRenderTarget);
  let seen = null;
  const out = compileFor(renderer, target, () => { seen = bound; return 'job'; });
  assert.equal(seen, target, 'the compile sees the target, so it builds the linear, untoned variants the composer draws with');
  assert.equal(out, 'job'); assert.equal(bound, 'canvas');
  assert.throws(() => compileFor(renderer, target, () => { throw new Error('x'); })); assert.equal(bound, 'canvas', 'restored even when the compile throws');
});

test('live.js warms the scene against the warm target', () => {
  const live = liveSource();
  assert.match(live, /compileFor\(renderer,warmTarget,\(\)=>renderer\.compileAsync\(scene,camera\)\)/);
  assert.doesNotMatch(live, /staged=false;renderer\.compileAsync\(scene,camera\)/, 'no bare canvas-variant compile left');
});
