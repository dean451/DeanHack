import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The prisoner (the captives left to rot in special-level cells) shares the humans' letter, so it used
// to be the plain `@` humanoid. It is now a starved wretch bent almost double from years in a low cell,
// its head hung forward and peering up. Its waxy grey skin is stretched over the skull; its eyes are pale
// and wet, sunk in bruised sockets, and long matted hair hangs in greasy hanks to its shoulders with a
// straggling beard down its chest. It wears a sack of rotten burlap belted with a twist of rope, torn
// into strips at the hem and ripped open over the ribs, with the knobs of its spine pushing through
// at the back. An iron collar is riveted round its neck, and a heavy chain hangs from it down the chest,
// the last link wrenched open. Both wrists are manacled, each trailing a stub of snapped chain, and
// both ankles are fettered over raw, chafed skin. Its fingernails are long, cracked and black. It clutches
// a long bone, gnawed clean and ground to a point on the cell stones.
// Each moving part (body, head, each leg and arm, the bone) is one merged, vertex-coloured mesh on one
// shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the bone arm), weaponSocket, head, eyes, body.

const C={
 skin:rgb('#8a8a7a'),skinDark:rgb('#46443a'),skinHi:rgb('#a8a694'),bruise:rgb('#4a3a48'),socket:rgb('#140e10'),
 raw:rgb('#8a3a30'),rawDark:rgb('#4a1612'),
 hair:rgb('#3a3630'),hairGrey:rgb('#7a766a'),grease:rgb('#1e1c18'),
 sack:rgb('#7a6a4c'),sackDark:rgb('#3c3222'),filth:rgb('#2e2818'),stain:rgb('#4a2a18'),
 rope:rgb('#5a4c34'),ropeDark:rgb('#2a2218'),
 iron:rgb('#2e3034'),ironHi:rgb('#6a6e74'),rust:rgb('#5e2e16'),rustHi:rgb('#8e4a22'),
 bone:rgb('#c8bc98'),boneDark:rgb('#6e6248'),marrow:rgb('#4a2a1c'),nail:rgb('#1a1612'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// tear a lathe shell's hem into long, uneven strips
function rag(geo,below,seed,deep=.06){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y>below)continue;
  const seg=Math.round((Math.atan2(p.getX(i),p.getZ(i))+Math.PI)/(Math.PI*2)*28);
  p.setY(i,y+(seg%3?deep*(.4+hash(seg+seed)*1.1):hash(seg+seed+5)*deep*.25));
 }
 geo.computeVertexNormals();
 return geo;
}
// coarse burlap: a woven grain, filth soaking up from the hem, brown stains
const sack=(lo,hi)=>(x,y,z)=>{
 const weave=(Math.sin(x*420)*Math.sin(y*420)>0?.1:0)+hash(Math.floor(x*60)+Math.floor(y*60)*17+Math.floor(z*60)*5)*.12;
 let c=mix(C.sackDark,C.sack,.35+clamp01(z*6+.5)*.45+weave);
 c=mix(c,C.filth,clamp01((hi-y)/(hi-lo))*.55);
 if(hash(Math.floor(x*14)+Math.floor(y*14)*31+Math.floor(z*14)*7)>.86)c=mix(c,C.stain,.6);
 return c;
};
const flesh=(x,y,z)=>mix(C.skinDark,C.skin,clamp01(z*14+.5)*.8+hash(Math.floor(y*90))*.1);
const ironC=(x,y,z)=>mix(C.iron,C.rust,hash(Math.floor(Math.atan2(x,z)*6)+Math.floor(y*200))*.7);
// a chain link, an elongated ring; an open one is wrenched apart
function link(P,x,y,z,r,open=false){
 P.add(new THREE.TorusGeometry(.013,.0045,4,10,open?Math.PI*1.4:Math.PI*2),at(x,y,z,r,[1,1.6,1]),open?C.rustHi:(px,py)=>mix(C.iron,C.rust,hash(Math.floor(py*300))*.7));
}
// a hanging run of links from (x,y,z), each turned a quarter to the last, sagging toward dz
function chain(P,x,y,z,n,dz=0,dx=0){
 for(let k=0;k<n;k++)link(P,x+dx*k,y-k*.028,z+dz*k,[0,k%2?Math.PI/2:0,(hash(k+x*50)-.5)*.3],k===n-1);
}
// an iron cuff with a rivet, the skin under it rubbed raw
function cuff(P,y,r){
 P.add(new THREE.CylinderGeometry(r+.002,r+.002,.012,12,1,true),at(0,y-.022,0),(x,yy,z)=>mix(C.rawDark,C.raw,hash(Math.floor(Math.atan2(x,z)*5))));
 P.add(new THREE.TorusGeometry(r+.006,.01,6,18),at(0,y,0,[Math.PI/2,0,0],[1,1,1.6]),ironC);
 P.add(new THREE.CylinderGeometry(.006,.006,.02,6),at(r+.012,y,0,[0,0,Math.PI/2]),C.ironHi);
}

export const HIP_Y=.46,SHOULDER_Y=.8,NECK_Y=.89;

function buildBody(){
 const P=pieces();
 // the wasted torso inside the sack, so the rips show skin, not daylight
 P.add(new THREE.CylinderGeometry(.115,.1,.38,18),at(0,.64,0,[0,0,0],[1.05,1,.72]),flesh);
 // the burlap sack: a hole for the head, slits for the arms, belted, falling to the knee in strips
 P.add(rag(lathe([[.16,.28],[.165,.4],[.15,.5],[.14,.6],[.155,.7],[.18,.78],[.17,.84],[.12,.88],[.06,.905]],32),.36,5),at(0,0,0,[0,0,0],[1.1,1,.75]),sack(.25,.9));
 // the rip over the ribs, left of the chest: dark skin with the ribs standing out
 P.add(new THREE.SphereGeometry(.06,12,8),at(-.12,.66,.07,[0,-.6,0],[.55,1,.25]),C.skinDark);
 for(let k=0;k<4;k++)P.add(new THREE.CapsuleGeometry(.0055,.055,2,5),at(-.125,.62+k*.025,.08,[0,-.6,Math.PI/2+.2]),C.skinHi);
 // the spine knobbing through a tear down the back
 P.add(new THREE.BoxGeometry(.05,.24,.02),at(0,.68,-.112,[.1,0,0]),C.skinDark);
 for(let k=0;k<6;k++)P.add(new THREE.SphereGeometry(.011,6,5),at(0,.58+k*.036,-.118+k*.003,[0,0,0],[1,.8,.9]),C.skinHi);
 // the rope belt, a twisted cord knotted at the hip with a frayed tail
 P.add(new THREE.TorusGeometry(.16,.008,5,30),at(0,.48,0,[Math.PI/2,0,0],[1.06,.74,1]),(x,y,z)=>Math.sin(Math.atan2(x,z)*40)>0?C.rope:C.ropeDark);
 P.add(new THREE.SphereGeometry(.016,8,6),at(.13,.48,.08),C.rope);
 limb(P,[.13,.47,.085],[.15,.36,.1],.006,.003,C.rope,4);
 limb(P,[.125,.47,.085],[.12,.38,.11],.005,.003,C.ropeDark,4);
 // the scrawny neck, sinews standing out
 P.add(new THREE.CylinderGeometry(.032,.045,.1,12),at(0,.9,.04,[.45,0,0]),C.skinDark);
 limb(P,[.018,.86,.07],[.012,.94,.07],.007,.005,C.skin,5);
 limb(P,[-.018,.86,.07],[-.012,.94,.07],.007,.005,C.skin,5);
 // the riveted iron collar, the skin under it chafed raw, a staple ring at the front
 P.add(new THREE.CylinderGeometry(.044,.048,.012,14,1,true),at(0,.875,.035,[.45,0,0]),C.raw);
 P.add(new THREE.TorusGeometry(.05,.012,6,20),at(0,.895,.04,[Math.PI/2+.45,0,0],[1.05,1,1.4]),ironC);
 for(const s of [-1,1])P.add(new THREE.CylinderGeometry(.007,.007,.02,6),at(s*.05,.9,.04,[0,0,Math.PI/2]),C.ironHi);
 P.add(new THREE.TorusGeometry(.012,.005,5,10),at(0,.865,.11,[0,0,0]),C.iron);
 // the heavy chain from the collar ring down the chest, sagging away from the stooped body
 chain(P,0,.84,.115,7,.004,.001);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the skull, the skin stretched tight and waxy over it; head centre at .1
 P.add(new THREE.SphereGeometry(.074,24,18),at(0,.105,0,[0,0,0],[.88,1.06,1.02]),(x,y,z)=>{
  // the sockets sunk deep, bruised purple round the rims
  if(z>.035)for(const s of [-1,1]){const d=Math.hypot(x-s*.027,(y-.108)*1.25);if(d<.026)return d<.016?mix(C.socket,C.bruise,d/.016):mix(C.bruise,C.skinDark,(d-.016)/.01);}
  // the cheeks fallen in under the bones
  if(z>.02&&y<.09&&y>.045&&Math.abs(x)>.026)return mix(C.skinDark,C.skin,.25);
  return mix(C.skinDark,C.skinHi,clamp01(z*9+.3)*.7);
 });
 // the sharp brow and cheekbones
 P.add(new THREE.CapsuleGeometry(.009,.064,3,8),at(0,.128,.058,[0,0,Math.PI/2],[1,1,.8]),C.skin);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.014,8,6),at(s*.042,.088,.05,[0,0,0],[1,.6,.8]),C.skinHi);
 // the thin, pinched nose
 P.add(new THREE.ConeGeometry(.011,.038,6),at(0,.09,.075,[1.3,0,0]),C.skin);
 // the narrow jaw and a slack mouth showing a dark gap of missing teeth
 P.add(new THREE.SphereGeometry(.046,14,10),at(0,.045,.022,[0,0,0],[.9,.8,1.12]),(x,y,z)=>{
  if(Math.abs(y-.045)<.005&&z>.058&&Math.abs(x)<.018)return hash(Math.floor(x*500))>.5?C.socket:C.boneDark;
  return mix(C.skinDark,C.skin,clamp01(z*14));
 });
 // the long matted hair: a greasy cap, then hanks hanging to the shoulders round the back and sides,
 // two lank strands falling either side of the face
 const hair=(x,y,z)=>mix(C.grease,mix(C.hair,C.hairGrey,hash(Math.floor(Math.atan2(x,z)*12))*.7),.4+clamp01(y*5+.2)*.4);
 P.add(new THREE.SphereGeometry(.079,22,14,0,Math.PI*2,0,Math.PI*.52),at(0,.11,-.008,[-.35,0,0],[.92,1.02,1.06]),hair);
 for(let i=0;i<15;i++){
  const a=Math.PI*.42+i/14*Math.PI*1.16,len=.13+hash(i+40)*.12;
  const x=Math.sin(a)*.066,z=Math.cos(a)*.07-.004;
  limb(P,[x,.13,z],[x*1.35+(hash(i+9)-.5)*.03,.13-len,z*1.3-.02],.014,.003,hair,5);
 }
 for(const s of [-1,1])limb(P,[s*.055,.13,.04],[s*.06,-.04,.06],.01,.0025,hair,5);
 // the straggling beard, thin and knotted, hanging from the chin and jaw
 const beard=(x,y,z)=>mix(C.grease,C.hairGrey,clamp01((y+.15)*3)*.5+hash(Math.floor(x*300))*.35);
 for(let i=0;i<9;i++){
  const t=(i-4)/4,len=.1+hash(i+61)*.12-Math.abs(t)*.04;
  limb(P,[t*.032,.03,.05-Math.abs(t)*.014],[t*.036+(hash(i+2)-.5)*.03,.03-len,.06+hash(i+5)*.02],.008,.0015,beard,5);
 }
 // the ears, one torn
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.017,8,6),at(s*.066,.1,0,[0,s*.3,0],[.35,1,.7]),C.skinDark);
 return P.merge();
}
// the eyes: a pale, wet glint deep in each bruised socket
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0075,8,6),at(s*.027,.108,.07,[0,0,0],[1.2,.75,.6]),[1,1,1]);
 return P.merge();
}

// a stick-thin bare leg with a knobbed knee, a fetter at the ankle trailing a snapped hobble chain,
// and a long, filthy bare foot
function buildLeg(left){
 const P=pieces(),s=left?-1:1;
 limb(P,[0,0,0],[0,-.2,.012],.042,.028,flesh,10);
 P.add(new THREE.SphereGeometry(.033,10,8),at(0,-.21,.018),C.skinDark);// the knee
 limb(P,[0,-.21,.012],[0,-.42,0],.028,.02,flesh,10);
 cuff(P,-.39,.02);
 // the broken hobble: a few links hanging from the inner side of the fetter
 chain(P,-s*.03,-.395,.004,left?3:2,.006,-s*.004);
 P.add(new THREE.SphereGeometry(.024,10,8),at(0,-.43,0),C.skinDark);
 P.add(new THREE.SphereGeometry(.042,12,8),at(0,-.452,.032,[0,0,0],[.7,.32,1.5]),(x,y,z)=>mix(C.filth,C.skinDark,clamp01((y+.465)*50)));
 for(let k=0;k<4;k++){
  const x=-.02+k*.014;
  P.add(new THREE.CapsuleGeometry(.006,.015,2,5),at(x,-.458,.094,[Math.PI/2,0,x*3]),C.skinDark);
  P.add(new THREE.BoxGeometry(.007,.003,.007),at(x,-.452,.106),C.nail);
 }
 return P.merge();
}

// a bare, bony arm out of a torn arm-slit: a knobbed elbow, a manacle trailing a stub of chain, and a
// long-fingered hand with cracked black nails
function buildArm(left){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.045,12,10),at(0,0,0),sack(-.05,.05));
 P.add(rag(lathe([[.048,.01],[.046,-.04],[.044,-.07]],14),-.05,left?3:8,.03),at(0,0,0),sack(-.1,0));
 limb(P,[0,-.02,0],[0,-.15,.01],.026,.02,flesh,10);
 P.add(new THREE.SphereGeometry(.024,10,8),at(0,-.155,.006),C.skinDark);// the elbow
 limb(P,[0,-.155,.01],[0,-.29,.016],.02,.016,flesh,10);
 cuff(P,-.255,.016);
 chain(P,left?-.03:.03,-.26,0,left?3:2,0,left?-.003:.003);
 // the long, skeletal hand, fingers hooked
 P.add(new THREE.BoxGeometry(.04,.048,.026),at(0,-.32,.012),(x,y,z)=>mix(C.skinDark,C.skin,clamp01((z+.005)*20)));
 for(let k=0;k<4;k++){
  const x=-.014+k*.0095;
  limb(P,[x,-.343,.02],[x,-.375,.034],.0055,.0045,C.skin,5);
  limb(P,[x,-.375,.034],[x,-.388,.02],.0045,.0035,C.skin,5);
  P.add(new THREE.ConeGeometry(.0038,.016,4),at(x,-.396,.012,[Math.PI+.3,0,0]),C.nail);
 }
 limb(P,[.021,-.31,.018],[.024,-.342,.04],.007,.005,C.skin,5);// the thumb
 return P.merge();
}

// the bone: a long thighbone gnawed clean, the knuckle end the grip, the shaft split and ground to a
// point on the cell stones. Built along +y from the grip.
function buildBone(){
 const P=pieces();
 const shade=(x,y,z)=>mix(C.boneDark,C.bone,clamp01(z*30+.5)*.6+hash(Math.floor(y*120))*.3);
 // the rounded knuckle at the butt, two condyles
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.018,10,8),at(s*.012,-.05,0),shade);
 // the shaft, slightly bowed, gnawed rough in places
 P.add(lathe([[.012,-.05],[.011,0],[.0095,.06],[.0095,.12],[.011,.16],[.0125,.18]],10),null,(x,y,z)=>hash(Math.floor(y*90)+Math.floor(Math.atan2(x,z)*3))>.85?C.boneDark:shade(x,y,z));
 // the split end ground to a jagged point, the dark marrow channel showing
 P.add(new THREE.ConeGeometry(.0125,.09,7),at(.003,.225,0,[0,0,-.06],[1,1,.7]),(x,y,z)=>y<.2&&Math.abs(x)<.004?C.marrow:mix(C.bone,[.92,.88,.76],clamp01((y-.2)*20)));
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[1.2,0,0]));// clutched low, point forward
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),legL:buildLeg(true),legR:buildLeg(false),armL:buildArm(true),armR:buildArm(false),bone:buildBone(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:.06,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#eee8cc',emissive:'#c8c090',emissiveIntensity:1.1,roughness:.15,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createPrisoner(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.05);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.085);head.rotation.x=.32;body.add(head);// hung low, peering up from under the brow
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.07,HIP_Y,0);body.add(leg);mesh(leg,s<0?S.legL:S.legR,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.195,SHOULDER_Y,0);arm.rotation.z=s*.06;arm.rotation.x=-.18;body.add(arm);mesh(arm,s<0?S.armL:S.armR,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.33,.02);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.bone,'bone',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'prisoner',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
