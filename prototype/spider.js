import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Spiders used to be two plain spheres with a flat plate on top, four red dots and eight bent
// sticks. They now have a proper spider build: a domed cephalothorax with a dark fovea and
// radiating grooves, a pinched waist (pedicel) and a big egg-shaped abdomen with spinnerets.
// Two chelicerae hang under the face with curved glossy fangs, and two short pedipalps reach
// forward beside them. Eight eyes sit in two rows on the front of the head: two big forward
// eyes, and three smaller pairs round them.
// Each leg bends properly: a short coxa, the femur rising steeply to a high knee, then the tibia
// and metatarsus reaching down and out to a tarsus that rests on the floor. The front pair
// reaches forward, the back pair reaches back, and the front and back legs are the longest.
// - cave spider: small, a dusty grey-brown with a darker heart mark down the abdomen, pale
//   speckles, and pale rings at every leg joint. Dim amber eyes.
// - giant spider: a hulking, hairy, tarantula-like spider. Purple-black with rust-orange
//   chevrons down the abdomen and orange knee bands, and bristles all over. Red glowing eyes.
// - any other 's' falls back on the cave spider's build in the glyph colour.
// The body (with fangs and palps) is one vertex-coloured mesh and the eyes are another (they
// glow); each leg is its own group (the walk swings them) holding one mesh. 10 draws. Geometry
// is built once per look and shared; the left legs reuse the right ones mirrored.
// Handles: body, legs (8), head (the eye mesh), quirk 'spider'.

const LOOKS={
 'cave spider':{scale:.65,shell:'#7a7a74',dark:'#3e3c38',mark:'#2e2c2a',pale:'#b8b2a4',band:'#c8c0ae',eye:'#ffb040',hair:0,chevrons:false},
 'giant spider':{scale:1.5,shell:'#4a2a5a',dark:'#1e1224',mark:'#c0602a',pale:'#7a5a86',band:'#d07a34',eye:'#ff2a1a',hair:1,chevrons:true},
};
const Y=.24;// body height above the floor, before scaling

const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const noise=(x,y,z)=>hash(Math.floor(x*90)*7.1+Math.floor(y*90)*13.7+Math.floor(z*90)*3.3);

// a tapered segment from a to b: a cylinder turned to point along b-a
function segment(P,a,b,r0,r1,colour,radial=7){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A),len=dir.length();
 const geo=new THREE.CylinderGeometry(r1,r0,len,radial,1);
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
 P.add(geo,new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)),colour);
}

function buildBody(L){
 const P=pieces(),shell=rgb(L.shell),dark=rgb(L.dark),mark=rgb(L.mark),pale=rgb(L.pale);
 // cephalothorax: a domed shield, darker at the edges, with a fovea and grooves running out from it
 P.add(new THREE.SphereGeometry(.1,20,14),at(0,Y+.01,.07,[0,0,0],[1,.62,1.12]),(x,y,z)=>{
  const top=THREE.MathUtils.clamp((y-Y+.02)/.08,0,1),rim=Math.hypot(x/.1,(z-.07)/.112);
  let c=mix(dark,shell,top*(1.15-rim*.5));
  const ang=Math.atan2(x,z-.06),groove=Math.abs(Math.sin(ang*4));
  if(top>.4&&rim>.2&&rim<.85&&groove<.18)c=mix(c,dark,.55);
  if(Math.hypot(x,z-.05)<.018&&top>.6)c=dark;
  return c;
 });
 // the head rises a little at the front, where the eyes sit
 P.add(new THREE.SphereGeometry(.058,16,10),at(0,Y+.035,.13,[0,0,0],[1,.8,.9]),(x,y)=>mix(dark,shell,(y-Y)/.07));
 // sternum under the legs
 P.add(new THREE.SphereGeometry(.07,12,8),at(0,Y-.035,.07,[0,0,0],[1,.35,1.2]),dark);
 // pedicel: the thin waist
 segment(P,[0,Y+.005,-.015],[0,Y+.02,-.06],.03,.026,dark,8);
 // abdomen: an egg, fat at the back, with a heart mark (cave) or chevrons (giant) along the top
 const az=-.19,ar=.16;
 P.add(new THREE.SphereGeometry(ar,26,18),at(0,Y+.06,az,[.18,0,0],[.92,.84,1.18]),(x,y,z)=>{
  const u=(az+.04-z)/(ar*2.2),top=THREE.MathUtils.clamp((y-Y-.02)/.12,0,1),side=Math.abs(x);
  let c=mix(dark,shell,.35+top*.75);
  if(L.chevrons){
   const band=(u*5.2+side*9)%1;
   if(top>.35&&u>.1&&u<.92&&band<.28&&side<.1-u*.03)c=mix(c,mark,.85);
   if(top>.5&&side<.012+u*.01&&u<.45)c=mix(c,mark,.6);
  }else{
   if(top>.45&&side<.028*(1-u)+.006&&u<.7)c=mix(c,mark,.8);
   if(top>.4&&u>.5&&u<.9&&(u*6%1)<.3&&side<.06)c=mix(c,mark,.5);
  }
  if(noise(x,y,z)>.93)c=mix(c,pale,.7);
  return c;
 });
 // spinnerets at the tail end
 for(const s of [-1,1])segment(P,[s*.012,Y+.02,az-.17],[s*.02,Y+.015,az-.21],.012,.006,dark,6);
 // chelicerae with their curved fangs folded under
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.026,10,8),at(s*.024,Y-.005,.175,[.4,0,0],[.9,1.4,.95]),(x,y)=>mix(dark,shell,(y-Y+.04)/.06));
  segment(P,[s*.026,Y-.035,.19],[s*.018,Y-.06,.175],.009,.006,rgb('#1a1412'),6);
  segment(P,[s*.018,Y-.06,.175],[s*.008,Y-.066,.158],.006,.001,rgb('#2a2018'),6);
  // pedipalps: short feelers held forward and down
  segment(P,[s*.045,Y-.01,.16],[s*.075,Y+.02,.22],.012,.01,shell,6);
  segment(P,[s*.075,Y+.02,.22],[s*.07,Y-.04,.26],.01,.012,dark,6);
 }
 // bristles on the giant spider: short dark hairs over the abdomen and the carapace
 if(L.hair){
  const n=90;
  for(let i=0;i<n;i++){
   const th=Math.acos(1-2*(i+.5)/n),ph=i*2.39996;
   const nx=Math.sin(th)*Math.cos(ph),ny=Math.cos(th),nz=Math.sin(th)*Math.sin(ph);
   if(ny<-.35)continue;
   const base=[nx*ar*.9,Y+.06+ny*ar*.82,az+nz*ar*1.14],tip=[base[0]+nx*.035,base[1]+ny*.03+.008,base[2]+nz*.03-.012];
   segment(P,base,tip,.0045,.0008,i%3?dark:rgb(L.pale),3);
  }
 }
 return P.merge();
}

function buildEyes(){
 const P=pieces(),c=[1,1,1];
 // two big forward eyes, a smaller pair beside them, and two pairs higher and further back
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.013,8,6),at(s*.015,Y+.055,.175),c);
  P.add(new THREE.SphereGeometry(.008,6,5),at(s*.036,Y+.05,.165),c);
  P.add(new THREE.SphereGeometry(.009,6,5),at(s*.022,Y+.078,.155),c);
  P.add(new THREE.SphereGeometry(.008,6,5),at(s*.042,Y+.068,.14),c);
 }
 return P.merge();
}

// One right-hand leg. i is the pair, 0 at the front. The hip is the origin; the geometry reaches
// out to +x and bends to the floor at y=-Y.
const PAIRS=[{ang:.95,reach:.4,knee:.15},{ang:.35,reach:.34,knee:.14},{ang:-.2,reach:.33,knee:.13},{ang:-.8,reach:.4,knee:.15}];
function buildLeg(L,i){
 const P=pieces(),{ang,reach,knee}=PAIRS[i],shell=rgb(L.shell),dark=rgb(L.dark),band=rgb(L.band);
 const dir=(r,y)=>[Math.cos(ang)*r,y,Math.sin(ang)*r];
 const pts=[[0,0,0],dir(.05,.02),dir(.15,knee),dir(.26,knee-.06),dir(reach-.03,-Y+.05),dir(reach,-Y+.006)];
 const radii=[.018,.016,.015,.012,.009,.006,.004];
 const joint=j=>{const p=pts[j];P.add(new THREE.SphereGeometry(radii[j]*1.08,6,5),at(...p),j>0&&j<5?band:dark);};
 for(let j=0;j<pts.length-1;j++){
  const c=j===0?dark:j%2?shell:mix(shell,dark,.35);
  segment(P,pts[j],pts[j+1],radii[j],radii[j+1],c,6);
  joint(j);
  if(L.hair&&j>0&&j<4){
   // a few bristles sticking out of the femur, patella and tibia
   const a=new THREE.Vector3(...pts[j]),b=new THREE.Vector3(...pts[j+1]);
   for(let k=1;k<6;k++){
    const p=a.clone().lerp(b,k/6),out=new THREE.Vector3(Math.cos(ang),0,Math.sin(ang)).multiplyScalar(.018);
    const tip=p.clone().add(out).add(new THREE.Vector3(0,.02*(k%2?1:-.4),0));
    segment(P,p.toArray(),tip.toArray(),.004,.0008,dark,3);
   }
  }
 }
 // the claw tuft on the tarsus
 P.add(new THREE.SphereGeometry(.007,5,4),at(...pts[5]),dark);
 return P.merge();
}

const cache=new Map();
function build(key,L){
 if(cache.has(key))return cache.get(key);
 const S={
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:L.hair?.85:.55,metalness:.05}),
  eyeMaterial:new THREE.MeshStandardMaterial({color:L.eye,emissive:L.eye,emissiveIntensity:1.6,roughness:.15}),
  body:buildBody(L),eyes:buildEyes(),legs:PAIRS.map((p,i)=>buildLeg(L,i)),
 };
 cache.set(key,S);return S;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createSpider(name,colour){
 const known=LOOKS[name],L=known||{...LOOKS['cave spider'],scale:1,shell:colour||LOOKS['cave spider'].shell,dark:new THREE.Color(colour||'#7a7a74').multiplyScalar(.45).getStyle()};
 const S=build(known?name:'s:'+L.shell,L);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(L.scale);
 mesh(body,S.body,S.material,'body');
 const head=mesh(body,S.eyes,S.eyeMaterial,'eyes');
 const legs=[];
 for(const s of [1,-1])S.legs.forEach((geo,i)=>{
  const leg=new THREE.Group();
  leg.position.set(s*.06,Y,.1-i*.035);body.add(leg);
  const m=mesh(leg,geo,S.material,'leg');if(s<0)m.scale.x=-1;
  legs.push(leg);
 });
 return {g,body,legs,tail:null,wings:[],quirk:'spider',head};
}
