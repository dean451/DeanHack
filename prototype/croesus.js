import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Croesus (the king of Fort Ludios, hoarding his treasury) shares the humans' letter, so he used to
// be the plain `@` humanoid. He now stands as a gaunt, grasping old miser-king, stooped under his
// own wealth. A heavy gilded crown with tall jagged spikes and blood-red and green stones sits low
// on a bald, sallow, liver-spotted head; the face is hollow-cheeked with a long hooked nose, a thin
// sneering mouth and a wispy grey forked beard, and small greedy eyes glint gold under a heavy brow.
// He wears tarnished gilded plate: a breastplate engraved with bands and a sunburst, a gorget, fluted
// pauldrons and a skirt of lames, all gold gone brown in the hollows. A heavy chain of gold links
// hangs over the chest with a great coin medallion. Over it falls a royal mantle of deep crimson,
// trimmed in spotted ermine, its hem dragging long behind. Fat purses of coin hang at both hips, one
// split and spilling gold. Gilded greaves and sabatons; gauntleted bony hands with jewelled rings.
// In his right hand he carries his two-handed sword upright: a long blade with a gilded, down-swept
// crossguard, a wire-wrapped grip and a jewelled pommel.
// Each moving part (body, head, each leg and arm, the sword) is one merged, vertex-coloured mesh on
// one shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once and
// shared.
// Handles: legs, arms, arm (the sword arm), weaponSocket, head, eyes, body.

const C={
 skin:rgb('#b8a684'),skinDark:rgb('#7a6a4e'),spot:rgb('#80603e'),lip:rgb('#5a3a30'),shadow:rgb('#0a0806'),
 beard:rgb('#9a968a'),beardDark:rgb('#5e5a52'),
 gold:rgb('#b8892a'),goldHi:rgb('#f0cc6a'),goldDark:rgb('#4e3510'),
 crimson:rgb('#5a0c12'),crimsonDark:rgb('#26060a'),crimsonHi:rgb('#8a1c22'),
 ermine:rgb('#e6e0d2'),ermineSpot:rgb('#141210'),
 ruby:rgb('#b0101c'),emerald:rgb('#1a8a4a'),sapphire:rgb('#1c3a9a'),
 steel:rgb('#7a8088'),steelHi:rgb('#d0d6dc'),steelDark:rgb('#30343a'),
 leather:rgb('#3a2414'),leatherHi:rgb('#5e3e22'),purse:rgb('#4a2e18'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// gilt: bright on the raised parts, gone brown in the hollows and towards the bottom
const gilt=(k,y)=>mix(C.goldDark,mix(C.gold,C.goldHi,clamp01(k)),.55+clamp01(y)*.45);
// a fat drawstring purse of coin hanging from the belt, optionally split and spilling
function purse(P,x,z,spill,seed){
 P.add(new THREE.SphereGeometry(.05,12,10),at(x,.43,z,[0,0,(x>0?-1:1)*.15],[1,1.15,.9]),(px,py,pz)=>mix(C.purse,C.leatherHi,clamp01((py-.4)*8)*.5+hash(Math.floor(px*90)+Math.floor(py*90)*3)*.2));
 P.add(new THREE.CylinderGeometry(.018,.03,.04,10),at(x,.49,z),C.purse);
 P.add(new THREE.TorusGeometry(.019,.004,4,12),at(x,.5,z,[Math.PI/2,0,0]),C.goldHi);// the cord
 if(spill)for(let i=0;i<9;i++){
  const h=hash(seed+i),a=hash(seed+i+20)*Math.PI*2;
  P.add(new THREE.CylinderGeometry(.011,.011,.003,10),at(x+Math.sin(a)*.035*h,.4-h*.07,z+.045+Math.cos(a)*.02,[hash(seed+i+40)*2,a,hash(seed+i+60)*2]),i%3?C.goldHi:C.gold);
 }
}

export const HIP_Y=.47,SHOULDER_Y=.83,NECK_Y=.95;

function buildBody(){
 const P=pieces();
 // the gilded breastplate over a narrow, sunken chest: engraved bands and a sunburst on the front
 P.add(lathe([[.15,.5],[.16,.56],[.17,.64],[.18,.72],[.178,.8],[.16,.86],[.11,.905],[.06,.92]],40),at(0,0,0,[0,0,0],[1,1,.78]),(x,y,z)=>{
  const a=Math.atan2(x,z);
  // a sunburst of rays round the medallion's place on the chest
  if(z>.08){const dx=x,dy=y-.7,r=Math.hypot(dx,dy),ang=Math.atan2(dy,dx);if(r>.04&&r<.1&&Math.sin(ang*12)>.6)return C.goldHi;}
  // engraved bands round the waist and below the collar
  if(Math.abs(y-.58)<.008||Math.abs(y-.84)<.006)return C.goldDark;
  return gilt(Math.cos(a)*.6+.2,(y-.5)*2.2);
 });
 // the skirt of lames over the hips, each band stepping out
 for(let i=0;i<3;i++)P.add(new THREE.CylinderGeometry(.162+i*.012,.172+i*.012,.05,32,1,true),at(0,.53-i*.045,0,[0,0,0],[1,1,.8]),(x,y,z)=>gilt(Math.cos(Math.atan2(x,z))*.5+.3-i*.15,.4-i*.2));
 P.add(new THREE.CircleGeometry(.19,24),at(0,.418,0,[Math.PI/2,0,0],[1,.8,1]),C.goldDark);
 // the belt with a jewelled clasp, and the purses
 P.add(new THREE.TorusGeometry(.172,.012,5,40),at(0,.555,0,[Math.PI/2,0,0],[1,.79,1]),C.leather);
 P.add(new THREE.BoxGeometry(.05,.04,.016),at(0,.555,.14),C.goldHi);
 P.add(new THREE.SphereGeometry(.011,8,6),at(0,.555,.15),C.ruby);
 purse(P,-.19,.05,true,13);purse(P,.195,.03,false,29);
 // the gorget, round the neck
 P.add(lathe([[.1,.88],[.085,.92],[.06,.95]],28),at(0,0,0,[0,0,0],[1,1,.86]),(x,y,z)=>gilt(.6,.8));
 // the great chain of gold links over the chest and its coin medallion
 for(let i=0;i<17;i++){
  const t=i/16-.5,a=t*2.2;
  P.add(new THREE.TorusGeometry(.012,.004,4,8),at(Math.sin(a)*.14,.88-(.5-Math.abs(t))*.34,.07+Math.cos(a)*.08,[0,i%2?Math.PI/2:0,a*.5]),i%2?C.goldHi:C.gold);
 }
 P.add(new THREE.CylinderGeometry(.034,.034,.008,20),at(0,.7,.145,[Math.PI/2,0,0]),(x,y,z)=>Math.hypot(x,y-.7)>.026?C.goldDark:C.goldHi);
 P.add(new THREE.SphereGeometry(.012,8,6),at(0,.7,.152,[0,0,0],[1,1,.5]),C.emerald);
 // the royal mantle: deep crimson from the shoulders, dragging behind, trimmed in spotted ermine
 const mantle=(x,y,z)=>{
  const fold=Math.sin(Math.atan2(x,z)*9+y*3)*.5+.5;
  return mix(C.crimsonDark,mix(C.crimson,C.crimsonHi,fold*.5),fold*.6+clamp01((y-.1)*1.2)*.4);
 };
 P.add(lathe([[.3,0],[.27,.15],[.24,.4],[.22,.62],[.23,.78],[.215,.87],[.15,.92]],20,Math.PI*.5,Math.PI),at(0,0,-.03,[0,0,0],[1,1,.95]),mantle);
 // its train dragging along the floor behind
 P.add(new THREE.CylinderGeometry(.3,.36,.012,20,1,false,Math.PI*.55,Math.PI*.9),at(0,.006,-.06,[0,0,0],[1,1,.9]),mantle);
 const ermine=(x,y,z)=>hash(Math.floor(x*40)*7+Math.floor(z*40)*13+Math.floor(y*40))>.88?C.ermineSpot:C.ermine;
 // ermine round the shoulders as a collar cape, and down the mantle's two front edges
 P.add(lathe([[.07,.94],[.15,.915],[.235,.86],[.255,.82]],32),at(0,0,0,[0,0,0],[1,1,.86]),ermine);
 P.add(new THREE.TorusGeometry(.25,.018,6,40),at(0,.82,0,[Math.PI/2,0,0],[1,.86,1]),ermine);
 for(const s of [-1,1])limb(P,[s*.235,.8,.02],[s*.3,.03,-.02],.02,.026,ermine,8);
 // the scrawny neck
 P.add(new THREE.CylinderGeometry(.04,.05,.07,12),at(0,.95,.005),C.skinDark);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the bald, sallow skull, liver-spotted; head centre at .1, a little long and narrow
 P.add(new THREE.SphereGeometry(.088,24,18),at(0,.1,0,[0,0,0],[.9,1.08,1]),(x,y,z)=>{
  // the eye sockets, sunk dark under the brow
  for(const s of [-1,1])if(z>.05&&Math.hypot(x-s*.03,(y-.105)*1.5)<.019)return C.shadow;
  // the thin sneering mouth
  if(z>.06&&Math.abs(y-(.048+Math.abs(x)*.25))<.004&&Math.abs(x)<.026)return C.lip;
  let c=mix(C.skinDark,C.skin,clamp01(z*8+.4));
  // hollow cheeks
  if(z>.03&&Math.abs(x)>.035&&y<.09&&y>.04)c=mix(c,C.skinDark,.55);
  if(hash(Math.floor(x*80)*3+Math.floor(y*80)*7+Math.floor(z*80))>.94)c=mix(c,C.spot,.7);
  return c;
 });
 // the heavy brow and the long hooked nose
 P.add(new THREE.CapsuleGeometry(.014,.06,4,8),at(0,.123,.07,[0,0,Math.PI/2],[1,1,.8]),C.skinDark);
 P.add(new THREE.ConeGeometry(.013,.055,8),at(0,.088,.096,[Math.PI/2+.5,0,0]),(x,y,z)=>mix(C.skinDark,C.skin,clamp01(y*9-.6)));
 P.add(new THREE.SphereGeometry(.009,6,5),at(0,.07,.11,[0,0,0],[1,.8,1.2]),C.skin);// the hook
 // big ears
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.02,8,6),at(s*.08,.1,0,[0,s*.4,0],[.35,1.2,.8]),C.skinDark);
 // the wispy grey beard, long and forked into two points
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.026,.16,8),at(s*.016,-.02,.06,[Math.PI-.25,0,s*.18]),(x,y,z)=>hash(Math.floor(Math.atan2(x,z-.06)*6)+Math.floor(y*90))>.5?C.beard:C.beardDark);
 P.add(new THREE.SphereGeometry(.05,14,8,0,Math.PI*2,Math.PI*.5,Math.PI*.5),at(0,.06,.03,[0,0,0],[1.1,.8,1]),C.beardDark);
 // the crown: a gilded band with tall jagged spikes, set with red and green stones
 P.add(new THREE.CylinderGeometry(.084,.08,.04,28,1,true),at(0,.17,0,[0,0,0],[1,1,1.05]),(x,y,z)=>gilt(Math.cos(Math.atan2(x,z))*.5+.4,.5+(y-.15)*10));
 P.add(new THREE.TorusGeometry(.082,.006,4,28),at(0,.15,0,[Math.PI/2,0,0],[1,1.05,1]),C.goldHi);
 for(let k=0;k<8;k++){
  const a=k/8*Math.PI*2,h=k%2?.06:.1;
  P.add(new THREE.ConeGeometry(.016,h,4),at(Math.sin(a)*.08,.19+h/2,Math.cos(a)*.084,[Math.cos(a)*-.18,a,Math.sin(a)*.18]),(x,y,z)=>gilt(.8,1));
  P.add(new THREE.OctahedronGeometry(.011),at(Math.sin(a)*.086,.17,Math.cos(a)*.09,[0,a,0],[1,1.2,.6]),k%2?C.emerald:C.ruby);
 }
 // a crimson cap inside the crown
 P.add(new THREE.SphereGeometry(.078,18,8,0,Math.PI*2,0,Math.PI*.42),at(0,.15,0),C.crimson);
 return P.merge();
}
// small greedy eyes glinting gold deep in their sockets
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.007,8,6),at(s*.03,.104,.083,[0,0,-s*.2],[1.4,.6,.6]),[1,1,1]);
 return P.merge();
}

// gilded thigh plates, knee cops and greaves into pointed sabatons
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.066,0],[.068,-.09],[.058,-.2]],14),at(0,0,0),(x,y,z)=>gilt(clamp01(z*10+.5)*.8,.5+y));
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.22,.012,[0,0,0],[1,.9,1]),(x,y,z)=>gilt(z*12,.6));
 P.add(new THREE.CylinderGeometry(.05,.042,.2,14),at(0,-.34,0),(x,y,z)=>Math.abs(y+.3)<.006?C.goldDark:gilt(clamp01(z*12+.5)*.8,.4));
 P.add(new THREE.SphereGeometry(.048,12,8),at(0,-.445,.04,[0,0,0],[.85,.45,1.6]),(x,y,z)=>gilt(.5,.3));
 P.add(new THREE.ConeGeometry(.022,.07,8),at(0,-.452,.12,[Math.PI/2,0,0],[1,1,.5]),C.goldDark);// the pointed toe
 P.add(new THREE.BoxGeometry(.08,.012,.17),at(0,-.464,.04),C.goldDark);
 return P.merge();
}

// a fluted gilded pauldron, a crimson sleeve, a gauntlet and a bony hand with jewelled rings
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.07,16,10,0,Math.PI*2,0,Math.PI*.6),at(0,-.0,0,[0,0,0],[1.05,.9,1]),(x,y,z)=>Math.sin(Math.atan2(x,z)*10)>.7?C.goldHi:gilt(.4,.6));
 for(let i=0;i<2;i++)P.add(new THREE.CylinderGeometry(.07-i*.004,.074-i*.004,.03,16,1,true),at(0,-.035-i*.025,0),gilt(.3-i*.1,.5));
 P.add(lathe([[.045,-.04],[.048,-.12],[.042,-.2],[.04,-.23]],14),at(0,0,0),(x,y,z)=>mix(C.crimsonDark,C.crimson,clamp01(z*12+.5)));
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.2,0,[0,0,0],[1,.8,1]),gilt(.6,.5));// the elbow cop
 // the gauntlet's flared cuff
 P.add(new THREE.CylinderGeometry(.052,.038,.1,14,1,true),at(0,-.29,0),(x,y,z)=>gilt(clamp01(z*12+.5),.5));
 // the bony hand, long fingers hooked round the grip, rings on them
 P.add(new THREE.SphereGeometry(.028,10,8),at(0,-.355,.006,[0,0,0],[.85,1.15,.85]),C.skinDark);
 for(let k=0;k<4;k++){
  const x=-.017+k*.012;
  P.add(new THREE.CapsuleGeometry(.0065,.022,3,6),at(x,-.378,.026,[.9,0,0]),C.skin);
  if(k%2===0)P.add(new THREE.TorusGeometry(.008,.0025,4,10),at(x,-.372,.028,[.9+Math.PI/2,0,0]),C.goldHi);
 }
 P.add(new THREE.OctahedronGeometry(.006),at(-.017,-.368,.036),C.ruby);
 P.add(new THREE.OctahedronGeometry(.006),at(.007,-.368,.036),C.sapphire);
 limb(P,[.022,-.345,.012],[.028,-.375,.03],.009,.007,C.skin,6);// the thumb
 return P.merge();
}

// The two-handed sword, held upright: a long double-edged blade with a fuller, a gilded down-swept
// crossguard, a wire-wrapped grip and a jewelled pommel. Built along +y from the grip, edge facing x.
function buildSword(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.015,.017,.24,8),at(0,-.03,0),(x,y,z)=>Math.sin(y*260)>0?C.leather:C.goldHi);
 P.add(new THREE.SphereGeometry(.026,10,8),at(0,-.17,0,[0,0,0],[1,1.25,1]),(x,y,z)=>gilt(y*-20,.8));
 P.add(new THREE.OctahedronGeometry(.012),at(0,-.17,.022,[0,0,0],[1,1.2,.5]),C.ruby);
 // the crossguard, its arms sweeping down and ending in curls
 P.add(new THREE.BoxGeometry(.06,.03,.04),at(0,.1,0),(x,y,z)=>gilt(.6,.7));
 for(const s of [-1,1]){
  limb(P,[s*.025,.1,0],[s*.13,.07,0],.014,.009,gilt(.8,.8),8);
  P.add(new THREE.TorusGeometry(.016,.006,5,10,Math.PI*1.4),at(s*.142,.08,0,[0,0,s>0?Math.PI*.9:-Math.PI*.3]),C.goldHi);
 }
 // the ricasso, then the long blade tapering to a point, a dark fuller down its middle
 const shape=new THREE.Shape();
 shape.moveTo(-.024,.115);shape.lineTo(.024,.115);shape.lineTo(.024,.22);shape.lineTo(.034,.24);shape.lineTo(.026,.9);shape.lineTo(0,.99);shape.lineTo(-.026,.9);shape.lineTo(-.034,.24);shape.lineTo(-.024,.22);shape.lineTo(-.024,.115);
 const blade=new THREE.ExtrudeGeometry(shape,{depth:.008,bevelEnabled:true,bevelThickness:.003,bevelSize:.006,bevelSegments:1});
 blade.translate(0,0,-.004);
 P.add(blade,at(0,0,0),(x,y,z)=>{
  if(Math.abs(x)<.006&&y>.25&&y<.82)return C.steelDark;
  return mix(C.steel,C.steelHi,clamp01(Math.abs(x)*30));
 });
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[.2,Math.PI/2,0]));
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(),sword:buildSword(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.35,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#fff0b0',emissive:'#e8a820',emissiveIntensity:1.6,roughness:.2,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createCroesus(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.25);
 body.rotation.x=.06;// stooped over his hoard
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.03);head.rotation.x=.12;body.add(head);// head thrust forward
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.075,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,SHOULDER_Y,0);arm.rotation.z=s*.1;body.add(arm);mesh(arm,S.arm,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.36,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.sword,'sword',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'croesus',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
