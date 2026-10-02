import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The mugger (UnNetHack's town and black-market thug, the one that snatches your things) shares the
// humans' letter, so it used to be the plain `@` humanoid. It now looms as a heavy-shouldered brute,
// hunched forward with its head low. Its face is hidden under a burlap sack pulled over the head,
// gathered and knotted on top into a ragged tuft and tied tight at the throat with cord. The sack has
// two torn eyeholes, a dull red glint in each, and a crude stitched slit for a mouth; a seam of big
// cross stitches runs down its middle. A long, filthy greatcoat, black and patched, hangs to the shins
// with its hem in tatters, its collar turned up; a rope belt holds an empty swag sack on the left hip
// and a coil of garrotte wire on the right. Thick sleeves end in scarred, bare fists: the left wears a
// spiked brass knuckle-duster, the right swings a leather cosh, its lead-weighted head studded with
// nails and hung from a wrist loop. Heavy trousers, and boots strapped with buckles.
// Each moving part (body, head, each leg and arm, the cosh) is one merged, vertex-coloured mesh on one
// shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the cosh arm), weaponSocket, head, eyes, body.

const C={
 skin:rgb('#8a6a58'),skinDark:rgb('#4a3428'),scar:rgb('#b07a6a'),
 burlap:rgb('#7a6444'),burlapHi:rgb('#9a8058'),burlapDark:rgb('#3a2c1c'),hole:rgb('#040302'),
 stitch:rgb('#1a120a'),cord:rgb('#5a4a30'),
 coat:rgb('#1e1c20'),coatHi:rgb('#3a363a'),coatDark:rgb('#0a090b'),patch:rgb('#2e2a22'),patchHi:rgb('#4a4232'),
 rope:rgb('#6a5a3a'),ropeDark:rgb('#3a3020'),
 sack:rgb('#5a4a34'),sackDark:rgb('#2a2016'),
 trouser:rgb('#26241e'),trouserHi:rgb('#3e3a30'),
 leather:rgb('#3a2618'),leatherHi:rgb('#5e4028'),leatherDark:rgb('#140c06'),
 brass:rgb('#8a6a2a'),brassHi:rgb('#d8b060'),iron:rgb('#3a3c40'),ironHi:rgb('#8a8e94'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// cut a lathe shell's hem into ragged points
function rag(geo,below,seed,deep=.08){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y>below)continue;
  const seg=Math.round((Math.atan2(p.getX(i),p.getZ(i))+Math.PI)/(Math.PI*2)*32);
  p.setY(i,y+(seg%2?deep*(.6+hash(seg+seed)*.8):hash(seg+seed+5)*deep*.3));
 }
 geo.computeVertexNormals();
 return geo;
}
// the filthy greatcoat: worn folds, two sewn-on patches
const coat=(x,y,z)=>{
 const a=Math.atan2(x,z),fold=Math.sin(a*8+y*4)*.5+.5;
 if(Math.hypot(x+.1,y-.62)<.055&&z>0)return Math.abs(Math.hypot(x+.1,y-.62)-.05)<.006?C.stitch:C.patch;
 if(Math.hypot(x-.15,y-.32)<.06&&z<0)return mix(C.patch,C.patchHi,fold*.6);
 return mix(C.coatDark,mix(C.coat,C.coatHi,fold*.45),.4+fold*.6);
};
// coarse sacking, woven
const burlap=(x,y,z)=>{
 const weave=(Math.sin(x*420)*Math.sin(y*420)+Math.sin(z*420)*.5)*.5+.5;
 return mix(C.burlapDark,mix(C.burlap,C.burlapHi,weave*.6),.55+clamp01(z*8)*.45);
};

export const HIP_Y=.47,SHOULDER_Y=.84,NECK_Y=.95;

function buildBody(){
 const P=pieces();
 // the barrel chest under the coat, so the open hem never shows daylight
 P.add(new THREE.CylinderGeometry(.17,.15,.42,20),at(0,.66,0,[0,0,0],[1.1,1,.8]),C.coatDark);
 // the long greatcoat, broad at the shoulders and hanging to the shins, its hem torn
 P.add(rag(lathe([[.21,.15],[.215,.3],[.2,.45],[.19,.55],[.2,.68],[.23,.79],[.25,.86],[.2,.92],[.1,.96]],36),.2,4),at(0,0,0,[0,0,0],[1.12,1,.8]),coat);
 // the turned-up collar
 P.add(new THREE.CylinderGeometry(.11,.13,.09,24,1,true),at(0,.97,-.005,[-.12,0,0],[1.05,1,.9]),(x,y,z)=>mix(C.coatDark,C.coatHi,clamp01((y-.93)*12)*.6));
 // big iron buttons down the front
 for(let k=0;k<4;k++)P.add(new THREE.CylinderGeometry(.011,.011,.008,8),at(.025,.82-k*.1,.17-(k===0?.01:0),[Math.PI/2,0,0]),C.iron);
 // the rope belt, knotted at the front
 P.add(new THREE.TorusGeometry(.2,.013,5,36),at(0,.5,0,[Math.PI/2,0,0],[1.1,.8,1.2]),(x,y,z)=>Math.sin(Math.atan2(x,z)*40)>0?C.rope:C.ropeDark);
 P.add(new THREE.SphereGeometry(.022,8,6),at(-.04,.5,.165),C.rope);
 limb(P,[-.04,.49,.168],[-.05,.38,.175],.007,.006,C.rope,5);
 limb(P,[-.035,.49,.168],[-.02,.4,.172],.007,.006,C.rope,5);
 // an empty swag sack tucked under the belt at the left hip
 P.add(new THREE.SphereGeometry(.07,12,10),at(-.21,.36,.04,[0,0,.2],[.7,1.25,.5]),(x,y,z)=>mix(C.sackDark,C.sack,clamp01((y-.27)*6)));
 P.add(new THREE.ConeGeometry(.03,.06,8),at(-.205,.47,.045,[0,0,.1]),C.sackDark);
 // a coil of garrotte wire with wooden toggles on the right hip
 P.add(new THREE.TorusGeometry(.035,.0035,4,18),at(.215,.42,.06,[0,Math.PI/2-.3,0]),C.ironHi);
 P.add(new THREE.TorusGeometry(.03,.0035,4,18),at(.218,.425,.06,[0,Math.PI/2-.3,.2]),C.iron);
 for(const s of [-1,1])P.add(new THREE.CylinderGeometry(.006,.006,.04,6),at(.225,.42+s*.04,.075,[0,0,Math.PI/2]),C.leatherHi);
 // the thick neck, sunk between the shoulders
 P.add(new THREE.CylinderGeometry(.05,.065,.08,12),at(0,.95,.02),C.skinDark);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the sack pulled over the head; head centre at .1
 P.add(new THREE.SphereGeometry(.085,24,18),at(0,.1,0,[0,0,0],[.95,1.05,1]),(x,y,z)=>{
  if(z>.03){
   // two torn eyeholes, ragged at the rims
   for(const s of [-1,1]){
    const d=Math.hypot(x-s*.03,(y-.105)*1.3),a=Math.atan2(y-.105,x-s*.03);
    if(d<.017+Math.sin(a*5+s)*.004)return C.hole;
    if(d<.022)return C.burlapDark;
   }
   // the crude stitched slit of a mouth
   if(Math.abs(y-.06-x*x*4)<.004&&Math.abs(x)<.035)return C.hole;
   if(Math.abs(x)<.035&&Math.abs(y-.06)<.013&&Math.abs(Math.sin(x*260))<.25)return C.stitch;
  }
  // a seam of cross stitches down the middle, over the crown and the face
  if(Math.abs(x)<.008&&(z<.03||y>.13)){
   const t=Math.sin((y+z)*220);
   if(Math.abs(Math.abs(x)-Math.abs(t)*.007)<.0025)return C.stitch;
  }
  return burlap(x,y,z);
 });
 // the sack's neck, tied tight at the throat with cord, its hem flaring below
 P.add(rag(lathe([[.065,-.02],[.06,.0],[.055,.025]],24),-.005,2,.02),at(0,0,0),burlap);
 P.add(new THREE.TorusGeometry(.057,.006,5,24),at(0,.02,0,[Math.PI/2,0,0]),C.cord);
 limb(P,[.02,.02,.055],[.03,-.05,.07],.004,.003,C.cord,4);
 limb(P,[.025,.02,.054],[.045,-.04,.06],.004,.003,C.cord,4);
 // the top gathered and knotted into a ragged tuft
 P.add(new THREE.ConeGeometry(.045,.07,12),at(0,.205,-.01,[-.2,0,0]),burlap);
 P.add(new THREE.TorusGeometry(.016,.006,5,12),at(0,.215,-.012,[Math.PI/2-.2,0,0]),C.cord);
 for(let k=0;k<6;k++){
  const a=k/6*Math.PI*2+hash(k)*.5;
  P.add(new THREE.ConeGeometry(.012,.05+hash(k+3)*.03,4),at(Math.sin(a)*.012,.25,-.02+Math.cos(a)*.012,[Math.cos(a)*.6-.2,0,-Math.sin(a)*.6]),burlap);
 }
 return P.merge();
}
// the eyes: a dull red glint in each hole
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0085,8,6),at(s*.03,.105,.078,[0,0,0],[1.1,.75,.6]),[1,1,1]);
 return P.merge();
}

// heavy trousers and boots strapped with buckles
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.07,0],[.068,-.12],[.055,-.24]],14),at(0,0,0),(x,y,z)=>mix(C.trouser,C.trouserHi,clamp01(z*12+.4)*.6));
 P.add(new THREE.CylinderGeometry(.055,.05,.12,14),at(0,-.3,0),(x,y,z)=>mix(C.trouser,C.trouserHi,clamp01(z*12+.4)*.5));
 P.add(new THREE.CylinderGeometry(.054,.058,.11,14),at(0,-.39,0),(x,y,z)=>mix(C.leatherDark,C.leather,clamp01(z*14+.4)));
 for(const y of [-.36,-.41]){
  P.add(new THREE.TorusGeometry(.057,.006,4,18),at(0,y,0,[Math.PI/2,0,0]),C.leatherDark);
  P.add(new THREE.BoxGeometry(.018,.016,.006),at(.03,y,.05,[0,.55,0]),C.iron);
 }
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.44,.035,[0,0,0],[.85,.5,1.6]),C.leather);
 P.add(new THREE.BoxGeometry(.085,.014,.17),at(0,-.463,.03),C.leatherDark);
 return P.merge();
}

// a thick coat sleeve and a scarred bare fist; the left fist wears a spiked brass knuckle-duster
function buildArm(duster){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.072,14,10),at(0,0,0),coat);
 P.add(rag(lathe([[.064,0],[.062,-.12],[.056,-.22],[.064,-.26]],16),-.24,duster?13:17,.025),at(0,0,0),coat);
 P.add(new THREE.CylinderGeometry(.04,.036,.05,12),at(0,-.27,0),C.skinDark);
 // the fist, knuckles forward, a white scar across the back
 P.add(new THREE.BoxGeometry(.06,.06,.055,1,1,1),at(0,-.32,.008),(x,y,z)=>Math.abs(y+.31-x*.5)<.005&&z<0?C.scar:mix(C.skinDark,C.skin,clamp01((z+.02)*14)));
 for(let k=0;k<4;k++)P.add(new THREE.CapsuleGeometry(.009,.026,3,6),at(-.02+k*.0135,-.34,.035,[0,0,Math.PI/2]),(x,y,z)=>mix(C.skinDark,C.skin,clamp01((z-.03)*60)));
 limb(P,[.03,-.305,.015],[.03,-.33,.04],.011,.009,C.skin,6);// the thumb
 if(duster){
  P.add(new THREE.BoxGeometry(.066,.016,.012),at(0,-.335,.05),C.brass);
  for(let k=0;k<4;k++)P.add(new THREE.ConeGeometry(.0065,.028,5),at(-.02+k*.0135,-.335,.068,[Math.PI/2,0,0]),(x,y,z)=>mix(C.brass,C.brassHi,clamp01((z-.058)*60)));
 }
 return P.merge();
}

// the cosh: a leather-bound grip with a wrist loop, swelling to a lead-weighted head studded with
// nails. Built along +y from the grip.
function buildCosh(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.014,.016,.16,8),at(0,0,0),(x,y,z)=>Math.sin(y*220)>.4?C.leatherDark:C.leather);
 P.add(new THREE.TorusGeometry(.03,.004,4,12),at(0,-.1,0,[0,0,.3],[1,1.4,1]),C.leatherDark);// the wrist loop
 P.add(lathe([[.0,.08],[.018,.09],[.022,.2],[.036,.32],[.04,.37],[.03,.41],[.0,.43]],12),at(0,0,0),(x,y,z)=>mix(C.leatherDark,C.leatherHi,clamp01((y-.2)*5)*.7));
 for(let k=0;k<10;k++){
  const a=k*2.4,y=.3+(k%3)*.035;
  P.add(new THREE.ConeGeometry(.006,.024,4),at(Math.sin(a)*.038,y,Math.cos(a)*.038,[Math.cos(a)*Math.PI/2,0,-Math.sin(a)*Math.PI/2]),(px,py,pz)=>mix(C.iron,C.ironHi,.5));
 }
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[-.35,0,0]));// held up, leant back over the shoulder
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),armL:buildArm(true),armR:buildArm(false),cosh:buildCosh(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.1,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#ffb0a0',emissive:'#c01810',emissiveIntensity:1.5,roughness:.2,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createMugger(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.08);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.045);head.rotation.x=.12;body.add(head);// head low, glaring
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.085,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.27,SHOULDER_Y,0);arm.rotation.z=s*.1;body.add(arm);mesh(arm,s<0?S.armL:S.armR,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.33,.02);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.cosh,'cosh',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'mugger',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
