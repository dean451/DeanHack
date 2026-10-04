import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createWand,wandAppearance} from './wand.js';
import {buildBullwhip} from './bullwhip.js';
import {buildBoomerang} from './boomerang.js';
import {buildShuriken} from './shuriken.js';
import {buildDart} from './dart.js';
import {buildAklys} from './aklys.js';
import {buildArrow,ARROW_NAME} from './arrow.js';
import {buildWormTooth,WORM_TOOTH_NAME} from './worm-tooth.js';
import {buildSling,SLING_NAME} from './sling.js';
import {buildStiletto,STILETTO_NAME} from './stiletto.js';
import {buildScalpel,SCALPEL_NAME} from './scalpel.js';
import {buildRubberHose,RUBBER_HOSE_NAME} from './rubber-hose.js';
import {buildKatana,KATANA_NAME} from './katana.js';
import {buildScimitar,SCIMITAR_NAME} from './scimitar.js';
import {buildTsurugi,TSURUGI_NAME} from './tsurugi.js';
import {buildTwoHandedSword,TWO_HANDED_SWORD_NAME} from './two-handed-sword.js';
import {buildMattock,MATTOCK_NAME} from './mattock.js';
import {buildPickAxe,PICK_AXE_NAME} from './pick-axe.js';

export function createHeldWeapon(item){
 const g=new THREE.Group();if(!item)return g;
 // A wielded wand is held by its grip like the floor wand's model; its look comes from the
 // hero-view name ("oak wand"), since an identified "wand of fire" names no appearance.
 if(item.class===11){const wand=createWand(wandAppearance(item.name));wand.name=item.name;return wand;}
 g.name=item.name;
 const steel=new THREE.MeshStandardMaterial({color:0xd0dce2,metalness:.8,roughness:.23});
 const leather=new THREE.MeshStandardMaterial({color:0x442c22,roughness:.92});
 const brass=new THREE.MeshStandardMaterial({color:0xbe9650,metalness:.7,roughness:.35});
 function part(geometry,material,x,y,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
 // An artifact ("Excalibur") takes the model of its base type, which the bridge sends as `base`.
 const name=(item.base||item.name||'').toLowerCase();
 const blade=/sword|dagger|knife|athame|saber|scimitar|katana|tsurugi|wakizashi/.test(name);
 if(/\bsilver saber\b/.test(name)){
  buildSilverSaber(g);
 }else if(ARROW_NAME.test(name)){
  // Before the crossbow, which a "crossbow bolt" would otherwise match.
  buildArrow(g,item.name||name);
 }else if(WORM_TOOTH_NAME.test(name)){
  // Before the blades, which a "crysknife" would otherwise match.
  buildWormTooth(g,name);
 }else if(STILETTO_NAME.test(name)){
  buildStiletto(g);
 }else if(SCALPEL_NAME.test(name)){
  buildScalpel(g);
 }else if(RUBBER_HOSE_NAME.test(name)){
  buildRubberHose(g);
 }else if(KATANA_NAME.test(name)){
  buildKatana(g);
 }else if(SCIMITAR_NAME.test(name)){
  buildScimitar(g);
 }else if(TSURUGI_NAME.test(name)){
  buildTsurugi(g);
 }else if(TWO_HANDED_SWORD_NAME.test(name)){
  buildTwoHandedSword(g);
 }else if(MATTOCK_NAME.test(name)){
  buildMattock(g);
 }else if(PICK_AXE_NAME.test(name)){
  // Before the axe, which a "pick-axe" would otherwise match.
  buildPickAxe(g,name);
 }else if(blade){
  const short=/dagger|knife|athame/.test(name),length=short?.34:.75,width=short?.055:.075;
  part(new THREE.CylinderGeometry(.029,.035,.17,8),leather,0,0);
  part(new THREE.SphereGeometry(.044,8,6),brass,0,-.11);
  part(new THREE.BoxGeometry(short?.18:.27,.035,.065),brass,0,.105);
  // Diamond cross-section: bright bevels and a continuous pointed tip.
  const vertices=[-width,.13,0,0,.13,.024,width,.13,0,0,.13,-.024,-width*.65,length,0,0,length,.017,width*.65,length,0,0,length,-.017,0,length+.16,0];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0,4,8,5,5,8,6,6,8,7,7,8,4,0,1,2,0,2,3]);geo.computeVertexNormals();part(geo,steel,0,0);
  if(!short){
   // A dark fuller inlaid down each flat, so the blade reads as a sword edge-on and face-on at
   // game distance. It follows the blade's thickness (.024 at the base to .017 at the tip) and dies out short of the point.
   const half=y=>.024-.007*(y-.13)/(length-.13)+.0006,y0=.24,y1=length*.78,fw=.011,fv=[],fi=[];
   for(const s of [1,-1]){const o=fv.length/3;
    for(const y of [y0,y1])for(const x of [-fw,fw])fv.push(x,y,s*half(y));
    fi.push(...(s>0?[o,o+1,o+3,o,o+3,o+2]:[o,o+3,o+1,o,o+2,o+3]));}
   const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(fv,3));fg.setIndex(fi);fg.computeVertexNormals();
   part(fg,new THREE.MeshStandardMaterial({color:0x56646c,metalness:.6,roughness:.45,side:THREE.DoubleSide}),0,0);
  }
 }else if(/\bquarterstaff\b/.test(name)){
  const wood=new THREE.MeshStandardMaterial({color:0x735035,roughness:.9});
  g.userData.extraMaterial=wood;
  part(new THREE.CylinderGeometry(.024,.029,1.48,12),wood,0,.15);
  part(new THREE.CylinderGeometry(.033,.033,.23,12),leather,0,0);
  for(let i=0;i<7;i++)part(new THREE.CylinderGeometry(.035,.035,.008,12),leather,0,-.105+i*.035);
  for(const y of [-.57,.87]){
   part(new THREE.CylinderGeometry(.031,.031,.07,12),steel,0,y);
   part(new THREE.CylinderGeometry(.033,.033,.015,12),brass,0,y+(y<0?.045:-.045));
  }
 }else if(/\bcrossbow\b/.test(name)){
  const wood=new THREE.MeshStandardMaterial({color:0x805735,roughness:.86});
  g.userData.extraMaterial=wood;
  // Stock follows the weapon axis; the hand holds the bound rear section.
  part(new THREE.BoxGeometry(.085,.72,.095),wood,0,.2);
  part(new THREE.BoxGeometry(.11,.18,.11),leather,0,-.035);
  part(new THREE.BoxGeometry(.115,.035,.115),brass,0,-.145);
  for(const x of [-.027,.027])part(new THREE.BoxGeometry(.012,.48,.015),steel,x,.29,.055);
  part(new THREE.BoxGeometry(.12,.08,.12),brass,0,.44);
  for(const side of [-1,1]){
   const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,.45,0),new THREE.Vector3(side*.15,.44,0),
    new THREE.Vector3(side*.29,.38,0),new THREE.Vector3(side*.38,.3,0)
   ]);
   part(new THREE.TubeGeometry(curve,16,.018,6,false),steel,0,0);
   const cord=new THREE.LineCurve3(new THREE.Vector3(side*.38,.3,.025),new THREE.Vector3(0,.055,.06));
   part(new THREE.TubeGeometry(cord,1,.004,5,false),leather,0,0);
  }
  // A seated bolt and fletching make the firing direction readable.
  part(new THREE.CylinderGeometry(.008,.008,.43,6),wood,0,.31,.072);
  part(new THREE.ConeGeometry(.022,.07,4),steel,0,.56,.072);
  part(new THREE.BoxGeometry(.065,.065,.007),leather,0,.12,.072);
  const trigger=new THREE.TorusGeometry(.043,.007,5,12,Math.PI);
  trigger.rotateZ(Math.PI/2);part(trigger,brass,0,.015,-.065);
 }else if(/\bbow\b/.test(name)){
  const wood=new THREE.MeshStandardMaterial({color:0x805735,roughness:.82});
  g.userData.extraMaterial=wood;
  // The grip sits at the hand origin, with symmetrical curved limbs.
  for(const side of [-1,1]){
   const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0,0),new THREE.Vector3(.025,side*.16,0),
    new THREE.Vector3(.11,side*.34,0),new THREE.Vector3(.13,side*.48,0),
    new THREE.Vector3(.095,side*.58,0)
   ]);
   part(new THREE.TubeGeometry(curve,20,.021,8,false),wood,0,0);
   part(new THREE.SphereGeometry(.026,8,6),brass,.095,side*.58);
  }
  part(new THREE.CylinderGeometry(.03,.03,.17,12),leather,0,0);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.032,.032,.008,12),brass,0,-.066+i*.033);
  // A physical cord survives the same held and ground transforms as the limbs.
  part(new THREE.CylinderGeometry(.004,.004,1.16,6),leather,.095,0);
 }else if(/\b(spear|javelin|pike)\b/.test(name)){
  const shaftLength=/javelin/.test(name)?.88:/pike/.test(name)?1.55:1.2;
  const wood=new THREE.MeshStandardMaterial({color:0x805735,roughness:.86});
  g.userData.extraMaterial=wood;
  const shoulder=shaftLength-.3;
  part(new THREE.CylinderGeometry(.018,.025,shaftLength,12),wood,0,shaftLength/2-.3);
  part(new THREE.CylinderGeometry(.028,.028,.18,12),leather,0,0);
  for(const y of [-.09,.09])part(new THREE.CylinderGeometry(.03,.03,.015,12),brass,0,y);
  part(new THREE.CylinderGeometry(.025,.018,.09,12),steel,0,-.3);
  part(new THREE.CylinderGeometry(.027,.034,.12,12),steel,0,shoulder);
  // Raised central ridge and thin edges keep the socketed leaf blade readable.
  const geo=new THREE.BufferGeometry();
  const y=shoulder+.045;
  geo.setAttribute('position',new THREE.Float32BufferAttribute([
   0,y,0, -.067,y+.12,0, 0,y+.36,0, .067,y+.12,0,
   0,y+.12,.022, 0,y+.12,-.022
  ],3));
  geo.setIndex([0,4,1,1,4,2,2,4,3,3,4,0,0,1,5,1,2,5,2,3,5,3,0,5]);
  geo.computeVertexNormals();part(geo,steel,0,0);
 }else if(/\bflail\b/.test(name)){
  const wood=new THREE.MeshStandardMaterial({color:0x735035,roughness:.9});
  g.userData.extraMaterial=wood;
  part(new THREE.CylinderGeometry(.025,.032,.53,10),wood,0,.13);
  part(new THREE.CylinderGeometry(.037,.037,.19,10),leather,0,-.015);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.039,.039,.009,10),brass,0,-.09+i*.036);
  part(new THREE.SphereGeometry(.044,10,8),brass,0,-.15);
  part(new THREE.CylinderGeometry(.036,.036,.045,10),steel,0,.385);
  // Alternating link planes make the chain readable without animation state.
  for(let i=0;i<6;i++){
   const link=part(new THREE.TorusGeometry(.032,.009,6,12),steel,i*.026,.42+i*.038);
   link.scale.y=1.28;link.rotation.z=-.6;link.rotation.y=i%2?Math.PI/2:0;
  }
  const center=new THREE.Vector3(.18,.68,0);
  part(new THREE.IcosahedronGeometry(.115,1),steel,center.x,center.y);
  // Short radial studs distinguish the striking head from a smooth mace.
  for(const direction of [new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)]){
   const pos=center.clone().addScaledVector(direction,.125);
   const stud=part(new THREE.ConeGeometry(.033,.095,4),steel,pos.x,pos.y,pos.z);
   stud.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
  }
 }else if(/\bmorning star\b/.test(name)){
  buildMorningStar(g);
 }else if(/\b(halberd|angled poleaxe)\b/.test(name)){
  buildHalberd(g);
 }else if(/\btrident\b/.test(name)){
  buildTrident(g);
 }else if(/\b(glaive|single-edged polearm)\b/.test(name)){
  buildGlaive(g);
 }else if(/\b(partisan|vulgar polearm)\b/.test(name)){
  buildPartisan(g);
 }else if(/\b(bardiche|long poleaxe)\b/.test(name)){
  buildBardiche(g);
 }else if(/\b(voulge|pole cleaver)\b/.test(name)){
  buildVoulge(g);
 }else if(/\b(ranseur|hilted polearm)\b/.test(name)){
  buildRanseur(g);
 }else if(/\b(spetum|forked polearm)\b/.test(name)){
  buildSpetum(g);
 }else if(/\b(lucern hammer|pronged polearm)\b/.test(name)){
  buildLucernHammer(g);
 }else if(/\b(fauchard|pole sickle)\b/.test(name)){
  buildFauchard(g);
 }else if(/(?<!bill-)\bguisarme\b|\bpruning hook\b/.test(name)){
  buildGuisarme(g);
 }else if(/\b(bill-guisarme|hooked polearm)\b/.test(name)){
  buildBillGuisarme(g);
 }else if(/\b(bec de corbin|beaked polearm)\b/.test(name)){
  buildBecDeCorbin(g);
 }else if(/\blance\b/.test(name)){
  buildLance(g);
 }else if(/\bmace\b/.test(name)){
  // Flanged head and bound grip distinguish a mace from a square hammer.
  part(new THREE.CylinderGeometry(.024,.03,.57,10),steel,0,.18);
  part(new THREE.CylinderGeometry(.036,.036,.19,10),leather,0,-.015);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.038,.038,.009,10),brass,0,-.09+i*.036);
  part(new THREE.SphereGeometry(.047,10,8),brass,0,-.135);
  part(new THREE.CylinderGeometry(.055,.065,.22,12),steel,0,.47);
  const outline=new THREE.Shape();outline.moveTo(.045,.35);outline.lineTo(.115,.39);outline.lineTo(.14,.51);outline.lineTo(.09,.585);outline.lineTo(.045,.58);outline.closePath();
  for(let i=0;i<6;i++){
   const flange=new THREE.ExtrudeGeometry(outline,{depth:.018,bevelEnabled:true,bevelThickness:.003,bevelSize:.004,bevelSegments:1,steps:1});flange.translate(0,0,-.009);
   part(flange,steel,0,0).rotation.y=i*Math.PI/3;
  }
  for(const y of [.35,.59])part(new THREE.CylinderGeometry(.068,.068,.022,12),brass,0,y);
 }else if(/\b(war hammer|hammer)\b/.test(name)){
  part(new THREE.CylinderGeometry(.025,.032,.65,10),leather,0,.18);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.034,.034,.012,10),brass,0,-.09+i*.035);
  part(new THREE.SphereGeometry(.043,10,8),brass,0,-.15);
  // Forged transverse head: broad striking face, central eye, tapered rear peen.
  const head=new THREE.CylinderGeometry(.072,.085,.22,4);head.rotateZ(Math.PI/2);part(head,steel,-.045,.48);
  const face=new THREE.CylinderGeometry(.089,.089,.035,4);face.rotateZ(Math.PI/2);part(face,steel,-.17,.48);
  const peen=new THREE.ConeGeometry(.068,.18,4);peen.rotateZ(-Math.PI/2);part(peen,steel,.145,.48);
  part(new THREE.BoxGeometry(.06,.17,.12),brass,0,.48);
  part(new THREE.CylinderGeometry(.041,.041,.045,10),brass,0,.37);
 }else if(/\baxe\b/.test(name)){
  part(new THREE.CylinderGeometry(.026,.036,.68,10),leather,0,.18);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.037,.037,.01,10),brass,0,-.12+i*.033);
  part(new THREE.CylinderGeometry(.045,.045,.12,10),steel,0,.47);
  const outline=new THREE.Shape();outline.moveTo(.02,.53);outline.quadraticCurveTo(.14,.56,.24,.63);outline.quadraticCurveTo(.29,.45,.23,.29);outline.quadraticCurveTo(.13,.39,.02,.4);outline.closePath();
  const axeBlade=new THREE.ExtrudeGeometry(outline,{depth:.025,bevelEnabled:true,bevelSize:.008,bevelThickness:.005,bevelSegments:2,steps:1,curveSegments:10});axeBlade.translate(0,0,-.0125);part(axeBlade,steel,0,0);
  part(new THREE.BoxGeometry(.09,.085,.065),steel,-.055,.47);
  // Steel langets run down the haft either side of the head, so the grip below it reads as bound wood.
  for(const s of [-1,1])part(new THREE.BoxGeometry(.022,.2,.012),steel,-.02,.33,s*.034);
  if(/battle-axe/.test(name)){const second=axeBlade.clone();second.rotateY(Math.PI);part(second,steel,0,0);}
 }else if(/\bbullwhip\b/.test(name)){
  buildBullwhip(g);
 }else if(SLING_NAME.test(name)){
  buildSling(g);
 }else if(/\bboomerang\b/.test(name)){
  buildBoomerang(g);
 }else if(/\b(shuriken|throwing star)\b/.test(name)){
  buildShuriken(g);
 }else if(/\bdarts?\b/.test(name)){
  buildDart(g);
 }else if(/\b(aklys|thonged club)\b/.test(name)){
  buildAklys(g);
 }else if(/\bclub\b/.test(name)){
  // A carved wooden striking head flows into the grip, without a metal cube.
  const profile=[new THREE.Vector2(0,-.15),new THREE.Vector2(.038,-.14),new THREE.Vector2(.029,-.09),new THREE.Vector2(.028,.09),new THREE.Vector2(.047,.22),new THREE.Vector2(.078,.4),new THREE.Vector2(.086,.49),new THREE.Vector2(.058,.55),new THREE.Vector2(0,.57)];
  part(new THREE.LatheGeometry(profile,12),leather,0,0);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.033,.033,.014,10),brass,0,-.08+i*.031);
  const grain=new THREE.MeshStandardMaterial({color:0x281b15,roughness:1});
  for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7;
   const points=[[.21,.046],[.33,.064],[.44,.082],[.51,.075]].map(([y,r],j)=>new THREE.Vector3(Math.cos(a+j*.025)*r,y,Math.sin(a+j*.025)*r));
   part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.002,3,false),grain,0,0);
  }
  g.userData.extraMaterial=grain;
 }else{
  // A restrained proxy for weapon families whose detailed models are still pending.
  part(new THREE.CylinderGeometry(.027,.035,.65,8),leather,0,.18);
  if(/axe/.test(name))part(new THREE.BoxGeometry(.3,.19,.045),steel,.08,.48);
  else if(/mace|hammer|club/.test(name))part(new THREE.BoxGeometry(.19,.18,.16),steel,0,.48);
  else if(/spear|pike|javelin/.test(name))part(new THREE.ConeGeometry(.065,.24,4),steel,0,.61);
 }
 g.userData.dispose=()=>{g.traverse(o=>o.geometry?.dispose());[].concat(g.userData.extraMaterial??[]).forEach(m=>m.dispose());steel.dispose();leather.dispose();brass.dispose();};return g;
}

// The morning star: a blackened, iron-banded haft under a hammered iron ball bristling with
// uneven forged spikes, one long spike crowning it and a spiked pommel below the grip.
// Iron straps (langets) run down from the head to hold it on. Every part shares one of
// four materials and is merged per material: 4 draws, where a part-per-mesh build was ~60.
// The ball and spikes stay metalness >= .75, so weapon-magic still sheathes them.
function buildMorningStar(g){
 const wood=new THREE.MeshStandardMaterial({color:0x3f2a1d,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x58554f,metalness:.78,roughness:.52});
 const spikeSteel=new THREE.MeshStandardMaterial({color:0xb4bcbf,metalness:.82,roughness:.3});
 const wrap=new THREE.MeshStandardMaterial({color:0x2e1d17,roughness:.95});
 g.userData.extraMaterial=[wood,iron,spikeSteel,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[spikeSteel,[]],[wrap,[]]]);
 const up=new THREE.Vector3(0,1,0);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
 // Haft, swelling slightly toward the head, and the leather grip wound on a slant.
 put(new THREE.CylinderGeometry(.027,.023,.66,10),wood,0,.18);
 put(new THREE.CylinderGeometry(.033,.033,.21,10),wrap,0,-.015);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.034,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.034,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Pommel: an iron cap ending in a short downward spike.
 put(new THREE.CylinderGeometry(.036,.03,.04,10),iron,0,-.14);
 put(new THREE.ConeGeometry(.02,.07,5),spikeSteel,0,-.19,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Iron bands and four langets nailed down the haft below the head.
 for(const y of [.12,.36])put(new THREE.CylinderGeometry(.031,.031,.022,10),iron,0,y);
 for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;put(new THREE.BoxGeometry(.012,.2,.006),iron,Math.cos(a)*.027,.44,Math.sin(a)*.027,new THREE.Quaternion().setFromAxisAngle(up,-a+Math.PI/2));
  for(const y of [.38,.48])put(new THREE.SphereGeometry(.006,5,4),iron,Math.cos(a)*.031,y,Math.sin(a)*.031);}
 put(new THREE.CylinderGeometry(.04,.032,.05,10),iron,0,.535);
 // The ball, hammered lumpy so it catches the light unevenly.
 const R=.088,cy=.63,ball=new THREE.IcosahedronGeometry(R,2),pos=ball.attributes.position,v=new THREE.Vector3();
 const dent=new Map();
 for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);const key=v.toArray().map(n=>n.toFixed(4)).join();
  if(!dent.has(key))dent.set(key,1-.07*hash(dent.size+3));v.multiplyScalar(dent.get(key));pos.setXYZ(i,v.x,v.y,v.z);}
 ball.computeVertexNormals();put(ball,iron,0,cy);
 // Spikes on the icosahedron's 12 points and 20 face centres, uneven in length and bent off
 // true; none under the collar. The top one is a long crowning spike.
 const dirs=[],ico=new THREE.IcosahedronGeometry(1,0).attributes.position,seen=new Set();
 for(let i=0;i<ico.count;i++){v.fromBufferAttribute(ico,i).normalize();const key=v.toArray().map(n=>n.toFixed(3)).join();if(!seen.has(key)){seen.add(key);dirs.push(v.clone());}}
 for(let i=0;i<ico.count;i+=3)dirs.push(new THREE.Vector3().fromBufferAttribute(ico,i).add(new THREE.Vector3().fromBufferAttribute(ico,i+1)).add(new THREE.Vector3().fromBufferAttribute(ico,i+2)).normalize());
 const tilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(.3,0,1).normalize(),.28);
 dirs.forEach((d,i)=>{
  d.applyQuaternion(tilt);
  if(d.y<-.72)return;
  const crown=d.y>.97,len=crown?.15:(.065+.05*hash(i+11))*(i<12?1:.82),r=crown?.019:.015+.004*hash(i+29);
  const bent=d.clone().add(new THREE.Vector3(hash(i+41)-.5,hash(i+53)-.5,hash(i+67)-.5).multiplyScalar(.22)).normalize();
  const at=d.clone().multiplyScalar(R*.9+len/2);
  put(new THREE.ConeGeometry(r,len,5),spikeSteel,at.x,cy+at.y,at.z,new THREE.Quaternion().setFromUnitVectors(up,bent));
  // A rough iron boss where each spike is forged into the ball.
  const foot=d.clone().multiplyScalar(R*.93);
  put(new THREE.CylinderGeometry(r*1.25,r*1.6,.016,5),iron,foot.x,cy+foot.y,foot.z,new THREE.Quaternion().setFromUnitVectors(up,d));
 });
 for(const [m,geos] of sets){const geo=mergeGeometries(geos.map(x=>{x.deleteAttribute('uv');return x;}));geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=true;mesh.userData.part=m===spikeSteel?'spikes':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The halberd: a long blackened haft under a forged head. A broad axe blade with a hooked
// beard, two jagged notches and a crescent cut clean through it; a back fluke curving down
// like a talon; a four-sided spike crowning it. Iron langets nailed down the haft hold the
// head on, the grip is wound on a slant and the butt ends in an iron spike. Merged per
// material like the morning star: 4 draws. The blade, fluke and spike stay metalness >= .75,
// so weapon-magic sheathes them.
function buildHalberd(g){
 const wood=new THREE.MeshStandardMaterial({color:0x3a281c,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x4f4c47,metalness:.78,roughness:.55});
 const blade=new THREE.MeshStandardMaterial({color:0xaeb6b9,metalness:.82,roughness:.3});
 const wrap=new THREE.MeshStandardMaterial({color:0x2e1d17,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 const flat=(shape,depth,bevel)=>{const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:8});geo.translate(0,0,-depth/2);return geo;};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Two long langets nailed down the haft below the socket, and a band at their foot.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.006,.26,.016),iron,0,.66,s*.025);
  for(const y of [.57,.65,.73])put(new THREE.SphereGeometry(.0055,5,4),iron,0,y,s*.029);
 }
 put(new THREE.CylinderGeometry(.03,.03,.02,10),iron,0,.53);
 // The socket the head is forged onto.
 put(new THREE.CylinderGeometry(.03,.034,.17,8),iron,0,.875);
 put(new THREE.CylinderGeometry(.037,.037,.018,8),iron,0,.79);
 // Axe blade on +x: the beard hooks down, the edge swells forward and the upper horn rises;
 // two notches bite into the edge and a crescent is cut clean through near the socket.
 const axe=new THREE.Shape();
 axe.moveTo(.02,.81);axe.lineTo(.07,.79);axe.quadraticCurveTo(.13,.76,.17,.68);
 axe.lineTo(.215,.71);
 axe.lineTo(.222,.76);axe.lineTo(.206,.775);axe.lineTo(.226,.79);
 axe.quadraticCurveTo(.234,.85,.226,.9);
 axe.lineTo(.21,.915);axe.lineTo(.23,.93);
 axe.quadraticCurveTo(.228,.98,.21,1.0);
 axe.quadraticCurveTo(.15,.95,.07,.945);axe.lineTo(.02,.94);axe.closePath();
 const cut=new THREE.Path();cut.moveTo(.085,.83);cut.quadraticCurveTo(.125,.87,.085,.91);cut.quadraticCurveTo(.11,.87,.085,.83);
 axe.holes.push(cut);
 put(flat(axe,.012,.004),blade);
 // The back fluke, a talon curving out and down.
 const fluke=new THREE.Shape();
 fluke.moveTo(-.02,.85);fluke.lineTo(-.02,.92);fluke.quadraticCurveTo(-.1,.9,-.15,.79);fluke.quadraticCurveTo(-.09,.85,-.02,.85);
 put(flat(fluke,.01,.004),blade);
 // The crowning spike: a long four-sided point on a short neck.
 put(new THREE.CylinderGeometry(.018,.03,.04,4),iron,0,.98,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4));
 put(new THREE.ConeGeometry(.022,.17,4),blade,0,1.085,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4));
 for(const [m,geos] of sets){const geo=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The trident: a blackened haft under three barbed tines. The outer two splay out from a
// downswept iron crossbar and hook back in at the top like claws; the longer middle one runs
// straight. Each ends in a flat harpoon head whose barbs hook back down, and the middle tine
// carries two more barbs below its head. Two iron fangs hang under the crossbar either side
// of the socket. The grip is wound on a slant and the butt ends in a ringed iron ferrule.
// Merged per material like the halberd: 4 draws. Tines and heads stay metalness >= .75, so
// weapon-magic sheathes them.
function buildTrident(g){
 const wood=new THREE.MeshStandardMaterial({color:0x33251b,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x48464a,metalness:.78,roughness:.55});
 const blade=new THREE.MeshStandardMaterial({color:0xa9b3b8,metalness:.82,roughness:.3});
 const wrap=new THREE.MeshStandardMaterial({color:0x2a1b16,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 const zTurn=a=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),a);
 // A tube along a curve whose radius tapers from r0 to r1, for tines that thin to their heads.
 const taper=(points,r0,r1,segments=14)=>{
  const curve=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,0)));
  const geo=new THREE.TubeGeometry(curve,segments,1,6,false),pos=geo.attributes.position,v=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<=segments;i++){curve.getPointAt(i/segments,c);const r=r0+(r1-r0)*i/segments;
   for(let j=0;j<=6;j++){const k=i*7+j;v.fromBufferAttribute(pos,k).sub(c).multiplyScalar(r).add(c);pos.setXYZ(k,v.x,v.y,v.z);}}
  geo.computeVertexNormals();return {geo,curve};
 };
 // A flat harpoon head pointing up local +y from its neck at 0, its barbs hooking back down.
 const head=(len,w)=>{
  const s=new THREE.Shape();
  s.moveTo(0,len);s.lineTo(w*.95,len*.3);s.lineTo(w*1.15,-.04);s.lineTo(w*.42,.02);s.lineTo(w*.3,0);
  s.lineTo(-w*.3,0);s.lineTo(-w*.42,.02);s.lineTo(-w*1.15,-.04);s.lineTo(-w*.95,len*.3);s.closePath();
  const geo=new THREE.ExtrudeGeometry(s,{depth:.007,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,steps:1});geo.translate(0,0,-.0035);return geo;
 };
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.024,.021,1.12,10),wood,0,.2);
 put(new THREE.CylinderGeometry(.03,.03,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.031,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: a ringed iron ferrule ending in a blunt knob.
 put(new THREE.CylinderGeometry(.026,.022,.07,10),iron,0,-.38);
 put(new THREE.TorusGeometry(.026,.005,4,12).rotateX(Math.PI/2),iron,0,-.355);
 put(new THREE.SphereGeometry(.024,8,6),iron,0,-.415);
 // Socket and collar, with a band lower down.
 put(new THREE.CylinderGeometry(.028,.032,.15,8),iron,0,.83);
 put(new THREE.CylinderGeometry(.036,.036,.018,8),iron,0,.755);
 put(new THREE.CylinderGeometry(.029,.029,.018,10),iron,0,.6);
 // The crossbar sweeps down to the socket and up to the outer tines' roots.
 put(taper([[-.13,.95],[-.07,.9],[0,.885],[.07,.9],[.13,.95]],.017,.017,16).geo,iron);
 // Two iron fangs hang under it either side of the socket.
 for(const s of [-1,1])put(new THREE.ConeGeometry(.011,.06,4),iron,s*.055,.86,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI-s*.25));
 // Outer tines splay out, then hook back in at the top like claws.
 for(const s of [-1,1]){
  const {geo,curve}=taper([[s*.13,.95],[s*.175,1.03],[s*.18,1.12],[s*.15,1.2]],.015,.008);
  put(geo,blade);
  const tip=curve.getPointAt(1),dir=curve.getTangentAt(1);
  put(head(.1,.03),blade,tip.x,tip.y,0,zTurn(Math.atan2(-dir.x,dir.y)));
 }
 // The middle tine runs straight and longer, with two more barbs below its head.
 put(taper([[0,.89],[0,1.07],[0,1.25]],.017,.01).geo,blade);
 put(head(.12,.034),blade,0,1.25);
 for(const s of [-1,1]){
  const barb=new THREE.Shape();barb.moveTo(0,.02);barb.lineTo(s*.045,-.03);barb.lineTo(0,-.005);barb.closePath();
  const geo=new THREE.ExtrudeGeometry(barb,{depth:.006,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1,steps:1});geo.translate(0,0,-.003);
  put(geo,blade,0,1.1+(s>0?0:.05));
 }
 for(const [m,geos] of sets){const geo=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=true;mesh.userData.part=m===blade?'tines':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The glaive: a long single-edged blade on a blackened haft. The edge swells out like a
// cleaver and sweeps back into a point that leans over the spine; a fang juts down off the
// spine and the spine below it is saw-toothed. A slit fuller is cut clean through the blade.
// Two iron lugs jut out sideways under the socket, langets are nailed down the haft, the grip
// is wound on a slant and the butt ends in an iron spike. Merged per material like the
// halberd: 4 draws. The blade stays metalness >= .75, so weapon-magic sheathes it.
function buildGlaive(g){
 const wood=new THREE.MeshStandardMaterial({color:0x362619,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x4a4744,metalness:.78,roughness:.55});
 const blade=new THREE.MeshStandardMaterial({color:0xa8b0b3,metalness:.82,roughness:.3});
 const wrap=new THREE.MeshStandardMaterial({color:0x2c1c16,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Two langets nailed down the haft below the socket, and a band at their foot.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.006,.24,.016),iron,0,.65,s*.025);
  for(const y of [.57,.65,.73])put(new THREE.SphereGeometry(.0055,5,4),iron,0,y,s*.029);
 }
 put(new THREE.CylinderGeometry(.03,.03,.02,10),iron,0,.53);
 // Socket and collar, with two lugs jutting out flat to the blade.
 put(new THREE.CylinderGeometry(.027,.033,.1,8),iron,0,.83);
 put(new THREE.CylinderGeometry(.037,.037,.018,8),iron,0,.785);
 for(const s of [-1,1])put(new THREE.ConeGeometry(.012,.07,4),iron,0,.79,s*.064,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),s*(Math.PI/2+.35)));
 // The blade: edge on +x swelling out, then sweeping back into a point over the spine; down
 // the spine a fang hooks down and saw teeth run to the socket. A slit fuller is cut through.
 const b=new THREE.Shape();
 b.moveTo(-.022,.87);b.lineTo(.022,.87);b.lineTo(.03,.9);
 b.quadraticCurveTo(.1,.98,.098,1.1);
 b.lineTo(.086,1.13);b.lineTo(.1,1.15);
 b.quadraticCurveTo(.095,1.27,-.04,1.38);
 b.quadraticCurveTo(-.02,1.3,-.03,1.22);
 b.lineTo(-.05,1.19);b.lineTo(-.125,1.12);b.lineTo(-.06,1.15);b.lineTo(-.035,1.13);
 for(let i=0;i<4;i++){const y=1.08-i*.045;b.lineTo(-.05,y);b.lineTo(-.03,y-.022);}
 b.lineTo(-.022,.87);
 const slit=new THREE.Path();slit.moveTo(.0,.94);slit.quadraticCurveTo(.03,1.06,.018,1.2);slit.quadraticCurveTo(.012,1.06,.0,.94);
 b.holes.push(slit);
 const geo=new THREE.ExtrudeGeometry(b,{depth:.012,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1,curveSegments:8});geo.translate(0,0,-.006);
 put(geo,blade);
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The partisan: a long leaf blade on a blackened haft. Two hooked wings flare out from the
// blade's root and curl up into points like horns; the edges above them are bitten into
// three jagged notches each before the leaf swells and draws into a long point. A raised
// midrib runs up both flats, and a ring of thorns crowns the socket. Langets are nailed down
// the haft, the grip is wound on a slant and the butt ends in an iron spike. Merged per
// material like the halberd: 4 draws. The blade stays metalness >= .75, so weapon-magic
// sheathes it.
function buildPartisan(g){
 const wood=new THREE.MeshStandardMaterial({color:0x34251a,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x4b4846,metalness:.78,roughness:.55});
 const blade=new THREE.MeshStandardMaterial({color:0xa6aeb2,metalness:.82,roughness:.3});
 const wrap=new THREE.MeshStandardMaterial({color:0x2b1c16,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Two langets nailed down the haft below the socket, and a band at their foot.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.006,.24,.016),iron,0,.65,s*.025);
  for(const y of [.57,.65,.73])put(new THREE.SphereGeometry(.0055,5,4),iron,0,y,s*.029);
 }
 put(new THREE.CylinderGeometry(.03,.03,.02,10),iron,0,.53);
 // Socket and collar, crowned by a ring of short thorns leaning outward.
 put(new THREE.CylinderGeometry(.026,.033,.11,8),iron,0,.83);
 put(new THREE.CylinderGeometry(.037,.037,.018,8),iron,0,.785);
 for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6;
  const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.sin(a),0,-Math.cos(a)),.5);
  put(new THREE.ConeGeometry(.007,.035,4),iron,Math.cos(a)*.03,.8,Math.sin(a)*.03,q);}
 // The blade outline, built as the right half and mirrored: hooked wings at the root curling
 // up into points, three jagged notches, then the leaf swelling and drawing into a long point.
 const half=[[.026,.88],[.06,.885],[.1,.9],[.128,.935],[.142,.995],[.118,.955],[.088,.93],[.05,.93],
  [.048,.955],[.04,.965],[.052,.985],[.044,.995],[.057,1.015],[.05,1.025],[.063,1.05],
  [.067,1.1],[.063,1.16],[.05,1.24],[.03,1.33],[.012,1.4],[0,1.44]];
 const s=new THREE.Shape();s.moveTo(-half[0][0],half[0][1]);
 for(const [x,y] of half)s.lineTo(x,y);
 for(let i=half.length-2;i>=1;i--)s.lineTo(-half[i][0],half[i][1]);
 const leaf=new THREE.ExtrudeGeometry(s,{depth:.008,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1});leaf.translate(0,0,-.004);
 put(leaf,blade);
 // The midrib: a thin diamond ridge up both flats from the root to near the point.
 const rib=new THREE.BufferGeometry(),r0=.89,r1=1.38;
 rib.setAttribute('position',new THREE.Float32BufferAttribute([-.016,r0,0, 0,r0,.013, .016,r0,0, 0,r0,-.013, 0,r1,0],3));
 rib.setIndex([0,1,4,1,2,4,2,3,4,3,0,4,0,2,1,0,3,2]);
 const ribFlat=rib.toNonIndexed();rib.dispose();ribFlat.computeVertexNormals();put(ribFlat,blade);
 for(const [m,geos] of sets){const geo=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The bardiche: a huge crescent cleaver on a blackened haft. The blade hangs off the haft on
// two iron sockets, the upper ring near the top and its long tail lashed lower down; the edge
// swells out in a great bite, chipped with three jagged notches, and sweeps up into a point
// that leans back over the haft's head like a hooked beak. A row of three holes is punched
// along the back, a spike of iron crowns the haft and rivets pin the tail. The grip is wound
// on a slant and the butt ends in an iron spike. Merged per material like the halberd:
// 4 draws. The blade stays metalness >= .75, so weapon-magic sheathes it.
function buildBardiche(g){
 const wood=new THREE.MeshStandardMaterial({color:0x35261a,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x4c4945,metalness:.78,roughness:.55});
 const blade=new THREE.MeshStandardMaterial({color:0xa4acb0,metalness:.82,roughness:.32});
 const wrap=new THREE.MeshStandardMaterial({color:0x2b1c16,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // The haft's crown: an iron cap and a short four-sided spike above the upper socket.
 put(new THREE.CylinderGeometry(.024,.027,.05,8),iron,0,.835);
 put(new THREE.ConeGeometry(.02,.1,4),iron,0,.905,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4));
 // Two sockets clamp the blade to the haft: a ring near the top and one round its tail.
 for(const y of [.77,.43]){
  put(new THREE.CylinderGeometry(.033,.033,.05,10),iron,0,y);
  put(new THREE.BoxGeometry(.035,.04,.016),iron,.035,y);
 }
 // Rivets pin the tail between the sockets, both flats.
 for(const s of [-1,1])for(const y of [.5,.57,.64])put(new THREE.SphereGeometry(.0065,5,4),iron,.03,y,s*.011);
 // The blade on +x: its tail runs up beside the haft from the lower socket, the edge swells
 // out in a great bite, chipped by three notches, and sweeps up into a beak hooking back
 // over the haft's crown. Three holes are punched along the back.
 const b=new THREE.Shape();
 b.moveTo(.03,.41);b.lineTo(.05,.41);
 b.quadraticCurveTo(.13,.47,.18,.56);
 b.lineTo(.2,.62);b.lineTo(.183,.635);b.lineTo(.21,.66);
 b.quadraticCurveTo(.225,.72,.218,.78);
 b.lineTo(.2,.795);b.lineTo(.222,.815);
 b.quadraticCurveTo(.215,.88,.18,.93);
 b.lineTo(.165,.935);b.lineTo(.17,.96);
 b.quadraticCurveTo(.1,1.02,-.03,1.03);
 b.quadraticCurveTo(.05,.98,.07,.92);
 b.quadraticCurveTo(.06,.84,.03,.8);
 b.closePath();
 for(const [x,y] of [[.075,.6],[.088,.69],[.09,.78]]){
  const h=new THREE.Path();h.absarc(x,y,.014,0,Math.PI*2,true);b.holes.push(h);
 }
 const geo=new THREE.ExtrudeGeometry(b,{depth:.012,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1,curveSegments:8});geo.translate(0,0,-.006);
 put(geo,blade);
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The voulge: a tall, narrow cleaver bolted up the side of a blackened haft. Its back runs
// straight up the haft between two iron sockets; the edge bellies out only a little, bitten by
// two jagged notches, then draws up and back into a long point leaning over the haft's crown
// like a raised knife. A thorn hooks up off the back of the upper socket, a slit is cut
// through the blade along its back and rivets pin it between the sockets. The grip is wound
// on a slant and the butt ends in an iron spike. Merged per material like the bardiche:
// 4 draws. The blade stays metalness >= .75, so weapon-magic sheathes it.
function buildVoulge(g){
 const wood=new THREE.MeshStandardMaterial({color:0x33251a,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x4a4744,metalness:.78,roughness:.56});
 const blade=new THREE.MeshStandardMaterial({color:0xa2aaae,metalness:.82,roughness:.33});
 const wrap=new THREE.MeshStandardMaterial({color:0x2b1c16,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // An iron cap over the haft's head, under the blade's point.
 put(new THREE.CylinderGeometry(.022,.027,.04,8),iron,0,.83);
 put(new THREE.ConeGeometry(.016,.05,4),iron,0,.875,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4));
 // Two sockets clamp the blade's back to the haft.
 for(const y of [.78,.48]){
  put(new THREE.CylinderGeometry(.033,.033,.045,10),iron,0,y);
  put(new THREE.BoxGeometry(.03,.036,.016),iron,.033,y);
 }
 // A thorn hooks up off the back of the upper socket.
 const t=new THREE.Shape();
 t.moveTo(-.028,.765);t.quadraticCurveTo(-.07,.77,-.1,.84);t.quadraticCurveTo(-.065,.8,-.028,.797);t.closePath();
 const thorn=new THREE.ExtrudeGeometry(t,{depth:.01,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,steps:1,curveSegments:6});thorn.translate(0,0,-.005);
 put(thorn,iron);
 // Rivets pin the back between the sockets, both flats.
 for(const s of [-1,1])for(const y of [.56,.63,.7])put(new THREE.SphereGeometry(.0065,5,4),iron,.034,y,s*.011);
 // The blade on +x: a straight back up the haft, the edge bellying out a little, bitten by
 // two notches, then drawing up and back into a point leaning over the crown. A slit is cut
 // through along the back.
 const b=new THREE.Shape();
 b.moveTo(.027,.44);b.lineTo(.05,.44);
 b.quadraticCurveTo(.11,.46,.132,.53);
 b.lineTo(.14,.62);b.lineTo(.122,.636);b.lineTo(.146,.66);
 b.quadraticCurveTo(.156,.76,.148,.86);
 b.lineTo(.131,.874);b.lineTo(.15,.895);
 b.quadraticCurveTo(.142,1,.1,1.065);
 b.quadraticCurveTo(.065,1.12,.008,1.17);
 b.quadraticCurveTo(.04,1.08,.034,.96);
 b.quadraticCurveTo(.03,.9,.027,.86);
 b.closePath();
 const slit=new THREE.Path();slit.moveTo(.058,.6);slit.quadraticCurveTo(.07,.75,.062,.92);slit.quadraticCurveTo(.054,.75,.058,.6);
 b.holes.push(slit);
 const geo=new THREE.ExtrudeGeometry(b,{depth:.012,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1,curveSegments:8});geo.translate(0,0,-.006);
 put(geo,blade);
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The ranseur: a long four-edged spike rising from a forged hilt, flanked by two side prongs
// that sweep out from the crossbar and hook up into talons, each barbed on its inner edge so
// a thrust that misses can be dragged back to catch. A ring of rivets nails the langets down
// the haft below the socket, the grip is wound on a slant and the butt ends in an iron spike.
// Merged per material like the partisan: 4 draws. The blades stay metalness >= .75, so
// weapon-magic sheathes them.
function buildRanseur(g){
 const wood=new THREE.MeshStandardMaterial({color:0x33241a,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x4a4745,metalness:.78,roughness:.55});
 const blade=new THREE.MeshStandardMaterial({color:0xa4acb1,metalness:.82,roughness:.31});
 const wrap=new THREE.MeshStandardMaterial({color:0x2b1c16,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Two langets nailed down the haft below the socket, and a band at their foot.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.006,.2,.016),iron,0,.67,s*.025);
  for(const y of [.6,.67,.74])put(new THREE.SphereGeometry(.0055,5,4),iron,0,y,s*.029);
 }
 put(new THREE.CylinderGeometry(.03,.03,.02,10),iron,0,.57);
 // The hilt: a tapered socket, a collar and a squared crossbar the prongs are forged from.
 put(new THREE.CylinderGeometry(.024,.031,.1,8),iron,0,.82);
 put(new THREE.CylinderGeometry(.036,.036,.018,8),iron,0,.775);
 put(new THREE.BoxGeometry(.1,.026,.03),iron,0,.875);
 // The spike: a four-edged lozenge in section, swelling just above the hilt and drawing
 // into a long needle point.
 const stations=[[.885,.012],[.92,.03],[.96,.033],[1.04,.026],[1.18,.016],[1.31,.008]],tip=1.43;
 const verts=[],index=[];
 for(const [y,w] of stations)verts.push(w,y,0, 0,y,w*.55, -w,y,0, 0,y,-w*.55);
 for(let i=0;i<stations.length-1;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4;index.push(a,b+4,b,a,a+4,b+4);}
 const apex=stations.length*4;verts.push(0,tip,0);
 const last=(stations.length-1)*4;for(let j=0;j<4;j++)index.push(last+j,apex,last+(j+1)%4);
 index.push(0,1,2,0,2,3);
 const spike=new THREE.BufferGeometry();spike.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));spike.setIndex(index);
 const spikeFlat=spike.toNonIndexed();spike.dispose();spikeFlat.computeVertexNormals();put(spikeFlat,blade);
 // The side prongs, built as the right half and mirrored: out from the crossbar, sweeping up
 // into a talon that hooks outward, then back down the inner edge past a barb.
 const half=[[0,.862],[.05,.862],[.1,.875],[.138,.905],[.162,.95],[.176,1.01],[.19,1.07],[.2,1.12],
  [.172,1.07],[.152,1.02],[.13,1.0],[.142,.985],[.122,.958],[.095,.928],[.06,.912],[.028,.906]];
 const s=new THREE.Shape();s.moveTo(half[0][0],half[0][1]);
 for(let i=1;i<half.length;i++)s.lineTo(half[i][0],half[i][1]);
 for(let i=half.length-1;i>=1;i--)s.lineTo(-half[i][0],half[i][1]);
 s.closePath();
 const prongs=new THREE.ExtrudeGeometry(s,{depth:.01,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1});prongs.translate(0,0,-.005);
 put(prongs,blade);
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// A four-edged blade up +y: lozenge sections [y,width] with depth = width*thin, closed at the
// root and drawn to a point at `tip`. Flat-shaded.
function lozenge(stations,tip,thin){
 const verts=[],index=[];
 for(const [y,w] of stations)verts.push(w,y,0, 0,y,w*thin, -w,y,0, 0,y,-w*thin);
 for(let i=0;i<stations.length-1;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4;index.push(a,b+4,b,a,a+4,b+4);}
 const apex=stations.length*4;verts.push(0,tip,0);
 const last=(stations.length-1)*4;for(let j=0;j<4;j++)index.push(last+j,apex,last+(j+1)%4);
 index.push(0,1,2,0,2,3);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(index);
 const flat=geo.toNonIndexed();geo.dispose();flat.computeVertexNormals();return flat;
}

// The spetum: a long, narrow central blade with a raised midrib, rising from a forged socket
// between two straight side blades that fork out and up at a steep slant like a pair of
// daggers. Each side blade is four-edged and ends in a needle point, and a hooked thorn
// bites back down from its root, so the whole head reads as a jagged trident of knives.
// Langets are nailed down the haft below the socket, the grip is wound on a slant and the
// butt ends in an iron spike. Merged per material like the ranseur: 4 draws. The blades stay
// metalness >= .75, so weapon-magic sheathes them.
function buildSpetum(g){
 const wood=new THREE.MeshStandardMaterial({color:0x32241a,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x4b4845,metalness:.78,roughness:.55});
 const blade=new THREE.MeshStandardMaterial({color:0xa3abb0,metalness:.82,roughness:.31});
 const wrap=new THREE.MeshStandardMaterial({color:0x2b1c16,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);if(geo.attributes.uv)geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Two langets nailed down the haft below the socket, and a band at their foot.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.006,.22,.016),iron,0,.67,s*.025);
  for(const y of [.59,.66,.73])put(new THREE.SphereGeometry(.0055,5,4),iron,0,y,s*.029);
 }
 put(new THREE.CylinderGeometry(.03,.03,.02,10),iron,0,.555);
 // The socket: a tapered sleeve, a collar, and a flared fork block the side blades spring from.
 put(new THREE.CylinderGeometry(.024,.031,.1,8),iron,0,.82);
 put(new THREE.CylinderGeometry(.036,.036,.018,8),iron,0,.775);
 const fork=new THREE.CylinderGeometry(.03,.022,.05,4);fork.rotateY(Math.PI/4);fork.scale(1.7,1,.7);
 put(fork,iron,0,.89);
 // The central blade: narrow, with a raised midrib (thin sections), swelling a little above
 // the socket and drawing out into a long point.
 put(lozenge([[.905,.014],[.94,.034],[1.0,.038],[1.12,.032],[1.26,.022],[1.38,.011]],1.5,.42),blade);
 // The side blades fork out and up at a steep slant, each a long four-edged dagger, with a
 // thorn hooking back down from its root.
 const side=lozenge([[0,.011],[.03,.022],[.09,.021],[.2,.015],[.29,.008]],.37,.5);
 for(const s of [-1,1]){
  const tilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-s*.62);
  put(side.clone(),blade,s*.035,.895,0,tilt);
  const thorn=new THREE.ConeGeometry(.009,.07,4);thorn.translate(0,.035,0);
  put(thorn,blade,s*.06,.9,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI+s*.75));
 }
 side.dispose();
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The lucern hammer: a squat hammer block on a forged socket, its face split into four
// pyramid prongs for punching through plate, a long beak curving down off its back with a
// barb hooked under it to drag a rider from the saddle, and a four-edged spike rising from
// a collar over the block. Langets are nailed down the haft, the grip is wound on a slant
// and the butt ends in an iron spike. Merged per material like the spetum: 4 draws. The
// striking parts stay metalness >= .75, so weapon-magic sheathes them.
function buildLucernHammer(g){
 const wood=new THREE.MeshStandardMaterial({color:0x32241a,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x4a4744,metalness:.78,roughness:.56});
 const blade=new THREE.MeshStandardMaterial({color:0xa2aaaf,metalness:.82,roughness:.32});
 const wrap=new THREE.MeshStandardMaterial({color:0x2b1c16,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);if(geo.attributes.uv)geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Two langets nailed down the haft below the socket, and a band at their foot.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.006,.22,.016),iron,0,.67,s*.025);
  for(const y of [.59,.66,.73])put(new THREE.SphereGeometry(.0055,5,4),iron,0,y,s*.029);
 }
 put(new THREE.CylinderGeometry(.03,.03,.02,10),iron,0,.555);
 // The socket: a tapered sleeve and a collar under the head.
 put(new THREE.CylinderGeometry(.026,.031,.1,8),iron,0,.83);
 put(new THREE.CylinderGeometry(.036,.036,.018,8),iron,0,.785);
 // The hammer block straddles the haft's head, a little proud on the +x face side.
 put(new THREE.BoxGeometry(.15,.075,.058),iron,.035,.92);
 // The face: four pyramid prongs pointing out along +x, splayed a little apart.
 for(const y of [-1,1])for(const z of [-1,1]){
  const prong=new THREE.ConeGeometry(.017,.06,4);prong.rotateY(Math.PI/4);prong.translate(0,.03,0);
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(1,y*.2,z*.2).normalize());
  put(prong,blade,.11,.92+y*.018,z*.015,q);
 }
 // The beak on -x: thick at the block, curving down to a point, with a barb under it that
 // hooks back toward the haft.
 const b=new THREE.Shape();
 b.moveTo(-.04,.955);
 for(const [x,y] of [[-.09,.952],[-.145,.94],[-.195,.915],[-.235,.878],[-.268,.82],
  [-.24,.852],[-.205,.878],[-.17,.893],[-.155,.872],[-.125,.852],[-.13,.888],[-.09,.895],[-.04,.89]])b.lineTo(x,y);
 b.closePath();
 const beak=new THREE.ExtrudeGeometry(b,{depth:.014,bevelEnabled:true,bevelThickness:.005,bevelSize:.004,bevelSegments:1,steps:1});beak.translate(0,0,-.007);
 put(beak,blade);
 // A collar on the block and the top spike, four-edged and drawn to a long point.
 put(new THREE.CylinderGeometry(.022,.028,.025,8),iron,0,.97);
 put(lozenge([[.982,.013],[1.01,.027],[1.06,.029],[1.16,.021],[1.27,.011]],1.4,.5),blade);
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The fauchard: a long sickle blade rising from a forged socket. Its broad back climbs up
// the haft's line and rolls over into a crown, then the blade hooks down into a cruel point
// out over +x, so the concave inner edge faces the foe like a reaping hook. That edge is
// bitten by two jagged teeth near the root, a fuller runs up the flat and a hooked thorn
// juts back and down off the socket. Langets are nailed down the haft, the grip is wound on
// a slant and the butt ends in an iron spike. Merged per material like the lucern hammer:
// 4 draws. The blade stays metalness >= .75, so weapon-magic sheathes it.
function buildFauchard(g){
 const wood=new THREE.MeshStandardMaterial({color:0x31241a,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x4a4744,metalness:.78,roughness:.56});
 const blade=new THREE.MeshStandardMaterial({color:0xa1a9ae,metalness:.82,roughness:.33});
 const wrap=new THREE.MeshStandardMaterial({color:0x2b1c16,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);if(geo.attributes.uv)geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Two langets nailed down the haft below the socket, and a band at their foot.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.006,.22,.016),iron,0,.67,s*.025);
  for(const y of [.59,.66,.73])put(new THREE.SphereGeometry(.0055,5,4),iron,0,y,s*.029);
 }
 put(new THREE.CylinderGeometry(.03,.03,.02,10),iron,0,.555);
 // The socket: a tapered sleeve, a collar, and a flattened cap the blade's root sits in.
 put(new THREE.CylinderGeometry(.025,.031,.1,8),iron,0,.83);
 put(new THREE.CylinderGeometry(.036,.036,.018,8),iron,0,.785);
 const cap=new THREE.CylinderGeometry(.03,.026,.04,8);cap.scale(1.25,1,.75);put(cap,iron,.004,.89);
 // A thorn juts back off the socket and hooks down.
 const t=new THREE.Shape();
 t.moveTo(-.024,.875);t.quadraticCurveTo(-.07,.885,-.112,.84);t.quadraticCurveTo(-.068,.86,-.024,.848);t.closePath();
 const thorn=new THREE.ExtrudeGeometry(t,{depth:.01,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,steps:1,curveSegments:6});thorn.translate(0,0,-.005);
 put(thorn,iron);
 // Rivets pin the blade's root through the cap, both flats.
 for(const s of [-1,1])for(const y of [.88,.9])put(new THREE.SphereGeometry(.0065,5,4),iron,.004,y,s*.024);
 // The blade: the back climbs from the socket and rolls over into a crown, the point hooks
 // down over +x, and the concave inner edge runs back down past two jagged teeth.
 const b=new THREE.Shape();
 b.moveTo(-.022,.88);
 b.quadraticCurveTo(-.05,1.1,.02,1.27);
 b.quadraticCurveTo(.09,1.39,.2,1.36);
 b.quadraticCurveTo(.252,1.335,.272,1.21);
 b.quadraticCurveTo(.24,1.29,.19,1.302);
 b.quadraticCurveTo(.11,1.318,.07,1.24);
 b.quadraticCurveTo(.04,1.18,.042,1.1);
 b.lineTo(.062,1.074);b.lineTo(.037,1.052);
 b.quadraticCurveTo(.03,1.0,.04,.962);
 b.lineTo(.058,.936);b.lineTo(.031,.918);
 b.lineTo(.026,.88);
 b.closePath();
 // A fuller cut through along the back, following its curve.
 const fuller=new THREE.Path();fuller.moveTo(-.006,.96);fuller.quadraticCurveTo(-.016,1.12,.03,1.24);fuller.quadraticCurveTo(-.002,1.12,.006,.96);
 b.holes.push(fuller);
 const geo=new THREE.ExtrudeGeometry(b,{depth:.012,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1,curveSegments:8});geo.translate(0,0,-.006);
 put(geo,blade);
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The guisarme: a pruning hook on a pole. A narrow blade climbs straight from the socket, its
// back rolling over at the top into a beak that drops into a point out over +x, so the
// throat under the beak catches and drags. The front edge below is bitten by two jagged
// teeth, a fuller runs up the spine and a long spur hooks back and up off the spine to pull
// riders down. Langets are nailed down the haft, the grip is wound on a slant and the butt
// ends in an iron spike. Merged per material like the fauchard: 4 draws. The blade stays
// metalness >= .75, so weapon-magic sheathes it.
function buildGuisarme(g){
 const wood=new THREE.MeshStandardMaterial({color:0x2e2219,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x474442,metalness:.78,roughness:.58});
 const blade=new THREE.MeshStandardMaterial({color:0x9ea6ab,metalness:.82,roughness:.34});
 const wrap=new THREE.MeshStandardMaterial({color:0x2a1b15,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);if(geo.attributes.uv)geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Two langets nailed down the haft below the socket, and a band at their foot.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.006,.22,.016),iron,0,.67,s*.025);
  for(const y of [.59,.66,.73])put(new THREE.SphereGeometry(.0055,5,4),iron,0,y,s*.029);
 }
 put(new THREE.CylinderGeometry(.03,.03,.02,10),iron,0,.555);
 // The socket: a tapered sleeve, a collar, and a flattened cap the blade's root sits in.
 put(new THREE.CylinderGeometry(.025,.031,.1,8),iron,0,.83);
 put(new THREE.CylinderGeometry(.036,.036,.018,8),iron,0,.785);
 const cap=new THREE.CylinderGeometry(.03,.026,.04,8);cap.scale(1.25,1,.75);put(cap,iron,.002,.89);
 // Rivets pin the blade's root through the cap, both flats.
 for(const s of [-1,1])for(const y of [.88,.9])put(new THREE.SphereGeometry(.0065,5,4),iron,.002,y,s*.024);
 // The blade: up the spine past the back spur, over the crown into the beak's point, back
 // under the beak to the throat, then down the toothed front edge to the root.
 const b=new THREE.Shape();
 b.moveTo(-.022,.88);
 b.lineTo(-.024,1.02);
 b.quadraticCurveTo(-.08,1.05,-.155,1.15);
 b.quadraticCurveTo(-.09,1.085,-.022,1.075);
 b.quadraticCurveTo(-.03,1.22,-.005,1.31);
 b.quadraticCurveTo(.04,1.39,.12,1.37);
 b.quadraticCurveTo(.175,1.345,.19,1.24);
 b.quadraticCurveTo(.165,1.3,.12,1.302);
 b.quadraticCurveTo(.07,1.3,.055,1.24);
 b.lineTo(.05,1.17);b.lineTo(.072,1.145);b.lineTo(.048,1.125);
 b.quadraticCurveTo(.045,1.03,.052,.98);
 b.lineTo(.07,.955);b.lineTo(.042,.935);
 b.lineTo(.026,.88);
 b.closePath();
 // A fuller cut through along the spine.
 const fuller=new THREE.Path();fuller.moveTo(-.004,.97);fuller.quadraticCurveTo(-.01,1.12,.012,1.24);fuller.quadraticCurveTo(.004,1.12,.01,.97);
 b.holes.push(fuller);
 const geo=new THREE.ExtrudeGeometry(b,{depth:.012,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1,curveSegments:8});geo.translate(0,0,-.006);
 put(geo,blade);
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The bill-guisarme: a peasant's billhook forged onto a pole. A broad, heavy chopping blade
// bellies out over +x, its top curling forward into a beak that drops to a point, with a
// throat under it to catch and drag. A straight thrusting spike rises off the top, and a
// short spike juts straight back off the spine. A notch bites the foot of the belly and a
// fuller is sunk beside the spine. Langets, slant-wound grip and spiked butt like the other
// polearms. Merged per material: 4 draws. The blade stays metalness >= .75, so weapon-magic
// sheathes it.
function buildBillGuisarme(g){
 const wood=new THREE.MeshStandardMaterial({color:0x2c2018,roughness:.93});
 const iron=new THREE.MeshStandardMaterial({color:0x43403e,metalness:.78,roughness:.6});
 const blade=new THREE.MeshStandardMaterial({color:0x8f979c,metalness:.8,roughness:.42});
 const wrap=new THREE.MeshStandardMaterial({color:0x281a14,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);if(geo.attributes.uv)geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.026,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Two langets nailed down the haft below the socket, and two bands.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.006,.24,.016),iron,0,.66,s*.026);
  for(const y of [.57,.64,.71])put(new THREE.SphereGeometry(.0055,5,4),iron,0,y,s*.03);
 }
 for(const y of [.535,.765])put(new THREE.CylinderGeometry(.031,.031,.02,10),iron,0,y);
 // The socket: a tapered sleeve and a flattened cap the blade's root sits in.
 put(new THREE.CylinderGeometry(.026,.032,.1,8),iron,0,.83);
 const cap=new THREE.CylinderGeometry(.031,.027,.04,8);cap.scale(1.3,1,.75);put(cap,iron,.004,.89);
 // Rivets pin the blade's root through the cap, both flats.
 for(const s of [-1,1])for(const x of [-.012,.02])put(new THREE.SphereGeometry(.0065,5,4),iron,x,.892,s*.024);
 // The blade: up the spine past the back spike, up the top spike, over into the beak's
 // point, back under the beak to the throat, then down the bellied edge to the root.
 const b=new THREE.Shape();
 b.moveTo(-.024,.88);
 b.lineTo(-.026,1.04);
 b.lineTo(-.125,1.072);b.lineTo(-.026,1.096);
 b.lineTo(-.022,1.28);
 b.lineTo(-.012,1.33);b.lineTo(.002,1.5);b.lineTo(.016,1.33);
 b.quadraticCurveTo(.12,1.35,.2,1.22);
 b.quadraticCurveTo(.15,1.265,.11,1.235);
 b.quadraticCurveTo(.2,1.1,.125,.985);
 b.lineTo(.1,.975);b.lineTo(.108,.95);
 b.quadraticCurveTo(.07,.9,.026,.88);
 b.closePath();
 // A fuller sunk beside the spine.
 const fuller=new THREE.Path();fuller.moveTo(.006,.97);fuller.quadraticCurveTo(-.002,1.1,.012,1.22);fuller.quadraticCurveTo(.018,1.1,.022,.97);
 b.holes.push(fuller);
 const geo=new THREE.ExtrudeGeometry(b,{depth:.014,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1,curveSegments:8});geo.translate(0,0,-.007);
 put(geo,blade);
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The bec de corbin: a crow's beak on a pole. A long, thick beak juts out over +x from a forged
// block and curves down to a hooked point, a ridge running along its back and a notch cut
// under its root. On -x a short neck ends in a small square hammer face crowned with a grid
// of teeth, and a four-edged spike rises off the top. A round iron rondel guards the hand
// below the head. Langets, slant-wound grip and spiked butt like the other polearms. Merged
// per material: 4 draws. The striking parts stay metalness >= .75, so weapon-magic sheathes
// them.
function buildBecDeCorbin(g){
 const wood=new THREE.MeshStandardMaterial({color:0x2a1f17,roughness:.93});
 const iron=new THREE.MeshStandardMaterial({color:0x3f3d3c,metalness:.78,roughness:.58});
 const blade=new THREE.MeshStandardMaterial({color:0x9aa1a6,metalness:.82,roughness:.36});
 const wrap=new THREE.MeshStandardMaterial({color:0x261913,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);if(geo.attributes.uv)geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // The rondel: a round iron disc guarding the hand, with a boss on each face.
 const rondel=new THREE.CylinderGeometry(.062,.062,.008,16);put(rondel,iron,0,.62);
 for(const s of [-1,1])put(new THREE.CylinderGeometry(.03,.034,.008,10),iron,0,.62+s*.007);
 // Two langets nailed down the haft below the socket, and a band at their foot.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.006,.13,.016),iron,0,.71,s*.025);
  for(const y of [.67,.74])put(new THREE.SphereGeometry(.0055,5,4),iron,0,y,s*.029);
 }
 // The socket: a tapered sleeve and a collar under the head.
 put(new THREE.CylinderGeometry(.026,.031,.1,8),iron,0,.83);
 put(new THREE.CylinderGeometry(.036,.036,.018,8),iron,0,.785);
 // The block the beak and hammer are forged from, straddling the haft's head.
 put(new THREE.BoxGeometry(.1,.08,.054),iron,0,.92);
 // The hammer on -x: a short octagonal neck and a square face crowned with a 3x3 grid of
 // pyramid teeth.
 const neck=new THREE.CylinderGeometry(.022,.026,.06,8);neck.rotateZ(Math.PI/2);put(neck,iron,-.075,.92);
 put(new THREE.BoxGeometry(.03,.062,.062),iron,-.118,.92);
 for(const y of [-1,0,1])for(const z of [-1,0,1]){
  const tooth=new THREE.ConeGeometry(.011,.018,4);tooth.rotateY(Math.PI/4);tooth.rotateZ(Math.PI/2);
  put(tooth,blade,-.142,.92+y*.019,z*.019);
 }
 // The beak on +x: thick at the block, sweeping out and curving down to a hooked point, a
 // notch cut under its root.
 const b=new THREE.Shape();
 b.moveTo(.04,.958);
 b.quadraticCurveTo(.17,.965,.25,.92);
 b.quadraticCurveTo(.305,.88,.318,.79);
 b.quadraticCurveTo(.282,.85,.235,.874);
 b.quadraticCurveTo(.16,.9,.1,.9);
 b.lineTo(.085,.884);b.lineTo(.068,.9);
 b.lineTo(.04,.884);
 b.closePath();
 const beak=new THREE.ExtrudeGeometry(b,{depth:.016,bevelEnabled:true,bevelThickness:.006,bevelSize:.005,bevelSegments:2,steps:1,curveSegments:10});beak.translate(0,0,-.008);
 put(beak,blade);
 // A ridge along the beak's back, following its curve.
 const ridge=new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(.05,.96,0),new THREE.Vector3(.19,.97,0),new THREE.Vector3(.29,.86,0)),12,.006,4,false);
 put(ridge,blade);
 // A collar on the block and the top spike, four-edged and drawn to a long point.
 put(new THREE.CylinderGeometry(.022,.028,.025,8),iron,0,.97);
 put(lozenge([[.982,.013],[1.01,.025],[1.06,.026],[1.15,.019],[1.24,.01]],1.36,.55),blade);
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The lance: a war lance, not a tourney pole. A long turned haft swells behind the hand and
// tapers to a narrow four-edged point with two barbs raked back off its base; two blackened
// iron bands wind up the haft in a spiral. A deep, fluted vamplate of black iron flares over
// the hand, its rim cut into hooked teeth, and an iron burr with a ring of studs stops the
// grip sliding back. A spiked iron butt. Merged per material: 4 draws.
function buildLance(g){
 const wood=new THREE.MeshStandardMaterial({color:0x2c1f16,roughness:.9});
 const iron=new THREE.MeshStandardMaterial({color:0x2e2c2c,metalness:.78,roughness:.55});
 const blade=new THREE.MeshStandardMaterial({color:0x9aa1a6,metalness:.84,roughness:.33});
 const wrap=new THREE.MeshStandardMaterial({color:0x261913,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);if(geo.attributes.uv)geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 const up=new THREE.Vector3(0,1,0);
 // The haft's radius along its length: a thin butt, a swell behind the burr, a narrow grip,
 // then thick under the vamplate and a long taper to the point's socket.
 const profile=[[-.34,.017],[-.25,.024],[-.17,.033],[-.13,.028],[-.1,.023],[.08,.023],[.13,.036],[.3,.039],[.7,.031],[1.1,.022],[1.3,.017]];
 const radius=y=>{for(let i=1;i<profile.length;i++)if(y<=profile[i][0]){const [y0,r0]=profile[i-1],[y1,r1]=profile[i];return r0+(r1-r0)*(y-y0)/(y1-y0);}return profile.at(-1)[1];};
 put(new THREE.LatheGeometry([new THREE.Vector2(0,-.34),...profile.map(([y,r])=>new THREE.Vector2(r,y)),new THREE.Vector2(0,1.3)],12),wood);
 // Two iron bands winding up the haft from the vamplate to the socket, half a turn apart.
 for(const phase of [0,Math.PI]){
  const pts=[];for(let i=0;i<=40;i++){const y=.24+i*1.04/40,a=phase+i/40*Math.PI*2*3.5,r=radius(y)+.0015;pts.push(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),120,.0045,4,false),iron);
 }
 // The grip, wound on a slant.
 put(new THREE.CylinderGeometry(.026,.026,.17,10),wrap,0,-.01);
 for(let i=0;i<5;i++){const turn=new THREE.TorusGeometry(.027,.0055,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.075+i*.033,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // The burr: an iron ring behind the grip with a ring of studs.
 put(new THREE.CylinderGeometry(.036,.036,.026,12),iron,0,-.12);
 for(let i=0;i<8;i++){const a=i*Math.PI/4,d=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
  put(new THREE.ConeGeometry(.007,.016,4),iron,d.x*.039,-.12,d.z*.039,new THREE.Quaternion().setFromUnitVectors(up,d));}
 // The butt: an iron shoe and a short spike.
 put(new THREE.CylinderGeometry(.019,.016,.05,10),iron,0,-.335);
 put(new THREE.ConeGeometry(.014,.08,4),blade,0,-.4,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // The vamplate: a deep iron funnel flaring down over the hand, with a thickness so it reads
 // from inside, eight raised flutes and a rim cut into teeth hooked down and out.
 put(new THREE.LatheGeometry([[.038,.33],[.05,.27],[.08,.19],[.118,.12],[.13,.1],[.122,.1],[.11,.12],[.073,.19],[.044,.27],[.034,.33]].map(([r,y])=>new THREE.Vector2(r,y)),16),iron);
 for(let i=0;i<8;i++){
  const a=(i+.5)*Math.PI/4,c=Math.cos(a),s=Math.sin(a);
  const flute=[[.05,.28],[.07,.22],[.1,.155],[.128,.104]].map(([r,y])=>new THREE.Vector3(c*(r+.004),y,s*(r+.004)));
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(flute),8,.0045,4,false),iron);
 }
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,d=new THREE.Vector3(Math.cos(a),-.55,Math.sin(a)).normalize();
  const tooth=new THREE.ConeGeometry(.011,.04,3);tooth.translate(0,.02,0);
  // Each tooth hooks a little sideways, so the rim reads jagged rather than a neat crown.
  const q=new THREE.Quaternion().setFromUnitVectors(up,d).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.35));
  put(tooth,blade,Math.cos(a)*.126,.1,Math.sin(a)*.126,q);
 }
 put(new THREE.CylinderGeometry(.042,.042,.02,12),iron,0,.33);
 // The point's socket and two langets nailed down the haft.
 put(new THREE.CylinderGeometry(.019,.02,.09,8),iron,0,1.33);
 put(new THREE.CylinderGeometry(.026,.026,.016,8),iron,0,1.29);
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.005,.12,.012),iron,0,1.23,s*.02);
  for(const y of [1.19,1.25])put(new THREE.SphereGeometry(.0045,5,4),iron,0,y,s*.023);
 }
 // The point: long, narrow and four-edged, with two barbs raked back off its base.
 put(lozenge([[1.375,.022],[1.41,.03],[1.47,.026],[1.54,.016],[1.6,.008]],1.66,.62),blade);
 for(const s of [-1,1]){
  const d=new THREE.Vector3(s*.6,-1,0).normalize();
  put(new THREE.ConeGeometry(.009,.06,4),blade,s*.04,1.375,0,new THREE.Quaternion().setFromUnitVectors(up,d));
 }
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The silver saber: a long, gently curved single-edged blade of bright silver. Its edge runs
// along the convex side, a fuller is sunk down its flat and the tip is clipped into a false
// edge. A tarnished silver knuckle-bow sweeps from the guard down to a hooked bird's-head
// pommel, and the back quillon curls down like a talon. The grip is blackened and bound in
// silver wire. Merged per material: 3 draws. Blade and hilt stay metalness >= .75, so
// weapon-magic sheathes them.
function buildSilverSaber(g){
 const silver=new THREE.MeshStandardMaterial({color:0xe9eef1,metalness:.92,roughness:.16});
 const tarnish=new THREE.MeshStandardMaterial({color:0x9c9fa3,metalness:.86,roughness:.36});
 const grip=new THREE.MeshStandardMaterial({color:0x1d1a1c,roughness:.8});
 g.userData.extraMaterial=[silver,tarnish,grip];
 const sets=new Map([[silver,[]],[tarnish,[]],[grip,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);if(geo.attributes.uv)geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 // A tube along a curve whose radius tapers from r0 to r1.
 const taper=(points,r0,r1,segments=16,radial=6)=>{
  const curve=new THREE.CatmullRomCurve3(points.map(([x,y,z=0])=>new THREE.Vector3(x,y,z)));
  const geo=new THREE.TubeGeometry(curve,segments,1,radial,false),pos=geo.attributes.position,v=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<=segments;i++){curve.getPointAt(i/segments,c);const r=r0+(r1-r0)*i/segments;
   for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(pos,k).sub(c).multiplyScalar(r).add(c);pos.setXYZ(k,v.x,v.y,v.z);}}
  geo.computeVertexNormals();return geo;
 };
 // The blade, built station by station up +y. Each cross-section is a wedge: a thick spine on
 // -x, a fuller sunk into each flat and the edge on +x. The whole blade bends back toward the
 // spine, so the edge rides the convex side; the last stretch is clipped into a false edge.
 const N=28,y0=.115,L=.8,ring=[],sections=[];
 const tipX=-.1+.012;
 for(let i=0;i<=N;i++){
  const t=i/N,y=y0+L*t,c=-.1*t*t,w=.064-.014*t;
  let back=c-w*.42,edge=c+w*.58;
  const s=Math.max(0,(t-.8)/.2);
  back+= (tipX-back)*s;edge+=(tipX-edge)*s*s*(3-2*s);
  const thick=.0095*(1-.85*s),width=edge-back;
  sections.push([[back,y,thick],[back+width*.35,y,thick*.55],[back+width*.62,y,thick*.8],[edge,y,0],[back+width*.62,y,-thick*.8],[back+width*.35,y,-thick*.55],[back,y,-thick]]);
 }
 const verts=[],index=[],K=7;
 sections.forEach(sec=>sec.forEach(p=>verts.push(...p)));
 for(let i=0;i<N;i++)for(let j=0;j<K;j++){const a=i*K+j,b=i*K+(j+1)%K,c=a+K,d=b+K;index.push(a,b,d,a,d,c);}
 // Cap the heel against the guard.
 for(let j=1;j<K-1;j++)index.push(0,j+1,j);
 const bladeGeo=new THREE.BufferGeometry();bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));bladeGeo.setIndex(index);
 const flatBlade=bladeGeo.toNonIndexed();bladeGeo.dispose();flatBlade.computeVertexNormals();put(flatBlade,silver);
 // A ricasso collar where the blade meets the guard.
 put(new THREE.BoxGeometry(.06,.03,.024),tarnish,-.003,.112);
 // Guard: a short plate, the back quillon curling down like a talon, the knuckle-bow sweeping
 // from the front of the guard down to the pommel.
 put(new THREE.BoxGeometry(.13,.018,.034),tarnish,-.005,.09);
 put(taper([[-.065,.09],[-.095,.085],[-.112,.06],[-.104,.03],[-.088,.022]],.009,.003,14),tarnish);
 put(taper([[.06,.09],[.083,.06],[.088,-.01],[.072,-.08],[.035,-.118],[.012,-.12]],.0075,.0065,22),tarnish);
 // A thorn on the knuckle-bow's outer curve.
 put(new THREE.ConeGeometry(.007,.03,4),tarnish,.1,.02,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-Math.PI/2-.2));
 // Grip, a little oval and swelling in the middle, bound in silver wire on a slant.
 const handle=new THREE.CylinderGeometry(.019,.017,.17,10);handle.scale(1.15,1,.9);
 const hp=handle.attributes.position,hv=new THREE.Vector3();
 for(let i=0;i<hp.count;i++){hv.fromBufferAttribute(hp,i);const k=1+.12*Math.cos(hv.y/.085*Math.PI/2);hp.setXYZ(i,hv.x*k,hv.y,hv.z*k);}
 handle.computeVertexNormals();put(handle,grip,0,0);
 for(let i=0;i<7;i++){const turn=new THREE.TorusGeometry(.021,.0028,4,14);turn.rotateX(Math.PI/2);turn.scale(1.15,1,.92);
  put(turn,silver,0,-.066+i*.022,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.3));}
 // Bird's-head pommel: a cap that hooks back toward the spine.
 put(new THREE.CylinderGeometry(.021,.019,.016,10),tarnish,0,-.092);
 put(taper([[.012,-.1],[-.005,-.118],[-.03,-.122],[-.045,-.108]],.016,.006,12,8),tarnish);
 for(const [m,geos] of sets){const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.userData.part=m===silver?'blade':m===tarnish?'hilt':'grip';g.add(mesh);}
}
