import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTrap,trapKind} from './trap.js';

const KINDS=['pit','hatch','jaws','mine','rubble','rust','fire','teleport','magic','polymorph','ice','portal','web','plate'];

test('magic portals get their own kind; teleporters keep the rune circle',()=>{
 assert.equal(trapKind(94,13),'portal');
 assert.equal(trapKind(94,5),'teleport');
 assert.equal(trapKind(94,8),'plate');
 assert.equal(trapKind(46,13),null);
});

test('every trap model is finite, stays in its tile and disposes its resources (rocks may sink into the slab)',()=>{
 for(const kind of KINDS){
  const model=createTrap(kind,7);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(bounds.min.y>=-.06,`${kind} sinks too far into the floor`);
  assert(bounds.max.y<=1.05,`${kind} is too tall`);
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<=.5,`${kind} leaves its tile`);
  const geometries=new Set(),materials=new Set();
  model.traverse(part=>{if(part.geometry){
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),`${kind} has a bad vertex`);
   geometries.add(part.geometry);materials.add(part.material);
  }});
  let freed=0;
  for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>freed++);
  model.userData.dispose();
  assert.equal(freed,geometries.size+materials.size,`${kind} leaks resources`);
 }
});

test('the portal is an upright arch around a glowing rift',()=>{
 const model=createTrap('portal',3);
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.max.y>.9);
 let glowing=0,vertices=0;
 model.traverse(part=>{if(part.geometry){vertices+=part.geometry.attributes.position.count;if(part.material.emissiveIntensity>=1&&part.material.emissive?.getHex())glowing++;}});
 assert(glowing>=8);
 console.log(`portal: ${vertices} vertices, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}`);
});

test('the web is solid silk geometry with a spider, not 1px lines',()=>{
 const model=createTrap('web',5);
 let lines=0,meshes=0,vertices=0;
 model.traverse(part=>{if(part.isLineSegments)lines++;if(part.isMesh){meshes++;vertices+=part.geometry.attributes.position.count;}});
 assert.equal(lines,0);
 assert(meshes<40,`web is ${meshes} meshes; static strands should be merged`);
 assert(vertices>2500,'web lost its strands');
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.max.y>.9&&bounds.min.y>=-.001);
 assert(vertices<12000,`web is ${vertices} vertices`);
 console.log(`web: ${meshes} meshes, ${vertices} vertices, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}`);
});

test('static trap parts are merged: one draw call per material outside moving subgroups',()=>{
 for(const kind of KINDS){
  const model=createTrap(kind,2),seen=new Set();
  for(const part of model.children)if(part.isMesh){
   const key=`${part.material.uuid}:${part.castShadow}`;
   assert(!seen.has(key),`${kind} has two top-level meshes sharing a material`);seen.add(key);
  }
 }
});

test('the bear trap is one rusted, vertex-coloured mesh with teeth, springs and a staked chain',()=>{
 const model=createTrap('jaws',4);
 const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
 assert.equal(meshes.length,1);
 const [trap]=meshes,{position,color}=trap.geometry.attributes;
 assert(trap.material.vertexColors&&color,'bear trap should be vertex coloured');
 for(const value of color.array)assert(Number.isFinite(value)&&value>=0&&value<=1);
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.min.y>-.01&&bounds.max.y<.15,'bear trap should lie flat on the floor');
 assert(bounds.max.x-bounds.min.x>.8,'springs should reach out to both sides');
 assert(bounds.max.z>.4,'chain should run to a stake near the tile edge');
 console.log(`bear trap: ${position.count} vertices, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}`);
});

test('drawbridges are merged, finite models that stay in their tile and free their resources',async()=>{
 const {createTerrainFeature}=await import('./terrain-feature.js');
 for(const kind of ['bridge-down','bridge-up'])for(const seed of [0,7,123]){
  const model=createTerrainFeature(kind,seed);
  const bounds=new THREE.Box3().setFromObject(model);
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<=.5,`${kind} leaves its tile`);
  assert(bounds.min.y>=0&&bounds.max.y<=1.1,`${kind} has a bad height`);
  if(kind==='bridge-up')assert(bounds.max.y>.95);else assert(bounds.max.y<.15);
  const meshes=[],geometries=new Set(),materials=new Set();
  model.traverse(part=>{if(part.geometry){
   meshes.push(part);geometries.add(part.geometry);materials.add(part.material);
   for(const key of ['position','normal','color'])for(const value of part.geometry.attributes[key]?.array??[])assert(Number.isFinite(value),`${kind} has a bad ${key}`);
  }});
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['iron','water','wood']);
  // The lifting chains run the length of the tile toward the gatehouse (-z): on the deck
  // edges when lowered, over the top of the wall when raised.
  const iron=meshes.find(m=>m.userData.part==='iron').geometry.attributes.position;
  let reach=0;for(let i=0;i<iron.count;i++)if(kind==='bridge-up'?iron.getY(i)>1.03:Math.abs(iron.getX(i))>.4&&iron.getY(i)>.08)reach=Math.min(reach,iron.getZ(i));
  assert(reach<-.4,`${kind} chains run back to the gatehouse (${reach})`);
  assert(iron.count<20000,`${kind} iron is ${iron.count} vertices`);
  let freed=0;
  for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>freed++);
  model.userData.dispose();
  assert.equal(freed,geometries.size+materials.size,`${kind} leaks resources`);
 }
});

test('the rust trap is a standpipe dripping into a puddle over a drain grate',()=>{
 const model=createTrap('rust',6);
 const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
 assert(meshes.length<=8,`rust trap is ${meshes.length} meshes`);
 const vertices=meshes.reduce((n,part)=>n+part.geometry.attributes.position.count,0);
 assert(vertices<7000,`rust trap is ${vertices} vertices`);
 assert(meshes.some(part=>part.material.transparent&&part.material.roughness<.1),'rust trap should have a glossy puddle');
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.max.y>.3&&bounds.max.y<.5,'the pipe should rise and bend over the puddle');
 assert(bounds.min.y>=-.01);
 console.log(`rust trap: ${meshes.length} meshes, ${vertices} vertices, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}`);
});

test('the land mine is a painted casing half-buried in dug soil, two vertex-coloured meshes',()=>{
 for(const seed of [0,3,9,21]){
  const model=createTrap('mine',seed);
  const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.deepEqual(meshes.map(m=>m.name).sort(),['land-mine','mine-soil']);
  for(const mesh of meshes){
   assert(mesh.material.vertexColors,`${mesh.name} should be vertex coloured`);
   for(const key of ['position','normal','color'])for(const value of mesh.geometry.attributes[key].array)assert(Number.isFinite(value),`${mesh.name} has a bad ${key}`);
   for(const value of mesh.geometry.attributes.color.array)assert(value>=0&&value<=1);
  }
  const soil=new THREE.Box3().setFromObject(meshes.find(m=>m.name==='mine-soil'));
  const mine=new THREE.Box3().setFromObject(meshes.find(m=>m.name==='land-mine'));
  assert(soil.min.y>-.015&&soil.max.y<.04,'soil should be a low mound (clods may sink a little)');
  assert(soil.max.x-soil.min.x>.45,'soil should spread round the mine');
  assert(mine.min.y<.02&&mine.min.y>-.02,'casing should sink into the soil');
  assert(mine.max.y>.1&&mine.max.y<.14,'prongs should stand above the plate');
  for(const v of [soil.min.x,soil.max.x,soil.min.z,soil.max.z])assert(Math.abs(v)<.35);
  const vertices=meshes.reduce((n,m)=>n+m.geometry.attributes.position.count,0);
  assert(vertices<20000,`land mine is ${vertices} vertices`);
  if(seed===0)console.log(`land mine: ${vertices} vertices, soil y ${soil.min.y.toFixed(3)}..${soil.max.y.toFixed(3)} x ${soil.min.x.toFixed(3)}..${soil.max.x.toFixed(3)}, casing y ${mine.min.y.toFixed(3)}..${mine.max.y.toFixed(3)}`);
 }
});

test('the rubble trap is a fallen rock in a shattered scar, two vertex-coloured meshes',()=>{
 for(const seed of [0,3,9,21]){
  const model=createTrap('rubble',seed);
  const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.deepEqual(meshes.map(m=>m.name).sort(),['fallen-rock','rubble-scar']);
  for(const mesh of meshes){
   assert(mesh.material.vertexColors,`${mesh.name} should be vertex coloured`);
   for(const key of ['position','normal','color'])for(const value of mesh.geometry.attributes[key].array)assert(Number.isFinite(value),`${mesh.name} has a bad ${key}`);
   for(const value of mesh.geometry.attributes.color.array)assert(value>=0&&value<=1);
  }
  const scar=new THREE.Box3().setFromObject(meshes.find(m=>m.name==='rubble-scar'));
  const rock=new THREE.Box3().setFromObject(meshes.find(m=>m.name==='fallen-rock'));
  assert(scar.min.y>=0&&scar.max.y<.03,'scar should lie flat on the slab');
  assert(scar.max.x-scar.min.x>.6,'scar should spread round the rock');
  assert(rock.min.y>-.03,'rock and shards may only sink a little');
  assert(rock.max.y>.12&&rock.max.y<.22,'the rock should stand clear of the rubble');
  for(const v of [scar.min.x,scar.max.x,scar.min.z,scar.max.z,rock.min.x,rock.max.x,rock.min.z,rock.max.z])assert(Math.abs(v)<.46);
  const vertices=meshes.reduce((n,m)=>n+m.geometry.attributes.position.count,0);
  assert(vertices<15000,`rubble trap is ${vertices} vertices`);
  if(seed===0)console.log(`rubble trap: ${vertices} vertices, scar y ${scar.min.y.toFixed(3)}..${scar.max.y.toFixed(3)}, rock y ${rock.min.y.toFixed(3)}..${rock.max.y.toFixed(3)}`);
 }
});

test('drawbridges face across their moat: raised on the gatehouse wall, lowered with the hinge at the gate',async()=>{
 const {bridgeYaw}=await import('./terrain-feature.js');
 const T={'-':'wall','.':'floor','}':'water','L':'lava','#':'feature','=':'feature'};
 // `rows` is a 3×3 map around the bridge; turn it a quarter at a time to try all four facings
 const turn=rows=>rows[0].split('').map((_,x)=>rows.map(r=>r[x]).reverse().join(''));
 const yawOf=(kind,rows)=>bridgeYaw(kind,(dx,dz)=>T[rows[1+dz][1+dx]]);
 // where the model's local -z (gatehouse side) ends up after the yaw
 const gate=yaw=>[Math.round(-Math.sin(yaw)),Math.round(-Math.cos(yaw))];
 const cases=[
  // raised: drawn on the wall line itself, moat on the far side
  ['bridge-up',['...','-#-','}}}'],[0,-1]],
  ['bridge-up',['...','-#-','LLL'],[0,-1]],
  // lowered: lying on the moat square, the doorway behind it flanked by wall
  ['bridge-down',['-.-','}=}','...'],[0,-1]],
 ];
 for(const [kind,start,dir] of cases){
  let rows=start,d=dir;
  for(let k=0;k<4;k++){
   const yaw=yawOf(kind,rows);
   assert(yaw!==null,`${kind} ${rows.join('/')}`);
   assert.deepEqual(gate(yaw).map(v=>v+0),d,`${kind} ${rows.join('/')}: gate toward ${d}`);
   rows=turn(rows);d=[-d[1]+0,d[0]+0];// a clockwise quarter turn of the map (x right, z down)
  }
 }
 // the screenshot case: raised in a horizontal wall stands across z, not along it
 assert.equal(yawOf('bridge-up',['...','-#-','}}}']),0);
 // nothing to go on: leave the model as it is
 assert.equal(yawOf('bridge-up',['...','.#.','...']),null);
 assert.equal(yawOf('bridge-down',['}}}','}=}','}}}']),null);
});

test('the fire trap is a spiked vent over glowing coals in a fading scorch burst, with charred remains, in four draws',()=>{
 const model=createTrap('fire',6);
 const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
 assert.deepEqual(meshes.map(m=>m.name).sort(),['charred-remains','coal-glow','scorch','vent']);
 const by=Object.fromEntries(meshes.map(m=>[m.name,m]));
 assert(by['coal-glow'].material.isMeshBasicMaterial,'the coals should glow without lights');
 assert.equal(by.scorch.geometry.attributes.color.itemSize,4,'the scorch should fade out through vertex alpha');
 assert(by.scorch.material.transparent&&!by.scorch.castShadow);
 for(const m of meshes){assert(m.material.vertexColors);for(const v of m.geometry.attributes.color.array)assert(v>=0&&v<=1);}
 const vent=new THREE.Box3().setFromObject(by.vent);
 assert(vent.max.y>.07,'the collar spikes should stand up');
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.max.y<.15&&bounds.min.y>-.02,'the trap should lie flat on the floor');
 let vertices=0;for(const m of meshes)vertices+=m.geometry.attributes.position.count;
 assert(vertices<16000,`fire trap is ${vertices} vertices`);
 console.log(`fire trap: ${vertices} vertices, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}`);
});

test('the pit is a ragged maw ringed by tipped flagstones, with stakes and a skull rising from the dark, in two draws',()=>{
 for(const seed of [0,3,7,11,42]){
  const model=createTrap('pit',seed);
  const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.deepEqual(meshes.map(m=>m.name).sort(),['pit-mouth','pit-rim']);
  const by=Object.fromEntries(meshes.map(m=>[m.name,m]));
  assert(!by['pit-mouth'].castShadow,'the flat mouth should not cast a shadow');
  for(const m of meshes){assert(m.material.vertexColors);for(const v of m.geometry.attributes.color.array)assert(v>=0&&v<=1);}
  const normals=by['pit-mouth'].geometry.attributes.normal;
  for(let i=0;i<normals.count;i++)assert.equal(normals.getY(i),1);
  const rim=new THREE.Box3().setFromObject(by['pit-rim']);
  assert(rim.max.y>.07&&rim.max.y<.16,`the stakes should stand up out of the pit (${rim.max.y})`);
  const bounds=new THREE.Box3().setFromObject(model);
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<.46);
  assert(bounds.min.y>-.05,"the tipped flagstones may only dip a little into the slab");
  let vertices=0;for(const m of meshes)vertices+=m.geometry.attributes.position.count;
  assert(vertices<12000,`pit is ${vertices} vertices`);
  if(!seed)console.log(`pit: ${vertices} vertices, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}, x ${bounds.min.x.toFixed(3)}..${bounds.max.x.toFixed(3)}, z ${bounds.min.z.toFixed(3)}..${bounds.max.z.toFixed(3)}`);
 }
});

test('the trap door is a warped plank hatch left ajar on a black gap, with bony fingers curled out over its frame, in three draws',()=>{
 for(const seed of [0,3,7,11,42]){
  const model=createTrap('hatch',seed);
  const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.deepEqual(meshes.map(m=>m.name).sort(),['hatch-iron','hatch-void','hatch-wood']);
  const by=Object.fromEntries(meshes.map(m=>[m.name,m]));
  assert(!by['hatch-void'].castShadow,'the flat void should not cast a shadow');
  for(const m of meshes){assert(m.material.vertexColors);for(const v of m.geometry.attributes.color.array)assert(v>=0&&v<=1);}
  const normals=by['hatch-void'].geometry.attributes.normal;
  for(let i=0;i<normals.count;i++)assert(Math.abs(normals.getY(i)-1)<1e-6);
  // The door is ajar: its free edge stands well above the frame top.
  const wood=new THREE.Box3().setFromObject(by['hatch-wood']);
  assert(wood.max.y>.08&&wood.max.y<.15,`the door's free edge should lift off the frame (${wood.max.y})`);
  // The claws hook over the far side of the frame.
  assert(wood.max.x>.315,`the fingers should curl over the far beam (${wood.max.x})`);
  const bounds=new THREE.Box3().setFromObject(model);
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<.4);
  assert(bounds.min.y>=0,'nothing sinks below the slab');
  let vertices=0;for(const m of meshes)vertices+=m.geometry.attributes.position.count;
  assert(vertices<12000,`hatch is ${vertices} vertices`);
 }
});
