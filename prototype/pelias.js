import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Pelias (the Barbarian quest leader, chieftain of the Duali) shares the humans' letter, so he used to
// be the plain `@` humanoid. He now stands as an old war-king gone hard and cold: a bald, scarred
// scalp ringed by a crown of black iron spikes, a hooked nose, a deep scar dragged through the left
// brow, and two frost-pale glints sunk under a heavy ridge of brow. A long white beard falls in one
// thick plait bound with bone beads and an iron ring. His chest is bare and broad, criss-crossed with
// old scars and faded blue woad spirals, with a heavy twisted-gold torc at the throat. A black
// bearskin cloak hangs from his shoulders to the knee, its fur ragged at the hem, pinned at each
// shoulder with a bronze disc; a bear's claws hang over the collarbones. A wide studded belt with a
// bronze boss holds a leather war-kilt cut into strips. His legs go into dark wool wrapped with
// cross-garters and fur boots. In his right fist he holds a long two-handed broadsword upright: a
// notched, dark-stained blade with a fuller, a downswept iron guard, a leather grip and a bronze
// wheel pommel.
// Each moving part (body, head, each leg and arm, the sword) is one merged, vertex-coloured mesh on
// one shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once and
// shared.
// Handles: legs, arms, arm (the sword arm), weaponSocket, head, eyes, body.

const C={
 skin:rgb('#a88468'),skinDark:rgb('#5e4232'),skinHi:rgb('#c8a488'),shadow:rgb('#140c08'),scar:rgb('#d0a894'),
 woad:rgb('#3a4e6a'),beard:rgb('#d8d4cc'),beardDark:rgb('#8a8680'),
 fur:rgb('#1c1612'),furHi:rgb('#3e3228'),furTip:rgb('#5a4c40'),
 leather:rgb('#3e2616'),leatherHi:rgb('#6a4628'),leatherDark:rgb('#1a0e06'),
 wool:rgb('#2a2622'),woolHi:rgb('#423c34'),
 iron:rgb('#2a2a2c'),ironHi:rgb('#6a6a6e'),rust:rgb('#5a3018'),
 bronze:rgb('#8a6228'),bronzeHi:rgb('#c8963e'),bronzeDark:rgb('#3a2810'),
 gold:rgb('#b08a2e'),goldHi:rgb('#e8c868'),bone:rgb('#cfc4a8'),boneDark:rgb('#7a6e56'),
 steel:rgb('#5c6066'),steelHi:rgb('#a8aeb6'),stain:rgb('#3a1410'),
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
const grain=(x,y,z,k=200)=>hash(Math.floor(x*k)+Math.floor(y*k)*7+Math.floor(z*k)*13);
// pitted bronze, black in the pits
const bronze=(x,y,z)=>{const s=grain(x,y,z,350);return s>.82?C.bronzeDark:s>.55?C.bronzeHi:C.bronze;};
// black iron with spots of rust
const iron=(x,y,z)=>{const s=grain(x,y,z,300);return s>.86?C.rust:mix(C.iron,C.ironHi,s*.45);};
// the bear's fur: near-black, lighter at the tips in streaks running down
const fur=(x,y,z)=>{const s=hash(Math.floor(Math.atan2(x,z)*40)+Math.floor(y*30)*3);return mix(C.fur,s>.6?C.furTip:C.furHi,(s*.7)+(Math.sin(y*90+x*40)*.5+.5)*.2);};
// old skin: scars and faded woad spirals over a broad chest
function chest(x,y,z){
 let c=mix(C.skinDark,C.skin,clamp01(z*7+.35));
 if(z>0){
  for(const s of [-1,1]){
   const r=Math.hypot(x-s*.075,y-.77);
   if(r<.05&&Math.abs(Math.sin(r*150+Math.atan2(y-.77,x-s*.075)*s))<.22)c=mix(c,C.woad,.55);// the spirals over the breast
   if(Math.hypot(x-s*.07,y-.73)<.04&&y<.735)c=mix(c,C.shadow,.25);// the pectoral shadow
  }
  if(Math.abs(x)<.006&&y>.6&&y<.76)c=mix(c,C.shadow,.3);// the breastbone furrow
 }
 // the old scars, three pale slashes
 for(const [x0,y0,k] of [[-.08,.68,.9],[.04,.82,-1.3],[.09,.62,.6]])if(Math.abs((y-y0)-(x-x0)*k)<.004&&Math.abs(x-x0)<.05)c=C.scar;
 return c;
}

export const HIP_Y=.48,SHOULDER_Y=.86,NECK_Y=.97;

function buildBody(){
 const P=pieces();
 // the bare torso, broad at the shoulders and thick at the waist
 P.add(lathe([[.15,.5],[.16,.56],[.165,.64],[.18,.74],[.2,.82],[.19,.88],[.12,.93],[.05,.95]],32),at(0,0,0,[0,0,0],[1,1,.68]),chest);
 // the wide studded belt and its bronze boss
 P.add(new THREE.CylinderGeometry(.158,.16,.05,32,1,true),at(0,.53,0,[0,0,0],[1,1,.7]),(x,y,z)=>{
  const a=Math.atan2(x,z);
  return Math.abs(y-.53)<.006&&Math.sin(a*14)>.8?C.bronzeHi:mix(C.leather,C.leatherHi,(Math.sin(a*9)*.5+.5)*.35);
 });
 P.add(new THREE.CylinderGeometry(.032,.036,.016,16),at(0,.53,.115,[Math.PI/2,0,0]),bronze);
 P.add(new THREE.ConeGeometry(.01,.022,6),at(0,.53,.13,[Math.PI/2,0,0]),C.bronzeDark);
 // the war-kilt: hanging leather strips, darker and ragged at their ends
 for(let k=0;k<18;k++){
  const a=k/18*Math.PI*2,len=.11+hash(k)*.05;
  P.add(new THREE.BoxGeometry(.05,len,.008),at(Math.sin(a)*.165,.51-len/2,Math.cos(a)*.118,[0,a,0],[1,1,1]).multiply(at(0,0,0,[-.12,0,0])),(x,y)=>mix(C.leatherDark,C.leatherHi,clamp01((y-.36)*6)*.6+hash(k*3)*.15));
 }
 // the gold torc, a twisted ring open at the front with knobbed ends
 P.add(new THREE.TorusGeometry(.068,.011,8,28,Math.PI*1.75),at(0,.94,.015,[Math.PI/2,0,Math.PI*.625]),(x,y,z)=>Math.sin(Math.atan2(x,z)*28)>0?C.goldHi:C.gold);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.015,10,8),at(s*.026,.94,.078),C.goldHi);
 // the thick neck
 P.add(new THREE.CylinderGeometry(.045,.055,.07,14),at(0,.96,.005),C.skinDark);
 // the bearskin cloak: hung from the shoulders down the back to the knee, its fur ragged at the hem
 P.add(lathe([[.13,.96],[.21,.9],[.235,.8],[.24,.6],[.25,.4],[.26,.26]],28,Math.PI*.55,Math.PI*.9),at(0,0,-.01,[0,0,0],[1,1,.72]),(x,y,z)=>{
  let c=fur(x,y,z);
  if(y<.33&&hash(Math.floor(Math.atan2(x,z)*60))>.45)c=mix(c,C.shadow,.6);// the ragged hem
  return c;
 });
 // the fur ruff round the shoulders, falling to the collarbones
 P.add(lathe([[.1,.97],[.17,.95],[.215,.9],[.22,.86],[.2,.84]],28),at(0,0,-.005,[0,0,0],[1,1,.74]),fur);
 // the bear's claws hanging over the collarbones, and the bronze cloak discs at the shoulders
 for(const s of [-1,1]){
  for(let k=0;k<3;k++){
   const x=s*(.085+k*.018);
   P.add(new THREE.ConeGeometry(.006,.034,5),at(x,.83-k*.004,.128-k*.006,[Math.PI+.25,0,s*.1],[1,1,.6]),(xx,y)=>mix(C.bone,C.boneDark,clamp01((.84-y)*30)));
  }
  P.add(new THREE.CylinderGeometry(.03,.03,.01,16),at(s*.16,.885,.12,[Math.PI/2-.4,0,s*.25]),bronze);
  P.add(new THREE.SphereGeometry(.008,8,6),at(s*.161,.89,.128),C.bronzeHi);
 }
 return P.merge();
}

// the face: weathered, heavy-browed, a scar dragged through the left brow; head centre at .1
const EYE_Y=.112,EYE_X=.027;
function face(x,y,z){
 for(const s of [-1,1]){
  const d=Math.hypot(x-s*EYE_X,(y-EYE_Y)*1.4);
  if(z>.03&&d<.018)return mix(C.shadow,C.skinDark,clamp01((d-.009)*80));// deep sockets
 }
 let c=mix(C.skinDark,C.skin,clamp01(z*12+.2));
 if(y>.13)c=mix(c,C.skinHi,clamp01((y-.13)*10)*.35);// the shining scalp
 if(Math.abs((x-.03)+(y-.11)*.25)<.003&&y>.07&&y<.16&&z>.02)c=C.scar;// the brow scar, on his left
 if(z>.05&&Math.abs(y-.05)<.003&&Math.abs(x)<.02)return C.shadow;// the grim mouth
 return c;
}
function buildHead(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.072,22,16),at(0,.105,0,[0,0,0],[.9,1.05,.95]),face);
 P.add(new THREE.BoxGeometry(.07,.05,.04),at(0,.055,.04,[.12,0,0]),face);// the heavy jaw
 // the heavy brow ridge, a hooked nose and flat ears
 P.add(new THREE.BoxGeometry(.088,.014,.03),at(0,.132,.053,[.35,0,0]),(x,y,z)=>Math.abs(x-.026)<.004?C.scar:C.skinDark);
 P.add(new THREE.ConeGeometry(.011,.042,4),at(0,.094,.072,[-.4,0,0]),(x,y,z)=>mix(C.skinDark,C.skinHi,clamp01((z-.065)*60)));
 P.add(new THREE.SphereGeometry(.007,6,4),at(0,.11,.076),C.skin);// the hook at the bridge
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.016,8,6),at(s*.064,.1,-.004,[0,0,0],[.4,1,.7]),C.skinDark);
 // white brows and a heavy moustache drooping into the beard
 for(const s of [-1,1]){
  P.add(new THREE.BoxGeometry(.03,.008,.012),at(s*.027,.138,.065,[0,0,-s*.25]),C.beard);
  limb(P,[s*.004,.068,.074],[s*.032,.045,.062],.007,.005,C.beard,5);
 }
 // the beard: a full white mass over the jaw, gathered into one thick plait down the chest
 P.add(new THREE.SphereGeometry(.058,16,12,0,Math.PI*2,Math.PI*.42,Math.PI*.58),at(0,.07,.012,[0,0,0],[1,1.05,1.05]),(x,y,z)=>z>.05&&y>.03&&Math.abs(x)<.02&&y<.06?C.beardDark:mix(C.beardDark,C.beard,.6+(Math.sin(x*400)*.5+.5)*.4));
 for(let k=0;k<6;k++){
  const y=-k*.028,z=.075+k*.012;
  P.add(new THREE.SphereGeometry(.021-k*.0018,10,8),at(0,y,z,[0,0,k%2?.4:-.4],[1,1.2,.8]),(xx,yy)=>mix(C.beard,C.beardDark,(Math.sin((yy-y)*200)*.5+.5)*.5));
 }
 // two bone beads and an iron ring binding the plait
 P.add(new THREE.CylinderGeometry(.014,.014,.012,10),at(0,-.014,.083),C.bone);
 P.add(new THREE.TorusGeometry(.013,.004,6,14),at(0,-.07,.106,[Math.PI/2,0,0]),iron);
 P.add(new THREE.CylinderGeometry(.009,.009,.01,8),at(0,-.15,.139),C.bone);
 // the crown: a band of black iron round the scalp, with tall jagged spikes
 P.add(new THREE.CylinderGeometry(.074,.072,.02,24,1,true),at(0,.15,-.004,[0,0,0],[1,1,1.05]),iron);
 for(let k=0;k<9;k++){
  const a=(k-4)/9*Math.PI*1.6,h=.05+(k===4?.03:Math.abs(k-4)%2?0:.015)+hash(k+3)*.01;
  P.add(new THREE.ConeGeometry(.009,h,4),at(Math.sin(a)*.074,.16+h/2,Math.cos(a)*.076-.004,[Math.cos(a)*-.12,0,Math.sin(a)*.12]),iron);
 }
 return P.merge();
}
// two frost-pale glints under the brow
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0065,8,6),at(s*EYE_X,EYE_Y,.062,[0,0,0],[1.4,.7,.6]),[1,1,1]);
 return P.merge();
}

// a leg: dark wool bound in leather cross-garters, going into a fur boot
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.06,-.02],[.075,-.1],[.068,-.2],[.05,-.28],[.046,-.4]],14),at(0,0,0),(x,y,z)=>{
  const a=Math.atan2(x,z);
  if(y<-.18&&Math.abs(Math.sin(y*90+a*1.0))<.12)return C.leather;// the garters, winding up and down
  if(y<-.18&&Math.abs(Math.sin(y*90-a*1.0))<.12)return C.leatherDark;
  return mix(C.wool,C.woolHi,grain(x,y,z,120)*.5);
 });
 // the fur boot: a shaggy cuff over a hide sole
 P.add(lathe([[.05,-.38],[.06,-.4],[.056,-.44],[.05,-.48]],14),at(0,0,0),fur);
 P.add(new THREE.BoxGeometry(.075,.035,.13),at(0,-.482,.025),(x,y,z)=>mix(C.leatherDark,C.leather,clamp01((y+.48)*20)*.6));
 P.add(new THREE.SphereGeometry(.036,10,8),at(0,-.482,.085,[0,0,0],[1,.6,1]),C.leather);
 return P.merge();
}

// a bare, scarred arm: a thick upper arm, a black iron bracer studded with bronze, a big fist
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.062,14,10),at(0,-.01,0),(x,y,z)=>mix(C.skinDark,C.skin,clamp01(y*5+.6)));
 P.add(lathe([[.058,0],[.06,-.1],[.048,-.17],[.046,-.2]],14),at(0,0,0),(x,y,z)=>{
  if(z>0&&Math.abs(y+.07)<.004)return C.scar;
  // a woad band round the upper arm
  if(Math.abs(y+.04)<.012&&Math.sin(Math.atan2(x,z)*10+y*400)>0)return C.woad;
  return mix(C.skinDark,C.skin,.65);
 });
 P.add(lathe([[.046,-.2],[.05,-.22],[.05,-.31],[.046,-.33]],14),at(0,0,0),(x,y,z)=>{
  const a=Math.atan2(x,z);
  return (Math.abs(y+.235)<.008||Math.abs(y+.305)<.008)&&Math.sin(a*5)>.75?C.bronzeHi:iron(x,y,z);
 });
 limb(P,[0,-.33,0],[0,-.36,.004],.026,.024,C.skinDark,8);
 P.add(new THREE.SphereGeometry(.032,10,8),at(0,-.385,.008,[0,0,0],[.85,1.15,.75]),C.skin);
 for(let k=0;k<4;k++){
  const x=-.021+k*.014;
  limb(P,[x,-.405,.014],[x,-.41,.05],.0078,.007,C.skin,5);
  limb(P,[x,-.41,.05],[x,-.388,.058],.007,.006,C.skinDark,5);
 }
 limb(P,[.026,-.38,.014],[.034,-.405,.05],.009,.007,C.skin,5);// the thumb
 return P.merge();
}

// The broadsword, held upright: a long notched blade with a fuller and old stains, a downswept iron
// guard, a leather-bound grip and a bronze wheel pommel.
function buildSword(){
 const P=pieces();
 const L=.72;
 // the blade: a flattened box tapering to a point, notched on the edges
 const blade=new THREE.BoxGeometry(.05,L,.008,1,24,1),pos=blade.attributes.position;
 for(let i=0;i<pos.count;i++){
  const y=pos.getY(i)/L+.5,x=pos.getX(i);
  let w=1-Math.max(0,y-.82)/.18*.95;
  if(Math.abs(x)>.02&&hash(Math.round(y*24)*3+(x>0?1:0))>.78)w*=.82;// the notches
  pos.setX(i,x*w);pos.setZ(i,pos.getZ(i)*(1-y*.4));
 }
 blade.computeVertexNormals();
 P.add(blade,at(0,.08+L/2,0),(x,y,z)=>{
  let c=Math.abs(x)<.006?C.steel:mix(C.steel,C.steelHi,clamp01(Math.abs(x)*40));// the fuller
  const s=grain(x,y,z,90);
  if(y<.35&&s>.6)c=mix(c,C.stain,.6);// old blood, dried black near the guard
  return c;
 });
 // the guard, swept down toward the blade
 for(const s of [-1,1])P.add(new THREE.CylinderGeometry(.008,.011,.08,6),at(s*.036,.07,0,[0,0,s*(Math.PI/2+.35)]),iron);
 P.add(new THREE.BoxGeometry(.03,.02,.02),at(0,.075,0),iron);
 // the grip, bound in leather, and the wheel pommel
 limb(P,[0,-.12,0],[0,.065,0],.011,.012,(x,y)=>Math.sin(y*260)>.3?C.leatherDark:C.leather,8);
 P.add(new THREE.CylinderGeometry(.022,.022,.012,16),at(0,-.135,0,[Math.PI/2,0,0]),bronze);
 P.add(new THREE.SphereGeometry(.007,6,4),at(0,-.135,.008),C.bronzeHi);
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[.12,0,-.06]));
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(),sword:buildSword(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:.15,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#e8f4ff',emissive:'#8cc4ec',emissiveIntensity:1.7,roughness:.3,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createPelias(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.1);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.02);body.add(head);
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.075,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,SHOULDER_Y,0);arm.rotation.z=s*.1;body.add(arm);mesh(arm,S.arm,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.395,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.sword,'sword',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'pelias',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
