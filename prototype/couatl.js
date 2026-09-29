import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {pieces,rgb,mix,at} from './homunculus.js';

// The couatl used to be the plain green-and-gold snake coiled on the floor, with
// no wings. It is now a feathered serpent hovering in the air, facing +z: a long
// emerald body in a loose S-loop with dark diamonds down the spine, turquoise
// sheen on the flanks and gold belly plates, a ruff of red- and gold-tipped
// feathers at the throat, a crest of plumes swept back from the crown, a forked
// tongue, raised feathered wings (green coverts, teal secondaries, primaries
// banded crimson and tipped gold) and a fan of long quetzal plumes on the tail.
// Each moving part (body, head, tail, each wing) is one merged, vertex-coloured
// mesh with a shared material, plus one small mesh for the eyes: 6 draws. The
// geometry is built once and shared by every couatl.
// Handles: body, head, tail, wings (userData.side ±1). Its quirk is 'hover', so
// the existing flight bob and wing sway drive it; the generic tail roll swings
// the hanging loop of the tail.

const C={
 emerald:rgb('#2f9a5a'),deep:rgb('#17553a'),teal:rgb('#35b0a2'),edge:rgb('#7ad8a0'),
 gold:rgb('#e0b440'),plate:rgb('#a47a28'),cream:rgb('#f0dc98'),
 red:rgb('#c8242e'),blue:rgb('#2f6ac8'),mouth:rgb('#5a1a1e'),tongue:rgb('#d8303a'),nostril:rgb('#10201a'),
};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const UP=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);

// the serpent's spine, head end first: down from the raised neck, out to the
// right, back across to the left and a loose hanging loop into the tail
const SPINE=new THREE.CatmullRomCurve3([
 [0,.62,.16],[0,.6,.08],[0,.53,0],[.05,.45,-.08],[.1,.4,-.18],[.04,.36,-.26],[-.07,.32,-.26],
 [-.13,.28,-.18],[-.1,.23,-.08],[-.02,.19,-.06],[.05,.16,-.12],[.07,.14,-.22],[.03,.13,-.3],
].map(p=>new THREE.Vector3(...p)));
const TAIL_FROM=.55;
const radius=u=>u<.15?.03+.015*(u/.15):u<.55?.045:.045-.037*((u-.55)/.45)**.8;

// A frame along the spine that keeps "top" facing up (the curve never runs
// vertical, so the cross product never collapses).
function frame(u){
 const p=SPINE.getPointAt(u),t=SPINE.getTangentAt(u),side=new THREE.Vector3().crossVectors(UP,t).normalize(),top=new THREE.Vector3().crossVectors(t,side);
 return {p,t,side,top};
}

// Scales: emerald with a turquoise sheen on the flanks and a row of dark
// diamonds edged in pale green down the spine; gold belly plates underneath.
function scale(u,phi){
 const c=Math.cos(phi);
 const d=Math.abs((u*24)%1-.5)*2,s=Math.abs(Math.sin(phi));
 let back=mix(C.emerald,C.teal,.35+.35*Math.sin(u*14+phi*2));
 const diamond=d*.55+s*.9;
 if(c>0&&diamond<.42)back=diamond<.32?C.deep:C.edge;
 const belly=(u*90)%1<.2?C.plate:C.gold;
 return mix(back,belly,clamp01((-.2-c)*4));
}

// A tube along the spine from u0 to u1, relative to origin; non-indexed, with
// normals and colours, ready to merge with the pieces.
function tube(u0,u1,segs,radial,origin){
 const rings=[];
 for(let i=0;i<=segs;i++){
  const u=u0+(u1-u0)*i/segs,{p,side,top}=frame(u),r=radius(u),ring=[];
  for(let j=0;j<=radial;j++){const phi=j/radial*Math.PI*2,n=top.clone().multiplyScalar(Math.cos(phi)).addScaledVector(side,Math.sin(phi));ring.push({pos:p.clone().addScaledVector(n,r).sub(origin),n,c:scale(u,phi)});}
  rings.push(ring);
 }
 const pos=[],nor=[],col=[],push=v=>{pos.push(v.pos.x,v.pos.y,v.pos.z);nor.push(v.n.x,v.n.y,v.n.z);col.push(...v.c);};
 for(let i=0;i<segs;i++)for(let j=0;j<radial;j++){
  const a=rings[i][j],b=rings[i+1][j],c=rings[i+1][j+1],d=rings[i][j+1];
  for(const v of [a,d,b,b,d,c])push(v);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 return geo;
}

// One feather or plume: a thin ellipsoid rooted at `root` and lying along the
// unit vector `dir`, its flat face turned toward `face` where given. The colour
// runs root → tip along its length, with an optional band just before the tip.
function plume(P,root,dir,len,width,thick,{root:c0=C.emerald,tip=C.gold,band=null,face=null}={}){
 const d=dir.clone().normalize(),q=new THREE.Quaternion().setFromUnitVectors(Z,d);
 if(face){const y=new THREE.Vector3(0,1,0).applyQuaternion(q),f=face.clone().addScaledVector(d,-face.dot(d)).normalize();if(f.lengthSq()>0){const twist=new THREE.Quaternion().setFromUnitVectors(y,f);q.premultiply(twist);}}
 const centre=root.clone().addScaledVector(d,len/2);
 const m=new THREE.Matrix4().compose(centre,q,new THREE.Vector3(width/2,thick/2,len/2));
 P.add(new THREE.SphereGeometry(1,8,4),m,(x,y,z)=>{
  const t=clamp01(((x-root.x)*d.x+(y-root.y)*d.y+(z-root.z)*d.z)/len);
  let c=mix(c0,tip,clamp01((t-.55)/.4));
  if(band&&t>.62&&t<.82)c=band;
  return c;
 });
}

function buildBody(){
 const P=pieces(),O=new THREE.Vector3();
 // throat ruff: two rings of feathers laid back along the neck
 for(const [u,n,len,band,tip] of [[.05,12,.075,C.red,C.gold],[.09,10,.055,C.blue,C.cream]]){
  const {p,t,side,top}=frame(u);
  for(let k=0;k<n;k++){
   const a=k/n*Math.PI*2,out=top.clone().multiplyScalar(Math.cos(a)).addScaledVector(side,Math.sin(a));
   plume(P,p.clone().addScaledVector(out,radius(u)*.8),out.clone().multiplyScalar(.9).addScaledVector(t,1.1),len,.03,.006,{root:C.emerald,band,tip,face:out});
  }
 }
 // a low row of small feathers along the spine behind the wings
 for(let k=0;k<9;k++){const u=.17+k*.04,{p,t,top}=frame(u);plume(P,p.clone().addScaledVector(top,radius(u)*.85),top.clone().multiplyScalar(.6).addScaledVector(t,1),.04-k*.002,.02,.004,{root:C.teal,tip:C.gold,face:top});}
 const body=tube(0,TAIL_FROM,90,16,O);
 return mergeGeometries([body,P.merge()]);
}

function buildTail(){
 const P=pieces(),O=SPINE.getPointAt(TAIL_FROM);
 // the quetzal fan: long green plumes spreading from the tip, with gold eyes
 const {p,t,side,top}=frame(1);
 for(let k=0;k<5;k++){
  const s=(k-2)/2,dir=t.clone().addScaledVector(side,s*.55).addScaledVector(top,.12-Math.abs(s)*.1);
  plume(P,p.clone().sub(O).addScaledVector(t,-.01),dir,.15-Math.abs(s)*.03,.035,.005,{root:C.emerald,tip:C.teal,band:C.gold,face:top});
 }
 return mergeGeometries([tube(TAIL_FROM,1,60,12,O),P.merge()]);
}

function buildHead(){
 const P=pieces();
 const skin=(lo,hi)=>(x,y)=>mix(C.gold,mix(C.emerald,C.deep,clamp01(Math.abs(x)*12-.2)),clamp01((y-lo)/(hi-lo)));
 // a broad flat skull narrowing into a blunt snout, over a pale jaw
 P.add(new THREE.SphereGeometry(.05,16,12),at(0,.012,.045,[0,0,0],[1.05,.62,1.45]),skin(-.005,.02));
 P.add(new THREE.SphereGeometry(.036,14,10),at(0,.006,.1,[.08,0,0],[.9,.55,1.2]),skin(-.005,.015));
 P.add(new THREE.SphereGeometry(.042,14,10),at(0,-.014,.07,[0,0,0],[.88,.36,1.3]),(x,y)=>mix(C.cream,C.gold,clamp01(-y*60)));
 P.add(new THREE.BoxGeometry(.05,.004,.05),at(0,-.004,.11,[.05,0,0]),C.mouth);
 // heavy brows over the eyes, and nostrils at the tip of the snout
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.016,8,6),at(s*.033,.034,.072,[0,0,0],[1.1,.55,1.6]),C.deep);
  P.add(new THREE.SphereGeometry(.004,6,4),at(s*.011,.017,.138),C.nostril);
 }
 // forked tongue flicking out of the mouth
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.0035,.045,4),at(s*.006,-.008,.162,[Math.PI/2,s*.28,0]),C.tongue);
 P.add(new THREE.CylinderGeometry(.004,.004,.03,5),at(0,-.007,.138,[Math.PI/2,0,0]),C.tongue);
 // crest of plumes swept back and up from the crown, the middle ones longest
 const crown=new THREE.Vector3(0,.035,.045);
 for(let k=0;k<7;k++){
  const s=(k-3)/3,len=.13-Math.abs(s)*.045;
  plume(P,crown.clone().add(new THREE.Vector3(s*.03,0,-Math.abs(s)*.01)),new THREE.Vector3(s*.45,.7-Math.abs(s)*.25,-1),len,.028,.006,{root:C.emerald,band:k%2?C.red:C.blue,tip:C.gold,face:new THREE.Vector3(0,1,0)});
 }
 // cheek feathers flaring out behind the jaw
 for(const s of [-1,1])for(let k=0;k<3;k++)plume(P,new THREE.Vector3(s*.04,-.004+k*.012,.03),new THREE.Vector3(s*.9,.1+k*.2,-1),.05,.018,.004,{root:C.teal,tip:C.gold,band:C.red,face:new THREE.Vector3(s,0,0)});
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.011,10,8),at(s*.036,.026,.08),[1,1,1]);
 return P.merge();
}

// A raised feathered wing reaching out along +x·side, feathers trailing back.
function buildWing(side){
 const P=pieces(),v=(x,y,z)=>new THREE.Vector3(side*x,y,z),up=new THREE.Vector3(0,1,0);
 const f=(rx,rz,dx,dz,len,w,o)=>plume(P,v(rx,0,rz),v(dx,0,dz),len,w,.007,{...o,face:up});
 // the arm along the leading edge
 P.add(new THREE.SphereGeometry(1,12,6),at(side*.1,.004,.01,[0,0,0],[.11,.016,.022]),C.emerald);
 // secondaries: teal, trailing back from the arm
 for(let k=0;k<7;k++){const u=k/6;f(.02+u*.17,0,.1*u,-1,.11+.02*u,.042,{root:C.teal,tip:C.blue});}
 // primaries fanned from the hand, banded crimson and tipped gold
 const lens=[.13,.145,.155,.15,.13],angles=[.6,.82,1.04,1.26,1.46];
 for(let k=0;k<5;k++)f(.19+k*.008,-.004+k*.004,Math.sin(angles[k]),-Math.cos(angles[k]),lens[k],.036,{root:C.teal,band:C.red,tip:C.gold});
 // emerald coverts over the bases of the flight feathers
 for(let k=0;k<8;k++){const u=k/7;f(.015+u*.2,.012,.2*u,-1,.06,.045,{root:C.emerald,tip:C.teal});}
 const geo=P.merge();
 // raised in a shallow V
 geo.applyMatrix4(new THREE.Matrix4().makeRotationZ(side*.42));
 return geo;
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:.12});
 const eye=new THREE.MeshStandardMaterial({color:0xffd24a,emissive:0xc88a10,emissiveIntensity:1.6,roughness:.1});
 shared={material,eye,body:buildBody(),tail:buildTail(),head:buildHead(),eyes:buildEyes(),wing:{'-1':buildWing(-1),'1':buildWing(1)}};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createCouatl(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.1);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.copy(SPINE.getPointAt(0));head.rotation.x=.12;body.add(head);
 mesh(head,S.head,S.material,'head');mesh(head,S.eyes,S.eye,'eyes');
 const tail=new THREE.Group();tail.position.copy(SPINE.getPointAt(TAIL_FROM));body.add(tail);mesh(tail,S.tail,S.material,'tail');
 const wings=[];
 for(const s of [-1,1]){
  const p=SPINE.getPointAt(.13),wing=new THREE.Group();wing.position.set(p.x+s*.035,p.y+.02,p.z);
  wing.userData.side=s;body.add(wing);mesh(wing,S.wing[s],S.material,'wing');wings.push(wing);
 }
 return {g,body,legs:[],tail,wings,quirk:'hover',head};
}
