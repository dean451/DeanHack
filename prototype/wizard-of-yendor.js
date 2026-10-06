import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The Wizard of Yendor shares the humans' letter, so he used to be the plain `@` humanoid. He now
// looms as a gaunt, towering sorcerer. A deep pointed hood, its peak raked back, shadows a grey,
// hollow-cheeked face with a hooked nose and slanted burning eyes; a long, thin, wispy beard hangs
// from the chin in ragged strands. A spiked iron circlet set with a blood-red stone rides on the
// hood. A fan of jagged black blades stands up behind his head as a collar. The floor-length robe
// is near-black violet, slit up the front over a crimson lining, banded with broken crimson runes
// near the hem, and the hem itself is torn into long hanging points that almost brush the floor, so
// no feet show beneath. A mantle with a dagged edge lies over the shoulders. An iron chain belt is
// clasped with a bone skull, and the Book of the Dead hangs from it at his left hip: black, iron-
// cornered, a skull on its cover. Bell sleeves end in dagged cuffs over skeletal grey hands with long
// black claws. He holds a black twisted staff bound with a small skull, its head a cage of curling
// thorns round a glowing violet orb.
// Each moving part (body, head, each leg and arm, the staff) is one merged, vertex-coloured mesh on
// one shared material, plus one glowing mesh for the eyes and one for the orb: 9 draws. The geometry
// is built once and shared.
// Handles: legs, arms, arm (the staff arm), weaponSocket, orb, head, body.

const C={
 robe:rgb('#241a30'),robeDark:rgb('#110c18'),robeHi:rgb('#3a2c4a'),
 crimson:rgb('#86182a'),crimsonDark:rgb('#3e0a14'),
 iron:rgb('#3a3a42'),ironHi:rgb('#74747e'),bone:rgb('#d2c8ae'),boneDark:rgb('#8a7e64'),
 skin:rgb('#8e9098'),skinDark:rgb('#4e5058'),beard:rgb('#a4a4a6'),beardDark:rgb('#5c5c60'),
 shadow:rgb('#050407'),claw:rgb('#0e0c0e'),leather:rgb('#16121a'),gem:rgb('#c01a2c'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
// a tapered cylinder from point a to point b
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// a ring of thin, downward-hanging points round a hem of radius r at height y (depth scaled by zs)
function dags(P,count,r,y,zs,len,w,colour,seed){
 for(let i=0;i<count;i++){
  const a=(i+hash(seed+i)*.4)/count*Math.PI*2,h=len*(.55+hash(seed+i+40)*.75);
  P.add(new THREE.ConeGeometry(w,h,4),at(Math.sin(a)*r,y-h/2,Math.cos(a)*r*zs,[0,a,Math.PI],[1,1,.3]),colour);
 }
}
// a tube along points, tapered from r0 to r1
function taperedTube(P,pts,r0,r1,colour,segments=16,radial=6){
 const path=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),tube=new THREE.TubeGeometry(path,segments,1,radial,false),pos=tube.attributes.position;
 for(let i=0;i<pos.count;i++){
  const t=Math.floor(i/(radial+1))/segments,c=path.getPointAt(t),r=r0+(r1-r0)*t;
  pos.setXYZ(i,c.x+(pos.getX(i)-c.x)*r,c.y+(pos.getY(i)-c.y)*r,c.z+(pos.getZ(i)-c.z)*r);
 }
 tube.computeVertexNormals();
 P.add(tube,null,colour);
}
// a small bone skull facing +z, centred at the origin, about `s` across
function skull(P,m,s){
 const k=new THREE.Matrix4().multiplyMatrices(m,new THREE.Matrix4().makeScale(s,s,s));
 P.add(new THREE.SphereGeometry(.5,10,8),new THREE.Matrix4().multiplyMatrices(k,at(0,.1,0,[0,0,0],[1,.95,1.05])),(x,y,z)=>mix(C.boneDark,C.bone,.7));
 P.add(new THREE.BoxGeometry(.55,.3,.4),new THREE.Matrix4().multiplyMatrices(k,at(0,-.3,.12)),C.boneDark);
 for(const sx of [-1,1])P.add(new THREE.SphereGeometry(.14,6,5),new THREE.Matrix4().multiplyMatrices(k,at(sx*.2,.02,.42)),C.shadow);
 P.add(new THREE.ConeGeometry(.07,.14,3),new THREE.Matrix4().multiplyMatrices(k,at(0,-.14,.47,[Math.PI,0,0])),C.shadow);
}

export const HIP_Y=.47,SHOULDER_Y=.84,NECK_Y=.97;

function buildBody(){
 const P=pieces();
 // the robe: floor length, narrow at the waist, flared at the hem, banded with broken crimson runes
 const robe=[[.215,.1],[.205,.2],[.182,.36],[.157,.5],[.142,.58],[.15,.68],[.17,.78],[.16,.86],[.11,.92],[.05,.935]];
 P.add(lathe(robe,40),at(0,0,0,[0,0,0],[1,1,.8]),(x,y,z)=>{
  const a=Math.atan2(x,z),fold=Math.sin(a*9)*.5+.5;
  let c=mix(C.robeDark,C.robe,THREE.MathUtils.clamp((y-.1)/.5,0,1)*.7+fold*.3);
  if(y>.6&&z>0)c=mix(c,C.robeHi,.3);
  const seg=Math.floor((a+Math.PI)/(Math.PI*2)*36);
  if(y>.15&&y<.23&&Math.abs(y-.19)<.035&&hash(seg*7+Math.floor(y*90))>.45)c=mix(C.crimsonDark,C.crimson,.6);
  return c;
 });
 P.add(new THREE.CircleGeometry(.215,28),at(0,.1,0,[Math.PI/2,0,0],[1,.8,1]),C.shadow);
 // the hem torn into long hanging points that nearly brush the floor
 dags(P,26,.205,.112,.8,.085,.03,(x,y)=>mix(C.robeDark,C.robe,THREE.MathUtils.clamp((y-.02)*6,0,1)),11);
 // the slit up the front over a crimson lining
 P.add(new THREE.BoxGeometry(.034,.46,.006),at(0,.34,.141,[-.1,0,0]),(x)=>Math.abs(x)<.006?C.crimsonDark:C.crimson);
 // a mantle over the shoulders with a dagged edge
 P.add(lathe([[.195,.66],[.205,.72],[.198,.8],[.165,.87],[.11,.91],[.06,.92]],36),at(0,0,0,[0,0,0],[1,1,.85]),(x,y,z)=>mix(C.robeDark,C.robeHi,z>0?.35:.1));
 dags(P,18,.198,.672,.85,.09,.026,C.robeDark,51);
 // a fan of jagged black blades standing up behind the head as a collar, crimson at the tips
 for(let i=0;i<9;i++){
  const u=(i-4)/4,a=Math.PI+u*1.25,h=.2+(1-Math.abs(u))*.1+hash(i+70)*.07,lean=.35+Math.abs(u)*.25;
  const m=at(Math.sin(a)*.1,.9,Math.cos(a)*.085,[0,a,0]).multiply(at(0,0,0,[lean,0,0])).multiply(at(0,h/2,0,[0,0,0],[1,1,.25]));
  P.add(new THREE.ConeGeometry(.034,h,4),m,(x,y)=>mix(C.robeDark,C.crimsonDark,THREE.MathUtils.clamp((y-.98)/.16,0,1)));
 }
 // an iron chain belt clasped with a bone skull
 P.add(new THREE.TorusGeometry(.146,.01,5,40),at(0,.58,0,[Math.PI/2,0,0],[1,.8,1]),(x,y,z)=>Math.sin(Math.atan2(x,z)*30)>0?C.iron:C.ironHi);
 skull(P,at(0,.575,.12),.05);
 // the Book of the Dead on a short chain at the left hip: black, iron-cornered, a skull on the cover
 for(let i=0;i<3;i++)P.add(new THREE.TorusGeometry(.009,.003,4,8),at(-.13,.56-i*.016,.05,[0,i%2?Math.PI/2:0,0]),C.ironHi);
 const book=at(-.158,.45,.05,[0,0,.1]);
 P.add(new THREE.BoxGeometry(.04,.13,.1),book,C.leather);
 for(const [y,z] of [[-.06,-.045],[-.06,.045],[.06,-.045],[.06,.045]])P.add(new THREE.BoxGeometry(.044,.018,.018),book.clone().multiply(at(0,y,z)),C.iron);
 skull(P,book.clone().multiply(at(-.022,.005,0,[0,-Math.PI/2,0])),.042);
 // the neck, mostly lost in the hood's shadow
 P.add(new THREE.CylinderGeometry(.04,.05,.08,12),at(0,.94,0),C.skinDark);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a black hollow behind the face, so the hood's mouth reads as shadow
 P.add(new THREE.SphereGeometry(.1,14,10),at(0,.11,-.025),C.shadow);
 // a gaunt grey face: sunken sockets and hollow cheeks
 P.add(new THREE.SphereGeometry(.08,18,14),at(0,.1,.02,[0,0,0],[.78,1.12,.85]),(x,y,z)=>{
  if(z>.05&&Math.abs(x)>.012&&Math.abs(x)<.05&&y>.1&&y<.13)return C.shadow;
  if(z>.03&&Math.abs(x)>.035&&y>.05&&y<.09)return C.skinDark;
  return mix(C.skinDark,C.skin,THREE.MathUtils.clamp((z+.02)*12,0,1));
 });
 // a heavy brow and a long hooked nose
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,.135,.065,[0,0,0],[1.15,.24,.4]),C.skinDark);
 P.add(new THREE.ConeGeometry(.012,.05,5),at(0,.1,.096,[Math.PI/2-.6,0,0]),C.skin);
 P.add(new THREE.SphereGeometry(.009,6,5),at(0,.08,.106),C.skinDark);
 // a thin, cruel mouth
 P.add(new THREE.BoxGeometry(.036,.004,.006),at(0,.06,.086),C.shadow);
 // a long, thin, wispy beard in ragged strands
 for(let i=0;i<9;i++){
  const u=(i-4)/4,len=.18+(1-Math.abs(u))*.14+hash(i+5)*.06,x=u*.032;
  limb(P,[x,.055,.075-Math.abs(u)*.012],[x*.6+(hash(i+9)-.5)*.02,.055-len,.085],.012-Math.abs(u)*.003,.0015,(px,py)=>mix(C.beardDark,C.beard,THREE.MathUtils.clamp((py+.1)*5,0,1)),5);
 }
 // the deep hood, open at the front, its peak raked back
 const w=.78,hood=(x,y,z)=>mix(C.robeDark,C.robe,THREE.MathUtils.clamp(y*3,0,1)*.7+(z>0?.2:0));
 P.add(new THREE.SphereGeometry(.125,22,14,Math.PI/2+w,Math.PI*2-2*w,0,Math.PI*.78),at(0,.11,-.01,[0,0,0],[1,1.15,1.1]),hood);
 P.add(new THREE.ConeGeometry(.065,.17,10),at(0,.235,-.07,[-.75,0,0]),hood);
 // a spiked iron circlet riding on the hood, a blood-red stone at the front
 P.add(new THREE.TorusGeometry(.123,.007,5,30),at(0,.19,-.01,[Math.PI/2-.12,0,0],[1,1.1,1]),C.iron);
 for(let i=0;i<7;i++){
  const u=(i-3)/3,a=u*1.35,h=.035+(i%2?0:.03)+(i===3?.025:0);
  const m=at(Math.sin(a)*.123,.195+Math.cos(a)*.016,Math.cos(a)*.135-.01,[0,a,0]).multiply(at(0,0,0,[.25,0,0])).multiply(at(0,h/2,0,[0,0,0],[1,1,.5]));
  P.add(new THREE.ConeGeometry(.011,h,4),m,(x,y)=>mix(C.iron,C.ironHi,.5));
 }
 P.add(new THREE.OctahedronGeometry(.014),at(0,.2,.132,[0,0,0],[.8,1.2,.5]),C.gem);
 return P.merge();
}
// slanted burning eyes, angled down toward the nose
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.009,8,6),at(s*.03,.115,.074,[0,0,s*.35],[1.6,.55,.6]),[1,1,1]);
 return P.merge();
}

// a dark shin under the robe and an iron-shod pointed toe that barely shows below the hem
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.05,.04,.4,10),at(0,-.2,0),C.robeDark);
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.42,.03,[0,0,0],[.85,.5,1.5]),C.leather);
 P.add(new THREE.ConeGeometry(.018,.07,6),at(0,-.43,.1,[Math.PI/2-.3,0,0]),C.iron);
 return P.merge();
}

// a bell sleeve with a dagged cuff, over a skeletal grey hand with long black claws
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.06,14,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),C.robe);
 P.add(lathe([[.055,0],[.057,-.12],[.07,-.22],[.096,-.3],[.106,-.315]],20),at(0,0,0),(x,y)=>mix(C.robeDark,C.robe,THREE.MathUtils.clamp((y+.3)/.25,0,1)));
 P.add(lathe([[.104,-.315],[.05,-.29],[.04,-.25]],20),at(0,0,0),C.shadow);
 dags(P,10,.1,-.31,1,.08,.024,C.robeDark,81);
 // the bony wrist and knuckled hand
 limb(P,[0,-.27,0],[0,-.35,.005],.02,.017,C.skinDark);
 P.add(new THREE.SphereGeometry(.024,10,8),at(0,-.37,.008,[0,0,0],[.85,1.15,.75]),C.skin);
 for(const [i,x] of [-.015,-.005,.005,.015].entries()){
  const len=.05+(i===1||i===2?.012:0),k=[x*1.2,-.39-len*.55,.015],tip=[x*1.35,-.39-len,.04];
  limb(P,[x,-.385,.01],k,.005,.004,C.skin,5);
  P.add(new THREE.SphereGeometry(.005,5,4),at(...k),C.skinDark);
  limb(P,k,tip,.004,.003,C.skin,5);
  P.add(new THREE.ConeGeometry(.0035,.028,4),at(tip[0],tip[1]-.004,tip[2]+.012,[Math.PI/2+.6,0,0]),C.claw);
 }
 limb(P,[.016,-.36,.016],[.024,-.395,.04],.005,.004,C.skin,5);// the thumb
 return P.merge();
}

// a black twisted staff bound with a small skull, its head a cage of curling thorns round the orb.
// Built along +y from the grip. The orb sits at ORB.
const STAFF_TOP=1,ORB=new THREE.Vector3(0,STAFF_TOP+.065,0);
function buildStaff(){
 const P=pieces(),bottom=-.42;
 const shaft=(x,y,z)=>mix(C.shadow,C.robeHi,(Math.sin(Math.atan2(x,z)*2+y*30)*.5+.5)*.6);
 taperedTube(P,Array.from({length:13},(_,i)=>{const t=i/12;return [Math.sin(t*8)*.006,bottom+t*(STAFF_TOP-bottom),Math.cos(t*6)*.005];}),.012,.019,shaft,36,8);
 // two iron strands wound up the upper shaft
 for(const ph of [0,Math.PI]){
  const pts=[];
  for(let i=0;i<=24;i++){const t=i/24,a=ph+t*Math.PI*7;pts.push([Math.sin(a)*.02,.45+t*.5,Math.cos(a)*.02]);}
  taperedTube(P,pts,.004,.004,C.iron,60,4);
 }
 // an iron butt spike
 P.add(new THREE.ConeGeometry(.014,.05,5),at(0,bottom-.02,0,[Math.PI,0,0]),C.iron);
 // the small skull lashed below the head
 skull(P,at(0,.88,.022),.045);
 P.add(new THREE.TorusGeometry(.021,.004,4,10),at(0,.85,0,[Math.PI/2,0,0]),C.ironHi);
 // the thorn cage: five black prongs curling up and in round the orb, jagged with barbs
 P.add(new THREE.SphereGeometry(.026,10,8),at(0,STAFF_TOP,0,[0,0,0],[1,.75,1]),C.shadow);
 for(let k=0;k<5;k++){
  const a=k/5*Math.PI*2+.3,out=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
  const pts=[0,.25,.5,.75,1].map(t=>{const p=ORB.clone().addScaledVector(out,Math.sin(t*Math.PI*.85+.35)*.058-(t>.8?(t-.8)*.08:0));p.y+=-.065+t*.13;return p.toArray();});
  taperedTube(P,pts,.008,.0015,(x,y)=>mix(C.shadow,C.crimsonDark,THREE.MathUtils.clamp((y-ORB.y)*12,0,1)),10,5);
  const mid=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))).getPointAt(.4);
  P.add(new THREE.ConeGeometry(.004,.022,4),new THREE.Matrix4().compose(mid,new THREE.Quaternion().setFromUnitVectors(up,out.clone().add(new THREE.Vector3(0,-.6,0)).normalize()),new THREE.Vector3(1,1,1)).multiply(at(0,.01,0)),C.shadow);
 }
 return P.merge();
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(),staff:buildStaff(),orb:new THREE.SphereGeometry(.038,16,12),
  cloth:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:.12,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#f0b0ff',emissive:'#c030ff',emissiveIntensity:2,roughness:.2,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.cloth;o.userData.part=name;parent.add(o);return o;}

export function createWizardOfYendor(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.3);
 mesh(body,S.body,'body',S.cloth);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.01);head.rotation.x=.12;body.add(head);// head lowered, glaring out from the hood
 mesh(head,S.head,'head',S.cloth);mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.075,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.cloth);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.2,SHOULDER_Y,0);arm.rotation.z=s*.06;body.add(arm);mesh(arm,S.arm,'arm',S.cloth);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.02);weaponSocket.rotation.z=-.06;arms[1].add(weaponSocket);
 mesh(weaponSocket,S.staff,'staff',S.cloth);
 const orb=mesh(weaponSocket,S.orb,'orb',S.glow);orb.position.copy(ORB);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'wizard of yendor',arms,arm:arms[1],weaponSocket,orb,head,hat:null,beard:null,pick:null};
}
