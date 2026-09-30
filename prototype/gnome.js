import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Gnomes used to be the generic box humanoid with a cone for a cap and a ball for a beard. They
// now have their own model: a stumpy, pot-bellied little fellow with a big round head, a bulbous
// rosy nose, apple cheeks, beady eyes under bushy brows and big pointed ears. A tall felt cap
// with a rolled brim flops back at the tip, and a long forked beard with a curled moustache falls
// to the belt. He wears a belted tunic with a pouch, patched breeches, and boots with curled toes.
// Each kind, tinted by its glyph colour, has its own kit:
// - gnome: a brown cap and moss-green tunic, carrying an aklys (a studded club on a cord).
// - gnome lord: a blue cap with a feather in its band, a blue tunic with a brass buckle and a
//   leaf-bladed dagger.
// - gnome king: a magenta cap ringed by a gold crown with gems, an ermine-collared purple cape
//   and a gold sceptre topped with a gem. He stands a little taller.
// - gnomish wizard: a tall starry blue cap with a crescent moon, a knee-length robe with a rope
//   belt, and a gnarled staff with a glowing crystal in its crook.
// Each moving part (body, head, hat, beard, each leg and arm, and the weapon) is one merged
// vertex-coloured mesh on one shared material: 9 draws. The geometry is built once per kind.
// Handles: body, head, legs, arms, arm (the right, weapon arm), weaponSocket, hat and beard (for
// the gait's cap nod and beard swing: the hat turns about its brim .18 below its origin, the
// beard about the chin .19 above its origin, as gait.js expects). quirk 'gnome'. pick is null.

const LOOKS={
 gnome:{cap:'#7a4a26',capDark:'#4e2c16',tunic:'#4f6a3a',tunicDark:'#34482a',breeches:'#6a5238',beard:'#9a7458',weapon:'aklys',scale:1},
 'gnome lord':{cap:'#2f4f9a',capDark:'#1c3066',tunic:'#3a5a8a',tunicDark:'#263e62',breeches:'#5a4a3a',beard:'#bcb4a4',weapon:'dagger',feather:true,scale:1.03},
 'gnome king':{cap:'#8a2a7a',capDark:'#561650',tunic:'#6a2a6a',tunicDark:'#461a48',breeches:'#4a3a4a',beard:'#f0ece2',weapon:'sceptre',crown:true,cape:true,scale:1.08},
 'gnomish wizard':{cap:'#3a6ad8',capDark:'#20408e',tunic:'#3458b0',tunicDark:'#223a78',breeches:'#4a4a5a',beard:'#e4e0d6',weapon:'staff',robe:true,stars:true,tall:true,scale:1.02},
};
export const GNOMES=Object.keys(LOOKS);
export const isGnome=name=>Object.hasOwn(LOOKS,name);

const SKIN=rgb('#dca27c'),SKIN_SHADE=rgb('#b27a5a'),ROSE=rgb('#d8705c'),EYE=rgb('#1a1210'),GLINT=rgb('#f4f0e8'),
 LEATHER=rgb('#5a3a24'),LEATHER_DARK=rgb('#36220f'),BRASS=rgb('#c8a04a'),GOLD=rgb('#e0b440'),GOLD_DARK=rgb('#9a7420'),
 WOOD=rgb('#7a5434'),WOOD_DARK=rgb('#4a3020'),STEEL=rgb('#b4bcc0'),ERMINE=rgb('#f2eee4'),SPOT=rgb('#1a1616'),
 RUBY=rgb('#c0182a'),SAPPHIRE=rgb('#2a4ad0'),EMERALD=rgb('#1a9a4a'),CRYSTAL=rgb('#bff4ff'),ROPE=rgb('#b09a6a');

const HIP=.3,SHOULDER_Y=.56,SHOULDER_X=.19,ARM=.26,HEAD_Y=.72,HEAD_R=.125;
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const colours=L=>{const C={};for(const [k,v] of Object.entries(L))if(typeof v==='string'&&v.startsWith('#'))C[k]=rgb(v);return C;};

function buildBody(L,C){
 const P=pieces();
 // A pot-bellied tunic: flared at the hem, swelling round the belly, narrowing to the shoulders.
 const hem=L.robe?.16:.24;
 P.add(lathe([[0,hem],[.17,hem],[.19,hem+.03],[.185,.3],[.2,.36],[.205,.42],[.19,.49],[.16,.55],[.1,.595],[.05,.61],[0,.612]],28),
  at(0,0,.01,[0,0,0],[1,1,.9]),(x,y,z)=>mix(ramp(C.tunicDark,C.tunic,hem,.45)(y),C.tunicDark,z<-.05?.25:0));
 // the belly pushes out in front
 P.add(new THREE.SphereGeometry(.15,16,12),at(0,.39,.045,[0,0,0],[1.15,1,.9]),ramp(C.tunicDark,C.tunic,.28,.46));
 // the hem, turned up
 P.add(new THREE.TorusGeometry(.18,.013,5,28),at(0,hem+.01,.01,[Math.PI/2,0,0],[1.02,.9,1]),C.tunicDark);
 if(L.robe){
  // a rope belt tied at the front, the ends hanging
  P.add(new THREE.TorusGeometry(.205,.012,5,28),at(0,.34,.035,[Math.PI/2,0,0],[1.02,.98,1]),ROPE);
  P.add(new THREE.SphereGeometry(.02,8,6),at(.03,.335,.23),ROPE);
  for(const [x,len] of [[.02,.12],[.045,.1]]){P.add(new THREE.CylinderGeometry(.008,.008,len,5),at(x,.33-len/2,.23),ROPE);P.add(new THREE.SphereGeometry(.012,6,4),at(x,.33-len,.23),ROPE);}
  // stars and a moon picked out in gold thread on the robe's front
  for(const [x,y] of [[-.1,.24],[.09,.21],[-.05,.46],[.12,.47],[-.13,.38]])P.add(new THREE.OctahedronGeometry(.013),at(x,y,Math.sqrt(Math.max(0,.2**2-x*x))*.95+.05,[0,0,Math.PI/4],[1,1,.35]),GOLD);
 }else{
  // a broad leather belt with a buckle, and a pouch on the left hip
  P.add(new THREE.TorusGeometry(.2,.022,5,28),at(0,.34,.035,[Math.PI/2,0,0],[1.03,.98,1]),LEATHER);
  P.add(new THREE.BoxGeometry(.06,.05,.02),at(0,.34,.235),L.weapon==='dagger'?BRASS:rgb('#8a8a80'));
  P.add(new THREE.BoxGeometry(.034,.026,.024),at(0,.34,.236),LEATHER);
  P.add(new THREE.SphereGeometry(.05,10,8),at(-.17,.28,.09,[0,0,0],[.8,1,.7]),LEATHER);
  P.add(new THREE.BoxGeometry(.06,.014,.04),at(-.17,.32,.1,[0,0,.1]),LEATHER_DARK);
  // a patch on the belly, stitched on crooked
  P.add(new THREE.BoxGeometry(.06,.05,.01),at(.08,.44,.19,[0,.4,.2]),ramp(C.tunic,C.cap,0,1)(.35));
 }
 // a laced collar at the neck
 P.add(new THREE.TorusGeometry(.075,.018,6,18),at(0,.6,.015,[Math.PI/2,0,0]),C.tunicDark);
 if(L.cape){
  // a cape hanging from the shoulders, curved round the back, over an ermine collar
  const cape=new THREE.CylinderGeometry(.22,.28,.46,20,4,true,Math.PI*.55,Math.PI*.9);
  P.add(cape,at(0,.37,-.005,[0,0,0],[1,1,.85]),(x,y)=>mix(C.capDark,rgb('#5a1a58'),(y-.14)*2));
  P.add(new THREE.TorusGeometry(.13,.04,8,20),at(0,.6,-.01,[Math.PI/2,0,0],[1.2,1,1]),ERMINE);
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;P.add(new THREE.SphereGeometry(.007,4,3),at(Math.sin(a)*.16,.61,Math.cos(a)*.13-.01,[0,0,0],[1,1.8,1]),SPOT);}
  P.add(new THREE.SphereGeometry(.018,8,6),at(0,.58,.14),GOLD);
 }
 return P.merge();
}

function buildHead(L,C){
 const P=pieces(),r=HEAD_R;
 // a big round head, fuller in the cheeks
 P.add(new THREE.SphereGeometry(r,20,16),at(0,0,0,[0,0,0],[1.02,1,1]),(x,y,z)=>mix(SKIN,SKIN_SHADE,THREE.MathUtils.clamp(-z*6,0,.45)));
 for(const s of [-1,1]){
  // apple cheeks
  P.add(new THREE.SphereGeometry(.042,10,8),at(s*.06,-.025,.085,[0,0,0],[1,.85,.7]),mix(SKIN,ROSE,.55));
  // beady eyes with a glint, under bushy brows
  P.add(new THREE.SphereGeometry(.018,10,8),at(s*.043,.03,.108,[0,0,0],[1,1.1,.6]),EYE);
  P.add(new THREE.SphereGeometry(.005,5,4),at(s*.043+.006,.037,.118),GLINT);
  P.add(new THREE.SphereGeometry(.028,8,6),at(s*.047,.058,.105,[0,0,s*-.25],[1.4,.5,.7]),C.beard);
  // big ears, pointed and a little swept back
  P.add(new THREE.ConeGeometry(.04,.12,8),at(s*.13,.015,-.01,[-.3,0,s*-1.05],[1,1,.4]),(x,y,z)=>mix(SKIN,SKIN_SHADE,Math.abs(x)*4-.4));
  P.add(new THREE.ConeGeometry(.024,.08,8),at(s*.128,.015,.0,[-.3,0,s*-1.05],[1,1,.2]),mix(SKIN_SHADE,ROSE,.4));
  // tufts of hair over the ears, below the cap
  for(let i=0;i<3;i++)P.add(new THREE.SphereGeometry(.03,8,6),at(s*(.11-i*.01),.0-i*.025,-.05-i*.02,[0,0,0],[.8,1,1.1]),C.beard);
 }
 // a big bulbous nose, redder at the tip
 P.add(new THREE.SphereGeometry(.048,14,12),at(0,-.01,.13,[0,0,0],[1,.95,1]),(x,y,z)=>mix(SKIN,ROSE,(z-.12)*14));
 P.add(new THREE.SphereGeometry(.02,8,6),at(0,.02,.115),SKIN);
 return P.merge();
}

// The cap, in its own frame: the brim at y=-.18 (gait.js turns it about there), rising to a
// tip that flops over backwards. The lathe is bent along its height, not just rotated.
function buildHat(L,C){
 const P=pieces(),B=-.18,H=L.tall?.5:.4,R=.14;
 const prof=[[R,0],[R*.98,.06],[R*.86,H*.25],[R*.66,H*.5],[R*.42,H*.72],[R*.2,H*.9],[R*.08,H*.98],[0,H]];
 const cap=lathe(prof,28);
 const bend=L.tall?-1.6:-2.3,h0=H*.35,p=cap.attributes.position,steps=24;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(y<=h0){p.setY(i,y+B);continue;}
  // walk the bent centreline to this height
  const len=y-h0,span=H-h0;let cy=h0,cz=0,th=0;
  for(let k=0;k<steps;k++){const l=(k+.5)/steps*len;th=bend*(l/span)**2;cy+=Math.cos(th)*len/steps;cz+=Math.sin(th)*len/steps;}
  th=bend*(len/span)**2;
  p.setXYZ(i,x,cy-z*Math.sin(th)+B,cz+z*Math.cos(th));
 }
 cap.computeVertexNormals();
 // felt: darker in the folds on the underside of the flop and towards the back
 P.add(cap,null,(x,y,z)=>{
  let c=mix(C.cap,C.capDark,THREE.MathUtils.clamp(-z*3,0,.45)+.15*hash(Math.round(y*40)));
  if(L.stars){const s=hash(Math.round(x*60)*7+Math.round(y*60)*13+Math.round(z*60));if(s>.93)c=GOLD;}
  return c;
 });
 // the rolled brim
 P.add(new THREE.TorusGeometry(R*.99,.02,8,32),at(0,B+.012,0,[Math.PI/2,0,0]),C.capDark);
 if(L.feather){
  // a feather tucked into the band on the left, curving up and back
  P.add(new THREE.CylinderGeometry(.004,.006,.24,5),at(-.13,B+.13,-.04,[-.45,0,.25]),rgb('#e8e0c8'));
  P.add(new THREE.SphereGeometry(.05,10,6),at(-.135,B+.15,-.05,[-.45,0,.25],[.35,1.9,.08]),(x,y)=>mix(rgb('#c8382a'),rgb('#f0c040'),(y-B-.06)*4));
 }
 if(L.crown){
  // a gold crown round the brim, with five points and a gem at each
  P.add(new THREE.CylinderGeometry(R+.018,R+.022,.06,28,1,true),at(0,B+.045,0),(x,y)=>mix(GOLD_DARK,GOLD,(y-B)*18));
  P.add(new THREE.TorusGeometry(R+.02,.008,5,28),at(0,B+.016,0,[Math.PI/2,0,0]),GOLD);
  for(let i=0;i<5;i++){
   const a=i/5*Math.PI*2,x=Math.sin(a)*(R+.02),z=Math.cos(a)*(R+.02);
   P.add(new THREE.ConeGeometry(.022,.07,4),at(x,B+.105,z,[0,a,0]),GOLD);
   P.add(new THREE.SphereGeometry(.009,5,4),at(x,B+.14,z),GOLD);
   P.add(new THREE.OctahedronGeometry(.012),at(Math.sin(a)*(R+.026),B+.045,Math.cos(a)*(R+.026),[0,a,0],[1,1.2,.6]),[RUBY,SAPPHIRE,EMERALD][i%3]);
  }
 }
 if(L.stars){
  // a crescent moon on the front of the cap
  P.add(new THREE.TorusGeometry(.03,.009,6,14,Math.PI*1.2),at(0,B+.12,R*.8+.012,[-.12,0,-Math.PI*.1]),GOLD);
 }
 return P.merge();
}

// The beard, in its own frame: hung from the chin at y=+.19 (gait.js swings it from there).
function buildBeard(L,C){
 const P=pieces(),T=.19;
 const beard=(x,y,z)=>mix(C.beard,mix(C.beard,[1,1,1],.4),hash(Math.round(x*90)*3+Math.round(y*90))*.5);
 // a broad bib of beard from ear to ear, tapering to two forked points at the belt
 P.add(new THREE.SphereGeometry(.11,16,14),at(0,T-.08,0,[0,0,0],[1.15,1.05,.62]),beard);
 P.add(new THREE.SphereGeometry(.09,14,12),at(0,T-.17,.01,[0,0,0],[1,1.1,.55]),beard);
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.045,.14,10),at(s*.03,T-.28,.015,[Math.PI,0,s*-.15],[1,1,.6]),beard);
 // wavy strands down the front
 for(let i=0;i<5;i++)P.add(new THREE.CylinderGeometry(.008,.004,.2,5),at((i-2)*.03,T-.16,.055-Math.abs(i-2)*.008,[.1,0,(i-2)*.05]),mix(C.beard,[1,1,1],.35));
 // a curled moustache under the nose
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.034,10,8),at(s*.035,T+.005,.07,[0,0,s*.35],[1.5,.6,.7]),C.beard);
  P.add(new THREE.TorusGeometry(.016,.008,6,10,Math.PI*1.3),at(s*.075,T+.012,.058,[0,s*.4,s>0?.2:Math.PI-.2]),C.beard);
 }
 // a mouth in the beard
 P.add(new THREE.SphereGeometry(.018,8,6),at(0,T-.02,.075,[0,0,0],[1.2,.5,.5]),rgb('#6a2a24'));
 return P.merge();
}

function buildLeg(L,C){
 const P=pieces(),h=HIP;
 // stubby breeches with a patch on the knee, into boots with a turned cuff
 P.add(new THREE.CylinderGeometry(.07,.058,.15,12),at(0,-.075,0),ramp(mix(C.breeches,[0,0,0],.3),C.breeches,-.15,0));
 P.add(new THREE.BoxGeometry(.05,.045,.012),at(-.01,-.12,.058,[0,0,.2]),mix(C.breeches,C.cap,.4));
 P.add(new THREE.CylinderGeometry(.06,.056,.13,12),at(0,-.2,.0),ramp(LEATHER_DARK,LEATHER,-.27,-.14));
 P.add(new THREE.TorusGeometry(.064,.016,6,14),at(0,-.14,0,[Math.PI/2,0,0]),LEATHER);
 // the foot, long and pointed, curling up at the toe
 P.add(new THREE.SphereGeometry(.06,12,8),at(0,-h+.035,.03,[0,0,0],[.95,.6,1.4]),(x,y)=>y<-h+.02?LEATHER_DARK:LEATHER);
 const toe=[];for(let i=0;i<=8;i++){const t=i/8;toe.push(new THREE.Vector3(0,-h+.03+t*t*.07,.08+t*.09-t*t*.02));}
 const curve=new THREE.CatmullRomCurve3(toe),tube=new THREE.TubeGeometry(curve,10,.04,8);
 // taper the tube to a point: each ring of 9 vertices shrinks towards the curve
 const p=tube.attributes.position,cp=new THREE.Vector3();
 for(let i=0;i<p.count;i++){
  const t=Math.floor(i/9)/10,a=Math.max(.08,1-t*.92);curve.getPointAt(t,cp);
  p.setXYZ(i,cp.x+(p.getX(i)-cp.x)*a,cp.y+(p.getY(i)-cp.y)*a,cp.z+(p.getZ(i)-cp.z)*a);
 }
 tube.computeVertexNormals();
 P.add(tube,null,LEATHER);
 P.add(new THREE.SphereGeometry(.009,6,4),toeTip(toe),BRASS);
 // the sole
 P.add(new THREE.BoxGeometry(.1,.014,.18),at(0,-h+.007,.04),LEATHER_DARK);
 return P.merge();
}
const toeTip=toe=>at(toe[8].x,toe[8].y,toe[8].z);

function buildArm(L,C){
 const P=pieces(),a=ARM,sleeve=L.robe?C.tunic:C.tunicDark;
 // a puffed sleeve with a turned cuff, and a stubby four-fingered hand
 P.add(new THREE.SphereGeometry(.06,12,10),at(0,-.01,0),C.tunic);
 P.add(new THREE.CylinderGeometry(.052,.058,.18,12),at(0,-.1,0),ramp(C.tunicDark,C.tunic,-.2,0));
 P.add(new THREE.TorusGeometry(.056,.016,6,14),at(0,-.19,0,[Math.PI/2,0,0]),sleeve);
 P.add(new THREE.SphereGeometry(.042,10,8),at(0,-a+.015,.01,[0,0,0],[.95,1.05,.9]),SKIN);
 for(let i=0;i<4;i++)P.add(new THREE.SphereGeometry(.013,6,4),at((i-1.5)*.018,-a-.016,.035),SKIN_SHADE);
 return P.merge();
}

// The weapon, in the right fist's socket, pointing forward (+z).
function buildWeapon(L){
 const P=pieces();
 if(L.weapon==='aklys'){
  // a short club, fat at the head and studded, with a cord looped round the wrist
  P.add(new THREE.CylinderGeometry(.016,.016,.08,8),at(0,0,.01,[Math.PI/2,0,0]),LEATHER_DARK);
  P.add(new THREE.CylinderGeometry(.036,.018,.22,10),at(0,0,.15,[Math.PI/2,0,0]),(x,y,z)=>mix(WOOD,WOOD_DARK,hash(Math.round(z*60))*.6));
  P.add(new THREE.SphereGeometry(.037,10,8),at(0,0,.26),WOOD);
  for(let i=0;i<8;i++){const t=i/8*Math.PI*2,z=.2+(i%2)*.04;P.add(new THREE.ConeGeometry(.006,.02,4),at(Math.cos(t)*.037,Math.sin(t)*.037,z,[0,0,t-Math.PI/2]),STEEL);}
  P.add(new THREE.TorusGeometry(.04,.005,4,14),at(0,-.035,-.01,[0,Math.PI/2,0]),ROPE);
 }else if(L.weapon==='dagger'){
  // a leaf-bladed dagger with a brass guard and pommel
  P.add(new THREE.CylinderGeometry(.013,.015,.07,8),at(0,0,.0,[Math.PI/2,0,0]),LEATHER);
  P.add(new THREE.SphereGeometry(.017,8,6),at(0,0,-.04),BRASS);
  P.add(new THREE.BoxGeometry(.08,.014,.018),at(0,0,.04),BRASS);
  P.add(new THREE.SphereGeometry(.03,12,8),at(0,0,.13,[0,0,0],[.75,.12,3.2]),(x,y,z)=>mix(STEEL,[1,1,1],Math.abs(x)<.004?.4:0));
 }else if(L.weapon==='sceptre'){
  // a gold sceptre: a banded rod, a cup and a big ruby held in claws
  P.add(new THREE.CylinderGeometry(.013,.016,.34,10),at(0,0,.1,[Math.PI/2,0,0]),GOLD);
  for(const z of [-.06,.08,.2])P.add(new THREE.TorusGeometry(.018,.006,5,12),at(0,0,z),GOLD_DARK);
  P.add(new THREE.SphereGeometry(.02,8,6),at(0,0,-.075),GOLD);
  P.add(new THREE.ConeGeometry(.035,.05,10,1,true),at(0,0,.28,[-Math.PI/2,0,0]),GOLD);
  P.add(new THREE.OctahedronGeometry(.035,1),at(0,0,.315,[0,0,0],[1,1,1.2]),RUBY);
  for(let i=0;i<4;i++){const t=i/4*Math.PI*2;P.add(new THREE.ConeGeometry(.006,.04,4),at(Math.cos(t)*.03,Math.sin(t)*.03,.315,[Math.PI/2,0,0]),GOLD);}
 }else{
  // a gnarled staff, knotted along its length, forking at the top round a glowing crystal
  const pts=[];for(let i=0;i<=10;i++){const t=i/10;pts.push(new THREE.Vector3(Math.sin(t*9)*.012,Math.cos(t*7)*.01,-.3+t*.6));}
  P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.017,8),null,(x,y,z)=>mix(WOOD,WOOD_DARK,hash(Math.round(z*50))*.7));
  for(const z of [-.18,0,.14])P.add(new THREE.SphereGeometry(.024,8,6),at(.006,.004,z,[0,0,0],[1,1,1.4]),WOOD_DARK);
  for(const s of [-1,1])P.add(new THREE.ConeGeometry(.012,.1,6),at(s*.03,0,.33,[Math.PI/2,0,s*-.35]),WOOD);
  P.add(new THREE.OctahedronGeometry(.032,0),at(0,0,.35,[0,.3,0],[1,1,1.5]),CRYSTAL);
 }
 return P.merge();
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
 material??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.05,side:THREE.DoubleSide});
 const L=LOOKS[kind],C=colours(L),leg=buildLeg(L,C);
 cache[kind]={body:buildBody(L,C),head:buildHead(L,C),hat:buildHat(L,C),beard:buildBeard(L,C),legs:[mirrored(leg),leg],arm:buildArm(L,C),weapon:buildWeapon(L)};
 return cache[kind];
}
function mesh(parent,geo,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createGnome(name){
 const kind=isGnome(name)?name:'gnome',L=LOOKS[kind],S=geometry(kind);
 const g=new THREE.Group(),body=new THREE.Group();g.name=kind;g.add(body);body.scale.setScalar(L.scale);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,HEAD_Y,.03);body.add(head);
 mesh(head,S.head,'head');
 // the cap sits down over the crown, tipped a little back; its brim is .18 below its origin
 const hat=mesh(head,S.hat,'hat');hat.position.set(0,.06+.18,-.01);hat.rotation.x=-.12;
 // the beard hangs from the chin, .19 above its origin
 const beard=mesh(head,S.beard,'beard');beard.position.set(0,-.07-.19,.06);
 const legs=[],arms=[];
 for(const [i,s] of [-1,1].entries()){
  const leg=new THREE.Group();leg.position.set(s*.085,HIP,0);body.add(leg);mesh(leg,S.legs[i],'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*SHOULDER_X,SHOULDER_Y,.01);arm.rotation.z=s*.2;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-ARM,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.weapon,'weapon');
 return {g,body,legs,tail:null,wings:[],quirk:'gnome',arms,arm:arms[1],weaponSocket,head,hat,beard,pick:null};
}
