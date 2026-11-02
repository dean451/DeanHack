import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {liveSource} from './live-source.js';

// The floor takes shadows but casts none, and the dimming plane over a remembered square does neither: each was
// drawn again into the shadow map (the floor slabs were the whole level a second time) for nothing.
test('floor slabs and fog planes stay out of the shadow pass', () => {
  const live = liveSource();
  assert.match(live, /const slab=box\(floorGeo,[^;]*;[^;]*slab\.castShadow=false;/);
  assert.match(live, /const fog=dimLayer\.stand\(tile\);/, 'the dimming is one instanced layer, out of the shadow pass (dim-layer.js)');
});
