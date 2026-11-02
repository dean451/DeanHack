import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {liveSource, LIVE_PARTS} from './live-source.js';

const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');

test('there is no audio anywhere in the client', () => {
  for (const file of ['main.js', ...LIVE_PARTS, 'index.html']) {
    const src = read(file);
    assert.doesNotMatch(src, /AudioContext|createOscillator|id="sound"|#sound/, `${file} must not make sound`);
  }
});

test('the footer buttons are only Save & quit and Quality', () => {
  const html = read('index.html'), live = liveSource();
  for (const label of ['Rotate view', 'Quaff', 'Pick up', 'Inventory</button>', 'Open door']) {
    assert.ok(!html.includes(label) && !live.includes(`>${label}`), `${label} button is gone`);
  }
  assert.match(live, /<button data-key="83">Save & quit<\/button>/);
  assert.doesNotMatch(read('main.js'), /#camera/);
});

test('the page carries no badge, brand block or footer blurb', () => {
  const html = read('index.html'), css = read('style.css'), live = liveSource();
  assert.doesNotMatch(html, /VISUAL PROTOTYPE|class="brand"|class="badge"|Standalone scene|Drag to orbit/);
  assert.doesNotMatch(css, /\.brand|\.badge|footer>small/);
  assert.doesNotMatch(live, /Real UnNetHack rules|footer>small/);
  // the branch heading only shows for real named levels
  assert.match(live, /h1'\)\.hidden=!where\.named/);
});

test('the creatures-in-view list and the live engine caption are gone', () => {
  const live = liveSource(), css = read('style.css');
  assert.doesNotMatch(live, /engine-seen|UNNETHACK · LIVE ENGINE|Nothing stirs in view/);
  assert.doesNotMatch(css, /engine-seen/);
});

test('the messages sit in the upper-right corner and the character panel in the upper-left', () => {
  const css = read('style.css');
  const panel = [...css.matchAll(/body\.live-engine #engine-panel\{([^}]*)\}/g)].map(m => m[1]).find(r => r.includes('position')) || '';
  assert.match(panel, /position:fixed/);
  assert.match(panel, /top:14px/);
  assert.match(panel, /right:16px/);
  assert.doesNotMatch(panel, /bottom:\d/);
  const character = css.match(/body\.live-engine \.character\{([^}]*)\}/)[1];
  assert.match(character, /top:14px/);
  assert.match(character, /left:16px/);
});

test('gold, power, experience and conditions live in the character panel, not under the messages', () => {
  const live = liveSource();
  assert.match(live, /statusLine\.id='engine-status';\$\('\.character'\)\.append\(statusLine\)/);
  assert.doesNotMatch(live, /<div id="engine-messages" role="log"><\/div><div id="engine-status">/);
});

test('the character name is typed before starting, saved, sent with the start request and shown in the panel', () => {
  const live = liveSource();
  assert.match(live, /nameInput\.placeholder='Adventurer'/);
  assert.match(live, /localStorage\.setItem\('deanhack\.playerName'/);
  assert.match(live, /post\('\/engine\/start',\{name:savedPlayerName\(\),\.\.\.readChoice\(\)\}\)/, 'the start request carries the name and the chosen class');
  assert.match(live, /setCharacterName\(started\.name\)/);
});

test('the minimap sits in the bottom-right corner and the live key legend stops short of it', () => {
  const css = read('style.css');
  const map = css.match(/#minimap\{[^}]*\}/)[0];
  assert.match(map, /right:40px/);
  assert.match(map, /bottom:25px/);
  assert.match(css, /body\.live-engine footer\{right:384px\}/);
});

test('the live panel carries no engine caption', () => {
  assert.doesNotMatch(liveSource(), /UNNETHACK · LIVE ENGINE/);
  assert.doesNotMatch(read('style.css'), /#engine-panel>small/);
});

test('a text prompt shows everything that happened since the last command, not only the last line', () => {
  const live = liveSource();
  assert.match(live, /if\(v\.kind==='command'\)turnMark=markTurn\(messageLog\)/, 'the mark is taken when the game asks for a command');
  assert.match(live, /sinceMark\(messageLog,turnMark\)/, 'the line prompt reads the turn\'s messages');
});

test('low hitpoints are marked with a warning triangle, not by red and a flash alone', () => {
  assert.match(read('style.css'), /\.character\.low-hp #hp::before\{content:"\\25B2/);
});

test('message text wraps instead of clipping', () => {
  const css = read('./style.css')
  assert.match(css, /#engine-line[^{]*#engine-messages div[^{]*\{[^}]*overflow-wrap:anywhere/)
  assert.match(css, /#engine-panel\{[^}]*max-width:calc\(100vw - 32px\)/)
})

test('the live pet cat is built from the feline model, not the old demo cat', () => {
  const live = liveSource();
  assert.match(live, /cell\.kind==='pet'&&\/cat\|kitten\/\.test\(cell\.name\)\)\{a=isFeline\(\(cell\.name\|\|''\)\.toLowerCase\(\)\)\?createSkinnedFeline\(.*?\):creatureFactory\?bakeDraws\(creatureFactory\(cell\)\):catFactory\(\)/);
});

test('blessed items read green in the pack, the sun mark stays, and cursed stays red (the convention)', () => {
  const css = read('./style.css');
  const blessed = /\.engine-menu-row\.buc-blessed\{color:(#[0-9a-f]{6})\}/i.exec(css)?.[1], cursed = /\.engine-menu-row\.buc-cursed\{color:(#[0-9a-f]{6})\}/i.exec(css)?.[1];
  assert(blessed && cursed);
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [br, bg, bb] = rgb(blessed), [cr, cg, cb] = rgb(cursed);
  assert(bg > br + 30 && bg > bb + 30, `blessed ${blessed} is green`);
  assert(cr > cg + 30 && cr > cb + 30, `cursed ${cursed} is red`);
  assert.match(read('./item-buc.js'), /blessed: '☼'/);
});

test('nothing draws behind the splash: the loop returns while it is open, no backdrop blur, the pixel ratio and pace follow the quality tier',()=>{
  const main=readFileSync(new URL('./main.js',import.meta.url),'utf8'),css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
  assert.match(main,/setAnimationLoop\(ms=>\{if\(document\.body\.classList\.contains\('start-open'\)\)return;/);
  assert.match(css,/#start-screen,#start-cover\{position:fixed;inset:0;z-index:60;padding:0;background:radial-gradient\(ellipse at 50% 42%,#050a0c 0%,#030609 62%,#020405 100%\)/,'the splash is opaque: no alpha in its gradient');
  assert.match(main,/renderer\.setPixelRatio\(pixelRatioFor\(quality\.tier,devicePixelRatio\)\)/,'the pixel ratio comes from the quality tier');
  assert.match(main,/if\(!pacer\.shouldDraw\(ms,quality\.tier\)\)return;/,'the loop is paced: every frame while active, the idle rate after');
  assert.match(main,/e\.key==='F8'/,'F8 cycles the tier');
  assert.match(main,/renderer\.shadowMap\.autoUpdate=false/,'shadows are redrawn when the loop says, not on every render call');
  assert.match(main,/renderer\.shadowMap\.needsUpdate=shadowMotion\.due\(ms,live\.motionSignature,pacer\.shadowDue\(ms,quality\.tier\)\);/,'shadows at the tier rate, and only when a caster moved (shadow-motion.js)');
  assert.match(main,/new THREE\.WebGLRenderer\(\{antialias:false,alpha:false\}\)/,'no MSAA resolve for a composer that never had MSAA, and an opaque canvas: the scene background covers every pixel');
  assert.match(main,/renderer\.setSize\(innerWidth,innerHeight\);setQuality\(quality\.tier\);\}\);/,'a resize re-applies the tier (the AO size)');
  assert.match(main,/composer\.render\(\);const renderMs=performance\.now\(\)-renderAt;\{const step=adaptive\.frame\(ms,frameCostNow\(ms\),quality\.tier\)/,'the drawn frame time feeds the adaptive tier');
  assert.match(main,/renderStats\.end\(dt,\{update:updateMs,render:renderMs\}\)/,'the F9 panel shows where the main thread goes');
  assert.match(main,/installLive\(\{scene,camera,controls,renderer,/,'the live game gets the renderer for shader warm-up');
  const liveSrc=liveSource();
  assert.match(liveSrc,/function warmUp\(\)\{if\(!staged\|\|!renderer\?\.compileAsync\)return;staged=false;[^}]*compileFor\(renderer,warmTarget,\(\)=>renderer\.compileAsync\(scene,camera\)\)/,'new materials compile ahead of their first draw, for the variant the composer draws');
  assert.equal((liveSrc.match(/staged=true;/g)||[]).length,3,'tiles, items and actors each mark the frame as staged');
  assert.match(main,/adaptive\.manual\(\);/,'F8 pins the tier');
  assert.match(main,/onActivity:touch/,'engine events keep the frame rate up');
  assert.doesNotMatch(css,/#start-screen,#start-cover\{[^}]*backdrop-filter/,'the splash does not blur the whole viewport');
});

test('menu accelerators use a monospace whose capital I and small l differ (Inter drew them alike)',()=>{
  const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
  assert.match(css,/\.engine-menu-row kbd\{[^}]*font:600 12px\/1\.2 'Courier New',Courier,monospace\}/);
});

test('a GLB creature is outlined with smoothed normals once its model swaps in',()=>{
  const live=liveSource();
  assert.match(live,/attachModelAsset\(a,cell\.name,MODEL_URLS\)\?\.then\(asset=>\{if\(asset\)addOutlines\(asset\.model,\{smooth:true\}\);\}\);/);
});

test('monsters and pets carry no health bar or total; only the hero HUD shows hitpoints', () => {
  const live = liveSource(), html = read('index.html');
  assert.doesNotMatch(live, /health-bar|createHealthBar|hpBar|cell\.health/, 'no bar is built over any monster, pet included');
  assert.match(html, /<div class="health"><span>HITPOINTS<\/span><strong id="hp">/, 'the hero total is labelled hitpoints');
  assert.doesNotMatch(html, /VITALITY/i);
});

test('a burst of messages redraws the message panels once, on the next frame', () => {
  const live = liveSource();
  const msg = live.slice(live.indexOf(' function message(text){'), live.indexOf(' function drawMessagePanels(){'));
  assert.ok(msg.includes('requestAnimationFrame(drawMessagePanels)') && !msg.includes('replaceChildren'), 'message() only schedules the redraw');
  assert.match(live, /function drawMessagePanels\(\)\{messagePanelsDue=false;[^\n]*replaceChildren[^\n]*historyPanel\.refresh\(\);\}/);
});

test('the demo room is gone: no ?demo, no demo scene, no Demo room or Reset room buttons', () => {
  const html = read('index.html'), main = read('main.js'), live = liveSource(), screen = read('start-screen.js'), cover = read('start-cover.js');
  assert.ok(!existsSync(new URL('./simulation.js', import.meta.url)), 'the demo simulation is deleted');
  for (const [name, src] of [['main.js', main], ['live.js', live], ['start-screen.js', screen], ['start-cover.js', cover]]) {
    assert.doesNotMatch(src, /has\('demo'\)|'Demo room'|demoObjects|onDemo|simulation\.js/, `${name} has no demo room`);
  }
  assert.doesNotMatch(html, /id="reset"|class="legend"|Miso|Creature gallery/);
  assert.doesNotMatch(main, /Creature gallery|createState|scene\.add\(player/);
});
