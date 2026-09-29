import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rgb,mix,at} from './homunculus.js';

// The straw golem used to be the stone golem's slab body tinted yellow. It now stands as a
// scarecrow of bound sheaves: every limb and the torso is a ridged bundle of straw, streaked pale
// and dark stalk by stalk, lashed with twine at the waist, chest, neck, knees, ankles and wrists.
// Loose stalks flare out below each binding: a skirt over the hips, a ruff at the neck, splayed
// feet on the ground, straw fingers, and a tuft bursting from the top of the sack-like head. A
// crossbar sheaf through the shoulders gives it the scarecrow yoke. The only light is the pair of
// ember eyes, which are the golem's `core` so the glow still pulses.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured mesh on one shared
// material, plus one mesh for the eyes: 7 draws. The geometry is built once and shared.
// Handles: body, head, legs, arms, arm, core, like the old golem plus the humanoid's arms and head.

const C={
 straw:rgb('#caa64c'),pale:rgb('#ead28a'),dark:rgb('#8f6c2c'),grey:rgb('#9a8a66'),
 twine:rgb('#6a5028'),twineDark:rgb('#3e2e16'),socket:rgb('#3a2a12'),
};
const Y=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};

function collector(){
 const list=[];
 return {
  // colour is read in the geometry's own frame, before the matrix places it
  add(geo,matrix,colour){
   const flat=geo.index?geo.toNonIndexed():geo.clone();geo.dispose();
   for(const key of Object.keys(flat.attributes))if(key!=='position'&&key!=='normal')flat.deleteAttribute(key);
   const p=flat.attributes.position,col=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){const c=typeof colour==='function'?colour(p.getX(i),p.getY(i),p.getZ(i)):colour;for(let k=0;k<3;k++)col[i*3+k]=THREE.MathUtils.clamp(c[k],0,1);}
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   if(matrix)flat.applyMatrix4(matrix);
   list.push(flat);
  },
  merge(){const geo=mergeGeometries(list);list.forEach(g=>g.dispose());return geo;},
 };
}

// a stalk's shade: mostly golden, some pale, some dark or weathered, fixed per stalk index
function stalkShade(k,seed){
 const h=hash(k*7.13+seed),v=hash(k*3.71+seed*1.7);
 const base=h<.5?mix(C.straw,C.pale,v):h<.8?mix(C.straw,C.dark,v*.8):mix(C.grey,C.straw,v*.6);
 return base;
}

// A bound bundle of straw standing on y=0 and reaching y=len. The surface is ridged stalk by
// stalk and coloured stalk by stalk, darkening into the ends where the straw is packed.
function bundle(P,matrix,{len,r0,r1,seed=1,stalks=22,bulge=0,sx=1,sz=1}){
 const geo=new THREE.CylinderGeometry(1,1,len,stalks*2,4,true);geo.translate(0,len/2,0);
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),t=y/len,a=Math.atan2(z,x);
  const k=Math.round((a+Math.PI)/(2*Math.PI)*stalks)%stalks;
  const ridge=1+.07*Math.cos(a*stalks)+.03*(hash(k+seed)-.5);
  const r=(r0+(r1-r0)*t+bulge*Math.sin(t*Math.PI))*ridge;
  p.setXYZ(i,x*r*sx,y,z*r*sz);
 }
 geo.computeVertexNormals();
 P.add(geo,matrix,(x,y,z)=>{
  const a=Math.atan2(z/sz,x/sx),k=Math.floor(((a+Math.PI)/(2*Math.PI)*stalks*2+.5))%(stalks*2),t=y/len;
  const end=Math.min(t,1-t)*len;
  return mix(stalkShade(k,seed),C.dark,.35*(1-Math.min(1,end/.04)));
 });
}

// a lashing of twine: a few turns of cord around a bundle at height y, with a knot on one side
function binding(P,matrix,r,{turns=3,knot=0,sx=1,sz=1}={}){
 for(let i=0;i<turns;i++){
  const ring=new THREE.TorusGeometry(r,.0085,4,r>.1?18:12);ring.rotateX(Math.PI/2);ring.scale(sx,1,sz);ring.translate(0,(i-(turns-1)/2)*.016,0);
  P.add(ring,matrix,(x,y,z)=>mix(C.twine,C.twineDark,.5+.5*Math.sin(Math.atan2(z,x)*9+i)));
 }
 if(knot!=null&&knot!==false){
  const kx=Math.cos(knot)*r*sx,kz=Math.sin(knot)*r*sz;
  P.add(new THREE.IcosahedronGeometry(.017,1),new THREE.Matrix4().multiplyMatrices(matrix,at(kx,0,kz)),C.twine);
 }
}

// a single loose stalk from a point along a direction
function stalk(P,matrix,from,dir,len,r,shade){
 const d=dir.clone().normalize(),geo=new THREE.CylinderGeometry(r*.55,r,len,3,1,true);
 const m=new THREE.Matrix4().compose(from.clone().addScaledVector(d,len/2),new THREE.Quaternion().setFromUnitVectors(Y,d),new THREE.Vector3(1,1,1));
 P.add(geo,new THREE.Matrix4().multiplyMatrices(matrix,m),(x,y)=>mix(shade,C.pale,y>0?.25:0));
}

// a flare of loose stalks around a ring: out and along `axis` (1 up, -1 down), `spread` of lean
function flare(P,matrix,{y,r,n,len,spread,axis=-1,seed=3,sx=1,sz=1,r2=.006,lenJitter=.35}){
 for(let i=0;i<n;i++){
  const a=(i+hash(i+seed)*.8)/n*Math.PI*2,out=new THREE.Vector3(Math.cos(a)*sx,0,Math.sin(a)*sz);
  const from=out.clone().multiplyScalar(r).setY(y+(hash(i*2.3+seed)-.5)*.02);
  const lean=spread*(.7+.6*hash(i*5.1+seed));
  const dir=out.clone().multiplyScalar(Math.sin(lean)).setY(axis*Math.cos(lean));
  dir.x+=(hash(i*9.7+seed)-.5)*.25;dir.z+=(hash(i*4.4+seed)-.5)*.25;
  stalk(P,matrix,from,dir,len*(1-lenJitter/2+lenJitter*hash(i*1.9+seed)),r2,stalkShade(i,seed));
 }
}

function buildBody(){
 const P=collector(),I=new THREE.Matrix4();
 // torso sheaf: hips at .40 swelling to the chest, narrowing to the neck at .86
 bundle(P,at(0,.4,0),{len:.46,r0:.13,r1:.1,bulge:.05,sx:1.15,sz:.82,seed:11,stalks:26});
 // the skirt of loose straw below the waist lashing, over the tops of the legs
 flare(P,I,{y:.47,r:.14,n:40,len:.2,spread:.42,sx:1.15,sz:.82,seed:13});
 flare(P,I,{y:.45,r:.12,n:22,len:.14,spread:.3,sx:1.15,sz:.82,seed:17});
 binding(P,at(0,.47,0),.155,{turns:3,knot:Math.PI*.35,sx:1.15,sz:.82});
 // the waist knot's tails hang down the front
 for(const s of [-1,1]){const cord=new THREE.CylinderGeometry(.006,.005,.12,5);cord.translate(0,-.06,0);P.add(cord,at(.07+s*.012,.47,.11,[.15,0,s*.12]),C.twine);
  P.add(new THREE.SphereGeometry(.01,5,4),at(.07+s*.026,.36,.125),C.twineDark);}
 binding(P,at(0,.72,0),.17,{turns:2,knot:null,sx:1.1,sz:.8});
 // the shoulder crossbar: a horizontal sheaf through the chest, lashed where it crosses
 bundle(P,at(-.3,.79,0,[0,0,-Math.PI/2]),{len:.6,r0:.055,r1:.055,seed:21,stalks:14});
 flare(P,at(-.3,.79,0,[0,0,Math.PI/2]),{y:0,r:.05,n:9,len:.07,spread:.5,axis:1,seed:23});
 flare(P,at(.3,.79,0,[0,0,-Math.PI/2]),{y:0,r:.05,n:9,len:.07,spread:.5,axis:1,seed:25});
 for(const s of [-1,1]){
  const m=at(s*.15,.79,0,[0,0,Math.PI/2]);
  P.add(new THREE.TorusGeometry(.066,.009,4,16),new THREE.Matrix4().multiplyMatrices(m,at(0,0,0,[Math.PI/2,0,0])),C.twine);
  // an X of cord over the crossing
  P.add(new THREE.CylinderGeometry(.007,.007,.2,5),at(s*.09,.77,.112,[0,0,s*.75]),C.twine);
 }
 // the neck lashing and the ruff of straw flaring up and out around it
 bundle(P,at(0,.84,0),{len:.06,r0:.07,r1:.065,seed:27,stalks:14});
 binding(P,at(0,.87,0),.07,{turns:2,knot:Math.PI*.6});
 flare(P,I,{y:.85,r:.08,n:26,len:.09,spread:1.05,axis:1,seed:29});
 return P.merge();
}

function buildHead(){
 const P=collector(),I=new THREE.Matrix4();
 // a sack-round head of packed straw, gathered at the neck below and at the crown above
 const prof=[[.05,0],[.09,.03],[.12,.08],[.125,.13],[.115,.18],[.085,.225],[.05,.25]].map(([r,y])=>new THREE.Vector2(r,y));
 const geo=new THREE.LatheGeometry(prof,40);
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),s=1+.05*Math.cos(a*20)+.02*Math.sin(y*80+a*3);p.setXYZ(i,x*s,y,z*s*.92);}
 geo.computeVertexNormals();
 P.add(geo,null,(x,y,z)=>{
  const a=Math.atan2(z,x),k=Math.floor((a+Math.PI)/(2*Math.PI)*40+.5)%40;
  let c=stalkShade(k,41);
  // sunken, shadowed sockets around the eyes
  for(const s of [-1,1]){const d=Math.hypot(x-s*.045,(y-.135)*1.2,Math.max(0,.1-z)*2);if(z>0)c=mix(c,C.socket,.9*Math.max(0,1-d/.04));}
  // a stitched mouth: a dark slit of twine
  if(z>.08&&Math.abs(y-.075)<.008&&Math.abs(x)<.045)c=C.twineDark;
  return c;
 });
 // stitches across the mouth
 for(let i=-2;i<=2;i++)P.add(new THREE.CylinderGeometry(.0035,.0035,.03,4),at(i*.018,.075,.113-Math.abs(i)*.006,[0,0,0]),C.twineDark);
 // the crown: tied off, with a tuft of straw bursting up and out
 binding(P,at(0,.245,0),.05,{turns:2,knot:Math.PI*.25});
 flare(P,I,{y:.245,r:.04,n:34,len:.16,spread:.55,axis:1,seed:43,lenJitter:.6});
 flare(P,I,{y:.25,r:.02,n:12,len:.13,spread:.2,axis:1,seed:47});
 // a few stalks poking out of the sides like unkempt hair
 for(const s of [-1,1])flare(P,at(s*.11,.14,-.02,[0,0,-s*Math.PI/2]),{y:0,r:.02,n:5,len:.06,spread:.6,axis:1,seed:51+s});
 return P.merge();
}

function buildEyes(){
 const list=[];
 for(const s of [-1,1]){const g=new THREE.SphereGeometry(.018,10,8);g.scale(1,.8,.6);g.translate(s*.045,.135,.105);list.push(g);}
 const geo=mergeGeometries(list);list.forEach(g=>g.dispose());return geo;
}

// a leg hangs from the hip pivot; its splayed straw foot rests on the ground 0.44 below
function buildLeg(side){
 const P=collector(),I=new THREE.Matrix4();
 bundle(P,at(0,-.36,0),{len:.38,r0:.06,r1:.072,bulge:.008,seed:61+side,stalks:16});
 binding(P,at(0,-.19,0),.074,{turns:2,knot:side*Math.PI*.1});
 binding(P,at(0,-.33,0),.066,{turns:2,knot:null});
 // the foot: stalks splaying out from the ankle to the ground, longest toward the toe
 for(let i=0;i<30;i++){
  const a=(i+hash(i+side*9)*.7)/30*Math.PI*2,fwd=Math.max(0,Math.sin(a));
  const from=new THREE.Vector3(Math.cos(a)*.05,-.35,Math.sin(a)*.05);
  const reach=.05+.07*fwd+.02*hash(i*3.3+side);
  const to=new THREE.Vector3(Math.cos(a)*(.05+reach),-.438,Math.sin(a)*(.05+reach)+.02*fwd);
  const d=to.clone().sub(from);stalk(P,I,from,d,d.length(),.0065,stalkShade(i,63+side));
 }
 // stalks poking out below the knee binding
 flare(P,at(0,-.21,0),{y:0,r:.07,n:10,len:.06,spread:.9,seed:67+side});
 return P.merge();
}

// an arm hangs from the shoulder pivot; the hand is a spray of stalk fingers
function buildArm(side){
 const P=collector(),I=new THREE.Matrix4();
 bundle(P,at(0,-.38,0),{len:.4,r0:.042,r1:.056,seed:71+side,stalks:14});
 binding(P,at(0,-.04,0),.058,{turns:2,knot:null});
 binding(P,at(0,-.21,0),.052,{turns:2,knot:Math.PI});
 binding(P,at(0,-.35,0),.046,{turns:2,knot:null});
 // five straw fingers, each a small bunch of stalks, curling a little forward
 for(let f=0;f<5;f++){
  const a=(f-2)*.32,from=new THREE.Vector3(Math.sin(a)*.03*side,-.37,Math.cos(a)*.02);
  for(let j=0;j<4;j++){const d=new THREE.Vector3(Math.sin(a)*.4*side+(hash(f*7+j+side)-.5)*.2,-1,.25+(f===0?.5:0)+(hash(f*3+j)-.5)*.2);
   stalk(P,I,from.clone().add(new THREE.Vector3((j-1.5)*.006,0,0)),d,.09+.04*hash(f*5+j*2+side),.005,stalkShade(f*4+j,73+side));}
 }
 // loose straw at the elbow
 flare(P,at(0,-.22,0),{y:0,r:.05,n:7,len:.05,spread:1,seed:77+side});
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93,side:THREE.DoubleSide});
 const eye=new THREE.MeshStandardMaterial({color:0xffb040,emissive:0xff7a10,emissiveIntensity:4.5,roughness:.3});
 shared={material,eye,body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:{[-1]:buildLeg(-1),1:buildLeg(1)},arm:{[-1]:buildArm(-1),1:buildArm(1)}};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createStrawGolem(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,.9,.01);head.rotation.z=.06;body.add(head);
 mesh(head,S.head,S.material,'head');const core=mesh(head,S.eyes,S.eye,'eyes');core.castShadow=false;
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.085,.44,0);body.add(leg);mesh(leg,S.leg[s],S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.3,.79,0);arm.rotation.z=s*.12;body.add(arm);mesh(arm,S.arm[s],S.material,'arm');arms.push(arm);
 }
 g.userData.core=core;
 return {g,body,legs,tail:null,wings:[],quirk:'golem',core,arms,arm:arms[1],head};
}
