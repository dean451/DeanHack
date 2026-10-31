import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {hpStage, portraitLook, createRefreshGate, createHeroPortrait, PORTRAIT_INTERVAL_MS, PORTRAIT_MIN_GAP_MS, PORTRAIT_MARKS} from './hero-portrait.js';

// A renderer stand-in: records what it draws and what scene the hero was in at the time.
function fakeRenderer() {
  const r = {
    calls: [], compiled: 0, reads: 0, current: null, clearColor: new THREE.Color(0x123456), clearAlpha: 1, shadowMap: {needsUpdate: true},
    getRenderTarget() { return r.current; }, setRenderTarget(t) { r.current = t; },
    getClearColor(c) { return c.copy(r.clearColor); }, getClearAlpha() { return r.clearAlpha; },
    setClearColor(c, a) { r.clearColor = new THREE.Color(c); r.clearAlpha = a; },
    clear() {},
    render(scene, camera) { r.calls.push({scene, camera, target: r.current, heroIn: scene.children.find(c => c.name === 'hero') ?? null}); r.shadowMap.needsUpdate = false; },
    compileAsync() { r.compiled++; return Promise.resolve(); },
    readRenderTargetPixelsAsync() { r.reads++; return Promise.resolve(); },
  };
  return r;
}
function fakeView({visible = true} = {}) {
  return {looks: [], draws: 0, shown: visible, size: () => ({w: 32, h: 40}), visible() { return this.shown; }, setLook(l) { this.looks.push(l); }, draw() { this.draws++; }};
}
function heroRig() {
  const world = new THREE.Group(), before = new THREE.Object3D(), after = new THREE.Object3D();
  const g = new THREE.Group(); g.name = 'hero';
  const head = new THREE.Object3D(); head.position.set(0, 1.23, 0); g.add(head);
  world.add(before, g, after);
  return {world, g, head, before, after};
}
const flush = () => new Promise(r => setTimeout(r, 0));
const subject = (rig, o = {}) => ({g: rig.g, head: rig.head, shape: null, kit: 'Valkyrie:female', hp: 20, maxhp: 20, conditions: [], dead: false, ...o});

test('hitpoints stages follow the panel: whole, scuffed, cracked below the low-hp line, shattered', () => {
  assert.equal(hpStage(20, 20), 0);
  assert.equal(hpStage(15, 20), 0);
  assert.equal(hpStage(14, 20), 1);
  assert.equal(hpStage(8, 20), 1);
  assert.equal(hpStage(7, 20), 2);
  assert.equal(hpStage(3, 20), 2);
  assert.equal(hpStage(2, 20), 3);
  assert.equal(hpStage(0, 20), 3);
  assert.equal(hpStage(5, 0), 0);
});

test('conditions become marks and treatments; death drains everything and keys differently', () => {
  const look = portraitLook({hp: 20, maxhp: 20, conditions: ['Blind', 'FoodPois', 'Hungry', 'Conf', 'Stun', 'Hallu']});
  assert.deepEqual(look.treatments, ['blind', 'ill', 'conf', 'stun', 'hallu']);
  assert.equal(look.marks.length, PORTRAIT_MARKS);
  assert.deepEqual(look.marks[0], {tag: 'BLIND', glyph: '▬', mild: false});
  assert.equal(look.marks.find(m => m.tag === 'HUNGRY').mild, true);
  assert.equal(look.more, 2);
  assert.deepEqual(portraitLook({conditions: ['Stone']}).treatments, ['stone']);
  assert.deepEqual(portraitLook({conditions: ['Weak']}).treatments, ['gaunt']);
  assert.deepEqual(portraitLook({conditions: ['Burdened']}).treatments, [], 'a burden is a mark, not a treatment');
  const dead = portraitLook({hp: 0, maxhp: 20, conditions: ['Blind'], dead: true});
  assert.equal(dead.dead, true);
  assert.equal(dead.stage, 3);
  assert.deepEqual(dead.marks, []);
  assert.notEqual(dead.key, portraitLook({hp: 0, maxhp: 20, conditions: ['Blind']}).key);
  assert.notEqual(portraitLook({hp: 7, maxhp: 20}).key, portraitLook({hp: 20, maxhp: 20}).key);
  assert.equal(portraitLook({hp: 19, maxhp: 20}).key, portraitLook({hp: 16, maxhp: 20}).key, 'a scratch inside a stage does not force a redraw');
});

test('the refresh gate draws on change at once, else once per interval, never closer than the minimum gap', () => {
  const gate = createRefreshGate();
  assert.equal(gate.due(0, 'a', 250), true); gate.mark(0, 'a');
  assert.equal(gate.due(100, 'a', 250), false);
  assert.equal(gate.due(PORTRAIT_MIN_GAP_MS - 1, 'b', 250), false);
  assert.equal(gate.due(PORTRAIT_MIN_GAP_MS, 'b', 250), true);
  assert.equal(gate.due(250, 'a', 250), true);
});

test('the portrait renders the hero itself in its own scene, then puts her back where she was', async () => {
  const renderer = fakeRenderer(), view = fakeView(), rig = heroRig();
  const portrait = createHeroPortrait({THREE, renderer, view});
  const mainTarget = {};
  renderer.current = mainTarget;
  portrait.update(0, subject(rig));
  await flush();
  assert.equal(renderer.compiled, 1, 'a new kit is compiled off the frame first');
  assert.equal(portrait.update(16, subject(rig)), true);
  assert.equal(portrait.renders, 1);
  const call = renderer.calls[0];
  assert.equal(call.heroIn, rig.g, 'the hero was in the portrait scene while drawn');
  assert.ok(call.scene.children.some(c => c.isDirectionalLight), 'the portrait brings its own lights');
  assert.equal(call.target.width, 32);
  assert.equal(rig.g.parent, rig.world);
  assert.deepEqual(rig.world.children, [rig.before, rig.g, rig.after], 'same place among her siblings');
  assert.ok(!call.scene.children.includes(rig.g));
  assert.equal(renderer.current, mainTarget, 'render target restored');
  assert.equal(renderer.clearColor.getHex(), 0x123456);
  assert.equal(renderer.shadowMap.needsUpdate, true, 'the main frame still gets its shadow update');
  // the camera looks at the head from in front
  const camPos = call.camera.position;
  assert.ok(camPos.z > .5 && Math.abs(camPos.y - 1.23) < .4, `camera at ${camPos.toArray()}`);
  await flush();
  assert.equal(view.draws, 1, 'the pixels reach the canvas');
  rig.world.traverse(o => assert.ok(o.isGroup || o.isObject3D));
});

test('the portrait is throttled: a few renders a second, not one per frame', async () => {
  const renderer = fakeRenderer(), view = fakeView(), rig = heroRig();
  const portrait = createHeroPortrait({THREE, renderer, view});
  portrait.update(0, subject(rig)); await flush();
  for (let t = 16; t <= 2000; t += 16) { portrait.update(t, subject(rig), {interval: PORTRAIT_INTERVAL_MS.balanced}); await flush(); }
  assert.ok(portrait.renders >= 7 && portrait.renders <= 9, `${portrait.renders} renders in two seconds at 4 a second`);
  const low = createHeroPortrait({THREE, renderer: fakeRenderer(), view: fakeView()});
  low.update(0, subject(rig)); await flush();
  for (let t = 16; t <= 2000; t += 16) { low.update(t, subject(rig), {interval: PORTRAIT_INTERVAL_MS.low}); await flush(); }
  assert.ok(low.renders <= 5, `low tier: ${low.renders}`);
});

test('hitpoint and status changes redraw at once and restyle the frame', async () => {
  const renderer = fakeRenderer(), view = fakeView(), rig = heroRig();
  const portrait = createHeroPortrait({THREE, renderer, view});
  portrait.update(0, subject(rig)); await flush();
  portrait.update(16, subject(rig)); await flush();
  assert.equal(portrait.renders, 1);
  assert.equal(portrait.update(40, subject(rig)), false, 'nothing changed, inside the interval');
  assert.equal(portrait.update(100, subject(rig, {hp: 6})), true, 'a heavy blow redraws before the interval');
  assert.equal(view.looks.at(-1).stage, 2);
  await flush();
  assert.equal(portrait.update(200, subject(rig, {hp: 6, conditions: ['Blind']})), true, 'going blind redraws');
  assert.deepEqual(view.looks.at(-1).treatments, ['blind']);
  assert.equal(view.looks.at(-1).marks[0].tag, 'BLIND');
  assert.equal(view.looks.length, 3, 'the look is set only when it changes');
});

test('at death the portrait freezes on the last living frame, drained', async () => {
  const renderer = fakeRenderer(), view = fakeView(), rig = heroRig();
  const portrait = createHeroPortrait({THREE, renderer, view});
  portrait.update(0, subject(rig)); await flush();
  portrait.update(16, subject(rig)); await flush();
  const before = portrait.renders;
  for (let t = 100; t < 3000; t += 50) { portrait.update(t, subject(rig, {hp: 0, dead: true})); await flush(); }
  assert.equal(portrait.renders, before);
  assert.equal(view.looks.at(-1).dead, true);
  // a new game brings it back to life
  assert.equal(portrait.update(3100, subject(rig, {hp: 14, maxhp: 14})), true);
});

test('nothing renders while hidden, while a read is in flight, or with no hero', async () => {
  const renderer = fakeRenderer(), view = fakeView({visible: false}), rig = heroRig();
  let release;
  renderer.readRenderTargetPixelsAsync = () => new Promise(r => { release = r; });
  const portrait = createHeroPortrait({THREE, renderer, view});
  for (let t = 0; t < 1000; t += 16) portrait.update(t, subject(rig));
  assert.equal(portrait.renders, 0);
  assert.equal(view.looks.length, 1, 'the frame still shows the state');
  view.shown = true;
  portrait.update(1000, subject(rig)); await flush();
  portrait.update(1016, subject(rig));
  assert.equal(portrait.renders, 1);
  for (let t = 1300; t < 3000; t += 16) portrait.update(t, subject(rig, {hp: 1}));
  assert.equal(portrait.renders, 1, 'waits for the pixels of the last render');
  release(); await flush();
  portrait.update(3100, subject(rig, {hp: 1}));
  assert.equal(portrait.renders, 2);
  assert.equal(portrait.update(3500, null), false);
});

test('the polymorph stand-in is framed by its own bounds', async () => {
  const renderer = fakeRenderer(), view = fakeView(), rig = heroRig();
  const shape = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 1));
  shape.position.y = 1.2; rig.g.add(shape);
  const portrait = createHeroPortrait({THREE, renderer, view});
  portrait.update(0, subject(rig, {shape})); await flush();
  portrait.update(16, subject(rig, {shape}));
  const cam = renderer.calls[0].camera.position;
  assert.ok(cam.y > 1.5, `looks at the top of the form (camera y ${cam.y.toFixed(2)})`);
});

test('the game wires the portrait: main.js draws it each frame and live.js hands over the live hero', () => {
  const main = readFileSync(new URL('./main.js', import.meta.url), 'utf8').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
  assert.ok(main.includes("mountPortraitView(document,$('.character'))"));
  assert.ok(main.includes('heroPortrait.update(performance.now(),live.portraitSubject'));
  const live = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  assert.match(live, /get portraitSubject\(\)\{[^]*?g:hero\.g,head:/);
  const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');
  for (const rule of ['#hero-portrait{', '#hero-portrait.dead', '#hero-portrait.t-blind', '#hero-portrait.stage-3', '@media(max-width:650px){#hero-portrait{display:none}'])
    assert.ok(css.includes(rule), `style.css has ${rule}`);
});
