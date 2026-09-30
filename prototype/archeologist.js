import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The archeologist (the player-monster role) used to be the generic '@' humanoid: a tinted box
// with a ball for a head. They now stand as a field explorer: a sun-browned, stubbled face under
// a brown fedora with a pinched crown and a dark band, a worn leather jacket hanging open over a
// khaki shirt, and a canvas satchel on a strap slung from the right shoulder to the left hip. A
// coiled bullwhip hangs from the belt on the right hip. Khaki trousers are tucked into laced brown
// boots. The right hand holds the archeologist's pick-axe, its haft tilted forward with the iron
// head at the top: a pointed pick on one side and a flat adze on the other.
// Each moving part (body, head, each leg and arm) and the pick-axe is one merged, vertex-coloured
// mesh with one shared material: 7 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the right, pick arm), weaponSocket (the pick-axe), head, body. The
// pivots match monk.js and knight.js (shoulders ±.215 at .82, hand .37 down the arm, legs ±.08 at
// .47, head at .955).

const LEATHER=rgb('#6a4226'),LEATHER_DARK=rgb('#40261a'),LEATHER_HI=rgb('#8e5e38');
const KHAKI=rgb('#b8a476'),KHAKI_DARK=rgb('#8a7a52'),KHAKI_HI=rgb('#d0c090');
const HAT=rgb('#7a5a3a'),HAT_DARK=rgb('#4e3824'),BAND=rgb('#2a1e16');
const CANVAS=rgb('#8a8458'),CANVAS_DARK=rgb('#5e5a3a'),BRASS=rgb('#c09a48');
const BOOT=rgb('#4a2e1c'),BOOT_DARK=rgb('#2a1a10'),LACE=rgb('#c8b08a');
const SKIN=rgb('#c48e64'),SKIN_SHADE=rgb('#9a6a48'),STUBBLE=rgb('#7a5a44'),LIP=rgb('#94604c');
const EYE=rgb('#2a1c14'),EYE_WHITE=rgb('#eee6da'),HAIR=rgb('#4a3222');
const WHIP=rgb('#5a3a20'),WHIP_DARK=rgb('#36220f');
const WOOD=rgb('#8a6440'),WOOD_DARK=rgb('#5e4028'),IRON=rgb('#5a5a5e'),IRON_HI=rgb('#9a9aa0');

const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
// a ring lying flat in the xz plane, so `at` can scale it oval and then tilt it
const ring=(r,tube,radial=6,tubular=36)=>new THREE.TorusGeometry(r,tube,radial,tubular).rotateX(Math.PI/2);

function buildBody(){
 const P=pieces();
 // the jacket: hip length, hanging open in front over the khaki shirt, with a turned-down collar
 const jacket=[[.19,.44],[.186,.5],[.17,.58],[.178,.68],[.194,.78],[.184,.86],[.13,.9],[.06,.915]];
 P.add(lathe(jacket,40),at(0,0,0,[0,0,0],[1,1,.8]),(x,y,z)=>{
  // the opening: a wedge down the front, widening toward the hem, shows the shirt
  const open=.035+(.86-y)*.09;
  if(z>0&&Math.abs(x)<open&&y<.87){
   if(y>.53&&y<.8&&Math.abs(x)<.006)return KHAKI_DARK;
   return mix(KHAKI,KHAKI_HI,(y-.44)*1.6);
  }
  if(z>0&&Math.abs(Math.abs(x)-open)<.01)return LEATHER_HI;
  if(y<.455)return LEATHER_DARK;
  const wear=Math.sin(x*70)*Math.sin(y*55)*.5+.5;
  return mix(ramp(LEATHER_DARK,LEATHER,.44,.7)(y),LEATHER_HI,wear*.3);
 });
 P.add(new THREE.CircleGeometry(.19,28),at(0,.441,0,[Math.PI/2,0,0],[1,.8,1]),KHAKI_DARK);
 // shirt buttons down the opening
 for(let i=0;i<4;i++)P.add(new THREE.SphereGeometry(.006,6,4),at(0,.79-i*.07,.15-(i>2?.004:0)),KHAKI_DARK);
 // the turned-down collar, a pair of flaps either side of the neck
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.06,.05,.012),at(s*.045,.88,.085,[-.5,s*.5,s*.5]),LEATHER_HI);
 // the belt, showing between the open jacket fronts, with a brass buckle
 P.add(ring(.172,.016,4,36),at(0,.5,0,[0,0,0],[1,1,.8]),(x,y,z)=>z>0&&Math.abs(x)>.06?LEATHER:LEATHER_DARK);
 P.add(new THREE.BoxGeometry(.034,.028,.01),at(0,.5,.142),BRASS);
 // the satchel strap from the right shoulder to the left hip, and the canvas bag hanging there
 P.add(ring(.222,.012,4,40),at(0,.67,0,[0,0,-.66],[1,1.4,.76]),(x,y,z)=>Math.sin(Math.atan2(x,z)*22)>.7?CANVAS_DARK:CANVAS);
 P.add(new THREE.BoxGeometry(.05,.13,.15),at(-.2,.5,.02,[0,0,.08]),(x,y,z)=>y>.54?CANVAS_DARK:CANVAS);
 P.add(new THREE.BoxGeometry(.056,.06,.156),at(-.203,.545,.02,[0,0,.08]),CANVAS_DARK);
 P.add(new THREE.BoxGeometry(.01,.018,.016),at(-.234,.52,.02),BRASS);
 // the bullwhip, coiled and hung on the right hip, with its wrapped handle down
 for(let i=0;i<3;i++)P.add(ring(.052-i*.004,.009,4,24),at(.196,.47,.03+i*.008,[0,0,Math.PI/2],[1,1,1.1]),i%2?WHIP_DARK:WHIP);
 P.add(new THREE.CylinderGeometry(.011,.013,.1,8),at(.2,.4,.07,[.15,0,0]),(x,y)=>Math.sin(y*200)>0?WHIP_DARK:WHIP);
 // the neck
 P.add(new THREE.CylinderGeometry(.046,.052,.07,14),at(0,.93,0),SKIN_SHADE);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a sun-browned face with a stubbled jaw; head centre at y .1
 P.add(new THREE.SphereGeometry(.095,20,16),at(0,.105,0,[0,0,0],[.9,1.02,.96]),(x,y,z)=>{
  if(y<.08&&z>-.02)return mix(SKIN,STUBBLE,.45);
  if(y>.15||z<-.04)return HAIR;
  return SKIN;
 });
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.022,8,6),at(s*.086,.1,-.004,[0,0,0],[.45,1.1,.75]),SKIN_SHADE);
  P.add(new THREE.SphereGeometry(.012,8,6),at(s*.032,.11,.08,[0,0,0],[1.3,.7,.5]),EYE_WHITE);
  P.add(new THREE.SphereGeometry(.0065,8,6),at(s*.032,.109,.085),EYE);
  P.add(new THREE.BoxGeometry(.034,.008,.01),at(s*.033,.13,.082,[0,0,s*.1]),HAIR);
  // sideburns below the hat brim
  P.add(new THREE.BoxGeometry(.012,.04,.03),at(s*.084,.115,.02),HAIR);
 }
 P.add(new THREE.ConeGeometry(.013,.042,6),at(0,.09,.094,[Math.PI/2-.35,0,0]),SKIN_SHADE);
 P.add(new THREE.SphereGeometry(.011,8,6),at(0,.075,.1),SKIN);
 P.add(new THREE.BoxGeometry(.03,.006,.006),at(.002,.05,.088,[0,0,-.1]),LIP);
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,.035,.035,[0,0,0],[1,.7,.9]),mix(SKIN,STUBBLE,.45));
 // the fedora: a brim turned down in front and up at the back, a creased crown pinched at the
 // front, and a dark band
 P.add(new THREE.CylinderGeometry(.15,.15,.008,32,1),at(0,.172,0,[-.12,0,0],[1,1,.94]),(x,y,z)=>{
  const r=Math.hypot(x,z);return r>.14?HAT_DARK:HAT;
 });
 P.add(lathe([[.096,0],[.1,.03],[.094,.06],[.07,.088],[.02,.094],[0,.09]],28),at(0,.172,-.006,[-.12,0,0],[1,1,.92]),(x,y,z)=>{
  if(y<.205)return BAND;
  // the centre crease and the front pinches read darker
  if(Math.abs(x)<.012&&y>.24)return HAT_DARK;
  if(z>.05&&Math.abs(Math.abs(x)-.045)<.012&&y>.215)return HAT_DARK;
  return y>.25?mix(HAT,HAT_DARK,.2):HAT;
 });
 return P.merge();
}

// khaki trousers bloused into laced leather boots
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.062,0],[.066,-.12],[.06,-.22],[.054,-.28]],14),at(0,0,0),(x,y,z)=>{
  if(Math.abs(y+.12)<.01&&Math.abs(x)>.05)return KHAKI_DARK;
  return ramp(KHAKI_DARK,KHAKI,-.28,-.04)(y);
 });
 P.add(new THREE.CylinderGeometry(.05,.046,.18,12,6),at(0,-.36,0),(x,y,z)=>{
  // the laces zigzag up the front of the shin
  if(z>.035&&Math.abs(x)<.018&&Math.sin(y*260)>.4)return LACE;
  return y>-.285?BOOT_DARK:BOOT;
 });
 P.add(new THREE.SphereGeometry(.048,12,8),at(0,-.44,.045,[0,0,0],[.95,.55,1.5]),BOOT);
 P.add(new THREE.BoxGeometry(.092,.02,.16),at(0,-.463,.035),BOOT_DARK);
 return P.merge();
}

// a leather sleeve to the wrist over a khaki cuff, and a bare hand gripping the haft
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.062,16,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),LEATHER);
 P.add(lathe([[.058,0],[.056,-.1],[.05,-.2],[.044,-.28],[.046,-.3]],18),at(0,0,0),(x,y)=>{
  if(Math.abs(y+.15)<.012)return LEATHER_DARK;
  return y<-.29?LEATHER_HI:ramp(LEATHER_DARK,LEATHER,-.3,-.04)(y);
 });
 P.add(new THREE.CylinderGeometry(.036,.038,.03,10),at(0,-.31,0),KHAKI);
 P.add(new THREE.SphereGeometry(.034,12,8),at(0,-.36,.006,[0,0,0],[.9,1.05,1]),SKIN);
 for(let k=0;k<4;k++)P.add(new THREE.SphereGeometry(.011,6,4),at(-.018+k*.012,-.37,.034),SKIN_SHADE);
 P.add(new THREE.CapsuleGeometry(.009,.022,2,6),at(0,-.385,.03,[0,0,Math.PI/2]),SKIN);
 return P.merge();
}

// the pick-axe: an ash haft held low and tilted forward, a wedge-fitted iron head at the top with
// a curved point to the front and a flat adze blade to the back
function buildPick(){
 const P=pieces(),tilt=at(0,.02,0,[Math.PI/2-.6,0,0]),on=m=>new THREE.Matrix4().multiplyMatrices(tilt,m);
 P.add(new THREE.CylinderGeometry(.012,.015,.52,8),on(at(0,.18,0)),(x,y)=>ramp(WOOD_DARK,WOOD,-.1,.4)(y));
 P.add(new THREE.SphereGeometry(.017,8,6),on(at(0,-.08,0)),WOOD_DARK);
 const H=.42;
 P.add(new THREE.BoxGeometry(.036,.05,.042),on(at(0,H,0)),IRON);
 // the pick: tapering and curving down, as three shrinking segments
 for(let i=0;i<3;i++){const t=i/3;
  P.add(new THREE.CylinderGeometry(.012-t*.009,.018-t*.009,.07,6),on(at(0,H-.005-t*t*.06,.05+i*.062,[Math.PI/2+.25+i*.22,0,0])),i===2?IRON_HI:IRON);
 }
 P.add(new THREE.ConeGeometry(.004,.03,6),on(at(0,H-.075,.225,[Math.PI/2+.95,0,0])),IRON_HI);
 // the adze: a flat blade flaring toward its edge
 P.add(new THREE.BoxGeometry(.03,.012,.12),on(at(0,H-.01,-.08,[-.18,0,0])),IRON);
 P.add(new THREE.BoxGeometry(.05,.008,.02),on(at(0,H-.022,-.138,[-.18,0,0])),IRON_HI);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.04,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(),pick:buildPick()};
 return S;
}
function mesh(parent,geo,name){const o=new THREE.Mesh(geo,material);o.castShadow=o.receiveShadow=true;o.userData.part=name;parent.add(o);return o;}

export function createArcheologist(){
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
 mesh(weaponSocket,S.pick,'pick-axe');
 // `pick` stays null: that handle drives the dwarves' digging gait, not a held weapon
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'archeologist',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
