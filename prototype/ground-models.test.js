import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundModel,eucalyptusLeafGeometry,kelpFrondGeometry,eggGeometry,meatballGeometry,meatStickGeometry,meatRingGeometry,meatHaunchGeometry,tinGeometry,creamPieGeometry,pancakeGeometry,fortuneCookieGeometry,candyBarGeometry,royalJellyGeometry,lembasGeometry,tripeRationGeometry,shapedStone} from './ground-models.js';
import {candelabrumState} from './candelabrum.js';
import {markerCharges} from './marker.js';
import {createCorpse,corpsePlan,corpseSize} from './corpse.js';

test('grease can has a grounded finite tin model and releases resources',()=>{
 const model=createGroundModel({name:'an uncursed can of grease (0:12)',class:6});
 assert(model);
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.min.y>=0);assert(bounds.max.y<.25);
 assert(model.children.some(part=>part.geometry.type==='CylinderGeometry'));
 let geometries=0,materials=0;
 const uniqueMaterials=new Set();
 model.traverse(part=>{if(part.geometry){
  for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
  part.geometry.addEventListener('dispose',()=>geometries++);
  uniqueMaterials.add(part.material);
 }});
 for(const material of uniqueMaterials)material.addEventListener('dispose',()=>materials++);
 model.userData.dispose();
 assert.equal(geometries,model.children.length);assert.equal(materials,uniqueMaterials.size);
 assert.equal(createGroundModel({name:'can of grease',class:7}),null);
});

test('oil and magic lamps share a grounded, disposable model',()=>{
 const models=['oil lamp','magic lamp','a brass lamp'].map(name=>createGroundModel({name,class:6}));
 const signature=model=>model.children.map(part=>[part.geometry.type,...part.position.toArray(),part.material.color.getHex()]);
 for(const model of models){
  assert(model);
  assert.deepEqual(signature(model),signature(models[0]));
  const bounds=new THREE.Box3().setFromObject(model);
  assert(bounds.min.y>=-1e-7);
  assert(bounds.max.x-bounds.min.x>.6,'spout and handle create a long silhouette');
  let disposed=0;
  model.traverse(part=>{if(part.geometry){
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>disposed++);
  }});
  model.userData.dispose();
  assert.equal(disposed,model.children.length);
 }
 assert.equal(createGroundModel({name:'lamp',class:7}),null);
});

test('spellbooks are grounded, tinted by glyph colour only, and release resources',()=>{
 const book=(name,color)=>createGroundModel({name,class:10,color});
 const signature=model=>model.children.map(part=>[part.geometry.type,...part.position.toArray(),part.material.color.getHex()]);
 const red=book('spellbook of force bolt',1);
 assert(red);
 assert.deepEqual(signature(book('spellbook of wishing',1)),signature(red),'the true spell name must not show');
 assert.notDeepEqual(signature(book('spellbook of force bolt',4)),signature(red));
 assert(book('spellbook of sleep'),'an uncoloured book still gets a cover');
 const bounds=new THREE.Box3().setFromObject(red);
 assert(bounds.min.y>=-1e-7);assert(bounds.max.y<.15);
 assert(bounds.max.x-bounds.min.x<.6&&bounds.max.z-bounds.min.z<.7);
 let disposed=0;
 red.traverse(part=>{if(part.geometry){
  for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
  part.geometry.addEventListener('dispose',()=>disposed++);
 }});
 red.userData.dispose();
 assert.equal(disposed,red.children.length);
});

test('gems, gray stones and rocks are grounded, hide their identity, and release resources',()=>{
 const stone=(name,appearance,color)=>createGroundModel({name,class:13,appearance,color});
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push([part.geometry.type,...part.position.toArray(),part.material.color.getHex()]);});return out;};
 const ruby=stone('ruby','red',1);
 assert.deepEqual(signature(stone('worthless piece of red glass','red',1)),signature(ruby),'glass must match the real gem');
 assert.notDeepEqual(signature(stone('sapphire','blue',4)),signature(ruby));
 assert.deepEqual(signature(stone('luckstone','gray',7)),signature(stone('flint','gray',7)));
 for(const model of [ruby,stone('diamond','white',15),stone('loadstone','gray',7),stone('rock',undefined,7),stone('small piece of unrefined mithril','silvery metal',6)]){
  assert(model);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(bounds.min.y>=-1e-6,`grounded: ${bounds.min.y}`);assert(bounds.max.y<.25);
  assert(bounds.max.x-bounds.min.x<.4&&bounds.max.z-bounds.min.z<.4);
  let geometries=0,disposed=0;
  model.traverse(part=>{if(part.geometry){
   geometries++;
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>disposed++);
  }});
  model.userData.dispose();
  assert.equal(disposed,geometries);
 }
});

test('apples, oranges and pears are shaped, painted and stacked in two meshes',()=>{
 for(const kind of ['apple','orange','pear']){let single=0;for(const count of [1,2,3,7]){
  const name=count===1?kind:`${count} ${kind}s`,model=createGroundModel({name,class:7});
  const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['fruit-plant','fruit-skin'],name);
  for(const mesh of meshes){
   assert(mesh.geometry.attributes.color,`${name} painted`);
   for(const value of mesh.geometry.attributes.normal.array)assert(Number.isFinite(value),`${name} normals`);
  }
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} grounded: ${bounds.min.y}`);
  assert(bounds.max.y<.26,`${name} height ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} centred on the tile`);
  // A stack has as much skin as up to three fruit, no more.
  const skin=meshes.find(m=>m.userData.part==='fruit-skin').geometry.attributes.position.count;
  if(count===1)single=skin;else assert(skin>single*1.5&&skin<=single*3.2,`${name} stack size`);
  model.userData.dispose();
 }}
});

test('melons and bananas are shaped and painted in the fruit meshes',()=>{
 const parts=model=>{const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});return meshes;};
 const skinCount=name=>{const model=createGroundModel({name,class:7}),count=parts(model).find(m=>m.userData.part==='fruit-skin').geometry.attributes.position.count;model.userData.dispose();return count;};
 for(const name of ['melon','2 melons','6 melons','banana','2 bananas','3 bananas','12 bananas']){
  const model=createGroundModel({name,class:7}),meshes=parts(model);
  // Melons carry a stem and tendril; a banana's crown is part of its skin.
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),/melon/.test(name)?['fruit-plant','fruit-skin']:['fruit-skin'],name);
  for(const mesh of meshes){
   assert(mesh.geometry.attributes.color,`${name} painted`);
   for(const key of ['position','normal'])for(const value of mesh.geometry.attributes[key].array)assert(Number.isFinite(value),`${name} ${key}`);
  }
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} grounded: ${bounds.min.y}`);
  assert(bounds.max.y<(/melon/.test(name)?.26:.08),`${name} height ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.36,`${name} inside the tile`);
  model.userData.dispose();
 }
 // Two melons at most; a hand of up to three bananas.
 assert.equal(skinCount('6 melons'),skinCount('melon')*2);
 assert.equal(skinCount('12 bananas'),skinCount('3 bananas'));
 assert(skinCount('3 bananas')>skinCount('banana')*2.5);
});

test('carrots are ringed roots with feathery tops lying on the floor, up to three to a bunch',()=>{
 const parts=model=>{const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});return meshes;};
 const counts={};
 for(const name of ['carrot','2 carrots','3 carrots','8 carrots']){
  const model=createGroundModel({name,class:7}),meshes=parts(model);
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['fruit-plant','fruit-skin'],name);
  for(const mesh of meshes){
   assert(mesh.geometry.attributes.color,`${name} painted`);
   for(const key of ['position','normal'])for(const value of mesh.geometry.attributes[key].array)assert(Number.isFinite(value),`${name} ${key}`);
  }
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} grounded: ${bounds.min.y}`);
  assert(bounds.max.y<.08,`${name} lies flat: ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} inside the tile`);
  // The tops droop onto the floor but never through it.
  assert(new THREE.Box3().setFromObject(meshes.find(m=>m.userData.part==='fruit-plant')).min.y>=-1e-6,`${name} tops above the floor`);
  counts[name]=meshes.find(m=>m.userData.part==='fruit-skin').geometry.attributes.position.count;
  model.userData.dispose();
 }
 assert.equal(counts['8 carrots'],counts['3 carrots']);
 assert(counts['3 carrots']>counts.carrot*2.5);
});

test('garlic is a papery bulb on its roots with up to three loose cloves beside it',()=>{
 const counts={};
 for(const name of ['clove of garlic','2 cloves of garlic','3 cloves of garlic','9 cloves of garlic']){
  const model=createGroundModel({name,class:7}),meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
  assert.deepEqual(meshes.map(m=>m.userData.part),['garlic'],name);
  const {attributes}=meshes[0].geometry;
  for(const key of ['position','normal','color'])for(const value of attributes[key].array)assert(Number.isFinite(value),`${name} ${key}`);
  for(const value of attributes.color.array)assert(value>=0&&value<=1,`${name} colour`);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} grounded: ${bounds.min.y}`);
  assert(bounds.max.y>.1&&bounds.max.y<.13,`${name} height: ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.16,`${name} inside the tile`);
  counts[name]=attributes.position.count;
  model.userData.dispose();
 }
 assert(counts['2 cloves of garlic']>counts['clove of garlic']);
 assert.equal(counts['9 cloves of garlic'],counts['3 cloves of garlic']);
});

test('wolfsbane is one merged sprig of hooded flowers and cut leaves lying on the floor',()=>{
 const model=createGroundModel({name:'sprig of wolfsbane',class:7}),meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
 assert.deepEqual(meshes.map(m=>m.userData.part),['wolfsbane']);
 const {attributes}=meshes[0].geometry;
 for(const key of ['position','normal','color'])for(const value of attributes[key].array)assert(Number.isFinite(value),key);
 for(const value of attributes.color.array)assert(value>=0&&value<=1,'colour');
 const bounds=new THREE.Box3().setFromObject(model);
 assert(Math.abs(bounds.min.y)<1e-6,`grounded: ${bounds.min.y}`);
 assert(bounds.max.y>.04&&bounds.max.y<.09,`height: ${bounds.max.y}`);
 assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,'inside the tile');
 assert(attributes.position.count<12000,`vertices: ${attributes.position.count}`);
 model.userData.dispose();
});

test('common food gets grounded, finite models and unknown food falls back',()=>{
 const foods=['apple','3 oranges','pear','melon','banana','carrot','2 eggs','tin','lembas wafer','fortune cookie','meatball','meat stick','huge chunk of meat','meat ring','2 cloves of garlic','lump of royal jelly','cream pie','candy bar','pancake','kelp frond','slime mold','eucalyptus leaf','3 eucalyptus leaves'];
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push(part.userData.part??part.geometry.type);});return out.join();};
 const seen=new Set();
 for(const name of foods){
  const model=createGroundModel({name,class:7});
  assert(model,name);
  seen.add(signature(model));
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} grounded: ${bounds.min.y}`);
  assert(bounds.max.y<.3,`${name} height ${bounds.max.y}`);
  assert(bounds.max.x-bounds.min.x<.5&&bounds.max.z-bounds.min.z<.5,`${name} footprint`);
  let geometries=0,disposed=0;
  model.traverse(part=>{if(part.geometry){
   geometries++;
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>disposed++);
  }});
  model.userData.dispose();
  assert.equal(disposed,geometries);
 }
 assert(seen.size>=15,'kinds should look different');
 assert.equal(createGroundModel({name:'glob of gray ooze',class:7}),null);
});

test('scrolls lie on the floor and show only their shuffled label',()=>{
 const scroll=(name,appearance)=>createGroundModel({name,class:9,appearance});
 const signature=model=>model.children.map(part=>[part.geometry.attributes.position.count,...part.position.toArray().map(n=>n.toFixed(5)),[...part.geometry.attributes.color.array].map(n=>n.toFixed(3)).join()]);
 const models={labelled:scroll('scroll of identify','ZELGO MER'),blank:scroll('scroll of blank paper','unlabeled'),mail:scroll('scroll of mail','stamped'),bare:scroll('scroll',undefined)};
 for(const [kind,model] of Object.entries(models)){
  assert(model,kind);
  assert.equal(model.children.length,1,`${kind} bakes into one draw`);
  assert(model.children[0].material.vertexColors,`${kind} is painted with vertex colours`);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(bounds.min.y>-1e-6&&bounds.min.y<1e-6,`${kind} rests on the floor`);
  assert(bounds.max.y<.12,`${kind} lies flat`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${kind} fits its tile`);
  let geometries=0;
  model.traverse(part=>{if(part.geometry){
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>geometries++);
  }});
  model.userData.dispose();
  assert.equal(geometries,model.children.length);
 }
 assert.deepEqual(signature(scroll('scroll of genocide','ZELGO MER')),signature(scroll('scroll of identify','ZELGO MER')),'the true scroll name must not show');
 assert.notDeepEqual(signature(scroll('scroll of identify','ELBIB YLOH')),signature(scroll('scroll of identify','ZELGO MER')));
 const verts=model=>model.children[0].geometry.attributes.position.count;
 assert(verts(models.blank)<verts(models.labelled),'unlabeled paper has no ribbon, seal or script');
 assert.equal(createGroundModel({name:'scroll of identify',class:6}),null);
});

test('common tools get grounded, finite models that share their unidentified look',()=>{
 const tools=['tin whistle','mirror','crystal ball','tooled horn','bugle','wooden flute','wooden harp','leather drum','bell','stethoscope','tin opener','leash','saddle','chest','large box','ice box','tinning kit','expensive camera','lenses','credit card','beartrap','land mine','grappling hook'];
 const signature=model=>model.children.map(part=>[part.geometry.attributes.position.count,...part.position.toArray().map(n=>n.toFixed(5)),[...part.geometry.attributes.color.array].map(n=>n.toFixed(3)).join()]);
 for(const name of tools){
  const model=createGroundModel({name,class:6});
  assert(model,name);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(bounds.min.y>-1e-6&&bounds.min.y<1e-6,`${name} rests on the floor`);
  assert(bounds.max.y<.5,`${name} is not too tall`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} fits its tile`);
  let geometries=0;
  model.traverse(part=>{if(part.geometry){
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>geometries++);
  }});
  model.userData.dispose();
  assert.equal(geometries,model.children.length);
 }
 for(const [a,b] of [['tin whistle','magic whistle'],['tooled horn','frost horn'],['wooden harp','magic harp'],['leather drum','drum of earthquake'],['wooden flute','magic flute'],['iron hook','grappling hook']])
  assert.deepEqual(signature(createGroundModel({name:a,class:6})),signature(createGroundModel({name:b,class:6})),`${a} and ${b} look alike`);
 assert.notDeepEqual(signature(createGroundModel({name:'unicorn horn',class:6})),signature(createGroundModel({name:'tooled horn',class:6})));
 assert.equal(createGroundModel({name:'chest',class:3}),null);
});

test('rings lie on the floor and show only their shuffled appearance',()=>{
 const ring=(name,appearance)=>createGroundModel({name,class:4,appearance});
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push([part.geometry.type,part.geometry.attributes.position.count,...part.position.toArray().map(n=>n.toFixed(5)),part.material.color.getHex()]);});return out;};
 for(const look of ['gold','wooden','ruby','pearl','jade','twisted','wire','ridged','engagement','wedding','shiny',undefined]){
  const model=ring('ring of conflict',look);
  assert(model,look);
  // Nothing moves, so each material is one merged mesh: the band and (if set) the stone.
  const materials=new Set();let draws=0;model.traverse(part=>{if(part.isMesh){draws++;materials.add(part.material);}});
  assert(draws<=2&&draws===materials.size,`${look}: ${draws} draws`);
  const bounds=new THREE.Box3().setFromObject(model,true);
  assert(Math.abs(bounds.min.y)<1e-6,`${look} rests on the floor`);
  assert(bounds.max.y<.14,`${look} lies low`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.16,`${look} fits its tile`);
  let meshes=0,geometries=0;
  model.traverse(part=>{if(part.geometry){
   meshes++;
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>geometries++);
  }});
  model.userData.dispose();
  assert.equal(geometries,meshes);
 }
 assert.deepEqual(signature(ring('ring of conflict','ruby')),signature(ring('ring of hunger','ruby')),'the true ring name must not show');
 assert.notDeepEqual(signature(ring('ring of conflict','ruby')),signature(ring('ring of conflict','iron')));
 assert.equal(createGroundModel({name:'ring of conflict',class:6}),null);
});

test('amulets lie on the floor and show only their shuffled appearance',()=>{
 const amulet=(name,appearance)=>createGroundModel({name,class:5,appearance});
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push([part.geometry.type,part.geometry.attributes.position.count,...part.position.toArray().map(n=>n.toFixed(5)),part.material.color.getHex()]);});return out;};
 for(const look of ['circular','spherical','oval','triangular','pyramidal','square','concave','hexagonal','octagonal','warped','convex','lunate','spiked','rectangular','elliptic','Amulet of Yendor',undefined]){
  const model=amulet('amulet of ESP',look);
  assert(model,look);
  // Nothing moves, so each material is one merged mesh: setting, chain and (mostly) a stone.
  const materials=new Set();let draws=0;model.traverse(part=>{if(part.isMesh){draws++;materials.add(part.material);}});
  assert(draws<=3&&draws===materials.size,`${look}: ${draws} draws`);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6,`${look} rests on the floor`);
  assert(bounds.max.y<.09,`${look} lies low`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.22,`${look} fits its tile`);
  let meshes=0,geometries=0;
  model.traverse(part=>{if(part.geometry){
   meshes++;
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>geometries++);
  }});
  model.userData.dispose();
  assert.equal(geometries,meshes);
 }
 assert.deepEqual(signature(amulet('amulet of ESP','hexagonal')),signature(amulet('amulet of strangulation','hexagonal')),'the true amulet name must not show');
 assert.deepEqual(signature(amulet('Amulet of Yendor','Amulet of Yendor')),signature(amulet('cheap plastic imitation of the Amulet of Yendor','Amulet of Yendor')));
 assert.notDeepEqual(signature(amulet('amulet of ESP','hexagonal')),signature(amulet('amulet of ESP','lunate')));
});

test('shields lie face-up and show their appearance, not their true name',()=>{
 const shield=(name,appearance)=>createGroundModel({name,class:3,appearance});
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push([part.geometry.type,part.geometry.attributes.position.count,...part.position.toArray().map(n=>n.toFixed(5)),part.material.color.getHex()]);});return out;};
 const kinds=[['small shield'],['elven shield','blue and green shield'],['Uruk-hai shield','white-handed shield'],['orcish shield','red-eyed shield'],['large shield'],['dwarvish roundshield','large round shield'],['shield of reflection','polished silver shield']];
 const seen=new Set();
 for(const [name,look] of kinds){
  const model=shield(name,look);
  assert(model,name);
  // Nothing moves, so each material is one merged mesh.
  const materials=new Set();let draws=0;model.traverse(part=>{if(part.isMesh){draws++;materials.add(part.material);}});
  assert(draws<=6&&draws===materials.size,`${name}: ${draws} draws`);
  const bounds=new THREE.Box3().setFromObject(model,true);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} rests on the floor`);
  assert(bounds.max.y<.08,`${name} lies flat`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.36,`${name} fits its tile`);
  let meshes=0,geometries=0;
  model.traverse(part=>{if(part.geometry){
   meshes++;
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>geometries++);
  }});
  seen.add(JSON.stringify(signature(model)));
  model.userData.dispose();
  assert.equal(geometries,meshes);
 }
 assert.equal(seen.size,kinds.length,'each shield kind looks different');
 assert.deepEqual(signature(shield('shield of reflection','polished silver shield')),signature(shield('small shield','polished silver shield')),'the true shield name must not show');
 assert.equal(createGroundModel({name:'small shield',class:6}),null);
});

test('spellbook covers follow the shuffled appearance and stay grounded',()=>{
 const looks=['parchment','vellum','ragged','dog eared','mottled','stained','cloth','leather','white','pink','red','orange','yellow','velvet',
  'light green','dark green','turquoise','cyan','light blue','dark blue','indigo','magenta','purple','violet','tan','plaid','light brown',
  'dark brown','gray','wrinkled','dusty','bronze','copper','silver','gold','glittering','shining','dull','thin','thick','colorful','dark',
  'spotted','faded','long','rainbow','ochre','tattered','wide','big','fuzzy','black','left-handed','psychedelic','spiral-bound','stapled',
  'stylish','tartan','chartreuse','decrepit','paperback','crimson','charcoal','plain','papyrus'];
 const book=(name,appearance,color=15)=>createGroundModel({name,class:10,appearance,color});
 // The matte parts share one white material, so their painted colours go in the signature too.
 const paint=part=>part.geometry.attributes.color?.array.reduce((sum,v,i)=>sum+v*(1+i%3),0).toFixed(3)??'';
 const signature=model=>model.children.map(part=>[part.geometry.attributes.position.count,part.material.color.getHex(),paint(part)]);
 const seen=new Set();
 for(const look of looks){
  const model=book('spellbook of force bolt',look);
  // Nothing on a book moves, so each material is one baked draw.
  assert.equal(model.children.length,new Set(model.children.map(part=>part.material)).size,`${look}: one draw per material`);
  assert(model.children.length<=4,`${look}: the plain parts share one matte paint: ${model.children.length} draws`);
  assert.deepEqual(signature(book('spellbook of wishing',look)),signature(model),`${look}: the true spell must not show`);
  seen.add(JSON.stringify(signature(model)));
  const bounds=new THREE.Box3().setFromObject(model);
  assert(bounds.min.y>=-1e-6,`${look} rests on the floor: ${bounds.min.y}`);
  assert(bounds.max.y<.17,`${look} lies low: ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.42,`${look} fits its tile`);
  let disposed=0;
  model.traverse(part=>{if(part.geometry){
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value),look);
   part.geometry.addEventListener('dispose',()=>disposed++);
  }});
  model.userData.dispose();
  assert.equal(disposed,model.children.length);
 }
 assert(seen.size>=30,`covers should vary: ${seen.size}`);
});

test('the looking glass lies flat with a painted reflection, a beaded frame and a turned handle',()=>{
 const model=createGroundModel({name:'mirror',class:6});
 const bounds=new THREE.Box3().setFromObject(model);
 assert(Math.abs(bounds.min.y)<1e-6);assert(bounds.max.y<.05,'it lies face up');
 assert(Math.abs(bounds.min.x+bounds.max.x)<1e-6,'centred on the tile');
 const glass=model.children.find(part=>part.material.vertexColors);
 assert(glass,'the glass carries a painted reflection');
 const colors=glass.geometry.attributes.color.array;
 assert(Math.max(...colors)-Math.min(...colors)>.4,'the reflection has bright streaks');
 const frame=model.children.find(part=>part.material.metalness>.8);
 assert(frame.geometry.attributes.position.count>3000,'moulded frame with a beaded rim and crest');
 assert.equal(model.children.length,new Set(model.children.map(part=>part.material)).size,'one draw per material');
 assert(model.children.length<=5);
 model.userData.dispose();
});

test('the blindfold is a padded silk band tied in a loop with frayed trailing ties',()=>{
 const model=createGroundModel({name:'an uncursed blindfold',class:6});
 assert(model,'blindfolds have a ground model');
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.min.y>=-1e-6);assert(bounds.max.y<.04,'it lies flat');
 assert(bounds.max.x-bounds.min.x>.35,'the ties trail out from the loop');
 let vertices=0;
 model.traverse(part=>{if(part.geometry){const a=part.geometry.attributes.position.array;vertices+=a.length/3;for(const value of a)assert(Number.isFinite(value));}});
 assert(vertices<20000,`vertices: ${vertices}`);
 assert(vertices>4000,'hems, stitches and frayed threads are all there');
 const materials=new Set(model.children.map(part=>part.material));
 assert(model.children.length<=3&&model.children.length===materials.size,`one draw per material, got ${model.children.length}`);
 model.userData.dispose();
});

test('every bag shares one cinched drawstring sack, so the kind never shows',()=>{
 const signature=model=>model.children.map(part=>[part.geometry.attributes.position.count,part.material.color.getHex()]);
 const models=['bag','sack','oilskin sack','bag of holding','bag of tricks','an uncursed bag'].map(name=>createGroundModel({name,class:6}));
 for(const model of models){
  assert(model,'bags have a ground model');
  assert.deepEqual(signature(model),signature(models[0]),'the true bag must not show');
  const bounds=new THREE.Box3().setFromObject(model);
  assert(bounds.min.y>=-1e-6);assert(bounds.max.y>.35&&bounds.max.y<.45,`height ${bounds.max.y}`);
  assert(bounds.max.x<.4&&bounds.min.x>-.4&&bounds.max.z<.45&&bounds.min.z>-.4,'fits the tile');
  const body=model.children.find(part=>part.material.vertexColors);
  assert(body?.geometry.attributes.color,'a shaded canvas body');
  // Nothing on a sack moves: body, mouth, drawstring, bow, patch and stitches bake to one draw per material.
  assert.equal(model.children.length,new Set(model.children.map(part=>part.material)).size,'one draw per material');
  assert(model.children.length<=5,`draws: ${model.children.length}`);
  let vertices=0;
  model.traverse(part=>{if(part.geometry){const a=part.geometry.attributes.position.array;vertices+=a.length/3;for(const value of a)assert(Number.isFinite(value));}});
  assert(vertices<20000,`vertices: ${vertices}`);
  model.userData.dispose();
 }
});

test('cut gems bake their glints and mithril its nugget into one mesh each',()=>{
 const draws=m=>{let n=0;m.traverse(p=>{if(p.isMesh)n++;});return n;};
 const gem=createGroundModel({name:'ruby',class:13,appearance:'red',color:1});
 assert.equal(draws(gem),4,'facets, heart, glints, pool');
 gem.updateMatrixWorld(true);let glints;gem.traverse(p=>{if(p.userData.part==='glints')glints=p;});
 assert(glints&&!glints.castShadow);
 const b=new THREE.Box3().setFromObject(glints),box=new THREE.Box3().setFromObject(gem);
 assert(b.min.y>=box.min.y&&b.max.y<=box.max.y+1e-6&&b.max.x-b.min.x>.01,'glints sit on the stone');
 const ore=createGroundModel({name:'small piece of unrefined mithril',class:13,appearance:'silvery metal',color:6});
 assert.equal(draws(ore),1);
 for(const m of [gem,ore]){const q=new THREE.Box3().setFromObject(m);assert(q.min.y>=-1e-6&&q.max.y<.2);m.userData.dispose();}
});

test('each gem colour gets its own faceted cut, shared with its glass, grounded and finite',()=>{
 const looks=[['white',15],['red',1],['orange',9],['yellow',11],['yellowish brown',3],['green',2],['blue',4],['violet',5],['black',0]];
 const shapes=new Set();
 for(const [look,color] of looks){
  const model=createGroundModel({name:'gem',class:13,appearance:look,color});
  const glass=createGroundModel({name:`worthless piece of ${look} glass`,class:13,appearance:look,color});
  const verts=m=>{const out=[];m.traverse(p=>{if(p.geometry)out.push(...p.geometry.attributes.position.array);});return out;};
  assert.deepEqual(verts(glass),verts(model),`${look} glass must match its gem`);
  let facets=0;
  model.traverse(p=>{if(p.geometry?.attributes.color){
   facets=p.geometry.attributes.position.count/3;
   for(const v of p.geometry.attributes.position.array)assert(Number.isFinite(v));
   for(const v of p.geometry.attributes.normal.array)assert(Number.isFinite(v));
  }});
  assert(facets>=40,`${look}: ${facets} facets`);
  const b=new THREE.Box3().setFromObject(model);
  assert(b.min.y>=-1e-6&&b.max.y<.25,`${look} y ${b.min.y}..${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.3,`${look} footprint`);
  shapes.add(verts(model).slice(0,60).map(v=>v.toFixed(4)).join());
  model.userData.dispose();glass.userData.dispose();
 }
 assert.equal(shapes.size,looks.length,'every colour has a distinct cut');
});

test('rocks are fractured rubble and gray stones one veined pebble, grounded and finite',()=>{
 const rock=createGroundModel({name:'rock',class:13,color:7});
 const stones=[];rock.traverse(p=>{if(p.geometry?.attributes.color)stones.push(p);});
 // Five pieces and nine bits of grit bake to one rubble mesh beside the shadow: 2 draws.
 assert.equal(stones.length,1);assert.equal(rock.children.length,2);
 assert(stones[0].geometry.attributes.position.count>=10*shapedStone(31,{size:.006,cuts:4,detail:1,base:0,alt:0}).attributes.position.count,'pieces and grit');
 assert(stones.every(p=>p.material.flatShading&&p.material.vertexColors));
 // The biggest piece is shaped by fracture planes, so many vertices sit well inside its hull.
 const piece=shapedStone(9173,{size:.072,scale:[1.1,.66,.9],cuts:8,bump:.05,base:0x6a655d,alt:0x5a5b58,lichen:true});
 const big=piece.attributes.position,lens=[];
 for(let i=0;i<big.count;i++)lens.push(Math.hypot(big.getX(i)/1.1,big.getY(i)/.66,big.getZ(i)/.9));
 const max=Math.max(...lens);
 assert(lens.filter(l=>l<max*.8).length>big.count*.2,'rubble should have flat broken faces');
 piece.dispose();
 const verts=m=>{const out=[];m.traverse(p=>{if(p.geometry)out.push(...p.geometry.attributes.position.array);});return out;};
 const luck=createGroundModel({name:'luckstone',class:13,appearance:'gray',color:7});
 for(const name of ['loadstone','touchstone','flint']){
  const other=createGroundModel({name,class:13,appearance:'gray',color:7});
  assert.deepEqual(verts(other),verts(luck),`${name} must match the luckstone`);
  other.userData.dispose();
 }
 let pale=0;luck.traverse(p=>{const c=p.geometry?.attributes.color;if(c)for(let i=0;i<c.count;i++)if(c.getX(i)>.4)pale++;});
 assert(pale>20,`quartz vein vertices: ${pale}`);
 for(const model of [rock,luck]){
  const b=new THREE.Box3().setFromObject(model);
  assert(b.min.y>=-1e-6&&b.max.y<.2,`y ${b.min.y}..${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.2,'footprint');
  model.traverse(p=>{if(p.geometry){for(const v of p.geometry.attributes.position.array)assert(Number.isFinite(v));
   for(const v of p.geometry.attributes.normal?.array??[])assert(Number.isFinite(v));}});
  model.userData.dispose();
 }
});

test('the apron lies flat with a bib, neck strap, waist ties, a pocket and stains, keyed by appearance',()=>{
 const apron=createGroundModel({name:'apron',class:3,appearance:'apron'});
 assert(apron);
 const verts=m=>{const out=[];m.traverse(p=>{if(p.geometry)out.push(...p.geometry.attributes.position.array);});return out;};
 // Identifying the smock must not change how it looks.
 const smock=createGroundModel({name:'alchemy smock',class:3,appearance:'apron'});
 assert.deepEqual(verts(smock),verts(apron));smock.userData.dispose();
 const b=new THREE.Box3().setFromObject(apron);
 assert(b.min.y>=0&&b.max.y<.06,`y ${b.min.y}..${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.43,'footprint');
 const sheet=apron.children.find(p=>p.material.vertexColors).geometry,col=sheet.attributes.color;
 assert(sheet.attributes.position.count>1000,'the cloth is a fine grid');
 // Stains pull some cloth well away from the linen tone.
 let stained=0;for(let i=0;i<col.count;i++)if(col.getX(i)<.5)stained++;
 assert(stained>10,`stained vertices: ${stained}`);
 // Sheet, pocket, straps, hems, stitches, vial and cork bake to one draw per material.
 assert.equal(apron.children.length,new Set(apron.children.map(p=>p.material)).size,'one draw per material');
 assert(apron.children.length<=7,`draws: ${apron.children.length}`);
 apron.traverse(p=>{if(p.geometry){for(const v of p.geometry.attributes.position.array)assert(Number.isFinite(v));
  for(const v of p.geometry.attributes.normal?.array??[])assert(Number.isFinite(v));}});
 apron.userData.dispose();
});

test('gloves lie as a pair keyed by appearance, one merged leather mesh per glove',()=>{
 const gloves=(name,appearance)=>createGroundModel({name,class:3,appearance});
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push([part.geometry.attributes.position.count,...part.getWorldPosition(new THREE.Vector3()).toArray().map(n=>n.toFixed(5))]);});return out;};
 const kinds=[['leather gloves','old gloves'],['gauntlets of fumbling','padded gloves'],['gauntlets of power','riding gloves'],['gauntlets of dexterity','fencing gloves']];
 const seen=new Set();
 for(const [name,look] of kinds){
  const model=gloves(name,look);
  assert(model,name);
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} rests on the floor`);
  assert(bounds.max.y<.06,`${name} lies flat`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} fits its tile`);
  let meshes=0,geometries=0;
  model.traverse(part=>{if(part.geometry){
   meshes++;
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   for(const value of part.geometry.attributes.normal.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>geometries++);
  }});
  assert.equal(model.children.filter(c=>c.userData.part==='glove').length,2,`${name} is a pair`);
  assert(meshes<=4,`${name} stays at a few draw calls (${meshes})`);
  seen.add(JSON.stringify(signature(model)));
  model.userData.dispose();
  assert.equal(geometries,meshes);
 }
 assert.equal(seen.size,kinds.length,'each glove kind looks different');
 assert.deepEqual(signature(gloves('gauntlets of power','riding gloves')),signature(gloves('leather gloves','riding gloves')),'the true glove name must not show');
 assert.deepEqual(signature(gloves('gauntlets of power')),signature(gloves('leather gloves')),'without an appearance the true name must not show either');
});

test('boots stand as a pair keyed by appearance, one merged mesh per boot plus its hardware',()=>{
 const boots=(name,appearance)=>createGroundModel({name,class:3,appearance});
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push([part.geometry.attributes.position.count,...part.getWorldPosition(new THREE.Vector3()).toArray().map(n=>n.toFixed(5))]);});return out;};
 const kinds=[['low boots','walking shoes'],['iron shoes','hard shoes'],['high boots','jackboots'],['speed boots','combat boots'],['water walking boots','jungle boots'],
  ['jumping boots','hiking boots'],['elven boots','mud boots'],['kicking boots','buckled boots'],['fumble boots','riding boots'],['levitation boots','snow boots']];
 const seen=new Set();
 for(const [name,look] of kinds){
  const model=boots(name,look);
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6,`${look} rest on the floor`);
  assert(bounds.max.y>.06&&bounds.max.y<.34,`${look} stand a sensible height (${bounds.max.y})`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.32,`${look} fit their tile`);
  let meshes=0,geometries=0;
  model.traverse(part=>{if(part.geometry){
   meshes++;
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   for(const value of part.geometry.attributes.normal.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>geometries++);
  }});
  assert.equal(model.children.filter(c=>c.userData.part==='boot').length,2,`${look} are a pair`);
  assert(meshes<=4,`${look} stay at a few draw calls (${meshes})`);
  seen.add(JSON.stringify(signature(model)));
  model.userData.dispose();
  assert.equal(geometries,meshes);
 }
 assert.equal(seen.size,kinds.length,'each boot kind looks different');
 assert.deepEqual(signature(boots('speed boots','combat boots')),signature(boots('fumble boots','combat boots')),'the true boot name must not show');
 assert.deepEqual(signature(boots('speed boots')),signature(boots('levitation boots')),'without an appearance the true name must not show either');
});

test('helmets and hats sit on the floor keyed by appearance, one merged shell plus at most a plume',()=>{
 const helm=(name,appearance)=>createGroundModel({name,class:3,appearance});
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push([part.geometry.attributes.position.count,...part.getWorldPosition(new THREE.Vector3()).toArray().map(n=>n.toFixed(5))]);});return out;};
 const kinds=[['elven leather helm','leather hat'],['orcish helm','iron skull cap'],['dwarvish iron helm','hard hat'],['fedora'],['cornuthaum','conical hat'],
  ['tinfoil hat'],['dented pot'],['helmet','plumed helmet'],['helm of brilliance','etched helmet'],['helm of opposite alignment','crested helmet'],['helm of telepathy','visored helmet']];
 const seen=new Set();
 for(const [name,look] of kinds){
  const model=helm(name,look);
  assert(model,name);
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} rests on the floor`);
  assert(bounds.max.y>.07&&bounds.max.y<.34,`${name} stands a sensible height (${bounds.max.y})`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} fits its tile`);
  let meshes=0,geometries=0;
  model.traverse(part=>{if(part.geometry){
   meshes++;
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   for(const value of part.geometry.attributes.normal.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>geometries++);
  }});
  assert.equal(model.children.filter(c=>c.userData.part==='helmet').length,1,name);
  assert(meshes<=2,`${name} stays at a draw call or two (${meshes})`);
  seen.add(JSON.stringify(signature(model)));
  model.userData.dispose();
  assert.equal(geometries,meshes);
 }
 assert.equal(seen.size,kinds.length,'each helmet kind looks different');
 assert.deepEqual(signature(helm('helm of brilliance','crested helmet')),signature(helm('helmet','crested helmet')),'the true helmet name must not show');
 assert.deepEqual(signature(helm('helm of telepathy')),signature(helm('helmet')),'without an appearance the true name must not show either');
 assert.deepEqual(signature(helm('dunce cap','conical hat')),signature(helm('cornuthaum','conical hat')),'the cornuthaum and dunce cap look alike');
});

test('cloaks lie draped on the floor keyed by appearance, one cloth mesh plus at most one of hardware',()=>{
 const cloak=(name,appearance)=>createGroundModel({name,class:3,appearance});
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push([part.geometry.attributes.position.count,...part.getWorldPosition(new THREE.Vector3()).toArray().map(n=>n.toFixed(5))]);});return out;};
 const kinds=[['elven cloak','faded pall'],['orcish cloak','coarse mantelet'],['dwarvish cloak','hooded cloak'],['oilskin cloak','slippery cloak'],
  ['cloak of protection','tattered cape'],['cloak of invisibility','opera cloak'],['cloak of magic resistance','ornamental cope'],
  ['cloak of displacement','piece of cloth'],['leather cloak'],['robe'],['mummy wrapping']];
 const seen=new Set();
 for(const [name,look] of kinds){
  const model=cloak(name,look);
  assert(model,name);
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} rests on the floor`);
  assert(bounds.max.y>.01&&bounds.max.y<.08,`${name} lies low (${bounds.max.y})`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.31,`${name} fits its tile`);
  let meshes=0,geometries=0;
  model.traverse(part=>{if(part.geometry){
   meshes++;
   for(const value of part.geometry.attributes.position.array)assert(Number.isFinite(value));
   for(const value of part.geometry.attributes.normal.array)assert(Number.isFinite(value));
   part.geometry.addEventListener('dispose',()=>geometries++);
  }});
  assert.equal(model.children.filter(c=>c.userData.part==='cloak').length,1,name);
  assert(meshes<=2,`${name} stays at a draw call or two (${meshes})`);
  seen.add(JSON.stringify(signature(model)));
  model.userData.dispose();
  assert.equal(geometries,meshes);
 }
 assert.equal(seen.size,kinds.length,'each cloak kind looks different');
 assert.deepEqual(signature(cloak('cloak of invisibility','tattered cape')),signature(cloak('cloak of protection','tattered cape')),'the true cloak name must not show');
 assert.deepEqual(signature(cloak('cloak of displacement')),signature(cloak('cloak of protection')),'without an appearance the true name must not show either');
});

test('figurines are one merged soapstone carving on a plinth',()=>{
 for(const name of ['figurine','figurine of a newt']){
  const model=createGroundModel({name,class:6});
  assert(model,name);
  const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert.equal(meshes.length,1);
  assert.equal(meshes[0].userData.part,'figurine');
  for(const key of ['position','normal','color'])for(const value of meshes[0].geometry.attributes[key].array)assert(Number.isFinite(value));
  const bounds=new THREE.Box3().setFromObject(model);
  assert(bounds.min.y>=-1e-6&&bounds.min.y<.001,'rests on the floor');
  assert(bounds.max.y>.15&&bounds.max.y<.25,'hand-sized');
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.12);
  let disposed=0;meshes[0].geometry.addEventListener('dispose',()=>disposed++);
  model.userData.dispose();assert.equal(disposed,1);
 }
});

test('body armour lies face-up per kind, dragon hides show only their colour, in three draw calls at most',()=>{
 const armor=(name,appearance)=>createGroundModel({name,class:3,appearance});
 const colours=model=>{let sum=0;model.traverse(o=>{if(o.geometry)for(const v of o.geometry.attributes.color.array)sum+=v;});return sum.toFixed(3);};
 const signature=model=>{const out=[];model.traverse(o=>{if(o.geometry)out.push(o.geometry.attributes.position.count,o.material.metalness);});return JSON.stringify([out,colours(model)]);};
 const kinds=[['leather armor'],['studded leather armor'],['leather jacket'],['ring mail'],['orcish ring mail','crude ring mail'],['chain mail'],
  ['orcish chain mail','crude chain mail'],['elven mithril-coat'],['dwarvish mithril-coat'],['scale mail'],['splint mail'],['banded mail'],
  ['plate mail'],['bronze plate mail'],['crystal plate mail'],['fire dragon scale mail','draken scale mail'],['ice dragon scale mail','lindworm scale mail'],
  ['chromatic dragon scale mail','chromatic dragon scale mail'],['fire dragon scales','draken scales']];
 const seen=new Set();
 for(const [name,look] of kinds){
  const model=armor(name,look);
  assert(model,name);
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6,`${name} rests on the floor`);
  assert(bounds.max.y>.02&&bounds.max.y<.1,`${name} lies low (${bounds.max.y})`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.31,`${name} fits its tile`);
  assert.equal(model.children.filter(c=>c.userData.part==='armor').length,1,name);
  let meshes=0;
  model.traverse(o=>{if(o.geometry){meshes++;for(const key of ['position','normal','color'])for(const v of o.geometry.attributes[key].array)assert(Number.isFinite(v),name);}});
  assert(meshes>=1&&meshes<=3,`${name} stays at three draw calls or fewer (${meshes})`);
  seen.add(signature(model));
  model.userData.dispose();
 }
 assert.equal(seen.size,kinds.length,'each armour kind looks different');
 assert.equal(signature(armor('ice dragon scale mail','draken scale mail')),signature(armor('fire dragon scale mail','draken scale mail')),'the true dragon must not show');
 assert.equal(signature(armor('orcish chain mail','crude chain mail')),signature(armor('chain mail','crude chain mail')),'a shared appearance looks the same');
});

test('unicorn horn is one merged spiral ivory mesh resting on the floor',()=>{
 const model=createGroundModel({name:'uncursed unicorn horn',class:6});
 assert(model);assert.equal(model.children.length,1);
 const [horn]=model.children,geo=horn.geometry;
 assert.equal(horn.userData.part,'horn');assert(horn.material.vertexColors);
 for(const k of ['position','normal','color'])for(const v of geo.attributes[k].array)assert(Number.isFinite(v),k);
 const bounds=new THREE.Box3().setFromObject(model);
 assert(Math.abs(bounds.min.y)<1e-6);assert(bounds.max.y<.2);
 assert(bounds.max.x<.49&&bounds.min.x>-.49&&bounds.max.z<.49&&bounds.min.z>-.49);
 assert(bounds.max.x-bounds.min.x>.35,'long across the tile');
 // Pale at the tip, darker at the root and in the grooves.
 const c=geo.attributes.color.array;let lo=1,hi=0;for(let i=0;i<c.length;i+=3){const l=(c[i]+c[i+1]+c[i+2])/3;lo=Math.min(lo,l);hi=Math.max(hi,l);}
 assert(hi>.9&&lo<.5);
 let geometries=0,materials=0;geo.addEventListener('dispose',()=>geometries++);horn.material.addEventListener('dispose',()=>materials++);
 model.userData.dispose();assert.equal(geometries,1);assert.equal(materials,1);
});

test('the candelabrum is merged gold, wax and flame meshes showing its candles',()=>{
 assert.deepEqual(candelabrumState('Candelabrum of Invocation (no candles attached)'),{candles:0,lit:false});
 assert.deepEqual(candelabrumState('Candelabrum of Invocation (1 candle attached)'),{candles:1,lit:false});
 assert.deepEqual(candelabrumState('Candelabrum of Invocation (7 candles, lit)'),{candles:7,lit:true});
 assert.deepEqual(candelabrumState('candelabrum'),{candles:7,lit:false});
 const parts=name=>{const m=createGroundModel({name,class:6});const p=m.children.map(c=>c.userData.part);return [m,p];};
 const [lit,litParts]=parts('Candelabrum of Invocation (7 candles, lit)');
 assert.deepEqual(litParts,['gold','wax','flame']);
 const [bare,bareParts]=parts('Candelabrum of Invocation (no candles attached)');
 assert.deepEqual(bareParts,['gold']);
 const [few]=parts('Candelabrum of Invocation (3 candles attached)');
 assert.deepEqual(few.children.map(c=>c.userData.part),['gold','wax']);
 assert(few.children[1].geometry.attributes.position.count<lit.children[1].geometry.attributes.position.count);
 for(const mesh of lit.children)for(const k of ['position','normal','color'])for(const v of mesh.geometry.attributes[k].array)assert(Number.isFinite(v),k);
 const bounds=new THREE.Box3().setFromObject(lit);
 assert(Math.abs(bounds.min.y)<1e-6);assert(bounds.max.y>.4&&bounds.max.y<.6);
 assert(bounds.max.x<.49&&bounds.min.x>-.49&&bounds.max.z<.49&&bounds.min.z>-.49);
 assert(bounds.max.x-bounds.min.x>.35,'arms spread across the tile');
 assert.equal(new THREE.Box3().setFromObject(bare).min.y,0);
 let geometries=0,materials=0;
 for(const mesh of lit.children){mesh.geometry.addEventListener('dispose',()=>geometries++);mesh.material.addEventListener('dispose',()=>materials++);}
 lit.userData.dispose();assert.equal(geometries,3);assert.equal(materials,3);
 bare.userData.dispose();few.userData.dispose();
});

test('the magic marker is one merged pen-and-cap mesh, dry at zero charges',()=>{
 assert.equal(markerCharges('magic marker (0:12)'),12);
 assert.equal(markerCharges('cursed magic marker (0:0)'),0);
 assert.equal(markerCharges('magic marker'),null);
 const model=createGroundModel({name:'magic marker (0:12)',class:6});
 assert(model);assert.equal(model.children.length,1);
 const [pen]=model.children,geo=pen.geometry;
 assert.equal(pen.userData.part,'marker');assert(pen.material.vertexColors);
 for(const k of ['position','normal','color'])for(const v of geo.attributes[k].array)assert(Number.isFinite(v),k);
 const bounds=new THREE.Box3().setFromObject(model);
 assert(Math.abs(bounds.min.y)<1e-6);assert(bounds.max.y<.12);
 assert(bounds.max.x<.49&&bounds.min.x>-.49&&bounds.max.z<.49&&bounds.min.z>-.49);
 assert(bounds.max.x-bounds.min.x>.25,'long across the tile');
 // Red ink shows while it has charges; a dry marker has no strongly red vertex.
 const reddest=m=>{const c=m.children[0].geometry.attributes.color.array;let best=0;for(let i=0;i<c.length;i+=3)best=Math.max(best,c[i]-(c[i+1]+c[i+2])/2);return best;};
 const dry=createGroundModel({name:'magic marker (0:0)',class:6});
 assert(reddest(model)>.4);assert(reddest(dry)>.4,'the cap and butt stay red');
 const nibRed=m=>{const g=m.children[0].geometry,p=g.attributes.position,c=g.attributes.color;let x=-1,i0=0;for(let i=0;i<p.count;i++)if(p.getX(i)>x){x=p.getX(i);i0=i;}return c.getX(i0)-(c.getY(i0)+c.getZ(i0))/2;};
 assert(nibRed(model)>.2);assert(nibRed(dry)<.1,'dry nib');
 let geometries=0,materials=0;geo.addEventListener('dispose',()=>geometries++);pen.material.addEventListener('dispose',()=>materials++);
 model.userData.dispose();assert.equal(geometries,1);assert.equal(materials,1);
 dry.userData.dispose();
});

test('the heavy iron ball and the iron chain are single merged iron meshes on the floor',()=>{
 for(const [item,part,minTop,maxTop] of [[{name:'heavy iron ball',class:15},'iron ball',.33,.42],[{name:'cursed iron chain',class:16},'iron chain',.02,.07]]){
  const model=createGroundModel(item);
  assert(model,item.name);assert.equal(model.children.length,1);
  const [mesh]=model.children,geo=mesh.geometry;
  assert.equal(mesh.userData.part,part);assert(mesh.material.vertexColors);
  for(const k of ['position','normal','color'])for(const v of geo.attributes[k].array)assert(Number.isFinite(v),`${item.name} ${k}`);
  for(const v of geo.attributes.color.array)assert(v>=0&&v<=1);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<.002,`${item.name} rests on the floor (${bounds.min.y})`);
  assert(bounds.max.y>minTop&&bounds.max.y<maxTop,`${item.name} height ${bounds.max.y}`);
  assert(bounds.max.x<.49&&bounds.min.x>-.49&&bounds.max.z<.49&&bounds.min.z>-.49,`${item.name} inside its tile`);
  assert(bounds.max.x-bounds.min.x>.4||bounds.max.z-bounds.min.z>.4,`${item.name} spreads across the tile`);
  let geometries=0,materials=0;geo.addEventListener('dispose',()=>geometries++);mesh.material.addEventListener('dispose',()=>materials++);
  model.userData.dispose();assert.equal(geometries,1);assert.equal(materials,1);
 }
 // The chain is torn from a drawbridge: its sheared bolt heads and sprung link are bright metal.
 const chain=createGroundModel({name:'iron chain',class:16}).children[0].geometry.attributes.color;
 let bright=0;for(let i=0;i<chain.count;i++)if(chain.getX(i)>.4)bright++;
 assert(bright>20,`the torn ends show bright iron (${bright})`);
 // Found by name alone too, as the Live feed may send it.
 assert.equal(createGroundModel({name:'heavy iron ball'}).children[0].userData.part,'iron ball');
});

test('venom is a single merged glossy splash on the floor, told apart by kind',()=>{
 const kinds={};
 for(const [item,kind] of [[{name:'splash of venom',class:17},'plain'],[{name:'blinding venom',class:17},'blinding'],
  [{name:'acid venom',class:17},'acid'],[{name:'freezing ice',class:17},'ice'],[{name:'acid venom'},'acid']]){
  const model=createGroundModel(item);
  assert(model,item.name);assert.equal(model.children.length,1);
  const [mesh]=model.children,geo=mesh.geometry;
  assert.equal(mesh.userData.part,'venom');assert.equal(mesh.userData.kind,kind);assert(mesh.material.vertexColors);
  for(const k of ['position','normal','color'])for(const v of geo.attributes[k].array)assert(Number.isFinite(v),`${item.name} ${k}`);
  for(const v of geo.attributes.color.array)assert(v>=0&&v<=1,`${item.name} colour ${v}`);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<.002,`${item.name} rests on the floor (${bounds.min.y})`);
  assert(bounds.max.y>.008&&bounds.max.y<(kind==='ice'?.1:.03),`${item.name} height ${bounds.max.y}`);
  assert(bounds.max.x<.49&&bounds.min.x>-.49&&bounds.max.z<.49&&bounds.min.z>-.49,`${item.name} inside its tile`);
  assert(bounds.max.x-bounds.min.x>.4,`${item.name} spreads across the tile`);
  kinds[kind]=geo.attributes.position.count;
  let geometries=0,materials=0;geo.addEventListener('dispose',()=>geometries++);mesh.material.addEventListener('dispose',()=>materials++);
  model.userData.dispose();assert.equal(geometries,1);assert.equal(materials,1);
 }
 // Acid adds bubbles and a scorch ring, ice adds shards; the plain splash has neither.
 assert(kinds.acid>kinds.plain&&kinds.ice>kinds.plain&&kinds.blinding===kinds.plain);
 console.log('venom vertex counts',kinds);
});

test('iron safe gets one merged, grounded, finite strongbox model',()=>{
 const model=createGroundModel({name:'an iron safe',class:6});
 assert(model);
 assert.equal(model.children.length,1,'the safe is one draw');
 const [mesh]=model.children;
 assert.equal(mesh.userData.part,'iron safe');
 for(const value of mesh.geometry.attributes.position.array)assert(Number.isFinite(value));
 for(const value of mesh.geometry.attributes.color.array)assert(value>=0&&value<=1);
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
 assert(Math.abs(bounds.min.y)<1e-6,'feet on the floor');
 assert(size.y>.34&&size.y<.4);assert(size.x<.5&&size.z<.5);
 // A chest is still a chest, and the safe differs from it.
 const chest=createGroundModel({name:'chest',class:6});
 assert(chest.children.length>1);
 let geometries=0,materials=0;
 mesh.geometry.addEventListener('dispose',()=>geometries++);mesh.material.addEventListener('dispose',()=>materials++);
 model.userData.dispose();chest.userData.dispose();
 assert.equal(geometries,1);assert.equal(materials,1);
});

test('eucalyptus leaves are a thin sickle blade on a reddish stalk, two when stacked',()=>{
 const one=eucalyptusLeafGeometry(1),two=eucalyptusLeafGeometry(2);
 for(const {blade,stalk} of [one,two])for(const geo of [blade,stalk])for(const v of geo.attributes.position.array)assert(Number.isFinite(v));
 one.blade.computeBoundingBox();
 const b=one.blade.boundingBox;
 assert(b.max.x-b.min.x>.25&&b.max.x-b.min.x<.3,'long');
 assert(b.max.y<.04,'lies flat');
 assert(two.blade.attributes.position.count===2*one.blade.attributes.position.count);
 const model=createGroundModel({name:'eucalyptus leaf',class:7});
 let draws=0;model.traverse(p=>{if(p.isMesh)draws++;});
 assert.equal(draws,2);
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.max.y<.05);
 model.userData.dispose();
});

test('a kelp frond is one glossy merged mesh lying flat, with a second frond when stacked',()=>{
 const one=kelpFrondGeometry(1),two=kelpFrondGeometry(2);
 for(const geo of [one,two])for(const key of ['position','normal','color'])for(const v of geo.attributes[key].array)assert(Number.isFinite(v));
 assert(two.attributes.position.count===2*one.attributes.position.count);
 one.computeBoundingBox();
 const b=one.boundingBox;
 assert(b.max.x-b.min.x>.35,'long');
 assert(b.max.y-b.min.y<.07,'lies flat');
 for(const name of ['kelp frond','2 kelp fronds']){
  const model=createGroundModel({name,class:7});
  const meshes=[];model.traverse(p=>{if(p.isMesh)meshes.push(p);});
  assert.equal(meshes.length,1,name);
  assert.equal(meshes[0].userData.part,'kelp frond');
  assert(meshes[0].material.vertexColors&&meshes[0].material.side===THREE.DoubleSide);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6&&bounds.max.y<.08,`${name} height ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} inside the tile`);
  model.userData.dispose();
 }
 one.dispose();two.dispose();
});

test('eggs are speckled ovoids lying on their sides, and a stack shows a clutch of up to three',()=>{
 const one=eggGeometry(1);
 for(const key of ['position','normal','color'])for(const v of one.attributes[key].array)assert(Number.isFinite(v));
 one.computeBoundingBox();
 const b=one.boundingBox;
 assert(Math.abs(b.min.y)<1e-6,'resting on the floor');
 assert(b.max.x-b.min.x>b.max.y-b.min.y+.02,'lying on its side');
 // Speckled: some vertices are much darker than the shell.
 const c=one.attributes.color,sum=i=>c.getX(i)+c.getY(i)+c.getZ(i);
 let top=0,dark=0;for(let i=0;i<c.count;i++)top=Math.max(top,sum(i));
 for(let i=0;i<c.count;i++)if(sum(i)<top*.8)dark++;
 assert(dark>c.count*.02&&dark<c.count*.2,`speckles ${dark}/${c.count}`);
 assert.equal(eggGeometry(2).attributes.position.count,2*one.attributes.position.count);
 assert.equal(eggGeometry(9).attributes.position.count,3*one.attributes.position.count);
 for(const name of ['egg','2 eggs','5 uncursed eggs']){
  const model=createGroundModel({name,class:7});
  const meshes=[];model.traverse(p=>{if(p.isMesh)meshes.push(p);});
  assert.equal(meshes.length,1,name);
  assert.equal(meshes[0].userData.part,'egg');
  assert(meshes[0].material.vertexColors);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6&&bounds.max.y<.1,`${name} height ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} inside the tile`);
  model.userData.dispose();
 }
 one.dispose();
});

test('meatballs, meat sticks and meat rings are merged, vertex-coloured meats, and a stack shows up to three',()=>{
 for(const [make,part,names] of [[meatballGeometry,'meatball',['meatball','3 meatballs']],[meatStickGeometry,'meat-stick',['meat stick','2 cursed meat sticks','7 meat sticks']],[meatRingGeometry,'meat-ring',['meat ring','2 meat rings','5 meat rings']]]){
  const one=make(1);
  for(const key of ['position','normal','color'])for(const v of one.attributes[key].array)assert(Number.isFinite(v),part);
  assert(one.index,`${part} welded`);
  // Seared or cured: no two-tone flat fill, the colours vary.
  const c=one.attributes.color,sum=i=>c.getX(i)+c.getY(i)+c.getZ(i);
  let lo=9,hi=0;for(let i=0;i<c.count;i++){lo=Math.min(lo,sum(i));hi=Math.max(hi,sum(i));}
  assert(hi-lo>.3,`${part} colour range ${lo}..${hi}`);
  assert.equal(make(2).attributes.position.count,2*one.attributes.position.count);
  assert.equal(make(9).attributes.position.count,3*one.attributes.position.count);
  for(const name of names){
   const model=createGroundModel({name,class:7});
   const meshes=[];model.traverse(p=>{if(p.isMesh)meshes.push(p);});
   assert.equal(meshes.length,1,name);
   assert.equal(meshes[0].userData.part,part);
   assert(meshes[0].material.vertexColors);
   const bounds=new THREE.Box3().setFromObject(model);
   assert(Math.abs(bounds.min.y)<1e-6&&bounds.max.y<.2,`${name} height ${bounds.max.y}`);
   assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} inside the tile`);
   model.userData.dispose();
  }
  one.dispose();
 }
 // A meat stick lies long and low.
 const stick=meatStickGeometry(1);stick.computeBoundingBox();
 const b=stick.boundingBox;assert(b.max.y<.04&&b.max.x-b.min.x>.18,'lying along the floor');
 stick.dispose();
 // A meat ring lies flat with an open middle; the third of a stack rests on the other two.
 const ring=meatRingGeometry(1);ring.computeBoundingBox();
 const rb=ring.boundingBox;assert(rb.max.y<.05&&rb.max.x-rb.min.x>.13,'lying flat');
 const p=ring.attributes.position;for(let i=0;i<p.count;i++)assert(Math.hypot(p.getX(i),p.getZ(i))>.025,'open middle');
 ring.dispose();
 const pile=meatRingGeometry(3);pile.computeBoundingBox();assert(pile.boundingBox.max.y>.07&&pile.boundingBox.max.y<.1,'third ring on top');
 pile.dispose();
});

test('a huge chunk of meat is one merged, vertex-coloured raw haunch with a bone out of the shank',()=>{
 const geo=meatHaunchGeometry();
 for(const key of ['position','normal','color'])for(const v of geo.attributes[key].array)assert(Number.isFinite(v),key);
 assert(geo.index,'welded');
 const b=geo.boundingBox;
 assert(Math.abs(b.min.y)<1e-6&&b.max.y>.1&&b.max.y<.2,`height ${b.max.y}`);
 assert(Math.max(b.max.x-b.min.x,b.max.z-b.min.z)>.25,'huge');
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.3,'inside the tile');
 // Raw red meat, creamy fat and pale bone.
 const c=geo.attributes.color;let red=0,pale=0;
 for(let i=0;i<c.count;i++){const r=c.getX(i),g=c.getY(i),bl=c.getZ(i);if(r>.25&&g<.06&&bl<.06)red++;if(r>.6&&g>.5&&bl>.35)pale++;}
 assert(red>200&&pale>200,`red ${red}, pale ${pale}`);
 assert(geo.attributes.position.count<6000,`vertices ${geo.attributes.position.count}`);
 geo.dispose();
 const model=createGroundModel({name:'huge chunk of meat',class:7});
 const meshes=[];model.traverse(p=>{if(p.isMesh)meshes.push(p);});
 assert.equal(meshes.length,1);
 assert.equal(meshes[0].userData.part,'meat-haunch');
 assert(meshes[0].material.vertexColors);
 model.userData.dispose();
});

test('tins are one merged, vertex-coloured tinplate can; an empty tin is opened with its lid bent back',()=>{
 const one=tinGeometry(1);
 for(const key of ['position','normal','color'])for(const v of one.attributes[key].array)assert(Number.isFinite(v),key);
 one.computeBoundingBox();
 const b=one.boundingBox;assert(b.max.y>.07&&b.max.y<.1&&b.max.x<.06,`standing can ${b.max.y}`);
 assert.equal(tinGeometry(2).attributes.position.count,2*one.attributes.position.count);
 assert.equal(tinGeometry(9).attributes.position.count,3*one.attributes.position.count);
 // A dent pushes part of the side in.
 const p=one.attributes.position;let lo=1;
 for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-.034)<.004)lo=Math.min(lo,Math.hypot(p.getX(i),p.getZ(i)));
 assert(lo<.05,`dented to ${lo}`);
 // Opened: the lid stands up above the rim.
 const open=tinGeometry(1,{empty:true});open.computeBoundingBox();
 assert(open.boundingBox.max.y>.12,'lid bent up');
 const models=[];
 for(const name of ['tin','3 tins','tin of spinach','empty tin','2 empty tins']){
  const model=createGroundModel({name,class:7});models.push(model);
  const meshes=[];model.traverse(q=>{if(q.isMesh)meshes.push(q);});
  assert.equal(meshes.length,1,name);
  assert.equal(meshes[0].userData.part,'tin');
  assert(meshes[0].material.vertexColors&&meshes[0].material.metalness>.3);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6&&bounds.max.y<.2,`${name} height ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} inside the tile`);
 }
 assert.notEqual(models[0].children[0].geometry.attributes.position.count,models[3].children[0].geometry.attributes.position.count,'empty differs');
 models.forEach(m=>m.userData.dispose());one.dispose();open.dispose();
});

test('cram, K- and C-rations get their own merged models instead of the food-ration parcel',()=>{
 const parcel=createGroundModel({name:'food ration',class:7});
 const looks=new Set([JSON.stringify(parcel.children.map(p=>p.geometry.type))]);
 for(const name of ['cram ration','3 uncursed cram rations','K-ration','a C-ration','2 C-rations']){
  const model=createGroundModel({name,class:7});
  assert(model,name);
  assert(model.children.length<=2,`${name} draws ${model.children.length}`);
  let verts=0;
  for(const part of model.children){
   assert(part.userData.part?.startsWith('ration-'),name);
   const {position,normal,color}=part.geometry.attributes;verts+=position.count;
   for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x),name);
   for(const x of color.array)assert(x>=0&&x<=1,name);
  }
  assert(verts<40000,`${name} has ${verts} vertices`);
  model.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(model,true);
  assert(b.min.y>-.003&&b.max.y<.2,`${name} y ${b.min.y}..${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.26,`${name} too wide`);
  looks.add(JSON.stringify([model.children.map(p=>p.material.metalness),model.children.map(p=>p.geometry.attributes.position.count)]));
  let disposed=0;model.children.forEach(p=>p.geometry.addEventListener('dispose',()=>disposed++));
  model.userData.dispose();assert.equal(disposed,model.children.length);
 }
 // Parcel, cram, K and C: plurals and articles don't change the look, the kind does.
 assert.equal(looks.size,4);
 // Tripe keeps its own meat model.
 assert.deepEqual(createGroundModel({name:'tripe ration',class:7}).children.map(p=>p.userData.part),['tripe']);
});

test('whistles are a merged pea whistle with a lanyard, the same for tin and magic',()=>{
 const shape=name=>{
  const model=createGroundModel({name,class:6});
  assert.deepEqual(model.children.map(p=>p.userData.part),['whistle-plate','whistle-matte']);
  let verts=0;
  for(const part of model.children){
   const {position,normal,color}=part.geometry.attributes;verts+=position.count;
   for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x),name);
   for(const x of color.array)assert(x>=0&&x<=1,name);
  }
  assert(verts<20000,`${name} has ${verts} vertices`);
  model.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(model,true);
  assert(Math.abs(b.min.y)<1e-6&&b.max.y<.05,`${name} lies flat: ${b.min.y}..${b.max.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.2,`${name} fits its tile`);
  const out=model.children.map(p=>Array.from(p.geometry.attributes.position.array));
  model.userData.dispose();
  return out;
 };
 assert.deepEqual(shape('tin whistle'),shape('magic whistle'));
});

test('stethoscopes are a merged steel and rubber model lying flat on the tile',()=>{
 const model=createGroundModel({name:'stethoscope',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['stethoscope-steel','stethoscope-rubber']);
 let verts=0;
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
 }
 assert(verts<30000,`${verts} vertices`);
 model.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(model,true);
 assert(Math.abs(b.min.y)<1e-6&&b.max.y<.03,`lies flat: ${b.min.y}..${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.25,'fits its tile');
 model.userData.dispose();
});

test('the tin opener is a merged wooden-handled knife with a hooked beak and a thong, resting on the floor',()=>{
 const model=createGroundModel({name:'an uncursed tin opener',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['tin-opener-wood','tin-opener-steel']);
 let verts=0;
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
 }
 assert(verts<20000,`${verts} vertices`);
 model.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(model,true);
 assert(Math.abs(b.min.y)<1e-6&&b.max.y<.05,`lies on its side: ${b.min.y}..${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.2,'fits its tile');
 // The beak reaches the floor as well as the handle, so it doesn't balance on one end.
 const [,steel]=model.children,p=steel.geometry.attributes.position;
 let beakLow=1;for(let i=0;i<p.count;i++)if(p.getX(i)>.07)beakLow=Math.min(beakLow,p.getY(i));
 assert(beakLow<.003,`beak touches down: ${beakLow}`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the leash is a merged braided coil with a hand loop and a brass snap, lying on the floor',()=>{
 const model=createGroundModel({name:'a leash',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['leash-leather','leash-brass']);
 let verts=0;
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
 }
 assert(verts<30000,`${verts} vertices`);
 model.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(model,true);
 assert(Math.abs(b.min.y)<1e-6&&b.max.y>.02&&b.max.y<.05,`lies low: ${b.min.y}..${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.3,'fits its tile');
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the drum is a merged, rope-laced field drum on end with its sticks on the floor',()=>{
 const model=createGroundModel({name:'leather drum',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['drum-wood','drum-hide']);
 let verts=0;
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
 }
 assert(verts<30000,`${verts} vertices`);
 model.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(model,true);
 assert(Math.abs(b.min.y)<1e-6&&b.max.y>.16&&b.max.y<.2,`stands on end: ${b.min.y}..${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.3,'fits its tile');
 // The head sits below the top of its counterhoop.
 const [wood,hide]=model.children.map(p=>{p.geometry.computeBoundingBox();return p.geometry.boundingBox;});
 assert(hide.max.y<wood.max.y,`head ${hide.max.y} under hoop ${wood.max.y}`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the flute is a merged boxwood flute lying down, holes up, with a brass key',()=>{
 const model=createGroundModel({name:'wooden flute',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['flute-wood','flute-brass']);
 let verts=0;
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
 }
 assert(verts<25000,`${verts} vertices`);
 const [wood,brass]=model.children.map(p=>{p.geometry.computeBoundingBox();return p.geometry.boundingBox;});
 assert(Math.abs(wood.min.y)<1e-6&&wood.max.y<.04,`lies flat: ${wood.min.y}..${wood.max.y}`);
 assert(wood.max.x-wood.min.x>.4,'full length');
 // The key sits on the foot joint, above the floor.
 assert(brass.min.y>.005&&brass.max.x<wood.min.x+.1,'key on the foot joint');
 // The dark hole pits are on the upper half.
 const {position,color}=model.children[0].geometry.attributes;let up=0,down=0;
 for(let i=0;i<position.count;i++)if(color.getX(i)<.1&&Math.abs(position.getX(i))<.2)(position.getY(i)>wood.max.y/2?up++:down++);
 assert(up>50&&down===0,`holes up ${up}, down ${down}`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the bugle is one swept brass loop with a flared bell, resting tilted, and a braided cord',()=>{
 const model=createGroundModel({name:'bugle',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['bugle-brass','bugle-cord']);
 let verts=0;
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
 }
 assert(verts<16000,`${verts} vertices`);
 const [brass,cord]=model.children.map(p=>{p.geometry.computeBoundingBox();return p.geometry.boundingBox;});
 // Both the brass and the cord touch the floor; the bell makes it stand about 10 cm high.
 assert(Math.abs(brass.min.y)<1e-6&&Math.abs(cord.min.y)<1e-3,`on the floor: ${brass.min.y}, ${cord.min.y}`);
 assert(brass.max.y>.08&&brass.max.y<.13,`bell height ${brass.max.y}`);
 assert(brass.max.x-brass.min.x>.35,'full length');
 // The inside of the bell and the mouthpiece cup are dark.
 let dark=0;const {color}=model.children[0].geometry.attributes;for(let i=0;i<color.count;i++)if(color.getX(i)<.12)dark++;
 assert(dark>200,`dark bore ${dark}`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the harp stands on its foot: a wooden frame and gut strings with red Cs and blue Fs',()=>{
 const model=createGroundModel({name:'wooden harp',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['harp-wood','harp-strings']);
 let verts=0;
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
 }
 assert(verts<12000,`${verts} vertices`);
 const [wood,strings]=model.children.map(p=>{p.geometry.computeBoundingBox();return p.geometry.boundingBox;});
 assert(Math.abs(wood.min.y)<1e-6&&wood.max.y>.38&&wood.max.y<.48,`stands upright: ${wood.min.y}..${wood.max.y}`);
 // The strings sit inside the frame, clear of the floor.
 assert(strings.min.y>.02&&strings.max.y<=wood.max.y+.01&&strings.min.x>=wood.min.x&&strings.max.x<=wood.max.x);
 // Some strings are red and some blue, most are pale gut.
 const {color}=model.children[1].geometry.attributes;let red=0,blue=0;
 for(let i=0;i<color.count;i++){const r=color.getX(i),g=color.getY(i),b=color.getZ(i);if(r>.55&&g<.3&&b<.3)red++;if(b>.45&&r<.3)blue++;}
 assert(red>4&&blue>4,`red ${red}, blue ${blue}`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the bell lies tipped on its lip and knob, bronze or (the Bell of Opening) silver',()=>{
 const tone=name=>{
  const model=createGroundModel({name,class:6});
  assert.deepEqual(model.children.map(p=>p.userData.part),['bell-metal','bell-handle']);
  let verts=0;const box=new THREE.Box3(),onFloor=new Set();
  for(const part of model.children){
   const {position,normal,color}=part.geometry.attributes;verts+=position.count;
   for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
   for(const x of color.array)assert(x>=0&&x<=1);
   part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox);
   for(let i=0;i<position.count;i++)if(position.getY(i)<.002)onFloor.add(part.userData.part);
  }
  assert(verts<10000,`${verts} vertices`);
  // Lying down: longer than it is tall, and both the metal lip and the wooden knob touch the floor.
  assert(Math.abs(box.min.y)<1e-6&&box.max.y>.12&&box.max.y<.2&&box.max.x-box.min.x>.25,`bounds ${box.min.toArray()} ${box.max.toArray()}`);
  assert(onFloor.has('bell-metal')&&onFloor.has('bell-handle'),[...onFloor].join());
  const {color}=model.children[0].geometry.attributes;let r=0,b=0;
  for(let i=0;i<color.count;i++){r+=color.getX(i);b+=color.getZ(i);}
  let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
  model.userData.dispose();assert.equal(disposed,2);
  return (r-b)/color.count;
 };
 // Bronze is warm; silver is nearly neutral.
 assert(tone('bell')>.15);
 assert(Math.abs(tone('silver bell'))<.08&&Math.abs(tone('Bell of Opening'))<.08);
});

test('the horn is a curled cow horn with brass fittings and a baldric looped on the floor',()=>{
 const model=createGroundModel({name:'tooled horn',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['horn-body','horn-brass','horn-strap']);
 let verts=0;const box=new THREE.Box3(),bounds={};
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
  part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox);bounds[part.userData.part]=part.geometry.boundingBox;
 }
 assert(verts<14000,`${verts} vertices`);
 // Lying on its side: long and low, resting on its brass while the horn arches clear of the floor.
 assert(Math.abs(box.min.y)<1e-6&&box.max.y>.09&&box.max.y<.14&&box.max.x-box.min.x>.38,`bounds ${box.min.toArray()} ${box.max.toArray()}`);
 assert(bounds['horn-brass'].min.y<1e-6&&bounds['horn-body'].min.y>0);
 // The strap lies on the floor and reaches up to the rings on the bands.
 assert(bounds['horn-strap'].min.y>=0&&bounds['horn-strap'].min.y<.001&&bounds['horn-strap'].max.y>.05);
 // The tip is black, the base pale, and the bore dark.
 const {position,color}=model.children[0].geometry.attributes;let pale=0,black=0;
 for(let i=0;i<color.count;i++){const l=color.getX(i)+color.getY(i)+color.getZ(i);if(l>1.5)pale++;if(l<.05)black++;}
 assert(pale>300&&black>300,`pale ${pale}, black ${black}`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,3);
});

test('the grappling hook is a forged three-fluke grapnel on a tripod, its rope bent on to the eye and coiled on the floor',()=>{
 const model=createGroundModel({name:'grappling hook',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['hook-iron','hook-rope']);
 let verts=0;const box=new THREE.Box3(),bounds={};
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
  part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox);bounds[part.userData.part]=part.geometry.boundingBox;
 }
 assert(verts<12000,`${verts} vertices`);
 // The iron rests on the floor with one fluke standing up; the rope coil lies flat beside it.
 const iron=bounds['hook-iron'],rope=bounds['hook-rope'];
 assert(Math.abs(iron.min.y)<1e-6&&iron.max.y>.13&&iron.max.y<.2,`iron ${iron.min.toArray()} ${iron.max.toArray()}`);
 assert(rope.min.y>=0&&rope.min.y<.001&&rope.max.y<.05,`rope ${rope.min.toArray()} ${rope.max.toArray()}`);
 // It stands on three feet: the eye at one end and the two lower flukes, well apart.
 const P=model.children[0].geometry.attributes.position,feet=[];
 for(let i=0;i<P.count;i++)if(P.getY(i)<.002)feet.push([P.getX(i),P.getZ(i)]);
 const xs=feet.map(f=>f[0]),zs=feet.map(f=>f[1]);
 assert(Math.max(...xs)-Math.min(...xs)>.15&&Math.max(...zs)-Math.min(...zs)>.12,`feet ${JSON.stringify(feet)}`);
 // Normals point out of the floor-facing skin (the flat palms' edges face sideways), so the sweeps are wound outwards.
 for(const part of model.children){const {position,normal}=part.geometry.attributes;let near=0,down=0;
  for(let i=0;i<position.count;i++)if(position.getY(i)<.0012){near++;if(normal.getY(i)<-.3)down++;assert(normal.getY(i)<.5,`${part.userData.part} normal at ${i}`);}
  assert(near>0&&down/near>.8,`${part.userData.part}: ${down} of ${near} floor normals face down`);}
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the beartrap item lies sprung shut: one iron mesh, jaws closed in an arch over the pan, chain curled to a stake',()=>{
 const model=createGroundModel({name:'beartrap',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['beartrap']);
 const geo=model.children[0].geometry,{position,normal,color}=geo.attributes;
 for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
 for(const x of color.array)assert(x>=0&&x<=1);
 for(let i=0;i<normal.count;i++)assert(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-3,`normal ${i}`);
 assert(position.count<14000,`${position.count} vertices`);
 geo.computeBoundingBox();const b=geo.boundingBox;
 assert(Math.abs(b.min.y)<1e-6&&b.max.y>.1&&b.max.y<.16,`height ${b.min.y}..${b.max.y}`);
 // The closed jaws make a thin upright arch: its crown is high over the middle and narrow in z.
 let crown=0,bright=0;const lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];
 for(let i=0;i<position.count;i++){
  if(position.getY(i)>.1){crown++;[position.getX(i),position.getZ(i)].forEach((v,k)=>{lo[k]=Math.min(lo[k],v);hi[k]=Math.max(hi[k],v);});}
  if(color.getX(i)+color.getY(i)+color.getZ(i)>.9)bright++;
 }
 assert(crown>50&&hi[0]-lo[0]<.16&&hi[1]-lo[1]<.03,`crown ${crown} vertices, x ${lo[0]}..${hi[0]}, z ${lo[1]}..${hi[1]}`);
 // The teeth, the jaws' inner edges and the pins are ground bright (linear colours).
 assert(bright>150,`${bright} bright vertices`);
 let disposed=0;geo.addEventListener('dispose',()=>disposed++);model.userData.dispose();assert.equal(disposed,1);
});

test('the lenses are folded gold wire spectacles lying face up on their temples, glass held clear of the floor',()=>{
 const model=createGroundModel({name:'lenses',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['lenses-wire','lenses-glass']);
 let verts=0;const bounds={};
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
  part.geometry.computeBoundingBox();bounds[part.userData.part]=part.geometry.boundingBox;
 }
 assert(verts<8000,`${verts} vertices`);
 const wire=bounds['lenses-wire'],glass=bounds['lenses-glass'];
 // Spectacle sized and low: the temples touch the floor and the lenses ride above them, facing up.
 assert(Math.abs(wire.min.y)<1e-6&&wire.max.y<.045,`wire ${wire.min.toArray()} ${wire.max.toArray()}`);
 assert(wire.max.x-wire.min.x>.2&&wire.max.x-wire.min.x<.25,`width ${wire.max.x-wire.min.x}`);
 assert(glass.min.y>.012&&glass.max.y-glass.min.y<.012,`glass ${glass.min.toArray()} ${glass.max.toArray()}`);
 assert(glass.max.z-glass.min.z>.08,'the lenses face up');
 const {position,normal}=model.children[0].geometry.attributes;let near=0,down=0;
 for(let i=0;i<position.count;i++)if(position.getY(i)<.001){near++;if(normal.getY(i)<-.3)down++;}
 assert(near>0&&down===near,`${down} of ${near} floor normals face down`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the expensive camera is a chrome and leatherette rangefinder with a flash gun, its strap trailing on the floor',()=>{
 const model=createGroundModel({name:'expensive camera',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['camera-hide','camera-chrome','camera-glass']);
 let verts=0;const bounds={};
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
  part.geometry.computeBoundingBox();bounds[part.userData.part]=part.geometry.boundingBox;
 }
 assert(verts<10000,`${verts} vertices`);
 const hide=bounds['camera-hide'],chrome=bounds['camera-chrome'],glass=bounds['camera-glass'];
 // The chrome base plate stands on the floor; the strap lies on it, never below.
 assert(Math.abs(chrome.min.y)<1e-6&&hide.min.y>=-1e-6&&hide.min.y<.002,`${chrome.min.y} ${hide.min.y}`);
 // The flash reflector stands above the body, and the glass (lens, windows, bulb) is off the floor.
 assert(chrome.max.y>hide.max.y+.08&&chrome.max.y<.3,`${chrome.max.y} ${hide.max.y}`);
 assert(glass.min.y>.03,`glass ${glass.min.y}`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,3);
});

test('the chest is a planked, iron-bound oak chest with a barrel lid, a brass lock and drop rings',()=>{
 const model=createGroundModel({name:'chest',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['chest-wood','chest-iron']);
 let verts=0;const bounds={};
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
  part.geometry.computeBoundingBox();bounds[part.userData.part]=part.geometry.boundingBox;
 }
 assert(verts<12000,`${verts} vertices`);
 const wood=bounds['chest-wood'],iron=bounds['chest-iron'];
 // The feet stand on the floor; the barrel lid rises well above the body's iron rim.
 assert(Math.abs(wood.min.y)<1e-6&&iron.min.y>.015,`${wood.min.y} ${iron.min.y}`);
 assert(wood.max.y>.25&&wood.max.y<.3,`lid top ${wood.max.y}`);
 // The straps ride over the lid, and the drop rings hang out past the ends.
 assert(iron.max.y>wood.max.y&&iron.max.y<wood.max.y+.012,`${iron.max.y}`);
 assert(iron.max.x>wood.max.x+.02&&iron.min.x<wood.min.x-.02,`${iron.min.x} ${iron.max.x}`);
 // The chest stands closed and different from the large box.
 const box=createGroundModel({name:'large box',class:6});
 assert.notDeepEqual(box.children.map(p=>p.userData.part),model.children.map(p=>p.userData.part));box.userData.dispose();
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the large box is a nailed pine crate on skids, with a braced frame, rope handles and iron corner guards',()=>{
 const model=createGroundModel({name:'large box',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['large-box-wood','large-box-iron']);
 let verts=0;const bounds={};
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
  for(let i=0;i<normal.count;i++)assert(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-4);
  part.geometry.computeBoundingBox();bounds[part.userData.part]=part.geometry.boundingBox;
 }
 assert(verts<12000,`${verts} vertices`);
 const wood=bounds['large-box-wood'],iron=bounds['large-box-iron'];
 // The skids stand on the floor; the flat lid sits at about a quarter of a cell.
 assert(Math.abs(wood.min.y)<1e-6,`${wood.min.y}`);
 assert(wood.max.y>.22&&wood.max.y<.26,`lid top ${wood.max.y}`);
 // The rope handles hang out past the ends, and the corner guards wrap over the lid.
 assert(wood.max.x>.26&&wood.min.x<-.26&&wood.max.x<.3,`${wood.min.x} ${wood.max.x}`);
 assert(iron.max.y>wood.max.y-.01&&iron.max.y<wood.max.y+.01,`${iron.max.y}`);
 assert(Math.abs(wood.max.z)<.2,`${wood.max.z}`);
 // The ice box is still its own model.
 const ice=createGroundModel({name:'ice box',class:6});
 assert(!ice.children.some(p=>p.userData.part==='large-box-wood'));ice.userData.dispose();
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the ice box is an oak ice chest on bun feet, with nickel fittings, a rimed lid seam and a meltwater pool',()=>{
 const model=createGroundModel({name:'ice box',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['ice-box-wood','ice-box-nickel','ice-box-frost']);
 let verts=0;const bounds={};
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
  for(let i=0;i<normal.count;i++)assert(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-4);
  part.geometry.computeBoundingBox();bounds[part.userData.part]=part.geometry.boundingBox;
 }
 assert(verts<13000,`${verts} vertices`);
 const wood=bounds['ice-box-wood'],nickel=bounds['ice-box-nickel'],frost=bounds['ice-box-frost'];
 // The feet stand on the floor and the lid tops out at about a third of a cell.
 assert(Math.abs(wood.min.y)<1e-6,`${wood.min.y}`);
 assert(wood.max.y>.32&&wood.max.y<.36,`lid top ${wood.max.y}`);
 // The door latch stands proud of the front, and the spigot sticks out the back.
 assert(nickel.max.z>wood.max.z+.01&&nickel.min.z<wood.min.z-.01,`${nickel.min.z} ${nickel.max.z}`);
 // The puddle lies on the floor behind the box; the rime rides the lid seam, below the lid top.
 assert(frost.min.y<.003&&frost.min.z<wood.min.z-.03,`${frost.min.y} ${frost.min.z}`);
 assert(frost.max.y<wood.max.y&&frost.max.y>.3,`${frost.max.y}`);
 // The frost is see-through, doesn't write depth and casts no shadow.
 const ice=model.children[2];
 assert(ice.material.transparent&&!ice.material.depthWrite&&!ice.castShadow);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,3);
});

test('the tinning kit is a tinplate case with a seaming crank, a soldering iron and two labelled tins',()=>{
 const model=createGroundModel({name:'tinning kit',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['tinning-kit-metal','tinning-kit-matte']);
 let verts=0;const bounds={};
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
  for(let i=0;i<normal.count;i++)assert(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-4);
  part.geometry.computeBoundingBox();bounds[part.userData.part]=part.geometry.boundingBox;
 }
 assert(verts<18000,`${verts} vertices`);
 const metal=bounds['tinning-kit-metal'],matte=bounds['tinning-kit-matte'];
 // The case sits on the floor; its lid tops out a little over a tenth of a cell.
 assert(Math.abs(metal.min.y)<1e-6,`${metal.min.y}`);
 assert(metal.max.y>.11&&metal.max.y<.13,`lid top ${metal.max.y}`);
 // The labels, knob and handles sit within the metal's spread, no higher than the bail's grip.
 assert(matte.max.y<metal.max.y+.004&&matte.min.y>-1e-6,`${matte.min.y} ${matte.max.y}`);
 assert(metal.max.x-metal.min.x>.3,`${metal.min.x} ${metal.max.x}`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the crystal ball is a glass orb held in brass talons on a turned stand, centred where its aura swirls',()=>{
 const model=createGroundModel({name:'crystal ball',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['crystal-ball-stand','crystal-ball-brass','crystal-ball-depth','crystal-ball-mist','crystal-ball-glass']);
 let verts=0;const box=new THREE.Box3(),bounds={};
 for(const part of model.children){
  assert.deepEqual(part.position.toArray(),[0,0,0]);
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color].filter(Boolean))for(const x of a.array)assert(Number.isFinite(x));
  if(color)for(const x of color.array)assert(x>=0&&x<=1);
  part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox);bounds[part.userData.part]=part.geometry.boundingBox;
 }
 assert(verts<10000,`${verts} vertices`);
 // wand-auras.js swirls the mist round (0,.14,0) inside a radius of .105.
 const glass=bounds['crystal-ball-glass'];
 for(const [lo,hi,mid] of [[glass.min.x,glass.max.x,0],[glass.min.y,glass.max.y,.14],[glass.min.z,glass.max.z,0]])
  assert(Math.abs((lo+hi)/2-mid)<1e-3&&Math.abs((hi-lo)/2-.105)<1e-3,`glass ${glass.min.toArray()} ${glass.max.toArray()}`);
 assert(Math.abs(box.min.y)<1e-6&&box.max.y<.25&&box.max.x-box.min.x<.24&&box.max.z-box.min.z<.24,`bounds ${box.min.toArray()} ${box.max.toArray()}`);
 assert(bounds['crystal-ball-stand'].min.y<1e-6&&bounds['crystal-ball-stand'].max.y<.05);
 // The talons climb past the equator without sinking into the glass.
 const brass=model.children[1].geometry.attributes.position,v=new THREE.Vector3();let top=0;
 for(let i=0;i<brass.count;i++){v.fromBufferAttribute(brass,i);if(v.y>.08){v.y-=.14;assert(v.length()>.104,`brass inside the glass at ${v.toArray()}`);}top=Math.max(top,brass.getY(i));}
 assert(top>.15,`talons reach ${top}`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,5);
});

test('the credit card is a bowed plastic card with a gold chip, a hologram and embossed figures',()=>{
 const model=createGroundModel({name:'credit card',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['credit-card-plastic','credit-card-foil']);
 let verts=0;
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
 }
 assert(verts<40000,`${verts} vertices`);
 const [plastic,foil]=model.children.map(p=>{p.geometry.computeBoundingBox();return p.geometry.boundingBox;});
 // Card sized, lying flat: the middle touches the floor and the ends lift a little.
 assert(Math.abs(plastic.min.y)<1e-6&&plastic.max.y>.004&&plastic.max.y<.01,`lies flat: ${plastic.min.y}..${plastic.max.y}`);
 assert(Math.abs(plastic.max.x-plastic.min.x-.2)<.002&&Math.abs(plastic.max.z-plastic.min.z-.126)<.002,'card proportions');
 // The foil sits on the face, and the chip is gold (red well above blue) on the left.
 assert(foil.min.y>=plastic.min.y+.0035,`foil on the face ${foil.min.y}`);
 const {position,color}=model.children[1].geometry.attributes;let chip=0;
 for(let i=0;i<position.count;i++)if(position.getX(i)<-.05&&color.getX(i)>color.getZ(i)+.3)chip++;
 assert(chip>500,`gold chip ${chip}`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the saddle is a merged leather saddle on a blanket with irons on the floor',()=>{
 const model=createGroundModel({name:'a saddle',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['saddle-leather','saddle-metal']);
 let verts=0;
 for(const part of model.children){
  const {position,normal,color}=part.geometry.attributes;verts+=position.count;
  for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
  for(const x of color.array)assert(x>=0&&x<=1);
 }
 assert(verts<20000,`${verts} vertices`);
 model.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(model,true);
 assert(Math.abs(b.min.y)<1e-6&&b.max.y>.12&&b.max.y<.25,`sits low: ${b.min.y}..${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.3,'fits its tile');
 // The stirrup irons lie on the floor, well outside the skirts.
 const [,metal]=model.children,p=metal.geometry.attributes.position;
 let low=1,wide=0;for(let i=0;i<p.count;i++){wide=Math.max(wide,Math.abs(p.getZ(i)));if(Math.abs(p.getZ(i))>.2)low=Math.min(low,p.getY(i));}
 assert(wide>.24&&low<.001,`irons out wide (${wide}) and down (${low})`);
 let disposed=0;model.children.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));
 model.userData.dispose();assert.equal(disposed,2);
});

test('the land mine item lies dug up and tipped on a clod: one vertex-coloured mesh, made safe with a pin',()=>{
 const model=createGroundModel({name:'land mine',class:6});
 assert.deepEqual(model.children.map(p=>p.userData.part),['land-mine']);
 const geo=model.children[0].geometry,{position,normal,color}=geo.attributes;
 for(const a of [position,normal,color])for(const x of a.array)assert(Number.isFinite(x));
 for(const x of color.array)assert(x>=0&&x<=1);
 for(let i=0;i<normal.count;i++)assert(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-3,`normal ${i}`);
 assert(position.count<13000,`${position.count} vertices`);
 geo.computeBoundingBox();const b=geo.boundingBox;
 assert(Math.abs(b.min.y)<1e-6&&b.max.y>.08&&b.max.y<.18,`height ${b.min.y}..${b.max.y}`);
 // Tipped: the casing's base is off the floor on one side, so the lowest vertices bunch on the other.
 let low=0,lowZ=0;for(let i=0;i<position.count;i++)if(position.getY(i)<.004){low++;lowZ+=position.getZ(i);}
 assert(low>0&&Math.abs(lowZ/low)>.03,`${low} floor vertices centred at z ${lowZ/low}`);
 model.userData.dispose();
});

test('a gem with no glyph colour is still tinted by its colour word',()=>{
 const tintOf=m=>{let c=null;m.traverse(o=>{if(!c&&o.material?.isMeshPhysicalMaterial)c=o.material.color;});return c;};
 const green=tintOf(createGroundModel({name:'worthless piece of green glass',class:13,appearance:'green',color:8}));
 assert(green.g>green.r*1.5&&green.g>green.b*1.5,`green glass tinted ${green.getHexString()}`);
 const red=tintOf(createGroundModel({name:'ruby',class:13,appearance:'red',color:8}));
 assert(red.r>red.g*2,`ruby tinted ${red.getHexString()}`);
 // a real glyph colour still wins
 assert.equal(tintOf(createGroundModel({name:'emerald',class:13,appearance:'green',color:10})).getHex(),new THREE.Color(0x55cf5a).getHex());
});

test('corpses lie as the body plan of the monster that died, finite, on the floor and within a tile or so',()=>{
 const cases=[['jackal','beast'],['newt','beast'],['red dragon','beast'],['human','humanoid'],['gnome lord','humanoid'],['troll','humanoid'],
  ['garter snake','serpent'],['long worm','serpent'],['giant eel','serpent'],['giant ant','bug'],['cave spider','bug'],['acid blob','blob'],
  ['brown pudding','blob'],['bat','bird'],['raven','bird'],['archeologist','humanoid']];
 for(const [name,plan] of cases){
  assert.equal(corpsePlan(name),plan,name);
  const g=createCorpse(name,3,90);g.rotation.y=0;g.updateMatrixWorld(true);
  const meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push(o);});
  assert(meshes.length>=1&&meshes.length<=2,name+' draws');
  for(const m of meshes){
   for(const v of m.geometry.attributes.position.array)assert(Number.isFinite(v),name);
   for(const v of m.geometry.attributes.normal.array)assert(Number.isFinite(v),name);
   const c=m.geometry.attributes.color;if(c)for(const v of c.array)assert(v>=0&&v<=1,name+' colour');
  }
  const b=new THREE.Box3().setFromObject(g);
  assert(Math.abs(b.min.y)<1e-6,name+' rests on the floor');
  assert(b.max.y<.3,name+' lies low');
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.72,name+' stays near its tile');
  g.userData.dispose();
 }
 assert.equal(corpseSize('newt'),'tiny');assert.equal(corpseSize('troll'),'large');assert.equal(corpseSize('giant ant'),'medium');
 assert.equal(createCorpse('acid blob',2).children.length,1,'a blob is its own puddle');
 assert.equal(createCorpse('kobold zombie',1).children.length,1,'undead do not bleed');
 assert.equal(createCorpse('jackal',3).children.filter(c=>c.userData.part==='pool').length,1,'a jackal lies in a pool');
 const a=createCorpse('jackal',3,1),b=createCorpse('jackal',3,200);
 assert.equal(a.children[0].geometry,b.children[0].geometry,'geometry is shared per look');
 assert.notEqual(a.children[0].material,b.children[0].material,'materials are per corpse');
 assert.notEqual(a.rotation.y,b.rotation.y,'the seed turns the body');
 assert.notEqual(createCorpse('jackal',1).children[0].geometry,a.children[0].geometry,'the glyph colour changes the coat');
 // Dragons keep the beast build but add horns, spines, a spade tail and a folded wing.
 const verts=n=>createCorpse(n,1).children[0].geometry.attributes.position.count;
 assert(verts('red dragon')>verts('horse')*1.2,'a dragon has more to it than a horse');
 assert.equal(verts('horse'),verts('jackal'),'other beasts are unchanged');
 assert.equal(corpseSize('baby red dragon'),'small','a baby dragon is small');
 const wing=createCorpse('red dragon',1).children[0].geometry,wy=wing.attributes.position,wn=wing.attributes.normal;
 wing.computeBoundingBox();const top=wing.boundingBox.max.y*.8;
 let up=0,down=0;for(let i=0;i<wy.count;i++)if(wy.getY(i)>top)wn.getY(i)>0?up++:down++;
 assert(up>300&&up>down*2,'the wing draped over the flank faces up');
});

test('cream pies are one merged, vertex-coloured pie with a fluted crust, piped cream and a cherry; a stack sets out up to three',()=>{
 const one=creamPieGeometry(1);
 for(const key of ['position','normal','color'])for(const v of one.attributes[key].array)assert(Number.isFinite(v),key);
 one.computeBoundingBox();
 const b=one.boundingBox;assert(b.max.y>.09&&b.max.y<.14&&b.max.x<.14&&Math.abs(b.min.y)<1e-6,`pie ${b.max.x} x ${b.max.y}`);
 // The cherry's deep red and plenty of cream (colours are linear).
 const c=one.attributes.color,p=one.attributes.position;let red=0,cream=0;
 for(let i=0;i<c.count;i++){if(c.getX(i)>.2&&c.getY(i)<.06)red++;if(c.getX(i)>.7&&c.getY(i)>.65&&c.getZ(i)>.5)cream++;}
 assert(red>50&&cream>500,`red ${red}, cream ${cream}`);
 // The rim is crimped: its radius varies round the pie.
 let lo=1,hi=0;for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-.036)<.002){const r=Math.hypot(p.getX(i),p.getZ(i));if(r>.11){lo=Math.min(lo,r);hi=Math.max(hi,r);}}
 assert(hi-lo>.005,`crimp ${lo}..${hi}`);
 const three=creamPieGeometry(9);three.computeBoundingBox();
 assert.equal(three.attributes.position.count,3*one.attributes.position.count);
 assert(three.boundingBox.max.y<b.max.y,'stacked pies are smaller');
 for(const name of ['cream pie','2 cream pies','5 cream pies']){
  const model=createGroundModel({name,class:7});
  const meshes=[];model.traverse(q=>{if(q.isMesh)meshes.push(q);});
  assert.equal(meshes.length,1,name);
  assert.equal(meshes[0].userData.part,'cream-pie');
  assert(meshes[0].material.vertexColors);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6&&bounds.max.y<.2,`${name} height ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} inside the tile`);
  model.userData.dispose();
 }
 one.dispose();three.dispose();
});

test('pancakes are a lopsided stack under butter and syrup in one merged, vertex-coloured mesh; a stack piles higher',()=>{
 const one=pancakeGeometry(1),many=pancakeGeometry(9);
 for(const geo of [one,many]){
  for(const k of ['position','normal','color'])for(const v of geo.attributes[k].array)assert(Number.isFinite(v),k);
  const b=geo.boundingBox;
  assert(Math.abs(b.min.y)<1e-6,`grounded ${b.min.y}`);
  assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.13,'the stack stays in the middle of the tile');
 }
 assert(one.boundingBox.max.y>.05&&one.boundingBox.max.y<.075,`stack of three ${one.boundingBox.max.y}`);
 assert(Math.abs(many.boundingBox.max.y-one.boundingBox.max.y-2*.0155)<.004,'more pancakes add two cakes');
 // Seen from above, the top shows golden cake, a dark pool of syrup and the butter, all facing up.
 const mesh=new THREE.Mesh(one,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster(),c=one.attributes.color;
 const seen={cake:0,syrup:0,butter:0};
 for(let x=-.1;x<=.1;x+=.005)for(let z=-.1;z<=.1;z+=.005){
  ray.set(new THREE.Vector3(x,.2,z),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObject(mesh)[0];if(!hit)continue;
  assert(hit.face.normal.y>0,'surfaces seen from above face up');
  const i=hit.face.a,r=c.getX(i),g=c.getY(i),bl=c.getZ(i);
  seen[r<.35&&r>2*g?'syrup':r>.8&&g>.75&&bl<.45?'butter':'cake']++;
 }
 assert(seen.cake>600&&seen.syrup>200&&seen.butter>15,JSON.stringify(seen));
 for(const name of ['pancake','2 pancakes']){
  const model=createGroundModel({name,class:7});
  const meshes=[];model.traverse(q=>{if(q.isMesh)meshes.push(q);});
  assert.equal(meshes.length,1,name);
  assert.equal(meshes[0].userData.part,'pancake');
  assert(meshes[0].material.vertexColors);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6&&bounds.max.y<.1,`${name} height ${bounds.max.y}`);
  model.userData.dispose();
 }
 one.dispose();many.dispose();
});

test('fortune cookies are a folded, crescent-bent shell with a slip of paper in one merged, vertex-coloured mesh; a stack sets out up to three',()=>{
 const one=fortuneCookieGeometry(1);
 for(const k of ['position','normal','color'])for(const v of one.attributes[k].array)assert(Number.isFinite(v),k);
 const b=one.boundingBox;
 assert(Math.abs(b.min.y)<1e-6&&b.max.y>.06&&b.max.y<.11,`height ${b.max.y}`);
 assert(b.max.x>.07&&b.max.x<.1&&b.max.z<.04,`cookie ${b.max.x} x ${b.max.z}`);
 // Every surface a ray from outside meets faces back out along it.
 const mesh=new THREE.Mesh(one,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster(),c=new THREE.Vector3(),d=new THREE.Vector3();
 b.getCenter(c);let hits=0;
 for(let i=0;i<200;i++){
  d.set(Math.sin(i*2.4)*Math.sqrt(1-((i+.5)/100-1)**2),(i+.5)/100-1,Math.cos(i*2.4)*Math.sqrt(1-((i+.5)/100-1)**2));
  ray.set(c.clone().addScaledVector(d,.5),d.clone().negate());const hit=ray.intersectObject(mesh)[0];
  if(hit){hits++;assert(hit.face.normal.dot(d)>0,'faces outward');}
 }
 assert(hits>150,`hits ${hits}`);
 // Golden-brown dough and the fortune's white paper and red print (colours are linear).
 const col=one.attributes.color;let dough=0,paper=0,ink=0;
 for(let i=0;i<col.count;i++){const r=col.getX(i),g=col.getY(i),bl=col.getZ(i);
  if(r>.85&&g>.8&&bl>.7)paper++;else if(r>.3&&r>2.5*g&&r>2.5*bl)ink++;else if(r>g&&g>bl)dough++;}
 assert(dough>2000&&paper>50&&ink>10,`dough ${dough}, paper ${paper}, ink ${ink}`);
 const three=fortuneCookieGeometry(9);
 assert.equal(three.attributes.position.count,3*one.attributes.position.count);
 assert(three.boundingBox.max.y<b.max.y,'a stack sets out smaller cookies');
 for(const name of ['fortune cookie','2 fortune cookies','4 fortune cookies']){
  const model=createGroundModel({name,class:7});
  const meshes=[];model.traverse(q=>{if(q.isMesh)meshes.push(q);});
  assert.equal(meshes.length,1,name);
  assert.equal(meshes[0].userData.part,'fortune-cookie');
  assert(meshes[0].material.vertexColors);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6&&bounds.max.y<.12,`${name} height ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} inside the tile`);
  model.userData.dispose();
 }
 one.dispose();three.dispose();
});

test('candy bars are a torn-open wrapper, peeled foil and scored chocolate in one merged, vertex-coloured mesh; a stack adds sealed bars',()=>{
 const one=candyBarGeometry(1);
 for(const k of ['position','normal','color'])for(const v of one.attributes[k].array)assert(Number.isFinite(v),k);
 const b=one.boundingBox;
 assert(Math.abs(b.min.y)<1e-6&&b.max.y>.025&&b.max.y<.04,`height ${b.max.y}`);
 assert(b.max.x>.1&&b.max.x<.16&&b.max.z<.1,`bar ${b.max.x} x ${b.max.z}`);
 // Nearly every surface a ray from outside meets faces back out along it (a few look into the torn end).
 const mesh=new THREE.Mesh(one,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster(),c=new THREE.Vector3(),d=new THREE.Vector3();
 b.getCenter(c);let hits=0,out=0;
 for(let i=0;i<200;i++){
  const y=(i+.5)/100-1,r=Math.sqrt(1-y*y);d.set(Math.sin(i*2.4)*r,y,Math.cos(i*2.4)*r);
  ray.set(c.clone().addScaledVector(d,.5),d.clone().negate());const hit=ray.intersectObject(mesh)[0];
  if(hit){hits++;if(hit.face.normal.dot(d)>0)out++;}
 }
 assert(hits>190&&out>.95*hits,`hits ${hits}, outward ${out}`);
 // Red paper, a cream label, grey foil and dark chocolate (colours are linear).
 const col=one.attributes.color;let red=0,cream=0,foil=0,choc=0;
 for(let i=0;i<col.count;i++){const r=col.getX(i),g=col.getY(i),bl=col.getZ(i);
  if(r>.3&&r>4*g&&r>4*bl)red++;else if(Math.abs(r-g)<.06&&Math.abs(g-bl)<.06&&r>.15)foil++;else if(r<.12&&r>1.5*bl&&r>g)choc++;else if(r>.7&&g>.6&&bl>.35)cream++;}
 assert(red>1000&&cream>300&&foil>500&&choc>1000,`red ${red}, cream ${cream}, foil ${foil}, chocolate ${choc}`);
 const three=candyBarGeometry(9);
 assert(three.attributes.position.count>one.attributes.position.count,'a stack adds bars');
 assert(three.boundingBox.max.y>b.max.y*1.5,'the opened bar sits on top of the stack');
 for(const name of ['candy bar','2 candy bars','5 candy bars']){
  const model=createGroundModel({name,class:7});
  const meshes=[];model.traverse(q=>{if(q.isMesh)meshes.push(q);});
  assert.equal(meshes.length,1,name);
  assert.equal(meshes[0].userData.part,'candy-bar');
  assert(meshes[0].material.vertexColors);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6&&bounds.max.y<.07,`${name} height ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} inside the tile`);
  model.userData.dispose();
 }
 one.dispose();three.dispose();
});

test('royal jelly is a torn queen cell spilling jelly beside a shard of comb, in one merged vertex-coloured mesh; a stack adds a sealed cell',()=>{
 const one=royalJellyGeometry(1);
 for(const k of ['position','normal','color'])for(const v of one.attributes[k].array)assert(Number.isFinite(v),k);
 const b=one.boundingBox;
 assert(Math.abs(b.min.y)<1e-6&&b.max.y>.035&&b.max.y<.06,`height ${b.max.y}`);
 assert(b.max.x<.13&&b.max.z<.1,`footprint ${b.max.x} x ${b.max.z}`);
 // Pale jelly, tan wax and dark honey (colours are linear).
 const col=one.attributes.color;let jelly=0,wax=0,honey=0;
 for(let i=0;i<col.count;i++){const r=col.getX(i),g=col.getY(i),bl=col.getZ(i);
  if(r>.8&&g>.65&&bl>.3)jelly++;else if(r<.5&&r>2.5*g&&r>.2)honey++;else if(r>.4&&g>.25&&bl<.3)wax++;}
 assert(jelly>150&&wax>400&&honey>10,`jelly ${jelly}, wax ${wax}, honey ${honey}`);
 const two=royalJellyGeometry(4);
 assert(two.attributes.position.count>one.attributes.position.count,'a stack adds a cell');
 for(const name of ['lump of royal jelly','3 lumps of royal jelly']){
  const model=createGroundModel({name,class:7});
  const meshes=[];model.traverse(q=>{if(q.isMesh)meshes.push(q);});
  assert.equal(meshes.length,1,name);
  assert.equal(meshes[0].userData.part,'royal-jelly');
  assert(meshes[0].material.vertexColors&&!meshes[0].material.transparent);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6&&bounds.max.y<.07,`${name} height ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} inside the tile`);
  model.userData.dispose();
 }
 one.dispose();two.dispose();
});

test('lembas is one merged, vertex-coloured wafer scored into squares, wrapped in mallorn leaves and tied with twine; a stack piles up to three',()=>{
 const one=lembasGeometry(1);
 for(const key of ['position','normal','color'])for(const v of one.attributes[key].array)assert(Number.isFinite(v),key);
 one.computeBoundingBox();
 const b=one.boundingBox;assert(b.max.y>.025&&b.max.y<.05&&Math.abs(b.min.y)<1e-6,`wafer height ${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.2,'the leaves stay near the wafer');
 // Pale crumb and green leaf (colours are linear).
 const c=one.attributes.color;let green=0,pale=0;
 for(let i=0;i<c.count;i++){if(c.getY(i)>c.getX(i)*1.2&&c.getY(i)>c.getZ(i)*1.5)green++;if(c.getX(i)>.75&&c.getY(i)>.65)pale++;}
 assert(green>300&&pale>100,`green ${green}, pale ${pale}`);
 // The top is scored: the wafer's top face dips along the lines between the squares.
 const p=one.attributes.position;let groove=1,flat=0;
 for(let i=0;i<866;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i);if(y<.015||Math.abs(z)>.05)continue;
  if(Math.abs(Math.abs(x)-.025)<.001)groove=Math.min(groove,y);else if(Math.abs(x)<.01)flat=Math.max(flat,y);}
 assert(flat-groove>.0015,`score ${groove}..${flat}`);
 const three=lembasGeometry(7);three.computeBoundingBox();
 assert(Math.abs(three.boundingBox.max.y-b.max.y-.04)<.002,'a stack of three is two wafers taller');
 for(const name of ['lembas wafer','2 lembas wafers','9 lembas wafers']){
  const model=createGroundModel({name,class:7});
  const meshes=[];model.traverse(q=>{if(q.isMesh)meshes.push(q);});
  assert.equal(meshes.length,1,name);
  assert.equal(meshes[0].userData.part,'lembas');
  assert(meshes[0].material.vertexColors);
  const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.min.y)<1e-6&&bounds.max.y<.1,`${name} height ${bounds.max.y}`);
  assert(Math.max(-bounds.min.x,bounds.max.x,-bounds.min.z,bounds.max.z)<.3,`${name} inside the tile`);
  model.userData.dispose();
 }
 one.dispose();three.dispose();
});

test('tripe rations are honeycomb tripe on butcher paper in one merged, vertex-coloured mesh; a stack adds a piece',()=>{
 const one=tripeRationGeometry(1),two=tripeRationGeometry(4);
 for(const geo of [one,two]){
  for(const k of ['position','normal','color'])for(const v of geo.attributes[k].array)assert(Number.isFinite(v));
  geo.computeBoundingBox();const b=geo.boundingBox;
  assert(Math.abs(b.min.y)<1e-6);assert(b.max.y>.03&&b.max.y<.07);
  assert(b.max.x-b.min.x<.4&&b.max.z-b.min.z<.4);
 }
 assert(two.attributes.position.count>one.attributes.position.count);
 // The honeycomb face shows cream ridges and darker pits.
 const c=one.attributes.color,lum=[];for(let i=0;i<c.count;i++)lum.push(c.getX(i)+c.getY(i)+c.getZ(i));
 assert(Math.max(...lum)-Math.min(...lum)>.6);
 // Seen from above, every surface faces up (nothing inside out or folded over).
 const mesh=new THREE.Mesh(one,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster();
 let hits=0;
 for(let x=-.15;x<=.15;x+=.025)for(let z=-.12;z<=.12;z+=.02){
  ray.set(new THREE.Vector3(x,1,z),new THREE.Vector3(0,-1,0));const h=ray.intersectObject(mesh)[0];
  if(h){hits++;assert(h.face.normal.y>0,`${x},${z}`);}
 }
 assert(hits>100);
 for(const name of ['tripe ration','3 tripe rations']){
  const model=createGroundModel({name,class:7});
  const meshes=[];model.traverse(p=>{if(p.geometry)meshes.push(p);});
  assert.equal(meshes.length,1);assert.equal(meshes[0].userData.part,'tripe');
  model.userData.dispose();
 }
 one.dispose();two.dispose();
});

test('the slime mold is a lobed blob of see-through jelly around a seeded heart, spreading in a slick',()=>{
 const model=createGroundModel({name:'slime mold',class:7});
 const meshes=[];model.traverse(p=>{if(p.isMesh)meshes.push(p);});
 assert.equal(meshes.length,2,'one jelly mesh and one core mesh');
 const jelly=meshes.find(m=>m.material.transparent),heart=meshes.find(m=>!m.material.transparent);
 assert(jelly&&heart,'a translucent jelly over an opaque heart');
 assert(jelly.material.opacity<.8&&jelly.material.roughness<.2,'the jelly is glossy and see-through');
 for(const m of meshes){const a=m.geometry.attributes;for(const k of ['position','normal','color'])for(const v of a[k].array)assert(Number.isFinite(v),k);}
 model.updateMatrixWorld(true);
 const all=new THREE.Box3().setFromObject(model),core=new THREE.Box3().setFromObject(heart),blob=new THREE.Box3().setFromObject(jelly);
 assert(Math.abs(all.min.y)<1e-6,'grounded');
 assert(all.max.y>.08&&all.max.y<.16,`height ${all.max.y}`);
 // the slick and pseudopods spread wider than the dome, and the heart sits inside the jelly
 assert(blob.max.x-blob.min.x>.3,'spreads over the floor');
 assert(blob.containsBox(core),'the heart is inside the jelly');
 // every slime mold is its own geometry, so disposing one leaves the rest alone
 const other=[];createGroundModel({name:'slime mold',class:7}).traverse(p=>{if(p.isMesh)other.push(p);});
 assert.notEqual(other[0].geometry,meshes[0].geometry);
});
