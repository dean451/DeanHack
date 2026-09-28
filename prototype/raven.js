import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The raven shares the bats' letter, so it used to be the bat: a fur ball with
// membrane wings and red eyes. It is now a big glossy black corvid in flight,
// facing +z: a long body with a shaggy throat ruff, a heavy arched beak with
// nasal bristles, a wedge-shaped tail, legs tucked under it with curled talons,
// and broad wings of overlapping feathers. The outer primaries spread into
// separate "fingers". The upper sides have a blue-violet gloss, the flight
// feathers are silvery grey underneath and the tips are worn a little brown.
// Each moving part (body, head, tail, each leg and wing) is one merged,
// vertex-coloured mesh with a shared material, plus one small mesh for the eyes:
// 8 draws. The geometry is built once and shared by every raven.
// Handles: body, head, tail, legs, wings (userData.side ±1). It keeps the bat's
// 'bat' quirk, so the existing flap and hover drive it.

const C={
 black:rgb('#0d0d11'),gloss:rgb('#2b3868'),violet:rgb('#3a2c5c'),under:rgb('#3a3a42'),worn:rgb('#221e1a'),
 belly:rgb('#16151a'),beak:rgb('#09090b'),beakSheen:rgb('#3c3c44'),bristle:rgb('#1a1a20'),
 leg:rgb('#1c1c20'),scute:rgb('#34343a'),talon:rgb('#070707'),
};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);

// Plumage: the upper half of a piece picks up a blue gloss that drifts to violet
// along x, the lower half stays duller.
const plumage=(cy,under=C.belly)=>(x,y,z)=>y>=cy?mix(mix(C.black,mix(C.gloss,C.violet,clamp01(.5+x*3)),.55),C.black,clamp01(.3-(y-cy)*20)):mix(C.black,under,.5);

// One feather: a thin ellipsoid rooted at (rx,ry,rz), pointing along the unit
// direction (dx,0,dz) in the xz-plane. The top is glossy, the underside grey,
// and the last part of its length fades to a worn tip.
function feather(P,rx,ry,rz,dx,dz,len,width,thick,{under=C.under,wear=.35,tilt=0}={}){
 const cx=rx+dx*len/2,cz=rz+dz*len/2;
 P.add(new THREE.SphereGeometry(1,8,4),at(cx,ry,cz,[0,Math.atan2(dx,dz),tilt],[width/2,thick/2,len/2]),(x,y,z)=>{
  const t=((x-cx)*dx+(z-cz)*dz)/(len/2);
  const top=y>=ry?mix(C.black,mix(C.gloss,C.violet,clamp01(.5+(x-cx)*8)),.5):mix(C.black,under,.85);
  return mix(top,C.worn,clamp01((t-(1-wear))/wear)*.6);
 });
}

function buildBody(){
 const P=pieces();
 // long torso and a deep keel of a chest
 P.add(new THREE.SphereGeometry(.1,18,12),at(0,0,0,[0,0,0],[.8,.72,1.75]),plumage(-.01));
 P.add(new THREE.SphereGeometry(.08,14,10),at(0,-.012,.095,[0,0,0],[.92,.95,1.1]),plumage(0));
 // thick neck into the head
 P.add(new THREE.SphereGeometry(.058,12,8),at(0,.022,.175,[0,0,0],[1,1,1.1]),plumage(.02));
 // shaggy throat hackles, pointed and hanging back
 for(let k=0;k<7;k++){
  const u=(k-3)/3;
  P.add(new THREE.ConeGeometry(.016,.075,4),at(u*.028,-.035-Math.abs(u)*.006,.19-Math.abs(u)*.012,[-2.35+Math.abs(u)*.15,0,u*.35],[1,1,.45]),mix(C.black,C.gloss,.2+.1*(k%2)));
 }
 // rump coverts laid over the root of the tail
 for(let k=0;k<5;k++){const u=(k-2)/2;feather(P,u*.03,.012,-.12,u*.15,-1,.07,.05,.012,{wear:.1});}
 // flank feathers hiding the wing roots
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.05,10,6),at(s*.058,.01,.03,[0,0,0],[.55,.7,1.8]),plumage(.01));
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // flat-crowned skull with a slight peak at the back of the crown
 P.add(new THREE.SphereGeometry(.062,16,12),at(0,.01,.015,[0,0,0],[.88,.86,1.15]),plumage(.0));
 P.add(new THREE.SphereGeometry(.03,10,6),at(0,.05,-.02,[0,0,0],[1.1,.6,1.2]),mix(C.black,C.gloss,.45));
 // the massive arched beak: a deep upper mandible curving down to a hooked tip,
 // over a straighter lower mandible
 const bill=(x,y,z)=>mix(C.beak,C.beakSheen,clamp01((y-.008)*40)*clamp01(1.3-Math.abs(x)*80));
 P.add(new THREE.ConeGeometry(.028,.105,12),at(0,.002,.107,[Math.PI/2+.1,0,0],[.72,1,1.25]),bill);
 P.add(new THREE.SphereGeometry(.01,8,6),at(0,-.006,.156,[0,0,0],[.7,1,1.3]),bill);
 P.add(new THREE.ConeGeometry(.018,.085,10),at(0,-.021,.1,[Math.PI/2-.06,0,0],[.7,.8,1]),C.beak);
 // nasal bristles lying forward along the top of the beak
 for(let k=0;k<5;k++){const u=(k-2)/2;P.add(new THREE.ConeGeometry(.009,.05,4),at(u*.012,.02-Math.abs(u)*.004,.085,[Math.PI/2+.28,0,-u*.25],[1,1,.4]),C.bristle);}
 // loose feathers standing up on the nape
 for(let k=0;k<4;k++){const u=(k-1.5)/1.5;P.add(new THREE.ConeGeometry(.013,.05,4),at(u*.022,.03,-.045,[-2.1,0,u*.3],[1,1,.45]),C.black);}
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.011,10,8),at(s*.045,.024,.058),[1,1,1]);
 return P.merge();
}

// Wedge-shaped tail: seven broad feathers fanned, the middle ones longest.
function buildTail(){
 const P=pieces();
 for(let k=0;k<7;k++){
  const u=(k-3)/3,a=u*.34,len=.2-.055*Math.abs(u)**1.4;
  feather(P,u*.012,.006-.004*Math.abs(u),0,Math.sin(a),-Math.cos(a),len,.052,.008,{wear:.3});
 }
 // undertail coverts
 P.add(new THREE.SphereGeometry(.04,10,6),at(0,-.014,-.035,[0,0,0],[.9,.4,1.4]),C.belly);
 return P.merge();
}

// A cylinder (or cone, r1=0) from a to b.
function rod(P,a,b,r0,r1,colour){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const geo=r1>0?new THREE.CylinderGeometry(r1,r0,len,6):new THREE.ConeGeometry(r0,len,5);
 P.add(geo,new THREE.Matrix4().compose(A.clone().addScaledVector(d,.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()),new THREE.Vector3(1,1,1)),colour);
}

// A leg tucked back under the body in flight: feathered thigh, scaled shank,
// three front toes and one hind toe, each curled down to a black talon.
function buildLeg(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.024,8,6),at(0,0,0,[0,0,0],[1,1.2,1.3]),C.belly);
 const ankle=[0,-.034,-.05];
 rod(P,[0,-.01,-.012],ankle,.008,.007,(x,y,z)=>mix(C.leg,C.scute,(Math.sin(z*300)+1)/2*.6));
 for(const [dx,dz,len] of [[-.4,-.9,.03],[0,-1,.034],[.4,-.9,.03],[0,1,.02]]){
  const n=Math.hypot(dx,dz),k=len/n,mid=[ankle[0]+dx*k*.6,ankle[1]-.006,ankle[2]+dz*k*.6],tip=[ankle[0]+dx*k,ankle[1]-.018,ankle[2]+dz*k*.85];
  rod(P,ankle,mid,.005,.004,C.leg);rod(P,mid,tip,.004,0,C.talon);
 }
 return P.merge();
}

// A broad wing spread along ±x from the shoulder: a covered leading edge,
// secondaries along the trailing edge, and primaries spreading from the hand
// into separate fingers.
function buildWing(side){
 const P=pieces();
 const f=(rx,ry,rz,dx,dz,len,w,t,o)=>feather(P,side*rx,ry,rz,side*dx,dz,len,w,t,o);
 // leading edge: upper arm and forearm under their coverts
 P.add(new THREE.SphereGeometry(1,12,6),at(side*.075,.006,.006,[0,side*-.08,0],[.085,.017,.028]),plumage(.006));
 P.add(new THREE.SphereGeometry(1,12,6),at(side*.2,.004,.002,[0,side*.12,0],[.075,.014,.022]),plumage(.004));
 // secondaries along the trailing edge, drooping back from the arm
 for(let k=0;k<8;k++){const u=k/7;f(.035+u*.19,-.004,-.005+u*.004,.12*u,-1,.14+.02*u,.045,.006,{wear:.2});}
 // primaries from the hand, fanned from backward to outward, the outer ones
 // shorter and narrower so their tips stand apart as fingers
 const lens=[.17,.19,.205,.205,.19,.16],angles=[.55,.72,.9,1.08,1.25,1.42];
 for(let k=0;k<6;k++){const a=angles[k];f(.235+k*.009,-.002-k*.0008,-.004+k*.003,Math.sin(a),-Math.cos(a),lens[k],.042-k*.003,.006,{wear:.4});}
 // greater coverts over the bases of the flight feathers
 for(let k=0;k<9;k++){const u=k/8,a=.12+u*.6;f(.03+u*.24,.006,.0,Math.sin(a)*u,-Math.cos(a*u),.075,.05,.01,{under:C.black,wear:.1});}
 // lesser coverts along the leading edge and the alula at the wrist
 for(let k=0;k<8;k++){const u=k/7;f(.02+u*.24,.012,.014,.25,-1,.045,.045,.012,{under:C.black,wear:0});}
 f(.25,.012,.016,.7,-.7,.05,.022,.008,{under:C.black,wear:0});
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.08});
 const eye=new THREE.MeshStandardMaterial({color:0x1e140c,emissive:0x5a3a14,emissiveIntensity:.8,roughness:.08});
 shared={material,eye,body:buildBody(),head:buildHead(),eyes:buildEyes(),tail:buildTail(),leg:buildLeg(),wing:{'-1':buildWing(-1),'1':buildWing(1)}};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createRaven(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group();g.add(body);body.add(lift);
 g.scale.setScalar(.8);lift.position.y=.62;lift.rotation.x=.08;
 mesh(lift,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,.035,.215);lift.add(head);
 mesh(head,S.head,S.material,'head');mesh(head,S.eyes,S.eye,'eyes');
 const tail=new THREE.Group();tail.position.set(0,.004,-.155);lift.add(tail);mesh(tail,S.tail,S.material,'tail');
 const legs=[],wings=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.032,-.055,-.05);lift.add(leg);mesh(leg,S.leg,S.material,'leg');legs.push(leg);
  const wing=new THREE.Group();wing.position.set(s*.062,.03,.035);wing.userData.side=s;lift.add(wing);mesh(wing,S.wing[s],S.material,'wing');wings.push(wing);
 }
 return {g,body,legs,tail,wings,quirk:'bat',head};
}
