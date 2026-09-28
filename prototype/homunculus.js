import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The homunculus shares the minor demons' letter, so it used to be the imp humanoid tinted green.
// It now stands as a squat little alchemist's familiar: a pot-bellied green body with a paler belly
// and warty back, a big head with wide leathery bat ears, heavy half-closed lids over glowing amber
// eyes (its bite puts you to sleep), a wide mouth with needle fangs and two horn nubs; spindly arms
// with long clawed fingers, short bowed legs with three-toed clawed feet, a thin tail with a spade
// tip, and leathery bat wings folded half open behind it.
// Each moving part (body, head, each leg, arm and wing, and the tail) is one merged,
// vertex-coloured mesh with a shared material, plus one small mesh for the glowing eyes: 10 draws.
// The geometry is built once and shared by every homunculus.
// Handles: legs, arms, arm, head, wings, tail, body, like the humanoid rig.

export function pieces(){
 const list=[];
 return {
  add(geo,matrix,colour){
   const flat=geo.index?geo.toNonIndexed():geo.clone();geo.dispose();
   for(const key of Object.keys(flat.attributes))if(key!=='position'&&key!=='normal')flat.deleteAttribute(key);
   if(matrix)flat.applyMatrix4(matrix);
   const p=flat.attributes.position,col=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){const c=typeof colour==='function'?colour(p.getX(i),p.getY(i),p.getZ(i)):colour;for(let k=0;k<3;k++)col[i*3+k]=THREE.MathUtils.clamp(c[k],0,1);}
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   list.push(flat);
  },
  merge(){const geo=mergeGeometries(list);list.forEach(g=>g.dispose());return geo;},
 };
}
export const rgb=(hex)=>{const c=new THREE.Color(hex);return [c.r,c.g,c.b];};
export const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*THREE.MathUtils.clamp(t,0,1));
// position, Euler rotation [x,y,z], scale
export const at=(x,y,z,r=[0,0,0],s=[1,1,1])=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new THREE.Vector3(...s));

const C={
 skin:rgb('#5f8a3f'),skinDark:rgb('#34521f'),belly:rgb('#a8b86a'),wart:rgb('#7a9a48'),
 lid:rgb('#46682c'),mouth:rgb('#2a0e10'),fang:rgb('#f0ead0'),horn:rgb('#3a2e20'),hornTip:rgb('#a89878'),
 claw:rgb('#1e1a14'),ear:rgb('#b86a5a'),membrane:rgb('#3e5a2a'),membraneLit:rgb('#7a8a3a'),bone:rgb('#2a3c1a'),
};
const skinShade=(lo,hi)=>(x,y)=>mix(C.skinDark,C.skin,(y-lo)/(hi-lo));

function buildBody(){
 const P=pieces();
 // pot belly and narrow chest, darker toward the hips
 P.add(new THREE.SphereGeometry(.15,16,12),at(0,.36,.01,[0,0,0],[1,.95,.95]),(x,y,z)=>z>.07?mix(C.skin,C.belly,(z-.07)/.07):skinShade(.22,.46)(x,y));
 P.add(new THREE.SphereGeometry(.11,14,10),at(0,.5,-.01,[0,0,0],[1.05,.9,.85]),skinShade(.4,.6));
 // hunched shoulders and a warty back
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.05,10,8),at(s*.1,.53,-.015),C.skin);
 const warts=[[-.05,.48,-.1],[.06,.44,-.12],[0,.38,-.14],[-.08,.33,-.12],[.09,.3,-.11],[.02,.52,-.09]];
 for(const [x,y,z] of warts)P.add(new THREE.IcosahedronGeometry(.018,0),at(x,y,z),C.wart);
 // navel and a crease under the belly
 P.add(new THREE.SphereGeometry(.012,6,4),at(0,.35,.148),C.skinDark);
 P.add(new THREE.TorusGeometry(.1,.008,4,14,Math.PI*.8),at(0,.27,.05,[Math.PI/2+.25,0,Math.PI*.1]),C.skinDark);
 // neck
 P.add(new THREE.CylinderGeometry(.045,.06,.07,8),at(0,.575,.0),C.skin);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // big round skull, a little flattened, with a heavy jaw
 P.add(new THREE.SphereGeometry(.15,16,12),at(0,.12,0,[0,0,0],[1.08,.92,1]),skinShade(-.02,.25));
 P.add(new THREE.SphereGeometry(.11,12,8),at(0,.05,.05,[0,0,0],[1.15,.6,1]),skinShade(-.03,.1));
 // wide lipless mouth with needle fangs
 P.add(new THREE.TorusGeometry(.085,.012,5,16,Math.PI),at(0,.045,.1,[Math.PI+.35,0,0],[1,.45,1]),C.mouth);
 for(const x of [-.06,-.035,.035,.06])P.add(new THREE.ConeGeometry(.008,.035,5),at(x,.04,.14-.1*Math.abs(x),[Math.PI,0,0]),C.fang);
 for(const x of [-.045,.045])P.add(new THREE.ConeGeometry(.007,.03,5),at(x,.018,.13),C.fang);
 // squashed nose and nostrils
 P.add(new THREE.SphereGeometry(.028,8,6),at(0,.105,.155,[0,0,0],[1.3,.7,.8]),C.skin);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.007,5,4),at(s*.014,.098,.175),C.mouth);
 // eye sockets and heavy drooping lids: the upper halves of spheres, tilted down over the eyes
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.05,10,8),at(s*.06,.14,.1,[0,0,0],[1,.8,.7]),C.skinDark);
  P.add(new THREE.SphereGeometry(.046,12,8,0,Math.PI*2,0,Math.PI*.5),at(s*.06,.145,.122,[.35,0,s*-.18],[1.05,.95,1]),C.lid);
 }
 // brow ridge and two horn nubs
 P.add(new THREE.SphereGeometry(.05,10,6),at(0,.2,.1,[0,0,0],[2.4,.45,.7]),C.skinDark);
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.022,.07,7),at(s*.06,.26,.04,[-.3,0,s*-.35]),(x,y)=>mix(C.horn,C.hornTip,(y-.23)/.06));
 // wide bat ears, pink-veined inside
 for(const s of [-1,1]){
  P.add(new THREE.ConeGeometry(.065,.2,4,1,true),at(s*.19,.19,-.01,[0,.5*s,s*-1.05],[1,1,.35]),(x,y,z)=>z>-.005?C.ear:C.skin);
  P.add(new THREE.SphereGeometry(.03,6,5),at(s*.14,.14,-.01),C.skin);
 }
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 // only the lower halves peep out from under the lids
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.03,10,8),at(s*.06,.13,.125,[0,0,0],[1,.8,.8]),[1,1,1]);
 return P.merge();
}

function buildLeg(){
 const P=pieces();
 // short bowed thigh and shin, a knobby knee and a three-toed clawed foot
 P.add(new THREE.SphereGeometry(.055,10,8),at(0,-.05,.01,[0,0,0],[1,1.4,1]),skinShade(-.12,0));
 P.add(new THREE.SphereGeometry(.03,8,6),at(0,-.12,.035),C.skin);
 P.add(new THREE.CylinderGeometry(.03,.024,.11,8),at(0,-.18,.01,[-.15,0,0]),skinShade(-.24,-.12));
 P.add(new THREE.SphereGeometry(.04,8,6),at(0,-.235,.03,[0,0,0],[1.2,.5,1.4]),C.skin);
 for(const a of [-.45,0,.45]){
  const dx=Math.sin(a)*.05,dz=Math.cos(a)*.05;
  P.add(new THREE.CylinderGeometry(.013,.016,.06,6),at(dx*.8,-.245,.04+dz*.8,[Math.PI/2,0,-a]),C.skin);
  P.add(new THREE.ConeGeometry(.011,.035,5),at(dx*1.4,-.25,.04+dz*1.4,[Math.PI/2+.3,0,-a]),C.claw);
 }
 return P.merge();
}

// Spindly arm hanging from the shoulder, with long clawed fingers curling forward.
function buildArm(side){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.025,.03,.13,8),at(0,-.06,0),skinShade(-.12,0));
 P.add(new THREE.SphereGeometry(.026,8,6),at(0,-.13,0),C.skin);
 P.add(new THREE.CylinderGeometry(.018,.024,.13,8),at(0,-.2,.02,[-.3,0,0]),skinShade(-.26,-.13));
 P.add(new THREE.SphereGeometry(.03,8,6),at(0,-.27,.04,[0,0,0],[.8,1,1]),C.skin);
 for(const a of [-.35,0,.35]){
  const x=side*Math.sin(a)*.02;
  P.add(new THREE.CylinderGeometry(.007,.009,.06,5),at(x,-.31,.06+Math.cos(a)*.01,[.5,0,-a*.4]),C.skin);
  P.add(new THREE.ConeGeometry(.008,.03,5),at(x,-.345,.085,[2.2,0,0]),C.claw);
 }
 return P.merge();
}

// A leathery bat wing: three finger bones spreading out from the wrist, a membrane of scalloped
// panels between them (extruded thin so both faces render with the one material) and a thumb claw.
function buildWing(side){
 const P=pieces();
 const wrist=new THREE.Vector2(side*.12,.1);
 P.add(new THREE.CylinderGeometry(.016,.02,.16,6),at(side*.06,.05,0,[0,0,-side*1.0]),C.bone);
 const tips=[[.36,.26],[.42,.08],[.32,-.1]].map(([x,y])=>new THREE.Vector2(side*x,y));
 for(const tip of tips){
  const d=tip.clone().sub(wrist),len=d.length(),mid=wrist.clone().add(tip).multiplyScalar(.5);
  P.add(new THREE.CylinderGeometry(.006,.011,len,5),at(mid.x,mid.y,.004,[0,0,Math.atan2(d.y,d.x)-Math.PI/2]),C.bone);
 }
 P.add(new THREE.ConeGeometry(.012,.04,5),at(wrist.x,wrist.y+.03,.004),C.claw);
 // membrane: body → first finger → second → third → back to the body, with scalloped edges
 const outline=[new THREE.Vector2(0,.14),wrist,tips[0]];
 const scallop=(a,b,n=4,depth=.035)=>{for(let k=1;k<=n;k++){const u=k/n,p=a.clone().lerp(b,u),dip=Math.sin(u*Math.PI)*depth;const nrm=new THREE.Vector2(b.y-a.y,a.x-b.x).normalize().multiplyScalar(side*dip);outline.push(p.add(nrm));}};
 scallop(tips[0],tips[1]);scallop(tips[1],tips[2]);scallop(tips[2],new THREE.Vector2(0,-.02),5,.05);
 const shape=new THREE.Shape(outline);
 const membrane=new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:false,curveSegments:1});
 P.add(membrane,null,(x,y)=>mix(C.membrane,C.membraneLit,Math.abs(x)/.42*.8+y*.3));
 return P.merge();
}

function buildTail(){
 const P=pieces();
 // a thin tail curling down and out behind, ending in a spade tip
 const path=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.08,-.1),new THREE.Vector3(0,-.18,-.14),new THREE.Vector3(0,-.22,-.22),new THREE.Vector3(0,-.16,-.28)]);
 P.add(new THREE.TubeGeometry(path,16,.014,6,false),null,C.skinDark);
 P.add(new THREE.ConeGeometry(.04,.07,4),at(0,-.13,-.29,[-.6,0,0],[1,1,.3]),C.skinDark);
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72});
 const eye=new THREE.MeshStandardMaterial({color:0xffc24a,emissive:0xe08a10,emissiveIntensity:2.4,roughness:.25});
 shared={material,eye,body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),tail:buildTail(),arm:{'-1':buildArm(-1),'1':buildArm(1)},wing:{'-1':buildWing(-1),'1':buildWing(1)}};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createHomunculus(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,.6,.02);body.add(head);
 mesh(head,S.head,S.material,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[],arms=[],wings=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.255,0);leg.rotation.z=s*.08;body.add(leg);mesh(leg,S.leg,S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.14,.53,0);arm.rotation.z=s*.18;body.add(arm);mesh(arm,S.arm[s],S.material,'arm');arms.push(arm);
  const wing=new THREE.Group();wing.position.set(s*.05,.5,-.1);wing.rotation.x=-.2;wing.userData.side=s;body.add(wing);mesh(wing,S.wing[s],S.material,'wing');wings.push(wing);
 }
 const tail=new THREE.Group();tail.position.set(0,.28,-.1);body.add(tail);mesh(tail,S.tail,S.material,'tail');
 return {g,body,legs,tail,wings,quirk:'homunculus',arms,arm:arms[1],head,hat:null,beard:null,pick:null};
}
