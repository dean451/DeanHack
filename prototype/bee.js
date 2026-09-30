import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';
import {segment,chain} from './ant.js';

// Bees used to share the generic insect: three spheres, three flat black stripes, a cone and two
// flat wing blobs. They now have a proper bee build, hovering head to the front (+z):
// - Head: a broad, flattened, faintly triangular face with a pale fuzzy brow, big glossy compound
//   eyes wrapping the sides, three ocelli on the crown, small amber mandibles, a tongue folded
//   back under the chin, and elbowed antennae (a scape rising from the face, then a curved
//   flagellum drooping forward).
// - Thorax: a round fuzzy ball, a ginger pile with a darker bald patch on top, and a ruff of
//   short hair tufts sticking out all round.
// - Waist: a small petiole.
// - Abdomen: a lathed, pointed egg hanging a little down at the back, banded yellow and black
//   plate by plate, with a fine fuzz fringe at each plate edge and a dark barbed stinger.
// - Legs: six jointed legs hanging under the body as bees carry them in flight. The hind legs are
//   the longest, with a broad flattened tibia.
// - Wings: a forewing and a smaller hindwing per side, glassy membranes with dark veins (a thick
//   leading edge and a few veins fanning out to the edge), held back over the abdomen.
// Looks:
// - killer bee: bright yellow and black, a ginger thorax, ×.75.
// - queen bee: deep amber and dark brown, a long tapering abdomen that reaches past the wing
//   tips, ×1.1.
// The head is one vertex-coloured mesh on a neck pivot, the thorax, waist and abdomen another,
// each leg its own group with one mesh (the walk swings them), and each side's two wings share
// one group holding a glass membrane mesh and a vein mesh (the buzz sweeps the group about y).
// 12 draws, two materials. Geometry is built once per look and shared; the left legs and wings
// reuse the right ones mirrored.
// Handles: body, legs (6), head (the neck pivot group), wings (left, right; userData.side),
// quirk 'bee'.

const LOOKS={
 'killer bee':{scale:.75,yellow:'#eab424',black:'#1c150c',fuzz:'#c8843a',bald:'#3a2410',eye:'#1a1410',wingTint:'#e2ecf4',abdomen:1,wing:1,bands:4},
 'queen bee':{scale:1.1,yellow:'#c88a26',black:'#2e1a0c',fuzz:'#a86a30',bald:'#3a2212',eye:'#221a14',wingTint:'#ece4d8',abdomen:1.25,wing:.95,bands:5},
};
const Y=.5;// thorax height above the floor, before scaling (bees hover)
const NECK=[0,Y+.005,.095];

const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const grain=(x,y,z,f=160)=>hash(Math.floor(x*f)*7.3+Math.floor(y*f)*3.1+Math.floor(z*f)*1.7);
const top=(lo,hi)=>y=>THREE.MathUtils.clamp((y-lo)/(hi-lo),0,1);

// short hair tufts: little cones standing out along the normal of an ellipsoid
function tufts(P,centre,radii,n,len,colour,keep=()=>true){
 const up=new THREE.Vector3(0,1,0);
 for(let i=0;i<n;i++){
  // a Fibonacci sphere, so the tufts spread evenly
  const k=(i+.5)/n,phi=Math.acos(1-2*k),th=Math.PI*(1+Math.sqrt(5))*i;
  const u=new THREE.Vector3(Math.sin(phi)*Math.cos(th),Math.cos(phi),Math.sin(phi)*Math.sin(th));
  const p=new THREE.Vector3(u.x*radii[0],u.y*radii[1],u.z*radii[2]).add(new THREE.Vector3(...centre));
  if(!keep(p,u))continue;
  const nrm=new THREE.Vector3(u.x/radii[0],u.y/radii[1],u.z/radii[2]).normalize();
  const l=len*(.7+hash(i*3.7)*.6);
  const m=new THREE.Matrix4().compose(p.clone().addScaledVector(nrm,l*.4),new THREE.Quaternion().setFromUnitVectors(up,nrm),new THREE.Vector3(1,1,1));
  P.add(new THREE.ConeGeometry(.006,l,3,1),m,colour);
 }
}

function buildHead(L){
 const P=pieces(),yellow=rgb(L.yellow),black=rgb(L.black),fuzz=rgb(L.fuzz),eye=rgb(L.eye),pale=mix(rgb(L.fuzz),[1,.95,.85],.45);
 const hz=.135;
 // the face: broad and flattened front to back, narrowing a little to the jaws
 P.add(new THREE.SphereGeometry(.055,20,14),at(0,Y+.005,hz,[.25,0,0],[1.15,1.05,.72]),(x,y,z)=>{
  const t=top(Y-.05,Y+.06)(y),n=grain(x,y,z);
  let c=mix(black,fuzz,.15+t*.35);
  if(t>.55&&z>hz+.01)c=mix(c,pale,.55);// the fuzzy brow
  if(t<.3&&z>hz+.015)c=mix(c,mix(black,yellow,.5),.5);// the clypeus
  return mix(c,n>.5?pale:black,.18);
 });
 // compound eyes: big glossy kidney shapes wrapping the sides, with a pale glint
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.03,12,10),at(s*.05,Y+.012,hz+.004,[0,s*.35,s*.12],[.55,1.35,.95]),(x,y,z)=>y>Y+.03&&z>hz+.01?mix(eye,[.75,.75,.8],.55):eye);
 // ocelli on the crown
 for(const [x,z] of [[0,hz+.018],[-.014,hz+.004],[.014,hz+.004]])P.add(new THREE.SphereGeometry(.0055,6,5),at(x,Y+.056,z),eye);
 // mandibles and the tongue folded back under the chin
 for(const s of [-1,1])segment(P,[s*.018,Y-.04,hz+.03],[s*.004,Y-.058,hz+.042],.009,.004,mix(yellow,black,.35),5);
 segment(P,[0,Y-.045,hz+.03],[0,Y-.068,hz-.01],.005,.0035,mix(black,fuzz,.3),5);
 segment(P,[0,Y-.068,hz-.01],[0,Y-.06,hz-.05],.0035,.002,mix(black,fuzz,.3),5);
 // antennae: the scape rises from the face, elbows, and the flagellum droops forward
 for(const s of [-1,1]){
  const base=[s*.012,Y+.02,hz+.035],elbow=[s*.03,Y+.075,hz+.055];
  segment(P,base,elbow,.0055,.0045,black,5);
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(...elbow),new THREE.Vector3(s*.06,Y+.1,hz+.1),new THREE.Vector3(s*.075,Y+.07,hz+.15));
  let prev=curve.getPoint(0);
  for(let k=1;k<=8;k++){const p=curve.getPoint(k/8);segment(P,prev.toArray(),p.toArray(),.0042,.0042,black,5);prev=p;}
  P.add(new THREE.SphereGeometry(.0048,5,4),at(...prev.toArray()),black);
 }
 // a few pale hairs on the brow
 tufts(P,[0,Y+.012,hz],[.06,.055,.04],28,.014,pale,(p,u)=>u.y>.25&&u.z>-.2);
 const geo=P.merge();geo.translate(-NECK[0],-NECK[1],-NECK[2]);return geo;
}

// the abdomen profile (radius against distance along its axis), before the queen's stretch
const BELLY=[[0,0],[.03,.004],[.062,.02],[.082,.055],[.088,.095],[.082,.14],[.064,.185],[.04,.222],[.016,.25],[0,.262]];

const radiusAt=(prof,d)=>{for(let i=1;i<prof.length;i++)if(d<=prof[i][1]){const [r0,t0]=prof[i-1],[r1,t1]=prof[i];return r0+(r1-r0)*(d-t0)/(t1-t0);}return 0;};

function buildBody(L){
 const P=pieces(),yellow=rgb(L.yellow),black=rgb(L.black),fuzz=rgb(L.fuzz),bald=rgb(L.bald);
 // thorax: a round, fuzzy ball with a darker bald patch on top
 const tc=[0,Y,.03];
 P.add(new THREE.SphereGeometry(.075,22,16),at(...tc,[0,0,0],[1,.95,1.08]),(x,y,z)=>{
  const t=top(Y-.07,Y+.07)(y),n=grain(x,y,z);
  let c=mix(mix(black,fuzz,.4),fuzz,t);
  if(t>.8&&Math.abs(x)<.035&&Math.abs(z-tc[2])<.045)c=mix(c,bald,.75);
  return mix(c,n>.5?mix(fuzz,[1,.9,.7],.3):black,.2);
 });
 tufts(P,tc,[.075,.071,.081],110,.022,fuzz,(p,u)=>!(u.y>.8));
 // the waist
 P.add(new THREE.SphereGeometry(.02,10,8),at(0,Y-.015,-.05),black);
 // abdomen: a lathed, pointed egg hanging a little down at the back, banded plate by plate
 const stretch=L.abdomen,prof=BELLY.map(([r,t])=>[r*(stretch>1?.92:1),t*stretch]);
 const spline=new THREE.SplineCurve(prof.map(([r,t])=>new THREE.Vector2(r,t))),pts=spline.getPoints(44).map(v=>new THREE.Vector2(Math.max(0,v.x),v.y));
 pts[0].x=0;pts[pts.length-1].x=0;
 const tilt=-.28,origin=new THREE.Vector3(0,Y-.01,-.055),axis=new THREE.Vector3(0,Math.sin(tilt),-Math.cos(tilt)),len=prof[prof.length-1][1];
 const bands=L.bands;
 P.add(new THREE.LatheGeometry(pts,20),at(origin.x,origin.y,origin.z,[-Math.PI/2+tilt,0,0]),(x,y,z)=>{
  const p=new THREE.Vector3(x,y,z).sub(origin),u=p.dot(axis)/len,side=p.clone().addScaledVector(axis,-p.dot(axis)),up=side.y/Math.max(side.length(),1e-6);
  // plates: the front of each is yellow, the back black; the first is fuzzy ginger, the tip black
  const q=THREE.MathUtils.clamp((u-.08)/.8,0,.9999)*bands,band=q%1;
  let c=u<.08?mix(fuzz,black,.3):u>.88?black:band<.55?yellow:black;
  if(band>.5&&band<.58&&u>.08&&u<.88)c=mix(yellow,black,.5);// soft plate edge
  c=mix(c,black,(1-up)*.22);// darker underneath
  if(up>.75&&band<.45&&u>.08&&u<.88)c=mix(c,[1,1,.9],.18);// a sheen along the top
  return mix(c,grain(x,y,z,200)>.5?c:mix(c,black,.35),.4);
 });
 // a fringe of fine hair at each plate edge
 for(let k=0;k<=bands;k++){
  const u=.08+k*.8/bands,d=u*len,r=radiusAt(prof,d),c=origin.clone().addScaledVector(axis,d);
  for(let i=0;i<14;i++){
   const a=i/14*Math.PI*2,dir=new THREE.Vector3(Math.cos(a),Math.sin(a)*Math.cos(tilt),Math.sin(a)*Math.sin(tilt)).normalize();
   if(dir.y<-.6)continue;
   const p=c.clone().addScaledVector(dir,r*.98),m=new THREE.Matrix4().compose(p.clone().addScaledVector(dir,.004),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().addScaledVector(axis,.8).normalize()),new THREE.Vector3(1,1,1));
   P.add(new THREE.ConeGeometry(.004,.012,3,1),m,k===0?fuzz:mix(yellow,fuzz,.5));
  }
 }
 // the stinger, with a barb or two
 const tip=origin.clone().addScaledVector(axis,len),sting=tip.clone().addScaledVector(axis,.05).add(new THREE.Vector3(0,-.012,0));
 segment(P,tip.clone().addScaledVector(axis,-.008).toArray(),sting.toArray(),.006,.0008,black,6);
 for(const f of [.4,.65]){const b=tip.clone().lerp(sting,f);segment(P,b.toArray(),[b.x,b.y-.006,b.z+.006],.0015,.0003,black,3);}
 return P.merge();
}

// One right-hand leg, hanging under the body. i is the pair, 0 at the front; the hip is the origin.
const PAIRS=[{z:.07,out:.07,drop:.12,fwd:.05,len:1},{z:.035,out:.085,drop:.14,fwd:-.01,len:1.1},{z:0,out:.08,drop:.17,fwd:-.08,len:1.3}];
function buildLeg(L,i){
 const P=pieces(),{out,drop,fwd}=PAIRS[i],black=rgb(L.black),fuzz=rgb(L.fuzz),yellow=rgb(L.yellow);
 const pts=[[0,0,0],[out*.35,-.01,fwd*.15],[out,-drop*.35,fwd*.55],[out*.9,-drop*.8,fwd],[out*.95,-drop,fwd*1.15]];
 chain(P,pts,[.011,.01,.008,.006,.003],j=>j<2?mix(black,fuzz,.35):mix(black,yellow,.12),6);
 // the hind legs have a broad, flattened tibia
 if(i===2){const a=new THREE.Vector3(...pts[2]),b=new THREE.Vector3(...pts[3]),mid=a.clone().lerp(b,.55),dir=b.clone().sub(a),len=dir.length();
  P.add(new THREE.SphereGeometry(.018,10,8),new THREE.Matrix4().compose(mid,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()),new THREE.Vector3(.55,len*.4/.018,.32)),mix(black,fuzz,.3));}
 // tarsal beads and a claw
 const a=new THREE.Vector3(...pts[3]),b=new THREE.Vector3(...pts[4]);
 for(let k=1;k<3;k++){const p=a.clone().lerp(b,k/3);P.add(new THREE.SphereGeometry(.0045,5,4),at(p.x,p.y,p.z),black);}
 segment(P,pts[4],[pts[4][0]+.004,pts[4][1]-.006,pts[4][2]+.006],.0025,.0005,black,3);
 return P.merge();
}

// The right side's two wings, lying back over the abdomen with a little dihedral. The shapes are
// drawn in the (outward, backward) plane; `lay` puts them on the body.
const lay=new THREE.Matrix4().makeRotationZ(.16).multiply(new THREE.Matrix4().makeRotationY(.4)).multiply(new THREE.Matrix4().makeRotationX(.1)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI/2));
const onWing=(u,v,s)=>new THREE.Vector3(u*s,v*s,0).applyMatrix4(lay);
const FORE=[[0,0],[.06,.02],[.14,.07],[.2,.13],[.215,.17],[.2,.2],[.15,.19],[.09,.15],[.04,.09],[0,.035]];
const HIND=[[.005,.045],[.05,.08],[.1,.125],[.135,.17],[.13,.19],[.1,.185],[.05,.15],[.015,.1]];
function wingShape(pts,s){const sh=new THREE.Shape();sh.moveTo(pts[0][0]*s,pts[0][1]*s);sh.splineThru(pts.slice(1).concat([pts[0]]).map(([u,v])=>new THREE.Vector2(u*s,v*s)));return sh;}
function buildWings(L){
 const s=L.wing;
 const membrane=mergeShapes([new THREE.ShapeGeometry(wingShape(FORE,s),6),new THREE.ShapeGeometry(wingShape(HIND,s),6).translate(0,0,-.004)]);
 membrane.applyMatrix4(lay);
 // the hindwing tucks just under the forewing
 const V=pieces(),vein=mix(rgb(L.black),rgb(L.fuzz),.35);
 const path=(uv,r0,r1)=>{for(let k=0;k<uv.length-1;k++)segment(V,onWing(...uv[k],s).toArray(),onWing(...uv[k+1],s).toArray(),r0+(r1-r0)*k/(uv.length-1),r0+(r1-r0)*(k+1)/(uv.length-1),vein,4);};
 path([[0,0],[.06,.02],[.14,.07],[.19,.12]],.0045,.0022);// the costa, the thick leading edge
 path([[.01,.02],[.08,.06],[.13,.11],[.17,.17]],.0028,.0014);
 path([[.01,.025],[.06,.08],[.1,.13],[.12,.18]],.0026,.0012);
 path([[.02,.04],[.04,.1],[.07,.15]],.0022,.001);
 path([[.08,.06],[.1,.1],[.13,.11]],.0016,.0012);// cross veins closing the cells
 path([[.06,.08],[.08,.1]],.0014,.0012);
 path([[.01,.05],[.06,.09],[.1,.14]],.0018,.001);// the hindwing's main vein
 return {membrane,veins:V.merge()};
}
function mergeShapes(list){
 const pos=[],nrm=[];
 for(const g of list){const f=g.index?g.toNonIndexed():g;pos.push(...f.attributes.position.array);nrm.push(...f.attributes.normal.array);g.dispose();}
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));
 return geo;
}

const cache=new Map();
function build(name,L){
 if(cache.has(name))return cache.get(name);
 const S={
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.04}),
  glass:new THREE.MeshStandardMaterial({color:L.wingTint,roughness:.12,metalness:.1,transparent:true,opacity:.34,side:THREE.DoubleSide,depthWrite:false}),
  body:buildBody(L),head:buildHead(L),legs:PAIRS.map((p,i)=>buildLeg(L,i)),wings:buildWings(L),
 };
 cache.set(name,S);return S;
}
function mesh(parent,geo,material,name,shadow=true){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=shadow;m.userData.part=name;parent.add(m);return m;}

export function isBee(name){return !!LOOKS[name];}

export function createBee(name){
 const L=LOOKS[name]||LOOKS['killer bee'],S=build(LOOKS[name]?name:'killer bee',L);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(L.scale);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(...NECK);body.add(head);
 mesh(head,S.head,S.material,'head');
 const legs=[],wings=[];
 for(const s of [1,-1])S.legs.forEach((geo,i)=>{
  const leg=new THREE.Group();leg.position.set(s*.03,Y-.045,PAIRS[i].z);body.add(leg);
  const m=mesh(leg,geo,S.material,'leg');if(s<0)m.scale.x=-1;
  legs.push(leg);
 });
 // wings[0] is the left, wings[1] the right, as the buzz and the attack poses expect
 for(const s of [-1,1]){
  const wing=new THREE.Group();wing.position.set(s*.03,Y+.058,.055);wing.userData.side=s;body.add(wing);
  const a=mesh(wing,S.wings.membrane,S.glass,'wing',false),b=mesh(wing,S.wings.veins,S.material,'veins');
  if(s<0){a.scale.x=-1;b.scale.x=-1;}
  wings.push(wing);
 }
 return {g,body,legs,tail:null,wings,quirk:'bee',head};
}
