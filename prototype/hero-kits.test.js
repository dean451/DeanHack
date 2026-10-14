import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {KITS,KIT_ROLES,dressHero} from './hero-kits.js';
import {ROLE_NAMES} from './roles.js';
import {readFileSync} from 'node:fs';

// A stand-in for the rig knight() builds: the same named parts, with the Valkyrie's colours.
function fakeRig(){
  const mesh=()=>new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial());
  const group=()=>new THREE.Group(),hairGroup=group(),mk=n=>Array.from({length:n},()=>{const m=mesh();hairGroup.add(m);return m;});
  const mats=Object.fromEntries(['armor','armorLight','leather','accent','boots','capeCloth','hairDark','hairMid','hairLight','skin'].map((k,i)=>[k,new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(i/10,.5,.5)})]));
  const parts={body:group(),head:group(),arm:group(),elbow:group(),shieldArm:group(),shieldElbow:group(),chest:mesh(),belt:mesh(),cape:group(),hair:hairGroup,
    pauldrons:[mesh(),mesh()],tassets:[mesh(),mesh()],mantles:[mesh()],hairParts:{cap:mk(1),strands:mk(3),tail:mk(1),braids:mk(2)},mats};
  parts.arm.add(parts.elbow);parts.shieldArm.add(parts.shieldElbow);
  return {g:group(),parts};
}
const count=o=>{let n=0;o.traverse(()=>n++);return n;};
const rigCount=h=>count(h.parts.body)+count(h.parts.head)+count(h.parts.arm)+count(h.parts.shieldArm);

test('every class the game offers has a kit',()=>{
  for(const role of ROLE_NAMES)assert.ok(KIT_ROLES.includes(role),`${role} has a kit`);
  assert.deepEqual(KIT_ROLES.filter(r=>!ROLE_NAMES.includes(r)),[],'and no kit is for a class that does not exist');
});

test('dressing is idempotent and returns whether anything changed',()=>{
  const hero=fakeRig();
  assert.equal(dressHero(hero,{role:'Wizard',gender:'female'}),true);
  const n=rigCount(hero);
  assert.equal(dressHero(hero,{role:'Wizard',gender:'female'}),false,'the same character again does nothing');
  assert.equal(rigCount(hero),n);
  assert.equal(dressHero(hero,{role:'Wizard',gender:'male'}),true,'a different gender is a different look');
  assert.equal(dressHero({g:new THREE.Group()},{role:'Wizard'}),false,'a hero with no parts (a polymorphed form) is left alone');
});

test('every class and gender dresses without error and keeps the rig sound',()=>{
  for(const role of ROLE_NAMES)for(const gender of ['female','male']){
    const hero=fakeRig();
    dressHero(hero,{role,gender});
    for(const o of hero.parts.body.children)assert.ok(o.visible!==undefined,role);
    for(const k of ['armor','armorLight','leather','accent','boots','capeCloth'])assert.ok(Number.isFinite(hero.parts.mats[k].color.r),`${role} ${k}`);
  }
});

test('a robe class hides the plate, wears a hat, and a man gets a beard',()=>{
  const w=fakeRig();dressHero(w,{role:'Wizard',gender:'female'});
  assert.equal(w.parts.chest.visible,false);assert.ok(w.parts.pauldrons.every(p=>!p.visible));assert.ok(w.parts.tassets.every(p=>!p.visible));assert.equal(w.parts.cape.visible,false);
  const women=count(w.parts.head);
  const m=fakeRig();dressHero(m,{role:'Wizard',gender:'male'});
  assert.ok(count(m.parts.head)>women,'the male Wizard has a beard on top of the hat');
  assert.equal(w.parts.mats.armor.color.getHexString(),'2b3560','the robe takes the class colour');
});

test('changing class restores the Valkyrie exactly',()=>{
  const hero=fakeRig(),before=rigCount(hero),colour=hero.parts.mats.armor.color.getHex(),hair=hero.parts.mats.hairMid.color.getHex();
  dressHero(hero,{role:'Wizard',gender:'male'});
  assert.ok(rigCount(hero)>before);
  dressHero(hero,{role:'Valkyrie',gender:'female'});
  assert.equal(rigCount(hero),before,'every added piece is removed');
  assert.equal(hero.parts.mats.armor.color.getHex(),colour);assert.equal(hero.parts.mats.hairMid.color.getHex(),hair);
  assert.equal(hero.parts.chest.visible,true);assert.ok(hero.parts.pauldrons.every(p=>p.visible));assert.equal(hero.parts.cape.visible,true);
  assert.ok(Object.values(hero.parts.hairParts).flat().every(p=>p.visible),'the braids come back');
});

test('hair follows the class and gender',()=>{
  const bald=fakeRig();dressHero(bald,{role:'Convict',gender:'male'});
  assert.ok(Object.values(bald.parts.hairParts).flat().every(p=>!p.visible),'a convict is shaved');
  const short=fakeRig();dressHero(short,{role:'Knight',gender:'male'});
  assert.ok(short.parts.hairParts.cap.every(p=>p.visible)&&short.parts.hairParts.strands.every(p=>!p.visible)&&short.parts.hairParts.braids.every(p=>!p.visible));
});

test('the live game dresses the hero from the engine frame, and the rig exposes what a kit needs',()=>{
  const live=readFileSync(new URL('./live.js',import.meta.url),'utf8'),main=readFileSync(new URL('./main.js',import.meta.url),'utf8');
  assert.match(live,/dressHero\(hero,frame\.player\)/);
  const line=main.split('\n').find(l=>l.startsWith(' const parts={chest'));assert.ok(line,'knight() builds its parts object');
  for(const part of ['chest','belt','pauldrons','tassets','mantles','cape','hairParts','mats','head','body','arm','elbow','shieldArm','shieldElbow'])assert.ok(new RegExp(`[{,]${part}[,:}]`).test(line),`knight() exposes ${part}`);
});

test('the Healer is told by what she carries: stethoscope, satchel, scalpel sheath and bandage, over a grimed, stained robe',()=>{
  const h=fakeRig();dressHero(h,{role:'Healer',gender:'female'});
  const added=h.kitAdded.map(a=>a.obj);
  const names=new Set();for(const o of added)o.traverse(x=>{if(x.geometry)names.add(x.geometry.type);});
  assert.ok(names.has('TorusGeometry'),'the stethoscope loop and sash');assert.ok(names.has('CircleGeometry'),'blood spatter discs');assert.ok(names.has('PlaneGeometry'),'the apron panel');
  const colours=new Set();for(const o of added)o.traverse(x=>{if(x.material?.color)colours.add(x.material.color.getHexString());});
  assert.ok(colours.size>=6,`a healer is not one flat colour: ${colours.size} tones`);
  assert.equal(h.parts.mats.armor.color.getHexString(),'b8a276','warm bone linen, not mint');
  const bodyKids=h.parts.body.children.length;
  const c=fakeRig();dressHero(c,{role:'Convict',gender:'female'});
  assert.ok(bodyKids>c.parts.body.children.length+8,'the Healer carries far more than a plain tunic class');
  // props hang off one side: something sits left of the body's axis and something right
  const xs=added.filter(o=>o.parent===h.parts.body).map(o=>o.position.x);
  assert.ok(xs.some(x=>x<-.2)&&xs.some(x=>x>.1),'satchel on one hip, sheath on the other');
  dressHero(h,{role:'Valkyrie',gender:'female'});
  assert.equal(h.parts.body.children.length,0,'everything the Healer wore comes off');
});

test('the kit sheet holds each class\'s starting weapon',async()=>{
  const {KIT_WEAPONS}=await import('./hero-kits.js');
  for(const r of KIT_ROLES)assert.ok(r in KIT_WEAPONS,r+' has a starting weapon entry');
  assert.equal(KIT_WEAPONS.Healer,'scalpel');assert.equal(KIT_WEAPONS.Monk,null,'a monk fights bare-handed');
  const tool=readFileSync(new URL('./tools/kit-shots.mjs',import.meta.url),'utf8');
  assert.match(tool,/KIT_WEAPONS/);
});

test('robes and tunics have shoulders the sleeves join: the cloth reaches out to where the arms hang',()=>{
  for(const role of ['Healer','Convict','Priest','Caveman']){
    const h=fakeRig();dressHero(h,{role,gender:'female'});
    let widest=0;for(const {obj} of h.kitAdded)if(obj.parent===h.parts.body&&obj.geometry?.type==='LatheGeometry'){obj.geometry.computeBoundingBox();widest=Math.max(widest,obj.geometry.boundingBox.max.x);}
    assert.ok(widest>=.29,`${role}: the garment reaches x ${widest.toFixed(2)}, the arms hang at .3`);
  }
});
