import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundModel} from './ground-models.js';

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

test('common food gets grounded, finite models and unknown food falls back',()=>{
 const foods=['apple','3 oranges','pear','melon','banana','carrot','2 eggs','tin','lembas wafer','fortune cookie','meatball','meat stick','huge chunk of meat','meat ring','2 cloves of garlic','lump of royal jelly','cream pie','candy bar','pancake','kelp frond','slime mold'];
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push(part.geometry.type);});return out.join();};
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
 assert.equal(createGroundModel({name:'eucalyptus leaf',class:7}),null);
 assert.equal(createGroundModel({name:'figurine of a newt',class:6}),null);
});

test('scrolls lie on the floor and show only their shuffled label',()=>{
 const scroll=(name,appearance)=>createGroundModel({name,class:9,appearance});
 const signature=model=>model.children.map(part=>[part.geometry.type,...part.position.toArray().map(n=>n.toFixed(5)),part.material.color.getHex()]);
 const models={labelled:scroll('scroll of identify','ZELGO MER'),blank:scroll('scroll of blank paper','unlabeled'),mail:scroll('scroll of mail','stamped'),bare:scroll('scroll',undefined)};
 for(const [kind,model] of Object.entries(models)){
  assert(model,kind);
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
 assert(models.blank.children.length<models.labelled.children.length,'unlabeled paper has no ribbon, seal or script');
 assert.equal(createGroundModel({name:'scroll of identify',class:6}),null);
});

test('common tools get grounded, finite models that share their unidentified look',()=>{
 const tools=['tin whistle','mirror','crystal ball','tooled horn','bugle','wooden flute','wooden harp','leather drum','bell','stethoscope','tin opener','leash','saddle','chest','large box','ice box','tinning kit','expensive camera','lenses','credit card','beartrap','land mine','grappling hook'];
 const signature=model=>model.children.map(part=>[part.geometry.type,...part.position.toArray().map(n=>n.toFixed(5)),part.material.color.getHex()]);
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
 for(const [a,b] of [['tin whistle','magic whistle'],['tooled horn','frost horn'],['wooden harp','magic harp'],['leather drum','drum of earthquake'],['iron hook','grappling hook']])
  assert.deepEqual(signature(createGroundModel({name:a,class:6})),signature(createGroundModel({name:b,class:6})),`${a} and ${b} look alike`);
 assert.notDeepEqual(signature(createGroundModel({name:'unicorn horn',class:6})),signature(createGroundModel({name:'tooled horn',class:6})));
 assert.equal(createGroundModel({name:'chest',class:3}),null);
});

test('rings lie on the floor and show only their shuffled appearance',()=>{
 const ring=(name,appearance)=>createGroundModel({name,class:4,appearance});
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push([part.geometry.type,...part.position.toArray().map(n=>n.toFixed(5)),part.material.color.getHex()]);});return out;};
 for(const look of ['gold','wooden','ruby','pearl','jade','twisted','wire','ridged','engagement','wedding','shiny',undefined]){
  const model=ring('ring of conflict',look);
  assert(model,look);
  const bounds=new THREE.Box3().setFromObject(model);
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
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push([part.geometry.type,...part.position.toArray().map(n=>n.toFixed(5)),part.material.color.getHex()]);});return out;};
 for(const look of ['circular','spherical','oval','triangular','pyramidal','square','concave','hexagonal','octagonal','warped','convex','lunate','spiked','rectangular','elliptic','Amulet of Yendor',undefined]){
  const model=amulet('amulet of ESP',look);
  assert(model,look);
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
 const signature=model=>{const out=[];model.traverse(part=>{if(part.geometry)out.push([part.geometry.type,...part.position.toArray().map(n=>n.toFixed(5)),part.material.color.getHex()]);});return out;};
 const kinds=[['small shield'],['elven shield','blue and green shield'],['Uruk-hai shield','white-handed shield'],['orcish shield','red-eyed shield'],['large shield'],['dwarvish roundshield','large round shield'],['shield of reflection','polished silver shield']];
 const seen=new Set();
 for(const [name,look] of kinds){
  const model=shield(name,look);
  assert(model,name);
  const bounds=new THREE.Box3().setFromObject(model);
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
 const signature=model=>model.children.map(part=>[part.geometry.type,...part.position.toArray().map(n=>n.toFixed(5)),part.material.color.getHex()]);
 const seen=new Set();
 for(const look of looks){
  const model=book('spellbook of force bolt',look);
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
 assert(model.children.filter(part=>part.geometry.type==='LatheGeometry').length>=2,'moulded frame and turned handle');
 assert(model.children.filter(part=>part.geometry.type==='SphereGeometry').length>=30,'beaded rim');
 model.userData.dispose();
});
