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

test('the hero teleporting and a wish being granted are reported, from hooks in the game itself', () => {
 assert.match(bridge,/static void teleport_hook_bridge\(coordxy fx,coordxy fy,coordxy tx,coordxy ty,int trap\)/);
 assert.match(bridge,/\\"type\\":\\"teleport\\"[^;]*from[^;]*to[^;]*trap/);
 assert.match(bridge,/static void wish_hook_bridge\(struct obj \*o,int source\)/);
 assert.match(bridge,/\\"type\\":\\"wish\\"[^;]*source[^;]*otyp[^;]*name/);
 assert.match(bridge,/teleport_hook=teleport_hook_bridge;wish_hook=wish_hook_bridge;/,'installed with the other hooks');
 assert.match(bridge,/teleport_hook=0;wish_hook=0;/,'and removed when the window closes');
 const server=readFileSync(new URL('./engine/server.js',import.meta.url),'utf8');
 assert.match(server,/'pickup','teleport','wish'/,'the server passes both through');
 const tele=readFileSync(new URL('../src/teleport.c',import.meta.url),'utf8');
 assert.match(tele,/TELEPORT_HOOK\(u\.ux, u\.uy, nux, nuy, tele_by_trap\)/,'fired from teleds, every hero teleport');
 assert.match(tele,/tele_by_trap = 1;\s*tele_trap_inner\(trap\);\s*tele_by_trap = 0;/,'a teleportation trap marks itself');
 const zap=readFileSync(new URL('../src/zap.c',import.meta.url),'utf8');
 assert.match(zap,/WISH_HOOK\(otmp, source\)/);
 assert.match(zap,/wish_source = WISH_FROM_WAND;\s*makewish\(TRUE\)/,'a wand of wishing names itself');
 const potion=readFileSync(new URL('../src/potion.c',import.meta.url),'utf8');
 assert.match(potion,/wish_source = WISH_FROM_DEMON;/);
 assert.match(potion,/wish_source = WISH_FROM_BOTTLE;/);
});

test('the end-of-game text says what killed the hero, and a tombstone event carries it too', () => {
 assert.match(bridge,/static void rip\(winid w,int how\)/,'rip() is no longer empty');
 assert.match(bridge,/killed_by_prefix\[how\]/,'the same "killed by" wording the game uses');
 assert.match(bridge,/case KILLED_BY_AN:Sprintf\(buf,"%s%s",killed_by_prefix\[how\],an\(killer\.name\)\)/);
 assert.match(bridge,/put\(w,0,buf\)/,'the cause goes into the text the player reads');
 assert.match(bridge,/\\"type\\":\\"tombstone\\",\\"name\\":/);
 assert.match(bridge,/\\"killer\\":"\);quoted\(buf\)/);
 const server=readFileSync(new URL('./engine/server.js',import.meta.url),'utf8');
 assert.match(server,/'wish','tombstone'/,'the server passes it through');
});

test('the frame says what form the hero has polymorphed into', () => {
  const c = readFileSync(new URL('./engine/bridge.c', import.meta.url), 'utf8');
  assert.match(c, /\\"form\\":"\);quoted\(Upolyd\?mons\[u\.umonnum\]\.mname:""\)/);
});
