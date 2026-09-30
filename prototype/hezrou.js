import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The hezrou used to be the generic demon build with the 'toad' head: a squashed ball with two
// small glowing dots on a man's torso, which read as a friendly frog. It now stands as a hulking
// toad demon, hunched forward so its head hangs level with its shoulders:
// - a pear-shaped body, a mottled olive and brown warty hide over a sickly yellow belly, and a
//   ridge of bony spines down its humped back;
// - a broad, flat head with heavy bony brows and a crown of short horns, deep-set glaring yellow
//   eyes with black slit pupils, and nostril pits;
// - a huge maw lined with fangs and set a little open, on a hinged lower jaw with a pale throat
//   sac, a red tongue and strings of drool;
// - long, thick arms that hang to the knee, a spur at each elbow, and webbed four-fingered hands
//   with black hooked claws;
// - squat, crouched legs on wide webbed feet with three clawed toes.
// Each moving part (body, head, jaw, each leg and arm) is one merged, vertex-coloured mesh with a
// shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once and
// shared by every hezrou.
// Handles: legs, arms, arm, head, jaw, body. The jaw is a child of the head hinged about x
// (jaw.js), so its bite gapes.

const HIDE=rgb('#5c6a2c'),HIDE_DARK=rgb('#303a16'),HIDE_BROWN=rgb('#5a4424'),WART=rgb('#8a8a3e'),WART_TIP=rgb('#b0a458');
const BELLY=rgb('#c8b460'),BELLY_SHADE=rgb('#8e7e3a'),BONE=rgb('#d6c8a0'),BONE_DARK=rgb('#8a7a58');
const CLAW=rgb('#18120c'),TOOTH=rgb('#ece0bc'),GUM=rgb('#6a1c1c'),MOUTH=rgb('#300a0c'),TONGUE=rgb('#a83c46');
const DROOL=rgb('#b8c890'),PUPIL=rgb('#080604');

// a cheap 3-D hash noise, smooth enough for blotches: in [0,1]
const blot=(x,y,z,f=1)=>Math.sin(x*37*f+Math.sin(z*23*f)*2)*Math.sin(y*29*f+z*17*f)*.5+.5;
// the hide: dark and brown blotches on olive, a pale belly where the skin faces forward and down
const hide=(belly=.5)=>(x,y,z,n)=>{
 const b=blot(x,y,z),c=mix(mix(HIDE,HIDE_BROWN,b>.7?.7:0),HIDE_DARK,b<.22?.6:0);
 return belly>0&&n>belly?mix(c,BELLY,Math.min(1,(n-belly)*4)):c;
};

// paint with a colour function that also sees how far a point faces +z (for the belly)
function add(P,geo,matrix,paint,centre=[0,0,0]){
 P.add(geo,matrix,(x,y,z)=>paint(x,y,z,(z-centre[2])/Math.max(1e-6,Math.hypot(x-centre[0],y-centre[1],z-centre[2]))));
}
// warts: small bumps scattered over the part of a sphere-ish surface that faces away from +z
function warts(P,count,seed,centre,radii,size,back=.2){
 const h=n=>{const s=Math.sin(n*127.1+seed*311.7)*43758.5453;return s-Math.floor(s);};
 for(let i=0;i<count;i++){
  const a=h(i)*Math.PI*2,e=(h(i+50)-.5)*2.2;
  const d=new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e)*.9,Math.cos(a)*Math.cos(e));
  if(d.z>back)continue;
  const p=new THREE.Vector3(centre[0]+d.x*radii[0],centre[1]+d.y*radii[1],centre[2]+d.z*radii[2]);
  const r=size*(.6+h(i+90)*.8);
  P.add(new THREE.SphereGeometry(r,6,4),at(p.x,p.y,p.z,[0,0,0],[1,.8,1]),(x,y,z)=>mix(WART,WART_TIP,(y-p.y)/r*.5+.5));
 }
}

function buildBody(){
 const P=pieces();
 // the belly: a pear hanging low between the hips
 add(P,new THREE.SphereGeometry(.25,26,18),at(0,.63,.02,[0,0,0],[1.18,1.05,1]),hide(.35),[0,.63,.02]);
 // the humped shoulders, pitched forward over the belly
 add(P,new THREE.SphereGeometry(.24,26,16),at(0,.86,-.01,[.35,0,0],[1.4,.82,1.05]),hide(.55),[0,.86,-.01]);
 // the neck: a thick fold joining the shoulders to the low-slung head
 add(P,new THREE.SphereGeometry(.16,18,12),at(0,.93,.12,[0,0,0],[1.2,.8,1]),hide(.5),[0,.93,.12]);
 // hips, where the thighs attach
 for(const s of [-1,1])add(P,new THREE.SphereGeometry(.12,14,10),at(s*.15,.52,0),hide(-1));
 // shoulder knots of muscle
 for(const s of [-1,1])add(P,new THREE.SphereGeometry(.11,14,10),at(s*.29,.87,.02,[0,0,0],[1,.9,1]),hide(-1));
 warts(P,46,1,[0,.8,-.02],[.3,.22,.24],.022);
 warts(P,18,2,[0,.62,.02],[.29,.25,.25],.018);
 // a ridge of bony spines down the hump, longest between the shoulders
 for(let i=0;i<7;i++){
  const t=i/6,y=1.0-t*.4,z=-.17-Math.sin(t*Math.PI)*.08+t*.02,len=.12-Math.abs(t-.3)*.1;
  P.add(new THREE.ConeGeometry(.026-t*.008,len,6),at(0,y,z,[-1.1-t*.4,0,0]),(x,yy)=>mix(BONE_DARK,BONE,(yy-y+len/2)/len*1.4));
 }
 return P.merge();
}

// the head centre is the head group's origin; the mouth opens along +z at y≈-.02
function buildHead(){
 const P=pieces();
 // a broad, flat skull
 add(P,new THREE.SphereGeometry(.16,26,16),at(0,.035,.02,[0,0,0],[1.35,.62,1.12]),(x,y,z,n)=>hide(-1)(x,y,z,n),[0,.035,.02]);
 // the upper lip overhanging the mouth, with a dark gum line under it
 P.add(new THREE.SphereGeometry(.16,26,10,0,Math.PI*2,Math.PI*.5,Math.PI*.18),at(0,.03,.03,[0,0,0],[1.34,.7,1.12]),(x,y,z)=>y<.0?GUM:hide(-1)(x,y,z,0));
 // fangs along the upper jaw's rim, longest at the corners of the snout
 for(let i=0;i<13;i++){
  const a=(i/12-.5)*2.5,len=.03+(Math.abs(Math.abs(a)-.55)<.2?.035:0);
  P.add(new THREE.ConeGeometry(.009,len,5),at(Math.sin(a)*.2,.0-len/2+.004,.03+Math.cos(a)*.165,[Math.PI,0,0]),(x,y)=>mix(TOOTH,BONE_DARK,.0));
 }
 // heavy bony brows over deep sockets, and a crown of short horns behind them
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.058,14,10),at(s*.1,.1,.09,[0,0,s*.3],[1.3,.62,.9]),(x,y)=>mix(HIDE_DARK,BONE_DARK,(y-.08)*18));
  P.add(new THREE.SphereGeometry(.04,12,8),at(s*.1,.072,.112),MOUTH);
  P.add(new THREE.BoxGeometry(.008,.03,.006),at(s*.1,.072,.155),PUPIL);
  for(const [x,y,z,r,l] of [[.06,.13,.0,.018,.07],[.12,.12,-.03,.016,.06],[.17,.08,-.04,.014,.05]]){
   P.add(new THREE.ConeGeometry(r,l,6),at(s*x,y+l*.3,z,[-.6,0,-s*.5]),(xx,yy)=>mix(BONE_DARK,BONE,(yy-y)/l+.5));
  }
  // nostril pits on the snout
  P.add(new THREE.SphereGeometry(.012,8,6),at(s*.04,.06,.2,[0,0,0],[1,.6,1]),MOUTH);
 }
 warts(P,24,3,[0,.06,.0],[.2,.09,.17],.014,.1);
 return P.merge();
}

// eyes: glowing yellow orbs in the brow sockets (the slit pupils are part of the head)
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.032,12,8),at(s*.1,.072,.122),[1,1,1]);
 return P.merge();
}

// the lower jaw, from its hinge at the back of the mouth: a wide scoop with teeth pointing up,
// a dark mouth and tongue inside, a pale throat sac below and drool at the corners
function buildJaw(){
 const P=pieces();
 add(P,new THREE.SphereGeometry(.16,26,12,0,Math.PI*2,Math.PI*.5,Math.PI*.5),at(0,.0,.06,[0,0,0],[1.3,.55,1.1]),(x,y,z,n)=>{
  const c=hide(-1)(x,y,z,n);return y<-.05&&z>.0?mix(c,BELLY,Math.min(1,(-.05-y)*20)):c;
 },[0,0,.06]);
 P.add(new THREE.CircleGeometry(.16,26),at(0,.002,.06,[-Math.PI/2,0,0],[1.28,1.08,1]),MOUTH);
 P.add(new THREE.SphereGeometry(.07,14,8),at(0,.004,.09,[0,0,0],[1.2,.3,1.5]),TONGUE);
 // the throat sac, puffed out under the chin
 P.add(new THREE.SphereGeometry(.12,16,10),at(0,-.07,.05,[0,0,0],[1.2,.6,1.1]),(x,y)=>mix(BELLY,BELLY_SHADE,(-.07-y)*10));
 for(let i=0;i<11;i++){
  const a=(i/10-.5)*2.3,len=.024+(Math.abs(Math.abs(a)-.7)<.15?.03:0);
  P.add(new THREE.ConeGeometry(.008,len,5),at(Math.sin(a)*.195,len/2,.06+Math.cos(a)*.162),TOOTH);
 }
 for(const s of [-1,1])for(const [dx,l] of [[0,.1],[.015,.06]])P.add(new THREE.CylinderGeometry(.004,.0015,l,5),at(s*(.2-dx),-l/2,.1),DROOL);
 return P.merge();
}

// a long, thick arm hanging from the shoulder to the knee, a bone spur at the elbow, and a
// webbed hand with four hooked claws
function buildArm(s){
 const P=pieces();
 add(P,new THREE.CylinderGeometry(.075,.06,.28,14),at(0,-.14,0),hide(-1));
 P.add(new THREE.SphereGeometry(.064,12,8),at(0,-.285,0),hide(-1));
 add(P,new THREE.CylinderGeometry(.068,.05,.25,14),at(0,-.41,.03,[.2,0,0]),hide(-1));
 P.add(new THREE.ConeGeometry(.016,.07,6),at(s*.02,-.29,-.07,[-2,0,0]),BONE);
 // the hand: a flat palm and four splayed fingers joined by webbing, each ending in a claw
 P.add(new THREE.SphereGeometry(.055,12,8),at(0,-.56,.06,[0,0,0],[1.1,.8,.8]),hide(-1));
 const tips=[];
 for(let k=0;k<4;k++){
  const a=(k-1.5)*.32,tip=new THREE.Vector3(Math.sin(a)*.08,-.66,.1+Math.cos(a)*.03);tips.push(tip);
  const base=new THREE.Vector3(Math.sin(a)*.035,-.58,.07),dir=tip.clone().sub(base),len=dir.length();
  P.add(new THREE.CylinderGeometry(.011,.014,len,6),new THREE.Matrix4().compose(base.clone().add(tip).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()),new THREE.Vector3(1,1,1)),HIDE_DARK);
  P.add(new THREE.ConeGeometry(.011,.05,5),at(tip.x,tip.y-.02,tip.z+.012,[Math.PI+.5,0,0]),CLAW);
 }
 const web=new THREE.BufferGeometry(),v=[];
 for(let k=0;k<3;k++){const a=tips[k],b=tips[k+1];v.push(0,-.58,.07,a.x*.75,a.y+.02,a.z-.01,b.x*.75,b.y+.02,b.z-.01);}
 web.setAttribute('position',new THREE.Float32BufferAttribute(v,3));web.computeVertexNormals();
 P.add(web,null,HIDE_BROWN);
 return P.merge();
}

// a squat, crouched leg: a thick thigh forward to the knee, a shin back to the heel, and a wide
// webbed foot with three long clawed toes
function buildLeg(){
 const P=pieces();
 const hip=new THREE.Vector3(0,0,0),knee=new THREE.Vector3(0,-.2,.1),heel=new THREE.Vector3(0,-.42,-.03);
 const limb=(a,b,r0,r1)=>{const d=b.clone().sub(a),len=d.length();add(P,new THREE.CylinderGeometry(r1,r0,len,14),new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()),new THREE.Vector3(1,1,1)),hide(-1));};
 limb(hip,knee,.1,.075);P.add(new THREE.SphereGeometry(.075,12,8),at(knee.x,knee.y,knee.z),hide(-1));
 limb(knee,heel,.07,.05);P.add(new THREE.SphereGeometry(.052,10,8),at(heel.x,heel.y,heel.z),hide(-1));
 P.add(new THREE.SphereGeometry(.07,12,8),at(0,-.475,.04,[0,0,0],[1.1,.35,1.4]),hide(-1));
 const tips=[];
 for(let k=-1;k<=1;k++){
  const a=k*.45,tip=new THREE.Vector3(Math.sin(a)*.14,-.49,.06+Math.cos(a)*.13);tips.push(tip);
  const base=new THREE.Vector3(Math.sin(a)*.03,-.48,.08),d=tip.clone().sub(base),len=d.length();
  P.add(new THREE.CylinderGeometry(.013,.02,len,6),new THREE.Matrix4().compose(base.clone().add(tip).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()),new THREE.Vector3(1,1,1)),HIDE_DARK);
  P.add(new THREE.ConeGeometry(.012,.045,5),at(tip.x+Math.sin(a)*.018,-.49,tip.z+Math.cos(a)*.018,[Math.PI/2,0,-a]),CLAW);
 }
 const web=new THREE.BufferGeometry(),v=[];
 for(let k=0;k<2;k++){const a=tips[k],b=tips[k+1];v.push(0,-.485,.08,a.x*.8,-.492,a.z*.85+.01,b.x*.8,-.492,b.z*.85+.01);}
 web.setAttribute('position',new THREE.Float32BufferAttribute(v,3));web.computeVertexNormals();
 P.add(web,null,HIDE_BROWN);
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,side:THREE.DoubleSide});
 const eye=new THREE.MeshStandardMaterial({color:0xffe060,emissive:0xffb020,emissiveIntensity:2.6,roughness:.25});
 shared={material,eye,body:buildBody(),head:buildHead(),eyes:buildEyes(),jaw:buildJaw(),leg:buildLeg(),arm:{'-1':buildArm(-1),'1':buildArm(1)}};
 return shared;
}
function mesh(parent,geo,material,name,shadow=true){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=shadow;m.userData.part=name;parent.add(m);return m;}

export function createHezrou(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,.98,.2);body.add(head);
 mesh(head,S.head,S.material,'head');mesh(head,S.eyes,S.eye,'eyes',false);
 // the jaw hinges at the back of the mouth and rests a little open, fangs bared
 const jaw=new THREE.Group();jaw.position.set(0,-.005,-.03);jaw.rotation.x=.14;jaw.userData.reach=.8;head.add(jaw);
 mesh(jaw,S.jaw,S.material,'jaw');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.15,.5,0);leg.rotation.y=s*.15;body.add(leg);mesh(leg,S.leg,S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.33,.88,.03);arm.rotation.set(-.12,0,s*.12);body.add(arm);mesh(arm,S.arm[s],S.material,'arm');arms.push(arm);
 }
 return {g,body,legs,tail:null,wings:[],quirk:'orc',kind:'hezrou',arms,arm:arms[1],head,jaw,hat:null,beard:null,pick:null};
}
