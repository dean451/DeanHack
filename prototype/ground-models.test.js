import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundModel,eucalyptusLeafGeometry} from './ground-models.js';
import {candelabrumState} from './candelabrum.js';
import {markerCharges} from './marker.js';

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
 const foods=['apple','3 oranges','pear','melon','banana','carrot','2 eggs','tin','lembas wafer','fortune cookie','meatball','meat stick','huge chunk of meat','meat ring','2 cloves of garlic','lump of royal jelly','cream pie','candy bar','pancake','kelp frond','slime mold','eucalyptus leaf','3 eucalyptus leaves'];
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
 assert.equal(createGroundModel({name:'glob of gray ooze',class:7}),null);
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
 for(const [a,b] of [['tin whistle','magic whistle'],['tooled horn','frost horn'],['wooden harp','magic harp'],['leather drum','drum of earthquake'],['wooden flute','magic flute'],['iron hook','grappling hook']])
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

test('the blindfold is a padded silk band tied in a loop with frayed trailing ties',()=>{
 const model=createGroundModel({name:'an uncursed blindfold',class:6});
 assert(model,'blindfolds have a ground model');
 const bounds=new THREE.Box3().setFromObject(model);
 assert(bounds.min.y>=-1e-6);assert(bounds.max.y<.04,'it lies flat');
 assert(bounds.max.x-bounds.min.x>.35,'the ties trail out from the loop');
 let vertices=0;
 model.traverse(part=>{if(part.geometry){const a=part.geometry.attributes.position.array;vertices+=a.length/3;for(const value of a)assert(Number.isFinite(value));}});
 assert(vertices<20000,`vertices: ${vertices}`);
 assert(model.children.filter(part=>part.geometry.type==='TubeGeometry').length>=10,'hems and frayed threads');
 model.userData.dispose();
});

test('every bag shares one cinched drawstring sack, so the kind never shows',()=>{
 const signature=model=>model.children.map(part=>[part.geometry.type,...part.position.toArray().map(v=>v.toFixed(5)),part.material.color.getHex()]);
 const models=['bag','sack','oilskin sack','bag of holding','bag of tricks','an uncursed bag'].map(name=>createGroundModel({name,class:6}));
 for(const model of models){
  assert(model,'bags have a ground model');
  assert.deepEqual(signature(model),signature(models[0]),'the true bag must not show');
  const bounds=new THREE.Box3().setFromObject(model);
  assert(bounds.min.y>=-1e-6);assert(bounds.max.y>.35&&bounds.max.y<.45,`height ${bounds.max.y}`);
  assert(bounds.max.x<.4&&bounds.min.x>-.4&&bounds.max.z<.45&&bounds.min.z>-.4,'fits the tile');
  const body=model.children.find(part=>part.geometry.type==='LatheGeometry');
  assert(body?.material.vertexColors,'a shaded canvas body');
  assert(model.children.filter(part=>part.geometry.type==='TubeGeometry').length>=3,'drawstring and two trailing ends');
  let vertices=0;
  model.traverse(part=>{if(part.geometry){const a=part.geometry.attributes.position.array;vertices+=a.length/3;for(const value of a)assert(Number.isFinite(value));}});
  assert(vertices<20000,`vertices: ${vertices}`);
  model.userData.dispose();
 }
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
 assert(stones.length>=10,`rubble pieces and grit: ${stones.length}`);
 assert(stones.every(p=>p.material.flatShading&&p.material.vertexColors));
 // The biggest piece is shaped by fracture planes, so many vertices sit well inside its hull.
 const big=stones[0].geometry.attributes.position,lens=[];
 for(let i=0;i<big.count;i++)lens.push(Math.hypot(big.getX(i)/1.1,big.getY(i)/.66,big.getZ(i)/.9));
 const max=Math.max(...lens);
 assert(lens.filter(l=>l<max*.8).length>big.count*.2,'rubble should have flat broken faces');
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
 const sheet=apron.children[0].geometry,col=sheet.attributes.color;
 assert(sheet.attributes.position.count>1000,'the cloth is a fine grid');
 // Stains pull some cloth well away from the linen tone.
 let stained=0;for(let i=0;i<col.count;i++)if(col.getX(i)<.5)stained++;
 assert(stained>10,`stained vertices: ${stained}`);
 assert(apron.children.filter(p=>p.geometry.type==='TubeGeometry').length>=5,'hems and frayed ties');
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
 assert(createGroundModel({name:'tripe ration',class:7}).children.every(p=>!p.userData.part));
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
