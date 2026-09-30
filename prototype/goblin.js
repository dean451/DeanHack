import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Goblins and hobgoblins used to fall through to the class-letter fallback and stand as the plain
// orc humanoid in a grey or brown box. They now have their own models:
// - goblin: a small, hunched, scrawny thing with grey-green skin, a big bald head, huge bat ears
//   flaring sideways, a long hooked nose, a wide grin full of little pointed teeth and glowing
//   yellow eyes. It wears a ragged loincloth on a rope belt and a bandolier with a pouch, has
//   knobbly knees and elbows, big bare clawed feet and long clawed fingers, and carries a crude
//   jagged knife.
// - hobgoblin: taller and heavier, ruddy brown-orange, with a heavy brow, a flat broad nose, short
//   lower tusks, swept-back pointed ears and a black topknot under a dented iron half-helm with a
//   nasal. It's in drilled soldier's kit: a studded leather jerkin, a broad belt with an iron
//   buckle, a skirt of leather strips, an iron pauldron on the left shoulder, studded bracers,
//   dark trousers and strapped boots. It carries a nail-studded club.
// Each moving part (body, head, each leg and arm, the weapon) is one merged vertex-coloured mesh
// sharing one material, plus the glowing eyes on their own emissive material: 8 draws. The
// geometry is built once per kind and shared.
// Handles: body, head, legs, arms, arm (the right, weapon arm), weaponSocket (at the right fist,
// holding the weapon), eyes. quirk 'orc' keeps the orcs' heavier idle bob. hat, beard and pick
// are null.

const LOOKS={
 goblin:{
  skin:'#7f8c5a',shade:'#56613a',inner:'#b0806c',eye:'#ffd23a',teeth:'#e6dcb4',claw:'#2e281c',
  cloth:'#6a5638',clothDark:'#3e3020',rope:'#a08a5c',leather:'#4a3222',metal:'#6e706a',
  hip:.34,shoulderY:.62,shoulderX:.2,headY:.66,headZ:.07,head:.13,arm:.34,
 },
 hobgoblin:{
  skin:'#b0643a',shade:'#7a3e22',inner:'#c8806a',eye:'#ff8a2a',teeth:'#ece2c0',claw:'#2a1e16',
  cloth:'#3a3430',clothDark:'#221e1c',rope:'#5a3a24',leather:'#5c3a22',metal:'#7a8084',hair:'#1c1614',
  hip:.46,shoulderY:.86,shoulderX:.27,headY:.9,headZ:.03,head:.125,arm:.4,
 },
};
export const GOBLINS=Object.keys(LOOKS);
export const isGoblin=name=>Object.hasOwn(LOOKS,name);

const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const chain=(m,...rest)=>rest.reduce((acc,r)=>new THREE.Matrix4().multiplyMatrices(acc,r),m);
function colours(L){const C={};for(const [k,v] of Object.entries(L))if(typeof v==='string')C[k]=rgb(v);return C;}

function buildBody(kind,L,C){
 const P=pieces(),h=L.hip;
 if(kind==='goblin'){
  // a narrow, bony trunk with a little pot belly, and a hump over the shoulders from the hunch
  P.add(lathe([[0,.29],[.1,.29],[.13,.33],[.135,.4],[.15,.45],[.14,.5],[.12,.55],[.13,.6],[.1,.65],[.05,.67],[0,.675]],22),at(0,0,.01,[.18,0,0],[1.05,1,.85]),(x,y,z)=>mix(ramp(C.shade,C.skin,.3,.5)(y),C.shade,z<-.04?.35:0));
  P.add(new THREE.SphereGeometry(.1,12,8),at(0,.58,-.07,[0,0,0],[1.3,.8,.8]),C.skin);
  // ribs down each flank
  for(const s of [-1,1])for(let i=0;i<3;i++)P.add(new THREE.SphereGeometry(.03,8,4),at(s*.125,.49+i*.04,.045,[0,s*.5,0],[.5,.25,1.4]),C.shade);
  // neck, jutting forward to the low-slung head
  P.add(new THREE.CylinderGeometry(.04,.05,.1,10),at(0,.66,.05,[.7,0,0]),C.shade);
  // rope belt and the ragged loincloth: a wrap round the hips and tattered flaps front and back
  P.add(new THREE.TorusGeometry(.128,.012,5,24),at(0,.33,.01,[Math.PI/2,0,0],[1,.85,1]),C.rope);
  P.add(new THREE.SphereGeometry(.018,8,6),at(.05,.325,.12),C.rope);
  P.add(lathe([[.126,.345],[.135,.3],[.14,.26]],20),at(0,0,.01,[0,0,0],[1,1,.85]),ramp(C.clothDark,C.cloth,.26,.34));
  for(const [z,flip] of [[.1,0],[-.1,Math.PI]])for(let i=0;i<5;i++){
   const x=(i-2)*.035,len=.1+hash(i*3.3+z)*.07;
   P.add(new THREE.ConeGeometry(.024,len,3),at(x,.27-len/2,z,[Math.PI+(flip?-.12:.12),flip,0],[1,1,.3]),()=>mix(C.clothDark,C.cloth,hash(i+z)*.6));
  }
  // a bandolier over the left shoulder with a lumpy pouch on the right hip
  const band=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;band.push(new THREE.Vector3(Math.sin(a)*.185,0,Math.cos(a)*.14));}
  P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(band,true),40,.011,4,true),at(0,.5,-.005,[0,0,-.6]),C.leather);
  P.add(new THREE.SphereGeometry(.045,10,8),at(.15,.37,.05,[0,0,0],[.8,1,.7]),C.leather);
  P.add(new THREE.BoxGeometry(.05,.012,.03),at(.15,.405,.06),C.clothDark);
 }else{
  // a broad trunk in a studded leather jerkin, standing a little stiffly
  P.add(lathe([[0,h-.04],[.16,h-.04],[.19,h+.02],[.195,h+.1],[.2,h+.22],[.215,h+.32],[.2,h+.38],[.14,h+.42],[.06,h+.44],[0,h+.445]],26),at(0,0,.005,[0,0,0],[1,1,.8]),(x,y,z)=>mix(ramp(C.clothDark,C.leather,h,h+.3)(y),C.clothDark,z<-.05?.3:0));
  // studs in rows down the front and back
  for(let r=0;r<4;r++)for(let i=0;i<7;i++){
   const a=(i-3)*.32+(r%2)*.16,y=h+.12+r*.07,rad=.2+(y>h+.3?.012:0)-(y<h+.16?.004:0);
   for(const back of [0,Math.PI])P.add(new THREE.SphereGeometry(.009,6,4),at(Math.sin(a+back)*rad,y,Math.cos(a+back)*rad*.8+.005),C.metal);
  }
  // collar and neck
  P.add(new THREE.TorusGeometry(.075,.02,6,18),at(0,h+.43,.005,[Math.PI/2,0,0]),C.clothDark);
  P.add(new THREE.CylinderGeometry(.06,.07,.08,12),at(0,h+.46,.02),C.shade);
  // broad belt with an iron buckle
  P.add(new THREE.TorusGeometry(.19,.028,5,28),at(0,h+.02,.005,[Math.PI/2,0,0],[1,.8,1]),C.rope);
  P.add(new THREE.BoxGeometry(.075,.06,.02),at(0,h+.02,.16),C.metal);
  P.add(new THREE.BoxGeometry(.045,.032,.024),at(0,h+.02,.161),C.rope);
  // the skirt of leather strips (pteruges), each with a stud
  for(let i=0;i<12;i++){
   const a=(i/12)*Math.PI*2,x=Math.sin(a)*.19,z=Math.cos(a)*.155;
   P.add(new THREE.BoxGeometry(.075,.16,.014),at(x,h-.08,z,[Math.cos(a)*-.14,a,0]),(x,y)=>mix(C.leather,C.clothDark,(h-y)*3));
   P.add(new THREE.SphereGeometry(.008,6,4),at(x*1.05,h-.13,z*1.05),C.metal);
  }
  // trouser seat under the skirt
  P.add(lathe([[0,h-.1],[.14,h-.1],[.17,h-.04],[.17,h]],20),at(0,0,0,[0,0,0],[1,1,.8]),C.cloth);
 }
 return P.merge();
}

function buildHead(kind,L,C){
 const P=pieces(),r=L.head;
 if(kind==='goblin'){
  // a big bald dome with a jutting brow, sunken cheeks and a narrow pointed chin
  P.add(new THREE.SphereGeometry(r,18,14),at(0,.02,-.01,[0,0,0],[1.05,.98,1.05]),(x,y,z)=>mix(C.skin,C.shade,THREE.MathUtils.clamp(-y*6,0,.5)+(z<-.05?.2:0)));
  P.add(new THREE.SphereGeometry(.075,12,10),at(0,-.06,.05,[0,0,0],[1,.9,1.1]),C.skin);
  P.add(new THREE.ConeGeometry(.035,.06,8),at(0,-.12,.08,[Math.PI+.4,0,0]),C.skin);
  P.add(new THREE.CylinderGeometry(.018,.02,.16,8),at(0,.045,.1,[0,0,Math.PI/2],[1,1,1]),C.shade);
  for(const s of [-1,1]){
   // brow ridges over deep sockets
   P.add(new THREE.SphereGeometry(.036,10,8),at(s*.045,.05,.118,[0,0,s*.3],[1.3,.55,.8]),C.shade);
   // huge bat ears flaring out sideways, with a pink inner and a nick out of the rim
   P.add(new THREE.ConeGeometry(.058,.21,6),at(s*.185,.04,-.02,[0,s*.25,s*-1.3],[1,1,.28]),ramp(C.skin,C.shade,-.02,.1));
   P.add(new THREE.ConeGeometry(.038,.155,6),at(s*.176,.042,-.005,[0,s*.25,s*-1.3],[1,1,.16]),C.inner);
   // hollow cheeks
   P.add(new THREE.SphereGeometry(.03,8,6),at(s*.07,-.04,.085,[0,0,0],[1,1.3,.5]),C.shade);
  }
  // a long hooked nose curving down over the grin
  const nose=[];for(let i=0;i<=8;i++){const t=i/8;nose.push(new THREE.Vector3(0,.02-t*.07-t*t*.03,.12+t*.08-t*t*.02));}
  const noseTube=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(nose),10,.02,8);
  const p=noseTube.attributes.position;for(let i=0;i<p.count;i++){const t=THREE.MathUtils.clamp((p.getZ(i)-.12)/.06,0,1),a=1-t*.55;const cy=.02-t*.07-t*t*.03,cz=.12+t*.08-t*t*.02;p.setXYZ(i,p.getX(i)*a,cy+(p.getY(i)-cy)*a,cz+(p.getZ(i)-cz)*a);}
  noseTube.computeVertexNormals();
  P.add(noseTube,null,C.skin);
  P.add(new THREE.SphereGeometry(.018,8,6),at(0,-.06,.18),C.skin);
  // a wide grin, the dark mouth and a row of little pointed teeth top and bottom
  P.add(new THREE.TorusGeometry(.07,.012,4,16,Math.PI*.85),at(0,-.035,.075,[-.45,0,Math.PI+Math.PI*.075],[1,1,.8]),rgb('#2a1414'));
  for(let i=0;i<7;i++){const a=(i-3)*.2,x=Math.sin(a)*.068,z=.075+Math.cos(a)*.055;
   P.add(new THREE.ConeGeometry(.007,.02,4),at(x,-.095+Math.abs(i-3)*.008,z,[Math.PI,0,0]),C.teeth);
   if(i%2)P.add(new THREE.ConeGeometry(.006,.016,4),at(x,-.112+Math.abs(i-3)*.008,z-.003),C.teeth);}
  // a few wiry hairs on the crown and a wart
  for(let i=0;i<5;i++)P.add(new THREE.ConeGeometry(.004,.05,3),at((i-2)*.02,r+.02,-.03+hash(i)*.03,[hash(i+1)-.5,0,(i-2)*.25]),C.claw);
  P.add(new THREE.SphereGeometry(.012,6,4),at(.06,.09,.08),C.shade);
 }else{
  // a squarish head with a heavy jaw, a slab brow and a flat broad nose
  P.add(new THREE.SphereGeometry(r,18,14),at(0,.03,-.005,[0,0,0],[1,1.05,1]),(x,y,z)=>mix(C.skin,C.shade,z<-.05?.3:0));
  P.add(new THREE.BoxGeometry(.18,.08,.14),at(0,-.06,.045),C.skin);
  P.add(new THREE.SphereGeometry(.06,10,8),at(0,-.075,.075,[0,0,0],[1.5,.7,1]),C.skin);
  P.add(new THREE.BoxGeometry(.17,.03,.05),at(0,.055,.105,[.25,0,0]),C.shade);
  P.add(new THREE.SphereGeometry(.03,10,8),at(0,.005,.13,[0,0,0],[1.5,.9,.8]),C.shade);
  for(const s of [-1,1]){
   P.add(new THREE.SphereGeometry(.012,6,4),at(s*.018,-.005,.148),rgb('#3a1a10'));
   // short lower tusks jutting up past the lip
   P.add(new THREE.ConeGeometry(.014,.05,6),at(s*.05,-.055,.125,[-.25,0,s*-.2]),C.teeth);
   // pointed ears swept back
   P.add(new THREE.ConeGeometry(.035,.14,6),at(s*.13,.03,-.04,[-1.1,0,s*-.55],[1,1,.35]),ramp(C.shade,C.skin,-.05,.05));
   P.add(new THREE.ConeGeometry(.022,.1,6),at(s*.128,.03,-.03,[-1.1,0,s*-.55],[1,1,.2]),C.inner);
  }
  // a hard line of a mouth
  P.add(new THREE.BoxGeometry(.08,.008,.01),at(0,-.045,.13),rgb('#3a1a10'));
  // dented iron half-helm with a riveted rim and a nasal; a black topknot out through the crown
  P.add(new THREE.SphereGeometry(r+.012,18,10,0,Math.PI*2,0,Math.PI*.45),at(0,.04,-.005,[-.12,0,0],[1.02,1,1.02]),(x,y,z)=>mix(C.metal,rgb('#4a4e50'),hash(Math.round(x*40)+Math.round(z*40)*7)*.5));
  P.add(new THREE.TorusGeometry(r+.006,.01,5,28),at(0,.075,-.01,[Math.PI/2-.12,0,0]),rgb('#50565a'));
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;P.add(new THREE.SphereGeometry(.007,5,4),at(Math.sin(a)*(r+.014),.075+Math.cos(a)*.016,Math.cos(a)*(r+.014)-.01),rgb('#a0a6a8'));}
  P.add(new THREE.BoxGeometry(.022,.08,.012),at(0,.05,.142,[.15,0,0]),C.metal);
  P.add(new THREE.CylinderGeometry(.018,.03,.06,8),at(0,r+.08,-.03,[-.2,0,0]),C.hair);
  P.add(new THREE.ConeGeometry(.03,.14,8),at(0,r+.08,-.1,[-2.2,0,0]),C.hair);
  // hair at the nape under the rim
  P.add(new THREE.SphereGeometry(r*.96,14,6,0,Math.PI*2,Math.PI*.5,Math.PI*.2),at(0,.08,-.02,[-.9,0,0]),C.hair);
 }
 return P.merge();
}

// The eyes, on their own glowing material, in head space.
function buildEyes(kind){
 const P=pieces(),Y=[1,1,1];
 for(const s of [-1,1]){
  if(kind==='goblin')P.add(new THREE.SphereGeometry(.024,10,8),at(s*.047,.022,.124,[0,0,s*-.3],[1.25,.8,.6]),Y);
  else P.add(new THREE.SphereGeometry(.016,8,6),at(s*.045,.03,.121,[0,0,s*.15],[1.3,.7,.6]),Y);
 }
 return P.merge();
}

function buildLeg(kind,L,C){
 const P=pieces(),h=L.hip;
 if(kind==='goblin'){
  // spindly thigh and shin with a knobbly knee, bent a little, and a big splayed bare foot
  P.add(new THREE.CylinderGeometry(.045,.035,.16,10),at(0,-.08,.01,[-.1,0,0]),ramp(C.shade,C.skin,-.16,0));
  P.add(new THREE.SphereGeometry(.042,10,8),at(0,-.165,.03),C.skin);
  P.add(new THREE.CylinderGeometry(.034,.028,.15,10),at(0,-.24,.01,[.15,0,0]),ramp(C.shade,C.skin,-.32,-.16));
  P.add(new THREE.SphereGeometry(.055,12,8),at(0,-.31,.05,[0,0,0],[.95,.45,1.9]),(x,y)=>y<-.32?C.shade:C.skin);
  P.add(new THREE.SphereGeometry(.03,8,6),at(0,-.31,-.03),C.skin);
  // three long toes with black claws
  for(let i=0;i<3;i++){
   const a=(i-1)*.35,x=Math.sin(a)*.1,z=.07+Math.cos(a)*.08;
   P.add(new THREE.CylinderGeometry(.013,.015,.06,6),at(x*.8,-.325,z-.01,[Math.PI/2,0,-a]),C.skin);
   P.add(new THREE.ConeGeometry(.01,.035,5),at(x*1.05,-.33,z+.03,[Math.PI/2+.3,0,-a]),C.claw);
  }
 }else{
  // dark trousers into strapped leather boots
  const len=h;
  P.add(new THREE.CylinderGeometry(.075,.06,len*.5,12),at(0,-len*.25,0),ramp(C.clothDark,C.cloth,-len*.5,0));
  P.add(new THREE.CylinderGeometry(.062,.055,len*.42,12),at(0,-len*.64,.005),ramp(C.leather,C.rope,-len*.85,-len*.45));
  P.add(new THREE.TorusGeometry(.064,.01,5,14),at(0,-len*.44,.005,[Math.PI/2,0,0]),C.clothDark);
  for(let i=0;i<3;i++)P.add(new THREE.TorusGeometry(.061-i*.002,.007,4,14),at(0,-len*.52-i*.06,.005,[Math.PI/2+(i%2?.2:-.2),0,0]),C.clothDark);
  P.add(new THREE.SphereGeometry(.07,12,8),at(0,-len+.035,.05,[0,0,0],[.9,.5,1.6]),(x,y)=>y<-len+.025?C.clothDark:C.leather);
  P.add(new THREE.BoxGeometry(.11,.02,.21),at(0,-len+.01,.04),C.clothDark);
 }
 return P.merge();
}

function buildArm(kind,L,C,left){
 const P=pieces(),a=L.arm;
 if(kind==='goblin'){
  // stringy arms reaching nearly to the knee, a knobbly elbow, a wrapped wrist, a big clawed hand
  P.add(new THREE.SphereGeometry(.045,10,8),at(0,-.01,0),C.skin);
  P.add(new THREE.CylinderGeometry(.034,.028,.15,10),at(0,-.09,0),ramp(C.shade,C.skin,-.17,0));
  P.add(new THREE.SphereGeometry(.033,8,6),at(0,-.17,-.008),C.skin);
  P.add(new THREE.CylinderGeometry(.026,.024,.13,10),at(0,-.24,.01,[-.12,0,0]),C.skin);
  P.add(new THREE.CylinderGeometry(.03,.03,.04,10),at(0,-.265,.012,[-.12,0,0]),C.cloth);
  P.add(new THREE.SphereGeometry(.04,10,8),at(0,-a+.02,.02,[0,0,0],[.85,1.05,1]),C.skin);
  for(let i=0;i<3;i++){const x=(i-1)*.022;
   P.add(new THREE.CylinderGeometry(.009,.01,.05,5),at(x,-a-.02,.035,[.4,0,0]),C.skin);
   P.add(new THREE.ConeGeometry(.008,.025,4),at(x,-a-.05,.05,[Math.PI+.5,0,0]),C.claw);}
  P.add(new THREE.CylinderGeometry(.01,.011,.045,5),at(left?.034:-.034,-a,.04,[.9,0,left?-.5:.5]),C.skin);
 }else{
  // a short jerkin sleeve, a bare forearm, a studded bracer and a big fist
  P.add(new THREE.SphereGeometry(.07,12,10),at(0,-.01,0),C.leather);
  P.add(new THREE.CylinderGeometry(.062,.056,.15,12),at(0,-.09,0),ramp(C.clothDark,C.leather,-.17,0));
  P.add(new THREE.CylinderGeometry(.05,.045,.12,10),at(0,-.21,0),C.skin);
  P.add(new THREE.CylinderGeometry(.052,.048,.1,12),at(0,-.31,.005),ramp(C.clothDark,C.leather,-.36,-.26));
  for(let i=0;i<4;i++){const t=i/4*Math.PI*2;P.add(new THREE.SphereGeometry(.008,5,4),at(Math.sin(t)*.052,-.31,Math.cos(t)*.052+.005),C.metal);}
  P.add(new THREE.SphereGeometry(.052,10,8),at(0,-a+.01,.01,[0,0,0],[.95,1,1.05]),C.skin);
  for(let i=0;i<4;i++)P.add(new THREE.SphereGeometry(.014,6,4),at((i-1.5)*.022,-a-.01,.05),C.shade);
  // the left shoulder carries an iron pauldron in two lames
  if(left){
   P.add(new THREE.SphereGeometry(.1,14,8,0,Math.PI*2,0,Math.PI*.42),at(-.01,.01,0,[0,0,.35],[1,.9,1.05]),C.metal);
   P.add(new THREE.SphereGeometry(.11,14,4,0,Math.PI*2,Math.PI*.3,Math.PI*.15),at(-.012,-.02,0,[0,0,.35],[1,.9,1.05]),rgb('#5a6064'));
   for(const z of [-.05,.05])P.add(new THREE.SphereGeometry(.009,5,4),at(-.06,.045,z),rgb('#a0a6a8'));
  }
 }
 return P.merge();
}

// The weapon, in the right fist's socket, pointing forward (+z).
function buildWeapon(kind,C){
 const P=pieces();
 if(kind==='goblin'){
  // a crude jagged knife: a rag-wrapped grip, a bent crossguard and a notched, rusty blade
  P.add(new THREE.CylinderGeometry(.013,.015,.08,6),at(0,0,.01,[Math.PI/2,0,0]),C.cloth);
  P.add(new THREE.BoxGeometry(.07,.012,.014),at(0,0,.055,[0,0,.1]),C.metal);
  const shape=new THREE.Shape();
  shape.moveTo(-.018,0);shape.lineTo(-.02,.06);shape.lineTo(-.03,.075);shape.lineTo(-.02,.1);shape.lineTo(-.024,.13);shape.lineTo(-.006,.2);
  shape.lineTo(.018,.15);shape.lineTo(.012,.12);shape.lineTo(.02,.09);shape.lineTo(.014,.05);shape.lineTo(.018,0);shape.lineTo(-.018,0);
  const blade=new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1});
  P.add(blade,at(0,.003,.06,[Math.PI/2,0,0]),(x,y,z)=>mix(C.metal,rgb('#7a4a2a'),hash(Math.round(x*200)+Math.round(z*200)*3)>.7?.6:.1));
 }else{
  // a heavy club, knotted and banded with iron, with nails driven through the head
  P.add(new THREE.CylinderGeometry(.018,.022,.1,8),at(0,0,.02,[Math.PI/2,0,0]),C.clothDark);
  P.add(new THREE.CylinderGeometry(.045,.024,.36,10),at(0,0,.22,[Math.PI/2,0,0]),(x,y,z)=>mix(rgb('#6a4a2c'),rgb('#4a3018'),hash(Math.round(z*60))*.6));
  P.add(new THREE.SphereGeometry(.046,10,8),at(0,0,.4),rgb('#5a3e22'));
  for(const [z,r] of [[.3,.041],[.36,.045]])P.add(new THREE.TorusGeometry(r,.007,4,14),at(0,0,z),C.metal);
  for(let i=0;i<9;i++){
   const t=i/9*Math.PI*2+(i%2)*.4,z=.26+(i%3)*.055,rad=.032+(z-.26)*.08;
   P.add(new THREE.ConeGeometry(.006,.04,4),at(Math.cos(t)*(rad+.018),Math.sin(t)*(rad+.018),z,[0,0,t-Math.PI/2]),rgb('#a8aeb0'));
  }
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
 material??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.08,side:THREE.DoubleSide});
 const L=LOOKS[kind],C=colours(L),leg=buildLeg(kind,L,C);
 cache[kind]={
  body:buildBody(kind,L,C),head:buildHead(kind,L,C),eyes:buildEyes(kind),legs:[mirrored(leg),leg],
  arms:[buildArm(kind,L,C,true),buildArm(kind,L,C,false)],weapon:buildWeapon(kind,C),
  eyeMaterial:new THREE.MeshStandardMaterial({color:L.eye,emissive:L.eye,emissiveIntensity:2.6,roughness:.3}),
 };
 return cache[kind];
}
function mesh(parent,geo,mat,name){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createGoblin(name){
 const kind=isGoblin(name)?name:'goblin',L=LOOKS[kind],S=geometry(kind);
 const g=new THREE.Group(),body=new THREE.Group();g.name=kind;g.add(body);
 mesh(body,S.body,material,'body');
 const head=new THREE.Group();head.position.set(0,L.headY+L.head*.55,L.headZ);body.add(head);
 mesh(head,S.head,material,'head');
 const eyes=mesh(head,S.eyes,S.eyeMaterial,'eyes');eyes.castShadow=false;
 const legs=[],arms=[];
 for(const [i,s] of [-1,1].entries()){
  const leg=new THREE.Group();leg.position.set(s*(kind==='goblin'?.075:.1),L.hip,0);body.add(leg);mesh(leg,S.legs[i],material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*L.shoulderX,L.shoulderY,kind==='goblin'?.02:0);arm.rotation.z=s*(kind==='goblin'?.18:.14);body.add(arm);mesh(arm,S.arms[i],material,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-L.arm,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.weapon,material,'weapon');
 return {g,body,legs,tail:null,wings:[],quirk:'orc',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
