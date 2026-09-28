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

test('plain dwarves carry a finite forged pick-axe in hand; lords keep it and kings carry a sceptre instead',()=>{
 for(const [name,hasPick] of [['dwarf',true],['dwarf lord',true],['dwarf king',false]]){
  const actor=createCreature({name,symbol:104,color:1});
  const pick=actor.g.getObjectByName('dwarf-pick');
  assert.equal(Boolean(pick),hasPick,name);
  actor.g.updateMatrixWorld(true);
  actor.g.traverse(part=>{if(part.geometry)for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),name);});
  const bounds=new THREE.Box3().setFromObject(actor.g);
  assert(bounds.min.y>-.05,name);assert(bounds.max.y<1.4,name);
  if(!pick)continue;
  const box=new THREE.Box3().setFromObject(pick);
  // held at the dwarf's left side: the butt clears the floor and the head stays near head height
  assert(box.min.y>0&&box.max.y<1.15&&box.min.x>-.85&&box.max.x<0,name);
  // the head's end caps face outward along the head, so neither end is hollow
  const head=pick.children.find(child=>child.geometry?.attributes.color);
  const positions=head.geometry.attributes.position,index=head.geometry.index.array,ends=[0,0];
  for(let i=index.length-20*3;i<index.length;i+=3){
   const [a,b,c]=[index[i],index[i+1],index[i+2]].map(n=>new THREE.Vector3().fromBufferAttribute(positions,n));
   const normal=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a));
   const centroid=a.clone().add(b).add(c).divideScalar(3);
   if(normal.lengthSq()>0)ends[centroid.x<0?0:1]+=Math.sign(normal.x*centroid.x);
  }
  assert(ends[0]>0&&ends[1]>0,name);
 }
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
 assert(ms<200,`took ${ms} ms`);
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
 assert(ms<200,`took ${ms} ms`);
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
 assert(ms<200,`took ${ms} ms`);
 assert.equal(createCreature({name:'manes',symbol:I,color:1}).quirk,'manes');
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
  assert(ms<300,`${name} took ${ms} ms`);
 }
 // kinds share the material but not the (differently coloured) geometry
 const [wood,king]=['Woodland-elf','Elvenking'].map(n=>meshes(createCreature({name:n,symbol:AT})));
 assert.equal(wood[0].material,king[0].material);assert.notEqual(wood[0].geometry,king[0].geometry);
 assert.equal(createCreature({name:'nurse',symbol:AT,color:7}).quirk,'human');
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
  assert(ms<300,`${name} took ${ms} ms`);
 }
 const [temple,high]=['aligned priest','high priest'].map(n=>meshes(createCreature({name:n,symbol:AT})));
 assert.equal(temple[0].material,high[0].material);assert.notEqual(temple[0].geometry,high[0].geometry);
 assert.equal(temple[6].geometry,high[6].geometry,'one mace geometry for every priest');
});
