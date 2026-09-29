import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The hobbit used to be the generic short humanoid: a teal box for a body and a brown lump of
// hair. It now stands as a plump little halfling: a round rosy face with a button nose, a smile
// and pointed ears under a mop of brown curls; a cream shirt with the sleeves rolled to the elbow,
// a red neckerchief, and a green waistcoat left open over the belly, with brass buttons and a
// watch chain looped from the pocket. Brown knee breeches are buttoned at the knee, and a leather
// belt with a brass buckle carries a short sword in a scabbard at the left hip. Below the knee
// it's bare shins and the big, bare, hairy feet, with toes and curly tufts on top.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured mesh with one
// shared material: 6 draws. The geometry is built once and shared by every hobbit.
// Handles: legs, arms, arm, weaponSocket (empty, at the right hand), head, body. The pivots
// match the old humanoid('hobbit') (shoulders at ±.28, .7; hand .3 down the arm; head centre
// .87), which gait.js and fidget.js's head scratch are tuned to. hat, beard and pick are null.

const SKIN=rgb('#e8b894'),SKIN_SHADE=rgb('#c48e6c'),CHEEK=rgb('#e0857a'),LIPS=rgb('#a85a50');
const EYE=rgb('#2a1a10'),EYE_GLINT=rgb('#f4efe6');
const HAIR=rgb('#7a4a24'),HAIR_DARK=rgb('#3e2412'),HAIR_LIGHT=rgb('#9a6434');
const SHIRT=rgb('#efe6cf'),SHIRT_SHADE=rgb('#c8bc9c');
const VEST=rgb('#5f7d34'),VEST_DARK=rgb('#3a4e1e'),VEST_TRIM=rgb('#c8a040');
const BREECH=rgb('#7a5634'),BREECH_DARK=rgb('#4e3620'),LEATHER=rgb('#4a3020'),LEATHER_DARK=rgb('#2c1c12');
const BRASS=rgb('#d0a848'),BRASS_DARK=rgb('#8a6a28'),SCARF=rgb('#b8402a'),SCARF_DARK=rgb('#7a2618');
const STEEL=rgb('#b8c0c4');

const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
// a curl: a squashed little ball, lighter on top
const curl=(x,y,z)=>mix(HAIR_DARK,HAIR_LIGHT,THREE.MathUtils.clamp((y+.03)/.06,0,1));

function buildBody(){
 const P=pieces();
 // breeches seat and hips
 P.add(lathe([[.0,.3],[.12,.3],[.16,.34],[.175,.42],[.172,.47]],24),at(0,0,0,[0,0,0],[1,1,.85]),ramp(BREECH_DARK,BREECH,.3,.46));
 // shirt: a round pot belly bulging forward, narrowing to the shoulders and neck
 P.add(lathe([[.17,.46],[.188,.52],[.19,.57],[.178,.63],[.16,.68],[.12,.72],[.06,.745],[0,.75]],28),at(0,0,.012,[0,0,0],[1,1,.92]),(x,y,z)=>mix(ramp(SHIRT_SHADE,SHIRT,.46,.6)(y),SHIRT_SHADE,z<0?.25:0));
 // waistcoat: the same shape standing just off the shirt, open in front, with a darker hem
 P.add(lathe([[.178,.48],[.198,.53],[.2,.57],[.188,.63],[.17,.68],[.13,.718]],24,.55,Math.PI*2-1.1),at(0,0,.012,[0,0,0],[1,1,.92]),(x,y)=>y<.495||y>.71?VEST_DARK:ramp(VEST_DARK,VEST,.49,.62)(y));
 // brass buttons down the right front edge, button holes on the left
 for(let i=0;i<4;i++){
  const y=.52+i*.045,a=.55,r=.195-Math.abs(y-.57)*.15;
  P.add(new THREE.SphereGeometry(.011,8,6),at(Math.sin(a)*r,y,Math.cos(a)*r*.92+.016,[0,0,0],[1,1,.6]),BRASS);
  P.add(new THREE.BoxGeometry(.018,.005,.004),at(-Math.sin(a)*r,y,Math.cos(a)*r*.92+.014,[0,-a,0]),VEST_DARK);
 }
 // watch chain looped from a button across the belly to the left pocket, with the pocket slit
 const chain=[];for(let i=0;i<=16;i++){const t=i/16;chain.push(new THREE.Vector3(.098-t*.2,.555-Math.sin(t*Math.PI)*.045,.188+Math.sin(t*Math.PI)*.02));}
 P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chain),24,.0035,4),null,BRASS);
 P.add(new THREE.BoxGeometry(.05,.006,.006),at(-.12,.55,.16,[0,-.6,0]),VEST_DARK);
 P.add(new THREE.CylinderGeometry(.013,.013,.006,10),at(-.105,.548,.168,[Math.PI/2,0,-.6]),BRASS_DARK);
 // belt with a brass buckle
 P.add(new THREE.TorusGeometry(.176,.016,5,28),at(0,.465,.012,[Math.PI/2,0,0],[1,.9,1]),LEATHER);
 P.add(new THREE.BoxGeometry(.05,.04,.012),at(0,.465,.178),BRASS);
 P.add(new THREE.BoxGeometry(.03,.022,.014),at(0,.465,.179),LEATHER_DARK);
 // neckerchief: a roll round the neck and a knotted triangle hanging in front
 P.add(new THREE.TorusGeometry(.066,.02,6,18),at(0,.742,.012,[Math.PI/2+.12,0,0]),(x,y)=>ramp(SCARF_DARK,SCARF,.73,.76)(y));
 P.add(new THREE.SphereGeometry(.022,8,6),at(0,.73,.08),SCARF);
 P.add(new THREE.ConeGeometry(.04,.08,3),at(0,.69,.085,[Math.PI+.25,0,0],[1,1,.35]),SCARF);
 // neck
 P.add(new THREE.CylinderGeometry(.05,.058,.08,12),at(0,.77,.015),SKIN_SHADE);
 // a short sword in a leather scabbard at the left hip, hilt forward
 const sword=m=>new THREE.Matrix4().multiplyMatrices(at(-.19,.43,.02,[1.15,0,.15]),m);
 P.add(new THREE.CylinderGeometry(.018,.012,.26,8),sword(at(0,-.13,0,[0,0,0],[1,1,.55])),ramp(LEATHER_DARK,LEATHER,-.25,-.05));
 P.add(new THREE.ConeGeometry(.013,.03,8),sword(at(0,-.275,0,[Math.PI,0,0],[1,1,.55])),BRASS_DARK);
 P.add(new THREE.BoxGeometry(.08,.012,.018),sword(at(0,.006,0)),BRASS);
 P.add(new THREE.CylinderGeometry(.009,.009,.06,6),sword(at(0,.042,0)),LEATHER_DARK);
 P.add(new THREE.SphereGeometry(.014,8,6),sword(at(0,.078,0)),BRASS);
 P.add(new THREE.BoxGeometry(.04,.012,.006),sword(at(0,-.02,.01)),STEEL);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a round face with full cheeks and a soft double chin; head centre at y .09 in the head group
 P.add(new THREE.SphereGeometry(.14,18,14),at(0,.09,0,[0,0,0],[1,1.02,.98]),(x,y,z)=>mix(SKIN,SKIN_SHADE,z<-.04?.3:0));
 P.add(new THREE.SphereGeometry(.07,12,10),at(0,.022,.07,[0,0,0],[1.2,.75,.9]),SKIN);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.04,10,8),at(s*.072,.06,.1,[0,0,0],[1,.8,.6]),mix(SKIN,CHEEK,.55));
  // eyes: dark, with a glint, under soft brows
  P.add(new THREE.SphereGeometry(.018,10,8),at(s*.048,.108,.124,[0,0,0],[1,1.1,.6]),EYE);
  P.add(new THREE.SphereGeometry(.005,6,4),at(s*.048+.006,.116,.134),EYE_GLINT);
  P.add(new THREE.BoxGeometry(.046,.01,.014),at(s*.05,.138,.124,[0,0,s*-.18]),HAIR_DARK);
  // pointed ears, leaf-shaped, swept up and back
  P.add(new THREE.ConeGeometry(.034,.12,6),at(s*.14,.12,-.01,[-.35,0,s*-.95],[1,1,.4]),(x,y,z)=>mix(SKIN,CHEEK,.25));
 }
 // button nose and a smile
 P.add(new THREE.SphereGeometry(.024,10,8),at(0,.08,.142,[0,0,0],[1.05,.9,.9]),mix(SKIN,CHEEK,.3));
 P.add(new THREE.TorusGeometry(.032,.006,4,12,Math.PI*.8),at(0,.05,.128,[-.25,0,Math.PI+Math.PI*.1]),LIPS);
 // a mop of brown curls: a close cap, then a scatter of little balls over the crown and nape,
 // stopping above the brow and behind the ears
 P.add(new THREE.SphereGeometry(.148,18,10,0,Math.PI*2,0,Math.PI*.5),at(0,.1,-.01,[-.3,0,0]),(x,y)=>mix(HAIR_DARK,HAIR,THREE.MathUtils.clamp((y-.1)/.08,0,1)));
 for(let i=0;i<52;i++){
  const u=hash(i*3.1+1),v=hash(i*7.7+2),th=u*Math.PI*2,phi=Math.acos(1-v*1.25);
  const nx=Math.sin(phi)*Math.sin(th),ny=Math.cos(phi),nz=Math.sin(phi)*Math.cos(th);
  // keep the face and ears clear
  if(nz>.35&&ny<.55)continue;if(Math.abs(nx)>.7&&ny<.35&&nz>-.3)continue;
  const r=.026+hash(i*5.3)*.016;
  const g=new THREE.SphereGeometry(r,6,4);
  const pos=new THREE.Vector3(nx,ny,nz).multiplyScalar(.148).add(new THREE.Vector3(0,.1,-.01));
  P.add(g,at(pos.x,pos.y,pos.z,[hash(i)*3,hash(i+.5)*3,0],[1,.8,1]),curl);
 }
 return P.merge();
}

// Knee breeches buttoned below the knee, a bare shin and a big bare hairy foot.
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.075,.062,.18,12),at(0,-.08,0),ramp(BREECH_DARK,BREECH,-.17,0));
 P.add(new THREE.TorusGeometry(.062,.012,5,14),at(0,-.17,0,[Math.PI/2,0,0]),BREECH_DARK);
 P.add(new THREE.SphereGeometry(.009,6,4),at(.055,-.165,.03),BRASS);
 P.add(new THREE.CylinderGeometry(.045,.04,.15,10),at(0,-.25,0),ramp(SKIN_SHADE,SKIN,-.32,-.18));
 // the foot: long and broad, flat under, a knobby heel
 P.add(new THREE.SphereGeometry(.065,14,10),at(0,-.33,.055,[0,0,0],[.95,.48,1.75]),(x,y)=>y<-.345?SKIN_SHADE:SKIN);
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.33,-.03,[0,0,0],[1,.8,1]),SKIN);
 // five toes across the front, the big toe on the inside (-x; mirrored for the left leg below)
 for(let i=0;i<5;i++){const x=-.036+i*.018,r=i===0?.019:.015-i*.001;P.add(new THREE.SphereGeometry(r,8,6),at(x,-.338,.16-Math.abs(i-1)*.006,[0,0,0],[1,.8,1.2]),SKIN);}
 // curly tufts on top of the foot
 for(let i=0;i<9;i++){const x=(hash(i*2.3)-.5)*.08,z=.01+hash(i*4.1)*.1;P.add(new THREE.SphereGeometry(.016,6,4),at(x,-.3+(.1-z)*.1,z,[0,hash(i)*3,0],[1,.6,1]),curl);}
 return P.merge();
}

// A shirt sleeve rolled to the elbow, a bare forearm and a stubby hand.
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.068,12,10),at(0,-.02,0,[0,0,0],[1,1,1]),SHIRT);
 P.add(new THREE.CylinderGeometry(.06,.052,.14,12),at(0,-.09,0),ramp(SHIRT_SHADE,SHIRT,-.16,-.02));
 P.add(new THREE.TorusGeometry(.054,.017,6,14),at(0,-.165,0,[Math.PI/2,0,0]),SHIRT_SHADE);
 P.add(new THREE.CylinderGeometry(.044,.038,.12,10),at(0,-.225,0),ramp(SKIN_SHADE,SKIN,-.28,-.17));
 P.add(new THREE.SphereGeometry(.046,10,8),at(0,-.3,.005,[0,0,0],[.9,1.1,.8]),SKIN);
 P.add(new THREE.SphereGeometry(.018,8,6),at(0,-.285,.04,[0,0,0],[1,1.4,1]),SKIN_SHADE);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.04,side:THREE.DoubleSide});
 const leg=buildLeg(),mirrored=leg.clone().scale(-1,1,1);
 // mirroring flips the winding (the normals are mirrored by scale()); turn it back
 const p=mirrored.attributes.position;for(let i=0;i<p.count;i+=3){for(const key of ['position','normal','color']){const a=mirrored.attributes[key];for(let k=0;k<a.itemSize;k++){const t=a.array[(i+1)*a.itemSize+k];a.array[(i+1)*a.itemSize+k]=a.array[(i+2)*a.itemSize+k];a.array[(i+2)*a.itemSize+k]=t;}}}
 S={body:buildBody(),head:buildHead(),legs:[mirrored,leg],arm:buildArm()};
 return S;
}
function mesh(parent,geo,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createHobbit(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.78,.02);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const [i,s] of [-1,1].entries()){
  const leg=new THREE.Group();leg.position.set(s*.095,.36,0);body.add(leg);mesh(leg,S.legs[i],'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.28,.7,0);arm.rotation.z=s*.12;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.3,.01);arms[1].add(weaponSocket);
 return {g,body,legs,tail:null,wings:[],quirk:'hobbit',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
