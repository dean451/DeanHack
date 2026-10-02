import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
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
// The neanderthal (the Caveman quest's guardian) used to be the plain '@' humanoid too. It shares
// the legs and arms but is broader in the chest (the body is the caveman's, widened, with its arms
// set further out), and wears a grey wolf's pelt: the mantle over the shoulders, torn along the
// hem, its forepaws knotted across the chest, and the wolf's own head worn as a hood, so the
// beast's snout and upper fangs hang over the brow and its empty eye sockets stare above the
// wearer's. Under it: a long, low skull, a still heavier brow, small amber eyes, a huge nose, a
// chinless jaw with bared teeth, a wild auburn beard, and a band of red ochre smeared across the
// eyes with streaks down the cheeks. It carries a thrusting spear: a gnarled haft with a knapped
// flint point bound on with sinew, dark with old blood. Same 7 draws and the same material, plus
// one small glowing mesh for the amber eyes (handle `eyes`, on the head): 8 draws.

const SKIN=rgb('#9c7252'),SKIN_DARK=rgb('#5e3e2a'),SKIN_HI=rgb('#b88a66'),ASH=rgb('#2a2622'),SCAR=rgb('#c49a80');
const HAIR=rgb('#16120e'),HAIR_HI=rgb('#34281e'),BONE=rgb('#d6cab0'),BONE_DARK=rgb('#7e705a');
const HIDE=rgb('#7a5a3a'),HIDE_DARK=rgb('#3e2a1a'),HIDE_PALE=rgb('#a88a64'),SINEW=rgb('#8a7454');
const TOOTH=rgb('#c8b88a'),GUM=rgb('#3a1410'),EYE=rgb('#c8c0a0'),PUPIL=rgb('#140c08'),NAIL=rgb('#4a3a2a');
const WOOD=rgb('#5a3e24'),WOOD_DARK=rgb('#2e1e12'),WOOD_HI=rgb('#7e5a36'),FLINT=rgb('#3a3a40'),FLINT_HI=rgb('#8a8a94');
const BLOOD=rgb('#3a0c08');
const FUR=rgb('#6a6258'),FUR_DARK=rgb('#2e2a26'),FUR_HI=rgb('#a29888'),OCHRE=rgb('#8e2c16');
const AUBURN=rgb('#3e1e10'),AUBURN_HI=rgb('#6a3a20'),AMBER_SLIT=rgb('#3a1c06'),CLAW=rgb('#1e1a16');

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

// wolf fur: grey with darker guard hairs streaking down, paler at the tips
const fur=(x,y,z)=>{const s=Math.sin(Math.atan2(x,z)*31+y*40)*.5+.5,t=Math.sin(y*70+x*23)*.5+.5;return mix(mix(FUR_DARK,FUR,s),FUR_HI,t*t*.35);};
const auburn=(x,y,z)=>{const s=Math.sin(Math.atan2(x,z)*21+y*85)*.5+.5;return mix(AUBURN,AUBURN_HI,s*s*.7);};

// the caveman's body widened, under a wolf-pelt mantle with the forepaws knotted at the chest
function buildNeanderthalBody(base){
 const wide=base.clone().scale(1.08,1,1.08);
 const P=pieces();
 // the mantle: over both shoulders and down the back, open at the front, torn at the hem
 P.add(tear(lathe([[.1,.96],[.17,.93],[.235,.87],[.255,.8],[.25,.72],[.24,.64]],30,Math.PI*.3,Math.PI*1.4),.64,.08,6,11),at(0,0,0,[0,0,0],[1.08,1,.95]),fur);
 // the forepaws, slung over the shoulders and knotted together over the breastbone
 for(const s of [-1,1]){
  const from=new THREE.Vector3(s*.2,.87,.1),to=new THREE.Vector3(s*.035,.77,.225),mid=from.clone().lerp(to,.5),dir=to.clone().sub(from);
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize()),e=new THREE.Euler().setFromQuaternion(q);
  P.add(new THREE.CapsuleGeometry(.024,dir.length(),3,8),at(mid.x,mid.y,mid.z,[e.x,e.y,e.z]),fur);
  // the paw dangling below the knot, black claws hooked out
  P.add(new THREE.SphereGeometry(.03,10,6),at(s*.04,.71,.232,[0,0,0],[.9,1.2,.7]),fur);
  for(let k=0;k<3;k++)P.add(new THREE.ConeGeometry(.005,.026,4),at(s*.04+(k-1)*.014,.68,.247,[Math.PI+.4,0,(k-1)*.2]),CLAW);
 }
 P.add(new THREE.SphereGeometry(.032,10,8),at(0,.77,.23,[0,0,0],[1.3,.9,.8]),fur);
 const extra=P.merge(),geo=mergeGeometries([wide,extra]);
 wide.dispose();extra.dispose();
 return geo;
}

// a long, low skull under the wolf's head; ochre across the eyes
function buildNeanderthalHead(){
 const P=pieces();
 const ochre=(x,y,z,base)=>z>.04&&y>.098&&y<.128?mix(base,OCHRE,.85):base;
 P.add(new THREE.SphereGeometry(.1,20,16),at(0,.1,-.012,[0,0,0],[1,.86,1.16]),(x,y,z)=>{
  if(z<-.03||y>.16)return auburn(x,y,z);
  return ochre(x,y,z,y<.07?SKIN_DARK:SKIN);
 });
 // the occipital bun swelling out behind
 P.add(new THREE.SphereGeometry(.06,12,8),at(0,.1,-.1,[0,0,0],[1.2,.9,1]),auburn);
 // the brow: a massive shelf with a lobe over each eye
 P.add(new THREE.CapsuleGeometry(.031,.1,3,10),at(0,.133,.08,[0,0,Math.PI/2],[1,1,.85]),(x,y,z)=>y>.14?SKIN_HI:ochre(x,y,z,SKIN_DARK));
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.03,10,8),at(s*.037,.135,.088,[0,0,0],[1.1,.8,.8]),(x,y,z)=>y>.14?SKIN_HI:ochre(x,y,z,SKIN_DARK));
  // the dark pits the eyes sit in, sunk under the brow (the eyes themselves are their own mesh)
  P.add(new THREE.SphereGeometry(.015,8,6),at(s*.036,.111,.078,[0,0,0],[1.25,.7,.5]),PUPIL);
  // and a beast's slit pupil, laid over the glowing eye
  P.add(new THREE.CapsuleGeometry(.0018,.0045,2,6),at(s*.036,.11,.0905,[0,0,-s*.2],[1,1,.4]),AMBER_SLIT);
  // cheeks, each with two ochre streaks clawed down it
  P.add(new THREE.SphereGeometry(.028,10,8),at(s*.052,.082,.064,[0,0,0],[1,.75,.8]),(x,y,z)=>Math.abs(Math.sin((x-s*.052)*170))<.35&&z>.07?OCHRE:SKIN);
  P.add(new THREE.SphereGeometry(.022,8,6),at(s*.094,.1,-.012,[0,0,0],[.45,1,.75]),SKIN_DARK);
 }
 // a huge, broad nose
 P.add(new THREE.SphereGeometry(.03,12,8),at(0,.083,.105,[0,0,0],[1.4,.95,.85]),SKIN_HI);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.007,6,4),at(s*.016,.071,.119),PUPIL);
 // the jaw thrust forward, with no chin, on a row of bared teeth
 P.add(new THREE.SphereGeometry(.075,14,10),at(0,.034,.045,[0,0,0],[1.12,.66,1.08]),SKIN_DARK);
 P.add(new THREE.BoxGeometry(.066,.013,.012),at(0,.052,.11),GUM);
 for(let i=0;i<7;i++){
  const x=-.03+i*.01,h=.008+hash(i,6)*.009;
  P.add(new THREE.BoxGeometry(.007,h,.006),at(x,.058-h/2+.004,.114,[0,0,(hash(i,3)-.5)*.4]),mix(TOOTH,BONE_DARK,hash(i,7)*.6));
 }
 // a wild beard, longer and wider than the caveman's
 P.add(new THREE.SphereGeometry(.068,12,8),at(0,.005,.052,[.3,0,0],[1.15,.9,.8]),auburn);
 for(let i=0;i<7;i++)P.add(new THREE.ConeGeometry(.013,.07+hash(i,2)*.03,5),at(-.054+i*.018,-.04,.058,[Math.PI+.25,0,(i-3)*.09]),auburn);
 // the wolf's head worn as a hood: its skull over the crown, its snout over the brow
 P.add(new THREE.SphereGeometry(.1,18,12,0,Math.PI*2,0,Math.PI*.5),at(0,.135,-.01,[-.12,0,0],[1.06,.95,1.12]),fur);
 P.add(new THREE.CapsuleGeometry(.032,.07,3,10),at(0,.19,.125,[Math.PI/2+.2,0,0],[1.05,1,.8]),(x,y,z)=>z>.19?FUR_DARK:fur(x,y,z));
 P.add(new THREE.SphereGeometry(.013,8,6),at(0,.18,.198),CLAW);
 // its upper fangs hanging over the brow
 for(const s of [-1,1]){
  P.add(new THREE.ConeGeometry(.0065,.04,5),at(s*.02,.15,.17,[Math.PI+.1,0,0]),TOOTH);
  for(const k of [.35,.7])P.add(new THREE.ConeGeometry(.004,.016,4),at(s*.02*k,.158,.188,[Math.PI,0,0]),TOOTH);
  // the empty eye sockets, and the ears still pricked
  P.add(new THREE.SphereGeometry(.012,8,6),at(s*.042,.2,.07,[0,0,0],[1.3,.8,.6]),FUR_DARK);
  P.add(new THREE.ConeGeometry(.024,.06,4),at(s*.058,.255,-.005,[-.2,0,-s*.3]),fur);
 }
 // the pelt falls down the back of the neck in a torn flap
 P.add(tear(lathe([[.105,.12],[.115,.04],[.12,-.04],[.125,-.1]],18,Math.PI*.6,Math.PI*.8),-.1,.05,4,5),at(0,0,-.015,[0,0,0],[1,1,1.05]),fur);
 return P.merge();
}

// small amber eyes sunk under the brow, glowing faintly like a beast's caught in firelight: one
// mesh with its own glow material, so eye-flare.js can make them live. Each is a slanted almond
// set just proud of its dark pit; the slit pupils over them are part of the head.
function buildNeanderthalEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.012,10,6),at(s*.036,.11,.084,[0,0,-s*.2],[1.25,.6,.5]),[1,1,1]);
 return P.merge();
}

// the spear: a gnarled haft with a knapped, leaf-shaped flint point bound on with sinew
const SPEAR_LEN=1.1,SPEAR_GRIP=.36,SPEAR_TILT=.7;
function buildSpear(){
 const P=pieces(),tilt=at(0,.02,0,[SPEAR_TILT,0,0]),on=m=>new THREE.Matrix4().multiplyMatrices(tilt,m);
 const top=SPEAR_LEN-SPEAR_GRIP;
 const haft=new THREE.CylinderGeometry(.014,.018,SPEAR_LEN,8,16);
 {const p=haft.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),k=1+Math.sin(y*37)*.1;p.setX(i,p.getX(i)*k+Math.sin(y*6)*.006);p.setZ(i,p.getZ(i)*k);}haft.computeVertexNormals();}
 P.add(haft,on(at(0,SPEAR_LEN/2-SPEAR_GRIP,0)),(x,y,z)=>mix(WOOD_DARK,WOOD,Math.sin(y*55+x*90)*.5+.5));
 // a knot halfway up and the butt charred to a point
 P.add(new THREE.SphereGeometry(.022,8,6),on(at(.008,.2,0,[0,0,0],[1,1.4,1])),WOOD_DARK);
 P.add(new THREE.ConeGeometry(.016,.06,8),on(at(0,-SPEAR_GRIP-.03,0,[Math.PI,0,0])),ASH);
 // the point: a flat, leaf-shaped flake, chipped facets along both edges, bloodied at the tip
 const L=.17,W=.032,T=.009,pts=[];
 for(let i=0;i<=10;i++){const t=i/10,w=Math.sin(Math.PI*Math.pow(t,.7))*W*(1-t*.25)*(1+(i%2?-.18:.12));pts.push([t*L,w]);}
 const blade=new THREE.BufferGeometry(),pos=[];
 for(let i=0;i<10;i++){
  const [y0,w0]=pts[i],[y1,w1]=pts[i+1];
  for(const s of [-1,1])for(const f of [-1,1]){
   // each face rises to a ridge down the middle
   pos.push(0,y0,f*T, s*w0,y0,0, s*w1,y1,0, 0,y0,f*T, s*w1,y1,0, 0,y1,f*T*(i===9?0:1));
  }
 }
 blade.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));blade.computeVertexNormals();
 P.add(blade,on(at(0,top-.01,0)),(x,y,z)=>{const t=(y-top)/L;return mix(mix(FLINT,FLINT_HI,Math.abs(Math.sin(y*260))*.5),BLOOD,THREE.MathUtils.clamp((t-.55)*2,0,.75));});
 // the sinew lashing the point into the split haft
 for(let i=0;i<4;i++)P.add(new THREE.TorusGeometry(.019,.005,4,12).rotateX(Math.PI/2),on(at(0,top-.035+i*.014,0,[0,0,(i%2?.25:-.25)])),i%2?SINEW:HIDE_DARK);
 return P.merge();
}

const cache=new Map();
let material=null,glow=null;
function geometry(female){
 if(!material)material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:.02,side:THREE.DoubleSide});
 if(female==='neanderthal'){
  if(!glow)glow=new THREE.MeshStandardMaterial({color:'#ffd27a',emissive:'#e08a1c',emissiveIntensity:1.1,roughness:.25,metalness:0});
  if(!cache.has('n')){const m=geometry(false);cache.set('n',{body:buildNeanderthalBody(m.body),head:buildNeanderthalHead(),eyes:buildNeanderthalEyes(),leg:m.leg,arm:m.arm,club:buildSpear()});}
  return cache.get('n');
 }
 const key=female?'f':'m';
 if(!cache.has(key)){
  const shared=cache.get(female?'m':'f');
  cache.set(key,{body:shared?.body??buildBody(),head:buildHead(female),leg:shared?.leg??buildLeg(),arm:shared?.arm??buildArm(),club:shared?.club??buildClub()});
 }
 return cache.get(key);
}
function mesh(parent,geo,name,m=material){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===material;o.userData.part=name;parent.add(o);return o;}

export const CAVE_KINDS=['caveman','cavewoman','neanderthal'];

export function createCaveman(name='caveman'){
 const neanderthal=name==='neanderthal',female=name==='cavewoman',S=geometry(neanderthal?'neanderthal':female),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 // the hunch: the head hangs low and forward of the shoulders
 const head=new THREE.Group();head.position.set(0,.93,.045);body.add(head);
 mesh(head,S.head,'head');
 const eyes=neanderthal?mesh(head,S.eyes,'eyes',glow):null;
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.085,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  // the arms hang long and a little forward, held out from the bulk of the chest
  const arm=new THREE.Group();arm.position.set(s*(neanderthal?.245:.225),.82,.01);arm.rotation.z=s*.1;arm.rotation.x=-.08;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.club,neanderthal?'spear':'club');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:neanderthal?'neanderthal':'caveman',female,arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
