import {dressDragon,dragonElement,HIDE_FINISH,torsoTrunk,serpentTrunk} from './dragon-breeds.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {heldBoulderGeometry} from './boulder.js';
import {SPHERE_KINDS,createSphereCreature} from './spheres.js';
import {createTengu} from './tengu.js';
import {createHomunculus,pieces,rgb,mix,at} from './homunculus.js';
import {createManes} from './manes.js';
import {createLemure} from './lemure.js';
import {createQuasit} from './quasit.js';
import {createImp} from './imp.js';
import {createZombie,ZOMBIES} from './zombie.js';
import {createGhoul} from './ghoul.js';
import {createSkeleton} from './skeleton.js';
import {createRaven} from './raven.js';
import {createSpider} from './spider.js';
import {createScorpion,isScorpion} from './scorpion.js';
import {createAnt,isAnt} from './ant.js';
import {createLocust,isLocust} from './locust.js';
import {createFeline,isFeline} from './feline.js';
import {createCanine,isCanine,hellfire} from './canine.js';
import {createBee,isBee} from './bee.js';
import {createBeetle,isBeetle} from './beetle.js';
import {createMold} from './mold.js';
import {createMushroom} from './mushroom.js';
import {createLichen} from './lichen.js';
import {createFern,isFern} from './fern.js';
import {createDevilsSnare,isDevilsSnare} from './devils-snare.js';
import {createPiercer,isPiercer} from './piercer.js';
import {createEnormousRat,isEnormousRat} from './enormous-rat.js';
import {ELVES,createElf} from './elf.js';
import {PRIESTS,createPriest} from './priest.js';
import {createNurse} from './nurse.js';
import {createDoppelganger} from './doppelganger.js';
import {createMinotaur} from './minotaur.js';
import {createShopkeeper} from './shopkeeper.js';
import {createMedusa} from './medusa.js';
import {createCthulhu} from './cthulhu.js';
import {createDisintegrator} from './disintegrator.js';
import {createWeepingAngel,WEEPING_ANGELS} from './weeping-angel.js';
import {createWatch,WATCH} from './watch.js';
import {createSoldier,SOLDIERS} from './soldier.js';
import {createCrocodile,CROCODILES} from './crocodile.js';
import {createCouatl} from './couatl.js';
import {createTurtle} from './turtle.js';
import {createJuiblex} from './juiblex.js';
import {createGhost,GHOSTS} from './ghost.js';
import {createShade} from './shade.js';
import {createStrawGolem} from './straw-golem.js';
import {createPaperGolem} from './paper-golem.js';
import {createJabberwock,JABBERWOCK_KINDS} from './jabberwock.js';
import {createMummy} from './mummy.js';
import {createHobbit} from './hobbit.js';
import {MIND_FLAYER_KINDS,createMindFlayer} from './mind-flayer.js';
import {createGoblin,isGoblin} from './goblin.js';
import {createBugbear} from './bugbear.js';
import {createKobold,isKobold} from './kobold.js';
import {createEvilEye} from './evil-eye.js';
import {createBeholder} from './beholder.js';
import {createGnome,isGnome} from './gnome.js';
import {createOrc,isOrc} from './orc.js';
import {createDwarf,isDwarf} from './dwarf.js';
import {createValkyrie} from './valkyrie.js';
import {createNorn} from './norn.js';
import {createWarrior} from './warrior.js';
import {createSamurai} from './samurai.js';
import {createKnight} from './knight.js';
import {createGolem} from './golem.js';
import {createHezrou} from './hezrou.js';
import {createWizard} from './wizard.js';
import {createWizardOfYendor} from './wizard-of-yendor.js';
import {createMonk} from './monk.js';
import {createArcheologist} from './archeologist.js';
import {createCaveman,CAVE_KINDS} from './caveman.js';
import {createTourist} from './tourist.js';
import {createRanger} from './ranger.js';
import {createRogue} from './rogue.js';
import {createNinja} from './ninja.js';
import {createExecutioner} from './executioner.js';
import {createCharon} from './charon.js';
import {createThothAmon} from './thoth-amon.js';
import {createCroesus} from './croesus.js';
import {createAbbot} from './abbot.js';
import {createOneEyedSam} from './one-eyed-sam.js';
import {createMasterAssassin} from './master-assassin.js';
import {createHippocrates} from './hippocrates.js';
import {createMasterKaen} from './master-kaen.js';
import {createDarkOne} from './dark-one.js';
import {createCarnarvon} from './carnarvon.js';
import {createPelias} from './pelias.js';
import {createBlackMarketeer} from './black-marketeer.js';
import {createMiner} from './miner.js';
import {createMugger} from './mugger.js';
import {isWereMan,createWereMan} from './were-man.js';
import {createConvict} from './convict.js';
import {createPrisoner} from './prisoner.js';
import {createBarbarian} from './barbarian.js';
import {createHealer} from './healer.js';

const M={
 skin:new THREE.MeshStandardMaterial({color:0xb78f72,roughness:.9}),greenSkin:new THREE.MeshStandardMaterial({color:0x63764b,roughness:.92}),graySkin:new THREE.MeshStandardMaterial({color:0x8b8374,roughness:.9}),fur:new THREE.MeshStandardMaterial({color:0xb98a5b,roughness:.94}),whiteFur:new THREE.MeshStandardMaterial({color:0xd6d2c1,roughness:.9}),
 cloth:new THREE.MeshStandardMaterial({color:0x315b59,roughness:.94}),redCloth:new THREE.MeshStandardMaterial({color:0x743b3c,roughness:.9}),brownCloth:new THREE.MeshStandardMaterial({color:0x68452f,roughness:.92}),blueCloth:new THREE.MeshStandardMaterial({color:0x3d5278,roughness:.9}),
 steel:new THREE.MeshStandardMaterial({color:0x91a8aa,metalness:.76,roughness:.3}),darkSteel:new THREE.MeshStandardMaterial({color:0x39484b,metalness:.7,roughness:.38}),gold:new THREE.MeshStandardMaterial({color:0xb9954d,metalness:.78,roughness:.3}),leather:new THREE.MeshStandardMaterial({color:0x493228,roughness:.9}),beard:new THREE.MeshStandardMaterial({color:0x9a5b35,roughness:.96}),
 deadEye:new THREE.MeshStandardMaterial({color:0xcfe8c0,emissive:0x6fa860,emissiveIntensity:1.2,roughness:.3}),eye:new THREE.MeshStandardMaterial({color:0xffb66b,emissive:0xd95b1e,emissiveIntensity:2.5,roughness:.24}),electric:new THREE.MeshStandardMaterial({color:0x5d91b1,emissive:0x1e91ca,emissiveIntensity:1.8,roughness:.34}),fire:new THREE.MeshStandardMaterial({color:0xff8750,emissive:0xf04a18,emissiveIntensity:4,roughness:.3}),wing:new THREE.MeshStandardMaterial({color:0x4c3032,roughness:.86,side:THREE.DoubleSide}),
};
function part(parent,geometry,material,x=0,y=0,z=0){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function rounded(parent,w,h,d,material,x=0,y=0,z=0,r=.04){return part(parent,new RoundedBoxGeometry(w,h,d,3,r),material,x,y,z);}
function sphere(parent,r,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){const mesh=part(parent,new THREE.SphereGeometry(r,16,12),material,x,y,z);mesh.scale.set(sx,sy,sz);return mesh;}
function cylinder(parent,r1,r2,h,material,x=0,y=0,z=0,segments=12){return part(parent,new THREE.CylinderGeometry(r1,r2,h,segments),material,x,y,z);}
function cone(parent,r,h,material,x=0,y=0,z=0,segments=6){return part(parent,new THREE.ConeGeometry(r,h,segments),material,x,y,z);}
function actor(g,body,legs=[],tail=null,wings=[],quirk='idle'){return {g,body,legs,tail,wings,quirk};}
function eyes(head,material=M.eye,y=0,z=.18,spread=.075){for(const x of [-spread,spread])sphere(head,.026,material,x,y,z);}
function humanoid(kind,o={}){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const legs=[],wings=[],arms=[];let hat=null,beard=null,pick=null;
 const short=['gnome','imp'].includes(kind),stocky=kind==='orc',guard=kind==='guard';
 const skin=o.skin||(kind==='orc'?M.greenSkin:M.skin);
 const torso=o.cloth||(kind==='orc'?M.brownCloth:guard?M.steel:M.cloth);
 const headY=short?.87:1.0,shoulderY=short?.7:.8,torsoW=stocky?.46:.42;
 for(const x of [-.13,.13]){const leg=new THREE.Group();leg.position.set(x,.4,0);body.add(leg);rounded(leg,.16,short?.27:stocky?.34:.42,.16,M.darkSteel,0,-.12,0,.035);rounded(leg,.21,.13,.28,kind==='imp'?skin:M.leather,0,-.36,.06,.03);legs.push(leg);}
 rounded(body,torsoW,short?.3:stocky?.4:.48,.3,torso,0,.62,0,.06);sphere(body,short?.18:.22,skin,0,headY,.02,1,1.05,1);
 // arms give every humanoid a readable silhouette
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*(torsoW/2+.07),shoulderY,0);body.add(arm);arms.push(arm);rounded(arm,.11,short?.3:.38,.12,torso,0,short?-.13:-.17,0,.03);sphere(arm,.065,skin,0,short?-.3:-.38,0);arm.rotation.z=side*.12;}
 if(kind==='gnome'){const cap=hat=cone(body,.25,.36,o.cap||M.redCloth,0,1.2,.01,8);cap.rotation.z=-.16;beard=sphere(body,.19,M.beard,0,.86,.18,.8,.9,.65);sphere(body,.05,skin,0,.98,.19,1,1,.8);}
 if(kind==='imp'){for(const side of [-1,1]){const horn=cone(body,.04,.16,M.leather,side*.1,1.04,.02,5);horn.rotation.z=-side*.35;const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(side*.34,.2);shape.lineTo(side*.3,-.02);shape.lineTo(side*.18,.04);shape.lineTo(0,-.12);const wing=part(body,new THREE.ShapeGeometry(shape),M.wing,side*.12,.72,-.17);wings.push(wing);}const tail=cone(body,.03,.42,skin,0,.42,-.3,5);tail.rotation.x=-2.1;}
 if(kind==='orc'){for(const x of [-.09,.09]){const tusk=cone(body,.045,.15,M.whiteFur,x,.91,.19,5);tusk.rotation.x=x<0?.35:-.35;}for(const x of [-.31,.31])sphere(body,.16,M.darkSteel,x,.84,0,1,.75,1);}
 if(guard){cylinder(body,.23,.23,.13,M.darkSteel,0,1.19,0,10);const plume=cone(body,.06,.25,M.redCloth,0,1.38,-.01,6);plume.rotation.z=-.12;rounded(body,.48,.07,.32,M.gold,0,.78,0,.02);}
 eyes(body,kind==='orc'||kind==='imp'?M.fire:M.eye,short?.91:1.04,.205,.075);
 if(guard){const spear=rounded(body,.045,.7,.045,M.steel,.36,.7,.24,.01);spear.rotation.z=-.12;cone(body,.07,.14,M.steel,.36,1.1,.24,5).rotation.x=Math.PI;}
 // arms, hat, beard and pick are handles for the small folk's gaits (gait.js)
 return Object.assign(actor(g,body,legs,null,wings,kind),{arms,hat,beard,pick});
}
function gridBug(){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const legs=[];sphere(body,.17,M.electric,0,.25,0,.8,.6,1.25);sphere(body,.11,M.darkSteel,0,.27,.16,.9,.72,1);eyes(body,M.electric,.01,.15,.055);
 for(const [x,z] of [[-.16,-.12],[-.19,0],[-.16,.12],[.16,-.12],[.19,0],[.16,.12]]){const leg=new THREE.Group();leg.position.set(x,.25,z);body.add(leg);const limb=rounded(leg,.035,.22,.035,M.darkSteel,0,-.02,x<0?-.08:.08,.01);limb.rotation.z=x<0?-.55:.55;legs.push(leg);}
 for(const x of [-.06,.06]){const antenna=rounded(body,.018,.16,.018,M.electric,x,.39,.19,.005);antenna.rotation.x=x<0?-.28:.28;}
 return actor(g,body,legs,null,[],'gridbug');
}
// Golems (other than straw and paper, which have their own files) are built in golem.js.
// Dragons. UnNetHack shuffles the dragon names (tatzelworm, wyvern, sirrush...) against the breath
// types and draws every dragon brown until its scales are identified. So the name picks a body plan
// from the legend it comes from, and the glyph colour picks the hide and the breath glow. An
// unidentified dragon is brown with an ember glow, which gives nothing away.
const DRAGON_FORMS={
 draken:{legs:4,wings:.9,scale:1.1},wyvern:{legs:2,wings:1.05,scale:1.1,sting:true},sarkany:{legs:4,wings:.9,heads:3,scale:1.1},
 amphitere:{serpent:'coil',wings:.85,feathered:true,scale:1.12},lindworm:{serpent:'coil',legs:2,scale:1.12},
 tatzelworm:{serpent:'short',legs:2,cat:true,scale:1.12},guivre:{serpent:'coil',beard:true,horns:1.5,scale:1.12},
 leviathan:{serpent:'humps',fins:true,scale:1.12},sirrush:{legs:4,sirrush:true,scale:1.1},
 tiamat:{legs:4,wings:.95,heads:5,scale:1.2},'chromatic dragon':{legs:4,wings:1,scale:1.25,chromatic:true},ixoth:{legs:4,wings:.95,scale:1.18},
};
const DRAGON_BREATH=['#9a4aff','#ff5a1a','#8aee3a','#ff8a3a','#5ab8ff','#e060ff','#6fe0e0','#d8d0ff',null,'#ffb050','#a0ff50','#ecff40','#70a0ff','#ff4a20','#c8f8ff','#c0e8ff'];
const DRAGON_WORD_COLOR={chromatic:5,black:0,red:1,green:2,blue:4,gray:7,orange:9,yellow:11,silver:14,white:15};
// Tiamat's five heads: white, black, red, blue and green, each with its own breath
const TIAMAT_HEADS=[15,0,1,4,2];
function dragonLook(name,index){
 const baby=/^baby /.test(name),species=name.replace(/^baby /,'');
 const form=DRAGON_FORMS[species]||DRAGON_FORMS.draken;
 const i=Number.isInteger(index)&&NH_COLORS[index]?index:DRAGON_WORD_COLOR[species.split(' ')[0]]??3;
 return {form,baby,color:i,heads:species==='tiamat'?TIAMAT_HEADS:null};
}
// a bump map of overlapping scales, made once and shared by every dragon's hide
let scaleBump=null;
function dragonScaleBump(){
 if(scaleBump)return scaleBump;
 const n=32,d=new Uint8Array(n*n*4);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  // rows of scales, every other row shifted half a scale: each is a dome, sharp where the next one overlaps it
  const row=Math.floor(j/8),u=((i+(row%2)*4)%8)/8-.5,v=(j%8)/8,h=Math.max(0,1-Math.hypot(u*1.6,v-.35)*1.7)*(1-v*.5),k=(i+j*n)*4;
  d[k]=d[k+1]=d[k+2]=Math.round(255*Math.min(1,h));d[k+3]=255;
 }
 scaleBump=new THREE.DataTexture(d,n,n);scaleBump.wrapS=scaleBump.wrapT=THREE.RepeatWrapping;scaleBump.repeat.set(2,2);scaleBump.needsUpdate=true;
 return scaleBump;
}
const dragonHides=new Map();
function dragonHide(hex,opts){const key=hex+JSON.stringify(opts);if(!dragonHides.has(key))dragonHides.set(key,new THREE.MeshStandardMaterial({color:hex,roughness:.88,...opts,bumpMap:dragonScaleBump(),bumpScale:1.4}));return dragonHides.get(key);}
function dragonMats(i,chromatic){
 const silver=i===14,hex=silver?'#b9c4c8':NH_COLORS[i]||'#8a6440',breath=DRAGON_BREATH[i]||'#ff8a3a';
 const belly='#'+new THREE.Color(hex).lerp(new THREE.Color('#e8d6a4'),.45).getHexString();
 const fin=HIDE_FINISH[dragonElement(i)]||{},hideOpts={roughness:fin.roughness??(silver?.3:.62),metalness:fin.metalness??(silver?.7:.08)};
 if(fin.emissiveK)Object.assign(hideOpts,{emissive:shade(breath,fin.emissiveK*4),emissiveIntensity:.25});
 const scales=chromatic?TIAMAT_HEADS.map(c=>dragonHide(shade(NH_COLORS[c],.8),hideOpts)):null;
 return {scales,hide:dragonHide(hex,hideOpts),dark:mat(shade(hex,.5),{roughness:.7,metalness:silver?.6:0}),belly:mat(belly,{roughness:.78}),
  membrane:mat(shade(hex,.72),{side:THREE.DoubleSide,roughness:.82}),feather:mat(belly,{side:THREE.DoubleSide,roughness:.9}),ivory:mat('#e6dcc0',{roughness:.45}),scar:mat('#3a0e0c',{roughness:.9}),
  glow:new THREE.MeshStandardMaterial({color:breath,emissive:breath,emissiveIntensity:4.5,roughness:.3})};
}
// a chain of scale-covered segments along a curve, each stretched along the curve, with a paler belly.
// The segments overlap heavily, so a low-poly sphere is enough and keeps a dragon near 15k vertices.
const DRAGON_SEGMENT=new THREE.SphereGeometry(1,10,8);
function dragonSegment(parent,r,material,p,q,sx,sy,sz){const mesh=part(parent,DRAGON_SEGMENT,material,p.x,p.y,p.z);mesh.quaternion.copy(q);mesh.scale.set(r*sx,r*sy,r*sz);return mesh;}
// small rounded boxes with a single bevel step; the default three-step bevel costs 1.7k vertices each
function dragonBox(parent,w,h,d,material,x=0,y=0,z=0,r=.02){return part(parent,new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/2,h/2,d/2)*.9),material,x,y,z);}
const DRAGON_SCUTE=new THREE.BoxGeometry(.1,.012,.07);
function dragonChain(parent,curve,n,r0,r1,m){
 const Z=new THREE.Vector3(0,0,1);
 for(let i=0;i<=n;i++){const t=i/n,p=curve.getPoint(t),r=r0+(r1-r0)*t,q=new THREE.Quaternion().setFromUnitVectors(Z,curve.getTangent(t).negate());
  dragonSegment(parent,r,m.scales?m.scales[Math.min(4,Math.floor(t*5))]:m.hide,p,q,1,.9,1.3);dragonSegment(parent,r*.8,m.belly,p.clone().setY(p.y-r*.32),q,1.08,.7,1.3);}
}
// dorsal spikes riding the top of a chain, shrinking toward its end
function dragonRidge(parent,curve,n,r0,r1,size,material,t0=0,t1=1){
 for(let i=0;i<n;i++){const t=t0+(t1-t0)*(i+.5)/n,p=curve.getPoint(t),r=r0+(r1-r0)*t,s=size*(1-.55*t);const spike=cone(parent,s*.42,s,material,p.x,p.y+r*.8,p.z,4);spike.rotation.x=-.55;}
}
function dragonHead(head,m,f,baby){
 if(f.cat){
  // tatzelworm: a round cat face with a short muzzle, tufted ears and whiskers
  sphere(head,.12,m.hide,0,0,0,1.05,.9,.95);sphere(head,.065,m.belly,0,-.035,.09,1.15,.75,.75);sphere(head,.018,nose,0,-.01,.14);
  for(const s of [-1,1]){const ear=cone(head,.045,.11,m.hide,s*.075,.1,-.01,4);ear.rotation.z=-s*.3;cone(head,.012,.05,m.dark,s*.09,.17,-.01,3).rotation.z=-s*.3;
   for(const k of [-1,0,1])tube(head,[[s*.03,-.035,.13],[s*.12,-.035+k*.012,.14],[s*.2,-.04+k*.028,.12]],.002,m.ivory,4);}
  const mouth=sphere(head,.03,m.glow,0,-.065,.1,1.3,.45,.8);eyes(head,m.glow,.03,.1,.055);return mouth;
 }
 sphere(head,.12,m.hide,0,0,0,.95,.82,1.05);
 dragonBox(head,.13,.07,.2,m.hide,0,.005,.14,.03);
 const jaw=dragonBox(head,.11,.035,.18,m.belly,0,-.065,.12,.015);jaw.rotation.x=.24;
 // the breath gathers in the open mouth and glows from the nostrils
 const throat=sphere(head,.04,m.glow,0,-.035,.14,1,.55,1.6);
 for(const s of [-1,1]){
  sphere(head,.012,m.glow,s*.03,.04,.24);
  const brow=dragonBox(head,.05,.02,.07,m.dark,s*.055,.075,.07,.008);brow.rotation.z=s*.3;
  for(let i=0;i<3;i++)cone(head,.008,.03,m.ivory,s*.045,-.03,.12+i*.045,4).rotation.x=Math.PI;
  // two long curved fangs hang from the upper jaw past the lower teeth,
  cone(head,.011,.07,m.ivory,s*.055,-.045,.2,4).rotation.x=Math.PI-.15;
  const frill=cone(head,.035,.1,m.dark,s*.11,-.01,-.05,3);frill.rotation.z=-s*1.3;frill.rotation.y=s*.4;
  if(f.sirrush){const horn=cone(head,.018,.22,m.ivory,s*.03,.1,.02,6);horn.rotation.x=-.35;horn.rotation.z=-s*.12;}
  else{
   // the left horn is snapped off short, its stump blunt and splintered
   const len=(baby?.08:.17)*(f.horns||1)*(s<0&&!baby?.55:1),horn=cone(head,s<0&&!baby?.03:.026,len,m.ivory,s*.06,.09,-.07,s<0&&!baby?5:6);horn.rotation.x=-1.1;horn.rotation.z=-s*.25;}
  // two jagged spines sweep back off the cheek
  for(let i=0;i<2;i++){const spine=cone(head,.016-i*.004,.075-i*.02,m.dark,s*(.1-i*.005),-.02-i*.045,-.01-i*.03,4);spine.rotation.set(-1.25,0,-s*.7);}
 }
 // an old slash scars the snout and brow, raked across the scales
 dragonBox(head,.1,.006,.014,m.scar,.04,.048,.16,.002).rotation.y=.6;
 dragonBox(head,.07,.006,.012,m.scar,.05,.058,.12,.002).rotation.y=.45;
 dragonBox(head,.05,.006,.01,m.scar,.03,.052,.2,.002).rotation.y=.8;
 if(f.sirrush)tube(head,[[0,-.05,.2],[0,-.07,.28],[.015,-.075,.33]],.005,mat('#b03040'),5);
 if(f.beard)for(let i=0;i<5;i++)cone(head,.014,.09,m.dark,(i-2)*.018,-.1,.1-Math.abs(i-2)*.02,4).rotation.x=Math.PI+.3;
 eyes(head,m.glow,.045,.085,.066);
 return throat;
}
function dragonWing(parent,side,span,m,feathered){
 const pivot=new THREE.Group();parent.add(pivot);pivot.userData.side=side;
 const inner=new THREE.Group();inner.rotation.set(-.25,side*.55,-side*.15);pivot.add(inner);
 const s=side*span,elbow=[s*.22,.3*span],tip=[s*.6,.46*span],fingers=[[s*.56,.16*span],[s*.42,.02*span],[s*.24,-.06*span],[0,-.02*span]];
 pivot.userData.inner=inner;inner.userData.edge=[[0,0],elbow,tip];
 // leading edge out to the tip, then a scalloped trailing edge between the finger bones
 const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(...elbow);shape.lineTo(...tip);
 let prev=tip;for(const q of fingers){const mx=(prev[0]+q[0])/2,my=(prev[1]+q[1])/2;shape.quadraticCurveTo(mx+(elbow[0]-mx)*.28,my+(elbow[1]-my)*.28,...q);prev=q;}
 // torn holes between the finger bones: a dragon's membrane is old, scarred and ragged (feathered wings are spared)
 if(!feathered)for(const [hx,hy,hr,ha] of [[.3,.1,.05,.2],[.44,.15,.035,1.1],[.2,.04,.035,2.3]]){const hole=new THREE.Path();for(let k=0;k<3;k++){const an=ha+k*2.1,rr=hr*(k===1?1.5:1);hole[k?'lineTo':'moveTo'](side*(hx+Math.cos(an)*rr)*span,(hy+Math.sin(an)*rr)*span);}hole.closePath();shape.holes.push(hole);}
 part(inner,new THREE.ShapeGeometry(shape,6),feathered?m.feather:m.membrane);
 tube(inner,[[0,0,0],[...elbow,0],[...tip,0]],.014*span,m.dark,8);
 for(const q of fingers.slice(0,3))tube(inner,[[...elbow,0],[(elbow[0]+q[0])/2,(elbow[1]+q[1])/2+.02*span,0],[...q,0]],.007*span,m.dark,6);
 const claw=cone(inner,.014*span,.05*span,m.ivory,elbow[0],elbow[1]+.03*span,0,4);claw.rotation.z=-side*.3;
 // amphiteres have feathered wings: a fringe of long primaries along the trailing edge
 if(feathered)for(let i=0;i<7;i++){const t=i/6,x=tip[0]*(1-t),y=tip[1]*(1-t)-.05*span*Math.sin(t*Math.PI),feather=sphere(inner,.035*span,m.hide,x,y-.03*span,.004,.45,1.6,.25);feather.rotation.z=side*(.2+t*.6);}
 return pivot;
}
function dragonLegs(body,legs,m,o){
 for(const [x,y,z,hind] of o.spots){
  const leg=new THREE.Group();leg.position.set(x,y,z);body.add(leg);const k=o.thick||1;
  sphere(leg,.08*k,m.hide,0,-.02,0,.9,1.3,1.1);dragonBox(leg,.075*k,y-.14,.085*k,m.hide,0,-(y-.1)/2-.04,.02,.03);
  if(o.sirrush&&!hind){sphere(leg,.055,m.hide,0,-y+.04,.05,1,.7,1.2);for(const cx of [-.025,0,.025])cone(leg,.008,.025,m.ivory,cx,-y+.03,.1,4).rotation.x=Math.PI/2;}
  else{dragonBox(leg,.1*k,.04,.12,m.dark,0,-y+.02,.05,.015);for(const cx of [-.035,0,.035])cone(leg,.012,(o.sirrush?.07:.045)*k,m.ivory,cx*k,-y+.02,.12+(o.sirrush?.02:0),4).rotation.x=Math.PI/2;
   if(o.sirrush){const spur=cone(leg,.01,.05,m.ivory,0,-y+.02,-.02,4);spur.rotation.x=-Math.PI/2;}}
  legs.push(leg);
 }
}
function dragon(o={}){
 const f=o.form||DRAGON_FORMS.draken,baby=!!o.baby;
 const g=new THREE.Group(),body=new THREE.Group(),legs=[],wings=[];g.add(body);g.scale.setScalar((baby?.62:1.05)*(f.scale||1));
 const m=dragonMats(o.color??3,f.chromatic),headScale=(baby?1.3:1)*(f.heads>1?.8:1);
 let core=null,tail,tailCurve,trunk;const dressHeads=[];
 const addHead=(parent,points,mats,a=0)=>{
  const neck=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));dragonChain(parent,neck,6,.085,.065,mats);dragonRidge(parent,neck,4,.08,.065,baby?.04:.07,mats.dark,.1,.9);
  const end=points[points.length-1],head=new THREE.Group();head.position.set(end[0],end[1]+.04,end[2]+.06);head.rotation.y=a*.5;head.rotation.x=.12;head.scale.setScalar(headScale);parent.add(head);
  const throat=dragonHead(head,mats,f,baby);core=core||throat;dressHeads.push({head,m:mats,cat:!!f.cat});
 };
 if(f.serpent){
  // serpents: the body lies in a coil (or rolls up in humps, for leviathans) and rears up at the front
  const pts=f.serpent==='humps'?[[0,.42,.26],[0,.24,.14],[0,.12,.02],[0,.24,-.12],[0,.12,-.26],[0,.14,-.36]]
   :f.serpent==='short'?[[0,.34,.22],[0,.2,.1],[.06,.14,-.04],[.02,.13,-.16]]
   :[[0,.42,.24],[0,.24,.12],[.14,.13,-.02],[.06,.11,-.2],[-.14,.1,-.3]];
  for(const p of pts)p[1]+=.03;
  const spine=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
  dragonChain(body,spine,f.serpent==='short'?8:12,f.serpent==='short'?.14:.12,.09,m);trunk=serpentTrunk(body,{curve:spine,r0:f.serpent==='short'?.14:.12,r1:.09});dragonRidge(body,spine,f.serpent==='short'?5:9,.12,.09,baby?.04:.08,m.dark,.05,.95);
  const top=pts[0];addHead(body,[[top[0],top[1]-.04,top[2]-.04],[top[0],top[1]+.08,top[2]+.04],[top[0],top[1]+.14,top[2]+.1]],m);
  if(f.legs)dragonLegs(body,legs,m,{spots:[[-.13,.2,.14],[.13,.2,.14]],thick:.9});
  if(f.wings)for(const side of [-1,1]){const w=dragonWing(body,side,f.wings*(baby?.6:1),m,f.feathered);w.position.set(side*.08,.4,.2);wings.push(w);}
  if(f.fins){
   // leviathan: a finned sail along the humps and broad paddle fins at the front
   const sail=new THREE.Shape(),n=9;sail.moveTo(-pts[1][2],pts[1][1]);
   for(let i=0;i<=n;i++){const t=.18+.62*i/n,p=spine.getPoint(t);sail.lineTo(-p.z-.015,p.y+.1+(i%2?.02:.07));sail.lineTo(-p.z+.015,p.y+.08);}
   for(let i=n;i>=0;i--){const p=spine.getPoint(.18+.62*i/n);sail.lineTo(-p.z,p.y);}
   const fin=part(body,new THREE.ShapeGeometry(sail),m.membrane);fin.rotation.y=Math.PI/2;
   for(const side of [-1,1]){const paddle=new THREE.Shape();paddle.moveTo(0,0);paddle.quadraticCurveTo(side*.12,.06,side*.22,-.02);paddle.quadraticCurveTo(side*.12,-.05,0,-.04);const p=part(body,new THREE.ShapeGeometry(paddle,6),m.membrane,side*.1,.2,.12);p.rotation.x=-Math.PI/2+.3;p.rotation.y=-side*.4;}
  }
  const last=pts[pts.length-1];tail=new THREE.Group();tail.position.set(...last);body.add(tail);
  const curve=new THREE.CatmullRomCurve3([[0,0,0],[last[0]>0?-.1:.1,-.02,-.12],[last[0]>0?-.2:.22,-.04,-.14],[last[0]>0?-.28:.3,-.05,-.06]].map(p=>new THREE.Vector3(...p)));
  dragonChain(tail,curve,8,.085,.025,m);tailCurve=curve;
  if(f.fins){const fluke=cone(tail,.06,.1,m.membrane,curve.getPoint(1).x,-.05,-.04,3);fluke.scale.set(1.6,1,.3);fluke.rotation.z=Math.PI/2;}
 }else{
  // four-legged dragons stand square; wyverns rear up on two legs and wings; sirrush are lean and long-necked
  const lean=f.sirrush?.82:1;
  const torso=sphere(body,.26,m.hide,0,.46,0,1.1*lean,.85,1.45);const under=sphere(body,.22,m.belly,0,.38,.03,1.02*lean,.6,1.35);
  if(f.legs===2){torso.rotation.x=under.rotation.x=-.3;}
  // three claw rakes score the left flank, the old wounds of a long life of killing
  for(let i=0;i<3;i++){const rake=dragonBox(body,.012,.2,.02,m.scar,-.27+i*.0,.5-i*.0,.0,.004);rake.position.set(-.275+i*.0,.5,-.08+i*.055);rake.rotation.set(0,0,.35);rake.scale.set(1,1-i*.12,1);}
  // overlapping armour scutes crust the back and flanks: dark, sharp-edged plates over the hide
  {const geos=[];for(let i=0;i<5;i++)for(const s of [-1,0,1]){const plate=new THREE.Mesh(DRAGON_SCUTE);plate.position.set(s*.13,.7-Math.abs(s)*.1,.3-i*.15);plate.scale.set(1-Math.abs(s)*.2,1,1);plate.rotation.set(-.2,0,s*.55);plate.updateMatrix();geos.push(DRAGON_SCUTE.clone().applyMatrix4(plate.matrix));}
   part(body,mergeGeometries(geos),m.dark);geos.forEach(g=>g.dispose());}
  trunk=torsoTrunk(body,{center:torso.position,radii:[.26*1.1*lean,.26*.85,.26*1.45],tilt:torso.rotation.x});
  const spine=new THREE.CatmullRomCurve3([[0,.63,.28],[0,.68,0],[0,.6,-.3]].map(p=>new THREE.Vector3(...p)));
  dragonRidge(body,spine,6,.02,.02,baby?.05:.1,m.dark);
  const heads=o.heads||Array(f.heads||1).fill(null);
  heads.forEach((hi,k)=>{const a=(k-(heads.length-1)/2)*.5,x=Math.sin(a)*.3,lift=f.sirrush?.12:f.legs===2?.08:0,mats=hi===null?m:dragonMats(hi);
   addHead(body,[[x*.2,.55,.26],[x*.6,.72+lift*.5,.36],[x,.86+lift,.44-Math.abs(x)*.25]],mats,a);});
  const hindY=f.legs===2?.38:.34;
  dragonLegs(body,legs,m,{spots:f.legs===2?[[-.17,hindY,-.1,1],[.17,hindY,-.1,1]]:[[-.2,.34,.2,0],[.2,.34,.2,0],[-.21,.34,-.2,1],[.21,.34,-.2,1]],thick:f.legs===2?1.25:1,sirrush:f.sirrush});
  if(f.wings)for(const side of [-1,1]){const w=dragonWing(body,side,f.wings*(baby?.6:1),m,false);w.position.set(side*.14,.64,.08);wings.push(w);}
  tail=new THREE.Group();tail.position.set(0,.44,-.34);body.add(tail);
  const tip=f.sirrush?[[0,0,0],[0,-.1,-.15],[.06,-.19,-.28],[.1,-.1,-.39],[.1,.05,-.39]]:[[0,0,0],[0,-.1,-.16],[.1,-.19,-.3],[.19,-.25,-.4]];
  const curve=new THREE.CatmullRomCurve3(tip.map(p=>new THREE.Vector3(...p)));
  dragonChain(tail,curve,10,.1,.03,m);tailCurve=curve;dragonRidge(tail,curve,6,.1,.03,baby?.04:.07,m.dark,.05,.9);
  const end=curve.getPoint(1),dir=curve.getTangent(1);
  // an arrowhead spade on the tail tip; a sirrush curls a scorpion's sting over its back instead
  const barb=cone(tail,f.sirrush?.025:.06,f.sirrush?.09:.12,f.sirrush?m.ivory:m.dark,end.x+dir.x*.04,end.y+dir.y*.04,end.z+dir.z*.04,f.sirrush?5:4);barb.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);if(!f.sirrush)barb.scale.set(1,1,.3);
  // a wyvern's tail ends in a venom stinger: a long ivory hook past the spade, bent upward, with a dark gland at its root
  if(f.sting){const hook=cone(tail,.03,.2,m.ivory,end.x+dir.x*.14,end.y+dir.y*.14+.03,end.z+dir.z*.14,5);hook.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(dir.x,dir.y+.7,dir.z).normalize());sphere(tail,.045,m.dark,end.x+dir.x*.07,end.y+dir.y*.07,end.z+dir.z*.07,1,.8,1.3);}
 }
 const element=dragonElement(o.color??3);
 if(element)dressDragon({element,m,trunk,heads:dressHeads,tail,tailCurve,wings:wings.map(w=>({inner:w.userData.inner,edge:w.userData.inner.userData.edge})),baby});
 g.userData.core=core;
 return trimDraws(Object.assign(actor(g,body,legs,tail,wings,'dragon'),{core,element,heads:dressHeads.map(h=>h.head)}));
}
// The plain rat's neck pivot, where its head handle turns (body space).
export const RAT_NECK=[0,.28,.24];
function rat(giant=false,rabid=false){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(giant?1.25:.85);
 sphere(body,.22,M.graySkin,0,.24,-.04,1,.85,1.45);
 sphere(body,.16,M.leather,0,.28,.2,.85,.8,1.2);
 // the head turns about the neck; an inner group undoes the pivot so the parts keep their places
 const head=new THREE.Group(),face=new THREE.Group();head.position.set(...RAT_NECK);face.position.set(-RAT_NECK[0],-RAT_NECK[1],-RAT_NECK[2]);body.add(head);head.add(face);
 sphere(face,.09,M.graySkin,0,.24,.35,.85,.7,1.25);
 sphere(face,.035,M.skin,0,.25,.445,1,.7,.65);
 for(const side of [-1,1]){
  sphere(face,.095,M.graySkin,side*.115,.405,.17,1,1,.38);
  sphere(face,.065,M.skin,side*.115,.41,.201,1,1,.18);
  sphere(face,.023,rabid?M.fire:M.leather,side*.101,.31,.3);
  sphere(face,.009,M.whiteFur,side*.106,.319,.316);
  rounded(face,.024,.05,.022,M.whiteFur,side*.018,.192,.416,.006);
  for(const offset of [-1,0,1]){
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.06,.24,.37),new THREE.Vector3(side*.17,.25+offset*.02,.38),new THREE.Vector3(side*.26,.25+offset*.03,.36+offset*.04)]);
   part(face,new THREE.TubeGeometry(curve,5,.003,3,false),M.whiteFur);
  }
  for(const z of [-.19,.17]){const leg=new THREE.Group();leg.position.set(side*.15,.13,z);body.add(leg);sphere(leg,.065,M.graySkin,0,-.02,0,.7,1,.9);rounded(leg,.075,.035,.12,M.skin,0,-.09,.04,.012);legs.push(leg);}
 }
 const tail=new THREE.Group();tail.position.set(0,.22,-.31);body.add(tail);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(.08,-.12,-.16),new THREE.Vector3(.25,-.17,-.28),new THREE.Vector3(.33,-.16,-.46)]);
 for(let i=0;i<14;i++){const start=curve.getPoint(i/14),end=curve.getPoint((i+1)/14),direction=end.clone().sub(start),radius=.027*(1-i/15);const segment=part(tail,new THREE.CylinderGeometry(radius*.86,radius,direction.length(),8),i%2?M.skin:M.beard);segment.position.copy(start.add(end).multiplyScalar(.5));segment.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}
 // rabid rats: flecks of froth at the jaw and hackles of mangy fur raised along the spine
 if(rabid){const froth=mat('#f2f0e6',{roughness:.35});for(const [x,y,z,r] of [[0,.19,.43,.022],[-.03,.18,.41,.017],[.035,.185,.415,.015],[.012,.16,.42,.012]])sphere(face,r,froth,x,y,z);
  const mange=mat('#5e564c',{roughness:1});for(let i=0;i<7;i++){const spike=cone(body,.024,.09,mange,(i%2?.025:-.025),.43-Math.abs(i-2)*.018,.14-i*.07,4);spike.rotation.x=-.5;}}
 return Object.assign(actor(g,body,legs,tail,[],'rat'),{head});
}
// Rock moles: a squat velvet-grey digger with no ear flaps, pin-prick eyes, a bare scarred mauve
// snout and oversized spade forepaws tipped with pale claws. Chewed pebbles cling to its coat.
function rockMole(){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(.9);
 const coat=mat('#5b5a60',{roughness:1}),pink=mat('#7a5650',{roughness:.8}),claw=mat('#b5a98c',{roughness:.5}),pebble=mat('#8a8274',{roughness:.95});
 sphere(body,.24,coat,0,.22,-.02,1.05,.78,1.3);
 const head=new THREE.Group();head.position.set(0,.22,.27);body.add(head);
 sphere(head,.13,coat,0,0,0,.95,.82,1.05);
 const snout=cylinder(head,.028,.06,.14,pink,0,-.015,.15,10);snout.rotation.x=Math.PI/2;
 sphere(head,.034,pink,0,-.015,.225,1,.8,.6);
 for(const side of [-1,1]){sphere(head,.012,darkEye,side*.07,.045,.085);sphere(head,.005,nose,side*.013,-.012,.24);}
 for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2;const whisker=part(head,new THREE.CylinderGeometry(.002,.002,.12,3),M.whiteFur,Math.cos(a)*.05,-.015+Math.sin(a)*.02,.2);whisker.rotation.z=Math.PI/2+Math.sin(a)*.5;whisker.rotation.y=Math.cos(a)*.3;}
 for(const side of [-1,1]){
  // front legs: a short upper limb ending in a broad, outward-turned spade with five claws
  const fore=new THREE.Group();fore.position.set(side*.17,.17,.16);body.add(fore);
  sphere(fore,.06,coat,0,-.03,0,.8,1,.9);
  const palm=sphere(fore,.075,pink,side*.04,-.11,.05,1.1,.35,1);palm.rotation.z=side*.5;
  for(let i=0;i<5;i++){const c=cone(fore,.012,.07,claw,side*.04+(i-2)*.028,-.13,.12,4);c.rotation.x=Math.PI/2+.25;}
  legs.push(fore);
  const hind=new THREE.Group();hind.position.set(side*.14,.14,-.19);body.add(hind);
  sphere(hind,.065,coat,0,-.03,0,.8,1,.9);rounded(hind,.07,.03,.11,pink,0,-.11,.03,.012);legs.push(hind);
 }
 for(const [x,y,z,r] of [[.12,.36,-.08,.028],[-.09,.39,.02,.022],[.02,.37,-.2,.03],[-.16,.3,-.12,.02]])sphere(body,r,pebble,x,y,z,1,.7,1);
 const tail=new THREE.Group();tail.position.set(0,.2,-.3);body.add(tail);
 const stub=cone(tail,.028,.1,pink,0,-.01,-.04,6);stub.rotation.x=-Math.PI/2-.3;
 return actor(g,body,legs,tail,[],'rat');
}
// Woodchucks: a chubby brown groundhog on its haunches, with a grizzled back, cream muzzle,
// small round ears, big orange incisors and a short bushy tail.
function woodchuck(){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);
 const coat=mat('#7a5836',{roughness:.96}),grizzle=mat('#a88a64',{roughness:1}),cream=mat('#d8c4a0',{roughness:.95}),dark=mat('#3e2c1e',{roughness:.95}),tooth=mat('#e3a24a',{roughness:.4});
 const torso=sphere(body,.25,coat,0,.3,-.04,1,1.05,1.15);torso.rotation.x=-.35;
 sphere(body,.17,cream,0,.3,.12,.9,1.05,.6);
 for(const [x,y,z] of [[0,.46,-.1],[.09,.4,-.2],[-.09,.4,-.2],[0,.34,-.26]])sphere(body,.08,grizzle,x,y,z,1.1,.5,1.1);
 const head=new THREE.Group();head.position.set(0,.55,.12);body.add(head);
 sphere(head,.14,coat,0,0,0,1.05,.9,1);
 sphere(head,.08,cream,0,-.04,.1,1.1,.8,.8);
 sphere(head,.025,nose,0,-.01,.175,1.2,.8,.8);
 for(const side of [-1,1]){rounded(head,.022,.045,.012,tooth,side*.012,-.1,.145,.004);sphere(head,.02,darkEye,side*.075,.035,.105);sphere(head,.042,dark,side*.1,.11,-.02,1,1,.45);sphere(head,.022,cream,side*.1,.11,-.004,1,1,.2);}
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.12,.4,.17);body.add(arm);
  rounded(arm,.06,.14,.06,coat,0,-.06,.02,.025);sphere(arm,.035,dark,0,-.14,.04,1,.7,1.1);legs.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.16,.14,-.02);body.add(leg);
  sphere(leg,.1,coat,0,0,0,.8,1,1.1);rounded(leg,.08,.04,.14,dark,0,-.11,.07,.015);legs.push(leg);
 }
 const tail=new THREE.Group();tail.position.set(0,.14,-.3);body.add(tail);
 const brush=sphere(tail,.06,dark,0,-.02,-.08,.8,.7,1.6);brush.rotation.x=.4;
 return actor(g,body,legs,tail,[],'rat');
}
// ---- Class-based bestiary: every common monster letter gets its own silhouette ----

const cache=new Map();
function mat(color,options={}){const key=color+JSON.stringify(options);if(!cache.has(key))cache.set(key,new THREE.MeshStandardMaterial({color,roughness:.88,...options}));return cache.get(key);}
// NetHack's 16 terminal colours, pulled toward natural pigments so tints don't look neon.
const NH_COLORS=['#34343c','#a83b2e','#4f8a3a','#8a6440','#3d5fb0','#8a3f8f','#3f9a9a','#8f8f88',null,'#d9782e','#7fbf4f','#d6ac3a','#5f8fe0','#b85cbf','#6fd0d0','#e2ded2'];
function nhColor(cell){return Number.isInteger(cell.color)?NH_COLORS[cell.color]??null:null;}
function shade(hex,k){return '#'+new THREE.Color(hex).multiplyScalar(k).getHexString();}
const nose=mat('#1b1716',{roughness:.5}),darkEye=mat('#0e0c0b',{roughness:.2,metalness:.2});

function tube(parent,points,radius,material,segments=16){return part(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,radius,8,false),material);}

// A tube that narrows to a point at its start: ring vertices are pulled in toward the centreline by taper(t),
// t running 0..1 along the curve. Snakes and nagas use it so the tail ends in a point, not a blunt stump.
const tailTaper=t=>{const k=Math.min(1,t/.6);return .1+.9*k*k*(3-2*k);};
function pointedTailTube(parent,points,radius,material,segments=16,taper=tailTaper){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),geo=new THREE.TubeGeometry(curve,segments,radius,8,false);
 const pos=geo.attributes.position,ring=9,c=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<=segments;i++){curve.getPointAt(i/segments,c);const k=taper(i/segments);
  for(let j=0;j<ring;j++){const n=i*ring+j;v.fromBufferAttribute(pos,n).sub(c).multiplyScalar(k).add(c);pos.setXYZ(n,v.x,v.y,v.z);}}
 geo.computeVertexNormals();return part(parent,geo,material);
}

// Pet dogs are in canine.js, with the wild dogs.

// Cats are in feline.js.

// Newts, geckos, iguanas, lizards, crocodiles: low splayed body and a long tapering tail.
function lizard(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.skin),belly=mat(o.belly||shade(o.skin,1.3)),spot=mat(o.spot||shade(o.skin,.45));
 sphere(body,.12,skin,0,.13,0,.95,.5,1.9);sphere(body,.08,belly,0,.09,.02,.9,.35,1.7);
 const head=new THREE.Group();head.position.set(0,.14,.27);body.add(head);
 rounded(head,.15,.07,.17,skin,0,0,.03,.03);for(const side of [-1,1])sphere(head,.028,darkEye,side*.065,.04,.02);
 for(let i=0;i<4;i++)sphere(body,.03,spot,((i*37)%3-1)*.04,.19,-.12+i*.08,1,.35,1.2);
 for(const side of [-1,1])for(const z of [-.12,.13]){const leg=new THREE.Group();leg.position.set(side*.1,.13,z);body.add(leg);const upper=rounded(leg,.13,.035,.04,skin,side*.07,-.03,0,.012);upper.rotation.z=side*-.5;rounded(leg,.05,.02,.07,skin,side*.13,-.1,.02,.008);legs.push(leg);}
 const tail=new THREE.Group();tail.position.set(0,.13,-.2);body.add(tail);
 let px=0,pz=0;for(let i=0;i<6;i++){const r=.055*(1-i/7),len=.09;const seg=cylinder(tail,r*.8,r,len,skin,px,-.012*i,pz-len/2,8);seg.rotation.x=Math.PI/2;px+=Math.sin(i*.6)*.012;pz-=len*.95;}
 // Basilisks: a ridge of black spines down the back, and eyes that burn sickly yellow-green (the petrifying gaze).
 if(o.gaze){
  const spine=mat('#1a1a14',{roughness:1,flatShading:true}),eye=mat(o.gaze,{emissive:o.gaze,emissiveIntensity:3,roughness:.3});
  for(let i=0;i<5;i++)cone(body,.022-i*.002,.09,spine,0,.2,.16-i*.08,5);
  for(const side of [-1,1])sphere(head,.03,eye,side*.066,.045,.04);
 }
 // Salamanders burn like hell hounds: tongues of flame (tagged part 'flame', so flame-flicker.js
 // flickers and lights them) licking along the spine, on the brow and from the tail's tip.
 if(o.fire){
  [[.14,.8],[.04,1],[-.06,.9]].forEach(([z,sc],i)=>hellfire(body,(i%2?.02:-.02),.2,z,sc*.6,-.5,(i%2?-1:1)*.15));
  hellfire(head,0,.07,-.02,.45,-.7);
  hellfire(tail,px,-.012*5,pz+.05,.6,.3);
 }
 return actor(g,body,legs,tail,[],'lizard');
}
const LIZARDS={newt:{skin:'#d69a38',belly:'#e9763a',spot:'#5a3a1a',scale:.8},gecko:{skin:'#6f9a45',scale:.8},iguana:{skin:'#7a6a42',scale:1},'baby crocodile':{skin:'#5f6a3a',scale:1},lizard:{skin:'#4f8a3a',scale:1},chameleon:{skin:'#6aa08a',scale:1},crocodile:{skin:'#4f5a32',scale:1.6},salamander:{skin:'#d9582a',belly:'#ffb040',scale:1.4,fire:true},basilisk:{skin:'#3a3a28',belly:'#6a5c2a',spot:'#8a8a20',scale:1.5,gaze:'#d8ff30'}};

// Cockatrices: a rooster head (comb, wattle, beak) on the same low scaled body and
// tapering tail as lizard() — reads as "petrifying bird-lizard", not another lizard.
function cockatrice(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.skin),belly=mat(o.belly||shade(o.skin,1.3)),comb=mat(o.comb),foot=mat(o.beak);
 sphere(body,.12,skin,0,.15,0,.95,.55,1.75);sphere(body,.08,belly,0,.11,.02,.9,.4,1.6);
 const head=new THREE.Group();head.position.set(0,.2,.26);body.add(head);
 sphere(head,.09,skin,0,0,0,1,.95,1.05);
 const beak=cone(head,.045,.12,foot,0,-.02,.11,5);beak.rotation.x=Math.PI/2;
 for(let i=0;i<3;i++){const wave=cone(head,.02,.1-i*.018,comb,(i-1)*.035,.1,-.02+i*.012,4);wave.rotation.z=(i-1)*.3;}
 sphere(head,.022,comb,0,-.09,.09,1,1.3,.8);
 for(const side of [-1,1])sphere(head,.018,darkEye,side*.06,.02,.06);
 for(const side of [-1,1])for(const z of [-.12,.13]){const leg=new THREE.Group();leg.position.set(side*.1,.15,z);body.add(leg);const upper=rounded(leg,.13,.035,.04,skin,side*.07,-.03,0,.012);upper.rotation.z=side*-.5;rounded(leg,.05,.02,.08,foot,side*.13,-.11,.02,.008);legs.push(leg);}
 const wingParts=[];for(const side of [-1,1]){const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(side*.17,.06);shape.lineTo(side*.15,-.05);shape.lineTo(0,-.02);const wing=part(body,new THREE.ShapeGeometry(shape),skin,side*.1,.2,-.02);wing.rotation.y=side*.35;wing.userData.side=side;wingParts.push(wing);}
 const tail=new THREE.Group();tail.position.set(0,.15,-.2);body.add(tail);
 let px=0,pz=0;for(let i=0;i<6;i++){const r=.05*(1-i/7),len=.09;const seg=cylinder(tail,r*.8,r,len,skin,px,-.012*i,pz-len/2,8);seg.rotation.x=Math.PI/2;px+=Math.sin(i*.6)*.012;pz-=len*.95;}
 for(let i=0;i<3;i++){const plume=cone(tail,.025,.1,comb,0,-.06-i*.02,pz-.03-i*.05,4);plume.rotation.x=1.7;}
 return {...actor(g,body,legs,tail,[],'cockatrice'),head,wingParts};
}
const COCKATRICES={chickatrice:{skin:'#8a6a3a',comb:'#a8382a',beak:'#d99a3a',scale:.65},cockatrice:{skin:'#c9a83a',comb:'#c8262a',beak:'#e0b23a',scale:1.1},pyrolisk:{skin:'#c96a2a',comb:'#e8401a',beak:'#ffae3a',scale:.9}};

// Other F: a stationary mound. Lichens are in lichen.js, molds in mold.js, shriekers and violet fungi in mushroom.js.
function fungus(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const main=mat(o.color,{roughness:.95}),dark=mat(shade(o.color,.55)),bright=mat(shade(o.color,1.35),{emissive:shade(o.color,.35),emissiveIntensity:.35});
 sphere(body,.24,main,0,.12,0,1,.62,1);
 for(let i=0;i<11;i++){const a=i*2.1,r=.1+(i%3)*.05;sphere(body,.05+(i%4)*.018,i%2?bright:dark,Math.cos(a)*r,.18+((i*7)%3)*.03,Math.sin(a)*r);}
 for(let i=0;i<6;i++){const a=i*1.05;sphere(body,.016,bright,Math.cos(a)*.16,.32+(i%2)*.05,Math.sin(a)*.16);}
 return actor(g,body,[],null,[],'fungus');
}

// Blobs, jellies, puddings: translucent mass with a visible nucleus.
function blob(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const skin=new THREE.MeshStandardMaterial({color:o.color,emissive:o.color,emissiveIntensity:.18,roughness:.15,transparent:true,opacity:.78});
 sphere(body,.28,skin,0,o.flat?.12:.2,0,1,o.flat?.45:.72,1);sphere(body,.09,mat(shade(o.color,.4)),0,o.flat?.12:.2,0,1,.8,1);
 if(o.flat)for(let i=0;i<6;i++){const a=i*Math.PI/3;tube(body,[[Math.cos(a)*.2,.08,Math.sin(a)*.2],[Math.cos(a)*.34,.03,Math.sin(a)*.34],[Math.cos(a)*.4,.01,Math.sin(a)*.4]],.022,skin,8);}
 else for(let i=0;i<5;i++){const a=i*1.3;sphere(body,.07,skin,Math.cos(a)*.24,.07,Math.sin(a)*.24,1,.6,1);}
 // half-digested remains hang in the mass: three bone splinters, so it reads as something that eats
 const bone=mat('#cfc3a4',{roughness:.9}),cy=o.flat?.12:.2;
 for(const [x,z,len,tilt,turn] of [[.1,.05,.2,.5,.4],[-.12,-.04,.15,-.6,2.2],[.02,-.13,.12,.9,4.1]]){const s=cone(body,.014,len,bone,x,cy,z,4);s.rotation.set(tilt,turn,.3);}
 // green slime: it burns and spreads, so it glows sickly, reaches up in hooked tendrils and trails dripping strands
 if(o.slime){
  skin.emissiveIntensity=.42;
  const strand=mat(shade(o.color,.7),{roughness:.1});
  for(const [x,z,h,lean] of [[.12,.06,.34,.16],[-.1,.1,.28,-.14],[.02,-.14,.31,.1]]){tube(body,[[x,.22,z],[x*1.1,.22+h*.6,z*1.1],[x+lean,.22+h,z+lean*.6]],.03,skin,8);sphere(body,.032,strand,x+lean,.22+h,z+lean*.6,1,1.2,1);}
  for(const [x,z,len] of [[.26,.1,.14],[-.24,-.12,.1],[.08,.26,.12],[-.16,.22,.09]])cone(body,.018,len,strand,x,.05+len/2,z,5).rotation.x=Math.PI;
 }
 return actor(g,body,[],null,[],'blob');
}

// Gelatinous cube: unlike the other oozes, this one keeps crisp right angles — a
// near-transparent block with half-digested debris suspended inside.
// The gelatinous cube: a quivering block of murky jelly with what it has eaten hanging inside it,
// three skulls at odd tilts, long bones and a rusted dagger, instead of coloured balls. The remains
// are one merged, vertex-coloured mesh built once and shared: 2 draws.
let cubeRemains=null;
function cubeRemainsGeometry(){
 if(cubeRemains)return cubeRemains;
 const P=pieces(),BONE=rgb('#d8ccaa'),BONE_DARK=rgb('#8a7c5a'),HOLE=rgb('#1a1410'),RUST=rgb('#6a3a1c'),STEEL=rgb('#7a7a74');
 const bone=(x,y,z)=>mix(BONE_DARK,BONE,(y+.06)*6);
 // a skull in its own frame, facing +z: cranium, cheekbones, a hinged jaw hanging a little open,
 // dark eye sockets and nose hole, and a row of teeth
 const skull=m=>{
  const add=(geo,local,c)=>P.add(geo,new THREE.Matrix4().multiplyMatrices(m,local),c);
  add(new THREE.SphereGeometry(.052,14,10),at(0,.012,-.005,[0,0,0],[.9,.95,1.08]),bone);
  add(new THREE.BoxGeometry(.07,.035,.05),at(0,-.022,.022),bone);
  for(const s of [-1,1]){add(new THREE.SphereGeometry(.016,8,6),at(s*.021,.0,.045,[0,0,0],[1,.9,.5]),HOLE);add(new THREE.SphereGeometry(.012,6,4),at(s*.038,-.02,.03),bone);}
  add(new THREE.ConeGeometry(.008,.018,3),at(0,-.022,.048,[Math.PI,0,0]),HOLE);
  add(new THREE.BoxGeometry(.058,.012,.042),at(0,-.056,.018,[.35,0,0]),bone);
  for(let i=0;i<6;i++)add(new THREE.BoxGeometry(.007,.01,.006),at(-.0175+i*.007,-.039,.047),BONE);
 };
 skull(at(-.08,.34,.04,[.3,.7,-.25]));
 skull(at(.1,.18,-.06,[-.5,-1.1,.4]));
 skull(at(-.02,.1,.12,[.9,.2,2.6]));
 // long bones with knobbed ends, adrift at angles
 for(const [x,y,z,r] of [[.08,.36,-.1,[.4,0,1.1]],[-.12,.16,-.08,[1.2,.3,.2]],[.02,.28,.14,[.2,1,1.9]]]){
  const m=at(x,y,z,r),add=(geo,local,c)=>P.add(geo,new THREE.Matrix4().multiplyMatrices(m,local),c);
  add(new THREE.CylinderGeometry(.009,.011,.16,6),at(0,0,0),bone);
  for(const e of [-1,1])for(const s of [-1,1])add(new THREE.SphereGeometry(.014,6,4),at(s*.008,e*.08,0),BONE);
 }
 // a rusted dagger, point down
 {const m=at(.13,.3,.1,[.3,.4,2.7]),add=(geo,local,c)=>P.add(geo,new THREE.Matrix4().multiplyMatrices(m,local),c);
  add(new THREE.CylinderGeometry(.002,.016,.14,4),at(0,.08,0,[0,0,0],[1,1,.25]),(x,y)=>mix(STEEL,RUST,.5+Math.sin(y*90)*.3));
  add(new THREE.BoxGeometry(.06,.01,.014),at(0,.005,0),RUST);add(new THREE.CylinderGeometry(.007,.007,.05,6),at(0,-.025,0),rgb('#3a2414'));}
 // a half-digested iron helm, dented and eaten through on one side, and a ribcage fragment curling out of the jelly
 {const m=at(-.14,.24,-.1,[.5,.3,.9]),add=(geo,local,c)=>P.add(geo,new THREE.Matrix4().multiplyMatrices(m,local),c);
  add(new THREE.SphereGeometry(.058,10,7,0,Math.PI*2,0,Math.PI*.62),at(0,0,0,[0,0,0],[1,.9,1.05]),(x,y)=>mix(RUST,STEEL,.35+Math.sin(y*70)*.25));
  add(new THREE.BoxGeometry(.012,.05,.012),at(0,-.004,.054),RUST);
  add(new THREE.SphereGeometry(.02,6,4),at(.036,.012,.01,[0,0,0],[.8,1,1]),HOLE);}
 {const m=at(.1,.16,.08,[.2,-.6,.3]),add=(geo,local,c)=>P.add(geo,new THREE.Matrix4().multiplyMatrices(m,local),c);
  add(new THREE.CylinderGeometry(.007,.009,.14,5),at(0,0,0),bone);
  for(let i=0;i<4;i++)add(new THREE.TorusGeometry(.05-i*.006,.004,4,8,Math.PI*1.1),at(.012,-.05+i*.032,0,[Math.PI/2,0,.4]),i%2?BONE_DARK:BONE);}
 cubeRemains=P.merge();
 return cubeRemains;
}
let cubeBones=null;
function cube(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const tint=new THREE.Color(o.color).lerp(new THREE.Color('#3a5a2a'),.3);
 const skin=new THREE.MeshStandardMaterial({color:tint,emissive:tint,emissiveIntensity:.1,roughness:.06,transparent:true,opacity:.46,depthWrite:false,side:THREE.DoubleSide});
 rounded(body,.5,.5,.5,skin,0,.25,0,.045);
 cubeBones??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6});
 const remains=part(body,cubeRemainsGeometry(),cubeBones,0,0,0);remains.userData.part='remains';remains.renderOrder=-1;
 return actor(g,body,[],null,[],'cube');
}

// Floating eyes: a big eyeball hovering at head height. Easily the most recognisable shape.
function floatingEye(o){
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group();g.add(body);body.add(lift);lift.position.y=.58;
 sphere(lift,.24,mat('#b8a47a',{roughness:.4}));
 // The iris and pupil sit in their own group pivoting at the eyeball's centre (its `head`), so
 // glance.js can roll the gaze across the ball; the pupil is its own handle so it can dilate.
 const eye=new THREE.Group();lift.add(eye);
 sphere(eye,.115,mat(o.iris||'#2f6ad0',{roughness:.2,emissive:o.iris||'#2f6ad0',emissiveIntensity:.25}),0,0,.2,1,1,.38);
 const pupil=sphere(eye,.05,mat('#050505',{roughness:.1}),0,0,.24,1,1,.35);
 for(let i=0;i<6;i++){const a=i*1.05;tube(lift,[[Math.cos(a)*.12,-.18,Math.sin(a)*.12],[Math.cos(a)*.16,-.32,Math.sin(a)*.16],[Math.cos(a)*.12,-.44,Math.sin(a)*.12]],.012,mat('#b98a7a'),8);}
 for(let i=0;i<5;i++){const a=i*1.3-2.6;const vein=rounded(lift,.006,.12,.006,mat('#b8453a'),Math.sin(a)*.2,Math.cos(a)*.08,.1,.002);vein.rotation.z=a;}
 return {...actor(g,body,[],null,[],'hover'),head:eye,pupil};
}

// Shocking spheres: a metallic orb crackling with jagged spikes of electricity,
// deliberately unlike the floating eye's soft iris-and-tendrils look.
function shockingSphere(){
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group();g.add(body);body.add(lift);lift.position.y=.58;
 const shell=new THREE.MeshStandardMaterial({color:'#3f4d54',metalness:.6,roughness:.3,emissive:'#2a5a68',emissiveIntensity:.6}),arc=new THREE.MeshStandardMaterial({color:'#bdf3ff',emissive:'#4fd2ff',emissiveIntensity:2.2,roughness:.25});
 const core=sphere(lift,.19,shell);
 for(let i=0;i<8;i++){
  const a=i*1.6,el=Math.sin(i*2.3)*.7,dir=new THREE.Vector3(Math.cos(a)*Math.cos(el),Math.sin(el),Math.sin(a)*Math.cos(el));
  const spike=cone(lift,.032,.22+((i*17)%3)*.03,arc,dir.x*.24,dir.y*.24,dir.z*.24,4);spike.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
 }
 sphere(lift,.22,new THREE.MeshStandardMaterial({color:'#4fd2ff',emissive:'#4fd2ff',emissiveIntensity:.5,transparent:true,opacity:.14,depthWrite:false}));
 g.userData.core=core;return Object.assign(actor(g,body,[],null,[],'hover'),{core,orb:lift,sphere:'shock'});
}

// Yellow/black lights: a glowing mote. Explodes when it touches you, so it should glow.
function wisp(o){
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group();g.add(body);body.add(lift);lift.position.y=.55;
 const core=sphere(lift,.12,new THREE.MeshStandardMaterial({color:o.color,emissive:o.color,emissiveIntensity:5,roughness:.2}));
 const halo=sphere(lift,.24,new THREE.MeshStandardMaterial({color:o.color,emissive:o.color,emissiveIntensity:1.2,transparent:true,opacity:.28,depthWrite:false}));
 // the motes circle on their own group so light-flare.js can swirl them
 const ring=new THREE.Group();lift.add(ring);
 for(let i=0;i<6;i++){const a=i*1.05;sphere(ring,.03,core.material,Math.cos(a)*.3,Math.sin(a*2)*.08,Math.sin(a)*.3);}
 g.userData.core=core;return Object.assign(actor(g,body,[],null,[],'hover'),{core,lift,halo,ring,light:o.color==='#4a2a8a'||o.black?'black':'yellow'});
}

// Xan-class flyers (grid bugs keep their own model): a xan is a gangly red stinging fly whose
// hooked tail stinger curls forward under it to lame legs; a chillbug is a squat frost beetle
// with raised wing cases and ice spikes. Each side's wings share one group so the bee flutter pairs up.
const XANS={xan:{color:'#a8322a',eye:'#ffcf40',stinger:true,scale:.95},chillbug:{color:'#4f7fc8',eye:'#c8f0ff',frost:true,scale:1.05}};
function xan(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[],wings=[];g.add(body);g.scale.setScalar(o.scale||1);
 const shell=mat(o.color,{roughness:.4,metalness:.15}),dark=mat(shade(o.color,.35),{roughness:.45}),glow=mat(o.eye,{emissive:o.eye,emissiveIntensity:1.6,roughness:.25}),y=.52;
 const membrane=mat(o.frost?'#d8f0ff':'#f0d8c8',{transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false,roughness:.3});
 const head=sphere(body,.07,dark,0,y+.02,.19,1,.9,.95);
 for(const side of [-1,1])sphere(head,.042,glow,side*.05,.015,.025,.8,1.05,.9);
 if(o.stinger)tube(body,[[0,y-.02,.24],[0,y-.08,.3],[0,y-.15,.31]],.007,dark,6);
 else for(const side of [-1,1]){const mandible=cone(body,.018,.08,mat('#e8f4ff',{roughness:.2}),side*.03,y-.03,.26,5);mandible.rotation.set(Math.PI/2+.3,0,side*.5);}
 for(const side of [-1,1])tube(body,[[side*.025,y+.07,.23],[side*.08,y+.17,.26],[side*.13,y+.2,.34]],.007,dark,8);
 sphere(body,.1,shell,0,y+.02,.06,1,.95,1.1);
 if(o.frost){
  // squat beetle: wide abdomen under raised elytra, frost crystals along the spine
  sphere(body,.16,shell,0,y-.01,-.14,1.05,.75,1.25);
  for(const side of [-1,1]){const elytron=part(body,new THREE.SphereGeometry(.15,14,8,0,Math.PI,0,Math.PI/2),shell,side*.035,y+.03,-.12);elytron.scale.set(.62,.55,1.3);elytron.rotation.set(-.35,side*Math.PI/2,side*.5);}
  const ice=mat('#e2f6ff',{roughness:.08,metalness:.1,emissive:'#6fc8ff',emissiveIntensity:.35,transparent:true,opacity:.85});
  for(let i=0;i<5;i++){const spike=cone(body,.022,.09-Math.abs(i-2)*.012,ice,Math.sin(i*2.1)*.02,y+.11-i*.01,.06-i*.075,5);spike.rotation.x=-.35-i*.12;}
  for(const side of [-1,1])for(const z of [-.08,-.2]){const shard=cone(body,.016,.07,ice,side*.14,y-.02,z,4);shard.rotation.z=-side*1.2;}
 }else{
  // long segmented abdomen that curls down and forward into a hooked stinger
  const pts=[[0,y,-.06],[0,y-.02,-.2],[0,y-.1,-.3],[0,y-.22,-.28],[0,y-.3,-.16],[0,y-.3,-.04]].map(p=>new THREE.Vector3(...p)),curve=new THREE.CatmullRomCurve3(pts);
  for(let i=0;i<9;i++){const t=i/8,p=curve.getPoint(t),r=.075-t*.045;const seg=sphere(body,r,i%2?shell:dark,p.x,p.y,p.z);seg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangent(t));seg.scale.set(1,.8,1);}
  const barb=cone(body,.022,.12,mat('#e8dcc0',{roughness:.3}),0,y-.28,.03,6);barb.rotation.x=Math.PI/2+.5;
 }
 for(const side of [-1,1]){
  const pair=new THREE.Group();pair.position.set(side*.03,y+.1,.05);body.add(pair);pair.rotation.x=-Math.PI/2+.25;
  for(const [len,width,tilt] of [[.34,.11,.15],[.26,.08,-.35]]){const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(side*len*.5,width*1.6,side*len,width*.3);shape.quadraticCurveTo(side*len*.6,-width*.6,0,0);const wing=part(pair,new THREE.ShapeGeometry(shape),membrane);wing.rotation.z=tilt*side;wing.castShadow=false;
   const vein=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,.001),new THREE.Vector3(side*len*.5,width*.9,.001),new THREE.Vector3(side*len*.95,width*.35,.001)]);const veinMesh=part(wing,new THREE.TubeGeometry(vein,8,.0035,4,false),dark);veinMesh.castShadow=false;}
  wings.push(pair);
 }
 // xans trail long dangling barbed legs; chillbugs tuck short ones
 const reach=o.stinger?1:.6;
 for(const side of [-1,1])for(const z of [-.01,.06,.13]){const leg=new THREE.Group();leg.position.set(side*.06,y-.03,z);body.add(leg);const knee=[side*.14*reach,.06,(z-.06)*.8],foot=[side*.2*reach,-.26*reach,(z-.06)*1.6-.05];tube(leg,[[0,0,0],knee,foot],.009,dark,8);if(o.stinger)cone(leg,.012,.04,dark,(knee[0]+foot[0])/2,(knee[1]+foot[1])/2,(knee[2]+foot[2])/2,4).rotation.z=side*1.3;legs.push(leg);}
 return actor(g,body,legs,null,wings,'bee');
}

function centipede(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);
 const shell=mat(o.color,{roughness:.5}),dark=mat(shade(o.color,.4));
 for(let i=0;i<8;i++){const z=.3-i*.085,x=Math.sin(i*.7)*.05;sphere(body,.055-(i>5?(i-5)*.008:0),i%2?shell:mat(shade(o.color,.8)),x,.09,z,1.1,.7,1);for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(x+side*.04,.09,z);body.add(leg);tube(leg,[[0,0,0],[side*.08,.03,0],[side*.13,-.08,.02]],.008,dark,6);legs.push(leg);}}
 for(const side of [-1,1])tube(body,[[side*.02,.12,.34],[side*.08,.2,.44],[side*.14,.2,.5]],.007,dark,6);
 // A flat, armoured head with two hooked venom claws (forcipules) and red pinprick eyes, and two stiff spines at the tail.
 sphere(body,.06,dark,0,.1,.37,1.15,.6,1);
 for(const side of [-1,1]){const fang=tube(body,[[side*.03,.075,.4],[side*.065,.05,.45],[side*.03,.04,.5]],.011,mat('#1c1410',{roughness:.35}),8);fang.castShadow=true;sphere(body,.012,mat('#ff3a1a',{emissive:'#ff2a10',emissiveIntensity:1.6}),side*.035,.12,.41);tube(body,[[side*.015,.09,-.36],[side*.05,.1,-.46],[side*.07,.09,-.54]],.008,dark,6);}
 return actor(g,body,legs,null,[],'insect');
}

// Bats: big scalloped wings and ears. Wings flap in live.js via the 'bat' quirk; bat-jitter.js flits
// the lift group about and takes over the beat.
function bat(o){
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group(),wings=[];g.add(body);body.add(lift);lift.position.y=.62;g.scale.setScalar(o.scale||1);
 const fur=mat(o.color),membrane=mat(shade(o.color,.6),{side:THREE.DoubleSide,roughness:.8});
 sphere(lift,.085,fur,0,0,0,1,1.15,.9);sphere(lift,.065,fur,0,.08,.05);
 for(const side of [-1,1]){const ear=cone(lift,.03,.1,fur,side*.035,.16,.04,4);ear.rotation.z=-side*.3;sphere(lift,.012,mat('#ff5a3a',{emissive:'#ff3a1a',emissiveIntensity:2}),side*.025,.09,.105);
  const shape=new THREE.Shape();shape.moveTo(0,.05);shape.lineTo(side*.2,.14);shape.lineTo(side*.42,.08);shape.quadraticCurveTo(side*.36,-.02,side*.3,-.08);shape.quadraticCurveTo(side*.22,-.02,side*.16,-.1);shape.quadraticCurveTo(side*.08,-.04,0,-.06);
  const pivot=new THREE.Group();pivot.position.set(side*.05,.02,0);lift.add(pivot);part(pivot,new THREE.ShapeGeometry(shape),membrane);pivot.userData.side=side;wings.push(pivot);}
 return {...actor(g,body,[],null,wings,'bat'),batLift:lift,batJitter:o.kind||'bat'};
}

function snake(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.color,{roughness:.55}),belly=mat(o.belly||shade(o.color,1.5)),coil=[];
 for(let i=0;i<=28;i++){const t=i/28,a=t*Math.PI*3.6,r=.24-t*.13;coil.push([Math.cos(a)*r,.005+.045*tailTaper(t)+t*.1,Math.sin(a)*r]);}
 coil.push([0,.3,.06],[0,.42,.14]);
 pointedTailTube(body,coil,.045,skin,64);
 const head=new THREE.Group();head.position.set(0,.44,.18);body.add(head);
 const jaw=snakeHead(head,o);
 const hood=o.hood?cobraHood(head,o):null;
 const tongue=rounded(head,.012,.004,.12,mat('#c0282a'),0,-.01,.12,.002);tongue.rotation.x=.2;
 const a=actor(g,body,[],null,[],'snake');
 a.jaw=jaw;
 if(hood)a.hood=hood;
 return a;
}
// Snake heads. The skull is one vertex-coloured mesh: head shields over a flat crown, a scowling
// brow jutting over each eye, a dark stripe raking back from the eye to the jaw, pale lips, a dark
// palate, nostrils, heat pits on the vipers, slit (or round) pupils, and fangs that hang down past
// the lip outside the narrower lower jaw. The lower jaw is its own mesh on the 'jaw' group, hinged
// under the back of the skull, so jaw.rotation.x>0 gapes the mouth. o.wedge (0..1) swells the jowls
// into a viper's arrowhead; o.fangs is the fang length. 3 draws (skull, eyes, jaw) plus the tongue.
function snakeHead(head,o){
 const wedge=o.wedge??.5,top=rgb(o.color),dark=mix(top,[0,0,0],.6),lip=rgb(o.belly||shade(o.color,1.9)),
  mouth=rgb('#3a1418'),ink=rgb('#07070a'),fang=rgb('#ece4cc'),skull=pieces(),eyes=[];
 // half width, crown height and snout drop along the head at t (0 neck .. 1 snout tip)
 const Z0=-.07,LEN=.155,width=t=>.068*(1+.5*wedge*(.5-t)),crown=t=>.036-.013*t,EYE=[.055,.01,.024];
 // the snout dips toward the tip; the lower jaw follows it
 const drop=z=>.012*Math.max(0,(z-Z0)/LEN)**2;
 const brow=(x,z)=>.007*(.4+.6*wedge)*Math.exp(-((Math.abs(x)-.042)**2)/.00025-((z-EYE[2]+.004)**2)/.0004);
 const g=new THREE.SphereGeometry(1,28,18),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),t=(z+1)/2,X=x*width(t),Z=Z0+t*LEN;
  const Y=y>0?Math.pow(y,.7)*crown(t)+brow(X,Z)*Math.pow(y,.5):y*.014;p.setXYZ(i,X,Y-drop(Z),Z);}
 g.computeVertexNormals();
 skull.add(g,null,(x,Y,z)=>{const t=(z-Z0)/LEN,ax=Math.abs(x),y=Y+drop(z);
  if(y<-.006)return ax<width(t)*.62*Math.sqrt(Math.max(0,1-(2*t-1)**4))?mouth:lip;
  if(y<.002+.004*t)return lip;
  // the eye stripe rakes back and down from behind the eye to the corner of the mouth
  const along=(EYE[2]-z)/.08;if(along>0&&along<1&&Math.abs(y-(EYE[1]-.004-.016*along))<.006&&ax>width(t)*.7)return mix(dark,ink,.5);
  // head shields: big plates on the crown, finer scales down the sides
  const plate=Math.abs(Math.sin(z*90+(ax<.02?0:1.6))*Math.sin(x*70))<.08?.72:1;
  return mix(dark,top,(y/.04)*.6+.45).map(v=>v*plate);});
 for(const side of [-1,1]){
  // nostrils near the snout tip and, on the vipers, a heat pit between nostril and eye
  skull.add(new THREE.SphereGeometry(.0045,6,4),at(side*.016,.008,.078),ink);
  if(o.pits)skull.add(new THREE.SphereGeometry(.006,6,4),at(side*.035,.002,.055,[0,0,0],[.6,1,1]),ink);
  // pupils: a black slit (or a round pupil on the elapids and garter snakes) on the eye's outer face
  const [ex,ey,ez]=EYE;skull.add(new THREE.SphereGeometry(.0105,8,6),at(side*(ex+.0142),ey,ez,[0,0,0],o.round?[.35,1,1]:[.35,1.2,.3]),ink);
  eyes.push(new THREE.SphereGeometry(.0155,12,8).applyMatrix4(at(side*ex,ey,ez)));
  // fangs: curved needles hanging from the front of the upper lip, outside the lower jaw
  if(o.fangs){const len=o.fangs,fz=.058,fx=side*Math.max(.022,width((fz-Z0)/LEN)*.6);
   skull.add(new THREE.ConeGeometry(.0042,len,6),at(fx,-.004-len/2,fz,[Math.PI+.35,0,0]),fang);}}
 const jaw=new THREE.Group();jaw.position.set(0,-.012,-.045);head.add(jaw);
 // the lower jaw: a flat-topped scoop, narrower than the skull, its inside the dark of the mouth
 const jg=new THREE.SphereGeometry(1,20,12),q=jg.attributes.position,J0=-.02,JL=.135;
 for(let i=0;i<q.count;i++){const x=q.getX(i),y=q.getY(i),z=q.getZ(i),t=(z+1)/2;
  const Z=J0+t*JL;q.setXYZ(i,x*width(t*.82+.12)*.78,(y>0?y*.002:y*(.02-.008*t))-drop(Z-.045),Z);}
 jg.computeVertexNormals();
 const jp=pieces();jp.add(jg,null,(x,y,z)=>y+drop(z-.045)>-.0005&&Math.abs(x)<.03*(1-((z-J0)/JL)**3)?mouth:mix(lip,top,Math.max(0,Math.abs(x)/.055-.45)));
 part(jaw,jp.merge(),mat('#ffffff',{vertexColors:true,roughness:.5})).userData.part='jaw';
 part(head,skull.merge(),mat('#ffffff',{vertexColors:true,roughness:.5})).userData.part='skull';
 part(head,mergeGeometries(eyes),mat('#e0b020',{emissive:'#6a4a00',emissiveIntensity:.8,roughness:.25})).userData.part='eyes';
 eyes.forEach(e=>e.dispose());
 return jaw;
}
// The cobra's hood: one vertex-coloured lens of skin that spreads either side of the neck and
// cups forward, its edges thinning to a blade. Long ribs fan out from the spine under the back
// of it, and a pale spectacle mark (two black-eyed rings joined by a hooked band) stares back
// from between them; dark throat bands cross the pale front. It all hangs on the 'hood' group,
// pivoted on the neck, so hood.scale.x folds it flat against the neck (about .3) and spreads it.
function cobraHood(head,o){
 const pivot=new THREE.Group();pivot.position.set(0,-.085,-.1);head.add(pivot);
 const NU=44,NV=40,W=.17,H=.25,y0=-.15,back=new THREE.Color(o.color),pale=new THREE.Color('#e4d6a8'),ink=new THREE.Color('#0b0c10'),
  bellyC=new THREE.Color(o.belly||shade(o.color,1.9)),band=new THREE.Color(shade(o.color,.35)),pos=[],col=[],idx=[],c=new THREE.Color();
 const ribs=[.2,.32,.44,.56,.68,.8];
 // the spectacle: two rings (u ±.4, v .58) joined by a band that dips under them
 const spec=(u,v)=>{const dx=Math.abs(u)-.4,dy=(v-.58)*1.9,r=Math.hypot(dx,dy);
  if(r<.08)return 'ink';if(r<.17)return 'pale';if(r<.23)return 'ink';
  const bv=.5+.2*u*u;if(Math.abs(u)<.34&&Math.abs(v-bv)<.035)return 'pale';if(Math.abs(u)<.36&&Math.abs(v-bv)<.055)return 'ink';return null;};
 const surf=(u,v,side)=>{
  const half=.032+(W-.032)*Math.pow(Math.sin(Math.PI*Math.min(1,v*1.08)),.75),x=u*half,y=y0+v*H;
  // the centre runs up the slant of the neck, then eases off behind the head; the edges cup forward round it
  const L=-.02+.85*(y+.055),cap=-.01,k=.015,zc=L-k*Math.log(1+Math.exp((L-cap)/k))+1.5*x*x-.02*Math.pow(Math.abs(u),3);
  let t=.045*Math.sqrt(Math.max(0,1-u*u))*Math.pow(Math.sin(Math.PI*v),.5)+.002;
  if(side<0){const au=Math.abs(u),fade=Math.min(1,Math.max(0,(au-.12)/.2))*(1-au*au);
   for(const rv of ribs){const cv=rv+.18*(rv-.5)*au;t+=.012*fade*Math.exp(-Math.pow((v-cv)/.028,2));}}
  return [x,y,zc+side*t];};
 for(const side of [-1,1]){const base=pos.length/3;
  for(let j=0;j<=NV;j++)for(let i=0;i<=NU;i++){const u=-1+2*i/NU,v=j/NV;pos.push(...surf(u,v,side));
   if(side<0){const m=spec(u,v),au=Math.abs(u);c.copy(back).multiplyScalar(.75+.35*au);
    for(const rv of ribs){const cv=rv+.18*(rv-.5)*au;c.multiplyScalar(1+.25*Math.exp(-Math.pow((v-cv)/.03,2))*(au>.15?1:0));}
    if(m==='pale')c.copy(pale);else if(m==='ink')c.copy(ink);c.multiplyScalar(1-.45*Math.pow(au,6));}
   else{c.copy(bellyC);const bands=[.16,.27,.38];for(const b of bands)if(Math.abs(v-b)<.035)c.copy(band);c.lerp(back,Math.pow(Math.abs(u),5)*.8);}
   col.push(c.r,c.g,c.b);}
  for(let j=0;j<NV;j++)for(let i=0;i<NU;i++){const a=base+j*(NU+1)+i,b=a+1,d=a+NU+1,e=d+1;
   if(side>0)idx.push(a,b,d,b,e,d);else idx.push(a,d,b,b,d,e);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();
 part(pivot,geo,mat('#ffffff',{vertexColors:true,roughness:.5}));
 return pivot;
}
const SNAKES={'garter snake':{color:'#3f7a34',belly:'#d6c84a',scale:.75,wedge:.1,round:true},snake:{color:'#7a5a34',fangs:.012},'water moccasin':{color:'#5a3228',wedge:1,fangs:.022,pits:true},'pit viper':{color:'#3a5a8a',wedge:1,fangs:.024,pits:true},python:{color:'#7a5a7a',scale:1.4,wedge:.4},cobra:{color:'#3a4a7a',scale:1.2,hood:true,wedge:.25,fangs:.012,round:true}};

// Long worms and purple worms: a ringed body that surfaces from the floor in an arch,
// with the forward half as a swaying 'tail' group (live.js already sways actor.tail)
// so the head weaves without any renderer changes. The mouth is a round lamprey maw.
function worm(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.color,{roughness:.62}),ring=mat(shade(o.color,.62),{roughness:.7}),belly=mat(shade(o.color,1.35),{roughness:.7});
 const r=o.baby?.07:.1,mound=mat('#3a3128',{roughness:1});
 // loose soil where the rear of the worm dives under the floor
 for(const [x,z,s] of [[-.08,-.34,1],[.07,-.38,.8],[0,-.3,.7]])sphere(body,.08*s,mound,x,.01,z,1.4,.35,1.2);
 // rear arch: segments rising out of the ground toward the neck
 const rear=[[0,-.02,-.34],[0,.12,-.28],[0,.2,-.16],[0,.2,-.04]];
 for(const [i,[x,y,z]] of rear.entries()){const k=1-i*.04;sphere(body,r*k,skin,x,y,z,1,.95,.9);const band=part(body,new THREE.TorusGeometry(r*k*.97,r*.13,6,16),ring,x,y,z);band.rotation.x=Math.PI/2-(i<2?.9:.3);}
 // forward half pivots at the neck; this is the group that sways
 const neck=new THREE.Group();neck.position.set(0,.2,.02);body.add(neck);
 const fore=[[0,.01,.07],[0,.05,.15],[0,.11,.21]];
 for(const [i,[x,y,z]] of fore.entries()){const k=.98-i*.03;sphere(neck,r*k,skin,x,y,z,1,.95,.9);sphere(neck,r*k*.7,belly,x,y-r*.35,z+.01,1,.5,.9);const band=part(neck,new THREE.TorusGeometry(r*k*.97,r*.13,6,16),ring,x,y,z);band.rotation.x=Math.PI/2+.5+i*.2;}
 // head: blunt cap turned forward with a dark round maw ringed by teeth
 const head=new THREE.Group();head.position.set(0,.19,.27);head.rotation.x=-.55;neck.add(head);
 sphere(head,r*1.05,skin,0,0,0,1,1,.8);
 // purple worms: the gullet glows with a sickly venom light and four long curved fangs flank the maw
 const gullet=o.venom?mat('#3a6a1a',{emissive:'#8aff30',emissiveIntensity:1.8,roughness:.5}):mat('#1a0c0c',{roughness:1});if(o.venom)gullet.name='worm-venom';
 cylinder(head,r*.62,r*.62,.02,gullet,0,0,r*.72,16).rotation.x=Math.PI/2;
 if(o.venom){const fang=mat('#d8cfa8',{roughness:.35});fang.name='worm-fangs';for(const [fx,fy] of [[-.4,.5],[.4,.5],[-.4,-.5],[.4,-.5]])cone(head,r*.1,r*.7,fang,fx*r,fy*r,r*.8,5).rotation.set(Math.PI/2+(fy>0?.25:-.25),0,fx*.8);}
 part(head,new THREE.TorusGeometry(r*.66,r*.12,6,18),mat(o.lip||'#8a3a3a',{roughness:.5}),0,0,r*.74);
 const toothMat=mat('#e8e0c8',{roughness:.35});const teeth=o.baby?6:10;
 for(let i=0;i<teeth;i++){const a=i/teeth*Math.PI*2;cone(head,r*.08,r*.3,toothMat,Math.cos(a)*r*.52,Math.sin(a)*r*.52,r*.76,4).rotation.z=a+Math.PI/2;}
 return actor(g,body,[],neck,[],'worm');
}
// Long worm tail segments arrive as their own monster cells ("long worm tail", glyph ~).
// Each one is a ringed hump arching in and out of the floor, so a trail of them reads as
// one body weaving through the ground behind the head.
function wormTail(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const skin=mat(o.color,{roughness:.62}),ring=mat(shade(o.color,.62),{roughness:.7}),mound=mat('#3a3128',{roughness:1}),r=.09;
 const arch=[];for(let i=0;i<=8;i++){const a=i/8*Math.PI;arch.push([0,Math.sin(a)*.2-.03,-Math.cos(a)*.3]);}
 tube(body,arch,r,skin,24);
 for(let i=1;i<8;i+=1.5){const a=i/8*Math.PI;const band=part(body,new THREE.TorusGeometry(r*1.02,r*.13,6,16),ring,0,Math.sin(a)*.2-.03,-Math.cos(a)*.3);band.rotation.x=a-Math.PI/2;}
 for(const z of [-.3,.3])for(const [dx,dz,s] of [[-.07,-.04,1],[.07,.03,.8],[0,.06,.6]])sphere(body,.07*s,mound,dx,.01,z+dz,1.4,.35,1.2);
 return actor(g,body,[],null,[],'worm');
}
// apelike creatures (Y): a hunched, barrel-chested body on short bowed legs, with long arms knuckling the floor in front,
// a heavy brow over a pale muzzle; monkeys get a curled tail, owlbears a hooked beak and ear tufts, yeti and sasquatch shaggy shoulders
function ape(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const fur=mat(o.fur,{roughness:.97}),dark=mat(shade(o.fur,.6),{roughness:.97}),face=mat(o.face||shade(o.fur,1.35),{roughness:.8});
 const torso=sphere(body,.24,fur,0,.55,-.02,1.05,1.05,.9);torso.rotation.x=.35;sphere(body,.15,face,0,.56,.13,1.05,1.1,.45);
 for(const side of [-1,1])sphere(body,.13,o.shaggy?mat(shade(o.fur,1.12),{roughness:1}):fur,side*.17,.7,.04,1,.8,1);
 const head=new THREE.Group();head.position.set(0,.82,.17);body.add(head);
 sphere(head,.14,fur,0,0,0,1,.95,.95);rounded(head,.22,.05,.07,dark,0,.05,.1,.02);
 if(o.beak){const beak=cone(head,.06,.14,mat('#3a3028',{roughness:.4}),0,-.03,.16,6);beak.rotation.x=Math.PI/2+.5;for(const side of [-1,1]){const tuft=cone(head,.035,.12,dark,side*.09,.14,0,4);tuft.rotation.z=-side*.3;}sphere(head,.1,face,0,0,.07,1.3,1,.6);}
 else{sphere(head,.08,face,0,-.05,.11,1.1,.85,.8);sphere(head,.014,nose,-.022,-.03,.18);sphere(head,.014,nose,.022,-.03,.18);if(o.fangs)for(const side of [-1,1])cone(head,.012,.045,M.whiteFur,side*.03,-.11,.16,4).rotation.x=Math.PI;for(const side of [-1,1])sphere(head,.04,face,side*.14,.01,-.01,.5,1,.8);}
 eyes(head,o.glare?M.eye:darkEye,.015,.12,.05);
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.25,.68,.06);body.add(arm);rounded(arm,.1,.3,.11,fur,0,-.14,0,.04);rounded(arm,.09,.3,.1,fur,0,-.4,.05,.035).rotation.x=-.2;sphere(arm,.065,o.beak?dark:face,0,-.57,.08,1,.8,1.1);if(o.beak)for(let k=-1;k<=1;k++)cone(arm,.012,.05,M.whiteFur,k*.03,-.6,.15,4).rotation.x=Math.PI/2;arm.rotation.x=-.18;arm.rotation.z=side*.06;}
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.13,.32,-.1);body.add(leg);const thigh=rounded(leg,.12,.24,.13,fur,0,-.1,0,.045);thigh.rotation.z=side*.12;rounded(leg,.12,.06,.18,o.beak?dark:face,side*.02,-.26,.04,.025);legs.push(leg);}
 let tail=null;if(o.tail){tail=new THREE.Group();tail.position.set(0,.4,-.2);body.add(tail);tube(tail,[[0,0,0],[0,-.08,-.14],[0,.02,-.28],[0,.2,-.3],[0,.26,-.2],[0,.18,-.16]],.022,fur,20);}
 return actor(g,body,legs,tail,[],'idle');
}
const APES={monkey:{fur:'#8a6440',face:'#d6b08a',tail:true,scale:.7},ape:{fur:'#5a4030',face:'#a88a70'},owlbear:{fur:'#7a5a38',face:'#c8a878',beak:true,scale:1.4},yeti:{fur:'#e4e2da',face:'#8aa0b0',shaggy:true,glare:true,scale:1.4},'carnivorous ape':{fur:'#2e2622',face:'#7a5a50',fangs:true,glare:true,scale:1.25},sasquatch:{fur:'#4a3424',face:'#8a6a58',shaggy:true,scale:1.5}};
// mimics (m): a banded wooden treasure chest whose lid has cracked open on a row of fangs and a lolling tongue,
// with a single eye peering out of the lid and stubby pseudopods where its feet should be
function mimic(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const wood=mat(o.color,{roughness:.9}),band=mat('#4a4a4e',{roughness:.45,metalness:.65}),flesh=mat('#8a2a38',{roughness:.6}),gum=mat('#5a1622',{roughness:.7}),tooth=mat('#ece4cc',{roughness:.4});
 rounded(body,.5,.26,.36,wood,0,.2,0,.03);part(body,new THREE.BoxGeometry(.44,.02,.3),gum,0,.33,0);
 for(const x of [-.17,.17])rounded(body,.05,.27,.37,band,x,.2,0,.012);
 const lid=new THREE.Group();lid.position.set(0,.33,-.18);lid.rotation.x=-.42;body.add(lid);
 const top=part(lid,new THREE.CylinderGeometry(.18,.18,.5,12,1,false,0,Math.PI),wood,0,0,.18);top.rotation.z=Math.PI/2;top.scale.set(.55,1,1);
 for(const x of [-.17,.17]){const hoop=part(lid,new THREE.CylinderGeometry(.185,.185,.05,12,1,true,0,Math.PI),band,x,0,.18);hoop.rotation.z=Math.PI/2;hoop.scale.set(.57,1,1);}
 for(let i=0;i<7;i++){const x=-.2+i*.066;cone(lid,.022,.07,tooth,x,-.03,.34,4).rotation.x=Math.PI;cone(body,.02,.06,tooth,x+.033*(i<6?1:-1),.36,.16,4);}
 const lock=rounded(body,.07,.08,.03,mat('#c9a23a',{roughness:.3,metalness:.8}),0,.26,.19,.01);lock.castShadow=false;
 sphere(lid,.06,mat('#e8e0c8',{roughness:.3}),0,.08,.3,1,1,.6);sphere(lid,.03,o.glare?M.eye:mat('#1a1410'),0,.08,.33,1,1,.5);
 const tail=new THREE.Group();tail.position.set(0,.33,.12);body.add(tail);tube(tail,[[0,0,0],[0,.01,.08],[.02,-.03,.15],[.03,-.12,.19],[.02,-.2,.2]],.035,flesh,14);
 for(const [x,z] of [[-.19,.12],[.19,.12],[-.19,-.12],[.19,-.12]])sphere(body,.05,mat(shade(o.color,.7),{roughness:.8}),x,.05,z,1.2,.8,1.2);
 return actor(g,body,[],tail,[],'idle');
}
// A mimic that is mimicking an object the hero cannot yet see through is reported as a "strange object"; it is a mimic underneath.
const MIMICS={'strange object':{color:'#7a4a2a',glare:true},'small mimic':{color:'#8a5a32',scale:.8},'large mimic':{color:'#7a4a2a',glare:true,scale:1.25},'giant mimic':{color:'#6a3a22',glare:true,scale:1.5}};
// centaurs (C): the horse body (croup, barrel, jointed legs with hooves, flowing tail; see horse())
// with a man's torso rising from the withers where the horse's neck would be: a belt hides the
// seam, bare arms bend at the elbow, and the head has a face, ears and a mop of hair.
// Plains centaurs wear a vest and carry a spear, forest centaurs a longbow with an arrow quiver on
// the back, mountain centaurs a fur mantle, a beard and a club. Handles: head, arms, arm (the
// weapon arm), weaponSocket, as on the humanoids, plus offHand (the left fist) and centaur (the
// weapon's name, for centaur-attack.js).
function centaur(o){
 const coatHex=o.coat,{g,body,legs,tail,y,s}=horse({scale:o.scale||1,coat:coatHex,hair:o.hair,points:shade(coatHex,.62),legH:.4,stock:1,tail:.42,centaur:true,feathered:o.feathered,mane:o.feathered?'shaggy':undefined});
 g.name='centaur';
 const coat=mat(coatHex,{roughness:.8}),skin=mat(o.skin||'#d2a47c',{roughness:.72}),hair=mat(o.hair,{roughness:.95}),leather=mat('#4a3222',{roughness:.8}),wood=mat('#6a4a2a',{roughness:.8});
 // the horse's shoulders swell up into the human hips; the belt sits on the seam
 const hip=y+.1,z0=.25;
 sphere(body,.13,coat,0,hip,z0-.02,.95*s,.85,.85);
 lathe(body,[[0,0],[.1,0],[.105,.06],[.095,.13],[.11,.2],[.128,.28],[.135,.33],[.11,.37],[.06,.395],[.035,.41],[.035,.46],[0,.46]],skin,0,hip,z0).scale.set(1.2,1,.78);
 if(o.tunic)lathe(body,[[.103,.05],[.108,.07],[.098,.13],[.113,.2],[.132,.28],[.138,.32],[.1,.365],[.06,.38]],mat(o.tunic,{roughness:.85}),0,hip,z0).scale.set(1.2,1,.8);
 const belt=part(body,new THREE.TorusGeometry(.104,.017,6,20),leather,0,hip+.055,z0);belt.rotation.x=Math.PI/2;belt.scale.set(1.2,.8,1);
 sphere(body,.022,M.gold,0,hip+.055,z0+.086,1,1,.5);
 if(o.mantle){const fur=mat(o.mantle,{roughness:1});sphere(body,.16,fur,0,hip+.34,z0-.01,1.15,.42,.85);for(const side of [-1,1])sphere(body,.07,fur,side*.15,hip+.33,z0,1,.8,1);}
 // head: skull, jaw, nose, ears, eyes, brows and a mop of hair falling to the nape
 const head=new THREE.Group();head.position.set(0,hip+.53,z0+.01);body.add(head);
 sphere(head,.095,skin,0,0,0,.88,1.05,.95);sphere(head,.06,skin,0,-.05,.035,.9,.8,.9);
 cone(head,.018,.05,skin,0,-.005,.1,4).rotation.x=Math.PI/2+.35;
 for(const side of [-1,1]){sphere(head,.022,skin,side*.083,0,-.005,.5,1,.8);sphere(head,.012,darkEye,side*.033,.015,.083);const brow=rounded(head,.04,.01,.012,hair,side*.034,.035,.084,.004);brow.rotation.z=side*.15;}
 const mop=sphere(head,.1,hair,0,.035,-.02,.95,.85,1);mop.rotation.x=.25;sphere(head,.07,hair,0,-.04,-.07,1.15,1.1,.7);
 if(o.beard){sphere(head,.065,hair,0,-.075,.055,1.05,1.15,.75);sphere(head,.04,hair,0,-.14,.06,.9,1.1,.7);}
 // arms: shoulder, upper arm, elbow, forearm, hand; the right (+x) one is the weapon arm
 const arms=[];let weaponSocket=null,offHand=null;
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.15,hip+.33,z0);arm.rotation.z=side*.1;body.add(arm);arms.push(arm);
  sphere(arm,.05,skin);
  segment(arm,[0,0,0],[0,-.19,-.01],.043,.036,skin);sphere(arm,.036,skin,0,-.19,-.01);
  segment(arm,[0,-.19,-.01],[0,-.32,.11],.034,.028,skin);sphere(arm,.034,skin,0,-.34,.125,.9,1.1,1);
  if(o.weapon==='bow'||o.mantle)cylinder(arm,.033,.033,.05,leather,0,-.29,.075,8).rotation.x=-.85;
  const hand=new THREE.Group();hand.position.set(0,-.34,.125);arm.add(hand);if(side>0)weaponSocket=hand;else offHand=hand;}
 if(o.weapon==='spear'){
  // held upright beside the flank, butt near the ground
  cylinder(weaponSocket,.016,.016,1.08,wood,0,.1,0,6);
  const tip=cone(weaponSocket,.034,.15,M.steel,0,.715,0,4);tip.scale.z=.4;
  cylinder(weaponSocket,.02,.02,.06,leather,0,.6,0,6);
 }
 if(o.weapon==='club'){
  // a knotted cudgel hanging forward from the fist
  const club=new THREE.Group();club.rotation.x=2.45;weaponSocket.add(club);
  cylinder(club,.022,.026,.14,leather,0,-.02,0,7);cylinder(club,.028,.06,.36,wood,0,.22,0,8);sphere(club,.062,wood,0,.4,0,1,.8,1);
  for(const [a,h] of [[0,.26],[2.1,.33],[4.2,.38],[1,.42]])sphere(club,.022,wood,Math.cos(a)*.05,h,Math.sin(a)*.05);
 }
 if(o.weapon==='bow'){
  // a tall longbow held in the left fist with its string, and a quiver of fletched arrows on the back
  const bow=new THREE.Group();offHand.add(bow);bow.rotation.y=-Math.PI/2;
  part(bow,new THREE.TorusGeometry(.4,.013,5,24,Math.PI*.62),wood,-.36,0,0).rotation.z=-Math.PI*.31;
  const h=.4*Math.sin(Math.PI*.31);cylinder(bow,.003,.003,h*2,mat('#e8e0c8'),.4*Math.cos(Math.PI*.31)-.36,0,0,3);
  cylinder(bow,.018,.018,.07,leather,.04,0,0,6);
  const quiver=new THREE.Group();quiver.position.set(.07,hip+.2,z0-.11);quiver.rotation.set(-.2,0,-.35);body.add(quiver);
  cylinder(quiver,.042,.036,.3,leather,0,0,0,10);cylinder(quiver,.045,.045,.02,M.gold,0,.14,0,10);
  const fletch=mat('#d8d0b8',{roughness:.9});
  for(const [x,z,h] of [[-.015,.01,.2],[.018,0,.22],[0,-.018,.19]]){cylinder(quiver,.005,.005,.12,wood,x,h-.04,z,4);sphere(quiver,.018,fletch,x,h,z,.45,1.6,1);}
  const strap=segment(body,[-.13,hip+.34,z0+.06],[.12,hip+.08,z0+.07],.012,.012,leather);strap.scale.z=.5;
 }
 mergeStatic(g);
 return Object.assign(actor(g,body,legs,tail,[],'unicorn'),{head,arms,arm:arms[1],weaponSocket,offHand,centaur:o.weapon||null});
}
const CENTAURS={'plains centaur':{coat:'#a8804a',hair:'#4a3020',tunic:'#6a8aa0',weapon:'spear'},'forest centaur':{coat:'#5a3c24',hair:'#2a1a10',tunic:'#3f6a34',weapon:'bow',scale:1.05},'mountain centaur':{coat:'#7a7670',hair:'#3a3632',mantle:'#8a7058',beard:true,weapon:'club',scale:1.08}};
// Ponies, horses and warhorses (u): a barrel with a sloped croup, an arched neck with a mane, a long
// wedge head with a blaze, legs with knees, hocks, fetlocks and hooves, and a flowing tail. No horn.
// All three are brown on the map, so the glyph colour is the base coat and the breed sets the
// shade, build and points: a shaggy flaxen pony, a sleek bay horse, a dark barded warhorse.
// Unicorns and the ki-rin use the same body with `horn`: a lighter build, a spiral horn on the
// brow, a goat's tuft on the chin, feathered fetlocks and pale hooves (see UNICORNS).
function horse(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale);g.name=o.horn?'unicorn':'horse';
 const coat=mat(o.coat,{roughness:.8}),belly=mat(shade(o.coat,1.15),{roughness:.85}),hair=mat(o.hair,{roughness:.95}),lower=mat(o.points||o.coat,{roughness:.85}),sock=mat(o.feather||'#ece6da',{roughness:.85}),hoof=mat(o.hoof||'#2a2420',{roughness:.55,metalness:o.hoof?.3:0}),snoot=mat(shade(o.coat,o.horn?.8:.55),{roughness:.7});
 const legH=o.legH,y=legH+.16,s=o.stock;
 sphere(body,.2,coat,0,y,0,.82*s,.85,1.55);sphere(body,.17,coat,0,y+.02,.2,.9*s,1,.9);sphere(body,.18,coat,0,y+.04,-.22,.95*s,.95,.9);
 sphere(body,.14,belly,0,y-.08,0,.78*s,.6,1.45);sphere(body,.08,coat,0,y+.15,.15,.9,.8,1.4);
 if(!o.centaur){
 // neck, with the mane on its upper edge
 const n0=new THREE.Vector3(0,y+.1,.24),n1=new THREE.Vector3(0,y+.38,.44),dir=n1.clone().sub(n0).normalize(),up=new THREE.Vector3(0,dir.z,-dir.y);
 segment(body,n0.toArray(),n1.toArray(),.11*s,.07,coat);
 for(let i=0;i<9;i++){const t=i/8,r=.11*s+(.07-.11*s)*t,p=n0.clone().lerp(n1,t).addScaledVector(up,r*.85);
  if(o.mane==='braided')sphere(body,.028,hair,p.x,p.y+.01,p.z);
  else{sphere(body,.04,hair,p.x,p.y,p.z,.55,1.3,1);if(o.mane==='shaggy'){const lock=sphere(body,.05,hair,.045,p.y-.05,p.z,.35,1.4,.9);lock.rotation.z=-.25;}else sphere(body,.035,hair,.03,p.y-.03,p.z,.35,1.3,.9);}}
 const head=new THREE.Group();head.position.set(0,y+.4,.46);head.rotation.x=.85;body.add(head);
 sphere(head,.085,coat,0,0,0,.85,.95,1.1);
 segment(head,[0,0,.02],[0,-.02,.24],.07,.05,coat).scale.x=.8;
 sphere(head,.058,snoot,0,-.025,.25,.9,.85,1.05);sphere(head,.04,snoot,0,-.065,.19,.8,.7,1.2);
 for(const side of [-1,1]){sphere(head,.014,darkEye,side*.026,-.01,.3);sphere(head,.02,darkEye,side*.066,.02,.05);sphere(head,.024,coat,side*.06,.042,.045,1,.5,1.2);
  const ear=cone(head,.028,.1,coat,side*.045,.1,-.035,5);ear.rotation.set(-.6,0,-side*.2);}
 if(o.blaze)rounded(head,.03,.01,.2,sock,0,.052,.13,.004).rotation.x=.18;
 else if(!o.horn)sphere(head,.022,sock,0,.068,.07,1,.3,1.2);
 if(o.horn){
  // the horn leans a little back from the head's up axis, so it juts forward and up off the brow
  const h=.27,lean=-.1,horn=part(head,spiralHorn(.026,h),mat(o.horn,{roughness:.35,metalness:.08}),0,.075+Math.cos(lean)*h/2,.06+Math.sin(lean)*h/2);horn.rotation.x=lean;
  const burr=part(head,new THREE.TorusGeometry(.024,.007,5,12),hair,0,.078,.058);burr.rotation.x=Math.PI/2+lean;
  // chin tuft, hanging straight down in world space (the head is pitched .85 forward)
  const beard=cone(head,.016,.08,hair,0,-.075-Math.cos(.85)*.035,.15+Math.sin(.85)*.035,5);beard.rotation.x=Math.PI+.85;
 }
 sphere(head,o.mane==='shaggy'?.06:.042,hair,0,.075,.03,1,.5,1.5);
 if(o.barded){rounded(head,.075,.014,.17,M.steel,0,.06,.11,.006).rotation.x=.18;const noseband=part(head,new THREE.TorusGeometry(.055,.008,5,16),M.leather,0,-.02,.2);noseband.scale.set(.85,1,1);
  // saddle blanket of dried-blood cloth with tarnished iron trim draped over the barrel
  rounded(body,.34*s,.025,.34,mat(o.cloth,{roughness:.9}),0,y+.19,-.02,.01);for(const side of [-1,1]){const drape=rounded(body,.02,.2,.34,mat(o.cloth,{roughness:.9}),side*.165*s,y+.1,-.02,.008);drape.rotation.z=side*.12;rounded(body,.022,.02,.35,mat('#4a3f30',{metalness:.55,roughness:.62}),side*.178*s,y+.005,-.02,.006);}}
 }
 const H=(hy,front)=>{const leg=new THREE.Group();body.add(leg);
  if(front){sphere(leg,.075,coat,0,-.02,0,.8,1.3,1);segment(leg,[0,.02,0],[0,-hy*.5,.01],.06,.04,coat);sphere(leg,.036,lower,0,-hy*.5,.012);segment(leg,[0,-hy*.5,.012],[0,-hy*.86,0],.03,.028,lower);}
  else{sphere(leg,.09,coat,0,-.06,0,.8,1.4,1.1);segment(leg,[0,-.05,.02],[0,-hy*.55,-.07],.06,.038,coat);sphere(leg,.036,lower,0,-hy*.55,-.07);segment(leg,[0,-hy*.55,-.07],[0,-hy*.86,-.03],.032,.028,lower);}
  const fz=front?0:-.03;sphere(leg,.034,lower,0,-hy*.87,fz-.005);segment(leg,[0,-hy*.87,fz-.005],[0,-hy+.04,fz+.03],.026,.028,lower);
  if(o.feathered)cylinder(leg,.036,.062,.09,sock,0,-hy+.08,fz+.02,10);
  cylinder(leg,.035,.045,.05,hoof,0,-hy+.025,fz+.035,10);return leg;};
 for(const side of [-1,1]){const front=H(y-.02,true);front.position.set(side*.1*s,y-.02,.2);legs.push(front);
  const hind=H(y,false);hind.position.set(side*.1*s,y,-.24);legs.push(hind);
  if(o.hindSocks)segment(hind,[0,-y*.72,-.045],[0,-y*.87,-.035],.034,.033,sock);}
 const tail=new THREE.Group();tail.position.set(0,y+.1,-.37);body.add(tail);
 segment(tail,[0,.02,.03],[0,-.04,-.07],.04,.03,coat);
 for(const k of [-1,0,1])tube(tail,[[0,-.03,-.06],[k*.02,-.12,-.13],[k*.03,-.3,-.16],[k*.035,-o.tail,-.13+Math.abs(k)*.02]],o.mane==='shaggy'?.036:.028,hair,12);
 if(o.centaur)return {g,body,legs,tail,y,s};
 mergeStatic(g);
 return actor(g,body,legs,tail,[],'unicorn');
}
// A horn that tapers to a point with two ridges winding round it, like the unicorn horn on the
// floor (unicorn-horn.js) but light enough to wear. Base at y -h/2, tip at +h/2.
function spiralHorn(r,h,turns=3.5){
 const geo=new THREE.CylinderGeometry(0,r,h,10,14,true),pos=geo.attributes.position,v=new THREE.Vector3();
 for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);const t=v.y/h+.5,a=Math.atan2(v.z,v.x),k=1+.16*Math.cos(a*2-t*turns*Math.PI*2)*(1-t*.4);pos.setXYZ(i,v.x*k,v.y,v.z*k);}
 geo.computeVertexNormals();return geo;
}
// Merges each group's own mesh children that share a material into one mesh. The groups (body,
// head, legs, tail) stay, so every handle that animates still works; only the draw calls drop.
// Meshes in `keep` (animation handles), named or tagged meshes, see-through ones (they sort per
// object), hidden ones and mirrored ones (a flipped matrix would turn their faces inside out)
// are left alone. Shadow flags and draw order are part of the bin, so no shadow changes.
function mergeStatic(root,keep=new Set()){
 const groups=[];root.traverse(o=>{if(!o.isMesh)groups.push(o);});
 for(const group of groups){
  const bins=new Map();
  for(const mesh of group.children){
   if(!mesh.isMesh||mesh.children.length||keep.has(mesh)||mesh.isInstancedMesh||mesh.isSkinnedMesh||!mesh.visible||mesh.name||Array.isArray(mesh.material)||mesh.material.transparent||Object.keys(mesh.userData).length)continue;
   mesh.updateMatrix();if(mesh.matrix.determinant()<=0)continue;
   const geo=mesh.geometry,key=[mesh.material.uuid,geo.index?'i':'n',Object.keys(geo.attributes).sort().join(),Object.keys(geo.morphAttributes).length,mesh.castShadow,mesh.receiveShadow,mesh.renderOrder].join('|');
   if(!bins.has(key))bins.set(key,[]);bins.get(key).push(mesh);}
  for(const meshes of bins.values()){if(meshes.length<2)continue;
   const geos=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrix)),merged=mergeGeometries(geos);
   if(!merged)continue;
   // no dispose: this runs before the first render, and a source geometry may be shared
   for(const mesh of meshes)group.remove(mesh);
   const one=part(group,merged,meshes[0].material);one.castShadow=meshes[0].castShadow;one.receiveShadow=meshes[0].receiveShadow;one.renderOrder=meshes[0].renderOrder;}
 }
}
// Every Object3D an actor hands out (its own fields and g.userData, one level into arrays and
// plain objects), so mergeStatic keeps the meshes that something animates or recolours.
function handles(a){
 const keep=new Set(),add=(v,deep)=>{if(!v||typeof v!=='object')return;if(v.isObject3D){keep.add(v);return;}
  if(deep&&(Array.isArray(v)||Object.getPrototypeOf(v)===Object.prototype))for(const w of Object.values(v))add(w,false);};
 for(const v of [...Object.values(a),...Object.values(a.g.userData)])add(v,true);
 return keep;
}
function trimDraws(a){mergeStatic(a.g,handles(a));return a;}
const HORSES={
 pony:{scale:.8,coat:1.15,hair:'#e0cc9a',legH:.34,stock:1.12,mane:'shaggy',hindSocks:true,tail:.4},
 horse:{scale:1,coat:1,hair:'#1e1a18',points:'#231e1b',legH:.42,stock:1,blaze:true,tail:.44},
 warhorse:{scale:1.15,coat:.62,hair:'#141210',points:'#1a1614',legH:.43,stock:1.1,mane:'braided',feathered:true,barded:true,cloth:'#4a1519',tail:.44},
};
function horseFor(name,color){const o=HORSES[name]||HORSES.horse;return horse({...o,coat:shade(color||'#8a6440',o.coat)});}
// The three unicorns follow their alignment: a white one with a pearl horn and gilt hooves, a
// dappled grey one with a silver mane, a black one whose ivory horn stands out. The ki-rin is a
// golden, flame-maned cousin a size up.
const UNICORN_BASE={legH:.45,stock:.92,tail:.46,horn:'#f1e9d4',feathered:true};
const UNICORNS={
 'white unicorn':{...UNICORN_BASE,scale:1.05,coat:'#ece9e2',hair:'#f8f6f0',feather:'#fbfaf6',hoof:'#c8a860',horn:'#f6f0de'},
 'gray unicorn':{...UNICORN_BASE,scale:1.05,coat:'#8f8f8c',points:'#6a6a68',hair:'#d4d4d0',feather:'#c8c8c4',hoof:'#9a9ca0'},
 'black unicorn':{...UNICORN_BASE,scale:1.05,coat:'#262428',points:'#1b1a1d',hair:'#0f0e11',feather:'#18171a',hoof:'#2e2c30',horn:'#e2d6b8'},
 'ki-rin':{...UNICORN_BASE,scale:1.2,coat:'#c99a36',points:'#a87a26',hair:'#d8602a',feather:'#e07a34',hoof:'#e0c060',horn:'#f4dc90',stock:1},
};
// Bakes static pieces into one mesh per (parent, material), so a big beast costs a
// handful of draw calls instead of dozens. Pieces are posed with a matrix before merging.
function baker(){
 const bins=new Map(),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
 const put=(parent,material,geo,pos=[0,0,0],rot=[0,0,0],scl=[1,1,1])=>{
  geo.applyMatrix4(m.compose(new THREE.Vector3(...pos),rot.isQuaternion?rot:q.setFromEuler(e.set(...rot)),new THREE.Vector3(...scl)));
  const key=parent.uuid+material.uuid;if(!bins.has(key))bins.set(key,{parent,material,geos:[]});bins.get(key).geos.push(geo);};
 const bake=()=>{for(const {parent,material,geos} of bins.values()){part(parent,mergeGeometries(geos),material);for(const geo of geos)geo.dispose();}};
 return {put,bake};
}
// A tube whose radius runs from r0 to r1 along a curve, with optional ring wrinkles.
function taperedTube(points,r0,r1,tubular=20,radial=8,wrinkle=0){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),geo=new THREE.TubeGeometry(curve,tubular,1,radial,false);
 const pos=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<=tubular;i++){curve.getPointAt(i/tubular,c);const r=(r0+(r1-r0)*i/tubular)*(1+wrinkle*Math.sin(i*2.2));
  for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(pos,k).sub(c).multiplyScalar(r).add(c);pos.setXYZ(k,v.x,v.y,v.z);}}
 return geo;
}
// Mumakil and mastodons (q), set back so the tusks and body sit centred on the tile: pillar legs with toenails, a domed head, a hanging trunk that
// curls at the tip, and long tusks. The mumak is a grey oliphaunt with fan ears and a second,
// shorter pair of tusks; the mastodon is shaggy brown with small ears, a high crown, and
// tusks that sweep out and spiral in. Static parts are baked per material (~12 draw calls).
function proboscidean(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);body.position.z=-.12;g.scale.setScalar(o.scale);g.name=o.name;
 const B=baker(),skin=mat(o.skin,{roughness:.95}),dark=mat(o.dark,{roughness:.97}),ivory=mat('#e6dcc2',{roughness:.45}),nail=mat('#cfc3a6',{roughness:.6});
 const hair=o.hair?mat(o.hair,{roughness:1}):null,S=(r,w=14,h=10)=>new THREE.SphereGeometry(r,w,h);
 const legH=.44,y=legH+.2;
 // barrel, shoulder hump, rump and a darker belly
 B.put(body,skin,S(.3,20,14),[0,y,0],[0,0,0],[1,.95,1.45]);
 B.put(body,skin,S(.26,16,12),[0,y+.1,.2],[0,0,0],[1.05,1,.9]);
 B.put(body,skin,S(.25,16,12),[0,y+.03,-.24],[0,0,0],[1,1,.9]);
 B.put(body,dark,S(.24,16,10),[0,y-.12,0],[0,0,0],[.95,.5,1.35]);
 if(hair){
  // a ragged fringe down the flanks, a mane over the hump and shag on the brow
  const skirt=tatter(new THREE.LatheGeometry([[.28,.12],[.315,0],[.32,-.12],[.3,-.2]].map(([r,h])=>new THREE.Vector2(r,h)),28),-.04,.1,6);
  B.put(body,hair,skirt,[0,y,-.01],[0,0,0],[1.06,1,1.48]);
  B.put(body,hair,S(.24,16,10),[0,y+.2,.17],[0,0,0],[1.05,.7,1]);
  for(let i=0;i<9;i++){const a=(i/8-.5)*2.2;B.put(body,hair,new THREE.ConeGeometry(.05,.16,5),[Math.sin(a)*.2,y+.28-Math.abs(a)*.04,.12+Math.cos(i*1.7)*.06],[.9,0,a*.6]);}
 }
 // head: skull, crown dome, cheeks and small eyes; the mastodon's crown rises higher
 const head=new THREE.Group();head.position.set(0,y+.17,.36);head.rotation.x=.12;body.add(head);
 B.put(head,skin,S(.19,16,12),[0,0,0],[0,0,0],[.95,1.05,.95]);
 B.put(head,skin,S(.15,14,10),[0,.1+o.crown,-.03],[0,0,0],[1,1,.9]);
 if(hair)B.put(head,hair,S(.13,12,8),[0,.19+o.crown,-.05],[0,0,0],[1.1,.55,1]);
 for(const side of [-1,1]){
  B.put(head,dark,S(.028,8,6),[side*.145,.01,.1]);
  B.put(head,skin,S(.07,10,8),[side*.1,-.09,.1],[0,0,0],[1,1.1,1.1]);
  // ears: broad fans on the mumak, small tufted flaps on the mastodon
  const ear=S(o.ear,14,10);B.put(head,skin,ear,[side*(.17+o.ear*.2),-.02,-.08],[0,side*.55,0],[.12,1.05,.85]);
  B.put(head,dark,S(o.ear*.8,12,8),[side*(.172+o.ear*.2),-.03,-.06],[0,side*.55,0],[.1,1,.8]);
  // tusks sweep forward and up from the lip; the mastodon's flare out and curl back in
  const tip=o.spiral?[[0,0,0],[side*.05,-.12,.08],[side*.14,-.2,.22],[side*.14,-.14,.36],[side*.04,-.02,.42]]:[[0,0,0],[side*.02,-.12,.1],[side*.05,-.18,.24],[side*.07,-.12,.36],[side*.06,.0,.42]];
  B.put(head,ivory,taperedTube(tip,.032,.005,18,8),[side*.085,-.12,.12]);
  if(o.minorTusks)B.put(head,ivory,taperedTube([[0,0,0],[side*.03,-.08,.06],[side*.07,-.1,.14],[side*.09,-.05,.2]],.02,.004,10,6),[side*.12,-.1,.08]);
 }
 // trunk: its own group so it can be animated, wrinkled, curling forward at the tip
 const trunk=new THREE.Group();trunk.position.set(0,-.06,.16);head.add(trunk);
 const path=[[0,0,0],[0,-.12,.06],[0,-.3,.07],[0,-.46,.05],[0,-.56,.1],[0,-.57,.17]];
 B.put(trunk,skin,taperedTube(path,.075,.03,24,10,.05));
 B.put(trunk,dark,S(.032,10,8),path[5]);
 // pillar legs with a wide round foot and three toenails; the mastodon's are shaggy to the knee
 for(const side of [-1,1])for(const z of [.24,-.25]){
  const leg=new THREE.Group();leg.position.set(side*.17,legH,z);body.add(leg);legs.push(leg);
  B.put(leg,skin,S(.1,12,8),[0,.02,0],[0,0,0],[1,1.3,1]);
  B.put(leg,skin,new THREE.CylinderGeometry(.088,.085,legH-.04,12),[0,-legH/2+.02,0]);
  B.put(leg,skin,new THREE.CylinderGeometry(.095,.105,.07,14),[0,-legH+.035,0]);
  for(const a of [-.5,0,.5])B.put(leg,nail,S(.024,8,6),[Math.sin(a)*.09,-legH+.025,Math.cos(a)*.09],[0,0,0],[1,.8,.7]);
  if(hair)B.put(leg,hair,tatter(new THREE.CylinderGeometry(.11,.125,.26,14,3,true),-.04,.07,5),[0,-.08,0]);
 }
 // a thin rope tail with a dark tuft
 const tail=new THREE.Group();tail.position.set(0,y+.12,-.52);body.add(tail);
 B.put(tail,skin,taperedTube([[0,0,0],[0,-.1,-.05],[0,-.28,-.06]],.022,.014,8,6));
 B.put(tail,hair||dark,new THREE.ConeGeometry(.03,.09,6),[0,-.31,-.06],[Math.PI,0,0]);
 B.bake();
 return Object.assign(actor(g,body,legs,tail,[],'idle'),{head,trunk});
}
const PROBOSCIDEANS={
 mumak:{name:'mumak',scale:1.25,skin:'#7c7872',dark:'#56524d',ear:.2,crown:0,minorTusks:true},
 mastodon:{name:'mastodon',scale:1.25,skin:'#4a3b30',dark:'#2f251e',hair:'#6b4526',ear:.09,crown:.07,spiral:true},
};
// Titanotheres and baluchitheria (q): giant rhinos that used to borrow the rothe.
// Both stand on columnar legs with three-toed feet, have folds of thick hide at the neck and
// shoulders, and a short tufted tail. The titanothere is low and massive, with a shoulder hump and a
// blunt Y-shaped horn on its nose; the baluchitherium is a towering, long-legged browser with a
// long neck, a small head and a drooping upper lip. Static parts are baked per material.
function megaRhino(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);body.position.z=o.setBack;g.scale.setScalar(o.scale);g.name=o.name;
 const B=baker(),skin=mat(o.skin,{roughness:.96}),dark=mat(o.dark,{roughness:.98}),hoof=mat('#3a332c',{roughness:.7}),horn=mat('#8a7a62',{roughness:.6});
 const S=(r,w=14,h=10)=>new THREE.SphereGeometry(r,w,h),fold=(r,t=.022)=>new THREE.TorusGeometry(r,t,6,20);
 const legH=o.legH,y=legH+.2,tall=o.neck>0;
 // barrel, shoulders, rump, a darker belly and hide folds behind the shoulder and before the thigh
 B.put(body,skin,S(o.girth,20,14),[0,y,0],[0,0,0],[1,.98,o.length]);
 B.put(body,skin,S(o.girth*.88,16,12),[0,y+o.hump,.2],[0,0,0],[1.05,1.1,.95]);
 B.put(body,skin,S(o.girth*.85,16,12),[0,y+.02,-.24],[0,0,0],[1,1,.95]);
 B.put(body,dark,S(o.girth*.8,16,10),[0,y-.12,0],[0,0,0],[.95,.5,o.length*.92]);
 for(const z of [.08,-.12])B.put(body,dark,fold(o.girth*1.0),[0,y,z],[0,0,0],[1,.98,1]);
 // neck: a thick collar on the titanothere, a long rising column on the baluchitherium
 const neckEnd=[0,y+.06+o.neck*.75,.36+o.neck*.55];
 B.put(body,skin,taperedTube([[0,y+.05,.26],[0,y+.08+o.neck*.35,.34+o.neck*.3],neckEnd],o.girth*.62,o.girth*.42,16,12));
 for(let i=0;i<3;i++){const t=.25+i*.2;B.put(body,dark,fold(o.girth*(.62-t*.2),.018),[0,y+.06+o.neck*.75*t,.28+(.08+o.neck*.55)*t],[-Math.atan2(o.neck*.75,.08+o.neck*.55),0,0]);}
 // head: a long skull tipped down, cheeks, small eyes, pointed ears and nostrils
 const head=new THREE.Group();head.position.set(...neckEnd);head.rotation.x=o.headTilt;body.add(head);
 const hs=o.headSize;
 B.put(head,skin,S(.12*hs,16,12),[0,0,.05*hs],[0,0,0],[.9,.95,1.7]);
 B.put(head,skin,S(.095*hs,14,10),[0,-.03*hs,.24*hs],[0,0,0],[.95,.85,1.1]);
 B.put(head,dark,new THREE.BoxGeometry(.13*hs,.012,.14*hs),[0,-.08*hs,.22*hs]);
 for(const side of [-1,1]){
  B.put(head,dark,S(.018*hs,8,6),[side*.1*hs,.035*hs,.04*hs]);
  B.put(head,dark,S(.016*hs,8,6),[side*.045*hs,-.02*hs,.33*hs],[0,0,0],[1,.6,.6]);
  B.put(head,skin,new THREE.ConeGeometry(.04*hs,.11*hs,6),[side*.07*hs,.12*hs,-.1*hs],[-.3,0,-side*.45],[1,1,.55]);
 }
 if(o.horn==='fork'){
  // the blunt forked nasal horn: a broad boss that splits into two flattened, rounded prongs
  B.put(head,horn,S(.06*hs,12,8),[0,.07*hs,.2*hs],[0,0,0],[1.4,.9,1.3]);
  for(const side of [-1,1]){
   B.put(head,horn,taperedTube([[0,0,0],[side*.02,.08,.03],[side*.06,.15,.05]].map(p=>p.map(v=>v*hs)),.035*hs,.022*hs,10,8),[side*.02*hs,.08*hs,.22*hs],[0,0,0],[1,1,.7]);
   B.put(head,horn,S(.024*hs,8,6),[side*.08*hs,.23*hs,.27*hs]);
  }
 }
 if(o.lip)B.put(head,skin,S(.06*hs,12,8),[0,-.06*hs,.34*hs],[0,0,0],[1,.7,1.1]);
 // columnar legs with a knee bump, a hide fold, and a wide foot of three hooved toes
 for(const side of [-1,1])for(const z of [.24,-.25]){
  const leg=new THREE.Group();leg.position.set(side*o.stance,legH,z);body.add(leg);legs.push(leg);
  B.put(leg,skin,S(o.legR*1.2,12,8),[0,.03,0],[0,0,0],[1,1.4,1.1]);
  B.put(leg,skin,new THREE.CylinderGeometry(o.legR,o.legR*.9,legH-.04,12),[0,-legH/2+.02,0]);
  B.put(leg,skin,S(o.legR*.95,10,8),[0,-legH*.5,z>0?.012:-.012],[0,0,0],[1,.8,1]);
  B.put(leg,dark,fold(o.legR*1.02,.012),[0,-legH*.5+.03,0],[Math.PI/2,0,0]);
  B.put(leg,skin,new THREE.CylinderGeometry(o.legR*1.02,o.legR*1.1,.05,12),[0,-legH+.045,0]);
  for(const a of [-.6,0,.6])B.put(leg,hoof,S(o.legR*.42,8,6),[Math.sin(a)*o.legR*.9,-legH+o.legR*.38,Math.cos(a)*o.legR*.95],[0,0,0],[1,.9,1.1]);
 }
 // a short tail with a dark tuft
 const tail=new THREE.Group();tail.position.set(0,y+.1,-.24-o.girth*.85);body.add(tail);
 B.put(tail,skin,taperedTube([[0,0,0],[0,-.08,-.04],[0,-.2,-.05]],.025,.014,8,6));
 B.put(tail,dark,new THREE.ConeGeometry(.028,.08,6),[0,-.23,-.05],[Math.PI,0,0]);
 B.bake();
 return Object.assign(actor(g,body,legs,tail,[],'idle'),{head});
}
const MEGA_RHINOS={
 titanothere:{name:'titanothere',scale:1.15,skin:'#6e6254',dark:'#4a4036',legH:.34,girth:.3,length:1.45,hump:.16,neck:0,headTilt:.32,headSize:1.35,horn:'fork',stance:.17,legR:.085,setBack:-.15},
 baluchitherium:{name:'baluchitherium',scale:1.12,skin:'#9a8c78',dark:'#6a5e50',legH:.58,girth:.26,length:1.45,hump:.08,neck:.34,headTilt:.55,headSize:1.1,lip:true,stance:.15,legR:.068,setBack:-.2},
};
// Leocrottas (q): used to borrow the rothe. A tawny stag's body on long slender legs with cloven
// hooves, a lion's thick maned neck, and a badger's striped head whose mouth splits back to the
// ears, lined with ridges of bare bone instead of teeth. Static parts are baked per material.
function leocrotta(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);body.position.z=-.08;g.scale.setScalar(o.scale);g.name='leocrotta';
 const B=baker(),coat=mat(o.coat,{roughness:.92}),dark=mat(o.dark,{roughness:.95}),mane=mat(o.mane,{roughness:1}),belly=mat(o.belly,{roughness:.92});
 const white=mat('#e4ddcc',{roughness:.9}),black=mat('#1c1916',{roughness:.9}),bone=mat('#e8dcc0',{roughness:.45}),gum=mat('#5a2226',{roughness:.7});
 const S=(r,w=14,h=10)=>new THREE.SphereGeometry(r,w,h),legH=.5,y=legH+.14;
 // a deep-chested, tucked-up stag's barrel, withers higher than the rump, a pale belly
 B.put(body,coat,S(.17,18,12),[0,y,0],[0,0,0],[1,1,1.9]);
 B.put(body,coat,S(.16,16,12),[0,y+.04,.18],[0,0,0],[1.05,1.1,1]);
 B.put(body,coat,S(.14,16,12),[0,y-.01,-.22],[0,0,0],[1,1,1]);
 B.put(body,belly,S(.13,14,10),[0,y-.08,.02],[0,0,0],[.9,.55,1.7]);
 // lion's neck: a thick rising column wrapped in a dark shaggy mane down to the withers
 const neckEnd=[0,y+.3,.4];
 B.put(body,coat,taperedTube([[0,y+.02,.22],[0,y+.17,.32],neckEnd],.12,.085,14,10));
 B.put(body,mane,tatter(new THREE.LatheGeometry([[.1,.14],[.15,.05],[.16,-.06],[.13,-.16]].map(([r,h])=>new THREE.Vector2(r,h)),20),-.04,.06,7),[0,y+.17,.33],[-.75,0,0],[1.05,1,1.15]);
 for(let i=0;i<7;i++){const t=i/6;B.put(body,mane,new THREE.ConeGeometry(.035,.13,5),[0,y+.3-t*.18,.36-t*.3],[-.6-t*.5,0,0]);}
 // badger head: a wedge skull with a white blaze and black stripes through the eyes, small round ears
 const head=new THREE.Group();head.position.set(...neckEnd);head.rotation.x=.35;body.add(head);
 B.put(head,white,S(.09,16,12),[0,.01,.03],[0,0,0],[1,.85,1.25]);
 B.put(head,white,new THREE.ConeGeometry(.07,.17,12),[0,-.005,.17],[Math.PI/2,0,0],[1,1,.75]);
 B.put(head,black,S(.02,8,6),[0,.005,.26]);
 for(const side of [-1,1]){
  B.put(head,black,S(.05,10,8),[side*.048,.03,.07],[0,0,-side*.1],[.35,.55,1.9]);
  B.put(head,gum,S(.011,8,6),[side*.062,.035,.09]);
  B.put(head,black,S(.03,10,8),[side*.07,.075,-.035],[0,0,0],[1,1,.45]);
  B.put(head,white,S(.03,10,8),[side*.07,.075,-.03],[0,0,0],[.75,.7,.3]);
 }
 // the gaping jaw: the mouth splits back to the ears; bone ridges run the length of both jaws
 const jaw=new THREE.Group();jaw.position.set(0,-.035,-.02);jaw.rotation.x=.22;head.add(jaw);
 B.put(jaw,coat,new THREE.ConeGeometry(.06,.24,10),[0,-.02,.13],[Math.PI/2,0,0],[1,.55,1]);
 B.put(jaw,gum,new THREE.BoxGeometry(.075,.012,.2),[0,.005,.13]);
 B.put(head,gum,new THREE.BoxGeometry(.08,.012,.21),[0,-.03,.13]);
 for(const side of [-1,1]){
  B.put(head,bone,taperedTube([[0,0,-.08],[side*.004,0,.06],[side*.02,0,.22]],.012,.007,10,6),[side*.03,-.045,.02],[0,0,0],[1,1.6,1]);
  B.put(jaw,bone,taperedTube([[0,0,-.06],[side*.004,0,.08],[side*.018,0,.22]],.011,.007,10,6),[side*.028,.018,.01],[0,0,0],[1,1.6,1]);
 }
 // long slender stag's legs: a muscled upper leg, knobby joints, a thin dark cannon and a cloven hoof
 for(const side of [-1,1])for(const front of [true,false]){
  const leg=new THREE.Group();leg.position.set(side*.09,legH,front?.2:-.22);body.add(leg);legs.push(leg);
  const bend=front?.02:-.05;
  B.put(leg,coat,S(front?.06:.075,12,8),[0,.01,0],[0,0,0],[.85,1.6,1.1]);
  B.put(leg,coat,taperedTube([[0,-.02,0],[0,-legH*.25,bend*.5],[0,-legH*.45,bend]],.045,.028,8,8));
  B.put(leg,coat,S(.03,8,6),[0,-legH*.45,bend]);
  B.put(leg,dark,taperedTube([[0,-legH*.45,bend],[0,-legH*.7,bend*.4],[0,-legH*.9,.01]],.024,.019,8,6));
  B.put(leg,dark,S(.024,8,6),[0,-legH*.9,.012]);
  for(const toe of [-1,1])B.put(leg,dark,new THREE.ConeGeometry(.018,.06,6),[toe*.014,-legH+.034,.022],[.35,0,0]);
 }
 // a lion's tail with a dark tuft
 const tail=new THREE.Group();tail.position.set(0,y+.06,-.34);body.add(tail);
 B.put(tail,coat,taperedTube([[0,0,0],[0,-.08,-.08],[0,-.26,-.12],[0,-.4,-.08]],.024,.014,14,6));
 B.put(tail,mane,S(.035,10,8),[0,-.43,-.07],[0,0,0],[1,1.6,1]);
 B.bake();
 return Object.assign(actor(g,body,legs,tail,[],'idle'),{head,jaw});
}
// Wumpuses (q): used to borrow the rothe, tinted cyan. A squat, round, shaggy beast too heavy for
// a bat to lift, on four short, thick legs that end in the sucker feet of the old Hunt the Wumpus
// game: each a broad bruised, mauve-grey pad with a raised rim and a dark cupped hollow. A huge round head sits low
// on the body, split almost ear to ear by a grinning maw of blunt teeth, with small sunken yellow
// eyes under a heavy brow, two stubby horns curling outward and small round ears. Coarse tufts of
// darker fur ruff the back and flanks, and a short tail ends in a tuft.
// Each moving part (body, head, jaw, each leg, tail) is one merged, vertex-coloured mesh sharing
// one material, plus one small glowing mesh for the eyes: 9 draws.
function wumpus(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);body.position.z=-.03;g.scale.setScalar(o.scale);g.name='wumpus';
 const bins=new Map(),m=new THREE.Matrix4(),e=new THREE.Euler();
 const put=(parent,colour,geo,pos=[0,0,0],rot=[0,0,0],scl=[1,1,1])=>{
  if(!bins.has(parent))bins.set(parent,pieces());
  bins.get(parent).add(geo,m.clone().compose(new THREE.Vector3(...pos),rot.isQuaternion?rot:new THREE.Quaternion().setFromEuler(e.set(...rot)),new THREE.Vector3(...scl)),colour);};
 const hide=rgb(o.hide),dark=rgb(o.fur),belly=rgb(o.belly),pad=rgb('#6e4a4c'),cup=rgb('#2e1418'),mouth=rgb('#3a1418'),tooth=rgb('#cfc29c'),horn=rgb('#a89c78');
 const S=(r,w=16,h=12)=>new THREE.SphereGeometry(r,w,h),legH=.17,y=legH+.2;
 // hide darkens toward the underside
 const shaded=(lo,hi)=>(x,py)=>mix(mix(hide,dark,.55),hide,(py-lo)/(hi-lo));
 // a round, heavy barrel, a pale belly sagging underneath
 put(body,shaded(y-.2,y+.1),S(.23,22,16),[0,y,-.02],[0,0,0],[1.02,.88,1.18]);
 put(body,shaded(y-.15,y+.12),S(.19,18,14),[0,y+.03,.12],[0,0,0],[1.08,.95,.9]);
 put(body,belly,S(.18,16,12),[0,y-.09,.03],[0,0,0],[.95,.55,1.2]);
 // coarse tufts over the back and flanks, pointing out and swept back, darker at the root
 for(let i=0;i<30;i++){
  const u=(i*.618034)%1,a=(i/30)*Math.PI*1.9-Math.PI*.95,up=.25+u*.9;
  const n=new THREE.Vector3(Math.sin(a)*Math.cos(up),Math.sin(up),Math.cos(a)*Math.cos(up)-.25).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),n.clone().add(new THREE.Vector3(0,-.2,-.55)).normalize());
  put(body,mix(dark,hide,u*.4),new THREE.ConeGeometry(.034,.09+u*.04,5),[n.x*.225,y+n.y*.2,-.02+n.z*.26],q,[1,1,.6]);
 }
 // the head: a great round skull sitting low and forward, a heavy brow and a broad muzzle
 const head=new THREE.Group();head.position.set(0,y+.05,.25);body.add(head);
 put(head,shaded(-.12,.14),S(.16,20,14),[0,.02,0],[0,0,0],[1.12,.92,.95]);
 put(head,hide,S(.1,14,10),[0,-.01,.1],[0,0,0],[1.35,.75,.8]);
 put(head,dark,S(.05,12,8),[0,.1,.08],[0,0,0],[2.6,.55,.9]);
 const eyes=[];
 for(const side of [-1,1]){
  // small sunken eyes, round ears, and stubby horns curling out and up, pale at the tip
  put(head,mouth,S(.026,10,8),[side*.065,.075,.115]);
  eyes.push(S(.018,10,8).applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(side*.066,.075,.126),new THREE.Quaternion(),new THREE.Vector3(1,.8,.7))));
  put(head,hide,S(.04,10,8),[side*.15,.1,-.03],[0,0,side*.4],[1,1,.4]);
  put(head,belly,S(.026,10,8),[side*.152,.1,-.018],[0,0,side*.4],[1,1,.3]);
  put(head,(x,py)=>mix(mix(horn,dark,.5),horn,(py-.12)/.1),taperedTube([[0,0,0],[side*.05,.03,0],[side*.075,.08,-.01],[side*.065,.12,-.025]],.028,.008,12,8),[side*.1,.12,.01]);
 }
 part(head,mergeGeometries(eyes),mat('#ffd24a',{emissive:'#d08a10',emissiveIntensity:2.2,roughness:.3})).userData.part='eyes';
 eyes.forEach(geo=>geo.dispose());
 // the maw: a wide dark slit wrapping round the muzzle, blunt teeth along the upper lip
 put(head,mouth,new THREE.TorusGeometry(.12,.022,6,24,Math.PI*.9),[0,-.035,.035],[Math.PI/2,0,Math.PI*.05],[1.05,1,.95]);
 for(let k=0;k<11;k++){const a=Math.PI*(.12+.76*k/10);put(head,tooth,new THREE.ConeGeometry(.014,.034,5),[Math.cos(a)*.125,-.035,.035+Math.sin(a)*.115],[Math.PI,0,0]);}
 // the lower jaw hangs a little open, its own row of teeth pointing up
 const jaw=new THREE.Group();jaw.position.set(0,-.05,.02);jaw.rotation.x=.12;head.add(jaw);
 put(jaw,hide,S(.11,16,10),[0,-.03,.04],[0,0,0],[1.2,.45,.95]);
 put(jaw,mouth,S(.1,14,8),[0,-.005,.05],[0,0,0],[1.1,.18,.85]);
 for(let k=0;k<9;k++){const a=Math.PI*(.15+.7*k/8);put(jaw,tooth,new THREE.ConeGeometry(.012,.03,5),[Math.cos(a)*.11,.01,.04+Math.sin(a)*.09]);}
 // four short, thick legs with a shaggy cuff, each on a broad sucker pad: bruised rim, dark cupped hollow
 for(const side of [-1,1])for(const z of [.13,-.15]){
  const leg=new THREE.Group();leg.position.set(side*.16,legH,z);body.add(leg);legs.push(leg);
  put(leg,hide,S(.08,12,10),[0,.03,0],[0,0,0],[1,1.3,1.1]);
  put(leg,shaded(-legH,0),new THREE.CylinderGeometry(.06,.055,legH-.02,12),[0,-legH/2+.01,0]);
  put(leg,dark,new THREE.ConeGeometry(.068,.07,10,1,true),[0,-legH*.5,0]);
  put(leg,pad,new THREE.CylinderGeometry(.075,.085,.028,18),[0,-legH+.014,.01]);
  put(leg,pad,new THREE.TorusGeometry(.078,.012,6,20),[0,-legH+.03,.01],[Math.PI/2,0,0]);
  put(leg,cup,new THREE.CylinderGeometry(.05,.05,.004,16),[0,-legH+.029,.01]);
 }
 // a short thick tail with a dark tuft
 const tail=new THREE.Group();tail.position.set(0,y+.02,-.28);body.add(tail);
 put(tail,hide,taperedTube([[0,0,0],[0,-.03,-.06],[0,-.09,-.1]],.035,.02,10,8));
 put(tail,dark,S(.035,10,8),[0,-.11,-.11],[0,0,0],[1,1.4,1]);
 const skin=mat('#ffffff',{vertexColors:true,roughness:.82});
 for(const [parent,P] of bins)part(parent,P.merge(),skin);
 return Object.assign(actor(g,body,legs,tail,[],'idle'),{head,jaw});
}
// Rothes (q): used to be the generic canine with little horns. A shaggy, musk-ox-like grazer from
// the underdark: a heavy barrel body under a high shoulder hump, draped in a long skirt of coarse dark
// hair that hangs to the knees, with a pale saddle across the back. The broad head is carried low; a
// bony boss caps the brow and the horns sweep down past the cheeks before hooking forward and up. A
// shaggy beard hangs from the throat, the lower jaw sits a little open over blunt grinding teeth, and
// the short legs show pale stockings above split, cloven hooves.
// Each moving part (body, head, jaw, each leg, tail) is one merged, vertex-coloured mesh sharing one
// material, plus one glossy mesh for the eyes: 9 draws.
const ROTHE={scale:1,coat:'#4a3322',fur:'#24170e',saddle:'#8c7556',stocking:'#c4b394',horn:'#d8cbb0'};
function rothe(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);body.position.z=-.05;g.scale.setScalar(o.scale);g.name='rothe';
 const bins=new Map(),m=new THREE.Matrix4(),e=new THREE.Euler();
 const put=(parent,colour,geo,pos=[0,0,0],rot=[0,0,0],scl=[1,1,1])=>{
  if(!bins.has(parent))bins.set(parent,pieces());
  bins.get(parent).add(geo,m.clone().compose(new THREE.Vector3(...pos),rot.isQuaternion?rot:new THREE.Quaternion().setFromEuler(e.set(...rot)),new THREE.Vector3(...scl)),colour);};
 const coat=rgb(o.coat),fur=rgb(o.fur),saddle=rgb(o.saddle),stocking=rgb(o.stocking),horn=rgb(o.horn);
 const hoof=rgb('#1e1813'),nose=rgb('#2a2220'),mouth=rgb('#3a1a18'),tooth=rgb('#ddd2b4');
 const S=(r,w=16,h=12)=>new THREE.SphereGeometry(r,w,h),clamp=t=>Math.min(1,Math.max(0,t)),legH=.22,y=legH+.16;
 // the coat darkens toward the underside and lightens into the saddle on top
 const shaded=(lo,hi)=>(x,py)=>{const t=clamp((py-lo)/(hi-lo));return t>.8?mix(coat,saddle,(t-.8)/.2):mix(fur,coat,t/.8);};
 // a heavy barrel, a high hump over the shoulders and a rounded rump
 put(body,shaded(y-.2,y+.19),S(.21,22,16),[0,y,-.03],[0,0,0],[1,.86,1.32]);
 put(body,shaded(y-.14,y+.25),S(.18,18,14),[0,y+.07,.12],[0,0,0],[1.05,.95,.95]);
 put(body,shaded(y-.16,y+.17),S(.16,16,12),[0,y+.02,-.2],[0,0,0],[1.1,.9,.9]);
 // the long skirt: coarse locks hanging from the flanks, chest and haunches down to the knees
 for(let i=0;i<44;i++){
  const a=i/44*Math.PI*2,u=(i*.618034)%1,sx=Math.sin(a),cz=Math.cos(a);
  const len=.17+u*.06+(cz>.4?.03:0),top=y+.02+u*.03;
  const px=sx*.2,pz=-.03+cz*.27,out=new THREE.Vector3(sx,0,cz*.8).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(out.x*.18,-1,out.z*.18).normalize());
  put(body,(x,py)=>mix(fur,coat,clamp((py-(top-len))/len*.8)),new THREE.ConeGeometry(.045,len,5,1),[px,top-len/2,pz],q,[1,1,.55]);
 }
 // rougher tufts over the hump and along the spine, swept back
 for(let i=0;i<14;i++){const t=i/13,z=.2-t*.4,h=y+.2-Math.abs(t-.35)*.18;
  put(body,mix(saddle,coat,(i%3)*.25),new THREE.ConeGeometry(.03,.07,5),[((i%2)-.5)*.05,h,z],[-1.2,0,0],[1,1,.6]);}
 // the head, carried low and forward of the hump
 const head=new THREE.Group();head.position.set(0,y-.01,.3);head.rotation.x=.25;body.add(head);
 put(head,shaded(-.1,.12),S(.1,18,14),[0,0,0],[0,0,0],[.95,.95,1.1]);
 put(head,coat,S(.075,14,10),[0,-.045,.1],[0,0,0],[.85,.8,1.1]);
 put(head,nose,S(.045,12,8),[0,-.05,.17],[0,0,0],[1.15,.8,.6]);
 for(const side of [-1,1])put(head,rgb('#0c0908'),S(.012,8,6),[side*.022,-.045,.195]);
 // a shaggy beard hanging from the throat
 for(let i=0;i<9;i++){const x=(i/8-.5)*.1,len=.11+((i*.618)%1)*.05;
  put(head,(px,py)=>mix(fur,coat,clamp((py+.06+len)/len*.7)),new THREE.ConeGeometry(.024,len,5),[x,-.07-len/2,.02-Math.abs(x)*.3],[Math.PI+.25,0,0],[1,1,.7]);}
 // the bony boss across the brow and the horns: down past the cheeks, then hooking forward and up
 put(head,(x,py)=>mix(mix(horn,fur,.45),horn,clamp(Math.abs(x)/.1)),S(.06,16,8),[0,.085,-.01],[0,0,0],[2,.5,1]);
 const eyes=[];
 for(const side of [-1,1]){
  put(head,(x,py,pz)=>mix(mix(horn,fur,.5),horn,clamp((pz-.02)/.14+.3)),taperedTube([[side*.05,.09,-.01],[side*.12,.07,-.02],[side*.16,.0,0],[side*.155,-.06,.06],[side*.18,-.035,.13]],.032,.007,16,8));
  eyes.push(S(.016,10,8).applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(side*.075,.02,.07),new THREE.Quaternion(),new THREE.Vector3(.8,.9,1))));
  // small ears half hidden under the horn sweep
  put(head,coat,S(.03,10,8),[side*.1,.035,-.04],[0,0,side*.5],[1.4,.6,.8]);
 }
 part(head,mergeGeometries(eyes),darkEye).userData.part='eyes';
 eyes.forEach(geo=>geo.dispose());
 // the lower jaw hangs a little open over a row of blunt grinding teeth
 const jaw=new THREE.Group();jaw.position.set(0,-.075,.06);jaw.rotation.x=.1;head.add(jaw);
 put(jaw,coat,S(.06,14,8),[0,-.01,.06],[0,0,0],[.9,.45,1.3]);
 put(jaw,mouth,S(.05,12,6),[0,.008,.07],[0,0,0],[.85,.2,1.2]);
 for(let k=0;k<6;k++){const a=Math.PI*(.2+.6*k/5);put(jaw,tooth,new THREE.BoxGeometry(.014,.014,.012),[Math.cos(a)*.04,.015,.07+Math.sin(a)*.05]);}
 // four short, sturdy legs: a shaggy cuff, pale stockings and split cloven hooves
 for(const side of [-1,1])for(const z of [.15,-.19]){
  const top=legH+.04,leg=new THREE.Group();leg.position.set(side*.12,top,z);body.add(leg);legs.push(leg);
  put(leg,coat,S(.07,12,10),[0,0,0],[0,0,0],[1,1.4,1.1]);
  put(leg,(x,py)=>mix(stocking,coat,clamp((py+top*.45)/(top*.4))),new THREE.CylinderGeometry(.045,.036,top-.03,10),[0,-top/2+.005,0]);
  for(const k of [-1,1])put(leg,hoof,new RoundedBoxGeometry(.033,.04,.06,1,.01),[k*.019,-top+.02,.012],[0,k*.08,0]);
 }
 // a short tail, mostly lost in the hair
 const tail=new THREE.Group();tail.position.set(0,y+.08,-.34);body.add(tail);
 put(tail,coat,taperedTube([[0,0,0],[0,-.03,-.04],[0,-.1,-.05]],.028,.016,10,8));
 put(tail,fur,new THREE.ConeGeometry(.03,.08,6),[0,-.13,-.05],[Math.PI,0,0]);
 const skin=mat('#ffffff',{vertexColors:true,roughness:.9});
 for(const [parent,P] of bins)part(parent,P.merge(),skin);
 return Object.assign(actor(g,body,legs,tail,[],'idle'),{head,jaw});
}
// giants (H): a towering, broad-shouldered brute in a hide kilt and belt, with thick legs in wrapped boots and heavy fists;
// hill giants swing clubs, stone giants shoulder a boulder, fire giants have a smouldering beard and a sword, frost giants
// an icy mantle and an axe, storm giants a lightning-tipped spear, titans gilded armour; ettins have two heads (the minotaur has its own model in minotaur.js)
function giant(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[],arms=[];
 const skin=mat(o.skin,{roughness:.85}),cloth=mat(o.cloth||'#6a5a40',{roughness:.95}),hair=o.hair==='fire'?mat('#ff7a2a',{emissive:'#e0400e',emissiveIntensity:2.2,roughness:.5}):mat(o.hair||'#3a2a1c',{roughness:.95}),wood=mat('#5a3e24',{roughness:.85}),boot=mat(o.boot||'#3a2a20',{roughness:.9});
 const armor=o.armor?mat(o.armor,{roughness:.35,metalness:.7}):null;
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.11,.48,0);body.add(leg);rounded(leg,.14,.3,.15,skin,0,-.13,0,.05);rounded(leg,.17,.14,.22,boot,0,-.41,.03,.04);legs.push(leg);}
 cylinder(body,.2,.25,.22,cloth,0,.5,0,9);rounded(body,.42,.06,.28,M.leather,0,.62,0,.02);rounded(body,.07,.06,.03,M.gold,0,.62,.145,.01).castShadow=false;
 rounded(body,.44,.4,.28,armor||(o.tunic?mat(o.tunic,{roughness:.9}):skin),0,.83,0,.1);sphere(body,.12,skin,0,.9,.1,1.5,.9,.5);
 for(const side of [-1,1])sphere(body,.1,armor||skin,side*.2,1.0,0,1,.8,1);
 if(o.mantle)sphere(body,.2,mat(o.mantle,{roughness:1}),0,1.02,-.02,1.35,.45,1);
 if(o.ice)for(const side of [-1,1])for(const k of [0,1]){const shard=cone(body,.035,.16,mat('#cfeaf6',{roughness:.15,transparent:true,opacity:.85}),side*(.18+k*.06),1.1-k*.03,-.04,4);shard.rotation.z=-side*(.35+k*.3);}
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.26,.98,.01);body.add(arm);rounded(arm,.12,.28,.13,skin,0,-.14,0,.045);rounded(arm,.11,.26,.12,armor||skin,0,-.39,.02,.04);sphere(arm,.07,skin,0,-.56,.03);arm.rotation.z=side*.05;arm.rotation.x=side>0&&o.weapon?-.35:-.08;arms.push(arm);}
 const heads=o.twoHeads?[-.11,.11]:[0];
 for(const hx of heads){const head=new THREE.Group();head.position.set(hx,1.16,.03);head.rotation.z=-hx*1.2;body.add(head);
  {sphere(head,.12,skin,0,0,0,.95,1.05,.95);if(o.cyclops)sphere(head,.024,skin,0,-.045,.115,1.3,.8,1);else{rounded(head,.2,.04,.06,mat(shade(o.skin,.8),{roughness:.9}),0,.04,.09,.015);sphere(head,.028,skin,0,-.01,.12,1,1.2,1);}
   const scalp=sphere(head,.125,hair,0,.035,-.03,1,.85,1);scalp.rotation.x=.25;if(o.beard)sphere(head,.09,hair,0,-.09,.07,1,1.2,.65);}
  // ettins: a rusted iron collar studded with spikes at each neck, and a raked scar over one eye
  if(o.twoHeads){const rust=mat('#4a3426',{roughness:.7,metalness:.6});g.userData.collared=true;part(head,new THREE.TorusGeometry(.09,.017,5,14),rust,0,-.1,0).rotation.x=Math.PI/2;for(let i=0;i<5;i++){const a=(i-2)*.6,spike=cone(head,.014,.05,rust,Math.sin(a)*.1,-.1,Math.cos(a)*.1,4);spike.rotation.set(Math.cos(a)*1.2,0,-Math.sin(a)*1.2);}if(hx<0)rounded(head,.012,.1,.01,mat('#5a2a22',{roughness:1}),.04,.03,.1,.004).rotation.z=.5;}
  // frost giants: the beard has frozen into a hanging fringe of long, clear icicles
  if(o.icicles){const clear=mat('#d8f2fc',{roughness:.12,transparent:true,opacity:.85});g.userData.icicled=true;for(let i=0;i<5;i++){const x=(i-2)*.035,len=.14-Math.abs(i-2)*.025,c=cone(head,.013,len,clear,x,-.14-len/2+.03,.09-Math.abs(i-2)*.008,4);c.rotation.x=Math.PI;}}
  if(o.circlet)part(head,new THREE.TorusGeometry(.12,.012,5,16),M.gold,0,.07,0).rotation.x=Math.PI/2;
  // a crown of jagged black-iron spikes, their tips white-hot
  if(o.crown){const iron=mat('#2a2224',{roughness:.45,metalness:.75}),hot=mat('#ffb060',{emissive:'#f05010',emissiveIntensity:3});part(head,new THREE.TorusGeometry(.118,.016,5,18),iron,0,.075,-.01).rotation.x=Math.PI/2;
   for(let i=0;i<7;i++){const a=(i-3)*.42,tall=.09-Math.abs(i-3)*.012,spike=cone(head,.022,tall,iron,Math.sin(a)*.118,.075+tall/2,Math.cos(a)*.118-.01,4);spike.rotation.set(Math.cos(a)*.22,0,-Math.sin(a)*.22);sphere(head,.009,hot,Math.sin(a)*(.118+tall*.22),.075+tall*.95,Math.cos(a)*(.118+tall*.22)-.01,1,1.4,1);}}
  // Surtur: two great horns of black iron sweep up and out from under the crown, their tips smouldering
  if(o.crown){const horn=mat('#1a1416',{roughness:.4,metalness:.8}),ember=mat('#ffb060',{emissive:'#f05010',emissiveIntensity:3});g.userData.horned=true;for(const side of [-1,1]){const lo=cone(head,.03,.12,horn,side*.12,.07,-.01,5);lo.rotation.z=-side*.9;const hi=cone(head,.02,.1,horn,side*.2,.14,-.01,5);hi.rotation.z=-side*.35;sphere(head,.008,ember,side*.215,.195,-.01,1,1.4,1);}}
  // the Cyclops: one great bloodshot eye under a single heavy brow, slit-pupilled, and tusks jutting from the underbite
  if(o.cyclops){const white=mat('#e8dcae',{roughness:.3}),iris=mat('#d08a1a',{emissive:'#c06a10',emissiveIntensity:1.6,roughness:.2}),slit=mat('#0e0a08',{roughness:.2});
   sphere(head,.05,white,0,.005,.085,1.1,.9,.75);sphere(head,.028,iris,0,.005,.118,1,1,.5);sphere(head,.009,slit,0,.005,.131,.45,2.2,.4);
   const brow=rounded(head,.17,.04,.07,mat(shade(o.skin,.7),{roughness:.95}),0,.055,.1,.018);brow.rotation.x=.35;
   for(const side of [-1,1]){const tusk=cone(head,.014,.06,mat('#d8cca4',{roughness:.5}),side*.045,-.07,.105,5);tusk.rotation.set(-.25,0,side*.25);}}
  else eyes(head,o.glare||M.eye,.01,.11,.045);}
 // hill giants: a belt strung with the yellowed skulls of past meals
 if(o.skulls){const bone=mat('#cfc29a',{roughness:.75}),pit=mat('#14100c',{roughness:1});g.userData.skulled=true;for(const x of [-.17,-.06,.06,.17]){sphere(body,.032,bone,x,.55,.15,1,1,.9);rounded(body,.036,.01,.01,pit,x,.56,.18,.003);sphere(body,.012,bone,x,.52,.165,1.3,.8,.7);}}
 // the Cyclops: an iron manacle still locked on one wrist, the chain broken after a few rusted links
 if(o.cyclops){const iron=mat('#3a3430',{roughness:.6,metalness:.7});g.userData.shackled=true;part(arms[0],new THREE.TorusGeometry(.065,.016,5,12),iron,0,-.52,.02).rotation.x=Math.PI/2;for(let i=0;i<3;i++)part(arms[0],new THREE.TorusGeometry(.025,.006,4,8),iron,0,-.6-i*.05,.02).rotation.set(0,i%2?0:Math.PI/2,0);}
 // storm giants: lightning has struck them and left branching fern-scars, faintly alight, down the chest and arm
 if(o.storm){const arc=mat('#bfe6ff',{emissive:'#3aa0ff',emissiveIntensity:2.6,roughness:.4});g.userData.lightningScarred=true;for(const [x,y,rz] of [[-.12,.95,.5],[-.08,.86,-.4],[-.15,.77,.7],[-.04,.78,.2]]){const v=rounded(body,.012,.12,.01,arc,x,y,.146,.004);v.rotation.z=rz;}
  for(const [y,rz] of [[-.2,.4],[-.32,-.5]]){const v=rounded(arms[1],.012,.1,.01,arc,.02,y,.065,.004);v.rotation.z=rz;}}
 // fire giants: the skin has cracked like cooling slag, glowing seams across the chest and shoulders
 if(o.cracked){const seam=mat('#ffb060',{emissive:'#e0400e',emissiveIntensity:2.4,roughness:.5});g.userData.cracked=true;for(const [x,y,z,rz] of [[-.1,.86,.145,.6],[.07,.8,.147,-.5],[.13,.95,.14,.3],[-.02,.74,.148,-.1]]){const v=rounded(body,.014,.13,.01,seam,x,y,z,.004);v.rotation.z=rz;}}
 // titans: old war-scars slash the gilded breastplate
 if(o.scars){const gash=mat('#2a1410',{roughness:1});g.userData.scarred=true;for(const [x,y,rz] of [[-.1,.9,.7],[.08,.82,-.6],[.12,.94,.5]]){const sc=rounded(body,.016,.15,.01,gash,x,y,.145,.004);sc.rotation.z=rz;}}
 let core=null;
 if(o.weapon==='club'){const club=cylinder(body,.075,.03,.46,wood,.28,.46,.2,7);club.rotation.x=.55;for(let i=0;i<3;i++)cone(body,.02,.05,M.darkSteel,.28+(i-1)*.05,.6,.3,4).rotation.x=.55;}
 // stone giants hoist a fractured granite boulder overhead on the left palm, ready to throw; it rides the arm so it follows any swing
 if(o.weapon==='boulder'){arms[0].rotation.set(2.85,0,.14);const rock=part(arms[0],heldBoulderGeometry(7,.155),mat('#ffffff',{vertexColors:true,roughness:.94,flatShading:true}),.01,-.74,.06);rock.rotation.set(.3,.8,.2);rock.userData.part='boulder';
  for(const k of [-1,0,1]){const finger=rounded(arms[0],.03,.07,.03,skin,k*.04,-.61,.07-Math.abs(k)*.02,.012);finger.rotation.x=-.35;}}
 if(o.weapon==='sword'){const L=o.blade||1,blade=rounded(body,.05*L,.5*L,.015,mat('#d8a070',{emissive:'#c0501a',emissiveIntensity:o.blade?2.4:.9,roughness:.3,metalness:.7}),.3,.56+.25*(L-1)*Math.cos(.55),.28+.25*(L-1)*Math.sin(.55),.01);blade.rotation.x=.55;rounded(body,.14,.03,.04,M.gold,.3,.37,.18,.01);}
 if(o.weapon==='axe'){const shaft=cylinder(body,.02,.02,.6,wood,.29,.5,.16,6);shaft.rotation.x=.3;const bit=part(body,new THREE.CylinderGeometry(.1,.1,.018,10,1,false,0,Math.PI),mat('#b8dcea',{roughness:.2,metalness:.4}),.29,.74,.23);bit.rotation.set(.3,0,Math.PI/2);}
 if(o.weapon==='spear'){const shaft=cylinder(body,.018,.018,.95,wood,.29,.6,.18,6);shaft.rotation.x=.2;core=cone(body,.04,.12,new THREE.MeshStandardMaterial({color:'#bfe6ff',emissive:'#3aa0ff',emissiveIntensity:4.5,roughness:.2}),.29,1.1,.28,4);core.rotation.x=.2;g.userData.core=core;}
 if(o.hair==='fire'&&!core){core=sphere(body,.05,new THREE.MeshStandardMaterial({color:'#ffb060',emissive:'#f05010',emissiveIntensity:4.5,roughness:.3}),0,1.08,.13);g.userData.core=core;}
 return trimDraws(Object.assign(actor(g,body,legs,null,[],'orc'),core?{core}:{}));
}
const GIANTS={giant:{skin:'#b08a6a',cloth:'#6a5a40',weapon:'club',scale:1.1},'stone giant':{skin:'#8a867c',cloth:'#5a5650',hair:'#4a4642',weapon:'boulder',scale:1.14},'hill giant':{skin:'#a88060',cloth:'#5a6a3a',hair:'#5a3a22',beard:true,weapon:'club',skulls:true,scale:1.12},'fire giant':{skin:'#6a4234',cloth:'#3a2a24',hair:'fire',beard:true,armor:'#3a3436',boot:'#2a2424',weapon:'sword',glare:M.fire,cracked:true,scale:1.18},'frost giant':{skin:'#a8c0d0',cloth:'#4a5a6a',hair:'#eef2f4',beard:true,mantle:'#e2e2dc',ice:true,weapon:'axe',icicles:true,scale:1.18},ettin:{skin:'#8a7a6a',cloth:'#4a3a2a',hair:'#2a2420',twoHeads:true,weapon:'club',scale:1.18},'storm giant':{skin:'#9aa4b4',cloth:'#2e4a78',tunic:'#3d5f9a',hair:'#1e2230',beard:true,weapon:'spear',glare:M.electric,storm:true,scale:1.2},titan:{skin:'#d8b890',cloth:'#e8e0cc',hair:'#c9a23a',armor:'#a8883a',circlet:true,glare:M.eye,weapon:'spear',scars:true,scale:1.5},cyclops:{skin:'#9a7e62',cloth:'#4a3a2a',hair:'#2a221c',cyclops:true,weapon:'club',scale:1.3},'lord surtur':{skin:'#4a2e26',cloth:'#2a1e1c',hair:'fire',beard:true,armor:'#2a2426',boot:'#1e1a1a',weapon:'sword',blade:1.5,crown:true,glare:M.fire,scale:1.34}};
// vortices (v): a tapering funnel of tilted, offset swirl rings over a scuffed ground patch, with debris caught in the spiral; fog clouds are a low puffy bank instead
function vortex(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const s=o.scale||1;
 const glow=!!o.glow,swirl=new THREE.MeshStandardMaterial({color:o.color,emissive:glow?o.color:'#000000',emissiveIntensity:glow?1.4:0,transparent:true,opacity:o.opacity||.55,roughness:.6,depthWrite:false,side:THREE.DoubleSide});
 const ground=part(g,new THREE.CircleGeometry(.3*s,20),mat(shade(o.color,.45),{transparent:true,opacity:.4,depthWrite:false}),0,.012,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
 if(o.cloud){for(let i=0;i<9;i++){const a=i*2.4,r=i?.2*s:0;sphere(body,(.17-(i%3)*.025)*s,swirl,Math.cos(a)*r,(.3+(i%2)*.1)*s,Math.sin(a)*r,1.1,.75,1.1);}}
 else for(let i=0;i<7;i++){const t=i/6,ring=part(body,new THREE.TorusGeometry((.07+t*.22)*s,(.028+t*.02)*s,6,20),swirl,Math.sin(i*1.3)*.04*s,(.08+t*.72)*s,Math.cos(i*1.3)*.04*s);ring.rotation.x=Math.PI/2+Math.sin(i*1.9)*.22;ring.rotation.y=i*.7;ring.castShadow=false;}
 const debris=o.debris?mat(o.debris,glow?{emissive:o.debris,emissiveIntensity:3}:{}):null;
 if(debris)for(let i=0;i<8;i++){const t=i/7,a=i*2.2,r=(.1+t*.24)*s;const bit=o.shard?cone(body,.025*s,.08*s,debris,Math.cos(a)*r,(.12+t*.66)*s,Math.sin(a)*r,4):sphere(body,.022*s,debris,Math.cos(a)*r,(.12+t*.66)*s,Math.sin(a)*r);bit.rotation.set(a,a*.5,0);}
 let core=null;if(glow){core=sphere(body,.07*s,new THREE.MeshStandardMaterial({color:o.debris||o.color,emissive:o.debris||o.color,emissiveIntensity:4.5,roughness:.2}),0,.32*s,0,.8,1.6,.8);g.userData.core=core;}
 return Object.assign(actor(g,body,[],null,[],'hover'),core?{core}:{});
}
const VORTICES={'fog cloud':{color:'#b4b8bc',cloud:true,opacity:.6},'dust vortex':{color:'#9a7a52',debris:'#6a5038'},'ice vortex':{color:'#bfe6f4',debris:'#e8f8ff',shard:true,scale:1.2},'energy vortex':{color:'#4f8cff',debris:'#d8f0ff',glow:true,scale:1.25},'steam vortex':{color:'#d4dce4',opacity:.42,scale:1.25},'fire vortex':{color:'#ff7a28',debris:'#ffd24a',glow:true,scale:1.25}};
const WORMS={'baby long worm':{color:'#8a6440',baby:true,scale:.8},'long worm':{color:'#8a6440',scale:1.25},'baby purple worm':{color:'#8a3a9a',lip:'#c05a8a',baby:true,scale:.9},'purple worm':{color:'#8a3a9a',lip:'#c05a8a',scale:1.9,venom:true}};

// Smooth-body helpers: a lathed profile, and a tapered limb between two joint points
// (so arms and legs read as one body rather than a jointed mannequin).
function lathe(parent,profile,material,x=0,y=0,z=0,phiStart=0,phiLength=Math.PI*2){return part(parent,new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),24,phiStart,phiLength),material,x,y,z);}
function segment(parent,a,b,r1,r2,material){const A=new THREE.Vector3(...a),d=new THREE.Vector3(...b).sub(A),m=part(parent,new THREE.CylinderGeometry(r2,r1,d.length(),12),material,A.x+d.x/2,A.y+d.y/2,A.z+d.z/2);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
// Tear a lathed hem: vertices below `below` are pulled down unevenly around the circle.
function tatter(geo,below,depth,freq){
 const p=geo.attributes.position,v=new THREE.Vector3();let low=Infinity;
 for(let i=0;i<p.count;i++)low=Math.min(low,p.getY(i));
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(v.y>=below)continue;const phi=Math.atan2(v.x,v.z),k=(below-v.y)/(below-low||1);v.y-=Math.abs(Math.sin(phi*freq)+.6*Math.sin(phi*freq*2.3+1))*depth*k;p.setY(i,v.y);}
 geo.computeVertexNormals();return geo;
}
function tatteredLathe(parent,profile,material,phiStart,phiLength,below,depth,freq){return part(parent,tatter(new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),28,phiStart,phiLength),below,depth,freq),material);}
function nymphHair(parent,material,layer=0){
 // one flowing sheet from the crown: open at the front for the face, wider than deep so
 // it drapes over the shoulders, rippling more as it falls, with a ragged hem
 const grow=1+layer*.14,open=.95+layer*.35;
 const geo=new THREE.LatheGeometry([[.02,.115],[.07,.1],[.095,.05],[.102,0],[.108,-.06],[.14,-.14],[.165,-.22],[.17,-.32],[.165,-.44],[.15,-.56],[.13,-.64]].map(([r,h])=>new THREE.Vector2(r*grow,h*(1-layer*.15))),30,open,Math.PI*2-open*2);
 const p=geo.attributes.position,v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const phi=Math.atan2(v.x,v.z),fall=Math.min(1,Math.max(0,-v.y*2)),wave=1+(.08+layer*.05)*fall*Math.sin(phi*7+v.y*10+layer*2);v.x*=wave;v.z*=wave;if(v.y<-.46)v.y+=Math.sin(phi*11+layer)*.04*Math.min(1,-(v.y+.46)/.1);p.setXYZ(i,v.x,v.y,v.z);}
 geo.computeVertexNormals();
 const sheet=part(parent,geo,material);sheet.scale.set(1.14,1,.95);return sheet;
}
// A hand continuing its forearm: a flat palm, four fingers and a thumb.
function hand(parent,wrist,dir,side,skin){
 const h=new THREE.Group();h.position.set(...wrist);h.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(...dir).normalize());parent.add(h);
 rounded(h,.016,.05,.042,skin,0,-.026,0,.008);
 for(let f=0;f<4;f++)segment(h,[0,-.048,-.014+f*.0093],[side*-.004,-.083+Math.abs(f-1.5)*.004,-.012+f*.0085],.0055,.0042,skin);
 segment(h,[0,-.012,.02],[side*-.008,-.04,.034],.0065,.005,skin);
 return h;
}
// Nymphs: fae dancers who charm you and slip away with your things. A halter top tied at a
// jewelled choker, coins chiming under the bust and along a low belt, long sheer sashes front
// and back edged in gold with tassels, gold cuffs on her arms, wrists and ankles, a garter on
// one thigh, a sunburst crown over a top-knot and a gem hung on her brow. Weight on one hip,
// a hand hooked in her belt, half-lidded eyes over a sly smile; the other hand dangles the
// amulet she just stole. The hair is actor.tail, so it sways, and the 'nymph' quirk rolls
// her hips. Each kind has its own colours: wood (emerald), water (aquamarine), mountain
// (amethyst and silver).
function nymph(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const legs=[];
 const skin=mat(o.skin,{roughness:.42}),cloth=mat(o.cloth,{roughness:.6,side:THREE.DoubleSide}),trim=mat(o.trim||'#c9a24a',{roughness:.3,metalness:.7}),leather=mat(o.belt||'#2c3446',{roughness:.6});
 const sheer=mat(o.sheer||shade(o.cloth,1.7),{roughness:.5,side:THREE.DoubleSide,transparent:true,opacity:.62,depthWrite:false});
 const gemHex=o.gem||o.trim||'#2fae4a',gem=mat(gemHex,{emissive:gemHex,emissiveIntensity:.6,roughness:.15,metalness:.2});
 const hair=mat(o.hair,{roughness:.45,side:THREE.DoubleSide,emissive:o.glow||'#ff9a3a',emissiveIntensity:.18});
 const eye=o.eye||'#7a4a22',white=mat('#f3eee8',{roughness:.3}),iris=mat(eye,{emissive:eye,emissiveIntensity:.2,roughness:.2}),lash=mat(shade(o.hair,.4)),brow=mat(shade(o.hair,.65)),lips=mat(o.lips||'#c86a6a',{roughness:.3}),teeth=mat('#f6f2ea',{roughness:.3}),lid=mat(o.lid||shade(o.skin,.9),{roughness:.4});
 const ember=mat(o.glow||'#ffc46a',{emissive:o.glow||'#ffb040',emissiveIntensity:2.4});
 // an open gold band round a limb, from p toward q
 const cuff=(parent,p,q,r,h)=>{const A=new THREE.Vector3(...p),d=new THREE.Vector3(...q).sub(A).normalize(),m=part(parent,new THREE.CylinderGeometry(r,r*1.04,h,16,1,true),trim,A.x,A.y,A.z);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);return m;};
 const coin=(parent,x,y,z,ry=0,r=.0075)=>{const c=cylinder(parent,r,r,.002,trim,x,y,z,8);c.rotation.set(Math.PI/2,0,ry);return c;};
 // long bare legs in contrapposto: weight on her left, right knee bent onto its toes
 for(const side of [-1,1]){
  const bent=side<0,leg=new THREE.Group();leg.position.set(side*.06,.62,0);body.add(leg);legs.push(leg);
  const thigh=new THREE.Group();thigh.rotation.set(bent?-.3:0,0,bent?.09:.05);leg.add(thigh);
  segment(thigh,[0,.02,0],[0,-.3,0],.066,.04,skin);sphere(thigh,.04,skin,0,-.3,0);
  // a dark garter high on the standing thigh
  if(!bent){const garter=part(thigh,new THREE.TorusGeometry(.057,.006,5,20),leather,0,-.11,0);garter.rotation.x=Math.PI/2;}
  const knee=new THREE.Group();knee.position.y=-.3;knee.rotation.x=bent?.7:0;thigh.add(knee);
  segment(knee,[0,0,0],[0,-.27,0],.039,.021,skin);sphere(knee,.037,skin,0,-.085,-.009,.95,2,1);
  // a wide gold anklet with a bead hanging from it
  cuff(knee,[0,-.235,0],[0,-.2,0],.025,.034);sphere(knee,.006,trim,0,-.262,.026,.8,1.3,.6);
  const foot=new THREE.Group();foot.position.y=-.27;foot.rotation.x=bent?.45:0;knee.add(foot);
  sphere(foot,.021,skin);sphere(foot,.021,skin,0,-.024,-.012,.95,.75,1.1);sphere(foot,.024,skin,0,-.03,.03,.85,.5,1.55);
  for(let t=0;t<5;t++)sphere(foot,t===0?.0085:.0065-t*.0004,skin,(t-2)*.0085*-side,-.036,.068-Math.abs(t-1)*.004,1,.8,1.2);
 }
 // curvy torso, shoulders and bust
 lathe(body,[[0,.56],[.09,.58],[.122,.63],[.128,.68],[.115,.74],[.09,.81],[.083,.85],[.09,.9],[.1,.95],[.103,1],[.1,1.04],[.098,1.07],[.07,1.115],[.034,1.14],[0,1.15]],skin).scale.z=.78;
 for(const side of [-1,1]){sphere(body,.044,skin,side*.1,1.07,0,1.25,.85,.9);sphere(body,.054,skin,side*.046,.983,.05,1,.92,.86);}
 // the halter: a panel over each breast, its strap running up to the choker, gold-rimmed
 for(const side of [-1,1]){
  const panel=part(body,new THREE.SphereGeometry(.062,14,10,0,Math.PI*2,0,Math.PI*.55),cloth,side*.047,.983,.05);panel.scale.set(1.02,1.04,.9);panel.rotation.set(Math.PI/2,0,-side*.12);
  const rim=part(body,new THREE.TorusGeometry(.061,.003,4,24),trim,side*.047,.983,.041);rim.scale.set(1.02,1.04,1);rim.rotation.z=-side*.12;
  segment(body,[side*.035,1.02,.08],[side*.016,1.155,.026],.011,.006,cloth);
 }
 // the choker: a dark band at the throat with a gem in a gold setting
 const choker=part(body,new THREE.TorusGeometry(.034,.0055,5,20),leather,0,1.165,.004);choker.rotation.x=Math.PI/2;
 const set=part(body,new THREE.SphereGeometry(.011,4,2),trim,0,1.158,.04);set.scale.set(.9,1.3,.5);sphere(body,.0065,gem,0,1.156,.044,1,1.3,.6);
 // under the bust a chain band with coins hanging along the front
 const band=part(body,new THREE.TorusGeometry(.098,.004,4,28),trim,0,.928,0);band.rotation.x=Math.PI/2;band.scale.set(1,.8,1);
 for(let i=0;i<9;i++){const a=-1.2+i*.3;coin(body,Math.sin(a)*.1,.913-(i%2)*.006,Math.cos(a)*.08+.002,-a);}
 // a low studded belt riding on the hips, tilted down toward the bent leg, fringed with
 // coins, a gold medallion and a gem at the front
 const belt=part(body,new THREE.TorusGeometry(.128,.011,6,32),leather,0,.685,0);belt.rotation.set(Math.PI/2,-.09,0);belt.scale.set(1,.82,1);
 for(let i=0;i<13;i++){const a=-1.5+i*.25;if(Math.abs(a)<.2)continue;coin(body,Math.sin(a)*.137,.667+Math.sin(a)*.011-(i%2)*.007,Math.cos(a)*.137*.82+.003,-a,.0085);}
 const medal=part(body,new THREE.SphereGeometry(.024,4,2),trim,0,.682,.112);medal.scale.set(1.2,.9,.35);sphere(body,.011,gem,0,.682,.12,1,1,.6);
 // a narrow brief under the belt, then long sheer sashes front and back to the shins, their
 // edges trimmed in gold and a gold bead and tassels at each point
 lathe(body,[[.123,.675],[.12,.64],[.1,.6],[.06,.57],[0,.555]],cloth,0,0,0,-.62,1.24).scale.z=.8;
 lathe(body,[[.123,.675],[.12,.64],[.1,.6],[.06,.57],[0,.555]],cloth,0,0,0,Math.PI-.7,1.4).scale.z=.8;
 const SASH=[[.132,.69],[.14,.6],[.148,.5],[.156,.4],[.164,.3],[.172,.2]];
 for(const [start,width,back] of [[-.42,.84,0],[Math.PI-.5,1,1]]){
  tatteredLathe(body,SASH,sheer,start,width,.28,.05,6).scale.z=.84;
  for(const a of [start,start+width]){const top=SASH[0],low=SASH[5];segment(body,[Math.sin(a)*top[0],top[1]-.02,Math.cos(a)*top[0]*.84],[Math.sin(a)*low[0],low[1]+.01,Math.cos(a)*low[0]*.84],.0028,.0028,trim);}
  const mid=start+width/2,r=.176,x=Math.sin(mid)*r,z=Math.cos(mid)*r*.84;
  sphere(body,.012,trim,x,.19,z);
  for(const dx of [-.012,0,.012])cone(body,.005,.03,trim,x+dx*Math.cos(mid),.165-Math.abs(dx)*.5,z-dx*Math.sin(mid),5).rotation.x=Math.PI;
  if(back)cone(body,.004,.02,trim,x,.205,z,5);
 }
 // neck and face: half-lidded eyes over a sly smile, long pointed ears
 segment(body,[0,1.13,0],[0,1.235,.005],.037,.03,skin);
 const head=new THREE.Group();head.position.set(0,1.28,.005);head.rotation.set(.02,.1,.09);body.add(head);
 sphere(head,.08,skin,0,.025,-.004,.9,1.02,.98);sphere(head,.058,skin,0,-.03,.026,.82,.92,.88);
 const nose=cone(head,.01,.026,skin,0,-.008,.082,6);nose.rotation.x=Math.PI/2-.3;
 sphere(head,.012,teeth,0,-.048,.073,1.45,.4,.5);
 const smile=part(head,new THREE.TorusGeometry(.018,.004,5,12,Math.PI*.9),lips,0,-.044,.074);smile.rotation.z=Math.PI+Math.PI*.05;smile.scale.set(1,.55,.8);smile.rotation.y=.12;
 sphere(head,.011,lips,0,-.04,.075,1.5,.35,.6);
 for(const side of [-1,1]){
  sphere(head,.013,white,side*.03,.008,.068,1.5,.8,.5);sphere(head,.0078,iris,side*.03,.006,.074,1,1,.5);
  // a heavy, shadowed upper lid drawn half down over the eye
  const upper=part(head,new THREE.SphereGeometry(.0142,12,6,0,Math.PI*2,0,Math.PI*.5),lid,side*.03,.006,.0705);upper.scale.set(1.5,.85,.62);upper.rotation.x=.35;
  rounded(head,.034,.005,.008,lash,side*.03,.012,.075,.002).rotation.z=side*.2;
  rounded(head,.03,.004,.008,brow,side*.031,.043,.071,.002).rotation.z=side*.22;
  sphere(head,.012,mat(shade(o.skin,.93)),side*.045,-.022,.058,1.3,.8,.5);
  cone(head,.013,.1,skin,side*.08,.02,-.015,5).rotation.set(-.3,0,-side*1.1);
 }
 // long, full hair with a warm rim glow: a cap, bangs, a top-knot and two flowing layers that sway
 sphere(head,.087,hair,0,.042,-.024);sphere(head,.055,hair,.02,.076,.045,1.3,.42,.7).rotation.z=.3;
 sphere(head,.036,hair,0,.115,-.06,1,.9,1);
 const locks=new THREE.Group();locks.position.set(0,.02,-.02);head.add(locks);nymphHair(locks,hair,0);nymphHair(locks,hair,1);
 // the sunburst crown fanned behind the top-knot, a gold circlet and a gem hung on her brow
 for(let i=0;i<9;i++){const a=(i-4)*.26,len=.06+(i%2?0:.035),ray=cone(head,.0055,len,trim,Math.sin(a)*(.03+len/2),.12+Math.cos(a)*(.03+len/2),-.075,4);ray.rotation.set(-.25,0,-a);}
 const crown=part(head,new THREE.TorusGeometry(.03,.004,4,16),trim,0,.12,-.075);crown.rotation.x=-.25;
 const circlet=part(head,new THREE.TorusGeometry(.086,.0035,4,28),trim,0,.058,-.006);circlet.rotation.x=Math.PI/2-.2;circlet.scale.set(.92,1,1);
 const browSet=part(head,new THREE.SphereGeometry(.012,4,2),trim,0,.05,.083);browSet.scale.set(.9,1.4,.45);sphere(head,.0075,gem,0,.047,.087,.9,1.4,.6);
 // arms in gold cuffs: her left hooks the belt, her right hangs loose and dangles the stolen amulet
 // (the belt arm hangs from a shoulder pivot and the amulet from her fingertips, so nymph-beckon.js can move them)
 const arm=new THREE.Group();arm.position.set(.118,1.07,0);body.add(arm);let beckonHand;
 {const at=v=>[v[0]-.118,v[1]-1.07,v[2]],S=[0,0,0],E=at([.24,.88,-.03]),W=at([.13,.735,.09]);segment(arm,S,E,.031,.025,skin);sphere(arm,.025,skin,...E);segment(arm,E,W,.024,.017,skin);cuff(arm,at([.2,.95,-.02]),E,.03,.035);cuff(arm,at([.15,.765,.065]),W,.02,.026);beckonHand=hand(arm,W,[-.07,-.05,.05],1,skin);}
 let bauble,baubleGem;
 {const S=[-.118,1.07,0],E=[-.17,.845,-.04],W=[-.2,.63,0];segment(body,S,E,.031,.025,skin);sphere(body,.025,skin,...E);segment(body,E,W,.024,.017,skin);cuff(body,[-.152,.92,-.025],E,.03,.035);cuff(body,[-.195,.67,-.01],W,.02,.026);hand(body,W,[-.01,-1,.02],-1,skin);
  const tip=[-.204,.545,.006];bauble=new THREE.Group();bauble.position.set(...tip);body.add(bauble);tube(bauble,[[0,0,0],[.004,-.05,0],[0,-.1,0]],.003,M.gold,6);
  const amulet=cylinder(bauble,.028,.028,.008,M.gold,0,-.13,0,16);amulet.rotation.x=Math.PI/2;baubleGem=sphere(bauble,.012,mat('#d9344a',{emissive:'#d9344a',emissiveIntensity:1.4}),0,-.13,.006);}
 // motes drifting around her
 // (on one ring, so they stay a single draw and nymph-beckon.js can turn it)
 const motes=new THREE.Group();body.add(motes);for(const [x,y,z] of [[.32,1.05,.1],[-.3,.78,.16],[.16,1.48,-.08],[-.22,1.25,.12]])sphere(motes,.011,ember,x,y,z);
 return trimDraws(Object.assign(actor(g,body,legs,locks,[],'nymph'),{head,beckonArm:arm,beckonHand,bauble,baubleGem,motes,nymph:true}));
}
const NYMPHS={
 'wood nymph':{skin:'#f2d4c2',cloth:'#2c5a2e',sheer:'#5a9a52',trim:'#d4a845',belt:'#1c2420',hair:'#3a5a2e',glow:'#8ad86a',eye:'#5a4aa0',lips:'#c86a72',gem:'#2fbf55',lid:'#7f9a5e'},
 'water nymph':{skin:'#f0d2c0',cloth:'#1e4e64',sheer:'#4a9ab4',trim:'#d6b04a',belt:'#1a2834',hair:'#2e6e78',glow:'#6fd8ff',eye:'#2a5a8a',lips:'#cc6c74',gem:'#3fc4ea',lid:'#5f8ea2'},
 'mountain nymph':{skin:'#f3d4bb',cloth:'#3e2a54',sheer:'#8a64ae',trim:'#cfc8e4',belt:'#241c2c',hair:'#241a16',glow:'#b07aff',eye:'#5a3a7a',lips:'#b05c6a',gem:'#a862ea',lid:'#7a5a8c'},
};

// Trolls: hunched, long-armed brutes whose knuckles nearly drag, with a drooping nose, tusks and a ragged mane.
function troll(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const skin=mat(o.skin,{roughness:.8}),dark=mat(shade(o.skin,.7),{roughness:.9}),wart=mat(shade(o.skin,.55),{roughness:.95}),hair=mat(o.hair||'#2a2a22',{roughness:1}),tusk=mat('#e2d8b8',{roughness:.5}),cloth=mat(o.cloth||'#5a4630',{roughness:.97});
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.12,.36,-.04);body.add(leg);const thigh=rounded(leg,.12,.24,.13,skin,side*.02,-.1,0,.05);thigh.rotation.z=side*.18;rounded(leg,.1,.16,.11,skin,side*.04,-.26,.02,.04);rounded(leg,.16,.06,.22,dark,side*.05,-.34,.06,.025);for(let k=-1;k<=1;k++)cone(leg,.014,.04,tusk,side*.05+k*.045,-.35,.18,4).rotation.x=Math.PI/2;legs.push(leg);}
 cylinder(body,.17,.22,.18,cloth,0,.4,-.02,8);
 const torso=sphere(body,.23,skin,0,.66,.02,1.1,1.15,.9);torso.rotation.x=.45;sphere(body,.15,dark,0,.56,.12,1.05,.95,.55);
 for(const [x,y,z] of [[-.12,.72,.17],[.09,.64,.2],[.16,.78,.1],[-.05,.82,.14]])sphere(body,.022,wart,x,y,z);
 for(let i=0;i<5;i++){const spike=cone(body,.04,.13,hair,(i%2?.04:-.04),.98-i*.08,-.06-i*.045,4);spike.rotation.x=-1.1-i*.12;}
 // plain trolls: a filthy cord of knucklebones and fangs, strung from past kills, hangs across the chest
 if(o.trophy){const bone=mat('#d8ccaa',{roughness:.7}),cord=mat('#2a2018',{roughness:1});g.userData.trophied=true;part(body,new THREE.TorusGeometry(.17,.008,4,14,Math.PI),cord,0,.8,.1).rotation.set(.2,0,Math.PI);for(let i=0;i<5;i++){const t=(i-2)*.5,x=Math.sin(t)*.17,y=.8-Math.cos(t)*.17+.17-.02,f=cone(body,.012,.05,bone,x,y-.02,.11+Math.abs(t)*.01,4);f.rotation.x=Math.PI;}}
 // rock trolls: seams of dull magma glow between the stone plates, as if the creature were still cooling
 if(o.rock){const vein=mat('#ff8a3a',{emissive:'#d04a0c',emissiveIntensity:1.8,roughness:.5});g.userData.veined=true;for(const [x,y,z,rz] of [[-.08,.66,.228,.5],[.1,.74,.212,-.6],[0,.55,.222,.1]]){const v=rounded(body,.012,.13,.01,vein,x,y,z,.004);v.rotation.z=rz;}}
 if(o.rock)for(const side of [-1,1]){const plate=part(body,new THREE.DodecahedronGeometry(.085,0),mat(shade(o.skin,.85),{roughness:1}),side*.19,.86,-.03);plate.rotation.set(.5,side*.4,.3);}
 // water trolls: a spine of sharp grey barnacle shells crusts the drowned back
 if(o.fin){const shell=mat('#8a9690',{roughness:.95});g.userData.barnacled=true;for(let i=0;i<5;i++){const c=cone(body,.028-i*.002,.09,shell,(i%2?.05:-.05),.86-i*.08,-.17-i*.03,5);c.rotation.x=-.9;}}
 if(o.ice)for(const side of [-1,1])for(const k of [0,1]){const shard=cone(body,.03,.15,mat('#d8f2fc',{roughness:.12,transparent:true,opacity:.85}),side*(.1+k*.07),.9-k*.06,-.1,4);shard.rotation.set(-.5,0,-side*(.4+k*.35));}
 if(o.armor)for(const side of [-1,1]){const pad=sphere(body,.1,mat(o.armor,{roughness:.4,metalness:.65}),side*.22,.88,.02,1.1,.65,1.1);pad.rotation.z=side*.3;}
 const head=new THREE.Group();head.position.set(0,.92,.21);body.add(head);
 sphere(head,.11,skin,0,0,0,1,.95,1.05);
 // olog-hai: a black iron helm with a nose-guard and swept horns, and war-paint gashed across the brow
 if(o.helm){const iron=mat('#26282a',{roughness:.4,metalness:.75});g.userData.helmed=true;sphere(head,.118,iron,0,.04,-.015,1,.6,1.05);rounded(head,.025,.11,.02,iron,0,-.01,.108,.006);for(const side of [-1,1]){const horn=cone(head,.022,.15,iron,side*.1,.08,-.01,5);horn.rotation.z=-side*1.0;horn.rotation.x=-.2;}for(const side of [-1,1])rounded(head,.05,.012,.01,mat('#8a1a14',{roughness:1}),side*.05,.012,.1,.004).rotation.z=side*.5;}rounded(head,.19,.04,.06,dark,0,.04,.08,.015);
 const snout=cone(head,.035,.13,dark,0,-.03,.14,7);snout.rotation.x=Math.PI/2+.7;
 sphere(head,.08,skin,0,-.07,.05,1.15,.7,1);for(const side of [-1,1]){const t=cone(head,.013,.06,tusk,side*.045,-.07,.11,5);t.rotation.x=-.2;}
 // ice trolls: long clear icicle fangs hang past the jaw
 if(o.rime){const clear=mat('#d8f2fc',{roughness:.12,transparent:true,opacity:.85});g.userData.rimed=true;for(const side of [-1,1]){const f=cone(head,.016,.12,clear,side*.05,-.13,.115,5);f.rotation.x=Math.PI;}}
 for(const side of [-1,1]){const ear=cone(head,.03,.12,skin,side*.12,.02,-.02,4);ear.rotation.z=-side*1.25;ear.rotation.y=side*.3;}
 const mane=sphere(head,.1,hair,0,.06,-.05,1.05,.7,1.1);mane.rotation.x=.3;
 if(o.fin){const fin=part(head,new THREE.CylinderGeometry(.13,.13,.012,10,1,false,0,Math.PI),mat(shade(o.skin,1.25),{roughness:.5,transparent:true,opacity:.85}),0,.08,-.06);fin.rotation.set(0,Math.PI/2,Math.PI/2);}
 eyes(head,o.glare?M.eye:mat(o.eye||'#e8d040',{emissive:o.eye||'#a08a10',emissiveIntensity:.8,roughness:.3}),.015,.095,.042);
 const arms=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.25,.84,.06);body.add(arm);arms.push(arm);rounded(arm,.11,.32,.12,skin,0,-.15,0,.045);rounded(arm,.1,.34,.11,skin,0,-.46,.03,.04).rotation.x=-.12;sphere(arm,.075,dark,0,-.66,.06,1.1,.8,1.2);for(let k=-1;k<=1;k++)cone(arm,.012,.05,tusk,k*.03,-.69,.14,4).rotation.x=Math.PI/2;arm.rotation.x=-.28;arm.rotation.z=side*.1;}
 if(o.club){const club=cylinder(body,.07,.028,.44,mat('#4a3420',{roughness:.9}),.3,.22,.24,7);club.rotation.x=.5;if(o.armor)for(let i=0;i<3;i++)cone(body,.02,.05,M.darkSteel,.3+(i-1)*.05,.37,.33,4).rotation.x=.5;}
 // handles for troll-knit.js: the head and both arms, and which troll it is
 return trimDraws({...actor(g,body,legs,null,[],'orc'),head,arms,arm:arms[1],troll:o.kind||'troll'});
}
const TROLLS={troll:{skin:'#5f7a4a',hair:'#2a3020',trophy:true,scale:1.35},'ice troll':{skin:'#b8d0dc',hair:'#eef4f6',cloth:'#6a7a86',ice:true,rime:true,eye:'#8ad8ff',scale:1.35},'rock troll':{skin:'#7a746a',hair:'#3a3630',rock:true,club:true,scale:1.35},'water troll':{skin:'#3f6f78',hair:'#2f5a3a',cloth:'#2a4a4a',fin:true,eye:'#9af0c0',scale:1.22},'olog-hai':{skin:'#34362f',hair:'#141412',cloth:'#2a2420',armor:'#3a3e40',club:true,glare:true,helm:true,scale:1.4}};

// Ogres (O): a squat, pot-bellied brute with a heavy underbite, a greasy topknot, a hide loincloth and a nail-studded club;
// ogre lords add a bronze helm and pauldrons, ogre kings a spiked crown, a fur mantle and a bigger club.
function ogre(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const skin=mat(o.skin,{roughness:.82}),dark=mat(shade(o.skin,.72),{roughness:.9}),hide=mat(o.hide||'#6a4a2c',{roughness:.97}),hair=mat(o.hair||'#1e1812',{roughness:1}),tusk=mat('#e6dcbc',{roughness:.5}),wood=mat('#553a22',{roughness:.88});
 const metal=o.metal?mat(o.metal,{roughness:.35,metalness:.7}):null;
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.13,.34,0);body.add(leg);rounded(leg,.15,.22,.15,skin,0,-.1,0,.06);rounded(leg,.13,.12,.14,skin,0,-.25,.01,.05);rounded(leg,.17,.06,.22,dark,0,-.31,.05,.025);legs.push(leg);}
 cylinder(body,.22,.26,.2,hide,0,.38,0,9);rounded(body,.46,.05,.3,M.leather,0,.47,0,.02);
 sphere(body,.25,skin,0,.64,.03,1.15,1,1);sphere(body,.17,mat(shade(o.skin,1.12),{roughness:.8}),0,.6,.13,1.05,.95,.6);sphere(body,.016,dark,0,.6,.23);
 rounded(body,.48,.2,.3,skin,0,.86,-.01,.09);
 for(const side of [-1,1]){if(metal){const pad=sphere(body,.11,metal,side*.24,.92,0,1.1,.6,1.1);pad.rotation.z=side*.35;}else sphere(body,.1,skin,side*.23,.9,0,1,.85,1);}
 if(o.mantle){sphere(body,.24,mat(o.mantle,{roughness:1}),0,.93,-.04,1.25,.42,1.05);rounded(body,.44,.4,.04,mat(o.cape||'#6a1f24',{roughness:.9}),0,.66,-.2,.02);}
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.29,.9,.02);body.add(arm);rounded(arm,.13,.24,.13,skin,0,-.12,0,.05);rounded(arm,.12,.22,.12,skin,0,-.33,.02,.045);sphere(arm,.08,dark,0,-.47,.03,1.1,.9,1.1);arm.rotation.z=side*.12;arm.rotation.x=side>0?-.4:-.1;}
 const head=new THREE.Group();head.position.set(0,1.02,.07);body.add(head);
 sphere(head,.13,skin,0,0,0,1.1,.95,1);rounded(head,.22,.045,.07,dark,0,.045,.09,.02);sphere(head,.035,dark,0,-.005,.13,1.1,.9,1);
 sphere(head,.1,skin,0,-.08,.05,1.2,.65,1.05);for(const side of [-1,1]){const t=cone(head,.016,.07,tusk,side*.055,-.06,.13,5);t.rotation.x=-.15;sphere(head,.035,skin,side*.14,.0,-.01,.5,.9,.8);}
 if(o.crown){const band=cylinder(head,.125,.13,.06,M.gold,0,.1,-.01,10);band.castShadow=false;for(let i=0;i<5;i++){const a=i/5*Math.PI*2;cone(head,.022,.07,M.gold,Math.sin(a)*.12,.16,Math.cos(a)*.12-.01,4);}sphere(head,.02,mat('#c0202a',{roughness:.2,metalness:.3}),0,.1,.125);}
 else if(metal){sphere(head,.135,metal,0,.04,-.01,1.1,.7,1.05);rounded(head,.03,.1,.03,metal,0,.02,.13,.01);}
 else{sphere(head,.1,hair,0,.07,-.04,1.05,.55,1);const knot=sphere(head,.04,hair,0,.15,-.06,1,1.3,1);knot.rotation.x=-.3;}
 eyes(head,o.glare?M.eye:mat('#d8c048',{emissive:'#7a6010',emissiveIntensity:.7,roughness:.3}),.015,.115,.05);
 const clubL=o.bigClub?.55:.46,club=cylinder(body,o.bigClub?.085:.07,.03,clubL,wood,.33,.4,.2,7);club.rotation.x=.55;
 for(let i=0;i<(o.bigClub?5:3);i++){const a=i*2.1,nail=cone(body,.016,.05,metal||M.darkSteel,.33+Math.cos(a)*.07,.56+(i%2)*.04,.29+Math.sin(a)*.03,4);nail.rotation.set(.55+Math.sin(a),0,Math.cos(a));}
 return trimDraws(actor(g,body,legs,null,[],'orc'));
}
const OGRES={ogre:{skin:'#9a7a52',hair:'#2a1e14',scale:1},'ogre lord':{skin:'#8a6a48',hide:'#4a3a2a',metal:'#a0703a',scale:1.15},'ogre king':{skin:'#7e5e40',hide:'#3a2a1e',metal:'#b9954d',crown:true,mantle:'#d8ccb4',cape:'#6a1f5a',bigClub:true,glare:true,scale:1.32}};

// Generic guardian, kept as the last resort but tinted by the monster's glyph colour.
// Liches: a gaunt, robed skeleton with a bare skull, burning eye sockets and a staff topped by a glowing orb.
// Demiliches are more tattered, master liches add a bone crown, arch-liches a taller spiked crown and a shoulder mantle.
function lich(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const bone=mat(o.bone||'#d8d0b8',{roughness:.7}),robe=mat(o.robe,{roughness:.9}),trim=mat(shade(o.robe,.5),{roughness:.85}),glow=mat(o.glow,{emissive:o.glow,emissiveIntensity:2.6,roughness:.3}),socket=mat('#141012',{roughness:.6});
 cylinder(body,.17,.32,.7,robe,0,.35,0,12);
 // ragged hem: alternating dark tatters hang below the robe
 for(let i=0;i<(o.tattered?10:7);i++){const a=i/(o.tattered?10:7)*Math.PI*2,t=cone(body,.05,.14+(i%2)*.06,trim,Math.sin(a)*.31,.1,Math.cos(a)*.31,4);t.rotation.x=Math.PI;}
 rounded(body,.34,.32,.24,robe,0,.82,0,.06);
 // layered regal robes: an open overrobe panel down the front edged in dark trim, and a long ragged train trailing behind
 rounded(body,.16,.62,.03,trim,0,.38,.3,.01);
 for(const x of [-1,1])rounded(body,.02,.6,.035,mat(o.glow,{emissive:o.glow,emissiveIntensity:.6,roughness:.5}),x*.085,.38,.31,.005);
 const train=cone(body,.2,.55,robe,0,.12,-.42,5);train.rotation.x=-1.45;
 for(const x of [-.09,.09]){const t=cone(body,.04,.2,trim,x,.04,-.62,4);t.rotation.x=-1.5;}
 const hood=sphere(body,.24,trim,0,1.1,-.06,1,1.05,1);hood.scale.z=1.05;
 // finer robes per tier (finery 1 demilich, 2 master lich, 3 arch-lich): a gilt hem band, a gorget at the neck, glowing runes down the overrobe
 if(o.finery){const gilt=o.finery>2?M.gold:M.darkSteel;cylinder(body,.318,.325,.03,gilt,0,.2,0,14);
  if(o.finery>1){cylinder(body,.2,.24,.04,gilt,0,.97,0,12);for(const x of [-.1,0,.1])cone(body,.018,.06,gilt,x,.99,.2,4).rotation.x=Math.PI/2;}
  const rune=mat(o.glow,{emissive:o.glow,emissiveIntensity:2,roughness:.4});for(let i=0;i<o.finery+1;i++){const r=sphere(body,.014,rune,0,.6-i*.12,.318);r.castShadow=false;}}
 // skull: cranium, cheekbones, dark sockets with a glow deep inside, a toothed jaw
 sphere(body,.15,bone,0,1.11,.04,.82,1.08,.98);
 // elven cast: high cheekbones, a narrow brow ridge and long swept-back pointed ears
 for(const x of [-1,1]){sphere(body,.032,bone,x*.088,1.075,.14,1,.7,.8);const ear=cone(body,.022,.15,bone,x*.135,1.15,.01,4);ear.rotation.z=-x*1.15;ear.rotation.x=-.25;}
 rounded(body,.15,.02,.05,bone,0,1.15,.17,.01);
 for(const x of [-.06,.06]){sphere(body,.042,socket,x,1.11,.165,1,1,.5);sphere(body,.02,glow,x,1.11,.18);}
 cone(body,.02,.04,socket,0,1.05,.19,3).rotation.x=Math.PI;
 // the jaw and its teeth hinge under the ears, so it chatters like the skeleton's (jaw.js)
 const jaw=new THREE.Group();jaw.position.set(0,1.04,.03);body.add(jaw);jaw.userData.chatter=true;jaw.userData.reach=.45;
 rounded(jaw,.12,.06,.1,bone,0,-.05,.07,.03);
 cone(jaw,.03,.07,bone,0,-.085,.11,4).rotation.x=Math.PI*.9;
 for(let i=0;i<5;i++)rounded(jaw,.018,.025,.015,bone,(i-2)*.024,-.065,.125,.004);
 // skeletal arms: thin bone forearms and claw fingers poking out of wide sleeves
 // Each claw finger hangs from its own knuckle, so lich-chill.js can flex it (handles: lichHands, orb).
 const lichHands=[];
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.22,.93,0);body.add(arm);cylinder(arm,.06,.1,.3,robe,0,-.14,0,8);cylinder(arm,.018,.018,.16,bone,0,-.34,.02,6);const fingers=[];for(const f of [-.025,0,.025]){const k=new THREE.Group();k.position.set(f,-.405,.03);arm.add(k);cone(k,.008,.15,bone,0,-.075,0,4).rotation.x=Math.PI;sphere(k,.011,bone,0,-.04,0);fingers.push(k);}arm.rotation.z=side*.16;arm.rotation.x=side<0?-.55:-.2;lichHands.push({side,arm,fingers});}
 // staff held out on the right, orb glowing in the lich's colour
 const staff=rounded(body,.035,1.15,.035,M.leather,.34,.66,.16,.01);staff.rotation.z=-.06;
 // the staff is topped with a small skull whose sockets glow in the lich's colour; the orb rides in its brow (lich-chill.js flexes it)
 const sk=new THREE.Group();sk.position.set(.37,1.27,.16);body.add(sk);sk.rotation.z=-.06;
 sphere(sk,.05,bone,0,.03,0,.85,1,.95);rounded(sk,.04,.03,.045,bone,0,-.03,.015,.01);
 for(const x of [-.02,.02])sphere(sk,.014,glow,x,.03,.042,1,1,.6);
 const orb=sphere(sk,.026,glow,0,.1,.02);
 // a plain lich and a demilich wear a thin circlet with a glowing stone; higher tiers wear the crowns below
 if(!o.crown){cylinder(body,.152,.152,.018,o.evil?M.gold:M.darkSteel,0,1.2,.02,12);cone(body,.016,.06,o.evil?M.gold:M.darkSteel,0,1.24,.17,4);sphere(body,.02,glow,0,1.2,.17);}
 // master and arch-lich crowns: a band of upswept points alternating tall and short and raked back like thorns, a glowing gem on each tall tip;
 // the arch-lich's is gilt with more points, a high central spire and a hanging brow stone
 if(o.crown){const arch=o.crown==='tall',n=arch?9:5,metal=arch?M.gold:bone,jewel=mat(o.glow,{emissive:o.glow,emissiveIntensity:3,roughness:.2});cylinder(body,.155,.165,.05,metal,0,1.21,.02,12);
  for(let i=0;i<n;i++){const a=(i/(n-1)-.5)*Math.PI*1.3,tall=i%2===0,h=(arch?.12:.08)+(tall?(arch?.08:.06):0),mid=i===(n-1)/2&&arch,H=mid?.3:h,k=cone(body,.02,H,metal,Math.sin(a)*.155,1.26+H/2-.02,.02+Math.cos(a)*.155-.02,4);k.rotation.x=-.25;k.rotation.z=-Math.sin(a)*.2;
   if(tall){const gem=sphere(body,.011,jewel,Math.sin(a)*.155,1.26+H-.01,.02+Math.cos(a)*.155-.07);gem.castShadow=false;}}
  sphere(body,.026,glow,0,1.22,.18);if(arch)cone(body,.014,.05,M.gold,0,1.17,.19,4).rotation.x=Math.PI;}
 // master and arch-lich: a broken ring of cold light stands behind the skull, the arch-lich's doubled
 if(o.finery>1){for(let i=0;i<o.finery-1;i++){const ring=part(body,new THREE.TorusGeometry(.27+i*.07,.01,5,20,Math.PI*1.7),glow,0,1.13,-.2-i*.02);ring.rotation.z=.5+i;ring.castShadow=false;}}
 if(o.mantle){for(const side of [-1,1]){const spike=cone(body,.05,.22,bone,side*.24,1.02,-.04,5);spike.rotation.z=-side*.9;}rounded(body,.46,.08,.3,trim,0,.97,-.02,.03);}
 // evil glow (demiliches and above): a pool of necrotic light under the hem, and cold soul-flames licking up off the shoulders
 if(o.evil){const pool=mat(o.glow,{emissive:o.glow,emissiveIntensity:1.2,transparent:true,opacity:.15,depthWrite:false}),flame=mat(o.glow,{emissive:o.glow,emissiveIntensity:2.4,roughness:.4});pool.name=flame.name='evil-glow';
  const p=cylinder(g,.4,.46,.004,pool,0,.004,0,24);p.userData.ring=true;p.castShadow=false;p.receiveShadow=false;
  for(const [x,y,z,h,r] of [[-.25,1.0,-.05,.2,.3],[.25,1.0,-.05,.24,-.3],[0,1.0,-.2,.28,0]]){const f=cone(body,.035,h,flame,x,y+h/2,z,5);f.rotation.z=r;f.castShadow=false;}}
 return trimDraws(Object.assign(actor(g,body,[],null,[],'idle'),{jaw,lichHands,orb}));
}
const LICHES={lich:{robe:'#5a4430',glow:'#8ad060',scale:1.08},demilich:{robe:'#6a2a24',glow:'#ff5a3a',evil:true,bone:'#c8bc98',tattered:true,finery:1,scale:1.1},'master lich':{robe:'#4a1f52',glow:'#c070ff',evil:true,crown:'bone',finery:2,scale:1.12},'arch-lich':{robe:'#2a1438',glow:'#6ad8ff',bone:'#e4e0d4',evil:true,crown:'tall',mantle:true,finery:3,scale:1.25}};

// Wraiths: a floating, translucent shroud that trails off into wisps, a hood with only a void and two burning eyes inside,
// and long sleeves reaching forward with bony claws. Barrow wights are solid, with a rusty circlet and a sword;
// Nazgul are black-robed with a silver crown floating over the empty hood.
function wraith(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const robe=new THREE.MeshStandardMaterial({color:o.robe,roughness:.9,transparent:!o.solid,opacity:o.solid?1:.82,emissive:o.robe,emissiveIntensity:o.solid?0:.12}),
  trim=mat(shade(o.robe,.55),{roughness:.9}),void_=mat('#060508',{roughness:1}),glow=mat(o.glow,{emissive:o.glow,emissiveIntensity:3,roughness:.3}),claw=mat(o.bone||'#bdb6a4',{roughness:.7});
 // tapering shroud, widest at the shoulders; wisps trail down from its hem
 cylinder(body,.2,.07,.62,robe,0,.62,0,12);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,t=cone(body,.045,.16+(i%3)*.05,robe,Math.sin(a)*.1,.26-(i%3)*.02,Math.cos(a)*.1,4);t.rotation.x=Math.PI;t.rotation.z=Math.sin(a)*.35;}
 rounded(body,.4,.16,.26,robe,0,.9,0,.06);
 // hood: an outer cowl, a darker rim and a void where the face should be
 // The hood (with its eyes and any circlet or crown) turns on its own pivot, and the eyes sit in their
 // own group, so wraith-pull.js can turn the head and flare the eyes (handles: head, eyes).
 const head=new THREE.Group();head.position.set(0,1.07,0);body.add(head);const H=1.07;
 sphere(head,.2,robe,0,1.1-H,-.02,1,1.12,1);cylinder(head,.14,.15,.05,trim,0,0,.12).rotation.x=Math.PI/2;
 sphere(head,.13,void_,0,0,.07,1,1.1,.9);
 const eyeGroup=new THREE.Group();eyeGroup.position.set(0,1.09-H,.17);eyeGroup.userData.part='eyes';head.add(eyeGroup);
 for(const x of [-.05,.05])sphere(eyeGroup,.024,glow,x,0,0,1.2,.7,.6);
 // sleeves reach forward, ending in thin clawed fingers; each claw hangs from its own knuckle so it can flex (handles: arms, claws)
 const arms=[],claws=[];
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.2,.92,.02);body.add(arm);cylinder(arm,.05,.09,.34,robe,0,-.15,0,8);const fingers=[];for(const f of [-.03,0,.03]){const k=new THREE.Group();k.position.set(f,-.315,.02);arm.add(k);cone(k,.011,.11,claw,0,-.055,0,4).rotation.x=Math.PI;fingers.push(k);}arm.rotation.x=-1.05;arm.rotation.z=side*.12;arms.push(arm);claws.push(fingers);}
 if(o.circlet){cylinder(head,.17,.18,.04,mat('#7a5a34',{roughness:.6,metalness:.5}),0,1.2-H,-.01,12);sphere(head,.022,glow,0,1.2-H,.17);}
 if(o.crown){const silver=mat('#c8ccd4',{roughness:.25,metalness:.9});cylinder(head,.16,.17,.05,silver,0,1.26-H,-.01,12);for(let i=0;i<7;i++){const a=(i/7-.5)*Math.PI*1.4;cone(head,.018,.1,silver,Math.sin(a)*.16,1.32-H,-.01+Math.cos(a)*.16,4);}}
 if(o.sword){const blade=rounded(body,.04,.5,.012,o.crown?mat('#9aa0ac',{roughness:.3,metalness:.85}):mat('#8a7a64',{roughness:.6,metalness:.5}),.3,.74,.2,.008);blade.rotation.x=.9;rounded(body,.13,.025,.035,trim,.3,.62,.08,.008).rotation.x=.9;}
 // evil glow (Nazgul): a pool of cold dread under the hem and a morgul-lit edge along the blade
 if(o.evil){const pool=mat(o.glow,{emissive:o.glow,emissiveIntensity:1.2,transparent:true,opacity:.15,depthWrite:false}),edge=mat(o.glow,{emissive:o.glow,emissiveIntensity:2.4,roughness:.4});pool.name=edge.name='evil-glow';
  const p=cylinder(g,.36,.42,.004,pool,0,.004,0,24);p.userData.ring=true;p.castShadow=false;p.receiveShadow=false;
  if(o.sword){const e=rounded(body,.012,.46,.008,edge,.3,.74,.21,.004);e.rotation.x=.9;e.castShadow=false;}}
 return trimDraws(Object.assign(actor(g,body,[],null,[],'hover'),{head,arms,arm:arms[1],claws},o.kind?{wraith:o.kind}:{}));
}
const WRAITHS={wraith:{robe:'#5a5e6a',glow:'#9ad8ff',scale:1.2},'barrow wight':{robe:'#4a4a3a',glow:'#e0c040',bone:'#a89878',solid:true,circlet:true,sword:true,scale:1.1},nazgul:{robe:'#141218',glow:'#ff3a2a',crown:true,sword:true,evil:true,scale:1.3}};

// Vampires: a tall, pale aristocrat in a high-collared cape with a red lining, slicked hair with a widow's peak,
// fangs and red eyes. Lords wear a gold medallion, mages a violet cape and a glowing hand orb,
// and Vlad a jewelled red cap, a moustache and a long impaling spear.
function vampire(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const skin=mat(o.skin||'#d8d0cc',{roughness:.6}),suit=mat(o.suit||'#1c1a22',{roughness:.8}),cape=mat(o.cape||'#141218',{roughness:.85,side:THREE.DoubleSide}),lining=mat(o.lining||'#8a1420',{roughness:.7,side:THREE.DoubleSide}),hair=mat(o.hair||'#141214',{roughness:.5}),boot=mat('#101012',{roughness:.5}),fang=mat('#f4f0e6',{roughness:.3}),glow=mat(o.eye||'#ff2a2a',{emissive:o.eye||'#ff2a2a',emissiveIntensity:2.4,roughness:.3});
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.1,.44,0);body.add(leg);rounded(leg,.12,.42,.13,suit,0,-.18,0,.035);rounded(leg,.13,.1,.24,boot,0,-.39,.04,.03);legs.push(leg);}
 rounded(body,.34,.44,.22,suit,0,.68,0,.05);rounded(body,.08,.3,.02,mat('#e8e4dc',{roughness:.6}),0,.74,.11,.01);
 // cape: a back panel flaring toward the hem, red-lined, with a tall two-piece collar framing the head
 // the back panel hangs from a pivot at the shoulders (`cape`), and each side flap from its own (`flaps`), so they can sweep
 const capeG=new THREE.Group();capeG.position.set(0,.95,-.14);body.add(capeG);const flaps=[];
 const back=rounded(capeG,.46,.86,.03,cape,0,-.43,0,.015);back.rotation.x=-.08;rounded(capeG,.43,.82,.012,lining,0,-.42,.02,.006).rotation.x=-.08;
 for(const side of [-1,1]){const fg=new THREE.Group();fg.position.set(side*.24,.89,-.03);body.add(fg);flaps.push(fg);const flap=rounded(fg,.05,.74,.2,cape,0,-.37,0,.015);flap.rotation.z=side*.1;
  const collar=rounded(body,.16,o.collar||.24,.015,lining,side*.12,1.02,-.06,.006);collar.rotation.set(-.25,side*.55,side*-.25);
  const outer=rounded(body,.17,(o.collar||.24)+.02,.012,cape,side*.125,1.02,-.075,.006);outer.rotation.copy(collar.rotation);}
 // head: gaunt face, pointed ears, widow's peak, fangs and red eyes
 const head=new THREE.Group();head.position.set(0,1.06,.02);body.add(head);
 sphere(head,.13,skin,0,0,0,.9,1.08,1);rounded(head,.08,.05,.06,skin,0,-.1,.06,.02);
 const cap=sphere(head,.135,hair,0,.04,-.015,.93,.95,1.02);cap.scale.y=.85;cone(head,.035,.07,hair,0,.075,.105,4).rotation.x=Math.PI+.35;
 for(const side of [-1,1]){const ear=cone(head,.025,.09,skin,side*.115,.01,-.01,4);ear.rotation.z=-side*1.1;cone(head,.008,.035,fang,side*.022,-.09,.108,4).rotation.x=Math.PI;}
 const eyeG=new THREE.Group();eyeG.position.set(0,.01,.11);eyeG.userData.part='eyes';head.add(eyeG);eyes(eyeG,glow,0,0,.045);
 const arms=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.22,.86,0);body.add(arm);arms.push(arm);rounded(arm,.1,.4,.11,suit,0,-.18,0,.03);sphere(arm,.05,skin,0,-.4,.01,.9,1.2,.9);for(const f of [-.02,0,.02])cone(arm,.008,.05,skin,f,-.46,.02,4).rotation.x=Math.PI;arm.rotation.z=side*.1;arm.rotation.x=side>0?-.35:-.1;}
 // evil glow (vampire lords, mages and Vlad): a pool of blood-dark light under the cape hem
 if(o.evil){const pool=mat(o.evil,{emissive:o.evil,emissiveIntensity:1.2,transparent:true,opacity:.15,depthWrite:false});pool.name='evil-glow';
  const p=cylinder(g,.38,.44,.004,pool,0,.004,0,24);p.userData.ring=true;p.castShadow=false;p.receiveShadow=false;}
 if(o.medallion){cylinder(body,.045,.045,.012,M.gold,0,.8,.12,12).rotation.x=Math.PI/2;sphere(body,.018,glow,0,.8,.13);}
 if(o.orb){const orb=sphere(body,.06,mat(o.orb,{emissive:o.orb,emissiveIntensity:3,roughness:.2,transparent:true,opacity:.9}),.26,.5,.2);g.userData.core=orb;}
 if(o.vlad){const red=mat('#9a1a24',{roughness:.7});cylinder(head,.125,.135,.1,red,0,.11,-.01,12);sphere(head,.02,mat('#e8e0c8',{roughness:.3}),0,.12,.125);for(const side of [-1,1]){const m=rounded(head,.07,.018,.02,hair,side*.035,-.065,.12,.008);m.rotation.z=side*-.35;}
  const spear=rounded(body,.03,1.4,.03,mat('#4a3420',{roughness:.9}),-.3,.71,.12,.01);spear.rotation.z=.04;cone(body,.035,.18,M.steel,-.33,1.49,.12,4);}
 return trimDraws(Object.assign(actor(g,body,legs,null,[],'idle'),{head,arms,arm:arms[1],cape:capeG,flaps,vampire:o.kind||'vampire'}));
}
// Xorns: a faceted stone barrel on three stubby legs, with three arms and three eyes spaced around its sides
// and a wide, fanged mouth on top.
function xorn(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const stone=mat(o.stone||'#8a7f6a',{roughness:.95,flatShading:true}),dark=mat(shade(o.stone||'#8a7f6a',.6),{roughness:1,flatShading:true}),claw=mat('#3a3630',{roughness:.6}),tooth=mat('#e4dcc4',{roughness:.4}),maw=mat('#1a100e',{roughness:1}),glow=mat(o.eye||'#f0c040',{emissive:o.eye||'#f0c040',emissiveIntensity:2.2,roughness:.3});
 const third=Math.PI*2/3;
 for(let i=0;i<3;i++){const a=i*third+Math.PI/3,leg=new THREE.Group();leg.position.set(Math.sin(a)*.15,.22,Math.cos(a)*.15);body.add(leg);rounded(leg,.11,.18,.11,stone,Math.sin(a)*.02,-.08,Math.cos(a)*.02,.04);sphere(leg,.075,dark,Math.sin(a)*.04,-.17,Math.cos(a)*.04,1.1,.6,1.1);legs.push(leg);}
 // barrel: faceted body with rough strata bands and scattered rock nodules
 cylinder(body,.2,.25,.5,stone,0,.45,0,9);
 for(const [y,r] of [[.3,.255],[.5,.235],[.66,.215]])cylinder(body,r,r+.01,.035,dark,0,y,0,9);
 for(let i=0;i<7;i++){const a=i*2.4+.5,y=.3+(i%4)*.1,r=.245-(y-.2)*.1,n=part(body,new THREE.DodecahedronGeometry(.035,0),dark,Math.sin(a)*r,y,Math.cos(a)*r);n.rotation.set(i,i*.7,0);}
 // mouth on top: dark maw, lip ring, teeth leaning inward
 cylinder(body,.15,.15,.02,maw,0,.705,0,12);part(body,new THREE.TorusGeometry(.155,.025,6,12),dark,0,.71,0).rotation.x=Math.PI/2;
 for(let i=0;i<10;i++){const b=i/10*Math.PI*2,t=cone(body,.016,.06,tooth,Math.sin(b)*.135,.74,Math.cos(b)*.135,4);t.rotation.set(-Math.cos(b)*.5,0,Math.sin(b)*.5);}
 // three eyes (one facing forward) and three arms between them, each ending in three claws
 for(let i=0;i<3;i++){const a=i*third,x=Math.sin(a),z=Math.cos(a);sphere(body,.045,maw,x*.215,.58,z*.215);sphere(body,.03,glow,x*.24,.58,z*.24);
  const arm=new THREE.Group();arm.position.set(Math.sin(a+Math.PI/3)*.2,.52,Math.cos(a+Math.PI/3)*.2);arm.rotation.set(-.35,a+Math.PI/3,0,'YXZ');body.add(arm);
  rounded(arm,.075,.075,.14,stone,0,0,.06,.03);const fore=rounded(arm,.065,.065,.12,stone,0,.04,.16,.025);fore.rotation.x=-.5;
  for(const f of [-.025,0,.025])cone(arm,.012,.06,claw,f,.08,.24,4).rotation.x=Math.PI/2-.4;}
 return trimDraws(actor(g,body,legs,null,[],'idle'));
}
const XORNS={xorn:{scale:1.25}};

// Nagas: a thick serpent coil on the floor whose front rises into an upright neck with a human face,
// scaled belly plates and slit-pupil eyes. The raised half is the swaying 'tail' group so it weaves.
// Red nagas have a flame crest, black nagas a spine ridge, golden nagas a jewelled circlet,
// guardian nagas a cobra hood, white nagas a crown of ice. Hatchlings are small and plain.
function naga(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const scales=mat(o.color,{roughness:.5,metalness:.1}),belly=mat(o.belly||shade(o.color,1.45),{roughness:.6}),face=mat(o.face||shade(o.color,1.25),{roughness:.65}),
  glow=mat(o.eye||'#f0d040',{emissive:o.eye||'#f0d040',emissiveIntensity:2,roughness:.3}),pupil=mat('#0c0a08',{roughness:.4}),r=o.baby?.05:.075;
 // lower body: a flat spiral coil ending under the raised neck
 const coil=[];for(let i=0;i<=30;i++){const t=i/30,a=Math.PI*.5+t*Math.PI*3.2,rad=.3-t*.18;coil.push([Math.cos(a)*rad,r*tailTaper(t)+t*.04,-Math.sin(a)*rad*.9-.02]);}
 coil.push([0,r+.08,.1]);pointedTailTube(body,coil,r,scales,72);
 // raised half: pivots above the coil centre
 const neck=new THREE.Group();neck.position.set(0,r+.08,.1);body.add(neck);
 const rise=[[0,0,0],[0,.14,.03],[0,.3,.02],[0,.44,-.01]];tube(neck,rise,r*.95,scales,20);
 for(let i=0;i<5;i++){const y=.04+i*.085;rounded(neck,r*1.3,.05,.03,belly,0,y,.02+r*.85-(i>3?.02:0),.012);}
 const head=new THREE.Group();head.position.set(0,.5,.01);neck.add(head);
 // head: a humanlike face set into a scaled skull, with a pointed chin and slit-pupil eyes
 sphere(head,r*1.35,scales,0,.01,-.015,1,1.05,1);sphere(head,r*1.15,face,0,-.005,.03,.95,1.05,.85);cone(head,r*.5,r*.7,face,0,-r*1.2,.045,6).rotation.x=Math.PI+.25;
 rounded(head,r*.25,r*.45,r*.35,face,0,0,r*1.05,.008);rounded(head,r*.6,r*.1,r*.1,mat('#5a2a2a',{roughness:.6}),0,-r*.55,r*.95,.01);
 for(const side of [-1,1]){sphere(head,r*.24,glow,side*r*.42,r*.3,r*.95,1.2,.8,.5);rounded(head,r*.06,r*.3,r*.05,pupil,side*r*.42,r*.3,r*1.05,.004);}
 if(o.crest==='flame'){const fire=mat('#ff7a2a',{emissive:'#ff4a10',emissiveIntensity:1.6,roughness:.4});for(let i=0;i<5;i++){const a=(i-2)*.32;const c=cone(head,r*.22,r*(1.3-Math.abs(i-2)*.25),fire,Math.sin(a)*r*.9,r*1.25,-.02-Math.cos(a)*r*.25,4);c.rotation.z=-a*.8;c.rotation.x=-.35;}}
 if(o.crest==='spines'){const spine=mat(shade(o.color,.55),{roughness:.4});for(let i=0;i<4;i++)cone(neck,r*.2,r*.7,spine,0,.1+i*.11,-r*.9,4).rotation.x=-1.2;for(let i=0;i<3;i++)cone(head,r*.2,r*.7,spine,0,r*1.25-i*r*.35,-r*.8-i*r*.3,4).rotation.x=-.6-i*.35;}
 if(o.crest==='circlet'){cylinder(head,r*1.3,r*1.36,r*.3,M.gold,0,r*.75,-.01,14);sphere(head,r*.22,mat('#3aa0ff',{emissive:'#1a60c0',emissiveIntensity:1.2,roughness:.2}),0,r*.8,r*1.3);for(const side of [-1,1])cone(head,r*.15,r*.5,M.gold,side*r*.7,r*1.12,r*.95,4);}
 // frost (white naga, a Gehennom cold-spitter): a crooked crown of ice shards raking back off the skull,
 // uneven ice spines down the nape, two long frost fangs past the lip and rime splinters jutting from the coil
 if(o.crest==='frost'){const ice=mat('#d6f2ff',{emissive:'#3a90d0',emissiveIntensity:.55,roughness:.12,metalness:.15});
  for(let i=0;i<7;i++){const a=(i-3)*.36,h=r*(1.9-Math.abs(i-3)*.32+(i%2)*.35);const c=cone(head,r*.16,h,ice,Math.sin(a)*r*1.05,r*1.05,-.03-Math.cos(a)*r*.35,4);c.rotation.set(-.75-(i%3)*.12,(i%2?.3:-.3),-a*.9);}
  for(let i=0;i<5;i++)cone(neck,r*(.18+(i%2)*.08),r*(.65+(i%3)*.3),ice,(i%2?1:-1)*r*.12,.08+i*.085,-r*.9,4).rotation.set(-1.25+(i%2)*.25,i,0);
  for(const side of [-1,1]){const f=cone(head,r*.08,r*.55,ice,side*r*.22,-r*.75,r*1,4);f.rotation.x=Math.PI+.2;}
  for(let i=0;i<6;i++){const t=.12+i*.14,a=Math.PI*.5+t*Math.PI*3.2,rad=.3-t*.18,c=cone(body,r*.14,r*(.5+(i%2)*.3),ice,Math.cos(a)*rad,r*1.9+t*.04,-Math.sin(a)*rad*.9-.02,4);c.rotation.set(Math.sin(a)*.5,i,Math.cos(a)*.5);}}
 if(o.crest==='hood'){const hood=sphere(neck,r*3.2,scales,0,.43,-.035,1,1.25,.18);hood.rotation.x=.12;sphere(neck,r*2.6,belly,0,.42,-.022,1,1.2,.12).rotation.x=.12;for(const side of [-1,1])sphere(neck,r*.45,mat(shade(o.color,.45)),side*r*1.7,.47,-.04,1,1.4,.3);}
 return trimDraws(actor(g,body,[],neck,[],'snake'));
}
const NAGAS={'red naga':{color:'#b0321e',belly:'#e0a040',eye:'#ffcc40',crest:'flame',scale:1.1},'black naga':{color:'#26242a',belly:'#4a4852',face:'#5a5660',eye:'#8aff4a',crest:'spines',scale:1.1},'golden naga':{color:'#c8a032',belly:'#f0dc8a',eye:'#ff5a3a',crest:'circlet',scale:1.2},'guardian naga':{color:'#3a8a3a',belly:'#c0d880',eye:'#ffe040',crest:'hood',scale:1.25},'white naga':{color:'#d8d8d0',belly:'#a8c4d4',face:'#c4c8c6',eye:'#6ad4ff',crest:'frost',scale:1.3},
 'red naga hatchling':{color:'#b0321e',belly:'#e0a040',baby:true,scale:.8},'black naga hatchling':{color:'#26242a',belly:'#4a4852',face:'#5a5660',eye:'#8aff4a',baby:true,scale:.8},'golden naga hatchling':{color:'#c8a032',belly:'#f0dc8a',baby:true,scale:.8},'guardian naga hatchling':{color:'#3a8a3a',belly:'#c0d880',baby:true,scale:.8},'white naga hatchling':{color:'#d8d8d0',belly:'#a8c4d4',face:'#c4c8c6',eye:'#6ad4ff',baby:true,scale:.8}};

// Umber hulks (U): a hunched, beetle-backed burrower with a domed carapace of overlapping chitin plates,
// thick legs, long arms ending in three huge digging claws, and a broad head with two big confusing
// compound eyes, two small eyes between them and a pair of curved mandibles. The head is the 'tail' group, so it tilts.
function umberHulk(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const shell=mat(o.color,{roughness:.45,metalness:.15}),dark=mat(shade(o.color,.55),{roughness:.7}),hide=mat(o.hide||shade(o.color,1.25),{roughness:.9}),claw=mat('#1c1612',{roughness:.35,metalness:.2}),
  compound=mat(o.eye,{emissive:o.eye,emissiveIntensity:.9,roughness:.15,metalness:.3,flatShading:true}),small=mat('#0e0a08',{roughness:.2}),mouth=mat('#2a0e0c',{roughness:1});
 // legs: thick thighs and shins with chitin knee caps and three-toed clawed feet
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.17,.415,-.02);body.add(leg);
  segment(leg,[0,0,0],[side*.04,-.2,.06],.1,.085,hide);segment(leg,[side*.04,-.2,.06],[side*.05,-.37,.01],.08,.07,hide);
  sphere(leg,.075,shell,side*.04,-.2,.1,1,.8,.8);rounded(leg,.18,.06,.2,dark,side*.05,-.38,.05,.025);
  for(let k=-1;k<=1;k++)cone(leg,.02,.07,claw,side*.05+k*.055,-.39,.17,4).rotation.x=Math.PI/2;legs.push(leg);}
 // torso: a lighter hide belly with ridged plates under a domed, segmented back carapace
 const torso=sphere(body,.27,hide,0,.7,.02,1.15,1.1,.9);torso.rotation.x=.35;
 for(let i=0;i<4;i++)rounded(body,.3-i*.03,.05,.04,dark,0,.5+i*.1,.2-i*.012,.018).rotation.x=.3;
 for(let i=0;i<4;i++){const plate=sphere(body,.3-i*.025,shell,0,.62+i*.12,-.07-i*.02,1.18,.42,.95);plate.rotation.x=-.55-i*.1;}
 for(let i=0;i<3;i++){const ridge=cone(body,.035,.11,dark,0,.78+i*.13,-.3+i*.02,5);ridge.rotation.x=-1.2;}
 // shoulders: heavy pauldron plates
 for(const side of [-1,1]){const pad=sphere(body,.14,shell,side*.29,.98,.02,1.1,.7,1.15);pad.rotation.z=side*.45;}
 // arms: long and heavy, hanging forward, each ending in three great hooked claws for tunnelling through rock
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.3,.95,.04);body.add(arm);
  segment(arm,[0,0,0],[side*.05,-.3,.05],.09,.08,hide);sphere(arm,.07,shell,side*.05,-.3,.05,1,.8,1);
  segment(arm,[side*.05,-.3,.05],[side*.04,-.58,.14],.085,.075,shell);rounded(arm,.15,.1,.14,dark,side*.04,-.62,.15,.035);
  for(let k=-1;k<=1;k++){const c=cone(arm,.026,.16,claw,side*.04+k*.05,-.72,.2,5);c.rotation.x=Math.PI-.5;c.rotation.z=k*.15;}
  arm.rotation.x=-.2;arm.rotation.z=side*.08;}
 // head: set low and forward between the shoulders
 const head=new THREE.Group();head.position.set(0,1.02,.2);body.add(head);
 sphere(head,.16,shell,0,.02,0,1.2,.85,1);rounded(head,.3,.05,.1,dark,0,.1,.06,.02).rotation.x=-.3;
 sphere(head,.1,hide,0,-.08,.1,1.2,.7,.9);cylinder(head,.07,.07,.02,mouth,0,-.1,.17,10).rotation.x=Math.PI/2;
 for(const side of [-1,1]){
  const eye=part(head,new THREE.IcosahedronGeometry(.055,1),compound,side*.1,.03,.12);eye.scale.set(1,1.15,.8);
  sphere(head,.018,small,side*.03,.05,.16);
  // mandibles: curved, tapering hooks that close toward the mouth
  tube(head,[[side*.07,-.08,.12],[side*.11,-.13,.2],[side*.07,-.18,.27],[side*.015,-.19,.28]],.018,claw,10);
  cone(head,.02,.05,claw,side*.015,-.19,.29,4).rotation.z=side*Math.PI/2;
  const antenna=cone(head,.012,.12,dark,side*.07,.12,.02,4);antenna.rotation.set(-.6,0,-side*.5);}
 return trimDraws(actor(g,body,legs,head,[],'orc'));
}
const UMBER_HULKS={'umber hulk':{color:'#4a3322',hide:'#6a5038',eye:'#d8a040',scale:1.25}};

// Shambling horror (U): a thing that should not have been made. A lopsided, lurching mound of pallid, wet
// flesh swollen with tumorous lumps and split by bone spurs; one leg a thick club, the other a thin
// backward-bent shank; one arm a huge hooked digging claw and the other a withered limb with too many long
// fingers; a sagging head with a vertical maw ringed in needle teeth, mismatched cold-glowing eyes strewn
// over head and shoulder, and dripping feelers hanging from the jaw and belly. The head is the 'tail' group.
function shamblingHorror(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];let digArm,limpArm;
 const flesh=mat(o.color,{roughness:.32,metalness:.05}),dark=mat(shade(o.color,.5),{roughness:.6}),raw=mat(o.raw,{roughness:.25}),
  bone=mat('#d8d2bc',{roughness:.5}),claw=mat('#16141a',{roughness:.3,metalness:.25}),maw=mat('#14060a',{roughness:1}),
  eye=mat(o.eye,{emissive:o.eye,emissiveIntensity:1.1,roughness:.1}),pupil=mat('#050505',{roughness:.2});
 // legs: the left a thick, stumpy club foot; the right thin and bent back like a hock, ending in two talons
 {const leg=new THREE.Group();leg.position.set(-.16,.4,0);body.add(leg);
  segment(leg,[0,0,0],[-.04,-.22,.04],.12,.1,flesh);segment(leg,[-.04,-.22,.04],[-.05,-.34,.03],.1,.11,dark);
  sphere(leg,.12,flesh,-.05,-.34,.05,1.1,.45,1.25);for(let k=-1;k<=1;k++)cone(leg,.022,.06,claw,-.05+k*.05,-.36,.17,4).rotation.x=Math.PI/2;legs.push(leg);}
 {const leg=new THREE.Group();leg.position.set(.15,.4,-.02);body.add(leg);
  segment(leg,[0,0,0],[.05,-.14,.12],.08,.055,flesh);segment(leg,[.05,-.14,.12],[.06,-.26,-.04],.05,.04,dark);segment(leg,[.06,-.26,-.04],[.06,-.365,.04],.04,.035,flesh);
  sphere(leg,.04,raw,.05,-.14,.12);for(const k of [-1,1]){const t=cone(leg,.018,.09,claw,.06+k*.03,-.375,.1,4);t.rotation.x=Math.PI/2;t.rotation.y=k*.25;}legs.push(leg);}
 // torso: a hunched mound leaning to one side, swollen with lumps of uneven size
 const torso=sphere(body,.29,flesh,.02,.72,0,1.1,1.05,.95);torso.rotation.set(.4,0,-.18);
 const lumps=[[-.2,.84,-.1,.13],[.16,.96,-.14,.11],[-.06,1.0,-.2,.09],[.22,.66,.06,.08],[-.24,.6,.08,.07],[.05,.58,.22,.1],[-.12,.78,.22,.06],[.1,.82,-.26,.12]];
 for(const [x,y,z,r] of lumps)sphere(body,r,flesh,x,y,z,1,.9,1.05);
 // raw, glistening sores where the skin has split
 for(const [x,y,z,r] of [[-.18,.88,-.16,.05],[.2,.72,.14,.04],[.02,.62,.27,.045]])sphere(body,r,raw,x,y,z,1,1,.6);
 // bone spurs jutting from the back at wrong angles
 for(const [x,y,z,rx,rz,h] of [[-.08,1.06,-.16,-.9,.5,.16],[.12,1.02,-.24,-1.3,-.4,.13],[-.2,.92,-.22,-1.1,.9,.1],[.04,.86,-.32,-1.6,.1,.12],[.24,.86,-.16,-.8,-1,.09]]){
  const s=cone(body,.028,h,bone,x,y,z,5);s.rotation.set(rx,0,rz);}
 // belly feelers: limp, dripping tendrils
 for(const [x,z,len,sw] of [[-.1,.2,.26,.06],[.04,.24,.32,-.05],[.14,.18,.2,.04],[-.02,.22,.18,-.07]])
  tube(body,[[x,.56,z],[x+sw,.46,z+.05],[x-sw*.5,.56-len*.7,z+.08],[x+sw*.3,.56-len,z+.06]],.012,dark,8);
 // left arm: huge, knotted, dragging three hooked claws near the floor
 {const arm=digArm=new THREE.Group();arm.position.set(-.27,.94,.02);body.add(arm);
  segment(arm,[0,0,0],[-.09,-.3,.06],.11,.09,flesh);sphere(arm,.09,flesh,-.09,-.3,.06,1.1,.9,1);
  segment(arm,[-.09,-.3,.06],[-.08,-.62,.16],.1,.09,flesh);sphere(arm,.12,dark,-.08,-.66,.17,1.2,.8,1.1);
  for(let k=-1;k<=1;k++){const c=tube(arm,[[-.08+k*.05,-.68,.2],[-.08+k*.06,-.78,.27],[-.08+k*.05,-.86,.25],[-.08+k*.045,-.88,.18]],.02,claw,8);c.castShadow=true;}
  arm.rotation.z=.04;}
 // right arm: withered and too long, hanging forward with five spindly, many-jointed fingers
 {const arm=limpArm=new THREE.Group();arm.position.set(.27,.98,.04);body.add(arm);
  segment(arm,[0,0,0],[.06,-.26,.1],.05,.035,flesh);segment(arm,[.06,-.26,.1],[.05,-.52,.2],.035,.028,dark);
  for(let k=0;k<5;k++){const a=(k-2)*.32,x=.05+Math.sin(a)*.025,z=.2+Math.cos(a)*.025;
   tube(arm,[[x,-.52,z],[x+Math.sin(a)*.05,-.6,z+.04],[x+Math.sin(a)*.07,-.7,z+.02],[x+Math.sin(a)*.06,-.78,z+.06]],.008,dark,8);}
  arm.rotation.z=.12;}
 // head: lolling low and off to one side, sagging; a vertical maw split down its face
 const head=new THREE.Group();head.position.set(.06,1.0,.22);head.rotation.z=.32;body.add(head);
 sphere(head,.15,flesh,0,0,0,1.05,.9,1);sphere(head,.11,flesh,-.02,-.12,.04,.95,.8,.9);
 rounded(head,.06,.2,.04,maw,0,-.08,.13,.02);
 for(const side of [-1,1])for(let i=0;i<5;i++){const y=-.16+i*.04,t=cone(head,.008,.035,bone,side*.025,y,.14,4);t.rotation.z=-side*Math.PI/2;}
 // mismatched eyes: one large, one small and drooping, a cluster of three tiny ones high on the brow
 for(const [x,y,z,r] of [[-.08,.04,.11,.04],[.08,-.02,.12,.022],[-.02,.1,.12,.016],[.03,.11,.11,.013],[.0,.07,.14,.011]]){
  sphere(head,r,eye,x,y,z);sphere(head,r*.45,pupil,x,y,z+r*.75,1,1.6,.5);}
 // jaw feelers dripping from under the maw
 for(const [x,sw] of [[-.05,-.03],[.0,.04],[.05,.02]])tube(head,[[x,-.2,.08],[x+sw,-.27,.12],[x-sw,-.34,.1],[x+sw*.5,-.4,.13]],.01,raw,8);
 // stray eyes on the shoulder, staring in different directions
 for(const [x,y,z,r,ry] of [[-.26,1.02,.1,.026,-.6],[-.18,1.08,.04,.018,.4],[.2,.9,.16,.02,.9]]){
  const e=sphere(body,r,eye,x,y,z);const p=sphere(body,r*.45,pupil,x+Math.sin(ry)*r*.75,y,z+Math.cos(ry)*r*.75,1,1.6,.5);p.rotation.y=ry;e.rotation.y=ry;}
 // the arms are kept as their own groups (digArm, limpArm) so shambler-lurch.js can swing them
 return trimDraws(Object.assign(actor(g,body,legs,head,[],'orc'),{kind:'shambling horror',digArm,limpArm}));
}
const HORRORS={'shambling horror':{color:'#9aa8a4',raw:'#8a2a3a',eye:'#7affe8',scale:1.2}};

// Zruty: the huge, primeval wild man of Czech legend. A hunched, shaggy bear-ape with a broad back mane,
// knuckle-dragging arms ending in hooked claws, a heavy underslung jaw with upthrust tusks and small, deep-set eyes.
// The head is the 'tail' group, so live.js sways it slowly from side to side.
function zruty(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1.18);const legs=[];
 const fur=mat(o.fur,{roughness:1}),shag=mat(shade(o.fur,.62),{roughness:1}),hide=mat(o.hide||shade(o.fur,1.35),{roughness:.9}),
  claw=mat('#e2d6b8',{roughness:.4}),tusk=mat('#efe4c4',{roughness:.35}),mouth=mat('#3a1210',{roughness:1}),
  eye=mat(o.eye,{emissive:o.eye,emissiveIntensity:1.1,roughness:.25});
 // legs: short, bowed and thick, with broad padded feet and three toe claws
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.16,.36,-.04);body.add(leg);
  segment(leg,[0,0,0],[side*.06,-.18,.05],.11,.09,fur);segment(leg,[side*.06,-.18,.05],[side*.05,-.32,.02],.085,.075,shag);
  const foot=sphere(leg,.09,hide,side*.05,-.33,.07,1,.45,1.35);foot.rotation.y=side*.2;
  for(let k=-1;k<=1;k++)cone(leg,.018,.06,claw,side*.05+k*.04,-.34,.18,4).rotation.x=Math.PI/2;legs.push(leg);}
 // torso: a barrel chest leaning well forward, a paler hide belly and a hump of muscle over the shoulders
 const torso=sphere(body,.28,fur,0,.62,.03,1.1,1.05,.95);torso.rotation.x=.45;
 sphere(body,.2,hide,0,.55,.14,1.05,1.1,.6).rotation.x=.4;
 sphere(body,.25,fur,0,.86,-.06,1.3,.75,1);
 // shaggy coat: ragged tufts hanging off the flanks and a bristling mane down the back
 for(let i=0;i<14;i++){const a=(i/14)*Math.PI*2,r=.27+(i%3)*.015;
  const tuft=cone(body,.045,.16,shag,Math.sin(a)*r,.48+(i%2)*.08,Math.cos(a)*r*.85+.02,5);tuft.rotation.set(Math.cos(a)*.35+Math.PI,0,-Math.sin(a)*.35);}
 for(let i=0;i<7;i++){const s=cone(body,.04+.012*Math.sin(i/6*Math.PI),.18+.07*Math.sin(i/6*Math.PI),shag,0,.58+i*.075,-.24-Math.sin(i/6*Math.PI)*.06+i*.012,5);s.rotation.x=-1.9+i*.12;}
 // arms: long enough to reach the floor, knuckles down, forearms thick with fur and hooked claws curled under
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.31,.9,.04);body.add(arm);
  sphere(arm,.13,fur,0,0,0,1,.9,1);
  segment(arm,[0,0,0],[side*.08,-.3,.08],.1,.085,fur);sphere(arm,.075,shag,side*.08,-.3,.08);
  segment(arm,[side*.08,-.3,.08],[side*.1,-.66,.16],.095,.07,shag);
  for(let k=0;k<3;k++){const t=cone(arm,.04,.12,shag,side*(.13+k*.012),-.36-k*.1,.07+k*.02,5);t.rotation.z=side*(Math.PI/2+.3);}
  sphere(arm,.085,hide,side*.1,-.72,.18,1.1,.75,1.05);
  for(let k=-1;k<=1;k++){const c=cone(arm,.02,.1,claw,side*.1+k*.045,-.78,.25,5);c.rotation.x=Math.PI/2+.5;}}
 // head: slung low and forward under the hump, a bony brow, flat nose, underslung jaw with upthrust tusks
 const head=new THREE.Group();head.position.set(0,.95,.26);body.add(head);
 sphere(head,.17,fur,0,.02,-.02,1.1,.95,1);
 sphere(head,.13,hide,0,-.02,.08,1.05,.8,.8);
 rounded(head,.28,.06,.09,shag,0,.08,.1,.025).rotation.x=-.25;
 sphere(head,.05,hide,0,.0,.19,1.3,.8,.9);for(const x of [-.022,.022])sphere(head,.013,mouth,x,-.01,.225);
 const jaw=rounded(head,.22,.08,.15,hide,0,-.11,.1,.035);jaw.rotation.x=.15;
 rounded(head,.17,.02,.02,mouth,0,-.075,.18,.008);
 for(const side of [-1,1]){
  sphere(head,.03,mouth,side*.065,.045,.155);sphere(head,.02,eye,side*.065,.045,.168);
  const t=cone(head,.022,.1,tusk,side*.085,-.04,.17,6);t.rotation.set(-.3,0,-side*.35);
  const ear=cone(head,.04,.08,shag,side*.16,.08,-.03,5);ear.rotation.z=-side*1.1;
  for(let k=0;k<3;k++){const b=cone(head,.03,.1,shag,side*(.12+k*.02),-.08-k*.03,.02,5);b.rotation.set(0,0,side*(2.4+k*.2));}}
 for(let k=0;k<5;k++){const b=cone(head,.035,.12,shag,(k-2)*.05,-.17,.08,5);b.rotation.x=Math.PI-.3;}
 head.rotation.x=.1;
 return trimDraws(actor(g,body,legs,head,[],'orc'));
}
const ZRUTIES={'zruty':{fur:'#6a4a2c',hide:'#a07a58',eye:'#e8a030',scale:1.35}};

// Rust monsters and disenchanters: a low, armadillo-like bug with overlapping carapace plates, four stubby legs,
// two long feathery antennae (the rust-touch feelers) and a tail ending in a flat, two-bladed propeller vane.
// The tail is the 'tail' group, so its roll in live.js twists the vane. Disenchanters are blue with a violet glow.
function rustMonster(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const shell=mat(o.color,{roughness:.55,metalness:.35}),hide=mat(shade(o.color,.6),{roughness:.9}),belly=mat(o.belly||shade(o.color,1.35),{roughness:.8}),
  feeler=mat(o.feeler||shade(o.color,1.5),{roughness:.6}),glow=mat(o.eye||'#ffb040',{emissive:o.eye||'#ffb040',emissiveIntensity:1.8,roughness:.3}),y=.26;
 sphere(body,.2,hide,0,y,0,.85,.6,1.35);sphere(body,.14,belly,0,y-.07,.03,.85,.45,1.2);
 // carapace: five overlapping arched plates from shoulders to rump, rust-flecked edges
 for(let i=0;i<5;i++){const z=.18-i*.09,w=.22-Math.abs(i-1.5)*.02;const plate=sphere(body,w,shell,0,y+.05-Math.abs(i-1.5)*.012,z,1,.55,.4);plate.rotation.x=-.25;
  for(const side of [-1,1])sphere(body,.018,mat(o.fleck||'#b0582a',{roughness:1}),side*w*.7,y+.02,z+.02,1,.6,1);}
 // head: blunt, low, with a small mandible pair and glowing beady eyes
 const head=new THREE.Group();head.position.set(0,y-.02,.28);body.add(head);
 sphere(head,.1,shell,0,0,0,1,.8,1.05);sphere(head,.07,belly,0,-.04,.05,.9,.55,1);
 for(const side of [-1,1]){sphere(head,.022,glow,side*.055,.035,.075);const jaw=cone(head,.018,.06,hide,side*.03,-.05,.1,4);jaw.rotation.x=Math.PI/2+.4;jaw.rotation.z=side*.3;}
 // antennae: long arcs up and forward, each fringed with short bristles and a knob at the tip.
 // Each hangs in its own group pivoted at its root, so rust-feel.js can sweep and lash it.
 const feelers=[];
 for(const side of [-1,1]){const base=[side*.035,.06,.05],f=new THREE.Group();f.position.set(...base);head.add(f);feelers.push(f);
  const pts=[[side*.035,.06,.05],[side*.09,.2,.1],[side*.16,.3,.18],[side*.21,.31,.27]].map(p=>p.map((v,k)=>v-base[k]));tube(f,pts,.011,feeler,14);
  const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
  for(let i=2;i<10;i++){const p=curve.getPoint(i/10),b=cone(f,.006,.05,feeler,p.x+side*.02,p.y,p.z,3);b.rotation.z=-side*1.2;}
  const tip=curve.getPoint(1);sphere(f,.022,glow,tip.x,tip.y,tip.z);}
 // legs: four short armoured stumps splayed outward
 for(const side of [-1,1])for(const z of [-.12,.13]){const leg=new THREE.Group();leg.position.set(side*.13,y-.08,z);body.add(leg);const upper=rounded(leg,.06,.16,.06,hide,side*.03,-.06,0,.02);upper.rotation.z=side*.3;sphere(leg,.035,shell,side*.05,-.15,.015,1.1,.6,1.3);legs.push(leg);}
 // rust monsters only: the carapace is eaten through with dark corrosion pits, and each foot ends in three hooked black claws
 if(o.kind==='rust monster'){
  const pit=mat('#1c1008',{roughness:1}),claw=mat('#15110e',{roughness:.5,metalness:.4});
  for(const [px,pz,pr] of [[-.07,.15,.026],[.09,.08,.02],[-.1,-.02,.022],[.05,-.06,.028],[-.04,-.16,.02],[.1,-.14,.024]])sphere(body,pr,pit,px,y+.1,pz,1,.3,1);
  // a ridge of eaten, jagged spines down the back
  for(let i=0;i<5;i++){const sp=cone(body,.016,.09-Math.abs(i-2)*.012,claw,0,y+.14-Math.abs(i-1.5)*.012,.18-i*.09,4);sp.rotation.x=-.5;}
  for(const side of [-1,1])for(const z of [-.12,.13])for(const k of [-1,0,1]){const c=cone(body,.012,.07,claw,side*.18+side*.01*Math.abs(k),y-.22,z+k*.025+.04,4);c.rotation.x=Math.PI/2-.5;}
 }
 // rust monsters only: a row of rust-black barbs along each flank and a pair of bared, hooked fangs in the jaw
 if(o.kind==='rust monster'){
  const barb=mat('#3a2412',{roughness:.9,metalness:.3}),fang=mat('#c9b48a',{roughness:.6});
  for(const side of [-1,1])for(let i=0;i<4;i++){const b=cone(body,.02,.1-i*.01,barb,side*(.2-Math.abs(i-1.5)*.01),y+.01,.14-i*.09,4);b.rotation.z=-side*1.25;b.rotation.x=.15*(i-1.5);}
  for(const side of [-1,1]){const f=cone(head,.014,.07,fang,side*.045,-.075,.12,4);f.rotation.x=Math.PI-.5;f.rotation.z=side*.15;}
 }
 // disenchanters only: hairline cracks in the carapace leak violet light, and the jaw hooks in sharp dark mandibles
 if(o.kind==='disenchanter'){
  const crack=mat('#c080ff',{emissive:'#a050ff',emissiveIntensity:2.2,roughness:.4});
  for(const [px,pz,r] of [[-.06,.16,.3],[.08,.07,-.4],[-.09,-.04,.5],[.05,-.12,-.2]]){const c=cone(body,.008,.1,crack,px,y+.115,pz,3);c.rotation.set(Math.PI/2,0,r);}
  for(const side of [-1,1]){const m=cone(head,.016,.08,hide,side*.05,-.06,.12,4);m.rotation.x=Math.PI/2+.3;m.rotation.z=-side*.5;}
 }
 // tail: a tapering segmented stalk out the back ending in a crossed propeller vane
 const tail=new THREE.Group();tail.position.set(0,y,-.27);body.add(tail);
 for(let i=0;i<4;i++){const r=.045-i*.008,seg=cylinder(tail,r*.85,r,.06,i%2?shell:hide,0,0,-.03-i*.055,8);seg.rotation.x=Math.PI/2;}
 const vane=new THREE.Group();vane.position.set(0,0,-.25);tail.add(vane);sphere(vane,.03,shell);
 for(const a of [0,Math.PI]){const blade=rounded(vane,.16,.018,.06,shell,Math.cos(a)*.09,Math.sin(a)*.09,0,.008);blade.rotation.set(.35,0,a);}
 return trimDraws({...actor(g,body,legs,tail,[],'lizard'),feelers,vane,feelHead:head,rustFeel:o.kind||'rust monster'});
}
const RUST_MONSTERS={'rust monster':{color:'#8a5a34',belly:'#c08a5a',fleck:'#c0602a',feeler:'#d0a070'},disenchanter:{color:'#3d5fb0',belly:'#8aa0d8',fleck:'#6a3aa0',feeler:'#b0c0f0',eye:'#c080ff',scale:1.3}};

// Leprechaun: a small, portly trickster in a green frock coat and buckled top hat,
// leaning on a knobbly shillelagh with a swinging sack of stolen gold in his other hand.
function leprechaun(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const box=(p,w,h,d,m,x,y,z)=>part(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const coat=mat(o.coat,{roughness:.85}),coatDark=mat(shade(o.coat,.6),{roughness:.9}),vest=mat(o.vest||'#d8c89a',{roughness:.85}),skin=mat('#a08468',{roughness:.8}),rosy=mat('#6e3e36',{roughness:.8}),
  beard=mat(o.beard||'#c8561e',{roughness:.95}),stocking=mat('#b5ab94',{roughness:.9}),black=mat('#161414',{roughness:.45}),hatMat=mat(shade(o.coat,.8),{roughness:.8}),
  wood=mat('#4a3020',{roughness:.95}),sack=mat('#8a6a40',{roughness:1}),coin=mat('#e0b83a',{metalness:.85,roughness:.25}),glint=mat('#8ae05a',{emissive:'#4ac02a',emissiveIntensity:1.4,roughness:.2});
 // legs: knee breeches, white stockings and buckled shoes with turned-up toes
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.07,.25,0);body.add(leg);
  sphere(leg,.06,coat,0,-.01,0,1,1.1,1);segment(leg,[0,-.04,0],[0,-.2,0],.036,.03,stocking);
  rounded(leg,.075,.05,.14,black,0,-.22,.025,.02);cone(leg,.022,.05,black,0,-.21,.105,6).rotation.x=Math.PI/2-.6;
  box(leg,.05,.03,.012,coin,0,-.2,.07);legs.push(leg);}
 // body: a round belly under a cream waistcoat, a broad belt with a big gold buckle and a green frock coat with tails
 sphere(body,.12,coat,0,.3,0,1.05,.6,.9);
 sphere(body,.14,coat,0,.43,-.01,1,1.08,.92);sphere(body,.11,vest,0,.43,.035,.9,1,.9);
 for(let i=0;i<3;i++)sphere(body,.012,coin,0,.38+i*.045,.135-i*.006);
 cylinder(body,.142,.142,.035,black,0,.35,0,20).scale.z=.92;box(body,.06,.045,.015,coin,0,.35,.13);box(body,.032,.022,.016,black,0,.35,.132);
 for(const side of [-1,1]){const lapel=box(body,.04,.13,.02,coatDark,side*.07,.47,.1);lapel.rotation.set(-.2,0,-side*.3);
  const tail=box(body,.08,.2,.025,coat,side*.05,.26,-.12);tail.rotation.set(.18,0,side*.12);}
 // arms: left hand grips a shillelagh planted on the floor; the right hand holds the sack
 for(const side of [-1,1]){const shoulder=[side*.14,.5,0],hand=[side*.2,.33,.06];
  segment(body,shoulder,hand,.042,.036,coat);sphere(body,.045,coat,...shoulder);
  cylinder(body,.04,.04,.03,stocking,hand[0]*.97,hand[1]+.035,hand[2]);sphere(body,.034,skin,...hand);}
 tube(body,[[-.23,.005,.1],[-.215,.2,.08],[-.2,.36,.06],[-.2,.46,.06]],.014,wood,12);sphere(body,.03,wood,-.2,.47,.06,1,.9,1);
 for(const [y,z] of [[.12,.095],[.25,.075]])sphere(body,.017,wood,-.225,y,z);
 // head (on a neck pivot): bruised cheeks, a bulbous scabbed nose, pointed ears, a green glint in the eye and a ginger chin-curtain beard
 const head=new THREE.Group();head.position.set(0,.56,0);body.add(head);const headY=.08;sphere(head,.11,skin,0,headY,.01,1,1.02,1);
 sphere(head,.032,rosy,0,headY-.01,.11,1,.9,1);for(const side of [-1,1]){sphere(head,.028,rosy,side*.058,headY-.025,.085,1,.8,.6);
  sphere(head,.022,vest,side*.04,headY+.02,.092,1,.8,.5);sphere(head,.012,glint,side*.04,headY+.02,.103);
  const brow=box(head,.05,.016,.02,beard,side*.042,headY+.052,.095);brow.rotation.z=-side*.25;
  const ear=cone(head,.025,.075,skin,side*.11,headY+.02,0,5);ear.rotation.z=-side*1.25;
  sphere(head,.045,beard,side*.085,headY-.04,.04,.8,1.2,.9);}
 lathe(head,[[.0,-.09],[.07,-.08],[.11,-.03],[.115,.0]],beard,0,headY-.055,.015,-Math.PI*.55,Math.PI*1.1).scale.set(1,1,.95);
 part(head,new THREE.TorusGeometry(.03,.006,6,12,Math.PI),black,0,headY-.045,.098).rotation.z=Math.PI;
 // pipe: a clay pipe clamped in the grin with a glowing ember
 segment(head,[.02,headY-.05,.1],[.08,headY-.08,.15],.006,.005,vest);cylinder(head,.014,.011,.03,vest,.085,headY-.065,.155,8);cylinder(head,.011,.011,.004,M.fire,.085,headY-.05,.155,8);
 // hat: a tall green hat, jauntily tilted, with a black band, gold buckle and shamrock
 const hat=new THREE.Group();hat.position.set(0,headY+.085,0);hat.rotation.set(-.06,0,-.14);head.add(hat);
 cylinder(hat,.155,.155,.014,hatMat,0,0,0,24);cylinder(hat,.095,.085,.19,hatMat,0,.1,0,20);cylinder(hat,.097,.097,.012,hatMat,0,.195,0,20);
 cylinder(hat,.089,.087,.04,black,0,.03,0,20);box(hat,.055,.045,.012,coin,0,.03,.088);box(hat,.03,.022,.014,black,0,.03,.09);
 for(let i=0;i<3;i++){const a=i/3*Math.PI*2+.5;sphere(hat,.014,glint,.06+Math.cos(a)*.012,.045+Math.sin(a)*.012,.07,1,1,.5);}
 // sack: hangs from the right hand and swings as the tail; gold coins spill from its mouth
 const loot=new THREE.Group();loot.position.set(.2,.32,.06);body.add(loot);
 sphere(loot,.07,sack,0,-.1,0,1,1.15,.95);cylinder(loot,.022,.03,.04,sack,0,-.02,0,8);part(loot,new THREE.TorusGeometry(.024,.006,6,12),wood,0,-.03,0).rotation.x=Math.PI/2;
 for(const [x,y,z,r] of [[.03,-.02,.03,.3],[-.02,-.01,.035,-.4],[.01,.005,.02,.1]]){const c=cylinder(loot,.018,.018,.005,coin,x,y,z,14);c.rotation.set(Math.PI/2-.4,0,r);}
 return trimDraws(Object.assign(actor(g,body,legs,loot,[],'idle'),{head,hat,loot,leprechaun:true}));
}
const LEPRECHAUNS={leprechaun:{coat:'#2f8a3a'}};
// Gargoyles: crouching carved-stone brutes on digitigrade haunches with knuckles on the floor, a horned
// brow-ridged head with fangs and ember eyes, chipped cracks and moss. The winged kind spreads great stone
// bat wings; the plain kind keeps stubby folded ones. Gremlins are skinny green imps with huge ribbed ears,
// saucer eyes, a spined back and long clawed fingers, grinning wide. The tail swings on both.
function gargoyle(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[],wings=[];g.add(body);g.scale.setScalar(o.scale||1);
 const stone=mat(o.stone,{roughness:.95}),dark=mat(shade(o.stone,.62),{roughness:1}),crack=mat(shade(o.stone,.3),{roughness:1}),
  moss=mat('#56713a',{roughness:1}),fang=mat('#d8d0bc',{roughness:.6}),glow=mat(o.eye,{emissive:o.eye,emissiveIntensity:2.6,roughness:.3}),
  web=mat(shade(o.stone,.78),{roughness:.95,side:THREE.DoubleSide});
 // haunches: thick thighs folded forward, backward shins and three-toed clawed feet
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.13,.325,-.04);body.add(leg);
  const k=[side*.03,-.08,.13],a=[side*.03,-.24,-.02],f=[side*.03,-.29,.04];
  sphere(leg,.1,stone,0,0,0,.9,1,1.1);segment(leg,[0,0,0],k,.08,.06,stone);sphere(leg,.06,stone,...k);
  segment(leg,k,a,.05,.035,dark);segment(leg,a,f,.035,.03,dark);
  for(let t=-1;t<=1;t++){const c=cone(leg,.014,.06,crack,f[0]+t*.028,-.29,f[2]+.05,4);c.rotation.x=Math.PI/2+.4;c.rotation.z=t*.15;}
  legs.push(leg);}
 // torso: a hunched barrel leaning forward, ribbed belly, a spined back and chips and cracks in the stone
 const chest=sphere(body,.2,stone,0,.5,.05,1.1,1.05,.9);chest.rotation.x=.35;
 sphere(body,.15,stone,0,.34,-.02,1.1,.9,1);
 for(let i=0;i<3;i++)rounded(body,.16-i*.02,.035,.04,dark,0,.34+i*.07,.14+i*.02,.012);
 for(let i=0;i<4;i++){const s=cone(body,.024,.08,dark,0,.38+i*.08,-.12-i*.01,4);s.rotation.x=-1.1;}
 for(const [x,y,z,rz] of [[.1,.56,.16,.6],[-.13,.44,.13,-.3],[.05,.36,.15,1.2]]){const c=rounded(body,.07,.008,.01,crack,x,y,z,.003);c.rotation.z=rz;}
 for(const [x,y,z,s] of [[-.12,.64,-.06,1],[.15,.3,-.08,.8],[.08,.62,-.1,.7]])sphere(body,.045*s,moss,x,y,z,1.2,.5,1);
 // ember seams: thin cracks in the chest and back burn with the same fire as the eyes, as if something inside were awake
 for(const [x,y,z,rz,l] of [[.04,.52,.245,.5,.11],[-.07,.44,.24,-.7,.08],[.02,.6,-.12,.3,.1]]){const m=rounded(body,l,.007,.006,glow,x,y,z,.002);m.rotation.z=rz;m.castShadow=false;}
 // arms: heavy shoulders, long forearms reaching down so the knuckles rest on the floor
 for(const side of [-1,1]){const sh=[side*.22,.6,.08],el=[side*.28,.36,.16],wr=[side*.22,.08,.24];
  sphere(body,.08,stone,...sh);segment(body,sh,el,.065,.05,stone);sphere(body,.05,stone,...el);segment(body,el,wr,.05,.04,dark);
  sphere(body,.05,dark,wr[0],.05,wr[2],1.1,.8,1.2);
  for(let t=-1;t<=1;t++){const c=cone(body,.012,.05,crack,wr[0]+t*.025,.02,wr[2]+.05,4);c.rotation.x=Math.PI/2+.3;}}
 // head: jutting forward on the shoulders, heavy brow, curled horns, pointed ears, snout, fangs and glowing eyes
 const head=new THREE.Group();head.position.set(0,.72,.2);head.rotation.x=.15;body.add(head);
 sphere(head,.12,stone,0,0,0,1,.95,1.05);rounded(head,.19,.04,.06,dark,0,.045,.08,.015);
 sphere(head,.07,stone,0,-.05,.1,1.1,.75,1);sphere(head,.02,crack,-.025,-.03,.165);sphere(head,.02,crack,.025,-.03,.165);
 for(const side of [-1,1]){sphere(head,.022,glow,side*.05,.015,.11).castShadow=false;
  const f=cone(head,.013,.05,fang,side*.035,-.1,.13,4);f.rotation.x=Math.PI;
  const ear=cone(head,.03,.1,stone,side*.11,.04,-.02,4);ear.rotation.z=-side*1.1;
  tube(head,[[side*.07,.08,0],[side*.14,.15,-.04],[side*.17,.13,-.12],[side*.14,.06,-.14]],.022,dark,12);}
 // wings: small folded stubs, or great spread stone bat wings for the winged kind
 const span=o.winged?1:.42;
 for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*.12,.66,-.12);pivot.rotation.x=-.25;body.add(pivot);
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(side*.2*span,.28*span);shape.lineTo(side*.58*span,.36*span);
  shape.quadraticCurveTo(side*.5*span,.12*span,side*.5*span,-.02*span);shape.quadraticCurveTo(side*.38*span,.06*span,side*.3*span,-.1*span);
  shape.quadraticCurveTo(side*.18*span,-.02*span,0,-.12);part(pivot,new THREE.ShapeGeometry(shape),web);
  segment(pivot,[0,0,0],[side*.2*span,.28*span,0],.022,.018,dark);segment(pivot,[side*.2*span,.28*span,0],[side*.58*span,.36*span,0],.018,.01,dark);
  for(const [x,y] of [[.5,-.02],[.3,-.1]])segment(pivot,[side*.2*span,.28*span,0],[side*x*span,y*span,0],.01,.006,dark);
  cone(pivot,.016,.06,crack,side*.2*span,.31*span,0,4);pivot.userData.side=side;wings.push(pivot);}
 // tail: a thick stone tail curling along the floor, ending in a spade
 const tail=new THREE.Group();tail.position.set(0,.2,-.14);body.add(tail);
 tube(tail,[[0,0,0],[.05,-.12,-.12],[.18,-.14,-.2],[.3,-.14,-.12]],.035,stone,16);
 const spade=cone(tail,.05,.1,dark,.34,-.14,-.1,4);spade.rotation.z=-Math.PI/2;spade.scale.set(1,1,.35);
 return trimDraws(actor(g,body,legs,tail,wings,'idle'));
}
function gremlin(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.skin,{roughness:.75}),dark=mat(shade(o.skin,.55),{roughness:.85}),ear=mat(shade(o.skin,1.15),{roughness:.7,side:THREE.DoubleSide}),
  pink=mat('#5a2622',{roughness:.7,side:THREE.DoubleSide}),claw=mat('#1c1812',{roughness:.4}),tooth=mat('#f0ead0',{roughness:.4}),
  mouth=mat('#3a0c10',{roughness:1}),glow=mat(o.eye,{emissive:o.eye,emissiveIntensity:2.2,roughness:.2}),pupil=mat('#100808',{roughness:.2});
 // legs: skinny bowed legs with knobbly knees and long splayed clawed feet
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.07,.22,0);body.add(leg);
  const k=[side*.04,-.1,.05];segment(leg,[0,0,0],k,.035,.028,skin);sphere(leg,.032,skin,...k);segment(leg,k,[side*.03,-.2,-.01],.026,.02,skin);
  sphere(leg,.03,skin,side*.03,-.205,.04,1,.5,1.8);
  for(let t=-1;t<=1;t++){const c=cone(leg,.008,.035,claw,side*.03+t*.016,-.21,.1,4);c.rotation.x=Math.PI/2;}legs.push(leg);}
 // body: a pot belly on a hunched, bony frame with a row of back spines
 sphere(body,.1,skin,0,.3,.01,1,1.1,.9);sphere(body,.08,dark,0,.29,.05,.85,.9,.6);sphere(body,.1,skin,0,.42,-.01,1.05,.9,.9);
 for(let i=0;i<5;i++){const s=cone(body,.014,.06,dark,0,.26+i*.05,-.09+i*.005,4);s.rotation.x=-1.2;}
 // arms: long and thin, elbows out, hands raised with hooked fingers
 for(const side of [-1,1]){const sh=[side*.1,.46,0],el=[side*.2,.36,.06],wr=[side*.18,.46,.16];
  sphere(body,.035,skin,...sh);segment(body,sh,el,.028,.022,skin);sphere(body,.022,skin,...el);segment(body,el,wr,.022,.016,skin);sphere(body,.025,skin,...wr);
  for(let t=-1;t<=1;t++){const c=cone(body,.006,.05,claw,wr[0]+t*.014,wr[1]+.04,wr[2]+.01,4);c.rotation.x=.3;c.rotation.z=t*.25;}}
 // head: big and round, saucer eyes, a wide toothy grin and enormous ribbed bat ears
 const headY=.6;sphere(body,.12,skin,0,headY,.02,1.1,.95,1);sphere(body,.05,skin,0,headY-.03,.12,1,.7,.8);
 for(const side of [-1,1]){sphere(body,.042,glow,side*.052,headY+.02,.1,1,1,.6).castShadow=false;sphere(body,.02,pupil,side*.052,headY+.02,.125,.6,1,.4);
  const brow=rounded(body,.06,.014,.02,dark,side*.05,headY+.065,.1,.005);brow.rotation.z=side*.35;
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(side*.12,.12,side*.26,.1);shape.quadraticCurveTo(side*.18,.02,side*.22,-.06);shape.quadraticCurveTo(side*.1,-.04,0,-.05);
  const e=part(body,new THREE.ShapeGeometry(shape),ear,side*.1,headY+.02,-.01);e.rotation.y=-side*.35;
  const inner=part(body,new THREE.ShapeGeometry(shape),pink,side*.1,headY+.02,-.005);inner.rotation.y=-side*.35;inner.scale.setScalar(.7);}
 cylinder(body,.075,.075,.01,mouth,0,headY-.06,.105,16).rotation.x=Math.PI/2+.4;
 for(let k=-3;k<=3;k++){const t=cone(body,.008,.022,tooth,k*.018,headY-.05,.13-Math.abs(k)*.008,4);t.rotation.x=Math.PI;}
 // tail: a thin whip ending in a tuft
 const tail=new THREE.Group();tail.position.set(0,.26,-.08);body.add(tail);
 tube(tail,[[0,0,0],[.04,-.08,-.1],[.12,-.1,-.18],[.2,-.04,-.22]],.012,skin,12);cone(tail,.022,.05,dark,.21,-.03,-.22,4).rotation.z=-1.2;
 return trimDraws(actor(g,body,legs,tail,[],'idle'));
}
const GARGOYLES={gargoyle:{stone:'#8a8478',eye:'#ff7a2a',scale:1.12},'winged gargoyle':{stone:'#6f6a74',eye:'#ffb030',winged:true,scale:1.3}};
const GREMLINS={gremlin:{skin:'#4f8a3a',eye:'#ffd23a'}};
// Keystone Kops: silent-film bobbies in tall custodian helmets and long double-breasted tunics, with a walrus
// moustache and splayed flat boots, waving a truncheon overhead. Rank shows as sleeve chevrons (sergeant),
// gold epaulettes (lieutenant) and a gold-braided helmet with a sash (kaptain). The truncheon swings as the tail.
function kop(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1.12);const legs=[],rank=o.rank||0;
 const box=(p,w,h,d,m,x,y,z)=>part(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const coat=mat(o.coat,{roughness:.8}),coatDark=mat(shade(o.coat,.55),{roughness:.85}),trousers=mat(shade(o.coat,.4),{roughness:.9}),
  skin=mat('#a8896e',{roughness:.8}),nose=mat('#7a3a34',{roughness:.7}),tache=mat(o.tache||'#3a2a1e',{roughness:.95}),
  boot=mat('#141212',{roughness:.4}),brass=mat('#d8b048',{metalness:.85,roughness:.28}),silver=mat('#c8ccd0',{metalness:.9,roughness:.22}),
  glove=mat('#ece8dc',{roughness:.85}),wood=mat('#3a2616',{roughness:.7}),helm=mat(shade(o.coat,.7),{roughness:.6});
 // legs: straight dark trousers into big flat boots splayed outward
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.075,.32,0);body.add(leg);
  segment(leg,[0,0,0],[0,-.26,0],.045,.04,trousers);
  const foot=rounded(leg,.085,.05,.19,boot,side*.012,-.285,.04,.022);foot.rotation.y=side*.28;legs.push(leg);}
 // tunic: a pot belly under a long flared coat, belt with a brass buckle and a double row of brass buttons
 lathe(body,[[.0,.28],[.13,.28],[.15,.36],[.16,.46],[.15,.56],[.13,.62],[.0,.64]],coat);
 sphere(body,.13,coat,0,.44,.03,1,1,.95);
 cylinder(body,.155,.155,.035,boot,0,.41,.01,20).scale.z=.95;box(body,.05,.04,.012,brass,0,.41,.16);
 for(let i=0;i<4;i++)for(const x of [-.045,.045])sphere(body,.012,brass,x,.47+i*.045,.145-i*.012);
 // stand-up collar and a silver whistle on a chain
 cylinder(body,.075,.085,.045,coatDark,0,.645,0,16);
 tube(body,[[-.06,.6,.1],[-.02,.54,.13],[.04,.53,.13]],.004,silver,8);cylinder(body,.009,.009,.04,silver,.055,.53,.13,8).rotation.z=Math.PI/2;
 // arms: left fist on the hip, right arm raised with the truncheon
 const lShoulder=[-.16,.58,0],lElbow=[-.23,.46,-.02],lHand=[-.14,.41,.04];
 sphere(body,.05,coat,...lShoulder);segment(body,lShoulder,lElbow,.042,.038,coat);segment(body,lElbow,lHand,.038,.034,coat);sphere(body,.036,glove,...lHand);
 const rShoulder=[.16,.58,0],rElbow=[.24,.68,.04],rHand=[.2,.82,.07];
 sphere(body,.05,coat,...rShoulder);segment(body,rShoulder,rElbow,.042,.038,coat);segment(body,rElbow,rHand,.038,.034,coat);sphere(body,.036,glove,...rHand);
 if(rank===1)for(const [s,e] of [[lShoulder,lElbow],[rShoulder,rElbow]])for(let i=0;i<3;i++){const t=.45+i*.14,p=s.map((v,k)=>v+(e[k]-v)*t);
  const c=box(body,.05,.009,.012,brass,p[0]+Math.sign(p[0])*.035,p[1],p[2]+.01);c.rotation.set(0,Math.sign(p[0])*1.2,.5);}
 if(rank>=2)for(const side of [-1,1]){const ep=new THREE.Group();ep.position.set(side*.15,.625,0);ep.rotation.z=-side*.35;body.add(ep);
  sphere(ep,.055,brass,0,0,0,1,.35,1.1);for(let i=0;i<7;i++){const a=(i/6-.5)*2.4;segment(ep,[Math.sin(a)*.05*side,-.005,Math.cos(a)*.05],[Math.sin(a)*.055*side,-.05,Math.cos(a)*.055],.005,.005,brass);}}
 if(rank===3){const sash=part(body,new THREE.TorusGeometry(.16,.014,6,24,Math.PI*1.1),brass,0,.5,.0);sash.rotation.set(0,0,-.9);sash.scale.z=.9;}
 const club=new THREE.Group();club.position.set(...rHand);body.add(club);
 segment(club,[0,-.03,0],[-.06,.2,-.03],.02,.026,wood);sphere(club,.027,wood,-.06,.2,-.03);box(club,.012,.03,.012,glove,0,-.045,0);
 tube(club,[[0,-.03,0],[.01,-.07,.01],[.0,-.1,.0]],.003,glove,6);
 // head: sallow, gaunt face, bruised swollen nose, beady eyes, big ears and a drooping walrus moustache
 const headY=.75;sphere(body,.1,skin,0,headY,.01,1,1.05,1);
 sphere(body,.03,nose,0,headY-.01,.1,1,.9,1);
 for(const side of [-1,1]){sphere(body,.013,boot,side*.035,headY+.022,.088);sphere(body,.03,skin,side*.1,headY,.0,.5,1,.8);
  const brow=box(body,.04,.012,.015,tache,side*.036,headY+.045,.09);brow.rotation.z=side*.2;
  tube(body,[[0,headY-.035,.105],[side*.045,headY-.04,.1],[side*.08,headY-.07,.08],[side*.085,headY-.1,.07]],.016,tache,10);}
 // custodian helmet: tall domed crown, rim, top knob and a silver star badge; the kaptain's is braided in gold
 const hat=new THREE.Group();hat.position.set(0,headY+.035,.0);hat.rotation.x=-.08;body.add(hat);
 lathe(hat,[[.118,0],[.112,.06],[.1,.13],[.075,.19],[.04,.22],[.0,.225]],helm);
 cylinder(hat,.125,.125,.012,helm,0,.004,0,24);cylinder(hat,.034,.024,.035,rank===3?brass:silver,0,.235,0,10);
 const star=part(hat,new THREE.CylinderGeometry(.035,.035,.008,8),silver,0,.08,.11);star.rotation.set(Math.PI/2-.35,0,0);
 sphere(hat,.014,rank===3?brass:boot,0,.08,.118,1,1,.5);
 if(rank===3)for(const y of [.02,.045])cylinder(hat,.117-y*.08,.117-y*.08,.01,brass,0,y,0,24);
 tube(hat,[[-.11,.0,.02],[-.06,-.12,.07],[.06,-.12,.07],[.11,.0,.02]],.005,boot,12);
 return trimDraws(actor(g,body,legs,club,[],'guard'));
}
// Quantum mechanic: a stooped scientist in a long white lab coat over a coloured shirt and tie, with a shock of
// white hair, round wire spectacles, Schrödinger's box tucked under one arm and a glowing atom held aloft in the
// other hand, its electrons on three tilted orbits. The atom is the 'tail' group, so live.js wobbles it.
function quantumMechanic(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1.1);const legs=[];
 const box=(p,w,h,d,m,x,y,z)=>part(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const coat=mat('#e8e6de',{roughness:.75}),coatShade=mat('#c4c2ba',{roughness:.8}),shirt=mat(o.shirt,{roughness:.8}),tie=mat(shade(o.shirt,.45),{roughness:.7}),
  trousers=mat('#2e2c32',{roughness:.9}),shoe=mat('#1a1614',{roughness:.45}),skin=mat('#e2b898',{roughness:.8}),hair=mat('#eeeeea',{roughness:1}),
  wire=mat('#b8b8b0',{metalness:.85,roughness:.25}),lens=mat(o.glow,{emissive:o.glow,emissiveIntensity:.5,transparent:true,opacity:.55,roughness:.1}),
  wood=mat('#7a5634',{roughness:.85}),glow=mat(o.glow,{emissive:o.glow,emissiveIntensity:2.2,roughness:.3}),orbit=mat(o.glow,{emissive:o.glow,emissiveIntensity:1.2,transparent:true,opacity:.7,roughness:.3}),
  pen=mat('#2a4a9a',{roughness:.5});
 // legs: thin dark trousers and plain lace-up shoes
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.065,.32,0);body.add(leg);
  segment(leg,[0,0,0],[0,-.27,0],.04,.036,trousers);rounded(leg,.07,.045,.15,shoe,0,-.29,.03,.02);legs.push(leg);}
 // lab coat: long, open at the front and flaring below the knee, over a shirt, a tie and a pocket full of pens
 lathe(body,[[.0,.2],[.15,.2],[.145,.3],[.14,.42],[.135,.52],[.12,.6],[.0,.63]],coat,0,0,0,Math.PI*.12,Math.PI*1.76);
 lathe(body,[[.12,.24],[.12,.6]],coatShade,0,0,-.004,-Math.PI*.12,Math.PI*.24);
 box(body,.13,.3,.05,shirt,0,.47,.1);box(body,.035,.2,.012,tie,0,.5,.128);cone(body,.022,.05,tie,0,.385,.128,4).rotation.x=Math.PI;
 for(const side of [-1,1]){const lapel=box(body,.035,.13,.015,coatShade,side*.055,.55,.125);lapel.rotation.set(-.15,0,side*.3);}
 box(body,.06,.06,.012,coatShade,-.08,.5,.13);for(const [x,m] of [[-.095,pen],[-.08,M.redCloth],[-.065,wire]])cylinder(body,.005,.005,.05,m,x,.54,.133,6);
 // arms: the left clutches the box against the hip; the right is raised to hold the atom up for inspection
 const lShoulder=[-.14,.57,0],lElbow=[-.2,.44,.02],lHand=[-.16,.36,.1];
 sphere(body,.048,coat,...lShoulder);segment(body,lShoulder,lElbow,.042,.038,coat);segment(body,lElbow,lHand,.038,.034,coat);sphere(body,.03,skin,...lHand);
 const rShoulder=[.14,.57,0],rElbow=[.24,.6,.06],rHand=[.22,.76,.12];
 sphere(body,.048,coat,...rShoulder);segment(body,rShoulder,rElbow,.042,.038,coat);segment(body,rElbow,rHand,.038,.034,coat);sphere(body,.03,skin,...rHand);
 // Schrödinger's box: a wooden crate with a latched lid and a faint glow leaking from the seam
 const crate=new THREE.Group();crate.position.set(-.2,.36,.07);crate.rotation.y=.35;body.add(crate);
 rounded(crate,.14,.11,.12,wood,0,0,0,.01);box(crate,.145,.012,.125,glow,0,.04,0);rounded(crate,.15,.02,.13,wood,0,.056,0,.006);
 box(crate,.02,.03,.008,wire,0,.035,.064);for(const x of [-.05,.05])box(crate,.012,.1,.004,mat('#5a3e24',{roughness:.9}),x,0,.061);
 // atom: a glowing nucleus inside three tilted electron orbits, each carrying a bright electron
 const atom=new THREE.Group();atom.position.set(rHand[0],rHand[1]+.1,rHand[2]);body.add(atom);
 sphere(atom,.03,glow);for(const [x,y,z] of [[.018,.01,0],[-.012,.016,.012],[0,-.016,-.014]])sphere(atom,.017,mat(shade(o.glow,.7),{roughness:.4}),x,y,z);
 for(let i=0;i<3;i++){const ring=new THREE.Group();ring.rotation.set(Math.PI/2+(i-1)*1.05,i*.6,0);atom.add(ring);
  part(ring,new THREE.TorusGeometry(.085,.0035,6,32),orbit);const a=i*2.1;sphere(ring,.012,glow,Math.cos(a)*.085,Math.sin(a)*.085,0);}
 // head: long, thin face, big nose, round wire spectacles with faintly glowing lenses and a wild white mop of hair
 const headY=.73;sphere(body,.095,skin,0,headY,.01,.95,1.1,1);sphere(body,.022,skin,0,headY-.01,.1,.9,1.1,1.1);
 for(const side of [-1,1]){part(body,new THREE.TorusGeometry(.027,.004,6,16),wire,side*.038,headY+.018,.09);
  part(body,new THREE.CircleGeometry(.025,16),lens,side*.038,headY+.018,.091);sphere(body,.009,shoe,side*.038,headY+.018,.086);
  segment(body,[side*.065,headY+.02,.085],[side*.092,headY+.02,-.01],.003,.003,wire);sphere(body,.024,skin,side*.094,headY,.0,.5,1,.8);
  const brow=box(body,.035,.01,.012,hair,side*.04,headY+.055,.09);brow.rotation.z=-side*.25;}
 segment(body,[-.011,headY+.018,.095],[.011,headY+.018,.095],.003,.003,wire);
 const mouth=box(body,.04,.008,.01,mat('#8a4a40',{roughness:.9}),0,headY-.055,.092);mouth.rotation.z=.12;
 sphere(body,.1,hair,0,headY+.045,-.025,1.05,.75,1.05);
 for(let i=0;i<11;i++){const a=i/11*Math.PI*2,tilt=i%2?.85:1.25;const tuft=cone(body,.035,.11,hair,Math.sin(a)*.09,headY+.06+(i%3)*.012,Math.cos(a)*.08-.035,5);
  tuft.rotation.set(Math.cos(a)*tilt,0,-Math.sin(a)*tilt);}
 return trimDraws(actor(g,body,legs,atom,[],'idle'));
}
const QUANTUM_MECHANICS={'quantum mechanic':{shirt:'#3a9aa8',glow:'#5ae0ff'},'genetic engineer':{shirt:'#3f8a3a',glow:'#7aff6a'}};
const KOPS={'keystone kop':{coat:'#2f3f8a'},'kop sergeant':{coat:'#2a3a82',rank:1,scale:1.15},'kop lieutenant':{coat:'#2a5f86',rank:2,scale:1.18,tache:'#5a3a22'},'kop kaptain':{coat:'#5a2a72',rank:3,scale:1.22,tache:'#8a8478'}};

// Elementals: one torso-and-arms spirit built from its element. Air, fire and water
// rise from a swaying funnel (the actor tail) and hover; earth stands on boulder legs.
function elemental(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[],k=o.kind,c=o.color;
 const see=(color,opacity,glow=0)=>mat(color,{transparent:true,opacity,depthWrite:false,roughness:.25,emissive:color,emissiveIntensity:glow});
 const glow=(color,i=2.5)=>mat(color,{emissive:color,emissiveIntensity:i,roughness:.3});
 const skin=k==='earth'?mat(c,{roughness:1,flatShading:true}):k==='fire'?glow(c,1.6):k==='water'?see(c,.62,.25):see(c,.34,.35);
 const dark=k==='earth'?mat(shade(c,.6),{roughness:1,flatShading:true}):k==='fire'?glow(o.hot||'#ffe070',3):k==='water'?see(shade(c,1.35),.4,.4):see(shade(c,1.3),.22,.5);
 const eye=glow(o.eye||'#ffffff',k==='earth'?2:3);
 const lump=(p,r,m,x,y,z,sx=1,sy=1,sz=1)=>{const mesh=k==='earth'?part(p,new THREE.DodecahedronGeometry(r,0),m,x,y,z):sphere(p,r,m,x,y,z);mesh.scale.set(sx,sy,sz);if(k==='earth')mesh.rotation.set(x*7,y*5,z*3);if(k!=='earth')mesh.castShadow=false;return mesh;};
 // lower body: earth gets two stubby boulder legs; the others a tapering funnel that sways as the tail
 let tail=null;
 if(k==='earth'){for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.13,.36,0);body.add(leg);lump(leg,.1,skin,0,-.07,0,1,1.2,1);lump(leg,.11,dark,0,-.25,.03,1.1,.9,1.2);legs.push(leg);}}
 else{tail=new THREE.Group();tail.position.y=.5;body.add(tail);
  if(k==='air')for(let i=0;i<6;i++){const t=i/5,ring=part(tail,new THREE.TorusGeometry(.2-t*.15,.03-t*.015,6,20),i%2?skin:dark,Math.sin(i*1.7)*.03,-.04-t*.4,Math.cos(i*1.7)*.03);ring.rotation.set(Math.PI/2+Math.sin(i*2.1)*.25,i*.6,0);ring.castShadow=false;}
  if(k==='fire')for(let i=0;i<9;i++){const a=i*2.4,r=.04+(i%3)*.04,f=cone(tail,.07-(i%3)*.012,.3-(i%3)*.05,i%3?skin:dark,Math.cos(a)*r,-.2+(i%3)*.03,Math.sin(a)*r,6);f.rotation.set(Math.PI+Math.sin(a)*.3,0,Math.cos(a)*.3);f.castShadow=false;}
  if(k==='water'){lathe(tail,[[.03,-.47],[.08,-.4],[.1,-.28],[.15,-.12],[.19,0]],skin).castShadow=false;const curl=part(tail,new THREE.TorusGeometry(.13,.035,8,20,Math.PI*1.4),dark,0,-.2,0);curl.rotation.set(Math.PI/2,0,.6);curl.castShadow=false;}
  const pool=part(g,new THREE.CircleGeometry(.26,20),mat(k==='fire'?'#2a1a10':shade(c,.5),{transparent:true,opacity:k==='fire'?.6:.35,depthWrite:false,emissive:k==='fire'?c:'#000000',emissiveIntensity:k==='fire'?.8:0}),0,.012,0);pool.rotation.x=-Math.PI/2;pool.castShadow=false;}
 // torso, shoulders and head, lumped from the element
 const chestY=k==='earth'?.6:.68;
 lump(body,.2,skin,0,chestY,0,1.1,1,.8);lump(body,.15,dark,0,chestY-.14,0,.9,.8,.8);
 const headY=chestY+.3;lump(body,.12,skin,0,headY,.02,1,1.05,1);
 for(const side of [-1,1]){sphere(body,.024,eye,side*.045,headY+.01,.12,1,.7,.6).castShadow=false;lump(body,.1,k==='earth'?dark:skin,side*.2,chestY+.12,0,1,.85,.9);}
 // arms: tapered limbs to heavy fists (earth) or dissolving hands
 for(const side of [-1,1]){const sh=[side*.22,chestY+.1,0],el=[side*.3,chestY-.08,.06],fist=[side*.3,chestY-.26,.1];
  segment(body,sh,el,.07,.06,skin).castShadow=k==='earth';segment(body,el,fist,.06,.05,skin).castShadow=k==='earth';
  lump(body,k==='earth'?.09:.065,dark,...fist);
  if(k==='fire')for(let i=0;i<3;i++){const f=cone(body,.022,.12,dark,fist[0]+(i-1)*.025,fist[1]+.09,fist[2],5);f.rotation.z=(i-1)*.3;f.castShadow=false;}}
 // element flourishes
 // swirl: the bits that circle the body (spun about y); crown: the flames or foam on the head
 let core=null,crown=null;const swirl=new THREE.Group();body.add(swirl);
 if(k==='earth'){for(let i=0;i<5;i++){const a=(i-2)*.45,sh=cone(body,.035,.16+(i%2)*.06,glow(o.crystal||'#7fd8c0',1.2),Math.sin(a)*.16,chestY+.12+Math.cos(a)*.05,-.13,5);sh.rotation.set(-.6,0,-a);}
  for(const [x,y,z] of [[-.12,chestY+.15,.14],[.1,chestY-.05,.15],[.06,headY+.1,.08]])lump(body,.035,mat('#4f6a34',{roughness:1,flatShading:true}),x,y,z,1.3,.5,1);}
 if(k==='fire'){core=sphere(body,.08,glow(o.hot||'#ffe070',4.5),0,chestY,.1,1,1.2,.6);core.castShadow=false;
  crown=new THREE.Group();crown.position.set(0,headY+.12,-.02);body.add(crown);
  for(let i=0;i<7;i++){const a=(i-3)*.42,f=cone(crown,.045-Math.abs(i-3)*.005,.28-Math.abs(i-3)*.04,i%2?skin:dark,Math.sin(a)*.09,Math.cos(a)*.04,0,6);f.rotation.z=-a*.7;f.castShadow=false;}
  for(let i=0;i<6;i++){const a=i*1.1;sphere(swirl,.016,dark,Math.cos(a)*.34,.35+i*.12,Math.sin(a)*.3).castShadow=false;}}
 if(k==='air'){for(let i=0;i<3;i++){const ring=part(swirl,new THREE.TorusGeometry(.3+i*.05,.008,4,28,Math.PI*1.3),dark,0,chestY-.1+i*.14,0);ring.rotation.set(Math.PI/2+(i-1)*.3,0,i*2);ring.castShadow=false;}
  for(let i=0;i<8;i++){const a=i*.8;const leaf=part(swirl,new THREE.PlaneGeometry(.04,.02),mat(i%2?'#8a7a4a':'#6a8a3a',{side:THREE.DoubleSide}),Math.cos(a)*.34,.3+i*.09,Math.sin(a)*.34);leaf.rotation.set(a,a*2,a*.5);}}
 if(k==='water'){const foam=mat('#eef8ff',{roughness:.4});crown=new THREE.Group();crown.position.set(0,headY+.1,-.05);body.add(crown);for(let i=0;i<7;i++){const a=(i-3)*.4;sphere(crown,.04-Math.abs(i-3)*.004,foam,Math.sin(a)*.1,Math.cos(a)*.03,-Math.abs(i-3)*.015).castShadow=false;}
  for(let i=0;i<6;i++){const a=i*1.2;sphere(swirl,.018,dark,Math.cos(a)*.32,.3+i*.1,Math.sin(a)*.28,1,1.4,1).castShadow=false;}}
 if(core)g.userData.core=core;
 return trimDraws(Object.assign(actor(g,body,legs,tail,[],k==='earth'?'idle':'hover'),{element:k,swirl},crown?{crown}:{},core?{core}:{}));
}
const ELEMENTALS={'air elemental':{kind:'air',color:'#b8d8e8',eye:'#e8fbff',scale:1.3},'fire elemental':{kind:'fire',color:'#ff6a1e',hot:'#ffd84a',eye:'#fff6c0',scale:1.3},'earth elemental':{kind:'earth',color:'#7a6a54',eye:'#ffb040',crystal:'#7fd8c0',scale:1.5},'water elemental':{kind:'water',color:'#3a7ac8',eye:'#c8f0ff',scale:1.3},stalker:{kind:'air',color:'#c8c8d0',eye:'#e0e0ff',scale:1.2}};

// Angels: a robed figure hovering on feathered wings, with a halo and a sword. The wings
// are pivots at the shoulder blades, so the default wing beat in live.js flexes them.
const FEATHER=new THREE.SphereGeometry(1,8,6);
// A fallen angel's feather: a flat blade tapering to a point at its far end, not a rounded vane.
const SHARD=new THREE.ConeGeometry(1,2,4,1);
function angel(o){
 const g=new THREE.Group(),body=new THREE.Group(),wings=[],fallen=!!o.fallen;g.add(body);g.scale.setScalar(o.scale||1);
 const robe=mat(o.robe,{roughness:.75}),fold=mat(shade(o.robe,.82),{roughness:.8}),trim=mat(o.trim||'#d8b04a',{metalness:.7,roughness:.3}),skin=mat(o.skin||'#f0d4b8',{roughness:.7}),
  hair=mat(o.hair||'#e0c070',{roughness:.6}),plume=mat(o.wing||'#f4f0e6',{roughness:.7,side:THREE.DoubleSide}),plumeTip=mat(o.wingTip||shade(o.wing||'#f4f0e6',.8),{roughness:.75,side:THREE.DoubleSide}),
  light=mat(o.glow||'#ffe89a',{emissive:o.glow||'#ffe89a',emissiveIntensity:2.2,roughness:.3}),horn=fallen?mat('#19141a',{roughness:.4,metalness:.2}):null;
 const feather=(p,x,y,z,len,w,a,m)=>{const f=part(p,fallen?SHARD:FEATHER,m,x+Math.sin(-a)*len/2,y+Math.cos(a)*len/2,z);f.scale.set(w,len/2,.008);f.rotation.z=a;f.castShadow=false;return f;};
 // robe: a long gown that flares to a rippling hem above the floor, with a gold hem band and folds.
 // A fallen angel's is torn: a deep ragged hem with shreds hanging off it, and no hem band.
 const gown=part(body,tatter(new THREE.LatheGeometry([[.2,.1],[.2,.12],[.17,.22],[.14,.38],[.13,.5],[.14,.6],[.12,.7],[.08,.76]].map(([r,h])=>new THREE.Vector2(r,h)),28),fallen?.3:.16,fallen?.058:.035,fallen?9:5),robe);gown.scale.z=.85;
 if(!fallen)cylinder(body,.203,.2,.02,trim,0,.12,0,28).scale.z=.85;
 else for(let i=0;i<9;i++){const a=(i+.3)/9*Math.PI*2+.2*Math.sin(i*2.7),len=.07+.05*((i*5)%3)/2,r=cone(body,.022,len,robe,Math.sin(a)*.19,.1-len/2+.03,Math.cos(a)*.16,4);r.rotation.set(Math.PI+Math.cos(a)*.18,a,-Math.sin(a)*.18);}
 for(let i=0;i<6;i++){const a=(i+.5)/6*Math.PI*2;segment(body,[Math.sin(a)*.19,.13,Math.cos(a)*.16],[Math.sin(a)*.13,.5,Math.cos(a)*.11],.014,.006,fold);}
 part(body,new THREE.TorusGeometry(.135,.014,6,24),trim,0,.5,0).rotation.x=Math.PI/2;
 // chest: a gold breastplate for archons, a crossed stole otherwise
 if(o.armor){lathe(body,[[.13,.5],[.145,.58],[.135,.68],[.09,.75]],trim,0,0,.01).scale.z=.85;for(let i=0;i<2;i++)cylinder(body,.01,.01,.2,light,(i?1:-1)*.04,.62,.12,6);}
 else for(const side of [-1,1]){const s=rounded(body,.035,.3,.012,trim,side*.05,.62,.115,.006);s.rotation.set(-.2,0,side*.35);}
 // arms in wide sleeves: the right raises a sword, the left hand is open in blessing
 for(const side of [-1,1]){const sh=[side*.13,.71,0],el=side>0?[.21,.6,.08]:[-.2,.56,.06],wr=side>0?[.2,.7,.17]:[-.25,.5,.16];
  sphere(body,.05,robe,...sh);segment(body,sh,el,.045,.05,robe);segment(body,el,wr,.05,.065,robe);
  const cuff=segment(body,el,wr,.066,.068,trim);cuff.scale.y=.12;cuff.position.set(...wr.map((v,i)=>v-(wr[i]-el[i])*.06));
  hand(body,wr,side>0?[0,.3,1]:[-.2,-.3,1],side,skin);
  // a fallen angel's left wrist still wears an iron manacle, its broken chain hanging from it
  if(fallen&&side<0){const d=new THREE.Vector3(...wr).sub(new THREE.Vector3(...el)).normalize();
   const cuffRing=part(body,new THREE.TorusGeometry(.038,.012,6,18),trim,wr[0]+d.x*.015,wr[1]+d.y*.015,wr[2]+d.z*.015);cuffRing.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),d);
   for(let k=0;k<4;k++){const l=part(body,new THREE.TorusGeometry(.016,.0045,5,10,k===3?Math.PI*1.4:Math.PI*2),trim,wr[0]-.01,wr[1]-.07-k*.027,wr[2]-.01);l.rotation.set(0,k%2?Math.PI/2:0,Math.PI/2);l.scale.y=1.35;}}}
 if(o.sword){const s=new THREE.Group();s.position.set(.2,.72,.2);s.rotation.set(.5,0,-.25);body.add(s);
  cylinder(s,.014,.014,.08,mat('#4a3020'),0,-.02,0,8);rounded(s,.14,.02,.03,trim,0,.03,0,.008);sphere(s,.018,trim,0,-.065,0);
  const blade=rounded(s,.035,.44,.008,o.flame?mat(o.flame,{emissive:o.flame,emissiveIntensity:2.6,roughness:.2}):M.steel,0,.26,0,.004);
  if(o.flame){blade.castShadow=false;for(let i=0;i<6;i++){const f=cone(s,.02,.09,light,(i%2?1:-1)*.02,.1+i*.065,0,5);f.rotation.z=(i%2?-1:1)*.35;f.castShadow=false;}}
  // a fallen angel's blade is serrated: hooked iron teeth swept back up both edges
  if(fallen)for(const side of [-1,1])for(let i=0;i<5;i++){const t=cone(s,.007,.032,trim,side*.022,.1+i*.07+(side>0?.035:0),0,4);t.rotation.z=-side*1.05;}}
 // head: a calm face with softly glowing eyes and long golden locks
 const headY=.86;cylinder(body,.035,.04,.08,skin,0,.78,0,10);sphere(body,.085,skin,0,headY,.01,1,1.08,1);
 for(const side of [-1,1]){const eye=sphere(body,.013,light,side*.032,headY+.01,.08,fallen?1.25:1,.7,.6);eye.castShadow=false;if(fallen)eye.rotation.z=side*.45;}
 // a fallen angel scowls under a heavy brow, and black horns sweep back from its temples
 if(fallen)for(const side of [-1,1]){rounded(body,.05,.013,.022,hair,side*.032,headY+.032,.074,.005).rotation.set(-.2,0,side*.42);
  const pts=[[side*.045,headY+.06,.04],[side*.075,headY+.12,-.01],[side*.09,headY+.145,-.08],[side*.085,headY+.13,-.15],[side*.07,headY+.1,-.19]],rad=[.02,.014,.009,.005,.0015];
  for(let k=0;k<4;k++)segment(body,pts[k],pts[k+1],rad[k],rad[k+1],horn);}
 sphere(body,.093,hair,0,headY+.025,-.01,1.02,1,1).scale.set(1.03,1,1);
 for(let i=0;i<7;i++){const a=(i-3)*.42;tube(body,[[Math.sin(a)*.085,headY+.02,Math.cos(a)*.06-.02],[Math.sin(a)*.1,headY-.06,Math.cos(a)*.05-.04],[Math.sin(a)*.09,headY-.14,Math.cos(a)*.04-.06]],.022,hair,6).scale.z=.9;}
 // halo: a glowing ring over the head; archons wear a crown of light rays on it
 // A halo with rays or thorns is a group of its own, so mergeStatic bakes them into one draw
 // (meshes parented to a mesh are never merged).
 const crowned=fallen||o.rays,halo=crowned?new THREE.Group():part(body,new THREE.TorusGeometry(.1,.011,8,32),light);
 if(crowned){body.add(halo);part(halo,new THREE.TorusGeometry(.1,.011,8,32,fallen?Math.PI*1.5:Math.PI*2),light).castShadow=false;}
 halo.position.set(0,headY+.14,-.03);halo.rotation.x=Math.PI/2-.25;halo.castShadow=false;
 // a fallen angel's halo is broken and askew: a gap with a shard drifting off it, and jagged thorns
 if(fallen){halo.rotation.set(Math.PI/2-.45,.32,.6);halo.position.set(.015,headY+.17,-.05);
  const shard=part(halo,new THREE.TorusGeometry(.1,.011,6,6,Math.PI*.2),light,.016,-.022,.012);shard.rotation.z=Math.PI*1.64;shard.castShadow=false;
  for(let i=0;i<8;i++){const a=(i+.4)/8*Math.PI*1.45,len=i%2?.028:.055,r=cone(halo,.009,len,light,Math.cos(a)*(.1+len/2),Math.sin(a)*(.1+len/2),0,4);r.rotation.z=a-Math.PI/2+(i%3-1)*.25;r.castShadow=false;}}
 if(o.rays)for(let i=0;i<9;i++){const a=i/9*Math.PI*2,r=cone(halo,.012,.07,light,Math.cos(a)*.1,Math.sin(a)*.1,0,4);r.rotation.z=a-Math.PI/2;r.castShadow=false;}
 // wings: a pivot at each shoulder blade holding a leading-edge bone, long primaries fanning
 // down from it and a shorter covert row over their roots
 for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*.07,.7,-.1);body.add(pivot);
  const wing=new THREE.Group();wing.rotation.y=side*.45;pivot.add(wing);const span=o.span||.75;
  const edge=[];for(let i=0;i<=6;i++){const t=i/6;edge.push([side*(.02+.44*t)*span,(.02+.28*Math.sin(t*2.4))*span,-.01]);}
  tube(wing,edge,.018,plume,16);
  // a fallen angel's wing is ragged: blade-like primaries of uneven length with two torn out, and
  // hooked horn claws at the wrist and the tip of the bone
  const jag=[1,.8,1.18,.7,1.12,.86,1.26,.74,1.1,.82,1.22];
  for(let i=0;i<11;i++){const t=i/10,x=side*(.03+.43*t)*span,y=(.02+.28*Math.sin(t*2.4))*span,len=(.2+.2*t+.06*Math.sin(t*3))*span*(fallen?jag[i]:1);
   if(!fallen||(i!==3&&i!==8))feather(wing,x,y,-.015,len,fallen?.034:.04,Math.PI+side*(.1+1.2*t),i>7?plumeTip:plume);
   if(i<9)feather(wing,x,y+.01,-.004,len*.55,fallen?.04:.045,Math.PI+side*(.15+1.1*t),fallen&&i%3===2?plumeTip:plume);}
  if(fallen)for(const [k,len] of [[4,.06],[6,.045]]){const [x,y,z]=edge[k],c=cone(wing,.011,len,horn,x+side*len*.35,y+len*.3,z,5);c.rotation.z=-side*(k===6?1.4:.9);}
  pivot.userData.side=side;wings.push(pivot);}
 return trimDraws(actor(g,body,[],null,wings,'hover'));
}
const ANGELS={angel:{robe:'#eeeae0',sword:true,flame:'#ff9a3a',scale:1.28},
 // the dark Angel (UnNetHack, Gehennom only): a fallen angel in torn black, ashen-skinned, horned,
 // with a broken ember halo, ragged black wings, a serrated burning blade and a broken manacle
 'dark angel':{fallen:true,robe:'#1d1a21',trim:'#3c3638',skin:'#8c8690',hair:'#141116',wing:'#18151b',wingTip:'#3a1714',glow:'#ff3a1e',sword:true,flame:'#c4261a',span:.82,scale:1.25},
 aleax:{robe:'#b8b0a0',trim:'#9aa4aa',hair:'#6a4a2a',wing:'#dcd6ca',glow:'#fff4d0',sword:true,span:.65,scale:1.2},archon:{robe:'#f6f2ea',trim:'#e0b83a',armor:true,rays:true,sword:true,flame:'#bfe4ff',glow:'#fff2b0',scale:1.3,span:.85}};

const VAMPIRES={vampire:{scale:1.05},'vampire lord':{suit:'#2a1420',lining:'#b01828',collar:.3,medallion:true,evil:'#c01828',scale:1.18},'vampire mage':{suit:'#221a30',cape:'#2a1440',lining:'#6a2a9a',eye:'#d06aff',orb:'#b070ff',evil:'#8a30d0',scale:1.15},'vlad the impaler':{suit:'#3a1418',cape:'#1a0c10',lining:'#c8a040',vlad:true,evil:'#d02030',scale:1.3}};


// Demons and devils: a hunched fiend on goat-jointed legs ending in cloven hooves, with a heavy chest,
// clawed hands, a snarling fanged face and glowing eyes. Options pick horns (ram, long, short), a head
// (fiend, vulture beak, toad, boar, bone skull), bat wings, a spade-tipped tail, extra arm pairs, back spikes,
// a flame mantle and a weapon (whip, trident, sword). Slim demons (succubus, incubus, erinys) get long hair
// and a lighter build; djinn and sandestins trail a smoky wisp instead of legs and hover.
function demon(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[],wings=[];g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.skin,{roughness:.7}),dark=mat(shade(o.skin,.55),{roughness:.8}),horn=mat(o.horn||'#2a2018',{roughness:.45}),claw=mat('#15100c',{roughness:.35,metalness:.2}),
  tooth=mat('#e8e0c4',{roughness:.4}),glow=mat(o.eye||'#ffcc30',{emissive:o.eye||'#ffcc30',emissiveIntensity:3,roughness:.3}),mouth=mat('#2a0808',{roughness:1}),
  web=mat(o.wing||shade(o.skin,.45),{roughness:.85,side:THREE.DoubleSide,transparent:true,opacity:.92});
 const slim=!!o.slim,bulk=o.bulk||1,hipY=o.smoke?.5:.44,chestY=slim?.72:.7,shoulderX=(slim?.12:.17)*bulk,headY=slim?.97:.99+.03*(bulk-1);
 // lower body: digitigrade goat legs with a backward shin and a cloven hoof, or a twisting smoke wisp
 if(o.smoke){const wisp=mat(o.skin,{roughness:.9,transparent:true,opacity:.7,emissive:o.skin,emissiveIntensity:.25});
  const tail=lathe(body,[[.01,.08],[.04,.12],[.08,.22],[.12,.36],[.14,.48],[.12,.54]],wisp);tail.castShadow=false;
  for(let i=0;i<3;i++){const a=i*2.1,pts=[];for(let k=0;k<=6;k++){const t=k/6;pts.push([Math.sin(a+t*4)*(.13-.1*t),.5-.42*t,Math.cos(a+t*4)*(.13-.1*t)]);}tube(body,pts,.02,wisp,16).castShadow=false;}}
 else for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.1*bulk,hipY,0);body.add(leg);
  const k=[side*.02,-.16,.09],a=[side*.02,-.32,-.05],f=[side*.02,-.43,.0];
  segment(leg,[0,0,0],k,.075*bulk,.055,skin);sphere(leg,.05,skin,...k);segment(leg,k,a,.045,.03,dark);segment(leg,a,f,.03,.025,dark);
  for(const x of [-.018,.018])rounded(leg,.032,.03,.06,horn,side*.02+x,-.43,.02,.01);legs.push(leg);}
 // torso: a broad chest over a narrow waist, pectorals and a column of belly plates
 sphere(body,(slim?.12:.15)*bulk,skin,0,.56,0,1.1,1,.85);
 sphere(body,(slim?.14:.19)*bulk,skin,0,chestY,.0,1.15,1.05,.85);
 if(!slim)for(const side of [-1,1])sphere(body,.09*bulk,skin,side*.07*bulk,chestY+.04,.1*bulk,1,.8,.6);
 for(let i=0;i<3;i++)rounded(body,.1*bulk,.04,.03,dark,0,.5+i*.06,.12*bulk-i*.005,.012);
 if(o.spikes)for(let i=0;i<5;i++){const s=cone(body,.022,.1,o.spikes==='bone'?tooth:horn,0,.52+i*.09,-.14*bulk+i*.005,4);s.rotation.x=-1.2;}
 // arms: shoulder, elbow, wrist and three hooked claws; extra pairs sit lower on the flanks
 const pairs=o.arms||1;
 for(let p=0;p<pairs;p++)for(const side of [-1,1]){const dy=p*-.11,sc=1-p*.15,sh=[side*shoulderX,chestY+.12+dy,0],el=[side*(shoulderX+.1*sc),chestY-.04+dy,.04+p*.02],wr=[side*(shoulderX+.08*sc),chestY-.18+dy,.14];
  sphere(body,.06*sc*bulk,skin,...sh);segment(body,sh,el,.05*sc*bulk,.04*sc,skin);segment(body,el,wr,.04*sc,.03*sc,skin);
  if(o.spikes)cone(body,.015,.06,horn,el[0]+side*.03,el[1],el[2]-.02,4).rotation.z=-side*1.3;
  for(let k=-1;k<=1;k++){const c=cone(body,.01,.06,claw,wr[0]+k*.015,wr[1]-.04,wr[2]+.01,4);c.rotation.x=Math.PI+.3;c.rotation.z=k*.2;}}
 // weapon in the right hand
 const grip=[shoulderX+.08,chestY-.2,.16];
 if(o.weapon==='whip'){const pts=[grip,[grip[0]+.1,grip[1]-.12,.3],[grip[0]+.05,.1,.42],[grip[0]-.12,.02,.38],[grip[0]-.24,.01,.22]];const lash=tube(body,pts,.012,o.flame?mat(o.flame,{emissive:o.flame,emissiveIntensity:2.4}):M.leather,20);lash.castShadow=false;if(o.flame){lash.userData.part='whip';lash.userData.path=pts;}}
 else if(o.weapon==='trident'){const t=new THREE.Group();t.position.set(...grip);t.rotation.x=.15;body.add(t);cylinder(t,.012,.012,.9,mat('#3a2a1a'),0,.15,0,8);
  for(const x of [-.05,0,.05]){cylinder(t,.008,.008,.12,M.darkSteel,x,.64,0,6);cone(t,.016,.05,M.darkSteel,x,.72,0,4);}rounded(t,.12,.02,.02,M.darkSteel,0,.58,0,.006);}
 else if(o.weapon==='sword'){const s=new THREE.Group();s.position.set(...grip);s.rotation.set(.9,0,-.2);body.add(s);cylinder(s,.013,.013,.08,M.leather,0,-.02,0,8);rounded(s,.12,.02,.03,M.darkSteel,0,.03,0,.006);rounded(s,.035,.42,.008,M.steel,0,.25,0,.004);}
 // head: neck, then one of the four faces
 cylinder(body,.05*bulk,.06*bulk,.08,skin,0,headY-.1,0,10);
 const head=new THREE.Group();head.position.set(0,headY,.02);body.add(head);const form=o.head||'fiend';
 if(form==='beak'){sphere(head,.09,skin,0,0,0,1,1,1.1);const b=cone(head,.04,.18,horn,0,-.03,.14,6);b.rotation.x=Math.PI/2+.4;
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,f=cone(body,.03,.12,dark,Math.sin(a)*.09,headY-.12,Math.cos(a)*.08,4);f.rotation.set(Math.cos(a)*.9,0,-Math.sin(a)*.9);}
  for(const s of [-1,1])sphere(head,.02,glow,s*.05,.02,.07).castShadow=false;}
 else if(form==='toad'){sphere(head,.12,skin,0,-.01,.02,1.4,.65,1.1);cylinder(head,.1,.1,.012,mouth,0,-.04,.1,16).scale.set(1,1,.35);
  for(const s of [-1,1]){sphere(head,.04,skin,s*.08,.06,.04);sphere(head,.025,glow,s*.08,.08,.07).castShadow=false;}}
 else if(form==='boar'){sphere(head,.11,skin,0,0,0,1.15,1,1.05);const snout=cylinder(head,.045,.06,.15,skin,0,-.035,.13,8);snout.rotation.x=Math.PI/2;
  cylinder(head,.062,.062,.03,dark,0,-.035,.21,8).rotation.x=Math.PI/2;for(const s of [-1,1])sphere(head,.009,mouth,s*.025,-.03,.228).castShadow=false;
  rounded(head,.16,.03,.07,dark,0,.07,.03,.012);
  for(const s of [-1,1]){tube(head,[[s*.05,-.07,.13],[s*.08,-.1,.17],[s*.095,-.03,.2],[s*.085,.05,.19]],.013,tooth,10);
   sphere(head,.016,glow,s*.06,.025,.09,1.2,.6,.6).castShadow=false;const ear=cone(head,.022,.07,dark,s*.1,.07,-.03,4);ear.rotation.z=-s*.9;}
  for(let i=0;i<5;i++)cone(head,.012,.06,dark,0,.07,-.07-i*.035,4).rotation.x=-.9;}
 else if(form==='skull'){const bone=mat('#d8cfb4',{roughness:.6});sphere(head,.09,bone,0,.01,0,1,1.05,1.05);rounded(head,.1,.06,.08,bone,0,-.06,.05,.02);
  for(const s of [-1,1]){sphere(head,.026,mouth,s*.035,.01,.075);sphere(head,.012,glow,s*.035,.01,.09).castShadow=false;}
  for(let k=-2;k<=2;k++)rounded(head,.012,.02,.008,tooth,k*.016,-.09,.09,.003);}
 else{sphere(head,.1,skin,0,0,0,1,1.05,1.05);rounded(head,.15,.03,.05,dark,0,.035,.07,.012);
  const jaw=sphere(head,.07,skin,0,-.06,.05,1.1,.6,1);jaw.rotation.x=.2;cylinder(head,.045,.045,.01,mouth,0,-.05,.105,10).rotation.x=Math.PI/2+.3;
  for(const s of [-1,1]){cone(head,.009,.035,tooth,s*.025,-.07,.1,4).rotation.x=Math.PI;cone(head,.008,.03,tooth,s*.03,-.035,.1,4);
   sphere(head,.02,glow,s*.04,.015,.085,1.2,.6,.6).castShadow=false;const ear=cone(head,.025,.08,skin,s*.1,.02,-.01,4);ear.rotation.z=-s*1.3;}}
 if(o.hair){const locks=mat(o.hair,{roughness:.6});sphere(head,.105,locks,0,.02,-.015,1.02,1,1);
  for(let i=0;i<7;i++){const a=(i-3)*.42;tube(head,[[Math.sin(a)*.09,.02,Math.cos(a)*.06-.03],[Math.sin(a)*.11,-.08,Math.cos(a)*.05-.05],[Math.sin(a)*.1,-.2,Math.cos(a)*.04-.07]],.022,locks,6);}}
 // horns
 for(const s of [-1,1]){
  if(o.horns==='ram')tube(head,[[s*.07,.06,0],[s*.13,.1,-.04],[s*.17,.04,-.06],[s*.16,-.04,-.02],[s*.12,-.05,.04]],.024,horn,14);
  else if(o.horns==='long'){tube(head,[[s*.06,.07,0],[s*.1,.16,-.04],[s*.16,.26,-.12],[s*.2,.3,-.22]],.022,horn,12);cone(head,.012,.05,horn,s*.205,.31,-.25,4).rotation.x=-1.2;}
  else if(o.horns==='short'){const h=cone(head,.022,.09,horn,s*.06,.1,0,6);h.rotation.z=-s*.35;}}
 // flame mantle over the shoulders and crown
 if(o.flame){const fire=mat(o.flame,{emissive:o.flame,emissiveIntensity:3.2,roughness:.3,transparent:true,opacity:.85});
  for(let i=0;i<9;i++){const a=(i/8-.5)*2.6,f=cone(body,.035,.16+.06*Math.cos(a),fire,Math.sin(a)*.2*bulk,chestY+.16+Math.cos(a)*.04,-.08-Math.cos(a)*.04,5);f.rotation.z=-a*.3;f.castShadow=false;}
  for(let i=0;i<3;i++){const f=cone(head,.025,.1,fire,(i-1)*.04,.14,-.04,5);f.castShadow=false;}}
 // evil glow (balrogs): molten cracks split the hide of chest and belly, and a pool of hellglow lies under the hooves
 if(o.evil){const ember=mat(o.evil,{emissive:o.evil,emissiveIntensity:2.4,roughness:.5}),pool=mat(o.evil,{emissive:o.evil,emissiveIntensity:1.2,transparent:true,opacity:.17,depthWrite:false});ember.name=pool.name='evil-glow';
  for(const [x,y,z,rz] of [[-.07,chestY+.06,.15,.35],[.06,chestY,.16,-.5],[-.03,chestY-.08,.17,-.2],[.02,.55,.14,.45],[-.07,.5,.13,-.55]]){const c=rounded(body,.012,.08,.008,ember,x*bulk,y,z*bulk,.004);c.rotation.z=rz;c.castShadow=false;}
  for(const side of [-1,1]){const c=rounded(body,.01,.07,.008,ember,side*.12*bulk,chestY+.05,.1,.004);c.rotation.z=side*.7;c.castShadow=false;}
  const p=cylinder(g,.4,.46,.004,pool,0,.004,0,24);p.userData.ring=true;p.castShadow=false;p.receiveShadow=false;
  // presence: dark smoke trails off the shoulders and horns, and embers hang in the air around the fiend (static, no per-frame cost)
  const smoke=mat('#1a1210',{roughness:1,transparent:true,opacity:.38,depthWrite:false}),trail=new THREE.Group();smoke.name='evil-smoke';
  // the trails are transparent, so mergeStatic leaves them alone: bake the six cones into one mesh here
  for(const side of [-1,1])for(let i=0;i<3;i++){const c=cone(trail,.07-i*.012,.4+i*.12,smoke,side*(.2+i*.05)*bulk,chestY+.3+i*.1,-.1-i*.03,6);c.rotation.z=-side*(.15+i*.12);c.updateMatrix();}
  const trails=part(body,mergeGeometries(trail.children.map(c=>c.geometry.clone().applyMatrix4(c.matrix))),smoke);trails.castShadow=false;
  for(let i=0;i<7;i++){const a=i*2.4,r=.3+.06*(i%3),e=rounded(body,.02,.02,.02,ember,Math.sin(a)*r*bulk,.3+i*.13,Math.cos(a)*r*bulk,.006);e.castShadow=false;}}
 // signature detail for the lesser devils: each carries the mark of its own torment
 if(o.mark==='ribs'){const bone=mat('#d8cfb4',{roughness:.6});bone.name='devil-ribs';for(let i=0;i<4;i++){const y=chestY-.06+i*.05;for(const side of [-1,1])tube(body,[[side*.02,y,.15*bulk],[side*.11,y-.01,.13*bulk],[side*.17,y-.04,.05*bulk]],.009,bone,6).castShadow=false;}}
 if(o.mark==='frost'){const ice=mat('#cfeaff',{emissive:'#50b8ff',emissiveIntensity:.9,roughness:.2,transparent:true,opacity:.8});ice.name='devil-rime';
  for(const side of [-1,1])for(let i=0;i<3;i++){const c=cone(body,.018,.12+i*.03,ice,side*(.14+i*.05)*bulk,chestY+.12-i*.02,-.02+i*.05,4);c.rotation.z=Math.PI+side*(.2+i*.15);c.castShadow=false;}}
 if(o.mark==='iron'){const iron=mat('#2a2a2e',{roughness:.5,metalness:.6});iron.name='devil-iron';part(body,new THREE.TorusGeometry(.1*bulk,.012,6,16),iron,0,chestY+.12,0).rotation.x=Math.PI/2;
  part(body,new THREE.TorusGeometry(.14*bulk,.014,6,16),iron,0,.5,0).rotation.x=Math.PI/2;for(let i=0;i<5;i++){const a=(i/4-.5)*1.8;cone(body,.012,.05,iron,Math.sin(a)*.14*bulk,.5,Math.cos(a)*.14*bulk,4).rotation.set(Math.cos(a)*1.5,0,-Math.sin(a)*1.5);}}
 if(o.mark==='gilt'){const gold=mat('#6a5424',{roughness:.4,metalness:.7}),blood=mat('#6a1a14',{roughness:.6});gold.name='devil-gilt';blood.name='devil-gore';
  part(body,new THREE.TorusGeometry(.1*bulk,.012,6,16),gold,0,chestY+.13,0).rotation.x=Math.PI/2;
  for(let i=0;i<5;i++){const a=(i/4-.5)*2.2;cone(body,.012,.05,gold,Math.sin(a)*.1*bulk,chestY+.13,Math.cos(a)*.1*bulk,4).rotation.set(Math.cos(a)*1.5,0,-Math.sin(a)*1.5);}
  for(const [x,y] of [[-.09,chestY-.02],[.07,chestY-.1],[0,chestY-.17]]){const c=rounded(body,.016,.07,.006,blood,x*bulk,y,.17*bulk,.003);c.rotation.z=x*4;c.castShadow=false;}}
 if(o.mark==='ruff'){const fe=mat('#2a2218',{roughness:.9});fe.name='devil-ruff';
  for(let i=0;i<9;i++){const a=(i/9)*Math.PI*2,c=cone(body,.02,.11,fe,Math.sin(a)*.1*bulk,chestY+.2,Math.cos(a)*.09*bulk,4);c.rotation.set(Math.cos(a)*.9,0,-Math.sin(a)*.9+Math.PI);c.castShadow=false;}}
 if(o.mark==='boils'){const tusk=mat('#d8cfb4',{roughness:.5}),boil=mat('#e07a20',{emissive:'#e07a20',emissiveIntensity:1.6,roughness:.4});tusk.name='devil-tusks';boil.name='devil-boils';
  for(const side of [-1,1]){const t=cone(head,.016,.11,tusk,side*.05,-.06,.1,5);t.rotation.x=-.5;t.castShadow=false;}
  for(const [x,y,z,r] of [[-.12,chestY-.1,.15,.03],[.1,chestY-.16,.17,.025],[.03,chestY-.04,.18,.02],[-.05,chestY-.2,.18,.022]])sphere(body,r,boil,x*bulk,y,z*bulk).castShadow=false;}
 // a second head (Demogorgon): the first is shifted aside and a twin snarls beside it, turned slightly away
 if(o.heads===2){head.position.x=-.12;head.rotation.y=.25;const twin=head.clone();twin.position.set(.12,headY-.01,.02);twin.rotation.y=-.3;body.add(twin);}
 // bat wings on finger bones
 if(o.wings)for(const side of [-1,1]){const wing=new THREE.Group();wing.position.set(side*.08,chestY+.12,-.12*bulk);body.add(wing);const sp=o.wings*1.45;
  const tips=[[side*.26*sp,.4*sp],[side*.46*sp,.26*sp],[side*.5*sp,.02],[side*.32*sp,-.16*sp]],shape=new THREE.Shape();shape.moveTo(0,0);
  tips.forEach(([x,y],i)=>{shape.lineTo(x,y);if(i<tips.length-1){const [nx,ny]=tips[i+1];shape.quadraticCurveTo((x+nx)*.38,(y+ny)*.38,nx,ny);}});shape.lineTo(side*.04,-.1*sp);shape.lineTo(0,0);
  // torn holes between the finger bones: ragged little triangles, each well inside the membrane
  for(const [hx,hy,hr,ha] of [[.3,.13,.05,.2],[.4,.08,.04,1.1],[.19,.03,.035,2.3]]){const hole=new THREE.Path();for(let k=0;k<3;k++){const an=ha+k*2.1,rr=hr*(k===1?1.5:1);hole[k?'lineTo':'moveTo'](side*(hx+Math.cos(an)*rr)*sp,(hy+Math.sin(an)*rr)*sp);}hole.closePath();shape.holes.push(hole);}
  part(wing,new THREE.ShapeGeometry(shape,6),web);
  segment(wing,[0,0,0],[side*.12*sp,.22*sp,.005],.02,.014,dark);for(const [x,y] of tips.slice(0,3))segment(wing,[side*.12*sp,.22*sp,.005],[x,y,.005],.01,.005,dark);
  cone(wing,.012,.05,claw,side*.12*sp,.25*sp,.005,4);wing.rotation.y=side*-.4;wings.push(wing);}
 // tail: a thin whip curling behind, ending in a spade
 let tail=null;
 if(o.tail&&!o.smoke){tail=new THREE.Group();tail.position.set(0,.5,-.1*bulk);tail.scale.setScalar(.75);body.add(tail);
  const pts=[[0,0,0],[0,-.14,-.12],[.06,-.3,-.24],[.14,-.36,-.36],[.2,-.3,-.44]];tube(tail,pts,.018,skin,18);
  const spade=cone(tail,.045,.09,dark,.22,-.27,-.47,4);spade.rotation.set(-1,0,-.5);spade.scale.z=.3;
  if(o.spikes)for(const [x,y,z] of [[0,-.14,-.12],[.06,-.3,-.24],[.14,-.36,-.36]])cone(tail,.012,.06,horn,x,y+.03,z,4);}
 return trimDraws(actor(g,body,legs,tail,wings,o.smoke?'hover':'orc'));
}
const RIDERS={death:{robe:'#141218',glow:'#e8f4ff',bone:'#e0dccc',solid:true,evil:true,scale:1.35},famine:{robe:'#4a3a2a',glow:'#e0c060',bone:'#b8a888',solid:true,evil:true,scale:1.25},pestilence:{robe:'#3a4a26',glow:'#9aff4a',bone:'#a8b088',solid:true,evil:true,scale:1.25},war:{robe:'#3a1414',glow:'#ff3a2a',bone:'#a89080',solid:true,sword:true,evil:true,scale:1.3}};
const DEMONS={'water demon':{skin:'#2f5a8a',eye:'#80f0ff',evil:'#40d8c0',horns:'short',head:'toad',tail:true,bulk:1.1,scale:1.1},'lava demon':{skin:'#5a2418',eye:'#ffdd40',horns:'short',flame:'#ff6a20',evil:'#ff6a20',tail:true,bulk:1.15,scale:1.15},
 'horned devil':{skin:'#8a3a24',mark:'iron',evil:'#ff6a18',horns:'long',tail:true,weapon:'trident',scale:1.1},succubus:{skin:'#d8a090',eye:'#ff60a0',evil:'#d0306a',slim:true,hair:'#2a1418',horns:'short',wings:.7,tail:true,scale:1.1},
 // the Minion of Huhetotl (the Archeologist quest nemesis): a black-skinned, long-horned winged fiend with a sword
 'minion of huhetotl':{skin:'#2a2224',eye:'#ff4030',evil:'#a01820',horns:'long',wings:.8,tail:true,weapon:'sword',bulk:1.1,scale:1.3},
 incubus:{skin:'#b07a60',eye:'#ff60a0',evil:'#c0561c',slim:true,hair:'#1a1010',horns:'short',wings:.7,tail:true,scale:1.1},erinys:{skin:'#a86a58',eye:'#ff4030',evil:'#ff4030',slim:true,hair:'#3a2418',wings:.8,weapon:'sword',scale:1.05},
 'barbed devil':{skin:'#9a2e20',evil:'#ff2a28',horns:'short',spikes:true,tail:true,scale:1.1},marilith:{skin:'#7a3a5a',mark:'gilt',evil:'#c04a8a',eye:'#ffdd40',slim:true,hair:'#1a1418',arms:3,weapon:'sword',tail:true,scale:1.1},
 vrock:{skin:'#6a5a48',mark:'ruff',evil:'#a8b030',head:'beak',horn:'#3a3028',wings:.9,scale:1.1},'bone devil':{skin:'#9a9078',mark:'ribs',evil:'#c8e04a',head:'skull',spikes:'bone',tail:true,scale:1.1},
 'ice devil':{skin:'#b8d0e0',mark:'frost',evil:'#50b8ff',eye:'#60c0ff',horn:'#e8f4ff',head:'skull',spikes:'bone',tail:true,scale:1.15},nalfeshnee:{skin:'#5a4a3a',mark:'boils',evil:'#e07a20',head:'boar',spikes:'bone',wings:.5,bulk:1.3,scale:1.15},
 'pit fiend':{skin:'#7a1a18',evil:'#ff3a1a',horns:'long',wings:1,tail:true,weapon:'trident',scale:1.3},balrog:{skin:'#3a1a14',eye:'#ffcc40',horns:'long',wings:1.1,flame:'#ff5a1a',evil:'#ff4a10',weapon:'whip',bulk:1.2,scale:1.35},
 "durin's bane":{skin:'#2a1410',eye:'#ffcc40',horns:'long',wings:1.1,flame:'#ff4a10',evil:'#ff3a08',weapon:'whip',bulk:1.2,scale:1.45},
 yeenoghu:{skin:'#8a7040',evil:'#e0a020',eye:'#ffdd40',horns:'short',weapon:'whip',scale:1.2},orcus:{skin:'#4a4a3a',evil:'#8aff6a',horns:'ram',wings:.8,tail:true,weapon:'trident',bulk:1.15,scale:1.25},
 geryon:{skin:'#6a4a2a',evil:'#ff7a20',horns:'ram',wings:.9,tail:true,scale:1.2},dispater:{skin:'#8a2a24',evil:'#ff3030',horns:'long',tail:true,weapon:'trident',scale:1.15},
 baalzebub:{skin:'#3a4a2a',evil:'#b8ff30',eye:'#ff4030',horns:'short',wings:.7,scale:1.2},asmodeus:{skin:'#a02018',evil:'#ff2a10',eye:'#ffe040',horns:'long',tail:true,weapon:'trident',scale:1.25},
 demogorgon:{skin:'#5a6a4a',evil:'#40ffa0',heads:2,eye:'#ff3030',horns:'short',arms:2,tail:true,bulk:1.2,scale:1.3},nalzok:{skin:'#4a1a2a',evil:'#c02aff',eye:'#ff4060',horns:'ram',wings:1,flame:'#c02aff',tail:true,scale:1.2},
 'mail daemon':{skin:'#3a5a9a',eye:'#ffe040',horns:'short',wings:.6,tail:true,scale:1.25},djinni:{skin:'#d8a040',eye:'#fff080',hair:'#1a1410',evil:'#ffb030',smoke:true,scale:1.15},sandestin:{skin:'#8a8aa0',eye:'#c0f0ff',horns:'short',evil:'#80d8ff',smoke:true,scale:1.15}};

// trappers (t): a broad, ragged mantle flattened against the floor like a dropped cloak, mottled to match the stone,
// with warty ridges, a fringed dark hem, and a wide toothed maw with stalked eyes along the front edge;
// the front lip and back hem are the leg pivots, so they lift and ripple as it creeps
function trapper(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const hide=mat(o.hide,{roughness:.95}),mottle=mat(shade(o.hide,.68),{roughness:.95}),hem=mat(shade(o.hide,.42),{roughness:1,side:THREE.DoubleSide}),
  wart=mat(shade(o.hide,1.18),{roughness:.9}),mouth=mat('#2a0c10',{roughness:1}),gum=mat('#6a2230',{roughness:.7}),tooth=mat('#d8ceb0',{roughness:.45}),
  eye=mat(o.eye,{emissive:o.eye,emissiveIntensity:1.6,roughness:.3}),stalk=mat(shade(o.hide,.8),{roughness:.9});
 // ragged outline: radius wobbles around the circle, and the mantle is a little longer than it is wide
 const ragged=(geo,amp)=>{const pos=geo.attributes.position,v=new THREE.Vector3();for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);const a=Math.atan2(v.x,v.z),k=1+amp*(Math.sin(a*5+.7)+.5*Math.sin(a*11+2.1)+.3*Math.sin(a*17));pos.setXYZ(i,v.x*k,v.y,v.z*k*1.06);}geo.computeVertexNormals();return geo;};
 const mantle=(parent,profile,amp,material,phiStart,phiLength,z=0)=>{const m=part(parent,ragged(new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),40,phiStart,phiLength),amp),material,0,0,z);return m;};
 // the domed middle and its fringed hem, which lies just under the rim and pokes out in tatters
 mantle(body,[[0,.13],[.12,.125],[.22,.1],[.3,.065],[.36,.03],[.38,.012]],.05,hide);
 mantle(body,[[.3,.018],[.36,.012],[.42,.004]],.07,hem);
 // mottled blotches and warty ridges across the back
 for(let i=0;i<9;i++){const a=i*2.39,r=.06+(i%4)*.065;sphere(body,.05+(i%3)*.012,mottle,Math.sin(a)*r,.105-r*.14,Math.cos(a)*r*1.1,1.2,.18,1);}
 for(let i=0;i<14;i++){const a=i*1.7+.3,r=.1+(i%5)*.045;sphere(body,.016+(i%2)*.006,wart,Math.sin(a)*r,.125-r*.2,Math.cos(a)*r*1.1,1,.7,1);}
 for(const side of [-1,1])tube(body,[[side*.05,.13,-.2],[side*.1,.125,-.05],[side*.1,.12,.1],[side*.06,.11,.22]],.012,wart,10);
 // the gnawed remains of earlier meals lie half-dissolved on the back: a skull and a few ribs
 const bone=mat('#cfc4a4',{roughness:.7});
 sphere(body,.032,bone,.1,.1,-.05,1,.8,1.1);sphere(body,.012,mouth,.1,.118,-.035,1.2,.6,1);
 for(let i=0;i<3;i++){const rib=part(body,new THREE.BoxGeometry(.05,.008,.008),bone,-.1+i*.01,.1-i*.01,.02+i*.05);rib.rotation.set(0,.4+i*.2,.25);}
 // front lip: a separate flap carrying the maw and eyes, so it can rear up
 const lip=new THREE.Group();lip.position.set(0,.02,.2);body.add(lip);
 mantle(lip,[[0,.08],[.1,.07],[.16,.045],[.2,.012]],.04,hide,-Math.PI/2,Math.PI,.02);
 mantle(lip,[[.16,.012],[.22,.004]],.07,hem,-Math.PI/2,Math.PI,.02);
 const maw=part(lip,new THREE.TorusGeometry(.13,.02,6,18,Math.PI),gum,0,.035,.1);maw.rotation.x=Math.PI/2;maw.scale.set(1,.55,1);
 const throat=part(lip,new THREE.CircleGeometry(.12,18,Math.PI,Math.PI),mouth,0,.036,.1);throat.rotation.x=-Math.PI/2;throat.scale.set(1,.5,1);
 for(let k=0;k<11;k++){const a=Math.PI*(k+.5)/11,t=cone(lip,.009,.03,tooth,Math.cos(a)*.12,.045,.1+Math.sin(a)*.06,4);t.rotation.x=Math.PI;}
 for(const [x,h] of [[-.1,.07],[-.035,.1],[.035,.1],[.1,.07]]){tube(lip,[[x*.8,.06,.02],[x*.95,.06+h*.6,.03],[x,.06+h,.05]],.007,stalk,6);sphere(lip,.018,eye,x,.06+h,.055);sphere(lip,.008,mouth,x,.06+h,.07);}
 legs.push(lip);
 // back hem: the trailing edge of the mantle, rippling behind
 const back=new THREE.Group();back.position.set(0,.01,-.26);body.add(back);
 mantle(back,[[0,.05],[.12,.04],[.18,.018],[.22,.004]],.08,hide,Math.PI/2,Math.PI,-.02);
 legs.push(back);
 return trimDraws(actor(g,body,legs,null,[],'idle'));
}
const TRAPPERS={'lurker above':{hide:'#4a4452',eye:'#c8e040',scale:1.1},trapper:{hide:'#6a6f5e',eye:'#ff8a3a',scale:1.3}};

// Sea monsters (;): wet, glossy swimmers. Fish and eels hang their back half on the actor tail. That group is tipped
// over (rotation.x=-PI/2) so that live.js's tail swing (rotation.z) becomes a side-to-side sweep. Inside it, local +y points
// backwards and local +z points up. Jellyfish trail their tentacles from the swaying tail. Krakens spread their arms as leg pivots.
function finShape(parent,pts,material,x=0,y=0,z=0){const s=new THREE.Shape();s.moveTo(...pts[0]);for(const p of pts.slice(1))s.lineTo(...p);return part(parent,new THREE.ShapeGeometry(s),material,x,y,z);}
function seaMonster(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.color,{roughness:.35,metalness:.05}),belly=mat(o.belly||shade(o.color,1.6),{roughness:.4}),dark=mat(shade(o.color,.55),{roughness:.4}),
  fin=mat(o.fin||shade(o.color,.8),{roughness:.45,side:THREE.DoubleSide}),eye=mat(o.eye||'#e8d860',{emissive:o.eye||'#e8d860',emissiveIntensity:.9,roughness:.2}),
  pupil=mat('#0a0a0c',{roughness:.2}),tooth=mat('#ece6d2',{roughness:.35}),mouth=mat('#2a0c10',{roughness:1});
 const swingTail=(z,y)=>{const t=new THREE.Group();t.position.set(0,y,z);t.rotation.x=-Math.PI/2;body.add(t);return t;};
 if(o.form==='jelly'){
  const glass=mat(o.color,{roughness:.15,transparent:true,opacity:.62,emissive:o.color,emissiveIntensity:.35,side:THREE.DoubleSide}),
   rim=mat(shade(o.color,1.3),{emissive:o.color,emissiveIntensity:.8,roughness:.2});
  lathe(body,[[0,.72],[.1,.71],[.18,.67],[.23,.6],[.25,.53],[.24,.5]],glass);
  sphere(body,.1,rim,0,.6,0,1,.55,1);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;sphere(body,.022,rim,Math.sin(a)*.24,.5,Math.cos(a)*.24,1,.6,1);}
  const tail=new THREE.Group();tail.position.y=.52;body.add(tail);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.2,r=.2,pts=[];for(let k=0;k<=5;k++){const t=k/5;pts.push([Math.sin(a)*r*(1-t*.3)+Math.sin(t*6+i)*.03,-t*.46,Math.cos(a)*r*(1-t*.3)+Math.cos(t*6+i)*.03]);}tube(tail,pts,.006,glass,12);}
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.8,pts=[];for(let k=0;k<=6;k++){const t=k/6;pts.push([Math.sin(a)*.05+Math.sin(t*9+i)*.035,-t*.36,Math.cos(a)*.05+Math.cos(t*9+i)*.035]);}tube(tail,pts,.022-.004*(i%2),rim,18);}
  return trimDraws(actor(g,body,[],tail,[],'hover'));
 }
 if(o.form==='kraken'){
  // a tall, backward-tilted squid mantle with a lateral fin, great round eyes, a ring of curling arms and two long clubbed tentacles
  const mantle=lathe(body,[[0,0],[.14,.03],[.2,.14],[.19,.3],[.14,.44],[.06,.54],[0,.57]],skin,0,.22,-.08);mantle.rotation.x=-.45;
  for(const side of [-1,1]){const f=finShape(body,[[0,0],[.16,.1],[.02,.2]],fin,side*.12,.62,-.28);f.rotation.y=side>0?0:Math.PI;f.rotation.x=-.45;}
  for(let i=0;i<7;i++){const a=i*2.3,r=.1+(i%3)*.04;sphere(body,.028,dark,Math.sin(a)*r*.9,.36+i*.035,.02-i*.035+Math.cos(a)*.05,1,.4,1);}
  for(const side of [-1,1]){sphere(body,.07,eye,side*.14,.3,.1);sphere(body,.036,pupil,side*.175,.3,.14,.35,1.5,.6);}
  sphere(body,.06,dark,0,.2,.14,1.2,.8,1);
  // a horny parrot beak hooked down over the mouth, and old scars raked across the mantle: a kraken is a drowner, not a pet
  const beak=mat('#1a1410',{roughness:.3});
  cone(body,.04,.12,beak,0,.17,.2,5).rotation.x=Math.PI*.78;cone(body,.03,.08,beak,0,.12,.19,5).rotation.x=Math.PI*.2;
  for(let i=0;i<3;i++){const sc=part(body,new THREE.BoxGeometry(.01,.16,.012),dark,.06-i*.04,.34+i*.015,-.1-i*.01);sc.rotation.set(-.45,0,.5);}
  const n=o.arms||8;
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,arm=new THREE.Group();arm.position.set(Math.sin(a)*.08,.18,Math.cos(a)*.08+.04);arm.rotation.y=a;body.add(arm);
   const pts=[];for(let k=0;k<=8;k++){const t=k/8,r=.02+t*.4,curl=t*t*2.2*(i%2?1:-1);pts.push([Math.sin(curl)*r*.4,.02-t*.17+Math.max(0,t-.75)*.5,r*Math.cos(curl*.4)]);}
   tube(arm,pts,.028,skin,20);for(let k=2;k<8;k+=2){const p=pts[k];sphere(arm,.012,belly,p[0],p[1]-.02,p[2],1,.5,1);}
   legs.push(arm);}
  for(const side of [-1,1]){const pts=[[side*.04,.2,.12],[side*.12,.3,.3],[side*.2,.42,.38],[side*.24,.5,.34]];tube(body,pts,.016,skin,16);sphere(body,.045,belly,side*.25,.52,.33,1,1.6,1);}
  return trimDraws(actor(g,body,legs,null,[],'idle'));
 }
 if(o.form==='eel'){
  // a sinuous eel reared out of the water: the rear coils lie low (on the tail, so they sweep), the front rises in an S to a gaping head
  const front=[[0,.06,-.05],[0,.12,.02],[.04,.26,.06],[0,.38,.08],[-.02,.44,.14]];
  tube(body,front,.05,skin,24);
  const tail=swingTail(-.05,.06),rear=[[0,0,0],[.12,.06,-.01],[.2,.2,-.02],[.08,.34,-.03],[-.12,.36,-.04],[-.2,.24,-.045],[-.16,.12,-.05]];
  const taper=(pts,r0)=>{for(let i=0;i<pts.length-1;i++)segment(tail,pts[i],pts[i+1],r0*(1-i/pts.length*.8),r0*(1-(i+1)/pts.length*.8),skin);for(let i=1;i<pts.length-1;i++)sphere(tail,r0*(1-i/pts.length*.8),skin,...pts[i]);};
  taper(rear,.05);
  for(let i=1;i<rear.length;i++){const p=rear[i],f=cone(tail,.012,.06,fin,p[0],p[1],p[2]+.05,4);f.rotation.x=Math.PI/2;}
  for(let i=0;i<front.length-1;i++){const p=front[i];const f=cone(body,.01,.05,fin,p[0],p[1]+.04,p[2]-.03,4);f.rotation.x=-.4;}
  const head=new THREE.Group();head.position.set(-.02,.46,.17);head.rotation.x=.25;body.add(head);
  sphere(head,.06,skin,0,.01,.04,1,.8,1.7);sphere(head,.045,belly,0,-.03,.05,1,.45,1.6);
  const jaw=sphere(head,.04,skin,0,-.045,.07,1,.4,1.6);jaw.rotation.x=.3;
  part(head,new THREE.CircleGeometry(.035,12),mouth,0,-.02,.135).scale.set(1,.6,1);
  for(let k=0;k<6;k++){const x=(k-2.5)*.012;cone(head,.005,.018,tooth,x,-.005,.125,4).rotation.x=Math.PI;cone(head,.005,.016,tooth,x,-.04,.12,4);}
  for(const side of [-1,1]){sphere(head,.015,eye,side*.045,.03,.09);sphere(head,.007,pupil,side*.055,.035,.1);}
  if(o.spark){const glow=mat(o.spark,{emissive:o.spark,emissiveIntensity:2.4,roughness:.3});for(const p of rear.slice(1))sphere(tail,.014,glow,p[0]+.03,p[1],p[2]+.03);for(const p of front.slice(1,4))sphere(body,.014,glow,p[0]+.035,p[1],p[2]+.02);}
  return trimDraws(actor(g,body,[],tail,[],'snake'));
 }
 // fish: a tapered torpedo (shark) or a deep, blunt body with an underbite (piranha), side eyes, dorsal and pectoral fins,
 // and the back third plus the caudal fin on the swinging tail
 const L=o.length||.42,H=o.depth||.13,y=o.swim||.32;
 sphere(body,H,skin,0,y,.02,.8,1,L/H*.62);
 const under=sphere(body,H*.92,belly,0,y-H*.28,.04,.74,.62,L/H*.58);
 const tail=swingTail(-L*.5,y);
 cone(tail,H*.62,L*.6,skin,0,L*.3,0,14).scale.set(.8,1,1);
 finShape(tail,[[0,L*.5],[H*1.5,L*.8],[H*.4,L*.66],[-H*1.2,L*.8]],fin).rotation.y=-Math.PI/2;
 const dorsal=finShape(body,[[-L*.12,0],[L*.02,H*(o.dorsal||1.4)],[L*.16,0]],fin,0,y+H*.85,-L*.08);dorsal.rotation.y=-Math.PI/2;
 for(const side of [-1,1]){const p=finShape(body,[[0,0],[H*1.2,-H*.4],[H*.5,.02]],fin,side*H*.7,y-H*.35,L*.12);p.rotation.set(-Math.PI/2+.2,0,side>0?-.25:Math.PI+.25);}
 for(const side of [-1,1]){sphere(body,H*.18,eye,side*H*.72,y+H*.25,L*.62);sphere(body,H*.09,pupil,side*H*.82,y+H*.27,L*.66);}
 if(o.gills)for(const side of [-1,1])for(let k=0;k<5;k++){const s=part(body,new THREE.BoxGeometry(.004,H*.7,.01),dark,side*H*.79,y,L*.36-k*.035);s.rotation.z=side*.1;}
 // mouth: a dark slit under the snout lined with teeth; a piranha's jaw juts forward
 const jawZ=L*(o.underbite?.8:.66),jawY=y-H*(o.underbite?.35:.5);
 const slit=part(body,new THREE.TorusGeometry(H*.42,H*.1,6,14,Math.PI),mouth,0,jawY,jawZ-H*.25);slit.rotation.x=Math.PI/2;slit.rotation.z=Math.PI;
 for(let k=0;k<9;k++){const a=Math.PI*(k+.5)/9,t=cone(body,H*.06,H*.2,tooth,Math.cos(a)*H*.42,jawY+H*.05,jawZ-H*.25+Math.sin(a)*H*.42,4);t.rotation.x=Math.PI;}
 if(o.underbite)for(let k=0;k<7;k++){const a=Math.PI*(k+.5)/7;cone(body,H*.06,H*.22,tooth,Math.cos(a)*H*.38,jawY+H*.02,jawZ-H*.12+Math.sin(a)*H*.3,4);}
 return trimDraws(actor(g,body,[],tail,[],'hover'));
}
const SEA_MONSTERS={jellyfish:{form:'jelly',color:'#7fa8e8',scale:.9},piranha:{form:'fish',color:'#8a8a94',belly:'#c83a2a',fin:'#6a5a5a',length:.26,depth:.13,underbite:true,dorsal:1,scale:.8},
 shark:{form:'fish',color:'#6a7686',belly:'#e4e4de',length:.4,depth:.12,dorsal:1.9,gills:true,eye:'#1a1a1c',scale:1.5},'giant eel':{form:'eel',color:'#4a5a3a',belly:'#b0a86a',eye:'#e0d040',scale:1.3},
 'electric eel':{form:'eel',color:'#2a4a6a',belly:'#8ab0c0',eye:'#c0e8ff',spark:'#9ae8ff',scale:1.25},kraken:{form:'kraken',color:'#6a2a2e',belly:'#a8827a',eye:'#d8a020',scale:1.4},
 'watcher in the water':{form:'kraken',color:'#4a5a52',belly:'#9aa89a',eye:'#b8ff90',arms:12,scale:1.2}};

// In development the default shape is bright magenta so a missing model cannot hide.
const LOUD_FALLBACK=new THREE.MeshBasicMaterial({color:0xff00ff});
function guardian(o={}){const g=new THREE.Group(),body=new THREE.Group();g.add(body);const armor=o.color?mat(shade(o.color,.7),{roughness:.5,metalness:.4}):M.darkSteel;rounded(body,.42,.78,.38,armor,0,.5,0,.07);sphere(body,.23,M.graySkin,0,1.03,0,1,.9,1);for(const x of [-.4,.4])rounded(body,.25,.5,.3,o.color?mat(o.color,{roughness:.4,metalness:.3}):M.steel,x,.58,0,.05);const core=sphere(body,.09,M.fire,0,.62,.23);g.userData.core=core;eyes(body,M.fire,1.04,.22,.08);g.userData.fallback=true;if(import.meta.env?.DEV)body.traverse(o=>{if(o.isMesh)o.material=LOUD_FALLBACK;});return Object.assign(actor(g,body),{core});}

const SKIN={homunculus:'#5f8a3f',imp:'#a53a2a',manes:'#8a2f2a',lemure:'#6a5040',quasit:'#3f5fa0',tengu:'#3f9a9a'};

const NEMESIS_HUMANS={'warden arianna':1.18,'anaraxis the black':1.2,schliemann:1.15,'king arthur':1.12,'lord sato':1.12,'shan lai ching':1.12,'grand master':1.15,'master kung':1.12,'neferet the green':1.12,'master of thieves':1.12,orion:1.12,'shaman karnov':1.12,'robert the lifer':1.12,twoflower:1.12};
export function createCreature(cell={}){
 const name=(cell.name||'').toLowerCase(),letter=Number.isInteger(cell.symbol)?String.fromCharCode(cell.symbol):'',color=nhColor(cell);
 if(letter==='@'&&isWereMan(name))return createWereMan(name);// a were in human form
 if(/^(sewer rat|giant rat|rabid rat|rat)$/.test(name))return rat(name==='giant rat',name==='rabid rat');
 if(isEnormousRat(name))return createEnormousRat();
 if(name==='rock mole')return rockMole();
 if(name==='woodchuck')return woodchuck();
 if(/grid ?bug/.test(name))return gridBug();
 if(isCanine(name)&&letter!=='@')return createCanine(name);// a were in human form shares the name
 if(isFeline(name))return createFeline(name);
 if(CROCODILES.includes(name))return createCrocodile(name);
 if(LIZARDS[name])return lizard(LIZARDS[name]);
 if(COCKATRICES[name])return cockatrice(COCKATRICES[name]);
 if(isAnt(name))return createAnt(name);
 if(isLocust(name))return createLocust(name);
 if(isBee(name))return createBee(name);
 if(isBeetle(name))return createBeetle(name);
 if(XANS[name])return xan(XANS[name]);
 if(SNAKES[name])return snake(SNAKES[name]);
 if(WORMS[name])return worm(WORMS[name]);
 if(name==='long worm tail')return wormTail({color:color||WORMS['long worm'].color});
 if(VORTICES[name])return vortex(VORTICES[name]);
 if(isPiercer(name))return createPiercer(name);
 if(APES[name])return ape(APES[name]);
 if(MIMICS[name])return mimic(MIMICS[name]);
 if(CENTAURS[name])return centaur(CENTAURS[name]);
 if(HORSES[name])return horseFor(name,color);
 if(PROBOSCIDEANS[name])return proboscidean(PROBOSCIDEANS[name]);
 if(MEGA_RHINOS[name])return megaRhino(MEGA_RHINOS[name]);
 if(name==='rothe')return rothe(ROTHE);
 if(name==='wumpus')return wumpus({scale:1.08,hide:'#3f8f94',fur:'#27595c',belly:'#8ec2b6'});
 if(name==='leocrotta')return leocrotta({scale:1.15,coat:'#a8865a',dark:'#6e5436',mane:'#4a3420',belly:'#cdb48c'});
 if(name==='minotaur')return createMinotaur();
 if(GIANTS[name])return giant(GIANTS[name]);
 if(NYMPHS[name])return nymph(NYMPHS[name]);
 if(MIND_FLAYER_KINDS[name])return createMindFlayer(name);
 if(TROLLS[name])return troll({...TROLLS[name],kind:name});
 if(OGRES[name])return ogre(OGRES[name]);
 if(LICHES[name])return lich(LICHES[name]);
 if(WRAITHS[name])return wraith({...WRAITHS[name],kind:name});
 if(VAMPIRES[name])return vampire({...VAMPIRES[name],kind:name});
 if(XORNS[name])return xorn(XORNS[name]);
 if(NAGAS[name])return naga(NAGAS[name]);
 if(name==='disintegrator')return createDisintegrator();
 if(RUST_MONSTERS[name])return rustMonster({...RUST_MONSTERS[name],kind:name});
 if(UMBER_HULKS[name])return umberHulk(UMBER_HULKS[name]);
 if(HORRORS[name])return shamblingHorror(HORRORS[name]);
 if(ZRUTIES[name])return zruty(ZRUTIES[name]);
 if(LEPRECHAUNS[name])return leprechaun(LEPRECHAUNS[name]);
 if(GARGOYLES[name])return gargoyle(GARGOYLES[name]);
 if(GREMLINS[name])return gremlin(GREMLINS[name]);
 if(KOPS[name])return kop(KOPS[name]);
 if(QUANTUM_MECHANICS[name])return quantumMechanic(QUANTUM_MECHANICS[name]);
 if(ELEMENTALS[name])return elemental(ELEMENTALS[name]);
 if(ANGELS[name])return angel(ANGELS[name]);
 if(WEEPING_ANGELS.includes(name))return createWeepingAngel(name);
 if(JABBERWOCK_KINDS.includes(name))return createJabberwock(name);
 if(TRAPPERS[name])return trapper(TRAPPERS[name]);
 if(SEA_MONSTERS[name])return seaMonster(SEA_MONSTERS[name]);
 if(name==='hezrou'){const h=createHezrou();h.g.scale.setScalar(1.3);return h;}
 if(DEMONS[name])return demon(DEMONS[name]);
 if(RIDERS[name])return wraith({...RIDERS[name],kind:name});
 if(name==='juiblex')return createJuiblex();
 if(name==='shade')return createShade();
 if(GHOSTS.includes(name))return createGhost(name);
 if(name==='couatl')return createCouatl();
 if(UNICORNS[name])return horse(UNICORNS[name]);
 if(name==='floating eye')return floatingEye({});
 if(name==='evil eye'){const a=createEvilEye();a.g.scale.setScalar(1.15);return a;}// a deadlier eye hangs larger than the floating eye
 if(name==='beholder')return createBeholder();
 if(name==='shocking sphere')return shockingSphere();
 if(SPHERE_KINDS.includes(name)){const {g,body,core,orb,sphere}=createSphereCreature(name);return Object.assign(actor(g,body,[],null,[],'hover'),{orb,sphere},core?{core}:{});}
 if(/ light$/.test(name))return wisp({color:color||(name.startsWith('black')?'#4a2a8a':'#ffd23a'),black:name.startsWith('black')});
 if(isFern(name))return createFern(name);
 if(isDevilsSnare(name))return createDevilsSnare();
 if(name==='lichen')return createLichen(name);
 if(/ mold$/.test(name))return createMold(name,color);
 if(name==='shrieker'||name==='violet fungus')return createMushroom(name);
 if(name==='cave spider'||name==='giant spider')return createSpider(name);
 if(isScorpion(name))return createScorpion(name);
 if(name==='gelatinous cube'){const c=cube({color:color||'#8ad0c0'});c.g.scale.setScalar(1.3);return c;}
 if(/(blob|jelly|pudding|ooze|slime)$/.test(name))return blob({color:color||{acid:'#6fae3a','blue':'#3d6fd0','spotted':'#7a8a3a','ochre':'#c08a3a','brown':'#7a5a3a','black':'#2a2a30','gray':'#7a7a78','green':'#4f9a3a','quivering':'#b0a8d0','gelatinous':'#8ad0c0'}[name.split(' ')[0]]||'#7a9a6a',flat:/jelly$/.test(name),slime:name==='green slime',scale:name==='black pudding'?1.5:/^(green slime|ochre jelly|blue slime)$/.test(name)?1.25:name==='brown pudding'?1.1:1});
 if(name==='centipede')return centipede({color:'#c9a03a'});
 if(name==='raven')return createRaven();
 if(/^(bat|giant bat|vampire bat)$/.test(name))return bat({color:name==='bat'?'#5a4636':name==='giant bat'?'#7a3a32':'#28242a',scale:name==='giant bat'?1.25:1,kind:name});
 if(ZOMBIES[name])return createZombie(name);
 if(name==='ghoul')return createGhoul();
 if(name==='skeleton')return createSkeleton();
 if(/mummy$/.test(name))return createMummy(name);
 if(/shopkeeper|merchant/.test(name))return createShopkeeper();
 if(WATCH.includes(name))return createWatch(name);
 if(SOLDIERS.includes(name))return createSoldier(name);
 if(/guard|soldier|watchman|watch captain/.test(name))return humanoid('guard');
 if(/unicorn/.test(name))return horse(UNICORNS['white unicorn']);
 if(letter==='D'||/dragon/.test(name))return dragon(dragonLook(name,cell.color));
 if(name==='straw golem')return createStrawGolem();
 if(name==='paper golem')return createPaperGolem();
 {const golemMatch=name.match(/^(.*) golem$/);if(golemMatch)return createGolem(golemMatch[1]);}
 if(name==='giant turtle')return createTurtle();
 if(name==='tengu')return createTengu();
 if(name==='homunculus')return createHomunculus();
 if(name==='manes')return createManes();
 if(name==='lemure')return createLemure();
 if(name==='quasit')return createQuasit();
 if(name==='imp')return createImp();
 if(name==='uranium imp'){const a=createImp('uranium');a.g.scale.setScalar(1.1);return a;}
 if(isKobold(name))return createKobold(name);
 if(SKIN[name])return humanoid('imp',{skin:mat(SKIN[name]),cloth:mat(shade(SKIN[name],.55))});
 if(ELVES[name])return createElf(name);
 if(PRIESTS[name])return createPriest(name);
 if(name==='medusa')return createMedusa();
 if(name==='punisher')return createGolem('punisher');
 if(name==='cthulhu')return createCthulhu();
 if(name==='nurse')return createNurse();
 if(name==='doppelganger')return createDoppelganger();
 if(WATCH.includes(name))return createWatch(name);
 if(name==='hobbit')return createHobbit();
 if(name==='valkyrie')return createValkyrie();
 if(name==='norn')return createNorn();
 if(name==='warrior')return createWarrior();
 if(name==='samurai')return createSamurai();
 // Ashikaga Takauji, the Samurai quest nemesis: a warlord, so the samurai build stands a fifth larger
 if(name==='ashikaga takauji'){const a=createSamurai();a.g.scale.multiplyScalar(1.2);return a}
 if(name==='knight')return createKnight();
 if(name==='wizard')return createWizard();
 if(name==='wizard of yendor')return createWizardOfYendor();
 if(name==='executioner')return createExecutioner();
 if(name==='charon')return createCharon();
 if(name==='thoth amon')return createThothAmon();
 if(name==='croesus')return createCroesus();
 if(name==='abbot')return createAbbot();
 if(name==='one-eyed sam')return createOneEyedSam();
 if(name==='master assassin')return createMasterAssassin();
 if(name==='hippocrates')return createHippocrates();
 if(name==='master kaen')return createMasterKaen();
 if(name==='dark one')return createDarkOne();
 if(letter==='@'&&NEMESIS_HUMANS[name]){const a=humanoid('human',{cloth:mat(shade(color||'#8a8a80',.8))});a.g.scale.setScalar(NEMESIS_HUMANS[name]);return a;}// quest nemeses without a model of their own still loom over a plain human
 if(name==='lord carnarvon')return createCarnarvon();
 if(name==='pelias')return createPelias();
 if(name==='black marketeer')return createBlackMarketeer();
 if(name==='miner')return createMiner();
 if(name==='mugger')return createMugger();
 if(name==='convict')return createConvict();
 if(name==='prisoner')return createPrisoner();
 if(name==='monk')return createMonk();
 if(name==='archeologist')return createArcheologist();
 if(CAVE_KINDS.includes(name))return createCaveman(name);
 if(name==='tourist')return createTourist();
 if(name==='ranger')return createRanger();
 if(name==='rogue')return createRogue();
 if(name==='ninja')return createNinja();
 if(name==='barbarian')return createBarbarian();
 if(name==='healer')return createHealer();
 if(isGoblin(name))return createGoblin(name);
 if(isOrc(name)||/orc|uruk|snaga/.test(name))return createOrc(name);
 if(isDwarf(name))return createDwarf(name);
 if(name==='bugbear')return createBugbear();
 if(/dwarf/.test(name))return createDwarf(name);
 if(isGnome(name))return createGnome(name);
 // unlisted species: fall back on the monster class letter, then the glyph colour
 const c=color||'#8a8a80';
 switch(letter){
  case 'd':return createCanine(name,c);
  case 'f':return createFeline(name,c);
  case ':':return lizard({skin:c});
  case 'c':return cockatrice({skin:c,comb:'#c8262a',beak:shade(c,1.3)});
  case 'a':return createAnt(name,c);
  case 's':return createSpider(name,c);
  case 'S':return snake({color:c});
  case 'w':return worm({color:c,baby:/baby/.test(name)});
  case 'v':return vortex({color:c});
  case 'p':return createPiercer('piercer');
  case 'Y':return ape({fur:c});
  case 'm':return mimic({color:c});
  case 'C':return centaur({coat:c,hair:shade(c,.4)});
  case 'O':return ogre({skin:shade(c,1.1),hide:shade(c,.5)});
  case 'X':return xorn({stone:shade(c,.9),eye:c});
  case 'N':return naga({color:c,crest:/hatchling/.test(name)?null:'spines',baby:/hatchling/.test(name)});
  case 'V':return vampire({lining:c,eye:c});
  case 'W':return wraith({robe:shade(c,.6),glow:c,kind:'wraith'});
  case 'L':return lich({robe:shade(c,.6),glow:c});
  case 'T':return troll({skin:c,hair:shade(c,.4)});
  case 'H':return giant({skin:shade(c,1.1),cloth:shade(c,.55),weapon:'club',scale:1.1});
  case 'B':return bat({color:c});
  case 'F':return fungus({form:'mound',color:c});
  case 'b':case 'j':case 'P':return blob({color:c,flat:letter==='j'});
  case 'e':return floatingEye({iris:c});
  case 'y':return wisp({color:c});
  case 'k':return createKobold(name);
  case 'i':return humanoid('imp',{skin:mat(c),cloth:mat(shade(c,.55))});
  case 'Z':return createZombie('human zombie');
  case 'M':return createMummy('human mummy');
  case 'G':return createGnome(name);
  case 'h':return createDwarf(name);
  case 'o':return createOrc(name);
  case 'q':return rothe({...ROTHE,coat:c,saddle:shade(c,1.6)});
  case 'u':return horseFor(name,color);
  case '@':return humanoid('human',{cloth:mat(shade(c,.8))});
  case 'r':return rat(false);
  case 'x':return !name||/bug$/.test(name)?gridBug():xan({color:c,eye:'#ffcf40',stinger:true});
  case 'R':return rustMonster({color:c});
  case 'U':return umberHulk({color:shade(c,.7),eye:'#d8a040'});
  case 'l':return leprechaun({coat:c});
  case 'K':return kop({coat:shade(c,.7)});
  case 'Q':return quantumMechanic({shirt:shade(c,.8),glow:c});
  case 'z':return zruty({fur:shade(c,.8),eye:'#e8a030'});
  case 'E':return elemental({kind:/fire/.test(name)?'fire':/earth/.test(name)?'earth':/water/.test(name)?'water':'air',color:c,eye:'#ffffff'});
  case 'J':return createJabberwock('jabberwock');
  case 'A':return angel({robe:shade(c,1.2),trim:'#d8b04a',sword:true});
  case ';':return seaMonster({form:'eel',color:c,eye:'#e0d040'});
  case '&':return demon({skin:shade(c,.8),horns:'short',tail:true});
  case 't':return trapper({hide:shade(c,.8),eye:'#e0c040'});
  case 'n':return nymph({skin:'#eec7a8',cloth:shade(c,.35),trim:c,hair:'#2a2018'});
  case "'":return createGolem('stone');
  case 'g':return /gargoyle/.test(name)?gargoyle({stone:shade(c,.9),eye:'#ff9a30',winged:/winged/.test(name)}):gremlin({skin:c,eye:'#ffd23a'});
 }
 return guardian({color});
}
