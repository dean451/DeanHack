import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const bridge=readFileSync(new URL('./engine/bridge.c',import.meta.url),'utf8');

test('a message raised while a frame is being written cannot be spliced into the frame line',()=>{
 // impossible() fires pline() from inside the map walk. If frame() wrote straight to stdout the
 // message would land mid-line and the client would get broken JSON in place of both.
 assert.match(bridge,/static void frame\(void\) \{[^}]*open_memstream/s,'frame() buffers the whole frame before writing it');
 assert.match(bridge,/static FILE \*frame_real;/);
 const event=bridge.match(/static void event\([^)]*\) \{[\s\S]*?\n\}/)[0];
 assert.match(event,/if\(frame_real\)stdout=frame_real;/,'event() writes to the real stream while a frame is buffered');
 assert.match(event,/stdout=mem;/,'event() hands stdout back to the frame buffer afterwards');
});

test('the hero picking something up is reported as a pickup event, and only that',()=>{
 assert.match(bridge,/static void pickup_hook_bridge\(struct obj \*o,coordxy x,coordxy y,long cnt\)/);
 assert.match(bridge,/\\"type\\":\\"pickup\\"[^;]*otyp[^;]*class[^;]*count/);
 assert.match(bridge,/pickup_hook=pickup_hook_bridge;/,'installed with the other hooks');
 assert.match(bridge,/pickup_hook=0;/,'and removed when the window closes');
 const server=readFileSync(new URL('./engine/server.js',import.meta.url),'utf8');
 assert.match(server,/'revive','pickup'/,'the server passes the event through');
 const pickup=readFileSync(new URL('../src/pickup.c',import.meta.url),'utf8');
 assert.match(pickup,/PICKUP_HOOK\(obj, pickup_x, pickup_y, count\)/,'fired from pickup_object, the hero-only path');
});
