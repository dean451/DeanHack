import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Dwarves used to be the generic box humanoid: a box torso, a ball for a head, a cylinder helm
// and a ball of beard. They now have their own model: a broad, barrel-chested little warrior
// with a big nose, bushy brows and a great beard to the belt, braided at the ends and bound
// with rings. A leather jerkin over a mail shirt whose hem shows below a broad belt with a big
// square buckle, mail on the shoulders, leather bracers, heavy boots with iron toe caps.
// Each kind has its own kit:
// - dwarf: a riveted iron helm with a nasal and cheek guards, a brown jerkin, a hand axe in the
//   right fist, and the forged pick-axe in the left.
// - dwarf lord: a steel helm with a gold band and a crest, a blue tunic under a steel breastplate,
//   a war hammer, and the pick.
// - dwarf king: a gold crown with gems over silver hair, a purple tunic, a red cape with an ermine
//   collar and a gold chain, a gold sceptre, and no pick. He stands a little taller.
// Each moving part (body, head, beard, each leg and arm, the pick and the weapon) is merged into
// one vertex-coloured mesh per material (cloth and skin on one, metal on the other): 11-13 draws,
// down from ~45. The geometry is built once per kind.
// Handles: body, head, legs, arms, arm (the right, weapon arm), weaponSocket, beard (the gait
// swings it about the chin, .19 above its origin), and pick (a child of body, gripped at its
// origin, butt at y -.125). The shoulders (±.3, .8), the arm length (.38) and the pick's rest
// pose match the old humanoid, so gait.js's PICK_CARRY and fidget.js's PICK_PLANT still land the
// pick in the left hand. quirk 'dwarf'. hat is null (the helm is part of the head).

const LOOKS={
 dwarf:{jerkin:'#6a4a30',jerkinDark:'#3e2a1a',tunic:'#8a3a2c',tunicDark:'#5a2218',breeches:'#4a4034',beard:'#a05a30',metal:'#707070',trim:'#8a8a86',weapon:'axe',helm:'iron',pick:true,scale:1},
 'dwarf lord':{jerkin:'#3d5a9a',jerkinDark:'#243866',tunic:'#3d5a9a',tunicDark:'#243866',breeches:'#3a3a44',beard:'#6a3e24',metal:'#9aa2a6',trim:'#d8b048',weapon:'hammer',helm:'lord',pick:true,plate:true,scale:1.02},
 'dwarf king':{jerkin:'#6a3a8a',jerkinDark:'#44225c',tunic:'#6a3a8a',tunicDark:'#44225c',breeches:'#3a2a44',beard:'#d6d0c2',metal:'#d8b048',trim:'#d8b048',weapon:'sceptre',helm:'crown',cape:true,scale:1.05},
};
export const DWARVES=Object.keys(LOOKS);
export const isDwarf=name=>Object.hasOwn(LOOKS,name);

const SKIN=rgb('#c8906c'),SKIN_SHADE=rgb('#9a6448'),ROSE=rgb('#c86a54'),EYE=rgb('#16100c'),GLINT=rgb('#f4f0e8'),
 LEATHER=rgb('#5a3a22'),LEATHER_DARK=rgb('#301e10'),IRON=rgb('#5a5c5e'),DARK=rgb('#2a2c30'),STEEL=rgb('#b4bcc0'),
 GOLD=rgb('#e0b440'),GOLD_DARK=rgb('#9a7420'),WOOD=rgb('#7a5436'),WOOD_DARK=rgb('#4e3420'),GRIP=rgb('#3a2519'),
 ERMINE=rgb('#f2eee4'),SPOT=rgb('#1a1616'),RUBY=rgb('#c0182a'),SAPPHIRE=rgb('#2a4ad0'),EMERALD=rgb('#1a9a4a'),
 CAPE=rgb('#8a2424'),CAPE_DARK=rgb('#4a1010');

const HIP=.4,LEG_X=.13,SHOULDER_X=.3,SHOULDER_Y=.8,ARM=.38,HEAD_Y=1.0,HEAD_R=.15;
const lathe=(profile,segments=28)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const colours=L=>{const C={};for(const [k,v] of Object.entries(L))if(typeof v==='string'&&v.startsWith('#'))C[k]=rgb(v);return C;};
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
// riveted mail: alternating light and dark rings
const mail=C=>(x,y,z)=>mix(C.metal,DARK,(Math.round(y*150)+Math.round((x+z)*120))%2?.4:.05);
// a flat blade drawn in (x: towards the edge, y: along the blade), laid in the weapon's frame so
// it runs along +z with its edge down (as orc.js does)
function blade(outline,depth=.01){
 const s=new THREE.Shape();outline.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));
 const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1});g.translate(0,0,-depth/2);return g;
}
const edgeDown=(x,y,z)=>new THREE.Matrix4().makeBasis(V(0,-1,0),V(0,0,1),V(-1,0,0)).setPosition(x,y,z);

// Every part is built as two piece lists, cloth (C) and metal (M).
const parts=()=>({C:pieces(),M:pieces()});

function buildBody(L,C){
 const {C:P,M}=parts();
 // a barrel chest: wide through the ribs, narrowing to a thick neck; flattened front to back
 P.add(lathe([[0,.4],[.2,.4],[.215,.43],[.232,.52],[.242,.62],[.236,.71],[.214,.79],[.17,.85],[.11,.89],[.07,.905],[0,.91]]),
  at(0,0,0,[0,0,0],[1,1,.8]),(x,y,z)=>mix(ramp(C.jerkinDark,C.jerkin,.4,.72)(y),C.jerkinDark,z<-.06?.25:0));
 // stitched seams down the jerkin's front and a laced collar
 for(const s of [-1,1])P.add(new THREE.CylinderGeometry(.005,.005,.36,4),at(s*.07,.64,.183,[-.08,0,s*.03]),C.jerkinDark);
 P.add(new THREE.TorusGeometry(.085,.022,6,18),at(0,.89,.0,[Math.PI/2,0,0],[1,.85,1]),C.jerkinDark);
 // the mail shirt's hem, below the jerkin down to the thighs, in rings
 M.add(new THREE.CylinderGeometry(.218,.24,.14,28,2,true),at(0,.35,0,[0,0,0],[1,1,.82]),mail(C));
 M.add(new THREE.TorusGeometry(.24,.008,4,28),at(0,.28,0,[Math.PI/2,0,0],[1,.82,1]),mail(C));
 // a broad belt with a big square buckle and studs
 P.add(new THREE.TorusGeometry(.225,.03,5,28),at(0,.44,0,[Math.PI/2,0,0],[1.03,.82,1.4]),LEATHER);
 M.add(new THREE.BoxGeometry(.1,.08,.02),at(0,.44,.19),C.trim);
 P.add(new THREE.BoxGeometry(.06,.045,.022),at(0,.44,.192),LEATHER_DARK);
 for(let i=0;i<8;i++){const a=(i+.5)/8*Math.PI*2;if(Math.abs(Math.sin(a))<.4&&Math.cos(a)>0)continue;M.add(new THREE.SphereGeometry(.009,6,4),at(Math.sin(a)*.235,.44,Math.cos(a)*.195),C.trim);}
 // a pouch on the right hip and a drinking horn on the left
 P.add(new THREE.SphereGeometry(.055,10,8),at(.2,.37,.08,[0,0,0],[.7,1,.75]),LEATHER);
 P.add(new THREE.BoxGeometry(.07,.016,.05),at(.2,.415,.085,[0,0,.1]),LEATHER_DARK);
 const horn=[];for(let i=0;i<=8;i++){const t=i/8;horn.push(V(-.23-t*.02,.38-t*.05+t*t*.1,-.06+t*.14));}
 P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(horn),10,.022,8),null,(x,y,z)=>mix(rgb('#e8dcc0'),rgb('#6a4a30'),(z+.06)*5));
 if(L.plate){
  // the lord's breastplate over the chest, with a gold rim and a ridge down the middle
  M.add(new THREE.SphereGeometry(.25,24,12,-Math.PI*.36,Math.PI*.72,Math.PI*.3,Math.PI*.36),at(0,.64,.0,[0,0,0],[1,1.08,.82]),(x,y,z)=>mix(C.metal,STEEL,THREE.MathUtils.clamp((y-.55)*3,0,.5)));
  M.add(new THREE.BoxGeometry(.018,.2,.02),at(0,.66,.2,[-.08,0,0]),STEEL);
  M.add(new THREE.TorusGeometry(.22,.009,4,20,Math.PI*.7),at(0,.54,.03,[Math.PI/2,0,Math.PI*.15],[1,.95,1]),C.trim);
 }else{
  // the plain dwarf's jerkin buckles on the shoulders
  for(const s of [-1,1])M.add(new THREE.BoxGeometry(.035,.025,.012),at(s*.13,.82,.14,[-.5,0,0]),C.trim);
 }
 if(L.cape){
  // a red cape from the shoulders, curved round the back, over an ermine collar and a gold chain
  M.add(new THREE.TorusGeometry(.14,.008,4,24,Math.PI),at(0,.83,.03,[Math.PI/2+.5,0,Math.PI],[1.1,1,1]),GOLD);
  M.add(new THREE.OctahedronGeometry(.025),at(0,.73,.19,[0,0,Math.PI/4],[1,1.2,.5]),RUBY);
  P.add(new THREE.CylinderGeometry(.24,.31,.66,24,4,true,Math.PI*.55,Math.PI*.9),at(0,.53,-.01,[0,0,0],[1.02,1,.86]),(x,y)=>mix(CAPE_DARK,CAPE,(y-.2)*1.6));
  P.add(new THREE.TorusGeometry(.15,.045,8,22),at(0,.86,-.01,[Math.PI/2,0,0],[1.35,1,1]),ERMINE);
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2;P.add(new THREE.SphereGeometry(.007,4,3),at(Math.sin(a)*.2,.875,Math.cos(a)*.15-.01,[0,0,0],[1,1.8,1]),SPOT);}
 }
 return {cloth:P.merge(),metal:M.merge()};
}

function buildHead(L,C){
 const {C:P,M}=parts(),r=HEAD_R,hair=L.beard;
 // a broad, heavy-jawed head
 P.add(new THREE.SphereGeometry(r,18,12),at(0,0,0,[0,0,0],[1.02,1,.98]),(x,y,z)=>mix(SKIN,SKIN_SHADE,THREE.MathUtils.clamp(-z*6,0,.45)));
 for(const s of [-1,1]){
  // deep-set eyes with a glint, under a heavy brow ridge and bushy brows
  P.add(new THREE.SphereGeometry(.019,10,8),at(s*.052,.02,.132,[0,0,0],[1,.9,.55]),EYE);
  P.add(new THREE.SphereGeometry(.006,5,4),at(s*.052+.007,.028,.142),GLINT);
  P.add(new THREE.SphereGeometry(.03,8,6),at(s*.055,.048,.13,[0,0,s*-.3],[1.5,.55,.6]),SKIN_SHADE);
  for(let i=0;i<3;i++)P.add(new THREE.ConeGeometry(.018,.06,5),at(s*(.035+i*.022),.064-i*.004,.132-i*.008,[.3,0,s*(1.25+i*.12)],[1,1,.6]),C.beard);
  // round ears
  P.add(new THREE.SphereGeometry(.038,10,8),at(s*.148,.0,-.01,[0,s*.3,0],[.45,1,.8]),mix(SKIN,SKIN_SHADE,.3));
  // ruddy cheeks
  P.add(new THREE.SphereGeometry(.04,10,8),at(s*.07,-.035,.105,[0,0,0],[1,.8,.7]),mix(SKIN,ROSE,.45));
 }
 // a big, knobbly nose
 P.add(new THREE.SphereGeometry(.05,14,12),at(0,-.022,.155,[0,0,0],[.95,1,1.05]),(x,y,z)=>mix(SKIN,ROSE,(z-.14)*12));
 P.add(new THREE.CylinderGeometry(.022,.032,.06,10),at(0,.015,.145,[.35,0,0]),SKIN);
 // hair falling behind the ears and down the nape, under the helm
 for(let i=0;i<5;i++){const a=(i-2)/2*1.1;P.add(new THREE.SphereGeometry(.07,8,6),at(Math.sin(a)*.12,-.03-Math.abs(i-2)*.015,-Math.cos(a)*.1,[0,0,0],[1,1.3,.8]),(x,y,z)=>mix(C.beard,[0,0,0],hash(Math.round(y*80)+i)*.2));}
 if(L.helm==='crown'){
  // silver hair swept back over the crown, and a gold crown with five points and gems
  P.add(new THREE.SphereGeometry(r*1.04,20,10,0,Math.PI*2,0,Math.PI*.42),at(0,.005,-.01),(x,y,z)=>mix(C.beard,mix(C.beard,[1,1,1],.4),hash(Math.round(x*90))*.6));
  M.add(new THREE.CylinderGeometry(r+.01,r+.016,.07,28,1,true),at(0,.075,-.01),(x,y)=>mix(GOLD_DARK,GOLD,(y-.04)*14));
  M.add(new THREE.TorusGeometry(r+.014,.009,5,28),at(0,.042,-.01,[Math.PI/2,0,0]),GOLD);
  for(let i=0;i<5;i++){
   const a=i/5*Math.PI*2,x=Math.sin(a)*(r+.014),z=Math.cos(a)*(r+.014)-.01;
   M.add(new THREE.ConeGeometry(.024,.075,4),at(x,.145,z,[0,a,0]),GOLD);
   M.add(new THREE.SphereGeometry(.01,5,4),at(x,.185,z),GOLD);
   M.add(new THREE.OctahedronGeometry(.014),at(Math.sin(a)*(r+.02),.075,Math.cos(a)*(r+.02)-.01,[0,a,0],[1,1.2,.6]),[RUBY,SAPPHIRE,EMERALD][i%3]);
  }
 }else{
  // a dwarvish iron helm: a round dome down to the brow, a riveted rim, a nasal and cheek guards
  const lord=L.helm==='lord';
  M.add(new THREE.SphereGeometry(r*1.1,20,8,0,Math.PI*2,0,Math.PI*.5),at(0,.035,-.01,[0,0,0],[1,1.05,1.02]),(x,y,z)=>mix(C.metal,DARK,.1+hash(Math.round(x*40)+Math.round(z*40)*7)*.25-y*.8));
  M.add(new THREE.TorusGeometry(r*1.1,.014,6,32),at(0,.037,-.01,[Math.PI/2,0,0],[1,1.02,1]),lord?C.trim:mix(C.metal,DARK,.35));
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2;M.add(new THREE.SphereGeometry(.007,5,4),at(Math.sin(a)*r*1.13,.06,Math.cos(a)*r*1.13-.01),C.trim);}
  // bands over the dome, front to back and side to side
  for(const y of [0,Math.PI/2])M.add(new THREE.TorusGeometry(r*1.12,.009,4,24,Math.PI),at(0,.035,-.01,[0,y,0]),lord?C.trim:mix(C.metal,DARK,.3));
  M.add(new THREE.BoxGeometry(.024,.09,.014),at(0,-.004,.168,[-.12,0,0]),mix(C.metal,DARK,.2));
  for(const s of [-1,1])M.add(new THREE.BoxGeometry(.012,.09,.07),at(s*.157,-.01,.05,[0,s*.25,0]),mix(C.metal,DARK,.25));
  if(lord){
   // a gold band round the brow and a tall crest from front to back
   M.add(new THREE.CylinderGeometry(r*1.12,r*1.12,.03,28,1,true),at(0,.07,-.01),C.trim);
   M.add(new THREE.BoxGeometry(.022,.07,.26),at(0,.21,-.02,[.08,0,0]),C.trim);
   for(let i=0;i<5;i++)M.add(new THREE.ConeGeometry(.012,.04,4),at(0,.25,-.12+i*.05,[.08,0,0]),C.trim);
  }else{
   // a spike on the crown
   M.add(new THREE.ConeGeometry(.022,.06,6),at(0,.22,-.01),mix(C.metal,DARK,.2));
  }
 }
 return {cloth:P.merge(),metal:M.merge()};
}

// The beard, in its own frame: hung from the chin at y=+.19 (gait.js swings it from there).
function buildBeard(L,C){
 const P=pieces(),T=.19;
 const beard=(x,y,z)=>mix(C.beard,mix(C.beard,[0,0,0],.3),hash(Math.round(x*90)*3+Math.round(y*60))*.6);
 // a great bib from ear to ear, spreading over the chest, falling to the belt
 P.add(new THREE.SphereGeometry(.13,14,10),at(0,T-.06,-.01,[0,0,0],[1.18,1,.6]),beard);
 P.add(new THREE.SphereGeometry(.14,14,10),at(0,T-.2,.035,[.15,0,0],[1.05,1.15,.55]),beard);
 P.add(new THREE.ConeGeometry(.12,.24,14),at(0,T-.37,.07,[Math.PI+.2,0,0],[1,1,.5]),beard);
 // sideburns up to the hair
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.05,8,6),at(s*.125,T+.04,-.07,[0,0,0],[.7,1.3,1]),beard);
 // strands down the front, lighter
 for(let i=0;i<7;i++)P.add(new THREE.CylinderGeometry(.008,.004,.3,5),at((i-3)*.03,T-.2,.105-Math.abs(i-3)*.012,[.25,0,(i-3)*.04]),mix(C.beard,[1,1,1],.2));
 // two braids at the ends, each bound with a ring
 for(const s of [-1,1]){
  const pts=[];for(let i=0;i<=6;i++){const t=i/6;pts.push(V(s*(.06-t*.02),T-.36-t*.16,.08+t*.03+Math.sin(t*3)*.005));}
  const curve=new THREE.CatmullRomCurve3(pts);
  for(let i=0;i<6;i++){const p=curve.getPointAt((i+.5)/6);P.add(new THREE.SphereGeometry(.026-i*.002,6,5),at(p.x+s*(i%2?.006:-.006),p.y,p.z,[0,0,s*(i%2?.4:-.4)],[1,1.4,.9]),beard);}
  P.add(new THREE.TorusGeometry(.022,.007,6,12),at(s*.043,T-.47,.107,[Math.PI/2-.2,0,0]),GOLD);
  P.add(new THREE.ConeGeometry(.016,.05,6),at(s*.04,T-.545,.112,[Math.PI,0,0]),beard);
 }
 // a thick drooping moustache over the mouth
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.045,10,6),at(s*.045,T+.02,.105,[0,0,s*.55],[1.5,.55,.65]),mix(C.beard,[1,1,1],.1));
 P.add(new THREE.SphereGeometry(.016,8,6),at(0,T-.018,.1,[0,0,0],[1.4,.5,.5]),rgb('#5a2420'));
 return P.merge();
}

function buildLeg(L,C){
 const P=pieces(),h=HIP;
 // thick breeches, then a heavy boot with a turned cuff, a broad foot and an iron toe cap
 P.add(new THREE.CylinderGeometry(.09,.08,.2,14),at(0,-.08,0),ramp(mix(C.breeches,[0,0,0],.3),C.breeches,-.18,0));
 P.add(new THREE.CylinderGeometry(.085,.09,.17,14),at(0,-.28,.0),ramp(LEATHER_DARK,LEATHER,-.37,-.2));
 P.add(new THREE.TorusGeometry(.092,.022,6,16),at(0,-.195,0,[Math.PI/2,0,0]),LEATHER);
 P.add(new THREE.TorusGeometry(.089,.007,4,16),at(0,-.3,0,[Math.PI/2,0,0]),LEATHER_DARK);
 P.add(new THREE.SphereGeometry(.09,12,8),at(0,-h+.045,.05,[0,0,0],[1,.62,1.45]),(x,y)=>y<-h+.025?LEATHER_DARK:LEATHER);
 P.add(new THREE.SphereGeometry(.09,14,6),at(0,-h+.014,.045,[0,0,0],[.95,.16,1.5]),LEATHER_DARK);
 P.add(new THREE.SphereGeometry(.07,12,8,0,Math.PI*2,0,Math.PI*.55),at(0,-h+.03,.12,[0,0,0],[1.1,.8,1]),IRON);
 return P.merge();
}

function buildArm(L,C){
 const P=pieces(),a=ARM;
 // mail on the shoulder, a sleeve, a strapped leather bracer and a big fist
 P.add(new THREE.SphereGeometry(.088,12,6,0,Math.PI*2,0,Math.PI*.6),at(0,-.01,0,[0,0,0],[1,1,1]),mail(C));
 P.add(new THREE.CylinderGeometry(.068,.064,.2,12),at(0,-.13,0),ramp(C.tunicDark,C.tunic,-.23,-.03));
 P.add(new THREE.CylinderGeometry(.066,.06,.12,12),at(0,-.28,0),ramp(LEATHER_DARK,LEATHER,-.34,-.22));
 for(const y of [-.25,-.31])P.add(new THREE.TorusGeometry(.066,.007,4,14),at(0,y,0,[Math.PI/2,0,0]),LEATHER_DARK);
 P.add(new THREE.SphereGeometry(.062,10,8),at(0,-a+.005,.01,[0,0,0],[1,1.05,.95]),SKIN);
 for(let i=0;i<4;i++)P.add(new THREE.SphereGeometry(.016,6,4),at((i-1.5)*.022,-a-.03,.04),SKIN_SHADE);
 return P.merge();
}

// The weapon, in the right fist's socket, pointing forward (+z).
function buildWeapon(L,C){
 const P=pieces(),M=pieces(),woodgrain=(x,y,z)=>mix(WOOD,WOOD_DARK,hash(Math.round(z*60))*.6);
 const edge=(x,y)=>mix(C.metal,[1,1,1],y<-.03?.35:0);
 if(L.weapon==='axe'){
  // a dwarvish hand axe: a banded haft, a broad bearded blade and a hammer poll behind
  P.add(new THREE.CylinderGeometry(.018,.021,.44,8),at(0,0,.13,[Math.PI/2,0,0]),woodgrain);
  P.add(new THREE.CylinderGeometry(.021,.021,.1,8),at(0,0,-.02,[Math.PI/2,0,0]),GRIP);
  M.add(blade([[-.02,.26],[.05,.27],[.13,.22],[.15,.28],[.14,.37],[.1,.39],[.04,.33],[-.02,.34]],.014),edgeDown(0,0,0),(x,y,z)=>edge(x,y));
  M.add(new THREE.BoxGeometry(.04,.05,.07),at(0,.035,.3),mix(C.metal,DARK,.3));
  M.add(new THREE.CylinderGeometry(.026,.026,.07,8),at(0,0,.3),mix(C.metal,DARK,.3));
  M.add(new THREE.TorusGeometry(.023,.006,4,10),at(0,0,.24),C.trim);
 }else if(L.weapon==='hammer'){
  // a war hammer: a steel-shod haft, a square head with a gold band, and a beak behind
  P.add(new THREE.CylinderGeometry(.018,.02,.46,8),at(0,0,.14,[Math.PI/2,0,0]),woodgrain);
  P.add(new THREE.CylinderGeometry(.021,.021,.1,8),at(0,0,-.02,[Math.PI/2,0,0]),GRIP);
  M.add(new THREE.BoxGeometry(.075,.1,.075),at(0,-.03,.34),mix(C.metal,DARK,.15));
  M.add(new THREE.BoxGeometry(.082,.018,.082),at(0,-.03,.34),C.trim);
  M.add(new THREE.BoxGeometry(.085,.02,.085),at(0,-.085,.34),STEEL);
  M.add(new THREE.ConeGeometry(.028,.1,4),at(0,.06,.34),mix(C.metal,DARK,.2));
  for(const z of [.26,.2])M.add(new THREE.BoxGeometry(.026,.026,.05),at(0,0,z),mix(C.metal,DARK,.3));
 }else{
  // a gold sceptre: a banded rod, a cup and a big ruby held in claws
  M.add(new THREE.CylinderGeometry(.016,.019,.38,10),at(0,0,.11,[Math.PI/2,0,0]),GOLD);
  for(const z of [-.06,.1,.23])M.add(new THREE.TorusGeometry(.021,.007,5,12),at(0,0,z),GOLD_DARK);
  M.add(new THREE.SphereGeometry(.024,8,6),at(0,0,-.085),GOLD);
  M.add(new THREE.ConeGeometry(.04,.055,10,1,true),at(0,0,.32,[-Math.PI/2,0,0]),GOLD);
  M.add(new THREE.OctahedronGeometry(.04,1),at(0,0,.36,[0,0,0],[1,1,1.2]),RUBY);
  for(let i=0;i<4;i++){const t=i/4*Math.PI*2;M.add(new THREE.ConeGeometry(.007,.045,4),at(Math.cos(t)*.035,Math.sin(t)*.035,.36,[Math.PI/2,0,0]),GOLD);}
 }
 return {cloth:L.weapon==='sceptre'?null:P.merge(),metal:M.merge()};
}

// The pick-axe's forged head, along x: a drawn point (+x) and a chisel end (−x), arched, closed at
// both ends.
export function forgedPickHead(rows=26,sides=10){
 const pos=[],idx=[];
 for(let i=0;i<=rows;i++){
  const u=i/rows*2-1,a=Math.abs(u),x=u*.19,y=.034*(1-u*u)-.01;
  let tx=.19,ty=-.068*u;const tl=Math.hypot(tx,ty);tx/=tl;ty/=tl;const nx=-ty,ny=tx;
  const taper=1-Math.pow(a,1.5)*.9,hh=.028*taper+.003;
  const hw=u<0?.017*(1-a*.15):.017*taper+.0012;
  for(let j=0;j<sides;j++){
   const th=j/sides*Math.PI*2,c=Math.cos(th),s=Math.sin(th);
   const px=Math.sign(c)*Math.pow(Math.abs(c),.55),py=Math.sign(s)*Math.pow(Math.abs(s),.55);
   pos.push(x+nx*py*hh,y+ny*py*hh,px*hw);
  }
 }
 for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;idx.push(a,c,b,b,c,d);}
 for(const [ring,flip] of [[0,true],[rows,false]]){
  const base=ring*sides,center=pos.length/3;let cx=0,cy=0,cz=0;
  for(let j=0;j<sides;j++){cx+=pos[(base+j)*3];cy+=pos[(base+j)*3+1];cz+=pos[(base+j)*3+2];}
  pos.push(cx/sides,cy/sides,cz/sides);
  for(let j=0;j<sides;j++){const a=base+j,b=base+(j+1)%sides;flip?idx.push(center,a,b):idx.push(center,b,a);}
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setIndex(idx);geometry.computeVertexNormals();
 return geometry;
}

// The pick-axe, gripped at its origin: the haft runs from the butt (y −.125) to just above the
// head (y .6).
function buildPick(){
 const P=pieces(),M=pieces();
 P.add(new THREE.CylinderGeometry(.016,.02,.72,10),at(0,.235,0),(x,y,z)=>mix(WOOD,WOOD_DARK,hash(Math.round(y*40)+Math.round(Math.atan2(z,x)*3))*.5));
 P.add(new THREE.SphereGeometry(.026,10,8),at(0,-.12,0,[0,0,0],[1,.75,1]),WOOD);
 const helix=[];for(let i=0;i<=60;i++){const t=i/60,a=t*Math.PI*2*5.5;helix.push(V(Math.cos(a)*.022,-.09+t*.2,Math.sin(a)*.022));}
 P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix),72,.0055,4),null,GRIP);
 for(const y of [-.095,.115])P.add(new THREE.TorusGeometry(.023,.005,6,14),at(0,y,0,[Math.PI/2,0,0]),GRIP);
 // polished at the tips, forge-dark in the middle, flecked with rust
 M.add(forgedPickHead(),at(0,.56,0),(x,y,z)=>{
  const bright=Math.pow(Math.min(1,Math.abs(x)/.19),2.5),f=hash(Math.round(x*140)*31+Math.round(z*300))*.06,rust=hash(Math.round(x*140)*7+3)>.82?.35:0;
  return [.24+bright*.46+f+rust*.3,.26+bright*.46+f+rust*.02,.27+bright*.44+f-rust*.12];
 });
 M.add(new THREE.CylinderGeometry(.03,.03,.075,10),at(0,.56,0),IRON);
 for(const y of [.527,.593])M.add(new THREE.TorusGeometry(.031,.0045,6,14),at(0,y,0,[Math.PI/2,0,0]),STEEL);
 for(const z of [-.02,.02]){M.add(new THREE.BoxGeometry(.014,.13,.005),at(0,.46,z),IRON);for(const y of [.42,.49])M.add(new THREE.SphereGeometry(.005,6,4),at(0,y,z*1.25),STEEL);}
 M.add(new THREE.BoxGeometry(.028,.018,.008),at(0,.605,0),IRON);
 return {cloth:P.merge(),metal:M.merge()};
}

// mirror a part for the other side, restoring the winding the mirror flips
function mirrored(geo){
 const m=geo.clone().scale(-1,1,1);
 for(let i=0;i<m.attributes.position.count;i+=3)for(const key of ['position','normal','color']){const a=m.attributes[key];for(let k=0;k<a.itemSize;k++){const j=(i+1)*a.itemSize+k,l=(i+2)*a.itemSize+k,t=a.array[j];a.array[j]=a.array[l];a.array[l]=t;}}
 return m;
}

const cache={};let pickGeo=null;const MAT={};
function geometry(kind){
 if(cache[kind])return cache[kind];
 MAT.cloth??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:.03,side:THREE.DoubleSide});
 MAT.metal??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.38,metalness:.72,side:THREE.DoubleSide});
 const L=LOOKS[kind],C=colours(L),leg=buildLeg(L,C);
 if(L.pick)pickGeo??=buildPick();
 cache[kind]={body:buildBody(L,C),head:buildHead(L,C),beard:buildBeard(L,C),legs:[mirrored(leg),leg],arm:buildArm(L,C),weapon:buildWeapon(L,C),pick:L.pick?pickGeo:null};
 return cache[kind];
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}
// a part's cloth and metal meshes, skipping an empty list
function both(parent,geo,name){
 for(const key of ['cloth','metal'])if(geo[key]?.attributes.position.count)mesh(parent,geo[key],MAT[key],name);
}

export function createDwarf(name){
 const kind=isDwarf(name)?name:'dwarf',L=LOOKS[kind],S=geometry(kind);
 const g=new THREE.Group(),body=new THREE.Group();g.name=kind;g.add(body);body.scale.setScalar(L.scale);
 both(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,HEAD_Y,.02);body.add(head);
 both(head,S.head,'head');
 // the beard hangs from the chin, .19 above its origin
 const beard=mesh(head,S.beard,MAT.cloth,'beard');beard.position.set(0,-.07-.19,.07);
 const legs=[],arms=[];
 for(const [i,s] of [-1,1].entries()){
  const leg=new THREE.Group();leg.position.set(s*LEG_X,HIP,0);body.add(leg);mesh(leg,S.legs[i],MAT.cloth,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*SHOULDER_X,SHOULDER_Y,0);arm.rotation.z=s*.12;body.add(arm);mesh(arm,S.arm,MAT.cloth,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-ARM,.03);arms[1].add(weaponSocket);
 both(weaponSocket,S.weapon,'weapon');
 // the pick, held low in the left hand and leaning out (the old humanoid's rest pose)
 let pick=null;
 if(S.pick){pick=new THREE.Group();pick.name='dwarf-pick';pick.position.set(-.36,.44,.1);pick.rotation.set(.12,0,.42);body.add(pick);both(pick,S.pick,'pick');}
 return {g,body,legs,tail:null,wings:[],quirk:'dwarf',arms,arm:arms[1],weaponSocket,head,hat:null,beard,pick};
}
