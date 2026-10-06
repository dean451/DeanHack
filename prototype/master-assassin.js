import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The Master Assassin (the Rogue quest nemesis) shares the humans' letter, so he used to be the
// plain `@` humanoid. He now stands as a lean, wiry killer, head low. A close black
// hood wraps his head, and under it a smooth bone-white mask without a mouth: two long, narrow eye
// slits slanting up at the temples, with sickly green eyes in the dark behind them, and a thin red
// line painted down from each slit like a tear. Dark plum leathers fit close over a narrow body;
// two black baldrics cross the chest, each sheathing a row of throwing knives with steel pommels,
// and a wide belt carries a row of small poison vials, green and corked. A short ragged half-cape
// hangs from the left shoulder, its hem torn into long jagged points. His forearms are bound in
// black wraps, his legs in dark cloth, and his soft split-toed boots are laced to the knee.
// In his right hand a wavy kris whose blade is black-green with poison, beaded at the edges; in his
// left, held point-down along the forearm, a slim stabbing dagger, also wet with venom.
// Each moving part (body, head, each leg and arm, the kris) is one merged, vertex-coloured mesh on
// one shared material, plus one small glowing mesh for the eyes: 8 draws. The off-hand dagger is
// baked into the left arm. Geometry is built once and shared.
// Handles: legs, arms, arm (the kris arm), weaponSocket, shieldArm (the dagger arm), head, eyes, body.

const C={
 mask:rgb('#d8d2c0'),maskDark:rgb('#8a8474'),slit:rgb('#040404'),tear:rgb('#7a0a12'),
 hood:rgb('#121014'),hoodHi:rgb('#2e2a32'),
 leather:rgb('#2a1828'),leatherHi:rgb('#4e3048'),leatherDark:rgb('#0e080e'),
 strap:rgb('#0c0a0c'),strapHi:rgb('#2a262a'),
 wrap:rgb('#1a1818'),wrapHi:rgb('#3a3636'),
 steel:rgb('#5a6068'),steelHi:rgb('#d0d8e0'),steelDark:rgb('#1e2226'),
 venom:rgb('#3a7a1a'),venomHi:rgb('#a8f040'),venomDark:rgb('#0e2008'),
 glass:rgb('#4a8a3a'),cork:rgb('#6a4a2a'),brass:rgb('#8a6a2a'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// close-fitting leather, a faint sheen along its seams
const leather=(x,y,z)=>{
 const seam=Math.abs(Math.sin(Math.atan2(x,z)*3+y*2));
 return mix(C.leatherDark,mix(C.leather,C.leatherHi,seam*.5),.55+seam*.45);
};
// cloth wraps wound in a spiral
const wrapped=k=>(x,y,z)=>mix(C.wrap,C.wrapHi,clamp01(Math.sin(y*k+Math.atan2(x,z))*.8));
// a blade wet with poison: black-green steel, the edges beaded bright
const venomBlade=(edge,x,y)=>edge?mix(C.venom,C.venomHi,.5+.5*Math.sin(y*260)):mix(C.venomDark,C.steelDark,clamp01(Math.sin(y*90+x*400)*.5+.5));

export const HIP_Y=.44,SHOULDER_Y=.8,NECK_Y=.9;

function buildBody(){
 const P=pieces();
 // the narrow leather torso, leaning forward a little into the crouch
 P.add(lathe([[.135,.4],[.13,.5],[.115,.58],[.13,.66],[.15,.74],[.15,.79],[.125,.84],[.085,.875],[.045,.9]],36),at(0,0,0,[0,0,0],[1,1,.72]),leather);
 // the belt and its row of poison vials
 P.add(new THREE.CylinderGeometry(.128,.132,.04,32,1,true),at(0,.5,0,[0,0,0],[1,1,.74]),(x,y,z)=>Math.abs(x)<.012&&z>0?C.brass:C.strap);
 for(let k=0;k<6;k++){
  const a=-1.1+k*.44;if(Math.abs(a)<.2)continue;
  const x=Math.sin(a)*.136,z=Math.cos(a)*.1;
  P.add(new THREE.CylinderGeometry(.011,.011,.045,8),at(x,.49,z),(px,py,pz)=>mix(C.venomDark,C.glass,clamp01((.5-py)*30+.3)));
  P.add(new THREE.CylinderGeometry(.007,.008,.014,6),at(x,.518,z),C.cork);
 }
 // the hips in dark cloth
 P.add(new THREE.CylinderGeometry(.128,.142,.1,32,1,true),at(0,.43,0,[0,0,0],[1,1,.78]),(x,y,z)=>mix(C.wrap,C.wrapHi,clamp01(z*6)*.4));
 P.add(new THREE.CircleGeometry(.142,24),at(0,.38,0,[Math.PI/2,0,0],[1,.78,1]),C.leatherDark);
 // two black baldrics crossing the chest, each sheathing a row of throwing knives
 for(const s of [-1,1]){
  const A=new THREE.Vector3(s*.11,.82,0),B=new THREE.Vector3(-s*.1,.52,0);
  for(const side of [1,-1]){
   const strap=new THREE.BoxGeometry(.034,A.distanceTo(B),.008);
   const m=new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5).setZ(side*.108),new THREE.Quaternion().setFromUnitVectors(up,A.clone().sub(B).normalize()),new THREE.Vector3(1,1,1));
   P.add(strap,m,(x,y,z)=>mix(C.strap,C.strapHi,clamp01(Math.sin(y*120)*.5)));
  }
 }
 // the knives, sheathed along the baldric from the right shoulder to the left hip
 for(let k=0;k<4;k++){
  const t=.2+k*.17,x=.11-.21*t,y=.82-.3*t;
  P.add(new THREE.BoxGeometry(.016,.045,.012),at(x,y,.118,[0,0,-.6]),C.strapHi);// the sheath
  limb(P,[x-.008*.56,y+.022,.122],[x-.03*.56,y+.06,.124],.004,.003,C.wrap,5);// the grip
  P.add(new THREE.SphereGeometry(.0055,6,4),at(x-.035*.56,y+.068,.124),C.steelHi);// the pommel
 }
 // the short ragged half-cape hung from the left shoulder, back and left side, torn into points
 const cape=lathe([[.2,.3],[.18,.48],[.17,.66],[.18,.78],[.15,.86],[.09,.9]],28,Math.PI*1.05,Math.PI*.95);
 const p=cape.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y>.31)continue;
  const seg=Math.round((Math.atan2(p.getX(i),p.getZ(i))+Math.PI)/(Math.PI*2)*28);
  p.setY(i,y+(seg%2?.07+hash(seg)*.06:hash(seg+5)*.02)-(seg%5===0?.06:0));
 }
 cape.computeVertexNormals();
 P.add(cape,at(0,0,-.012,[0,0,0],[1,1,.85]),(x,y,z)=>{
  const f=Math.sin(Math.atan2(x,z)*9+y*3)*.5+.5;
  return mix(C.hood,C.hoodHi,f*.5*clamp01((y-.2)*2));
 });
 // the clasp at the left shoulder
 P.add(new THREE.TorusGeometry(.014,.004,5,12),at(-.12,.82,.07,[.3,0,0]),C.steel);
 // the neck, wound in black cloth
 P.add(new THREE.CylinderGeometry(.04,.05,.07,12),at(0,.9,0),wrapped(160));
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the bone-white mask: smooth, mouthless, two long eye slits slanting up at the temples, a thin red
 // tear painted down from each. Head centre at .1
 P.add(new THREE.SphereGeometry(.074,48,40,Math.PI*.08,Math.PI*.84,Math.PI*.12,Math.PI*.7),at(0,.1,.004,[0,0,0],[.86,1.12,1.02]),(x,y,z)=>{
  const ax=Math.abs(x),slitY=.105+(ax-.012)*.32;
  if(ax>.01&&ax<.05&&Math.abs(y-slitY)<.0045-(ax-.03)*(ax-.03)*3)return C.slit;
  if(Math.abs(ax-.03)<.0026&&y<slitY-.004&&y>.045+ax*.4)return C.tear;
  // a faint ridge down the nose and shade at the edges
  return mix(C.maskDark,C.mask,clamp01(z*14-.2)*.85+clamp01(.004-ax)*30);
 });
 // the dark under the mask, so the slits are holes into shadow
 P.add(new THREE.SphereGeometry(.068,16,12),at(0,.1,0,[0,0,0],[.84,1.08,.94]),C.slit);
 // the brow ridge of the mask, swept low
 P.add(new THREE.CapsuleGeometry(.008,.06,4,8),at(0,.123,.064,[0,0,Math.PI/2],[1,1,.6]),C.maskDark);
 // the close black hood, coming to a short point at the back, its front edge framing the mask
 // (closed over the crown, open at the face below it)
 for(const hood of [new THREE.SphereGeometry(.088,32,6,0,Math.PI*2,0,Math.PI*.24),new THREE.SphereGeometry(.088,24,12,Math.PI*.8,Math.PI*1.4,Math.PI*.24,Math.PI*.54)]){
  const h=hood.attributes.position;
  for(let i=0;i<h.count;i++){const y=h.getY(i),z=h.getZ(i);if(y>.04&&z<0)h.setZ(i,z-(y-.04)*.45);}
  hood.computeVertexNormals();
  P.add(hood,at(0,.11,-.004,[-.12,0,0],[.92,1.05,1]),(x,y,z)=>mix(C.hood,C.hoodHi,clamp01(Math.sin(Math.atan2(x,z)*5)*.4+.1)));
 }
 P.add(new THREE.TorusGeometry(.07,.009,6,28,Math.PI*1.25),at(0,.1,.045,[0,0,-Math.PI*.125],[.95,1.15,1]),C.hoodHi);
 // the cowl wrapped under the chin
 P.add(new THREE.SphereGeometry(.07,16,8,0,Math.PI*2,Math.PI*.55,Math.PI*.45),at(0,.07,0,[0,0,0],[1,.8,1.05]),wrapped(220));
 return P.merge();
}
// the eyes, sickly green, glinting in the slits
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0068,8,6),at(s*.028,.11,.074,[0,0,s*.31],[1.6,.5,.5]),[1,1,1]);
 return P.merge();
}

// dark wrapped legs, and soft split-toed boots laced to the knee
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.058,0],[.06,-.09],[.045,-.19]],14),at(0,0,0),(x,y,z)=>mix(C.leatherDark,C.leather,clamp01(z*12+.5)));
 P.add(new THREE.CylinderGeometry(.046,.036,.25,14),at(0,-.31,0),(x,y,z)=>{
  // the lacing, criss-crossing up the front
  if(z>.02&&Math.abs(Math.abs(x)-((y*90)%1+1)%1*.02)<.003)return C.strapHi;
  return mix(C.wrap,C.wrapHi,clamp01(z*14)*.4);
 });
 P.add(new THREE.SphereGeometry(.04,12,8),at(0,-.44,.03,[0,0,0],[.8,.45,1.6]),C.wrap);
 // the split toe
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.016,8,6),at(s*.015-.004*(s+1),-.446,.09,[0,0,0],[1,.7,1.4]),C.wrap);
 P.add(new THREE.BoxGeometry(.07,.01,.14),at(0,-.458,.03),C.strap);
 return P.merge();
}

// a leather sleeve, the forearm bound in black wraps, a lean gloved hand; the left holds a slim
// dagger point-down along the forearm
function buildArm(dagger){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.056,14,10,0,Math.PI*2,0,Math.PI*.6),at(0,0,0),leather);
 P.add(lathe([[.044,-.03],[.042,-.13]],12),at(0,0,0),leather);
 P.add(new THREE.CylinderGeometry(.04,.032,.18,12),at(0,-.22,0),wrapped(260));
 P.add(new THREE.SphereGeometry(.024,10,8),at(0,-.33,.006,[0,0,0],[.85,1.15,.85]),C.strap);
 for(let k=0;k<4;k++)P.add(new THREE.CapsuleGeometry(.0055,.02,3,6),at(-.015+k*.01,-.352,.022,[.9,0,0]),C.strap);
 limb(P,[.018,-.322,.012],[.024,-.35,.026],.007,.005,C.strap,6);// the thumb
 if(dagger){
  // the grip in the fist, the blade running up the outside of the forearm, point near the elbow
  limb(P,[0,-.37,.024],[0,-.31,.024],.007,.007,C.wrap,6);
  P.add(new THREE.SphereGeometry(.009,6,4),at(0,-.378,.024),C.steel);
  P.add(new THREE.BoxGeometry(.05,.008,.012),at(0,-.305,.026),C.steelDark);
  const blade=new THREE.ConeGeometry(.013,.22,4);blade.rotateY(Math.PI/4);blade.scale(1,1,.3);
  P.add(blade,at(-.006,-.19,.048,[-.08,0,0]),(x,y,z)=>venomBlade(Math.abs(x)>.004,x,y));
 }
 return P.merge();
}

// the kris: a wavy black-green blade wet with poison, a flared asymmetric guard, a dark wood grip
// and a hooked pommel. Built along +y from the grip, edge facing x.
function buildKris(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.012,.014,.11,8),at(0,0,0),(x,y,z)=>Math.sin(y*300)>0?C.wrap:C.leatherDark);
 P.add(new THREE.SphereGeometry(.016,8,6),at(.006,-.062,0,[0,0,.5],[1.4,.8,1]),C.steelDark);// the hooked pommel
 const guard=new THREE.Shape();
 guard.moveTo(-.022,.055);guard.lineTo(.03,.055);guard.lineTo(.05,.075);guard.lineTo(.02,.085);guard.lineTo(-.03,.08);guard.lineTo(-.022,.055);
 const g=new THREE.ExtrudeGeometry(guard,{depth:.012,bevelEnabled:false});g.translate(0,0,-.006);
 P.add(g,at(0,0,0),C.steelDark);
 // the blade: seven waves narrowing to a point
 const shape=new THREE.Shape(),N=28,base=.085,len=.4;
 const wave=t=>Math.sin(t*Math.PI*7)*.012*(1-t*.6);
 const half=t=>.02*(1-t)+.002;
 shape.moveTo(-half(0)+wave(0),base);
 for(let i=1;i<=N;i++){const t=i/N;shape.lineTo(wave(t)+half(t),base+t*len);}
 for(let i=N;i>=0;i--){const t=i/N;shape.lineTo(wave(t)-half(t),base+t*len);}
 const blade=new THREE.ExtrudeGeometry(shape,{depth:.005,bevelEnabled:true,bevelThickness:.002,bevelSize:.003,bevelSegments:1});
 blade.translate(0,0,-.0025);
 P.add(blade,at(0,0,0),(x,y,z)=>{const t=(y-base)/len;return venomBlade(Math.abs(x-wave(t))>half(t)-.002,x,y);});
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[.35,Math.PI/2,0]));// held low, point forward
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(false),daggerArm:buildArm(true),kris:buildKris(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.3,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#d8ffb0',emissive:'#6ae020',emissiveIntensity:1.6,roughness:.2,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createMasterAssassin(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.2);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.02);head.rotation.x=.14;body.add(head);// head low, watching from under the hood
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.068,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  // the dagger arm hangs straight, so a shieldArm pose (rotation.z from 0) doesn't jolt it
  const arm=new THREE.Group();arm.position.set(s*.18,SHOULDER_Y,0);if(s>0)arm.rotation.z=.12;body.add(arm);mesh(arm,s<0?S.daggerArm:S.arm,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.34,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.kris,'kris',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'master assassin',arms,arm:arms[1],weaponSocket,shieldArm:arms[0],head,eyes,hat:null,beard:null,pick:null};
}
