import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateGait} from './gait.js';
import {FIDGETS, fidgetPose, fidgetsFor, updateFidget, FIRST_MIN, FIRST_SPAN, HEAD_LEAD, SCRATCH_TILT} from './fidget.js';

const parts = a => [a.body, ...a.legs, ...(a.arms || []), a.head, a.hat, a.beard, a.pick].filter(Boolean);
const snapshot = a => parts(a).map(p => ({p, pos: p.position.clone(), quat: p.quaternion.clone()}));
const atRest = (snap, eps = 1e-6) => snap.every(({p, pos, quat}) => p.position.distanceTo(pos) < eps && Math.abs(Math.abs(p.quaternion.dot(quat)) - 1) < eps);

// Mimic live.js's idle frame: its generic leg and body writes, then the gait and the fidget.
function frame(a, t, dt, busy = false) {
  a.legs.forEach(l => l.rotation.x = 0);
  a.body.position.y = 0;
  updateGait(a, dt, busy);
  return updateFidget(a, dt, t, busy);
}

// Run until the actor starts `kind` (forcing the choice), returning the time.
function startFidget(a, kind, dt = 1 / 60) {
  let t = 0;
  frame(a, t, dt);
  a.fidget.wait = dt / 2;
  const list = fidgetsFor(a);
  // pick deterministically by steering the PRNG until the draw lands on `kind`
  for (let seed = 1; seed < 500; seed++) {
    const s = (seed * 1103515245 + 12345) % 2147483648;
    if (list[Math.floor(s / 2147483648 * list.length)] === kind) { a.fidget.seed = seed; break; }
  }
  t += dt;
  const r = frame(a, t, dt);
  assert.equal(r?.kind, kind);
  return t;
}

test('fidget poses are finite, bounded and zero at both ends', () => {
  for (const kind of Object.keys(FIDGETS)) {
    for (let i = 0; i <= 100; i++) {
      const p = fidgetPose(kind, i / 100, i * .07);
      for (const v of [p.yaw, p.roll, p.lean, p.bob, p.pick, p.headYaw, p.headRoll, ...p.arms.flat()]) {
        assert.ok(Number.isFinite(v), kind);
        assert.ok(Math.abs(v) < 3.7, `${kind} ${v}`);
      }
    }
    for (const u of [0, 1]) {
      const p = fidgetPose(kind, u, 3.1);
      for (const v of [p.yaw, p.roll, p.lean, p.bob, p.pick, p.headYaw, p.headRoll, ...p.arms.flat()]) assert.ok(Math.abs(v) < 1e-9, `${kind} at ${u}: ${v}`);
    }
  }
  assert.deepEqual(fidgetsFor(createCreature({name: 'jackal'})), []);
  assert.deepEqual(fidgetsFor(createCreature({name: 'dwarf king'})), ['look']);
});

test('a still gnome waits a few seconds, looks around, and returns exactly to rest', () => {
  const a = createCreature({name: 'gnome'});
  const dt = 1 / 60;
  frame(a, 0, dt);
  const rest = snapshot(a);
  const feet = a.legs.map(l => l.getWorldPosition(new THREE.Vector3()));
  let t = 0, first = null, left = 0, right = 0;
  for (let i = 0; i < 60 * 9; i++) {
    t += dt;
    const r = frame(a, t, dt);
    if (r && first == null) first = t;
    if (r) {
      left = Math.max(left, r.pose.yaw); right = Math.min(right, r.pose.yaw);
      a.g.updateMatrixWorld(true);
      // the feet stay planted while the body turns above them
      a.legs.forEach((l, j) => assert.ok(l.getWorldPosition(new THREE.Vector3()).distanceTo(feet[j]) < 1e-6));
    }
    if (first != null && !r) break;
  }
  assert.ok(first >= FIRST_MIN && first <= FIRST_MIN + FIRST_SPAN + dt, `first fidget at ${first}`);
  assert.ok(left > .4 && right < -.4, `looked ${left} ${right}`);
  assert.ok(atRest(rest), 'gnome back at rest');
});

test('a hobbit scratches its head with the right hand', () => {
  const a = createCreature({name: 'hobbit'});
  const dt = 1 / 60;
  frame(a, 0, dt);
  const rest = snapshot(a);
  let t = startFidget(a, 'scratch'), closest = Infinity, r;
  const head = new THREE.Vector3();
  do {
    t += dt;
    r = frame(a, t, dt);
    a.g.updateMatrixWorld(true);
    const hand = new THREE.Vector3(0, -.3, 0).applyMatrix4(a.arms[1].matrixWorld);
    head.set(0, .87, .02).applyMatrix4(a.body.matrixWorld);
    closest = Math.min(closest, hand.distanceTo(head));
    for (const v of hand.toArray()) assert.ok(Number.isFinite(v));
  } while (r);
  // the hand (r .065) rubs the side of the head (r .18) and the hair above it
  assert.ok(closest > .12 && closest < .22, `hand to head ${closest}`);
  assert.ok(atRest(rest), 'hobbit back at rest');
});

test('a dwarf plants its pick on the floor and leans on it', () => {
  const a = createCreature({name: 'dwarf'});
  const dt = 1 / 60;
  frame(a, 0, dt);
  const rest = snapshot(a);
  let t = startFidget(a, 'lean'), r, planted = 0, lowest = Infinity, gap = Infinity;
  do {
    t += dt;
    r = frame(a, t, dt);
    a.g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(a.pick);
    if (r && r.pose.pick > .99) {
      planted++;
      lowest = Math.min(lowest, box.min.y);
      const butt = new THREE.Vector3(0, -.125, 0).applyMatrix4(a.pick.matrixWorld);
      const hand = new THREE.Vector3(0, -.38, 0).applyMatrix4(a.arms[0].matrixWorld);
      gap = Math.min(gap, butt.distanceTo(hand));
    }
    // the pick never swings back through the body
    assert.ok(box.max.z > .05, `pick behind the dwarf at ${t}`);
  } while (r);
  assert.ok(planted > 60, 'held the lean');
  assert.ok(lowest > -.03 && lowest < .05, `pick head on the floor (${lowest})`);
  assert.ok(gap < .08, `hand on the pick butt (${gap})`);
  assert.ok(atRest(rest), 'dwarf back at rest');
});

test('walking or an action cuts a fidget short, and nothing drifts over a long idle', () => {
  const a = createCreature({name: 'dwarf lord'});
  const dt = 1 / 60;
  frame(a, 0, dt);
  const rest = snapshot(a);
  let t = startFidget(a, 'lean');
  for (let i = 0; i < 60; i++) frame(a, t += dt, dt);
  assert.ok(a.fidget.cur, 'mid-lean');
  // starts walking: gone within about 0.5 s
  let gone = null;
  for (let i = 0; i < 60 && gone == null; i++) if (!frame(a, t += dt, dt, true)) gone = i * dt;
  assert.ok(gone != null && gone < .6, `faded in ${gone}`);
  // stand still for a long while: several fidgets come and go, always ending at rest
  let starts = 0, was = false;
  for (let i = 0; i < 60 * 40; i++) {
    const r = frame(a, t += dt, dt);
    if (r && !was) starts++;
    was = !!r;
    for (const p of parts(a)) for (const v of [...p.position.toArray(), ...p.quaternion.toArray()]) assert.ok(Number.isFinite(v));
  }
  assert.ok(starts >= 3, `${starts} fidgets in 40 s`);
  while (frame(a, t += dt, dt)) {}
  assert.ok(atRest(rest, 1e-5), 'rest after a long idle');
  // the dead don't fidget
  a.actions = {dead: true};
  a.fidget.wait = dt / 2;
  for (let i = 0; i < 60; i++) assert.equal(frame(a, t += dt, dt), null);
});

test('GLB-swapped and non-folk actors are left alone', () => {
  const g = createCreature({name: 'gnome'});
  g.asset = {};
  assert.equal(updateFidget(g, .1, 1, false), null);
  assert.equal(g.fidget, undefined);
  const j = createCreature({name: 'jackal'});
  assert.equal(updateFidget(j, .1, 1, false), null);
});

test('the evil eye darts its eye about while still, eases back to centre when busy, and never drifts', async () => {
  const {YAW, PITCH, TREMOR} = await import('./glance.js');
  const a = createCreature({name: 'evil eye'});
  a.species = 'evil eye';
  const h = a.head, rest = h.quaternion.clone();
  const dt = 1 / 60;
  let t = 0, prev = null, flicks = 0, centres = 0, maxYaw = 0, maxPitch = 0;
  for (let i = 0; i < 60 * 30; i++, t += dt) {
    updateFidget(a, dt, t, false);
    const {x, y, z} = h.rotation;
    for (const v of [x, y, z]) assert.ok(Number.isFinite(v));
    assert.ok(Math.abs(y) <= YAW + TREMOR + 1e-9 && Math.abs(x) <= PITCH + TREMOR + 1e-9, `${x} ${y}`);
    maxYaw = Math.max(maxYaw, Math.abs(y)); maxPitch = Math.max(maxPitch, Math.abs(x));
    // a flick covers at most the whole range in a few frames; never a jump bigger than one flick's steepest frame
    if (prev) assert.ok(Math.hypot(x - prev.x, y - prev.y) < .5, 'no teleport');
    if (a.glance.u === 0) { flicks++; if (!a.glance.to.yaw && !a.glance.to.pitch) centres++; }
    prev = {x, y};
  }
  assert.ok(flicks >= 12 && flicks <= 90, `flicks ${flicks}`);
  assert.ok(centres >= 2, `centres ${centres}`);
  assert.ok(maxYaw > .3 && maxPitch > .1, `${maxYaw} ${maxPitch}`);
  // Walking or an action eases it back to exactly rest within ~0.1 s, then it stays put.
  for (let i = 0; i < 12; i++, t += dt) updateFidget(a, dt, t, true);
  assert.ok(Math.abs(Math.abs(h.quaternion.dot(rest)) - 1) < 1e-4, 'nearly centred after .2 s');
  for (let i = 0; i < 60; i++, t += dt) updateFidget(a, dt, t, true);
  assert.ok(Math.abs(Math.abs(h.quaternion.dot(rest)) - 1) < 1e-9, 'exactly centred');
  // It resumes after a short hold, and dying centres it for good.
  let moved = false;
  for (let i = 0; i < 60 * 4; i++, t += dt) { updateFidget(a, dt, t, false); moved ||= Math.abs(h.rotation.y) > .05; }
  assert.ok(moved, 'resumes');
  a.actions = {dead: true, queue: []};
  for (let i = 0; i < 60; i++, t += dt) updateFidget(a, dt, t, false);
  assert.ok(Math.abs(Math.abs(h.quaternion.dot(rest)) - 1) < 1e-9, 'still when dead');
  // Other hovering things are left alone.
  const f = createCreature({name: 'floating eye'});
  f.species = 'floating eye';
  if (f.head) { const q = f.head.quaternion.clone(); for (let i = 0; i < 120; i++) updateFidget(f, dt, i * dt, false); assert.ok(f.head.quaternion.equals(q)); }
});

test('the evil eye watches the hero when they are in view, follows them, and lets go when they leave', async () => {
  const {YAW, PITCH, TREMOR, aimAt} = await import('./glance.js');
  const a = createCreature({name: 'evil eye'});
  a.species = 'evil eye';
  const h = a.head, rest = h.quaternion.clone();
  const dt = 1 / 60, hero = {x: 1.5, y: 0, z: 3};
  const on = (aim) => Math.hypot(h.rotation.y - aim.yaw, h.rotation.x - aim.pitch) < .03;
  // Aim: the hero ahead and to the right means a positive yaw and an upward (negative) pitch.
  const aim0 = aimAt(a, hero);
  assert.ok(aim0.yaw > .3 && aim0.yaw <= YAW && aim0.pitch < 0 && aim0.pitch >= -PITCH, JSON.stringify(aim0));
  assert.equal(aimAt(a, {x: 0, y: 0, z: -3}), null, 'behind it');
  assert.equal(aimAt(a, {x: 0, y: 0, z: 9}), null, 'out of range');
  let t = 0, prev = null, onFrames = 0, firstOn = -1;
  for (let i = 0; i < 60 * 30; i++, t += dt) {
    // The hero strolls back and forth across the eye's view.
    hero.x = 1.8 * Math.sin(t * .4);
    updateFidget(a, dt, t, false, hero);
    const {x, y} = h.rotation;
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
    assert.ok(Math.abs(y) <= YAW + TREMOR + 1e-9 && Math.abs(x) <= PITCH + TREMOR + 1e-9);
    if (prev) assert.ok(Math.hypot(x - prev.x, y - prev.y) < .5, 'no teleport');
    prev = {x, y};
    if (on(aimAt(a, hero))) { onFrames++; if (firstOn < 0) firstOn = t; }
  }
  assert.ok(firstOn >= 0 && firstOn < .3, `notices the hero quickly (${firstOn})`);
  assert.ok(onFrames > 60 * 30 * .45, `mostly watching the hero (${onFrames})`);
  // The hero walks behind it: the eye stops staring and goes back to plain glances.
  hero.x = 0; hero.z = -3;
  for (let i = 0; i < 30; i++, t += dt) updateFidget(a, dt, t, false, hero);
  assert.equal(a.glance.track, false);
  // Busy still returns it exactly to rest.
  hero.z = 3;
  for (let i = 0; i < 90; i++, t += dt) updateFidget(a, dt, t, true, hero);
  assert.ok(Math.abs(Math.abs(h.quaternion.dot(rest)) - 1) < 1e-9, 'exactly centred when busy');
});

test('the evil eye loses the hero when they turn invisible, and finds them again when they reappear', async () => {
  const {heroLook, aimAt} = await import('./glance.js');
  const a = createCreature({name: 'evil eye'});
  a.species = 'evil eye';
  const h = a.head, dt = 1 / 60, pos = {x: 1.5, y: 0, z: 3};
  assert.equal(heroLook({invisible: true}, pos), null);
  assert.equal(heroLook({invisible: false}, pos), pos);
  assert.equal(heroLook(null, pos), pos, 'demo room: no frame, still watched');
  const aim = aimAt(a, pos), on = () => Math.hypot(h.rotation.y - aim.yaw, h.rotation.x - aim.pitch) < .03;
  let t = 0;
  const run = (player, secs) => { let n = 0; for (let i = 0; i < 60 * secs; i++, t += dt) { updateFidget(a, dt, t, false, heroLook(player, pos)); assert.ok(Number.isFinite(h.rotation.x) && Number.isFinite(h.rotation.y)); if (on()) n++; } return n; };
  assert.ok(run({invisible: false}, 1) > 30, 'staring at the visible hero');
  assert.equal(a.glance.track, true);
  // Invisible: the stare breaks at once and it never settles on the hero's spot for long.
  run({invisible: true}, .1);
  assert.equal(a.glance.track, false);
  assert.ok(run({invisible: true}, 20) < 60 * 20 * .15, 'no longer watching');
  assert.equal(a.glance.track, false);
  // Visible again: it notices within a moment.
  assert.ok(run({invisible: false}, 1) > 20, 'finds the hero again');
});

test('the head leads the body round when looking, and tilts into the scratching hand', () => {
  const dt = 1 / 60;
  const g = createCreature({name: 'gnome'});
  assert.ok(g.head, 'gnome has a head');
  frame(g, 0, dt);
  const rest = snapshot(g), yaw0 = g.head.rotation.y;
  let t = startFidget(g, 'look', dt), firstHead = null, firstBody = null, maxHead = 0, prevHead = 0, jump = 0, body = 0;
  for (let i = 0; i < 60 * 4; i++) {
    t += dt;
    const r = frame(g, t, dt);
    const h = g.head.rotation.y - yaw0;
    for (const v of [h, g.head.rotation.x, g.head.rotation.z]) assert.ok(Number.isFinite(v));
    if (!r) break;
    if (firstHead == null && h > .1) firstHead = r.u;
    if (firstBody == null && r.pose.yaw > .1) firstBody = r.u;
    maxHead = Math.max(maxHead, Math.abs(h)); body = Math.max(body, Math.abs(r.pose.yaw));
    jump = Math.max(jump, Math.abs(h - prevHead)); prevHead = h;
  }
  assert.ok(firstHead != null && firstBody != null && firstHead < firstBody, `head first (${firstHead} < ${firstBody})`);
  // on top of the body's .42, the head turns about half as far again, and never snaps
  assert.ok(maxHead > .2 && maxHead <= HEAD_LEAD * .42 + 1e-9, `head turn ${maxHead} (body ${body})`);
  assert.ok(jump < .03, `head step ${jump}`);
  assert.ok(atRest(rest), 'gnome head back at rest');

  const h = createCreature({name: 'hobbit'});
  frame(h, 0, dt);
  const hrest = snapshot(h);
  t = startFidget(h, 'scratch', dt);
  let tilt = 0;
  for (let i = 0; i < 60 * 4; i++) { t += dt; if (!frame(h, t, dt)) break; tilt = Math.min(tilt, h.head.rotation.z); }
  assert.ok(tilt < -SCRATCH_TILT * .9 && tilt >= -SCRATCH_TILT - 1e-9, `tilt ${tilt}`);
  assert.ok(atRest(hrest), 'hobbit head back at rest');

  // interrupted mid-look by walking: the head fades home with the rest
  const w = createCreature({name: 'gnome'});
  frame(w, 0, dt);
  const wrest = snapshot(w);
  t = startFidget(w, 'look', dt);
  for (let i = 0; i < 20; i++) { t += dt; frame(w, t, dt); }
  assert.ok(Math.abs(w.head.rotation.y) > .05);
  for (let i = 0; i < 60; i++) { t += dt; frame(w, t, dt, true); }
  for (let i = 0; i < 60; i++) { t += dt; frame(w, t, dt, true); }
  assert.ok(Math.abs(w.head.rotation.y) < 1e-6, `head home after walking ${w.head.rotation.y}`);
});

test('the hezrou drools, breathes through its throat sac and now and then gurgles and belches, all back to rest after death', async () => {
  const G = await import('./hezrou-gurgle.js');
  const hz = createCreature({name: 'hezrou'});
  assert.ok(G.gurgles(hz)); assert.equal(G.gurgles(createCreature({name: 'gnome'})), false);
  assert.equal(updateFidget(createCreature({name: 'gnome'}), 0, 0, false), null);
  const head0 = hz.head.rotation.x, jaw0 = hz.jaw.rotation.x, dt = 1 / 60;
  // the drool sags long and snaps back short; the sac swells big in a gurgle and empties past rest
  assert.ok(Math.abs(G.droolLength(0, Infinity) - 1) < 1e-9 && Math.abs(G.droolLength(1) - G.STRETCH) < 1e-9);
  assert.ok(Math.abs(G.droolLength(0, 0) - G.RECOIL) < 1e-9 && Math.abs(G.droolLength(.2, G.SETTLE) - G.droolLength(.2)) < 1e-9);
  let t = 0, maxSac = 0, minSac = 9, maxDrool = 0, minDrool = 9, snaps = 0, gurgled = false, belched = false, step = 0, prev = null;
  for (let i = 0; i < 60 * 40; i++) {
    t += dt;
    updateFidget(hz, dt, t, false);
    const st = hz.hezrouGurgle;
    const sac = hz.sac.scale.x, d = hz.drools.map(x => x.scale.y);
    for (const v of [sac, hz.sac.scale.y, ...d, hz.head.rotation.x, hz.jaw.rotation.x, ...hz.drools.map(x => x.scale.x)]) assert.ok(Number.isFinite(v));
    maxSac = Math.max(maxSac, sac); minSac = Math.min(minSac, sac);
    maxDrool = Math.max(maxDrool, ...d); minDrool = Math.min(minDrool, ...d);
    if (prev) { if (d.some((v, k) => prev[k] - v > .8)) snaps++; step = Math.max(step, Math.abs(sac - prev.sac)); }
    prev = Object.assign([...d], {sac});
    if (st.cur) { gurgled = true; if (hz.jaw.rotation.x - jaw0 > G.GAPE * .8) belched = true; }
    assert.ok(hz.jaw.rotation.x - jaw0 > -1e-9, 'the jaw never closes past rest');
  }
  assert.ok(gurgled && belched, 'gurgled and belched');
  assert.ok(maxSac > 1 + G.SWELL * .9 && maxSac < 1 + G.SWELL + G.QUIVER + G.BREATH + 1e-9, `sac swells to ${maxSac}`);
  assert.ok(minSac < 1 - G.EMPTY * .6 && minSac > .55, `sac empties to ${minSac}`);
  assert.ok(maxDrool > G.STRETCH * .95 && maxDrool <= G.STRETCH + 1e-9, `drool to ${maxDrool}`);
  assert.ok(minDrool < .5 && minDrool > .2, `drool snaps to ${minDrool}`);
  assert.ok(snaps >= 10, `${snaps} snaps`);
  // the belch and the quiver are quick (about 4 per second at most) but never a jump
  assert.ok(step < .09, `sac step ${step}`);
  // walking: the gurgle fades out and the drool swings
  for (let i = 0; i < 60; i++) { t += dt; updateFidget(hz, dt, t, true); }
  assert.equal(hz.hezrouGurgle.cur, null);
  assert.ok(Math.abs(hz.head.rotation.x - head0) < 1e-9, 'the head is home while walking');
  let swing = 0;
  for (let i = 0; i < 60; i++) { t += dt; updateFidget(hz, dt, t, true); swing = Math.max(swing, Math.abs(hz.drools[0].rotation.x)); }
  assert.ok(swing > G.SWING * .8 && swing <= G.SWING + 1e-9, `swing ${swing}`);
  // stand still until a gurgle is under way, then die in the middle of it
  for (let i = 0; i < 60 * 20 && !(hz.hezrouGurgle.cur?.u > .4); i++) { t += dt; updateFidget(hz, dt, t, false); }
  assert.ok(hz.hezrouGurgle.cur, 'gurgling again');
  hz.actions = {dead: true, current: null, queue: []};
  for (let i = 0; i < 60 * 6; i++) { t += dt; updateFidget(hz, dt, t, false); }
  assert.ok(Math.abs(hz.head.rotation.x - head0) < 1e-9 && Math.abs(hz.jaw.rotation.x - jaw0) < 1e-9, 'head and jaw at rest');
  for (const v of [hz.sac.scale.x, hz.sac.scale.y, ...hz.drools.flatMap(d => [d.scale.x, d.scale.y])]) assert.ok(Math.abs(v - 1) < 1e-6, `scale ${v}`);
  assert.ok(hz.drools.every(d => Math.abs(d.rotation.x) < 1e-6));
});

test('the blue jelly breathes, shivers with glints, spills mist and creeps rime, puffs frost when hit, and rests after death', async () => {
  const J = await import('./jelly-frost.js');
  const bj = createCreature({name: 'blue jelly'});
  bj.species = 'blue jelly';
  const other = createCreature({name: 'spotted jelly'});
  other.species = 'spotted jelly';
  assert.equal(J.updateJellyFrost(other, .016, 0, false, false), null, 'only the blue jelly');
  const kids = bj.body.children.filter(m => m.isMesh), rest = kids.map(m => [m.scale.clone(), m.rotation.clone(), m.position.clone()]);
  const dt = 1 / 60;
  let t = 0, shivered = false, glinted = 0, mist = 0;
  for (let i = 0; i < 60 * 12; i++) {
    t += dt; updateFidget(bj, dt, t, false);
    const st = bj.jellyFrost;
    if (st.shiver) shivered = true;
    const gc = st.glints.geometry.attributes.color.array, mc = st.mist.geometry.attributes.color.array;
    for (let k = 3; k < gc.length; k += 4) glinted = Math.max(glinted, gc[k]);
    for (let k = 3; k < J.WISPS * 4; k += 4) mist = Math.max(mist, mc[k]);
    for (const a of [st.mist.geometry.attributes.position.array, st.glints.geometry.attributes.position.array]) assert.ok(a.every(Number.isFinite));
    for (const m of kids) assert.ok(m.scale.x > .85 * rest[kids.indexOf(m)][0].x && m.scale.x < 1.2 * rest[kids.indexOf(m)][0].x);
    const k = st.rime.scale.x;
    assert.ok(k > .85 && k < 1.12, `rime ${k}`);
  }
  assert.ok(shivered && glinted > .8 && mist > J.WISP_ALPHA * .8, `shiver ${shivered}, glint ${glinted}, mist ${mist}`);
  // a blow from the west (+x travel): a hard shudder, the rime flares, frost puffs back toward the attacker
  bj.actions = {current: {kind: 'hit', dir: [1, 0]}, age: 0, queue: [], dead: false};
  t += dt; updateFidget(bj, dt, t, true);
  const st = bj.jellyFrost;
  assert.equal(st.puffs.length, J.PUFF);
  let flare = 0;
  for (let i = 0; i < 20; i++) { t += dt; updateFidget(bj, dt, t, true); flare = Math.max(flare, st.rime.scale.x); }
  const px = st.puffs.reduce((s, p) => s + p.x, 0) / J.PUFF;
  assert.ok(px < -.05, `puff leans toward the attacker (${px})`);
  assert.ok(flare > 1.2, `rime flares to ${flare}`);
  bj.actions = {current: null, age: 0, queue: [], dead: false};
  for (let i = 0; i < 60 * 2; i++) {
    t += dt; updateFidget(bj, dt, t, false);
    for (const p of st.puffs) assert.ok(p.y >= .015 - 1e-9 && Math.hypot(p.x, p.z) < .9);
  }
  // walking draws the rime in
  for (let i = 0; i < 60; i++) { t += dt; updateFidget(bj, dt, t, true); }
  assert.ok(st.rime.scale.x < .7, `rime shrinks to ${st.rime.scale.x}`);
  // die mid-shiver
  st.shiver = {u: .1, amp: 1};
  bj.actions = {current: null, age: 0, queue: [], dead: true};
  for (let i = 0; i < 60 * 8; i++) { t += dt; updateFidget(bj, dt, t, false); }
  kids.forEach((m, i) => {
    assert.ok(m.scale.distanceTo(rest[i][0]) < 1e-9 && m.position.distanceTo(rest[i][2]) < 1e-9, 'body parts at rest');
    assert.ok(Math.abs(m.rotation.x - rest[i][1].x) + Math.abs(m.rotation.y - rest[i][1].y) + Math.abs(m.rotation.z - rest[i][1].z) < 1e-9);
  });
  assert.equal(st.rime.scale.x, 1); assert.ok(Math.abs(st.rime.rotation.y) === 0);
  const alphas = [...st.mist.geometry.attributes.color.array, ...st.glints.geometry.attributes.color.array].filter((_, k) => k % 4 === 3);
  assert.ok(alphas.every(v => v === 0), 'mist and glints gone');
});
