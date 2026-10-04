import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The bugbear used to be the generic stocky humanoid: a box torso with a sphere head, a little
// snout ball and two round ears. It now has its own model: a big, hunched, shaggy goblinoid,
// taller and far heavier than the hobgoblin. It has matted brown fur with a paler belly, a
// shoulder hump with a mane of shaggy tufts, and a bear-like head: a broad skull under a heavy
// brow, round ears set high, a short blunt muzzle with a black nose, and a grim mouth with fangs
// top and bottom. The yellow eyes glow. Long, thick arms end in big clawed paws, with fur ruffs
// at the elbows. It wears a hide harness strapped across the chest, a wide belt with a bone
// buckle, and a loincloth of spotted pelt. Its bowed bear legs end in broad furry feet with
// black claws. It carries a heavy morning star: a banded haft and a spiked iron ball.
// Each moving part (body, head, each leg and arm, the weapon) is one merged vertex-coloured mesh
// sharing one material, plus the glowing eyes on their own emissive material: 8 draws (it was
// about 40). The geometry is built once and shared.
// Handles: body, head, legs, arms, arm (the right, weapon arm), weaponSocket (at the right fist,
// holding the weapon), eyes. quirk 'orc' gives it the orcs' heavier idle bob. hat, beard and
// pick are null.

const L={
 fur:'#7a5230',dark:'#4a301c',pale:'#a8845a',skin:'#5a3a26',nose:'#1c1410',inner:'#4a2420',
 eye:'#ffc22a',teeth:'#ece0bc',claw:'#1e1812',hide:'#8a6a44',spot:'#4a3422',strap:'#3a2618',
 bone:'#d8ccaa',metal:'#6a6e70',wood:'#5a3e24',
 hip:.5,shoulderY:.92,shoulderX:.3,headY:1.06,headZ:.12,head:.14,arm:.46,
};

const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const UP=new THREE.Vector3(0,1,0);
// a cone standing on (x,y,z), pointing along `dir`: a tuft of fur, a claw or a spike
function spike(x,y,z,dir,flat=1){
 const d=new THREE.Vector3(...dir).normalize();
 return new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromUnitVectors(UP,d),new THREE.Vector3(1,1,flat));
}
function tuft(P,x,y,z,dir,len,r,colour){P.add(new THREE.ConeGeometry(r,len,4),spike(x+dir[0]*len*.4,y+dir[1]*len*.4,z+dir[2]*len*.4,dir,.55),colour);}
function colours(){const C={};for(const [k,v] of Object.entries(L))if(typeof v==='string')C[k]=rgb(v);return C;}

function buildBody(C){
 const P=pieces(),h=L.hip;
 // a barrel trunk, hunched forward, pale down the belly and dark over the back
 const coat=(x,y,z)=>mix(mix(C.fur,C.pale,THREE.MathUtils.clamp(z*6-.3,0,.7)*(y<h+.35?1:.4)),C.dark,z<-.06?.35:0);
 P.add(lathe([[0,h-.06],[.17,h-.06],[.21,h],[.225,h+.12],[.25,h+.26],[.265,h+.36],[.25,h+.42],[.18,h+.47],[.08,h+.5],[0,h+.505]],28),at(0,0,.01,[.14,0,0],[1.06,1,.84]),coat);
 // the shoulder hump
 P.add(new THREE.SphereGeometry(.16,14,10),at(0,h+.4,-.06,[0,0,0],[1.35,.75,.9]),(x,y,z)=>mix(C.fur,C.dark,z<-.1?.4:.1));
 // thick neck thrust forward to the low head
 P.add(new THREE.CylinderGeometry(.09,.12,.14,12),at(0,h+.5,.08,[.75,0,0]),C.fur);
 // shaggy mane over the hump and down the shoulders, and tufts on the flanks
 for(let i=0;i<34;i++){
  const a=(hash(i*1.7)-.5)*2.6,up=hash(i*2.9);
  const x=Math.sin(a)*.24,z=-Math.cos(a)*.12-.02,y=h+.34+up*.14;
  tuft(P,x,y,z,[Math.sin(a)*.6,-.9,-Math.cos(a)*.5],.1+hash(i*4.1)*.07,.032,mix(C.fur,C.dark,hash(i*5.3)*.7));
 }
 for(const s of [-1,1])for(let i=0;i<6;i++)tuft(P,s*.23,h+.08+i*.05,-.02+hash(i+s)*.06,[s,-.8,0],.07,.022,mix(C.fur,C.dark,hash(i*3+s)*.5));
 // hide harness strapped across the chest, with a bone toggle at the crossing
 for(const s of [-1,1]){
  const pts=[];for(let i=0;i<=16;i++){const t=i/16,a=(t-.5)*2.2*s;pts.push(new THREE.Vector3(Math.sin(a)*.26-s*.02,h+.1+t*.34,Math.cos(a)*.2+.03).applyAxisAngle(new THREE.Vector3(1,0,0),.14));}
  P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.018,4),null,C.strap);
 }
 P.add(new THREE.CylinderGeometry(.013,.013,.08,6),at(0,h+.27,.235,[0,0,Math.PI/2]),C.bone);
 // wide belt with a bone buckle
 P.add(new THREE.TorusGeometry(.215,.03,5,30),at(0,h+.01,.01,[Math.PI/2,0,0],[1.05,.84,1]),C.strap);
 P.add(new THREE.BoxGeometry(.09,.07,.02),at(0,h+.01,.19),C.bone);
 P.add(new THREE.BoxGeometry(.05,.035,.024),at(0,h+.01,.192),C.strap);
 // a loincloth of spotted pelt, front and back flaps with ragged ends
 const pelt=(x,y,z)=>hash(Math.round(x*50)*7+Math.round(y*50)*13+Math.round(z*50))>.78?C.spot:C.hide;
 for(const [z,flip] of [[.17,0],[-.16,1]]){
  P.add(new THREE.BoxGeometry(.2,.2,.016),at(0,h-.1,z,[flip?.1:-.1,0,0]),pelt);
  for(let i=0;i<4;i++)P.add(new THREE.ConeGeometry(.028,.06,3),at((i-1.5)*.05,h-.22,z+(flip?.012:-.012),[Math.PI,0,0],[1,1,.3]),C.hide);
 }
 // fur skirt of the seat under the belt
 P.add(lathe([[0,h-.1],[.17,h-.1],[.2,h-.04],[.2,h]],22),at(0,0,0,[0,0,0],[1.05,1,.84]),C.dark);
 return P.merge();
}

function buildHead(C){
 const P=pieces(),r=L.head;
 // a broad skull, darker at the back
 P.add(new THREE.SphereGeometry(r,20,14),at(0,.02,-.02,[0,0,0],[1.12,.95,1.05]),(x,y,z)=>mix(C.fur,C.dark,z<-.06?.35:0));
 // heavy brow over the eyes
 P.add(new THREE.SphereGeometry(.06,12,8),at(0,.055,.105,[.2,0,0],[2.3,.55,.8]),C.dark);
 // a short blunt muzzle, paler, with a black nose
 P.add(new THREE.SphereGeometry(.075,14,10),at(0,-.035,.115,[0,0,0],[1.12,.82,1.2]),(x,y,z)=>mix(C.pale,C.fur,y>-.01?.5:0));
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,-.005,.2,[0,0,0],[1.35,.8,.9]),C.nose);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.008,6,4),at(s*.014,-.012,.225),rgb('#000000'));
 // underjaw and chin tuft
 P.add(new THREE.SphereGeometry(.07,12,8),at(0,-.095,.07,[0,0,0],[1.2,.6,1.15]),C.pale);
 tuft(P,0,-.12,.1,[0,-1,.35],.07,.03,C.dark);
 // a grim mouth line with fangs top and bottom
 P.add(new THREE.TorusGeometry(.06,.009,4,16,Math.PI*.7),at(0,-.035,.12,[-.6,0,Math.PI+Math.PI*.15],[1,1,.8]),rgb('#2a1410'));
 for(const s of [-1,1]){
  P.add(new THREE.ConeGeometry(.011,.045,6),at(s*.035,-.085,.17,[Math.PI-.15,0,0]),C.teeth);
  P.add(new THREE.ConeGeometry(.01,.035,6),at(s*.05,-.085,.15,[.2,0,s*-.15]),C.teeth);
  // torn, pointed ears set high on the skull, with a dark dried-blood inside
  P.add(new THREE.ConeGeometry(.05,.13,4),at(s*.125,.13,-.02,[0,s*-.3,s*-.45],[1,1,.4]),C.fur);
  P.add(new THREE.ConeGeometry(.03,.08,4),at(s*.122,.125,.0,[0,s*-.3,s*-.45],[1,1,.3]),C.inner);
  // shaggy cheek ruff
  for(let i=0;i<5;i++)tuft(P,s*(.12+i*.004),-.07+i*.035,-.01-i*.01,[s,-.4+i*.1,-.2],.075,.026,mix(C.fur,C.dark,hash(i*7+s)*.6));
 }
 // a shaggy crest from brow to nape
 for(let i=0;i<7;i++){const a=.3+i*.28;tuft(P,(hash(i)-.5)*.04,.02+Math.cos(a)*r*1.02,-.02+Math.sin(a)*r*1.02-.02,[0,Math.cos(a)*.6+.4,Math.sin(a)*.8-.4],.07,.028,mix(C.fur,C.dark,hash(i*3)*.6));}
 return P.merge();
}

// The eyes, on their own glowing material, in head space.
function buildEyes(){
 const P=pieces(),Y=[1,1,1];
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.019,10,8),at(s*.052,.022,.128,[0,0,s*.2],[1.3,.8,.6]),Y);
 return P.merge();
}

function buildLeg(C){
 const P=pieces();
 // bowed bear legs: a heavy furred thigh, a thick shin, fur at the ankle and a broad clawed foot
 P.add(new THREE.CylinderGeometry(.095,.075,.24,12),at(0,-.11,.01,[-.12,0,0]),ramp(C.dark,C.fur,-.24,0));
 P.add(new THREE.SphereGeometry(.075,12,8),at(0,-.235,.035),C.fur);
 P.add(new THREE.CylinderGeometry(.07,.06,.2,12),at(0,-.34,.01,[.14,0,0]),ramp(C.dark,C.fur,-.45,-.24));
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2;tuft(P,Math.sin(a)*.06,-.4,Math.cos(a)*.06,[Math.sin(a)*.6,-1,Math.cos(a)*.6],.06,.02,mix(C.fur,C.dark,hash(i)*.6));}
 P.add(new THREE.SphereGeometry(.08,12,8),at(0,-.46,.05,[0,0,0],[1,.42,1.55]),(x,y)=>y<-.47?C.skin:C.fur);
 // four black claws curving over the toes
 for(let i=0;i<4;i++){
  const x=(i-1.5)*.034;
  P.add(new THREE.SphereGeometry(.022,8,6),at(x,-.47,.15),C.fur);
  P.add(new THREE.ConeGeometry(.011,.045,5),at(x,-.48,.18,[Math.PI/2+.5,0,0]),C.claw);
 }
 return P.merge();
}

function buildArm(C,left){
 const P=pieces(),a=L.arm;
 // a furred shoulder, a thick upper arm, a fur ruff at the elbow, a leather bracer, a huge paw
 P.add(new THREE.SphereGeometry(.09,12,10),at(0,-.01,0),C.fur);
 P.add(new THREE.CylinderGeometry(.075,.065,.2,12),at(0,-.12,0),ramp(C.dark,C.fur,-.22,0));
 for(let i=0;i<6;i++){const t=i/6*Math.PI*2;tuft(P,Math.sin(t)*.06,-.23,Math.cos(t)*.06-.01,[Math.sin(t)*.5,-1,Math.cos(t)*.5-.3],.07,.022,mix(C.fur,C.dark,hash(i*9)*.6));}
 P.add(new THREE.CylinderGeometry(.064,.056,.18,12),at(0,-.32,.01),C.fur);
 P.add(new THREE.CylinderGeometry(.062,.058,.08,12),at(0,-.36,.012),ramp(C.strap,C.hide,-.4,-.32));
 for(const y of [-.335,-.385])P.add(new THREE.TorusGeometry(.061,.006,4,14),at(0,y,.012,[Math.PI/2,0,0]),C.strap);
 P.add(new THREE.SphereGeometry(.066,12,10),at(0,-a+.01,.012,[0,0,0],[1,1.05,1.1]),C.fur);
 P.add(new THREE.SphereGeometry(.045,10,6),at(0,-a-.01,.045,[0,0,0],[1.1,.8,.6]),C.skin);
 for(let i=0;i<4;i++){const x=(i-1.5)*.028;P.add(new THREE.SphereGeometry(.017,6,5),at(x,-a-.035,.055),C.fur);P.add(new THREE.ConeGeometry(.009,.04,5),at(x,-a-.06,.07,[Math.PI+.6,0,0]),C.claw);}
 P.add(new THREE.SphereGeometry(.017,6,5),at(left?.052:-.052,-a,.05),C.fur);
 return P.merge();
}

// The morning star, in the right fist's socket, pointing forward (+z) and carried tipped down.
const CARRY=.75;
function buildWeapon(C){
 const P=pieces(),grain=(x,y,z)=>mix(C.wood,rgb('#3e2a18'),hash(Math.round(z*70))*.6);
 P.add(new THREE.CylinderGeometry(.022,.024,.12,8),at(0,0,0,[Math.PI/2,0,0]),C.strap);
 P.add(new THREE.CylinderGeometry(.026,.022,.36,10),at(0,0,.16,[Math.PI/2,0,0]),grain);
 P.add(new THREE.SphereGeometry(.03,8,6),at(0,0,-.065),C.metal);
 for(const z of [.24,.29])P.add(new THREE.TorusGeometry(.028,.007,4,14),at(0,0,z),C.metal);
 // the spiked iron ball on a collar
 P.add(new THREE.CylinderGeometry(.032,.028,.045,10),at(0,0,.33,[Math.PI/2,0,0]),C.metal);
 const iron=(x,y,z)=>mix(C.metal,rgb('#4a3e34'),hash(Math.round(x*120)+Math.round(y*120)*5+Math.round(z*120)*11)>.72?.55:.05);
 P.add(new THREE.IcosahedronGeometry(.065,2),at(0,0,.4),iron);
 const dirs=new THREE.IcosahedronGeometry(1,0).attributes.position,seen=new Set();
 for(let i=0;i<dirs.count;i++){
  const d=new THREE.Vector3(dirs.getX(i),dirs.getY(i),dirs.getZ(i)).normalize(),key=d.toArray().map(v=>v.toFixed(3)).join();
  if(seen.has(key)||d.z<-.8)continue;seen.add(key);
  P.add(new THREE.ConeGeometry(.016,.06,5),spike(d.x*.085,d.y*.085,.4+d.z*.085,d.toArray()),rgb('#a0a4a4'));
 }
 return P.merge().applyMatrix4(at(0,0,0,[CARRY,0,0]));
}

// mirror a leg for the other side, restoring the winding the mirror flips
function mirrored(geo){
 const m=geo.clone().scale(-1,1,1);
 for(let i=0;i<m.attributes.position.count;i+=3)for(const key of ['position','normal','color']){const a=m.attributes[key];for(let k=0;k<a.itemSize;k++){const j=(i+1)*a.itemSize+k,l=(i+2)*a.itemSize+k,t=a.array[j];a.array[j]=a.array[l];a.array[l]=t;}}
 return m;
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:.06,side:THREE.DoubleSide});
 const C=colours(),leg=buildLeg(C);
 S={body:buildBody(C),head:buildHead(C),eyes:buildEyes(),legs:[mirrored(leg),leg],arms:[buildArm(C,true),buildArm(C,false)],weapon:buildWeapon(C),
  eyeMaterial:new THREE.MeshStandardMaterial({color:L.eye,emissive:L.eye,emissiveIntensity:2.6,roughness:.3})};
 return S;
}
function mesh(parent,geo,mat,name){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createBugbear(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.name='bugbear';g.add(body);
 mesh(body,S.body,material,'body');
 const head=new THREE.Group();head.position.set(0,L.headY+L.head*.55,L.headZ);body.add(head);
 mesh(head,S.head,material,'head');
 const eyes=mesh(head,S.eyes,S.eyeMaterial,'eyes');eyes.castShadow=false;
 const legs=[],arms=[];
 for(const [i,s] of [-1,1].entries()){
  const leg=new THREE.Group();leg.position.set(s*.12,L.hip,0);body.add(leg);mesh(leg,S.legs[i],material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*L.shoulderX,L.shoulderY,.04);arm.rotation.z=s*.08;body.add(arm);mesh(arm,S.arms[i],material,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-L.arm-.01,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.weapon,material,'weapon');
 return {g,body,legs,tail:null,wings:[],quirk:'orc',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
