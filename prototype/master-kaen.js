import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Master Kaen (the Monk quest's nemesis) shares the humans' letter, so he used to be the plain `@`
// humanoid. He now looms as a hulking, ancient ki master gone cold and cruel: broad and bare to the
// waist, his skin ash grey and hard as stone, slabbed with muscle, scarred, and inked with black
// columns of sutras down the back and in bands round the arms. His head is shaven and gaunt under a
// heavy brow, with long-lobed ears, a thin cruel mouth and a long white moustache whose two strands
// hang down past the chin; a white queue falls from a topknot down his back. Over his eyes he has
// bound the Eyes of the Overworld, the quest's artifact: two round crystal lenses in heavy iron rims on
// an iron band round the head, burning a cold white-blue. A rosary of black iron beads strung with
// three small skulls is slung from the left shoulder to the right hip. A black sash is knotted at the
// left hip, its ends torn into points. Wide charcoal trousers, frayed into jagged tatters below the
// knee, are bound at the shins with black wraps above bare grey feet with long black-nailed toes. His
// forearms are wrapped in black cloth studded with iron, and his big hands are hooked into claws (he
// fights barehanded: claws, the samurai's stunning blows and clerical spells), the knuckles black with
// old callus.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured mesh on one shared
// material, plus one small glowing mesh for the lenses: 7 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the right), weaponSocket (empty, at the right hand), head, eyes, body.

const C={
 skin:rgb('#8a8a86'),skinHi:rgb('#b0aea6'),skinDark:rgb('#4a4a48'),shadow:rgb('#070708'),lip:rgb('#3a2e2e'),
 ink:rgb('#141418'),scar:rgb('#c2b0a4'),callus:rgb('#222022'),nail:rgb('#0c0a0a'),
 hair:rgb('#e4e0d6'),hairDark:rgb('#9a968c'),
 cloth:rgb('#2a2a2c'),clothDark:rgb('#0e0e10'),clothHi:rgb('#46464a'),
 sash:rgb('#101012'),sashHi:rgb('#2c2a2e'),
 iron:rgb('#2e3034'),ironHi:rgb('#787c84'),ironDark:rgb('#121316'),
 bone:rgb('#d2c8a8'),boneDark:rgb('#867a5c'),
};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const up=new THREE.Vector3(0,1,0);
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// a cone from `top` along `dir` (a torn point, a claw)
function spike(P,top,dir,len,r,colour,seg=4){
 const D=new THREE.Vector3(...dir).normalize(),T=new THREE.Vector3(...top);
 P.add(new THREE.ConeGeometry(r,len,seg),new THREE.Matrix4().compose(T.clone().addScaledVector(D,len/2),new THREE.Quaternion().setFromUnitVectors(up,D),new THREE.Vector3(1,1,1)),colour);
}
// columns of sutra glyphs: short dark strokes in rows, some missing, in a column `w` wide
function sutra(u,v,w=.012){
 const col=Math.floor(u/w),row=Math.floor(v/.014),fu=u/w-col,fv=v/.014-row;
 if(col%2)return false;// a gap between columns
 const n=hash(col*31+row*7);
 if(n<.25)return false;
 return n>.7?(fv>.2&&fv<.75&&fu>.35&&fu<.6):(fv>.35&&fv<.6&&fu>.15&&fu<.85);
}
// ash-grey skin, darker into the hollows round the sides
const skinAt=(x,z,lo=.7)=>mix(C.skinDark,C.skin,clamp01(z*lo*10+.55));

export const HIP_Y=.47,SHOULDER_Y=.83,NECK_Y=.97;

function buildBody(){
 const P=pieces();
 // the slabbed torso: a narrow waist flaring to a huge chest and shoulders
 P.add(lathe([[.15,.44],[.15,.5],[.145,.56],[.165,.64],[.205,.73],[.23,.8],[.21,.86],[.14,.92],[.065,.955]],40),at(0,0,0,[0,0,0],[1,1,.68]),(x,y,z)=>{
  // sutras in columns down the back, between the shoulder blades
  if(z<-.06&&y>.56&&y<.86&&Math.abs(x)<.11&&sutra(x+.11,.86-y))return C.ink;
  // an old diagonal scar across the belly
  if(z>.07&&Math.abs(y-.6-x*.6)<.004&&Math.abs(x)<.09)return C.scar;
  let c=skinAt(x,z);
  if(z>.05){
   // the abdominal grid and the line under the pecs
   if(y>.5&&y<.68&&(Math.abs(x)<.006||[.545,.59,.635].some(h=>Math.abs(y-h)<.005)))c=mix(c,C.skinDark,.75);
   if(Math.abs(y-.7+Math.abs(x)*.15)<.008&&Math.abs(x)<.15)c=mix(c,C.skinDark,.8);
  }
  if(z<-.05&&Math.abs(x)<.012)c=mix(c,C.skinDark,.6);// the spine's groove
  return mix(c,C.skinHi,clamp01((y-.76)*6)*clamp01(Math.abs(x)*6)*.5);// light on the shoulders
 });
 // the pecs, the trapezius rising to the neck, and the shoulder blades
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.07,16,12),at(s*.075,.75,.085,[0,s*.3,0],[1.1,.75,.55]),(x,y,z)=>mix(C.skinDark,C.skinHi,clamp01((y-.71)*14+(z-.1)*12)));
  P.add(new THREE.SphereGeometry(.06,12,8),at(s*.08,.89,-.02,[0,0,s*.6],[1.4,.6,.9]),(x,y,z)=>mix(C.skin,C.skinHi,clamp01((y-.88)*20)));
  P.add(new THREE.SphereGeometry(.06,12,8),at(s*.08,.78,-.1,[0,0,0],[1,1.2,.5]),(x,y,z)=>sutra(Math.abs(x)+.2,.86-y,.01)?C.ink:skinAt(x,-z));
 }
 // the thick neck
 P.add(new THREE.CylinderGeometry(.055,.075,.1,14),at(0,.96,0),(x,y,z)=>mix(C.skinDark,C.skin,clamp01(z*14+.5)));
 // the charcoal trousers over the hips
 P.add(new THREE.CylinderGeometry(.16,.18,.13,32,1,true),at(0,.425,0,[0,0,0],[1,1,.8]),(x,y,z)=>{
  const fold=Math.sin(Math.atan2(x,z)*11)*.5+.5;
  return mix(C.clothDark,mix(C.cloth,C.clothHi,fold*.5),.5+fold*.5);
 });
 P.add(new THREE.CircleGeometry(.18,24),at(0,.36,0,[Math.PI/2,0,0],[1,.8,1]),C.clothDark);
 // the black sash, knotted at the left hip with two ends torn into points
 P.add(new THREE.TorusGeometry(.158,.026,6,40),at(0,.5,0,[Math.PI/2,0,0],[1,.72,1.3]),(x,y,z)=>mix(C.sash,C.sashHi,clamp01(Math.sin(Math.atan2(x,z)*12)*.5+.5)));
 P.add(new THREE.SphereGeometry(.03,8,6),at(-.12,.495,.075),C.sashHi);
 for(const [dx,a,len] of [[-.012,.18,.2],[.012,-.08,.16]]){
  P.add(new THREE.BoxGeometry(.036,len,.008),at(-.125+dx,.49-len/2,.085,[.12,0,a]),(x,y,z)=>mix(C.sash,C.sashHi,clamp01((y-.3)*4)));
  for(let k=0;k<3;k++)spike(P,[-.125+dx-.012+k*.012-Math.sin(a)*len*.5,.49-len,.087],[-Math.sin(a)*.4,-1,.12],.025+hash(k+dx*99)*.03,.007,C.sash,3);
 }
 // the rosary: black iron beads slung from the left shoulder to the right hip, with three skulls
 const N=44,tilt=-.78,cs=Math.cos(tilt),sn=Math.sin(tilt);
 for(let i=0;i<N;i++){
  const t=i/N*Math.PI*2,lx=Math.cos(t)*.25,lz=Math.sin(t)*.19;
  const x=lx*cs,y=.68+lx*sn,z=lz-.005;
  if(z>.05&&i%7===3){
   // a small skull, facing out
   P.add(new THREE.SphereGeometry(.024,10,8),at(x,y,z+.012,[0,0,0],[.9,1,.9]),(px,py,pz)=>{
    for(const s of [-1,1])if(pz>z+.026&&Math.hypot(px-x-s*.009,py-y-.002)<.007)return C.shadow;
    return mix(C.boneDark,C.bone,clamp01((pz-z)*40));
   });
   P.add(new THREE.BoxGeometry(.022,.01,.016),at(x,y-.021,z+.018),C.boneDark);
  }else P.add(new THREE.IcosahedronGeometry(.016,0),at(x,y,z,[i,i*.7,0]),(px,py,pz)=>mix(C.ironDark,C.ironHi,clamp01((py-y)*40+.3)));
 }
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the shaven, gaunt head; head centre at .1
 P.add(new THREE.SphereGeometry(.085,24,18),at(0,.1,0,[0,0,0],[.88,1.08,.98]),(x,y,z)=>{
  // the eye pits under the lenses
  for(const s of [-1,1])if(z>.05&&Math.hypot(x-s*.03,(y-.102)*1.3)<.02)return C.shadow;
  // the thin, cruel mouth, its corners turned down
  if(z>.06&&Math.abs(y-(.048-Math.abs(x)*.25))<.003&&Math.abs(x)<.026)return C.lip;
  // a band of sutras round the crown
  if(y>.16&&y<.185&&z<.04&&sutra(Math.atan2(x,z)+Math.PI,y-.16,.12))return C.ink;
  let c=skinAt(x,z,.9);
  if(z>.03&&Math.abs(x)>.034&&y<.08&&y>.04)c=mix(c,C.skinDark,.6);// hollow cheeks
  return mix(c,C.skinHi,clamp01((y-.15)*14)*.6);// the bald crown catching light
 });
 // the heavy brow ridge, the cheekbones, the hooked nose and the long-lobed ears
 P.add(new THREE.CapsuleGeometry(.014,.06,4,10),at(0,.128,.064,[0,0,Math.PI/2],[1,1,.7]),(x,y,z)=>mix(C.skinDark,C.skin,clamp01((y-.12)*60)));
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.015,8,6),at(s*.044,.085,.058,[0,0,0],[1.2,.6,.8]),C.skin);
 P.add(new THREE.ConeGeometry(.012,.048,8),at(0,.088,.09,[Math.PI/2+.45,0,0]),(x,y,z)=>mix(C.skinDark,C.skin,clamp01(y*8-.5)));
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.018,10,8),at(s*.077,.095,.005,[0,0,s*.1],[.45,1.3,.9]),C.skinDark);
  P.add(new THREE.SphereGeometry(.011,8,6),at(s*.076,.052,.012,[0,0,0],[.6,1.3,.8]),C.skin);// the lobes
 }
 // the long white moustache: two strands from the lip corners, hanging past the chin
 for(const s of [-1,1]){
  const pts=[[s*.012,.06,.08],[s*.03,.05,.078],[s*.04,.025,.07],[s*.042,-.01,.064],[s*.04,-.05,.06],[s*.036,-.09,.058],[s*.032,-.125,.056]];
  for(let i=0;i<pts.length-1;i++)limb(P,pts[i],pts[i+1],.0055-i*.0006,.005-i*.0006,i>3?C.hairDark:C.hair,5);
  spike(P,pts[pts.length-1],[0,-1,-.1],.025,.0025,C.hairDark,4);
 }
 // the topknot and the white queue falling down the back
 P.add(new THREE.SphereGeometry(.022,10,8),at(0,.185,-.04,[0,0,0],[1,.8,1]),C.hair);
 P.add(new THREE.TorusGeometry(.016,.004,4,10),at(0,.175,-.045,[Math.PI/2-.4,0,0]),C.ironDark);
 for(let i=0;i<10;i++){
  const t=i/9;
  P.add(new THREE.SphereGeometry(.017-t*.009,7,5),at((i%2?.006:-.006)*(1-t*.5),.16-i*.045,-.075-Math.sin(t*1.6)*.06,[0,0,i%2?.5:-.5],[1,1.5,.9]),(x,y,z)=>mix(C.hairDark,C.hair,clamp01(((y+1)%.045)*25)));
 }
 // the Eyes of the Overworld: an iron band round the head and two heavy iron rims over the eyes
 P.add(new THREE.TorusGeometry(.084,.006,4,36),at(0,.104,-.002,[Math.PI/2,0,0],[1,1.02,1]),(x,y,z)=>mix(C.ironDark,C.ironHi,clamp01((y-.1)*80+.4)));
 for(const s of [-1,1]){
  P.add(new THREE.TorusGeometry(.019,.006,6,20),at(s*.031,.103,.078,[0,s*.32,0]),(x,y,z)=>mix(C.iron,C.ironHi,clamp01((y-.1)*50+.5)));
  for(let k=0;k<3;k++){const a=k/3*Math.PI*2+.5;P.add(new THREE.SphereGeometry(.003,4,3),at(s*.031+Math.cos(a)*.019,.103+Math.sin(a)*.019,.084),C.ironHi);}// rivets
 }
 P.add(new THREE.BoxGeometry(.016,.007,.012),at(0,.106,.084),C.iron);// the bridge
 return P.merge();
}
// the two crystal lenses, burning cold white-blue in their rims
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0155,12,8),at(s*.031,.103,.08,[0,s*.32,0],[1,1,.4]),[1,1,1]);
 return P.merge();
}

// wide charcoal trousers frayed into tatters below the knee, black shin wraps, a bare grey foot
function buildLeg(){
 const P=pieces();
 const trouser=lathe([[.07,0],[.082,-.1],[.088,-.2],[.08,-.27]],18);
 P.add(trouser,at(0,0,0),(x,y,z)=>{
  const fold=Math.sin(Math.atan2(x,z)*7+y*9)*.5+.5;
  return mix(C.clothDark,mix(C.cloth,C.clothHi,fold*.5),.4+fold*.6);
 });
 for(let i=0;i<10;i++){
  const a=i/10*Math.PI*2+hash(i+20)*.4;
  spike(P,[Math.sin(a)*.078,-.268,Math.cos(a)*.078],[Math.sin(a)*.25,-1,Math.cos(a)*.25],.035+hash(i+30)*.05,.024,C.clothDark,3);
 }
 P.add(new THREE.CylinderGeometry(.04,.036,.15,12,6),at(0,-.355,0),(x,y)=>Math.sin(y*300+x*60)>0?C.sash:C.sashHi);
 P.add(new THREE.SphereGeometry(.042,12,8),at(0,-.45,.06,[0,0,0],[.9,.45,1.9]),(x,y,z)=>mix(C.skinDark,C.skin,clamp01((y+.46)*40)));
 for(let k=0;k<5;k++){
  const x=-.026+k*.013,len=.03+(k===1?.008:0)-Math.abs(k-1)*.003;
  limb(P,[x,-.456,.13],[x*1.15,-.46,.13+len],.007,.0055,C.skin,6);
  spike(P,[x*1.15,-.46,.13+len],[0,-.5,1],.012,.0045,C.nail,4);
 }
 return P.merge();
}

// a muscled bare arm inked with sutra bands, a forearm wrapped in black cloth studded with iron,
// and a big hand hooked into claws, its knuckles black with callus
function buildArm(){
 const P=pieces();
 const inked=(x,y,z)=>{
  const a=Math.atan2(x,z)+Math.PI;
  if((Math.abs(y+.08)<.025||Math.abs(y+.15)<.01)&&sutra(a,y+.2,.35))return C.ink;
  return mix(C.skinDark,C.skinHi,clamp01((y+.05)*5+z*8+.4)*.8);
 };
 P.add(new THREE.SphereGeometry(.078,16,12),at(0,-.01,0,[0,0,0],[1,.95,1]),inked);
 P.add(lathe([[.064,-.02],[.066,-.08],[.058,-.15],[.05,-.19]],16),at(0,0,0),inked);
 // the biceps
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.1,.03,[0,0,0],[1,1.6,.8]),inked);
 P.add(lathe([[.05,-.18],[.052,-.24],[.044,-.31],[.04,-.33]],16),at(0,0,0),(x,y,z)=>Math.sin(y*260+Math.atan2(x,z)*2)>.1?C.sash:C.sashHi);
 for(let k=0;k<8;k++){const a=k/8*Math.PI*2,y=-.21-(k%2)*.06;P.add(new THREE.SphereGeometry(.007,5,4),at(Math.sin(a)*(k%2?.047:.052),y,Math.cos(a)*(k%2?.047:.052)),C.ironHi);}
 // the hand: a broad palm, four thick fingers hooked forward and down with black claws, a thumb
 P.add(new THREE.SphereGeometry(.034,12,8),at(0,-.36,.008,[0,0,0],[.95,1.1,.75]),C.skin);
 for(let k=0;k<4;k++){
  const x=-.022+k*.0145;
  P.add(new THREE.SphereGeometry(.009,6,5),at(x,-.378,.03),C.callus);// the knuckle
  limb(P,[x,-.38,.028],[x,-.412,.045],.0085,.0075,C.skin,6);
  limb(P,[x,-.412,.045],[x,-.435,.03],.0075,.0062,C.skin,6);
  spike(P,[x,-.435,.03],[0,-.55,-1],.022,.0055,C.nail,5);
 }
 limb(P,[.03,-.35,.012],[.035,-.39,.036],.01,.008,C.skin,6);
 spike(P,[.035,-.39,.036],[0,-.6,1],.014,.005,C.nail,4);
 return P.merge();
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:.06,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#e6f4ff',emissive:'#5aa8ff',emissiveIntensity:1.6,roughness:.1,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createMasterKaen(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.1);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.015);head.rotation.x=.08;body.add(head);// chin lowered, staring out
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.085,HIP_Y,0);leg.rotation.z=s*.03;body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.25,SHOULDER_Y,0);arm.rotation.z=s*.16;body.add(arm);mesh(arm,S.arm,'arm',S.hide);arms.push(arm);
 }
 // an empty socket at the right hand: he strikes with his claws
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.38,.012);arms[1].add(weaponSocket);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'master kaen',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
