import * as THREE from 'three';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDoor,createBrokenDoor,DOOR_LEAF} from './door.js';
import {tileKind,setDoorOpen,orientDoor,stepDoor,updateDoorSwings,clearDoorSwings,swingingDoors} from './door-swing.js';

const run=(door,secs,fn)=>{const dt=1/60;let prev=door.userData.leaf.rotation.y;for(let i=0;i<secs*60;i++){stepDoor(door,dt);const a=door.userData.leaf.rotation.y;fn?.(a,prev);prev=a;}};

test('open doors keep their door tile; other terrain is unchanged',()=>{
 assert.equal(tileKind({terrain:'door'}),'door');
 assert.equal(tileKind({terrain:'floor',door:'open'}),'door');
 assert.equal(tileKind({terrain:'floor'}),'floor');
 assert.equal(tileKind({terrain:'floor',door:'broken'}),'broken-door');
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

test('a door forced open catches once on its pintles, then wrenches free and settles',()=>{
 clearDoorSwings();
 const door=createDoor(10);setDoorOpen(door,false);setDoorOpen(door,true);
 const speeds=[];let prev=0;
 for(let i=0;i<30;i++){stepDoor(door,1/60);const a=door.userData.leaf.rotation.y;speeds.push(Math.abs(a-prev)*60);prev=a;}
 const at=speeds.findIndex((v,i)=>i>2&&v<speeds[i-1]*.3);
 assert.ok(at>0,'the leaf lurches almost to a stop');
 assert.ok(Math.max(...speeds.slice(at+1))>speeds[at]*2,'then the spring wrenches it free');
 run(door,2);assert.equal(door.userData.leaf.rotation.y,DOOR_LEAF.open);
 // Reopening a door that never shut does not catch again.
 setDoorOpen(door,false);run(door,.05);setDoorOpen(door,true);
 const before=door.userData.leaf.rotation.y;assert.ok(before<0);
 run(door,2);assert.equal(door.userData.leaf.rotation.y,DOOR_LEAF.open);
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

// World direction (x,z) the open leaf points into: the door group's +z after its yaw.
const opensTowards=door=>({x:Math.sin(door.rotation.y),z:Math.cos(door.rotation.y)});

test('a door opens away from the hero, on either wall orientation and from either side',()=>{
 for(const yaw of [0,Math.PI/2])for(const hero of [{dx:0,dz:1},{dx:0,dz:-1},{dx:1,dz:0},{dx:-1,dz:0}]){
  clearDoorSwings();
  const door=createDoor(6);orientDoor(door,yaw);setDoorOpen(door,false,hero);
  assert.equal(door.rotation.y,yaw,'a shut door is not turned');
  setDoorOpen(door,true,hero);
  const o=opensTowards(door),d=o.x*hero.dx+o.z*hero.dz;
  assert.ok(Number.isFinite(door.rotation.y));
  assert.ok(d<=1e-9,`yaw ${yaw} hero ${JSON.stringify(hero)} opens towards the hero (${d})`);
  // The wall-following yaw is reapplied every frame; the half turn must survive it.
  orientDoor(door,yaw);assert.ok(Math.abs(opensTowards(door).x-o.x)<1e-9&&Math.abs(opensTowards(door).z-o.z)<1e-9);
  run(door,2);assert.equal(door.userData.leaf.rotation.y,DOOR_LEAF.open);
 }
});

test('a door first seen open lies away from the hero; one mid-swing is never turned',()=>{
 clearDoorSwings();
 const seen=createDoor(7);orientDoor(seen,0);setDoorOpen(seen,true,{dx:0,dz:1});
 assert.ok(opensTowards(seen).z<-.99);assert.equal(swingingDoors(),0);
 const door=createDoor(8);orientDoor(door,0);setDoorOpen(door,false);setDoorOpen(door,true,{dx:0,dz:-1});
 assert.ok(opensTowards(door).z>.99,'hero behind: no turn needed');
 run(door,.1);setDoorOpen(door,false,{dx:0,dz:1});run(door,.05);
 const yaw=door.rotation.y;setDoorOpen(door,true,{dx:0,dz:1});
 assert.equal(door.rotation.y,yaw,'reopened before it shut: the swinging leaf is not flipped');
 run(door,2);assert.equal(door.userData.leaf.rotation.y,DOOR_LEAF.open);
 // Once it has slammed shut and settled, the next opening can turn it.
 setDoorOpen(door,false);run(door,3);assert.equal(door.userData.leaf.rotation.y,0);
 setDoorOpen(door,true,{dx:0,dz:1});assert.ok(opensTowards(door).z<-.99);
 // No hero, or a hero on the door's line, leaves it alone.
 const lone=createDoor(9);orientDoor(lone,0);setDoorOpen(lone,false);setDoorOpen(lone,true,{dx:3,dz:0});assert.equal(lone.rotation.y,0);
});

test('a broken door keeps its frame, has no leaf to swing, and stays inside its tile',()=>{
 for(const seed of [0,3,42,999]){
  const door=createBrokenDoor(seed);door.updateMatrixWorld(true);
  assert.equal(door.userData.broken,true);assert.equal(door.userData.leaf,undefined);
  setDoorOpen(door,true,{dx:1,dz:1});assert.equal(stepDoor(door,1/60),false);
  const meshes=[];door.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['iron','stone','wood'],'one mesh per material');
  const v=new THREE.Vector3();let min=Infinity,maxY=-Infinity,maxXZ=0,pale=0;
  for(const m of meshes){
   const p=m.geometry.attributes.position,c=m.geometry.attributes.color;
   for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);
    assert.ok([v.x,v.y,v.z].every(Number.isFinite));
    min=Math.min(min,v.y);maxY=Math.max(maxY,v.y);maxXZ=Math.max(maxXZ,Math.abs(v.x),Math.abs(v.z));
    if(m.userData.part==='wood'&&c.getX(i)>.3)pale++;
   }
  }
  assert.ok(min>-.01&&maxY<1.12,`floor to lintel (${min}, ${maxY})`);
  assert.ok(maxXZ<.5,`inside the tile (${maxXZ})`);
  assert.ok(pale>200,'fresh pale wood where the planks snapped');
  door.userData.dispose();
 }
});
