import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The nurse shares the humans' letter, so she used to be the plain `@` humanoid. She now wears a
// pale blue pinstriped dress to the calf with puffed short sleeves and white cuffs, a starched
// white apron with a bib (a red cross on it) tied in a bow at the back, a round white collar and a
// silver fob watch pinned at the breast. White stockings and buckled shoes show under the hem. Her
// hair is pinned up in a bun under a folded white cap with a red cross, and she holds a syringe.
// Each moving part (body, head, each leg and arm, and the syringe) is one merged, vertex-coloured
// mesh with a shared material: 7 draws. The geometry is built once and shared.
// Handles: legs, arms, arm (the syringe arm), weaponSocket, head, body, like the priest rig.

const SKIN=rgb('#ecc6a8'),SKIN_SHADE=rgb('#c89c80'),LIPS=rgb('#b8646a'),EYE=rgb('#1a1410');
const DRESS=rgb('#a9c2dc'),DRESS_DARK=mix(DRESS,[0,0,0],.35),STRIPE=rgb('#eef2f6');
const WHITE=rgb('#f2efe8'),WHITE_SHADE=rgb('#c9c4ba'),RED=rgb('#c8202a');
const HAIR=rgb('#5a3a22'),HAIR_DARK=rgb('#33200f'),SILVER=rgb('#c8ccd0'),SILVER_DARK=rgb('#6a7078');
const SOLE=rgb('#8a8278'),GLASS=rgb('#d8e8ee'),DOSE=rgb('#d05a8a'),STEEL=rgb('#a8b0b8');

const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
// fine vertical pinstripes, by angle round the body
const pinstripe=(base,lo,hi)=>(x,y,z)=>{const a=Math.atan2(x,z),c=ramp(mix(base,[0,0,0],.3),base,lo,hi)(y);return Math.abs(Math.sin(a*18))<.16?mix(c,STRIPE,.55):c;};

function buildBody(){
 const P=pieces();
 // the dress: a flared skirt to the calf, a nipped waist and a fitted bodice, flattened front to back
 P.add(lathe([[.205,.34],[.2,.37],[.172,.52],[.138,.62],[.142,.66],[.155,.74],[.158,.79],[.132,.86],[.06,.9],[0,.905]],32),at(0,0,0,[0,0,0],[1,1,.8]),pinstripe(DRESS,.34,.8));
 // the skirt's underside, so a low camera doesn't see into it
 P.add(new THREE.CircleGeometry(.2,24),at(0,.341,0,[Math.PI/2,0,0],[1,.8,1]),DRESS_DARK);
 // apron skirt: a front panel standing just off the dress, with a hemmed edge
 P.add(lathe([[.212,.39],[.207,.41],[.18,.54],[.148,.62]],14,-1.05,2.1),at(0,0,0,[0,0,0],[1,1,.8]),(x,y)=>y<.405?WHITE_SHADE:ramp(WHITE_SHADE,WHITE,.4,.6)(y));
 // waistband, with a bow and two tails at the back
 P.add(new THREE.TorusGeometry(.143,.011,5,28),at(0,.62,0,[Math.PI/2,0,0],[1,.8,1]),WHITE);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.035,10,8),at(s*.035,.625,-.125,[0,0,s*.35],[1,.55,.35]),WHITE);
  P.add(new THREE.BoxGeometry(.03,.16,.006),at(s*.025,.54,-.122,[-.12,0,s*.12]),(x,y)=>ramp(WHITE_SHADE,WHITE,.46,.6)(y));
 }
 P.add(new THREE.SphereGeometry(.014,8,6),at(0,.625,-.13),WHITE_SHADE);
 // bib with a red cross, and straps over the shoulders crossing at the back
 P.add(new THREE.BoxGeometry(.13,.17,.008),at(0,.715,.128,[-.07,0,0]),WHITE);
 P.add(new THREE.BoxGeometry(.05,.014,.004),at(0,.725,.134,[-.07,0,0]),RED);
 P.add(new THREE.BoxGeometry(.014,.05,.004),at(0,.725,.134,[-.07,0,0]),RED);
 for(const s of [-1,1]){
  P.add(new THREE.BoxGeometry(.026,.012,.2),at(s*.07,.825,.02,[.12,0,0]),WHITE);
  P.add(new THREE.BoxGeometry(.026,.2,.008),at(s*.045,.72,-.127,[.08,0,s*-.3]),WHITE);
 }
 // round starched collar
 P.add(lathe([[.078,.9],[.1,.878],[.106,.872]],24),at(0,0,.005),WHITE);
 // neck
 P.add(new THREE.CylinderGeometry(.034,.04,.08,10),at(0,.91,.005),SKIN_SHADE);
 // fob watch pinned at the left breast: a bar pin, a short chain and a silver case with a white face
 P.add(new THREE.BoxGeometry(.03,.008,.006),at(-.1,.79,.12,[-.1,0,0]),SILVER);
 P.add(new THREE.CylinderGeometry(.002,.002,.035,4),at(-.1,.77,.122),SILVER_DARK);
 P.add(new THREE.CylinderGeometry(.018,.018,.008,14),at(-.1,.742,.126,[Math.PI/2-.1,0,0]),SILVER);
 P.add(new THREE.CircleGeometry(.013,14),at(-.1,.742,.131,[-.1,0,0]),WHITE);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a softer face: rounded chin, small nose, rosy lips, dark eyes under fine brows
 P.add(new THREE.SphereGeometry(.098,18,14),at(0,.1,0,[0,0,0],[.88,1.04,.94]),SKIN);
 P.add(new THREE.SphereGeometry(.052,10,8),at(0,.045,.035),SKIN);
 P.add(new THREE.ConeGeometry(.012,.034,5),at(0,.09,.097,[Math.PI/2-.35,0,0]),SKIN_SHADE);
 P.add(new THREE.SphereGeometry(.016,8,6),at(0,.052,.083,[0,0,0],[1.4,.45,.6]),LIPS);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.02,8,6),at(s*.089,.095,-.005,[0,0,0],[.5,1,.8]),SKIN_SHADE);
  P.add(new THREE.SphereGeometry(.013,8,6),at(s*.034,.108,.083,[0,0,0],[1.3,.85,.6]),EYE);
  P.add(new THREE.BoxGeometry(.036,.006,.01),at(s*.035,.126,.086,[0,0,s*-.12]),HAIR_DARK);
  P.add(new THREE.SphereGeometry(.02,8,6),at(s*.052,.078,.07,[0,0,0],[1,.7,.5]),mix(SKIN,LIPS,.25));
 }
 // hair swept back over the crown and pinned in a bun at the nape
 P.add(new THREE.SphereGeometry(.106,18,10,0,Math.PI*2,0,Math.PI*.55),at(0,.1,-.012,[-.35,0,0],[.93,1.06,1]),(x,y,z)=>mix(HAIR_DARK,HAIR,THREE.MathUtils.clamp((y-.1)/.1+.3,0,1)));
 P.add(new THREE.SphereGeometry(.05,12,10),at(0,.1,-.1,[0,0,0],[1,.9,.8]),HAIR);
 P.add(new THREE.TorusGeometry(.034,.008,5,14),at(0,.1,-.137,[0,0,0],[1,.9,1]),HAIR_DARK);
 // folded white cap perched on top: a band, a creased crown pinned back, and a red cross
 P.add(new THREE.CylinderGeometry(.07,.085,.05,20,1,true),at(0,.195,-.005,[-.3,0,0],[1,1,.82]),(x,y)=>y<.18?WHITE_SHADE:WHITE);
 P.add(new THREE.BoxGeometry(.13,.05,.1),at(0,.225,-.025,[-.3,0,0]),WHITE);
 P.add(new THREE.BoxGeometry(.13,.012,.06),at(0,.248,-.075,[-.9,0,0]),WHITE_SHADE);
 P.add(new THREE.BoxGeometry(.034,.01,.004),at(0,.215,.052,[-.3,0,0]),RED);
 P.add(new THREE.BoxGeometry(.01,.034,.004),at(0,.215,.052,[-.3,0,0]),RED);
 return P.merge();
}

// A white-stockinged leg (mostly hidden in the skirt) and a low buckled shoe.
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.04,.032,.4,10),at(0,-.22,0),(x,y)=>ramp(WHITE_SHADE,WHITE,-.4,-.1)(y));
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.432,.05,[0,0,0],[.9,.6,1.7]),WHITE);
 P.add(new THREE.BoxGeometry(.075,.014,.15),at(0,-.456,.045),SOLE);
 P.add(new THREE.BoxGeometry(.024,.006,.018),at(0,-.412,.095,[-.5,0,0]),SILVER);
 return P.merge();
}

// A puffed short sleeve with a white cuff, the bare forearm and a hand.
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.058,14,10),at(0,-.05,0,[0,0,0],[1,1.25,1]),pinstripe(DRESS,-.12,.02));
 P.add(new THREE.TorusGeometry(.04,.009,5,16),at(0,-.115,0,[Math.PI/2,0,0]),WHITE);
 P.add(new THREE.CylinderGeometry(.03,.024,.22,10),at(0,-.22,0),(x,y)=>ramp(SKIN_SHADE,SKIN,-.33,-.12)(y));
 P.add(new THREE.SphereGeometry(.029,8,8),at(0,-.355,.005,[0,0,0],[.85,1.2,1]),SKIN);
 return P.merge();
}

// A glass syringe: a steel needle, a barrel half full of a pink dose with scale marks, finger
// flanges and a plunger with a thumb ring. Built along +y from the grip, then tipped forward.
function buildSyringe(){
 const P=pieces(),tip=at(0,.01,.015,[Math.PI/2-.4,0,0]),on=m=>new THREE.Matrix4().multiplyMatrices(tip,m);
 P.add(new THREE.CylinderGeometry(.014,.014,.1,12),on(at(0,.04,0)),(x,y,z)=>{const c=Math.abs(((y+.3)*100)%1.6)<.25&&z>0?STEEL:GLASS;return y<.045?mix(c,DOSE,.7):c;});
 P.add(new THREE.CylinderGeometry(.006,.014,.018,10),on(at(0,.099,0)),STEEL);
 P.add(new THREE.CylinderGeometry(.0016,.0016,.06,4),on(at(0,.138,0)),STEEL);
 P.add(new THREE.BoxGeometry(.05,.006,.014),on(at(0,-.012,0)),GLASS);
 P.add(new THREE.CylinderGeometry(.004,.004,.05,6),on(at(0,-.035,0)),STEEL);
 P.add(new THREE.TorusGeometry(.012,.004,6,14),on(at(0,-.07,0)),STEEL);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:.05,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(),syringe:buildSyringe()};
 return S;
}
function mesh(parent,geo,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createNurse(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.935,.005);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.07,.46,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.165,.8,0);arm.rotation.z=s*.1;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.355,.01);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.syringe,'syringe');
 return {g,body,legs,tail:null,wings:[],quirk:'nurse',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
