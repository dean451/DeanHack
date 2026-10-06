import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// One-eyed Sam (UnNetHack's black-market boss) shares the humans' letter, so she used to be the
// plain `@` humanoid. She now stands as a lean, hard-faced fence and cutthroat, kitted out in the
// best of what she has taken off adventurers. A black tricorn with the brim cocked up hard, a silver
// skull pinned to it, shades a gaunt, weathered face with high cheekbones and a thin crooked smirk.
// A black patch covers the left eye, an old scar running from the brow through it down the cheek;
// the right eye burns ember red. Her black hair hangs in a long braid down her back. Under an open
// black greatcoat, its high collar standing up behind the neck and its hem cut into long ragged
// points, she wears grey dragon scale mail, overlapping slate scales from the hips to the throat. A
// blood-red sash at the waist with a ring of skeleton keys at the hip, and an amulet of life saving
// (a gold ankh) on a fine chain at the throat. Tall black speed boots with folded cuffs and small
// silver wings at the ankles. Strapped to her left forearm, a polished mirror shield of reflection;
// in her right hand Thiefbane, a blackened two-handed sword with a sawback edge and a hooked point,
// a spiked iron guard and a red-wrapped grip.
// Each moving part (body, head, each leg and arm, the sword) is one merged, vertex-coloured mesh on
// one shared material, plus one small glowing mesh for the eye: 8 draws. The shield is baked into
// the left arm. Geometry is built once and shared.
// Handles: legs, arms, arm (the sword arm), weaponSocket, shieldArm (the shield arm), head, eyes, body.

const C={
 skin:rgb('#a89a84'),skinDark:rgb('#6a5c4c'),lip:rgb('#4a2a28'),shadow:rgb('#080606'),scar:rgb('#c08878'),
 hair:rgb('#141214'),hairHi:rgb('#3a363c'),
 scale:rgb('#6a7078'),scaleHi:rgb('#a8b0b8'),scaleDark:rgb('#1e2226'),
 coat:rgb('#16141a'),coatHi:rgb('#34303a'),coatDark:rgb('#060508'),
 sash:rgb('#6a0a10'),sashDark:rgb('#2e0408'),
 leather:rgb('#241a14'),glove:rgb('#3a3634'),
 steel:rgb('#5a6068'),steelHi:rgb('#d8dee6'),steelDark:rgb('#22262c'),
 mirror:rgb('#e6eef6'),sky:rgb('#9aa8b8'),horizon:rgb('#2a3038'),
 black:rgb('#1a1a1e'),blackHi:rgb('#4a4c52'),
 gold:rgb('#b8892a'),goldHi:rgb('#f0cc6a'),bone:rgb('#d8d0b8'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// grey dragon scales in staggered rows, each one bright along its lower lip with a dark gap under it
function dragonScale(x,y,z){
 const rows=48,row=Math.floor(y*rows),v=y*rows-row;
 const col=Math.floor((Math.atan2(x,z)/(Math.PI*2)+.5)*40+(row%2)*.5);
 const n=hash(row*57+col*13);
 if(v<.14)return C.scaleDark;
 return mix(C.scale,C.scaleHi,clamp01((1-v)*.9+n*.3-.25));
}
// black coat leather, catching a little light along its folds
const coat=(x,y,z)=>{
 const fold=Math.sin(Math.atan2(x,z)*7+y*4)*.5+.5;
 return mix(C.coatDark,mix(C.coat,C.coatHi,fold*.6),.5+fold*.5);
};

export const HIP_Y=.47,SHOULDER_Y=.84,NECK_Y=.95;

function buildBody(){
 const P=pieces();
 // the scale-mail cuirass on a lean, narrow-waisted body, two rounded swells for the bust
 P.add(lathe([[.15,.44],[.14,.52],[.125,.6],[.14,.68],[.16,.76],[.162,.82],[.14,.87],[.1,.91],[.055,.93]],40),at(0,0,0,[0,0,0],[1,1,.74]),dragonScale);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.058,16,12),at(s*.055,.755,.07,[0,s*.25,0],[1,.85,.75]),dragonScale);
 // the scale skirt over the hips
 P.add(new THREE.CylinderGeometry(.15,.17,.12,36,1,true),at(0,.43,0,[0,0,0],[1,1,.8]),dragonScale);
 P.add(new THREE.CircleGeometry(.17,24),at(0,.372,0,[Math.PI/2,0,0],[1,.8,1]),C.scaleDark);
 // the blood-red sash knotted at the left hip, its ends hanging
 P.add(new THREE.TorusGeometry(.142,.02,6,40),at(0,.535,0,[Math.PI/2,0,0],[1,.76,1.3]),(x,y,z)=>mix(C.sashDark,C.sash,clamp01(Math.sin(Math.atan2(x,z)*14)*.5+.5)));
 P.add(new THREE.SphereGeometry(.025,8,6),at(-.13,.53,.06),C.sash);
 for(const [dx,a] of [[-.01,.15],[.012,-.1]])P.add(new THREE.BoxGeometry(.03,.17,.008),at(-.135+dx,.44,.07,[.1,0,a]),(x,y,z)=>mix(C.sashDark,C.sash,clamp01((y-.36)*6)));
 // the ring of skeleton keys at the right hip
 P.add(new THREE.TorusGeometry(.024,.004,5,14),at(.155,.48,.04,[0,Math.PI/2-.3,0]),C.steel);
 for(let k=0;k<3;k++){
  const a=-.5+k*.45,x=.158+Math.sin(a)*.005,y=.455-Math.cos(a)*.02,z=.04+Math.sin(a)*.02;
  limb(P,[x,y,z],[x+Math.sin(a)*.012,y-.07,z+Math.sin(a)*.03],.003,.003,k===1?C.bone:C.steel,5);
  P.add(new THREE.TorusGeometry(.008,.0025,4,8),at(x,y+.004,z,[0,Math.PI/2,0]),C.steel);
  P.add(new THREE.BoxGeometry(.004,.014,.01),at(x+Math.sin(a)*.012,y-.065,z+Math.sin(a)*.03+.007),C.steel);
 }
 // the open greatcoat: back and sides only, flaring below the waist, its hem cut into ragged points
 const shell=lathe([[.24,.06],[.2,.3],[.16,.5],[.15,.6],[.17,.74],[.19,.82],[.16,.88],[.1,.92]],36,.55,Math.PI*2-1.1);
 const p=shell.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y>.07)continue;
  const seg=Math.round((Math.atan2(p.getX(i),p.getZ(i))+Math.PI)/(Math.PI*2)*36);
  p.setY(i,y+(seg%2?.1+hash(seg)*.06:hash(seg+9)*.03));// zigzag: every other point cut high
 }
 shell.computeVertexNormals();
 P.add(shell,at(0,0,-.01,[0,0,0],[1,1,.82]),coat);
 // its lapels, folded back down the open front
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.05,.32,.012),at(s*.1,.7,.1,[-.12,s*.5,s*.12]),(x,y,z)=>mix(C.coat,C.coatHi,clamp01((y-.55)*3)));
 // the high collar standing up behind the neck
 P.add(lathe([[.11,.88],[.12,.95],[.15,1.04]],20,Math.PI*.6,Math.PI*.8),at(0,0,-.005,[0,0,0],[1,1,.9]),(x,y,z)=>mix(C.coatDark,C.coatHi,clamp01((y-.88)*4)));
 // the neck, and the amulet of life saving: a gold ankh on a fine chain
 P.add(new THREE.CylinderGeometry(.036,.044,.08,12),at(0,.95,.005),C.skinDark);
 P.add(new THREE.TorusGeometry(.05,.0025,4,24),at(0,.915,.02,[Math.PI/2+.5,0,0],[1,1.3,1]),C.gold);
 P.add(new THREE.TorusGeometry(.011,.003,5,12),at(0,.862,.118,[-.2,0,0],[.8,1.1,1]),C.goldHi);
 P.add(new THREE.BoxGeometry(.034,.007,.006),at(0,.846,.12,[-.2,0,0]),C.goldHi);
 P.add(new THREE.BoxGeometry(.007,.042,.006),at(0,.83,.123,[-.2,0,0]),C.gold);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the gaunt, weathered head; head centre at .1
 P.add(new THREE.SphereGeometry(.08,24,18),at(0,.1,0,[0,0,0],[.86,1.08,.98]),(x,y,z)=>{
  // the old scar from the brow through the patch and down the cheek
  if(z>.03&&y>.04&&y<.16&&Math.abs(x+.03-(y-.1)*.3)<.0035)return C.scar;
  // the right eye socket, sunk dark
  if(z>.05&&Math.hypot(x-.028,(y-.104)*1.5)<.017)return C.shadow;
  // the thin crooked smirk, pulled up on the right
  if(z>.06&&Math.abs(y-(.05+Math.max(0,x)*.4))<.0035&&Math.abs(x)<.024)return C.lip;
  let c=mix(C.skinDark,C.skin,clamp01(z*9+.3));
  // hollows under the high cheekbones
  if(z>.03&&Math.abs(x)>.032&&y<.08&&y>.045)c=mix(c,C.skinDark,.6);
  return c;
 });
 // the cheekbones, brow and narrow nose
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.014,8,6),at(s*.042,.088,.058,[0,0,0],[1.2,.6,.8]),C.skin);
 P.add(new THREE.CapsuleGeometry(.009,.05,4,8),at(0,.122,.068,[0,0,Math.PI/2],[1,1,.7]),C.skinDark);
 P.add(new THREE.ConeGeometry(.01,.042,8),at(0,.09,.088,[Math.PI/2+.4,0,0]),(x,y,z)=>mix(C.skinDark,C.skin,clamp01(y*9-.6)));
 // the eyepatch over the left eye, its cord round the head
 P.add(new THREE.SphereGeometry(.024,12,8,0,Math.PI*2,0,Math.PI*.4),at(-.028,.104,.068,[Math.PI/2-.1,0,.25],[1,1,.55]),C.black);
 P.add(new THREE.TorusGeometry(.083,.0025,4,32),at(0,.11,-.004,[Math.PI/2-.35,0,.22],[1,1.08,1]),C.black);
 // the black hair, scraped back, and its long braid down the back
 P.add(new THREE.SphereGeometry(.084,20,12,0,Math.PI*2,0,Math.PI*.62),at(0,.105,-.01,[-.3,0,0],[.9,1,1]),(x,y,z)=>Math.sin(x*220)>.6?C.hairHi:C.hair);
 for(let i=0;i<9;i++){
  const t=i/8;
  P.add(new THREE.SphereGeometry(.024-t*.012,8,6),at((i%2?.008:-.008)*(1-t*.5),.06-i*.042,-.12-t*.07,[0,0,i%2?.5:-.5],[1,1.4,.9]),(x,y,z)=>mix(C.hair,C.hairHi,clamp01((y%.04)*20)));
 }
 P.add(new THREE.TorusGeometry(.008,.003,4,8),at(0,-.255,-.185,[Math.PI/2,0,0]),C.sash);// tied off in red
 // the tricorn: a low crown and a brim cocked up hard between three drooping points, one to the front
 P.add(new THREE.CylinderGeometry(.074,.084,.055,28),at(0,.175,-.004),(x,y,z)=>Math.abs(y-.158)<.006?C.sashDark:C.black);
 const brim=new THREE.CylinderGeometry(.17,.17,.008,48,3);
 const b=brim.attributes.position;
 for(let i=0;i<b.count;i++){
  const x=b.getX(i),z=b.getZ(i),r=Math.hypot(x,z);if(r<.09)continue;
  const a=Math.atan2(x,z),k=(1-Math.cos(a*3))*.5;// 0 at the three points, 1 between them
  const R=.09+(r-.09)*(1.05-k*.45),u=(R-.09)/.07;
  b.setX(i,Math.sin(a)*R);b.setZ(i,Math.cos(a)*R);b.setY(i,b.getY(i)+k*u*.075-(1-k)*u*.012);
 }
 brim.computeVertexNormals();
 P.add(brim,at(0,.155,-.004),(x,y,z)=>Math.hypot(x,z+.004)>.145?C.blackHi:C.black);
 // a silver skull pinned to the left upturn
 P.add(new THREE.SphereGeometry(.012,10,8),at(-.085,.196,.045,[0,0,0],[1,1.1,.8]),C.bone);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0035,5,4),at(-.085+s*.0045,.198,.054),C.shadow);
 return P.merge();
}
// the one eye, burning ember red in its socket
function buildEyes(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.0075,8,6),at(.028,.104,.075,[0,0,-.2],[1.4,.65,.6]),[1,1,1]);
 return P.merge();
}

// dark breeches, and tall speed boots with folded cuffs and small silver wings at the ankles
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.062,0],[.064,-.09],[.05,-.2]],14),at(0,0,0),(x,y,z)=>mix(C.coatDark,C.coat,clamp01(z*12+.5)));
 P.add(new THREE.CylinderGeometry(.056,.06,.05,16),at(0,-.2,0),(x,y,z)=>mix(C.leather,C.coatHi,clamp01(z*14+.4)));// the folded cuff
 P.add(new THREE.CylinderGeometry(.05,.04,.22,14),at(0,-.32,0),(x,y,z)=>mix(C.coatDark,C.blackHi,clamp01(z*12+.3)*.7));
 P.add(new THREE.SphereGeometry(.046,12,8),at(0,-.445,.035,[0,0,0],[.8,.45,1.6]),C.coat);
 P.add(new THREE.ConeGeometry(.02,.06,8),at(0,-.452,.11,[Math.PI/2,0,0],[1,1,.5]),C.coatDark);
 P.add(new THREE.BoxGeometry(.076,.014,.16),at(0,-.464,.035),C.leather);
 // the little swept-back silver wings
 for(const s of [-1,1])for(let k=0;k<3;k++)P.add(new THREE.ConeGeometry(.008,.06-k*.012,4),at(s*.045,-.39+k*.012,-.015-k*.006,[-1.25+k*.12,0,0],[1,1,.35]),(x,y,z)=>mix(C.steel,C.steelHi,clamp01((y+.39)*30+.5)));
 return P.merge();
}

// a scale pauldron, the coat sleeve with a wide turned-back cuff, a grey-gloved hand
function buildArm(shield){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.066,16,10,0,Math.PI*2,0,Math.PI*.6),at(0,0,0,[0,0,0],[1.05,.95,1]),dragonScale);
 P.add(lathe([[.05,-.03],[.046,-.12],[.04,-.2],[.042,-.25]],14),at(0,0,0),coat);
 P.add(new THREE.CylinderGeometry(.056,.046,.07,14,1,true),at(0,-.27,0),(x,y,z)=>mix(C.coat,C.coatHi,clamp01(z*12+.5)));
 P.add(new THREE.SphereGeometry(.026,10,8),at(0,-.33,.006,[0,0,0],[.85,1.15,.85]),C.glove);
 for(let k=0;k<4;k++)P.add(new THREE.CapsuleGeometry(.006,.02,3,6),at(-.016+k*.011,-.354,.024,[.9,0,0]),C.glove);
 limb(P,[.02,-.322,.012],[.026,-.35,.028],.008,.006,C.glove,6);// the thumb
 if(shield){
  // the shield of reflection on the outside of the forearm: a domed mirror showing a pale sky, a
  // dark horizon and the floor, ringed in steel
  const S=new THREE.Matrix4().makeTranslation(-.066,-.21,.02).multiply(at(0,0,0,[0,-Math.PI/2,0]));
  const face=new THREE.SphereGeometry(.42,32,8,0,Math.PI*2,0,.34);face.rotateX(Math.PI/2);face.translate(0,0,-.395);
  P.add(face,S,(x,y,z)=>{
   const v=(y+.21)/.14;
   if(v>.12)return mix(C.sky,C.mirror,clamp01(v));
   if(v>-.08)return mix(C.horizon,C.sky,clamp01((v+.08)*5)*.4);
   return mix(C.horizon,C.steel,clamp01(-v));
  });
  P.add(new THREE.TorusGeometry(.14,.01,6,40),S.clone().multiply(at(0,0,.006)),(x,y,z)=>mix(C.steelDark,C.steelHi,clamp01((y+.21)*4+.5)));
  P.add(new THREE.CylinderGeometry(.14,.14,.01,32),S.clone().multiply(at(0,0,-.002,[Math.PI/2,0,0])),C.steelDark);// its back
  P.add(new THREE.BoxGeometry(.03,.06,.03),S.clone().multiply(at(0,0,-.015)),C.leather);// the strap
 }
 return P.merge();
}

// Thiefbane: a blackened two-handed blade with a sawback edge and a hooked point, its edges bright,
// a spiked iron guard, a red-wrapped grip and a spiked pommel. Built along +y from the grip, edge facing x.
function buildSword(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.014,.016,.22,8),at(0,-.03,0),(x,y,z)=>Math.sin(y*240)>0?C.sashDark:C.sash);
 P.add(new THREE.OctahedronGeometry(.024),at(0,-.16,0,[0,0,0],[1,1.5,1]),C.steelDark);
 P.add(new THREE.BoxGeometry(.05,.026,.036),at(0,.09,0),C.steelDark);
 for(const s of [-1,1]){
  limb(P,[s*.02,.09,0],[s*.12,.05,0],.013,.007,C.steelDark,6);
  P.add(new THREE.ConeGeometry(.008,.04,5),at(s*.128,.035,0,[0,0,s*2.6]),C.steel);
 }
 const shape=new THREE.Shape();
 shape.moveTo(-.022,.1);shape.lineTo(.022,.1);shape.lineTo(.03,.2);
 // the straight edge up to the hooked point
 shape.lineTo(.028,.86);shape.lineTo(.012,.95);shape.lineTo(-.03,.985);shape.lineTo(-.012,.93);
 // the sawback, teeth raking towards the grip
 for(let i=0;i<9;i++){const y=.9-i*.065;shape.lineTo(-.026,y);shape.lineTo(-.04,y-.045);}
 shape.lineTo(-.026,.25);shape.lineTo(-.03,.2);shape.lineTo(-.022,.1);
 const blade=new THREE.ExtrudeGeometry(shape,{depth:.008,bevelEnabled:true,bevelThickness:.003,bevelSize:.005,bevelSegments:1});
 blade.translate(0,0,-.004);
 P.add(blade,at(0,0,0),(x,y,z)=>{
  if(x>.02||x<-.03||y>.9)return mix(C.steel,C.steelHi,.7);// the honed edges
  if(Math.abs(x+.002)<.005&&y>.22&&y<.82)return C.sashDark;// a blood groove
  return mix(C.steelDark,C.steel,clamp01(Math.abs(z)*80)*.4);
 });
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[-.42,Math.PI/2,0]));// leant back towards the shoulder
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(false),shieldArm:buildArm(true),sword:buildSword(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.35,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#ffb0a0',emissive:'#e82a10',emissiveIntensity:1.8,roughness:.2,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createOneEyedSam(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.15);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.01);head.rotation.x=.06;head.rotation.y=-.08;body.add(head);// chin down, a sidelong look
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.07,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  // the shield arm rests straight, so a shieldArm pose (rotation.z from 0) doesn't jolt it
  const arm=new THREE.Group();arm.position.set(s*.2,SHOULDER_Y,0);if(s>0)arm.rotation.z=.1;body.add(arm);mesh(arm,s<0?S.shieldArm:S.arm,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.34,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.sword,'sword',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'one-eyed sam',arms,arm:arms[1],weaponSocket,shieldArm:arms[0],head,eyes,hat:null,beard:null,pick:null};
}
