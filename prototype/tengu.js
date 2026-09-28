import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The tengu shares the minor demons' letter, so it used to be the imp humanoid tinted cyan.
// It now stands as a mountain goblin in yamabushi dress: a crimson face with a long nose,
// bushy white brows and a shaggy white mane under a small black tokin cap; a cyan robe with a
// white crossed collar, a dark sash and two columns of white pompoms down the front; flared
// indigo hakama over one-toothed geta; crow wings of layered black feathers; and a feather
// fan in its right hand.
// Each moving part (body, head, each leg, arm and wing) is one merged, vertex-coloured mesh
// with a shared material, plus one small mesh for the glowing eyes: 9 draws. The geometry is
// built once and shared by every tengu.
// Handles: legs, arms, arm (the fan arm), head, wings, body, like the humanoid rig.

function pieces(){
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
const rgb=(hex)=>{const c=new THREE.Color(hex);return [c.r,c.g,c.b];};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
// position, Euler rotation [x,y,z], scale
const at=(x,y,z,r=[0,0,0],s=[1,1,1])=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new THREE.Vector3(...s));

const C={
 face:rgb('#b8322a'),faceDeep:rgb('#7a1c18'),nose:rgb('#c8403a'),hair:rgb('#e8e4da'),hairShade:rgb('#a8a49a'),cap:rgb('#141214'),
 robe:rgb('#3f9a9a'),robeDark:rgb('#23605f'),collar:rgb('#ece8dc'),sash:rgb('#2a2230'),pom:rgb('#f4f2ea'),
 hakama:rgb('#2c3456'),hakamaDark:rgb('#1a1f36'),wood:rgb('#6a4a2e'),strap:rgb('#a82a24'),
 feather:rgb('#16161c'),featherSheen:rgb('#2a3450'),quill:rgb('#4a4a52'),fanHandle:rgb('#5a3a22'),fan:rgb('#2a2a24'),
};

function buildBody(){
 const P=pieces();
 // robe: slightly tapered, darker toward the hem
 P.add(new THREE.CylinderGeometry(.15,.18,.34,14,3),at(0,.6,0,[0,0,0],[1,1,.8]),(x,y)=>mix(C.robeDark,C.robe,THREE.MathUtils.clamp((y-.43)/.3,0,1)));
 // hakama skirt flaring over the tops of the legs
 P.add(new THREE.CylinderGeometry(.17,.23,.16,14,1,true),at(0,.43,0,[0,0,0],[1,1,.8]),(x,y)=>mix(C.hakamaDark,C.hakama,(y-.35)/.16));
 P.add(new THREE.CircleGeometry(.17,14),at(0,.51,0,[Math.PI/2,0,0],[1,.8,1]),C.hakamaDark);
 // shoulders
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.075,10,8),at(s*.15,.74,0,[0,0,0],[1,.8,1]),C.robe);
 // crossed white collar and the sash
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.045,.24,.02),at(s*.035,.67,.148,[.08,0,s*.42]),C.collar);
 P.add(new THREE.TorusGeometry(.172,.03,6,20),at(0,.51,0,[Math.PI/2,0,0],[1,.8,1]),C.sash);
 // yuigesa: two columns of fluffy pompoms on a band down the front
 for(const s of [-1,1])for(let k=0;k<3;k++){
  const y=.73-k*.075,z=.14+.006*k;
  P.add(new THREE.IcosahedronGeometry(.036,1),at(s*.075,y,z),mix(C.pom,C.hairShade,k*.12));
 }
 // neck
 P.add(new THREE.CylinderGeometry(.05,.06,.08,8),at(0,.8,.01),C.faceDeep);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 const shade=(x,y)=>mix(C.faceDeep,C.face,THREE.MathUtils.clamp((y+.02)/.2,0,1));
 P.add(new THREE.SphereGeometry(.15,16,12),at(0,.11,0,[0,0,0],[1,1.05,1]),shade);
 // the long nose, jutting forward and a touch upward, with a bulbous tip
 P.add(new THREE.CylinderGeometry(.018,.042,.23,10),at(0,.105,.24,[Math.PI/2-.12,0,0]),(x,y,z)=>mix(C.face,C.nose,THREE.MathUtils.clamp((z-.13)/.2,0,1)));
 P.add(new THREE.SphereGeometry(.024,8,6),at(0,.12,.355),C.nose);
 // bushy brows and a heavy scowl
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.045,8,6),at(s*.058,.175,.12,[0,0,s*-.35],[1.2,.45,.6]),C.hair);
 P.add(new THREE.SphereGeometry(.04,8,6),at(0,.05,.13,[0,0,0],[1.4,.35,.6]),C.faceDeep);
 // shaggy white mane swept back over the shoulders, and a tufted beard
 const tufts=[[0,.2,-.08,.1],[-.1,.15,-.08,.08],[.1,.15,-.08,.08],[-.13,.06,-.06,.075],[.13,.06,-.06,.075],[0,.07,-.14,.1],[-.07,-.02,-.12,.08],[.07,-.02,-.12,.08],[0,-.06,-.1,.07]];
 for(const [x,y,z,r] of tufts)P.add(new THREE.IcosahedronGeometry(r,1),at(x,y,z,[.4,0,x*2],[1,1.3,.9]),(px,py)=>mix(C.hairShade,C.hair,THREE.MathUtils.clamp((py+.1)/.3,0,1)));
 for(const s of [-1,1])P.add(new THREE.IcosahedronGeometry(.05,1),at(s*.14,.14,-.02,[0,0,s*.6],[.7,1.4,.9]),C.hair);
 P.add(new THREE.ConeGeometry(.055,.14,8),at(0,-.06,.1,[Math.PI+.3,0,0]),C.hair);
 // pointed ears poking through the mane
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.03,.1,5),at(s*.16,.13,.02,[0,0,-s*1.2]),C.face);
 // tokin: a small black pleated cap set forward on the brow, with its cord
 P.add(new THREE.CylinderGeometry(.045,.065,.07,12),at(0,.27,.05,[.35,0,0]),C.cap);
 P.add(new THREE.ConeGeometry(.045,.035,12),at(0,.31,.062,[.35,0,0]),C.cap);
 P.add(new THREE.TorusGeometry(.13,.007,4,20,Math.PI),at(0,.12,.02,[0,0,0],[1.02,1,1]),C.cap);
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.022,8,6),at(s*.055,.135,.128,[0,0,0],[1,.7,1]),[1,1,1]);
 return P.merge();
}

function buildLeg(){
 const P=pieces();
 // wide hakama trouser leg, gathered above the shin
 P.add(new THREE.CylinderGeometry(.09,.11,.24,10),at(0,-.08,0),(x,y)=>mix(C.hakamaDark,C.hakama,THREE.MathUtils.clamp((y+.2)/.24,0,1)));
 P.add(new THREE.TorusGeometry(.07,.015,5,12),at(0,-.2,0,[Math.PI/2,0,0]),C.hakamaDark);
 P.add(new THREE.CylinderGeometry(.034,.03,.07,8),at(0,-.235,.01),C.face);
 // bare foot on a one-toothed geta with a red thong
 P.add(new THREE.SphereGeometry(.045,8,6),at(0,-.27,.05,[0,0,0],[1,.55,1.6]),C.face);
 P.add(new THREE.BoxGeometry(.11,.024,.23),at(0,-.3,.04),C.wood);
 P.add(new THREE.BoxGeometry(.026,.075,.09),at(0,-.35,.04),C.wood);
 P.add(new THREE.TorusGeometry(.04,.009,4,10,Math.PI),at(0,-.285,.07,[0,0,0],[1,.7,1]),C.strap);
 return P.merge();
}

// side: -1 or 1. The +x arm carries the feather fan.
function buildArm(side){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.05,.08,.26,10),at(0,-.12,0),(x,y)=>mix(C.robeDark,C.robe,THREE.MathUtils.clamp((y+.25)/.25,0,1)));
 // hanging sleeve mouth, trimmed white
 P.add(new THREE.TorusGeometry(.075,.012,5,14),at(0,-.25,0,[Math.PI/2,0,0]),C.collar);
 P.add(new THREE.SphereGeometry(.042,10,8),at(0,-.3,.01),C.face);
 if(side>0){
  // hauchiwa: a stiff fan of black feathers on a short handle, held up before the chest
  P.add(new THREE.CylinderGeometry(.012,.014,.12,6),at(0,-.3,.06,[1.25,0,0]),C.fanHandle);
  const hub=new THREE.Vector3(0,-.28,.12);
  for(let k=0;k<9;k++){
   const a=(k-4)/4*.75;
   const len=.13-.012*Math.abs(k-4);
   P.add(new THREE.SphereGeometry(.03,6,5),at(hub.x+Math.sin(a)*len*.6,hub.y+Math.cos(a)*len*.6,hub.z,[0,0,-a],[.9,len/.03*.5,.18]),(x,y)=>mix(C.fan,C.featherSheen,THREE.MathUtils.clamp((y-hub.y)/.13,0,1)));
  }
  P.add(new THREE.SphereGeometry(.018,8,6),at(hub.x,hub.y,hub.z+.005),C.strap);
 }
 return P.merge();
}

// A crow wing: three rows of feathers spreading out and up from the shoulder blade.
function buildWing(side){
 const P=pieces();
 // the bony arm of the wing
 P.add(new THREE.CylinderGeometry(.022,.03,.26,6),at(side*.12,.08,0,[0,0,-side*1.05]),C.feather);
 const rows=[{n:6,len:.2,r:.03,z:-.015,tone:.1},{n:5,len:.15,r:.032,z:0,tone:.4},{n:4,len:.09,r:.035,z:.012,tone:.7}];
 for(const row of rows)for(let k=0;k<row.n;k++){
  const u=k/(row.n-1),bx=side*(.03+u*.2),by=.02+u*.13;
  const a=side*(-.25-u*1.05);// fan from drooping to flaring outward
  const len=row.len*(1-.25*Math.abs(u-.6));
  P.add(new THREE.SphereGeometry(row.r,6,5),at(bx+Math.sin(-a)*len*.5,by-Math.cos(a)*len*.5,row.z-u*.02,[0,0,a],[1,len/row.r*.5,.16]),
   (x,y)=>mix(C.feather,C.featherSheen,row.tone*.6+.25*THREE.MathUtils.clamp(y/.3,0,1)));
 }
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82});
 const eye=new THREE.MeshStandardMaterial({color:0xffd66b,emissive:0xf0a020,emissiveIntensity:2.6,roughness:.25});
 shared={material,eye,body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:{'-1':buildArm(-1),'1':buildArm(1)},wing:{'-1':buildWing(-1),'1':buildWing(1)}};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createTengu(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,.82,.02);body.add(head);
 mesh(head,S.head,S.material,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[],arms=[],wings=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.1,.375,0);body.add(leg);mesh(leg,S.leg,S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.2,.74,0);arm.rotation.z=s*.14;body.add(arm);mesh(arm,S.arm[s],S.material,'arm');arms.push(arm);
  const wing=new THREE.Group();wing.position.set(s*.07,.7,-.13);wing.rotation.x=-.15;wing.userData.side=s;body.add(wing);mesh(wing,S.wing[s],S.material,'wing');wings.push(wing);
 }
 // the fan arm is raised forward, holding the fan before the chest
 const arm=arms[1];arm.rotation.x=-.55;
 return {g,body,legs,tail:null,wings,quirk:'tengu',arms,arm,head,hat:null,beard:null,pick:null};
}
