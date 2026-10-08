import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The valkyrie (the player-monster role, and the hero's own starting role in NetHack) used to be
// the generic '@' humanoid: a tinted box with a ball for a head. She now stands as a northern
// shieldmaiden: a fair face with blue eyes under an iron spangenhelm with bronze ribs, a brow
// band and a nasal, and a pair of white feathered wings at the temples; two long blonde braids
// tied with bronze rings fall forward over the shoulders. A grey wolf-fur mantle is clasped over
// a knee-length mail hauberk with a pair of bronze tortoise brooches and a string of glass beads.
// Below the hauberk shows a blue wool tunic with a woven red-and-white hem. A leather belt with a
// bronze buckle carries a seax slung across the front and a pouch. Mail sleeves stop at the elbow
// over linen, with studded leather bracers. Dark trousers are bound in leg wraps above
// fur-topped boots. She holds a long sword upright (lobed bronze pommel, fullered blade) and
// carries a round linden shield painted in red and white sectors with an iron boss and rim.
// Each moving part (body, head, each leg and arm, the sword and the shield) is one merged,
// vertex-coloured mesh with one shared material: 8 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the sword arm), weaponSocket, shieldArm (the other arm), head, body.
// The pivots match soldier.js (shoulders ±.205 at .82, hand .37 down the arm, legs ±.08 at .47,
// head at .955).

const SKIN=rgb('#ecc4a6'),SKIN_SHADE=rgb('#c8977a'),CHEEK=rgb('#e2988a'),LIPS=rgb('#b86a62');
const SKIN_LIGHT=rgb('#f6d8bc'),SOCKET=rgb('#583028'),LIPS_DARK=rgb('#7a3e3a');
const EYE=rgb('#3a6aa8'),EYE_WHITE=rgb('#f2ece4'),BROW=rgb('#7e5a26');
const HAIR=rgb('#e0bc6a'),HAIR_LIGHT=rgb('#f4dc98'),HAIR_DARK=rgb('#a8803a');
const IRON=rgb('#4e545a'),STEEL=rgb('#a2a9b0'),STEEL_HI=rgb('#dde2e6'),STEEL_DARK=rgb('#33373c');
const BRONZE=rgb('#c08a3a'),BRONZE_DARK=rgb('#7a5420'),BRONZE_HI=rgb('#e8b860');
const FUR=rgb('#9a958c'),FUR_LIGHT=rgb('#d8d4ca'),FUR_DARK=rgb('#5a5650');
const WOOL=rgb('#2e4a7a'),WOOL_DARK=rgb('#1c2e50'),RED=rgb('#a8302a'),LINEN=rgb('#e4dac4'),LINEN_SHADE=rgb('#b8ac94');
const TROUSER=rgb('#4a4238'),TROUSER_DARK=rgb('#2c2620'),WRAP=rgb('#8a7458'),WRAP_DARK=rgb('#5a4a36');
const LEATHER=rgb('#6a4428'),LEATHER_DARK=rgb('#3a2414'),SOLE=rgb('#241a12');
const WOOD=rgb('#9a7448'),WOOD_DARK=rgb('#5e4428'),PAINT_RED=rgb('#b0322a'),PAINT_WHITE=rgb('#e8e0c8');
const FEATHER=rgb('#f4f2ec'),FEATHER_TIP=rgb('#a8a8a4');
const BEADS=[rgb('#d88a28'),rgb('#2a6ab0'),rgb('#b8302a'),rgb('#e8d8a0')];

// a lathe whose profile is subdivided so vertex-painted patterns have rows to land on
function lathe(profile,segments=24,phiStart=0,phiLength=Math.PI*2,sub=1){
 const pts=[];
 for(let i=0;i<profile.length;i++){
  if(i===0){pts.push(profile[0]);continue;}
  const [r0,h0]=profile[i-1],[r1,h1]=profile[i];
  for(let j=1;j<=sub;j++)pts.push([r0+(r1-r0)*j/sub,h0+(h1-h0)*j/sub]);
 }
 return new THREE.LatheGeometry(pts.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
}
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
// riveted mail: alternating bright and dark ring rows, offset every other column, darker low down
const mail=(lo,hi)=>(x,y,z)=>{
 const a=Math.atan2(x,z)*14,row=Math.round(y*120+(Math.round(a)%2?.5:0));
 return mix(mix(IRON,STEEL,(y-lo)/(hi-lo)),row%2?STEEL_HI:STEEL_DARK,.35);
};
// shaggy fur: speckled light and dark hairs
const fur=(x,y,z)=>mix(FUR_DARK,FUR_LIGHT,hash(Math.round(x*300)*7.1+Math.round(y*300)*3.3+Math.round(z*300)*1.7));

function buildBody(){
 const P=pieces();
 // blue wool tunic showing below the hauberk, with a woven red-and-white zigzag hem band
 P.add(lathe([[.158,.33],[.172,.35],[.174,.45]],32,0,Math.PI*2,6),at(0,0,0,[0,0,0],[1,1,.8]),(x,y,z)=>{
  if(y<.345)return RED;
  if(y<.375){const a=Math.atan2(x,z)*12;return Math.abs(((a-Math.floor(a))-.5)*2)*.03>y-.345?PAINT_WHITE:RED;}
  return ramp(WOOL_DARK,WOOL,.35,.45)(y);
 });
 P.add(new THREE.CircleGeometry(.158,24),at(0,.331,0,[Math.PI/2,0,0],[1,.8,1]),WOOL_DARK);
 // the mail hauberk, to the knee, a little fuller over the chest, with a bronze-linked hem
 P.add(lathe([[.176,.4],[.18,.5],[.174,.6],[.182,.7],[.19,.78],[.182,.85],[.13,.9]],36,0,Math.PI*2,3),at(0,0,0,[0,0,0],[1,1,.8]),mail(.4,.85));
 P.add(new THREE.TorusGeometry(.177,.006,5,40),at(0,.402,0,[Math.PI/2,0,0],[1,.8,1]),BRONZE);
 // leather belt with a bronze buckle and strap end, a pouch at the right hip
 P.add(new THREE.TorusGeometry(.178,.012,5,32),at(0,.54,0,[Math.PI/2,0,0],[1,.81,1]),LEATHER);
 P.add(new THREE.TorusGeometry(.02,.005,5,12),at(0,.54,.146,[0,0,0],[1,.9,1]),BRONZE_HI);
 P.add(new THREE.BoxGeometry(.012,.03,.008),at(0,.54,.148),BRONZE);
 P.add(new THREE.BoxGeometry(.02,.07,.006),at(.03,.5,.148,[0,0,-.1]),LEATHER_DARK);
 P.add(new THREE.BoxGeometry(.022,.012,.008),at(.034,.465,.149,[0,0,-.1]),BRONZE);
 P.add(new THREE.SphereGeometry(.045,12,8),at(.15,.49,.06,[0,0,0],[.7,1,.9]),(x,y)=>ramp(LEATHER_DARK,LEATHER,.45,.52)(y));
 P.add(new THREE.SphereGeometry(.009,6,4),at(.18,.5,.085),BRONZE);
 // a seax slung across the belly under the belt, hilt to the right
 const seax=m=>new THREE.Matrix4().multiplyMatrices(at(-.01,.505,.156,[0,0,.12]),m);
 P.add(new THREE.BoxGeometry(.2,.036,.014),seax(at(-.04,0,0)),(x,y)=>y<.49?LEATHER_DARK:LEATHER);
 for(const x of [-.12,-.03,.05])P.add(new THREE.BoxGeometry(.008,.04,.018),seax(at(x,0,0)),BRONZE);
 P.add(new THREE.CylinderGeometry(.011,.011,.07,8),seax(at(.1,0,0,[0,0,Math.PI/2])),(x,y)=>Math.sin(x*400)>0?LEATHER_DARK:WOOD_DARK);
 P.add(new THREE.SphereGeometry(.014,8,6),seax(at(.14,0,0)),BRONZE);
 // a grey wolf-fur mantle over the shoulders, shaggy tufts round its edge
 P.add(lathe([[.2,.78],[.222,.84],[.214,.9],[.16,.935],[.08,.95],[.066,.95]],36,0,Math.PI*2,2),at(0,0,-.005,[0,0,0],[1,1,.84]),fur);
 for(let i=0;i<34;i++){
  const a=i/34*Math.PI*2+hash(i)*.1,r=.205+hash(i*2.7)*.012;
  P.add(new THREE.ConeGeometry(.02,.05+hash(i*5.1)*.03,5),at(Math.sin(a)*r,.775,Math.cos(a)*r*.84-.005,[Math.PI+(hash(i*3.3)-.5)*.4,a,0],[1,1,.6]),(x,y)=>mix(FUR_DARK,FUR,(y-.73)/.05));
 }
 // tortoise brooches pinning the mantle, a string of glass beads looped between them
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.03,14,8,0,Math.PI*2,0,Math.PI*.5),at(s*.08,.8,.15,[Math.PI/2,0,0],[1,.7,1.3]),(x,y,z)=>Math.sin(x*260)*Math.sin(y*260)>.2?BRONZE_DARK:BRONZE_HI);
  P.add(new THREE.SphereGeometry(.007,6,4),at(s*.08,.8,.168),BRONZE_HI);
 }
 for(let i=0;i<9;i++){
  const t=(i+.5)/9,x=-.07+t*.14,y=.79-Math.sin(t*Math.PI)*.05,z=.162-Math.abs(x)*.08;
  P.add(new THREE.SphereGeometry(.009,6,4),at(x,y,z),BEADS[i%BEADS.length]);
 }
 // neck
 P.add(new THREE.CylinderGeometry(.04,.046,.07,12),at(0,.94,0),SKIN_SHADE);
 return P.merge();
}

// a feather, built as a flattened ellipsoid along +y from its quill at `base`
function feather(P,base,rx,rz,len,width){
 const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,0,rz)),dir=new THREE.Vector3(0,1,0).applyQuaternion(q);
 const c=base.clone().addScaledVector(dir,len/2),m=new THREE.Matrix4().compose(c,q,new THREE.Vector3(.005,len/2,width));
 P.add(new THREE.SphereGeometry(1,8,5),m,(x,y,z)=>mix(FEATHER,FEATHER_TIP,(new THREE.Vector3(x,y,z).distanceTo(base)/len-.55)*2.2));
}

// a braid: plaited lobes down a curve, alternately offset, tied with a bronze ring and a tuft
function braid(P,points){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),n=12;
 for(let i=0;i<n;i++){
  const t=i/(n-1),p=curve.getPointAt(t*.92),tan=curve.getTangentAt(t*.92),r=.022-t*.006;
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),tan).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),i%2?.5:-.5));
  P.add(new THREE.SphereGeometry(1,7,5),new THREE.Matrix4().compose(p,q,new THREE.Vector3(r,r*1.5,r*.9)),(x,y,z)=>mix(i%2?HAIR:HAIR_DARK,HAIR_LIGHT,THREE.MathUtils.clamp((z-p.z)/r,0,1)*.6));
 }
 const end=curve.getPointAt(.95),tan=curve.getTangentAt(.95),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),tan);
 P.add(new THREE.CylinderGeometry(.014,.014,.018,10),new THREE.Matrix4().compose(end,q,new THREE.Vector3(1,1,1)),BRONZE_HI);
 const tip=curve.getPointAt(1).addScaledVector(tan,.02);
 P.add(new THREE.ConeGeometry(.016,.05,8),new THREE.Matrix4().compose(tip,q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI)),new THREE.Vector3(1,1,1)),HAIR_LIGHT);
}

function buildHead(){
 const P=pieces();
 // a faceted face read from above: a narrow skull, high cheekbones, a hard wedge jaw and chin;
 // sockets sit dark under a brow ridge, the eyes are small and bright, the nose bridge catches light
 P.add(new THREE.SphereGeometry(.095,10,8),at(0,.105,0,[0,0,0],[.86,1.04,.92]),(x,y,z)=>z<-.03?SKIN_SHADE:y<.09?mix(SKIN,SKIN_SHADE,.35):SKIN);
 P.add(new THREE.ConeGeometry(.06,.085,5),at(0,.045,.012,[Math.PI,Math.PI/5,0],[.9,1,.95]),(x,y,z)=>z<-.02?SKIN_SHADE:mix(SKIN_SHADE,SKIN,.55));
 P.add(new THREE.BoxGeometry(.03,.02,.024),at(0,.0,.058,[.2,0,0]),SKIN);
 P.add(new THREE.BoxGeometry(.012,.05,.02),at(0,.1,.086,[-.28,0,0]),SKIN_LIGHT);
 P.add(new THREE.ConeGeometry(.014,.032,4),at(0,.075,.097,[Math.PI/2-.2,Math.PI/4,0]),SKIN);
 P.add(new THREE.BoxGeometry(.034,.0045,.01),at(0,.052,.081),LIPS_DARK);
 for(const s of [-1,1]){
  P.add(new THREE.OctahedronGeometry(.02),at(s*.05,.08,.064,[0,.3*s,0],[1.1,.65,.65]),SKIN);
  P.add(new THREE.SphereGeometry(.017,6,5),at(s*.034,.112,.074,[0,0,0],[1.35,.8,.55]),SOCKET);
  P.add(new THREE.SphereGeometry(.0085,6,5),at(s*.034,.111,.083,[0,0,0],[1.3,.7,.5]),EYE_WHITE);
  P.add(new THREE.SphereGeometry(.0052,6,5),at(s*.034,.111,.0885),EYE);
  P.add(new THREE.BoxGeometry(.044,.011,.016),at(s*.036,.127,.082,[-.15,0,s*.2]),BROW);
  P.add(new THREE.BoxGeometry(.01,.04,.02),at(s*.067,.045,.03,[0,0,s*.4]),SKIN_SHADE);
  P.add(new THREE.SphereGeometry(.018,6,5),at(s*.085,.098,-.004,[0,0,0],[.45,1,.75]),SKIN_SHADE);
 }
 // hair: swept back under the helm, gathered at the nape, and the two long braids
 P.add(new THREE.SphereGeometry(.1,18,12,Math.PI*.9,Math.PI*1.2,Math.PI*.3,Math.PI*.45),at(0,.1,-.012,[0,0,0],[.95,1.05,1]),(x,y,z)=>mix(HAIR_DARK,HAIR,THREE.MathUtils.clamp(-z*14,0,1)));
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,.03,-.075,[0,0,0],[1.3,1,.8]),HAIR);
 for(const s of [-1,1])braid(P,[[s*.078,.08,-.02],[s*.104,.015,.06],[s*.122,-.035,.152],[s*.128,-.1,.184],[s*.13,-.22,.186]]);
 // the spangenhelm: an iron dome on bronze ribs and brow band, rivets, a nasal and a top knob
 P.add(new THREE.SphereGeometry(.112,22,10,0,Math.PI*2,0,Math.PI*.5),at(0,.13,0,[0,0,0],[1,1.08,1.08]),(x,y)=>ramp(IRON,STEEL,.14,.25)(y));
 for(const ry of [0,Math.PI/2])P.add(new THREE.TorusGeometry(.113,.0065,4,24,Math.PI),at(0,.13,0,[0,ry,0],[1,1.08,1.08]),BRONZE);
 P.add(new THREE.CylinderGeometry(.116,.116,.022,26,1,true),at(0,.137,0,[0,0,0],[1,1,1.08]),(x,y)=>y>.14?BRONZE_HI:BRONZE);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;P.add(new THREE.OctahedronGeometry(.0055),at(Math.sin(a)*.119,.137,Math.cos(a)*.128),BRONZE_DARK);}
 P.add(new THREE.BoxGeometry(.016,.066,.007),at(0,.1,.118,[-.08,0,0]),(x,y)=>ramp(IRON,STEEL_HI,.07,.13)(y));
 P.add(new THREE.SphereGeometry(.012,8,6),at(0,.252,0),BRONZE_HI);
 // white feathered wings at the temples, swept up and back from bronze mounts
 for(const s of [-1,1]){
  const base=new THREE.Vector3(s*.108,.17,-.01);
  P.add(new THREE.CylinderGeometry(.014,.018,.012,10),at(base.x,base.y,base.z,[0,0,s*Math.PI/2]),BRONZE);
  for(let i=0;i<6;i++)feather(P,base.clone().add(new THREE.Vector3(s*.006,0,-i*.006)),-.25-i*.26,-s*(.42-i*.03),.13-i*.012,.022);
 }
 return P.merge();
}

// dark trousers bound with leg wraps, fur-topped leather boots
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.056,.048,.2,12),at(0,-.1,0),ramp(TROUSER_DARK,TROUSER,-.2,0));
 P.add(new THREE.CylinderGeometry(.049,.043,.2,16,10),at(0,-.3,0),(x,y,z)=>Math.sin(Math.atan2(x,z)+y*95)>.55?WRAP_DARK:ramp(WRAP_DARK,WRAP,-.4,-.2)(y));
 P.add(new THREE.CylinderGeometry(.046,.047,.065,12),at(0,-.43,.005),LEATHER);
 P.add(new THREE.SphereGeometry(.046,10,8),at(0,-.44,.055,[0,0,0],[.95,.55,1.6]),LEATHER);
 P.add(new THREE.TorusGeometry(.05,.016,6,16),at(0,-.4,.004,[Math.PI/2,0,0]),fur);
 P.add(new THREE.BoxGeometry(.086,.016,.16),at(0,-.462,.04),SOLE);
 return P.merge();
}

// a mail sleeve to the elbow over linen, a studded leather bracer and a gauntlet
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.062,16,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),mail(-.05,.05));
 P.add(new THREE.CylinderGeometry(.052,.046,.16,16,8),at(0,-.08,0),mail(-.16,0));
 P.add(new THREE.TorusGeometry(.047,.005,4,16),at(0,-.16,0,[Math.PI/2,0,0]),BRONZE);
 P.add(new THREE.CylinderGeometry(.04,.037,.08,12),at(0,-.195,0),ramp(LINEN_SHADE,LINEN,-.235,-.16));
 P.add(new THREE.CylinderGeometry(.039,.034,.12,12),at(0,-.285,0),(x,y)=>ramp(LEATHER_DARK,LEATHER,-.345,-.225)(y));
 for(const y of [-.25,-.29,-.33])for(let i=0;i<5;i++){const a=(i/4-.5)*1.6;P.add(new THREE.OctahedronGeometry(.006),at(Math.sin(a)*.038,y,Math.cos(a)*.038),BRONZE_HI);}
 // a gauntlet closed round the grip (the weapon socket and the shield strap both sit at its
 // centre, y -.37, z .012): a flared steel cuff over the bracer, a plated back of the hand with
 // bronze-studded knuckles, four finger bands curled round the grip and a thumb folded over them
 P.add(new THREE.CylinderGeometry(.047,.038,.04,12),at(0,-.338,0),(x,y)=>y>-.325?BRONZE:ramp(STEEL_DARK,STEEL,-.36,-.32)(y));
 P.add(new THREE.BoxGeometry(.046,.062,.018),at(0,-.378,-.008,[.08,0,0]),(x,y)=>ramp(STEEL_DARK,STEEL,-.41,-.345)(y));
 for(let i=0;i<4;i++){
  const y=-.4+i*.0145;
  P.add(new THREE.BoxGeometry(.011,.0125,.05),at(-.0175,y,.014),STEEL_DARK);
  P.add(new THREE.BoxGeometry(.011,.0125,.05),at(.0175,y,.014),STEEL_DARK);
  P.add(new THREE.BoxGeometry(.04,.0125,.012),at(0,y,.037),i%2?STEEL:STEEL_HI);
  P.add(new THREE.OctahedronGeometry(.0058),at(0,y,-.02),BRONZE_HI);
 }
 P.add(new THREE.BoxGeometry(.036,.014,.013),at(.004,-.341,.036,[0,0,-.14]),STEEL_HI);
 P.add(new THREE.BoxGeometry(.016,.022,.024),at(.02,-.348,.02,[0,0,.2]),STEEL);
 return P.merge();
}

// a long sword held upright: a fullered blade, a straight iron cross, a leather grip and a lobed
// bronze pommel. Built along +y from the grip.
function buildSword(){
 const P=pieces(),len=.64;
 P.add(new THREE.CylinderGeometry(.006,.021,len,4,10),at(0,.07+len/2,0,[0,0,0],[1,1,.22]),(x,y)=>Math.abs(x)<.005&&y<.07+len*.85?STEEL_DARK:STEEL_HI);
 P.add(new THREE.BoxGeometry(.11,.014,.022),at(0,.064,0),IRON);
 P.add(new THREE.CylinderGeometry(.012,.013,.1,8),at(0,.005,0),(x,y)=>Math.sin(y*240)>0?LEATHER_DARK:LEATHER);
 P.add(new THREE.BoxGeometry(.07,.012,.02),at(0,-.05,0),BRONZE_DARK);
 for(const x of [-.02,0,.02])P.add(new THREE.SphereGeometry(.015,8,6),at(x,-.065+(x?.002:-.004),0,[0,0,0],[1,1.15,.8]),BRONZE);
 return P.merge();
}

// a round linden shield: a wooden board painted in red and white sectors, an iron rim and boss,
// rivets, and a hand strap behind. Built in its own plane; +z is the face.
function buildShield(){
 const P=pieces(),R=.16;
 P.add(new THREE.CylinderGeometry(R,R,.014,32),at(0,0,0,[Math.PI/2,0,0]),WOOD_DARK);
 for(let i=0;i<8;i++){
  const ring=new THREE.RingGeometry(.038,R-.004,6,2,i/8*Math.PI*2,Math.PI/4);
  P.add(ring,at(0,0,.0075),(x,y)=>mix(i%2?PAINT_WHITE:PAINT_RED,WOOD_DARK,Math.max(0,Math.hypot(x,y)-.13)*6));
 }
 P.add(new THREE.TorusGeometry(R,.008,6,40),at(0,0,.002),(x,y,z)=>z>.006?STEEL:IRON);
 P.add(new THREE.SphereGeometry(.045,16,8,0,Math.PI*2,0,Math.PI*.5),at(0,0,.006,[Math.PI/2,0,0],[1,.7,1]),(x,y,z)=>z>.03?STEEL_HI:IRON);
 P.add(new THREE.CylinderGeometry(.05,.05,.004,20),at(0,0,.008,[Math.PI/2,0,0]),IRON);
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;P.add(new THREE.OctahedronGeometry(.006),at(Math.sin(a)*(R-.016),Math.cos(a)*(R-.016),.009),IRON);}
 P.add(new THREE.BoxGeometry(.02,.12,.01),at(0,0,-.011),LEATHER);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.2,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(),sword:buildSword(),shield:buildShield()};
 return S;
}
function mesh(parent,geo,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createValkyrie(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);if(s>0)arm.rotation.z=.08;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);weaponSocket.rotation.z=-.08;arms[1].add(weaponSocket);
 mesh(weaponSocket,S.sword,'sword');
 // strapped to the outside of the left forearm, face outward; that arm rests straight so a
 // shieldArm pose (rotation.z from 0) doesn't jolt it
 const shield=new THREE.Group();shield.position.set(-.062,-.26,.02);shield.rotation.y=-Math.PI/2;arms[0].add(shield);
 mesh(shield,S.shield,'shield');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'valkyrie',arms,arm:arms[1],weaponSocket,shieldArm:arms[0],shield,head,hat:null,beard:null,pick:null};
}
