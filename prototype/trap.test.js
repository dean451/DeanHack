import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTrap,trapKind} from './trap.js';
import {breathAt,breathCycle,sparkState,SPARKS,SPARK_REACH,GLOW_LOW,GASP_PEAK,BREATH_EVERY} from './fire-trap-fx.js';
import {beatAt,flameAt,attachSigilFx,BEAT_EVERY,GLOW_REST} from './sigil-fx.js';

const KINDS=['pit','hatch','jaws','arrow','dart','squeaky','gas','mine','rubble','rolling','antimagic','rust','fire','teleport','magic','polymorph','ice','portal','web','plate'];

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

test('the fire trap breathes: a slow dim inhale, a quicker hot exhale, gasps that flare and spit jagged sparks',()=>{
 const phase=.37;let lo=Infinity,hi=-Infinity,gasps=0,flown=0,maxY=0,maxR=0;const cycles=new Set();
 for(let t=0;t<BREATH_EVERY*40;t+=1/60){
  const g=breathAt(t,phase);assert(Number.isFinite(g));lo=Math.min(lo,g);hi=Math.max(hi,g);
  const c=breathCycle(t,phase);if(c.gasp&&!cycles.has(c.cycle))gasps++;cycles.add(c.cycle);
  for(let i=0;i<SPARKS;i++){const s=sparkState(t,i,phase);
   for(const v of [s.x,s.y,s.z,s.size])assert(Number.isFinite(v));
   if(s.life<0){assert.equal(s.size,0);continue;}
   flown++;maxY=Math.max(maxY,s.y);maxR=Math.max(maxR,Math.hypot(s.x,s.z));
   // Sparks only fly from the exhale onward, never at the start of an inhale.
   assert(c.u>.6||c.u<.15,`spark ${i} flying at breath ${c.u.toFixed(2)}`);}
 }
 assert(lo>GLOW_LOW-.08&&lo<GLOW_LOW+.08,`inhale bottoms out at ${lo}`);
 assert(hi>GASP_PEAK-.1&&hi<GASP_PEAK+.08,`gasps peak at ${hi}`);
 assert(gasps>=4&&gasps<=24,`${gasps} gasps in 40 breaths`);
 assert(flown>0&&maxY<.5&&maxR<=SPARK_REACH+1e-9,`sparks y ${maxY}, reach ${maxR}`);
 // The breath is continuous: no jump between frames bigger than the flicker allows.
 for(let t=0;t<BREATH_EVERY*6;t+=1/120)assert(Math.abs(breathAt(t+1/120,phase)-breathAt(t,phase))<.05);
});

test('animating the fire trap adds one spark draw, drives the coal glow and cleans up after itself',()=>{
 const model=createTrap('fire',6);
 const before=new THREE.Box3().setFromObject(model);
 let coals;model.traverse(o=>{if(o.name==='coal-glow')coals=o.material;});
 for(let t=0;t<30;t+=1/30)model.userData.animate(t);
 const fx=model.getObjectByName('FireTrapBreath');assert(fx,'the spark group should be added on the first frame');
 let draws=0;fx.traverse(o=>{if(o.isMesh)draws++;});assert.equal(draws,1);
 assert(coals.color.r!==1&&Number.isFinite(coals.color.r));
 const after=new THREE.Box3().setFromObject(model);
 assert(after.max.y<.5&&after.min.y>=before.min.y-1e-6,`trap with sparks spans y ${after.min.y}..${after.max.y}`);
 let freed=0;const sparks=fx.children[0];
 for(const item of [sparks.geometry,sparks.material])item.addEventListener('dispose',()=>freed++);
 model.traverse(o=>o.userData.dispose?.());
 assert.equal(freed,2,'the sparks should free their geometry and material');
 // Other traps don't animate.
 assert.equal(createTrap('pit',6).userData.animate,undefined);
});

test('the magic traps are a burning sigil with a staring eye, ringed by black candles (frost for ice), in three draws',()=>{
 for(const kind of ['teleport','magic','polymorph','ice'])for(const seed of [0,3,7,11,42]){
  const model=createTrap(kind,seed);
  const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.deepEqual(meshes.map(m=>m.name).sort(),['sigil-glow',kind==='ice'?'sigil-frost':'sigil-wax','sigil-stain'].sort());
  const by=Object.fromEntries(meshes.map(m=>[m.name,m]));
  assert(by['sigil-glow'].material.isMeshBasicMaterial,'the sigil should burn without lights');
  assert(by['sigil-glow'].material.color.r>1.25,'the hottest strokes should catch the bloom');
  assert.equal(by['sigil-stain'].geometry.attributes.color.itemSize,4,'the stain should fade out through vertex alpha');
  assert(!by['sigil-stain'].castShadow&&!by['sigil-glow'].castShadow);
  for(const m of meshes){assert(m.material.vertexColors);for(const v of m.geometry.attributes.color.array)assert(v>=0&&v<=1);}
  const solid=new THREE.Box3().setFromObject(by[kind==='ice'?'sigil-frost':'sigil-wax']);
  assert(solid.max.y>.05,'the candles (or shards) should stand up off the floor');
  const bounds=new THREE.Box3().setFromObject(model);
  assert(bounds.max.y<.15&&bounds.min.y>-.02,'the trap should lie low on the floor');
  for(const v of [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z])assert(Math.abs(v)<.48);
  let vertices=0;for(const m of meshes)vertices+=m.geometry.attributes.position.count;
  assert(vertices<16000,`${kind} is ${vertices} vertices`);
  if(!seed)console.log(`${kind} sigil: ${vertices} vertices, y ${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)}`);
 }
});

test('the sigil beats lub-dub and its candle flames are drawn toward the eye, gutter and come back',()=>{
 // The beat: two throbs close together, then a long dim wait; continuous, and it catches the bloom only on the throbs.
 let lo=Infinity,hi=-Infinity,bright=0,n=0;
 for(let t=0;t<BEAT_EVERY*20;t+=1/120){const g=beatAt(t,.4).glow;assert(Number.isFinite(g));lo=Math.min(lo,g);hi=Math.max(hi,g);if(g>1.25)bright++;n++;
  assert(Math.abs(beatAt(t+1/120,.4).glow-g)<.03,'the beat should not jump between frames');}
 assert(Math.abs(lo-GLOW_REST)<.01&&hi>1.5&&hi<1.7,`beat ${lo}..${hi}`);
 assert(bright/n>.05&&bright/n<.3,`over the bloom ${(bright/n*100).toFixed(0)}% of the time`);
 let dips=0,prev=1;
 for(let t=0;t<240;t+=1/30){const f=flameAt(t,3,.2);for(const v of Object.values(f))assert(Number.isFinite(v));if(f.bright<.6&&prev>=.6)dips++;prev=f.bright;}
 assert(dips>=2&&dips<=30,`${dips} near-snuffs in 4 minutes`);
 for(const kind of ['teleport','polymorph','ice']){
  const model=createTrap(kind,7),glow=model.getObjectByName('sigil-glow');
  const fx=attachSigilFx(model);assert.equal(fx.flames.length,kind==='ice'?0:kind==='polymorph'?7:5,`${kind} candle flames`);
  const pos=glow.geometry.attributes.position,rest=pos.array.slice(),meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
  let top=0;
  for(let t=0;t<30;t+=1/30){model.userData.animate(t);for(let v=0;v<pos.count;v++)top=Math.max(top,pos.getY(v));}
  for(let v=0;v<pos.count;v++)if(rest[v*3+1]<.015)assert.equal(pos.getY(v),rest[v*3+1],'the flat strokes stay put');
  if(kind==='ice')assert(top<.01);else assert(top<.2&&top>.05,`${kind} flames reach y ${top}`);
  let after=0;model.traverse(o=>{if(o.isMesh)after++;});assert.equal(after,meshes.length,'no extra draws');
 }
});

test('arrow and dart traps get the arrow mask by name; nameless cyan traps stay bear traps',()=>{
 assert.equal(trapKind(94,6,'arrow trap'),'arrow');
 assert.equal(trapKind(94,6,'dart trap'),'dart');
 assert.equal(trapKind(94,6,'bear trap'),'jaws');
 assert.equal(trapKind(94,6),'jaws');
 for(const kind of ['arrow','dart'])for(const seed of [0,3,42]){
  const model=createTrap(kind,seed);
  const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert.deepEqual(meshes.map(o=>o.name).sort(),[`${kind}-eyes`,`${kind}-shafts`,`${kind}-stone`]);
  const b=new THREE.Box3().setFromObject(model);
  assert(b.max.y>.3&&b.max.y<.6,`${kind} mask height ${b.max.y}`);
  for(const o of meshes){const c=o.geometry.attributes.color.array;for(const v of c)assert(v>=0&&Number.isFinite(v));}
  model.userData.dispose();
 }
});

test('squeaky boards get their own warped floorboards by name; nameless brown traps stay trap doors',()=>{
 assert.equal(trapKind(94,3,'squeaky board'),'squeaky');
 assert.equal(trapKind(94,3,'trap door'),'hatch');
 assert.equal(trapKind(94,3),'hatch');
 for(const seed of [0,3,42]){
  const model=createTrap('squeaky',seed);
  const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert.deepEqual(meshes.map(o=>o.name).sort(),['squeaky-bone','squeaky-eyes','squeaky-wood']);
  const b=new THREE.Box3().setFromObject(model);
  assert(b.max.y>.06&&b.max.y<.2,`squeaky board height ${b.max.y}`);
  assert(b.min.y>=-.01,'squeaky board sinks into the floor');
  for(const o of meshes){const c=o.geometry.attributes.color.array;for(const v of c)assert(v>=0&&Number.isFinite(v));}
  model.userData.dispose();
 }
});

test('sleeping gas traps get the yawning stone face by name; nameless bright blue traps keep the sigil',()=>{
 assert.equal(trapKind(94,12,'sleeping gas trap'),'gas');
 assert.equal(trapKind(94,12,'magic trap'),'magic');
 assert.equal(trapKind(94,12),'magic');
 for(const seed of [0,3,42]){
  const model=createTrap('gas',seed);
  const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert.deepEqual(meshes.map(o=>o.name).sort(),['gas-cloud','gas-glow','gas-iron','gas-stone']);
  const b=new THREE.Box3().setFromObject(model);
  assert(b.max.y>.3&&b.max.y<.5,`gas wisps reach ${b.max.y}`);
  assert(b.min.y>=-.01,'the gas trap sinks into the floor');
  const cloud=model.getObjectByName('gas-cloud');
  assert(cloud.material.transparent&&!cloud.material.depthWrite&&!cloud.castShadow,'the gas is see-through and casts no shadow');
  for(const o of meshes){const c=o.geometry.attributes.color.array;for(const v of c)assert(v>=0&&Number.isFinite(v));}
  model.userData.dispose();
 }
});

test('rolling boulder traps get their own worn track by name; other grey traps keep the fallen rock',()=>{
 assert.equal(trapKind(94,7,'rolling boulder trap'),'rolling');
 assert.equal(trapKind(94,7,'falling rock trap'),'rubble');
 assert.equal(trapKind(94,7),'rubble');
 for(const seed of [0,3,42]){
  const model=createTrap('rolling',seed);
  const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert.deepEqual(meshes.map(o=>o.name).sort(),['rolling-stone','rolling-track']);
  assert(!model.getObjectByName('rolling-track').castShadow,'the flat track casts no shadow');
  const b=new THREE.Box3().setFromObject(model);
  assert(b.max.y>.03&&b.max.y<.1,`rolling track kerbs reach ${b.max.y}`);
  assert(b.min.y>=-.015,'the rolling track sinks into the floor');
  assert(b.max.x-b.min.x>.9,'the track runs right across the tile');
  for(const o of meshes){const c=o.geometry.attributes.color.array;for(const v of c)assert(v>=0&&Number.isFinite(v));}
  console.log(`rolling ${seed}: ${meshes.map(o=>o.geometry.attributes.position.count).join('+')} vertices, y ${b.min.y.toFixed(3)}..${b.max.y.toFixed(3)}, x ${b.min.x.toFixed(3)}..${b.max.x.toFixed(3)}, z ${b.min.z.toFixed(3)}..${b.max.z.toFixed(3)}`);
  model.userData.dispose();
 }
});

test('anti-magic fields get a drained, iron-staked null sigil by name; nameless bright blue traps keep the burning sigil',()=>{
 assert.equal(trapKind(94,12,'anti-magic field'),'antimagic');
 assert.equal(trapKind(94,12,'magic trap'),'magic');
 assert.equal(trapKind(94,12),'magic');
 for(const seed of [0,3,42]){
  const model=createTrap('antimagic',seed);
  const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert.deepEqual(meshes.map(o=>o.name).sort(),['null-etching','null-iron','null-stain']);
  for(const name of ['null-stain','null-etching'])assert(!model.getObjectByName(name).castShadow,`${name} lies flat and casts no shadow`);
  for(const o of meshes){
   assert(o.material.isMeshStandardMaterial&&o.material.emissive.getHex()===0,`${o.name} must not glow`);
   for(const v of o.geometry.attributes.color.array)assert(v>=0&&v<=1&&Number.isFinite(v));
  }
  assert.equal(model.userData.animate,undefined,'the dead sigil has no beat');
  const b=new THREE.Box3().setFromObject(model);
  assert(b.max.y>.03&&b.max.y<.1,`anti-magic nails reach ${b.max.y}`);
  assert(b.min.y>=-.03,'the anti-magic nails are driven too deep');
  assert(b.max.x-b.min.x>.8&&b.max.z-b.min.z>.8,'the iron hoop rings the tile');
  console.log(`antimagic ${seed}: ${meshes.map(o=>o.geometry.attributes.position.count).join('+')} vertices, y ${b.min.y.toFixed(3)}..${b.max.y.toFixed(3)}, x ${b.min.x.toFixed(3)}..${b.max.x.toFixed(3)}, z ${b.min.z.toFixed(3)}..${b.max.z.toFixed(3)}`);
  model.userData.dispose();
 }
});
