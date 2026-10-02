import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The convict (UnNetHack's escaped prisoners, the Convict's fellow inmates) shares the humans' letter,
// so it used to be the plain `@` humanoid. It now stoops as a gaunt, rangy jailbird, shoulders hunched
// and head thrust forward. Its scalp is shaved to grey stubble and split by a jagged, stitched scar; its
// cheeks are hollow, its brow heavy, and from deep sockets two pale, feral eyes glint. It wears the
// striped prison suit, black and dirty white, torn at the knees and the cuffs, with a stencilled number
// patch on the chest. An iron manacle still clamps each wrist; the left trails a broken chain of three
// links, and the right grips a jagged shiv, a glass shard bound in filthy rag. The right ankle is
// shackled to a heavy iron ball, pitted and rusted, that drags at its heel. Its feet are bare.
// Each moving part (body, head, each leg and arm, the shiv) is one merged, vertex-coloured mesh on one
// shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the shiv arm), weaponSocket, head, eyes, body.

const C={
 skin:rgb('#9a8270'),skinDark:rgb('#4e3a30'),skinHi:rgb('#b89c86'),stubble:rgb('#4a4440'),
 scar:rgb('#c08a7a'),scarDark:rgb('#5a2a24'),socket:rgb('#1a100c'),
 stripeW:rgb('#b8b2a0'),stripeWDark:rgb('#6e6858'),stripeB:rgb('#18171a'),grime:rgb('#4a4030'),
 patch:rgb('#d0c8b0'),ink:rgb('#101010'),
 iron:rgb('#34363a'),ironHi:rgb('#7a7e84'),rust:rgb('#6a3418'),rustHi:rgb('#9a5428'),
 rag:rgb('#6a604c'),ragDark:rgb('#2e281e'),glass:rgb('#7a9a8a'),glassHi:rgb('#d0e8dc'),blood:rgb('#4a0c08'),
 nail:rgb('#3a2c22'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// tear a lathe shell's hem into ragged points
function rag(geo,below,seed,deep=.05){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y>below)continue;
  const seg=Math.round((Math.atan2(p.getX(i),p.getZ(i))+Math.PI)/(Math.PI*2)*24);
  p.setY(i,y+(seg%2?deep*(.5+hash(seg+seed)*.9):hash(seg+seed+5)*deep*.3));
 }
 geo.computeVertexNormals();
 return geo;
}
// the prison stripes, horizontal bands of black and grimy white, filthier toward the hem
const stripes=(lo,hi,width=.045)=>(x,y,z)=>{
 const band=Math.floor((y+100)/width)%2===0,dirt=clamp01((hi-y)/(hi-lo))*.45+hash(Math.floor(x*40)+Math.floor(y*40)*7)*.12;
 const shade=.55+clamp01(z*8+.5)*.45;
 return band?mix(C.stripeB,C.grime,dirt*.4):mix(mix(C.stripeWDark,C.stripeW,shade),C.grime,dirt);
};
// a manacle: a thick iron band with a hinge lug and a rusty bolt
function manacle(P,y){
 P.add(new THREE.TorusGeometry(.043,.011,6,18),at(0,y,0,[Math.PI/2,0,0]),(x,yy,z)=>mix(C.iron,C.rust,hash(Math.floor(Math.atan2(x,z)*6)+3)*.6));
 P.add(new THREE.BoxGeometry(.02,.026,.016),at(.046,y,0),C.iron);
 P.add(new THREE.CylinderGeometry(.006,.006,.03,6),at(.05,y,0),C.rustHi);
}
// a chain link, an elongated ring
function link(P,x,y,z,r){P.add(new THREE.TorusGeometry(.013,.0045,4,10),at(x,y,z,r,[1,1.6,1]),(px,py,pz)=>mix(C.iron,C.rust,hash(Math.floor(py*300))*.7));}

export const HIP_Y=.48,SHOULDER_Y=.86,NECK_Y=.96;

function buildBody(){
 const P=pieces();
 // the narrow torso inside the shirt, so the hem never shows daylight
 P.add(new THREE.CylinderGeometry(.13,.12,.38,18),at(0,.68,0,[0,0,0],[1.1,1,.75]),C.stripeB);
 // the striped prison shirt, slack on a starved frame, hanging below the waist in a torn hem
 P.add(rag(lathe([[.175,.4],[.17,.5],[.155,.6],[.16,.7],[.185,.8],[.2,.87],[.15,.93],[.07,.965]],32),.47,3,.04),at(0,0,0,[0,0,0],[1.1,1,.75]),stripes(.4,.95));
 // the ribs showing through a rip in the right flank
 P.add(new THREE.SphereGeometry(.05,10,8),at(.14,.64,.08,[0,.7,0],[.5,1,.25]),C.skinDark);
 for(let k=0;k<3;k++)P.add(new THREE.CapsuleGeometry(.006,.05,2,5),at(.15,.61+k*.028,.088,[0,.7,Math.PI/2-.15]),C.skin);
 // the stencilled number patch, sewn crooked on the chest
 P.add(new THREE.BoxGeometry(.1,.05,.006),at(-.06,.77,.145,[-.12,-.18,.06]),(x,y,z)=>{
  // four blocky digits, stamped in black ink
  const u=(x+.11)*80,v=(y-.77)*80;
  if(Math.abs(v)<1.4&&u>.3&&u<7.7&&Math.floor(u)%2===0&&Math.sin(u*5+v*3)>-.4)return C.ink;
  return mix(C.patch,C.grime,.25);
 });
 for(let k=0;k<6;k++)P.add(new THREE.BoxGeometry(.005,.008,.003),at(-.11+k*.02,.797,.149,[0,-.18,.3]),C.ink);// the stitches along its top
 // the open collar, with the stringy neck rising from it
 P.add(new THREE.CylinderGeometry(.075,.09,.05,18,1,true),at(0,.955,.01,[-.15,0,0]),stripes(.9,1));
 P.add(new THREE.CylinderGeometry(.038,.05,.09,12),at(0,.97,.03,[.25,0,0]),C.skinDark);
 limb(P,[.02,.93,.06],[.012,1.01,.06],.008,.006,C.skin,5);// the tendons
 limb(P,[-.02,.93,.06],[-.012,1.01,.06],.008,.006,C.skin,5);
 // a frayed rope through the trouser loops in place of a belt
 P.add(new THREE.TorusGeometry(.17,.009,5,30),at(0,.49,0,[Math.PI/2,0,0],[1.08,.76,1]),(x,y,z)=>Math.sin(Math.atan2(x,z)*36)>0?C.rag:C.ragDark);
 limb(P,[.05,.49,.13],[.07,.4,.14],.006,.004,C.rag,4);
 // the trouser seat
 P.add(new THREE.CylinderGeometry(.16,.15,.1,20),at(0,.47,0,[0,0,0],[1.05,1,.75]),stripes(.4,.6));
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the shaved skull, long and bony; head centre at .1
 P.add(new THREE.SphereGeometry(.078,24,18),at(0,.105,0,[0,0,0],[.9,1.08,1.05]),(x,y,z)=>{
  // the jagged scar running over the crown from brow to the back, stitched
  const path=x-.02-Math.sin(z*60)*.008;
  if(Math.abs(path)<.006&&y>.09)return Math.abs(path)<.0025?C.scarDark:C.scar;
  if(Math.abs(path)<.014&&y>.1&&Math.abs(Math.sin(z*180))<.25)return C.scarDark;
  // the sunken eye sockets
  if(z>.04)for(const s of [-1,1]){const d=Math.hypot(x-s*.028,(y-.11)*1.3);if(d<.022)return mix(C.socket,C.skinDark,d/.022);}
  // the cheeks hollow under the bones
  if(z>.03&&y<.09&&y>.05&&Math.abs(x)>.03)return mix(C.skinDark,C.skin,.35);
  // grey stubble over the scalp, skin below
  const scalp=clamp01((y-.12+z*.4)*30);
  return mix(mix(C.skinDark,C.skin,.4+clamp01(z*10)*.6),C.stubble,scalp*.75);
 });
 // the heavy brow ridge
 P.add(new THREE.CapsuleGeometry(.012,.07,3,8),at(0,.13,.06,[0,0,Math.PI/2],[1,1,.8]),(x,y,z)=>mix(C.skinDark,C.skin,clamp01((z-.06)*80)));
 // the hooked, broken nose
 P.add(new THREE.ConeGeometry(.014,.04,6),at(.004,.09,.08,[1.35,0,.15]),C.skin);
 // the lean jaw, jutting, with a thin lipless mouth
 P.add(new THREE.SphereGeometry(.05,14,10),at(0,.045,.025,[0,0,0],[1,.8,1.15]),(x,y,z)=>Math.abs(y-.048)<.003&&z>.06&&Math.abs(x)<.022?C.socket:mix(C.skinDark,mix(C.skin,C.stubble,.35),clamp01(z*14)));
 // ears, one notched
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.018,8,6),at(s*.07,.1,0,[0,s*.3,0],[.35,1,.7]),C.skinDark);
 P.add(new THREE.BoxGeometry(.012,.012,.012),at(.074,.115,.004),C.socket);
 return P.merge();
}
// the eyes: a pale, feral glint deep in each socket
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0075,8,6),at(s*.028,.11,.073,[0,0,0],[1.2,.7,.6]),[1,1,1]);
 return P.merge();
}

// striped trousers torn off at the shin, a bony bare leg and a long gnarled foot
function buildLeg(ball){
 const P=pieces();
 P.add(rag(lathe([[.062,0],[.06,-.12],[.055,-.24],[.058,-.3]],14),-.27,ball?7:11,.04),at(0,0,0),stripes(-.3,0,.04));
 P.add(new THREE.CylinderGeometry(.03,.026,.17,10),at(0,-.36,0),(x,y,z)=>mix(C.skinDark,C.skin,clamp01(z*14+.5)));
 // the knobbed ankle and the long bare foot with splayed toes
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,-.445,0),C.skinDark);
 P.add(new THREE.SphereGeometry(.045,12,8),at(0,-.458,.035,[0,0,0],[.75,.3,1.5]),(x,y,z)=>mix(C.skinDark,C.skin,clamp01((y+.47)*60)));
 for(let k=0;k<4;k++){
  const x=-.022+k*.015;
  P.add(new THREE.CapsuleGeometry(.0065,.016,2,5),at(x,-.462,.1+(k===1?.006:0),[Math.PI/2,0,(x)*3]),C.skin);
  P.add(new THREE.BoxGeometry(.007,.003,.006),at(x,-.456,.112),C.nail);
 }
 if(ball){
  // the shackle round the ankle, a chain of links to the iron ball dragging at the heel
  P.add(new THREE.TorusGeometry(.036,.009,6,16),at(0,-.43,0,[Math.PI/2,0,0]),(x,y,z)=>mix(C.iron,C.rust,hash(Math.floor(Math.atan2(x,z)*5))*.6));
  P.add(new THREE.BoxGeometry(.016,.02,.014),at(.03,-.43,-.024,[0,.6,0]),C.iron);
  const L=[[.04,-.44,-.045,[0,.6,.2]],[.058,-.452,-.07,[Math.PI/2,.6,0]],[.074,-.46,-.096,[0,.6,.5]],[.088,-.463,-.122,[Math.PI/2,.6,0]]];
  for(const [x,y,z,r] of L)link(P,x,y,z,r);
  // the ball: pitted cast iron, rusted where it drags, a cast ring on top
  P.add(new THREE.IcosahedronGeometry(.075,3),at(.12,-.405,-.18),(x,y,z)=>{
   const pit=hash(Math.floor(x*90)+Math.floor(y*90)*13+Math.floor(z*90)*71);
   if(pit>.93)return C.rust;
   return mix(mix(C.iron,C.ironHi,clamp01((y+.36)*10)*.4),C.rust,clamp01((-.44-y)*30)*.7+pit*.15);
  });
  P.add(new THREE.TorusGeometry(.016,.006,5,10),at(.104,-.34,-.155,[0,.6,0]),C.iron);
 }
 return P.merge();
}

// a slack striped sleeve torn off at the elbow, a sinewy forearm, a manacle on the wrist, and a
// clawed, bony hand. The left trails three links of broken chain; the right is the shiv hand.
function buildArm(left){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.058,12,10),at(0,0,0),stripes(-.1,.1,.04));
 P.add(rag(lathe([[.055,0],[.052,-.1],[.05,-.14]],14),-.12,left?5:9,.035),at(0,0,0),stripes(-.15,0,.04));
 P.add(new THREE.CylinderGeometry(.03,.024,.16,10),at(0,-.21,0),(x,y,z)=>{
  // a cord of vein down the forearm
  if(Math.abs(x+.008-Math.sin(y*80)*.004)<.003&&z>0)return C.skinDark;
  return mix(C.skinDark,C.skin,clamp01(z*16+.5));
 });
 manacle(P,-.27);
 // the knuckly hand, fingers curled into claws
 P.add(new THREE.BoxGeometry(.046,.05,.034),at(0,-.31,.006),(x,y,z)=>mix(C.skinDark,C.skin,clamp01((z+.01)*20)));
 for(let k=0;k<4;k++){
  const x=-.016+k*.011;
  limb(P,[x,-.33,.016],[x,-.355,.03],.006,.005,C.skin,5);
  limb(P,[x,-.355,.03],[x,-.36,.015],.005,.004,C.skin,5);
  P.add(new THREE.ConeGeometry(.004,.01,4),at(x,-.364,.009,[Math.PI,0,0]),C.nail);
 }
 limb(P,[.024,-.3,.012],[.026,-.335,.036],.008,.006,C.skin,5);// the thumb
 if(left){
  // the broken chain hanging from the manacle, the last link snapped open
  link(P,-.04,-.29,0,[0,0,0]);
  link(P,-.046,-.318,.004,[0,Math.PI/2,0]);
  link(P,-.046,-.346,.004,[0,0,.25]);
  P.add(new THREE.TorusGeometry(.013,.0045,4,8,Math.PI*1.4),at(-.05,-.374,.006,[0,Math.PI/2,.5],[1,1.6,1]),C.rustHi);
 }
 return P.merge();
}

// the shiv: a jagged shard of bottle glass, its butt bound in filthy rag. Built along +y from the grip.
function buildShiv(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.016,.018,.09,8),at(0,0,0),(x,y,z)=>Math.sin(y*160+Math.atan2(x,z)*2)>.3?C.ragDark:C.rag);
 for(let k=0;k<3;k++)P.add(new THREE.ConeGeometry(.006,.03,3),at(-.012+k*.012,-.055,0,[Math.PI+(k-1)*.3,0,0]),C.ragDark);// the trailing rag ends
 // the shard itself, a flat, uneven blade with a nicked edge
 const blade=new THREE.BufferGeometry(),pts=[[-.018,.04],[.02,.04],[.016,.09],[.024,.13],[.008,.17],[.012,.2],[-.002,.25],[-.01,.18],[-.016,.15],[-.012,.1]];
 const pos=[];
 for(const side of [1,-1]){
  for(let i=1;i<pts.length-1;i++){
   const a=pts[0],b=pts[i],c=pts[i+1];
   const tri=side>0?[a,b,c]:[a,c,b];
   for(const [x,y] of tri)pos.push(x,y,side*.004*(1-y*3));
  }
 }
 // seal the thin edge
 for(let i=0;i<pts.length;i++){
  const [x0,y0]=pts[i],[x1,y1]=pts[(i+1)%pts.length],t0=.004*(1-y0*3),t1=.004*(1-y1*3);
  pos.push(x0,y0,t0,x1,y1,-t1,x1,y1,t1, x0,y0,t0,x0,y0,-t0,x1,y1,-t1);
 }
 blade.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));blade.computeVertexNormals();
 P.add(blade,null,(x,y,z)=>y<.09&&hash(Math.floor(x*400)+Math.floor(y*300))>.6?C.blood:mix(C.glass,C.glassHi,clamp01((y-.05)*5)*.6+(Math.abs(z)<.001?.4:0)));
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[1.25,0,0]));// held low, point forward, ready to stab upward
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),legL:buildLeg(false),legR:buildLeg(true),armL:buildArm(true),armR:buildArm(false),shiv:buildShiv(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.08,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#f0f4e0',emissive:'#c8d8a0',emissiveIntensity:1.3,roughness:.2,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createConvict(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.05);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.06);head.rotation.x=.18;body.add(head);// thrust forward, eyes up from under the brow
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.075,HIP_Y,0);body.add(leg);mesh(leg,s<0?S.legL:S.legR,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.22,SHOULDER_Y,0);arm.rotation.z=s*.08;arm.rotation.x=-.12;body.add(arm);mesh(arm,s<0?S.armL:S.armR,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.32,.02);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.shiv,'shiv',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'convict',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
