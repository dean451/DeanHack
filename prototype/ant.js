import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Ants used to share the generic insect: three plain spheres, two bent feelers and six sticks.
// They now have a proper ant build, head to the front (+z):
// - Head: a broad, slightly heart-shaped capsule with bulging compound eyes on the sides, a pair
//   of hooked, toothed mandibles meeting in front, and elbowed antennae (a long scape rising
//   from the face, a bend, then a beaded funiculus reaching forward to a small club).
// - Mesosoma: a narrow humped thorax (pronotum hump, then a lower propodeum).
// - Waist: a thin petiole with one upright scale-like node (giant ant) or two rounded nodes
//   (fire and soldier ants, both myrmicines).
// - Gaster: a big glossy egg tilted down at the back, with darker bands at the plate edges and a
//   bright sheen along the top. The stinging ants carry a stinger at its tip.
// - Legs: six jointed legs (coxa, femur up to a raised knee, tibia down, a segmented tarsus with
//   a claw on the floor). The front pair reaches forward and the hind pair, the longest, back.
// Looks:
// - giant ant: a rich chestnut brown, one petiole node, heavy mandibles.
// - soldier ant: steel blue, a big head with outsized mandibles, two nodes and a stinger.
// - fire ant: bright red-orange with a darker, smoky gaster, two nodes and a stinger.
// - any other 'a' falls back on the giant ant's build in the glyph colour.
// The head (with eyes, jaws and feelers) is one vertex-coloured mesh on a neck pivot, the
// thorax, waist and gaster another; each leg is its own group holding one mesh (the walk swings
// them). 8 draws, one material. Geometry is built once per look and
// shared; the left legs reuse the right ones mirrored.
// Handles: body, legs (6), head (the neck pivot group), quirk 'insect'.

const LOOKS={
 'giant ant':{scale:1,shell:'#7a4424',dark:'#2c170c',gaster:'#6a3a20',sheen:'#c08058',nodes:1,sting:false,jaw:1,headSize:1},
 'soldier ant':{scale:1.08,shell:'#3a4f8a',dark:'#141a30',gaster:'#2e3f72',sheen:'#8aa0d8',nodes:2,sting:true,jaw:1.35,headSize:1.18},
 'fire ant':{scale:.9,shell:'#c0441e',dark:'#4a140a',gaster:'#5a1e14',sheen:'#ff9a60',nodes:2,sting:true,jaw:.9,headSize:.95},
};
const Y=.19;// thorax height above the floor, before scaling

const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};

// a tapered segment from a to b: a cylinder turned to point along b-a
export function segment(P,a,b,r0,r1,colour,radial=7){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A),len=dir.length();
 const geo=new THREE.CylinderGeometry(r1,r0,len,radial,1);
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
 P.add(geo,new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)),colour);
}
// a chain of tapered segments with a ball at each joint
export function chain(P,pts,radii,colour,radial=6){
 for(let j=0;j<pts.length-1;j++){
  segment(P,pts[j],pts[j+1],radii[j],radii[j+1],typeof colour==='function'?colour(j):colour,radial);
  if(j>0)P.add(new THREE.SphereGeometry(radii[j]*1.05,radial,4),at(...pts[j]),typeof colour==='function'?colour(j):colour);
 }
}

// the neck pivot the head turns about
const neck=L=>[0,Y+.03,.2+(L.headSize-1)*.03-.055];

function buildHead(L){
 const P=pieces(),shell=rgb(L.shell),dark=rgb(L.dark),gaster=rgb(L.gaster),sheen=rgb(L.sheen),black=rgb('#0c0a0a');
 const top=(lo,hi)=>y=>THREE.MathUtils.clamp((y-lo)/(hi-lo),0,1);
 const hs=L.headSize,hz=.2+(hs-1)*.03;
 // head: a broad capsule, flattened top to bottom, darker underneath, with a faint notch at the back
 P.add(new THREE.SphereGeometry(.07,20,14),at(0,Y+.035,hz,[-.15,0,0],[1.08*hs,.78*hs,.95*hs]),(x,y,z)=>{
  const t=top(Y-.02,Y+.09)(y);let c=mix(dark,shell,.25+t*.85);
  if(t>.75&&Math.abs(x)<.006&&z<hz)c=mix(c,dark,.5);
  if(t>.8&&Math.abs(x)<.03&&z>hz-.02)c=mix(c,sheen,.35);
  return c;
 });
 // the back of the head bulges into two lobes
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.04,12,8),at(s*.032*hs,Y+.04,hz-.035*hs,[0,0,0],[1,.8,1].map(v=>v*hs)),(x,y)=>mix(dark,shell,.2+top(Y,Y+.08)(y)*.8));
 // clypeus: a little plate over the jaws
 P.add(new THREE.SphereGeometry(.03,12,6),at(0,Y+.02,hz+.06*hs,[0,0,0],[1.3*hs,.45*hs,.7*hs]),(x,y)=>mix(dark,shell,top(Y,Y+.035)(y)));
 // compound eyes: glossy black ovals with a faint pale glint
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.02,10,8),at(s*.066*hs,Y+.05,hz+.015,[0,s*.4,0],[.7,1,1.2]),(x,y,z)=>y>Y+.058&&z>hz+.018?rgb('#58504c'):black);
 // mandibles: hooked blades from the jaw corners, crossing a little in front, with teeth inside
 const J=L.jaw*hs,mz=hz+.055*hs;
 for(const s of [-1,1]){
  const pts=[[s*.036*hs,Y+.005,mz],[s*.05*J,Y,mz+.035*J],[s*.034*J,Y-.004,mz+.07*J],[-s*.006*J,Y-.006,mz+.085*J]];
  chain(P,pts,[.014*J,.012*J,.009*J,.003],j=>mix(dark,shell,.45-j*.15),6);
  for(let k=0;k<3;k++){
   const a=new THREE.Vector3(...pts[1]).lerp(new THREE.Vector3(...pts[2]),k/3+.1);
   segment(P,a.toArray(),[a.x-s*.013*J,a.y-.002,a.z+.004],.004,.0008,dark,4);
  }
 }
 // antennae: the scape rises up and out, elbows, then the beaded funiculus reaches forward to a club
 for(const s of [-1,1]){
  const base=[s*.02*hs,Y+.05,hz+.05*hs],elbow=[s*.085*hs,Y+.13,hz+.06],mid=[s*.105*hs,Y+.125,hz+.12],tip=[s*.115*hs,Y+.09,hz+.18];
  segment(P,base,elbow,.008,.006,mix(dark,shell,.5),6);
  P.add(new THREE.SphereGeometry(.0075,6,5),at(...elbow),dark);
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(...elbow),new THREE.Vector3(...mid),new THREE.Vector3(...tip));
  const n=9;
  for(let k=1;k<=n;k++){const p=curve.getPoint(k/n),r=k===n?.011:.0055+k*.0002;P.add(new THREE.SphereGeometry(r,6,5),at(p.x,p.y,p.z,[0,0,0],k===n?[1,1,1.5]:[1,1,1.3]),k>=n-1?dark:mix(dark,shell,.35));}
 }
 const geo=P.merge(),[nx,ny,nz]=neck(L);geo.translate(-nx,-ny,-nz);return geo;
}

function buildBody(L){
 const P=pieces(),shell=rgb(L.shell),dark=rgb(L.dark),gaster=rgb(L.gaster),sheen=rgb(L.sheen);
 const top=(lo,hi)=>y=>THREE.MathUtils.clamp((y-lo)/(hi-lo),0,1);
 // mesosoma: a narrow humped thorax, the pronotum high at the front, the propodeum low behind
 P.add(new THREE.SphereGeometry(.05,16,10),at(0,Y+.035,.115,[.3,0,0],[.9,.85,1.05]),(x,y)=>{const t=top(Y,Y+.08)(y);return Math.abs(x)<.015&&t>.85?mix(shell,sheen,.45):mix(dark,shell,.3+t*.8);});
 P.add(new THREE.SphereGeometry(.045,14,10),at(0,Y+.02,.05,[0,0,0],[.75,.8,1.5]),(x,y)=>mix(dark,shell,.3+top(Y-.02,Y+.06)(y)*.7));
 P.add(new THREE.SphereGeometry(.035,12,8),at(0,Y+.025,-.015,[-.4,0,0],[.85,.9,1.1]),(x,y)=>mix(dark,shell,.3+top(Y,Y+.06)(y)*.6));
 // waist: the petiole and its node (or two)
 segment(P,[0,Y+.01,-.04],[0,Y+.02,-.1],.013,.015,dark,8);
 if(L.nodes===1)P.add(new THREE.SphereGeometry(.03,12,8),at(0,Y+.045,-.065,[-.2,0,0],[1,1.35,.55]),(x,y)=>mix(dark,shell,.2+top(Y,Y+.08)(y)*.8));
 else{
  P.add(new THREE.SphereGeometry(.024,12,8),at(0,Y+.035,-.06,[0,0,0],[1,1.05,.9]),(x,y)=>mix(dark,shell,.2+top(Y,Y+.06)(y)*.8));
  P.add(new THREE.SphereGeometry(.028,12,8),at(0,Y+.03,-.1,[0,0,0],[1.15,.95,.9]),(x,y)=>mix(dark,shell,.2+top(Y,Y+.06)(y)*.8));
 }
 // gaster: a big glossy egg tilted down at the back, banded at the plate edges, a sheen on top
 const gz=-.24,gr=.12;
 P.add(new THREE.SphereGeometry(gr,26,18),at(0,Y+.035,gz,[-.28,0,0],[.88,.8,1.12]),(x,y,z)=>{
  const u=(-.12-z)/(gr*2.2),t=top(Y-.06,Y+.13)(y);
  let c=mix(dark,gaster,.3+t*.8);
  const band=(u*4.2+.15)%1;
  if(u>.1&&u<.95&&band<.12)c=mix(c,dark,.6);
  if(t>.78&&Math.abs(x)<.03+t*.01&&band>.2&&band<.7)c=mix(c,sheen,.4);
  if(hash(Math.floor(x*140)*7.3+Math.floor(y*140)*3.1+Math.floor(z*140))>.965)c=mix(c,rgb('#d8c8b0'),.35);
  return c;
 });
 if(L.sting){
  const tip=[0,Y-.04,gz-.14];
  segment(P,[0,Y-.02,gz-.115],tip,.009,.001,dark,6);
 }
 return P.merge();
}

// One right-hand leg. i is the pair, 0 at the front. The hip is the origin; the geometry reaches
// out to +x and bends to the floor at y=-Y.
const PAIRS=[{ang:.8,reach:.25,knee:.07,z:.1},{ang:.1,reach:.27,knee:.08,z:.055},{ang:-.65,reach:.33,knee:.09,z:.01}];
function buildLeg(L,i){
 const P=pieces(),{ang,reach,knee}=PAIRS[i],shell=rgb(L.shell),dark=rgb(L.dark);
 const dir=(r,y,turn=0)=>[Math.cos(ang+turn)*r,y,Math.sin(ang+turn)*r];
 // coxa, femur to a raised knee, tibia down, tarsus along the floor
 const pts=[[0,0,0],dir(.03,-.03),dir(.12,knee),dir(reach-.07,-Y+.03),dir(reach,-Y+.005,i===1?0:(i?-.12:.12))];
 const radii=[.016,.014,.011,.007,.004];
 chain(P,pts,radii,j=>j===1?mix(dark,shell,.85):mix(dark,shell,.55-j*.1),6);
 // tarsal beads and the claw
 const a=new THREE.Vector3(...pts[3]),b=new THREE.Vector3(...pts[4]);
 for(let k=1;k<4;k++){const p=a.clone().lerp(b,k/4);P.add(new THREE.SphereGeometry(.0055,5,4),at(p.x,p.y,p.z),dark);}
 P.add(new THREE.SphereGeometry(.005,5,4),at(...pts[4]),dark);
 return P.merge();
}

const cache=new Map();
function build(key,L){
 if(cache.has(key))return cache.get(key);
 const S={
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.34,metalness:.08}),
  body:buildBody(L),head:buildHead(L),legs:PAIRS.map((p,i)=>buildLeg(L,i)),
 };
 cache.set(key,S);return S;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function isAnt(name){return !!LOOKS[name];}

export function createAnt(name,colour){
 const known=LOOKS[name],base=LOOKS['giant ant'];
 const L=known||{...base,shell:colour||base.shell,gaster:new THREE.Color(colour||base.shell).multiplyScalar(.85).getStyle(),dark:new THREE.Color(colour||base.shell).multiplyScalar(.38).getStyle(),sheen:new THREE.Color(colour||base.shell).lerp(new THREE.Color('#ffffff'),.4).getStyle()};
 const S=build(known?name:'a:'+L.shell,L);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(L.scale);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(...neck(L));body.add(head);
 mesh(head,S.head,S.material,'head');
 const legs=[];
 for(const s of [1,-1])S.legs.forEach((geo,i)=>{
  const leg=new THREE.Group();
  leg.position.set(s*.028,Y-.005,PAIRS[i].z);body.add(leg);
  const m=mesh(leg,geo,S.material,'leg');if(s<0)m.scale.x=-1;
  legs.push(leg);
 });
 return {g,body,legs,tail:null,wings:[],quirk:'insect',head};
}
