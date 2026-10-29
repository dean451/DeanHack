// Named joints for the imps (imp, homunculus, quasit, tengu, lemure): the humanoid names (`head`, `neck0`,
// `lfore` / `rfore`, `lleg1` / `rleg1`; left is -x) plus `tail0` where there is a tail and `lwing` / `rwing`
// where there are wings. Every member's arms, legs and tail are skinned onto bones (`lfore_0`.., `lleg1_0`..,
// `tail0`..`tail4` under the `tail` pivot), and its trunk and neck too (`rigImp`, below).
import {nameHumanoidJoints} from './humanoid-joints.js';
import {rigBody,skinPlainLimb} from './trunk-skin.js';

export function nameImpJoints(actor){
 nameHumanoidJoints(actor);
 const {joints,tail,wings}=actor;
 if(tail){
  const skinned=tail.children.some(o=>o.isSkinnedMesh);
  if(skinned){tail.name='tail';tail.traverse(b=>{if(b.isBone)joints[b.name]=b;});}
  else{tail.name='tail0';joints.tail0=tail;}
 }
 for(const w of wings){const name=(w.position.x<0?'l':'r')+'wing';w.name=name;joints[name]=w;}
 return actor;
}

// The rest of stage 1 for the whole family: limbs still one plain mesh (the tengu's and the lemure's) skinned onto
// three bones; then the trunk and neck on bones (trunk-skin.js): a pelvis root `hips`, `spine0` at the waist,
// `spine1` at the chest, `neck0`..`neck3` from the top of the trunk to the head's pivot. The head hangs on `neck3`
// (so `neck0` is a bone, no longer the head group) and the arms and wings on the chest, so a hunch carries them;
// the legs and the tail stay on the pelvis. The vertebrae are placed from where the creature's own hips,
// shoulders and head sit. Then the trunk, limbs and tail are merged into one skinned hide (`mergeSkins`), one draw
// where each skinned part used to draw itself (a uranium imp's glow is skinned the same way, on the same bones). `S`: the creature's shared geometry (the skinned copies are
// cached on it).
export function rigImp(actor, S) {
  for (const [list, stem] of [[actor.legs, 'leg1_'], [actor.arms, 'fore_']]) for (const o of list) skinPlainLimb(o, (o.position.x < 0 ? 'l' : 'r') + stem);
  return rigBody(nameImpJoints(actor), S);
}
