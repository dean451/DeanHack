// Named joints for the two-legged humanoids (hobbit, dwarves, bugbear, mind flayers), using the cat's and
// the dragon's names: `head` (the neck pivot `neck0` is the same group), the arms `lfore` / `rfore` and the
// legs `lleg1` / `rleg1` (a biped's legs are its hind legs; left is -x). The hobbit's arms and legs are skinned onto bones.
import * as THREE from 'three';
import {skinChain,rigChain} from './chain-skin.js';
import {rigBody,skinPlainLimb} from './trunk-skin.js';

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

// The rest of stage 1 for the two-legged humanoids: limbs still one plain mesh (the bugbear's and the mind
// flayer's) skinned onto three bones, a weapon socket that rode the arm group moved onto the wrist bone `rfore_2`
// (so a bent elbow carries the weapon), the joints named, then the trunk and neck on bones and the skin in one
// hide (trunk-skin.js rigBody: `hips`, `spine0`, `spine1`, `neck0`..`neck3`, the head on `neck3`, the arms on the
// chest). `S`: the creature's shared geometry, where the skinned copies are cached.
export function rigHumanoidLimbs(actor){
 for(const [list,stem] of [[actor.legs,'leg1_'],[actor.arms,'fore_']])for(const o of list)skinPlainLimb(o,(o.position.x<0?'l':'r')+stem);
 const socket=actor.weaponSocket,wrist=actor.arm?.getObjectByName('rfore_2');
 if(socket&&wrist&&socket.parent===actor.arm){
  // (the wrist's place in the arm, down its chain of bones)
  let at=new THREE.Vector3();for(let b=wrist;b&&b!==actor.arm;b=b.parent)at.add(b.position);
  socket.position.sub(at);wrist.add(socket);
 }
 return actor;
}
export function rigHumanoid(actor,S){
 return rigBody(nameHumanoidJoints(rigHumanoidLimbs(actor)),S);
}
