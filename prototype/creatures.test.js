import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const D=68;
function glowOf(actor){return '#'+actor.core.material.emissive.getHexString();}

test('each shuffled dragon name gets its own grounded, finite body plan',()=>{
 const plans={draken:[4,2],wyvern:[2,2],sarkany:[4,2],amphitere:[0,2],lindworm:[2,0],tatzelworm:[2,0],guivre:[0,0],leviathan:[0,0],sirrush:[4,0],tiamat:[4,2]};
 for(const [name,[legs,wings]] of Object.entries(plans))for(const baby of [false,true]){
  const actor=createCreature({name:(baby?'baby ':'')+name,symbol:D,color:3});
  assert.equal(actor.quirk,'dragon');assert.equal(actor.legs.length,legs,name);assert.equal(actor.wings.length,wings,name);
  assert(actor.core&&actor.tail,name);
  actor.g.updateMatrixWorld(true);
  actor.g.traverse(part=>{if(part.geometry)for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),name);});
  const bounds=new THREE.Box3().setFromObject(actor.g);
  assert(bounds.min.y>-.005,name);assert(bounds.max.y<1.35,name);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<1.05,name);
 }
});

test('the dragon breath glow follows the glyph colour, and an unidentified brown dragon shows only an ember',()=>{
 const unknown=createCreature({name:'wyvern',symbol:D,color:3});
 const fire=createCreature({name:'wyvern',symbol:D,color:1});
 const frost=createCreature({name:'wyvern',symbol:D,color:15});
 assert.equal(glowOf(unknown),'#ff8a3a');
 assert.notEqual(glowOf(fire),glowOf(unknown));assert.notEqual(glowOf(frost),glowOf(fire));
 // named test dragons with no colour fall back on the colour word in the name
 assert.equal(glowOf(createCreature({name:'red dragon'})),glowOf(fire));
 const babies=new THREE.Box3().setFromObject(createCreature({name:'baby draken',symbol:D,color:3}).g),adults=new THREE.Box3().setFromObject(createCreature({name:'draken',symbol:D,color:3}).g);
 assert(babies.max.y<adults.max.y*.75);
});

test('an identified dragon wears its breath, and an unidentified brown one wears nothing that tells',()=>{
 const sig=a=>{a.g.updateMatrixWorld(true);let n=0,v=0;const mats=new Set();a.g.traverse(o=>{if(o.isMesh){n++;v+=o.geometry.attributes.position.count;mats.add('#'+o.material.color.getHexString()+(o.material.emissive?.getHexString()||''));}});return {n,v,mats};};
 const elements={0:'disint',1:'fire',2:'poison',4:'lightning',5:'chromatic',6:'shimmer',7:'missile',9:'sleep',11:'acid',13:'lava',14:'silver',15:'cold'};
 for(const name of ['draken','wyvern','tatzelworm','leviathan','tiamat','baby guivre']){
  const brown=createCreature({name,symbol:D,color:3}),plain=sig(brown);
  assert.equal(brown.element,null,name);
  const seen=new Set();
  for(const [color,element] of Object.entries(elements)){
   const a=createCreature({name,symbol:D,color:+color}),s=sig(a);
   assert.equal(a.element,element,`${name} ${color}`);
   assert(s.v>plain.v+50,`${name} ${element} adds detail`);
   assert(s.n<=plain.n+14,`${name} ${element} stays cheap (${s.n} draws)`);
   seen.add(s.v);
   const bounds=new THREE.Box3().setFromObject(a.g);
   assert(bounds.min.y>-.005&&bounds.max.y<1.35,`${name} ${element} height`);
   assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<1.05,`${name} ${element} width`);
  }
  assert.equal(seen.size,Object.keys(elements).length,`${name}: every breath looks different`);
 }
});

test('little dog, dog and large dog are grounded canines that grow with the breed',()=>{
 let last=0;
 for(const name of ['little dog','dog','large dog']){
  const actor=createCreature({name,symbol:100,color:15});
  assert.equal(actor.quirk,'dog',name);assert.equal(actor.legs.length,4,name);assert(actor.tail,name);
  actor.g.updateMatrixWorld(true);
  actor.g.traverse(part=>{if(part.geometry)for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),name);});
  const bounds=new THREE.Box3().setFromObject(actor.g),size=bounds.getSize(new THREE.Vector3());
  assert(Math.abs(bounds.min.y)<.01,name);assert(bounds.max.y<1.2,name);
  // longer than wide, and longer than a cat of the same size
  assert(size.z>size.x*1.5,name);assert(size.y>last,name);last=size.y;
 }
});

test('hell hounds burn: flickering flame tongues on the spine, head, tail and paws, and ember eyes',()=>{
 for(const [name,scale] of [['hell hound',1.3],['hell hound pup',.85]]){
  const hound=createCreature({name,symbol:100,color:1});
  assert.equal(hound.quirk,'canine');assert.equal(hound.g.scale.x,scale);
  const flames=[];hound.g.traverse(o=>{if(o.isMesh&&o.userData.part==='flame')flames.push(o);});
  assert.equal(flames.length,13,name);
  assert(flames.every(f=>f.geometry===flames[0].geometry&&f.material===flames[0].material&&!f.castShadow),'one shared, shadowless flame');
  for(const leg of hound.legs)assert(leg.children.some(o=>o.userData.part==='flame'),'a burning paw');
  assert(hound.tail.children.some(o=>o.userData.part==='flame'),'a burning tail');
  for(const v of flames[0].geometry.attributes.position.array)assert(Number.isFinite(v));
  hound.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(hound.g);
  assert(b.min.y>-.03,`${name}: flames under the floor at ${b.min.y}`);
 }
 const wolf=createCreature({name:'wolf'});let lit=0;wolf.g.traverse(o=>{if(o.userData.part==='flame')lit++;});
 assert.equal(lit,0,'other canines do not burn');
});

test('pony, horse and warhorse are grounded, hornless horses that grow with the breed and take the glyph colour',()=>{
 let last=0;
 for(const name of ['pony','horse','warhorse']){
  const actor=createCreature({name,symbol:117,color:3});
  assert.equal(actor.g.name,'horse',name);assert.equal(actor.legs.length,4,name);assert(actor.tail,name);
  actor.g.updateMatrixWorld(true);
  actor.g.traverse(part=>{if(part.geometry)for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),name);});
  const bounds=new THREE.Box3().setFromObject(actor.g),size=bounds.getSize(new THREE.Vector3());
  assert(Math.abs(bounds.min.y)<.01,name);assert(bounds.max.y<1.4,name);
  assert(size.z>size.x*1.8,name);assert(Math.max(-bounds.min.z,bounds.max.z,-bounds.min.x,bounds.max.x)<.85,name);
  assert(size.y>last,name);last=size.y;
 }
 // an unnamed u is a horse too, not a unicorn
 assert.equal(createCreature({symbol:117,color:3}).g.name,'horse');
 assert.notEqual(createCreature({name:'white unicorn',symbol:117,color:15}).g.name,'horse');
});

test('unicorns and the ki-rin stand on the horse body with a spiral horn, coloured by kind, in few draw calls',()=>{
 const hornOf=actor=>{let horn=null;actor.g.traverse(o=>{if(o.isMesh&&o.geometry.parameters?.radiusTop===0&&o.geometry.parameters.height>.2)horn=o;});return horn;};
 const coats=new Set();
 for(const name of ['white unicorn','gray unicorn','black unicorn','ki-rin']){
  const actor=createCreature({name,symbol:117,color:15});
  assert.equal(actor.g.name,'unicorn',name);assert.equal(actor.legs.length,4,name);assert(actor.tail,name);
  actor.g.updateMatrixWorld(true);let meshes=0;
  actor.g.traverse(part=>{if(part.geometry){meshes++;for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),name);}});
  assert(meshes<=30,`${name}: ${meshes} meshes`);
  const bounds=new THREE.Box3().setFromObject(actor.g,true);
  assert(Math.abs(bounds.min.y)<.01,name);assert(bounds.max.y<1.5,name);assert(Math.max(-bounds.min.z,bounds.max.z)<.85,name);
  const horn=hornOf(actor);assert(horn,name);
  const tip=horn.localToWorld(new THREE.Vector3(0,horn.geometry.parameters.height/2,0)),base=horn.localToWorld(new THREE.Vector3(0,-horn.geometry.parameters.height/2,0));
  assert(Math.abs(tip.y-bounds.max.y)<.01,`${name}: the horn tip is the highest point`);assert(tip.z>base.z&&tip.y>base.y+.15,`${name}: the horn points forward and up`);
  let coat=null;actor.body.children.find(o=>o.isMesh&&(coat=o.material.color.getHexString()));coats.add(coat);
 }
 assert.equal(coats.size,4,'each kind has its own coat');
 assert.equal(createCreature({name:'unicorn'}).g.name,'unicorn');
 for(const name of ['pony','horse','warhorse']){const actor=createCreature({name,symbol:117,color:3});assert.equal(hornOf(actor),null,name);let meshes=0;actor.g.traverse(o=>{if(o.isMesh)meshes++;});assert(meshes<=32,`${name}: ${meshes} meshes`);}
});

test('stone giants hoist a fractured granite boulder on the palm of the raised arm',()=>{
 const giant=createCreature({name:'stone giant',glyph:'H',color:'#888'});
 giant.g.updateMatrixWorld(true);
 let rock=null;giant.g.traverse(o=>{if(o.userData.part==='boulder')rock=o;});
 assert(rock,'the stone giant carries a boulder');
 assert(rock.geometry.attributes.color,'the boulder has baked granite colours');
 assert(!(rock.geometry instanceof THREE.DodecahedronGeometry),'no plain dodecahedron any more');
 for(const x of rock.geometry.attributes.position.array)assert(Number.isFinite(x));
 const box=new THREE.Box3().setFromObject(rock,true),hand=rock.parent.localToWorld(new THREE.Vector3(0,-.56,.03));
 assert(box.min.y>1.3&&box.max.y<2.1,`boulder spans ${box.min.y.toFixed(2)}..${box.max.y.toFixed(2)}`);
 assert(hand.distanceTo(rock.getWorldPosition(new THREE.Vector3()))<.24,'the hand touches the boulder');
});

test('mumakil and mastodons are tusked, trunked beasts baked into a few meshes, not rothe clones',()=>{
 const counts={};
 for(const name of ['mumak','mastodon']){
  const beast=createCreature({name,symbol:113,color:7});
  assert.equal(beast.g.name,name);assert.equal(beast.legs.length,4);assert(beast.head&&beast.trunk&&beast.tail&&beast.body,name);
  beast.g.updateMatrixWorld(true);let meshes=0;
  beast.g.traverse(part=>{if(!part.isMesh)return;meshes++;for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),name);});
  assert(meshes<=24,`${name} has ${meshes} meshes`);counts[name]=meshes;
  const bounds=new THREE.Box3().setFromObject(beast.g);
  assert(Math.abs(bounds.min.y)<.005,name);assert(bounds.max.y>1.1&&bounds.max.y<1.45,name);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.95,name);
  // the trunk hangs clear of the floor
  assert(new THREE.Box3().setFromObject(beast.trunk).min.y>.08,name);
 }
 assert(counts.mastodon>counts.mumak,'the mastodon adds shaggy hair');
 assert.notEqual(createCreature({name:'rothe',symbol:113}).g.name,'mumak');
});

test('titanotheres and baluchitheria are giant rhinos baked into a few meshes, not rothe clones',()=>{
 const heights={};
 for(const name of ['titanothere','baluchitherium']){
  const beast=createCreature({name,symbol:113,color:7});
  assert.equal(beast.g.name,name);assert.equal(beast.legs.length,4);assert(beast.head&&beast.tail&&beast.body,name);
  beast.g.updateMatrixWorld(true);let meshes=0;
  beast.g.traverse(part=>{if(!part.isMesh)return;meshes++;for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),name);});
  assert(meshes<=22,`${name} has ${meshes} meshes`);
  const bounds=new THREE.Box3().setFromObject(beast.g);
  assert(Math.abs(bounds.min.y)<.005,`${name} floor ${bounds.min.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.9,name);
  heights[name]=bounds.max.y;
 }
 assert(heights.titanothere>.9&&heights.titanothere<1.15,'the titanothere is low and massive');
 assert(heights.baluchitherium>1.25&&heights.baluchitherium<1.45,'the baluchitherium towers');
 assert.notEqual(createCreature({name:'leocrotta',symbol:113}).g.name,'titanothere');
});

test('leocrottas are maned, badger-headed stags with bone-lined jaws, not rothe clones',()=>{
 const beast=createCreature({name:'leocrotta',symbol:113,color:7});
 assert.equal(beast.g.name,'leocrotta');assert.equal(beast.legs.length,4);assert(beast.head&&beast.jaw&&beast.tail&&beast.body);
 beast.g.updateMatrixWorld(true);let meshes=0;
 beast.g.traverse(part=>{if(!part.isMesh)return;meshes++;for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));});
 assert(meshes<=22,`leocrotta has ${meshes} meshes`);
 const bounds=new THREE.Box3().setFromObject(beast.g);
 assert(Math.abs(bounds.min.y)<.005,`floor ${bounds.min.y}`);
 assert(bounds.max.y>.9&&bounds.max.y<1.25,`height ${bounds.max.y}`);
 assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.9);
});

test('wumpuses are squat, shaggy, sucker-footed beasts with a wide maw, not cyan rothes',()=>{
 const beast=createCreature({name:'wumpus',symbol:113,color:6});
 assert.equal(beast.g.name,'wumpus');assert.equal(beast.legs.length,4);assert(beast.head&&beast.jaw&&beast.tail&&beast.body);
 beast.g.updateMatrixWorld(true);const parts=[];let verts=0;
 beast.g.traverse(o=>{if(o.isMesh)parts.push(o);});
 assert.equal(parts.length,9,'one mesh per moving part plus the eyes');
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),key);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1);
 }
 assert(verts<30000,`${verts} vertices`);
 const bounds=new THREE.Box3().setFromObject(beast.g);
 assert(Math.abs(bounds.min.y)<.005,`floor ${bounds.min.y}`);
 assert(bounds.max.y>.55&&bounds.max.y<.8,`height ${bounds.max.y}`);
 assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.5,'fits the tile');
 // every sucker pad rests on the floor
 for(const leg of beast.legs)assert(Math.abs(new THREE.Box3().setFromObject(leg).min.y)<.005);
 const other=[];createCreature({name:'wumpus'}).g.traverse(o=>{if(o.isMesh)other.push(o);});
 assert.equal(other.filter(m=>m.material.vertexColors).length,8);
 assert.equal(parts.find(m=>m.material.vertexColors).material,other.find(m=>m.material.vertexColors).material,'shares its material');
 assert.equal(createCreature({name:'rothe',symbol:113,color:3}).g.name,'rothe');
});

test('rothes are shaggy, horned musk-ox grazers on cloven hooves, not horned canines',()=>{
 const beast=createCreature({name:'rothe',symbol:113,color:3});
 assert.equal(beast.g.name,'rothe');assert.equal(beast.legs.length,4);assert(beast.head&&beast.jaw&&beast.tail&&beast.body);
 beast.g.updateMatrixWorld(true);const parts=[];let verts=0;
 beast.g.traverse(o=>{if(o.isMesh)parts.push(o);});
 assert.equal(parts.length,9,'one mesh per moving part plus the eyes');
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),key);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1);
 }
 assert(verts<30000,`${verts} vertices`);
 const bounds=new THREE.Box3().setFromObject(beast.g);
 assert(Math.abs(bounds.min.y)<.005,`floor ${bounds.min.y}`);
 assert(bounds.max.y>.5&&bounds.max.y<.75,`height ${bounds.max.y}`);
 assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.5,'fits the tile');
 // every hoof rests on the floor, and the hair skirt stops above it
 for(const leg of beast.legs)assert(Math.abs(new THREE.Box3().setFromObject(leg).min.y)<.005);
 const skirt=new THREE.Box3().setFromObject(parts.find(m=>m.parent===beast.body));
 assert(skirt.min.y>.08,`skirt ${skirt.min.y}`);
 // an unnamed q falls back on the same beast in the glyph colour, sharing the material
 const other=createCreature({symbol:113,color:5}),meshes=[];other.g.traverse(o=>{if(o.isMesh&&o.material.vertexColors)meshes.push(o);});
 assert.equal(other.g.name,'rothe');assert.equal(meshes.length,8);
 assert.equal(meshes[0].material,parts.find(m=>m.material.vertexColors).material,'shares its material');
});

test('manes get their own hunched, wingless, rib-caged model instead of the tinted imp',()=>{
 const I=105,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const t0=performance.now(),manes=createCreature({name:'manes',symbol:I,color:1}),ms=performance.now()-t0;
 assert.equal(manes.quirk,'manes');
 for(const key of ['body','head','arm'])assert(manes[key]?.isObject3D,key);
 assert.equal(manes.legs.length,2);assert.equal(manes.arms.length,2);assert.equal(manes.wings.length,0);assert.equal(manes.tail,null);
 const parts=meshes(manes);
 assert.equal(parts.length,7,'one mesh per moving part plus the eyes');
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<30000,`${verts} vertices`);
 manes.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(manes.g);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>.6&&b.max.y<.85,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'fits the tile');
 // the talons hang low, well below the hips
 const hand=new THREE.Box3().setFromObject(manes.arm);
 assert(hand.min.y<.2&&hand.min.y>0,`talons at ${hand.min.y}`);
 const other=meshes(createCreature({name:'manes'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<1000,`took ${ms} ms`);
 assert.equal(createCreature({name:'imp',symbol:I,color:1}).quirk,'imp');
 assert.equal(createCreature({name:'homunculus',symbol:I,color:2}).quirk,'homunculus');
});

test('quasits get their own lean, wingless, barb-tailed model instead of the tinted imp',()=>{
 const I=105,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const t0=performance.now(),quasit=createCreature({name:'quasit',symbol:I,color:4}),ms=performance.now()-t0;
 assert.equal(quasit.quirk,'quasit');
 for(const key of ['body','head','arm','tail'])assert(quasit[key]?.isObject3D,key);
 assert.equal(quasit.legs.length,2);assert.equal(quasit.arms.length,2);assert.equal(quasit.wings.length,0);
 const parts=meshes(quasit);
 assert.equal(parts.length,8,'one mesh per moving part plus the eyes');
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<30000,`${verts} vertices`);
 quasit.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(quasit.g);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>.65&&b.max.y<.9,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'fits the tile');
 // the feet rest on the floor, the claws hang below the hips and the tail trails well behind
 for(const leg of quasit.legs){const l=new THREE.Box3().setFromObject(leg);assert(l.min.y>-.03&&l.min.y<.03,`foot at ${l.min.y}`);}
 const hand=new THREE.Box3().setFromObject(quasit.arm);
 assert(hand.min.y>.05&&hand.min.y<.25,`claws at ${hand.min.y}`);
 const tail=new THREE.Box3().setFromObject(quasit.tail);
 assert(tail.min.z<-.3,`tail reaches z ${tail.min.z}`);assert(tail.min.y>0,`tail at ${tail.min.y}`);
 const other=meshes(createCreature({name:'quasit'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<1000,`took ${ms} ms`);
 assert.equal(createCreature({name:'imp',symbol:I,color:1}).quirk,'imp');
});

test('lemures get their own slumped, melting, legless model instead of the tinted imp',()=>{
 const I=105,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const t0=performance.now(),lemure=createCreature({name:'lemure',symbol:I,color:3}),ms=performance.now()-t0;
 assert.equal(lemure.quirk,'lemure');
 for(const key of ['body','head','arm'])assert(lemure[key]?.isObject3D,key);
 assert.equal(lemure.legs.length,2);assert.equal(lemure.arms.length,2);assert.equal(lemure.wings.length,0);assert.equal(lemure.tail,null);
 const parts=meshes(lemure);
 assert.equal(parts.length,7,'one mesh per moving part plus the eyes');
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<30000,`${verts} vertices`);
 lemure.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(lemure.g);
 assert(b.min.y>-.03&&b.min.y<.03,`base at ${b.min.y}`);
 assert(b.max.y>.5&&b.max.y<.75,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'fits the tile');
 // the lobes sit on the ground and the hands reach out low in front
 for(const leg of lemure.legs){const l=new THREE.Box3().setFromObject(leg);assert(l.min.y>-.03&&l.min.y<.04,`lobe at ${l.min.y}`);}
 const hand=new THREE.Box3().setFromObject(lemure.arm);
 assert(hand.min.y>.03&&hand.min.y<.25,`hand at ${hand.min.y}`);assert(hand.max.z>.15,`hand reaches to z ${hand.max.z}`);
 const other=meshes(createCreature({name:'lemure'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<1000,`took ${ms} ms`);
 assert.equal(createCreature({name:'manes',symbol:I,color:1}).quirk,'manes');
});

test('mummies get their own linen-bound model instead of the strapped undead humanoid',()=>{
 const M=77,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const names=['kobold mummy','gnome mummy','orc mummy','dwarf mummy','elf mummy','human mummy','ettin mummy','giant mummy'];
 for(const name of names){
  const t0=performance.now(),mummy=createCreature({name,symbol:M,color:7}),ms=performance.now()-t0;
  assert.equal(mummy.quirk,'mummy',name);
  for(const key of ['body','head','arm'])assert(mummy[key]?.isObject3D,`${name} ${key}`);
  assert.equal(mummy.legs.length,2);assert.equal(mummy.arms.length,2);assert.equal(mummy.wings.length,0);assert.equal(mummy.tail,null);
  const parts=meshes(mummy),heads=name==='ettin mummy'?2:1;
  assert.equal(parts.length,5+2*heads,`${name}: one mesh per moving part plus the eyes`);
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
  }
  assert(verts<52000,`${name}: ${verts} vertices`);
  mummy.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(mummy.g),s=mummy.g.scale.y;
  assert(b.min.y>-.03*s&&b.min.y<.03*s,`${name}: feet at ${b.min.y}`);
  assert(b.max.y>1.05*s&&b.max.y<1.25*s,`${name}: top at ${b.max.y}`);
  // the arms reach forward, hands at about waist height
  const hand=new THREE.Box3().setFromObject(mummy.arm);
  assert(hand.max.z>.5*mummy.g.scale.z&&hand.max.z<.72*mummy.g.scale.z,`${name}: hand reaches to z ${hand.max.z}`);
  assert(hand.min.y>.3*s&&hand.min.y<.7*s,`${name}: hand (and its loose end) down to ${hand.min.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.8*mummy.g.scale.z,`${name} is out of proportion`);
  assert(ms<1000,`${name} took ${ms} ms`);
 }
 // geometry is shared; each species only picks its tint
 const a=meshes(createCreature({name:'human mummy'})),b=meshes(createCreature({name:'kobold mummy'}));
 a.forEach((m,i)=>assert.equal(m.geometry,b[i].geometry));
 assert.equal(a[0].material,meshes(createCreature({name:'orc mummy'}))[0].material);
 assert.notEqual(a[0].material,b[0].material);
 assert.equal(createCreature({name:'unknown thing',symbol:M,color:7}).quirk,'mummy');
});

test('zombies get their own rotting, ragged model instead of the tinted undead humanoid',()=>{
 const Z=90,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 for(const name of ['kobold zombie','gnome zombie','orc zombie','dwarf zombie','elf zombie','human zombie','ettin zombie','giant zombie']){
  const t0=performance.now(),zombie=createCreature({name,symbol:Z,color:7}),ms=performance.now()-t0;
  assert.equal(zombie.quirk,'zombie',name);
  for(const key of ['body','head','arm'])assert(zombie[key]?.isObject3D,`${name} ${key}`);
  assert.equal(zombie.legs.length,2);assert.equal(zombie.arms.length,2);assert.equal(zombie.wings.length,0);assert.equal(zombie.tail,null);
  const parts=meshes(zombie),heads=name==='ettin zombie'?2:1;
  assert.equal(parts.length,5+2*heads,`${name}: one mesh per moving part plus the eyes`);
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
  }
  assert(verts<30000,`${name}: ${verts} vertices`);
  zombie.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(zombie.g),s=zombie.g.scale.y;
  assert(b.min.y>-.03*s&&b.min.y<.03*s,`${name}: feet at ${b.min.y}`);
  assert(b.max.y>1.05*s&&b.max.y<1.3*s,`${name}: top at ${b.max.y}`);
  // one arm reaches out at chest height, the other hangs lower and shorter
  const right=new THREE.Box3().setFromObject(zombie.arm),left=new THREE.Box3().setFromObject(zombie.arms[0]);
  assert(right.max.z>.5*zombie.g.scale.z&&right.max.z<.72*zombie.g.scale.z,`${name}: hand reaches to z ${right.max.z}`);
  assert(left.min.y<right.min.y&&left.max.z<right.max.z,`${name}: the stripped arm hangs lower`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.8*zombie.g.scale.z,`${name} is out of proportion`);
  assert(ms<1000,`${name} took ${ms} ms`);
 }
 // geometry is cached per species, and every zombie shares one material
 const a=meshes(createCreature({name:'human zombie'})),b=meshes(createCreature({name:'human zombie'})),c=meshes(createCreature({name:'orc zombie'}));
 a.forEach((m,i)=>{assert.equal(m.geometry,b[i].geometry);assert.equal(m.material,c[i].material);});
 assert.notEqual(a[0].geometry,c[0].geometry);
 assert.equal(createCreature({name:'unknown thing',symbol:Z,color:7}).quirk,'zombie');
});

test('elves get their own slender, cloaked, sword-bearing model instead of the tinted human',()=>{
 const AT=64,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 for(const name of ['Woodland-elf','Green-elf','Grey-elf','elf-lord','Elvenking','High-elf']){
  const t0=performance.now(),elf=createCreature({name,symbol:AT,color:2}),ms=performance.now()-t0;
  assert.equal(elf.quirk,'elf',name);
  for(const key of ['body','head','arm','weaponSocket'])assert(elf[key]?.isObject3D,`${name} ${key}`);
  assert.equal(elf.legs.length,2);assert.equal(elf.arms.length,2);
  assert(elf.arm.children.includes(elf.weaponSocket),'the sword rides the sword arm');
  const parts=meshes(elf);
  assert.equal(parts.length,8,'one mesh per moving part, the eyes and the sword');
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
  }
  assert(verts<40000,`${name}: ${verts} vertices`);
  elf.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(elf.g);
  assert(b.min.y>-.03&&b.min.y<.03,`${name} feet at ${b.min.y}`);
  assert(b.max.y>1.05&&b.max.y<1.3,`${name} top at ${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.48,`${name} fits the tile: ${JSON.stringify(b)}`);
  const other=meshes(createCreature({name,symbol:AT}));
  parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
  assert(ms<1000,`${name} took ${ms} ms`);
 }
 // kinds share the material but not the (differently coloured) geometry
 const [wood,king]=['Woodland-elf','Elvenking'].map(n=>meshes(createCreature({name:n,symbol:AT})));
 assert.equal(wood[0].material,king[0].material);assert.notEqual(wood[0].geometry,king[0].geometry);
 assert.equal(createCreature({name:'watchman',symbol:AT,color:2}).quirk,'guard');
});

test('priests get a robed, mace-bearing model with a hood, mitre or tonsure per kind',()=>{
 const AT=64,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 for(const name of ['aligned priest','high priest','Arch Priest','priest','priestess','acolyte']){
  const t0=performance.now(),p=createCreature({name,symbol:AT,color:15}),ms=performance.now()-t0;
  assert.equal(p.quirk,'priest',name);
  for(const key of ['body','head','arm','weaponSocket'])assert(p[key]?.isObject3D,`${name} ${key}`);
  assert.equal(p.legs.length,2);assert.equal(p.arms.length,2);
  assert(p.arm.children.includes(p.weaponSocket),'the mace rides the mace arm');
  const parts=meshes(p);assert.equal(parts.length,7,name);
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
  }
  assert(verts<30000,`${name}: ${verts} vertices`);
  p.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(p.g);
  assert(b.min.y>-.03&&b.min.y<.03,`${name} feet at ${b.min.y}`);
  assert(b.max.y>1.05&&b.max.y<1.35,`${name} top at ${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.48,`${name} fits the tile: ${JSON.stringify(b)}`);
  assert(ms<1000,`${name} took ${ms} ms`);
 }
 const [temple,high]=['aligned priest','high priest'].map(n=>meshes(createCreature({name:n,symbol:AT})));
 assert.equal(temple[0].material,high[0].material);assert.notEqual(temple[0].geometry,high[0].geometry);
 assert.equal(temple[6].geometry,high[6].geometry,'one mace geometry for every priest');
});

test('the nurse gets a dress, apron, cap and syringe instead of the plain humanoid',()=>{
 const AT=64,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const t0=performance.now(),n=createCreature({name:'nurse',symbol:AT,color:15}),ms=performance.now()-t0;
 assert.equal(n.quirk,'nurse');
 for(const key of ['body','head','arm','weaponSocket'])assert(n[key]?.isObject3D,key);
 assert.equal(n.legs.length,2);assert.equal(n.arms.length,2);
 assert(n.arm.children.includes(n.weaponSocket),'the syringe rides the arm');
 const parts=meshes(n);assert.equal(parts.length,7);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<30000,`${verts} vertices`);
 n.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(n.g);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.05&&b.max.y<1.35,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.48,`fits the tile: ${JSON.stringify(b)}`);
 assert(ms<1000,`took ${ms} ms`);
 const again=meshes(createCreature({name:'nurse',symbol:AT,color:15}));
 assert.equal(again[0].geometry,parts[0].geometry,'geometry is shared');
});

test('shopkeepers get an apron, waistcoat, keys, purse, spectacles and a balance, the same in Live and the gallery',async()=>{
 const {createShopkeeper}=await import('./shop-visuals.js');
 const AT=64,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const t0=performance.now(),k=createCreature({name:'shopkeeper',symbol:AT,color:15}),ms=performance.now()-t0;
 assert.equal(k.quirk,'shopkeeper');
 for(const key of ['body','head','arm','weaponSocket'])assert(k[key]?.isObject3D,key);
 assert.equal(k.legs.length,2);assert.equal(k.arms.length,2);
 assert(k.arm.children.includes(k.weaponSocket),'the balance rides the arm');
 const parts=meshes(k);assert.equal(parts.length,7);
 assert.deepEqual(parts.map(m=>m.userData.part).sort(),['arm','balance','body','head','ledger arm','leg','leg']);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<30000,`${verts} vertices`);
 k.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(k.g);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.1&&b.max.y<1.35,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.48,`fits the tile: ${JSON.stringify(b)}`);
 assert(ms<1000,`took ${ms} ms`);
 // Live builds it through shop-visuals; it is the same shared model
 const live=createShopkeeper();
 assert.equal(meshes(live)[0].geometry,parts[0].geometry,'geometry is shared with Live');
 assert.equal(live.g.userData.dispose,undefined,'shared geometry is never disposed per actor');
 assert.equal(createCreature({name:'merchant',symbol:AT,color:15}).quirk,'shopkeeper');
});

test('Live builds watchmen from the shared watch model, not the old primitive guard',async()=>{
 const {createWatchman}=await import('./shop-visuals.js');
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const live=createWatchman(),gallery=createCreature({name:'watchman',symbol:64,color:2});
 assert.equal(live.kind,'watchman');assert.equal(live.quirk,'guard');
 for(const key of ['body','head','arm','weaponSocket','lantern'])assert(live[key]?.isObject3D,key);
 assert.equal(live.legs.length,2);
 const a=meshes(live),b=meshes(gallery);
 assert.equal(a.length,9);
 assert.deepEqual(a.map(m=>m.geometry),b.map(m=>m.geometry),'geometry is shared with the gallery');
 assert.equal(live.g.userData.dispose,undefined,'shared geometry is never disposed per actor');
 for(const m of a)for(const v of m.geometry.attributes.position.array)assert(Number.isFinite(v),m.userData.part);
 live.g.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(live.g);
 assert(box.min.y>-.05&&box.max.y>1&&box.max.y<1.8,JSON.stringify(box));
});

test('the watch get tabards, helmets and a halberd and lantern or a sword instead of the guard block',()=>{
 const AT=64,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const expect={watchman:{draws:9,weapon:'halberd',lantern:true},'watch captain':{draws:7,weapon:'sword',lantern:false}},built={};
 for(const [name,e] of Object.entries(expect)){
  const t0=performance.now(),w=createCreature({name,symbol:AT,color:2}),ms=performance.now()-t0;
  assert.equal(w.quirk,'guard');assert.equal(w.kind,name);
  for(const key of ['body','head','arm','weaponSocket'])assert(w[key]?.isObject3D,`${name} ${key}`);
  assert.equal(w.legs.length,2);assert.equal(w.arms.length,2);
  assert(w.arm.children.includes(w.weaponSocket),'the weapon rides the arm');
  assert.equal(!!w.lantern,e.lantern);if(w.lantern)assert(w.arms[0].children.includes(w.lantern),'the lantern hangs from the other hand');
  const parts=meshes(w);assert.equal(parts.length,e.draws,name);
  assert(parts.some(m=>m.userData.part===e.weapon),`${name} holds a ${e.weapon}`);
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,`${name} ${m.userData.part}`);
  }
  assert(verts<40000,`${name}: ${verts} vertices`);
  w.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(w.g);
  assert(b.min.y>-.03&&b.min.y<.03,`${name} feet at ${b.min.y}`);
  assert(b.max.y>1.1&&b.max.y<1.5,`${name} top at ${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.48,`${name} fits the tile: ${JSON.stringify(b)}`);
  assert(ms<1000,`${name} took ${ms} ms`);
  const again=meshes(createCreature({name,symbol:AT,color:2}));
  assert.equal(again[0].geometry,parts[0].geometry,'geometry is shared');
  built[name]=parts;
 }
 assert.equal(built.watchman[0].material,built['watch captain'][0].material);
 assert.notEqual(built.watchman[0].geometry,built['watch captain'][0].geometry);
 assert.equal(createCreature({name:'soldier',symbol:AT,color:8}).quirk,'guard');
});

test('soldiers and guards get livery gambesons, cuirasses, rank helmets and a spear and shield or a sword',()=>{
 const AT=64,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const expect={soldier:{draws:8,weapon:'spear'},guard:{draws:8,weapon:'spear'},'prison guard':{draws:8,weapon:'spear'},sergeant:{draws:8,weapon:'sword'},lieutenant:{draws:7,weapon:'sword'},captain:{draws:7,weapon:'longsword'}},built={};
 for(const [name,e] of Object.entries(expect)){
  const t0=performance.now(),w=createCreature({name,symbol:AT,color:7}),ms=performance.now()-t0;
  assert.equal(w.quirk,'guard');assert.equal(w.kind,name);
  for(const key of ['body','head','arm','weaponSocket','shieldArm'])assert(w[key]?.isObject3D,`${name} ${key}`);
  assert.equal(w.legs.length,2);assert.equal(w.arms.length,2);
  assert(w.arm.children.includes(w.weaponSocket),'the weapon rides the arm');
  assert.equal(w.shieldArm,w.arms[0]);assert.equal(w.shieldArm.rotation.z,0,'the shield arm rests straight');
  assert.equal(!!w.shield,e.draws===8);if(w.shield)assert(w.arms[0].children.includes(w.shield),'the shield is on the off arm');
  const parts=meshes(w);assert.equal(parts.length,e.draws,name);
  assert(parts.some(m=>m.userData.part===e.weapon),`${name} holds a ${e.weapon}`);
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   for(const v of a.color.array)assert(v>=0&&v<=1,`${name} ${m.userData.part}`);
  }
  assert(verts<40000,`${name}: ${verts} vertices`);
  w.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(w.g);
  assert(b.min.y>-.03&&b.min.y<.03,`${name} feet at ${b.min.y}`);
  assert(b.max.y>1.1&&b.max.y<1.5,`${name} top at ${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.48,`${name} fits the tile: ${JSON.stringify(b)}`);
  assert(ms<1000,`${name} took ${ms} ms`);
  const again=meshes(createCreature({name,symbol:AT,color:7}));
  assert.equal(again[0].geometry,parts[0].geometry,'geometry is shared');
  built[name]=parts;
 }
 assert.equal(built.soldier[0].material,built.captain[0].material,'one material for every rank');
 assert.notEqual(built.soldier[1].geometry,built.lieutenant[1].geometry,'ranks wear different helmets');
 assert.equal(createCreature({name:'soldier ant',symbol:97,color:4}).kind,undefined,'soldier ants stay insects');
});

test('each mold is its own lobed colony with a kind-specific accent instead of the shared fungus mound',()=>{
 const F=70,accents={yellow:'spores',green:'acid',brown:'rime',red:'embers'},colours={yellow:3,green:2,brown:3,red:1};
 const bounds={};
 for(const kind of Object.keys(accents)){
  const t0=performance.now(),m=createCreature({name:`${kind} mold`,symbol:F,color:colours[kind]}),ms=performance.now()-t0;
  assert.equal(m.quirk,'fungus');assert.equal(m.kind,kind);assert(m.body?.isObject3D);
  const parts=[];m.g.traverse(o=>{if(o.isMesh)parts.push(o);});
  assert.deepEqual(parts.map(p=>p.userData.part),['colony',accents[kind]],'two draws');
  let verts=0;
  for(const p of parts){
   const a=p.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${kind} ${p.userData.part} ${key}`);
   for(const v of a.color.array)assert(v>=0&&v<=1,`${kind} colour`);
  }
  assert(verts<30000,`${kind}: ${verts} vertices`);
  m.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(m.g);bounds[kind]=b;
  assert(b.min.y>-.005&&b.min.y<.01,`${kind} sits on the floor at ${b.min.y}`);
  assert(b.max.y>.18&&b.max.y<.4,`${kind} top at ${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,`${kind} fits the tile`);
  // geometry and materials are shared between molds of a kind
  const again=[];createCreature({name:`${kind} mold`,symbol:F}).g.traverse(o=>{if(o.isMesh)again.push(o);});
  parts.forEach((p,i)=>{assert.equal(p.geometry,again[i].geometry);assert.equal(p.material,again[i].material);});
  assert(ms<1000,`${kind} took ${ms} ms`);
 }
 // the rime and sporangia stand proud of the bare colony, and the embers glow
 const red=[];createCreature({name:'red mold',symbol:F}).g.traverse(o=>{if(o.isMesh)red.push(o);});
 assert(red[1].material.emissiveIntensity>1);
 // an unlisted mold still gets a colony in its glyph colour, with no accent
 const odd=createCreature({name:'blue mold',symbol:F,color:4});
 const oddParts=[];odd.g.traverse(o=>{if(o.isMesh)oddParts.push(o);});
 assert.equal(oddParts.length,1);assert.equal(odd.quirk,'fungus');
});

test('shriekers and violet fungi are their own merged mushrooms instead of the primitive cap and stalk',()=>{
 const F=70,accents={shrieker:'throat','violet fungus':'tendrils'};
 const tops={};
 for(const name of Object.keys(accents)){
  const t0=performance.now(),m=createCreature({name,symbol:F,color:5}),ms=performance.now()-t0;
  assert.equal(m.quirk,'fungus');assert.equal(m.kind,name);assert(m.body?.isObject3D);
  const parts=[];m.g.traverse(o=>{if(o.isMesh)parts.push(o);});
  assert.deepEqual(parts.map(p=>p.userData.part),['fungus',accents[name]],'two draws');
  let verts=0;
  for(const p of parts){
   const a=p.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${p.userData.part} ${key}`);
   for(const v of a.color.array)assert(v>=0&&v<=1,`${name} colour`);
  }
  assert(verts<40000,`${name}: ${verts} vertices`);
  m.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(m.g);tops[name]=b.max.y;
  assert(b.min.y>-.01&&b.min.y<.01,`${name} sits on the floor at ${b.min.y}`);
  assert(b.max.y>.4&&b.max.y<.65,`${name} top at ${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,`${name} fits the tile`);
  const again=[];createCreature({name,symbol:F}).g.traverse(o=>{if(o.isMesh)again.push(o);});
  parts.forEach((p,i)=>{assert.equal(p.geometry,again[i].geometry);assert.equal(p.material,again[i].material);});
  assert(ms<1000,`${name} took ${ms} ms`);
 }
 // the shrieker's throat glows; the violet fungus's tendrils reach well past its cap
 const sh=[];createCreature({name:'shrieker',symbol:F}).g.traverse(o=>{if(o.isMesh)sh.push(o);});
 assert(sh[1].material.emissiveIntensity>.5);
 const vf=[];createCreature({name:'violet fungus',symbol:F}).g.traverse(o=>{if(o.isMesh)vf.push(o);});
 vf[1].geometry.computeBoundingBox();const tb=vf[1].geometry.boundingBox;
 assert(Math.max(-tb.min.x,tb.max.x,-tb.min.z,tb.max.z)>.38,'tendrils reach out');
 assert(tb.min.y<.02,'tendrils touch the floor');
});

test('the lichen is a leafy rosette with cups and fruiting discs instead of the sphere crust',()=>{
 const F=70,t0=performance.now(),m=createCreature({name:'lichen',symbol:F,color:10}),ms=performance.now()-t0;
 assert.equal(m.quirk,'fungus');assert.equal(m.kind,'lichen');assert(m.body?.isObject3D);
 const parts=[];m.g.traverse(o=>{if(o.isMesh)parts.push(o);});
 assert.deepEqual(parts.map(p=>p.userData.part),['thallus','fruit'],'two draws');
 let verts=0;
 for(const p of parts){
  const a=p.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${p.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,'colour');
 }
 assert(verts<40000,`${verts} vertices`);
 m.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(m.g);
 assert(b.min.y>-.005&&b.min.y<.01,`sits on the floor at ${b.min.y}`);
 assert(b.max.y>.12&&b.max.y<.25,`low crust, top at ${b.max.y}`);
 const reach=Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z);
 assert(reach>.3&&reach<.5,`spreads across the tile but fits it: ${reach}`);
 const again=[];createCreature({name:'lichen',symbol:F}).g.traverse(o=>{if(o.isMesh)again.push(o);});
 parts.forEach((p,i)=>{assert.equal(p.geometry,again[i].geometry);assert.equal(p.material,again[i].material);});
 assert(parts[1].material.roughness<parts[0].material.roughness,'the discs and beads are glossier than the thallus');
 assert(ms<1000,`took ${ms} ms`);
});

test('ghosts and shades get their own sheeted, floating model instead of the guardian box',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const t0=performance.now(),ghost=createCreature({name:'ghost',symbol:32,color:7}),ms=performance.now()-t0;
 assert.equal(ghost.quirk,'hover');
 for(const key of ['body','head','arm'])assert(ghost[key]?.isObject3D,key);
 assert.equal(ghost.arms.length,2);assert.equal(ghost.legs.length,0);assert.equal(ghost.wings.length,0);assert.equal(ghost.tail,null);
 const parts=meshes(ghost);
 assert.equal(parts.length,6,'body, head, face, eyes and two sleeves');
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
  for(let i=0;i<a.normal.count;i++)assert(Math.abs(Math.hypot(a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i))-1)<1e-3,`${m.userData.part} normal`);
  assert.equal(m.castShadow,false,'a ghost casts no shadow');
 }
 assert(verts<20000,`${verts} vertices`);
 ghost.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(ghost.g);
 assert(b.min.y>.02&&b.min.y<.15,`hem at ${b.min.y}`);
 assert(b.max.y>1&&b.max.y<1.2,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'fits the tile');
 // the sleeves reach out in front of the chest
 const sleeve=new THREE.Box3().setFromObject(ghost.arm);
 assert(sleeve.max.z>.25,`sleeve reaches ${sleeve.max.z}`);
 const sheet=parts.find(m=>m.userData.part==='body').material;
 assert(sheet.transparent&&sheet.opacity<1,'translucent');
 const shade=meshes(createCreature({name:'shade',symbol:32,color:0}));
 parts.forEach((m,i)=>assert.equal(m.geometry,shade[i].geometry));
 assert.notEqual(shade[0].material,sheet,'the shade has its own dim material');
 assert(shade[0].material.color.getHSL({}).l<sheet.color.getHSL({}).l,'the shade is darker');
 const again=meshes(createCreature({name:'ghost'}));
 parts.forEach((m,i)=>assert.equal(m.material,again[i].material));
 assert(ms<1000,`took ${ms} ms`);
});

test('hobbits get their own curly-haired, waistcoated, bare-footed model instead of the short humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const hobbit=createCreature({name:'hobbit',symbol:104,color:2});
 assert.equal(hobbit.quirk,'hobbit');
 for(const key of ['body','head','arm','weaponSocket'])assert(hobbit[key]?.isObject3D,key);
 assert.equal(hobbit.legs.length,2);assert.equal(hobbit.arms.length,2);assert.equal(hobbit.arm,hobbit.arms[1]);
 assert.equal(hobbit.hat,null);assert.equal(hobbit.beard,null);assert.equal(hobbit.pick,null);
 const parts=meshes(hobbit);
 assert.equal(parts.length,6,'one mesh per moving part');
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<30000,`${verts} vertices`);
 hobbit.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(hobbit.g);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>.95&&b.max.y<1.15,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'out of proportion');
 // the two feet mirror each other, and share the one material
 const [l,r]=hobbit.legs.map(leg=>new THREE.Box3().setFromObject(leg));
 assert(Math.abs((l.min.x+l.max.x)/2+(r.min.x+r.max.x)/2)<1e-6,'feet mirrored');
 const again=meshes(createCreature({name:'hobbit'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,again[i].geometry);assert.equal(m.material,parts[0].material);});
});

test('valkyries get a winged-helmed, braided, mail-clad shieldmaiden model instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const valk=createCreature({name:'valkyrie',symbol:64,color:7});
 assert.equal(valk.kind,'valkyrie');assert.equal(valk.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','shieldArm','shield'])assert(valk[key]?.isObject3D,key);
 assert.equal(valk.legs.length,2);assert.equal(valk.arms.length,2);assert.equal(valk.arm,valk.arms[1]);assert.equal(valk.shieldArm,valk.arms[0]);
 assert(valk.shieldArm.children.includes(valk.shield),'the shield rides the off arm');
 const parts=meshes(valk);
 assert.equal(parts.length,8,'one mesh per moving part, the sword and the shield');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<50000,`${verts} vertices`);
 valk.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(valk.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.15&&b.max.y<1.35,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.4,'out of proportion');
 // the helm's wings are the top of the model, and the shield hangs outside the left arm
 assert(new THREE.Box3().setFromObject(valk.head,true).max.y>b.max.y-1e-6,'wings on top');
 assert(new THREE.Box3().setFromObject(valk.shield,true).max.x<-.2,'shield outside the left arm');
 // any other player-monster role still gets the generic humanoid
 assert.equal(createCreature({name:'tourist',symbol:64,color:7}).kind,undefined);
 const again=meshes(createCreature({name:'valkyrie'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('samurai get a kabuto-helmed, lacquered o-yoroi model with a katana instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const sam=createCreature({name:'samurai',symbol:64,color:1});
 assert.equal(sam.kind,'samurai');assert.equal(sam.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket'])assert(sam[key]?.isObject3D,key);
 assert.equal(sam.legs.length,2);assert.equal(sam.arms.length,2);assert.equal(sam.arm,sam.arms[1]);
 assert(sam.arm.children.includes(sam.weaponSocket),'the katana is in the right hand');
 const parts=meshes(sam);
 assert.equal(parts.length,7,'one mesh per moving part and the katana');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<56000,`${verts} vertices`);
 sam.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(sam.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.2&&b.max.y<1.35,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'out of proportion');
 // the crescent maedate is the top of the model, and the katana is raised above the hand
 assert(new THREE.Box3().setFromObject(sam.head,true).max.y>b.max.y-1e-6,'crest on top');
 assert(new THREE.Box3().setFromObject(sam.weaponSocket,true).max.y>1,'katana raised');
 // the sode plates hang on the outside of each arm, so the two arms are mirrored builds
 const [l,r]=sam.arms.map(a=>new THREE.Box3().setFromObject(a,true));
 assert(l.min.x<-.3&&r.max.x>.3,'sode outside the shoulders');
 const again=meshes(createCreature({name:'samurai'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('knights get a great-helmed, plumed, surcoated model with an arming sword and a blazoned heater shield instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const kn=createCreature({name:'knight',symbol:64,color:7});
 assert.equal(kn.kind,'knight');assert.equal(kn.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','shieldArm','shield'])assert(kn[key]?.isObject3D,key);
 assert.equal(kn.legs.length,2);assert.equal(kn.arms.length,2);assert.equal(kn.arm,kn.arms[1]);assert.equal(kn.shieldArm,kn.arms[0]);
 assert(kn.arm.children.includes(kn.weaponSocket),'the sword is in the right hand');
 assert(kn.shieldArm.children.includes(kn.shield),'the shield rides the off arm');
 const parts=meshes(kn);
 assert.equal(parts.length,8,'one mesh per moving part, the sword and the shield');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<50000,`${verts} vertices`);
 kn.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(kn.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.25&&b.max.y<1.4,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'out of proportion');
 // the plume is the top of the model, the sword is raised, and the shield hangs outside the left arm
 assert(new THREE.Box3().setFromObject(kn.head,true).max.y>b.max.y-1e-6,'plume on top');
 assert(new THREE.Box3().setFromObject(kn.weaponSocket,true).max.y>1,'sword raised');
 assert(new THREE.Box3().setFromObject(kn.shield,true).max.x<-.2,'shield outside the left arm');
 const again=meshes(createCreature({name:'knight'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('wizards get a robed, bearded model with a starry pointed hat and an orb-topped quarterstaff instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const wz=createCreature({name:'wizard',symbol:64,color:12});
 assert.equal(wz.kind,'wizard');assert.equal(wz.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','orb'])assert(wz[key]?.isObject3D,key);
 assert.equal(wz.legs.length,2);assert.equal(wz.arms.length,2);assert.equal(wz.arm,wz.arms[1]);
 assert(wz.arm.children.includes(wz.weaponSocket),'the staff is in the right hand');
 const parts=meshes(wz);
 assert.equal(parts.length,8,'one mesh per moving part, the staff and the orb');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(m!==wz.orb)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<50000,`${verts} vertices`);
 wz.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(wz.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.3&&b.max.y<1.6,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'out of proportion');
 // the hat rises above the face, the orb tops the staff above the hat brim, and the staff
 // reaches down towards the floor without going through it
 const head=new THREE.Box3().setFromObject(wz.head,true);
 assert(head.max.y>1.35,`hat top at ${head.max.y}`);
 const orb=new THREE.Box3().setFromObject(wz.orb,true),staff=new THREE.Box3().setFromObject(wz.weaponSocket,true);
 assert(orb.max.y>=staff.max.y-.02&&orb.min.y>1.2,'orb on top of the staff');
 assert(staff.min.y>0&&staff.min.y<.12,`staff foot at ${staff.min.y}`);
 const again=meshes(createCreature({name:'wizard'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('monks get a shaven-headed, saffron-robed martial artist with prayer beads and bare fists instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const mk=createCreature({name:'monk',symbol:64,color:3});
 assert.equal(mk.kind,'monk');assert.equal(mk.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket'])assert(mk[key]?.isObject3D,key);
 assert.equal(mk.legs.length,2);assert.equal(mk.arms.length,2);assert.equal(mk.arm,mk.arms[1]);
 assert(mk.arm.children.includes(mk.weaponSocket),'the socket is at the right fist');
 assert.equal(mk.weaponSocket.children.length,0,'monks fight unarmed');
 const parts=meshes(mk);
 assert.equal(parts.length,6,'one mesh per moving part');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 mk.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(mk.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.1&&b.max.y<1.2,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.4,'out of proportion');
 const again=meshes(createCreature({name:'monk'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('archeologists get a fedora, an open leather jacket, a satchel, a coiled whip and a pick-axe instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const ar=createCreature({name:'archeologist',symbol:64,color:3});
 assert.equal(ar.kind,'archeologist');assert.equal(ar.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket'])assert(ar[key]?.isObject3D,key);
 assert.equal(ar.legs.length,2);assert.equal(ar.arms.length,2);assert.equal(ar.arm,ar.arms[1]);
 assert(ar.arm.children.includes(ar.weaponSocket),'the socket is at the right hand');
 assert.equal(ar.weaponSocket.children.length,1,'the pick-axe is held');
 assert.equal(ar.pick,null,'the dwarf digging handle stays unused');
 const parts=meshes(ar);
 assert.equal(parts.length,7,'one mesh per moving part and the pick-axe');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 ar.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(ar.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.2&&b.max.y<1.35,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 const pick=new THREE.Box3().setFromObject(ar.weaponSocket,true);
 assert(pick.max.z>.2,`pick-axe held forward (${pick.max.z})`);
 const again=meshes(createCreature({name:'archeologist'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('rogues get a deep hood, a black mask, a torn cloak and mantle, a bandolier of knives and a toothed dagger instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const ro=createCreature({name:'rogue',symbol:64,color:1});
 assert.equal(ro.kind,'rogue');assert.equal(ro.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket'])assert(ro[key]?.isObject3D,key);
 assert.equal(ro.legs.length,2);assert.equal(ro.arms.length,2);assert.equal(ro.arm,ro.arms[1]);
 assert(ro.arm.children.includes(ro.weaponSocket),'the socket is at the right hand');
 assert.equal(ro.weaponSocket.children.length,1,'the dagger is held');
 const parts=meshes(ro);
 assert.equal(parts.length,7,'one mesh per moving part and the dagger');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 ro.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(ro.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.15&&b.max.y<1.3,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'out of proportion');
 // the cloak's torn hem hangs below the knees behind, but stays off the floor
 const body=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='body'),true);
 assert(body.min.y>.12&&body.min.y<.26,`cloak hem at ${body.min.y}`);
 const again=meshes(createCreature({name:'rogue'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('barbarians get a horned iron cap, ash war paint, braided beard, wolf-pelt mantle, ring mail, spiked bracers and a notched great axe instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const ba=createCreature({name:'barbarian',symbol:64,color:1});
 assert.equal(ba.kind,'barbarian');assert.equal(ba.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket'])assert(ba[key]?.isObject3D,key);
 assert.equal(ba.legs.length,2);assert.equal(ba.arms.length,2);assert.equal(ba.arm,ba.arms[1]);
 assert(ba.arm.children.includes(ba.weaponSocket),'the socket is at the right hand');
 assert.equal(ba.weaponSocket.children.length,1,'the axe is held');
 const parts=meshes(ba);
 assert.equal(parts.length,7,'one mesh per moving part and the axe');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 ba.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(ba.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.2&&b.max.y<1.35,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'out of proportion');
 // the horns stand above the cap, and the axe head rises past the shoulder, held forward
 const head=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='head'),true);
 assert(head.max.y>1.25,`horn tips at ${head.max.y}`);
 const axe=new THREE.Box3().setFromObject(ba.weaponSocket,true);
 assert(axe.max.y>.9&&axe.max.z>.25,`axe head at y ${axe.max.y}, z ${axe.max.z}`);
 const again=meshes(createCreature({name:'barbarian'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('healers get a plague doctor\'s beaked mask with green glass eyes, a wide brim, a torn waxed coat, a stained apron, vials and a serpent staff instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const he=createCreature({name:'healer',symbol:64,color:7});
 assert.equal(he.kind,'healer');assert.equal(he.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket'])assert(he[key]?.isObject3D,key);
 assert.equal(he.legs.length,2);assert.equal(he.arms.length,2);assert.equal(he.arm,he.arms[1]);
 assert(he.arm.children.includes(he.weaponSocket),'the socket is at the right hand');
 assert.equal(he.weaponSocket.children.length,1,'the staff is held');
 const parts=meshes(he);
 assert.equal(parts.length,7,'one mesh per moving part and the staff');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 he.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(he.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.15&&b.max.y<1.35,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'out of proportion');
 // the beak juts well forward of the face, and the coat's torn hem hangs low but off the floor
 const head=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='head'),true);
 assert(head.max.z>.22,`beak tip at z ${head.max.z}`);
 const body=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='body'),true);
 assert(body.min.y>.03&&body.min.y<.12,`coat hem at ${body.min.y}`);
 const staff=new THREE.Box3().setFromObject(he.weaponSocket,true);
 assert(staff.max.y>1,`serpent head at ${staff.max.y}`);
 const again=meshes(createCreature({name:'healer'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('the hezrou gets its own hunched, warty, fanged toad demon with a hinged jaw instead of the generic demon with a toad head',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const hz=createCreature({name:'hezrou',symbol:38,color:2});
 assert.equal(hz.kind,'hezrou');
 for(const key of ['body','head','jaw','arm'])assert(hz[key]?.isObject3D,key);
 assert.equal(hz.legs.length,2);assert.equal(hz.arms.length,2);
 assert(hz.head.children.includes(hz.jaw),'the jaw hinges from the head');
 const parts=meshes(hz);
 assert.equal(parts.length,8,'body, head, eyes, jaw, two legs, two arms');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
 }
 assert(verts<60000,`${verts} vertices`);
 hz.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(hz.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.05&&b.max.y<1.35,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // hunched: the head hangs forward of the body, no higher than the hump and its spines
 const head=new THREE.Box3().setFromObject(hz.head,true);
 assert(head.max.z>b.max.z-.02,'the head leads');
 // the hands hang low, near the knees
 assert(new THREE.Box3().setFromObject(hz.arms[1],true).min.y<.35,'long arms');
 // the bite opens the maw: dropping the jaw moves its teeth down and away from the upper fangs
 const before=new THREE.Box3().setFromObject(hz.jaw,true).min.y;
 hz.jaw.rotation.x+=.5;hz.g.updateMatrixWorld(true);
 assert(new THREE.Box3().setFromObject(hz.jaw,true).min.y<before-.02,'the jaw drops open');
 // the old toad-headed build is gone, and other demons still use it
 assert.equal(createCreature({name:'nalfeshnee',symbol:38}).kind,undefined);
 const again=meshes(createCreature({name:'hezrou'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('material golems are hunched, jagged constructs with a pulsing core, clawed arms and their own material details',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const kinds=['wax','rope','gold','leather','wood','flesh','clay','stone','glass','iron','ice','crystal ice'];
 const verts={};
 for(const kind of kinds){
  const a=createCreature({name:`${kind} golem`,symbol:39,color:7});
  assert.equal(a.quirk,'golem',kind);
  for(const key of ['body','head','arm','core'])assert(a[key]?.isObject3D,`${kind} ${key}`);
  assert.equal(a.legs.length,2);assert.equal(a.arms.length,2);
  assert(a.core.material.emissiveIntensity>0,'the core glows (live.js pulses it)');
  const parts=meshes(a);assert.equal(parts.length,8,kind);
  verts[kind]=0;
  for(const m of parts){const at=m.geometry.attributes;verts[kind]+=at.position.count;for(const key of ['position','normal'])for(const v of at[key].array)assert(Number.isFinite(v),`${kind} ${m.userData.part} ${key}`);}
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g,true);
  assert(Math.abs(b.min.y)<.02,`${kind} feet at ${b.min.y}`);
  assert(b.max.y>1.1&&b.max.y<1.6,`${kind} top at ${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.8,`${kind} out of proportion`);
  // hunched and long-armed: the head sits low and forward, the fists hang near the knees
  const head=new THREE.Box3().setFromObject(a.head,true),hand=new THREE.Box3().setFromObject(a.arms[1],true);
  assert(head.max.y<b.max.y+1e-6&&head.getCenter(new THREE.Vector3()).z>.1,`${kind} head hangs forward`);
  assert(hand.min.y<.35,`${kind} fists at ${hand.min.y}`);
  // faceted, not smooth: many neighbouring face normals disagree sharply
  const n=parts[0].geometry.attributes.normal;let sharp=0;
  for(let i=0;i+3<n.count;i+=3)if(n.getX(i)*n.getX(i+3)+n.getY(i)*n.getY(i+3)+n.getZ(i)*n.getZ(i+3)<.9)sharp++;
  assert(sharp>n.count/3*.2,`${kind} is jagged (${sharp})`);
  const again=meshes(createCreature({name:`${kind} golem`}));
  parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
 }
 // the materials differ: see-through glass and ice, metal iron and gold, and extra details
 const mat=k=>meshes(createCreature({name:`${k} golem`}))[0].material;
 assert(mat('glass').transparent&&mat('ice').transparent&&!mat('stone').transparent);
 assert(mat('iron').metalness>.5&&mat('gold').metalness>.5&&mat('clay').metalness<.1);
 assert(verts.flesh>verts.clay&&verts.wax>verts.clay&&verts.iron>verts.clay,'stitches, drips and rivets add detail');
 assert.notEqual(meshes(createCreature({name:'clay golem'}))[1].material.color.getHex(),meshes(createCreature({name:'glass golem'}))[1].material.color.getHex());
});

test('the gelatinous cube holds skulls, bones and a rusted dagger, not coloured balls',()=>{
 const cube=createCreature({name:'gelatinous cube',symbol:98,color:6});
 const parts=[];cube.g.traverse(o=>{if(o.isMesh)parts.push(o);});
 assert.equal(parts.length,2,'the jelly and one merged mesh of remains');
 const jelly=parts.find(m=>m.material.transparent),remains=parts.find(m=>m.userData.part==='remains');
 assert(jelly&&remains&&jelly.material.opacity<.6);
 for(const v of remains.geometry.attributes.position.array)assert(Number.isFinite(v));
 cube.g.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(jelly,true),inside=new THREE.Box3().setFromObject(remains,true);
 assert(box.containsBox(inside),'everything floats inside the jelly');
 // bone-coloured and plenty of it, with dark eye sockets
 const c=remains.geometry.attributes.color;let bone=0,dark=0;
 for(let i=0;i<c.count;i++){const r=c.getX(i),g=c.getY(i),b=c.getZ(i);if(r>.5&&g>.45&&b>.3&&r-b<.35)bone++;if(r<.05&&g<.05)dark++;}
 assert(bone>1500&&dark>100,`bone ${bone}, sockets ${dark}`);
});

test('mind flayers get a merged robed illithid model with a ridged cranium, glowing eyes and swaying face tentacles',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const tops={};
 for(const name of ['mind flayer','master mind flayer']){
  const flayer=createCreature({name,symbol:104,color:5});
  for(const key of ['body','head','tail','arm','weaponSocket'])assert(flayer[key]?.isObject3D,`${name} ${key}`);
  assert.equal(flayer.legs.length,2,name);assert.equal(flayer.arms.length,2,name);assert.equal(flayer.arm,flayer.arms[1],name);
  // the tentacles sway from the mouth and follow the head
  assert(flayer.head.children.includes(flayer.tail),name);
  const parts=meshes(flayer);
  assert.equal(parts.length,8,`${name}: one mesh per moving part plus the eyes`);
  assert.equal(new Set(parts.map(m=>m.material)).size,2,name);
  assert(parts.find(m=>m.userData.part==='eyes').material.emissiveIntensity>1,`${name} eyes glow`);
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
  }
  assert(verts<45000,`${name}: ${verts} vertices`);
  flayer.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(flayer.g);
  assert(b.min.y>-.03&&b.min.y<.03,`${name} feet at ${b.min.y}`);
  assert(b.max.y>1.3&&b.max.y<1.75,`${name} top at ${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,`${name} out of proportion`);
  const t=new THREE.Box3().setFromObject(flayer.tail);
  assert(t.min.y>.6&&t.max.z>b.max.z-.01,`${name} tentacles hang in front of the chest`);
  tops[name]=b.max.y;
  const again=meshes(createCreature({name}));
  parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry,name));
 }
 assert(tops['master mind flayer']>tops['mind flayer'],'masters stand taller');
});

test('centaurs stand on the horse body with a human torso, arms and their own weapon, in few draw calls',()=>{
 const tops=new Set();
 for(const name of ['plains centaur','forest centaur','mountain centaur',null]){
  const actor=createCreature(name?{name,symbol:67,color:3}:{symbol:67,color:2,kind:'monster'});
  const label=name||'unnamed C';
  assert.equal(actor.g.name,'centaur',label);assert.equal(actor.legs.length,4,label);assert(actor.tail&&actor.head&&actor.arm&&actor.weaponSocket,label);
  assert.equal(actor.arms.length,2,label);
  actor.g.updateMatrixWorld(true);let meshes=0;
  actor.g.traverse(part=>{if(part.geometry){meshes++;for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),label);}});
  assert(meshes<=40,`${label}: ${meshes} meshes`);
  const bounds=new THREE.Box3().setFromObject(actor.g,true);
  assert(Math.abs(bounds.min.y)<.02,`${label}: grounded (${bounds.min.y})`);assert(bounds.max.y<1.6,`${label}: ${bounds.max.y}`);assert(Math.max(-bounds.min.z,bounds.max.z,-bounds.min.x,bounds.max.x)<.85,label);
  const head=actor.head.getWorldPosition(new THREE.Vector3());assert(head.y>1.05*actor.g.scale.y,`${label}: the head rides above the horse`);
  if(name)tops.add(actor.weaponSocket.children.length+':'+bounds.max.y.toFixed(2));
 }
 assert.equal(tops.size,3,'each kind carries something different');
});

test('heavy monsters merge their static parts but keep every animated handle attached',()=>{
 const counts={'wood nymph':40,Angel:30,'shimmering dragon':40,marilith:25,'Kop Kaptain':25,gremlin:20,'lurker above':15,'electric eel':15};
 for(const [name,most] of Object.entries(counts)){
  const actor=createCreature({name});let meshes=0;actor.g.traverse(o=>{if(o.isMesh)meshes++;});
  assert(meshes<=most,`${name}: ${meshes} meshes`);
  const inTree=o=>{for(let p=o;p;p=p.parent)if(p===actor.g)return true;return false;};
  const check=(v,deep)=>{if(!v||typeof v!=='object')return;if(v.isObject3D){assert(inTree(v),name);return;}if(deep)for(const w of Object.values(v))check(w,false);};
  for(const v of [...Object.values(actor),...Object.values(actor.g.userData)])check(v,true);
  for(const leg of actor.legs)assert(inTree(leg),name);
 }
});

test('the ghoul gets its own crouched, clawed corpse-eater instead of the human zombie',()=>{
 const Z=90,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const t0=performance.now(),ghoul=createCreature({name:'ghoul',symbol:Z,color:0}),ms=performance.now()-t0;
 assert.equal(ghoul.quirk,'zombie');
 for(const key of ['body','head','arm'])assert(ghoul[key]?.isObject3D,key);
 assert.equal(ghoul.legs.length,2);assert.equal(ghoul.arms.length,2);assert(ghoul.arms.includes(ghoul.arm));
 assert.equal(ghoul.wings.length,0);assert.equal(ghoul.tail,null);
 const parts=meshes(ghoul);
 assert.equal(parts.length,7,'one mesh per moving part plus the eyes');
 assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['arm','body','eyes','head','leg']);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<30000,`${verts} vertices`);
 ghoul.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(ghoul.g),zombie=createCreature({name:'human zombie',symbol:Z});
 zombie.g.updateMatrixWorld(true);
 assert(b.min.y>-.02&&b.min.y<.02,`feet at ${b.min.y}`);
 // small and hunched: well under the zombie's height
 assert(b.max.y>.7&&b.max.y<new THREE.Box3().setFromObject(zombie.g).max.y*.8,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'fits the tile');
 // the head is thrust forward of the hips, and the claws hang down near the knees
 const head=new THREE.Box3().setFromObject(ghoul.head);
 assert(head.min.z>.1,`head at z ${head.min.z}`);
 for(const arm of ghoul.arms){const h=new THREE.Box3().setFromObject(arm);assert(h.min.y<.3&&h.min.y>.05,`claws at ${h.min.y}`);}
 // shared geometry and materials
 const other=meshes(createCreature({name:'ghoul'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<1000,`took ${ms} ms`);
});

test('the skeleton gets its own bony model with a rusty sword instead of the human zombie',async ()=>{
 const Z=90,meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const t0=performance.now(),skel=createCreature({name:'skeleton',symbol:Z,color:15}),ms=performance.now()-t0;
 assert.equal(skel.quirk,'zombie');
 for(const key of ['body','head','arm','weaponSocket','jaw'])assert(skel[key]?.isObject3D,key);
 assert.equal(skel.legs.length,2);assert.equal(skel.arms.length,2);assert.equal(skel.arm,skel.arms[1]);
 assert.equal(skel.jaw.parent,skel.head);
 assert.equal(skel.weaponSocket.parent,skel.arm);
 const parts=meshes(skel);
 assert.equal(parts.length,9,'one mesh per moving part, the jaw, the sword and the eyes');
 assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['arm','body','eyes','head','jaw','leg','sword']);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 skel.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(skel.g);
 assert(b.min.y>-.02&&b.min.y<.02,`feet at ${b.min.y}`);
 assert(b.max.y>.95&&b.max.y<1.25,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'fits the tile');
 // the sword points forward of the body, so the armed chop applies
 const sword=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='sword'));
 assert(sword.max.z>.25,`sword reaches z ${sword.max.z}`);
 assert((await import('./monster-chop.js')).chops(skel),'chops with the sword');
 // the jaw hangs under the upper teeth, opens downward about the ear, and stays under the skull
 const jawMesh=parts.find(m=>m.userData.part==='jaw'),skull=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='head'));
 const closed=new THREE.Box3().setFromObject(jawMesh);
 assert(closed.max.y<skull.max.y-.12&&closed.min.y<skull.min.y&&closed.min.y>skull.min.y-.08,`jaw from ${closed.min.y} to ${closed.max.y}`);
 const chin=()=>{skel.g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(jawMesh);};
 skel.jaw.rotation.x+=.3;const open=chin();skel.jaw.rotation.x-=.3;
 assert(open.min.y<closed.min.y-.01,`chin drops from ${closed.min.y} to ${open.min.y}`);
 assert.equal((await import('./jaw.js')).jawReach(skel),.5);
 // shared geometry and materials
 const other=meshes(createCreature({name:'skeleton'}));
 parts.forEach((m,i)=>{assert.equal(m.geometry,other[i].geometry);assert.equal(m.material,other[i].material);});
 assert(ms<1000,`took ${ms} ms`);
});

test('nymphs are dancers: sheer gold-trimmed sashes, gold cuffs and a gem on the brow, each kind in its own colours',()=>{
 const looks=new Set();
 for(const name of ['wood nymph','water nymph','mountain nymph']){
  const actor=createCreature({name});
  assert.equal(actor.quirk,'nymph');assert(actor.tail?.isObject3D,'the hair still sways');assert.equal(actor.legs.length,2);
  const mats=new Set();let meshes=0;actor.g.traverse(o=>{if(o.isMesh){meshes++;mats.add(o.material);}});
  assert(meshes<=40,`${name}: ${meshes} meshes`);
  const sheer=[...mats].filter(m=>m.transparent&&m.opacity<1);
  assert.equal(sheer.length,1,`${name}: one sheer sash material`);
  const gold=[...mats].filter(m=>m.metalness>=.7);
  assert(gold.length>=1,`${name}: gold trim`);
  const gem=[...mats].find(m=>m.emissiveIntensity===.6);
  assert(gem,`${name}: a gem`);
  looks.add(sheer[0].color.getHexString()+gem.color.getHexString());
  const bounds=new THREE.Box3().setFromObject(actor.g,true);
  assert(bounds.min.y>=0&&bounds.min.y<.02,`${name}: grounded (${bounds.min.y})`);
  assert(bounds.max.y<1.6,`${name}: the sunburst crown stays under 1.6 (${bounds.max.y})`);
 }
 assert.equal(looks.size,3,'wood, water and mountain nymphs differ');
});
