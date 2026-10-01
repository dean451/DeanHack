import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';
import {segment,chain} from './ant.js';

// The locust (UnNetHack, S_ANT, grey) used to fall through createAnt's glyph-colour fallback: the
// giant ant in grey. It now has a plague locust's build, head to the front (+z):
// - Head: a long, hooded face that drops steeply to the jaws, with big bulging compound eyes the
//   colour of old blood (a pale glint on top), a split labrum over short toothed mandibles, palps,
//   and short, stiff, beaded antennae swept forward and out.
// - Pronotum: a saddle-shaped shield over the thorax, flared at the sides, with a saw-toothed keel
//   running down its back.
// - Wings: the leathery forewings fold in a roof along the back and run past the end of the
//   abdomen, ash-brown blotched with soot along the veins, darker at the trailing edge, ending in
//   ragged points. The banded abdomen shows beneath them and ends in a short black sting.
// - Legs: four small walking legs at the front, and the great jumping hind legs: a swollen femur
//   with a herringbone of dark grooves raised up and back to a black knee above the wings, the
//   tibia folded down beneath it, blood-red inside and lined with two rows of black-tipped spines.
// The head is one vertex-coloured mesh on a neck pivot, the thorax, wings and abdomen another;
// each leg is its own group holding one mesh (the tripod walk swings them). 8 draws, one material.
// Geometry is built once and shared; the left legs reuse the right ones mirrored.
// Handles: body, legs (6), head (the neck pivot group), quirk 'insect', hopper 'locust' (locust-hop.js).

const LOOKS={
 locust:{scale:1.15,shell:'#77705c',dark:'#211d16',pale:'#b0a684',wing:'#857a5e',soot:'#2c261c',eye:'#6e1a10',glint:'#e0b49a',blood:'#8e2216',sting:'#100d0a'},
};
const Y=.12;// thorax height above the floor, before scaling
const HIP=Y-.025;// hip height
const NECK=[0,Y+.015,.15];

const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const grain=(x,y,z,f=160)=>hash(Math.floor(x*f)*7.3+Math.floor(y*f)*3.1+Math.floor(z*f)*1.7);
const top=(lo,hi)=>y=>THREE.MathUtils.clamp((y-lo)/(hi-lo),0,1);

function buildHead(L){
 const P=pieces(),shell=rgb(L.shell),dark=rgb(L.dark),pale=rgb(L.pale),eye=rgb(L.eye),glint=rgb(L.glint);
 const hz=.19;
 // the face: a tall capsule pitched forward, so the brow hoods the eyes and the face drops to the jaws
 P.add(new THREE.SphereGeometry(.042,18,14),at(0,Y+.01,hz,[.55,0,0],[.9,1.35,1]),(x,y,z)=>{
  let c=mix(dark,shell,.3+top(Y-.04,Y+.05)(y)*.8);
  if(Math.abs(x)<.004&&y>Y)c=mix(c,dark,.55);// the median groove over the crown
  if(z>hz+.025&&y<Y)c=mix(c,pale,.3);// a paler face
  if(grain(x,y,z)>.9)c=mix(c,dark,.4);
  return c;
 });
 // the occiput swells back into the pronotum
 P.add(new THREE.SphereGeometry(.036,14,10),at(0,Y+.025,hz-.03,[0,0,0],[1,.95,1.1]),(x,y)=>mix(dark,shell,.25+top(Y,Y+.06)(y)*.7));
 // compound eyes: big bulging ovals high on the sides, old blood with a pale glint on top
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.021,12,10),at(s*.033,Y+.03,hz+.01,[0,s*.35,0],[.75,1.15,1.05]),(x,y,z)=>y>Y+.042&&z>hz+.008?glint:mix(rgb('#160806'),eye,top(Y+.01,Y+.04)(y)));
 // the labrum, split down the middle, and short toothed mandibles under it
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.012,8,6),at(s*.008,Y-.05,hz+.036,[.3,0,0],[1,1.3,.6]),mix(pale,shell,.5));
  const pts=[[s*.017,Y-.052,hz+.03],[s*.014,Y-.064,hz+.04],[-s*.002,Y-.068,hz+.044]];
  chain(P,pts,[.007,.005,.0015],j=>j?rgb(L.sting):dark,5);
  // palps: two short jointed feelers hanging from the mouth
  chain(P,[[s*.02,Y-.055,hz+.025],[s*.03,Y-.07,hz+.035],[s*.028,Y-.085,hz+.04]],[.003,.0025,.002],mix(pale,shell,.4),4);
 }
 // antennae: stiff and beaded, swept forward and out from between the eyes
 for(const s of [-1,1]){
  const n=11,base=new THREE.Vector3(s*.012,Y+.03,hz+.03),dir=new THREE.Vector3(s*.45,.55,.7).normalize();
  for(let k=0;k<n;k++){
   const p=base.clone().addScaledVector(dir,k*.011);p.y-=k*k*.00025;
   P.add(new THREE.SphereGeometry(.0042-k*.00015,5,4),at(p.x,p.y,p.z,[0,0,0],[1,1,1.3]),k%2?dark:mix(dark,shell,.5));
  }
 }
 const geo=P.merge();geo.translate(-NECK[0],-NECK[1],-NECK[2]);return geo;
}

function buildBody(L){
 const P=pieces(),shell=rgb(L.shell),dark=rgb(L.dark),pale=rgb(L.pale),wing=rgb(L.wing),soot=rgb(L.soot);
 // thorax under the shield
 P.add(new THREE.SphereGeometry(.038,14,10),at(0,Y-.005,.08,[0,0,0],[.95,.95,1.5]),(x,y)=>mix(dark,shell,.2+top(Y-.04,Y+.03)(y)*.6));
 // pronotum: a saddle over the thorax, flared at the sides and lower behind, grained and darker at the rim
 P.add(new THREE.SphereGeometry(.045,18,12,0,Math.PI*2,0,Math.PI*.62),at(0,Y-.002,.11,[-.08,0,0],[1.02,1.05,1.35]),(x,y,z)=>{
  const t=top(Y-.03,Y+.045)(y);let c=mix(dark,shell,.25+t*.85);
  if(t<.25)c=mix(c,dark,.5);// the rim
  if(grain(x,y,z,200)>.88)c=mix(c,pale,.3);
  return c;
 });
 // the saw-toothed keel down the shield's back
 for(let k=0;k<6;k++){
  const z=.165-k*.022,y=Y+.044-k*k*.0006;
  segment(P,[0,y-.004,z+.006],[0,y+.011-k*.001,z-.006],.0045,.0006,k%2?dark:mix(dark,shell,.5),4);
 }
 // abdomen: a long tapering tube of banded plates under the wings, curving down to the sting
 const segs=9;
 for(let k=0;k<segs;k++){
  const u=k/(segs-1),z=.035-u*.27,y=Y-.012-u*u*.03,r=.033-u*.015;
  P.add(new THREE.SphereGeometry(r,12,8),at(0,y,z,[0,0,0],[.95,.9,.95]),(x,py)=>{
   const t=top(y-r,y+r)(py);let c=mix(dark,shell,.2+t*.7);
   if(t<.35)c=mix(c,pale,.35);// a paler belly
   return k%2?mix(c,dark,.25):c;
  });
 }
 // a short black sting (it stings: AT_STNG, disease)
 segment(P,[0,Y-.045,-.235],[0,Y-.07,-.28],.007,.0008,rgb(L.sting),6);
 // forewings: leathery blades folded in a roof along the back, past the end of the abdomen. Each
 // is a flattened capsule rolled out from the midline; blotched with soot, darker at the trailing
 // edge, with a few pale cross veins. Their tips break into ragged points.
 for(const s of [-1,1]){
  const cx=s*.019,cz=-.09,len=.2;
  P.add(new THREE.SphereGeometry(1,22,8),at(cx,Y+.03,cz,[-.06,0,-s*.55],[.03,.006,len]),(x,y,z)=>{
   const u=(z-cz)/len,edge=Math.abs(x)>.028?1:0;// u: -1 at the tip, 1 at the shoulder
   let c=mix(wing,shell,.3+u*.2);
   const b=grain(x*.35,0,z*.55,90);if(b>.72)c=mix(c,soot,.65);// soot blotches
   if(Math.abs((z*70)%1)<.08)c=mix(c,rgb(L.pale),.25);// cross veins
   if(edge)c=mix(c,soot,.55);
   if(u<-.75)c=mix(c,soot,(-.75-u)*2.4);// smoky tips
   return c;
  });
  // ragged points at the wing tip
  for(let k=0;k<3;k++){
   const x=cx+s*(.004+k*.008),z=cz-len*.92+k*.012;
   segment(P,[x,Y+.024-k*.004,z+.016],[x+s*.003,Y+.02-k*.005,z-.022+k*.004],.006,.0006,soot,4);
  }
 }
 return P.merge();
}

// One right-hand leg. The hip is the origin; the geometry reaches out to +x and down to the floor
// at y=-HIP. Pairs 0 and 1 are small walking legs; pair 2 is the great jumping hind leg.
const PAIRS=[{ang:.95,reach:.13,knee:.04,z:.11},{ang:.25,reach:.14,knee:.045,z:.07},{z:.035}];
function buildLeg(L,i){
 const P=pieces(),shell=rgb(L.shell),dark=rgb(L.dark),pale=rgb(L.pale),blood=rgb(L.blood),tip=rgb(L.sting);
 if(i<2){
  const {ang,reach,knee}=PAIRS[i],dir=(r,y,turn=0)=>[Math.cos(ang+turn)*r,y,Math.sin(ang+turn)*r];
  const pts=[[0,0,0],dir(.02,-.015),dir(.07,knee),dir(reach-.035,-HIP+.02),dir(reach,-HIP+.004,i?0:.15)];
  chain(P,pts,[.009,.008,.006,.0045,.003],j=>j===1?mix(dark,shell,.85):mix(dark,shell,.55-j*.1),6);
  for(const s of [-1,1])segment(P,pts[4],[pts[4][0]+.008,-HIP+.001,pts[4][2]+s*.004],.002,.0006,tip,4);
  return P.merge();
 }
 // the hind leg: femur up and back to a knee above the wings, tibia folded down beneath it
 const hip=[0,0,0],swell=[.03,.04,-.07],knee=[.05,.105,-.2],foot=[.075,-HIP+.012,-.05],toe=[.085,-HIP+.002,-.015];
 const along=new THREE.Vector3(...knee).normalize();
 // femur: thick at the hip, swollen with muscle, tapering hard to the knee. A herringbone of dark
 // grooves runs down its outer face, and its underside is pale.
 const femur=(x,y,z)=>{
  const p=new THREE.Vector3(x,y,z),d=p.dot(along),off=p.clone().sub(along.clone().multiplyScalar(d));
  let c=mix(dark,shell,.45+top(-.02,.12)(y)*.5);
  if(off.y<-.01)c=mix(c,pale,.4);
  else if(x>.01&&Math.abs(((d*55+Math.abs(off.y)*80)%1))<.32)c=mix(c,dark,.55);
  return c;
 };
 P.add(new THREE.SphereGeometry(.014,10,8),at(...hip),femur);
 segment(P,hip,swell,.014,.024,femur,10);
 P.add(new THREE.SphereGeometry(.024,10,8),at(...swell,[0,0,0],[.9,1,1]),femur);
 segment(P,swell,knee,.024,.008,femur,10);
 P.add(new THREE.SphereGeometry(.0105,8,6),at(...knee),tip);// a black knee
 // tibia: blood red inside, lined with two rows of black-tipped spines pointing back and down
 segment(P,knee,foot,.0075,.005,(x,y,z)=>x>.068?mix(dark,shell,.5):blood,7);
 const K=new THREE.Vector3(...knee),F=new THREE.Vector3(...foot);
 for(let k=1;k<=7;k++){
  const p=K.clone().lerp(F,k/8.5);
  for(const r of [-1,1]){
   const q=p.clone().add(new THREE.Vector3(r*.006-.002,-.004,-.017));
   segment(P,p.toArray(),q.toArray(),.0028,.0005,(x,y,z)=>new THREE.Vector3(x,y,z).distanceTo(p)>.011?tip:blood,4);
  }
 }
 // tarsus: three pads along the floor and a hooked claw
 const T=new THREE.Vector3(...toe);
 for(let k=1;k<=3;k++){const p=F.clone().lerp(T,k/3.5);P.add(new THREE.SphereGeometry(.0045,6,4),at(p.x,p.y,p.z,[0,0,0],[1,.7,1.3]),k===3?dark:mix(dark,pale,.4));}
 segment(P,toe,[toe[0]+.003,-HIP,toe[2]+.01],.0025,.0006,tip,4);
 return P.merge();
}

const cache=new Map();
function build(key,L){
 if(cache.has(key))return cache.get(key);
 const S={
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.05}),
  body:buildBody(L),head:buildHead(L),legs:[0,1,2].map(i=>buildLeg(L,i)),
 };
 cache.set(key,S);return S;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function isLocust(name){return !!LOOKS[name];}

export function createLocust(name){
 const L=LOOKS[name]||LOOKS.locust,S=build(LOOKS[name]?name:'locust',L);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(L.scale);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(...NECK);body.add(head);
 mesh(head,S.head,S.material,'head');
 const legs=[];
 for(const s of [1,-1])S.legs.forEach((geo,i)=>{
  const leg=new THREE.Group();
  leg.position.set(s*(i<2?.022:.026),HIP,PAIRS[i].z);body.add(leg);
  const m=mesh(leg,geo,S.material,'leg');if(s<0)m.scale.x=-1;
  legs.push(leg);
 });
 return {g,body,legs,tail:null,wings:[],quirk:'insect',head,hopper:'locust'};
}
