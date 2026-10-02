import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';
import {forgedPickHead} from './dwarf.js';

// The miner (peaceful in the Convict quest's mines, made with a pick-axe and a lit brass lantern)
// shares the humans' letter, so he used to be the plain `@` humanoid. He now stands as a gaunt,
// hunched tunneller who has been under the rock too long: shoulders rolled forward, head thrust out
// from under a battered leather hard hat with a burnt-out tallow stub in its bracket, wax run down
// the brim. His face is blackened with coal dust, streaked pale where the sweat ran, the cheeks sunk
// and stubbled, the mouth a cracked grim line; the eyes have gone pale in the dark and catch the
// light like a cave thing's. A rag scarf is knotted at his throat. A grimy undyed shirt with the
// sleeves rolled to the elbow over bony, soot-black forearms; a scorched leather apron with straps
// over the shoulders; a rope belt with a coil of rope, a canvas pouch and a dented tin flask. Patched
// trousers, sacking wound round the shins, heavy hobnailed boots. A rag-wrapped hand grips a worn
// pick-axe with a rusted, chipped head leant back on the shoulder; the other hangs a lit brass
// lantern by its bail.
// Each moving part (body, head, each leg and arm, the pick) is one merged, vertex-coloured mesh on
// one shared material, plus the glowing eyes and the lantern's flame: 9 draws. The lantern is baked
// into the left arm; its flame is tagged part 'flame', so flame-flicker.js flickers and lights it.
// Geometry is built once and shared.
// Handles: legs, arms, arm (the pick arm), weaponSocket, head, eyes, body, lantern (the flame's arm).

const C={
 skin:rgb('#6e5e50'),skinPale:rgb('#9a8878'),soot:rgb('#1c1816'),shadow:rgb('#050404'),lip:rgb('#3a2422'),
 hair:rgb('#1e1a18'),
 shirt:rgb('#7a7060'),shirtDark:rgb('#2e2a24'),
 apron:rgb('#3e2a1c'),apronHi:rgb('#6a4e36'),apronDark:rgb('#1a120c'),
 rope:rgb('#8a7448'),ropeDark:rgb('#4a3c22'),canvas:rgb('#6a6248'),
 cloth:rgb('#3a3630'),clothDark:rgb('#1a1816'),patch:rgb('#4e4232'),rag:rgb('#5a2a1c'),ragDark:rgb('#2a120c'),
 sack:rgb('#6a5a3e'),sackDark:rgb('#3a3022'),
 boot:rgb('#201812'),bootHi:rgb('#4a3a2c'),
 hat:rgb('#3a2818'),hatHi:rgb('#6a5038'),hatDark:rgb('#140e08'),
 wax:rgb('#d8ccb0'),waxDark:rgb('#8a7e66'),
 tin:rgb('#6a6e70'),tinHi:rgb('#a8acae'),
 iron:rgb('#2a2a2c'),ironHi:rgb('#5a5a5e'),rust:rgb('#6a3418'),
 wood:rgb('#5a4630'),woodDark:rgb('#2e2418'),
 brass:rgb('#a0782a'),brassHi:rgb('#e0b860'),brassDark:rgb('#4a3410'),glass:rgb('#e8d8a8'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// coal dust: grime gathers low and in the folds, broken up by blotches
const grime=(base,dark,k=1)=>(x,y,z)=>mix(base,dark,clamp01((.5+hash(Math.round(x*60)*31+Math.round(y*60)*17+Math.round(z*60))*.5)*k*(.55+Math.sin(Math.atan2(x,z)*6+y*9)*.2)));

export const HIP_Y=.46,SHOULDER_Y=.82,NECK_Y=.92,HUNCH=.06;
// the hunch: everything above the waist is pushed forward, more the higher it is
const hunchZ=y=>Math.pow(clamp01((y-.55)/.4),1.6)*HUNCH;

function buildBody(){
 const P=pieces();
 // the thin, sunken-chested body in its grimy shirt, sweat-dark under the arms and down the chest
 P.add(lathe([[.14,.42],[.13,.52],[.118,.62],[.128,.72],[.148,.8],[.15,.85],[.12,.89],[.06,.92]],36),at(0,0,0,[0,0,0],[1,1,.74]),(x,y,z)=>{
  let c=grime(C.shirt,C.shirtDark,.9)(x,y,z);
  if(Math.abs(z)>.06&&Math.abs(x)<.03&&y>.62)c=mix(c,C.shirtDark,.5);
  return c;
 });
 // the scorched leather apron over the front, its hem burnt ragged, and its straps over the shoulders
 const apron=lathe([[.158,.3],[.152,.42],[.142,.54],[.13,.62],[.14,.72],[.152,.78]],18,-.95,1.9);
 const p=apron.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<.31){const k=Math.round((Math.atan2(p.getX(i),p.getZ(i))+1)*9);p.setY(i,y+hash(k)*.05);}}
 apron.computeVertexNormals();
 P.add(apron,at(0,0,.004,[0,0,0],[1,1,.8]),(x,y,z)=>{
  const burn=clamp01((.37-y)*12)*hash(Math.round(x*40));
  return mix(mix(C.apronDark,C.apronHi,clamp01(Math.sin(y*40+x*20)*.3+.35)),C.apronDark,burn+clamp01((.45-y)*3)*.4);
 });
 for(const s of [-1,1]){
  limb(P,[s*.07,.77,.12],[s*.11,.88,.02],.012,.012,C.apronDark,4);
  limb(P,[s*.11,.88,.02],[s*.08,.62,-.11],.012,.012,C.apronDark,4);
 }
 // the rope belt, a coil of rope at the left hip, a canvas pouch at the right and a tin flask behind
 P.add(new THREE.TorusGeometry(.142,.011,5,40),at(0,.5,0,[Math.PI/2,0,0],[1,.78,1]),(x,y,z)=>mix(C.ropeDark,C.rope,clamp01(Math.sin(Math.atan2(x,z)*40)*.5+.5)));
 for(let k=0;k<4;k++)P.add(new THREE.TorusGeometry(.05,.008,5,20),at(-.16,.43+k*.004,.01+k*.003,[0,Math.PI/2,k*.25],[1,1.15,1]),k%2?C.rope:C.ropeDark);
 P.add(new THREE.BoxGeometry(.06,.07,.04),at(.13,.44,.07,[0,-.5,0]),grime(C.canvas,C.shirtDark,.8));
 P.add(new THREE.BoxGeometry(.065,.022,.045),at(.13,.48,.072,[.15,-.5,0]),C.canvas);
 P.add(new THREE.CylinderGeometry(.03,.03,.09,10),at(.05,.43,-.12,[0,0,.12],[1,1,.6]),(x,y,z)=>mix(mix(C.tin,C.tinHi,clamp01(x*20+.6)),C.iron,hash(Math.round(y*80))>.85?.6:0));
 P.add(new THREE.CylinderGeometry(.008,.01,.02,6),at(.044,.48,-.12),C.iron);
 // the neck, sinewy, and the rag scarf knotted at the throat with its ends hanging
 P.add(new THREE.CylinderGeometry(.032,.04,.09,12),at(0,.93,.0),C.soot);
 P.add(new THREE.TorusGeometry(.045,.016,6,24),at(0,.9,.0,[Math.PI/2+.25,0,0],[1,1,1]),grime(C.rag,C.ragDark,.9));
 P.add(new THREE.SphereGeometry(.02,8,6),at(.02,.88,.05),C.rag);
 for(const [dx,a] of [[.01,.2],[.03,-.15]])P.add(new THREE.BoxGeometry(.026,.09,.006),at(.02+dx,.83,.06,[.25,0,a]),(x,y,z)=>mix(C.ragDark,C.rag,clamp01((y-.78)*12)));
 const geo=P.merge(),q=geo.attributes.position;
 for(let i=0;i<q.count;i++)q.setZ(i,q.getZ(i)+hunchZ(q.getY(i)));
 geo.computeVertexNormals();
 return geo;
}

function buildHead(){
 const P=pieces();
 // the gaunt, coal-blackened head; head centre at .1
 P.add(new THREE.SphereGeometry(.08,24,18),at(0,.1,0,[0,0,0],[.86,1.06,.98]),(x,y,z)=>{
  // the deep, dark-ringed eye sockets
  for(const s of [-1,1])if(z>.04&&Math.hypot(x-s*.029,(y-.104)*1.4)<.02)return C.shadow;
  // the cracked grim mouth
  if(z>.06&&Math.abs(y-.05-Math.abs(x)*.12)<.003&&Math.abs(x)<.026)return C.lip;
  let c=mix(C.soot,C.skin,clamp01(z*7+.1)*.7);
  // pale streaks where the sweat ran down through the dust
  if(z>.02&&Math.abs(Math.sin(x*90+1))<.12&&y<.12)c=mix(c,C.skinPale,.55);
  // sunken cheeks and a dark stubbled jaw
  if(z>.02&&Math.abs(x)>.03&&y<.085&&y>.04)c=mix(c,C.shadow,.45);
  if(y<.06&&hash(Math.round(x*400)*13+Math.round(y*400)+Math.round(z*400)*7)>.55)c=mix(c,C.soot,.7);
  return c;
 });
 // a heavy brow, sharp cheekbones, a broken nose and ears
 P.add(new THREE.CapsuleGeometry(.011,.05,4,8),at(0,.124,.066,[0,0,Math.PI/2],[1,1,.7]),C.soot);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.013,8,6),at(s*.043,.086,.058,[0,0,0],[1.2,.6,.8]),C.skin);
  P.add(new THREE.SphereGeometry(.016,8,6),at(s*.07,.1,0,[0,0,0],[.45,1,.7]),C.skin);
 }
 P.add(new THREE.ConeGeometry(.011,.04,6),at(.004,.09,.088,[Math.PI/2+.4,0,.15]),(x,y,z)=>mix(C.soot,C.skin,clamp01(y*9-.6)));
 // lank hair hanging from under the hat at the sides and back
 for(let i=0;i<11;i++){
  const a=Math.PI*.55+i/10*Math.PI*.9,r=.074;
  P.add(new THREE.ConeGeometry(.012,.06+hash(i)*.03,4),at(Math.sin(a)*r,.11,Math.cos(a)*r,[Math.cos(a)*.25,0,-Math.sin(a)*.25+Math.PI]),C.hair);
 }
 // the battered leather hard hat: a dented dome, a narrow brim, a lamp bracket at the front holding
 // a burnt-out tallow stub, wax run down over the brim
 const dome=new THREE.SphereGeometry(.088,24,12,0,Math.PI*2,0,Math.PI*.5);
 const d=dome.attributes.position;
 for(let i=0;i<d.count;i++){const x=d.getX(i),y=d.getY(i),z=d.getZ(i);const dent=Math.exp(-((x-.04)**2+(y-.06)**2+(z-.04)**2)/.0008)*.012;const k=1-dent/.088;d.setXYZ(i,x*k,y*k,z*k);}
 dome.computeVertexNormals();
 P.add(dome,at(0,.135,-.005,[-.12,0,0],[1,.9,1.05]),(x,y,z)=>mix(C.hatDark,mix(C.hat,C.hatHi,clamp01(y*8-1.2)),.6+hash(Math.round(x*50)+Math.round(z*50)*9)*.4));
 const brim=new THREE.CylinderGeometry(.12,.12,.008,40,1);
 const b=brim.attributes.position;
 for(let i=0;i<b.count;i++){const x=b.getX(i),z=b.getZ(i),r=Math.hypot(x,z);if(r<.08)continue;const a=Math.atan2(x,z);b.setY(i,b.getY(i)-(r-.08)*(.25+Math.sin(a*3+1)*.2));}
 brim.computeVertexNormals();
 P.add(brim,at(0,.135,-.005,[-.12,0,0]),(x,y,z)=>Math.hypot(x,z)>.11?C.hatDark:C.hat);
 P.add(new THREE.TorusGeometry(.087,.006,5,32),at(0,.142,-.005,[Math.PI/2-.12,0,0]),C.hatDark);
 P.add(new THREE.BoxGeometry(.03,.04,.012),at(0,.17,.085,[-.3,0,0]),C.iron);
 P.add(new THREE.CylinderGeometry(.016,.014,.012,10),at(0,.195,.098),C.ironHi);
 P.add(new THREE.CylinderGeometry(.011,.012,.03,10),at(0,.214,.098),(x,y,z)=>mix(C.waxDark,C.wax,clamp01((y-.2)*40)));
 P.add(new THREE.CylinderGeometry(.0015,.0015,.008,4),at(0,.232,.098),C.shadow);
 for(let k=0;k<3;k++)P.add(new THREE.CapsuleGeometry(.003,.012+k*.008,3,5),at(-.008+k*.008,.18-k*.006,.106+k*.006,[.3,0,0]),C.wax);
 return P.merge();
}
// the eyes, gone pale from the dark
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0072,8,6),at(s*.029,.104,.073,[0,0,s*.1],[1.2,.8,.6]),[1,1,1]);
 return P.merge();
}

// patched trousers, sacking wound round the shins, heavy hobnailed boots
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.064,0],[.062,-.1],[.05,-.22]],14),at(0,0,0),grime(C.cloth,C.clothDark,.8));
 P.add(new THREE.BoxGeometry(.06,.07,.02),at(0,-.19,.045,[-.1,0,0]),(x,y,z)=>Math.abs(x)>.026||Math.abs(y+.19)>.031?C.ropeDark:C.patch);
 const sack=lathe([[.056,-.22],[.05,-.3],[.046,-.38],[.05,-.41]],14);
 P.add(sack,at(0,0,0),(x,y,z)=>mix(C.sackDark,C.sack,clamp01(Math.sin(y*160+Math.atan2(x,z)*.9)*.5+.5)));
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.44,.03,[0,0,0],[.85,.6,1.55]),(x,y,z)=>mix(C.boot,C.bootHi,clamp01(y*10+4.6)));
 P.add(new THREE.BoxGeometry(.084,.02,.17),at(0,-.462,.03),C.boot);
 for(let k=0;k<7;k++)for(const s of [-1,1])P.add(new THREE.SphereGeometry(.004,4,3),at(s*.04,-.47,-.04+k*.022),C.ironHi);
 return P.merge();
}

// a shirt sleeve rolled to the elbow, a bony soot-black forearm, a rag-wrapped hand; the left one
// hangs a lit brass lantern by its bail
export const LANTERN_FLAME_Y=-.54;
function buildArm(lantern){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.055,14,10,0,Math.PI*2,0,Math.PI*.6),at(0,0,0),grime(C.shirt,C.shirtDark,.7));
 P.add(lathe([[.046,-.02],[.044,-.1],[.04,-.15]],12),at(0,0,0),grime(C.shirt,C.shirtDark,.8));
 P.add(new THREE.TorusGeometry(.04,.013,6,14),at(0,-.155,0,[Math.PI/2,0,0]),grime(C.shirt,C.shirtDark,1));
 P.add(lathe([[.03,-.16],[.033,-.2],[.026,-.28],[.022,-.3]],10),at(0,0,0),(x,y,z)=>mix(C.soot,C.skin,clamp01(z*14+.3)*.5));
 P.add(new THREE.SphereGeometry(.026,10,8),at(0,-.325,.005,[0,0,0],[.85,1.15,.85]),grime(C.rag,C.ragDark,1.2));
 for(let k=0;k<4;k++)P.add(new THREE.CapsuleGeometry(.0058,.02,3,6),at(-.016+k*.011,-.35,.022,[.9,0,0]),C.soot);
 limb(P,[.02,-.318,.012],[.026,-.346,.028],.008,.006,C.soot,6);
 if(lantern){
  // the brass lantern: a ring bail in the fist, a pierced brass cap, a glass chimney in a wire cage
  // and a heavy brass fount
  P.add(new THREE.TorusGeometry(.028,.003,4,16,Math.PI),at(0,-.36,.01,[0,0,Math.PI]),C.brassDark);
  P.add(new THREE.ConeGeometry(.04,.045,10),at(0,-.405,.01),(x,y,z)=>hash(Math.round(Math.atan2(x,z-.01)*5)+Math.round(y*120)*7)>.7?C.brassDark:mix(C.brass,C.brassHi,clamp01(x*20+.5)));
  P.add(new THREE.CylinderGeometry(.012,.012,.012,8),at(0,-.378,.01),C.brassHi);
  P.add(new THREE.CylinderGeometry(.04,.04,.008,12),at(0,-.43,.01),C.brass);
  P.add(new THREE.CylinderGeometry(.03,.03,.09,12,1,true),at(0,-.48,.01),(x,y)=>mix(C.glass,[1,1,.92],clamp01((y+.52)*8)));
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4;P.add(new THREE.BoxGeometry(.004,.09,.004),at(Math.sin(a)*.033,-.48,.01+Math.cos(a)*.033),C.brassDark);}
  P.add(new THREE.CylinderGeometry(.044,.048,.05,14),at(0,-.55,.01),(x,y,z)=>mix(C.brassDark,mix(C.brass,C.brassHi,clamp01(x*18+.5)),.4+clamp01((y+.57)*20)*.6));
  P.add(new THREE.CylinderGeometry(.048,.048,.006,14),at(0,-.577,.01),C.brassDark);
  P.add(new THREE.CylinderGeometry(.006,.006,.014,6),at(.03,-.522,.04,[Math.PI/2,0,0]),C.iron);// the wick key
 }
 return P.merge();
}

// a worn pick-axe: a long haft dark with handling, a cord-bound grip, and a rusted, chipped head;
// gripped at its origin, butt at y −.13, the head at .56 with its point facing +z
function buildPick(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.015,.019,.72,10),at(0,.235,0),(x,y,z)=>mix(C.wood,C.woodDark,clamp01(hash(Math.round(y*40)+Math.round(Math.atan2(z,x)*3))*.5+clamp01(.1-y)*4)));
 P.add(new THREE.SphereGeometry(.024,10,8),at(0,-.125,0,[0,0,0],[1,.75,1]),C.woodDark);
 for(let k=0;k<7;k++)P.add(new THREE.TorusGeometry(.021,.004,5,12),at(0,-.06+k*.022,0,[Math.PI/2+.15,0,0]),k%2?C.rope:C.ropeDark);
 P.add(forgedPickHead(),at(0,.56,0,[0,-Math.PI/2,0]),(x,y,z)=>{
  const tip=Math.pow(Math.min(1,Math.abs(z)/.19),2.5),rust=hash(Math.round(z*120)*7+Math.round(x*200))>.6?.7:.15;
  return mix(mix(C.iron,C.rust,rust),C.ironHi,tip*.8);
 });
 // a chip knocked out of the chisel end
 P.add(new THREE.BoxGeometry(.012,.02,.012),at(0,.56,-.17,[.4,0,.3]),C.shadow);
 P.add(new THREE.CylinderGeometry(.028,.028,.07,8),at(0,.56,0),C.iron);
 P.add(new THREE.BoxGeometry(.022,.016,.01),at(0,.6,0),C.rust);// the wedge
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[-.38,0,0]));// leant back towards the shoulder
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(false),lanternArm:buildArm(true),pick:buildPick(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:.1,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#e8e2c0',emissive:'#a89a60',emissiveIntensity:.9,roughness:.15,metalness:0}),
  flameGeo:new THREE.SphereGeometry(.011,8,6).scale(1,1.9,1),
  flame:new THREE.MeshStandardMaterial({color:0xffd27a,emissive:0xffa530,emissiveIntensity:2.2,roughness:.4})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createMiner(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.06);
 mesh(body,S.body,'body',S.hide);
 // the head thrust forward on the hunch, chin up, peering out from under the brim
 const head=new THREE.Group();head.position.set(0,NECK_Y,HUNCH+.015);head.rotation.x=-.08;body.add(head);
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.07,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.19,SHOULDER_Y,hunchZ(SHOULDER_Y));arm.rotation.z=s*.08;body.add(arm);
  mesh(arm,s<0?S.lanternArm:S.arm,'arm',S.hide);arms.push(arm);
 }
 const flame=mesh(arms[0],S.flameGeo,'flame',S.flame);flame.position.set(0,LANTERN_FLAME_Y,.01);flame.castShadow=false;
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.34,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.pick,'pick',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'miner',arms,arm:arms[1],weaponSocket,lantern:arms[0],head,eyes,hat:null,beard:null,pick:null};
}
