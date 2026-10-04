import {DOOR_LEAF} from './door.js';

// Doors swing on their pintles. The bridge sends closed doors as terrain 'door' and open
// ones as 'floor' with `door:'open'`; `tileKind` folds both into one 'door' tile so the
// model survives the change and the leaf can swing between them instead of vanishing.
// Each door's leaf follows a lightly underdamped spring towards its target angle: opening
// it sweeps out to DOOR_LEAF.open and settles with a small sway. Closing is less damped,
// so the leaf swings shut at speed, hits the jamb and rebounds a little, like a slam. A
// door seen for the first time is posed straight away, so walking into a room doesn't
// swing every door in it. The leaf only opens towards the door group's +z, so a door that
// starts opening from shut (or is first seen open) turns half round first if the hero is
// on that side: doors swing away from the hero instead of through them. The door is
// symmetric apart from its front ironwork, which changes face while the door is shut.
// A door forced open from shut catches once on its rusted pintles a third of the way out: the
// leaf lurches almost to a stop, then the spring wrenches it free and it carries on.
export const SWING={k:60,c:11,slam:5,rebound:.3,settle:.002,maxStep:1/30,stickAt:.33,stickKeep:.1};
// Opening overshoots by a few percent; stop it short of the jamb's front face (-π/2).
const LIMIT=Math.max(DOOR_LEAF.open-.05,-Math.PI/2+.01);
const moving=new Set();

// The tile type a map cell builds: open doors keep their door tile. A broken door (a
// doorway flagged `door:'broken'`) gets its own tile, so smashing a door swaps the model
// for the wreck, and the wreck is dropped again if the doorway is ever repaired.
export function tileKind(cell){return cell.door==='open'?'door':cell.door==='broken'?'broken-door':cell.terrain;}

// Turn a door group to follow its wall (yaw 0 runs along x), keeping any half turn.
export function orientDoor(door,yaw){door.userData.yaw=yaw;door.rotation.y=yaw+(door.userData.flip?Math.PI:0);}

// Half-turn a door so its leaf opens away from `hero`, the hero's offset {dx,dz} from the
// door's cell. Someone on the door's line (or no hero) leaves it as it is.
export function faceAway(door,hero){
 if(!hero)return;
 const a=door.rotation.y,d=hero.dx*Math.sin(a)+hero.dz*Math.cos(a);
 if(!(Math.abs(d)>1e-6)||d<0)return;
 door.userData.flip=!door.userData.flip;door.rotation.y=(door.userData.yaw??0)+(door.userData.flip?Math.PI:0);
}

// Point a door group's leaf at open or shut. The first call poses it at once.
export function setDoorOpen(door,open,hero){
 const leaf=door?.userData?.leaf;if(!leaf)return;
 const target=open?DOOR_LEAF.open:0,s=door.userData.swing;
 if(!s){if(open)faceAway(door,hero);door.userData.swing={angle:target,vel:0,target};leaf.rotation.y=target;return;}
 if(s.target===target)return;
 if(open&&s.angle===0&&s.vel===0){faceAway(door,hero);s.stick=true;}
 if(!open)s.stick=false;s.target=target;moving.add(door);
}

// Step one door's swing; returns true while it is still moving.
export function stepDoor(door,dt){
 const s=door.userData.swing,leaf=door.userData.leaf;if(!s||!leaf)return false;
 let left=Math.max(0,dt);
 while(left>0){
  const h=Math.min(left,SWING.maxStep);left-=h;
  const c=s.target===0?SWING.slam:SWING.c;
  s.vel+=(SWING.k*(s.target-s.angle)-c*s.vel)*h;s.angle+=s.vel*h;
  if(s.angle>0){s.angle=0;s.vel=-s.vel*SWING.rebound;}
  if(s.angle<LIMIT){s.angle=LIMIT;s.vel=0;}
  if(s.stick&&s.target<0&&s.angle<DOOR_LEAF.open*SWING.stickAt){s.stick=false;s.vel*=SWING.stickKeep;}
 }
 const done=Math.abs(s.target-s.angle)<SWING.settle&&Math.abs(s.vel)<SWING.settle*10;
 if(done){s.angle=s.target;s.vel=0;}
 leaf.rotation.y=s.angle;
 return !done;
}

// Step every swinging door; settled or discarded doors drop out.
export function updateDoorSwings(dt){for(const d of moving)if(!stepDoor(d,dt))moving.delete(d);}
export function clearDoorSwings(){moving.clear();}
export function swingingDoors(){return moving.size;}
