// Named joints for the two-legged humanoids (hobbit, dwarves, bugbear, mind flayers), using the cat's and
// the dragon's names: `head` (the neck pivot `neck0` is the same group), the arms `lfore` / `rfore` and the
// legs `lleg1` / `rleg1` (a biped's legs are its hind legs; left is -x). Names only: no mesh moves.
export function nameHumanoidJoints(actor){
 const {head,arms,legs}=actor,joints={head,neck0:head};
 head.name='head';
 for(const [list,stem] of [[arms,'fore'],[legs,'leg1']])for(const o of list){
  const name=(o.position.x<0?'l':'r')+stem;o.name=name;joints[name]=o;
 }
 actor.joints=joints;
 return actor;
}
