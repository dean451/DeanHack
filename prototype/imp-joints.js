// Named joints for the imps (imp, homunculus, quasit, tengu, lemure): the humanoid names (`head`, `neck0`,
// `lfore` / `rfore`, `lleg1` / `rleg1`; left is -x) plus `tail0` where there is a tail and `lwing` / `rwing`
// where there are wings. The imp's arms, legs and tail are skinned onto bones (`lfore_0`.., `lleg1_0`.., `tail0`..`tail4`
// under the `tail` pivot); the other members' limbs are still one mesh per group.
import {nameHumanoidJoints} from './humanoid-joints.js';

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
