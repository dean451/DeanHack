import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The ninja (the Samurai quest's enemy) used to be the generic '@' humanoid. They now stand as a
// shinobi in night-dyed indigo-black: a close zukin hood wraps the head, leaving only a slit
// over narrowed amber eyes under a hard brow, and two long ragged tails of the hood's knot hang
// down the back. A crossed, wrapped jacket is cinched by a dark blood-red sash, with three
// shuriken tucked into it and a coil of cord on the right hip. Over the left shoulder a black
// cord holds the lacquered saya of the ninjato on the back, its mouth up behind the right
// shoulder. Tight hakama go into criss-cross kyahan shin wraps and split-toed tabi; tekko
// gauntlets cover the forearms. The right hand holds the ninjato low and forward: a straight,
// short blade with a dull oiled edge, a square iron tsuba and a diamond-wrapped hilt.
// Each moving part (body, head, each hood tail, each leg and arm, the sword) is one merged,
// vertex-coloured mesh with one shared material: 9 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the sword arm), weaponSocket, head, body, hoodTails (groups at the knot). The pivots match rogue.js
// and samurai.js (shoulders ±.215 at .82, hand .37 down the arm, legs ±.08 at .47, head at .955).

const CLOTH=rgb('#16171f'),CLOTH_DARK=rgb('#0a0a10'),CLOTH_HI=rgb('#2a2c3a'),CLOTH_SEAM=rgb('#06060a');
const SASH=rgb('#5a1216'),SASH_DARK=rgb('#300a0c'),SASH_HI=rgb('#7e2026');
const CORD=rgb('#0e0c0c'),CORD_HI=rgb('#2a2422'),LACQUER=rgb('#121014'),LACQUER_HI=rgb('#3c3640');
const IRON=rgb('#33363c'),IRON_HI=rgb('#6a6e76'),STEEL=rgb('#5e646c'),STEEL_HI=rgb('#a6acb4'),STEEL_DARK=rgb('#2a2e34');
const SKIN=rgb('#8a6650'),SHADOW=rgb('#050507'),EYE=rgb('#d8a030'),EYE_HOT=rgb('#ffd27a'),PUPIL=rgb('#140c06');
const WRAP=rgb('#22232c'),WRAP_HI=rgb('#3a3c4a'),HILT=rgb('#1a1418'),SAME=rgb('#7a7468');

const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const ring=(r,tube,radial=6,tubular=36)=>new THREE.TorusGeometry(r,tube,radial,tubular).rotateX(Math.PI/2);
// a four-pointed shuriken lying in its own xy plane
function shuriken(r){
 const s=new THREE.Shape();
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,k=i%2?r*.3:r;i?s.lineTo(Math.sin(a)*k,Math.cos(a)*k):s.moveTo(0,k);}
 const geo=new THREE.ExtrudeGeometry(s,{depth:.003,bevelEnabled:false,curveSegments:1});
 return geo.translate(0,0,-.0015);
}
// a ragged cloth tail hanging from its top along -y, thinning and twisting a little to a torn point
function tail(len,w){
 const geo=new THREE.PlaneGeometry(w,len,1,8).translate(0,-len/2,0),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i),t=-y/len;
  p.setX(i,p.getX(i)*(1-t*.75));
  p.setZ(i,-Math.sin(t*2.4)*.03*t-t*t*.05);
  // the torn end: one side ragged longer than the other
  if(t>.99)p.setY(i,y-(p.getX(i)>0?.03:-.01));
 }
 geo.computeVertexNormals();
 return geo;
}

function buildBody(){
 const P=pieces();
 // the jacket: close-wrapped, a little fuller over the chest
 P.add(lathe([[.172,.46],[.17,.54],[.162,.6],[.174,.7],[.19,.79],[.178,.86],[.12,.9],[.055,.918]],40),at(0,0,0,[0,0,0],[1,1,.8]),(x,y,z)=>{
  // the crossed front: the right panel over the left, its edge a dark seam
  const edge=z>0?x-(y-.6)*.55:9;
  if(Math.abs(edge)<.009&&y>.58)return CLOTH_SEAM;
  if(edge<0&&y>.58)return mix(CLOTH,CLOTH_DARK,.4);
  // folds and a sheen at the shoulders
  return mix(ramp(CLOTH_DARK,CLOTH,.46,.8)(y),CLOTH_HI,Math.max(0,Math.sin(Math.atan2(x,z)*7+y*12))*.3+(y>.82?.2:0));
 });
 // the hakama below the sash, gathered tight
 P.add(lathe([[.176,.42],[.18,.5],[.172,.56]],32),at(0,0,0,[0,0,0],[1,1,.82]),(x,y,z)=>mix(CLOTH_DARK,CLOTH,(Math.sin(Math.atan2(x,z)*9)*.5+.5)*.6));
 P.add(new THREE.CircleGeometry(.176,24),at(0,.421,0,[Math.PI/2,0,0],[1,.82,1]),CLOTH_DARK);
 // the blood-red sash, wound twice, its knot and two short ends at the left front
 P.add(new THREE.CylinderGeometry(.184,.184,.07,36,4,true),at(0,.53,0,[0,0,0],[1,1,.83]),(x,y)=>Math.abs(y-.53)<.004?SASH_DARK:mix(SASH_DARK,SASH,1-Math.abs(y-.53)*14));
 P.add(new THREE.SphereGeometry(.026,10,8),at(-.07,.53,.146,[0,0,0],[1.1,.9,.6]),SASH_HI);
 for(const [dx,r] of [[-.08,.25],[-.058,-.12]])P.add(new THREE.BoxGeometry(.024,.11,.006),at(-.07+dx*.2,.47,.15,[.1,0,r]),(x,y)=>mix(SASH_DARK,SASH,(y-.41)*12));
 // three shuriken tucked into the sash on the right
 for(let i=0;i<3;i++)P.add(shuriken(.026),at(.06+i*.032,.548-i*.006,.153-i*.012,[-.1,-.2-i*.2,i*.4]),(x,y,z)=>Math.hypot(x-(.06+i*.032),y-(.548-i*.006))<.008?IRON:IRON_HI);
 // a coil of black cord on the right hip, with a small iron hook
 P.add(new THREE.TorusGeometry(.04,.009,5,20),at(.178,.45,.02,[0,Math.PI/2,0],[1,1,.6]),(x,y,z)=>Math.sin(Math.atan2(y-.45,z-.02)*18)>.3?CORD_HI:CORD);
 P.add(new THREE.TorusGeometry(.028,.007,5,16),at(.182,.45,.02,[0,Math.PI/2,0],[1,1,.6]),CORD);
 P.add(new THREE.TorusGeometry(.014,.004,4,10,Math.PI*1.3),at(.19,.395,.03,[0,Math.PI/2,.4]),IRON_HI);
 // the cord over the left shoulder, crossing the chest to the right hip, holding the saya
 P.add(ring(.205,.008,4,40),at(0,.68,0,[0,0,-.68],[1,1.5,.78]),(x,y,z)=>Math.sin(Math.atan2(x,z)*26)>.6?CORD_HI:CORD);
 // the saya on the back: mouth up behind the right shoulder, tip down past the left hip
 const back=(m)=>at(0,.66,-.165,[0,0,-.68]).multiply(m);
 P.add(new THREE.BoxGeometry(.04,.62,.022,1,8,1),back(at(0,-.02,0)),(x,y,z)=>{
  const t=(y-.36)/.62;
  return Math.abs(Math.sin(t*26))>.96?LACQUER_HI:mix(LACQUER,LACQUER_HI,Math.max(0,x*6));
 });
 P.add(new THREE.BoxGeometry(.046,.03,.028),back(at(0,-.33,0)),IRON);
 P.add(new THREE.BoxGeometry(.046,.024,.028),back(at(0,.29,0)),IRON_HI);
 // the neck, wrapped in the hood's cloth
 P.add(new THREE.CylinderGeometry(.046,.052,.07,12),at(0,.93,0),CLOTH);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the zukin: the whole head wrapped close; head centre at y .1
 P.add(new THREE.SphereGeometry(.098,24,18),at(0,.1,-.004,[0,0,0],[.9,1.04,.98]),(x,y,z)=>{
  // the eye slit: a band of bare skin sunk in shadow across the front
  if(z>.02&&Math.abs(y-.112)<.016&&Math.abs(x)<.07)return mix(SKIN,SHADOW,.55+Math.abs(x)*5);
  // the wrapping, in slanting bands
  const band=Math.sin(y*120+x*40*Math.sign(z||1));
  return mix(ramp(CLOTH_DARK,CLOTH,0,.2)(y),band>.7?CLOTH_SEAM:CLOTH_HI,band>.7?.6:Math.max(0,band)*.18);
 });
 // the brow wrap jutting over the slit, a hard line that keeps the eyes in shadow
 P.add(new THREE.TorusGeometry(.088,.012,5,28,Math.PI*.9),at(0,.13,.006,[Math.PI/2+.12,0,Math.PI*.05],[1,1.08,.7]),CLOTH);
 // the face wrap's lower edge, pulled tight under the slit
 P.add(new THREE.TorusGeometry(.089,.008,4,28,Math.PI*.85),at(0,.094,.004,[Math.PI/2-.1,0,Math.PI*.075],[1,1.08,.6]),CLOTH_HI);
 // narrowed amber eyes, slanting down toward the nose, burning a little in the dark
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.012,8,6),at(s*.03,.113,.08,[0,0,s*.3],[1.55,.42,.5]),(x,y,z)=>Math.abs(x)<.03?EYE_HOT:EYE);
  P.add(new THREE.SphereGeometry(.0045,6,4),at(s*.029,.113,.085,[0,0,0],[.7,1.3,1]),PUPIL);
 }
 // the knot at the back of the head (its two tails are their own meshes, so they can stream)
 P.add(new THREE.SphereGeometry(.026,10,8),at(0,.13,-.096,[0,0,0],[1.4,.9,.8]),CLOTH_HI);
 return P.merge();
}
// one long ragged tail of the hood's knot, hanging from its top at the knot
function buildTail(){
 const P=pieces();
 P.add(tail(.36,.042),at(0,0,0),(x,y)=>ramp(CLOTH_DARK,CLOTH_HI,-.37,0)(y));
 return P.merge();
}
// where the tails hang from the knot (head-local) and their rest angles; ninja-tails.js streams them
export const TAIL_REST=[-1,1].map(s=>({pos:[s*.016,.13,-.11],rot:[.1,s*.14,s*.12]}));

// tight hakama into criss-cross kyahan wraps and split-toed tabi
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.064,0],[.066,-.1],[.058,-.2],[.05,-.27]],14),at(0,0,0),(x,y,z)=>mix(CLOTH_DARK,CLOTH,(Math.sin(Math.atan2(x,z)*5)*.5+.5)*.7));
 P.add(new THREE.CylinderGeometry(.05,.042,.18,14,10),at(0,-.355,0),(x,y,z)=>{
  // two spirals of binding crossing each other down the shin
  const a=Math.atan2(x,z);
  if(Math.sin(y*80+a*2)>.75||Math.sin(y*80-a*2)>.75)return WRAP_HI;
  return WRAP;
 });
 // the tabi: a split toe, the big toe a separate pod
 P.add(new THREE.SphereGeometry(.044,12,8),at(.008,-.445,.04,[0,0,0],[.75,.5,1.6]),CLOTH_DARK);
 P.add(new THREE.SphereGeometry(.018,8,6),at(-.03,-.452,.088,[0,0,0],[1,.8,1.4]),CLOTH);
 P.add(new THREE.BoxGeometry(.082,.012,.15),at(-.002,-.466,.035),CLOTH_SEAM);
 return P.merge();
}

// a close sleeve, a tekko gauntlet over the forearm and the back of the hand, and a dark glove
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.056,14,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),CLOTH_HI);
 P.add(lathe([[.052,0],[.05,-.1],[.044,-.2]],16),at(0,0,0),(x,y)=>ramp(CLOTH_DARK,CLOTH,-.2,0)(y));
 // the tekko: a stiff cuff with three iron splints, running down onto the back of the hand
 P.add(new THREE.CylinderGeometry(.046,.04,.14,12),at(0,-.27,0),(x,y,z)=>Math.sin(y*90)>.85?CLOTH_SEAM:WRAP);
 for(const a of [-.5,0,.5])P.add(new THREE.BoxGeometry(.012,.12,.006),at(Math.sin(a)*.044,-.27,Math.cos(a)*.044-.01,[0,a,0]),IRON);
 P.add(new THREE.SphereGeometry(.031,12,8),at(0,-.36,.006,[0,0,0],[.9,1.05,1]),CLOTH_DARK);
 P.add(new THREE.BoxGeometry(.034,.03,.006),at(0,-.355,-.026),IRON_HI);
 for(let k=0;k<4;k++)P.add(new THREE.SphereGeometry(.01,6,4),at(-.018+k*.012,-.37,.03),CLOTH);
 return P.merge();
}

// the ninjato: a short, straight, single-edged blade on a square iron tsuba, held low and forward
function buildSword(){
 const P=pieces(),tilt=at(0,.01,0,[Math.PI/2-.55,0,0]),on=m=>new THREE.Matrix4().multiplyMatrices(tilt,m);
 // the hilt, diamond-wrapped over pale same
 P.add(new THREE.CylinderGeometry(.011,.012,.12,6,6),on(at(0,0,0)),(x,y,z)=>Math.sin(y*300+Math.atan2(x,z)*2)>.2?HILT:SAME);
 P.add(new THREE.CylinderGeometry(.013,.013,.012,6),on(at(0,-.064,0)),IRON);
 // the square tsuba
 P.add(new THREE.BoxGeometry(.06,.008,.06),on(at(0,.064,0,[0,Math.PI/4,0])),(x,y,z)=>IRON);
 P.add(new THREE.BoxGeometry(.03,.009,.03),on(at(0,.064,0,[0,Math.PI/4,0])),IRON_HI);
 // the blade: straight, the edge forward, ending in a hard chisel point
 P.add(new THREE.BoxGeometry(.028,.42,.006,1,4,1),on(at(0,.28,0)),(x,y,z)=>x>.008?STEEL_HI:x<-.009?STEEL_DARK:STEEL);
 const point=new THREE.BufferGeometry().setFromPoints([
  [-.014,0,.003],[.014,0,.003],[-.014,.05,0],[-.014,0,-.003],[.014,0,-.003],
 ].map(v=>new THREE.Vector3(...v)));
 point.setIndex([0,1,2,4,3,2,1,4,2,3,0,2]);point.computeVertexNormals();
 P.add(point,on(at(0,.49,0)),(x,y,z)=>STEEL_HI);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.08,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),tail:buildTail(),leg:buildLeg(),arm:buildArm(),sword:buildSword()};
 return S;
}
function mesh(parent,geo,name){const o=new THREE.Mesh(geo,material);o.castShadow=o.receiveShadow=true;o.userData.part=name;parent.add(o);return o;}

export function createNinja(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const hoodTails=TAIL_REST.map(r=>{const k=new THREE.Group();k.position.set(...r.pos);k.rotation.set(...r.rot);head.add(k);mesh(k,S.tail,'hoodTail');return k;});
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);arm.rotation.z=s*.06;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.sword,'ninjato');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'ninja',arms,arm:arms[1],weaponSocket,head,hoodTails,hat:null,beard:null,pick:null};
}
