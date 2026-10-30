// Named joints for the four-legged hoofed and horned beasts (rothe, mumak, mastodon, titanothere, baluchitherium,
// leocrotta, wumpus), using the canines' names: `head` (the neck pivot `neck0` is the same group, or the
// baluchitherium's neck group that carries the head), `tail0` (the tail group: one joint, not yet a chain) and the
// legs `lleg0` / `rleg0` fore and `lleg1` / `rleg1` hind (left is -x, fore is +z). A leg that is one plain mesh
// (rothe, wumpus, baluchitherium) is skinned onto three bones `<leg>_0`..`_2`, hip, knee and fetlock, as the
// wild cats' legs are; a leg of several meshes (the elephants, the titanothere, the leocrotta) is not yet.
import {skinPlainLimb} from './trunk-skin.js';

export function nameQuadrupedJoints(actor){
 const {head,tail,legs}=actor,joints={head,neck0:actor.neck||head,tail0:tail};
 head.name='head';tail.name='tail';
 for(const leg of legs){
  const name=(leg.position.x<0?'l':'r')+'leg'+(leg.position.z>0?0:1);
  leg.name=name;joints[name]=leg;
  if(leg.children.filter(o=>o.isMesh).length===1){skinPlainLimb(leg,name+'_');leg.traverse(b=>{if(b.isBone)joints[b.name]=b;});}
 }
 actor.joints=joints;
 return actor;
}
