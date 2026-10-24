// The dragon's wings folded and flapped, after a bat (CREATURE-MEASURES.md, "Bat"): folded, the fingers lie
// back along the forearm, so the folded wing is about the forearm's length (the membrane gathered up with
// them), the wrist held up over the shoulder, the forearm in against the body, the tips back toward the hips,
// the whole wing laid over the back. A flap, on rising from sleep: the wings open and beat twice, up over the
// back and down below the shoulders, and settle back. Written by body role (body-roles.js) and solved on the
// wing joints from the standing frame the game holds (the wings at dragon-menace.js REST), baked per form into
// dragon-wing-poses.js by tools/bake-dragon-wings.mjs; dragon-menace.js blends them in.
//
// A pose is {joint: {x, y, z, s}}: radians added to the standing frame's rotation, and the wing's scale (the
// fold gathers the whole wing to its folded size, as the sleep does: dragon-rest.js wingFold).
import * as THREE from 'three';
import {solvePose} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {dragonPoser, wingFold, samples} from './dragon-rest.js';
import {standing} from './dragon-mantle.js';

// Sizes in the dragon's own units (multiplied by its scale):
// - over: how far over the back's top line the folded wrist and tip lie; close, wristIn: how far out from the
//   middle the folded tip and wrist may sit (in against the body); tipBack: how far behind the hips the
//   folded tip reaches (a baby's short wings stop babyTipBack short of them); fingersBack: with no hips (a
//   legless serpent), how far behind the wrist the folded tip lies;
// - beatUp, beatDown: how far over and under its root each tip goes at the top and bottom of a beat, and
//   beatOut: how far out each tip stays at both (the wing open, not folded), each as a share of the open wing's
//   length (root to tip), so a baby's short wings beat in proportion; beatFloor: the tip's least height.
export const WINGS = {over: .02, close: .22, wristIn: .2, tipBack: .02, babyTipBack: -.08, fingersBack: .12, beatUp: .4, beatDown: .3, beatOut: .6, beatFloor: .12};

const below = (p, y, w = 1) => () => [w * Math.max(0, p().y - y())];
const above = (p, y, w = 1) => () => [w * Math.max(0, y() - p().y)];

// Solves the fold and the two beat poses for a dragon actor. Returns {fold, up, down (poses from the standing
// frame), worst: {fold, up, down} (the worst goal residual each, metres), goals: {fold, up, down}, apply, points}.
export function wingPoses(a) {
  const {apply} = dragonPoser(a), P = rolesOf(a), S = a.g.scale.x, u = d => d * S, base = standing(a), baby = S < .9;
  const has = r => { try { P[r]; return true; } catch { return false; } };
  apply(base);
  const top = samples(a, {keep: v => v.y > .55, skinned: false, bodyOnly: true, every: 7});
  const backTop = () => Math.max(...top().map(p => p.y));
  // each open wing's length, root to tip, standing
  const span = Object.fromEntries(a.wings.map(w => [w.name, w.userData.inner.getWorldPosition(new THREE.Vector3()).distanceTo(P[`wingtip:${w.name[0]}`]())]));
  const joints = {};
  for (const w of a.wings) { const n = w.name; Object.assign(joints, {[`${n}.y`]: [base[n].y - 1.8, base[n].y + 1.8], [`${n}.x`]: [-.6, .6], [`${n}_inner.x`]: [-1.8, 1.8], [`${n}_inner.y`]: [-1.8, 1.8], [`${n}_inner.z`]: [-1.8, 1.8]}); }
  const worstOf = gs => Math.max(0, ...Object.values(gs).flatMap(g => [g(P)].flat(2).map(Math.abs)));
  const solve = (goals, start, scale) => {
    // (from a few starts, swept back either way, as the sleep's fold is)
    const tries = [];
    for (const sweep of [0, 1, -1]) {
      let pose = JSON.parse(JSON.stringify(start));
      for (const w of a.wings) { pose[w.name] = {...(pose[w.name] || {}), y: base[w.name].y + sweep * (w.userData.side || 1) * .9}; if (scale) pose[`${w.name}_inner`] = {...(pose[`${w.name}_inner`] || {}), s: scale(w)}; }
      pose = solvePose({joints, base: pose, goals: Object.values(goals), apply, points: P, iterations: 120, rest: .01}).pose;
      tries.push({pose, worst: worstOf(goals)});
      if (tries.at(-1).worst < .005) break;
    }
    const best = tries.reduce((p, q) => q.worst < p.worst ? q : p); apply(best.pose); return best;
  };
  // the fold: the bat's, laid over the back
  const fold = {};
  for (const w of a.wings) {
    const n = w.name, s = n[0], wrist = P[`wingwrist:${s}`], tip = P[`wingtip:${s}`], hip = has(`hip:${s}`) ? P[`hip:${s}`] : null;
    fold[n + 'Over'] = () => [wrist, tip].map(p => 2 * Math.max(0, backTop() + (baby ? -u(.01) : u(WINGS.over)) - p().y));
    fold[n + 'Wrist'] = above(wrist, () => P.withers().y);
    // (back to the hips; a legless serpent's, with no hips, back along its body behind the wrist)
    fold[n + 'Tip'] = hip ? () => [Math.max(0, tip().z - hip().z + u(baby ? WINGS.babyTipBack : WINGS.tipBack))] : () => [Math.max(0, tip().z - wrist().z + u(WINGS.fingersBack))];
    fold[n + 'Close'] = () => [Math.max(0, Math.abs(tip().x) - u(WINGS.close))];
    fold[n + 'WristIn'] = () => [Math.max(0, Math.abs(wrist().x) - u(WINGS.wristIn))];
  }
  // the beats: the wings open, the tips up over their roots, then down under them
  const beat = up => {
    const g = {};
    for (const w of a.wings) {
      const n = w.name, s = n[0], tip = P[`wingtip:${s}`], root = () => w.userData.inner.getWorldPosition(new THREE.Vector3()), L = span[n];
      g[n + 'Beat'] = up ? above(tip, () => root().y + WINGS.beatUp * L) : below(tip, () => root().y - WINGS.beatDown * L);
      g[n + 'Out'] = () => [Math.max(0, WINGS.beatOut * L - Math.abs(tip().x - root().x))];
      g[n + 'Floor'] = above(tip, () => u(WINGS.beatFloor));
    }
    return g;
  };
  const off = pose => { const out = JSON.parse(JSON.stringify(pose)); for (const w of a.wings) out[w.name].y -= base[w.name].y; return out; };
  const f = solve(fold, base, w => wingFold(w.userData.inner));
  apply(base); const up = solve(beat(true), base); 
  apply(base); const down = solve(beat(false), base);
  apply(base);
  return {fold: off(f.pose), up: off(up.pose), down: off(down.pose), worst: {fold: f.worst, up: up.worst, down: down.worst}, goals: {fold, up: beat(true), down: beat(false)}, apply, points: P};
}
