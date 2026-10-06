import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The disintegrator (UnNetHack's bright-green cousin of the rust monster, an 'R' whose touch
// unmakes what it hits) used to be a green-tinted rust monster. It is now a bigger, meaner thing:
// a low body under six overlapping obsidian-green carapace plates, each with a jagged dorsal blade
// and two side shards, the seams between them split open on a green inner light. Its back is coming
// apart: the two rear plates are broken into separate shards that have lifted off the body, and
// flakes of shell hang in the air above the rump, some still dark, some already burning down to
// green motes. The head is a low wedge with swept-back horn ridges, three pairs of small green eyes,
// and a maw of four hooked mandibles round a glowing throat. Its two feelers are long and knuckled,
// barbed along their length, each ending in a three-pronged fork. It stands high on four spindly,
// jointed legs with a spur at each knee and needle points for feet, and its tail ends in a vane of
// two serrated sickle blades.
// Each moving part (body, head, each feeler, each leg, tail, vane) is one merged, vertex-coloured
// mesh sharing one material, plus one glowing mesh on the body (the seams and motes) and one on the
// head (eyes and throat): 12 draws. Geometry is built once and shared.
// Handles match rustMonster() in creatures.js, so rust-feel.js drives it too: body, legs, tail,
// feelers (two groups pivoting at their roots on the head), feelHead, vane, rustFeel.

const SHELL=rgb('#16241a'),SHELL_HI=rgb('#36583e'),SHELL_EDGE=rgb('#5e8a5a'),HIDE=rgb('#0c140f'),HIDE_HI=rgb('#22342a');
const BLADE=rgb('#070a08'),BLADE_HI=rgb('#4a6650'),GLOW=rgb('#c8ff9a'),MOTE=rgb('#7cff5a');
const SCALE=1.35,Y=.3;

const hash=(a,b=0)=>{const h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
const V=p=>new THREE.Vector3(...p);
// a tube that narrows from r0 to r1 along a smooth curve through pts
function taper(pts,r0,r1,segments=12,radial=6){
 const curve=new THREE.CatmullRomCurve3(pts.map(V)),geo=new THREE.TubeGeometry(curve,segments,1,radial,false);
 const p=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<=segments;i++){const t=i/segments,r=r0+(r1-r0)*t;curve.getPointAt(t,c);for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(p,k).sub(c).multiplyScalar(r).add(c);p.setXYZ(k,v.x,v.y,v.z);}}
 return {geo,curve};
}
// a cone from base point a to tip b
function spike(a,b,r,radial=5){
 const dir=V(b).sub(V(a)),len=dir.length(),geo=new THREE.ConeGeometry(r,len,radial);
 geo.translate(0,len/2,0);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()));
 return geo.translate(...a);
}
// chitin: dark with a faint crazing, paler towards the plate rims
const chitin=(x,y,z)=>{const c=Math.abs(Math.sin(x*61+z*23)*Math.sin(z*57-y*31));return mix(SHELL,SHELL_HI,c>.85?.7:.15*hash(x*9,z*7));};
const hide=(x,y,z)=>mix(HIDE,HIDE_HI,.3+.3*Math.sin(x*40+z*50));
const bladeTone=(x,y,z)=>mix(BLADE,BLADE_HI,.25*hash(x*31+y*7,z*13));

// the six plates, front to back: z, half-width, crown height
const PLATES=[0,1,2,3,4,5].map(i=>({z:.22-i*.085,w:.215-Math.abs(i-2)*.018,y:Y+.035-Math.abs(i-2)*.01}));

function buildBody(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.2,24,14),at(0,Y,0,[0,0,0],[.85,.6,1.4]),hide);
 P.add(new THREE.SphereGeometry(.13,18,10),at(0,Y-.08,.02,[0,0,0],[.8,.4,1.25]),HIDE_HI);
 PLATES.forEach(({z,w,y},i)=>{
  const crumbling=i>=4,arch=(phiStart,phiLen,lift,dx)=>{
   const geo=new THREE.SphereGeometry(w,20,8,phiStart,phiLen,0,Math.PI/2);
   P.add(geo,at(dx,y+lift,z,[-.25,0,0],[1,.55,.4]),(x,yy)=>mix(chitin(x,yy,z),SHELL_EDGE,yy<Y+.02?.5:0));
  };
  if(!crumbling)arch(0,Math.PI*2,0,0);
  else{
   // broken into three shards with gaps between them, lifted off the body as they come apart
   const n=3,gap=.32,len=(Math.PI*2-gap*n)/n;
   for(let k=0;k<n;k++){const a=k*(len+gap)+.4*i,mid=a+len/2;arch(a,len,.025+.02*(i-4)+.015*k,Math.cos(mid)*.012);}
  }
  // a jagged dorsal blade raked back, and a shard each side
  const top=y+w*.55,h=.07+.05*hash(i,1)+(i===1||i===2?.03:0);
  if(!crumbling||i===4)P.add(spike([0,top-.02,z],[0,top+h,z-.06-.02*hash(i,2)],.022,4),null,bladeTone);
  for(const s of [-1,1]){const r=w*.78;P.add(spike([s*r,y+.03,z],[s*(r+.05+.03*hash(i,s)),y+.06+.03*hash(s,i),z-.04],.014,4),null,bladeTone);}
 });
 // dark flakes of shell drifting above the rump
 for(let k=0;k<7;k++){
  const x=(hash(k,11)-.5)*.26,y=Y+.2+hash(k,12)*.2,z=-.18-hash(k,13)*.14;
  P.add(new THREE.TetrahedronGeometry(.018+.012*hash(k,14)),at(x,y,z,[hash(k,15)*6,hash(k,16)*6,0],[1.4,.35,1]),chitin);
 }
 return P.merge();
}

// the green light: the open seams between the plates, and the motes the shell is burning down to
function buildBodyGlow(){
 const P=pieces();
 for(let i=0;i<PLATES.length-1;i++){
  const a=PLATES[i],b=PLATES[i+1],z=(a.z+b.z)/2-.01,w=Math.min(a.w,b.w)*1.02,y=Math.min(a.y,b.y),pts=[];
  for(let k=0;k<=8;k++){const t=.3+(Math.PI-.6)*k/8,j=(hash(i,k)-.5)*.012;pts.push([Math.cos(t)*w,y+Math.sin(t)*w*.55+j,z+j]);}
  P.add(taper(pts,.007,.007,16,4).geo,null,GLOW);
 }
 // the spine split open over the crumbling rump
 P.add(taper([[0,Y+.12,-.2],[.01,Y+.125,-.25],[-.008,Y+.115,-.3],[0,Y+.09,-.34]],.009,.004,10,4).geo,null,GLOW);
 for(let k=0;k<11;k++){
  const x=(hash(k,21)-.5)*.32,y=Y+.17+hash(k,22)*.32,z=-.12-hash(k,23)*.22;
  P.add(new THREE.OctahedronGeometry(.007+.007*hash(k,24)),at(x,y,z,[hash(k,25)*6,hash(k,26)*6,0]),MOTE);
 }
 return P.merge();
}

function buildHead(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.11,20,12),at(0,0,0,[0,0,0],[1,.68,1.3]),chitin);
 P.add(new THREE.SphereGeometry(.075,14,8),at(0,-.035,.05,[0,0,0],[.9,.5,1.1]),hide);
 for(const s of [-1,1]){
  // horn ridges swept back over the neck, jagged along their tops
  P.add(taper([[s*.04,.05,.08],[s*.07,.075,0],[s*.09,.09,-.1],[s*.1,.12,-.17]],.016,.003,10,5).geo,null,bladeTone);
  for(let k=0;k<3;k++)P.add(spike([s*(.055+k*.014),.065+k*.008,.04-k*.05],[s*(.06+k*.016),.1+k*.012,.01-k*.05],.007,4),null,bladeTone);
 }
 // four hooked mandibles round the maw, closing in on the throat
 for(let k=0;k<4;k++){
  const a=Math.PI/4+k*Math.PI/2,cx=Math.cos(a)*.04,cy=Math.sin(a)*.03-.02;
  P.add(taper([[cx,cy,.11],[cx*1.3,cy*1.3,.15],[cx*.6,cy*.6,.19]],.012,.002,8,5).geo,null,bladeTone);
 }
 // the throat's dark rim
 P.add(new THREE.TorusGeometry(.03,.008,6,14),at(0,-.02,.125,[0,0,0],[1,.8,1]),BLADE);
 return P.merge();
}
function buildHeadGlow(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.026,12,8),at(0,-.02,.12,[0,0,0],[1,.8,.6]),GLOW);
 for(const s of [-1,1])[[.04,.045,.1,.014],[.062,.038,.082,.012],[.08,.026,.06,.01]].forEach(([x,y,z,r])=>P.add(new THREE.SphereGeometry(r,8,6),at(s*x,y,z),GLOW));
 return P.merge();
}

// a feeler for side s, from its root on the brow: knuckled, barbed, ending in a three-pronged fork
function buildFeeler(s){
 const P=pieces(),pts=[[0,0,0],[s*.04,.11,.03],[s*.1,.2,.09],[s*.15,.25,.17],[s*.19,.24,.24]];
 const {geo,curve}=taper(pts,.013,.006,20,6);P.add(geo,null,bladeTone);
 for(let i=1;i<9;i++){
  const t=i/9,p=curve.getPointAt(t),d=curve.getTangentAt(t);
  P.add(new THREE.SphereGeometry(.012-.005*t,8,6),at(p.x,p.y,p.z,[0,0,0],[1,1,1.3]),SHELL_HI);
  const side=i%2?1:-1,b=p.clone().add(d.clone().multiplyScalar(-.035)).add(new THREE.Vector3(side*.025,.012,0));
  P.add(spike([p.x,p.y,p.z],[b.x,b.y,b.z],.004,3),null,BLADE);
 }
 const tip=curve.getPointAt(1),d=curve.getTangentAt(1);
 P.add(new THREE.SphereGeometry(.012,8,6),at(tip.x,tip.y,tip.z),SHELL_EDGE);
 for(let k=0;k<3;k++){
  const a=k*Math.PI*2/3,off=new THREE.Vector3(Math.cos(a)*.025,Math.sin(a)*.025,0),end=tip.clone().add(d.clone().multiplyScalar(.045)).add(off);
  P.add(spike([tip.x,tip.y,tip.z],[end.x,end.y,end.z],.005,4),null,BLADE);
 }
 return P.merge();
}

// a spindly jointed leg for side s, hip at the origin: up and out to a spurred knee, then down to a needle foot on the floor
function buildLeg(s){
 const P=pieces(),hip=[0,0,0],knee=[s*.13,.07,0],foot=[s*.19,-(Y-.06),0];
 P.add(new THREE.SphereGeometry(.035,10,8),null,chitin);
 P.add(taper([hip,[s*.07,.06,0],knee],.028,.018,8,6).geo,null,chitin);
 P.add(new THREE.SphereGeometry(.02,8,6),at(...knee),SHELL_EDGE);
 P.add(spike(knee,[knee[0]+s*.02,knee[1]+.07,knee[2]-.02],.009,4),null,bladeTone);
 P.add(taper([knee,[s*.17,-.06,0],foot],.017,.002,10,6).geo,null,bladeTone);
 return P.merge();
}

// the tail stalk, root at the origin, running back along −z; a barb on each segment
function buildTail(){
 const P=pieces();
 for(let i=0;i<5;i++){
  const r=.045-i*.007,z=-.025-i*.045;
  P.add(new THREE.CylinderGeometry(r*.85,r,.05,10),at(0,0,z,[Math.PI/2,0,0]),i%2?chitin:hide);
  P.add(spike([0,r*.8,z],[0,r+.035-i*.004,z-.03],.007,4),null,bladeTone);
 }
 return P.merge();
}
export const VANE_Z=-.25;
// the vane: two serrated sickle blades round a hub, in the plane across the tail (it rolls about z)
function buildVane(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.03,10,8),null,chitin);
 const sh=new THREE.Shape();
 sh.moveTo(0,-.02);sh.quadraticCurveTo(.13,-.03,.2,.07);
 // the trailing edge, serrated back towards the hub
 for(let k=1;k<=5;k++){const t=k/5,x=.2-.18*t,y=.07-.05*t;sh.lineTo(x+.012,y+.035);sh.lineTo(x,y+.012);}
 sh.lineTo(0,.02);
 for(const a of [0,Math.PI]){
  const geo=new THREE.ExtrudeGeometry(sh,{depth:.01,bevelEnabled:false,curveSegments:8});geo.translate(0,0,-.005);
  P.add(geo,at(0,0,0,[0,0,a]).multiply(at(0,0,0,[.35,0,0])),(x,y,z)=>mix(BLADE,BLADE_HI,Math.hypot(x,y)>.15?.6:.15));
 }
 return P.merge();
}

let S=null;
function geometry(){
 if(!S)S={
  body:buildBody(),bodyGlow:buildBodyGlow(),head:buildHead(),headGlow:buildHeadGlow(),
  feelers:[buildFeeler(-1),buildFeeler(1)],legs:[buildLeg(-1),buildLeg(1)],tail:buildTail(),vane:buildVane(),
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:.3,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({vertexColors:true,color:0xb8ff90,emissive:0x46ff3a,emissiveIntensity:2.2,roughness:.3}),
 };
 return S;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createDisintegrator(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(SCALE);
 mesh(body,S.body,S.material,'body');
 mesh(body,S.bodyGlow,S.glow,'seams').castShadow=false;
 const head=new THREE.Group();head.position.set(0,Y-.02,.27);body.add(head);
 mesh(head,S.head,S.material,'head');
 mesh(head,S.headGlow,S.glow,'eyes').castShadow=false;
 const feelers=[-1,1].map((s,i)=>{const f=new THREE.Group();f.position.set(s*.035,.06,.04);head.add(f);mesh(f,S.feelers[i],S.material,'feeler');return f;});
 const legs=[];
 for(const [i,s] of [-1,1].entries())for(const z of [-.13,.14]){const leg=new THREE.Group();leg.position.set(s*.14,Y-.06,z);body.add(leg);mesh(leg,S.legs[i],S.material,'leg');legs.push(leg);}
 const tail=new THREE.Group();tail.position.set(0,Y,-.29);body.add(tail);mesh(tail,S.tail,S.material,'tail');
 const vane=new THREE.Group();vane.position.set(0,0,VANE_Z);tail.add(vane);mesh(vane,S.vane,S.material,'vane');
 return {g,body,legs,tail,wings:[],quirk:'lizard',kind:'disintegrator',head,feelers,vane,feelHead:head,rustFeel:'disintegrator'};
}
