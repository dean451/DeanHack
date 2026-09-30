import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The scorpion shares the spiders' letter, so it used to be a red cave spider. It now has a
// scorpion's build: a flat, shield-shaped carapace with two raised middle eyes and small eyes at
// the front corners, a back of seven overlapping plates, and five knobbly tail segments that
// arch up and forward over the back to a swollen venom bulb with a hooked black stinger.
// Two big pincers reach forward on jointed arms: each has a heavy, ridged hand, a fixed finger
// on the outside and a hinged finger inside, with little teeth along the bite and dark tips.
// Eight short legs splay out low from under the carapace, the back pairs raking backwards.
// - scorpion: dark rust-red chitin, paler at the joints and plate edges, amber eyes.
// - Scorpius (the Ranger quest nemesis): a huge, blue-black one with violet edges, a glowing
//   violet venom bulb and red eyes.
// The body is one vertex-coloured mesh and the eyes another (they glow). The tail, each pincer
// and each leg is its own group holding one mesh (the tail sways, the legs skitter). 13 draws.
// Geometry is built once per look and shared; the left pincer and legs mirror the right ones.
// Handles: body, legs (8, right front to back then left, for skitter.js), head (the eye mesh),
// tail, claws (right, left), quirk 'spider'.

const LOOKS={
 scorpion:{scale:1.15,shell:'#7e2a1a',dark:'#2e0e08',pale:'#c46a3c',tip:'#140806',bulb:'#9a3a1e',eye:'#ffb040',glow:0},
 scorpius:{scale:1.85,shell:'#262032',dark:'#0c0a12',pale:'#7a4c94',tip:'#08060c',bulb:'#b048e0',eye:'#ff2a1a',glow:1},
};
export const isScorpion=name=>Object.hasOwn(LOOKS,(name||'').toLowerCase());
const Y=.1;// height of the hips and the underside of the carapace above the floor, before scaling

const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const noise=(x,y,z)=>hash(Math.floor(x*120)*7.1+Math.floor(y*120)*13.7+Math.floor(z*120)*3.3);

// a tapered segment from a to b
function segment(P,a,b,r0,r1,colour,radial=7){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A),len=dir.length();
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
 P.add(new THREE.CylinderGeometry(r1,r0,len,radial,1),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)),colour);
}
// an ellipsoid stretched between a and b, `w` wide and `h` deep across the length
function pod(P,a,b,w,h,colour,ws=12,hs=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A),len=dir.length();
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),dir.normalize());
 P.add(new THREE.SphereGeometry(.5,ws,hs),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),q,new THREE.Vector3(w,h,len)),colour);
}

function buildBody(L){
 const P=pieces(),shell=rgb(L.shell),dark=rgb(L.dark),pale=rgb(L.pale);
 // carapace: a flat shield, darkest at the rim, with a groove down the middle and a raised eye mound
 P.add(new THREE.SphereGeometry(.5,22,12),at(0,Y+.012,.11,[-.06,0,0],[.13,.05,.15]),(x,y,z)=>{
  const top=THREE.MathUtils.clamp((y-Y)/.035,0,1),rim=Math.hypot(x/.065,(z-.11)/.075);
  let c=mix(dark,shell,top*(1.2-rim*.6));
  if(top>.5&&Math.abs(x)<.004&&z<.15)c=mix(c,dark,.6);
  if(rim>.86&&top>.2)c=mix(c,pale,.35);
  if(noise(x,y,z)>.95)c=mix(c,pale,.4);
  return c;
 });
 P.add(new THREE.SphereGeometry(.014,10,6),at(0,Y+.036,.13,[0,0,0],[1.3,.7,1]),dark);
 // underside plate under the legs
 P.add(new THREE.SphereGeometry(.5,14,6),at(0,Y-.01,.08,[0,0,0],[.09,.025,.16]),dark);
 // mesosoma: seven overlapping plates, each lifting a little at its back edge, pale along it
 for(let i=0;i<7;i++){
  const z=.035-i*.033,w=i<5?.14+i*.004:.15-(i-4)*.022,zc=z;
  P.add(new THREE.SphereGeometry(.5,16,8),at(0,Y+.008-i*.001,zc,[.08,0,0],[w,.052,.05]),(x,y,zz)=>{
   const top=THREE.MathUtils.clamp((y-Y+.012)/.035,0,1),back=THREE.MathUtils.clamp((zc-zz)/.025,0,1);
   let c=mix(dark,shell,top*1.1);
   if(back>.72&&top>.3)c=mix(c,pale,.45);
   if(top>.55&&Math.abs(Math.abs(x)-w*.22)<.004)c=mix(c,dark,.5);
   return c;
  });
 }
 // the belly under the plates
 P.add(new THREE.SphereGeometry(.5,14,6),at(0,Y-.008,-.065,[0,0,0],[.12,.03,.25]),dark);
 // mouthparts: two stubby chelicerae in front of the carapace
 for(const s of [-1,1])pod(P,[s*.013,Y+.004,.175],[s*.011,Y-.002,.2],.018,.016,mix(dark,shell,.5),8,6);
 return P.merge();
}

function buildEyes(){
 const P=pieces(),c=[1,1,1];
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.0075,8,6),at(s*.008,Y+.044,.132),c);
  // three tiny lateral eyes at each front corner
  for(let k=0;k<3;k++)P.add(new THREE.SphereGeometry(.0042,5,4),at(s*(.04+k*.006),Y+.024,.168-k*.007),c);
 }
 return P.merge();
}

// The tail's pivot is at the back of the last plate. It rises backwards, curls up and over and
// hangs the stinger forward above the back.
const TAIL=[[0,0,0],[0,.035,-.062],[0,.1,-.1],[0,.172,-.096],[0,.226,-.052],[0,.25,.012]];
function buildTail(L){
 const P=pieces(),shell=rgb(L.shell),dark=rgb(L.dark),pale=rgb(L.pale),tip=rgb(L.tip),bulb=rgb(L.bulb);
 for(let i=0;i<5;i++){
  const w=.04-i*.0025,a=TAIL[i],b=TAIL[i+1];
  // each segment is a knobbly pod, keeled along the top, dark at its ends
  pod(P,a,b,w,w*.92,(x,y,z)=>{
   const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),t=THREE.MathUtils.clamp(new THREE.Vector3(x,y,z).sub(A).dot(B.clone().sub(A))/B.clone().sub(A).lengthSq(),0,1);
   let c=mix(shell,dark,Math.pow(Math.abs(t-.5)*2,3)*.8);
   if(Math.abs(x)<.004)c=mix(c,pale,.3);
   if(noise(x,y,z)>.94)c=mix(c,pale,.35);
   return c;
  },12,8);
  // a pale ring at each joint
  P.add(new THREE.SphereGeometry(w*.42,8,6),at(...b),pale);
 }
 // the telson: a swollen venom bulb and a hooked stinger curving down at the front
 const end=TAIL[5];
 P.add(new THREE.SphereGeometry(.5,14,10),at(end[0],end[1]+.004,end[2]+.022,[-.3,0,0],[.042,.036,.054]),(x,y,z)=>mix(bulb,dark,THREE.MathUtils.clamp((z-end[2]-.02)/.03,0,1)*.6));
 const hook=[[0,end[1]+.004,end[2]+.046],[0,end[1]-.004,end[2]+.064],[0,end[1]-.024,end[2]+.074],[0,end[1]-.042,end[2]+.07]];
 for(let i=0;i<3;i++)segment(P,hook[i],hook[i+1],.011-i*.004,.007-i*.0032,tip,6);
 return P.merge();
}

// The right pincer, from its shoulder (the group origin) forward. The left one mirrors it.
function buildClaw(L){
 const P=pieces(),shell=rgb(L.shell),dark=rgb(L.dark),pale=rgb(L.pale),tip=rgb(L.tip);
 const shoulder=[0,0,0],elbow=[.075,.03,.05],wrist=[.06,.024,.12];
 segment(P,shoulder,elbow,.013,.012,mix(shell,dark,.3),7);
 P.add(new THREE.SphereGeometry(.015,8,6),at(...elbow),pale);
 pod(P,elbow,wrist,.03,.026,shell,10,7);
 P.add(new THREE.SphereGeometry(.015,8,6),at(...wrist),pale);
 // the hand: fat and ridged, shiny on top
 const hand=[.052,.024,.168];
 P.add(new THREE.SphereGeometry(.5,16,10),at(...hand,[0,-.2,0],[.06,.042,.082]),(x,y,z)=>{
  const top=THREE.MathUtils.clamp((y-.004)/.04,0,1);
  let c=mix(dark,shell,.3+top*.9);
  if(Math.abs(Math.sin((x-.052)*95))<.12&&top>.3)c=mix(c,dark,.45);
  return c;
 });
 // fixed finger on the outside, hinged finger on the inside, both curving in to dark tips
 const fingers=[[[.068,.024,.2],[.068,.022,.232],[.056,.02,.262],[.04,.018,.278]],[[.038,.024,.198],[.03,.024,.228],[.03,.022,.256],[.04,.02,.274]]];
 for(const f of fingers){
  for(let i=0;i<3;i++)segment(P,f[i],f[i+1],.011-i*.0032,.008-i*.0028,i===2?tip:mix(shell,tip,i*.35),6);
  // teeth along the biting edge
  for(let k=1;k<5;k++){const t=k/5,p=new THREE.Vector3(...f[1]).lerp(new THREE.Vector3(...f[2]),t);P.add(new THREE.ConeGeometry(.0028,.007,4),at(p.x+(f===fingers[0]?-.008:.008),p.y,p.z,[0,0,f===fingers[0]?Math.PI/2:-Math.PI/2]),pale);}
 }
 return P.merge();
}

// One right-hand leg, from its hip (the group origin). The hips run down the side of the carapace;
// the front pair reaches forward a little, the back pairs rake back.
const PAIRS=[{ang:.45,reach:.15,knee:.05},{ang:.12,reach:.16,knee:.055},{ang:-.35,reach:.18,knee:.06},{ang:-.75,reach:.2,knee:.06}];
function buildLeg(L,i){
 const P=pieces(),{ang,reach,knee}=PAIRS[i],shell=rgb(L.shell),dark=rgb(L.dark),pale=rgb(L.pale);
 const dir=(r,y)=>[Math.cos(ang)*r,y,Math.sin(ang)*r];
 const pts=[[0,0,0],dir(.03,.01),dir(.075,knee),dir(.12,knee-.02),dir(reach-.015,-Y+.03),dir(reach,-Y+.005)];
 const radii=[.011,.01,.009,.0075,.006,.0035];
 for(let j=0;j<pts.length-1;j++){
  segment(P,pts[j],pts[j+1],radii[j],radii[j+1],j%2?shell:mix(shell,dark,.35),6);
  if(j>0)P.add(new THREE.SphereGeometry(radii[j]*1.1,6,5),at(...pts[j]),pale);
 }
 P.add(new THREE.SphereGeometry(.0045,5,4),at(...pts[5]),dark);
 return P.merge();
}

const cache=new Map();
function build(key,L){
 if(cache.has(key))return cache.get(key);
 const S={
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:.08}),
  eyeMaterial:new THREE.MeshStandardMaterial({color:L.eye,emissive:L.eye,emissiveIntensity:1.6,roughness:.15}),
  body:buildBody(L),eyes:buildEyes(),tail:buildTail(L),claw:buildClaw(L),legs:PAIRS.map((p,i)=>buildLeg(L,i)),
 };
 // Scorpius's venom bulb glows: the tail gets its own emissive copy of the material
 S.tailMaterial=L.glow?new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:.08,emissive:L.bulb,emissiveIntensity:.35}):S.material;
 cache.set(key,S);return S;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createScorpion(name){
 const key=(name||'').toLowerCase(),L=LOOKS[key]||LOOKS.scorpion,S=build(LOOKS[key]?key:'scorpion',L);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(L.scale);
 mesh(body,S.body,S.material,'body');
 const head=mesh(body,S.eyes,S.eyeMaterial,'eyes');
 const tail=new THREE.Group();tail.position.set(0,Y+.012,-.19);body.add(tail);
 mesh(tail,S.tail,S.tailMaterial,'tail');
 const claws=[1,-1].map(s=>{
  const claw=new THREE.Group();claw.position.set(s*.05,Y+.004,.15);body.add(claw);
  const m=mesh(claw,S.claw,S.material,'claw');if(s<0)m.scale.x=-1;
  return claw;
 });
 const legs=[];
 for(const s of [1,-1])S.legs.forEach((geo,i)=>{
  const leg=new THREE.Group();
  leg.position.set(s*.052,Y,.12-i*.03);body.add(leg);
  const m=mesh(leg,geo,S.material,'leg');if(s<0)m.scale.x=-1;
  legs.push(leg);
 });
 return {g,body,legs,tail,wings:[],quirk:'spider',head,claws};
}
