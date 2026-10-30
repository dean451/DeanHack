import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAoMotion, AO_SETTLE_MS, AO_FADE_MS} from './ao-motion.js';

test('occlusion sits out while the player drags or zooms, then fades back in', () => {
  const ao = createAoMotion();
  assert.deepEqual(ao.frame(0, true), {enabled: true, blend: 1}, 'on at rest');
  ao.start();
  assert.deepEqual(ao.frame(100, true), {enabled: false, blend: 0}, 'off while the camera is being moved');
  ao.end(1000);
  assert.equal(ao.frame(1000 + AO_SETTLE_MS - 1, true).enabled, false, 'still off until the camera settles');
  const mid = ao.frame(1000 + AO_SETTLE_MS + AO_FADE_MS / 2, true);
  assert.ok(mid.enabled && Math.abs(mid.blend - .5) < 1e-9, 'fading back in');
  assert.deepEqual(ao.frame(1000 + AO_SETTLE_MS + AO_FADE_MS + 5, true), {enabled: true, blend: 1});
  assert.equal(ao.frame(5000, false).enabled, false, 'a tier without occlusion keeps it off');
});

test('main.js drives the pass from the controls\' start and end, not from every camera move', () => {
  const main = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  assert.match(main, /controls\.addEventListener\('start',\(\)=>aoMotion\.start\(\)\);controls\.addEventListener\('end',\(\)=>aoMotion\.end\(performance\.now\(\)\)\);/);
  assert.match(main, /const ao=aoMotion\.frame\(ms,TIERS\[quality\.tier\]\?\.ssao!==false\);ambientOcclusion\.enabled=ao\.enabled;ambientOcclusion\.blendIntensity=ao\.blend;/);
});
