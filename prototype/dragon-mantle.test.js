import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createActionQueue} from './actions.js';
import {updateDragonMenace, mantleFor, menaces, mantleLength, OPEN_S, HOLD_S, REST, SPREAD} from './dragon-menace.js';
import {mantlePose, standing, MANTLE, STAND_WING} from './dragon-mantle.js';
import {MANTLE_POSES} from './dragon-mantle-poses.js';
import {rolesOf} from './body-roles.js';

const D = 68, FPS = 60;
// each dragon in its own glyph colour, as the game sends it and as the mantles were baked
const NAMES = JSON.parse(readFileSync(new URL('./tools/creature-names.json', import.meta.url))).filter(m => m.letter === 'D');
const COLORS = Object.fromEntries(NAMES.map(m => [m.name.toLowerCase(), m.color]));
const dragon = name => { const a = createCreature({name, symbol: D, color: COLORS[name]}); a.actions = createActionQueue(); a.species = name; return a; };
const step = (a, n, t0) => { for (let i = 0; i < n; i++) updateDragonMenace(a, 1 / FPS, t0 + i / FPS, false, false, null); };
// stands a dragon still, then holds a mantle at its peak (the next mantle or lash pushed far off)
function mantled(a) {
  step(a, 30, 0); a.menace.cur = null; a.menace.wait = 1e9;
  const rest = Object.fromEntries(Object.entries(a.joints).map(([n, o]) => [n, o.rotation.clone()]));
  a.menace.cur = {kind: 'mantle', s: 0, side: 1}; a.menace.f = 1;
  step(a, Math.round((OPEN_S + HOLD_S / 2) * FPS), 1);
  return rest;
}

test('the menace\'s standing wing angle is the one the mantle was solved from', () => {
  assert.equal(STAND_WING, REST);
});

test('every dragon form has a baked mantle that meets all its goals', () => {
  for (const {name: n} of NAMES) {
    const name = n.toLowerCase(), a = dragon(name);
    if (!menaces(a)) continue;
    assert(MANTLE_POSES[name], `${name} is baked (node tools/bake-dragon-mantle.mjs)`);
    assert(MANTLE_POSES[name].ok && MANTLE_POSES[name].worst < .02, `${name}: worst goal ${MANTLE_POSES[name].worst} m`);
    assert(mantleFor(a), name);
  }
});

test('the baked draken and tiamat still match a fresh solve (re-bake after changing a dragon\'s body or the mantle goals)', () => {
  for (const name of ['draken', 'tiamat']) {
    const fresh = mantlePose(createCreature({name, symbol: D, color: COLORS[name]})).pose, baked = MANTLE_POSES[name].pose;
    for (const [n, o] of Object.entries(fresh)) for (const [ax, v] of Object.entries(o)) assert(Math.abs(v - (baked[n]?.[ax] ?? 0)) < 2e-3, `${name} ${n}.${ax}: baked ${baked[n]?.[ax]}, fresh ${v}`);
  }
});

test('mantling in play, a raptor over its kill: the wings out and drooped forward round the forepaws, the head low over the kill, the tail lifted', () => {
  for (const name of ['draken', 'wyvern', 'tiamat', 'baby draken', 'leviathan']) {
    const a = dragon(name), P = rolesOf(a), S = a.g.scale.x, u = d => d * S, pose = mantleFor(a);
    a.g.updateMatrixWorld(true);
    const stand = {mouth: P.mouth(), tail: P.tailtip(), tips: Object.fromEntries(a.wings.map(w => [w.name, P[`wingtip:${w.name[0]}`]()]))};
    const rest = mantled(a); a.g.updateMatrixWorld(true);
    assert(a.menace.cur?.kind === 'mantle', name);
    // the neck, the head's pitch and the tail are exactly the baked mantle on their standing angles (nothing else writes them)
    for (const [n, o] of Object.entries(pose)) if (/^(neck|tail)/.test(n)) for (const ax of ['x', 'y', 'z']) assert(Math.abs(a.joints[n].rotation[ax] - (rest[n][ax] + (o[ax] || 0))) < 1e-9, `${name} ${n}.${ax}`);
    assert(Math.abs(a.joints.head.rotation.x - (rest.head.x + (pose.head?.x || 0))) < 1e-9, `${name} head.x`);
    // the head low: within its band of the kill's height (a serpent's dropped from its reared front)
    assert(P.mouth().y < stand.mouth.y - u(.15), `${name} the head drops: ${P.mouth().y.toFixed(2)} from ${stand.mouth.y.toFixed(2)}`);
    if (!a.joints.spine0) assert(Math.abs(P.mouth().y - u(MANTLE.mouthOver)) < u(.06), `${name} mouth ${P.mouth().y.toFixed(3)} over the kill`);
    assert(P.tailtip().y > stand.tail.y + u(MANTLE.tailLift) - u(.03), `${name} the tail lifts`);
    const front = a.legs.some(l => /fore/.test(l.name)) ? Math.max(P['paw:lf']().z, P['paw:rf']().z) : P.withers().z + u(.25);
    // (the membranes shudder through the hold, up to about 4 cm at the tip, on top of the solved pose)
    const shake = u(.05);
    for (const w of a.wings) {
      const tip = P[`wingtip:${w.name[0]}`](), root = w.userData.inner.getWorldPosition(new THREE.Vector3()), baby = S < .9;
      assert(tip.y < root.y - u(MANTLE.tipDrop) + shake, `${name} ${w.name} tip hangs below its root: ${(tip.y - root.y).toFixed(3)}`);
      assert(tip.y > u(MANTLE.tipFloor) - shake, `${name} ${w.name} tip off the floor`);
      assert(tip.z > front + u(baby ? MANTLE.babyTip : MANTLE.tipAhead) - shake, `${name} ${w.name} tip forward over the forepaws`);
      assert(Math.abs(tip.x) > Math.abs(stand.tips[w.name].x), `${name} ${w.name} spread no narrower than standing`);
    }
  }
});

test('the mantle ends with every joint exactly back at its standing angle', () => {
  for (const name of ['draken', 'tiamat', 'leviathan']) {
    const a = dragon(name), rest = mantled(a);
    step(a, Math.round(mantleLength() * FPS), 3);
    assert.equal(a.menace.cur, null, name);
    step(a, 2, 8);
    for (const [n, o] of Object.entries(a.joints)) if (!/wing|^head/.test(n)) for (const ax of ['x', 'y', 'z']) assert.equal(o.rotation[ax], rest[n][ax], `${name} ${n}.${ax}`);
  }
});

test('a dragon with no baked mantle keeps the hand-set one', () => {
  const a = dragon('draken'); a.species = 'nameless wyrm';
  assert.equal(mantleFor(a), null);
  const before = standing(a); mantled(a);
  for (const w of a.wings) assert(Math.abs(w.rotation.y - (w.userData.side || 1) * (REST - SPREAD)) < 1e-9 && before[w.name], 'the wings open by SPREAD');
});
