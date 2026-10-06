import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The Executioner (UnNetHack's unique headsman in the ice of Sheol) shares the humans' letter, so he
// used to be the plain `@` humanoid. He now stands as a huge, hulking headsman. A black leather sack
// hood comes to a limp point and covers the whole head, stitched down the middle, with two ragged
// eye holes where pale, ice-blue eyes burn; it falls over the shoulders as a short cape. His bare
// torso is heavy and grey with cold, scarred, rimed white with frost at the shoulders, crossed by a
// leather strap. A wide studded belt hangs with a loop of chain and an open manacle, over a long
// leather apron, dark with old blood towards the hem. His cloak of magic resistance hangs from the
// shoulders down the back in heavy grey folds, its hem torn and frosted. Heavy breeches go into
// fur-topped boots with iron toecaps. Massive bare arms end in studded leather bracers and big
// knuckled hands. In his right hand he carries Cleaver upright: a long iron-bound haft and a broad,
// bearded crescent blade, rimed with frost, its edge stained with blood.
// Each moving part (body, head, each leg and arm, the axe) is one merged, vertex-coloured mesh on
// one shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once and
// shared.
// Handles: legs, arms, arm (the axe arm), weaponSocket, head, eyes, body.

const C={
 skin:rgb('#8e8c86'),skinDark:rgb('#55524e'),skinHi:rgb('#b4b2aa'),scar:rgb('#6e4a46'),frost:rgb('#d6e2ea'),
 leather:rgb('#1c1612'),leatherHi:rgb('#3a2e24'),leatherSeam:rgb('#0a0806'),
 blood:rgb('#3e0a0a'),bloodHi:rgb('#6a1414'),
 cloak:rgb('#2e3034'),cloakDark:rgb('#16171a'),cloakHi:rgb('#4a4e54'),
 iron:rgb('#34363a'),ironHi:rgb('#70747a'),steel:rgb('#5c6268'),steelHi:rgb('#aeb6be'),steelDark:rgb('#25282c'),
 fur:rgb('#4a4238'),furHi:rgb('#6e6456'),wood:rgb('#2a1c12'),woodHi:rgb('#46301e'),shadow:rgb('#050505'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
// a tapered cylinder from point a to point b
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// a ring of downward-hanging torn points along an arc of a hem (angles a0..a1, radius r, depth zs)
function tatters(P,count,r,y,zs,a0,a1,len,w,colour,seed){
 for(let i=0;i<count;i++){
  const a=a0+(i+.5+(hash(seed+i)-.5)*.4)/count*(a1-a0),h=len*(.5+hash(seed+i+40)*.8);
  P.add(new THREE.ConeGeometry(w,h,4),at(Math.sin(a)*r,y-h/2,Math.cos(a)*r*zs,[0,a,Math.PI],[1,1,.3]),colour);
 }
}

export const HIP_Y=.47,SHOULDER_Y=.83,NECK_Y=.96;

function buildBody(){
 const P=pieces();
 // the bare torso: a deep chest over a heavy gut, grey with cold, scarred, frosted at the shoulders
 P.add(lathe([[.17,.5],[.19,.56],[.2,.62],[.19,.68],[.205,.75],[.215,.82],[.19,.88],[.12,.925],[.06,.94]],40),at(0,0,0,[0,0,0],[1,1,.82]),(x,y,z)=>{
  // three long old scars slanting across the chest and gut
  for(const [k,y0] of [[.9,.78],[-.7,.66],[.5,.6]])if(z>0&&Math.abs(y-(y0+x*k*.4))<.004&&Math.abs(x)<.12)return C.scar;
  let c=mix(C.skinDark,C.skin,clamp01((z+.08)*5)*.8+clamp01((y-.5)*2)*.2);
  // the chest and the gut swell lighter
  if(z>.1&&(Math.abs(y-.76)<.05||Math.abs(y-.6)<.04))c=mix(c,C.skinHi,.3);
  // frost on the shoulders and the top of the chest
  if(y>.84)c=mix(c,C.frost,clamp01((y-.84)*14)*(.4+hash(Math.floor(x*90)+Math.floor(z*90)*7)*.5));
  return c;
 });
 // the hips and seat in heavy breeches
 P.add(lathe([[.17,.4],[.178,.46],[.172,.53]],32),at(0,0,0,[0,0,0],[1,1,.84]),(x,y,z)=>mix(C.leather,C.leatherHi,(Math.sin(Math.atan2(x,z)*7)*.5+.5)*.4));
 P.add(new THREE.CircleGeometry(.17,24),at(0,.401,0,[Math.PI/2,0,0],[1,.84,1]),C.leather);
 // a leather strap from the left shoulder across the chest to the right hip
 P.add(new THREE.TorusGeometry(.215,.012,4,40),at(0,.7,0,[Math.PI/2,0,.62],[1,.84,1.5]),(x,y,z)=>Math.sin(Math.atan2(x,z)*30)>.85?C.ironHi:C.leatherHi);
 // the wide belt with iron studs and a square buckle
 P.add(new THREE.CylinderGeometry(.188,.188,.07,40,4,true),at(0,.53,0,[0,0,0],[1,1,.85]),(x,y,z)=>{
  const a=Math.atan2(x,z);
  if(Math.abs(y-.53)<.012&&Math.sin(a*14)>.9)return C.ironHi;
  return Math.abs(y-.53)>.03?C.leatherSeam:C.leather;
 });
 P.add(new THREE.BoxGeometry(.07,.06,.012),at(0,.53,.163),C.iron);
 P.add(new THREE.BoxGeometry(.044,.036,.014),at(0,.53,.164),C.leather);
 // a loop of chain and an open manacle hanging from the belt at the left hip
 for(let i=0;i<7;i++){
  const t=i/6,x=-.16+t*.035,y=.505-Math.sin(t*Math.PI)*.1;
  P.add(new THREE.TorusGeometry(.011,.003,4,8),at(x,y,.07-t*.03,[0,i%2?Math.PI/2:0,0]),C.ironHi);
 }
 P.add(new THREE.TorusGeometry(.03,.007,5,16,Math.PI*1.6),at(-.125,.39,.04,[0,Math.PI/2,.3]),(x,y,z)=>mix(C.iron,C.ironHi,.4));
 // the long leather apron in front, hanging from the belt to below the knee, dark with old blood
 P.add(new THREE.CylinderGeometry(.19,.21,.36,16,8,true,-.9,1.8),at(0,.33,0,[0,0,0],[1,1,.9]),(x,y,z)=>{
  let c=mix(C.leather,C.leatherHi,clamp01(Math.sin(x*40)*.5+.5)*.35);
  const stain=hash(Math.floor(x*30)*13+Math.floor(y*24))*clamp01((.38-y)*5);
  if(stain>.45)c=mix(c,stain>.75?C.bloodHi:C.blood,.8);
  if(y<.16)c=mix(c,C.leatherSeam,.5);
  return c;
 });
 tatters(P,7,.205,.15,.9,-.85,.85,.05,.032,(x,y)=>mix(C.blood,C.leather,clamp01((y-.1)*12)),23);
 // the cloak of magic resistance: heavy grey folds down the back from the shoulders, torn and frosted
 const cloak=(x,y,z)=>{
  const fold=Math.sin(Math.atan2(x,z)*11)*.5+.5;
  let c=mix(C.cloakDark,C.cloak,fold*.7+clamp01((y-.2)*1.5)*.3);
  if(y<.3)c=mix(c,C.frost,clamp01((.3-y)*5)*(.25+hash(Math.floor(x*70)*5+Math.floor(y*70))*.35));
  return c;
 };
 P.add(lathe([[.25,.2],[.24,.4],[.228,.6],[.235,.78],[.22,.88],[.16,.93]],18,Math.PI*.58,Math.PI*.84),at(0,0,0,[0,0,0],[1,1,.86]),cloak);
 tatters(P,12,.25,.21,.86,Math.PI*.6,Math.PI*1.4,.14,.036,cloak,61);
 // the cloak's clasp chain across the collarbones
 for(let i=0;i<9;i++){const t=i/8-.5;P.add(new THREE.TorusGeometry(.008,.0025,4,8),at(t*.26,.855+Math.abs(t)*.02,.145-Math.abs(t)*.06,[0,i%2?Math.PI/2:0,0]),C.ironHi);}
 // the thick neck
 P.add(new THREE.CylinderGeometry(.058,.07,.08,14),at(0,.94,0),C.skinDark);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the black leather sack hood: the whole head, coming to a limp point bent back; head centre at .1
 const hood=(x,y,z)=>{
  // stitched down the middle, over the crown
  if(Math.abs(x)<.004&&Math.sin(y*260)>0)return C.leatherSeam;
  return mix(C.leather,C.leatherHi,clamp01(z*6+.3)*.5+clamp01(y*2)*.2);
 };
 P.add(new THREE.SphereGeometry(.1,24,18),at(0,.1,0,[0,0,0],[.96,1.08,1]),(x,y,z)=>{
  // the two ragged eye holes, sunk black around the eyes
  for(const s of [-1,1])if(z>.05&&Math.hypot(x-s*.036,(y-.115)*1.4)<.022+hash(Math.floor(Math.atan2(y-.115,x-s*.036)*3)+s)*.004)return C.shadow;
  return hood(x,y,z);
 });
 // the point, limp and leaning back
 P.add(new THREE.ConeGeometry(.07,.1,14),at(0,.205,-.012,[-.25,0,0]),hood);
 P.add(new THREE.ConeGeometry(.034,.07,10),at(0,.265,-.045,[-.95,0,0]),hood);
 // the hood falls over the shoulders as a short cape, its edge cut ragged
 P.add(lathe([[.075,.03],[.12,-.01],[.2,-.06],[.235,-.085]],32),at(0,0,0,[0,0,0],[1,1,.88]),(x,y,z)=>mix(C.leatherSeam,C.leather,clamp01((y+.09)*12)));
 tatters(P,16,.232,-.083,.88,0,Math.PI*2,.045,.03,C.leatherSeam,91);
 // a crude stitched seam where the cape meets the hood
 P.add(new THREE.TorusGeometry(.08,.004,4,28),at(0,.03,0,[Math.PI/2,0,0],[1,.92,1]),C.leatherHi);
 return P.merge();
}
// pale, ice-blue eyes burning in the hood's holes
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.008,8,6),at(s*.036,.113,.09,[0,0,s*.25],[1.4,.7,.6]),[1,1,1]);
 return P.merge();
}

// heavy breeches into fur-topped boots with iron toecaps, rimed with frost
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.074,0],[.076,-.08],[.066,-.18],[.056,-.24]],14),at(0,0,0),(x,y,z)=>mix(C.leather,C.leatherHi,(Math.sin(Math.atan2(x,z)*5)*.5+.5)*.4));
 P.add(new THREE.CylinderGeometry(.056,.05,.2,14),at(0,-.34,0),(x,y,z)=>mix(C.leather,C.frost,clamp01((-.4-y)*6)*.3));
 // the fur cuff
 P.add(new THREE.TorusGeometry(.064,.022,6,16),at(0,-.25,0,[Math.PI/2,0,0]),(x,y,z)=>hash(Math.floor(Math.atan2(x,z)*8)*3+Math.floor(y*200))>.5?C.furHi:C.fur);
 // the boot and its iron toecap
 P.add(new THREE.SphereGeometry(.054,12,8),at(0,-.44,.035,[0,0,0],[.85,.52,1.55]),(x,y,z)=>mix(C.leatherSeam,C.leather,clamp01((y+.46)*20)));
 P.add(new THREE.SphereGeometry(.036,10,6,0,Math.PI*2,0,Math.PI/2),at(0,-.452,.08,[Math.PI/2-.3,0,0],[1.1,1,.7]),C.ironHi);
 P.add(new THREE.BoxGeometry(.094,.014,.17),at(0,-.466,.03),C.leatherSeam);
 return P.merge();
}

// a massive bare arm, a studded leather bracer and a big knuckled hand
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.074,16,10),at(0,-.02,0,[0,0,0],[1,1,1]),(x,y,z)=>y>.02?mix(C.skin,C.frost,.45):C.skin);
 P.add(lathe([[.066,-.02],[.072,-.1],[.06,-.17],[.054,-.2]],16),at(0,0,0),(x,y,z)=>mix(C.skinDark,C.skin,clamp01(z*12+.5)));
 // the bracer, thick leather with three rows of iron studs
 P.add(new THREE.CylinderGeometry(.058,.05,.15,14),at(0,-.27,0),(x,y,z)=>Math.abs(y+.27)>.065?C.leatherSeam:C.leather);
 for(let r=0;r<3;r++)for(let k=0;k<6;k++){const a=k/6*Math.PI*2+r*.5;P.add(new THREE.SphereGeometry(.007,5,4),at(Math.sin(a)*.056,-.225-r*.045,Math.cos(a)*.056),C.ironHi);}
 // the big hand, the fingers curled round a grip
 P.add(new THREE.SphereGeometry(.036,12,8),at(0,-.365,.006,[0,0,0],[.95,1.1,.95]),C.skin);
 for(let k=0;k<4;k++)P.add(new THREE.SphereGeometry(.013,6,5),at(-.021+k*.014,-.382,.03),(x,y,z)=>z>.035?C.skinHi:C.skinDark);
 limb(P,[.026,-.35,.012],[.032,-.384,.03],.011,.009,C.skin,6);// the thumb
 return P.merge();
}

// Cleaver: a long iron-bound haft held upright, a broad bearded crescent blade at the top, rimed
// with frost and stained along the edge. Built along +y from the grip, the blade facing +z.
function buildAxe(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.016,.019,1.02,8,10),at(0,.2,0),(x,y,z)=>{
  if(y<.06&&y>-.1)return Math.sin(y*220)>0?C.leather:C.leatherHi;// the grip wrapping
  if(Math.abs(y-.36)<.02||Math.abs(y-.16)<.012)return C.iron;// iron bands
  return mix(C.wood,C.woodHi,(Math.sin(Math.atan2(x,z)*3+y*9)*.5+.5)*.6);
 });
 P.add(new THREE.SphereGeometry(.026,8,6),at(0,-.31,0,[0,0,0],[1,.8,1]),C.iron);// the pommel
 // iron langets running down the haft from the head
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.006,.2,.022),at(s*.018,.6,0),C.iron);
 P.add(new THREE.CylinderGeometry(.026,.026,.12,8),at(0,.66,0),C.iron);
 P.add(new THREE.ConeGeometry(.016,.08,5),at(0,.75,0),C.ironHi);// the top spike
 // the blade: drawn in z (forward, toward the edge) and y, a long beard sweeping down
 const shape=new THREE.Shape();
 shape.moveTo(.02,.71);shape.lineTo(.09,.75);shape.lineTo(.17,.8);
 for(let k=1;k<=18;k++){
  const t=k/18,a=Math.PI*.5-t*Math.PI*1.05,notch=hash(k+3)>.82?.012:0;
  shape.lineTo(.07+(.13-notch)*Math.cos(a)*1.05,.62+.19*Math.sin(a));
 }
 shape.lineTo(.11,.45);shape.lineTo(.07,.5);shape.lineTo(.04,.58);shape.lineTo(.02,.6);shape.lineTo(.02,.71);
 const blade=new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false}).translate(0,0,-.006);
 P.add(blade,at(0,0,0,[0,-Math.PI/2,0]),(x,y,z)=>{
  const edge=Math.hypot(z-.07,(y-.62)/1.4);
  if(edge>.118)return hash(Math.floor(y*50)+7)>.5?C.bloodHi:C.steelHi;
  let c=mix(C.steelDark,C.steel,clamp01(z*7));
  // frost creeping in from the back of the blade
  if(z<.08)c=mix(c,C.frost,clamp01((.08-z)*10)*hash(Math.floor(y*80)*11+Math.floor(z*80))*.7);
  return c;
 });
 // a back spike behind the head
 P.add(new THREE.ConeGeometry(.012,.07,4),at(0,.66,-.05,[-Math.PI/2,0,0]),C.ironHi);
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[.3,0,0]));
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(),axe:buildAxe(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.1,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#dff4ff',emissive:'#7ac8ff',emissiveIntensity:1.8,roughness:.2,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createExecutioner(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.22);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.012);head.rotation.x=.08;body.add(head);// head low, glowering
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.085,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.24,SHOULDER_Y,0);arm.rotation.z=s*.12;body.add(arm);mesh(arm,S.arm,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.axe,'cleaver',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'executioner',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
