// The heavy quadrupeds' threat (rothe, mumak, mastodon, titanothere, baluchitherium, leocrotta, wumpus): standing
// as built, the neck throws the head up and forward, the bull's and elephant's raised head, so the horns, tusks or
// trunk rear over the hero. One big silhouette change, as the ants' alarm (insect-gaster.js). Written by body role,
// solved on the joints `nameQuadrupedJoints` gives them; the four feet stay planted. No source gave the angle
// (CREATURE-MEASURES.md, Heavy quadrupeds), so the throw is set by eye: the neck's whole bound. A pose is
// {joint: {x, y, z}} (radians, added to the joint's built rotation).
import {solvePose, goal} from './feline-pose.js';
import {rolesOf} from './body-roles.js';
import {birdPoser} from './cockatrice-rest.js';
import {rests} from './quadruped-rest.js';

// The neck pitches as far as its bound allows, up (the head flung high) or down (the mouth pulled to the floor),
// whichever moves the mouth further with the head still pointing ahead: the mouth no further back than the withers.
// The mouth must change height by at least this share of its standing height (every member throws it up, 0.25 to 1.9).
// rothe is left out: its head hangs low already, on a neck that is all pivot (it moves 2 cm), so no silhouette change.
export const CHARGE = {change: .15, forward: 0, bound: 1.2};

const PAWS = ['paw:lf', 'paw:rf', 'paw:lh', 'paw:rh'];


export const charges = rests;

// Solves the pose (the built pose is left as it was found).
export function chargePose(a) {
  const P = rolesOf(a), floor = a.g.position.y, high = P['shoulder:l']().y - floor, stand = P.mouth().y - floor, {apply} = birdPoser(a);
  let out = null;
  for (const sign of [1, -1]) {
    const joints = {'neck0.x': sign > 0 ? [0, CHARGE.bound] : [-CHARGE.bound, 0]};
    const goals = PAWS.map(p => goal.floor(p, {y: floor + (P[p]().y - floor), weight: 2}));
    goals.push(() => [Math.max(0, P.withers().z + CHARGE.forward * high - P.mouth().z)]);
    const hard = goals.length;
    goals.push(sign > 0 ? goal.below('mouth', floor, {weight: .4}) : goal.above('mouth', floor + 3 * stand, {weight: .4}));
    const t = solvePose({joints, base: {neck0: {x: .4 * sign}}, goals, apply, points: P, iterations: 200, rest: .01});
    apply(t.pose);
    const moved = Math.abs(P.mouth().y - floor - stand), ok = Math.max(...t.residuals.slice(0, hard).flat().map(Math.abs)) < .01;
    apply({});
    if (ok && (!out || moved > out.moved)) out = {...t, moved, goals, hard};
  }
  return {pose: out.pose, residuals: out.residuals.slice(0, out.hard), goals: out.goals, high, stand, moved: out.moved};
}
