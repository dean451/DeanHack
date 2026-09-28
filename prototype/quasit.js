import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Quasits share the minor demons' letter, so they used to be the imp humanoid tinted blue, with the
// imp's wings although quasits don't fly. They now crouch as small, lean blue demons: a narrow
// torso leaning forward with a paler belly, toad-like warts on the shoulders and a ridge of spines
// down the back; a narrow head with long swept-up ears, two horns curling back, a wide grin of needle
// teeth and glowing yellow-green eyes; long thin arms ending in four long hooked claws (their claws
// drain dexterity); digitigrade legs on long three-toed clawed feet; and a long whip tail with a
// barbed, poisoned tip.
// Each moving part (body, head, each leg and arm, and the tail) is one merged, vertex-coloured mesh
// with a shared material, plus one small emissive mesh for the eyes: 8 draws. The geometry is built
// once and shared by every quasit.
// Handles: legs, arms, arm, head, tail, body, like the humanoid rig. No wings.

const C={
 skin:rgb('#3f5fa0'),skinDark:rgb('#1c2a52'),belly:rgb('#8ea4cc'),wart:rgb('#5a7ab8'),
 spine:rgb('#1a1c30'),spineTip:rgb('#b8b0a0'),mouth:rgb('#140a18'),tooth:rgb('#e8e2cc'),
 claw:rgb('#141018'),ear:rgb('#6a4a7a'),socket:rgb('#0e1224'),
};
const skinShade=(lo,hi)=>(x,y)=>mix(C.skinDark,C.skin,(y-lo)/(hi-lo));
const UP=new THREE.Vector3(0,1,0);
// A tapered cylinder from point a to point b.
function seg(P,a,b,r0,r1,colour,sides=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const m=new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(UP,d.normalize()),new THREE.Vector3(1,1,1));
 P.add(new THREE.CylinderGeometry(r1,r0,len,sides),m,colour);
}

function buildBody(){
 const P=pieces();
 // narrow hips, a lean belly and a chest leaning forward over them
 P.add(new THREE.SphereGeometry(.075,12,10),at(0,.3,-.02,[0,0,0],[1.25,.8,1]),skinShade(.24,.36));
 P.add(new THREE.SphereGeometry(.08,14,12),at(0,.38,.01,[.3,0,0],[1,1.2,.85]),(x,y,z)=>z>.04?mix(C.skin,C.belly,(z-.04)/.05):skinShade(.3,.46)(x,y));
 P.add(new THREE.SphereGeometry(.09,14,10),at(0,.47,.04,[.45,0,0],[1.2,.9,.8]),(x,y,z)=>z>.08?mix(C.skin,C.belly,(z-.08)/.05*.7):skinShade(.4,.56)(x,y));
 // bony shoulders speckled with toad warts
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.038,10,8),at(s*.1,.52,.05),C.skin);
  for(const [x,y,z] of [[.09,.555,.04],[.12,.53,.02],[.07,.53,-.01]])P.add(new THREE.IcosahedronGeometry(.011,0),at(s*x,y,z),C.wart);
 }
 // a ridge of spines down the back, longest between the shoulders
 for(let i=0;i<7;i++){
  const u=i/6,y=.27+u*.28,z=-.085+u*.075,len=.03+Math.sin(u*Math.PI*.85)*.035;
  P.add(new THREE.ConeGeometry(.012,len,5),at(0,y+len*.2,z-len*.4,[-1.1-u*.3,0,0]),(px,py,pz)=>mix(C.spine,C.spineTip,(z-pz)/len*1.4-.2));
 }
 // a thin neck thrust forward
 P.add(new THREE.CylinderGeometry(.026,.036,.09,8),at(0,.56,.1,[.75,0,0]),C.skin);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // narrow skull tapering to a pointed chin
 P.add(new THREE.SphereGeometry(.075,14,12),at(0,.05,0,[0,0,0],[.95,.95,1.1]),skinShade(-.02,.12));
 P.add(new THREE.ConeGeometry(.055,.09,10),at(0,-.02,.035,[Math.PI+.5,0,0],[1.1,1,.75]),skinShade(-.07,.03));
 // a heavy brow over sunken sockets, and a snub nose
 P.add(new THREE.SphereGeometry(.035,10,6),at(0,.075,.06,[0,0,0],[2.1,.45,.8]),C.skinDark);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.022,8,6),at(s*.03,.05,.062),C.socket);
 P.add(new THREE.SphereGeometry(.014,6,5),at(0,.028,.085,[0,0,0],[1.2,.8,1]),C.skin);
 // a wide grin of needle teeth
 P.add(new THREE.TorusGeometry(.045,.008,5,14,Math.PI),at(0,.008,.058,[Math.PI+.5,0,0],[1,.5,1]),C.mouth);
 for(const x of [-.034,-.02,-.007,.007,.02,.034])P.add(new THREE.ConeGeometry(.0045,.018,4),at(x,.0,.078-Math.abs(x)*.55,[Math.PI,0,0]),C.tooth);
 // long ears swept up and back, dusky inside
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.03,.15,4,1,true),at(s*.1,.085,-.03,[-.55,.35*s,s*-1.0],[1,1,.35]),(x,y,z)=>z>-.035?C.ear:C.skin);
 // two horns curling back over the skull, dark at the root and bone at the tip
 for(const s of [-1,1]){
  const path=new THREE.CatmullRomCurve3([[.03,.1,.03],[.045,.14,.0],[.05,.155,-.05],[.045,.13,-.09]].map(([x,y,z])=>new THREE.Vector3(s*x,y,z)));
  const tube=new THREE.TubeGeometry(path,10,.011,6,false),pos=tube.attributes.position;
  // taper toward the tip
  for(let i=0;i<pos.count;i++){const u=Math.floor(i/7)/10,c=path.getPoint(u),p=new THREE.Vector3().fromBufferAttribute(pos,i);p.sub(c).multiplyScalar(1-u*.75).add(c);pos.setXYZ(i,p.x,p.y,p.z);}
  tube.computeVertexNormals();
  P.add(tube,null,(x,y,z)=>mix(C.spine,C.spineTip,(-z-.0)/.09));
 }
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 // slanted almond eyes glowing in the sockets
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.014,8,6),at(s*.03,.05,.074,[0,0,s*-.35],[1.4,.75,.8]),[1,1,1]);
 return P.merge();
}

// A digitigrade leg: thigh forward to the knee, shin back to a raised heel, and a long
// three-toed clawed foot.
function buildLeg(){
 const P=pieces(),knee=[0,-.11,.06],heel=[0,-.2,-.04],ball=[0,-.27,.02];
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.02,.02,[0,0,0],[1,1.2,1.1]),skinShade(-.1,0));
 seg(P,[0,-.02,.02],knee,.034,.024,skinShade(-.12,0));
 P.add(new THREE.SphereGeometry(.022,8,6),at(...knee),C.skin);
 seg(P,knee,heel,.02,.014,skinShade(-.22,-.1));
 P.add(new THREE.SphereGeometry(.014,6,5),at(...heel),C.skinDark);
 seg(P,heel,ball,.013,.016,C.skin);
 for(const a of [-.45,0,.45]){
  const dx=Math.sin(a)*.045,dz=Math.cos(a)*.045,tip=[ball[0]+dx,-.278,ball[2]+dz];
  seg(P,ball,tip,.011,.008,C.skin,6);
  P.add(new THREE.ConeGeometry(.008,.03,5),at(tip[0]+dx*.3,-.279,tip[2]+dz*.3,[Math.PI/2+.4,0,-a]),C.claw);
 }
 return P.merge();
}

// A long, thin arm with four long hooked claws reaching forward.
function buildArm(side){
 const P=pieces(),elbow=[0,-.15,-.01],wrist=[0,-.28,.05];
 P.add(new THREE.SphereGeometry(.026,8,6),at(0,0,0),C.skin);
 seg(P,[0,0,0],elbow,.022,.017,skinShade(-.16,0));
 P.add(new THREE.SphereGeometry(.018,8,6),at(...elbow),C.skin);
 seg(P,elbow,wrist,.016,.013,skinShade(-.3,-.14));
 P.add(new THREE.SphereGeometry(.024,8,6),at(0,-.29,.058,[0,0,0],[.9,1,.7]),C.skin);
 for(const a of [-.5,-.17,.17,.5]){
  const x=side*Math.sin(a)*.03,knuckle=[x,-.305,.07],tip=[x*1.5,-.35,.1];
  seg(P,knuckle,tip,.0065,.005,C.skin,5);
  P.add(new THREE.ConeGeometry(.0065,.04,5),at(tip[0],tip[1]-.012,tip[2]+.012,[2.5,0,0]),C.claw);
 }
 return P.merge();
}

// A long whip tail curling down and round behind, with a barbed arrowhead tip.
function buildTail(){
 const P=pieces();
 const path=new THREE.CatmullRomCurve3([[0,0,0],[.02,-.09,-.08],[.05,-.17,-.14],[.08,-.17,-.23],[.07,-.1,-.29]].map(p=>new THREE.Vector3(...p)));
 const tube=new THREE.TubeGeometry(path,24,.016,6,false),pos=tube.attributes.position;
 for(let i=0;i<pos.count;i++){const u=Math.floor(i/7)/24,c=path.getPoint(u),p=new THREE.Vector3().fromBufferAttribute(pos,i);p.sub(c).multiplyScalar(1-u*.55).add(c);pos.setXYZ(i,p.x,p.y,p.z);}
 tube.computeVertexNormals();
 P.add(tube,null,(x,y,z)=>mix(C.skin,C.skinDark,-z/.25));
 // the barb: an arrowhead aimed along the tail's end, with two hooked side barbs
 const end=path.getPoint(1),dir=path.getTangent(1),q=new THREE.Quaternion().setFromUnitVectors(UP,dir);
 const head=new THREE.Matrix4().compose(end.clone().addScaledVector(dir,.025),q,new THREE.Vector3(1,1,.35));
 P.add(new THREE.ConeGeometry(.03,.06,4),head,C.spine);
 for(const s of [-1,1]){
  const side=new THREE.Vector3(1,0,0).applyQuaternion(q).multiplyScalar(s*.022);
  const barb=new THREE.Matrix4().compose(end.clone().add(side).addScaledVector(dir,-.005),q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,s*2.6))),new THREE.Vector3(1,1,1));
  P.add(new THREE.ConeGeometry(.007,.03,4),barb,C.spineTip);
 }
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62});
 const eye=new THREE.MeshStandardMaterial({color:0xe0ff5a,emissive:0x9ad020,emissiveIntensity:2.4,roughness:.25});
 shared={material,eye,body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),tail:buildTail(),arm:{'-1':buildArm(-1),'1':buildArm(1)}};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createQuasit(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,.61,.14);body.add(head);
 mesh(head,S.head,S.material,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.065,.285,-.01);leg.rotation.z=s*.05;body.add(leg);mesh(leg,S.leg,S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.12,.52,.05);arm.rotation.set(-.3,0,s*.16);body.add(arm);mesh(arm,S.arm[s],S.material,'arm');arms.push(arm);
 }
 const tail=new THREE.Group();tail.position.set(0,.27,-.08);body.add(tail);mesh(tail,S.tail,S.material,'tail');
 return {g,body,legs,tail,wings:[],quirk:'quasit',arms,arm:arms[1],head,hat:null,beard:null,pick:null};
}
