import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Lord Carnarvon (the Archeologist quest leader) shares the humans' letter, so he used to be the
// plain `@` humanoid. He now stands as a gaunt Edwardian earl who has opened one tomb too many: a
// sun-bleached pith helmet with a frayed, dust-stained puggaree, a sallow, hollow-cheeked face with a
// waxed moustache, a monocle in the right eye, and two pale tomb-gold glints where his eyes should
// be. A dusty khaki Norfolk jacket with box pleats, patch pockets and a cracked leather belt hangs
// loose on him; a gold scarab is pinned at his throat over a high collar and a dark cravat. Below
// are flared jodhpurs, puttees wound in a spiral up the shins, and scuffed brown riding boots. In his
// right hand he carries a black ebony cane topped by a jackal's head in tarnished gold.
// Each moving part (body, head, each leg and arm, the cane) is one merged, vertex-coloured mesh on
// one shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once and
// shared.
// Handles: legs, arms, arm (the cane arm), weaponSocket, head, eyes, body.

const C={
 skin:rgb('#b8a684'),skinDark:rgb('#6e5e44'),skinHi:rgb('#d4c4a0'),shadow:rgb('#1a120a'),
 khaki:rgb('#a08c62'),khakiDark:rgb('#5e5034'),khakiHi:rgb('#c4b286'),dust:rgb('#cfc2a0'),
 helmet:rgb('#d6caa8'),helmetDark:rgb('#8a7e60'),
 leather:rgb('#4a2e18'),leatherHi:rgb('#7a5432'),leatherDark:rgb('#22140a'),
 cloth:rgb('#2a2620'),collar:rgb('#d8d0bc'),cravat:rgb('#3a1418'),
 gold:rgb('#a8862e'),goldHi:rgb('#e0c060'),goldDark:rgb('#4e3a10'),
 ebony:rgb('#141010'),ebonyHi:rgb('#3a3230'),hair:rgb('#5a5046'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
// a tapered cylinder from point a to point b
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// tarnished gold, pitted with black
const tarnish=(x,y,z)=>{const s=hash(Math.floor(x*400)+Math.floor(y*400)*7+Math.floor(z*400)*13);return s>.8?C.goldDark:s>.55?C.goldHi:C.gold;};
// khaki drill, sun-faded on top and caked with tomb dust toward the bottom
const drill=(x,y,z,lo=0)=>{
 let c=mix(C.khakiDark,C.khaki,.55+(Math.sin(y*240+x*30)*.5+.5)*.25+clamp01(z*6)*.2);
 const d=clamp01((lo+.12-y)*7)*(hash(Math.floor(x*90)+Math.floor(y*90)*5+Math.floor(z*90)*3)*.6+.3);
 return mix(c,C.dust,d);
};

export const HIP_Y=.5,SHOULDER_Y=.86,NECK_Y=.97;

function buildBody(){
 const P=pieces();
 // the Norfolk jacket: hanging loose on a thin frame, flaring a little below the belt
 const jacket=(x,y,z)=>{
  let c=drill(x,y,z,.42);
  // box pleats down the front and back
  if(Math.abs(Math.abs(x)-.065)<.008)c=mix(c,C.khakiDark,.6);
  // the patch pockets, two at the breast and two below the belt, with buttoned flaps
  for(const s of [-1,1]){
   if(z>0&&Math.abs(x-s*.09)<.04&&y>.72&&y<.8)c=Math.abs(y-.79)<.008?C.khakiDark:mix(c,C.khakiHi,.25);
   if(z>0&&Math.abs(x-s*.095)<.05&&y>.44&&y<.55)c=Math.abs(y-.54)<.01?C.khakiDark:mix(c,C.khakiHi,.2);
  }
  // the buttons down the front
  if(z>.1&&Math.abs(x)<.008&&Math.sin(y*80)>.75&&y>.5)c=C.leatherDark;
  return c;
 };
 P.add(lathe([[.15,.4],[.165,.46],[.15,.56],[.14,.64],[.16,.76],[.175,.84],[.15,.9],[.09,.94],[.05,.95]],32),at(0,0,0,[0,0,0],[1,1,.72]),jacket);
 // the cracked leather belt with a tarnished brass buckle
 P.add(new THREE.CylinderGeometry(.146,.146,.03,32,1,true),at(0,.6,0,[0,0,0],[1,1,.73]),(x,y,z)=>hash(Math.floor(Math.atan2(x,z)*20))>.85?C.leatherDark:mix(C.leather,C.leatherHi,(Math.sin(Math.atan2(x,z)*7)*.5+.5)*.4));
 P.add(new THREE.BoxGeometry(.04,.036,.012),at(0,.6,.11),tarnish);
 // the high white collar, a dark cravat, and the gold scarab pinned at the throat
 P.add(new THREE.CylinderGeometry(.045,.05,.05,16,1,true),at(0,.955,.005),C.collar);
 P.add(new THREE.ConeGeometry(.03,.08,6),at(0,.9,.105,[Math.PI+.15,0,0],[1,1,.4]),C.cravat);
 P.add(new THREE.SphereGeometry(.013,10,8),at(0,.92,.118,[0,0,0],[1,1.35,.55]),(x,y,z)=>Math.abs(x)<.0015?C.goldDark:tarnish(x,y,z));
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.016,.004,.003),at(s*.012,.925,.115,[0,0,s*.35]),C.goldDark);// the scarab's splayed legs
 // a leather satchel strap across the chest, right shoulder to left hip
 limb(P,[.11,.88,.08],[-.13,.52,.1],.009,.009,(x,y)=>mix(C.leather,C.leatherHi,(Math.sin(y*120)*.5+.5)*.3),4);
 // the thin neck
 P.add(new THREE.CylinderGeometry(.03,.036,.06,12),at(0,.97,.01),C.skinDark);
 return P.merge();
}

// the face: sallow and hollow; head centre at .1
const EYE_Y=.11,EYE_X=.025;
function face(x,y,z){
 for(const s of [-1,1]){
  const d=Math.hypot(x-s*EYE_X,(y-EYE_Y)*1.3);
  if(z>.03&&d<.017)return mix(C.shadow,C.skinDark,clamp01((d-.009)*90));// sunken sockets
 }
 let c=mix(C.skinDark,C.skin,clamp01(z*14+.15));
 for(const s of [-1,1]){
  if(Math.hypot(x-s*.036,y-.084)<.013&&z>.04)c=mix(c,C.skinHi,.5);// the cheekbones
  if(Math.hypot(x-s*.032,y-.06)<.017&&z>.03)c=mix(c,C.shadow,.45);// the hollow cheeks
 }
 if(z>.05&&Math.abs(y-.045)<.003&&Math.abs(x)<.017)return C.shadow;// the thin mouth
 return c;
}
function buildHead(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.068,22,16),at(0,.1,0,[0,0,0],[.85,1.08,.95]),face);
 P.add(new THREE.ConeGeometry(.04,.06,14),at(0,.048,.018,[Math.PI+.25,0,0],[1,1,.85]),face);
 // the brow, a long thin nose, and close-set ears
 P.add(new THREE.BoxGeometry(.08,.01,.026),at(0,.132,.05,[.3,0,0]),C.skinDark);
 P.add(new THREE.ConeGeometry(.009,.04,4),at(0,.093,.068,[-.35,0,0]),(x,y,z)=>mix(C.skinDark,C.skinHi,clamp01((z-.06)*60)));
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.014,8,6),at(s*.058,.105,-.004,[0,0,0],[.4,1,.7]),C.skinDark);
 // the waxed moustache, its ends twisted up into points
 for(const s of [-1,1]){
  limb(P,[s*.003,.064,.07],[s*.026,.062,.064],.0055,.004,C.hair,5);
  P.add(new THREE.ConeGeometry(.004,.02,4),at(s*.034,.068,.06,[0,0,-s*1.05]),C.hair);
 }
 // grey hair cropped short at the temples, under the helmet
 P.add(new THREE.SphereGeometry(.07,16,10,0,Math.PI*2,0,Math.PI*.55),at(0,.105,-.006,[-.15,0,0],[.88,1,1]),(x,y,z)=>z>.035?C.skinDark:C.hair);
 // the monocle, a thin gold rim round the right eye, on a cord running back to the ear
 P.add(new THREE.TorusGeometry(.016,.0022,6,18),at(-EYE_X,EYE_Y,.064),tarnish);
 limb(P,[-EYE_X-.016,EYE_Y-.004,.062],[-.06,.07,.01],.0011,.0011,C.cloth,3);
 // the pith helmet: a dome over a wide sloping brim, longer at front and back
 const helm=(x,y,z)=>{
  const seam=Math.abs(Math.sin(Math.atan2(x,z)*3))<.04;
  return mix(seam?C.helmetDark:mix(C.helmetDark,C.helmet,.75),C.dust,hash(Math.floor(x*120)+Math.floor(z*120)*7)*.25);
 };
 P.add(lathe([[0,.25],[.03,.248],[.055,.236],[.071,.212],[.078,.18],[.079,.158]],24),at(0,0,-.004,[0,0,0],[1,1,1.12]),helm);
 P.add(lathe([[.079,.162],[.1,.15],[.124,.132],[.128,.126],[.122,.126],[.076,.15]],28),at(0,0,-.004,[0,0,0],[1,1,1.18]),(x,y,z)=>y<.131?C.helmetDark:helm(x,y,z));
 P.add(new THREE.SphereGeometry(.009,8,6),at(0,.252,-.004,[0,0,0],[1,.5,1]),C.helmetDark);// the vent button
 // the puggaree, a dusty folded band round the crown, its frayed tail hanging down the back
 P.add(new THREE.CylinderGeometry(.08,.081,.022,24,1,true),at(0,.17,-.004,[0,0,0],[1,1,1.12]),(x,y)=>Math.abs(y-.17)<.002?C.khakiDark:mix(C.khaki,C.dust,.4));
 P.add(new THREE.BoxGeometry(.03,.09,.004),at(.02,.11,-.098,[.25,0,.12]),(x,y)=>y<.075&&hash(Math.floor(x*300))>.5?C.khakiDark:mix(C.khaki,C.dust,.35));
 return P.merge();
}
// two pale tomb-gold glints in the sunken sockets
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0065,8,6),at(s*EYE_X,EYE_Y,.06,[0,0,0],[1.3,.8,.6]),[1,1,1]);
 return P.merge();
}

// a jodhpur leg: flared at the thigh, wound in puttees below the knee, ending in a riding boot
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.055,-.02],[.075,-.1],[.072,-.18],[.045,-.26],[.04,-.28]],14),at(0,0,0),(x,y,z)=>drill(x,y,z,-.32));
 // the puttees, a spiral of narrow bands
 P.add(lathe([[.041,-.27],[.044,-.32],[.04,-.4],[.036,-.43]],14),at(0,0,0),(x,y,z)=>{
  const band=Math.sin(y*200+Math.atan2(x,z)*1.0)>0;
  return mix(band?C.khaki:C.khakiDark,C.dust,.3+clamp01((-.36-y)*10)*.3);
 });
 // the riding boot, scuffed, with a low heel
 P.add(lathe([[.038,-.42],[.04,-.45],[.042,-.48]],12),at(0,0,0),C.leather);
 P.add(new THREE.BoxGeometry(.06,.035,.12),at(0,-.482,.025),(x,y,z)=>mix(C.leatherDark,C.leatherHi,clamp01((y+.48)*20)*.5+hash(Math.floor(x*200)+Math.floor(z*200))*.2));
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,-.485,.08,[0,0,0],[1,.6,1]),C.leather);
 return P.merge();
}

// a khaki sleeve, buttoned at the cuff, over a thin sallow hand curled to grip
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.05,14,10),at(0,-.01,0),(x,y,z)=>drill(x,y+.8,z));
 P.add(lathe([[.046,0],[.045,-.14],[.04,-.26],[.042,-.31]],14),at(0,0,0),(x,y,z)=>Math.abs(y+.3)<.012?C.khakiDark:drill(x,y+.8,z));
 P.add(new THREE.SphereGeometry(.006,6,4),at(.03,-.3,.025),C.leatherDark);// the cuff button
 limb(P,[0,-.3,0],[0,-.35,.004],.02,.018,C.skinDark,8);
 P.add(new THREE.SphereGeometry(.025,10,8),at(0,-.375,.008,[0,0,0],[.8,1.2,.7]),C.skin);
 for(let k=0;k<4;k++){
  const x=-.016+k*.011;
  limb(P,[x,-.395,.012],[x,-.4,.044],.0058,.005,C.skin,5);
  limb(P,[x,-.4,.044],[x,-.38,.052],.005,.004,C.skinDark,5);
 }
 limb(P,[.02,-.37,.012],[.028,-.395,.044],.0065,.005,C.skin,5);// the thumb
 return P.merge();
}

// The cane, held upright: black ebony with a tarnished gold ferrule and collar, topped by a jackal's
// head (Anubis) in tarnished gold with tall ears and a long muzzle, looking toward +z.
function buildCane(){
 const P=pieces();
 limb(P,[0,-.44,0],[0,.16,0],.009,.011,(x,y,z)=>mix(C.ebony,C.ebonyHi,(Math.sin(Math.atan2(x,z)*3+y*30)*.5+.5)*.35),8);
 P.add(new THREE.CylinderGeometry(.009,.011,.03,8),at(0,-.45,0),tarnish);// the ferrule
 P.add(new THREE.CylinderGeometry(.015,.012,.025,10),at(0,.17,0),tarnish);// the collar
 // the jackal head: a skull, a long tapering muzzle, tall pointed ears
 P.add(new THREE.SphereGeometry(.019,12,10),at(0,.2,-.004,[0,0,0],[.9,1,1.05]),tarnish);
 P.add(new THREE.ConeGeometry(.012,.045,8),at(0,.196,.03,[Math.PI/2+.12,0,0],[1,1,.85]),tarnish);
 P.add(new THREE.SphereGeometry(.004,6,4),at(0,.191,.052),C.ebony);// the nose
 for(const s of [-1,1]){
  P.add(new THREE.ConeGeometry(.007,.036,4),at(s*.009,.228,-.006,[-.12,0,-s*.12],[1,1,.45]),tarnish);
  P.add(new THREE.SphereGeometry(.0028,6,4),at(s*.008,.207,.012),C.ebony);// the black eyes
 }
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[.06,0,-.04]));
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(),cane:buildCane(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.12,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#fff2c8',emissive:'#d8a838',emissiveIntensity:1.6,roughness:.3,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createCarnarvon(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.1);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.02);body.add(head);
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.065,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.17,SHOULDER_Y,0);arm.rotation.z=s*.07;body.add(arm);mesh(arm,S.arm,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.385,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.cane,'cane',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'lord carnarvon',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
