import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The healer (the player-monster role) used to be the generic '@' humanoid: a tinted box with a
// ball for a head. They now come as a plague doctor: a wide black brim over a deep cowl, and under
// it a long hooked leather beak stitched down its ridge, with round glass eyes glinting a sickly
// green. A waxed black coat falls nearly to the ankles, its hem torn, with a short shoulder cape
// over it. Across the front hangs a stained leather apron, and a belt carries a row of stoppered
// vials, a bundle of dried herbs and a bone saw. The hands are gloved in black leather. The right
// fist holds a crooked staff with a serpent coiled up it, its head reared over the top: the healer's
// own Staff of Aesculapius, turned sour.
// Each moving part (body, head, each leg and arm) and the staff is one merged, vertex-coloured mesh
// with one shared material: 7 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the right, staff arm), weaponSocket (the staff), head, body. The pivots
// match barbarian.js, rogue.js and monk.js (shoulders ±.215 at .82, hand .37 down the arm, legs
// ±.08 at .47, head at .955).

const COAT=rgb('#1e1c1e'),COAT_HI=rgb('#3a363a'),COAT_DARK=rgb('#0c0b0c'),WAX=rgb('#56505a');
const LEATHER=rgb('#4a3222'),LEATHER_HI=rgb('#6e4e34'),LEATHER_DARK=rgb('#22160e');
const BEAK=rgb('#6a5440'),BEAK_DARK=rgb('#2e2218'),STITCH=rgb('#b8a888');
const APRON=rgb('#5a4a38'),STAIN=rgb('#3a1410'),STAIN_DARK=rgb('#1e0a08');
const GLASS=rgb('#8ab04a'),GLASS_HI=rgb('#e0f0a0'),BRASS=rgb('#8a6e34'),BRASS_HI=rgb('#c8a860');
const GLOVE=rgb('#141214'),GLOVE_HI=rgb('#34303a'),BONE=rgb('#d2c6a8'),BONE_DARK=rgb('#7a6e58');
const WOOD=rgb('#3a2818'),WOOD_DARK=rgb('#1a120a'),SCALE=rgb('#4a5a2a'),SCALE_DARK=rgb('#1c2410');
const VIAL=[rgb('#6a8a2a'),rgb('#7a1a14'),rgb('#3a4a6a'),rgb('#9a8a2a')],CORK=rgb('#8a6a44');
const HERB=rgb('#5a5a2a'),STEEL=rgb('#8a8e96'),STEEL_DARK=rgb('#3e4248'),FANG=rgb('#e8e0c8');

const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const ring=(r,tube,radial=6,tubular=36)=>new THREE.TorusGeometry(r,tube,radial,tubular).rotateX(Math.PI/2);
const hash=(a,b=0)=>{const h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
// a sawtooth tear along the lowest row of a lathe (see barbarian.js)
function tear(geo,hem,depth,teeth,seed=0){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  if(p.getY(i)>hem+1e-4)continue;
  const a=Math.atan2(p.getX(i),p.getZ(i))*teeth/Math.PI+seed;
  const f=a-Math.floor(a),h=hash(Math.floor(a),seed);
  p.setY(i,p.getY(i)-depth*(.45+.55*h)*(1-Math.abs(f-.5)*2));
 }
 geo.computeVertexNormals();
 return geo;
}
// waxed cloth: long vertical folds, the ridges catching a dull sheen
const waxed=(lo,hi)=>(x,y,z)=>{
 const fold=Math.sin(Math.atan2(x,z)*14)*.5+.5;
 return mix(mix(COAT_DARK,COAT,(y-lo)/(hi-lo)),WAX,fold*fold*.35);
};
// a tube along a curve, tapering from `radius` at the start to `tip` of it at the end
function taper(points,radius,tip=.08,tubular=20,radial=8){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const geo=new THREE.TubeGeometry(curve,tubular,radius,radial,false);
 const p=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){
  const t=Math.floor(i/(radial+1))/tubular;
  curve.getPointAt(t,c);v.fromBufferAttribute(p,i).sub(c).multiplyScalar(1-t*(1-tip)).add(c);
  p.setXYZ(i,v.x,v.y,v.z);
 }
 geo.computeVertexNormals();
 return geo;
}

function buildBody(){
 const P=pieces();
 // the long waxed coat, flaring toward a torn hem just above the ankles
 const coat=tear(lathe([[.25,.12],[.225,.26],[.2,.42],[.184,.56],[.19,.68],[.2,.78],[.185,.86],[.12,.91],[.06,.925]],48),.121,.05,17,1.7);
 P.add(coat,at(0,0,0,[0,0,0],[1,1,.84]),waxed(.1,.9));
 P.add(new THREE.CircleGeometry(.25,32),at(0,.13,0,[Math.PI/2,0,0],[1,.84,1]),COAT_DARK);
 // a dark seam down the front, with brass-capped toggles
 P.add(new THREE.BoxGeometry(.008,.5,.006),at(0,.66,.168),COAT_DARK);
 for(let i=0;i<4;i++)P.add(new THREE.SphereGeometry(.008,6,4),at(.012,.84-i*.07,.17),BRASS_HI);
 // the short cape over the shoulders, its hem cut into ragged points
 const cape=tear(lathe([[.07,.955],[.16,.925],[.245,.86],[.27,.77],[.268,.7]],48),.701,.07,11,.4);
 P.add(cape,at(0,0,0,[0,0,0],[1,1,.86]),waxed(.62,.95));
 // the apron: stained leather hung from the waist, blood darkest toward the hem
 const apron=new THREE.CylinderGeometry(.205,.235,.36,20,6,true,-Math.PI*.36,Math.PI*.72);
 P.add(tear(apron,-.179,.03,6,.3),at(0,.37,.004,[0,0,0],[1,1,.84]),(x,y,z)=>{
  const splash=hash(Math.floor(x*30),Math.floor(y*24));
  if(splash>.78)return mix(STAIN,STAIN_DARK,(.4-y)*3);
  return mix(mix(LEATHER_DARK,APRON,(y-.19)*3),STAIN,Math.max(0,.36-y)*3.5);
 });
 // the belt, its brass buckle, and a row of stoppered vials on the right hip
 P.add(new THREE.CylinderGeometry(.196,.196,.05,36,1,true),at(0,.555,0,[0,0,0],[1,1,.84]),(x,y)=>Math.abs(y-.555)>.018?LEATHER_HI:LEATHER);
 P.add(new THREE.BoxGeometry(.05,.044,.012),at(0,.555,.166),BRASS);
 P.add(new THREE.BoxGeometry(.028,.024,.014),at(0,.555,.168),LEATHER_DARK);
 for(let i=0;i<4;i++){
  const a=.55+i*.24,x=Math.sin(a)*.2,z=Math.cos(a)*.17;
  P.add(new THREE.CylinderGeometry(.014,.016,.06,8),at(x,.5,z),(px,py)=>py>.515?mix(VIAL[i],GLASS_HI,.25):VIAL[i]);
  P.add(new THREE.CylinderGeometry(.009,.008,.016,6),at(x,.538,z),CORK);
 }
 // a bundle of dried herbs tied at the left hip
 for(let i=0;i<6;i++)P.add(new THREE.ConeGeometry(.012,.12,4),at(-.19+Math.sin(i)*.012,.46,.07+Math.cos(i*2)*.012,[Math.PI+(i-2.5)*.08,0,(i-2.5)*.06]),(x,y)=>mix(HERB,LEATHER_DARK,(.47-y)*8));
 P.add(new THREE.CylinderGeometry(.018,.018,.014,8),at(-.19,.51,.07),LEATHER_DARK);
 // and a bone saw hanging behind it, its toothed blade pointing down
 P.add(new THREE.BoxGeometry(.018,.04,.024),at(-.2,.51,-.04),BONE_DARK);
 const saw=new THREE.Shape();
 saw.moveTo(-.022,0);saw.lineTo(.022,0);
 for(let k=0;k<=8;k++)saw.lineTo(.022-k*.003,-.03-k*.018-(k%2?.006:0));
 saw.lineTo(-.022,-.03);saw.lineTo(-.022,0);
 P.add(new THREE.ShapeGeometry(saw),at(-.203,.49,-.04,[0,Math.PI/2,0]),(x,y)=>y<.44?STEEL_DARK:STEEL);
 // the high collar of the coat round the neck
 P.add(new THREE.CylinderGeometry(.06,.075,.06,14,1,true),at(0,.93,0),COAT_HI);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the cowl: a deep hood of the same waxed cloth, drawn close round the mask; head centre at y .1
 P.add(new THREE.SphereGeometry(.102,20,14,0,Math.PI*2,0,Math.PI*.78),at(0,.1,-.01,[-.15,0,0],[1,1.02,1.05]),(x,y,z)=>z>.07?COAT_DARK:waxed(-.02,.2)(x,y,z));
 // the mask: close leather over the face, the beak sprouting from it
 P.add(new THREE.SphereGeometry(.086,18,12),at(0,.1,.006,[0,0,0],[.92,1,.92]),(x,y)=>mix(BEAK_DARK,BEAK,(y-.03)*6));
 // the beak: long, drooping and hooked at the tip, a dark stitched ridge along the top
 const beak=taper([[0,.085,.06],[0,.07,.13],[0,.045,.2],[0,.015,.25],[0,-.01,.26]],.042,.06,22,10);
 P.add(beak,null,(x,y,z)=>{
  if(Math.abs(x)<.006&&y>.02)return Math.sin(z*260)>0?STITCH:BEAK_DARK;
  return mix(BEAK_DARK,BEAK,.3+Math.max(0,y-.02)*8);
 });
 // a brass nose-ring binding the beak where it meets the mask
 P.add(new THREE.TorusGeometry(.04,.005,5,20),at(0,.083,.09,[-.25,0,0],[1,1.15,1]),BRASS);
 // the glass eyes: round brass-rimmed lenses, a sickly green with a hard highlight
 for(const s of [-1,1]){
  P.add(new THREE.TorusGeometry(.019,.005,5,16),at(s*.036,.118,.074,[0,s*.35,0]),BRASS_HI);
  P.add(new THREE.CircleGeometry(.017,14),at(s*.036,.118,.075,[0,s*.35,0]),(x,y)=>y>.124&&x*s<.036?GLASS_HI:GLASS);
 }
 // the wide flat brim, drooping a little at the edge, and the low round crown
 P.add(lathe([[.2,.162],[.19,.17],[.12,.178],[.09,.18]],36),at(0,0,0),(x,y,z)=>Math.hypot(x,z)>.19?COAT_HI:COAT_DARK);
 P.add(lathe([[.21,.155],[.2,.162]],36),at(0,0,0),COAT);
 P.add(lathe([[.09,.18],[.095,.22],[.09,.26],[.07,.275],[0,.28]],28),at(0,0,0,[-.06,0,0]),(x,y)=>mix(COAT_DARK,COAT_HI,(y-.18)*6));
 P.add(new THREE.CylinderGeometry(.094,.094,.018,28,1,true),at(0,.19,.0,[-.06,0,0]),LEATHER_DARK);
 return P.merge();
}

// the coat's hem covers the thigh: only the shin shows, in dark wrapped leggings and pointed boots
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.064,0],[.066,-.12],[.056,-.24],[.05,-.3]],14),at(0,0,0),(x,y)=>ramp(COAT_DARK,COAT,-.3,0)(y));
 P.add(new THREE.CylinderGeometry(.056,.05,.16,14),at(0,-.37,0),(x,y,z)=>Math.abs(Math.sin(y*80+Math.atan2(x,z)))<.2?LEATHER_HI:LEATHER_DARK);
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.44,.05,[0,0,0],[.95,.5,1.7]),LEATHER_DARK);
 P.add(new THREE.ConeGeometry(.024,.06,6),at(0,-.448,.13,[Math.PI/2,0,0],[1,1,.5]),LEATHER_DARK);
 P.add(new THREE.BoxGeometry(.09,.018,.17),at(0,-.463,.04),COAT_DARK);
 return P.merge();
}

// a long waxed sleeve with a wide cuff, and a black leather glove with long fingers
function buildArm(){
 const P=pieces();
 P.add(lathe([[.068,.02],[.07,-.06],[.062,-.16],[.06,-.24],[.066,-.3]],16),at(0,0,0),waxed(-.3,.02));
 P.add(new THREE.CylinderGeometry(.07,.064,.05,14,1,true),at(0,-.3,0),COAT_HI);
 P.add(new THREE.SphereGeometry(.036,12,8),at(0,-.355,.006,[0,0,0],[.9,1.1,1]),(x,y,z)=>Math.max(0,x+z)>.02?GLOVE_HI:GLOVE);
 for(let k=0;k<4;k++)P.add(new THREE.CylinderGeometry(.008,.005,.05,5),at(-.018+k*.012,-.385,.03,[.5,0,0]),GLOVE);
 return P.merge();
}

// the staff: a crooked, knotted pole with a serpent spiralling up it, its head reared above the top;
// built upright, then tilted a little forward in the fist
function buildStaff(){
 const P=pieces();
 const pole=[[0,-.25,0],[.006,0,.004],[-.005,.3,-.004],[.01,.55,.006],[0,.72,0]];
 P.add(taper(pole,.016,.75,16,7),null,(x,y)=>{
  if(y>-.06&&y<.06)return Math.sin(y*220)>0?LEATHER:LEATHER_HI;
  return mix(WOOD_DARK,WOOD,hash(Math.floor(y*30))*.7+.2);
 });
 for(let i=0;i<3;i++)P.add(new THREE.SphereGeometry(.02,6,5),at(hash(i,4)*.01,.2+i*.18,0,[0,0,0],[1,.7,1]),WOOD_DARK);
 // the serpent: a coil round the pole, thickest in the middle, rising to a reared head
 const coil=[];
 for(let k=0;k<=22;k++){
  const t=k/22,a=t*Math.PI*2*3.2,y=.05+t*.62,r=.03;
  coil.push([Math.sin(a)*r,y,Math.cos(a)*r]);
 }
 coil.push([.03,.72,.02],[.05,.78,.04]);
 const snake=taper(coil,.012,.6,72,7);
 P.add(snake,null,(x,y,z)=>{
  const scale=Math.sin(y*260+Math.atan2(x,z)*3);
  return scale>.4?SCALE:SCALE_DARK;
 });
 // the head: a wedge with a pale belly, slit eyes, a split tongue and bared fangs
 P.add(new THREE.SphereGeometry(.022,10,8),at(.056,.795,.05,[.5,0,-.5],[.8,.55,1.4]),(x,y)=>y<.79?mix(SCALE_DARK,BONE_DARK,.5):SCALE);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.004,5,4),at(.056+s*.013,.806,.062),GLASS);
  P.add(new THREE.ConeGeometry(.0025,.014,4),at(.056+s*.006,.78,.074,[Math.PI,0,0]),FANG);
 }
 P.add(new THREE.BoxGeometry(.003,.002,.03),at(.058,.782,.09,[-.2,0,0]),STAIN);
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[.22,0,0]));
 return geo;
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.08,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(),staff:buildStaff()};
 return S;
}
function mesh(parent,geo,name){const o=new THREE.Mesh(geo,material);o.castShadow=o.receiveShadow=true;o.userData.part=name;parent.add(o);return o;}

export function createHealer(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);arm.rotation.z=s*.08;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.staff,'staff');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'healer',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
