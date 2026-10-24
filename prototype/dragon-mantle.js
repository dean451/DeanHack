// The dragon's mantle, after a bird of prey over its kill (CREATURE-MEASURES.md, "Bird of prey"): the wings
// spread out and drooped forward over the forepaws like a cape (the wrists held up at the shoulders, the tips
// down near the floor and ahead of the paws, the span no smaller than standing), the head dropped low over
// the prey between the forepaws, the tail lifted. Written by body role (body-roles.js) and solved on the
// dragon's own joints like the sleep (dragon-rest.js), from the standing frame the game holds (the wings at
// dragon-menace.js REST). Baked per form into dragon-mantle-poses.js by tools/bake-dragon-mantle.mjs;
// dragon-menace.js blends the baked pose in by the mantle's weight.
//
// A pose is {joint: {x, y, z}}: radians added to the standing frame's rotation (for the wing pivots that is
// side * REST, for every other joint its built rotation).
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {dragonPoser} from './dragon-rest.js';

// The wings' standing pivot angle in play (dragon-menace.js REST, kept here so this file has no dependency on
// the menace, which imports the baked poses).
export const STAND_WING = -.18;

// Sizes in the dragon's own units (multiplied by its scale):
// - tipDrop: how far each wing tip hangs below its root; tipFloor: the tips' least height (they droop to
//   the floor, not into it); tipAhead: how far the tips reach ahead of the forepaws (of the chest, for a
//   wyvern); tipOut: how far outside the forepaws they hang (the cape falls round the legs, not through them);
//   spread: how much wider than standing each tip spreads (wider than its breathing sway, so the span never
//   shrinks); babyTip: a baby's short wings reach only this far past the forepaws (behind them), and hang just outside them;
// - wristUp: how far below the withers the wrists may sit (hunched shoulders keep them high);
// - mouthOver: the mouth's height over the floor, low over the kill; mouthAhead: how far ahead of the
//   forepaws (of the chest) it hangs; faceDown: the face's slope (degrees, down from level, within 15);
//   neckRise: how far over the withers the neck may rise; serpentDip: how far a serpent's head drops from its reared front; headApart: the least gap between a many-headed dragon's mouths;
// - tailLift: how far the tail tip rises over where it stands.
export const MANTLE = {tipDrop: .1, tipFloor: .06, tipAhead: .06, tipOut: .05, wristUp: .06, mouthOver: .2, mouthAhead: .1, headApart: .15, tailLift: .2, serpentDip: .25, babyTip: -.08, spread: .025, faceDown: -40, neckRise: .1};

// The standing frame in play: the wings at their resting angle (the pose every mantle starts from).
export function standing(a) { const p = {}; for (const w of a.wings) p[w.name] = {y: (w.userData.side || 1) * STAND_WING}; return p; }

const at = o => () => o.getWorldPosition(new THREE.Vector3());
const chain = (j, p) => { const out = []; for (let i = 0; j[p + i]; i++) out.push(j[p + i]); return out; };
const mouthOf = head => () => head.localToWorld(new THREE.Vector3(0, -.066, .225));

// Solves the mantle for a dragon actor. Returns {pose (from the standing frame), worst (the worst goal residual,
// metres), goals (by name), apply, points, rest: role points standing}.
export function mantlePose(a) {
  const {apply} = dragonPoser(a), P = rolesOf(a), j = a.joints, S = a.g.scale.x, u = d => d * S;
  const has = r => { try { P[r]; return true; } catch { return false; } };
  const base = standing(a);
  apply(base);
  const neck = chain(j, 'neck'), tail = chain(j, 'tail'), serpent = !!j.spine0, baby = a.g.scale.x < .9;
  const extra = []; for (let k = 1; j['head_' + k]; k++) extra.push({head: j['head_' + k], neck: chain(j, `neck_${k + 1}_`)});
  const fore = a.legs.map(l => l.name).filter(n => /fore/.test(n));
  // where things stand, before the mantle moves them
  const still = {tail: has('tailtip') && tail.length ? P.tailtip().y : null, tips: {}, paws: fore.map(l => P[`paw:${l[0]}f`]())};
  for (const w of a.wings) { const s = w.userData.side < 0 ? 'l' : 'r'; still.tips[s] = P[`wingtip:${s}`](); }
  // the front the wings and head reach toward: the forepaws, or a wyvern's (or serpent's) chest
  const front = () => fore.length ? Math.max(...fore.map(l => P[`paw:${l[0]}f`]().z)) : P.withers().z + u(.25);
  const pawX = fore.length ? Math.max(...still.paws.map(p => Math.abs(p.x))) : 0;

  const joints = {}, goals = {};
  // the wings: out and down, forward over the forepaws, the wrists held high
  for (const w of a.wings) {
    const n = w.name, s = w.userData.side < 0 ? 'l' : 'r', root = at(w.userData.inner), tip = P[`wingtip:${s}`], wrist = P[`wingwrist:${s}`];
    Object.assign(joints, {[`${n}.y`]: [base[n].y - 1.8, base[n].y + 1.8], [`${n}.x`]: [-.8, .8], [`${n}_inner.x`]: [-1.8, 1.8], [`${n}_inner.y`]: [-1.8, 1.8], [`${n}_inner.z`]: [-1.8, 1.8]});
    goals[n + 'Down'] = () => [Math.max(0, tip().y - (root().y - u(MANTLE.tipDrop)))];
    goals[n + 'Floor'] = () => [Math.max(0, u(MANTLE.tipFloor) - tip().y), Math.max(0, u(MANTLE.tipFloor) - wrist().y)];
    goals[n + 'Ahead'] = () => [Math.max(0, front() + u(baby ? MANTLE.babyTip : MANTLE.tipAhead) - tip().z)];
    goals[n + 'Span'] = () => [Math.max(0, Math.max(Math.abs(still.tips[s].x) + u(MANTLE.spread), pawX + u(baby ? 0 : MANTLE.tipOut)) - Math.abs(tip().x))];
    goals[n + 'Wrist'] = () => [Math.max(0, P.withers().y - u(MANTLE.wristUp) - wrist().y), Math.max(0, Math.abs(root().x) + u(.05) - Math.abs(wrist().x))];
  }
  // the heads: dropped low over the kill between the forepaws
  const necks = [{head: j.head, neck}, ...extra];
  necks.forEach(({head, neck: nk}, k) => {
    for (const b of nk) { joints[`${b.name}.x`] = [-1.2, 1.2]; joints[`${b.name}.y`] = [-.5, .5]; }
    joints[`${head.name}.x`] = [-.9, .9];
    const spread = necks.length > 1 ? (k === 0 ? 0 : (k % 2 ? -1 : 1) * Math.ceil(k / 2)) * u(MANTLE.headApart) : 0;
    // (low and ahead of the paws: a long neck reaches further out over the kill than a short one, so the
    // height is held and the reach forward is a floor, not a mark)
    // (a serpent's head stands on its reared front: it drops by serpentDip from there, not to the floor)
    const low = serpent ? Math.max(u(MANTLE.mouthOver), mouthOf(head)().y - u(MANTLE.serpentDip)) : u(MANTLE.mouthOver);
    goals['mouth' + k] = () => { const m = mouthOf(head)(), y = low; return [2 * Math.max(0, Math.abs(m.y - y) - u(.03)), 2 * Math.max(0, front() + u(MANTLE.mouthAhead) - m.z), Math.max(0, Math.abs(m.x - spread) - u(.04))]; };
    // (the face angled down and forward over the kill, not hanging straight down; the neck hunched low from the
    // shoulders, not arched up over the head and hooked down)
    goals['face' + k] = () => { const h = head.getWorldPosition(new THREE.Vector3()), m = mouthOf(head)(), d = Math.atan2(m.y - h.y, Math.hypot(m.x - h.x, m.z - h.z)) * 180 / Math.PI; return [Math.max(0, Math.abs(d - MANTLE.faceDown) - 15) / 30]; };
    goals['neckLow' + k] = () => nk.map(b => Math.max(0, b.getWorldPosition(new THREE.Vector3()).y - P.withers().y - u(MANTLE.neckRise)));
    goals['neckUp' + k] = () => nk.map(b => Math.max(0, u(.08) - b.getWorldPosition(new THREE.Vector3()).y));
  });
  if (extra.length) goals.apart = () => { const m = necks.map(({head}) => mouthOf(head)()), out = []; for (let p = 0; p < m.length; p++) for (let q = p + 1; q < m.length; q++) out.push(Math.max(0, u(MANTLE.headApart) - m[p].distanceTo(m[q]))); return out; };
  // the tail: lifted, the tip well over where it stands (a serpent lifts its tail; its spine stays put)
  if (still.tail !== null) {
    for (const b of tail.slice(0, -1)) joints[`${b.name}.x`] = [-.6, .6];
    goals.tail = () => [Math.max(0, still.tail + u(MANTLE.tailLift) - P.tailtip().y)];
  }
  // (the wings first on their own, then everything together, so the head and tail can't pull the cape off)
  let pose = base;
  const run = (js, gs, iterations) => { const r = solvePose({joints: js, base: pose, goals: Object.values(gs), apply, points: P, iterations, rest: .01}); pose = r.pose; };
  const wingKeys = Object.fromEntries(Object.entries(joints).filter(([k]) => /wing/.test(k))), wingGoals = Object.fromEntries(Object.entries(goals).filter(([k]) => /wing/.test(k)));
  const headKeys = Object.fromEntries(Object.entries(joints).filter(([k]) => /neck|head/.test(k))), headGoals = Object.fromEntries(Object.entries(goals).filter(([k]) => /mouth|neck|face|apart/.test(k)));
  const worstOf = gs => Math.max(0, ...Object.values(gs).flatMap(g => [g(P)].flat(2).map(Math.abs)));
  if (a.wings.length) run(wingKeys, wingGoals, 120);
  // (a long neck can settle curled back on itself; try it from a few starts, each neck joint bent down, up or straight)
  const start = pose, tries = [];
  // (and the heads either solved first on their own or with everything at once: each finds what the other misses)
  seeds: for (const bend of [0, .2, -.2, .4]) for (const headFirst of [true, false]) {
    pose = JSON.parse(JSON.stringify(start));
    for (const {neck: nk} of necks) for (const b of nk) pose[b.name] = {...(pose[b.name] || {}), x: bend};
    if (headFirst) run(headKeys, headGoals, 200);
    run(joints, goals, 200);
    tries.push({pose, worst: worstOf(goals)});
    if (tries.at(-1).worst < .01) break seeds;
  }
  pose = tries.reduce((p, q) => q.worst < p.worst ? q : p).pose;
  apply(pose);
  const worst = worstOf(goals);
  // the pose from the standing frame (the wing pivots' standing angle taken off)
  const out = JSON.parse(JSON.stringify(pose));
  for (const w of a.wings) { out[w.name].y -= base[w.name].y; }
  return {pose: out, worst, goals, apply, points: P, still};
}
