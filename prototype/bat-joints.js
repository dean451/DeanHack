// Named joints for the bats and the raven (family B, stage 1 step 1), using the dragon's and the cat's names:
// `lwing` / `rwing` (the wing pivots the flap swings; left is -x), and on the raven `head` (`neck0` is the same
// group), `tail0` (the tail group, one joint) and `lleg1` / `rleg1` (a bird's legs are its hind legs). The bat's skull, ears and
// eyes ride a `head` group (also `neck0`) at the lift's origin. Names only: no mesh moves.
export function nameBatJoints(actor){
 const joints={};
 for(const w of actor.wings){const n=(w.userData.side<0?'l':'r')+'wing';w.name=n;joints[n]=w;}
 if(actor.head){actor.head.name='head';joints.head=actor.head;joints.neck0=actor.head;}
 if(actor.tail){actor.tail.name='tail0';joints.tail0=actor.tail;}
 for(const l of actor.legs||[]){const n=(l.position.x<0?'l':'r')+'leg1';l.name=n;joints[n]=l;}
 actor.joints=joints;
 return actor;
}
