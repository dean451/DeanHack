// Centaur weapon attacks. The generic weapon pose (monster-attacks.js) waves the arm forward and
// rolls the hand, which suits a sword but swings a centaur's upright spear out flat to its side.
// Each centaur weapon gets its own arm motion instead; the body lean and lunge stay generic.
//
//   spear: draw the arm back as the spear drops level, then thrust it forward at the target. On a
//          hit the barb sticks: it wrenches the spear back out with a jerk, one more tug, then lets go.
//   club:  raise it up over the head, then smash it down in front.
//   bow:   raise the bow in the left fist, draw with the right hand, loose, lower.
//
// The pose is offsets from rest, for the handles creatures.js gives a centaur: `arm` (the right
// shoulder, rotation.x), `grip` (the right hand, weaponSocket rotation.x), `off` (the left
// shoulder, arms[0] rotation.x) and `offGrip` (the left hand, offHand rotation.x). Every part
// is 0 at u = 0 and u = 1, and the strike lands at u ≈ .44 (actions.js STRIKE_U).

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

// Keyframes are [u, shoulder angle, weapon angle]: both about x, the weapon's measured in the
// arm's parent frame, so the hand's own turn is weapon − shoulder − the weapon's rest angle.
// Negative shoulder angles raise the arm forward; weapon angle π/2 points it straight ahead.
const SPEAR = {rest: 0, hit: [[0, 0, 0], [.22, .45, 1.42], [.44, -1.2, 1.62], [.58, -1.1, 1.6], [.7, -.75, 1.45], [.8, -.9, 1.55], [.9, -.35, .8], [1, 0, 0]],
  miss: [[0, 0, 0], [.22, .45, 1.42], [.44, -1.45, 1.66], [.62, -1.2, 1.64], [1, 0, 0]]};
// The club hangs forward and down from the fist at rest (creatures.js turns it 2.45).
const CLUB = {rest: 2.45, hit: [[0, 0, 2.45], [.3, -2.7, -.4], [.44, -.95, 2.1], [.58, -.8, 2.3], [1, 0, 2.45]],
  miss: [[0, 0, 2.45], [.3, -2.7, -.4], [.44, -.7, 2.4], [.62, -.55, 2.5], [1, 0, 2.45]]};
// Bow: [u, right shoulder] for the drawing hand and [u, left shoulder] for the bow arm. The left
// hand turns back against its shoulder so the bow stays nearly upright while it's raised.
const DRAW = [[0, 0], [.2, -1.25], [.38, -.55], [.46, -.5], [.5, -.15], [.7, -.3], [1, 0]];
const RAISE = [[0, 0], [.2, -1.4], [.62, -1.4], [1, 0]];
const BOW_CANT = .92;

export const CENTAUR_WEAPONS = ['spear', 'club', 'bow'];

export function centaurAttackPose(weapon, u, result = 'hit') {
  const p = {arm: 0, grip: 0, off: 0, offGrip: 0, socket: 0, wrist: 0};
  const held = weapon === 'spear' ? SPEAR : weapon === 'club' ? CLUB : null;
  if (held) {
    const [arm, angle] = keys(result === 'hit' ? held.hit : held.miss, u);
    p.arm = arm;
    p.grip = angle - held.rest - arm;
  } else if (weapon === 'bow') {
    [p.arm] = keys(DRAW, u);
    [p.off] = keys(RAISE, u);
    p.offGrip = -p.off * BOW_CANT;
  }
  return p;
}
