import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Kobolds used to be the generic short humanoid: a box torso, a sphere head with a cone snout, two
// long flat cone ears and a stick spear. They now have their own model: a small, scaly, dog-snouted
// reptile standing hunched on digitigrade legs. It has a long tapering snout with nostrils and a
// row of little teeth, a pale scaly throat and belly, a heavy brow over glowing eyes, two backswept
// horns and swept-back ear frills, a ridge of little spines from the nape down the back and a long
// spined tail. Its thin arms end in three-clawed hands, and its feet have three clawed toes and a
// dewclaw. It wears a ragged loincloth on a rope belt with a pouch. Each kind has its own gear:
// - kobold: rust-brown, with a crude spear (a bound stone point on a knotty shaft), held upright.
// - large kobold: brick red and bigger, with a studded leather jerkin, a bone shoulder guard,
//   bracers, bigger horns and a knobbly nail-studded club.
// - kobold lord: purple, with a spiked gold circlet, a short rat-fur capelet held by a gold chain,
//   and a notched short sword.
// - kobold shaman: blue, with white face paint, a feather crest, a string of bone beads and teeth,
//   and a staff topped with a small animal skull, dangling feathers and a pale crystal.
// Each moving part (body, head, each leg and arm, the tail, the weapon) is one merged
// vertex-coloured mesh sharing one material, plus the glowing eyes on their own emissive material:
// 9 draws. The geometry is built once per kind and shared.
// Handles: body, head, legs, arms, arm (the right, weapon arm), weaponSocket (at the right fist,
// holding the weapon), tail (swings side to side on rotation.z), eyes. quirk 'kobold', as before.
// hat, beard and pick are null.

const BASE={
 cloth:'#6a5a40',clothDark:'#403422',rope:'#a08a5c',leather:'#4a3222',horn:'#d8c8a0',claw:'#2a2018',
 teeth:'#ece2c0',mouth:'#2a1210',nose:'#1c1210',wood:'#6a4a2c',metal:'#70706a',stone:'#8a8478',
 bone:'#e0d4b4',gold:'#d8a93a',paint:'#eeeae0',
};
const LOOKS={
 kobold:{skin:'#8a5a3a',belly:'#c4a070',dark:'#553520',eye:'#ff4a2a',scale:1,weapon:'spear'},
 'large kobold':{skin:'#9a3f2f',belly:'#cc8a5c',dark:'#5a2216',eye:'#ff8a2a',scale:1.18,weapon:'club',jerkin:true,horns:1.35},
 'kobold lord':{skin:'#7a3f70',belly:'#b890a4',dark:'#44203e',eye:'#ffd23a',scale:1.22,weapon:'sword',crown:true,cape:true,cloth:'#5a1a28',clothDark:'#34101a'},
 'kobold shaman':{skin:'#5070a8',belly:'#a0b4d4',dark:'#2c4270',eye:'#a8f0ff',scale:1.02,weapon:'staff',shaman:true},
};
export const KOBOLDS=Object.keys(LOOKS);
export const isKobold=name=>Object.hasOwn(LOOKS,name);

// proportions at scale 1 (body space, ground at y=0)
const P0={hip:.3,shoulderY:.5,shoulderX:.13,shoulderZ:.05,headY:.66,headZ:.1,arm:.27,legX:.07,tailY:.3,tailZ:-.08};

const lathe=(profile,segments=18,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const UP=new THREE.Vector3(0,1,0);
// a cone standing on (x,y,z) pointing along `dir`: a spine, a claw, a horn
function spike(x,y,z,dir,flat=1){
 const d=new THREE.Vector3(...dir).normalize();
 return new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromUnitVectors(UP,d),new THREE.Vector3(1,1,flat));
}
function horn(P,x,y,z,dir,len,r,colour,segments=6){const d=new THREE.Vector3(...dir).normalize();P.add(new THREE.ConeGeometry(r,len,segments),spike(x+d.x*len/2,y+d.y*len/2,z+d.z*len/2,dir),colour);}
function colours(L){const C={};for(const [k,v] of Object.entries({...BASE,...L}))if(typeof v==='string'&&v.startsWith('#'))C[k]=rgb(v);return C;}
// small scales: a mottle of darker plates over the hide
const scaly=(C,base,k=70)=>(x,y,z)=>mix(base,C.dark,hash(Math.round(x*k)+Math.round(y*k)*7+Math.round(z*k)*13)>.68?.45:.08);

function buildBody(L,C){
 const P=pieces(),h=P0.hip,hide=scaly(C,C.skin);
 // a small pot-bellied trunk, hunched forward, with a pale scaly belly
 const trunk=(x,y,z)=>z>.03&&Math.abs(x)<.07?mix(C.belly,C.skin,hash(Math.round(y*40))*.25):hide(x,y,z);
 P.add(lathe([[0,h-.04],[.085,h-.04],[.108,h],[.122,h+.06],[.118,h+.12],[.104,h+.18],[.082,h+.23],[.052,h+.26],[0,h+.265]],20),at(0,0,0,[.16,0,0],[1,1,.86]),trunk);
 // a thin neck thrust forward to the head
 P.add(new THREE.CylinderGeometry(.036,.048,.1,10),at(0,h+.29,.085,[.55,0,0]),(x,y,z)=>z>.1?C.belly:hide(x,y,z));
 // a ridge of little spines from the nape down the back
 for(let i=0;i<7;i++){const t=i/6,y=h+.3-t*.26,z=-.02-.05*Math.sin(t*2.2)+(1-t)*.03;horn(P,0,y,z-.055,[0,.55,-1],.045-t*.015,.012,mix(C.dark,C.horn,.2),4);}
 // rope belt with a knot and a little pouch
 P.add(new THREE.TorusGeometry(.108,.012,5,24),at(0,h,.0,[Math.PI/2,0,0],[1,.86,1]),C.rope);
 P.add(new THREE.SphereGeometry(.018,6,5),at(.04,h,.095),C.rope);
 P.add(new THREE.SphereGeometry(.03,8,6),at(-.09,h-.03,.04,[0,0,0],[.8,1,.6]),C.leather);
 // ragged loincloth, front and back
 const rag=(x,y,z)=>mix(C.cloth,C.clothDark,hash(Math.round(x*60)+Math.round(y*60)*5)*.5);
 for(const [z,tilt] of [[.09,-.12],[-.085,.14]]){
  P.add(new THREE.BoxGeometry(.11,.11,.01),at(0,h-.06,z,[tilt,0,0]),rag);
  for(let i=0;i<3;i++)P.add(new THREE.ConeGeometry(.02,.04+hash(i+z*9)*.02,3),at((i-1)*.035,h-.125,z+tilt*.06,[Math.PI,0,0],[1,1,.3]),C.clothDark);
 }
 if(L.jerkin){
  // studded leather jerkin over the chest and a bone guard on the left shoulder
  const jer=(x,y,z)=>mix(C.leather,rgb('#2e2016'),hash(Math.round(y*50))*.35);
  P.add(lathe([[.112,h+.03],[.128,h+.08],[.126,h+.14],[.11,h+.2],[.085,h+.245],[.06,h+.262]],20),at(0,0,0,[.16,0,0],[1.03,1,.9]),jer);
  for(let i=0;i<10;i++){const a=(i%5-2)*.42,y=h+.09+Math.floor(i/5)*.07;P.add(new THREE.SphereGeometry(.009,5,4),at(Math.sin(a)*.126,y,Math.cos(a)*.11+(y-h)*.16),C.metal);}
  P.add(new THREE.SphereGeometry(.06,10,6,0,Math.PI*2,0,Math.PI/2),at(-.125,h+.2,.03,[0,0,.5],[1,.7,1]),C.bone);
  for(let i=0;i<3;i++)horn(P,-.13-i*.012,h+.225-i*.012,.0+i*.02,[-.5,1,.1],.035,.01,C.bone,4);
 }
 if(L.cape){
  // a short capelet of rat fur round the shoulders, pinned by a gold chain across the chest
  const fur=(x,y,z)=>mix(rgb('#6a625a'),rgb('#3e3834'),hash(Math.round(x*80)*3+Math.round(y*80))*.7);
  P.add(lathe([[.1,h+.27],[.14,h+.22],[.16,h+.14],[.17,h+.07]],22,Math.PI*.45,Math.PI*1.1),at(0,0,0,[.16,0,0],[1,1,.95]),fur);
  for(let i=0;i<9;i++){const a=Math.PI*(.5+i*.125);horn(P,Math.sin(a)*.168,h+.08-hash(i)*.01,Math.cos(a)*.16+.012,[Math.sin(a)*.2,-1,Math.cos(a)*.2],.04,.014,rgb('#4a4440'),3);}
  const pts=[];for(let i=0;i<=10;i++){const t=i/10;pts.push(new THREE.Vector3((t-.5)*.2,h+.215-Math.sin(t*Math.PI)*.04,.105+Math.sin(t*Math.PI)*.012));}
  P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.006,4),null,C.gold);
  for(const s of [-1,1])P.add(new THREE.CylinderGeometry(.016,.016,.008,10),at(s*.1,h+.215,.1,[Math.PI/2,0,0]),C.gold);
 }
 if(L.shaman){
  // a string of bone beads and teeth hung round the neck
  for(let i=0;i<11;i++){const a=(i-5)*.28,x=Math.sin(a)*.075,y=h+.23-Math.cos(a)*.05,z=.1+Math.cos(a)*.03;
   if(i%2)P.add(new THREE.SphereGeometry(.011,6,5),at(x,y,z),i===5?C.gold:C.bone);else horn(P,x,y,z,[0,-1,.25],.03,.008,C.teeth,4);}
 }
 return P.merge();
}

function buildHead(L,C){
 const P=pieces(),hide=scaly(C,C.skin,90);
 // a flat-topped skull, the jaw line and throat pale
 const face=(x,y,z)=>{
  if(L.shaman&&z>.02&&y>-.01&&y<.03&&Math.abs(x)>.02)return C.paint;
  return y<-.035?mix(C.belly,C.skin,.2):hide(x,y,z);
 };
 P.add(new THREE.SphereGeometry(.1,18,12),at(0,0,0,[0,0,0],[1,.86,1.05]),face);
 // heavy brow ridges
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.035,10,6),at(s*.042,.038,.075,[.3,s*.3,0],[1.3,.5,.9]),C.dark);
 // a long tapering snout with a dark nose and nostrils
 P.add(new THREE.CylinderGeometry(.036,.066,.15,14),at(0,-.022,.13,[Math.PI/2,0,0],[1,1,.8]),(x,y,z)=>y<-.045?C.belly:hide(x,y,z));
 P.add(new THREE.SphereGeometry(.036,10,8),at(0,-.022,.205,[0,0,0],[1,.8,.9]),face);
 P.add(new THREE.SphereGeometry(.018,8,6),at(0,-.005,.225,[0,0,0],[1.4,.8,.8]),C.nose);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.006,5,4),at(s*.012,-.004,.24),rgb('#000000'));
 // the lower jaw, slightly open, with a dark mouth line and little teeth
 P.add(new THREE.CylinderGeometry(.024,.05,.13,10),at(0,-.062,.12,[Math.PI/2+.12,0,0],[1,1,.55]),C.belly);
 P.add(new THREE.BoxGeometry(.07,.008,.12),at(0,-.047,.14,[.06,0,0]),C.mouth);
 for(const s of [-1,1])for(let i=0;i<4;i++)horn(P,s*(.028-i*.004),-.04,.1+i*.03,[0,-1,0],.016,.005,C.teeth,4);
 // two backswept horns, and swept-back ear frills
 const hl=.08*(L.horns||1),hr=.016*(L.horns||1);
 for(const s of [-1,1]){
  horn(P,s*.045,.07,-.01,[s*.25,.7,-1],hl,hr,(x,y,z)=>mix(C.horn,C.dark,THREE.MathUtils.clamp(1-(z+.01)/-.05,0,1)*.6));
  P.add(new THREE.ConeGeometry(.035,.11,4),spike(s*.1,.015,-.035,[s*1,.35,-.7],.25),(x,y,z)=>Math.abs(x)<.12?C.dark:hide(x,y,z));
 }
 if(L.crown){
  // a spiked gold circlet sitting on the brow
  P.add(new THREE.TorusGeometry(.083,.009,5,24),at(0,.055,.005,[Math.PI/2-.2,0,0],[1,1.12,1]),C.gold);
  for(let i=0;i<5;i++){const a=(i-2)*.5;horn(P,Math.sin(a)*.083,.07+Math.cos(a)*.017,Math.cos(a)*.093+.005,[Math.sin(a)*.2,1,.25],.04,.011,C.gold,4);}
  P.add(new THREE.OctahedronGeometry(.012),at(0,.078,.1),rgb('#c02030'));
 }
 if(L.shaman){
  // a crest of three feathers bound at the back of the skull
  for(const [i,c] of [[-1,'#c83a2a'],[0,'#e8e0d0'],[1,'#2a2a2a']].map(([i,c])=>[i,rgb(c)]))
   P.add(new THREE.ConeGeometry(.018,.12,4),spike(i*.022,.1,-.06,[i*.3,1,-.55],.25),c);
  P.add(new THREE.SphereGeometry(.016,6,5),at(0,.075,-.06),C.rope);
 }
 return P.merge();
}

// The eyes, on their own glowing material, in head space.
function buildEyes(){
 const P=pieces(),W=[1,1,1];
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.016,10,8),at(s*.045,.018,.083,[0,s*.3,0],[1.3,.75,.6]),W);
 return P.merge();
}

function buildLeg(L,C){
 const P=pieces(),hide=scaly(C,C.skin);
 // digitigrade: a thigh angled forward, a shin angled back, a raised hock and a three-toed foot
 P.add(new THREE.CylinderGeometry(.05,.038,.14,10),at(0,-.06,.02,[-.4,0,0]),hide);
 P.add(new THREE.SphereGeometry(.036,8,6),at(0,-.125,.05),hide);
 P.add(new THREE.CylinderGeometry(.032,.024,.13,10),at(0,-.185,.02,[.45,0,0]),hide);
 P.add(new THREE.SphereGeometry(.024,8,6),at(0,-.245,-.01),C.dark);
 P.add(new THREE.CylinderGeometry(.022,.024,.05,8),at(0,-.268,.002,[-.35,0,0]),hide);
 P.add(new THREE.SphereGeometry(.036,10,6),at(0,-.288,.035,[0,0,0],[1,.45,1.5]),hide);
 for(let i=0;i<3;i++){
  const a=(i-1)*.38,x=Math.sin(a)*.03,z=.06+Math.cos(a)*.02;
  P.add(new THREE.SphereGeometry(.013,6,5),at(x,-.29,z,[0,a,0],[1,.8,1.8]),hide);
  horn(P,x+Math.sin(a)*.018,-.29,z+Math.cos(a)*.018,[Math.sin(a),-.5,Math.cos(a)],.03,.007,C.claw,5);
 }
 horn(P,0,-.27,-.02,[0,-.6,-1],.025,.006,C.claw,4);
 return P.merge();
}

function buildArm(L,C){
 const P=pieces(),a=P0.arm,hide=scaly(C,C.skin);
 // thin scaly arms: a shoulder, upper arm, bony elbow, forearm and a three-clawed hand
 P.add(new THREE.SphereGeometry(.042,10,8),at(0,-.005,0),hide);
 P.add(new THREE.CylinderGeometry(.032,.026,.12,10),at(0,-.07,0),hide);
 P.add(new THREE.SphereGeometry(.026,8,6),at(0,-.135,-.005),C.dark);
 P.add(new THREE.CylinderGeometry(.026,.021,.11,10),at(0,-.195,.005),hide);
 if(L.jerkin){P.add(new THREE.CylinderGeometry(.03,.027,.06,10),at(0,-.21,.005),C.leather);for(const y of [-.19,-.23])P.add(new THREE.TorusGeometry(.029,.004,4,12),at(0,y,.005,[Math.PI/2,0,0]),C.metal);}
 P.add(new THREE.SphereGeometry(.03,10,6),at(0,-a+.012,.01,[0,0,0],[1,1.1,1.1]),hide);
 for(let i=0;i<3;i++){const x=(i-1)*.017;P.add(new THREE.SphereGeometry(.011,6,4),at(x,-a-.012,.028),hide);horn(P,x,-a-.02,.036,[0,-1,.9],.026,.006,C.claw,4);}
 return P.merge();
}

// The tail hangs from its root along −y; createKobold tips it back, so rotation.z swings it.
function buildTail(L,C){
 const P=pieces(),hide=scaly(C,C.skin);
 P.add(lathe([[0,.02],[.048,0],[.044,-.07],[.036,-.14],[.024,-.21],[.012,-.26],[0,-.285]],12),null,(x,y,z)=>z>.02?mix(C.belly,C.skin,.35):hide(x,y,z));
 // spines along the top (local −z faces up once the tail is tipped back)
 for(let i=0;i<6;i++){const y=-.03-i*.04,r=.046-i*.0065;horn(P,0,y,-r*.9,[0,-.4,-1],.035-i*.004,.009,mix(C.dark,C.horn,.2),4);}
 return P.merge();
}

// Weapons in the right fist's socket. The spear and the staff stand upright (+y); the club and
// the sword point forward (+z) and are carried tipped down.
function buildWeapon(L,C){
 const P=pieces(),grain=(x,y,z)=>mix(C.wood,rgb('#3e2a18'),hash(Math.round((x+y+z)*80))*.5);
 if(L.weapon==='spear'){
  const up=at(0,0,0,[-.35,0,0]),Q=pieces();
  Q.add(new THREE.CylinderGeometry(.012,.014,.5,7),at(0,.14,0),grain);
  for(const y of [.02,.12,.25])Q.add(new THREE.SphereGeometry(.016,6,4),at(0,y,0,[0,0,0],[1,.6,1]),C.wood);
  Q.add(new THREE.OctahedronGeometry(.035),at(0,.43,0,[0,.4,0],[.8,2,.35]),(x,y,z)=>mix(C.stone,rgb('#5a564e'),hash(Math.round(y*90)+Math.round(x*90))*.6));
  for(const y of [.37,.385])Q.add(new THREE.TorusGeometry(.015,.004,4,10),at(0,y,0,[Math.PI/2,0,0]),C.rope);
  return Q.merge().applyMatrix4(up);
 }
 if(L.weapon==='staff'){
  P.add(new THREE.CylinderGeometry(.013,.016,.6,7),at(0,.17,0,[0,0,.04]),grain);
  // a small animal skull with dark sockets and a short snout, a crystal above it
  P.add(new THREE.SphereGeometry(.032,10,8),at(.012,.49,.005,[0,0,0],[1,.9,1.1]),C.bone);
  P.add(new THREE.CylinderGeometry(.012,.022,.05,8),at(.012,.48,.04,[Math.PI/2,0,0]),C.bone);
  for(const s of [-1,1])P.add(new THREE.SphereGeometry(.009,6,4),at(.012+s*.014,.495,.028),rgb('#1a1410'));
  P.add(new THREE.OctahedronGeometry(.02),at(.012,.545,0,[0,0,0],[.8,1.6,.8]),rgb('#c8f4ff'));
  // feathers and beads dangling from a thong under the skull
  for(const [s,c] of [[-1,'#c83a2a'],[1,'#e8e0d0']]){
   P.add(new THREE.CylinderGeometry(.002,.002,.06,3),at(.012+s*.03,.44,0),C.rope);
   P.add(new THREE.SphereGeometry(.008,6,4),at(.012+s*.03,.41,0),C.bone);
   P.add(new THREE.ConeGeometry(.013,.07,4),at(.012+s*.03,.37,0,[Math.PI,0,0],[1,1,.25]),rgb(c));
  }
  return P.merge();
 }
 // a leather-wrapped grip, then a weapon along +z
 P.add(new THREE.CylinderGeometry(.015,.015,.07,7),at(0,0,0,[Math.PI/2,0,0]),C.leather);
 if(L.weapon==='club'){
  P.add(new THREE.CylinderGeometry(.045,.02,.26,9),at(0,0,.16,[Math.PI/2,0,0]),grain);
  for(let i=0;i<5;i++)P.add(new THREE.SphereGeometry(.022,6,5),at(Math.sin(i*2.4)*.03,Math.cos(i*2.4)*.03,.19+i*.035),C.wood);
  for(let i=0;i<8;i++){const a=i*1.9,z=.2+i*.022;horn(P,Math.sin(a)*.04,Math.cos(a)*.04,z,[Math.sin(a),Math.cos(a),.2],.025,.004,C.metal,4);}
  return P.merge().applyMatrix4(at(0,0,0,[.35,0,0],[1,1,.82]));
 }
 // the lord's notched short sword: a crossguard and a pitted blade
 P.add(new THREE.SphereGeometry(.016,6,5),at(0,0,-.04),C.gold);
 P.add(new THREE.BoxGeometry(.1,.016,.016),at(0,0,.04),C.gold);
 const blade=new THREE.Shape();blade.moveTo(-.02,0);blade.lineTo(-.02,.12);blade.lineTo(-.012,.13);blade.lineTo(-.02,.14);blade.lineTo(-.016,.2);blade.lineTo(0,.24);blade.lineTo(.018,.2);blade.lineTo(.018,.09);blade.lineTo(.01,.08);blade.lineTo(.018,.07);blade.lineTo(.02,0);
 P.add(new THREE.ExtrudeGeometry(blade,{depth:.006,bevelEnabled:false}),at(0,-.003,.045,[Math.PI/2,0,Math.PI/2]),(x,y,z)=>mix(rgb('#b8bcbc'),rgb('#6a6660'),hash(Math.round(z*120)+Math.round(x*200))*.5));
 return P.merge().applyMatrix4(at(0,0,0,[.6,0,0]));
}

// mirror a leg for the other side, restoring the winding the mirror flips
function mirrored(geo){
 const m=geo.clone().scale(-1,1,1);
 for(let i=0;i<m.attributes.position.count;i+=3)for(const key of ['position','normal','color']){const a=m.attributes[key];for(let k=0;k<a.itemSize;k++){const j=(i+1)*a.itemSize+k,l=(i+2)*a.itemSize+k,t=a.array[j];a.array[j]=a.array[l];a.array[l]=t;}}
 return m;
}

const cache={};let material=null;
function geometry(kind){
 if(cache[kind])return cache[kind];
 material??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.08,side:THREE.DoubleSide});
 const L=LOOKS[kind],C=colours(L),s=L.scale,grow=g=>g.scale(s,s,s),leg=grow(buildLeg(L,C));
 cache[kind]={
  body:grow(buildBody(L,C)),head:grow(buildHead(L,C)),eyes:grow(buildEyes()),legs:[mirrored(leg),leg],
  arms:[grow(buildArm(L,C)),grow(buildArm(L,C))],tail:grow(buildTail(L,C)),weapon:grow(buildWeapon(L,C)),
  eyeMaterial:new THREE.MeshStandardMaterial({color:L.eye,emissive:L.eye,emissiveIntensity:2.6,roughness:.3}),
 };
 return cache[kind];
}
function mesh(parent,geo,mat,name){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createKobold(name){
 const kind=isKobold(name)?name:'kobold',L=LOOKS[kind],S=geometry(kind),s=L.scale;
 const g=new THREE.Group(),body=new THREE.Group();g.name=kind;g.add(body);
 mesh(body,S.body,material,'body');
 const head=new THREE.Group();head.position.set(0,P0.headY*s,P0.headZ*s);body.add(head);
 mesh(head,S.head,material,'head');
 const eyes=mesh(head,S.eyes,S.eyeMaterial,'eyes');eyes.castShadow=false;
 const legs=[],arms=[];
 for(const [i,side] of [-1,1].entries()){
  const leg=new THREE.Group();leg.position.set(side*P0.legX*s,P0.hip*s,0);body.add(leg);mesh(leg,S.legs[i],material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(side*P0.shoulderX*s,P0.shoulderY*s,P0.shoulderZ*s);arm.rotation.z=side*.14;body.add(arm);mesh(arm,S.arms[i],material,'arm');arms.push(arm);
 }
 const tail=new THREE.Group();tail.position.set(0,P0.tailY*s,P0.tailZ*s);tail.rotation.x=1.2;body.add(tail);mesh(tail,S.tail,material,'tail');
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-(P0.arm+.01)*s,.02*s);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.weapon,material,'weapon');
 return {g,body,legs,tail,wings:[],quirk:'kobold',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
