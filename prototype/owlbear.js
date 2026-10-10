import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The owlbear used to be the generic ape with a cone for a beak. It now has its own model: a
// hulking, hunched bear of dark umber fur, its breast barred like an owl's and a ruff of
// overlapping feathers round its neck and shoulders. The head is an owl's: a dished, pale facial
// disc rimmed in dark feathers under a heavy scowling brow, long jagged ear tufts swept up like
// horns, huge amber eyes with black pupils that glow, and a big hooked beak whose lower half is
// hinged (`jaw`). Feathered forearms end in broad paws with long hooked black talons; the bowed
// legs are feathered to the ankle and end in gripping talons.
//
// Whimsy lives in the motion: now and then the head swivels round far further than any bear's
// could, holds an unblinking stare, then snaps back with a little overshoot and a click of the
// beak (updateOwlbear, run from live.js). The swivel turns an inner `face` group, so poses that
// move the head group itself still add on top.
//
// Each moving part is one merged vertex-coloured mesh on one shared material, plus the eyes.
// Handles: body, head, face, jaw, legs, arms, arm, eyes. quirk 'orc' for the heavy idle bob.

const L={
 fur:'#5a3e26',dark:'#2e1f14',pale:'#b49a72',bar:'#3a2818',disc:'#cdb88e',rim:'#3a2618',
 beak:'#2a2420',beakTip:'#8a7a62',claw:'#141010',eye:'#ff8a1a',pupil:'#050403',
 hip:.56,shoulderY:1,shoulderX:.32,headY:1.16,headZ:.16,arm:.5,
};
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const UP=new THREE.Vector3(0,1,0);
const lathe=(profile,seg=26)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),seg);
function pointed(x,y,z,dir,s=[1,1,1]){
 const d=new THREE.Vector3(...dir).normalize();
 return new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromUnitVectors(UP,d),new THREE.Vector3(...s));
}
// A hooked talon: a cone bent into a claw by stacking three shrinking segments along a curve.
function talon(P,x,y,z,dir,len,r,C){
 const d=new THREE.Vector3(...dir).normalize(),down=new THREE.Vector3(0,-1,0);
 let p=new THREE.Vector3(x,y,z);
 for(let i=0;i<3;i++){
  const k=i/2,seg=len/3,dd=d.clone().lerp(down,k*.75).normalize();
  const c=p.clone().addScaledVector(dd,seg/2);
  P.add(new THREE.ConeGeometry(r*(1-i*.28),seg*1.15,5),pointed(c.x,c.y,c.z,dd.toArray()),C.claw);
  p.addScaledVector(dd,seg);
 }
}
function colours(){const C={};for(const [k,v] of Object.entries(L))if(typeof v==='string')C[k]=rgb(v);return C;}

function buildBody(C){
 const P=pieces(),h=L.hip;
 // the barrel: dark on the back, the breast barred pale and dark like an owl's
 const coat=(x,y,z)=>{
  if(z>.05&&y>h+.05&&y<h+.46){const band=Math.sin(y*90+Math.sin(x*30)*.8)>.25;return mix(band?C.bar:C.pale,C.fur,Math.min(1,Math.abs(x)*2.2));}
  return mix(C.fur,C.dark,z<-.06?.45:.1);
 };
 P.add(lathe([[0,h-.08],[.2,h-.08],[.25,h],[.27,h+.14],[.3,h+.3],[.31,h+.4],[.28,h+.47],[.2,h+.52],[.08,h+.55],[0,h+.555]]),at(0,0,.0,[.2,0,0],[1.08,1,.86]),coat);
 // the heavy shoulder hump
 P.add(new THREE.SphereGeometry(.18,16,10),at(0,h+.44,-.07,[0,0,0],[1.45,.75,.95]),(x,y,z)=>mix(C.fur,C.dark,z<-.12?.5:.15));
 // a ruff of overlapping feathers round the neck and shoulders: flat, pointed scales hanging down
 for(let i=0;i<46;i++){
  const a=(i/46)*Math.PI*2,ring=i%2,rr=.25+ring*.03;
  const x=Math.sin(a)*rr,z=Math.cos(a)*rr*.8+.02,y=h+.5-ring*.05;
  const out=[Math.sin(a)*.5,-1,Math.cos(a)*.5];
  P.add(new THREE.ConeGeometry(.045,.13,3),pointed(x+out[0]*.04,y-.05,z+out[2]*.04,out,[1,1,.3]),mix(C.pale,C.bar,hash(i*3.1)*.8+(z<0?.3:0)));
 }
 // shaggy fur down the flanks and back
 for(let i=0;i<30;i++){
  const a=(hash(i*1.9)-.5)*3.4+Math.PI,up=hash(i*2.7);
  const x=Math.sin(a)*.29,z=Math.cos(a)*.22,y=h+.08+up*.38;
  P.add(new THREE.ConeGeometry(.03,.1+hash(i*4.3)*.06,4),pointed(x,y,z,[Math.sin(a)*.5,-.9,Math.cos(a)*.4],[1,1,.55]),mix(C.fur,C.dark,hash(i*5.1)*.7));
 }
 // a stub of a feathered tail
 for(let i=0;i<5;i++)P.add(new THREE.ConeGeometry(.04,.16,3),pointed((i-2)*.045,h-.02,-.24,[ (i-2)*.15,-.5,-1],[1,1,.3]),mix(C.bar,C.pale,i%2?.5:0));
 return P.merge();
}

function buildHead(C){
 const P=pieces(),Q=pieces(),E=pieces();
 // skull: broad and round, darker behind
 P.add(new THREE.SphereGeometry(.17,18,14),at(0,0,0,[0,0,0],[1.08,.98,.95]),(x,y,z)=>mix(C.fur,C.dark,z<-.04?.4:0));
 // the facial disc: two dished pale discs side by side, rimmed in dark feathers, meeting in a V
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.1,18,10,0,Math.PI*2,0,Math.PI*.42),at(s*.065,.0,.11,[Math.PI/2+.1,0,s*-.15],[1,.35,1.1]),(x,y,z)=>{const r=Math.hypot(x-s*.065,y);return r>.085?C.rim:mix(C.disc,C.pale,r*6);});
  // heavy scowling brow ridge sloping down to the beak
  P.add(new THREE.BoxGeometry(.13,.035,.05),at(s*.06,.075,.15,[.2,s*-.25,s*.38]),C.dark);
  // long jagged ear tufts swept up and back like horns
  for(let k=0;k<3;k++)P.add(new THREE.ConeGeometry(.028-k*.006,.2-k*.04,4),pointed(s*(.11+k*.02),.16+k*.02,-.01-k*.03,[s*.35,1,-.45-k*.15],[1,1,.45]),mix(C.dark,C.bar,k*.3));
  // the eyes: huge amber irises, black pupils, sunk into the disc
  E.add(new THREE.SphereGeometry(.042,16,12),at(s*.068,.015,.13,[0,0,0],[1,1,.55]),C.eye);
  P.add(new THREE.SphereGeometry(.021,12,10),at(s*.068,.015,.152,[0,0,0],[1,1,.4]),C.pupil);
 }
 // the upper beak: a big hooked bill, dark horn with a pale tip, curving down
 P.add(new THREE.ConeGeometry(.045,.13,8),pointed(0,-.02,.2,[0,-.35,1],[1,1,.8]),C.beak);
 P.add(new THREE.ConeGeometry(.025,.08,6),pointed(0,-.07,.26,[0,-1,.25],[1,1,.8]),C.beakTip);
 // the lower beak (the jaw), hinged under the bill
 Q.add(new THREE.ConeGeometry(.034,.1,6),pointed(0,-.012,.05,[0,-.25,1],[1,1,.7]),C.beak);
 return {head:P.merge(),jaw:Q.merge(),eyes:E.merge()};
}

function buildArm(C,s){
 const P=pieces(),len=L.arm;
 P.add(new THREE.CylinderGeometry(.1,.12,len*.55,12),at(0,-len*.25,0),C.fur);
 P.add(new THREE.CylinderGeometry(.11,.095,len*.5,12),at(0,-len*.68,.05,[-.15,0,0]),C.fur);
 // feathered forearm: layered pointed feathers hanging down the back of the arm
 for(let i=0;i<14;i++){const y=-len*(.45+i*.035),a=(hash(i+s)-.5)*1.6;P.add(new THREE.ConeGeometry(.04,.12,3),pointed(Math.sin(a)*.1,y,Math.cos(a)*-.09+.04,[Math.sin(a)*.3,-1,-.3],[1,1,.3]),mix(C.pale,C.bar,i%2?.7:.2));}
 // broad paw with four long hooked talons
 P.add(new THREE.SphereGeometry(.1,14,10),at(0,-len-.02,.08,[0,0,0],[1.1,.75,1.15]),C.dark);
 for(let k=0;k<4;k++)talon(P,(k-1.5)*.045,-len-.04,.17,[(k-1.5)*.15,-.2,1],.16,.022,C);
 return P.merge();
}

function buildLeg(C,s){
 const P=pieces();
 // thick bowed thigh, feathered to the ankle
 P.add(new THREE.CylinderGeometry(.13,.15,.3,12),at(s*.02,-.15,0,[0,0,s*.1]),C.fur);
 for(let i=0;i<12;i++){const a=hash(i*2+s)*Math.PI*2;P.add(new THREE.ConeGeometry(.04,.11,3),pointed(Math.sin(a)*.13,-.18-hash(i)*.18,Math.cos(a)*.12,[Math.sin(a)*.3,-1,Math.cos(a)*.3],[1,1,.3]),mix(C.bar,C.pale,hash(i*7)*.6));}
 P.add(new THREE.CylinderGeometry(.11,.12,.18,12),at(0,-.4,.02),C.dark);
 // a broad foot gripping with three forward talons and one behind
 P.add(new THREE.SphereGeometry(.1,12,8),at(0,-.5,.07,[0,0,0],[1.1,.5,1.4]),C.dark);
 for(let k=0;k<3;k++)talon(P,(k-1)*.05,-.52,.17,[(k-1)*.25,-.1,1],.13,.02,C);
 talon(P,0,-.52,-.04,[0,-.1,-1],.09,.018,C);
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const C=colours(),h=buildHead(C);
 shared={body:buildBody(C),head:h.head,jaw:h.jaw,eyes:h.eyes,arms:[buildArm(C,-1),buildArm(C,1)],legs:[buildLeg(C,-1),buildLeg(C,1)],
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92}),
  eyeMaterial:new THREE.MeshStandardMaterial({color:L.eye,emissive:L.eye,emissiveIntensity:2.4,roughness:.25})};
 return shared;
}
function mesh(parent,geo,mat,name){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createOwlbear(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.name='owlbear';g.add(body);g.scale.setScalar(1.12);body.position.y=.04; // the talons rest on the floor
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,L.headY,L.headZ);body.add(head);
 const face=new THREE.Group();head.add(face);
 mesh(face,S.head,S.material,'head');
 const jaw=new THREE.Group();jaw.position.set(0,-.05,.17);face.add(jaw);mesh(jaw,S.jaw,S.material,'jaw');
 const eyes=mesh(face,S.eyes,S.eyeMaterial,'eyes');eyes.castShadow=false;
 const legs=[],arms=[];
 for(const [i,s] of [-1,1].entries()){
  const leg=new THREE.Group();leg.position.set(s*.14,L.hip,0);body.add(leg);mesh(leg,S.legs[i],S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*L.shoulderX,L.shoulderY,.06);arm.rotation.z=s*.12;arm.rotation.x=-.25;body.add(arm);mesh(arm,S.arms[i],S.material,'arm');arms.push(arm);
 }
 g.userData.owlbear=createSwivel(face,jaw);
 g.userData.updateOwlbear=(t,dt)=>g.userData.owlbear.update(dt);
 return {g,body,legs,tail:null,wings:[],quirk:'orc',arms,arm:arms[1],weaponSocket:null,head,face,jaw,eyes,hat:null,beard:null,pick:null};
}

// The owl's head turn: rest, a sharp snap round (up to ~150 degrees), an unblinking hold, a snap
// back past centre and settle, with a double click of the beak on the way home. Sometimes a
// quick sideways cock of the head instead. Deterministic for a seed so tests can follow it.
export const SWIVEL={snap:.22,back:.3,settle:.35};
export function createSwivel(face,jaw,{seed=9}={}){
 let s=seed>>>0||1;const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 let phase='rest',t=0,wait=2+rand()*4,turn=0,hold=0,cock=0;
 const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
 function update(dt){
  dt=Math.min(Math.max(dt||0,0),.1);t+=dt;
  let yaw=0,tilt=0,clack=0;
  if(phase==='rest'){if(t>=wait){phase=rand()<.75?'turn':'cock';t=0;turn=(rand()<.5?-1:1)*(1.6+rand()*1);hold=.8+rand()*1.1;cock=(rand()<.5?-1:1)*(.35+rand()*.2);}}
  if(phase==='turn'){
   if(t<SWIVEL.snap)yaw=turn*ease(t/SWIVEL.snap);
   else if(t<SWIVEL.snap+hold)yaw=turn;
   else if(t<SWIVEL.snap+hold+SWIVEL.back){const u=(t-SWIVEL.snap-hold)/SWIVEL.back;yaw=turn*(1-ease(u))-turn*.12*Math.sin(u*Math.PI);}
   else if(t<SWIVEL.snap+hold+SWIVEL.back+SWIVEL.settle){const u=(t-SWIVEL.snap-hold-SWIVEL.back)/SWIVEL.settle;yaw=-turn*.12*(1-ease(u))*Math.cos(u*Math.PI*.5);clack=Math.max(0,Math.sin(u*Math.PI*4))*.35;}
   else{phase='rest';t=0;wait=3+rand()*6;}
  }else if(phase==='cock'){
   const dur=1.2;if(t<dur)tilt=cock*Math.sin(Math.PI*Math.min(1,t/dur));else{phase='rest';t=0;wait=3+rand()*5;}
  }
  face.rotation.y=yaw;face.rotation.z=tilt;if(jaw)jaw.rotation.x=clack;
  return {phase,yaw,tilt,clack};
 }
 return {update,get phase(){return phase;}};
}
