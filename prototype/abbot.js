import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The abbot (the Monk quest's guardian) shares the humans' letter, so he used to be the plain `@`
// humanoid. He now stands as a gaunt, ancient ascetic gone to something colder: a tall, stooped figure
// in a black wool habit with a deep pointed hood that droops behind. Under the hood the face is grey
// and sunken, hollow-cheeked with a long thin nose and a lipless mouth; a thin white beard spills over
// the chest, and two small pale eyes burn violet in the dark of the sockets. Over the habit lies a
// short cowl, torn into jagged points, and down the front an oxblood scapular with a faded bone-white
// sigil, an open eye in a ring. A knotted hemp rope girds the waist, its two cords hanging down. The
// hem is torn into ragged tatters, and long grey toes with black nails creep out from under it. His
// wide sleeves end in tatters too; his forearms are bound in yellowed linen and his long fingers are
// hooked into claws with black nails (he fights barehanded: claw, stunning kick and clerical spells).
// A string of bone prayer beads hangs from the left hand with a small carved skull at the bottom.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured mesh on one shared
// material, plus one small glowing mesh for the eyes: 7 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the right), weaponSocket (empty, at the right hand), head, eyes, body.

const C={
 wool:rgb('#26221f'),woolDark:rgb('#0e0c0c'),woolHi:rgb('#3c3530'),blood:rgb('#3a1416'),mud:rgb('#2a2218'),
 scap:rgb('#3e0e10'),scapDark:rgb('#1c0606'),sigil:rgb('#b4a888'),
 skin:rgb('#98948a'),skinDark:rgb('#55524a'),shadow:rgb('#060506'),lip:rgb('#3e3434'),
 beard:rgb('#d8d4c8'),beardDark:rgb('#8e8a80'),
 rope:rgb('#8a7650'),ropeDark:rgb('#4e3f26'),
 linen:rgb('#b0a27a'),linenDark:rgb('#6e6246'),nail:rgb('#100c0c'),
 bone:rgb('#d6cba8'),boneDark:rgb('#8a7e5e'),
};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const up=new THREE.Vector3(0,1,0);
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// a cone hanging from `top` along `dir` (a torn tatter, a strand of beard, a claw)
function spike(P,top,dir,len,r,colour,seg=4){
 const D=new THREE.Vector3(...dir).normalize(),T=new THREE.Vector3(...top);
 P.add(new THREE.ConeGeometry(r,len,seg),new THREE.Matrix4().compose(T.clone().addScaledVector(D,len/2),new THREE.Quaternion().setFromUnitVectors(up,D),new THREE.Vector3(1,1,1)),colour);
}
// black wool falling in folds, an oxblood stain deep in them, mud along the hem
const wool=(x,y,z)=>{
 const fold=Math.sin(Math.atan2(x,z)*14+y*4)*.5+.5;
 let c=mix(C.woolDark,mix(C.wool,C.woolHi,fold*.6),.35+fold*.65);
 c=mix(c,C.blood,(1-fold)*.35);
 return mix(c,C.mud,clamp01((.16-y)*6)*.7);
};

export const HIP_Y=.47,SHOULDER_Y=.83,NECK_Y=.95;
const HABIT=[[.21,.04],[.2,.12],[.18,.3],[.165,.5],[.17,.66],[.18,.78],[.165,.86],[.11,.92],[.05,.95]];

function buildBody(){
 const P=pieces();
 // the habit, from the hem to the collar
 P.add(lathe(HABIT,40),at(0,0,0,[0,0,0],[1,1,.8]),wool);
 P.add(new THREE.CircleGeometry(.21,24),at(0,.04,0,[Math.PI/2,0,0],[1,.8,1]),C.woolDark);
 // the hem torn into ragged tatters, longer at the back
 for(let i=0;i<26;i++){
  const a=i/26*Math.PI*2+hash(i)*.12,h=.025+hash(i+40)*.02+(Math.cos(a)<0?.01:0);
  const r=.205;spike(P,[Math.sin(a)*r,.055,Math.cos(a)*r*.8],[Math.sin(a)*.25,-1,Math.cos(a)*.2],h,.02+hash(i+80)*.01,C.mud,3);
 }
 // the oxblood scapular down the front and back, with a faded sigil on the chest: an open eye in a ring
 const scap=(x,y,z)=>{
  if(z>0){
   const dy=y-.66,r=Math.hypot(x,dy);
   if(r>.036&&r<.043)return C.sigil;
   if(Math.abs(x)<.03){const h=.017*(1-(x/.03)**2);
    if(Math.abs(Math.abs(dy)-h)<.0035)return C.sigil;
    if(Math.abs(dy)<h)return r<.008?C.sigil:C.scapDark;
   }
  }
  // worn ragged at the bottom edge
  if(y<.15+hash(Math.floor(Math.atan2(x,z)*40))*.03)return C.scapDark;
  return mix(C.scapDark,C.scap,.5+Math.sin(y*30)*.15+clamp01(y-.2)*.4);
 };
 const scapProfile=HABIT.filter(([,y])=>y>=.12&&y<=.86).map(([r,y])=>[r+.007,y]);
 for(const phi of [0,Math.PI])P.add(lathe(scapProfile,10,phi-.42,.84),at(0,0,0,[0,0,0],[1,1,.8]),scap);
 // the short cowl over the shoulders, open at the front, torn into jagged points
 P.add(lathe([[.07,.955],[.15,.93],[.22,.875],[.24,.82]],32,.75,Math.PI*2-1.5),at(0,0,0,[0,0,0],[1,1,.86]),wool);
 for(let i=0;i<13;i++){
  const a=.8+i/12*(Math.PI*2-1.6),h=.04+hash(i+7)*.05;
  spike(P,[Math.sin(a)*.235,.825,Math.cos(a)*.235*.86],[Math.sin(a)*.3,-1,Math.cos(a)*.25],h,.022,C.wool,3);
 }
 // the knotted hemp cincture and its two hanging cords
 const rope=(x,y,z)=>Math.sin(Math.atan2(x,z)*40+y*200)>0?C.rope:C.ropeDark;
 P.add(new THREE.TorusGeometry(.172,.011,5,40),at(0,.55,0,[Math.PI/2,0,0],[1,.8,1]),rope);
 for(const [x0,x1,len] of [[.035,.05,.32],[.06,.095,.26]]){
  limb(P,[x0,.55,.142],[x1,.55-len,.15],.007,.006,rope,6);
  for(let k=1;k<=3;k++){const t=k/3.4;P.add(new THREE.SphereGeometry(.013,8,6),at(x0+(x1-x0)*t,.55-len*t,.142+.008*t),C.ropeDark);}
 }
 // the scrawny neck
 P.add(new THREE.CylinderGeometry(.036,.046,.07,12),at(0,.95,.01),C.skinDark);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the grey sunken face; head centre at .095
 P.add(new THREE.SphereGeometry(.08,24,18),at(0,.095,.012,[0,0,0],[.85,1.1,.95]),(x,y,z)=>{
  for(const s of [-1,1])if(z>.04&&Math.hypot(x-s*.028,(y-.105)*1.4)<.019)return C.shadow;
  if(z>.06&&Math.abs(y-.05)<.0035&&Math.abs(x)<.022)return C.lip;
  let c=mix(C.skinDark,C.skin,clamp01(z*9));
  if(z>.02&&Math.abs(x)>.03&&y<.09&&y>.035)c=mix(c,C.shadow,.45);// hollow cheeks
  return c;
 });
 // the heavy brow, and the long thin nose
 P.add(new THREE.CapsuleGeometry(.012,.055,4,8),at(0,.124,.074,[0,0,Math.PI/2],[1,1,.8]),C.skinDark);
 P.add(new THREE.ConeGeometry(.011,.05,6),at(0,.087,.094,[Math.PI/2+.45,0,0]),C.skin);
 // the thin white beard, spilling from the chin down over the chest
 for(let i=0;i<7;i++){
  const x=(i-3)*.0085,len=.15+hash(i+3)*.08;
  spike(P,[x,.04,.068],[x*1.5,-1,.6],len,.012,(px,py,pz)=>hash(i*7+Math.floor(py*60))>.45?C.beard:C.beardDark,5);
 }
 // the deep hood: a full crown over the brow, then sides and back with the face left open
 const hood=(x,y,z)=>{
  const c=wool(x,y+.6,z);
  return mix(c,C.woolDark,clamp01((z-.05)*12));// darker towards the opening
 };
 P.add(new THREE.SphereGeometry(.125,28,10,0,Math.PI*2,0,1.3),at(0,.11,-.01,[0,0,0],[1,1.05,1.1]),hood);
 P.add(new THREE.SphereGeometry(.125,28,12,Math.PI/2+.8,Math.PI*2-1.6,1.3,1.25),at(0,.11,-.01,[0,0,0],[1,1.05,1.1]),hood);
 // its long point drooping down the back
 spike(P,[0,.2,-.06],[0,.15,-1],.16,.045,hood,8);
 return P.merge();
}
// two small pale eyes burning deep in the sockets
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.007,8,6),at(s*.028,.105,.082,[0,0,-s*.25],[1.3,.7,.6]),[1,1,1]);
 return P.merge();
}

// a bony shin hidden under the habit, and a long grey foot on a rope sandal, toes creeping out
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.03,.026,.2,10),at(0,-.34,0),C.skinDark);
 P.add(new THREE.CylinderGeometry(.028,.03,.04,10,3),at(0,-.43,.005),(x,y)=>Math.sin(y*400)>0?C.linen:C.linenDark);
 P.add(new THREE.SphereGeometry(.036,12,8),at(0,-.448,.06,[0,0,0],[.85,.45,1.9]),C.skinDark);
 P.add(new THREE.BoxGeometry(.072,.012,.16),at(0,-.464,.08),C.ropeDark);
 for(let k=0;k<5;k++){
  const x=-.022+k*.011,len=.03+(k===1?.008:0)-Math.abs(k-1)*.003;
  limb(P,[x,-.452,.125],[x*1.15,-.456,.125+len],.0065,.005,C.skin,6);
  spike(P,[x*1.15,-.456,.125+len],[0,-.5,1],.01,.004,C.nail,4);
 }
 return P.merge();
}

// a wide sleeve torn into tatters, a forearm bound in linen, and a long hand hooked into claws;
// the left one has a string of bone prayer beads hanging from it with a small skull at the bottom
function buildArm(beads){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.06,16,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),wool);
 P.add(lathe([[.052,0],[.056,-.08],[.068,-.17],[.085,-.25]],20),at(0,0,0),(x,y,z)=>wool(x,y+.6,z));
 for(let i=0;i<9;i++){
  const a=i/9*Math.PI*2+hash(i+50)*.3,h=.03+hash(i+60)*.04;
  spike(P,[Math.sin(a)*.084,-.248,Math.cos(a)*.084],[Math.sin(a)*.3,-1,Math.cos(a)*.3],h,.02,C.woolDark,3);
 }
 P.add(new THREE.CylinderGeometry(.028,.031,.13,10,6),at(0,-.27,0),(x,y)=>Math.sin(y*320+x*40)>.2?C.linen:C.linenDark);
 // the hand: a narrow palm, four long fingers hooked forward and down, black nails, a thumb
 P.add(new THREE.SphereGeometry(.026,10,8),at(0,-.35,.008,[0,0,0],[.85,1.2,.75]),C.skinDark);
 for(let k=0;k<4;k++){
  const x=-.016+k*.011;
  limb(P,[x,-.37,.014],[x,-.405,.03],.0065,.0055,C.skin,6);
  limb(P,[x,-.405,.03],[x,-.425,.017],.0055,.0045,C.skin,6);
  spike(P,[x,-.425,.017],[0,-.6,-1],.018,.0045,C.nail,5);
 }
 limb(P,[.022,-.345,.012],[.026,-.38,.032],.008,.006,C.skin,6);
 if(beads){
  // the beads loop down from the palm and back, the skull hanging at the bottom
  const N=18;
  for(let i=0;i<=N;i++){
   const a=i/N*Math.PI;
   P.add(new THREE.SphereGeometry(.0075,6,5),at(Math.cos(a)*.02,-.37-Math.sin(a)*.15,.03+Math.sin(a*2)*.006),i%5===0?C.boneDark:C.bone);
  }
  limb(P,[0,-.52,.03],[0,-.545,.03],.002,.002,C.ropeDark,4);
  P.add(new THREE.SphereGeometry(.016,10,8),at(0,-.56,.03,[0,0,0],[.9,1,.95]),(x,y,z)=>{
   for(const s of [-1,1])if(z>.04&&Math.hypot(x-s*.006,y+.557)<.005)return C.shadow;
   return mix(C.boneDark,C.bone,clamp01((z-.02)*60));
  });
  P.add(new THREE.BoxGeometry(.016,.008,.012),at(0,-.573,.034),C.boneDark);// the jaw
 }
 return P.merge();
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),armL:buildArm(true),armR:buildArm(false),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#ece4ff',emissive:'#8e6cff',emissiveIntensity:1.5,roughness:.2,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createAbbot(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.06);
 body.rotation.x=.05;// stooped
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.02);head.rotation.x=.15;body.add(head);// the face sunk into the hood
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.075,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.22,SHOULDER_Y,0);arm.rotation.z=s*.12;body.add(arm);mesh(arm,s<0?S.armL:S.armR,'arm',S.hide);arms.push(arm);
 }
 // an empty socket at the right hand: he strikes with his claws
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'abbot',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
