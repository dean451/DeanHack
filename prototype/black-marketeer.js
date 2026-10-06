import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The black marketeer (One-eyed Sam's hired hands in UnNetHack's black market) shares the humans'
// letter, so it used to be the plain `@` humanoid. It now stands as a stooped, hooded fence. A deep,
// peaked cowl throws the face into shadow; a grimy scarf is wound over the nose and mouth, so all
// that shows is a pair of sickly yellow-green eyes under a heavy brow. A ragged shoulder mantle
// and a long cloak, its hem torn into points, hang open at the front over a studded leather jerkin.
// Its open front edges, lined blood-dark, are hung with stolen wares: a dagger and a ring of keys on one side,
// rings and a little vial on cords on the other. A bandolier of coloured vials crosses the chest; a
// belt carries a fat coin purse spilling gold and a hooked knife in its sheath. Wide sleeves fall
// back from leather bracers and pale, long-nailed hands in fingerless gloves, rings on the fingers.
// Dark wrapped trousers and soft pointed boots. In the right hand, the long sword the game gives
// them: blackened steel with notched, bright edges, a fuller, downswept brass quillons and a
// wire-wrapped grip.
// Each moving part (body, head, each leg and arm, the sword) is one merged, vertex-coloured mesh on
// one shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the sword arm), weaponSocket, head, eyes, body.

const C={
 skin:rgb('#8a8070'),skinDark:rgb('#3a3028'),shadow:rgb('#050404'),nail:rgb('#b0a070'),
 cloak:rgb('#2a2622'),cloakHi:rgb('#4a443a'),cloakDark:rgb('#0e0c0a'),
 lining:rgb('#4a0e12'),liningDark:rgb('#1e0406'),
 scarf:rgb('#3a3a2a'),scarfDark:rgb('#1a1a12'),
 leather:rgb('#3a2618'),leatherHi:rgb('#6a4a30'),leatherDark:rgb('#160e08'),
 trouser:rgb('#1e1c1a'),trouserHi:rgb('#3a3632'),
 steel:rgb('#5a6068'),steelHi:rgb('#d8dee6'),steelDark:rgb('#1c1e22'),
 brass:rgb('#8a6a2a'),brassHi:rgb('#d8b060'),gold:rgb('#b8892a'),goldHi:rgb('#f0cc6a'),
 cork:rgb('#7a5a38'),
 vials:[rgb('#2a8a3a'),rgb('#6a2a9a'),rgb('#a01a1a'),rgb('#2a6aa0')],
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// worn cloak cloth, catching a little light along its long folds
const cloth=(x,y,z)=>{
 const fold=Math.sin(Math.atan2(x,z)*9+y*3)*.5+.5;
 return mix(C.cloakDark,mix(C.cloak,C.cloakHi,fold*.5),.45+fold*.55);
};
const lining=(x,y,z)=>mix(C.liningDark,C.lining,clamp01(Math.sin(Math.atan2(x,z)*9)*.5+.5));
// cut a lathe shell's hem into ragged points
function rag(geo,below,seed,deep=.09){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y>below)continue;
  const seg=Math.round((Math.atan2(p.getX(i),p.getZ(i))+Math.PI)/(Math.PI*2)*36);
  p.setY(i,y+(seg%2?deep*(.7+hash(seg+seed)*.6):hash(seg+seed+9)*deep*.3));
 }
 geo.computeVertexNormals();
 return geo;
}

export const HIP_Y=.47,SHOULDER_Y=.83,NECK_Y=.93;

function buildBody(){
 const P=pieces();
 // the studded leather jerkin on a lean body, stitched in panels
 P.add(lathe([[.15,.44],[.145,.52],[.13,.6],[.145,.7],[.165,.78],[.165,.83],[.13,.88],[.09,.91],[.05,.93]],36),at(0,0,0,[0,0,0],[1,1,.76]),(x,y,z)=>{
  const a=Math.atan2(x,z);
  if(Math.abs(Math.sin(a*4))<.06)return C.leatherDark;// panel seams
  return mix(C.leatherDark,mix(C.leather,C.leatherHi,clamp01(z*6)),.6+clamp01(y-.5));
 });
 for(let row=0;row<4;row++)for(const s of [-1,1])P.add(new THREE.SphereGeometry(.007,5,4),at(s*(.05+row%2*.02),.6+row*.06,[.1,.107,.115,.125][row]),C.brassHi);
 // the leather skirt over the hips
 P.add(new THREE.CylinderGeometry(.15,.17,.12,30,1,true),at(0,.43,0,[0,0,0],[1,1,.8]),(x,y,z)=>Math.abs(Math.sin(Math.atan2(x,z)*6))<.08?C.leatherDark:C.leather);
 P.add(new THREE.CircleGeometry(.17,20),at(0,.372,0,[Math.PI/2,0,0],[1,.8,1]),C.leatherDark);
 // the belt and its buckle
 P.add(new THREE.TorusGeometry(.143,.014,5,36),at(0,.53,0,[Math.PI/2,0,0],[1,.77,1.2]),C.leatherDark);
 P.add(new THREE.BoxGeometry(.034,.03,.008),at(0,.53,.113),C.brass);
 // the fat coin purse at the left hip, gold spilling from its neck
 P.add(new THREE.SphereGeometry(.04,12,10),at(-.15,.46,.05,[0,0,.15],[1,1.15,.85]),(x,y,z)=>mix(C.leatherDark,C.leatherHi,clamp01((y-.42)*9)));
 P.add(new THREE.TorusGeometry(.016,.004,4,10),at(-.152,.505,.05,[Math.PI/2,0,0]),C.leatherDark);
 for(let k=0;k<4;k++)P.add(new THREE.CylinderGeometry(.009,.009,.003,10),at(-.14+k*.012,.515+hash(k)*.012,.068+hash(k+4)*.01,[.5+hash(k+8),0,hash(k+2)-.5]),k%2?C.goldHi:C.gold);
 // a hooked knife sheathed at the right hip
 P.add(new THREE.BoxGeometry(.03,.15,.016),at(.16,.44,.03,[0,0,-.25]),(x,y,z)=>mix(C.leatherDark,C.leather,clamp01((y-.37)*6)));
 P.add(new THREE.CylinderGeometry(.008,.01,.06,6),at(.142,.545,.03,[0,0,-.25]),C.leatherDark);
 P.add(new THREE.SphereGeometry(.011,6,5),at(.134,.578,.03),C.brass);
 // the bandolier from the left shoulder to the right hip, strung with corked vials
 const strap=new THREE.Matrix4().compose(new THREE.Vector3(.005,.67,.118),new THREE.Quaternion().setFromEuler(new THREE.Euler(-.08,0,-.72)),new THREE.Vector3(1,1,1));
 P.add(new THREE.BoxGeometry(.032,.5,.012),strap,C.leatherDark);
 for(let k=0;k<4;k++){
  const t=(k-1.5)*.085,x=.005+Math.sin(.72)*t,y=.67-Math.cos(.72)*t,glass=C.vials[k];
  P.add(new THREE.CylinderGeometry(.011,.012,.042,8),at(x,y,.13,[0,0,-.1]),(px,py,pz)=>mix(glass,[1,1,1],clamp01((pz-.135)*120)*.4));
  P.add(new THREE.CylinderGeometry(.006,.006,.012,6),at(x-.002,y+.027,.13),C.cork);
 }
 // the long cloak: back and sides only, hanging open at the front, its hem torn into points
 const shell=rag(lathe([[.26,.03],[.23,.25],[.2,.45],[.19,.6],[.19,.72],[.2,.8],[.17,.87],[.11,.91]],36,.6,Math.PI*2-1.2),.06,3);
 P.add(shell,at(0,0,-.015,[0,0,0],[1,1,.86]),cloth);
 // its blood-dark lining, just inside
 const inner=rag(lathe([[.25,.04],[.22,.25],[.19,.45],[.18,.6],[.18,.72],[.19,.8],[.16,.87],[.1,.91]],36,.6,Math.PI*2-1.2),.07,3);
 P.add(inner,at(0,0,-.015,[0,0,0],[1,1,.86]),lining);
 // stolen wares hung from its open front edges: a dagger and a ring of keys on the left ...
 const L=(dx,y,dz)=>[-.125+dx,y,.105+dz];
 limb(P,L(0,.5,0),L(0,.45,0),.002,.002,C.cork,4);
 P.add(new THREE.ConeGeometry(.01,.11,4),at(...L(0,.37,0),[Math.PI,0,0],[1,1,.3]),(x,y,z)=>mix(C.steel,C.steelHi,clamp01((y-.32)*8)));
 P.add(new THREE.BoxGeometry(.04,.008,.01),at(...L(0,.43,0)),C.brass);
 P.add(new THREE.CylinderGeometry(.006,.006,.03,6),at(...L(0,.45,0)),C.leatherDark);
 P.add(new THREE.TorusGeometry(.014,.003,4,12),at(...L(-.02,.3,-.005),[0,Math.PI/2,0]),C.steel);
 for(let k=0;k<3;k++)limb(P,L(-.02,.29,-.005),L(-.02+(k-1)*.012,.24,0),.0025,.0025,k===1?C.brass:C.steel,4);
 // ... rings and a little green vial on cords on the right
 for(let k=0;k<3;k++){
  const x=.105+k*.013,y=.48-k*.04;
  limb(P,[x,.56,.11],[x,y,.11],.0018,.0018,C.cork,4);
  if(k===1){P.add(new THREE.CylinderGeometry(.009,.01,.035,8),at(x,y-.018,.11),C.vials[0]);P.add(new THREE.CylinderGeometry(.005,.005,.01,6),at(x,y+.004,.11),C.cork);}
  else P.add(new THREE.TorusGeometry(.011,.0035,5,12),at(x,y-.01,.11,[0,0,0]),k?C.goldHi:C.gold);
 }
 // the ragged shoulder mantle over the cloak
 P.add(rag(lathe([[.26,.68],[.24,.76],[.2,.84],[.14,.9],[.07,.95]],32),.71,7,.06),at(0,0,-.01,[0,0,0],[1,1,.82]),(x,y,z)=>{
  const c=cloth(x,y,z);
  return y<.76?mix(C.cloakDark,c,clamp01((y-.66)*12)):c;
 });
 // the neck, sunk in the mantle
 P.add(new THREE.CylinderGeometry(.034,.042,.08,10),at(0,.93,.005),C.skinDark);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the shadowed, sunken face; head centre at .1
 P.add(new THREE.SphereGeometry(.075,20,16),at(0,.1,0,[0,0,0],[.85,1.05,.95]),(x,y,z)=>{
  // deep, dark sockets round the eyes
  if(z>.04&&Math.hypot(Math.abs(x)-.027,(y-.105)*1.4)<.02)return C.shadow;
  return mix(C.shadow,C.skinDark,clamp01(z*14-.2));
 });
 // the heavy brow over the eyes
 P.add(new THREE.CapsuleGeometry(.009,.05,4,8),at(0,.126,.064,[0,0,Math.PI/2],[1,1,.7]),C.skinDark);
 // the grimy scarf wound over the nose and mouth, a ridge where the hooked nose pushes it out
 P.add(new THREE.SphereGeometry(.08,20,10,0,Math.PI,1.68,1.0),at(0,.1,.002,[0,0,0],[.9,1.05,1.02]),(x,y,z)=>mix(C.scarfDark,C.scarf,clamp01(Math.sin(y*260+x*40)*.5+.5)*.7+.15));
 P.add(new THREE.ConeGeometry(.014,.04,8),at(0,.077,.084,[Math.PI/2+.5,0,0],[1,1,.8]),C.scarf);
 for(const y of [.052,.068])P.add(new THREE.TorusGeometry(.073,.004,4,24,Math.PI),at(0,y,.002,[0,0,Math.PI],[.95,1,1.06]),C.scarfDark);
 // the deep cowl, open at the front, its inside black, rising to a peak that droops behind
 const cowl=(r,colour)=>{
  P.add(new THREE.SphereGeometry(r,26,14,Math.PI/2+.85,Math.PI*2-1.7,0,Math.PI*.78),at(0,.11,-.012,[0,0,0],[1,1.15,1.12]),colour);
  P.add(new THREE.SphereGeometry(r,8,6,Math.PI/2-.86,1.72,0,1.15),at(0,.11,-.012,[0,0,0],[1,1.15,1.12]),colour);// over the brow
 };
 cowl(.112,(x,y,z)=>{
  const c=mix(C.cloakDark,mix(C.cloak,C.cloakHi,clamp01(Math.sin(Math.atan2(x,z)*7)*.5+.5)*.5),clamp01((y-.0)*6));
  return z>.05?mix(c,C.cloakHi,.35):c;// the rim catches the light
 });
 cowl(.106,C.shadow);
 P.add(new THREE.ConeGeometry(.06,.14,14),at(0,.23,-.07,[-1.05,0,0],[1,1,.8]),(x,y,z)=>mix(C.cloak,C.cloakDark,clamp01((y-.2)*8)));
 return P.merge();
}
// the eyes, a sickly yellow-green, glinting from the shadow
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0075,8,6),at(s*.027,.105,.069,[0,0,s*.25],[1.35,.6,.6]),[1,1,1]);
 return P.merge();
}

// dark trousers wrapped in strips below the knee, soft boots with long pointed toes
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.062,0],[.062,-.1],[.05,-.21]],14),at(0,0,0),(x,y,z)=>mix(C.trouser,C.trouserHi,clamp01(z*12+.4)*.6));
 P.add(new THREE.CylinderGeometry(.05,.042,.22,14,6),at(0,-.32,0),(x,y,z)=>{
  const band=Math.sin((y+x*.6)*150);
  return band>.75?C.leatherDark:mix(C.scarfDark,C.scarf,clamp01(z*12+.4)*.6);
 });
 P.add(new THREE.SphereGeometry(.045,12,8),at(0,-.445,.03,[0,0,0],[.8,.45,1.6]),C.leather);
 P.add(new THREE.ConeGeometry(.022,.08,8),at(0,-.452,.11,[Math.PI/2+.25,0,0],[1,1,.5]),C.leatherDark);// the toe, curled up a little
 P.add(new THREE.BoxGeometry(.07,.012,.15),at(0,-.464,.03),C.leatherDark);
 return P.merge();
}

// a cloak sleeve hanging wide, a leather bracer, a pale, long-nailed hand in a fingerless glove, a ring
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.06,14,10),at(0,0,0,[0,0,0],[1,.95,1]),cloth);
 P.add(rag(lathe([[.05,0],[.05,-.1],[.058,-.18],[.075,-.24]],16),-.2,11,.04),at(0,0,0),cloth);
 P.add(lathe([[.075,-.24],[.068,-.235],[.05,-.2]],16),at(0,0,0),lining);// the lining at the cuff
 P.add(new THREE.CylinderGeometry(.034,.03,.08,12),at(0,-.27,0),(x,y,z)=>Math.abs(Math.sin(y*160))<.2?C.leatherDark:C.leather);
 P.add(new THREE.SphereGeometry(.025,10,8),at(0,-.33,.006,[0,0,0],[.85,1.1,.85]),C.leatherDark);
 for(let k=0;k<4;k++){
  const x=-.015+k*.01;
  P.add(new THREE.CapsuleGeometry(.0055,.028,3,6),at(x,-.36,.022,[.9,0,0]),(px,py,pz)=>py>-.355?C.leatherDark:C.skin);
  P.add(new THREE.ConeGeometry(.004,.016,4),at(x,-.372,.04,[2.2,0,0]),C.nail);// long, yellowed nails
 }
 P.add(new THREE.TorusGeometry(.0075,.0025,4,10),at(-.005,-.355,.02,[.9,0,0]),C.goldHi);
 limb(P,[.02,-.322,.012],[.026,-.35,.028],.008,.006,C.skin,6);// the thumb
 return P.merge();
}

// the long sword: blackened steel with bright, notched edges and a fuller, downswept brass quillons,
// a wire-wrapped grip and a round pommel. Built along +y from the grip, edge facing x.
function buildSword(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.013,.015,.16,8),at(0,-.01,0),(x,y,z)=>Math.sin(y*300)>.3?C.brassHi:C.leatherDark);
 P.add(new THREE.SphereGeometry(.02,10,8),at(0,-.1,0),C.brass);
 P.add(new THREE.BoxGeometry(.04,.022,.03),at(0,.08,0),C.brass);
 for(const s of [-1,1]){
  limb(P,[s*.018,.08,0],[s*.09,.03,0],.009,.006,C.brass,6);
  P.add(new THREE.SphereGeometry(.009,6,5),at(s*.093,.026,0),C.brassHi);
 }
 const shape=new THREE.Shape();
 shape.moveTo(-.022,.09);shape.lineTo(.022,.09);
 // the right edge, notched where it has turned other blades
 shape.lineTo(.024,.4);shape.lineTo(.017,.42);shape.lineTo(.023,.44);shape.lineTo(.021,.62);shape.lineTo(.014,.635);shape.lineTo(.02,.65);
 shape.lineTo(.016,.78);shape.lineTo(0,.86);
 shape.lineTo(-.016,.78);shape.lineTo(-.021,.55);shape.lineTo(-.014,.535);shape.lineTo(-.022,.52);shape.lineTo(-.024,.09);
 const blade=new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelThickness:.003,bevelSize:.004,bevelSegments:1});
 blade.translate(0,0,-.003);
 P.add(blade,at(0,0,0),(x,y,z)=>{
  if(Math.abs(x)>.015||y>.8)return mix(C.steel,C.steelHi,.7);// the honed edges
  if(Math.abs(x)<.004&&y>.11&&y<.68)return C.steelDark;// the fuller
  return mix(C.steelDark,C.steel,.35);
 });
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[-.25,Math.PI/2,0]));// held upright, leant back towards the shoulder
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(),sword:buildSword(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:.15,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#eaffb0',emissive:'#8ad01a',emissiveIntensity:1.6,roughness:.2,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createBlackMarketeer(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.16);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.025);head.rotation.x=.1;body.add(head);// head low, peering up
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.07,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.2,SHOULDER_Y,0);arm.rotation.z=s*.08;body.add(arm);mesh(arm,S.arm,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.34,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.sword,'sword',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'black marketeer',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
