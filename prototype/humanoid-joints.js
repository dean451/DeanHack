// Named joints for the two-legged humanoids (hobbit, dwarves, bugbear, mind flayers), using the cat's and
// the dragon's names: `head` (the neck pivot `neck0` is the same group), the arms `lfore` / `rfore` and the
// legs `lleg1` / `rleg1` (a biped's legs are its hind legs; left is -x). The hobbit's arms and legs are skinned onto bones.
import {skinChain,rigChain} from './chain-skin.js';

// A limb as one SkinnedMesh on three bones (shoulder or hip, elbow or knee, wrist or ankle) under its joint
// group, named `<joint>_0`..`_2` like the wild cats' legs; `skinLimb` writes the weights into the geometry
// once (shared by every member), `rigLimb` hangs the mesh and its bones on the group.
export const skinLimb=(geo,pts)=>skinChain(geo,pts);
export function rigLimb(group,geo,material,name,part){
 const {bones}=rigChain(group,geo,material,name,{part});
 return bones;
}

export function nameHumanoidJoints(actor){
 const {head,arms,legs}=actor,joints={head,neck0:head};
 head.name='head';
 for(const [list,stem] of [[arms,'fore'],[legs,'leg1']])for(const o of list){
  const name=(o.position.x<0?'l':'r')+stem;o.name=name;joints[name]=o;
 }
 for(const o of [...arms,...legs])o.traverse(b=>{if(b.isBone)joints[b.name]=b;});
 actor.joints=joints;
 return actor;
}
