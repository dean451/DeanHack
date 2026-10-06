import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Orcs used to be the generic box humanoid: a brown box with two cones for tusks and a pair of
// grey balls for shoulders. They now have their own model: a hunched, heavy-shouldered brute with
// long arms and bowed legs, a thick neck, a sloping skull under a slab of a brow, a flat pig
// snout, an underslung jaw with two tusks jutting up past the lip, swept-back ragged ears and
// small glowing eyes. Each kind has its own skin, kit and weapon:
// - orc: olive skin, lank black hair in a greasy topknot, a stitched hide jerkin over red rags, a
//   loincloth, wrapped feet, and a crude cleaver.
// - hill orc: yellowish hide, a leather cap trimmed with fur, a shaggy fur mantle over the
//   shoulders, and a bearded hand axe.
// - Mordor orc: grey-green, in a dark mail shirt and a conical iron helm with a nasal and cheek
//   guards, a round black shield painted with the red eye, and a curved scimitar.
// - Uruk-hai: big and near-black, in a riveted black cuirass over mail, a crested iron helm with
//   the white hand on its brow, a tall black shield with the white hand, and a broad falchion.
//   Iron pauldron on the left. A head taller than the rest.
// - orc shaman: a knee-length hide robe dyed blue, a bone necklace, blue war paint across the
//   eyes, a beast-skull headdress with horns and feathers, and a gnarled staff topped with a
//   skull, held upright.
// - orc-captain: mail, iron pauldrons on both shoulders, a purple cape, a horned iron helm, a
//   skull on the belt, and a great notched scimitar. Stands taller.
// - goblin king: a captain's kit in blood red and black, a pitted gold crown of bent spikes set on
//   the horned helm, and a larger frame. The unique nemesis of the goblin quest.
// - deep orc: pale grey-blue from life underground, bald and scarred, with big pale eyes, in a
//   mail shirt, carrying a hand axe.
// Each moving part (body, head, each leg and arm, the weapon) is one merged vertex-coloured mesh
// on one shared material, plus the eyes on their own glowing material: 8 draws. Shields and
// pauldrons are baked into the arm. The geometry is built once per kind.
// Handles: body, head, legs, arms, arm (the right, weapon arm), weaponSocket (at the right fist),
// eyes. quirk 'orc' keeps the orcs' heavier idle bob. hat, beard and pick are null.

const LOOKS={
 orc:{skin:'#6f7a44',shade:'#48512a',eye:'#ff3a1a',cloth:'#7a2a1e',clothDark:'#4a1a14',leather:'#5a3e26',metal:'#6e706a',hair:'#161412',
  armour:'hide',helm:'hair',weapon:'cleaver',feet:'wrapped',scale:1},
 'hill orc':{skin:'#8a8440',shade:'#5e5a26',eye:'#ffb020',cloth:'#7a6230',clothDark:'#4a3a1e',leather:'#6a4a2a',metal:'#707068',fur:'#8a6a42',hair:'#2a2016',
  armour:'fur',helm:'cap',weapon:'axe',feet:'wrapped',scale:.98},
 'mordor orc':{skin:'#5a6650',shade:'#3a4434',eye:'#ff3020',cloth:'#2e3a5a',clothDark:'#1a2034',leather:'#3a2a1e',metal:'#545a60',hair:'#141414',
  armour:'mail',helm:'iron',weapon:'scimitar',shield:'eye',feet:'boots',scale:1},
 'uruk-hai':{skin:'#44443a',shade:'#2a2a24',eye:'#ff7a1a',cloth:'#1e1e22',clothDark:'#121214',leather:'#2a2020',metal:'#3a3c40',hair:'#0e0e0e',
  armour:'plate',helm:'uruk',weapon:'falchion',shield:'hand',feet:'boots',scale:1.16},
 'orc shaman':{skin:'#7a8a5a',shade:'#50603a',eye:'#7ad8ff',cloth:'#3a5ab0',clothDark:'#22386e',leather:'#6a5034',metal:'#707068',paint:'#3a7aff',hair:'#1a1612',
  armour:'robe',helm:'bone',weapon:'staff',feet:'wrapped',scale:.97},
 'orc-captain':{skin:'#5e6a3e',shade:'#3c4426',eye:'#ff2a10',cloth:'#7a2a6a',clothDark:'#4a1440',leather:'#3a2618',metal:'#60666c',hair:'#141210',
  armour:'captain',helm:'horned',weapon:'great',feet:'boots',scale:1.1},
 'goblin king':{skin:'#4a5a34',shade:'#2e3a1e',eye:'#ff1a0a',cloth:'#5a1a1a',clothDark:'#340c0c',leather:'#2e1e12',metal:'#585c58',hair:'#0e0c0a',
  armour:'captain',helm:'horned',crown:true,weapon:'great',feet:'boots',scale:1.14},
 'deep orc':{skin:'#7e8e8e',shade:'#56646a',eye:'#e8f0b0',cloth:'#2a4a2a',clothDark:'#1a2e1a',leather:'#3e3024',metal:'#5e6266',hair:'#2a2a2a',
  armour:'mail',helm:'bald',weapon:'axe',feet:'wrapped',bigEyes:true,scale:1.06},
};
export const ORCS=Object.keys(LOOKS);
export const isOrc=name=>Object.hasOwn(LOOKS,name);

const TEETH=rgb('#e2d6b0'),CLAW=rgb('#221c14'),MOUTH=rgb('#2a1010'),BONE=rgb('#dcd2b4'),WOOD=rgb('#6a4a2c'),WOOD_DARK=rgb('#3e2a18'),
 STEEL=rgb('#a4aaae'),RIVET=rgb('#b8bcbe'),RUST=rgb('#7a4a2a'),RED=rgb('#d01a10'),WHITE=rgb('#ece8de'),BLACK=rgb('#141414'),GOLD=rgb('#b89030');

const HIP=.46,SHOULDER_Y=HIP+.44,SHOULDER_X=.245,ARM=.43,HEAD_Y=HIP+.6,HEAD_R=.13;
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const colours=L=>{const C={};for(const [k,v] of Object.entries(L))if(typeof v==='string'&&v.startsWith('#'))C[k]=rgb(v);return C;};
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
// mail: a fine grid of darker rings
const mail=C=>(x,y,z)=>mix(C.metal,rgb('#2a2c30'),(Math.round(y*140)+Math.round((x+z)*110))%2?.35:0);
// a tube along a curve that tapers to a point at the end (horns, strands)
function taper(points,radius,radial=8,segments=12,end=.08){
 const curve=new THREE.CatmullRomCurve3(points),tube=new THREE.TubeGeometry(curve,segments,radius,radial),p=tube.attributes.position,c=V(0,0,0);
 for(let i=0;i<p.count;i++){const t=Math.floor(i/(radial+1))/segments,a=Math.max(end,1-t*(1-end));curve.getPointAt(t,c);p.setXYZ(i,c.x+(p.getX(i)-c.x)*a,c.y+(p.getY(i)-c.y)*a,c.z+(p.getZ(i)-c.z)*a);}
 tube.computeVertexNormals();return tube;
}
// a flat blade drawn in (x: towards the edge, y: along the blade), laid in the weapon's frame so
// the blade runs along +z with its edge down
function blade(outline,depth=.008){
 const s=new THREE.Shape();outline.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));
 const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1});g.translate(0,0,-depth/2);return g;
}
const edgeDown=(x,y,z)=>new THREE.Matrix4().makeBasis(V(0,-1,0),V(0,0,1),V(-1,0,0)).setPosition(x,y,z);
const steelEdge=(x,y)=>mix(STEEL,[1,1,1],y<-.02?.3:0);

function buildBody(L,C){
 const P=pieces(),h=HIP,robe=L.armour==='robe';
 const coat={hide:C.leather,fur:C.leather,mail:null,plate:C.metal,robe:C.cloth,captain:null}[L.armour];
 const torso=coat?(x,y,z)=>mix(ramp(mix(coat,[0,0,0],.3),coat,h,h+.3)(y),mix(coat,[0,0,0],.3),z<-.06?.3:0):mail(C);
 // a barrel chest that swells up into heavy shoulders, over a thick waist, leaning forward
 P.add(lathe([[0,h-.04],[.17,h-.04],[.19,h+.04],[.2,h+.14],[.225,h+.26],[.25,h+.36],[.23,h+.42],[.15,h+.47],[.07,h+.49],[0,h+.495]],28),at(0,0,.01,[.12,0,0],[1,1,.78]),torso);
 // the hunch: a hump of muscle over the shoulders, and the thick neck jutting forward
 P.add(new THREE.SphereGeometry(.13,14,10),at(0,h+.45,-.05,[0,0,0],[1.55,.7,.9]),L.armour==='plate'?C.metal:coat?torso:mail(C));
 P.add(new THREE.CylinderGeometry(.075,.09,.13,12),at(0,h+.52,.05,[.55,0,0]),C.shade);
 if(L.armour==='hide'||L.armour==='fur'){
  // a hide jerkin laced up the front, with crude stitching and a strap across the chest
  for(let i=0;i<5;i++)P.add(new THREE.BoxGeometry(.05,.008,.01),at(0,h+.1+i*.06,.2-i*.002+(i>2?.01:0),[.12,0,(i%2?.4:-.4)]),rgb('#2a1a10'));
  const strap=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;strap.push(V(Math.sin(a)*.235,0,Math.cos(a)*.18));}
  P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strap,true),40,.014,4,true),at(0,h+.24,.02,[.12,0,.55]),C.clothDark);
  // red rags hanging out under the jerkin
  for(let i=0;i<9;i++){const a=(i/9)*Math.PI*2,len=.08+hash(i*2.7)*.06;P.add(new THREE.ConeGeometry(.04,len,3),at(Math.sin(a)*.19,h-.04-len/2,Math.cos(a)*.15,[Math.PI,a,0],[1,1,.3]),mix(C.cloth,C.clothDark,hash(i)*.6));}
 }
 if(L.armour==='fur'){
  // a shaggy fur mantle round the shoulders
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=.23+hash(i)*.02;P.add(new THREE.SphereGeometry(.06,8,6),at(Math.sin(a)*r,h+.44+hash(i*3)*.03,Math.cos(a)*r*.82-.02,[0,a,0],[1,.8,1.2]),mix(C.fur,rgb('#3a2a1a'),hash(i*5)*.6));}
 }
 if(L.armour==='mail'||L.armour==='captain'||L.armour==='plate'){
  // a mail skirt below the belt
  P.add(lathe([[.19,h+.02],[.2,h-.06],[.21,h-.14]],24),at(0,0,.005,[0,0,0],[1,1,.82]),mail(C));
 }
 if(L.armour==='plate'){
  // a riveted black cuirass with a raised ridge down the front, and a fauld
  P.add(new THREE.SphereGeometry(.24,20,12,0,Math.PI*2,Math.PI*.25,Math.PI*.4),at(0,h+.22,.02,[.1,0,0],[1.02,1.05,.82]),(x,y,z)=>mix(C.metal,BLACK,.3+hash(Math.round(x*50)+Math.round(y*50)*7)*.2));
  P.add(new THREE.BoxGeometry(.02,.26,.02),at(0,h+.24,.215,[.1,0,0]),mix(C.metal,STEEL,.3));
  for(let i=0;i<8;i++){const a=(i-3.5)*.3;P.add(new THREE.SphereGeometry(.009,5,4),at(Math.sin(a)*.235,h+.1,Math.cos(a)*.19+.02),RIVET);}
 }
 if(L.armour==='captain'){
  // a cape falling from the shoulders behind
  P.add(new THREE.CylinderGeometry(.24,.32,.72,20,4,true,Math.PI*.55,Math.PI*.9),at(0,h+.08,-.02,[0,0,0],[1,1,.8]),(x,y)=>mix(C.clothDark,C.cloth,(y-h+.28)*1.4));
  P.add(new THREE.TorusGeometry(.2,.03,6,20,Math.PI),at(0,h+.44,-.04,[Math.PI/2,0,Math.PI],[1.15,1,1]),C.clothDark);
 }
 if(robe){
  // a knee-length robe, flaring at the hem, with a fringe of rawhide
  P.add(lathe([[.24,h-.28],[.215,h-.2],[.2,h-.05],[.19,h+.04]],24),at(0,0,.005,[0,0,0],[1,1,.85]),(x,y)=>mix(C.clothDark,C.cloth,(y-h+.28)*3));
  for(let i=0;i<20;i++){const a=i/20*Math.PI*2;P.add(new THREE.ConeGeometry(.012,.06,3),at(Math.sin(a)*.235,h-.3,Math.cos(a)*.2,[Math.PI,0,0]),C.leather);}
  // blue daubs down the front
  for(let i=0;i<3;i++)P.add(new THREE.SphereGeometry(.03,8,4),at(0,h+.1+i*.1,.2,[0,0,0],[1.4,.35,.2]),C.paint);
  // a necklace of bones and teeth
  for(let i=0;i<11;i++){const a=(i-5)*.26;P.add(new THREE.ConeGeometry(.012,.05,5),at(Math.sin(a)*.14,h+.44-Math.cos(a)*.04,Math.cos(a)*.13+.04,[Math.PI+.2,0,0]),BONE);}
 }else{
  // a leather skirt of strips over the hips
  for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2,x=Math.sin(a)*.2,z=Math.cos(a)*.16;
   P.add(new THREE.BoxGeometry(.08,.17,.014),at(x,h-.09,z,[Math.cos(a)*-.12,a,0]),(x,y)=>mix(C.leather,C.clothDark,(h-y)*3));}
 }
 // a broad belt with a buckle (the captain's is a skull)
 P.add(new THREE.TorusGeometry(.2,.028,5,28),at(0,h+.03,.01,[Math.PI/2,0,0],[1,.8,1]),mix(C.leather,[0,0,0],.3));
 if(L.armour==='captain'){
  P.add(new THREE.SphereGeometry(.038,10,8),at(0,h+.04,.175,[0,0,0],[1,1.1,.7]),BONE);
  for(const s of [-1,1])P.add(new THREE.SphereGeometry(.011,6,4),at(s*.014,h+.05,.2),BLACK);
 }else P.add(new THREE.BoxGeometry(.07,.06,.02),at(0,h+.03,.172),robe?C.leather:C.metal);
 return P.merge();
}

function buildHead(L,C){
 const P=pieces(),r=HEAD_R;
 const skin=(x,y,z)=>mix(C.skin,C.shade,THREE.MathUtils.clamp(-z*5,0,.4)+THREE.MathUtils.clamp(-y*4,0,.2));
 // a low, sloping skull, set back behind the brow
 P.add(new THREE.SphereGeometry(r,20,16),at(0,.01,-.02,[0,0,0],[1.02,.92,1.1]),skin);
 // the slab of a brow over deep-set eyes
 P.add(new THREE.BoxGeometry(.2,.04,.07),at(0,.045,.1,[.35,0,0]),C.shade);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.03,8,6),at(s*.045,.022,.1,[0,0,0],[1.3,.8,.6]),rgb('#1a120e'));
 // a broad muzzle and a flat, upturned pig snout
 P.add(new THREE.SphereGeometry(.075,14,10),at(0,-.03,.07,[0,0,0],[1.3,.85,1.1]),skin);
 P.add(new THREE.SphereGeometry(.036,12,8),at(0,.0,.14,[-.4,0,0],[1.35,.8,.7]),C.shade);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.011,6,4),at(s*.018,-.005,.162),MOUTH);
 // an underslung jaw, wider than the muzzle, and the tusks jutting up past the upper lip
 P.add(new THREE.SphereGeometry(.08,14,10),at(0,-.085,.06,[0,0,0],[1.35,.6,1.1]),skin);
 P.add(new THREE.TorusGeometry(.07,.01,4,16,Math.PI*.8),at(0,-.055,.07,[-.5,0,Math.PI+Math.PI*.1],[1,1,.85]),MOUTH);
 for(const s of [-1,1]){
  P.add(new THREE.ConeGeometry(.017,.075,6),at(s*.055,-.045,.13,[-.2,0,-s*.2]),(x,y)=>mix(TEETH,rgb('#9a8a60'),(-.05-y)*12));
  for(let i=0;i<2;i++)P.add(new THREE.ConeGeometry(.007,.02,4),at(s*(.015+i*.018),-.06,.14),TEETH);
  // ragged ears swept back, with a notch bitten out of one
  P.add(new THREE.ConeGeometry(.04,.16,6),at(s*.125,.02,-.05,[-1.2,0,-s*.6],[1,1,.35]),ramp(C.shade,C.skin,-.06,.06));
  P.add(new THREE.ConeGeometry(.024,.11,6),at(s*.123,.02,-.04,[-1.2,0,-s*.6],[1,1,.2]),mix(C.shade,rgb('#6a3a2a'),.4));
 }
 P.add(new THREE.SphereGeometry(.014,6,4),at(-.15,.035,-.1),C.skin);
 if(L.paint)for(const s of [-1,1])P.add(new THREE.SphereGeometry(.05,10,6),at(s*.05,.02,.1,[0,0,0],[1.1,.35,.5]),C.paint);
 const helmet=(tint)=>(x,y,z)=>mix(C.metal,tint,hash(Math.round(x*40)+Math.round(z*40)*7)*.45);
 switch(L.helm){
  case 'hair':{
   // lank black hair to the nape, and a greasy topknot
   P.add(new THREE.SphereGeometry(r*1.02,16,8,0,Math.PI*2,0,Math.PI*.55),at(0,.02,-.03,[-.35,0,0],[1.03,.95,1.1]),C.hair);
   P.add(new THREE.CylinderGeometry(.018,.028,.05,8),at(0,r+.03,-.04,[-.3,0,0]),C.hair);
   P.add(taper([V(0,r+.05,-.05),V(0,r+.08,-.1),V(0,r+.02,-.17),V(0,-.03,-.19)],.028,6,10),null,C.hair);
   break;}
  case 'bald':{
   // a bare scarred scalp
   for(const [x,z,a] of [[.04,.02,.5],[-.05,-.04,-.3],[.0,-.08,1.2]])P.add(new THREE.BoxGeometry(.006,.006,.08),at(x,r*.93,z,[0,a,0]),rgb('#a8a0a0'));
   break;}
  case 'cap':{
   // a leather skull cap with a ruff of fur round the rim
   P.add(new THREE.SphereGeometry(r+.012,16,8,0,Math.PI*2,0,Math.PI*.46),at(0,.03,-.02,[-.15,0,0],[1.03,.95,1.1]),mix(C.leather,[0,0,0],.2));
   for(let i=0;i<16;i++){const a=i/16*Math.PI*2;P.add(new THREE.SphereGeometry(.028,6,5),at(Math.sin(a)*(r+.01),.035+Math.cos(a)*.02,Math.cos(a)*(r+.01)*1.08-.02),mix(C.fur,rgb('#3a2a1a'),hash(i)*.5));}
   break;}
  case 'iron':case 'uruk':case 'horned':{
   // an iron helm, peaked (Mordor), crested (Uruk) or horned (captain), with a nasal and cheek guards
   const peak=L.helm==='iron'?.09:.05;
   P.add(lathe([[r+.016,0],[r+.014,.03],[r*.95,.07],[r*.7,.1+peak*.4],[r*.35,.12+peak*.8],[0,.13+peak]],22),at(0,.02,-.015,[-.12,0,0],[1.02,1,1.1]),helmet(rgb('#2a2e30')));
   P.add(new THREE.TorusGeometry(r+.015,.009,5,26),at(0,.024,-.016,[Math.PI/2-.12,0,0],[1.02,1.1,1]),mix(C.metal,[0,0,0],.3));
   P.add(new THREE.BoxGeometry(.022,.07,.012),at(0,.02,.15,[.2,0,0]),C.metal);
   for(const s of [-1,1])P.add(new THREE.BoxGeometry(.012,.09,.06),at(s*.125,-.04,.03,[0,s*.3,s*.1]),helmet(rgb('#2a2e30')));
   if(L.helm==='uruk'){
    P.add(new THREE.BoxGeometry(.018,.07,.2),at(0,.14,-.02,[-.12,0,0]),mix(C.metal,[0,0,0],.4));
    // the white hand, painted on the brow
    P.add(new THREE.SphereGeometry(.024,8,6),at(0,.075,.122,[-.35,0,0],[1,1.1,.3]),WHITE);
    for(let i=0;i<4;i++)P.add(new THREE.BoxGeometry(.008,.03,.004),at((i-1.5)*.011,.105,.114-i%2*.002,[-.45,0,(i-1.5)*.12]),WHITE);
    P.add(new THREE.BoxGeometry(.008,.024,.004),at(.028,.07,.128,[-.35,0,-.9]),WHITE);
   }
   if(L.helm==='horned')for(const s of [-1,1])
    P.add(taper([V(s*.12,.08,-.01),V(s*.2,.13,.0),V(s*.23,.22,.02),V(s*.2,.3,.04)],.03,8,12),null,(x,y)=>mix(BONE,rgb('#3a3028'),(y-.08)*4));
   if(L.crown){
    // a pitted, dented gold crown of bent spikes round the helm
    P.add(new THREE.TorusGeometry(r+.02,.014,6,26),at(0,.085,-.016,[Math.PI/2-.12,0,0],[1.02,1.1,1]),mix(GOLD,[0,0,0],.35));
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2,x=Math.sin(a)*(r+.02),z=Math.cos(a)*(r+.02)*1.1-.016;P.add(new THREE.ConeGeometry(.016,.07+hash(i+3)*.04,5),at(x,.13,z,[(hash(i)-.5)*.5,0,(hash(i+9)-.5)*.5]),mix(GOLD,[0,0,0],.3+hash(i)*.2));}
   }
   break;}
  case 'bone':{
   // a beast's skull worn as a headdress, with its horns, and feathers behind
   P.add(new THREE.SphereGeometry(.11,14,10),at(0,.11,-.01,[0,0,0],[1.1,.65,1.05]),BONE);
   P.add(new THREE.BoxGeometry(.06,.05,.12),at(0,.1,.12,[.25,0,0]),BONE);
   for(const s of [-1,1]){
    P.add(new THREE.SphereGeometry(.018,6,4),at(s*.04,.12,.09),BLACK);
    P.add(taper([V(s*.08,.14,.0),V(s*.16,.2,-.03),V(s*.17,.29,-.08),V(s*.12,.34,-.12)],.022,8,12),null,rgb('#4a3a2a'));
   }
   for(let i=0;i<3;i++){const a=(i-1)*.4;P.add(new THREE.SphereGeometry(.05,8,6),at(Math.sin(a)*.08,.16,-.12,[-.6,0,a],[.3,1.9,.08]),(x,y)=>mix(rgb('#2a3a8a'),rgb('#e8e0c8'),(y-.1)*5));}
   break;}
 }
 return P.merge();
}

// The eyes, on their own glowing material, in head space.
function buildEyes(L){
 const P=pieces(),r=L.bigEyes?.02:.014;
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(r,8,6),at(s*.046,.022,.118,[0,0,s*.15],[1.3,.75,.6]),[1,1,1]);
 return P.merge();
}

function buildLeg(L,C){
 const P=pieces(),h=HIP,bow=.08,trousers=L.armour==='robe'?C.clothDark:mix(C.leather,[0,0,0],.25);
 // bowed legs: the thigh angles out to the knee and the shin back in to the foot
 const knee=V(Math.sin(bow)*h*.5,-h*.5,.02);
 P.add(new THREE.CylinderGeometry(.085,.068,h*.5,12),at(knee.x/2,-h*.25,.01,[0,0,bow]),ramp(mix(trousers,[0,0,0],.3),trousers,-h*.5,0));
 const armoured=L.feet==='boots'&&L.armour!=='hide';
 P.add(new THREE.SphereGeometry(.064,10,8),at(knee.x,knee.y,knee.z+.01),armoured?C.metal:trousers);
 P.add(new THREE.CylinderGeometry(.064,.055,h*.44,12),at(knee.x/2,-h*.74,.01,[0,0,-bow]),armoured?(x,y,z)=>mix(C.metal,BLACK,z<0?.3:0):C.skin);
 if(L.feet==='boots'){
  // iron-shod boots with a turned cuff
  P.add(new THREE.CylinderGeometry(.068,.064,.12,12),at(0,-h+.08,.01),mix(C.leather,[0,0,0],.3));
  P.add(new THREE.SphereGeometry(.075,12,8),at(0,-h+.035,.055,[0,0,0],[.95,.5,1.6]),(x,y)=>y<-h+.025?BLACK:mix(C.leather,[0,0,0],.3));
  P.add(new THREE.BoxGeometry(.12,.02,.22),at(0,-h+.01,.045),BLACK);
  P.add(new THREE.BoxGeometry(.1,.025,.03),at(0,-h+.03,.15),C.metal);
 }else{
  // rag-wrapped shins and wide bare feet with black claws
  for(let i=0;i<4;i++)P.add(new THREE.TorusGeometry(.058,.012,4,14),at(0,-h*.6-i*.04,.01,[Math.PI/2+(i%2?.25:-.25),0,0]),mix(C.cloth,C.clothDark,i%2));
  P.add(new THREE.SphereGeometry(.07,12,8),at(0,-h+.035,.05,[0,0,0],[1.05,.5,1.6]),(x,y)=>y<-h+.02?C.shade:C.skin);
  for(let i=0;i<4;i++){const x=(i-1.5)*.03;P.add(new THREE.SphereGeometry(.018,6,5),at(x,-h+.02,.15-Math.abs(i-1.5)*.012),C.skin);P.add(new THREE.ConeGeometry(.009,.03,4),at(x,-h+.02,.175-Math.abs(i-1.5)*.012,[Math.PI/2,0,0]),CLAW);}
  P.add(new THREE.BoxGeometry(.12,.012,.2),at(0,-h+.006,.05),C.shade);
 }
 return P.merge();
}

function buildArm(L,C,left){
 const P=pieces(),a=ARM,plated=L.armour==='plate'||L.armour==='captain',mailed=L.armour==='mail'||plated;
 // a knotted shoulder, a thick upper arm, a leather bracer on the forearm and a big clawed fist
 P.add(new THREE.SphereGeometry(.08,12,10),at(0,-.01,0),mailed?mail(C):L.armour==='robe'?C.cloth:C.skin);
 P.add(new THREE.CylinderGeometry(.07,.06,.2,12),at(0,-.1,0),mailed?mail(C):L.armour==='robe'?ramp(C.clothDark,C.cloth,-.2,0):ramp(C.shade,C.skin,-.2,0));
 P.add(new THREE.SphereGeometry(.058,10,8),at(0,-.21,-.01),C.skin);
 P.add(new THREE.CylinderGeometry(.058,.048,.18,12),at(0,-.31,.01),ramp(mix(C.leather,[0,0,0],.3),C.leather,-.4,-.22));
 for(let i=0;i<3;i++)P.add(new THREE.TorusGeometry(.056-i*.003,.006,4,14),at(0,-.25-i*.05,.01,[Math.PI/2,0,0]),plated?C.metal:mix(C.leather,[0,0,0],.4));
 P.add(new THREE.SphereGeometry(.058,12,8),at(0,-a+.01,.015,[0,0,0],[.95,1.05,1.05]),C.skin);
 for(let i=0;i<4;i++){const x=(i-1.5)*.024;P.add(new THREE.SphereGeometry(.016,6,4),at(x,-a-.012,.055),C.shade);P.add(new THREE.ConeGeometry(.007,.025,4),at(x,-a-.035,.065,[Math.PI+.4,0,0]),CLAW);}
 P.add(new THREE.CylinderGeometry(.015,.017,.05,6),at(left?.045:-.045,-a+.005,.04,[.9,0,left?-.5:.5]),C.skin);
 // iron pauldrons: the Uruk-hai's left, both of the captain's
 if(L.armour==='captain'||(L.armour==='plate'&&left)){
  const s=left?1:-1;
  P.add(new THREE.SphereGeometry(.115,14,8,0,Math.PI*2,0,Math.PI*.42),at(-s*.01,.015,0,[0,0,s*.35],[1,.9,1.05]),(x,y,z)=>mix(C.metal,BLACK,hash(Math.round(x*50)+Math.round(z*50)*3)*.3));
  P.add(new THREE.SphereGeometry(.125,14,4,0,Math.PI*2,Math.PI*.3,Math.PI*.15),at(-s*.012,-.02,0,[0,0,s*.35],[1,.9,1.05]),mix(C.metal,[0,0,0],.35));
  for(const z of [-.06,.06])P.add(new THREE.SphereGeometry(.01,5,4),at(-s*.07,.05,z),RIVET);
  if(L.armour==='captain')P.add(new THREE.ConeGeometry(.02,.07,5),at(-s*.06,.1,0,[0,0,s*.5]),RIVET);
 }
 if(left&&L.shield==='eye'){
  // a round black shield with the red eye, strapped to the forearm
  P.add(new THREE.CylinderGeometry(.14,.14,.022,24),at(-.085,-.27,.02,[0,0,Math.PI/2]),(x,y,z)=>mix(rgb('#222'),BLACK,hash(Math.round(y*30)+Math.round(z*30)*5)*.5));
  P.add(new THREE.TorusGeometry(.14,.01,5,24),at(-.085,-.27,.02,[0,Math.PI/2,0]),C.metal);
  P.add(new THREE.SphereGeometry(.07,16,8),at(-.098,-.27,.02,[0,0,0],[.08,.55,1]),(x,y,z)=>mix(RED,rgb('#ff8a20'),1-Math.hypot(y+.27,(z-.02)*.55)*25));
  P.add(new THREE.SphereGeometry(.03,8,6),at(-.1,-.27,.02,[0,0,0],[.06,1,.22]),BLACK);
 }
 if(left&&L.shield==='hand'){
  // a tall black shield, flared at the top, with the white hand
  const shield=new THREE.CylinderGeometry(.1,.075,.42,16,1,false,-Math.PI*.35,Math.PI*.7);
  P.add(shield,at(-.07,-.22,.02,[0,-Math.PI/2,0],[1,1,.35]),(x,y)=>mix(rgb('#1a1a1c'),rgb('#3a3a3e'),hash(Math.round(y*40))*.4));
  P.add(new THREE.SphereGeometry(.032,10,8),at(-.106,-.2,.02,[0,0,0],[.2,1.1,1]),WHITE);
  for(let i=0;i<4;i++)P.add(new THREE.BoxGeometry(.006,.05,.013),at(-.109,-.15,.02+(i-1.5)*.016,[(i-1.5)*.12,0,0]),WHITE);
  P.add(new THREE.BoxGeometry(.006,.04,.012),at(-.108,-.21,.06,[-.9,0,0]),WHITE);
 }
 return P.merge();
}

// The weapon, in the right fist's socket, pointing forward (+z); the shaman's staff stands upright.
function buildWeapon(L,C){
 const P=pieces(),grip=(len,z=.01)=>{P.add(new THREE.CylinderGeometry(.017,.019,len,8),at(0,0,z,[Math.PI/2,0,0]),mix(C.leather,[0,0,0],.3));for(let i=0;i<3;i++)P.add(new THREE.TorusGeometry(.019,.004,4,10),at(0,0,z-len/3+i*len/3),C.clothDark);};
 const rusty=(x,y,z)=>mix(steelEdge(x,y),RUST,hash(Math.round(x*120)+Math.round(z*120)*3)>.75?.5:0);
 switch(L.weapon){
  case 'cleaver':
   // a crude butcher's cleaver: a broad rectangular slab with a notched edge
   grip(.1);
   P.add(blade([[-.02,.05],[.075,.05],[.07,.1],[.08,.14],[.075,.2],[.06,.24],[-.025,.24],[-.02,.05]],.01),edgeDown(0,.01,0),rusty);
   P.add(new THREE.SphereGeometry(.012,6,4),at(.006,.02,.2),C.metal);
   break;
  case 'axe':
   // a hand axe: a knotted haft with a bearded iron head and a back spike
   P.add(new THREE.CylinderGeometry(.017,.02,.38,8),at(0,0,.12,[Math.PI/2,0,0]),(x,y,z)=>mix(WOOD,WOOD_DARK,hash(Math.round(z*60))*.6));
   P.add(blade([[-.02,.24],[.04,.25],[.11,.21],[.13,.26],[.12,.33],[.09,.36],[.03,.31],[-.02,.32]],.012),edgeDown(0,0,0),rusty);
   P.add(new THREE.ConeGeometry(.014,.07,4),at(0,.05,.29),C.metal);
   P.add(new THREE.TorusGeometry(.022,.006,4,10),at(0,0,.245),C.metal);
   break;
  case 'scimitar':case 'great':{
   // a curved scimitar that widens towards the tip; the captain's is longer, with notches
   const long=L.weapon==='great',len=long?.3:.3,w=long?.05:.04,pts=[];grip(long?.13:.1,long?-.02:.01);
   P.add(new THREE.BoxGeometry(.1,.018,.02),at(0,0,.065),C.metal);
   for(let i=0;i<=10;i++){const t=i/10,b=-.08*t*t;pts.push([b+w*(.6+.6*t)*(1-Math.pow(t,6)),.07+t*len]);}
   for(let i=10;i>=0;i--){const t=i/10,b=-.08*t*t,notch=long&&i%3===1?.008:0;pts.push([b-.012+notch,.07+t*len]);}
   P.add(blade(pts,.007),edgeDown(0,0,0),rusty);
   break;}
  case 'falchion':
   // a heavy Uruk falchion: straight back, broad belly, a clipped point
   grip(.12,-.01);
   P.add(new THREE.BoxGeometry(.11,.02,.022),at(0,0,.06),C.metal);
   P.add(blade([[-.015,.07],[.035,.07],[.045,.17],[.06,.27],[.02,.34],[-.015,.315],[-.015,.07]],.009),edgeDown(0,0,0),(x,y)=>mix(steelEdge(x,y),rgb('#4a4e52'),y>-.01?.4:0));
   break;
  case 'staff':{
   // a gnarled staff held upright, a horned skull lashed to the top, bones and a feather dangling
   const pts=[];for(let i=0;i<=10;i++){const t=i/10;pts.push(V(Math.sin(t*9)*.014,-.3+t*.95,.03+Math.cos(t*7)*.012));}
   P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.019,8),null,(x,y)=>mix(WOOD,WOOD_DARK,hash(Math.round(y*50))*.7));
   P.add(new THREE.SphereGeometry(.05,12,10),at(0,.7,.04,[0,0,0],[1,.9,1.1]),BONE);
   P.add(new THREE.BoxGeometry(.04,.035,.06),at(0,.67,.09),BONE);
   for(const s of [-1,1]){P.add(new THREE.SphereGeometry(.012,6,4),at(s*.02,.7,.085),BLACK);P.add(taper([V(s*.04,.72,.03),V(s*.09,.76,.02),V(s*.1,.83,-.01)],.013,6,8),null,rgb('#4a3a2a'));}
   for(let i=0;i<3;i++)P.add(new THREE.TorusGeometry(.022,.005,4,10),at(0,.6+i*.018,.035,[Math.PI/2,0,0]),C.leather);
   P.add(new THREE.CylinderGeometry(.003,.003,.12,4),at(.03,.55,.04),C.leather);
   P.add(new THREE.CylinderGeometry(.007,.007,.05,5),at(.03,.48,.04),BONE);
   P.add(new THREE.SphereGeometry(.04,8,6),at(-.03,.53,.04,[0,0,.2],[.3,1.8,.08]),(x,y)=>mix(C.paint,WHITE,(y-.46)*6));
   break;}
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
 material??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.1,side:THREE.DoubleSide});
 const L=LOOKS[kind],C=colours(L),leg=buildLeg(L,C);
 cache[kind]={
  body:buildBody(L,C),head:buildHead(L,C),eyes:buildEyes(L),legs:[mirrored(leg),leg],
  arms:[buildArm(L,C,true),buildArm(L,C,false)],weapon:buildWeapon(L,C),
  eyeMaterial:new THREE.MeshStandardMaterial({color:L.eye,emissive:L.eye,emissiveIntensity:2.6,roughness:.3}),
 };
 return cache[kind];
}
function mesh(parent,geo,mat,name){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createOrc(name){
 const kind=isOrc(name)?name:'orc',L=LOOKS[kind],S=geometry(kind);
 const g=new THREE.Group(),body=new THREE.Group();g.name=kind;g.add(body);body.scale.setScalar(L.scale);
 mesh(body,S.body,material,'body');
 // the head hangs forward of the shoulders on the thick neck
 const head=new THREE.Group();head.position.set(0,HEAD_Y,.1);body.add(head);
 mesh(head,S.head,material,'head');
 const eyes=mesh(head,S.eyes,S.eyeMaterial,'eyes');eyes.castShadow=false;
 const legs=[],arms=[];
 for(const [i,s] of [-1,1].entries()){
  const leg=new THREE.Group();leg.position.set(s*.1,HIP,0);body.add(leg);mesh(leg,S.legs[i],material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*SHOULDER_X,SHOULDER_Y,.03);arm.rotation.z=s*.09;body.add(arm);mesh(arm,S.arms[i],material,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-ARM,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.weapon,material,'weapon');
 return {g,body,legs,tail:null,wings:[],quirk:'orc',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
