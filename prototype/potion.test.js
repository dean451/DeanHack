import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPotion,potionShape,glowDisc} from './potion.js';
import {createGroundModel} from './ground-models.js';

const finite=model=>model.traverse(o=>{if(o.geometry)for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v));});

test('every potion look gets a grounded, finite bottle in three draws, plus a floor glow when it is coloured',()=>{
 const looks=['ruby','milky','bubbly','clear','dark','smoky','icy','sparkling','',undefined];
 const shapes=new Set();
 for(const appearance of looks)for(const color of [1,8,15]){
  const model=createPotion({appearance,color});finite(model);
  shapes.add(model.userData.shape);
  assert.deepEqual(model.children.map(o=>o.name).filter(n=>n!=='glow'),['liquid','stopper','glass']);
  assert(model.children.length<=4);
  model.updateMatrixWorld(true);const b=new THREE.Box3();for(const o of model.children)if(o.name!=='glow')b.union(new THREE.Box3().setFromObject(o));
  assert(Math.abs(b.min.y)<1e-6,`${appearance} rests on the floor`);
  assert(b.max.y>.2&&b.max.y<.5,`${appearance} height ${b.max.y}`);
  assert(Math.max(b.max.x,-b.min.x,b.max.z,-b.min.z)<.45);
  model.userData.dispose();
 }
 assert.equal(shapes.size,4,'the shuffled looks use every bottle shape');
});

test('the bottle shape follows the look, not the true type',()=>{
 assert.equal(potionShape('ruby',1),potionShape('ruby',4));
 assert.equal(potionShape('',3),potionShape('',3));
 const a=createGroundModel({name:'healing',class:8,color:1,appearance:'ruby'});
 const b=createGroundModel({name:'gain level',class:8,color:1,appearance:'ruby'});
 const sig=m=>m.children.map(o=>o.geometry.attributes.position.count);
 assert.deepEqual(sig(a),sig(b));
 a.userData.dispose();b.userData.dispose();
});

test('the liquid sits inside the glass and a stack shows up to three bottles',()=>{
 const one=createPotion({appearance:'ruby'}),three=createPotion({appearance:'ruby',count:7});
 const count=(m,name)=>m.children.find(o=>o.name===name).geometry.attributes.position.count;
 assert.equal(count(three,'glass'),count(one,'glass')*3);
 const glass=new THREE.Box3().setFromObject(one.children.find(o=>o.name==='glass'));
 const liquid=new THREE.Box3().setFromObject(one.children.find(o=>o.name==='liquid'));
 assert(glass.containsBox(liquid));
 one.userData.dispose();three.userData.dispose();
});

test('ground potions release every geometry and material',()=>{
 const model=createGroundModel({name:'2 potions of sleeping',class:8,color:5});
 let geometries=0,materials=0;const mats=new Set();
 model.traverse(o=>{if(o.geometry){o.geometry.addEventListener('dispose',()=>geometries++);mats.add(o.material);}});
 for(const m of mats)m.addEventListener('dispose',()=>materials++);
 model.userData.dispose();
 assert(geometries>=3&&geometries<=4);assert.equal(geometries,materials);
});

test('floor glows have finite colours right out to the rim (NaN there turned the bloom into black blocks)',()=>{
 for(const radius of [.3,.5,.85*.37,.1*2.6,.13*4.2,1/3,.7])for(const colour of ['#ff3030','#30ff60',0x8844ff]){
  const c=glowDisc(colour,radius).attributes.color.array;
  for(let i=0;i<c.length;i++)assert(Number.isFinite(c[i])&&c[i]>=0,`radius ${radius}: colour ${i} is ${c[i]}`);
 }
});

test('silver and golden potions read as polished metal: hard reflection bands, self-lit through them',()=>{
 const lum=c=>.3*c.r+.59*c.g+.11*c.b;
 for(const appearance of ['silver','golden']){
  const p=createPotion({appearance}),liquid=p.getObjectByName('liquid'),col=liquid.geometry.attributes.color;
  let lo=1,hi=0;for(let i=0;i<col.count;i++){const l=lum({r:col.getX(i),g:col.getY(i),b:col.getZ(i)});lo=Math.min(lo,l);hi=Math.max(hi,l);}
  assert(hi-lo>.5,`${appearance} has bright and dark bands (${lo.toFixed(2)}..${hi.toFixed(2)})`);
  assert(liquid.material.metalness>0&&liquid.material.emissive.getHex()===0xffffff,appearance);
  const sh={fragmentShader:'#include <emissivemap_fragment>'};liquid.material.onBeforeCompile(sh);
  assert.match(sh.fragmentShader,/totalEmissiveRadiance \*= vColor\.rgb/);
  p.userData.dispose();
 }
 const silver=createPotion({appearance:'silver'}).getObjectByName('liquid').geometry.attributes.color;
 let warm=0;for(let i=0;i<silver.count;i++)warm=Math.max(warm,silver.getX(i)-silver.getZ(i));
 assert(warm<.05,'silver stays cool grey, never gold');
});

test('muddy is a near-black goo, apart from brown; amber is a warm, glowing resin',async()=>{
 const {potionLook}=await import('./item-looks.js'),{potionStyle,GLOW_STYLE}=await import('./potion-fx.js');
 const L=hex=>{const hsl={};new THREE.Color(hex).getHSL(hsl);return hsl.l;};
 const muddy=potionLook('muddy'),brown=potionLook('brown');
 assert(L(muddy.liquid)*4<L(brown.liquid)&&L(muddy.glass)*4<L(brown.glass),'muddy is far darker than brown');
 assert.equal(muddy.opacity,1);
 assert.equal(potionStyle('muddy').name,'ooze');
 const amber=potionLook('amber');assert(amber.emissiveIntensity>=.6);assert(GLOW_STYLE.test('amber'));
});

test('metal potions are not veiled: clear glass, opaque liquid shaded like armour, no bright surface disc',()=>{
 for(const appearance of ['silver','golden']){
  const p=createPotion({appearance}),glass=p.getObjectByName('glass').material,liquid=p.getObjectByName('liquid');
  assert(glass.opacity<=.12&&glass.transmission===0,`${appearance} glass is a bare skin, not a milky veil`);
  assert.equal(liquid.material.transparent,false,`${appearance} liquid is opaque`);
  assert(liquid.material.metalness>=.8&&liquid.material.emissiveIntensity<=.3,`${appearance} is shaded like metal, not a glowing dye`);
  // the top surface (seen from the camera above) carries dark bands as well as bright ones
  const pos=liquid.geometry.attributes.position,col=liquid.geometry.attributes.color;let top=0,dark=0,maxY=0;
  for(let i=0;i<pos.count;i++)maxY=Math.max(maxY,pos.getY(i));
  for(let i=0;i<pos.count;i++)if(pos.getY(i)>maxY-.006){top++;if(col.getX(i)+col.getY(i)+col.getZ(i)<.3)dark++;}
  assert(dark>top*.15,`${appearance} surface has dark reflection bands (${dark}/${top})`);
  p.userData.dispose();
 }
});
