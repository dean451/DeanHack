import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue} from './actions.js';
import {updateDragonMenace, menaces} from './dragon-menace.js';
import {SETTLE, DOZE, WAKE} from './dragon-sleep.js';
import {wingsFor, flapLength, FLAP} from './dragon-wingbeat.js';
import {wingPoses, WINGS} from './dragon-wings.js';
import {WING_POSES} from './dragon-wing-poses.js';
import {samples} from './dragon-rest.js';
import {rolesOf} from './body-roles.js';
import {DRAGON} from './creature-measures.js';

const D = 68, FPS = 30, dt = 1 / FPS;
const NAMES = JSON.parse(readFileSync(new URL('./tools/creature-names.json', import.meta.url))).filter(m => m.letter === 'D');
const COLORS = Object.fromEntries(NAMES.map(m => [m.name.toLowerCase(), m.color]));
const dragon = name => { const a = createCreature({name, symbol: D, color: COLORS[name]}); a.actions = createActionQueue(); a.species = name; return a; };
const run = (a, secs, t0, {busy = false, walking = busy, look = null} = {}) => { let r; for (let i = 0; i < secs * FPS; i++) r = updateDragonMenace(a, dt, t0 + i * dt, busy, walking, look); return r; };
const root = w => w.userData.inner.getWorldPosition(new THREE.Vector3());

test('every winged dragon has baked folded wings and a wingbeat that meet all their goals', () => {
  let winged = 0;
  for (const {name: n} of NAMES) {
    const name = n.toLowerCase(), a = dragon(name);
    if (!menaces(a) || !a.wings.length) continue;
    winged++;
    assert(WING_POSES[name]?.ok, `${name} is baked and ok (node tools/bake-dragon-wings.mjs): worst ${WING_POSES[name]?.worst} m`);
    assert(wingsFor(a), name);
  }
  assert(winged >= 12, `${winged} winged forms`);
});

test('the baked draken and wyvern wings still match a fresh solve (re-bake after changing a dragon\'s wings or the goals)', () => {
  for (const name of ['draken', 'wyvern']) {
    const fresh = wingPoses(createCreature({name, symbol: D, color: COLORS[name]})), baked = WING_POSES[name];
    for (const k of ['fold', 'up', 'down']) for (const [n, o] of Object.entries(fresh[k])) for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[k][n]?.[ax] ?? (ax === 's' ? 1 : 0))) < 2e-3, `${name} ${k} ${n}.${ax}: baked ${baked[k][n]?.[ax]}, fresh ${v}`);
  }
});

test('walking, the wings fold the bat\'s way: about as long as the forearm, the wrist over the shoulder, in against the body, the tips back, laid over the back', () => {
  for (const name of ['draken', 'wyvern', 'tiamat', 'baby draken', 'amphitere']) {
    const a = dragon(name), P = rolesOf(a), S = a.g.scale.x, u = d => d * S;
    a.g.updateMatrixWorld(true);
    const open = Object.fromEntries(a.wings.map(w => [w.name, root(w).distanceTo(P[`wingtip:${w.name[0]}`]())]));
    const r = run(a, 3, 0, {busy: true}); a.g.updateMatrixWorld(true);
    assert.equal(r.furl, 1, `${name} furled`);
    const top = Math.max(...samples(a, {keep: v => v.y > .55, skinned: false, bodyOnly: true, every: 7})().map(p => p.y));
    for (const w of a.wings) {
      // (in the frame the wing hangs from, the body or a serpent's spine bone, scaled back to metres: walking, the
      // trunk swings the wings round with it)
      const inBody = p => w.parent.worldToLocal(p.clone()).multiplyScalar(w.parent.getWorldScale(new THREE.Vector3()).x);
      const s = w.name[0], tip = P[`wingtip:${s}`](), wrist = P[`wingwrist:${s}`](), [, elbow, end] = w.userData.inner.userData.edge;
      // the bat: the fingers fold back along the forearm, so the folded wing is about the forearm long (a tenth more)
      const forearm = Math.hypot(...elbow) / Math.hypot(...end), folded = root(w).distanceTo(tip) / open[w.name];
      assert(folded > forearm && folded < forearm * 1.25, `${name} ${w.name} folded to ${folded.toFixed(3)} of its length, its forearm ${forearm.toFixed(3)}`);
      assert(wrist.y > P.withers().y, `${name} ${w.name} wrist over the shoulder`);
      assert(Math.abs(inBody(wrist).x) < u(WINGS.wristIn) + u(.02) && Math.abs(inBody(tip).x) < u(WINGS.close) + u(.02), `${name} ${w.name} in against the body`);
      assert(inBody(tip).z < inBody(wrist).z, `${name} ${w.name} the fingers lie back`);
      if (!a.joints.spine0) assert(Math.min(wrist.y, tip.y) > top - u(.03), `${name} ${w.name} over the back`);
    }
  }
});

test('the dragon\'s wing proportions against the bat\'s: noted, not hidden (its forearm is a larger share of the wing)', () => {
  const a = dragon('draken'), [, elbow, end] = a.wings[0].userData.inner.userData.edge, share = Math.hypot(...elbow) / Math.hypot(...end);
  // a bat's forearm is 0.27 to 0.36 of its half-span; the dragon's is about half its wing. If the wing is ever
  // rebuilt with longer fingers, this flips and the fold will need no change: it follows the wing's own forearm.
  assert(share > DRAGON.forearmShare[1], `the draken's forearm share ${share.toFixed(3)}`);
});

test('rising from sleep, it flaps: the tips beat up over their roots and down under them, then the wings are exactly back', () => {
  for (const name of ['draken', 'wyvern', 'tiamat']) {
    const a = dragon(name), P = rolesOf(a), S = a.g.scale.x, e = wingsFor(a);
    const built = new Map(a.wings.flatMap(w => [w, w.userData.inner]).map(o => [o, {r: o.rotation.clone(), s: o.scale.x}]));
    let r = run(a, SETTLE + DOZE + 1, 0); assert.equal(r.sleep, 1, `${name} asleep`);
    // (no mantle or lash once it is awake and still: the flap is all that moves its wings here)
    a.menace.cur = null; a.menace.wait = 1e9;
    // the hero comes: it wakes; once fully awake, the flap starts
    const hero = new THREE.Vector3(1, 0, 1);
    let t = SETTLE + DOZE + 1, flapped = false;
    for (; t < SETTLE + DOZE + 1 + WAKE + .2; t += dt) { r = updateDragonMenace(a, dt, t, false, false, hero); if (r.flap !== null) flapped = true; }
    assert(flapped, `${name} flaps on rising`);
    let hi = -Infinity, lo = Infinity;
    for (const end = t + flapLength() + .1; t < end; t += dt) {
      r = updateDragonMenace(a, dt, t, false, false, hero); a.g.updateMatrixWorld(true);
      for (const w of a.wings) { const d = P[`wingtip:${w.name[0]}`]().y - root(w).y; const L = root(w).distanceTo(P[`wingtip:${w.name[0]}`]()); hi = Math.max(hi, d / L); lo = Math.min(lo, d / L); }
    }
    assert(hi > WINGS.beatUp * .5 && lo < -WINGS.beatDown * .5, `${name} beats: tips ${hi.toFixed(2)} up, ${lo.toFixed(2)} down (shares of the wing)`);
    assert.equal(r.flap, null, `${name} the flap ends`);
    // the wings' joints exactly at their built angles and size (the pivot's yaw is the breath's, written every frame)
    for (const w of a.wings) for (const o of [w, w.userData.inner]) {
      const k = o === w ? w.name : w.name + '_inner';
      for (const ax of o === w ? ['x', 'z'] : ['x', 'y', 'z']) assert.equal(o.rotation[ax], built.get(o).r[ax], `${name} ${k}.${ax}`);
      assert.equal(o.scale.x, built.get(o).s, `${name} ${k} scale`);
    }
    assert(e && FLAP.beats === 2);
    void S;
  }
});
