import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature,RAT_NECK} from './creatures.js';

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
  assert(bounds.min.y>-.005,name);assert(bounds.max.y<1.5,name);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<1.15,name);
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
   assert(bounds.min.y>-.005&&bounds.max.y<1.5,`${name} ${element} height`);
   assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<1.15,`${name} ${element} width`);
  }
  assert.equal(seen.size,Object.keys(elements).length,`${name}: every breath looks different`);
 }
});

test('the chromatic dragon is a huge dragon whose scales shade through the five colours of Tiamat\'s heads',()=>{
 const D=68,hues=a=>{const set=new Set();a.g.traverse(o=>{if(o.isMesh)set.add(o.material.color.getHexString());});return set;};
 const chroma=createCreature({name:'chromatic dragon',symbol:D,color:5}),plain=createCreature({name:'draken',symbol:D,color:5});
 assert.equal(chroma.element,'chromatic');
 assert(hues(chroma).size>=hues(plain).size+4,'five scale colours run through the hide');
 // a name with no glyph colour still resolves to the chromatic look, not the brown generic one
 assert.equal(createCreature({name:'chromatic dragon',symbol:D}).element,'chromatic');
 const size=a=>new THREE.Box3().setFromObject(a.g).max.y;
 assert(size(chroma)>size(plain)*1.1,'bigger than an ordinary dragon');
 const b=new THREE.Box3().setFromObject(chroma.g);
 assert(b.min.y>-.005&&b.max.y<1.5,`height ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<1.2,'sprawl');
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
 for(const [name,scale] of [['hell hound',1.38],['hell hound pup',.85]]){
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
  assert(Math.abs(bounds.min.y)<.01,name);assert(bounds.max.y<1.7,name);assert(Math.max(-bounds.min.z,bounds.max.z)<.95,name);
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

test('the Cyclops and Lord Surtur are their own towering giants, not the generic H',()=>{
 const height=a=>{a.g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(a.g).max.y;};
 const generic=height(createCreature({name:'',symbol:72,color:3})),hill=height(createCreature({name:'hill giant',symbol:72}));
 for(const name of ['Cyclops','Lord Surtur']){
  const a=createCreature({name,symbol:72});
  a.g.traverse(o=>{if(o.isMesh)for(const x of o.geometry.attributes.position.array)assert(Number.isFinite(x),name);});
  const h=height(a);assert(h>hill&&h>generic&&h<2.2,`${name} stands ${h.toFixed(2)}`);
  assert(a.legs.length===2&&a.body,`${name} keeps its legs and body handles`);
 }
 assert(createCreature({name:'Lord Surtur',symbol:72}).core,'Surtur burns');
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
  assert(Math.abs(bounds.min.y)<.005,name);assert(bounds.max.y>1.1&&bounds.max.y<1.6,name);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<1.15,name);
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
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.95,name);
  heights[name]=bounds.max.y;
 }
 assert(heights.titanothere>.9&&heights.titanothere<1.25,'the titanothere is low and massive');
 assert(heights.baluchitherium>1.25&&heights.baluchitherium<1.6,'the baluchitherium towers');
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
  assert(b.max.y>1.05&&b.max.y<1.35,`${name} top at ${b.max.y}`);
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
  assert(b.max.y>1.05&&b.max.y<1.5,`${name} top at ${b.max.y}`);
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

test("Devil's Snare is a nest of thorned, hook-tipped vines instead of the xorn",()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const snare=createCreature({name:"Devil's Snare",symbol:88,color:2});
 assert.equal(snare.quirk,'fungus');assert.equal(snare.kind,'devils snare');assert(snare.body?.isObject3D);
 const parts=meshes(snare);assert.deepEqual(parts.map(p=>p.userData.part),['vines','thorns'],'two draws');
 assert.equal(snare.vines,parts[0]);
 for(const p of parts){const a=p.geometry.attributes;for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${p.userData.part} ${key}`);for(const v of a.color.array)assert(v>=0&&v<=1,'colour');}
 snare.g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(snare.g);
 assert(b.min.y>-.001&&b.min.y<.01,`sits on the floor at ${b.min.y}`);
 assert(b.max.y>.6&&b.max.y<1.4,`vines reach ${b.max.y}`);
 const reach=Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z);assert(reach>.3&&reach<.7,`reach ${reach}`);
 assert(parts[1].material.roughness<parts[0].material.roughness,'thorns and sap are glossier than the vines');
 const again=meshes(createCreature({name:"Devil's Snare",symbol:88}));
 parts.forEach((p,i)=>{assert.equal(p.geometry,again[i].geometry);assert.equal(p.material,again[i].material);});
 assert(parts.reduce((n,p)=>n+p.geometry.attributes.position.count,0)<20000);
 assert.notEqual(meshes(createCreature({name:'xorn',symbol:88})).length,2,'the xorn is still a xorn');
});

test('ferns are jagged frond clumps and their spores floating sporangia instead of the mound and eye',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const box=a=>{a.g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(a.g);};
 const finite=parts=>{for(const p of parts){const a=p.geometry.attributes;for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${p.userData.part} ${key}`);for(const v of a.color.array)assert(v>=0&&v<=1,'colour');}};
 const sizes={};
 for(const kind of ['dungeon','arctic','blazing','swamp']){
  const fern=createCreature({name:`${kind} fern`,symbol:70,color:10});
  assert.equal(fern.quirk,'fungus');assert.equal(fern.kind,kind);assert(fern.body?.isObject3D);
  const parts=meshes(fern);assert.deepEqual(parts.map(p=>p.userData.part),['fronds','sori'],'two draws');finite(parts);
  assert.equal(parts[0].material.side,THREE.DoubleSide,'fronds are thin blades seen from both sides');
  const b=box(fern);assert(b.min.y>-.001&&b.min.y<.01,`${kind} sits on the floor at ${b.min.y}`);
  assert(b.max.y>.4&&b.max.y<.6,`${kind} top at ${b.max.y}`);
  const reach=Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z);assert(reach>.3&&reach<.5,`${kind} reach ${reach}`);
  sizes[kind]=b.max.y;
  const sprout=createCreature({name:`${kind} fern sprout`,symbol:70});finite(meshes(sprout));
  assert(box(sprout).max.y<b.max.y*.7,'the sprout is smaller');
  const spore=createCreature({name:`${kind} fern spore`,symbol:101});
  assert.equal(spore.quirk,'hover');assert.deepEqual(meshes(spore).map(p=>p.userData.part),['husk','dust']);finite(meshes(spore));
  const sb=box(spore);assert(sb.min.y>.25&&sb.max.y<.75,'the spore floats');
 }
 assert.equal(createCreature({name:'fern spore',symbol:101}).kind,'plain');
 assert(meshes(createCreature({name:'blazing fern',symbol:70}))[1].material.emissiveIntensity>meshes(createCreature({name:'dungeon fern',symbol:70}))[1].material.emissiveIntensity,'blazing sori smoulder');
 const a=meshes(createCreature({name:'swamp fern',symbol:70})),b=meshes(createCreature({name:'swamp fern',symbol:70}));
 a.forEach((p,i)=>{assert.equal(p.geometry,b[i].geometry);assert.equal(p.material,b[i].material);});
 assert(a[0].geometry.attributes.position.count<40000);
});

test('piercers are twisted, eyeless stalactites with a toothed gash, and the rock piercer has its own',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const box=a=>{a.g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(a.g);};
 const tops={};
 for(const name of ['piercer','rock piercer','iron piercer','glass piercer']){
  const m=createCreature({name,symbol:112,color:7});
  assert.equal(m.kind,name);assert.equal(m.quirk,'idle');assert(m.body?.isObject3D);
  const parts=meshes(m);assert.deepEqual(parts.map(p=>p.userData.part),['hide','teeth'],'two draws');
  for(const p of parts){const a=p.geometry.attributes;for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${p.userData.part} ${key}`);}
  assert(parts[0].material.flatShading,'faceted');
  const b=box(m);assert(b.min.y>-.005&&b.min.y<.01,`${name} sits on the floor at ${b.min.y}`);
  assert(b.max.y>.8&&b.max.y<1.15,`${name} top at ${b.max.y}`);
  const reach=Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z);assert(reach>.25&&reach<.55,`${name} reach ${reach}`);
  tops[name]=b.max.y;
 }
 assert(tops['glass piercer']>tops['iron piercer']&&tops['iron piercer']>tops.piercer);
 assert(meshes(createCreature({name:'piercer',symbol:112}))[0].geometry.attributes.position.count>11800,'long bones lie among the shards round the base');
 assert(meshes(createCreature({name:'glass piercer',symbol:112}))[0].material.transparent,'glass is see-through');
 assert(meshes(createCreature({name:'iron piercer',symbol:112}))[0].material.metalness>.5,'iron is metal');
 const a=meshes(createCreature({name:'rock piercer',symbol:112})),b=meshes(createCreature({name:'rock piercer',symbol:112}));
 a.forEach((p,i)=>{assert.equal(p.geometry,b[i].geometry);assert.equal(p.material,b[i].material);});
 assert.equal(createCreature({name:'unknown piercer thing',symbol:112}).kind,'piercer','the p fallback');
});

test('ghosts get their own sheeted, floating model instead of the guardian box',()=>{
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
 assert(b.max.y>1.1&&b.max.y<1.4,`top at ${b.max.y}`); // scaled 1.1: a ghost looms over a man
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.56,'fits the tile');
 // the sleeves reach out in front of the chest
 const sleeve=new THREE.Box3().setFromObject(ghost.arm);
 assert(sleeve.max.z>.25,`sleeve reaches ${sleeve.max.z}`);
 const sheet=parts.find(m=>m.userData.part==='body').material;
 assert(sheet.transparent&&sheet.opacity<1,'translucent');
 const again=meshes(createCreature({name:'ghost'}));
 parts.forEach((m,i)=>assert.equal(m.material,again[i].material));
 assert(ms<1000,`took ${ms} ms`);
});

test('shades get their own gaunt, hunched shadow with ribs, a cowled skull, clawed arms and a body of smoke tendrils instead of the ghost sheet',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const shade=createCreature({name:'shade',symbol:32,color:0});
 assert.equal(shade.quirk,'hover');assert.equal(shade.ghost,'shade');
 for(const key of ['body','head','arm'])assert(shade[key]?.isObject3D,key);
 assert.equal(shade.arms.length,2);assert.equal(shade.legs.length,0);assert.equal(shade.tail,null);
 assert(shade.head.children.some(c=>c.userData.part==='eyes'),'eyes for the drain flare');
 const parts=meshes(shade);
 assert.equal(parts.length,7,'body, bones, cowl, skull, eyes and two arms');
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])if(a[key])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
  assert.equal(m.castShadow,false,'a shade casts no shadow');
 }
 assert(verts<30000,`${verts} vertices`);
 shade.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(shade.g);
 assert(b.min.y>.02&&b.min.y<.2,`tendrils end at ${b.min.y}`);
 assert(b.max.y>1&&b.max.y<1.55,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.65,'fits the tile');
 // the claws reach out in front of the chest; the shadow is see-through, the bones are not
 assert(new THREE.Box3().setFromObject(shade.arm).max.z>.3,'claws reach forward');
 const body=parts.find(m=>m.userData.part==='body').material,bones=parts.find(m=>m.userData.part==='bones').material;
 assert(body.transparent&&body.opacity<1,'translucent');assert(!bones.transparent,'solid bones');
 const ghost=meshes(createCreature({name:'ghost',symbol:32,color:7}));
 assert(!ghost.some(m=>parts.some(p=>p.geometry===m.geometry)),'not the ghost sheet');
 const again=meshes(createCreature({name:'shade'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
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
 assert.ok(valk.head.rotation.x>0.1,"head pitched down so the top-down camera sees the face");
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
 assert.equal(createCreature({name:'human',symbol:64,color:7}).kind,undefined);
 const again=meshes(createCreature({name:'valkyrie'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('the valkyrie\'s hands are gauntlets closed round the grip, joined to the arm at the wrist',()=>{
 const valk=createCreature({name:'valkyrie',symbol:64,color:7});
 const geo=valk.arm.children.find(c=>c.userData.part==='arm').geometry;
 geo.computeBoundingBox();
 const b=geo.boundingBox;
 assert(b.min.y>-.43&&b.min.y<-.4,`fingers end at ${b.min.y}`);
 assert(b.max.x<.07&&b.min.x>-.07,'the gauntlet stays within the sleeve width');
 assert(geo.attributes.position.count>1000&&geo.attributes.position.count<6000,`${geo.attributes.position.count} arm vertices`);
 // finger bands wrap the grip: front of the fist sits ahead of the weapon socket, the palm behind it
 assert(b.max.z>valk.weaponSocket.position.z+.02,'fingers curl in front of the grip');
 assert(b.min.z<valk.weaponSocket.position.z-.01,'the palm sits behind the grip');
 assert(Math.abs(valk.weaponSocket.position.y+.37)<1e-6&&valk.shield.parent===valk.shieldArm);
});

test('the Norn gets a hooded, grey seeress model with a threaded staff instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const norn=createCreature({name:'norn',symbol:64,color:5});
 assert.equal(norn.kind,'norn');assert.equal(norn.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket'])assert(norn[key]?.isObject3D,key);
 assert.equal(norn.legs.length,2);assert.equal(norn.arms.length,2);assert.equal(norn.arm,norn.arms[1]);
 const parts=meshes(norn);
 assert.equal(parts.length,7,'one mesh per moving part and the staff');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<50000,`${verts} vertices`);
 norn.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(norn.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.1&&b.max.y<1.5,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.4,'out of proportion');
 const again=meshes(createCreature({name:'norn'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('warriors get a helmed, mail-clad, scarred shield-warrior model with a spear instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const war=createCreature({name:'warrior',symbol:64,color:4});
 assert.equal(war.kind,'warrior');assert.equal(war.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','shieldArm','shield'])assert(war[key]?.isObject3D,key);
 assert.equal(war.legs.length,2);assert.equal(war.arm,war.arms[1]);assert.equal(war.shieldArm,war.arms[0]);
 const parts=meshes(war);
 assert.equal(parts.length,8,'one mesh per moving part, the spear and the shield');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<50000,`${verts} vertices`);
 war.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(war.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.1&&b.max.y<1.7,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.4,'out of proportion');
 assert(new THREE.Box3().setFromObject(war.shield,true).max.x<-.2,'shield outside the left arm');
 const again=meshes(createCreature({name:'warrior'}));
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

test('cavemen and cavewomen get a hunched brute with a heavy brow, a ragged hide, a fang necklace and a flint-studded club instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 for(const name of ['caveman','cavewoman']){
  const cm=createCreature({name,symbol:64,color:3});
  assert.equal(cm.kind,'caveman');assert.equal(cm.quirk,'human');assert.equal(cm.female,name==='cavewoman');
  for(const key of ['body','head','arm','weaponSocket'])assert(cm[key]?.isObject3D,key);
  assert.equal(cm.legs.length,2);assert.equal(cm.arms.length,2);assert.equal(cm.arm,cm.arms[1]);
  assert(cm.arm.children.includes(cm.weaponSocket),'the socket is at the right hand');
  assert.equal(cm.weaponSocket.children.length,1,'the club is held');
  const parts=meshes(cm);
  assert.equal(parts.length,7,'one mesh per moving part and the club');
  assert.equal(new Set(parts.map(m=>m.material)).size,1);
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
  }
  assert(verts<40000,`${verts} vertices`);
  cm.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(cm.g,true);
  assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
  assert(b.max.y>1.05&&b.max.y<1.3,`top at ${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
  const club=new THREE.Box3().setFromObject(cm.weaponSocket,true);
  assert(club.max.z>.2,`club held forward (${club.max.z})`);
  const again=meshes(createCreature({name}));
  parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
 }
 const [man,woman]=['caveman','cavewoman'].map(name=>meshes(createCreature({name})));
 assert.notEqual(man[1].geometry,woman[1].geometry,'the heads differ (beard, longer mane)');
 assert.equal(man[0].geometry,woman[0].geometry,'the body is shared');
});

test('neanderthals get a broad brute in a wolf pelt, the wolf\'s head worn as a hood, ochre across the eyes and a flint-tipped spear instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const ne=createCreature({name:'neanderthal',symbol:64,color:3});
 assert.equal(ne.kind,'neanderthal');assert.equal(ne.quirk,'human');assert.equal(ne.female,false);
 for(const key of ['body','head','arm','weaponSocket'])assert(ne[key]?.isObject3D,key);
 assert.equal(ne.legs.length,2);assert.equal(ne.arms.length,2);assert.equal(ne.arm,ne.arms[1]);
 assert(ne.arm.children.includes(ne.weaponSocket),'the socket is at the right hand');
 assert.equal(ne.weaponSocket.children[0].userData.part,'spear');
 const parts=meshes(ne);
 assert.equal(parts.length,8,'one mesh per moving part, the spear and the eyes');
 assert(ne.eyes?.isMesh&&ne.head.children.includes(ne.eyes)&&ne.eyes.userData.part==='eyes','the amber eyes are their own mesh on the head');
 assert(ne.eyes.material.emissiveIntensity>0&&ne.eyes.material!==parts[0].material,'the eyes glow with their own material');
 assert.equal(ne.eyes.castShadow,false);
 assert.equal(createCreature({name:'caveman'}).eyes,null,'the caveman\'s eyes stay in the head');
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 ne.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(ne.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.05&&b.max.y<1.3,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.7,'out of proportion');
 const spear=new THREE.Box3().setFromObject(ne.weaponSocket,true);
 assert(spear.max.z>.35,`spear levelled forward (${spear.max.z})`);
 assert(spear.min.y>.05,`spear butt clear of the floor (${spear.min.y})`);
 const cm=meshes(createCreature({name:'caveman'})),again=meshes(createCreature({name:'neanderthal'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
 assert.equal(parts[0].material,cm[0].material,'one material shared with the caveman');
 assert.notEqual(parts[0].geometry,cm[0].geometry,'the body is broader and wears the pelt');
 assert(parts.some(m=>m.geometry===cm[2].geometry),'the legs are shared');
});

test('tourists get a straw hat, mirrored shades, a hibiscus shirt, a camera, a fanny pack, a map and a dart instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const to=createCreature({name:'tourist',symbol:64,color:7});
 assert.equal(to.kind,'tourist');assert.equal(to.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket'])assert(to[key]?.isObject3D,key);
 assert.equal(to.legs.length,2);assert.equal(to.arms.length,2);assert.equal(to.arm,to.arms[1]);
 assert(to.arm.children.includes(to.weaponSocket),'the socket is at the right hand');
 assert.equal(to.weaponSocket.children.length,1,'the dart is held');
 const parts=meshes(to);
 assert.equal(parts.length,7,'one mesh per moving part and the dart');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 to.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(to.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.15&&b.max.y<1.3,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'out of proportion');
 // the hat brim is the widest thing about the head, and the dart points forward
 const head=new THREE.Box3().setFromObject(to.head,true);
 assert(head.max.x-head.min.x>.38,`brim ${head.max.x-head.min.x}`);
 assert(new THREE.Box3().setFromObject(to.weaponSocket,true).max.z>.15,'dart held forward');
 assert.notEqual(to.arms[0].children[0].geometry,to.arms[1].children[0].geometry,'the left hand holds the map');
 const again=meshes(createCreature({name:'tourist'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('rangers get a peaked hood, a mask, a tattered cloak, a quiver, a black recurved bow and an arrow instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const ra=createCreature({name:'ranger',symbol:64,color:2});
 assert.equal(ra.kind,'ranger');assert.equal(ra.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket'])assert(ra[key]?.isObject3D,key);
 assert.equal(ra.legs.length,2);assert.equal(ra.arms.length,2);assert.equal(ra.arm,ra.arms[1]);
 assert(ra.arm.children.includes(ra.weaponSocket),'the socket is at the right hand');
 assert.equal(ra.weaponSocket.children.length,1,'the arrow is held');
 const parts=meshes(ra);
 assert.equal(parts.length,7,'one mesh per moving part and the arrow');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 ra.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(ra.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.15&&b.max.y<1.3,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'out of proportion');
 // the hood's peak is the top of the model; the bow stands clear of the floor in the left hand,
 // the quiver rides on the back, and the arrow points forward
 assert(new THREE.Box3().setFromObject(ra.head,true).max.y>b.max.y-1e-6,'hood on top');
 const bow=new THREE.Box3().setFromObject(ra.arms[0],true);
 assert(bow.min.y>.02&&bow.max.y-bow.min.y>.7,`bow ${bow.min.y}..${bow.max.y}`);
 assert(new THREE.Box3().setFromObject(ra.body.children[0],true).min.z<-.28,'quiver on the back');
 assert(new THREE.Box3().setFromObject(ra.weaponSocket,true).max.z>.3,'arrow held forward');
 const again=meshes(createCreature({name:'ranger'}));
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

test('ninja get a wrapped zukin with an eye slit and trailing tails, a red sash with shuriken, a saya on the back and a straight ninjato instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const ni=createCreature({name:'ninja',symbol:64,color:4});
 assert.equal(ni.kind,'ninja');assert.equal(ni.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket'])assert(ni[key]?.isObject3D,key);
 assert.equal(ni.legs.length,2);assert.equal(ni.arms.length,2);assert.equal(ni.arm,ni.arms[1]);
 assert(ni.arm.children.includes(ni.weaponSocket),'the socket is at the right hand');
 assert.equal(ni.weaponSocket.children.length,1,'the ninjato is held');
 const parts=meshes(ni);
 assert.equal(parts.length,9,'one mesh per moving part, each hood tail and the sword');
 assert.equal(ni.hoodTails.length,2);for(const k of ni.hoodTails)assert.equal(k.parent,ni.head,'the tails hang from the knot');
 assert.equal(new Set(parts.map(m=>m.material)).size,1);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<30000,`${verts} vertices`);
 ni.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(ni.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.03&&b.max.y<1.2,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'out of proportion');
 // the saya rides on the back, and the hood's tails hang down it
 assert(new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='body'),true).min.z<-.15,'saya on the back');
 const hb=new THREE.Box3();for(const m of parts.filter(m=>m.userData.part==='hoodTail'))hb.expandByObject(m,true);
 assert(hb.min.y<.8&&hb.min.z<-.12,`tails ${hb.min.y} ${hb.min.z}`);
 assert(new THREE.Box3().setFromObject(ni.weaponSocket,true).max.z>.25,'blade held forward');
 const again=meshes(createCreature({name:'ninja'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('the Executioner gets a black sack hood with ice-blue eyes, a frosted, scarred bare torso, a bloodied apron, a grey cloak and Cleaver instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const ex=createCreature({name:'Executioner',symbol:64,color:13});
 assert.equal(ex.kind,'executioner');assert.equal(ex.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(ex[key]?.isObject3D,key);
 assert.equal(ex.legs.length,2);assert.equal(ex.arms.length,2);assert.equal(ex.arm,ex.arms[1]);
 assert(ex.arm.children.includes(ex.weaponSocket),'the socket is at the right hand');
 assert.equal(ex.weaponSocket.children.length,1,'Cleaver is held');
 const parts=meshes(ex);
 assert.equal(parts.length,8,'one mesh per moving part, the axe and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 ex.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(ex.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.25&&b.max.y<1.6,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // the eyes show through the hood's holes: looking at them from the front, they are hit first
 const eye=new THREE.Box3().setFromObject(ex.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(s*.041,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===ex.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the cloak hangs down the back, and Cleaver's blade stands above the shoulder
 assert(new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='body'),true).min.z<-.22,'cloak on the back');
 assert(new THREE.Box3().setFromObject(ex.weaponSocket,true).max.y>1.2,'the blade is held high');
 const again=meshes(createCreature({name:'executioner'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'executioner');
});

test('Charon gets a deep hood over a skull-thin face with ember eyes, a white beard, a slimed river-murk robe, a string of obols and his oar instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const ch=createCreature({name:'Charon',symbol:64,color:15});
 assert.equal(ch.kind,'charon');assert.equal(ch.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(ch[key]?.isObject3D,key);
 assert.equal(ch.legs.length,2);assert.equal(ch.arms.length,2);assert.equal(ch.arm,ch.arms[1]);
 assert(ch.arm.children.includes(ch.weaponSocket),'the socket is at the right hand');
 assert.equal(ch.weaponSocket.children.length,1,'the oar is held');
 const parts=meshes(ch);
 assert.equal(parts.length,8,'one mesh per moving part, the oar and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 ch.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(ch.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`hem at ${b.min.y}`);
 assert(b.max.y>1.2&&b.max.y<1.8,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.65,'out of proportion');
 // the eyes show in the hood's shadow: looking at them from the front, they are hit first
 const eye=new THREE.Box3().setFromObject(ch.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.033,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===ch.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the toes poke out under the hem, and the oar's blade stands above the hood
 const toes=new THREE.Box3().setFromObject(ch.legs[0],true),hem=.235*.82*1.3;
 assert(toes.max.z>hem+.01&&toes.max.z<hem+.08,`toes at ${toes.max.z}, hem at ${hem}`);
 assert(toes.min.y>-.03,'feet above the floor');
 assert(new THREE.Box3().setFromObject(ch.weaponSocket,true).max.y>new THREE.Box3().setFromObject(ch.head,true).max.y,'the oar stands above the hood');
 const again=meshes(createCreature({name:'charon'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'charon');
});

test('Thoth Amon gets a shaven head with kohl-lined venom-green eyes, a cobra circlet, a fanned collar, a black robe, an asp on his arm and a cobra staff instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const th=createCreature({name:'Thoth Amon',symbol:64,color:13});
 assert.equal(th.kind,'thoth amon');assert.equal(th.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(th[key]?.isObject3D,key);
 assert.equal(th.legs.length,2);assert.equal(th.arms.length,2);assert.equal(th.arm,th.arms[1]);
 assert(th.arm.children.includes(th.weaponSocket),'the socket is at the right hand');
 assert.equal(th.weaponSocket.children.length,1,'the staff is held');
 const parts=meshes(th);
 assert.equal(parts.length,8,'one mesh per moving part, the staff and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 th.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(th.g,true);
 assert(b.min.y>-.08&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.25&&b.max.y<1.7,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // the eyes show from the front: looking at them, they are hit first
 const eye=new THREE.Box3().setFromObject(th.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.035,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===th.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the left (asp) arm and the right (staff) arm are different meshes; the staff's cobra stands above the head
 assert.notEqual(th.arms[0].children[0].geometry,th.arms[1].children[0].geometry);
 assert(new THREE.Box3().setFromObject(th.weaponSocket,true).max.y>new THREE.Box3().setFromObject(th.head,true).max.y,'the cobra stands above his head');
 const again=meshes(createCreature({name:'thoth amon'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'thoth amon');
});

test('Croesus gets a spiked jewelled crown, a gaunt sallow face with greedy gold eyes, gilded plate, a gold chain, an ermine-trimmed crimson mantle, purses of coin and a two-handed sword instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const cr=createCreature({name:'Croesus',symbol:64,color:13});
 assert.equal(cr.kind,'croesus');assert.equal(cr.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(cr[key]?.isObject3D,key);
 assert.equal(cr.legs.length,2);assert.equal(cr.arms.length,2);assert(cr.arm===cr.arms[1]);
 assert(cr.arm.children.includes(cr.weaponSocket),'the socket is at the right hand');
 assert.equal(cr.weaponSocket.children.length,1,'the sword is held');
 const parts=meshes(cr);
 assert.equal(parts.length,8,'one mesh per moving part, the sword and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 cr.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(cr.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.3&&b.max.y<1.85,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // the eyes glint from the sockets: looking at them from the front, they are hit first
 const eye=new THREE.Box3().setFromObject(cr.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.0315,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===cr.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the mantle trails behind, and the sword's blade stands above the shoulder
 assert(new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='body'),true).min.z<-.25,'mantle behind');
 assert(new THREE.Box3().setFromObject(cr.weaponSocket,true).max.y>1.1,'the blade is held high');
 const again=meshes(createCreature({name:'croesus'}));
 parts.forEach((m,i)=>assert(m.geometry===again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'croesus');
});

test('the abbot gets a deep pointed hood over a sunken grey face with pale burning eyes, a white beard, a torn black habit with an oxblood scapular, a rope cincture, clawed hands and bone prayer beads instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const ab=createCreature({name:'abbot',symbol:64,color:7});
 assert.equal(ab.kind,'abbot');assert.equal(ab.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(ab[key]?.isObject3D,key);
 assert.equal(ab.legs.length,2);assert.equal(ab.arms.length,2);assert(ab.arm===ab.arms[1]);
 assert(ab.arm.children.includes(ab.weaponSocket),'the socket is at the right hand');
 assert.equal(ab.weaponSocket.children.length,0,'he fights barehanded');
 const parts=meshes(ab);
 assert.equal(parts.length,7,'one mesh per moving part and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 ab.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(ab.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.2&&b.max.y<1.45,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'out of proportion');
 // the eyes burn out of the hood: looking at them from the front, they are hit first
 const eye=new THREE.Box3().setFromObject(ab.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.028*1.06,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===ab.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the hood covers the crown and its point droops behind; the toes creep out from under the hem
 const head=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='head'),true);
 assert(head.min.z<eye.z-.2,'hood point behind');
 const toe=new THREE.Raycaster(new THREE.Vector3(ab.legs[1].getWorldPosition(new THREE.Vector3()).x,.01,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
 assert.equal(toe?.object.userData.part,'leg','the toes show under the hem');
 // the prayer beads hang from the left hand only
 const [l,r]=ab.arms.map(a=>new THREE.Box3().setFromObject(a,true));
 assert(l.min.y<r.min.y-.1,'beads below the left hand');
 const again=meshes(createCreature({name:'abbot'}));
 parts.forEach((m,i)=>assert(m.geometry===again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'abbot');
});

test('Master Kaen gets a hulking bare ash-grey torso inked with sutras, a gaunt shaven head with a long white moustache and queue, the Eyes of the Overworld burning over his eyes, an iron rosary with skulls, a black sash, tattered trousers and clawed hands instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const mk=createCreature({name:'Master Kaen',symbol:64,color:13});
 assert.equal(mk.kind,'master kaen');assert.equal(mk.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(mk[key]?.isObject3D,key);
 assert.equal(mk.legs.length,2);assert.equal(mk.arms.length,2);assert(mk.arm===mk.arms[1]);
 assert(mk.arm.children.includes(mk.weaponSocket),'the socket is at the right hand');
 assert.equal(mk.weaponSocket.children.length,0,'he fights barehanded');
 const parts=meshes(mk);
 assert.equal(parts.length,7,'one mesh per moving part and the lenses');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 assert(mk.eyes.material.emissiveIntensity>1,'the lenses glow');
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 mk.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(mk.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.25&&b.max.y<1.5,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // both lenses show from the front, and he is broader than the monk
 const eye=new THREE.Box3().setFromObject(mk.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.031*1.1,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===mk.eyes,`the ${s<0?'left':'right'} lens is hidden behind the ${hit?.object.userData.part}`);
 }
 const monk=createCreature({name:'monk',symbol:64});monk.g.updateMatrixWorld(true);
 const mb=new THREE.Box3().setFromObject(monk.g,true);
 assert(b.max.x-b.min.x>(mb.max.x-mb.min.x)*1.1,'hulking');
 // the queue hangs down his back
 const head=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='head'),true);
 assert(head.min.z<eye.z-.15&&head.min.y<eye.y-.3,'queue behind');
 const again=meshes(createCreature({name:'master kaen'}));
 parts.forEach((m,i)=>assert(m.geometry===again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'master kaen');
});

test('the Dark One gets a black alb and inverted-cross chasuble, a spined collar, a pale veined face with violet eyes under the defiled Mitre of Holiness, black-taloned hands and a thorned crozier instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const d=createCreature({name:'Dark One',symbol:64,color:0});
 assert.equal(d.kind,'dark one');assert.equal(d.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(d[key]?.isObject3D,key);
 assert.equal(d.legs.length,2);assert.equal(d.arms.length,2);assert.equal(d.arm,d.arms[1]);
 assert(d.arm.children.includes(d.weaponSocket),'the socket is at the right hand');
 assert.equal(d.weaponSocket.children.length,1,'the crozier is held');
 const parts=meshes(d);
 assert.equal(parts.length,8,'one mesh per moving part, the crozier and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 d.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(d.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`hem at ${b.min.y}`);
 assert(b.max.y>1.3&&b.max.y<1.95,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // the eyes show from the front
 const eye=new THREE.Box3().setFromObject(d.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.03,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===d.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // it glides: nothing of the legs shows below the alb's hem
 for(const leg of d.legs){const l=new THREE.Box3().setFromObject(leg,true);assert(l.min.y>.02&&Math.abs(l.max.z)<.2,'legs hidden in the alb');}
 // the mitre crowns the head, and the crook rises beside it
 const head=new THREE.Box3().setFromObject(d.head,true),crozier=new THREE.Box3().setFromObject(d.weaponSocket,true);
 assert(head.max.y-eye.y>.2,'a tall mitre');
 assert(crozier.max.y>head.max.y-.15,`crook at ${crozier.max.y}, mitre at ${head.max.y}`);
 const again=meshes(createCreature({name:'dark one'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'dark one');
});

test('Lord Carnarvon gets a dusty pith helmet, a sallow face with a monocle and tomb-gold glints, a Norfolk jacket with a gold scarab, jodhpurs, puttees, riding boots and a jackal-headed cane instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const c=createCreature({name:'Lord Carnarvon',symbol:64,color:13});
 assert.equal(c.kind,'lord carnarvon');assert.equal(c.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(c[key]?.isObject3D,key);
 assert.equal(c.legs.length,2);assert.equal(c.arms.length,2);assert.equal(c.arm,c.arms[1]);
 assert(c.arm.children.includes(c.weaponSocket),'the socket is at the right hand');
 assert.equal(c.weaponSocket.children.length,1,'the cane is held');
 const parts=meshes(c);
 assert.equal(parts.length,8,'one mesh per moving part, the cane and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 c.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(c.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`boots at ${b.min.y}`);
 assert(b.max.y>1.25&&b.max.y<1.5,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'out of proportion');
 const eye=new THREE.Box3().setFromObject(c.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.026,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===c.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the helmet brim shades the face, and the jackal head sits about hip height
 const head=new THREE.Box3().setFromObject(c.head,true),cane=new THREE.Box3().setFromObject(c.weaponSocket,true);
 assert(head.max.x-head.min.x>.22,'a wide brim');
 assert(cane.min.y<.06&&cane.max.y>.5&&cane.max.y<.8,`cane ${cane.min.y}..${cane.max.y}`);
 const again=meshes(createCreature({name:'lord carnarvon'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'lord carnarvon');
});

test('Pelias gets a spiked iron crown, a scarred bald head with frost-pale glints, a white plaited beard, a gold torc, a bearskin cloak, a war-kilt, cross-gartered legs, fur boots and an upright broadsword instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const c=createCreature({name:'Pelias',symbol:64,color:13});
 assert.equal(c.kind,'pelias');assert.equal(c.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(c[key]?.isObject3D,key);
 assert.equal(c.legs.length,2);assert.equal(c.arms.length,2);assert.equal(c.arm,c.arms[1]);
 assert(c.arm.children.includes(c.weaponSocket),'the socket is at the right hand');
 assert.equal(c.weaponSocket.children.length,1,'the sword is held');
 const parts=meshes(c);
 assert.equal(parts.length,8,'one mesh per moving part, the sword and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 c.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(c.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`boots at ${b.min.y}`);
 assert(b.max.y>1.2&&b.max.y<1.6,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.5,'out of proportion');
 const eye=new THREE.Box3().setFromObject(c.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.029,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===c.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the crown's spikes rise over the scalp, and the sword stands taller than the head
 const head=new THREE.Box3().setFromObject(c.head,true),sword=new THREE.Box3().setFromObject(c.weaponSocket,true);
 assert(head.max.y-eye.y>.1,'a spiked crown');
 assert(sword.max.y-sword.min.y>.75&&sword.max.y>eye.y,`sword ${sword.min.y}..${sword.max.y}`);
 const again=meshes(createCreature({name:'pelias'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'pelias');
});

test('One-eyed Sam gets a tricorn, an eyepatch and one burning eye, a braid, grey dragon scale mail under a ragged greatcoat, speed boots, a mirror shield on the left arm and Thiefbane instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const sam=createCreature({name:'One-eyed Sam',symbol:64,color:0});
 assert.equal(sam.kind,'one-eyed sam');assert.equal(sam.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','shieldArm','eyes'])assert(sam[key]?.isObject3D,key);
 assert.equal(sam.legs.length,2);assert.equal(sam.arms.length,2);assert(sam.arm===sam.arms[1]);assert(sam.shieldArm===sam.arms[0]);
 assert(sam.arm.children.includes(sam.weaponSocket),'the socket is at the right hand');
 assert.equal(sam.weaponSocket.children.length,1,'the sword is held');
 const parts=meshes(sam);
 assert.equal(parts.length,8,'one mesh per moving part, the sword and the eye');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 sam.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(sam.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.2&&b.max.y<1.7,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // one eye burns from its socket, the other is under the patch
 const eye=new THREE.Box3().setFromObject(sam.eyes,true).getCenter(new THREE.Vector3());
 const hit=new THREE.Raycaster(new THREE.Vector3(eye.x,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
 assert(hit?.object===sam.eyes,`the eye is hidden behind the ${hit?.object.userData.part}`);
 assert(eye.x>0,'the eye is on the right, the patch on the left');
 // the mirror shield stands out from the left forearm; the coat hangs behind
 const arm=new THREE.Box3().setFromObject(sam.shieldArm,true);
 assert(arm.min.x<-.3&&arm.max.y-arm.min.y>.3,'the shield is on the left arm');
 assert(new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='body'),true).min.z<-.18,'coat behind');
 assert(new THREE.Box3().setFromObject(sam.weaponSocket,true).max.y>1.1,'the blade is held high');
 const again=meshes(createCreature({name:'one-eyed sam'}));
 parts.forEach((m,i)=>assert(m.geometry===again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'one-eyed sam');
});

test('the Master Assassin gets a hood over a mouthless bone-white mask with slit eyes, crossed baldrics of throwing knives, a belt of poison vials, a ragged half-cape, a poisoned kris and a reverse-grip dagger instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const m=createCreature({name:'Master Assassin',symbol:64,color:13});
 assert.equal(m.kind,'master assassin');assert.equal(m.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','shieldArm','eyes'])assert(m[key]?.isObject3D,key);
 assert.equal(m.legs.length,2);assert.equal(m.arms.length,2);assert(m.arm===m.arms[1]);assert(m.shieldArm===m.arms[0]);
 assert(m.arm.children.includes(m.weaponSocket),'the socket is at the right hand');
 assert.equal(m.weaponSocket.children.length,1,'the kris is held');
 const parts=meshes(m);
 assert.equal(parts.length,8,'one mesh per moving part, the kris and the eyes');
 assert.equal(new Set(parts.map(p=>p.material)).size,2);
 let verts=0;
 for(const p of parts){
  const a=p.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${p.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,p.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 m.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(m.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.05&&b.max.y<1.4,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // both eyes show through the mask's slits
 for(const s of [-1,1]){
  const e=new THREE.Box3().setFromObject(m.eyes,true).getCenter(new THREE.Vector3());e.x+=s*.028*1.05;
  const hit=new THREE.Raycaster(new THREE.Vector3(e.x,e.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===m.eyes,`eye ${s} is hidden behind the ${hit?.object.userData.part}`);
 }
 // the off-hand dagger runs up the left forearm; the cape hangs behind
 const arm=new THREE.Box3().setFromObject(m.shieldArm,true);
 assert(arm.max.z-arm.min.z>.08,'the dagger stands off the left arm');
 assert(new THREE.Box3().setFromObject(parts.find(p=>p.userData.part==='body'),true).min.z<-.15,'cape behind');
 const kris=new THREE.Box3().setFromObject(m.weaponSocket,true);
 assert(Math.max(kris.max.x-kris.min.x,kris.max.y-kris.min.y,kris.max.z-kris.min.z)>.35,'a full-length kris');
 const again=meshes(createCreature({name:'master assassin'}));
 parts.forEach((p,i)=>assert(p.geometry===again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'master assassin');
});

test('Hippocrates gets a laurel wreath on a bald dome, a long jagged white beard, a fluted blood-spotted chiton under a slate himation, a herb satchel, a roll of lancets, a bleeding bowl and the serpent staff of Asclepius instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const h=createCreature({name:'Hippocrates',symbol:64,color:15});
 assert.equal(h.kind,'hippocrates');assert.equal(h.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','shieldArm','eyes'])assert(h[key]?.isObject3D,key);
 assert.equal(h.legs.length,2);assert.equal(h.arms.length,2);assert(h.arm===h.arms[1]);assert(h.shieldArm===h.arms[0]);
 assert(h.arm.children.includes(h.weaponSocket),'the socket is at the right hand');
 assert.equal(h.weaponSocket.children.length,1,'the staff is held');
 const parts=meshes(h);
 assert.equal(parts.length,8,'one mesh per moving part, the staff and the eyes');
 assert.equal(new Set(parts.map(p=>p.material)).size,2);
 let verts=0;
 for(const p of parts){
  const a=p.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${p.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,p.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 h.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(h.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.1&&b.max.y<1.4,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // both eyes look out of their sockets, past the brow and the nose
 for(const s of [-1,1]){
  const e=new THREE.Box3().setFromObject(h.eyes,true).getCenter(new THREE.Vector3());e.x+=s*.029*1.04;
  const hit=new THREE.Raycaster(new THREE.Vector3(e.x,e.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===h.eyes,`eye ${s} is hidden behind the ${hit?.object.userData.part}`);
 }
 // the staff stands from the floor to above the head; the bowl is held out in front
 const staff=new THREE.Box3().setFromObject(h.weaponSocket,true);
 assert(staff.max.y-staff.min.y>1,'a full-length staff');
 assert(staff.min.y<.1,'the staff reaches the floor');
 assert(new THREE.Box3().setFromObject(h.shieldArm,true).max.z>.2,'the bowl is held out');
 const again=meshes(createCreature({name:'hippocrates'}));
 parts.forEach((p,i)=>assert(p.geometry===again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'hippocrates');
});

test('the black marketeer gets a deep peaked cowl over a scarfed face with sickly glinting eyes, a ragged lined cloak hung with stolen wares, a bandolier of vials, a coin purse and a notched long sword instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const bm=createCreature({name:'black marketeer',symbol:64,color:0});
 assert.equal(bm.kind,'black marketeer');assert.equal(bm.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(bm[key]?.isObject3D,key);
 assert.equal(bm.legs.length,2);assert.equal(bm.arms.length,2);assert(bm.arm===bm.arms[1]);
 assert(bm.arm.children.includes(bm.weaponSocket),'the socket is at the right hand');
 assert.equal(bm.weaponSocket.children.length,1,'the sword is held');
 const parts=meshes(bm);
 assert.equal(parts.length,8,'one mesh per moving part, the sword and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 bm.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(bm.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.15&&b.max.y<1.6,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // the eyes glint out of the cowl's shadow: looking at them from the front, they are hit first
 const eye=new THREE.Box3().setFromObject(bm.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.028,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===bm.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the cowl rises above the face, and the cloak hangs down the back almost to the floor
 const head=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='head'),true);
 assert(head.max.y-eye.y>.12,'the cowl stands over the eyes');
 const body=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='body'),true);
 assert(body.min.z<-.2&&body.min.y<.08,'the cloak hangs behind, to the ankles');
 const again=meshes(createCreature({name:'Black marketeer'}));
 parts.forEach((m,i)=>assert(m.geometry===again[i].geometry));
 assert.notEqual(createCreature({name:'shopkeeper',symbol:64}).kind,'black marketeer');
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'black marketeer');
});
test('the mugger gets a burlap sack over its head with red-glinting eyeholes, a long patched greatcoat, a swag sack, a knuckle-duster and a nail-studded cosh instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const mu=createCreature({name:'mugger',symbol:64,color:0});
 assert.equal(mu.kind,'mugger');assert.equal(mu.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(mu[key]?.isObject3D,key);
 assert.equal(mu.legs.length,2);assert.equal(mu.arms.length,2);assert(mu.arm===mu.arms[1]);
 assert(mu.arm.children.includes(mu.weaponSocket),'the socket is at the right hand');
 assert.equal(mu.weaponSocket.children.length,1,'the cosh is held');
 const parts=meshes(mu);
 assert.equal(parts.length,8,'one mesh per moving part, the cosh and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 mu.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(mu.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.15&&b.max.y<1.45,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // the eyes glint out of the sack's holes: looking at them from the front, they are hit first
 const eye=new THREE.Box3().setFromObject(mu.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.028,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===mu.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the sack's knot rises above the face, and the greatcoat hangs to the shins
 const head=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='head'),true);
 assert(head.max.y-eye.y>.12,'the knotted tuft stands over the eyes');
 const body=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='body'),true);
 assert(body.min.z<-.15&&body.min.y<.2,'the greatcoat hangs to the shins');
 const again=meshes(createCreature({name:'Mugger'}));
 parts.forEach((m,i)=>assert(m.geometry===again[i].geometry));
 assert.notEqual(createCreature({name:'shopkeeper',symbol:64}).kind,'mugger');
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'mugger');
 assert.equal(createCreature({name:'black marketeer',symbol:64}).kind,'black marketeer');
});

test('the convict gets a shaved, scarred head with pale eyes in deep sockets, a torn striped prison suit, manacles, a ball and chain and a glass shiv instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const cv=createCreature({name:'convict',symbol:64,color:7});
 assert.equal(cv.kind,'convict');assert.equal(cv.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(cv[key]?.isObject3D,key);
 assert.equal(cv.legs.length,2);assert.equal(cv.arms.length,2);assert(cv.arm===cv.arms[1]);
 assert(cv.arm.children.includes(cv.weaponSocket),'the socket is at the right hand');
 assert.equal(cv.weaponSocket.children.length,1,'the shiv is held');
 const parts=meshes(cv);
 assert.equal(parts.length,8,'one mesh per moving part, the shiv and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 cv.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(cv.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.1&&b.max.y<1.35,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'out of proportion');
 // the eyes glint out of the sockets: looking at them from the front, they are hit first
 const eye=new THREE.Box3().setFromObject(cv.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.03,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===cv.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the iron ball drags on the floor behind the right heel, and the shiv points forward
 const right=new THREE.Box3().setFromObject(cv.legs[1],true),left=new THREE.Box3().setFromObject(cv.legs[0],true);
 assert(right.min.z<-.2&&left.min.z>-.1,'the ball is chained to the right ankle only');
 assert(new THREE.Box3().setFromObject(cv.weaponSocket,true).max.z>.2,'the shiv points forward');
 const again=meshes(createCreature({name:'Convict'}));
 parts.forEach((m,i)=>assert(m.geometry===again[i].geometry));
 assert.notEqual(createCreature({name:'prisoner',symbol:64}).kind,'convict');
 assert.equal(createCreature({name:'mugger',symbol:64}).kind,'mugger');
});

test('the prisoner gets a starved, stooped body with matted hair, pale eyes in bruised sockets, a burlap sack, an iron collar and chain, manacles, fetters and a sharpened bone instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const pr=createCreature({name:'prisoner',symbol:64,color:7});
 assert.equal(pr.kind,'prisoner');assert.equal(pr.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes'])assert(pr[key]?.isObject3D,key);
 assert.equal(pr.legs.length,2);assert.equal(pr.arms.length,2);assert(pr.arm===pr.arms[1]);
 assert(pr.arm.children.includes(pr.weaponSocket),'the socket is at the right hand');
 assert.equal(pr.weaponSocket.children.length,1,'the bone is held');
 const parts=meshes(pr);
 assert.equal(parts.length,8,'one mesh per moving part, the bone and the eyes');
 assert.equal(new Set(parts.map(m=>m.material)).size,2);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 pr.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(pr.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1&&b.max.y<1.25,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'out of proportion');
 // the eyes peer out of the sockets past the hair: looking at them from the front, they are hit first
 const eye=new THREE.Box3().setFromObject(pr.eyes,true).getCenter(new THREE.Vector3());
 for(const s of [-1,1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.028,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===pr.eyes,`the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the head hangs forward of the chest, and the bone points forward
 assert(new THREE.Box3().setFromObject(pr.head,true).max.z>.15,'the head hangs forward');
 assert(new THREE.Box3().setFromObject(pr.weaponSocket,true).max.z>.2,'the bone points forward');
 const again=meshes(createCreature({name:'Prisoner'}));
 parts.forEach((m,i)=>assert(m.geometry===again[i].geometry));
 assert.equal(createCreature({name:'convict',symbol:64}).kind,'convict');
});

test('miners get a battered hard hat with a burnt-out candle stub, a coal-black gaunt face with pale eyes, a hunch, a scorched apron, a worn pick-axe and a lit brass lantern instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const mi=createCreature({name:'miner',symbol:64,color:7});
 assert.equal(mi.kind,'miner');assert.equal(mi.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','eyes','lantern'])assert(mi[key]?.isObject3D,key);
 assert.equal(mi.legs.length,2);assert.equal(mi.arms.length,2);assert(mi.arm===mi.arms[1]);assert(mi.lantern===mi.arms[0]);
 assert(mi.arm.children.includes(mi.weaponSocket),'the socket is at the right hand');
 assert.equal(mi.weaponSocket.children.length,1,'the pick is held');
 const parts=meshes(mi);
 assert.equal(parts.length,9,'one mesh per moving part, the pick, the eyes and the flame');
 assert.equal(new Set(parts.map(m=>m.material)).size,3);
 const flame=parts.find(m=>m.userData.part==='flame');
 assert(flame&&flame.parent===mi.lantern,'the lantern flame is tagged for flame-flicker');
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 mi.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(mi.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.1&&b.max.y<1.5,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,'out of proportion');
 // both pale eyes look out from under the brim
 for(const s of [-1,1]){
  const e=new THREE.Box3().setFromObject(mi.eyes,true),c=e.getCenter(new THREE.Vector3());
  const x=s*(e.max.x-.009);
  const hit=new THREE.Raycaster(new THREE.Vector3(x,c.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
  assert(hit?.object===mi.eyes,`an eye is hidden behind the ${hit?.object.userData.part}`);
 }
 // the lantern hangs below the left hand, its flame inside the chimney; the pick head rides high
 const fp=flame.getWorldPosition(new THREE.Vector3());
 assert(fp.x<-.1&&fp.y>.2&&fp.y<.4,`flame at ${fp.toArray()}`);
 assert(new THREE.Box3().setFromObject(mi.weaponSocket,true).max.y>.95,'the pick is held high');
 assert(new THREE.Box3().setFromObject(mi.head,true).getCenter(new THREE.Vector3()).z>.04,'the head is thrust forward on the hunch');
 const again=meshes(createCreature({name:'miner'}));
 parts.forEach((m,i)=>assert(m.geometry===again[i].geometry));
 assert.notEqual(createCreature({name:'human',symbol:64}).kind,'miner');
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

test('Medusa gets her own serpent-bodied gorgon with snake hair, glowing eyes, talons and a bronze harpe instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const me=createCreature({name:'Medusa',symbol:64,color:2});
 assert.equal(me.kind,'medusa');assert.equal(me.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','tail'])assert(me[key]?.isObject3D,key);
 assert.equal(me.legs.length,0,'a serpent body, no legs');assert.equal(me.arms.length,2);assert.equal(me.arm,me.arms[1]);
 assert(me.arm.children.includes(me.weaponSocket),'the harpe is in the right hand');
 const parts=meshes(me);
 assert.equal(parts.length,7,'body, head, glowing eyes, tail, two arms and the harpe');
 assert.equal(new Set(parts.map(m=>m.material)).size,2,'one lit and one glowing material');
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 me.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(me.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`coil on the floor at ${b.min.y}`);
 assert(b.max.y>1.2&&b.max.y<1.7,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.65,'out of proportion');
 // the tail trails out behind her along the floor, and the snakes rise well above the skull
 const tail=new THREE.Box3().setFromObject(me.tail,true);
 assert(tail.min.z<-.4&&tail.max.y<.15,`tail ${tail.min.z} ${tail.max.y}`);
 const eyes=new THREE.Box3().setFromObject(parts.find(m=>m.userData.part==='eyes'),true);
 assert(eyes.max.y>1.2,`snake eyes up to ${eyes.max.y}`);
 assert.equal(createCreature({name:'Medusa',symbol:64}).head.children[0].geometry,parts.find(m=>m.userData.part==='head').geometry,'geometry is shared');
});

test('the hezrou gets its own hunched, warty, fanged toad demon with a hinged jaw instead of the generic demon with a toad head',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const hz=createCreature({name:'hezrou',symbol:38,color:2});
 assert.equal(hz.kind,'hezrou');
 for(const key of ['body','head','jaw','arm'])assert(hz[key]?.isObject3D,key);
 assert.equal(hz.legs.length,2);assert.equal(hz.arms.length,2);
 assert(hz.head.children.includes(hz.jaw),'the jaw hinges from the head');
 const parts=meshes(hz);
 assert.equal(parts.length,11,'body, head, eyes, jaw, throat sac, two drools, two legs, two arms');
 assert(hz.jaw.children.includes(hz.sac),'the throat sac hangs from the jaw');
 assert.equal(hz.drools.length,2);for(const d of hz.drools)assert(hz.jaw.children.includes(d),'the drool hangs from the jaw');
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
 assert(b.max.y>1.05&&b.max.y<1.6,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.72,'out of proportion');
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
  assert(b.max.y>1.1&&b.max.y<1.7,`${kind} top at ${b.max.y}`);
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
 let rust=0;for(let i=0;i<c.count;i++){const r=c.getX(i),g=c.getY(i),b=c.getZ(i);if(r>g*1.3&&g>b&&r<.6)rust++;}
 assert(rust>200,`a half-eaten iron helm and a rusted dagger show rust, got ${rust}`);
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

test('the enormous rat is its own hulking, mangy rat, bigger than a giant rat, in nine shared draws',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const box=a=>{a.g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(a.g);};
 const m=createCreature({name:'enormous rat',symbol:114,color:3});
 assert.equal(m.quirk,'rat');assert.equal(m.legs.length,4);
 for(const h of ['body','head','tail'])assert(m[h]?.isObject3D,h);
 const parts=meshes(m);
 assert.deepEqual(parts.map(p=>p.userData.part).sort(),['body','eyes','foreleg','foreleg','head','hindleg','hindleg','tail','teeth']);
 for(const p of parts){const a=p.geometry.attributes;for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${p.userData.part} ${key}`);}
 assert(parts.find(p=>p.userData.part==='eyes').material.emissiveIntensity>0,'red eyes glow');
 const b=box(m);assert(b.min.y>-.005&&b.min.y<.01,`sits on the floor at ${b.min.y}`);
 assert(b.max.y>.5&&b.max.y<.75,`top at ${b.max.y}`);
 const reach=Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z);assert(reach<.9,`reach ${reach}`);
 // a longer torso than the giant rat's (whose ears and 1.25 scale make it as tall)
 const length=a=>{a.g.updateMatrixWorld(true);const t=new THREE.Box3().setFromObject(a.body.children[0]);return t.max.z-t.min.z;};
 assert(length(m)>length(createCreature({name:'giant rat',symbol:114})),'longer than a giant rat');
 const again=meshes(createCreature({name:'enormous rat',symbol:114}));
 parts.forEach((p,i)=>{assert.equal(p.geometry,again[i].geometry);assert.equal(p.material,again[i].material);});
});

test('the white naga is a pale Gehennom serpent with a crown of ice, frost fangs and rime on its coil',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const icy=o=>(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.emissive?.getHexString()==='3a90d0');
 const box=a=>{a.g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(a.g);};
 const w=createCreature({name:'white naga',symbol:78,color:15}),gold=createCreature({name:'golden naga',symbol:78,color:11});
 assert.equal(w.quirk,'snake');assert(w.tail?.isObject3D,'raised neck sways');
 const parts=meshes(w);assert(parts.length<=12,`${parts.length} meshes`);
 for(const p of parts)for(const v of p.geometry.attributes.position.array)assert(Number.isFinite(v),'finite');
 assert(parts.some(icy),'ice crest');assert(!meshes(gold).some(icy),'other nagas have no ice');
 const body=parts.find(p=>p.material.color?.getHexString()==='d8d8d0');assert(body,'bone-white scales');
 const b=box(w);assert(b.min.y>-.005&&b.min.y<.01,`on the floor at ${b.min.y}`);
 assert(b.max.y>box(gold).max.y,'taller than a golden naga');assert(b.max.y<1.1,`top ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.6,'stays on its tile');
 const baby=createCreature({name:'white naga hatchling',symbol:78,color:15});
 assert(!meshes(baby).some(icy),'hatchlings are plain');assert(box(baby).max.y<b.max.y);
});

test('the shambling horror gets its own lopsided body, not the umber hulk',()=>{
 const horror=createCreature({name:'shambling horror',symbol:85,color:14}),hulk=createCreature({name:'umber hulk',symbol:85,color:3});
 assert.equal(horror.legs.length,2);assert(horror.tail);
 horror.g.updateMatrixWorld(true);let meshes=0;
 horror.g.traverse(o=>{if(!o.isMesh)return;meshes++;for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v));});
 const b=new THREE.Box3().setFromObject(horror.g),hb=new THREE.Box3().setFromObject(hulk.g);
 assert(b.min.y>-.01);assert(b.max.y<1.5);assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.65);
 // the two legs differ: a club foot and a thin hock
 assert.notEqual(horror.legs[0].children.length,horror.legs[1].children.length);
 assert.notDeepEqual(b.max.toArray(),hb.max.toArray());assert(meshes<40);
});

test('the cobra spreads a ribbed hood with a spectacle mark on its own foldable handle',()=>{
 const c=createCreature({name:'cobra',symbol:83,color:4}),s=createCreature({name:'snake',symbol:83,color:3});
 assert.equal(c.quirk,'snake');assert(c.hood?.isObject3D,'hood handle');assert.equal(s.hood,undefined,'plain snakes have no hood');
 const mesh=c.hood.children.find(o=>o.isMesh);assert(mesh?.material.vertexColors,'one vertex-coloured hood mesh');
 const pos=mesh.geometry.attributes.position.array,col=mesh.geometry.attributes.color.array;
 for(const v of pos)assert(Number.isFinite(v),'finite');
 assert(pos.length/3<4000,`${pos.length/3} hood vertices`);
 // the spectacle: near-black eyes and a pale cream ring on the back
 let ink=0,pale=0;for(let i=0;i<col.length;i+=3){if(col[i]+col[i+1]+col[i+2]<.15)ink++;if(col[i]>.6&&col[i+1]>.5&&col[i+2]<.5)pale++;}
 assert(ink>10&&pale>10,`spectacle ink ${ink}, pale ${pale}`);
 c.g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(c.hood);
 assert(b.max.x-b.min.x>.3,`hood spreads ${b.max.x-b.min.x} wide`);assert(b.min.y>.15&&b.max.y<.6,`hood from ${b.min.y} to ${b.max.y}`);
 c.hood.scale.x=.3;c.g.updateMatrixWorld(true);const f=new THREE.Box3().setFromObject(c.hood);assert(f.max.x-f.min.x<.15,'folds flat against the neck');
});

test('snakes get a sculpted head with a hinged lower jaw, slit-eyed vipers with heat pits and fangs',()=>{
 const counts=name=>{const a=createCreature({name,symbol:83,color:3});let draws=0;a.g.traverse(o=>{if(o.isMesh){draws++;for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v),name);}});return {a,draws};};
 for(const name of ['garter snake','snake','water moccasin','pit viper','python','cobra']){
  const {a,draws}=counts(name);assert(a.jaw?.isObject3D,`${name} jaw handle`);assert.equal(a.jaw.parent,a.hood?.parent??a.jaw.parent);
  assert(draws<=(a.hood?6:5),`${name}: ${draws} draws`);
  const head=a.jaw.parent,skull=head.children.find(m=>m.userData.part==='skull');assert(skull?.material.vertexColors,name);
  // the cobra animation finds the tongue by where it sits in the head
  assert(head.children.some(m=>m.isMesh&&Math.abs(m.position.z-.12)<.01&&Math.abs(m.position.y+.01)<.01),`${name} tongue`);
  a.g.updateMatrixWorld(true);const shut=new THREE.Box3().setFromObject(a.jaw);a.jaw.rotation.x=.6;a.g.updateMatrixWorld(true);
  const open=new THREE.Box3().setFromObject(a.jaw);assert(open.min.y<shut.min.y-.04,`${name} jaw gapes`);
 }
 // the vipers' arrowhead jowls are broader than the garter snake's narrow head (relative to scale)
 const w=name=>{const a=createCreature({name,symbol:83,color:3});const s=a.jaw.parent.children.find(m=>m.userData.part==='skull').geometry;s.computeBoundingBox();return s.boundingBox;};
 assert(w('pit viper').max.z-w('pit viper').min.z>.15);
 const fangs=name=>{const c=createCreature({name,symbol:83,color:3}).jaw.parent.children.find(m=>m.userData.part==='skull').geometry.attributes.color.array;const f=new THREE.Color('#ece4cc');let n=0;for(let i=0;i<c.length;i+=3)if(Math.abs(c[i]-f.r)+Math.abs(c[i+1]-f.g)+Math.abs(c[i+2]-f.b)<.01)n++;return n;};
 assert(fangs('pit viper')>20,'viper fangs');assert.equal(fangs('python'),0,'no fangs on the python');
});

test('Cthulhu is its own towering, tentacle-bearded, winged horror instead of the small generic h',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const generic=createCreature({name:'',symbol:104,color:10}),c=createCreature({name:'Cthulhu',symbol:104,color:10});
 assert.equal(c.kind,'cthulhu');
 for(const key of ['body','head','tail','arm','weaponSocket'])assert(c[key]?.isObject3D,key);
 assert.equal(c.legs.length,2);assert.equal(c.arms.length,2);assert.equal(c.wings.length,2);
 const parts=meshes(c);assert.equal(parts.length,10,'one merged mesh per moving part, plus the eyes');
 for(const m of parts){for(const x of m.geometry.attributes.position.array)assert(Number.isFinite(x));for(const x of m.geometry.attributes.normal.array)assert(Number.isFinite(x));}
 c.g.updateMatrixWorld(true);generic.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(c.g,true),gb=new THREE.Box3().setFromObject(generic.g,true);
 assert(b.max.y>gb.max.y*1.5&&b.max.y<2.2,`stands ${b.max.y.toFixed(2)}`);
 assert(b.min.y>-.02,'feet on the floor');
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.8,'fits round its tile');
 // the tentacles hang from the face, in front of and below the eyes
 const eyes=parts.find(m=>m.userData.part==='eyes'),beard=new THREE.Box3().setFromObject(c.tail,true);
 const eyeAt=new THREE.Box3().setFromObject(eyes,true).getCenter(new THREE.Vector3());
 assert(beard.min.y<eyeAt.y-.4&&beard.max.z>eyeAt.z,'the beard hangs down the chest');
 assert(eyes.material.emissiveIntensity>1,'the eyes glow');
 // the wings rise behind the shoulders
 for(const w of c.wings)assert(new THREE.Box3().setFromObject(w,true).max.z<0,'wing behind');
 const again=meshes(createCreature({name:'Cthulhu'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('the dark Angel is a fallen angel, not the generic glowing one',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const dark=createCreature({name:'dark Angel',symbol:65,color:7}),plain=createCreature({name:'angel'});
 const colors=a=>new Set(meshes(a).map(m=>m.material.color.getHexString()));
 for(const c of ['1d1a21','8c8690','19141a','ff3a1e'])assert(colors(dark).has(c),`torn black robe, ashen skin, horns, ember glow: ${c}`);
 assert(!colors(dark).has('eeeae0')&&!colors(dark).has('d8b04a'),'no white robe or gold');
 assert.equal(dark.wings.length,2);
 assert(meshes(dark).some(m=>m.material.emissiveIntensity>1),'still glows, so petrify has something to dim');
 assert(meshes(dark).length<=28,`draws ${meshes(dark).length}`);
 // the halo's thorns and shard bake into one draw, and so do the archon's rays
 for(const a of [dark,createCreature({name:'archon'})])for(const m of meshes(a))assert(!m.parent.isMesh,'no mesh parented to a mesh');
 const box=a=>{a.g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(a.g,true);};
 const b=box(dark);
 assert(b.min.y>=0&&b.min.y<.03,`ragged hem stays above the floor ${b.min.y}`);
 assert(b.max.y>1&&b.max.y<1.5,`height ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<1,'wings fit');
 for(const m of meshes(dark))for(const x of m.geometry.attributes.position.array)assert(Number.isFinite(x));
 assert.equal(meshes(plain).length,22,'the Angel is unchanged');
});

test('weeping angels are weathered stone statues, hands over their faces, instead of the generic glowing angel',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 for(const name of ['weeping angel','weeping archangel']){
  const a=createCreature({name,symbol:65,color:7});
  assert.equal(a.kind,name);
  for(const key of ['body','head','arm','weaponSocket'])assert(a[key]?.isObject3D,key);
  assert.equal(a.arms.length,2);assert.equal(a.stoneWings.length,2);assert.equal(a.wings.length,0,'stone wings do not flutter');
  const parts=meshes(a);assert.equal(parts.length,6,'body, head, two arms, two wings');
  assert.equal(new Set(parts.map(m=>m.material)).size,1,'one stone material');
  for(const m of parts){for(const x of m.geometry.attributes.position.array)assert(Number.isFinite(x));for(const x of m.geometry.attributes.normal.array)assert(Number.isFinite(x));
   assert(!m.material.emissive||m.material.emissive.getHex()===0,'no glow');}
  a.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(a.g,true);
  assert(b.min.y>-.03&&b.min.y<.03,`stands on the floor ${b.min.y}`);
  assert(b.max.y>1&&b.max.y<1.8,`height ${b.max.y.toFixed(2)}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.6,'fits its tile');
  // the right palm sits on the face, and the wings rise over the bowed head behind it
  const palm=a.weaponSocket.getWorldPosition(new THREE.Vector3()),head=new THREE.Box3().setFromObject(a.head,true);
  assert(palm.y>head.min.y&&palm.y<head.max.y&&palm.z>head.getCenter(new THREE.Vector3()).z,'hand over the face');
  for(const w of a.stoneWings){const wb=new THREE.Box3().setFromObject(w,true);assert(wb.max.y>head.max.y,'wing crown over the head');assert(wb.max.z<head.min.z+.05,'wing behind');assert(wb.min.y<.45*a.g.scale.y,'primaries hang low');}
 }
 const again=meshes(createCreature({name:'weeping angel'}));
 meshes(createCreature({name:'weeping angel'})).forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
 assert.notEqual(meshes(createCreature({name:'weeping archangel'}))[0].geometry,again[0].geometry);
});

test('plain rats carry a head handle that turns the face about the neck and leaves the body put',()=>{
 for(const [name,symbol] of [['sewer rat',114],['giant rat',114],['rabid rat',114],['wererat',114]]){
  const m=createCreature({name,symbol,color:3});
  assert.equal(m.quirk,'rat',name);assert.ok(m.head,name);
  assert.equal(m.head.parent,m.body,name);
  assert.deepEqual(m.head.position.toArray(),RAT_NECK,name);
  // at rest the face sits exactly where it did before the handle: the snout ball at (0,.24,.35)
  m.g.updateMatrixWorld(true);
  const local=o=>m.body.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
  const snout=m.head.children[0].children[0],trunk=m.body.children[0];
  assert.ok(local(snout).distanceTo(new THREE.Vector3(0,.24,.35))<1e-9,name);
  const meshes=[];m.head.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert.ok(meshes.length>=15,`${name}: ${meshes.length}`);
  const before=local(snout),body=local(trunk);
  m.head.rotation.y=.6;m.g.updateMatrixWorld(true);
  assert.ok(local(snout).x>before.x+.05,name);
  assert.ok(local(trunk).distanceTo(body)<1e-12,name);
 }
});

test('the disintegrator is its own crumbling, green-lit bug instead of a green rust monster',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const d=createCreature({name:'disintegrator',symbol:82,color:10}),rust=createCreature({name:'rust monster',symbol:82,color:3});
 assert.equal(d.kind,'disintegrator');assert.equal(d.rustFeel,'disintegrator');
 assert.equal(d.feelers.length,2);for(const f of d.feelers)assert.equal(f.parent,d.feelHead);
 assert(d.vane.parent===d.tail&&d.tail.parent===d.body);assert.equal(d.legs.length,4);
 const parts=meshes(d);assert.equal(parts.length,12,'one merged mesh per moving part, plus two glow meshes');
 for(const m of parts){for(const x of m.geometry.attributes.position.array)assert(Number.isFinite(x));for(const x of m.geometry.attributes.normal.array)assert(Number.isFinite(x));}
 d.g.updateMatrixWorld(true);rust.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(d.g,true),rb=new THREE.Box3().setFromObject(rust.g,true);
 assert(b.min.y>-.02&&b.min.y<.03,`needle feet on the floor (${b.min.y.toFixed(3)})`);
 assert(b.max.y>rb.max.y,'bigger than a rust monster');
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.8,'fits round its tile');
 const glow=parts.filter(m=>m.material.emissiveIntensity>1).map(m=>m.userData.part).sort();
 assert.deepEqual(glow,['eyes','seams']);
 const again=meshes(createCreature({name:'disintegrator'}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('the Wizard of Yendor gets his own hooded sorcerer instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const wiz=createCreature({name:'Wizard of Yendor',symbol:64,color:5});
 assert.equal(wiz.kind,'wizard of yendor');assert.equal(wiz.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket','orb'])assert(wiz[key]?.isObject3D,key);
 assert.equal(wiz.legs.length,2);assert.equal(wiz.arms.length,2);assert.equal(wiz.arm,wiz.arms[1]);
 const parts=meshes(wiz);
 assert.equal(parts.length,9,'one mesh per moving part plus the eyes and the orb');
 assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['arm','body','eyes','head','leg','orb','staff']);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(a.color)for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<40000,`${verts} vertices`);
 wiz.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(wiz.body.children.find(o=>o.userData.part==='body'),true);
 assert(b.min.y>-.02&&b.min.y<.04,`hem at ${b.min.y}`);
 const all=new THREE.Box3().setFromObject(wiz.g,true);
 assert(all.max.y>1.4&&all.max.y<2.2,`top at ${all.max.y}`);
 assert(Math.max(-all.min.x,all.max.x,-all.min.z,all.max.z)<.45,'fits the tile');
 // the orb sits at the top of the staff, above the head
 const orb=new THREE.Vector3();wiz.orb.getWorldPosition(orb);
 const head=new THREE.Vector3();wiz.head.getWorldPosition(head);
 assert(orb.y>head.y+.1,`orb at ${orb.y}, head at ${head.y}`);
 assert.notEqual(createCreature({name:'wizard',symbol:64}).kind,'wizard of yendor');
 const again=meshes(createCreature({name:'Wizard of Yendor',symbol:64}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});
test('the doppelganger gets its own half-changed mimic instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const dop=createCreature({name:'doppelganger',symbol:64,color:7});
 assert.equal(dop.kind,'doppelganger');assert.equal(dop.quirk,'human');
 for(const key of ['body','head','arm','weaponSocket'])assert(dop[key]?.isObject3D,key);
 assert.equal(dop.legs.length,2);assert.equal(dop.arms.length,2);assert.equal(dop.arm,dop.arms[1]);
 const parts=meshes(dop);
 assert.equal(parts.length,7,'one mesh per moving part plus the eyes');
 assert.deepEqual([...new Set(parts.map(m=>m.userData.part))].sort(),['arm','body','eyes','head','leg']);
 let verts=0;
 for(const m of parts){
  const a=m.geometry.attributes;verts+=a.position.count;
  for(const key of ['position','normal','color'])for(const v of a[key].array)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  for(const v of a.color.array)assert(v>=0&&v<=1,m.userData.part);
 }
 assert(verts<30000,`${verts} vertices`);
 dop.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(dop.g,true);
 assert(b.min.y>-.03&&b.min.y<.03,`feet at ${b.min.y}`);
 assert(b.max.y>1.15&&b.max.y<1.35,`top at ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.45,'fits the tile');
 // the left arm's talons hang well below the human right hand
 const left=new THREE.Box3().setFromObject(dop.arms[0],true),right=new THREE.Box3().setFromObject(dop.arms[1],true);
 assert(left.min.y<right.min.y-.15,`talons at ${left.min.y}, hand at ${right.min.y}`);
 const again=meshes(createCreature({name:'doppelganger',symbol:64}));
 parts.forEach((m,i)=>assert.equal(m.geometry,again[i].geometry));
});

test('the minotaur gets its own hunched, horned bull-headed brute with a labrys instead of the giant',()=>{
 const m=createCreature({name:'minotaur',symbol:'H'.charCodeAt(0),color:3});
 assert.equal(m.kind,'minotaur');
 for(const k of ['head','arm','weaponSocket','tail','body'])assert(m[k],`handle ${k}`);
 assert.equal(m.legs.length,2);assert.equal(m.arms.length,2);
 let draws=0;m.g.traverse(o=>{if(o.isMesh){draws++;const p=o.geometry.attributes.position.array;assert(p.every(Number.isFinite),o.userData.part);}});
 assert(draws<=9,`draws ${draws}`);
 m.g.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(m.g),s=box.getSize(new THREE.Vector3());
 assert(box.min.y>-.02&&box.min.y<.02,`stands on the floor ${box.min.y}`);
 assert(s.y>1.7&&s.y<2.1,`height ${s.y}`);
 // the head hangs forward of the chest, below the top of the hump and horns
 const head=new THREE.Box3().setFromObject(m.head);
 assert(head.max.z>.4,`the muzzle juts forward ${head.max.z}`);
 assert(head.max.x-head.min.x>.5,`the horns sweep wide ${head.max.x-head.min.x}`);
 assert(m.weaponSocket.children.some(c=>c.userData.part==='labrys'));
 // the labrys is gripped low and held up beside the head, clear of it, not hung behind the hump
 const labrys=m.weaponSocket.children.find(c=>c.userData.part==='labrys'),lb=new THREE.Box3().setFromObject(labrys);
 assert(lb.max.y>1.25,`the double bit stands up by the head ${lb.max.y}`);
 assert(lb.max.z>.3,`it is carried in front, not behind ${lb.max.z}`);
 const hb=new THREE.Box3().setFromObject(m.head.children[0]),pos=labrys.geometry.attributes.position,v=new THREE.Vector3();
 for(let i=0;i<pos.count;i++)assert(!hb.containsPoint(v.fromBufferAttribute(pos,i).applyMatrix4(labrys.matrixWorld)),'the labrys clears the head');
});
test('the werecreatures in human form get a hunched, feral man with glowing slanted eyes, hackles, a torn shirt and clawed hands instead of the plain @ humanoid',()=>{
 const meshes=a=>{const l=[];a.g.traverse(o=>{if(o.isMesh)l.push(o);});return l;};
 const tops={};
 for(const name of ['werewolf','werejackal','wererat']){
  const w=createCreature({name,symbol:64,color:3});
  assert.equal(w.kind,name);assert.equal(w.quirk,'human');
  for(const key of ['body','head','arm','weaponSocket','eyes'])assert(w[key]?.isObject3D,`${name} ${key}`);
  assert.equal(w.legs.length,2);assert.equal(w.arms.length,2);assert(w.arm===w.arms[1]);
  assert(w.head.children.includes(w.eyes)&&w.eyes.userData.part==='eyes','were-shudder flares the eyes under the head');
  const parts=meshes(w);
  assert.equal(parts.length,7,'one mesh per moving part and the eyes');
  assert.equal(new Set(parts.map(m=>m.material)).size,2);
  let verts=0;
  for(const m of parts){
   const a=m.geometry.attributes;verts+=a.position.count;
   for(const key of ['position','normal'])for(const v of a[key].array)assert(Number.isFinite(v),`${name} ${m.userData.part} ${key}`);
   if(a.color)for(const v of a.color.array)assert(Number.isFinite(v)&&v>=0&&v<=1,`${name} ${m.userData.part}`);
  }
  assert(verts<40000,`${name}: ${verts} vertices`);
  w.g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(w.g,true);
  assert(b.min.y>-.03&&b.min.y<.03,`${name} feet at ${b.min.y}`);
  assert(b.max.y>1&&b.max.y<1.4,`${name} top at ${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.55,`${name} out of proportion`);
  tops[name]=b.max.y;
  // the eyes glow out of the sockets: looking at them from the front, they are hit first
  const eye=new THREE.Box3().setFromObject(w.eyes,true).getCenter(new THREE.Vector3());
  for(const s of [-1,1]){
   const hit=new THREE.Raycaster(new THREE.Vector3(eye.x+s*.03*w.g.scale.x,eye.y,2),new THREE.Vector3(0,0,-1)).intersectObjects(parts,false)[0];
   assert(hit?.object===w.eyes,`${name}: the ${s<0?'left':'right'} eye is hidden behind the ${hit?.object.userData.part}`);
  }
  // hunched: the head is thrust out ahead of the hips
  const hip=new THREE.Box3().setFromObject(w.legs[0],true).getCenter(new THREE.Vector3());
  assert(eye.z-hip.z>.15,`${name} stands upright (${eye.z-hip.z})`);
  const again=meshes(createCreature({name,symbol:64}));
  parts.forEach((m,i)=>assert(m.geometry===again[i].geometry));
 }
 assert(tops.werewolf>tops.wererat,'the werewolf stands over the wererat');
 // the beast forms keep their own models
 assert.notEqual(createCreature({name:'werewolf',symbol:100}).kind,'werewolf');
 assert.equal(createCreature({name:'human',symbol:64}).quirk,'human');
});

test('snake and naga tails narrow to a point',()=>{
 for(const name of ['garter snake','python','water moccasin','red naga','guardian naga']){
  const actor=createCreature({name,symbol:83,color:2});
  let longest=null,count=0;
  actor.g.traverse(m=>{if(m.geometry?.type==='TubeGeometry'&&(!longest||m.geometry.attributes.position.count>count)){longest=m;count=m.geometry.attributes.position.count;}});
  assert(longest,name);
  const pos=longest.geometry.attributes.position,ring=9,at=i=>{let cx=0,cy=0,cz=0;for(let j=0;j<8;j++){cx+=pos.getX(i*ring+j);cy+=pos.getY(i*ring+j);cz+=pos.getZ(i*ring+j);}cx/=8;cy/=8;cz/=8;
   let r=0;for(let j=0;j<8;j++)r+=Math.hypot(pos.getX(i*ring+j)-cx,pos.getY(i*ring+j)-cy,pos.getZ(i*ring+j)-cz);return r/8;};
  const rings=pos.count/ring-1;
  assert(at(0)<at(Math.floor(rings*.8))*.3,name+' tail tip is a point');
 }
});

test('a strange object is drawn as a mimic, not the default shape',()=>{
 const strange=createCreature({name:'strange object',symbol:93,color:3}),mimic=createCreature({name:'large mimic',symbol:109,color:3});
 const count=a=>{let n=0;a.g.traverse(o=>{if(o.isMesh)n++;});return n;};
 assert.equal(count(strange),count(mimic));
 assert.ok(count(strange)>10);
});

test('the purple worm has a venom-lit gullet and long fangs; the long worm does not',()=>{
 const has=(name,n)=>{let f=false;createCreature({name,symbol:87,color:5}).g.traverse(o=>{if(o.isMesh&&o.material.name===n)f=true;});return f;};
 assert(has('purple worm','worm-venom')&&has('purple worm','worm-fangs'));
 assert(!has('long worm','worm-venom')&&!has('baby purple worm','worm-fangs'));
});

test('the titan is a scarred colossus, taller than any ordinary giant',()=>{
 const t=createCreature({name:'titan',symbol:72,color:5}),f=createCreature({name:'fire giant',symbol:72,color:1});
 assert(t.g.userData.scarred&&!f.g.userData.scarred,'war-scars on the breastplate');
 assert(t.g.scale.y>=1.4&&t.g.scale.y>f.g.scale.y,'the titan towers over giants');
});

test('angels, the dark Angel, aleaxes and archons stand taller than a man, the archon tallest of the light',()=>{
 const h=n=>{const c=createCreature({name:n});c.g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(c.g).getSize(new THREE.Vector3()).y;};
 const [angel,aleax,archon,dark]=['angel','aleax','archon','dark angel'].map(h);
 assert(angel>h('dwarf')*.95&&aleax>1.1,`angel ${angel} aleax ${aleax}`);
 assert(archon>angel&&angel>aleax,`archon ${archon} angel ${angel} aleax ${aleax}`);
 assert(dark>angel,`dark angel ${dark} looms over an angel ${angel}`);
});

test('the kraken is a towering, beaked drowner',()=>{
 const k=createCreature({name:'kraken',symbol:';'.charCodeAt(0),color:1});
 assert(k.g.scale.x>=1.3,'larger than a man');
 let beak=false;k.g.traverse(m=>{if(m.isMesh&&m.material.color?.getHexString()==='1a1410')beak=true;});
 assert(beak,'a dark horny beak');
});

test('trappers carry the bones of their meals on the mantle',()=>{
 for(const name of ['trapper','lurker above']){
  const t=createCreature({name,symbol:'t'.charCodeAt(0),color:1});
  let bone=false;t.g.traverse(m=>{if(m.isMesh&&m.material.color?.getHexString()==='cfc4a4')bone=true;});
  assert(bone,name);
 }
});

test('War, the fourth Rider, wears a dark red robe and carries a sword like his brothers',()=>{
 const w=createCreature({name:'war',symbol:'&'.charCodeAt(0),color:1}),d=createCreature({name:'death',symbol:'&'.charCodeAt(0),color:1});
 assert.equal(w.wraith,'war');
 const hh=a=>new THREE.Box3().setFromObject(a.g).getSize(new THREE.Vector3()).y;
 assert(hh(w)>1.2,'War towers over a man');
 const meshes=a=>{let n=0;a.g.traverse(o=>{if(o.isMesh)n++;});return n;};
 assert(meshes(w)>meshes(d),'War carries a blade Death does not');
});

test('lemures weep raw red sores and a bone splinter breaks through the mass',()=>{
 const lemure=createCreature({name:'lemure',symbol:105,color:3});
 const col=lemure.body.children.find(o=>o.isMesh).geometry.attributes.color.array;
 const want=new THREE.Color('#5a1210');let sore=0;
 for(let i=0;i<col.length;i+=3)if(Math.abs(col[i]-want.r)<.01&&Math.abs(col[i+1]-want.g)<.01&&Math.abs(col[i+2]-want.b)<.01)sore++;
 assert(sore>20,`sore vertices: ${sore}`);
});

test('the rust monster is pitted by corrosion and its feet end in hooked claws; the disenchanter stays smooth',()=>{
 const count=a=>{let n=0;a.g.traverse(o=>{if(o.isMesh)n++;});return n;};
 const rust=createCreature({name:'rust monster',symbol:82,color:3}),dis=createCreature({name:'disenchanter',symbol:82,color:4});
 assert(count(rust)>count(dis),'extra pit and claw meshes');
 rust.g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(rust.g,true);
 assert(b.min.y>-.05&&b.min.y<.05,`claws stay on the floor (${b.min.y.toFixed(3)})`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.8,'fits round its tile');
});

test('gargoyles burn with ember seams in the stone of their chest and back',()=>{
 const lit=a=>{let n=0;a.g.traverse(o=>{if(o.isMesh&&o.material.emissiveIntensity>2)n+=o.geometry.attributes.position.count;});return n;};
 const g=createCreature({name:'gargoyle',symbol:89,color:3}),w=createCreature({name:'winged gargoyle',symbol:89,color:4});
 assert(lit(g)>2000,`lit vertices ${lit(g)}`);assert(lit(w)>2000);
 g.g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g.g,true);
 assert(b.min.y>-.05&&b.max.y<1.5,'stays in bounds');
});

test('rust monsters bristle with a jagged spine ridge; acid blobs carry bone splinters',()=>{
 const count=a=>{let n=0;a.g.traverse(o=>{if(o.isMesh)n+=o.geometry.attributes.position.count;});return n;};
 const rust=createCreature({name:'rust monster',symbol:82,color:3}),dis=createCreature({name:'disenchanter',symbol:82,color:4});
 rust.g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(rust.g,true);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.8,'fits round its tile');
 assert(count(rust)>count(dis)+150,'spine and pit geometry');
 const blob=createCreature({name:'acid blob',symbol:98,color:10}),jelly=createCreature({name:'blue jelly',symbol:106,color:4});
 const meshes=x=>{let n=0;x.g.traverse(o=>{if(o.isMesh)n++;});return n;};
 assert.equal(meshes(blob),10,'body, nucleus, five lobes and three bone splinters');assert.equal(meshes(jelly),11);
});

test('a wyvern tail stinger keeps it inside its tile',()=>{
 const count=a=>{let n=0;a.g.traverse(o=>{if(o.isMesh)n++;});return n;};
 const wy=createCreature({name:'wyvern',symbol:68,color:3}),dr=createCreature({name:'draken',symbol:68,color:3});
 assert(count(wy)>0&&count(dr)>0);
 wy.g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(wy.g,true);
 assert(b.min.y>-.05,'stays on the floor');assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<1.6,'fits round its tile');
});
