// Named joints for the four-legged hoofed and horned beasts (rothe, mumak, mastodon, titanothere, baluchitherium,
// leocrotta, wumpus), using the canines' names: `head` (the neck pivot `neck0` is the same group, or the
// baluchitherium's neck group that carries the head), `tail0` (the tail group: one joint, not yet a chain) and the
// legs `lleg0` / `rleg0` fore and `lleg1` / `rleg1` hind (left is -x, fore is +z). Names only, nothing moves.
export function nameQuadrupedJoints(actor){
 const {head,tail,legs}=actor,joints={head,neck0:actor.neck||head,tail0:tail};
 head.name='head';tail.name='tail';
 for(const leg of legs){
  const name=(leg.position.x<0?'l':'r')+'leg'+(leg.position.z>0?0:1);
  leg.name=name;joints[name]=leg;
 }
 actor.joints=joints;
 return actor;
}
