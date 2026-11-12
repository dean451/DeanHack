// Named joints for the giants (family H in the creature plan, stage 1 step 1: names only, no mesh moved): the
// giant, stone, hill, fire, frost and storm giants, the ettin, the titan, the Cyclops, Lord Surtur and any other
// `H` built by `giant()` in creatures.js. The cat's and the dragon's names, as the humanoids use them: `head` (the
// neck pivot `neck0` is the same group), the arms `lfore` / `rfore` and the legs `lleg1` / `rleg1` (a biped's legs
// are its hind legs; left is -x). The ettin's second head is `head_1`, as a three-headed hound's side heads are
// `head_0` and `head_1`. Only `actor.joints` is set: the actor gains no `arms`, so no arm motion turns on.
import {nameHumanoidJoints} from './humanoid-joints.js';

export function nameGiantJoints(actor, {heads, arms}) {
  const {joints} = nameHumanoidJoints({head: actor.head, arms, legs: actor.legs});
  heads.filter(h => h !== actor.head).forEach((h, i) => { h.name = 'head_' + (i + 1); joints[h.name] = h; });
  actor.joints = joints;
  return actor;
}
