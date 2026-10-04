import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The werecreatures in human form (the `@` wererat, werejackal and werewolf) share the humans'
// letter, so they used to be the plain `@` humanoid. Each is now a gaunt, hunched man with the beast
// already pushing through: the spine curls forward so the head hangs low and thrust out, and a row
// of knuckled vertebrae shows through a rip down the back of the shirt. Stiff hackles bristle along
// the nape and fur bursts from the shoulder seams. The face is drawn forward into the start of a
// muzzle under a scowling brow, with sunken sockets and slanted eyes that glow the beast's colour;
// a snarl bares fangs and the chin is smeared with old blood. Wild matted hair spills down the neck
// and grows into thick sideburns, and the ears are drawn up into points. A filthy linen shirt hangs
// open over a hairy chest, slashed by three claw rips, its hem and sleeves in tatters; frayed
// trousers are torn off at the shin. Long sinewy arms streaked with fur end in hooked, black-nailed
// claws, and the bare feet stand high on the toes with claws of their own.
//  - werewolf: big and broad, grizzled brown-black hair and a heavy mane, burning orange eyes.
//  - werejackal: lean and narrow-faced, tawny hair with a black streak, tall ears, amber eyes.
//  - wererat: small and most hunched, greasy grey hair, round dull bruised-flesh ears, a pointed bruise-tipped
//    snout with yellow buck teeth and whiskers, red eyes, and a bare scaly tail out of the trousers.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured mesh on one shared
// material, plus one small glowing mesh for the eyes: 7 draws. Geometry is built once per kind.
// Handles: legs, arms, arm, weaponSocket, head, eyes, body (were-shudder.js drives body, head, eyes
// and arms).

export const WERE_MEN=['werewolf','werejackal','wererat'];
const LOOKS={
 werewolf:{scale:1.1,wide:1.08,hunch:.5,skin:'#a08a72',hair:'#4a3c2e',hairHi:'#8a7a66',fur:'#3a2e24',eye:'#ffaa18',
  shirt:'#7a7262',trouser:'#3a3428',ears:'point',earH:.055,snout:.06,mane:1.3,hairN:26},
 werejackal:{scale:1.02,wide:.94,hunch:.45,skin:'#a88a66',hair:'#8a6a4a',hairHi:'#c09a6a',fur:'#221c18',eye:'#e0a030',
  shirt:'#827660',trouser:'#4a3e2c',ears:'point',earH:.075,snout:.075,mane:1,hairN:22,streak:true},
 wererat:{scale:.96,wide:.92,hunch:.72,skin:'#9a8a80',hair:'#4e4a46',hairHi:'#7a7470',fur:'#3a3634',eye:'#ff3a28',
  shirt:'#6e6a5a',trouser:'#36342c',ears:'round',earH:.04,snout:.085,mane:.8,hairN:20,rat:true},
};
const C0={
 skinDark:rgb('#3a2a22'),socket:rgb('#120a08'),mouth:rgb('#1a0606'),blood:rgb('#4a0a08'),bloodHi:rgb('#7a1610'),
 bone:rgb('#d8ccb0'),yellow:rgb('#c8a848'),nail:rgb('#0c0a08'),nailHi:rgb('#3a3430'),pink:rgb('#7e5a54'),pinkDark:rgb('#3e1a16'),
 cord:rgb('#5a4a30'),cordDark:rgb('#2a2216'),stain:rgb('#3a2a18'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// a cone from a base point out along a direction (a tuft of hair, a claw, a hackle)
function spike(P,base,dir,r,len,colour,seg=4){
 const D=new THREE.Vector3(...dir).normalize(),B=new THREE.Vector3(...base);
 P.add(new THREE.ConeGeometry(r,len,seg),new THREE.Matrix4().compose(B.addScaledVector(D,len/2),new THREE.Quaternion().setFromUnitVectors(up,D),new THREE.Vector3(1,1,1)),colour);
}
// cut a lathe shell's hem into ragged points
function rag(geo,below,seed,deep=.08){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y>below)continue;
  const seg=Math.round((Math.atan2(p.getX(i),p.getZ(i))+Math.PI)/(Math.PI*2)*32);
  p.setY(i,y+(seg%2?deep*(.6+hash(seg+seed)*.8):hash(seg+seed+5)*deep*.3));
 }
 geo.computeVertexNormals();
 return geo;
}
// curl the spine forward: z += k(y-.5)², with the normals carried through the shear
export const hunch=(k,y)=>k*Math.max(0,y-.5)**2;
function curl(geo,k){
 const p=geo.attributes.position,n=geo.attributes.normal,v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){
  const y=p.getY(i),d=2*k*Math.max(0,y-.5);
  p.setZ(i,p.getZ(i)+hunch(k,y));
  v.set(n.getX(i),n.getY(i)-d*n.getZ(i),n.getZ(i)).normalize();n.setXYZ(i,v.x,v.y,v.z);
 }
 return geo;
}

export const HIP_Y=.47,SHOULDER_Y=.84,NECK_Y=.95;

function colours(L){
 const C={...C0,skin:rgb(L.skin),hair:rgb(L.hair),hairHi:rgb(L.hairHi),fur:rgb(L.fur),
  shirt:rgb(L.shirt),shirtDark:rgb(new THREE.Color(L.shirt).multiplyScalar(.45).getHexString().padStart(7,'#')),
  trouser:rgb(L.trouser),trouserHi:rgb(new THREE.Color(L.trouser).multiplyScalar(1.5).getHexString().padStart(7,'#'))};
 C.skinLo=mix(C.skinDark,C.skin,.55);
 // sallow skin, shadowed in the hollows, coarse hair sprouting through
 C.hide=(x,y,z,furry=.3)=>{
  const n=Math.sin(x*310+y*170)*Math.sin(y*260-z*230)*.5+.5;
  return n<furry?mix(C.fur,C.hair,n/furry*.6):mix(C.skinLo,C.skin,.5+n*.5);
 };
 // matted hair, darker at the roots
 C.mat=(x,y,z,t=.5)=>mix(C.fur,mix(C.hair,C.hairHi,clamp01(Math.sin(x*400+z*300)*.5+.5)*.6),t);
 return C;
}

function buildBody(L,C){
 const P=pieces(),W=L.wide;
 // the filthy linen shirt hanging open, three claw rips across the chest and a rip down the spine
 const shirt=(x,y,z)=>{
  const open=(.95-y)*.32+.012;
  if(z>0&&y>.52&&Math.abs(x)<open)return C.hide(x,y,z,.45);// the hairy chest in the open front
  if(z>0&&x>.02&&x<.17&&y>.58&&y<.8)for(let k=0;k<3;k++){const d=Math.abs(y-.74+k*.045-(x-.02)*.55);if(d<.009)return C.hide(x,y,z,.2);if(d<.014)return C.blood;}
  if(z<0&&Math.abs(x)<.035&&y>.58&&y<.9)return C.skinLo;
  const fold=Math.sin(Math.atan2(x,z)*7+y*5)*.5+.5,stain=hash(Math.round(x*30)*7+Math.round(y*30)*13)<.12;
  return stain?mix(C.stain,C.shirtDark,.4):mix(C.shirtDark,C.shirt,.35+fold*.65);
 };
 // the gaunt torso under the shirt, so the open hem never shows daylight
 P.add(new THREE.CylinderGeometry(.13,.13,.4,18),at(0,.66,0,[0,0,0],[1.1*W,1,.78]),C.skinDark);
 P.add(rag(lathe([[.15,.42],[.145,.5],[.14,.58],[.16,.68],[.185,.78],[.2,.85],[.17,.91],[.09,.95]],32),.48,3,.07),at(0,0,0,[0,0,0],[1.15*W,1,.78]),shirt);
 // the knuckled vertebrae showing through the rip, and the ribs under the skin of the chest
 for(let k=0;k<6;k++){const y=.62+k*.05;P.add(new THREE.SphereGeometry(.018-k*.001,8,6),at(0,y,-(.11+(y-.62)*.2)*.78-.012,[0,0,0],[1.3,.8,1]),(x,yy,z)=>mix(C.skinLo,C.bone,clamp01(-z*6-.6)));}
 // the hips in frayed trousers, and the cord that holds them up, knotted at the front
 P.add(new THREE.CylinderGeometry(.14,.15,.12,18),at(0,.47,0,[0,0,0],[1.1*W,1,.8]),(x,y,z)=>mix(C.trouser,C.trouserHi,clamp01(z*8)*.5));
 P.add(new THREE.TorusGeometry(.155,.009,5,32),at(0,.5,0,[Math.PI/2,0,0],[1.1*W,.8,1]),(x,y,z)=>Math.sin(Math.atan2(x,z)*30)>0?C.cord:C.cordDark);
 limb(P,[.03,.5,.125],[.045,.4,.135],.006,.004,C.cord,4);
 limb(P,[.035,.5,.124],[.015,.41,.13],.006,.004,C.cord,4);
 // the sinewy neck, thrust forward
 P.add(new THREE.CylinderGeometry(.045,.06,.09,12),at(0,.95,.0,[.25,0,0]),(x,y,z)=>C.hide(x,y,z,.35));
 // stiff hackles bristling along the nape and between the shoulders
 for(let k=0;k<9;k++){
  const t=k/8,y=.97-t*.22,x=(hash(k+40)-.5)*.05;
  spike(P,[x,y,-.06-t*.06],[x*3,.5,-1],.016*L.mane,(.07+hash(k+2)*.04)*L.mane,(px,py,pz)=>C.mat(px,py,pz,clamp01((py-y)*20+.4)));
 }
 // fur bursting from the shoulder seams
 for(const s of [-1,1])for(let k=0;k<5;k++){
  const a=k/5*Math.PI*2;
  spike(P,[s*(.2*W+.01),.85,Math.cos(a)*.03],[s*(.6+.3*Math.cos(a)),.6,Math.sin(a)*.6],.012,.045+hash(k*3+s)*.03,(px,py,pz)=>C.mat(px,py,pz,.7));
 }
 if(L.rat){
  // a bare, scaly tail slipping out of the trousers
  const curve=new THREE.CatmullRomCurve3([[0,.44,-.1],[0,.36,-.2],[.05,.18,-.3],[.12,.04,-.33],[.2,.02,-.24]].map(p=>new THREE.Vector3(...p)));
  const tube=new THREE.TubeGeometry(curve,24,.018,6),p=tube.attributes.position;
  // taper it toward the tip (the tube runs along u, ring by ring)
  for(let i=0;i<p.count;i++){const ring=Math.floor(i/7)/24,c=curve.getPoint(ring),f=1-ring*.8;p.setXYZ(i,c.x+(p.getX(i)-c.x)*f,c.y+(p.getY(i)-c.y)*f,c.z+(p.getZ(i)-c.z)*f);}
  P.add(tube,null,(x,y,z)=>Math.sin(y*200+z*200)>.6?C.pinkDark:C.pink);
 }
 return curl(P.merge(),L.hunch);
}

function buildHead(L,C){
 const P=pieces(),sn=L.snout;
 const face=(x,y,z)=>{
  for(const s of [-1,1])if(Math.hypot(x-s*.03,(y-.115)*1.4)<.022&&z>.04)return C.socket;// sunken sockets
  if(y<.05&&z>.03&&hash(Math.round(x*90)+Math.round(z*90)*7)<.55)return mix(C.blood,C.bloodHi,hash(Math.round(x*200)));
  return C.hide(x,y,z,.18);
 };
 // the skull, and the lower face drawn forward into the start of a muzzle
 P.add(new THREE.SphereGeometry(.085,24,18),at(0,.11,-.005,[0,0,0],[.92,1,1.05]),face);
 P.add(new THREE.SphereGeometry(.05,18,12),at(0,.065,.04+sn*.4,[.15,0,0],[L.rat?.8:.95,.78,1+sn*6]),face);
 // the nose at the muzzle's tip
 P.add(new THREE.SphereGeometry(.014,10,8),at(0,.085,.075+sn*.9,[0,0,0],[1.2,.8,1]),L.rat?C.pink:C.socket);
 // the scowling brow, slanting down to a knot between the eyes
 for(const s of [-1,1])P.add(new THREE.CapsuleGeometry(.011,.035,3,8),at(s*.03,.135,.078,[0,0,Math.PI/2+s*.35],[1,1,.9]),C.skinLo);
 // the snarl: a dark slit with fangs (or a rat's yellow buck teeth) and a stained lower lip
 P.add(new THREE.BoxGeometry(.05,.008,.03),at(0,.05,.075+sn*.5,[.15,0,0]),C.mouth);
 for(const s of [-1,1])spike(P,[s*.018,.057,.088+sn*.5],[0,-1,.25],.0055,.026,C.bone,5);
 if(L.rat)for(const s of [-1,1])P.add(new THREE.BoxGeometry(.009,.022,.004),at(s*.005,.05,.1+sn*.5,[.2,0,0]),C.yellow);
 // the ears: drawn up into points, or a rat's round bruised cups
 for(const s of [-1,1]){
  if(L.ears==='round'){P.add(new THREE.CylinderGeometry(.03,.03,.006,14),at(s*.075,.165,-.01,[Math.PI/2,s*.5,0]),(x,y,z)=>Math.hypot(x-s*.075,y-.165)<.02?C.pinkDark:C.pink);continue;}
  P.add(new THREE.ConeGeometry(.024,L.earH,4),at(s*.072,.15+L.earH*.45,-.02,[-.2,0,-s*.35],[1,1,.45]),(x,y,z)=>mix(C.fur,C.hair,clamp01((.2+L.earH-y)*12)));
 }
 // the wild matted hair: tufts thrown back from the crown and spilling down the neck
 for(let k=0;k<L.hairN;k++){
  const a=(hash(k+7)-.5)*2.6,e=hash(k+19)*.9,len=(.06+hash(k+31)*.06)*(k%3?1:L.mane);
  const dir=[Math.sin(a)*.8,.6-e,-.6-e*.6],base=[Math.sin(a)*.06,.15+(.5-e)*.04,-.03-e*.04];
  const streak=L.streak&&Math.abs(a)<.25;
  spike(P,base,dir,.02,len,(x,y,z)=>streak?mix(C.fur,C.socket,.5):C.mat(x,y,z,.35+hash(k)*.5),5);
 }
 // a mane down the back of the neck, and thick sideburns down the cheeks
 for(let k=0;k<7;k++)spike(P,[(k-3)*.018,.07,-.07],[(k-3)*.15,-1,-.3],.022*L.mane,(.08+hash(k+60)*.04)*L.mane,(x,y,z)=>C.mat(x,y,z,.6),5);
 for(const s of [-1,1])for(let k=0;k<3;k++)spike(P,[s*.07,.11-k*.015,.02+k*.012],[s*.3,-1,.2],.012,.045,(x,y,z)=>C.mat(x,y,z,.5));
 // a rat's whiskers
 if(L.rat)for(const s of [-1,1])for(let k=0;k<3;k++)limb(P,[s*.015,.08,.08+sn*.8],[s*.1,.075+(k-1)*.014,.06+sn*.6],.0015,.0008,C.socket,3);
 return P.merge();
}
// the eyes: slanted slits glowing in the sockets
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0095,10,8),at(s*.03,.116,.082,[0,0,-s*.35],[1.35,.6,.6]),[1,1,1]);
 return P.merge();
}

// frayed trousers torn off at the shin, bare hairy shins, and a long bare foot up on its clawed toes
function buildLeg(L,C){
 const P=pieces();
 P.add(rag(lathe([[.066,0],[.064,-.12],[.056,-.22],[.054,-.28]],14),-.24,L.rat?5:9,.05),at(0,0,0),(x,y,z)=>mix(C.trouser,C.trouserHi,clamp01(z*12+.4)*.6));
 limb(P,[0,-.22,0],[0,-.4,-.005],.04,.03,(x,y,z)=>C.hide(x,y,z,.5),10);
 // the foot: heel lifted, the long instep and the toes splayed on the floor
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,-.41,-.008),C.skinLo);
 limb(P,[0,-.415,-.005],[0,-.455,.07],.03,.024,(x,y,z)=>C.hide(x,y,z,.25),10);
 for(let k=0;k<4;k++){
  const x=(k-1.5)*.017;
  P.add(new THREE.CapsuleGeometry(.008,.022,3,6),at(x,-.462,.088,[Math.PI/2-.1,0,0]),C.skinLo);
  spike(P,[x*1.1,-.465,.104],[x*1.2,-.6,1],.005,.022,(px,py,pz)=>mix(C.nail,C.nailHi,clamp01((pz-.105)*40)),4);
 }
 return P.merge();
}

// a torn sleeve to the elbow, a sinewy forearm streaked with fur, and a long hooked claw of a hand
function buildArm(L,C,seed){
 const P=pieces();
 const sleeve=(x,y,z)=>mix(C.shirtDark,C.shirt,.35+(Math.sin(y*40+x*30)*.5+.5)*.65);
 P.add(new THREE.SphereGeometry(.06,14,10),at(0,0,0),sleeve);
 P.add(rag(lathe([[.055,0],[.054,-.09],[.05,-.16]],16),-.13,seed,.04),at(0,0,0),sleeve);
 limb(P,[0,-.12,0],[0,-.3,.01],.04,.03,(x,y,z)=>C.hide(x,y,z,.42),10);
 // the hand, long and bony, the fingers hooked forward into claws
 P.add(new THREE.BoxGeometry(.05,.07,.03),at(0,-.335,.012),C.skinLo);
 for(let k=0;k<4;k++){
  const x=(k-1.5)*.013,l=k===1||k===2?1:.85;
  limb(P,[x,-.365,.015],[x*1.1,-.405*l-(1-l)*.05,.035],.0075,.0065,C.skinLo,5);
  limb(P,[x*1.1,-.405*l-(1-l)*.05,.035],[x*1.15,-.42*l-(1-l)*.055,.06],.0065,.0055,C.skinLo,5);
  spike(P,[x*1.15,-.42*l-(1-l)*.055,.06],[0,-.4,1],.005,.03,(px,py,pz)=>mix(C.nail,C.nailHi,clamp01((pz-.06)*35)),4);
 }
 limb(P,[.026,-.32,.02],[.03,-.36,.045],.009,.007,C.skinLo,5);// the thumb
 spike(P,[.03,-.36,.045],[0,-.5,1],.0045,.022,C.nail,4);
 return P.merge();
}

const cache={};
function geometry(kind){
 if(!cache[kind]){
  const L=LOOKS[kind],C=colours(L);
  cache[kind]={L,body:buildBody(L,C),head:buildHead(L,C),eyes:buildEyes(),leg:buildLeg(L,C),armL:buildArm(L,C,13),armR:buildArm(L,C,17),
   hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:.02,side:THREE.DoubleSide}),
   glow:new THREE.MeshStandardMaterial({color:'#fff0c0',emissive:L.eye,emissiveIntensity:2.2,roughness:.2,metalness:0})};
 }
 return cache[kind];
}
function mesh(parent,geo,name,m,S){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function isWereMan(name){return WERE_MEN.includes(name);}
export function createWereMan(kind){
 const S=geometry(kind),L=S.L,g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(L.scale);
 mesh(body,S.body,'body',S.hide,S);
 // the head hangs low and thrust out on the curled neck, glaring up
 const head=new THREE.Group();head.position.set(0,NECK_Y-.01,hunch(L.hunch,NECK_Y)+.03);head.rotation.x=-.1;body.add(head);
 mesh(head,S.head,'head',S.hide,S);const eyes=mesh(head,S.eyes,'eyes',S.glow,S);
 const legs=[],arms=[],shoulderZ=hunch(L.hunch,SHOULDER_Y);
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.075*L.wide,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide,S);legs.push(leg);
  // long arms hanging a little forward, ready to rake
  const arm=new THREE.Group();arm.position.set(s*(.23*L.wide+.02),SHOULDER_Y,shoulderZ);arm.rotation.set(-.18,0,s*.08);body.add(arm);mesh(arm,s<0?S.armL:S.armR,'arm',S.hide,S);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.35,.02);arms[1].add(weaponSocket);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind,arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
