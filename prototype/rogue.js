import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The rogue (the player-monster role) used to be the generic '@' humanoid: a tinted box with a
// ball for a head. They now stand as a cutthroat: a deep charcoal hood with a drooping peak, the
// face inside it lost in shadow but for two pale glinting eyes over a black cloth mask. A ragged
// cowl-mantle falls over the shoulders, and a long cloak hangs down the back to the knees, both
// with torn, sawtoothed hems. Under them, an oxblood leather jerkin is crossed by a bandolier of
// throwing knives, a belt holds a coin purse and a sheathed second dagger on the left hip, and
// dark trousers go into strapped soft boots. The right hand holds a long, narrow dagger point-up
// and forward, its spine notched into teeth.
// Each moving part (body, head, each leg and arm) and the dagger is one merged, vertex-coloured
// mesh with one shared material: 7 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the right, dagger arm), weaponSocket (the dagger), head, body. The
// pivots match archeologist.js and monk.js (shoulders ±.215 at .82, hand .37 down the arm, legs
// ±.08 at .47, head at .955).

const CLOAK=rgb('#2a2a2e'),CLOAK_DARK=rgb('#141417'),CLOAK_HI=rgb('#3e3d44');
const JERKIN=rgb('#4a1e1c'),JERKIN_DARK=rgb('#2a100f'),JERKIN_HI=rgb('#6a2c26');
const STRAP=rgb('#1e1612'),STRAP_HI=rgb('#3a2a20'),PEWTER=rgb('#7a7a80'),GOLD=rgb('#9a7a38');
const CLOTH=rgb('#1a1a1c'),CLOTH_HI=rgb('#2c2c30'),BOOT=rgb('#221a16'),BOOT_HI=rgb('#3a2e26');
const SKIN=rgb('#a07c66'),SHADOW=rgb('#0a0a0c'),GLINT=rgb('#d8d2b0'),PUPIL=rgb('#1a1410');
const STEEL=rgb('#8a8e96'),STEEL_HI=rgb('#c8ccd4'),STEEL_DARK=rgb('#4a4e56');

const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const ring=(r,tube,radial=6,tubular=36)=>new THREE.TorusGeometry(r,tube,radial,tubular).rotateX(Math.PI/2);
// a sawtooth tear along the lowest row of a lathe: each vertex at or below `hem` drops by up to
// `depth`, in `teeth` jagged points around the circle
function tear(geo,hem,depth,teeth,seed=0){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  if(p.getY(i)>hem+1e-4)continue;
  const a=Math.atan2(p.getX(i),p.getZ(i))*teeth/Math.PI+seed;
  const f=a-Math.floor(a);
  // uneven teeth: a hash per tooth varies the depth
  const k=Math.floor(a),h=Math.abs(Math.sin(k*12.9898+seed*7.1))%1;
  p.setY(i,p.getY(i)-depth*(.45+.55*h)*(1-Math.abs(f-.5)*2));
 }
 geo.computeVertexNormals();
 return geo;
}

function buildBody(){
 const P=pieces();
 // the jerkin: fitted, laced up the front, flaring a little over the hips
 P.add(lathe([[.18,.44],[.176,.5],[.16,.58],[.17,.68],[.186,.78],[.176,.86],[.12,.9],[.055,.915]],36),at(0,0,0,[0,0,0],[1,1,.8]),(x,y,z)=>{
  if(z>0&&Math.abs(x)<.008&&y>.5&&y<.86)return JERKIN_DARK;
  if(z>0&&Math.abs(x)<.03&&y>.5&&y<.86&&Math.sin(y*160)>.6)return STRAP_HI;
  if(y<.455)return JERKIN_DARK;
  return mix(ramp(JERKIN_DARK,JERKIN,.44,.72)(y),JERKIN_HI,Math.max(0,Math.sin(x*40+y*30))*.25);
 });
 P.add(new THREE.CircleGeometry(.18,28),at(0,.441,0,[Math.PI/2,0,0],[1,.8,1]),JERKIN_DARK);
 // the long cloak: hangs from the shoulders down the back to the knees, open at the front, its
 // hem torn into points
 const cloak=tear(lathe([[.12,.9],[.2,.86],[.24,.78],[.24,.6],[.25,.42],[.27,.26]],44,Math.PI*.3,Math.PI*1.4),.261,.09,9,.3);
 P.add(cloak,at(0,0,-.01,[0,0,0],[1,1,.86]),(x,y,z)=>{
  // the folds: vertical bands of shadow, deepest toward the hem
  const fold=Math.sin(Math.atan2(x,z)*11)*.5+.5;
  return mix(ramp(CLOAK_DARK,CLOAK,.2,.85)(y),CLOAK_DARK,fold*.5);
 });
 // the cowl-mantle around the shoulders, its edge torn too
 const mantle=tear(lathe([[.07,.93],[.14,.9],[.22,.84],[.255,.76],[.262,.72]],44),.721,.06,11,1.7);
 P.add(mantle,at(0,0,0,[0,0,0],[1,1,.84]),(x,y,z)=>{
  if(y>.89)return CLOAK_HI;
  return mix(CLOAK,CLOAK_DARK,Math.sin(Math.atan2(x,z)*14)*.25+.25);
 });
 // a pewter clasp at the throat
 P.add(new THREE.OctahedronGeometry(.018),at(0,.87,.15,[0,0,Math.PI/4],[1,1,.4]),PEWTER);
 // the bandolier from the right shoulder to the left hip, carrying throwing knives
 P.add(ring(.215,.013,4,40),at(0,.66,0,[0,0,.62],[1,1.4,.78]),(x,y,z)=>Math.sin(Math.atan2(x,z)*20)>.75?STRAP_HI:STRAP);
 for(let i=0;i<4;i++){
  // a point on the strap's front arc, and a knife standing in a loop there
  const t=-.36+i*.24,x=.215*Math.sin(t)*Math.cos(.62),y=.66+.215*Math.sin(t)*Math.sin(.62),z=.168*Math.cos(t)+.012;
  P.add(new THREE.BoxGeometry(.012,.05,.004),at(x,y+.035,z,[0,t,0]),STEEL);
  P.add(new THREE.ConeGeometry(.006,.02,4),at(x,y+.07,z,[0,t,0]),STEEL_HI);
  P.add(new THREE.BoxGeometry(.018,.012,.008),at(x,y,z+.002,[0,t,0]),STRAP_HI);
 }
 // the belt, with a pewter buckle
 P.add(ring(.168,.016,4,36),at(0,.49,0,[0,0,0],[1,1,.8]),STRAP);
 P.add(new THREE.BoxGeometry(.03,.03,.01),at(0,.49,.138),PEWTER);
 // the second dagger, sheathed at the left hip and angled back
 P.add(new THREE.CylinderGeometry(.012,.02,.18,6),at(-.17,.4,.05,[-.5,0,-.2]),(x,y)=>y<.35?PEWTER:STRAP);
 P.add(new THREE.CylinderGeometry(.008,.008,.06,6),at(-.176,.52,.11,[-.5,0,-.2]),STRAP_HI);
 P.add(new THREE.BoxGeometry(.06,.01,.012),at(-.174,.495,.1,[-.5,0,-.2]),PEWTER);
 // a coin purse on the right hip, cinched with gold cord
 P.add(new THREE.SphereGeometry(.036,10,8),at(.16,.43,.07,[0,0,0],[.9,1.1,.8]),STRAP_HI);
 P.add(ring(.018,.004,4,14),at(.16,.465,.07),GOLD);
 // the neck, in shadow under the hood
 P.add(new THREE.CylinderGeometry(.044,.05,.07,12),at(0,.93,0),CLOTH);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the face, sunk in the hood's shadow; head centre at y .1
 P.add(new THREE.SphereGeometry(.088,18,14),at(0,.1,-.006,[0,0,0],[.88,1,.94]),(x,y,z)=>y>.1?mix(SKIN,SHADOW,.72):mix(SKIN,SHADOW,.5));
 // the mask: black cloth over nose and mouth, pulled to a crease
 P.add(new THREE.SphereGeometry(.09,18,10,0,Math.PI*2,Math.PI*.5,Math.PI*.36),at(0,.1,-.002,[0,0,0],[.92,1,.98]),(x,y,z)=>z>.05&&Math.sin(y*260+x*60)>.8?CLOTH_HI:CLOTH);
 // narrowed eyes: pale glints under a heavy brow
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.011,8,6),at(s*.03,.118,.074,[0,0,s*-.25],[1.5,.45,.5]),GLINT);
  P.add(new THREE.SphereGeometry(.005,6,4),at(s*.028,.118,.079),PUPIL);
  P.add(new THREE.BoxGeometry(.04,.01,.016),at(s*.031,.134,.074,[0,0,s*.3]),SHADOW);
 }
 // the hood: a deep cowl, open at the front, its brim reaching past the face
 const hood=new THREE.SphereGeometry(.132,28,16,Math.PI/2+.62,Math.PI*2-1.24,0,Math.PI*.8);
 P.add(hood,at(0,.105,-.012,[0,0,0],[.92,1.02,1.12]),(x,y,z)=>{
  // the inside of the cowl near the opening falls into black
  if(z>.03)return mix(CLOAK_DARK,SHADOW,.6);
  return mix(CLOAK,CLOAK_HI,Math.max(0,y-.1)*4);
 });
 // the brim's lip, a heavier fold around the opening
 P.add(new THREE.TorusGeometry(.105,.012,5,28,Math.PI*1.2),at(0,.098,.085,[.2,0,-Math.PI*.1],[.95,1.14,.6]),CLOAK_HI);
 // the drooping peak behind
 P.add(new THREE.ConeGeometry(.05,.16,8),at(0,.19,-.12,[-2.1,0,0]),CLOAK);
 return P.merge();
}

// dark trousers into soft boots wrapped with straps
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.06,0],[.064,-.12],[.056,-.22],[.05,-.28]],14),at(0,0,0),(x,y)=>ramp(CLOTH,CLOTH_HI,-.28,-.02)(y));
 P.add(new THREE.CylinderGeometry(.05,.044,.2,12,8),at(0,-.36,0),(x,y,z)=>{
  // the straps spiral round the shin
  if(Math.sin(y*90+Math.atan2(x,z)*1.2)>.7)return STRAP;
  return y>-.28?BOOT_HI:BOOT;
 });
 // a soft pointed toe
 P.add(new THREE.SphereGeometry(.046,12,8),at(0,-.44,.05,[0,0,0],[.9,.5,1.7]),BOOT);
 P.add(new THREE.BoxGeometry(.086,.018,.17),at(0,-.463,.04),STRAP);
 return P.merge();
}

// a dark sleeve, a leather bracer at the forearm, and a gloved hand
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.058,14,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),CLOTH_HI);
 P.add(lathe([[.054,0],[.052,-.1],[.046,-.18],[.042,-.3]],16),at(0,0,0),(x,y)=>ramp(CLOTH,CLOTH_HI,-.3,0)(y));
 // the bracer, with a row of pewter studs
 P.add(new THREE.CylinderGeometry(.05,.046,.1,12),at(0,-.255,0),(x,y,z)=>Math.abs(y+.255)>.042?STRAP_HI:STRAP);
 for(let i=0;i<3;i++)P.add(new THREE.SphereGeometry(.007,6,4),at(.045,-.225-i*.03,.012),PEWTER);
 P.add(new THREE.SphereGeometry(.033,12,8),at(0,-.36,.006,[0,0,0],[.9,1.05,1]),STRAP);
 for(let k=0;k<4;k++)P.add(new THREE.SphereGeometry(.011,6,4),at(-.018+k*.012,-.37,.033),STRAP_HI);
 P.add(new THREE.CapsuleGeometry(.009,.022,2,6),at(0,-.385,.03,[0,0,Math.PI/2]),STRAP);
 return P.merge();
}

// the dagger: a wrapped grip, a swept crossguard, and a long narrow blade pointing up and forward
// with teeth notched along its spine
function buildDagger(){
 const P=pieces(),tilt=at(0,.02,0,[Math.PI/2-.85,0,0]),on=m=>new THREE.Matrix4().multiplyMatrices(tilt,m);
 P.add(new THREE.CylinderGeometry(.011,.012,.09,8),on(at(0,0,0)),(x,y)=>Math.sin(y*220)>0?STRAP:STRAP_HI);
 P.add(new THREE.SphereGeometry(.015,8,6),on(at(0,-.05,0)),PEWTER);
 // the guard, its quillons swept forward toward the edge
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.007,.05,5),on(at(s*.022,.052,.006,[.3,0,s*-1.9])),STEEL_DARK);
 P.add(new THREE.BoxGeometry(.02,.014,.02),on(at(0,.05,0)),STEEL_DARK);
 // the blade: a flattened diamond, narrowing to a needle point
 const blade=new THREE.CylinderGeometry(.004,.014,.22,4,1);
 P.add(blade,on(at(0,.17,0,[0,Math.PI/4,0],[1,1,.35])),(x,y,z)=>Math.abs(z)<.002?STEEL_HI:STEEL);
 P.add(new THREE.ConeGeometry(.004,.03,4),on(at(0,.295,0,[0,Math.PI/4,0],[1,1,.35])),STEEL_HI);
 // the teeth along the spine
 for(let i=0;i<4;i++)P.add(new THREE.ConeGeometry(.004,.014,3),on(at(0,.09+i*.03,-.008,[-.9,0,0])),STEEL_DARK);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.06,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(),dagger:buildDagger()};
 return S;
}
function mesh(parent,geo,name){const o=new THREE.Mesh(geo,material);o.castShadow=o.receiveShadow=true;o.userData.part=name;parent.add(o);return o;}

export function createRogue(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);arm.rotation.z=s*.06;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.dagger,'dagger');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'rogue',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
