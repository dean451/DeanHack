// Named joints for the six-legged family (ants, bees, beetles, locusts), the same names the cat and the
// dragon use where the part is the same: `head` and `neck0` are the group the head turns about (jaws
// and feelers ride on it), legs are `lleg0`..`lleg2` and `rleg0`..`rleg2` from front to hind (left is -x,
// as on the cat), `ljaw` / `rjaw` for the ants' mandibles, `tail0` for an ant's gaster, `lwing` / `rwing` for a bee. Every builder
// builds its legs right side first, front to back, then the left.
export function nameInsectJoints(actor){
 const {head,legs,wings,jaws,tail0}=actor,joints={head,neck0:head};
 head.name='head';
 legs.forEach((leg,i)=>{const name=(i<3?'r':'l')+'leg'+i%3;leg.name=name;joints[name]=leg;});
 if(jaws)jaws.forEach(jaw=>{const name=(jaw.userData.side>0?'r':'l')+'jaw';jaw.name=name;joints[name]=jaw;});
 wings.forEach(w=>{const name=(w.userData.side<0?'l':'r')+'wing';w.name=name;joints[name]=w;});
 if(tail0){tail0.name='tail0';joints.tail0=tail0;}
 actor.joints=joints;
 return actor;
}
