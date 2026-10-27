// Named joints for the imps (imp, homunculus, quasit, tengu, lemure): the humanoid names (`head`, `neck0`,
// `lfore` / `rfore`, `lleg1` / `rleg1`; left is -x) plus `tail0` where there is a tail and `lwing` / `rwing`
// where there are wings. Names only: the limbs are still one mesh per group.
import {nameHumanoidJoints} from './humanoid-joints.js';

export function nameImpJoints(actor){
 nameHumanoidJoints(actor);
 const {joints,tail,wings}=actor;
 if(tail){tail.name='tail0';joints.tail0=tail;}
 for(const w of wings){const name=(w.position.x<0?'l':'r')+'wing';w.name=name;joints[name]=w;}
 return actor;
}
