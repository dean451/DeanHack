import test from 'node:test';
import assert from 'node:assert/strict';
import {createDoor,DOOR_LEAF} from './door.js';
import {tileKind,setDoorOpen,stepDoor,updateDoorSwings,clearDoorSwings,swingingDoors} from './door-swing.js';

const run=(door,secs,fn)=>{const dt=1/60;let prev=door.userData.leaf.rotation.y;for(let i=0;i<secs*60;i++){stepDoor(door,dt);const a=door.userData.leaf.rotation.y;fn?.(a,prev);prev=a;}};

test('open doors keep their door tile; other terrain is unchanged',()=>{
 assert.equal(tileKind({terrain:'door'}),'door');
 assert.equal(tileKind({terrain:'floor',door:'open'}),'door');
 assert.equal(tileKind({terrain:'floor'}),'floor');
 assert.equal(tileKind({terrain:'wall'}),'wall');
});

test('a door seen for the first time is posed at once, without swinging',()=>{
 clearDoorSwings();
 const shut=createDoor(1),open=createDoor(2);
 setDoorOpen(shut,false);setDoorOpen(open,true);
 assert.equal(shut.userData.leaf.rotation.y,0);
 assert.equal(open.userData.leaf.rotation.y,DOOR_LEAF.open);
 assert.equal(swingingDoors(),0);
 setDoorOpen(open,true);assert.equal(swingingDoors(),0);
});

test('opening swings out smoothly, stays clear of the jamb and settles open',()=>{
 clearDoorSwings();
 const door=createDoor(3);setDoorOpen(door,false);setDoorOpen(door,true);
 assert.equal(swingingDoors(),1);
 let min=0,maxJump=0;
 run(door,.4,(a,p)=>{assert.ok(Number.isFinite(a));min=Math.min(min,a);maxJump=Math.max(maxJump,Math.abs(a-p));});
 assert.ok(door.userData.leaf.rotation.y<DOOR_LEAF.open*.8,'mostly open within .4 s');
 run(door,2,(a,p)=>{min=Math.min(min,a);maxJump=Math.max(maxJump,Math.abs(a-p));assert.ok(a<=0);});
 assert.ok(min>-Math.PI/2,'never into the jamb face');
 assert.ok(min<DOOR_LEAF.open,'a little overshoot');
 assert.ok(maxJump<.12,`per-frame jump ${maxJump}`);
 assert.equal(door.userData.leaf.rotation.y,DOOR_LEAF.open);
 assert.equal(stepDoor(door,1/60),false);
});

test('closing swings shut, rebounds off the jamb and returns exactly to rest',()=>{
 clearDoorSwings();
 const door=createDoor(4);setDoorOpen(door,true);setDoorOpen(door,false);
 let hits=0,rebound=0,prev=door.userData.leaf.rotation.y;
 for(let i=0;i<180;i++){updateDoorSwings(1/60);const a=door.userData.leaf.rotation.y;assert.ok(Number.isFinite(a)&&a<=0&&a>=-Math.PI/2);if(a===0&&prev<0)hits++;if(a===0)continue;rebound=Math.min(rebound,hits?a:0);prev=a;}
 assert.ok(hits>=1,'hits the jamb');
 assert.ok(rebound<-.005&&rebound>-.3,`rebound ${rebound}`);
 assert.equal(door.userData.leaf.rotation.y,0);
 assert.equal(swingingDoors(),0);
});

test('a long frame is sub-stepped and stays stable',()=>{
 clearDoorSwings();
 const door=createDoor(5);setDoorOpen(door,false);setDoorOpen(door,true);
 stepDoor(door,.5);const a=door.userData.leaf.rotation.y;
 assert.ok(Number.isFinite(a)&&a<0&&a>-Math.PI/2);
 assert.equal(stepDoor(door,-1),true);
});
