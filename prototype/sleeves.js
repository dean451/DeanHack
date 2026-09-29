import * as THREE from 'three';

// Ghost and shade sleeves (ghost.js: quirk 'hover', handles `arms` and `head`). Standing, the
// two empty sleeves drift up and down out of step, as if groping slowly toward you, with a
// small inward sway and a lolling head. Drifting from cell to cell they trail back and down in
// the draught. A dying ghost lets them go limp.
//
// Called from gait.js's updateGait (so it runs every frame in Live, before the action layer adds
// its touch-attack deltas on top) and from the creature gallery in main.js. Every part is written
// absolutely from its stored rest pose, so it never drifts, and a zero weight gives the exact rest.

export const SLEEVES = {
  rate: .95,     // rad/s of the slow drift
  lag: 1.35,     // phase between the two sleeves
  pitch: .13,    // up/down drift (rad)
  sway: .06,     // inward/outward drift (rad)
  trail: .38,    // extra droop back while drifting between cells
  limp: .7,      // extra droop when dead
  head: .05,     // head loll (roll) and nod
  ease: 4,       // 1/s toward the walking and dead blends
};

const tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();

export const hasSleeves = actor => actor?.quirk === 'hover' && Array.isArray(actor.arms) && actor.arms.length === 2 && !actor.asset;

const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * Math.max(0, dt));

// Offsets at clock t, walking blend w and dead blend d (both 0..1), with a per-actor seed.
// Returns arm [pitch, roll] per sleeve (positive pitch lowers the reaching sleeve), and head.
export function sleevePose(t, w = 0, d = 0, seed = 0, S = SLEEVES) {
  const live = 1 - d, calm = 1 - .6 * w;
  const arms = [0, 1].map(i => {
    const a = t * S.rate + seed + i * S.lag, side = i ? 1 : -1;
    return [
      (S.pitch * Math.sin(a) * calm + S.trail * w) * live + S.limp * d,
      side * S.sway * Math.sin(a * .7 + .8) * calm * live,
    ];
  });
  const h = t * S.rate * .6 + seed;
  return {arms, head: [(S.head * .6 * Math.sin(h * 1.3) + .08 * w) * live + .25 * d, S.head * Math.sin(h) * live]};
}

function rest(st, part) {
  let q = st.rest.get(part);
  if (!q) st.rest.set(part, q = part.quaternion.clone());
  return q;
}
function turn(st, part, x, z) {
  if (!part) return;
  part.quaternion.copy(rest(st, part)).multiply(tmpQ.setFromEuler(tmpE.set(x, 0, z)));
}

// Poses a ghost's sleeves and head for this frame. Returns the pose, or null for anything else.
export function updateSleeves(actor, dt, walking) {
  if (!hasSleeves(actor)) return null;
  const st = actor.sleeves || (actor.sleeves = {t: 0, w: 0, d: 0, seed: (actor.g?.id ?? 0) * 2.39 % (Math.PI * 2), rest: new Map()});
  st.t += Math.max(0, dt);
  const dead = !!actor.actions?.dead;
  st.w = approach(st.w, walking && !dead ? 1 : 0, SLEEVES.ease, dt);
  st.d = approach(st.d, dead ? 1 : 0, SLEEVES.ease, dt);
  const p = sleevePose(st.t, st.w, st.d, st.seed);
  actor.arms.forEach((arm, i) => turn(st, arm, p.arms[i][0], p.arms[i][1]));
  turn(st, actor.head, p.head[0], p.head[1]);
  return p;
}
