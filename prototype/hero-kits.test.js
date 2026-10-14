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
  assert.ok(bodyKids>=14,'the Healer carries a robe, an apron, stains and four props on the body: '+bodyKids);
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

test('the Tourist is the one loud thing in the dungeon, and is named by the camera, pouch, darts and map tube',()=>{
  const t=fakeRig();dressHero(t,{role:'Tourist',gender:'male'});
  const added=t.kitAdded.map(a=>a.obj);
  const colours=new Set();let flowers=0,glass=0;
  for(const o of added)o.traverse(x=>{if(x.material?.color)colours.add(x.material.color.getHexString());if(x.geometry?.type==='CircleGeometry'&&x.material?.color?.getHexString()==='e6dcc0')flowers++;if(x.material?.emissive&&x.material.emissive.getHex()===0x2a4a5a)glass++;});
  assert.ok(flowers>=60,`a print all round the shirt, not confetti: ${flowers} petals`);
  assert.equal(glass,1,'one camera lens');
  assert.ok(colours.size>=7,`tones: ${colours.size}`);
  assert.equal(t.parts.mats.armor.color.getHexString(),'8f3a22','burnt red, not bright red');
  const xs=added.filter(o=>o.parent===t.parts.body).map(o=>o.position.x);
  assert.ok(xs.some(x=>x>.15)&&xs.some(x=>x<-.15),'pouch on one hip, darts on the other');
  assert.ok(added.filter(o=>o.parent===t.parts.body).some(o=>o.position.z<-.15),'the map tube rides on the back');
  dressHero(t,{role:'Valkyrie',gender:'male'});assert.equal(t.parts.body.children.length,0);
});

test('the Archeologist wears a worn open jacket over a dusty shirt and carries the whip, field bag and touchstone',()=>{
  const a=fakeRig();dressHero(a,{role:'Archeologist',gender:'female'});
  const added=a.kitAdded.map(o=>o.obj);
  const colours=new Set();let tori=0;for(const o of added)o.traverse(x=>{if(x.material?.color)colours.add(x.material.color.getHexString());if(x.geometry?.type==='TorusGeometry')tori++;});
  assert.ok(tori>=6,`whip coils, collar, pouch tie and hat band: ${tori} tori`);
  assert.ok(colours.size>=8,`tones: ${colours.size}`);
  const onElbow=a.parts.elbow.children.length;assert.ok(onElbow>=4,'the jacket sleeve, cuff and scuffed elbow patch sit on the arm');
  const xs=added.filter(o=>o.parent===a.parts.body).map(o=>o.position.x);
  assert.ok(xs.some(x=>x>.2)&&xs.some(x=>x<-.2),'whip on the right hip, field bag on the left');
  assert.ok(added.filter(o=>o.parent===a.parts.body).some(o=>o.position.z<-.1&&o.position.y>.5),'the touchstone pouch rides at the back of the belt');
  dressHero(a,{role:'Valkyrie',gender:'female'});assert.equal(a.parts.body.children.length,0);assert.equal(a.parts.elbow.children.length,0);
});

test('the Convict is bald, in stripes, with a shackle on the wrist',()=>{
  const c=fakeRig();dressHero(c,{role:'Convict',gender:'female'});
  for(const part of ['cap','strands','tail','braids'])assert.ok(c.parts.hairParts[part].every(m=>!m.visible),part+' hidden: bald');
  let bands=0,links=0;for(const {obj} of c.kitAdded)obj.traverse(x=>{if(x.material?.color?.getHexString()==='2e2d2a')bands++;if(x.geometry?.type==='TorusGeometry'&&x.geometry.parameters.radius<.02)links++;});
  assert.ok(bands>=10,`stripes round the body and both sleeves: ${bands}`);
  assert.equal(links,3,'three chain links hang from the shackle');
  assert.ok(c.parts.elbow.children.length>c.parts.shieldElbow.children.length,'the shackle is on one wrist only');
  dressHero(c,{role:'Valkyrie',gender:'female'});assert.equal(c.parts.elbow.children.length,0);
});

test('the Monk is brown robes, a rope belt and wrapped forearms, bald',()=>{
  const m=fakeRig();dressHero(m,{role:'Monk',gender:'female'});
  for(const part of ['cap','strands','tail','braids'])assert.ok(m.parts.hairParts[part].every(x=>!x.visible),'bald');
  assert.equal(m.parts.mats.armor.color.getHexString(),'5a4330','brown');
  let wraps=0;for(const elbow of [m.parts.elbow,m.parts.shieldElbow])elbow.traverse(x=>{if(x.material?.color?.getHexString()==='c9bda0')wraps++;});
  assert.equal(wraps,8,'four wraps on each forearm');
  assert.ok(m.kitAdded.some(({obj})=>obj.material?.color?.getHexString()==='b8a06a'),'the rope belt');
  dressHero(m,{role:'Valkyrie',gender:'female'});assert.equal(m.parts.elbow.children.length,0);
});

test('the Priest is white robes with a dark stole, a holy symbol at the chest and beads at the sash',()=>{
  const r=fakeRig();dressHero(r,{role:'Priest',gender:'male'});
  assert.equal(r.parts.mats.armor.color.getHexString(),'cfc8b4','bone white');
  let beads=0,stole=0;for(const {obj} of r.kitAdded)obj.traverse(x=>{if(x.geometry?.type==='SphereGeometry'&&x.material?.color?.getHexString()==='3a2618')beads++;if(x.material?.color?.getHexString()==='3a2a40')stole++;});
  assert.equal(beads,9,'nine prayer beads');assert.ok(stole>=4,'the stole strips');
  assert.ok(r.kitAdded.some(({obj})=>obj.parent===r.parts.body&&Math.abs(obj.position.y-.84)<.01&&obj.position.z>.2),'the holy symbol hangs at the chest');
  dressHero(r,{role:'Valkyrie',gender:'male'});assert.equal(r.parts.body.children.length,0);
});

test('the Rogue is black tunic and pants under a hood, with a thigh sheath and a lockpick roll',()=>{
  const r=fakeRig();dressHero(r,{role:'Rogue',gender:'male'});
  assert.equal(r.parts.mats.armor.color.getHexString(),'1e1e22','black');assert.equal(r.parts.mats.boots.color.getHexString(),'121212');
  const body=r.kitAdded.filter(({obj})=>obj.parent===r.parts.body).map(({obj})=>obj);
  assert.ok(body.some(o=>o.position.x>.1&&o.position.y<.4),'the sheath sits on the right thigh');
  assert.ok(body.some(o=>o.position.x<-.1&&o.position.z<-.1),'the pick roll at the back of the belt');
  assert.ok(r.parts.head.children.length>=2,'the hood');
  dressHero(r,{role:'Valkyrie',gender:'male'});assert.equal(r.parts.body.children.length,0);
});

test('the Ranger is green tunic and pants under a hood, with a quiver on the back and a bracer on the bow arm',()=>{
  const r=fakeRig();dressHero(r,{role:'Ranger',gender:'female'});
  assert.equal(r.parts.mats.armor.color.getHexString(),'2f4a2c','green');
  let fletch=0;for(const {obj} of r.kitAdded)obj.traverse(x=>{if(x.geometry?.type==='PlaneGeometry')fletch++;});
  assert.equal(fletch,5,'five fletched arrows');
  assert.ok(r.kitAdded.some(({obj})=>obj.parent===r.parts.body&&obj.position.z<-.15),'the quiver rides on the back');
  assert.ok(r.parts.shieldElbow.children.length>r.parts.elbow.children.length,'the bracer is on the bow arm only');
  dressHero(r,{role:'Valkyrie',gender:'female'});assert.equal(r.parts.shieldElbow.children.length,0);
});

test('the Caveman is bare skin and a fur loincloth, a hide strap and a bone at the neck',()=>{
  const c=fakeRig();dressHero(c,{role:'Caveman',gender:'male'});
  assert.equal(c.parts.mats.armor.color.getHexString(),'c48f6e','the arms are skin');
  const added=c.kitAdded.map(a=>a.obj);
  const lathes=added.filter(o=>o.parent===c.parts.body&&o.geometry?.type==='LatheGeometry');
  assert.equal(lathes.length,2,'a skin torso and a fur wrap');
  lathes[0].geometry.computeBoundingBox();assert.ok(lathes[0].geometry.boundingBox.max.x>=.29,'the torso has shoulders');
  assert.ok(added.filter(o=>o.parent===c.parts.body&&o.geometry?.type==='ConeGeometry').length>=12,'a ragged fur hem');
  assert.ok(added.some(o=>o.material?.color?.getHexString()==='d9d0b8'),'the bone');
  assert.equal(c.parts.elbow.children.length,0,'no sleeves: bare arms');
  assert.equal(c.parts.mats.armor.metalness,0,'skin is not metal');
  dressHero(c,{role:'Valkyrie',gender:'male'});assert.equal(c.parts.body.children.length,0);
  assert.ok(c.parts.mats.armor.metalness>0||c.parts.mats.armor.metalness===c.parts.baseFinish.armor.metalness,'the plate finish comes back');
});
