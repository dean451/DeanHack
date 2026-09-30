// Scorpion attacks. The generic poses (monster-attacks.js) rear a clawing monster up on its hind
// legs and throw a stinging monster's tail 1.5 rad forward, which for a scorpion's tail (already
// arched over its back) drives the stinger down through its own carapace. A scorpion keeps low
// and uses its pincers and tail instead:
//
//   claw:  both pincers lift and spread wide, then snap in and shut on the target. On a hit they
//          stay clamped a moment; a miss snaps a little further, onto nothing.
//   sting: the tail cocks back, then jabs forward and down over the head at the strike, while
//          the pincers rise and part in a threat.
//   other: the pincers rise a little.
//
// The pose is offsets from rest for the handles scorpion.js gives: `pincer` (the claws' spread
// about y, positive opens the right claw to the right and the left to the left), `pincerLift`
// (both claws about x, positive raises them) and `tail` (tail.rotation.x, positive swings the
// stinger forward). `pitch`, `roll`, `dy`, `fore` and `arm` replace the generic rear-up, and
// actions.js takes the generic rake twist back out. Every part is 0 at u = 0 and u = 1, and the
// strike lands at u ≈ .44 (actions.js STRIKE_U).

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// Smoothstepped value between keyframes [[u, ...values]], sorted by u, first at 0, last at 1.
function keys(list, u) {
  u = clamp01(u);
  let i = 1;
  while (i < list.length - 1 && list[i][0] < u) i++;
  const a = list[i - 1], b = list[i], t = smooth((u - a[0]) / (b[0] - a[0] || 1));
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * t);
}

// [u, spread, lift, tail, pitch]. A snap past rest (negative spread) closes the two pincers
// together in front of the face; the most it goes, −.28, still leaves them apart.
const POSES = {
  claw: {
    hit: [[0, 0, 0, 0, 0], [.26, .55, .35, -.08, -.08], [.42, -.22, .1, .05, .06], [.62, -.18, .08, .03, .04], [1, 0, 0, 0, 0]],
    miss: [[0, 0, 0, 0, 0], [.26, .55, .35, -.08, -.08], [.44, -.28, .06, .06, .08], [.6, -.1, .1, .02, .03], [1, 0, 0, 0, 0]],
  },
  sting: {
    hit: [[0, 0, 0, 0, 0], [.26, .2, .22, -.3, -.06], [.44, .25, .18, .62, .1], [.6, .22, .16, .5, .08], [1, 0, 0, 0, 0]],
    miss: [[0, 0, 0, 0, 0], [.26, .2, .22, -.3, -.06], [.46, .25, .18, .75, .12], [.62, .18, .14, .4, .06], [1, 0, 0, 0, 0]],
  },
  other: {
    hit: [[0, 0, 0, 0, 0], [.3, .15, .2, -.1, 0], [.5, .1, .16, .1, .03], [1, 0, 0, 0, 0]],
  },
};

export function scorpionAttackPose(attack, u, result = 'hit') {
  const set = POSES[attack] ?? POSES.other;
  const [pincer, pincerLift, tail, pitch] = keys(set[result === 'hit' ? 'hit' : 'miss'] ?? set.hit, Number.isFinite(u) ? u : 0);
  return {pincer, pincerLift, tail, pitch, roll: 0, dy: 0, fore: 0, arm: 0};
}
