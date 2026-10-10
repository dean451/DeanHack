import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The baluchitherium used to be the giant-rhino builder with a longer neck: a stretched rothe. It
// is now Paraceratherium as it was, the largest land beast there ever was: towering pillar legs,
// the front ones longer so the back slopes down to the hips; a deep barrel of dusty grey-brown hide
// hanging in heavy wrinkled folds at the neck, shoulders and thighs, scored with old pale scars and
// caked in dried mud up the legs; a long, thick neck carrying a small hornless rhino's head with a
// drooping, prehensile upper lip, heavy-lidded eyes and one ear notched and torn.
//
// Whimsy lives in the motion (createBrowse, run from live.js): now and then it stretches its neck up
// high, its lip curls and grasps at leaves that aren't there and it chews slowly, an ear flicking.
// Each moving part is one merged vertex-coloured mesh on one material.
// Handles: body, head, neck (the neck pivot the head hangs from), lip, jaw, ears, legs, tail.

const L={hide:'#8a7e6c',dark:'#5e5446',fold:'#4a4238',scar:'#b8ac96',mud:'#5a4a34',hoof:'#2e2822',eye:'#120e0a',lip:'#6a5848',
 frontLeg:1.0,hindLeg:.88,frontZ:.42,hindZ:-.5,legX:.2};
const C=Object.fromEntries(Object.entries(L).filter(([,v])=>typeof v==='string').map(([k,v])=>[k,rgb(v)]));
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const UP=new THREE.Vector3(0,1,0);
const along=(a,b,r0,r1,seg=14)=>{
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const g=new THREE.CylinderGeometry(r1,r0,len,seg,4);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,d.normalize()));
 return g.translate((A.x+B.x)/2,(A.y+B.y)/2,(A.z+B.z)/2);
};
// wrinkled hide: darker in the creases (a ripple across the body), with old scars and dust
const hidePaint=(x,y,z)=>{
 const crease=Math.max(0,Math.sin(z*38+Math.sin(y*9)*2))**6;
 const scar=Math.abs(Math.sin(x*7+z*3))<.03&&y>1.0&&hash(Math.round(z*12))>.5;
 return scar?C.scar:mix(mix(C.hide,C.dark,crease*.6+(y<1.0?.2:0)),C.scar,hash(Math.round(x*50)+Math.round(y*50)*7+Math.round(z*50)*3)*.08);
};

function buildBody(){
 const P=pieces(),wither=L.frontLeg+.22,hip=L.hindLeg+.2;
 // the barrel slopes from tall withers down to the hips
 const tilt=Math.atan2(wither-hip,L.frontZ-L.hindZ);
 P.add(new THREE.CapsuleGeometry(.3,.62,10,20),at(0,(wither+hip)/2-.02,-.03,[Math.PI/2-tilt,0,0],[.9,1,1]),hidePaint);
 P.add(new THREE.SphereGeometry(.31,18,14),at(0,wither+.02,L.frontZ-.05,[0,0,0],[.95,1.08,.95]),hidePaint);
 P.add(new THREE.SphereGeometry(.3,18,14),at(0,hip,L.hindZ+.04,[0,0,0],[.95,.98,1]),hidePaint);
 // heavy folds of hide hanging behind the shoulder and before the thigh
 for(const [z,y,r] of [[.22,wither-.06,.33],[-.32,hip+.02,.31]])P.add(new THREE.TorusGeometry(r,.03,6,24),at(0,y,z,[-tilt,0,0],[.95,1,1]),C.fold);
 // the base of the neck: a thick, wrinkled column rising forward from the shoulders
 P.add(along([0,wither+.05,L.frontZ+.05],[0,wither+.4,L.frontZ+.32],.22,.17,16),null,hidePaint);
 for(let i=0;i<3;i++)P.add(new THREE.TorusGeometry(.2-i*.015,.02,5,20),at(0,wither+.12+i*.1,L.frontZ+.11+i*.08,[-.9,0,0]),C.fold);
 return P.merge();
}
function buildNeck(){
 // the upper neck, from the pivot up and forward to the poll
 const P=pieces();
 P.add(along([0,0,0],[0,.36,.26],.17,.12,16),null,hidePaint);
 for(let i=0;i<3;i++)P.add(new THREE.TorusGeometry(.155-i*.015,.016,5,18),at(0,.08+i*.1,.06+i*.07,[-.95,0,0]),C.fold);
 return P.merge();
}
function buildHead(){
 // small, hornless, long-skulled; built along +z and pitched down by the head group
 const H=pieces(),Lp=pieces(),J=pieces(),E=[pieces(),pieces()];
 H.add(new THREE.SphereGeometry(.13,16,12),at(0,0,.02,[0,0,0],[.82,.9,1.5]),hidePaint);
 H.add(along([0,-.02,.08],[0,-.05,.3],.1,.075,14),null,hidePaint);
 for(const s of [-1,1]){
  H.add(new THREE.SphereGeometry(.02,8,6),at(s*.095,.035,.06),C.eye);
  H.add(new THREE.BoxGeometry(.045,.012,.03),at(s*.093,.055,.06,[0,0,s*.25]),C.fold);  // heavy lids
  H.add(new THREE.SphereGeometry(.014,8,6),at(s*.04,-.03,.33,[0,0,0],[1,.6,.6]),C.fold); // nostrils
 }
 // the drooping prehensile upper lip, on its own handle so it can curl
 Lp.add(new THREE.SphereGeometry(.06,12,8),at(0,-.02,.035,[0,0,0],[1.05,.7,1.15]),C.lip);
 Lp.add(new THREE.ConeGeometry(.035,.07,8),at(0,-.055,.07,[Math.PI*.85,0,0],[1.1,1,.8]),C.lip);
 // lower jaw
 J.add(new THREE.SphereGeometry(.055,12,8),at(0,-.02,.08,[0,0,0],[.95,.55,1.5]),C.dark);
 // ears: one whole, one notched and torn
 for(const [i,s] of [-1,1].entries()){
  E[i].add(new THREE.ConeGeometry(.04,.12,6),at(0,.05,0,[0,0,0],[1,1,.45]),C.dark);
  if(s>0)E[i].add(new THREE.BoxGeometry(.02,.03,.03),at(.012,.08,.004),C.scar); // the torn notch shows paler
 }
 return {head:H.merge(),lip:Lp.merge(),jaw:J.merge(),ears:E.map(e=>e.merge())};
}
function buildLeg(len,front){
 const P=pieces();
 // a columnar leg with a knee, folds of hide, dried mud caked up from the foot, three hooved toes
 const paint=(x,y,z)=>y<-len*.55?mix(C.mud,C.dark,hash(Math.round(x*80)+Math.round(y*80)*5)*.4):hidePaint(x,y+len,z);
 P.add(new THREE.SphereGeometry(.13,14,10),at(0,-.02,0,[0,0,0],[1,1.4,1.1]),paint);
 P.add(along([0,0,0],[0,-len*.52,front?.02:-.03],.11,.085),null,paint);
 P.add(new THREE.SphereGeometry(.09,12,8),at(0,-len*.52,front?.02:-.03),paint);
 P.add(new THREE.TorusGeometry(.09,.015,5,16),at(0,-len*.45,0,[Math.PI/2,0,0]),C.fold);
 P.add(along([0,-len*.52,front?.02:-.03],[0,-len+.06,0],.08,.095),null,paint);
 P.add(new THREE.CylinderGeometry(.1,.11,.06,14),at(0,-len+.03,0),C.mud);
 for(const a of [-.7,0,.7])P.add(new THREE.SphereGeometry(.04,8,6),at(Math.sin(a)*.085,-len+.03,Math.cos(a)*.09,[0,0,0],[1,.8,1.15]),C.hoof);
 return P.merge();
}
function buildTail(){
 const P=pieces();
 P.add(along([0,0,0],[0,-.32,-.08],.035,.018,8),null,hidePaint);
 P.add(new THREE.ConeGeometry(.035,.09,6),at(0,-.36,-.09,[Math.PI,0,0]),C.dark);
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 shared={body:buildBody(),neck:buildNeck(),head:buildHead(),front:buildLeg(L.frontLeg,true),hind:buildLeg(L.hindLeg,false),tail:buildTail(),
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95})};
 return shared;
}
function mesh(parent,geo,name){const m=new THREE.Mesh(geo,shared.material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createBaluchitherium(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.name='baluchitherium';g.add(body);g.scale.setScalar(.78);body.position.z=-.25; // the long neck reaches forward, so the body sits back on its tile
 mesh(body,S.body,'body');
 const wither=L.frontLeg+.22;
 const neck=new THREE.Group();neck.position.set(0,wither+.4,L.frontZ+.32);body.add(neck);mesh(neck,S.neck,'neck');
 const head=new THREE.Group();head.position.set(0,.38,.3);head.rotation.x=.6;neck.add(head);mesh(head,S.head.head,'head');
 const lip=new THREE.Group();lip.position.set(0,-.05,.32);head.add(lip);mesh(lip,S.head.lip,'lip');
 const jaw=new THREE.Group();jaw.position.set(0,-.08,.1);head.add(jaw);mesh(jaw,S.head.jaw,'jaw');
 const ears=[-1,1].map((s,i)=>{const e=new THREE.Group();e.position.set(s*.08,.1,-.05);e.rotation.set(-.3,0,-s*.5);head.add(e);mesh(e,S.head.ears[i],'ear');return e;});
 const legs=[];
 for(const side of [-1,1]){
  const f=new THREE.Group();f.position.set(side*L.legX,L.frontLeg,L.frontZ);body.add(f);mesh(f,S.front,'leg');legs.push(f);
  const h=new THREE.Group();h.position.set(side*L.legX,L.hindLeg,L.hindZ);body.add(h);mesh(h,S.hind,'leg');legs.push(h);
 }
 const tail=new THREE.Group();tail.position.set(0,L.hindLeg+.3,L.hindZ-.3);body.add(tail);mesh(tail,S.tail,'tail');
 g.userData.browse=createBrowse({neck,lip,jaw,ears});
 g.userData.updateBaluchitherium=(t,dt)=>g.userData.browse.update(dt);
 return {g,body,legs,tail,wings:[],quirk:'idle',head,neck,lip,jaw,ears};
}

// Browsing: rest; now and then the neck stretches up (to ~.5 rad), the lip curls and grasps three or
// four times at nothing while the jaw chews, an ear flicks, then the neck eases back down.
export const BROWSE={reach:1.1,graze:2.4,lower:1.3};
export function createBrowse({neck,lip,jaw,ears},{seed=3}={}){
 let s=seed>>>0||1;const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
 let phase='rest',t=0,wait=3+rand()*5,lift=.45,flick=0;
 function update(dt){
  dt=Math.min(Math.max(dt||0,0),.1);t+=dt;let up=0,curl=0,chew=0;
  if(phase==='rest'){up=.02*Math.sin(t*.7);if(t>=wait){phase='browse';t=0;lift=.35+rand()*.25;flick=rand()<.5?0:1;}}
  else{
   const {reach,graze,lower}=BROWSE;
   if(t<reach)up=lift*ease(t/reach);
   else if(t<reach+graze){up=lift;const u=(t-reach)/graze;curl=Math.max(0,Math.sin(u*Math.PI*7))*.6;chew=Math.max(0,Math.sin(u*Math.PI*9))*.18;}
   else if(t<reach+graze+lower)up=lift*(1-ease((t-reach-graze)/lower));
   else{phase='rest';t=0;wait=4+rand()*7;}
  }
  neck.rotation.x=-up;lip.rotation.x=curl;jaw.rotation.x=chew;
  const e=ears[flick];if(e)e.rotation.y=phase==='browse'&&t>BROWSE.reach&&t<BROWSE.reach+.4?Math.sin((t-BROWSE.reach)*40)*.4:0;
  return {phase,up,curl,chew};
 }
 return {update,get phase(){return phase;}};
}
