import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Priests share the humans' letter, so the temple priest used to be the plain `@` humanoid.
// They now stand in a floor-length robe with an embroidered hem, a stole hanging down the front,
// a knotted rope belt with tasselled ends and a shoulder mantle, and wear a holy symbol (a gold
// ring round a star) on a chain. Wide bell sleeves fall to bare hands, sandalled toes peek out
// under the hem, and each carries a flanged mace, the priest's weapon. Temple priests pull their
// hood up; the high priest and the Arch Priest wear a gold-banded mitre with lappets and a white
// beard; acolytes go bareheaded with a tonsure.
// Each moving part (body, head, each leg and arm, and the mace) is one merged, vertex-coloured
// mesh with a shared material: 7 draws. The geometry is built once per kind and shared.
// Handles: legs, arms, arm (the mace arm), weaponSocket, head, body, like the humanoid rig.

const SKIN=rgb('#e0bfa0'),SKIN_SHADE=rgb('#b8927a'),LEATHER=rgb('#6a4a2c'),LEATHER_DARK=rgb('#3a2818');
const STEEL=rgb('#9aa2aa'),STEEL_DARK=rgb('#4e545a'),WOOD=rgb('#6a4a30'),ROPE=rgb('#c8b48a'),EYE=rgb('#1a1410');

export const PRIESTS={
 'aligned priest':{robe:'#3b3a52',mantle:'#2a293c',stole:'#e8e0c8',trim:'#d8b04a',hood:true},
 'high priest':{robe:'#ece6d6',mantle:'#8a1e2a',stole:'#8a1e2a',trim:'#d8b04a',mitre:true,beard:'#dedad2'},
 'arch priest':{robe:'#ece6d6',mantle:'#2e3e82',stole:'#2e3e82',trim:'#d8b04a',mitre:true,beard:'#a8a49c'},
 'priest':{robe:'#4a3a2e',mantle:'#35291f',stole:'#e8e0c8',trim:'#c8a860',hood:true},
 'priestess':{robe:'#4a3a2e',mantle:'#35291f',stole:'#e8e0c8',trim:'#c8a860',hood:true},
 'acolyte':{robe:'#6a5038',mantle:'#54402c',stole:'#b09060',trim:'#b09060',tonsure:true},
};

const lathe=(profile,segments=22)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const strand=(a,b,r,sides=5)=>new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(...a),new THREE.Vector3(...b)),1,r,sides,false);

function buildBody(o){
 const P=pieces(),C=o.C;
 // floor-length robe, flattened front to back, with a gold hem and an embroidered band above it
 P.add(lathe([[.245,.02],[.24,.05],[.205,.3],[.172,.55],[.165,.7],[.17,.78],[.13,.86],[.05,.9],[0,.905]]),at(0,0,0,[0,0,0],[1,1,.8]),
  (x,y)=>y<.065||Math.abs(y-.13)<.012?C.trim:ramp(C.robeDark,C.robe,.02,.8)(y));
 // the robe's underside, so a low camera doesn't see into it
 P.add(new THREE.CircleGeometry(.24,22),at(0,.021,0,[Math.PI/2,0,0],[1,.8,1]),C.robeDark);
 // stole: two bands down the front, following the robe's slope, with fringed ends
 for(const s of [-1,1]){
  P.add(new THREE.BoxGeometry(.05,.54,.012),at(s*.062,.57,.148,[-.075,0,0]),(x,y)=>y<.33?C.trim:C.stole);
  for(let i=0;i<4;i++)P.add(new THREE.BoxGeometry(.006,.035,.006),at(s*.062-.018+i*.012,.285,.168),C.trim);
 }
 // knotted rope belt with two tasselled ends
 P.add(new THREE.TorusGeometry(.174,.013,5,24),at(0,.6,0,[Math.PI/2,0,0],[1,.82,1]),ROPE);
 P.add(new THREE.SphereGeometry(.022,8,6),at(.05,.6,.138),ROPE);
 for(const [dx,len] of [[.04,.2],[.065,.16]]){
  P.add(strand([.05,.59,.14],[dx,.59-len,.16],.007),null,ROPE);
  P.add(new THREE.ConeGeometry(.014,.04,6),at(dx,.585-len,.16),mix(ROPE,LEATHER,.3));
 }
 // shoulder mantle with a trimmed edge
 P.add(new THREE.SphereGeometry(.205,22,10,0,Math.PI*2,0,Math.PI*.56),at(0,.72,0,[0,0,0],[1,.8,.86]),(x,y)=>y<.715?C.trim:ramp(C.mantleDark,C.mantle,.7,.88)(y));
 // neck
 P.add(new THREE.CylinderGeometry(.036,.042,.08,10),at(0,.9,.005),SKIN_SHADE);
 // holy symbol: a chain round the neck and a gold ring round a star at the breast
 for(const s of [-1,1])P.add(strand([s*.058,.865,.11],[0,.76,.168],.0035,4),null,C.trim);
 P.add(new THREE.TorusGeometry(.03,.006,6,18),at(0,.725,.172),C.trim);
 P.add(new THREE.OctahedronGeometry(.02,0),at(0,.725,.172,[0,0,Math.PI/4],[1,1,.4]),mix(C.trim,[1,1,1],.35));
 return P.merge();
}

function buildHead(o){
 const P=pieces(),C=o.C;
 // face with a strong nose, small ears and dark eyes under heavy brows
 P.add(new THREE.SphereGeometry(.1,16,12),at(0,.1,0,[0,0,0],[.9,1.05,.95]),SKIN);
 P.add(new THREE.SphereGeometry(.058,10,8),at(0,.04,.035),SKIN);
 P.add(new THREE.ConeGeometry(.015,.045,5),at(0,.09,.1,[Math.PI/2-.35,0,0]),SKIN_SHADE);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.024,8,6),at(s*.092,.095,-.005,[0,0,0],[.5,1,.8]),SKIN_SHADE);
  P.add(new THREE.SphereGeometry(.014,8,6),at(s*.036,.107,.085,[0,0,0],[1.3,.8,.6]),EYE);
  P.add(new THREE.BoxGeometry(.04,.01,.014),at(s*.037,.128,.088,[0,0,s*-.18]),o.beard?C.beard:C.hairDark);
 }
 if(o.beard){
  // a full beard and moustache
  P.add(new THREE.SphereGeometry(.07,12,10),at(0,.0,.06,[.25,0,0],[1,1.45,.65]),(x,y)=>mix(mix(C.beard,[0,0,0],.18),C.beard,(y+.1)/.15));
  for(const s of [-1,1])P.add(new THREE.SphereGeometry(.022,8,6),at(s*.022,.06,.095,[0,0,s*.4],[1.4,.6,.7]),C.beard);
 }
 if(o.hood){
  // cowl pulled up, open at the face, darker inside the opening, with a point behind
  P.add(new THREE.SphereGeometry(.135,22,14,Math.PI/2+.95,Math.PI*2-1.9,0,Math.PI*.76),at(0,.1,-.01,[0,0,0],[1,1.28,1.05]),
   (x,y,z)=>mix(C.mantle,C.mantleDark,THREE.MathUtils.clamp((z+.02)/.1,0,1)));
  P.add(new THREE.ConeGeometry(.05,.1,8),at(0,.16,-.14,[-2.2,0,0],[1,1,.7]),C.mantleDark);
 }
 if(o.mitre){
  // a tall mitre: two peaked faces with a gold cross band, over a gold circlet, lappets behind
  P.add(new THREE.ConeGeometry(.092,.22,20,1,true),at(0,.27,0,[0,0,0],[1,1,.62]),(x,y)=>Math.abs(x)<.012||y<.18?C.trim:C.robe);
  P.add(new THREE.CylinderGeometry(.094,.094,.035,20),at(0,.17,0,[0,0,0],[1,1,.95]),C.trim);
  P.add(new THREE.OctahedronGeometry(.016,0),at(0,.23,.056,[0,0,0],[1,1.3,.5]),C.stole);
  for(const s of [-1,1])P.add(new THREE.BoxGeometry(.028,.14,.006),at(s*.035,.09,-.1,[.12,0,0]),(x,y)=>y<.035?C.trim:C.robe);
 }
 if(o.tonsure){
  // a ring of hair round a bare crown
  P.add(new THREE.SphereGeometry(.104,16,8,0,Math.PI*2,Math.PI*.2,Math.PI*.3),at(0,.1,-.004,[-.1,0,0],[.92,1.06,.98]),C.hairDark);
 }
 return P.merge();
}

// Only a sandalled foot shows below the hem; the rest of the leg is hidden in the robe.
function buildLeg(o){
 const P=pieces(),C=o.C;
 P.add(new THREE.CylinderGeometry(.048,.044,.36,8),at(0,-.2,0),C.robeDark);
 P.add(new THREE.SphereGeometry(.042,10,8),at(0,-.44,.13,[0,0,0],[.95,.55,1.9]),SKIN);
 P.add(new THREE.BoxGeometry(.09,.012,.18),at(0,-.457,.13),LEATHER_DARK);
 for(const z of [.1,.17])P.add(new THREE.BoxGeometry(.092,.012,.014),at(0,-.43,z),LEATHER);
 return P.merge();
}

// A wide bell sleeve with a trimmed cuff, and a hand showing below it.
function buildArm(o){
 const P=pieces(),C=o.C;
 P.add(new THREE.CylinderGeometry(.045,.075,.32,12,1,true),at(0,-.16,0),(x,y)=>y<-.3?C.trim:ramp(C.robeDark,C.robe,-.32,0)(y));
 P.add(new THREE.SphereGeometry(.046,10,8),at(0,-.02,0),C.mantle);
 P.add(new THREE.CylinderGeometry(.024,.028,.08,8),at(0,-.3,0),SKIN_SHADE);
 P.add(new THREE.SphereGeometry(.03,8,8),at(0,-.36,.005,[0,0,0],[.85,1.2,1]),SKIN);
 return P.merge();
}

// A flanged mace: a turned wooden haft with a leather grip, a steel collar and six flanges round a
// knob. Built along +y from the grip, then tipped forward.
function buildMace(){
 const P=pieces(),tip=at(0,.02,0,[Math.PI/2-.55,0,0]),on=m=>new THREE.Matrix4().multiplyMatrices(tip,m);
 P.add(new THREE.CylinderGeometry(.012,.014,.36,8),on(at(0,.12,0)),(x,y,z)=>WOOD);
 P.add(new THREE.CylinderGeometry(.016,.016,.09,8),on(at(0,-.01,0)),LEATHER_DARK);
 P.add(new THREE.SphereGeometry(.02,8,6),on(at(0,-.065,0)),STEEL_DARK);
 P.add(new THREE.CylinderGeometry(.02,.018,.03,10),on(at(0,.29,0)),STEEL_DARK);
 P.add(new THREE.SphereGeometry(.032,10,8),on(at(0,.34,0)),STEEL);
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2;P.add(new THREE.BoxGeometry(.008,.08,.036),on(at(Math.sin(a)*.03,.34,Math.cos(a)*.03,[0,a,0])),(x,y,z)=>STEEL);}
 P.add(new THREE.ConeGeometry(.014,.03,6),on(at(0,.385,0)),STEEL);
 return P.merge();
}

const cache=new Map();
let material=null,mace=null;
function geometry(kind){
 if(cache.has(kind))return cache.get(kind);
 if(!material){
  material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:.06,side:THREE.DoubleSide});
  mace=buildMace();
 }
 const p=PRIESTS[kind],robe=rgb(p.robe),mantle=rgb(p.mantle);
 const o={...p,C:{robe,robeDark:mix(robe,[0,0,0],.4),mantle,mantleDark:mix(mantle,[0,0,0],.45),stole:rgb(p.stole),trim:rgb(p.trim),
  beard:p.beard?rgb(p.beard):null,hairDark:rgb('#3a2a1e')}};
 const S={body:buildBody(o),head:buildHead(o),leg:buildLeg(o),arm:buildArm(o)};
 cache.set(kind,S);
 return S;
}
function mesh(parent,geo,mat,name){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

const PRIEST_SCALE={'aligned priest':1.04,'high priest':1.06,'arch priest':1.08};

export function createPriest(name){
 const key=(name||'').toLowerCase(),kind=PRIESTS[key]?key:'aligned priest',S=geometry(kind);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(PRIEST_SCALE[kind]||1);// the high clergy tower in their vestments
 mesh(body,S.body,material,'body');
 const head=new THREE.Group();head.position.set(0,.93,.005);body.add(head);
 mesh(head,S.head,material,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.075,.46,0);body.add(leg);mesh(leg,S.leg,material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.175,.8,0);arm.rotation.z=s*.12;body.add(arm);mesh(arm,S.arm,material,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.36,.01);arms[1].add(weaponSocket);
 mesh(weaponSocket,mace,material,'mace');
 return {g,body,legs,tail:null,wings:[],quirk:'priest',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
