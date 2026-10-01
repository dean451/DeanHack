import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Cthulhu (UnNetHack's gigantic Great Old One, an 'h') used to fall back on the small generic
// humanoid of its letter. It now stands half again a man's height, hunched forward: a rubbery,
// scaled green hide over a lean, ridged chest with pale banded belly plates, a row of jagged black
// spines down the hunched back, and heavy shoulders. The head is a swollen, warty octopus mantle
// swept up and back, with heavy brows over deep sockets and slanted amber eyes that glow out of
// them; a beard of eight tapering, curling tentacles hangs from the hidden maw over the chest, the
// middle ones longest, their outer faces studded with pale suckers. Long arms hang almost to the
// floor and end in four-fingered hands with long hooked black claws, a ridge of spines along each
// forearm. Thick legs end in clawed, three-toed feet. Two narrow, ragged bat wings rise half folded
// from the shoulder blades, the membrane torn into jagged points between the finger bones.
// Each moving part (body, head, tentacles, each leg, arm and wing) is one merged, vertex-coloured
// mesh sharing one material, plus one glowing mesh for the eyes: 10 draws. Geometry is built once
// and shared.
// Handles: body, head, tail (the tentacle beard, pivoting at the maw like the mind flayer's), legs,
// arms, arm (right), weaponSocket (empty, at the right palm), wings (left, right).

const HIDE=rgb('#2e5a32'),HIDE_DARK=rgb('#11261a'),HIDE_HI=rgb('#5c9a4a'),BELLY=rgb('#8aa466'),BELLY_DARK=rgb('#465e34');
const SUCKER=rgb('#cfcaa0'),CLAW=rgb('#0e0d0b'),CLAW_HI=rgb('#4e4a3e'),SPINE=rgb('#121a12'),MAW=rgb('#1c0a0e');
const MEMBRANE=rgb('#16301e'),MEMBRANE_HI=rgb('#3a6438'),EYE=rgb('#ffd27a');
const SCALE=1.5;

const hash=(a,b=0)=>{const h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
const lathe=(profile,segments=28)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
const V=p=>new THREE.Vector3(...p);
// a tube that narrows from r0 to r1 along a smooth curve through pts
function taper(pts,r0,r1,segments=16,radial=7){
 const curve=new THREE.CatmullRomCurve3(pts.map(V)),geo=new THREE.TubeGeometry(curve,segments,1,radial,false);
 const p=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<=segments;i++){const t=i/segments,r=r0+(r1-r0)*t;curve.getPointAt(t,c);for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(p,k).sub(c).multiplyScalar(r).add(c);p.setXYZ(k,v.x,v.y,v.z);}}
 return {geo,curve};
}
const tris=(vertices,index)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(index);g.computeVertexNormals();return g;};
// tip a geometry forward (+z) about a pivot height, for the hunch
const lean=(geo,a,y)=>geo.translate(0,-y,0).rotateX(a).translate(0,y,0);
// rubbery scaled hide: small cells, dark in the seams, with a mottle
const hide=(x,y,z)=>{
 const cell=Math.abs(Math.sin(x*44+Math.sin(z*30))*Math.sin(y*44+z*28));
 return mix(HIDE_DARK,mix(HIDE,HIDE_HI,hash(Math.floor(x*14),Math.floor(y*14+z*14))*.45),.35+cell*.65);
};

function buildBody(){
 const P=pieces();
 // hips, and a lean torso swelling to a broad chest, hunched forward from the waist
 P.add(lathe([[.05,.4],[.15,.42],[.17,.48],[.16,.56]]),at(0,0,0,[0,0,0],[1.05,1,.85]),hide);
 const chest=lean(lathe([[.15,.5],[.155,.58],[.185,.68],[.225,.79],[.235,.87],[.2,.93],[.13,.975],[.07,.99]],34),.2,.45);
 P.add(chest,at(0,0,0,[0,0,0],[1.08,1,.8]),(x,y,z)=>{
  // banded belly plates down the front; ribs ridging the flanks
  if(z>.06+(y-.45)*.2&&Math.abs(x)<.11+(y-.5)*.12)return mix(BELLY_DARK,BELLY,Math.sin(y*95)>-.4?.85:.15);
  return Math.abs(x)>.14&&y>.62&&y<.84?mix(hide(x,y,z),HIDE_DARK,Math.sin(y*80)>.3?.5:0):hide(x,y,z);
 });
 // heavy shoulders, and the neck thrust forward
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.1,14,10),at(s*.2,.87,.07,[0,0,s*.3],[1.15,.85,1]),hide);
 P.add(new THREE.CylinderGeometry(.075,.1,.12,14),at(0,.97,.12,[.5,0,0]),hide);
 // jagged black spines down the hunched back, longest between the shoulders
 for(let i=0;i<8;i++){
  const y=.52+i*.06,len=.05+Math.sin(i/7*Math.PI)*.06,r=.15+(y-.5)*.22;
  const z=-.78*Math.min(r,.2)+(y-.45)*.2-.005;
  P.add(new THREE.ConeGeometry(.018+len*.15,len,5),at((i%2?.012:-.012),y+.01,z,[-1.05-(i%3)*.12,0,(i%2?.15:-.15)]),(x,yy)=>yy>y+len*.2?SPINE:HIDE_DARK);
 }
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the mantle: a swollen, warty dome swept up and back over the face
 const mantle=new THREE.SphereGeometry(.15,28,20);
 {const p=mantle.attributes.position;for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),w=1+.045*Math.sin(x*70)*Math.sin(y*60+z*50)+.03*Math.sin(z*90+x*40);
  p.setXYZ(i,x*w,y*w,z*w);
 }mantle.computeVertexNormals();}
 P.add(mantle,at(0,.19,-.07,[-.65,0,0],[.95,1.2,1.3]),(x,y,z)=>mix(hide(x,y,z),HIDE_DARK,Math.max(0,y-.25)*3));
 // the face beneath it, heavy brows ridged over deep sockets
 P.add(new THREE.SphereGeometry(.1,20,14),at(0,.07,.075,[0,0,0],[1,.85,.9]),hide);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.032,10,8),at(s*.048,.118,.15,[0,0,s*-.4],[1.7,.5,.7]),HIDE_DARK);
  P.add(new THREE.SphereGeometry(.024,10,8),at(s*.046,.09,.152,[0,0,s*.3],[1.3,.7,.5]),MAW);
  // gill slits behind the jaw
  for(let k=0;k<3;k++)P.add(new THREE.BoxGeometry(.004,.04,.016),at(s*(.085-k*.004),.04,.04-k*.025,[0,s*.3,0]),HIDE_DARK);
 }
 // the hidden maw the tentacles fall from
 P.add(new THREE.SphereGeometry(.045,14,8),at(0,.015,.135,[0,0,0],[1.3,.6,.6]),MAW);
 return P.merge();
}

function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.016,10,8),at(s*.046,.09,.166,[0,0,s*.3],[1.35,.55,.5]),EYE);
 return P.merge();
}

// eight tentacles across the maw, the middle ones longest, curling out at the tips; suckers stud
// their outer faces from halfway down
function buildTentacles(){
 const P=pieces();
 for(let i=0;i<8;i++){
  const a=(i-3.5)/3.5,side=Math.sign(a)||1,len=.46-Math.abs(a)*.2+hash(i,3)*.04;
  const x=a*.07,z=-.02+Math.cos(a)*.02,curl=side*(.012+hash(i,5)*.016);
  const pts=[[x,0,z],[x*1.25,-len*.25,z+.04],[x*1.4+curl*.3,-len*.55,z+.07],[x*1.5+curl,-len*.85,z+.11],[x*1.55+curl*1.7,-len*.93,z+.16],[x*1.5+curl*2,-len*.86,z+.19]];
  const {geo,curve}=taper(pts,.024-Math.abs(a)*.004,.003,20,7);
  P.add(geo,null,(px,py)=>mix(HIDE_DARK,mix(HIDE,BELLY_DARK,.4),Math.min(1,-py/len*1.2)));
  for(let k=0;k<6;k++){
   const t=.42+k*.09,c=curve.getPointAt(t),r=(.024-.021*t)*.75;
   P.add(new THREE.SphereGeometry(r,6,4),at(c.x,c.y,c.z+r*1.1,[0,0,0],[1,1,.45]),SUCKER);
  }
 }
 return P.merge();
}

// a thick thigh, a backswept shin and a clawed three-toed foot
function buildLeg(){
 const P=pieces();
 P.add(taper([[0,.02,0],[0,-.12,.03],[0,-.23,.04]],.09,.068,8,12).geo,null,hide);
 P.add(new THREE.SphereGeometry(.068,12,10),at(0,-.23,.04),hide);
 P.add(taper([[0,-.23,.04],[0,-.34,0],[0,-.43,-.02]],.064,.05,8,12).geo,null,(x,y,z)=>z>.02&&Math.sin(y*90)>0?HIDE_DARK:hide(x,y,z));
 P.add(new THREE.SphereGeometry(.055,12,8),at(0,-.448,.035,[0,0,0],[1.05,.42,1.55]),hide);
 for(const dx of [-.032,0,.032]){
  P.add(new THREE.ConeGeometry(.013,.075,6),at(dx,-.455,.12+(dx?0:.01),[Math.PI/2+.4,dx*4,0]),(x,y,z)=>z>.13?CLAW:CLAW_HI);
 }
 P.add(new THREE.ConeGeometry(.011,.05,6),at(0,-.45,-.05,[-Math.PI/2-.4,0,0]),CLAW);
 return P.merge();
}

// a long arm hanging nearly to the floor, a ridge of spines down the forearm, and a hand of four
// long fingers ending in hooked black claws
function buildArm(s){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.078,14,10),at(0,-.01,0),hide);
 P.add(taper([[0,0,0],[0,-.14,.01],[0,-.27,.02]],.065,.047,8,12).geo,null,hide);
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.27,.02),hide);
 P.add(taper([[0,-.27,.02],[0,-.4,.045],[0,-.51,.06]],.05,.038,8,12).geo,null,hide);
 for(let k=0;k<4;k++)P.add(new THREE.ConeGeometry(.01,.045-k*.006,5),at(s*.04,-.31-k*.05,.03+k*.008,[0,0,s*-(Math.PI/2+.5)]),SPINE);
 P.add(new THREE.SphereGeometry(.048,12,10),at(0,-.55,.065,[0,0,0],[.95,1.15,.6]),hide);
 for(let k=0;k<4;k++){
  const dx=(k-1.5)*.022,spread=(k-1.5)*.012;
  const pts=[[dx,-.57,.07],[dx+spread,-.63,.09],[dx+spread*1.6,-.69,.085],[dx+spread*1.9,-.72,.06]];
  const {geo,curve}=taper(pts,.013,.008,8,6);
  P.add(geo,null,hide);
  const tip=curve.getPointAt(1),dir=curve.getTangentAt(1);
  // the claw hooks on past the fingertip, curling back toward the palm
  const claw=new THREE.ConeGeometry(.009,.06,6).translate(0,.03,0);
  claw.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().add(new THREE.Vector3(0,0,-.6)).normalize()));
  P.add(claw,at(tip.x,tip.y,tip.z),(x,y)=>y<tip.y-.025?CLAW:CLAW_HI);
 }
 // the thumb, set back and turned in
 P.add(taper([[s*-.04,-.55,.08],[s*-.055,-.6,.1],[s*-.05,-.64,.11]],.012,.007,6,6).geo,null,hide);
 P.add(new THREE.ConeGeometry(.008,.045,6),at(s*-.05,-.66,.105,[.3,0,s*-.2]).multiply(at(0,0,0,[Math.PI,0,0])),CLAW);
 return P.merge();
}

// a narrow bat wing for side s, rooted at the shoulder blade, half folded and rising behind:
// an arm bone to the wrist, three finger bones fanning from it, and a membrane torn into jagged
// points between them
function buildWing(s){
 const P=pieces(),R=[0,0,0],E=[s*.1,.17,-.08],B=[s*.03,-.13,-.03];
 const F=[[s*.24,.38,-.17],[s*.27,.15,-.2],[s*.18,-.05,-.15]];
 P.add(taper([R,[s*.06,.1,-.03],E],.02,.013,8,7).geo,null,HIDE_DARK);
 P.add(new THREE.ConeGeometry(.012,.06,5),at(E[0]+s*.01,E[1]+.03,E[2],[0,0,s*-.35]),CLAW);
 for(const f of F)P.add(taper([E,[(E[0]+f[0])/2,(E[1]+f[1])/2+.02,(E[2]+f[2])/2],f],.011,.003,8,5).geo,null,HIDE_DARK);
 // the membrane's edge: from the top finger round to the body, sagging inward between the tips
 // with a torn spike at the middle of each sag
 const edge=[F[0]],ends=[...F,B];
 const toward=(p,q,k)=>p.map((v,i)=>v+(q[i]-v)*k);
 for(let i=0;i<3;i++){
  const p=ends[i],q=ends[i+1],mid=t=>p.map((v,j)=>v+(q[j]-v)*t);
  edge.push(toward(mid(.3),E,.32),toward(mid(.5),E,.12),toward(mid(.7),E,.36),q);
 }
 const verts=[...E,...R],index=[];
 edge.forEach(p=>verts.push(...p));
 for(let i=0;i<edge.length-1;i++)index.push(0,i+2,i+3);
 index.push(0,edge.length+1,1);
 P.add(tris(verts,index),null,(x,y,z)=>mix(MEMBRANE,MEMBRANE_HI,.3+.4*Math.abs(Math.sin(Math.atan2(y-E[1],x-E[0])*9))));
 return P.merge();
}

let S=null;
function geometry(){
 if(!S)S={
  body:buildBody(),head:buildHead(),eyes:buildEyes(),tentacles:buildTentacles(),leg:buildLeg(),
  arms:[buildArm(-1),buildArm(1)],wings:[buildWing(-1),buildWing(1)],
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.06,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({vertexColors:true,color:0xffd27a,emissive:0xff9a20,emissiveIntensity:2.4,roughness:.3}),
 };
 return S;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createCthulhu(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(SCALE);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,1,.15);body.add(head);
 mesh(head,S.head,S.material,'head');
 const eyes=mesh(head,S.eyes,S.glow,'eyes');eyes.castShadow=false;
 const tail=new THREE.Group();tail.position.set(0,.015,.14);head.add(tail);
 mesh(tail,S.tentacles,S.material,'tentacles');
 const legs=[],arms=[],wings=[];
 [-1,1].forEach((s,i)=>{
  const leg=new THREE.Group();leg.position.set(s*.1,.47,0);body.add(leg);mesh(leg,S.leg,S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.27,.87,.08);arm.rotation.set(-.08,0,s*.04);body.add(arm);mesh(arm,S.arms[i],S.material,'arm');arms.push(arm);
  const wing=new THREE.Group();wing.position.set(s*.11,.86,-.1);wing.userData.side=s;body.add(wing);mesh(wing,S.wings[i],S.material,'wing');wings.push(wing);
 });
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.56,.07);arms[1].add(weaponSocket);
 return {g,body,legs,tail,wings,quirk:'idle',kind:'cthulhu',arms,arm:arms[1],weaponSocket,head};
}
