import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The ranger (the player-monster role) used to be the generic '@' humanoid: a tinted box with a
// ball for a head. They now stand as a hunter who has been out in the dark too long: a deep,
// peaked hood of moss-grey wool hides everything but a strip of gaunt face and two pale, glinting
// eyes, with a dark cloth mask drawn up over the nose. A ragged mantle hangs off the shoulders and
// a long cloak falls behind, both torn at the hem into jagged tatters, over a dark studded leather
// jerkin with a belt of pouches and a skinning knife. A quiver slung across the back bristles with
// black-fletched arrows over the right shoulder. Dark breeches, tall soft boots with turned cuffs.
// The left hand grips a black recurved longbow, held low and slanted, with pale bone tips and a
// taut string; a leather bracer guards that forearm. The right hand holds an arrow with a barbed
// iron broadhead, point forward.
// Each moving part (body, head, each leg and arm) and the arrow is one merged, vertex-coloured mesh
// with one shared material: 7 draws. The left arm has its own geometry for the bow.
// Handles: legs, arms, arm (the right, arrow arm), weaponSocket (the arrow), head, body. The
// pivots match archeologist.js (shoulders ±.215 at .82, hand .37 down the arm, legs ±.08 at .47,
// head at .955).

const WOOL=rgb('#3c4436'),WOOL_DARK=rgb('#1e231b'),WOOL_HI=rgb('#56604a'),HOOD_IN=rgb('#0a0b09');
const SKIN=rgb('#9a8a78'),SKIN_SHADE=rgb('#5e5246'),EYE=rgb('#e8e0a0'),MASK=rgb('#1a1816'),MASK_HI=rgb('#2e2a26');
const LEATHER=rgb('#3a2818'),LEATHER_DARK=rgb('#1e140c'),LEATHER_HI=rgb('#5a4028'),STUD=rgb('#6a6660');
const BREECH=rgb('#2a2620'),BREECH_DARK=rgb('#16130f'),BOOT=rgb('#2a1c12'),BOOT_DARK=rgb('#120c08');
const BOW=rgb('#1a1412'),BOW_HI=rgb('#3a2c24'),BONE=rgb('#c8bc9a'),BONE_DARK=rgb('#8a7e62'),STRING=rgb('#b0a888');
const IRON=rgb('#4a4c50'),IRON_HI=rgb('#9a9ca2'),SHAFT=rgb('#4a3a28'),FLETCH=rgb('#101012'),FLETCH_HI=rgb('#3a3a42');
const BRASS=rgb('#8a6e3a');

const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
// a small hand-made fan of triangles (fletching, a broadhead)
const tris=(vertices,index)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(index);g.computeVertexNormals();return g;};
const hash=(a,b=0)=>{const h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
// coarse wool: darker in the folds that run down the cloth
const wool=(x,y,z)=>mix(WOOL_DARK,WOOL,Math.sin(Math.atan2(x,z)*11+y*6)*.3+.55+hash(Math.floor(y*90),Math.floor(Math.atan2(x,z)*30))*.12);
const leather=(x,y,z)=>mix(LEATHER_DARK,LEATHER,Math.sin(x*70+y*40)*.2+.6+hash(Math.floor(x*120),Math.floor(y*120))*.15);

// tear the lowest row of a cloth's vertices into uneven jagged points (sawtooth with noise), and
// let the rows above sag a little toward them
function tatter(geo,bottom,depth,seed){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y>bottom+1e-4)continue;
  const a=Math.atan2(p.getX(i),p.getZ(i)),k=Math.round(a*9);
  p.setY(i,y+(k%2===0?depth*(.6+hash(k,seed)*.8):hash(k,seed+1)*depth*.25));
 }
 geo.computeVertexNormals();return geo;
}

function buildBody(){
 const P=pieces();
 // a lean leather jerkin, studded at the chest, with a laced front
 const torso=[[.17,.43],[.178,.5],[.18,.58],[.176,.68],[.19,.78],[.18,.86],[.12,.9],[.06,.915]];
 P.add(lathe(torso,36),at(0,0,0,[0,0,0],[1,1,.82]),(x,y,z)=>z>0&&Math.abs(x)<.006&&y<.86?LEATHER_DARK:leather(x,y,z));
 for(let row=0;row<3;row++)for(const s of [-1,1])for(let c=0;c<2;c++)
  P.add(new THREE.SphereGeometry(.006,5,4),at(s*(.05+c*.05),.62+row*.07,.142-c*.012),STUD);
 for(let i=0;i<4;i++)P.add(new THREE.BoxGeometry(.03,.004,.004),at(0,.52+i*.08,.149,[0,0,(i%2?1:-1)*.5]),LEATHER_HI);
 // the belt with an iron buckle, pouches, and a skinning knife at the hip
 P.add(lathe([[.183,.455],[.186,.495]],32),at(0,0,0,[0,0,0],[1,1,.84]),LEATHER_DARK);
 P.add(new THREE.BoxGeometry(.04,.034,.01),at(0,.475,.157),IRON);
 for(const [x,z,r] of [[-.13,.11,-.7],[.15,-.05,1.9]])P.add(new THREE.BoxGeometry(.06,.06,.035),at(x,.43,z,[0,r,0]),leather);
 P.add(new THREE.BoxGeometry(.024,.12,.014),at(.155,.4,.08,[0,.9,.15]),LEATHER_DARK);
 P.add(new THREE.CylinderGeometry(.008,.008,.04,6),at(.158,.48,.082,[0,0,.15]),BONE_DARK);
 // the mantle: a short ragged cape round the shoulders, torn into points
 const mantle=tatter(lathe([[.08,.93],[.15,.9],[.24,.8],[.26,.7]],40),.7,.08,3);
 P.add(mantle,at(0,0,-.005,[0,0,0],[1,1,.9]),wool);
 // the long cloak hanging down the back, its hem torn into tatters
 const cloak=new THREE.CylinderGeometry(.215,.29,.6,34,6,true,Math.PI/2+.3,Math.PI-.6);
 cloak.translate(0,.6,0);tatter(cloak,.3,.12,7);
 P.add(cloak,at(0,0,-.02,[0,0,0],[1,1,.92]),(x,y,z)=>y<.36?mix(WOOL_DARK,wool(x,y,z),(y-.25)*8):wool(x,y,z));
 // the quiver slung across the back, top over the right shoulder, bristling with black fletching
 const quiver=at(.06,.66,-.24,[-.15,0,-.45]);
 P.add(new THREE.CylinderGeometry(.045,.038,.4,12,1,false),quiver,leather);
 P.add(new THREE.TorusGeometry(.046,.007,4,14).rotateX(Math.PI/2).translate(0,.2,0),quiver,BRASS);
 P.add(new THREE.BoxGeometry(.012,.5,.006),at(.01,.7,.12,[0,0,-.75]),LEATHER_DARK);
 for(let i=0;i<5;i++){
  const ox=(hash(i,1)-.5)*.05,oz=(hash(i,2)-.5)*.05,len=.1+hash(i,3)*.04;
  const m=new THREE.Matrix4().multiplyMatrices(quiver,at(ox,.2+len/2,oz,[(hash(i,4)-.5)*.2,0,(hash(i,5)-.5)*.2]));
  P.add(new THREE.CylinderGeometry(.004,.004,len,4),m,SHAFT);
  for(let f=0;f<3;f++){
   const fm=new THREE.Matrix4().multiplyMatrices(m,at(Math.sin(f*2.094)*.007,len/2-.03,Math.cos(f*2.094)*.007,[0,f*2.094,0]));
   // a jagged, swept-back black flight
   P.add(tris([0,-.03,0, 0,.035,0, 0,.02,.022, 0,0,.016, 0,-.012,.024],[0,1,2,0,2,3,0,3,4]),fm,(x,y)=>y>.95?FLETCH_HI:FLETCH);
  }
 }
 // the neck, wrapped in the mask's cloth
 P.add(new THREE.CylinderGeometry(.052,.06,.08,14),at(0,.92,0),MASK);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a gaunt face in shadow; head centre at y .1
 P.add(new THREE.SphereGeometry(.088,18,14),at(0,.1,.005,[0,0,0],[.88,1,.95]),(x,y)=>y>.09?SKIN:SKIN_SHADE);
 // sunken brows and two pale eyes that catch the light out of the dark
 P.add(new THREE.BoxGeometry(.09,.016,.02),at(0,.132,.077,[.2,0,0]),SKIN_SHADE);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.016,8,6),at(s*.03,.115,.074,[0,0,0],[1.2,.6,.5]),HOOD_IN);
  P.add(new THREE.SphereGeometry(.009,8,6),at(s*.03,.115,.08,[0,s*.2,0],[1.3,.55,.6]),EYE);
 }
 // the mask drawn up over the nose and mouth, wrapped round under the hood
 P.add(new THREE.SphereGeometry(.094,18,10,0,Math.PI*2,Math.PI*.5,Math.PI*.35),at(0,.105,.012,[0,0,0],[.92,1.05,1]),(x,y,z)=>Math.sin(y*160+x*20)>.6?MASK_HI:MASK);
 P.add(new THREE.ConeGeometry(.018,.05,4),at(0,.07,.088,[Math.PI,0,0]),MASK);
 // the hood: a deep cowl, black inside, standing off the face and drawn to a peak that sags back
 const hood=new THREE.SphereGeometry(.128,26,18,Math.PI*.68,Math.PI*1.64,0,Math.PI*.78);
 {const p=hood.attributes.position;for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  // pull the crown up and back into a peak, and let the cowl's rim jut forward over the brow
  const top=Math.max(0,y/.128);
  p.setY(i,y+top*top*top*.07);p.setZ(i,z-top*top*top*.06+(z>.05&&y>.02?.018:0));
 }hood.computeVertexNormals();}
 P.add(hood,at(0,.105,-.005),(x,y,z)=>z>.07?mix(WOOL_DARK,wool(x,y,z),.4):wool(x,y,z));
 // the inner lining, black, so the face sits in a well of shadow
 P.add(new THREE.SphereGeometry(.118,20,14,Math.PI*.7,Math.PI*1.6,0,Math.PI*.76),at(0,.105,-.002),HOOD_IN);
 // a ragged fall of the hood down the back of the neck
 P.add(tatter(new THREE.CylinderGeometry(.11,.15,.12,20,2,true,Math.PI/2+.4,Math.PI-.8),-.06,.03,11),at(0,.005,-.01),wool);
 return P.merge();
}

// dark breeches into tall soft boots with a turned-down cuff
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.075,-.2],[.078,-.1],[.074,0]],14),at(0,0,0),(x,y)=>mix(BREECH_DARK,BREECH,(y+.2)*4));
 P.add(lathe([[.05,-.46],[.054,-.4],[.05,-.3],[.06,-.2]],14),at(0,0,0),(x,y,z)=>mix(BOOT_DARK,BOOT,Math.sin(y*80)*.3+.5));
 P.add(lathe([[.064,-.24],[.07,-.2],[.064,-.18]],14),at(0,0,0),LEATHER_HI);
 P.add(new THREE.SphereGeometry(.05,10,8),at(0,-.44,.045,[0,0,0],[1,.55,1.6]),BOOT);
 P.add(new THREE.BoxGeometry(.088,.016,.16),at(0,-.462,.035),BOOT_DARK);
 return P.merge();
}

// a wool sleeve, a gloved hand; the left forearm wears a bracer and the left fist grips the bow
function buildArm(left){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.062,14,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.1,.85,1]),wool);
 P.add(lathe([[.064,0],[.06,-.12],[.05,-.22],[.042,-.32]],14),at(0,0,0),wool);
 P.add(new THREE.SphereGeometry(.036,12,8),at(0,-.36,.006,[0,0,0],[.9,1.1,1]),LEATHER_DARK);
 for(let k=0;k<4;k++)P.add(new THREE.CapsuleGeometry(.008,.02,2,5),at(-.018+k*.012,-.392,.022),LEATHER_DARK);
 if(left){
  P.add(lathe([[.05,-.32],[.053,-.27],[.048,-.21]],14),at(0,0,0),leather);
  for(let i=0;i<3;i++)P.add(new THREE.BoxGeometry(.004,.004,.104),at(0,-.23-i*.035,0,[0,0,0]),LEATHER_HI);
  // the bow: black recurved limbs with bone tips and a wrapped grip, held low and slanted with
  // the top forward
  const bow=at(0,-.37,.03,[.55,0,-.12]),on=m=>new THREE.Matrix4().multiplyMatrices(bow,m);
  for(const side of [-1,1]){
   const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0,0),new THREE.Vector3(0,side*.14,.015),new THREE.Vector3(0,side*.28,-.02),
    new THREE.Vector3(0,side*.38,-.07),new THREE.Vector3(0,side*.43,-.06),new THREE.Vector3(0,side*.46,-.03),
   ]);
   const limb=new THREE.TubeGeometry(curve,22,.013,6,false);
   // the limbs taper toward the tips
   {const p=limb.attributes.position;for(let i=0;i<p.count;i++){
    const s=Math.floor(i/7),k=1-s/22*.55,c=curve.getPointAt(s/22);
    p.setX(i,c.x+(p.getX(i)-c.x)*k);p.setZ(i,c.z+(p.getZ(i)-c.z)*k);
   }limb.computeVertexNormals();}
   P.add(limb,bow,(x,y,z)=>mix(BOW,BOW_HI,Math.sin(y*90)*.3+.3));
   P.add(new THREE.ConeGeometry(.011,.045,5),on(at(0,side*.48,-.025,[side>0?-.5:Math.PI+.5,0,0])),(x,y)=>Math.abs(y)>.8?BONE:BONE_DARK);
  }
  P.add(new THREE.CylinderGeometry(.018,.018,.1,8),bow,(x,y)=>Math.sin(y*260)>0?LEATHER:LEATHER_HI);
  // the string, taut from tip to tip behind the limbs
  P.add(new THREE.CylinderGeometry(.0025,.0025,.86,4),on(at(0,0,-.068)),STRING);
 }
 return P.merge();
}

// the arrow: a long dark shaft with a barbed iron broadhead and black flights, held point forward
function buildArrow(){
 const P=pieces(),tilt=at(0,0,0,[Math.PI/2-.35,0,0]),on=m=>new THREE.Matrix4().multiplyMatrices(tilt,m);
 P.add(new THREE.CylinderGeometry(.0055,.0055,.6,6),on(at(0,.05,0)),SHAFT);
 // the broadhead: a flat leaf with two hooked barbs swept back
 const head=()=>tris([0,.09,0, -.026,0,0, -.012,.012,0, 0,-.012,0, .012,.012,0, .026,0,0],[0,1,2, 0,2,3, 0,3,4, 0,4,5]);
 P.add(head(),on(at(0,.35,0)),(x,y,z)=>mix(IRON,IRON_HI,Math.abs(x)*25));
 P.add(head(),on(at(0,.35,0,[0,Math.PI/2,0],[.8,1,1])),IRON);
 P.add(new THREE.CylinderGeometry(.008,.006,.03,6),on(at(0,.345,0)),IRON);
 for(let f=0;f<3;f++){
  P.add(tris([0,-.08,0, 0,0,0, 0,-.01,.024, 0,-.04,.016, 0,-.06,.026],[0,1,2,0,2,3,0,3,4]),on(at(0,-.17,0,[0,f*2.094,0])),FLETCH);
 }
 P.add(new THREE.CylinderGeometry(.007,.007,.014,6),on(at(0,-.25,0)),BONE);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(!S){
  material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:.05,side:THREE.DoubleSide});
  S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(false),armLeft:buildArm(true),arrow:buildArrow()};
 }
 return S;
}
function mesh(parent,geo,name){const o=new THREE.Mesh(geo,material);o.castShadow=o.receiveShadow=true;o.userData.part=name;parent.add(o);return o;}

export function createRanger(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);arm.rotation.z=s*.08;body.add(arm);mesh(arm,s<0?S.armLeft:S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.arrow,'arrow');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'ranger',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
