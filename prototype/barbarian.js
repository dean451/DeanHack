import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The barbarian (the player-monster role) used to be the generic '@' humanoid: a tinted box with a
// ball for a head. They now stand as a raider out of the cold: a blackened iron cap with a nasal
// guard and two horns that sweep out and hook forward, bone at the root and charred at the tips.
// Under it, a scowling, weathered face with a band of ash war paint across the eyes, a long dark
// mane down the back and a beard twisted into two iron-ringed braids. A shaggy wolf-pelt mantle
// with a torn hem covers the shoulders, pinned at the chest with the wolf's own skull. Beneath is
// a rusting ring-mail hauberk with a ragged hem, a broad belt with a spiked iron boss, a hide flap,
// a string of fangs and a small skull hanging at the left hip. The arms are bare and scarred, with
// spiked iron bracers, and the legs go into fur-wrapped, cross-strapped boots. The right fist holds
// a long-hafted great axe tilted forward: one broad crescent blade, its edge notched and stained,
// a hooked spike behind it and another on top.
// Each moving part (body, head, each leg and arm) and the axe is one merged, vertex-coloured mesh
// with one shared material: 7 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the right, axe arm), weaponSocket (the axe), head, body. The pivots
// match rogue.js, archeologist.js and monk.js (shoulders ±.215 at .82, hand .37 down the arm, legs
// ±.08 at .47, head at .955).

const FUR=rgb('#5a4a3a'),FUR_DARK=rgb('#241c16'),FUR_TIP=rgb('#8e8070');
const MAIL=rgb('#5e6066'),MAIL_DARK=rgb('#26282c'),RUST=rgb('#6a3e22');
const IRON=rgb('#3a3a3e'),IRON_HI=rgb('#6e7078'),IRON_DARK=rgb('#1a1a1c');
const LEATHER=rgb('#3e2a1c'),LEATHER_HI=rgb('#5e4230'),HIDE=rgb('#6a5238');
const SKIN=rgb('#9a7058'),SKIN_DARK=rgb('#6a4634'),SCAR=rgb('#c49a84'),ASH=rgb('#16161a');
const HAIR=rgb('#1e1612'),HAIR_HI=rgb('#3a2a20'),BONE=rgb('#d2c6a8'),BONE_DARK=rgb('#7a6e58');
const GLINT=rgb('#e0d8b0'),PUPIL=rgb('#1a1008'),BLOOD=rgb('#3e0c0a');
const STEEL=rgb('#7e828a'),STEEL_HI=rgb('#c4c8d0'),STEEL_DARK=rgb('#3e4248'),WOOD=rgb('#3a2616');

const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const ring=(r,tube,radial=6,tubular=36)=>new THREE.TorusGeometry(r,tube,radial,tubular).rotateX(Math.PI/2);
const hash=(a,b=0)=>{const h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
// a sawtooth tear along the lowest row of a lathe: each vertex at or below `hem` drops by up to
// `depth`, in `teeth` uneven points around the circle
function tear(geo,hem,depth,teeth,seed=0){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  if(p.getY(i)>hem+1e-4)continue;
  const a=Math.atan2(p.getX(i),p.getZ(i))*teeth/Math.PI+seed;
  const f=a-Math.floor(a),h=hash(Math.floor(a),seed);
  p.setY(i,p.getY(i)-depth*(.45+.55*h)*(1-Math.abs(f-.5)*2));
 }
 geo.computeVertexNormals();
 return geo;
}
// a notched bottom edge on a flat piece: alternate vertices of its lowest row drop by `depth`
function notch(geo,hem,depth){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++)if(p.getY(i)<=hem+1e-4&&i%2===0)p.setY(i,p.getY(i)-depth);
 geo.computeVertexNormals();
 return geo;
}
// shaggy fur: dark in the roots, pale at streaked tips
const fur=(lo,hi)=>(x,y,z)=>{
 const streak=Math.sin(Math.atan2(x,z)*37+y*50)*.5+.5;
 return mix(ramp(FUR_DARK,FUR,lo,hi)(y),FUR_TIP,streak*streak*.55);
};
// a horn: a tube along a curve, tapering to a point, bone at the root and charred at the tip
function horn(points,radius){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const tubular=14,radial=8,geo=new THREE.TubeGeometry(curve,tubular,radius,radial,false);
 const p=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){
  const t=Math.floor(i/(radial+1))/tubular;
  curve.getPointAt(t,c);v.fromBufferAttribute(p,i).sub(c).multiplyScalar(1-t*.92).add(c);
  p.setXYZ(i,v.x,v.y,v.z);
 }
 geo.computeVertexNormals();
 return {geo,curve};
}
// a small skull: cranium, cheekbones, black sockets and a row of teeth
function skull(P,x,y,z,s,ry=0){
 const m=(dx,dy,dz,r=[0,0,0],k=[1,1,1])=>new THREE.Matrix4().multiplyMatrices(at(x,y,z,[0,ry,0],[s,s,s]),at(dx,dy,dz,r,k));
 P.add(new THREE.SphereGeometry(1,10,8),m(0,.2,-.1,[0,0,0],[.9,.85,1]),(px,py)=>mix(BONE_DARK,BONE,.5+(py-y)/s));
 P.add(new THREE.BoxGeometry(1.1,.6,.9),m(0,-.35,.25),BONE_DARK);
 for(const k of [-1,1])P.add(new THREE.SphereGeometry(.26,6,5),m(k*.34,.05,.72),ASH);
 P.add(new THREE.ConeGeometry(.14,.3,3),m(0,-.22,.82,[Math.PI,0,0]),ASH);
 P.add(new THREE.BoxGeometry(.8,.18,.1),m(0,-.52,.7),BONE);
}

function buildBody(){
 const P=pieces();
 // the hauberk: rusting ring mail, broad in the chest, its hem ragged at mid-thigh
 const mail=tear(lathe([[.2,.36],[.192,.44],[.182,.56],[.192,.68],[.206,.78],[.19,.86],[.13,.91],[.06,.925]],44),.361,.04,15,.8);
 P.add(mail,at(0,0,0,[0,0,0],[1,1,.82]),(x,y,z)=>{
  // rows of rings, and the gaps between them
  const gap=Math.sin(Math.atan2(x,z)*56+(Math.floor(y*95)%2)*Math.PI)*Math.sin(y*300);
  const base=mix(MAIL,RUST,Math.max(0,.62-y)*2.4+hash(Math.floor(x*40),Math.floor(y*40))*.25);
  return gap>.35?MAIL_DARK:base;
 });
 P.add(new THREE.CircleGeometry(.2,28),at(0,.34,0,[Math.PI/2,0,0],[1,.82,1]),MAIL_DARK);
 // the wolf-pelt mantle over the shoulders, its hem torn into shaggy points
 const mantle=tear(lathe([[.07,.955],[.15,.925],[.235,.86],[.27,.79],[.278,.72]],48),.721,.1,13,2.3);
 P.add(mantle,at(0,0,0,[0,0,0],[1,1,.86]),fur(.64,.95));
 // loose tufts sticking out of the pelt around the shoulders
 for(let i=0;i<14;i++){
  const a=i/14*Math.PI*2+hash(i,3)*.3,r=.25,x=Math.sin(a)*r,z=Math.cos(a)*r*.86;
  P.add(new THREE.ConeGeometry(.02,.07,4),at(x,.73+hash(i,5)*.06,z,[Math.cos(a)*-.5,0,Math.sin(a)*.5-Math.PI]),(px,py)=>mix(FUR_DARK,FUR_TIP,(.78-py)*10));
 }
 // the wolf's skull pinning the pelt at the chest
 skull(P,0,.855,.2,.034);
 // the belt: broad leather, with a spiked iron boss
 P.add(new THREE.CylinderGeometry(.19,.19,.07,36,1,true),at(0,.5,0,[0,0,0],[1,1,.82]),(x,y)=>Math.abs(y-.5)>.028?LEATHER_HI:LEATHER);
 P.add(new THREE.CylinderGeometry(.05,.05,.014,10),at(0,.5,.158,[Math.PI/2,0,0]),IRON);
 P.add(new THREE.ConeGeometry(.018,.05,5),at(0,.5,.19,[Math.PI/2,0,0]),IRON_HI);
 // a hide flap hanging from the belt in front, notched at the bottom
 P.add(notch(new THREE.PlaneGeometry(.12,.18,6,1).translate(0,.39,0),.301,.035),at(0,0,.17,[.08,0,0]),(x,y)=>mix(LEATHER,HIDE,(y-.3)*5));
 // a string of fangs on a cord around the right hip
 for(let i=0;i<5;i++){
  const a=.45+i*.16,x=Math.sin(a)*.195,z=Math.cos(a)*.16;
  P.add(new THREE.ConeGeometry(.008,.04,4),at(x,.445,z,[Math.PI,0,0]),BONE);
 }
 // and a small skull hanging by a cord at the left hip
 P.add(new THREE.CylinderGeometry(.003,.003,.07,4),at(-.18,.435,.06),LEATHER);
 skull(P,-.182,.375,.075,.028,-.3);
 // the thick neck
 P.add(new THREE.CylinderGeometry(.056,.064,.07,12),at(0,.93,0),SKIN_DARK);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the face: broad and weathered; head centre at y .1
 P.add(new THREE.SphereGeometry(.09,18,14),at(0,.1,-.004,[0,0,0],[.94,1,.95]),(x,y,z)=>{
  // the ash band across the eyes
  if(z>.02&&y>.1&&y<.14)return ASH;
  return mix(SKIN_DARK,SKIN,(y-.02)*8);
 });
 P.add(new THREE.BoxGeometry(.022,.04,.03),at(0,.1,.086,[-.25,0,0]),SKIN);
 // narrowed eyes glinting out of the paint, under a brow drawn down into a scowl
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.011,8,6),at(s*.032,.12,.076,[0,0,s*-.2],[1.5,.5,.5]),GLINT);
  P.add(new THREE.SphereGeometry(.005,6,4),at(s*.03,.12,.081),PUPIL);
  P.add(new THREE.BoxGeometry(.046,.014,.02),at(s*.032,.138,.078,[0,0,s*.38]),SKIN_DARK);
 }
 // the beard, falling from the jaw into two braids bound with iron rings
 P.add(new THREE.SphereGeometry(.08,16,10,0,Math.PI*2,Math.PI*.5,Math.PI*.5),at(0,.078,.012,[0,0,0],[1,.9,1]),(x,y,z)=>Math.sin(x*180)>.4?HAIR_HI:HAIR);
 for(const s of [-1,1]){
  P.add(new THREE.ConeGeometry(.022,.13,6),at(s*.026,-.03,.06,[Math.PI+.1,0,s*.12]),(x,y)=>Math.sin(y*160)>.3?HAIR_HI:HAIR);
  P.add(ring(.019,.005,4,12),at(s*.029,-.02,.063,[.1,0,s*.12]),IRON_HI);
 }
 // the mane: long and dark down the back of the neck
 P.add(new THREE.SphereGeometry(.1,18,12,Math.PI*.6,Math.PI*.8,Math.PI*.25,Math.PI*.6),at(0,.1,-.014,[0,0,0],[1,1,1]),(x,y,z)=>Math.sin(x*140)>.3?HAIR_HI:HAIR);
 P.add(tear(lathe([[.08,.06],[.088,0],[.085,-.08]],18,Math.PI*.62,Math.PI*.76),-.079,.04,5,1.1),at(0,0,-.012),(x,y,z)=>Math.sin(x*140)>.3?HAIR_HI:HAIR);
 // the iron cap, riveted around its rim, with a nasal guard
 P.add(new THREE.SphereGeometry(.098,24,10,0,Math.PI*2,0,Math.PI*.46),at(0,.112,-.006,[0,0,0],[1,1.02,1]),(x,y,z)=>mix(IRON_DARK,IRON,Math.max(0,x+z)*3+.3));
 P.add(ring(.096,.009,4,32),at(0,.124,-.006),IRON);
 for(let i=0;i<10;i++){
  const a=i/10*Math.PI*2;
  P.add(new THREE.SphereGeometry(.006,5,4),at(Math.sin(a)*.104,.124,Math.cos(a)*.104-.006),IRON_HI);
 }
 P.add(new THREE.BoxGeometry(.016,.06,.012),at(0,.105,.094,[-.12,0,0]),IRON);
 // the horns: out from the cap's sides, up, and hooking forward
 for(const s of [-1,1]){
  const {geo}=horn([[s*.075,.16,0],[s*.15,.19,-.01],[s*.2,.26,.02],[s*.19,.33,.09]],.024);
  P.add(geo,null,(x,y)=>mix(BONE,IRON_DARK,Math.pow(THREE.MathUtils.clamp((y-.18)/.15,0,1),1.4)));
  P.add(ring(.025,.007,4,14),at(s*.085,.163,0,[0,0,Math.PI/2-s*.3]),IRON);
 }
 return P.merge();
}

// leather trousers into boots wrapped in fur and bound with crossed straps
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.068,0],[.07,-.12],[.06,-.22],[.054,-.27]],14),at(0,0,0),(x,y)=>ramp(LEATHER,LEATHER_HI,-.27,-.02)(y));
 P.add(tear(new THREE.CylinderGeometry(.064,.056,.2,14,6,true),-.0999,.03,7,.9),at(0,-.36,0),(x,y,z)=>{
  if(Math.abs(Math.sin(y*70+Math.atan2(x,z)))<.14||Math.abs(Math.sin(y*70-Math.atan2(x,z)))<.14)return LEATHER;
  return fur(-.46,-.26)(x,y,z);
 });
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.44,.05,[0,0,0],[1,.52,1.6]),LEATHER);
 P.add(new THREE.BoxGeometry(.094,.02,.17),at(0,-.463,.04),IRON_DARK);
 return P.merge();
}

// a bare, scarred arm with a tuft of pelt at the shoulder, a spiked iron bracer and a big fist
function buildArm(){
 const P=pieces();
 P.add(tear(new THREE.SphereGeometry(.07,14,8,0,Math.PI*2,0,Math.PI*.6),.0,.03,6,.2),at(0,0,0,[0,0,0],[1.05,.9,1]),fur(-.04,.06));
 P.add(lathe([[.064,0],[.066,-.08],[.057,-.17],[.05,-.24],[.046,-.3]],16),at(0,0,0),(x,y,z)=>{
  // a pale scar slashed across the upper arm
  if(x>0&&Math.abs(y+.12+z*.8)<.006)return SCAR;
  return mix(SKIN_DARK,SKIN,Math.max(0,x+z)*6+.3);
 });
 // the bracer, ringed with short spikes
 P.add(new THREE.CylinderGeometry(.056,.05,.1,12),at(0,-.26,0),(x,y)=>Math.abs(y+.26)>.042?IRON_HI:IRON);
 for(let i=0;i<5;i++){
  const a=i/5*Math.PI*2+.3;
  P.add(new THREE.ConeGeometry(.01,.03,4),at(Math.sin(a)*.058,-.26,Math.cos(a)*.058,[Math.cos(a)*Math.PI/2,0,-Math.sin(a)*Math.PI/2]),IRON_HI);
 }
 P.add(new THREE.SphereGeometry(.038,12,8),at(0,-.36,.006,[0,0,0],[.95,1.05,1]),SKIN);
 for(let k=0;k<4;k++)P.add(new THREE.SphereGeometry(.012,6,4),at(-.02+k*.013,-.37,.036),SKIN_DARK);
 return P.merge();
}

// the great axe: a long haft, one crescent blade with a notched, stained edge facing forward, a
// hooked spike behind and a spike on top; built upright, then tilted forward in the fist
function buildAxe(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.014,.016,.84,8),at(0,.21,0),(x,y)=>y<.09&&y>-.1?(Math.sin(y*200)>0?LEATHER:LEATHER_HI):WOOD);
 P.add(new THREE.ConeGeometry(.018,.05,5),at(0,-.23,0,[Math.PI,0,0]),IRON);
 P.add(new THREE.CylinderGeometry(.02,.02,.03,8),at(0,.53,0),IRON);
 P.add(new THREE.ConeGeometry(.013,.09,4),at(0,.675,0),IRON_HI);
 // the blade: a crescent drawn in x (toward the edge) and y, its edge sampled with notches
 const shape=new THREE.Shape();
 shape.moveTo(.012,.6);shape.lineTo(.07,.625);shape.lineTo(.135,.69);
 for(let k=1;k<=14;k++){
  const t=k/14,a=Math.PI*.42-t*Math.PI*.9,notch=hash(k,9)>.7?.018:0;
  shape.lineTo(.03+(.125-notch)*Math.cos(a),.555+.13*Math.sin(a));
 }
 shape.lineTo(.09,.47);shape.lineTo(.05,.505);shape.lineTo(.012,.51);shape.lineTo(.012,.6);
 const blade=new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false}).translate(0,0,-.006);
 P.add(blade,at(0,0,0,[0,-Math.PI/2,0]),(x,y,z)=>{
  // x has become z: the edge is forward
  if(z>.125)return hash(Math.floor(y*60),2)>.55?BLOOD:STEEL_HI;
  return mix(STEEL_DARK,STEEL,z*8);
 });
 // the hooked spike behind the blade
 P.add(new THREE.ConeGeometry(.013,.09,4),at(0,.57,-.055,[-Math.PI/2-.35,0,0]),IRON_HI);
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[.35,0,0]));
 return geo;
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:.1,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(),axe:buildAxe()};
 return S;
}
function mesh(parent,geo,name){const o=new THREE.Mesh(geo,material);o.castShadow=o.receiveShadow=true;o.userData.part=name;parent.add(o);return o;}

export function createBarbarian(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);arm.rotation.z=s*.08;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.axe,'axe');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'barbarian',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
