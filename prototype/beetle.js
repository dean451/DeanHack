import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';
import {segment,chain} from './ant.js';

// The giant beetle used to share the generic insect: three glossy spheres, two bent feelers and
// six sticks. It now has a proper beetle build, low and armoured, head to the front (+z):
// - Wing cases: two domed elytra meeting in a fine seam down the back, each ribbed with rows of
//   grooves and pits, glossy black shot with a green-to-violet sheen that is strongest where the
//   shell turns away from the light, over a banded underside.
// - Pronotum: a broad, flattened shield behind the head with a raised rim and a bright glint,
//   and a small triangular scutellum where the wing cases meet it.
// - Head: sunk into the pronotum, with bulging eyes, a clypeus plate, short palps, a pair of
//   curved, toothed mandibles crossing in front, and elbowed antennae ending in a fanned club of
//   three leaves, like a scarab's.
// - Legs: six stout legs (coxa, a thick femur up to the knee, a spined tibia down, five tarsal
//   beads and a pair of hooked claws). The front tibiae are toothed along the outside for digging.
// The head is one vertex-coloured mesh on a neck pivot, the shell and underside another; each leg
// is its own group holding one mesh (the tripod walk swings them). 8 draws, one material.
// Geometry is built once and shared; the left legs reuse the right ones mirrored.
// Handles: body, legs (6), head (the neck pivot group), quirk 'insect'.

const LOOKS={
 'giant beetle':{scale:1.5,black:'#0c0b10',teal:'#1d6a62',violet:'#58307c',glint:'#a8c4d4',under:'#1e1612',joint:'#3a2218',pad:'#5a3420',claw:'#c8b090'},
};
const Y=.14;// thorax height above the floor, before scaling
const HY=Y-.04;// hip height
const HZ=.17;// head centre
const NECK=[0,Y,.13];

const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const grain=(x,y,z,f=150)=>hash(Math.floor(x*f)*7.3+Math.floor(y*f)*3.1+Math.floor(z*f)*1.7);

// Glossy black shot with colour: the tint swings from green to violet along the body and grows
// towards the rim, where the shell turns away from the light. n is the surface normal.
function shellColour(L,n,extra=0){
 const black=rgb(L.black),tint=mix(rgb(L.teal),rgb(L.violet),n.z*.5+.5+extra);
 const edge=Math.pow(1-Math.abs(n.y),1.5);
 let c=mix(black,tint,.18+edge*.5);
 if(n.y>.82)c=mix(c,rgb(L.glint),(n.y-.82)*2.2);
 return c;
}
// the normal of an ellipsoid with centre C and radii R at p
const ellipsoidNormal=(p,C,R)=>new THREE.Vector3((p[0]-C[0])/(R[0]*R[0]),(p[1]-C[1])/(R[1]*R[1]),(p[2]-C[2])/(R[2]*R[2])).normalize();

function buildBody(L){
 const P=pieces(),under=rgb(L.under),black=rgb(L.black);
 // underside: a long banded abdomen and the breast plates between the legs
 const UC=[0,Y-.028,-.075],UR=[.105,.05,.165];
 P.add(new THREE.SphereGeometry(1,18,10),at(...UC,[0,0,0],UR),(x,y,z)=>{
  const band=((UC[2]+UR[2]-z)/(UR[2]*2)*6)%1;
  let c=mix(black,under,.4+THREE.MathUtils.clamp((UC[1]-y)/UR[1],0,1)*.6);
  if(band<.1&&z<.02)c=mix(c,black,.7);
  return c;
 });
 P.add(new THREE.SphereGeometry(1,16,10),at(0,Y-.035,.05,[0,0,0],[.075,.04,.08]),(x,y)=>mix(black,under,.5));

 // elytra: two domed halves with a seam between them, grooved lengthwise and pitted
 const EC=[0,Y,-.09],ER=[.128,.1,.178];
 for(const s of [-1,1]){
  const geo=new THREE.SphereGeometry(1,24,14,s>0?Math.PI/2:-Math.PI/2,Math.PI,0,Math.PI*.62);
  const C=[s*.004,EC[1],EC[2]];
  P.add(geo,at(...C,[0,0,0],ER),(x,y,z)=>{
   const n=ellipsoidNormal([x,y,z],C,ER);
   let c=shellColour(L,n);
   // grooves run from the shoulder to the tip: bands of the angle round the long axis
   const a=Math.atan2(Math.abs(x-C[0])/ER[0],Math.max(y-C[1],-.5*ER[1])/ER[1]);
   const stria=(a/(Math.PI*.55)*8)%1;
   if(stria<.13)c=mix(c,black,.75);
   else if(stria>.35&&stria<.6&&grain(x,y,z)>.8)c=mix(c,black,.5);
   // the sutural edge along the seam and the rim at the foot are darker
   if(Math.abs(x)<.012)c=mix(c,black,.6);
   if(y<C[1]-.02)c=mix(c,black,.5);
   return c;
  });
 }
 // scutellum: a small triangle pointing back between the wing-case shoulders
 P.add(new THREE.ConeGeometry(.024,.04,3),at(0,Y+.086,.0,[-Math.PI/2+.15,0,Math.PI],[1,1,.35]),(x,y,z)=>shellColour(L,new THREE.Vector3(0,.95,.3),.1));

 // pronotum: a broad flattened shield with a raised rim all round its sides
 const PC=[0,Y+.012,.075],PR=[.118,.062,.082];
 P.add(new THREE.SphereGeometry(1,20,12),at(...PC,[.12,0,0],PR),(x,y,z)=>{
  const n=ellipsoidNormal([x,y,z],PC,PR);let c=shellColour(L,n,-.1);
  const r=Math.hypot(x/PR[0],(z-PC[2])/PR[2]);
  if(r>.9&&y>PC[1]-.01)c=mix(c,rgb(L.glint),.18);
  if(Math.abs(x)<.004&&n.y>.7)c=mix(c,black,.5);
  if(grain(x,y,z,220)>.93)c=mix(c,black,.5);
  return c;
 });
 P.add(new THREE.TorusGeometry(1,.06,6,32),at(PC[0],PC[1]-.006,PC[2],[Math.PI/2,0,0],[PR[0]*.99,PR[2]*.99,.18]),(x,y,z)=>mix(rgb(L.violet),rgb(L.glint),.2));
 return P.merge();
}

function buildHead(L){
 const P=pieces(),black=rgb(L.black),joint=rgb(L.joint),pad=rgb(L.pad),eyeBlack=rgb('#060508');
 // head capsule, sunk into the front of the pronotum
 const HC=[0,Y-.01,HZ],HR=[.068,.042,.052];
 P.add(new THREE.SphereGeometry(1,18,12),at(...HC,[.15,0,0],HR),(x,y,z)=>{
  const n=ellipsoidNormal([x,y,z],HC,HR);let c=shellColour(L,n,.15);
  if(grain(x,y,z,260)>.9)c=mix(c,black,.6);
  return c;
 });
 // clypeus: a plate over the mouth
 P.add(new THREE.SphereGeometry(1,12,6),at(0,Y-.004,HZ+.045,[.3,0,0],[.045,.012,.025]),(x,y,z)=>shellColour(L,new THREE.Vector3(0,.8,.6),.2));
 // bulging eyes, with a pale glint on top
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.021,10,8),at(s*.058,Y-.004,HZ+.018,[0,s*.5,0],[.7,.95,1.1]),(x,y,z)=>y>Y+.006&&z>HZ+.02?rgb('#6a6670'):eyeBlack);
 // mandibles: curved blades crossing in front, toothed along the inside edge
 for(const s of [-1,1]){
  const pts=[[s*.03,Y-.016,HZ+.045],[s*.058,Y-.014,HZ+.08],[s*.052,Y-.012,HZ+.112],[s*.012,Y-.016,HZ+.132],[-s*.012,Y-.02,HZ+.128]];
  chain(P,pts,[.013,.011,.009,.005,.0015],j=>mix(black,joint,.5-j*.1),7);
  for(let k=0;k<3;k++){
   const a=new THREE.Vector3(...pts[1]).lerp(new THREE.Vector3(...pts[2]),.15+k*.35);
   segment(P,a.toArray(),[a.x-s*.016,a.y-.001,a.z+.005],.0045,.0008,joint,4);
  }
 }
 // palps: short jointed feelers under the jaws
 for(const s of [-1,1])chain(P,[[s*.022,Y-.03,HZ+.04],[s*.034,Y-.042,HZ+.065],[s*.03,Y-.05,HZ+.085]],[.005,.004,.003],pad,5);
 // antennae: a scape out from under the eye, an elbow, a beaded stalk, then a club of three leaves
 for(const s of [-1,1]){
  const base=[s*.045,Y-.008,HZ+.035],elbow=[s*.085,Y+.012,HZ+.06],tip=[s*.11,Y+.02,HZ+.1];
  segment(P,base,elbow,.006,.005,joint,6);
  P.add(new THREE.SphereGeometry(.006,6,5),at(...elbow),black);
  const A=new THREE.Vector3(...elbow),B=new THREE.Vector3(...tip);
  for(let k=1;k<=5;k++){const p=A.clone().lerp(B,k/6);P.add(new THREE.SphereGeometry(.0045,6,4),at(p.x,p.y,p.z),mix(black,joint,.5));}
  for(let k=0;k<3;k++)P.add(new THREE.SphereGeometry(.016,10,6),at(tip[0]+s*k*.004,tip[1]+(k-1)*.009,tip[2]+.012,[0,s*(.5+k*.15),(k-1)*.35],[.9,.28,1.2]),mix(pad,rgb(L.claw),.25+k*.1));
 }
 const geo=P.merge();geo.translate(-NECK[0],-NECK[1],-NECK[2]);return geo;
}

// One right-hand leg. i is the pair, 0 at the front. The hip is the origin; the geometry reaches
// out to +x and bends to the floor at y=-HY.
const PAIRS=[{ang:.78,reach:.24,knee:.06,z:.075},{ang:-.08,reach:.225,knee:.07,z:.015},{ang:-.72,reach:.29,knee:.075,z:-.05}];
function buildLeg(L,i){
 const P=pieces(),{ang,reach,knee}=PAIRS[i],black=rgb(L.black),joint=rgb(L.joint),pad=rgb(L.pad),claw=rgb(L.claw);
 const dir=(r,y,turn=0)=>[Math.cos(ang+turn)*r,y,Math.sin(ang+turn)*r];
 const turn=i===1?0:(i?-.12:.12);
 // coxa, a thick femur up to the knee, the tibia down, the tarsus along the floor
 const pts=[[0,0,0],dir(.035,-.012),dir(.115,knee),dir(reach-.075,-HY+.022),dir(reach,-HY+.006,turn)];
 const radii=[.02,.019,.013,.009,.004];
 chain(P,pts,radii,j=>j===1?mix(black,rgb(L.violet),.25):mix(black,joint,.35-j*.08),7);
 // femur bulge
 const f0=new THREE.Vector3(...pts[1]),f1=new THREE.Vector3(...pts[2]),fm=f0.clone().lerp(f1,.5),fd=f1.clone().sub(f0);
 P.add(new THREE.SphereGeometry(1,10,6),new THREE.Matrix4().compose(fm,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),fd.clone().normalize()),new THREE.Vector3(.02,fd.length()*.46,.015)),(x,y)=>mix(black,rgb(L.violet),.15+(y>fm.y?.2:0)));
 // tibial spines, pointing out and down; the front legs get broad digging teeth instead
 const t0=new THREE.Vector3(...pts[2]),t1=new THREE.Vector3(...pts[3]),out=new THREE.Vector3(Math.cos(ang),0,Math.sin(ang));
 for(let k=0;k<4;k++){
  const a=t0.clone().lerp(t1,.3+k*.2),len=i===0?.02:.013;
  const b=a.clone().addScaledVector(out,len).add(new THREE.Vector3(0,-len*.6,0));
  segment(P,a.toArray(),b.toArray(),i===0?.0055:.003,.0007,i===0?black:mix(joint,claw,.4),4);
 }
 // five tarsal beads and a pair of hooked claws
 const a=new THREE.Vector3(...pts[3]),b=new THREE.Vector3(...pts[4]);
 for(let k=1;k<5;k++){const p=a.clone().lerp(b,k/5);P.add(new THREE.SphereGeometry(.0058,6,4),at(p.x,p.y,p.z,[0,0,0],[1,.8,1]),mix(joint,pad,k/5));}
 const fwd=b.clone().sub(a).setY(0).normalize(),side=new THREE.Vector3(-fwd.z,0,fwd.x);
 for(const s of [-1,1]){
  const c=b.clone().addScaledVector(fwd,.012).addScaledVector(side,s*.006).add(new THREE.Vector3(0,-.003,0));
  segment(P,b.toArray(),c.toArray(),.0025,.0008,claw,4);
 }
 return P.merge();
}

const cache=new Map();
function build(key,L){
 if(cache.has(key))return cache.get(key);
 const S={
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.24,metalness:.22}),
  body:buildBody(L),head:buildHead(L),legs:PAIRS.map((p,i)=>buildLeg(L,i)),
 };
 cache.set(key,S);return S;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function isBeetle(name){return !!LOOKS[name];}

export function createBeetle(name){
 const L=LOOKS[name]||LOOKS['giant beetle'],S=build(LOOKS[name]?name:'giant beetle',L);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(L.scale);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(...NECK);body.add(head);
 mesh(head,S.head,S.material,'head');
 const legs=[];
 for(const s of [1,-1])S.legs.forEach((geo,i)=>{
  const leg=new THREE.Group();
  leg.position.set(s*.055,HY,PAIRS[i].z);body.add(leg);
  const m=mesh(leg,geo,S.material,'leg');if(s<0)m.scale.x=-1;
  legs.push(leg);
 });
 return {g,body,legs,tail:null,wings:[],quirk:'insect',head};
}
