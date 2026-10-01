import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The caveman and cavewoman (the player-monster role) used to be the generic '@' humanoid: a tinted
// box with a ball for a head. They now stand as hunched brutes out of the deep caves: a heavy,
// sloping brow ridge shading small pale eyes, a broad flat nose and a jutting jaw with a bared row
// of stained, uneven teeth, under a matted black mane with a splinter of bone pushed through it.
// The caveman wears a short, thick beard; the cavewoman's mane hangs longer down the back and has
// no beard. A raw hide is lashed over the left shoulder and cinched with a rope of sinew, leaving
// the right side of the chest bare, ash-smeared and scarred; its hem hangs in ragged, uneven
// points. A necklace of fangs and finger bones hangs at the throat. The arms are long and thick
// with bare hands; the legs are wrapped in hide bound with thongs down to bare, splayed feet. The
// right fist holds a knotted club tilted forward, its fat head studded with jagged flint shards.
// Each moving part (body, head, each leg and arm) and the club is one merged, vertex-coloured mesh
// with one shared material: 7 draws. Geometry is built once per variant and shared.
// Handles: legs, arms, arm (the right, club arm), weaponSocket (the club), head, body. The pivots
// match archeologist.js and barbarian.js (shoulders ±.215 at .82, hand .37 down the arm, legs ±.08
// at .47); the head pivot sits lower and further forward (.93, z .04) for the hunch.

const SKIN=rgb('#9c7252'),SKIN_DARK=rgb('#5e3e2a'),SKIN_HI=rgb('#b88a66'),ASH=rgb('#2a2622'),SCAR=rgb('#c49a80');
const HAIR=rgb('#16120e'),HAIR_HI=rgb('#34281e'),BONE=rgb('#d6cab0'),BONE_DARK=rgb('#7e705a');
const HIDE=rgb('#7a5a3a'),HIDE_DARK=rgb('#3e2a1a'),HIDE_PALE=rgb('#a88a64'),SINEW=rgb('#8a7454');
const TOOTH=rgb('#c8b88a'),GUM=rgb('#3a1410'),EYE=rgb('#c8c0a0'),PUPIL=rgb('#140c08'),NAIL=rgb('#4a3a2a');
const WOOD=rgb('#5a3e24'),WOOD_DARK=rgb('#2e1e12'),WOOD_HI=rgb('#7e5a36'),FLINT=rgb('#3a3a40'),FLINT_HI=rgb('#8a8a94');
const BLOOD=rgb('#3a0c08');

const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const ring=(r,tube,radial=6,tubular=36)=>new THREE.TorusGeometry(r,tube,radial,tubular).rotateX(Math.PI/2);
const hash=(a,b=0)=>{const h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
// a sawtooth tear along the lowest row of a lathe: each vertex at or below `hem` drops by up to
// `depth`, in `teeth` uneven points around the circle
function tear(geo,hem,depth,teeth,seed=0){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  if(p.getY(i)>hem+1e-4)continue;
  const a=Math.atan2(p.getX(i),p.getZ(i))*teeth/Math.PI+seed;
  const f=a-Math.floor(a),h=hash(Math.floor(a),seed);
  p.setY(i,p.getY(i)-depth*(.35+.65*h)*(1-Math.abs(f-.5)*2));
 }
 geo.computeVertexNormals();
 return geo;
}
// matted hair: dark clumps with greasy highlights
const matted=(x,y,z)=>{const s=Math.sin(Math.atan2(x,z)*23+y*90)*.5+.5;return mix(HAIR,HAIR_HI,s*s*.7);};
// raw hide: blotched pale and dark, darker toward the hem
const hide=(lo,hi)=>(x,y,z)=>{
 const blotch=Math.sin(x*41+z*13)*Math.sin(y*37+x*9)*.5+.5;
 return mix(ramp(HIDE_DARK,HIDE,lo,hi)(y),HIDE_PALE,blotch*blotch*.45);
};

function buildBody(){
 const P=pieces();
 // a barrel chest and thick waist, bare skin, ash smeared across the belly and a scar down the
 // right breast
 const torso=[[.17,.44],[.18,.5],[.176,.58],[.2,.68],[.222,.78],[.2,.85],[.13,.9],[.06,.915]];
 P.add(lathe(torso,32),at(0,0,0,[0,0,0],[1,1,.82]),(x,y,z)=>{
  if(x>.04&&x<.06+(y-.6)*.1&&y>.6&&y<.78&&z>0)return SCAR;
  const smear=Math.sin(x*30+y*18)*.5+.5;
  const base=ramp(SKIN_DARK,SKIN,.44,.8)(y);
  return z>0&&y<.66?mix(base,ASH,smear*.35):mix(base,SKIN_HI,Math.max(0,z)*1.5);
 });
 P.add(new THREE.CircleGeometry(.17,24),at(0,.441,0,[Math.PI/2,0,0],[1,.82,1]),HIDE_DARK);
 // the hide: a ragged skirt to the knee, lashed over the left shoulder; the right of the chest
 // stays bare
 P.add(tear(lathe([[.2,.3],[.198,.38],[.188,.46],[.182,.54],[.186,.6]],32),.3,.07,7,3),at(0,0,0,[0,0,0],[1,1,.86]),hide(.26,.6));
 P.add(tear(lathe([[.21,.56],[.214,.66],[.226,.76],[.21,.84],[.15,.89],[.07,.905]],28,Math.PI*.95,Math.PI*1.1),.56,.06,5,7),at(0,0,0,[0,0,0],[1.02,1,.86]),hide(.5,.9));
 // the shoulder strap of hide running across the chest from the left shoulder to the right hip
 P.add(ring(.205,.022,4,36),at(0,.66,0,[0,0,.6],[1,1.25,.84]),(x,y,z)=>mix(HIDE,HIDE_DARK,Math.sin(Math.atan2(x,z)*14)*.5+.5));
 // the sinew rope at the waist, knotted at the front with two dangling ends
 P.add(ring(.19,.012,4,36),at(0,.57,0,[0,0,0],[1,1,.86]),(x,y,z)=>Math.sin(Math.atan2(x,z)*30)>0?SINEW:HIDE_DARK);
 P.add(new THREE.SphereGeometry(.02,8,6),at(.03,.57,.165),SINEW);
 for(const s of [-1,1])P.add(new THREE.CylinderGeometry(.006,.004,.09,5),at(.03+s*.012,.52,.168,[0,0,s*.15]),SINEW);
 // a necklace of fangs and finger bones on a thong around the throat
 P.add(ring(.1,.006,4,28),at(0,.865,.02,[.35,0,0],[1,1,.95]),SINEW);
 for(let i=0;i<7;i++){
  const a=(i-3)*.32,x=Math.sin(a)*.1,z=.02+Math.cos(a)*.095,y=.86-Math.cos(a)*.036;
  if(i%2)P.add(new THREE.CylinderGeometry(.007,.006,.032,5),at(x,y-.018,z,[.35,0,0]),BONE);
  else P.add(new THREE.ConeGeometry(.008,.04,5),at(x,y-.022,z,[Math.PI+.35,0,0]),i===3?BONE:BONE_DARK);
 }
 // hunched shoulders: a heavy mound of muscle behind the neck
 P.add(new THREE.SphereGeometry(.13,16,10),at(0,.86,-.06,[0,0,0],[1.35,.6,.8]),(x,y,z)=>x<-.04?hide(.8,.95)(x,y,z):SKIN_DARK);
 // the neck, thick and short
 P.add(new THREE.CylinderGeometry(.06,.07,.08,14),at(0,.91,.03,[.25,0,0]),SKIN_DARK);
 return P.merge();
}

function buildHead(female){
 const P=pieces();
 // a low skull with a heavy brow and a jutting jaw; head centre at y .1
 P.add(new THREE.SphereGeometry(.1,20,16),at(0,.1,0,[0,0,0],[.95,.92,1]),(x,y,z)=>{
  if(z<-.02||y>.16)return matted(x,y,z);
  return y<.07?SKIN_DARK:SKIN;
 });
 // the brow ridge: one thick shelf over both eyes, overhanging and furrowed
 P.add(new THREE.CapsuleGeometry(.026,.1,3,10),at(0,.135,.075,[0,0,Math.PI/2],[1,1,.8]),(x,y)=>y>.14?SKIN_HI:SKIN_DARK);
 for(const s of [-1,1]){
  // small pale eyes deep in the shadow of the brow
  P.add(new THREE.SphereGeometry(.013,8,6),at(s*.036,.112,.078,[0,0,0],[1.2,.6,.5]),EYE);
  P.add(new THREE.SphereGeometry(.0055,8,6),at(s*.034,.112,.084),PUPIL);
  // ears, small and thick
  P.add(new THREE.SphereGeometry(.022,8,6),at(s*.092,.1,-.005,[0,0,0],[.45,1,.75]),SKIN_DARK);
  // cheekbones
  P.add(new THREE.SphereGeometry(.026,10,8),at(s*.05,.085,.06,[0,0,0],[1,.7,.8]),SKIN);
 }
 // a broad, flat nose
 P.add(new THREE.SphereGeometry(.024,10,8),at(0,.085,.098,[0,0,0],[1.35,.85,.75]),SKIN_HI);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.006,6,4),at(s*.013,.077,.111),PUPIL);
 // the jutting jaw, mouth slightly open on a row of uneven, stained teeth
 P.add(new THREE.SphereGeometry(.07,14,10),at(0,.035,.04,[0,0,0],[1.05,.68,1.05]),(x,y,z)=>female?SKIN:mix(SKIN_DARK,HAIR,.5));
 P.add(new THREE.BoxGeometry(.06,.012,.012),at(0,.052,.103),GUM);
 for(let i=0;i<6;i++){
  const x=-.025+i*.01,h=.008+hash(i,4)*.008;
  P.add(new THREE.BoxGeometry(.007,h,.006),at(x,.057-h/2+.004,.107,[0,0,(hash(i,9)-.5)*.4]),mix(TOOTH,BONE_DARK,hash(i,2)*.6));
 }
 // two lower tusks pushing up past the lip
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.006,.026,5),at(s*.03,.056,.102,[0,0,-s*.15]),TOOTH);
 if(!female){
  // a short, thick, matted beard under the jaw
  P.add(new THREE.SphereGeometry(.06,12,8),at(0,.01,.05,[.3,0,0],[1.1,.85,.8]),matted);
  for(let i=0;i<5;i++)P.add(new THREE.ConeGeometry(.012,.05,5),at(-.04+i*.02,-.03,.06,[Math.PI+.25,0,(i-2)*.1]),matted);
 }
 // the mane: a matted mass over the crown and down the back, with jagged clumps
 P.add(new THREE.SphereGeometry(.115,18,12,0,Math.PI*2,0,Math.PI*.6),at(0,.112,-.012,[-.25,0,0],[1.02,1,1.05]),matted);
 const clumps=female?11:7,len=female?.3:.16;
 for(let i=0;i<clumps;i++){
  const a=(i/(clumps-1)-.5)*2.6,x=Math.sin(a)*.09,z=-.02-Math.cos(a)*.07;
  const l=len*(.7+hash(i,1)*.5);
  P.add(new THREE.ConeGeometry(.024,l,5),at(x,.12-l/2,z,[Math.PI+.25*Math.cos(a),0,-.25*Math.sin(a)]),matted);
 }
 // forelocks hanging over the brow
 for(const x of [-.05,-.01,.035])P.add(new THREE.ConeGeometry(.014,.06,5),at(x,.155,.07,[Math.PI-.5,0,x*2]),matted);
 // a splinter of bone pushed through the mane
 P.add(new THREE.CylinderGeometry(.007,.005,.2,6),at(.01,.2,-.02,[0,0,1.2]),BONE);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.012,6,4),at(.01+s*.093,.2+s*.035,-.02),BONE_DARK);
 return P.merge();
}

// hide wrapped around the shin, bound with crossing thongs, and a bare splayed foot
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.07,.062,.18,14),at(0,-.09,0),SKIN_DARK);
 P.add(lathe([[.066,-.18],[.064,-.26],[.056,-.34],[.05,-.41]],14),at(0,0,0),(x,y,z)=>{
  const a=Math.atan2(x,z);
  if(Math.abs(Math.sin(a*1.5+y*55))<.16)return SINEW;
  return hide(-.41,-.18)(x,y,z);
 });
 // the foot: broad, flat, toes splayed and black-nailed
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.442,.035,[0,0,0],[1.05,.48,1.55]),SKIN);
 for(let i=0;i<4;i++){
  const x=-.03+i*.02;
  P.add(new THREE.SphereGeometry(.013,6,5),at(x*1.15,-.452,.105-Math.abs(x)*.4),SKIN_HI);
  P.add(new THREE.SphereGeometry(.006,5,4),at(x*1.15,-.448,.117-Math.abs(x)*.4),NAIL);
 }
 return P.merge();
}

// a long, thick, bare arm with a hide band at the wrist and a big fist
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.07,16,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.1,.85,1]),SKIN);
 P.add(lathe([[.066,0],[.068,-.08],[.056,-.16],[.06,-.22],[.05,-.3],[.048,-.32]],18),at(0,0,0),(x,y,z)=>{
  // a ropy vein and an old scar along the forearm
  if(z>.03&&Math.abs(x+(y+.25)*.2)<.006&&y<-.18)return SCAR;
  return ramp(SKIN_DARK,SKIN,-.32,-.02)(y);
 });
 P.add(new THREE.CylinderGeometry(.05,.052,.04,10),at(0,-.31,0),(x,y,z)=>Math.sin(Math.atan2(x,z)*8)>.6?SINEW:HIDE_DARK);
 P.add(new THREE.SphereGeometry(.042,12,8),at(0,-.365,.006,[0,0,0],[.95,1.05,1]),SKIN);
 for(let k=0;k<4;k++)P.add(new THREE.SphereGeometry(.013,6,4),at(-.021+k*.014,-.375,.04),SKIN_HI);
 P.add(new THREE.CapsuleGeometry(.011,.026,2,6),at(0,-.39,.036,[0,0,Math.PI/2]),SKIN_DARK);
 return P.merge();
}

// the club: a gnarled haft thickening to a fat, knotted head studded with jagged flint shards,
// dark with old blood at the business end
function buildClub(){
 const P=pieces(),tilt=at(0,.02,0,[Math.PI/2-.55,0,0]),on=m=>new THREE.Matrix4().multiplyMatrices(tilt,m);
 const shaft=new THREE.CylinderGeometry(.034,.017,.46,9,8);
 {const p=shaft.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),k=1+Math.sin(y*41)*.12+Math.sin(Math.atan2(p.getX(i),p.getZ(i))*3+y*20)*.06;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}shaft.computeVertexNormals();}
 P.add(shaft,on(at(0,.14,0)),(x,y,z)=>mix(WOOD_DARK,WOOD,Math.sin(y*60+x*80)*.5+.5));
 P.add(new THREE.SphereGeometry(.02,8,6),on(at(0,-.09,0)),WOOD_DARK);
 // the knotted head
 const H=.36;
 P.add(new THREE.SphereGeometry(.06,14,10),on(at(0,H,0,[0,0,0],[1,1.4,1])),(x,y,z)=>{
  const g=Math.sin(x*70+y*30)*Math.sin(z*60)*.5+.5;
  return mix(mix(WOOD,WOOD_HI,g*.5),BLOOD,THREE.MathUtils.clamp((g-.55)*2,0,.7));
 });
 for(let i=0;i<4;i++){const a=i*1.7;P.add(new THREE.SphereGeometry(.026,8,6),on(at(Math.sin(a)*.05,H-.04+i*.025,Math.cos(a)*.05)),WOOD_DARK);}
 // flint shards hammered into the head, jutting at odd angles
 for(let i=0;i<7;i++){
  const a=i*2.4+.3,y=H-.06+(i%3)*.05,r=.055;
  const dir=new THREE.Vector3(Math.sin(a),(i%3-1)*.4,Math.cos(a)).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
  const e=new THREE.Euler().setFromQuaternion(q);
  const len=.04+hash(i,5)*.03;
  P.add(new THREE.ConeGeometry(.013,len,3),on(at(Math.sin(a)*r+dir.x*len*.35,y+dir.y*len*.35,Math.cos(a)*r+dir.z*len*.35,[e.x,e.y,e.z])),(x,y2,z)=>mix(FLINT,FLINT_HI,hash(i,8)*.6));
 }
 return P.merge();
}

const cache=new Map();
let material=null;
function geometry(female){
 if(!material)material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:.02,side:THREE.DoubleSide});
 const key=female?'f':'m';
 if(!cache.has(key)){
  const shared=cache.get(female?'m':'f');
  cache.set(key,{body:shared?.body??buildBody(),head:buildHead(female),leg:shared?.leg??buildLeg(),arm:shared?.arm??buildArm(),club:shared?.club??buildClub()});
 }
 return cache.get(key);
}
function mesh(parent,geo,name){const o=new THREE.Mesh(geo,material);o.castShadow=o.receiveShadow=true;o.userData.part=name;parent.add(o);return o;}

export const CAVE_KINDS=['caveman','cavewoman'];

export function createCaveman(name='caveman'){
 const female=name==='cavewoman',S=geometry(female),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 // the hunch: the head hangs low and forward of the shoulders
 const head=new THREE.Group();head.position.set(0,.93,.045);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.085,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  // the arms hang long and a little forward, held out from the bulk of the chest
  const arm=new THREE.Group();arm.position.set(s*.225,.82,.01);arm.rotation.z=s*.1;arm.rotation.x=-.08;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.club,'club');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'caveman',female,arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
