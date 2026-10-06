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

test('a wounded monster in sight reports its health, and a whole one reports nothing', () => {
 assert.match(bridge,/wm->mhp < wm->mhpmax/,'only damaged monsters');
 assert.match(bridge,/canspotmon\(wm\)/,'only ones the hero can see');
 assert.match(bridge,/printf\(",\\"health\\":%d",pct<1\?1:pct>99\?99:pct\)/,'a percentage from 1 to 99');
});

test('the slime mold keeps its own name whatever fruit the player calls it', () => {
 // The game rewrites the object type\'s name to the chosen fruit, so the client saw "fruit" or "kiwi".
 assert.match(bridge,/if \(o == SLIME_MOLD\) return "slime mold";/);
});
