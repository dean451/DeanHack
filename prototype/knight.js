import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The knight (the player-monster role) used to be the generic '@' humanoid: a tinted box with a
// ball for a head. He now stands as a crusading-era knight: a flat-topped great helm with eye
// slits, breaths and a gilt cross over the face, a red-and-white torse and a tall plume of red
// feathers. An azure surcoat over a knee-length mail hauberk, blazoned with a gold chevron between
// three bezants, is split at the front hem and girt with a red cord; a white sword belt slung low
// carries an empty black scabbard at the left hip. Mail sleeves with steel couters end in leather
// gauntlets; mail chausses carry steel poleyns and greaves above mail shoes and gilt prick spurs.
// He holds an arming sword upright (wheel pommel, fullered blade, straight cross) and bears a
// heater shield painted with the same arms.
// Each moving part (body, head, each leg and arm, the sword and the shield) is one merged,
// vertex-coloured mesh with one shared material: 8 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the sword arm), weaponSocket, shieldArm (the other arm), head, body.
// The pivots match valkyrie.js (shoulders ±.215 at .82, hand .37 down the arm, legs ±.08 at .47,
// head at .955).

const IRON=rgb('#4e545a'),STEEL=rgb('#a2a9b0'),STEEL_HI=rgb('#e2e6ea'),STEEL_DARK=rgb('#2e3236'),SLIT=rgb('#0c0d10');
const GOLD=rgb('#d4a73a'),GOLD_HI=rgb('#f4d470'),GOLD_DARK=rgb('#8a6420');
const AZURE=rgb('#2448a0'),AZURE_DARK=rgb('#152a60'),AZURE_HI=rgb('#3a64c0');
const RED=rgb('#b02a26'),RED_DARK=rgb('#6a1614'),RED_HI=rgb('#e0503a'),WHITE=rgb('#ece6d6'),WHITE_SHADE=rgb('#b8b0a0');
const LEATHER=rgb('#5e3c22'),LEATHER_DARK=rgb('#321e10'),SOLE=rgb('#1e1610'),SCABBARD=rgb('#1c1a1a');
const WOOD=rgb('#7a5a38');

// a lathe whose profile is subdivided so vertex-painted patterns have rows to land on
function lathe(profile,segments=24,sub=1){
 const pts=[];
 for(let i=0;i<profile.length;i++){
  if(i===0){pts.push(profile[0]);continue;}
  const [r0,h0]=profile[i-1],[r1,h1]=profile[i];
  for(let j=1;j<=sub;j++)pts.push([r0+(r1-r0)*j/sub,h0+(h1-h0)*j/sub]);
 }
 return new THREE.LatheGeometry(pts.map(([r,h])=>new THREE.Vector2(r,h)),segments);
}
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
// riveted mail: alternating bright and dark ring rows, offset every other column, darker low down
const mail=(lo,hi)=>(x,y,z)=>{
 const a=Math.atan2(x,z)*14,row=Math.round(y*120+(Math.round(a)%2?.5:0));
 return mix(mix(IRON,STEEL,(y-lo)/(hi-lo)),row%2?STEEL_HI:STEEL_DARK,.35);
};
// polished plate: dark below, a bright band where it faces up and forward
const plate=(x,y,z)=>mix(STEEL,STEEL_HI,THREE.MathUtils.clamp(z*8+.3,0,1)*.7);

// the arms: a gold chevron between three bezants. `put(geo,matrix,colour)` places each charge.
function blazon(put,w,h,depth){
 const arm=Math.atan2(h*.34,w*.5),len=Math.hypot(w*.5,h*.34)*1.02,band=h*.13;
 for(const s of [-1,1])put(new THREE.BoxGeometry(len,band,depth,10,1,1),at(s*w*.24,-h*.02,0,[0,0,-s*arm]),(x,y)=>ramp(GOLD_DARK,GOLD_HI,-h*.2,h*.2)(y));
 for(const [x,y] of [[-w*.27,h*.3],[w*.27,h*.3],[0,-h*.38]])put(new THREE.CylinderGeometry(h*.075,h*.075,depth,16),at(x,y,0,[Math.PI/2,0,0]),GOLD);
}

function buildBody(){
 const P=pieces();
 // the mail hauberk, seen below the surcoat hem and at the neck
 P.add(lathe([[.18,.33],[.186,.4],[.19,.55]],36,4),at(0,0,0,[0,0,0],[1,1,.8]),mail(.33,.55));
 P.add(new THREE.CircleGeometry(.18,24),at(0,.331,0,[Math.PI/2,0,0],[1,.8,1]),STEEL_DARK);
 // the azure surcoat: full at the hem, girt at the waist, over the shoulders
 P.add(lathe([[.206,.36],[.198,.45],[.18,.54],[.176,.58],[.188,.7],[.196,.8],[.18,.87],[.12,.905],[.07,.915]],40,3),at(0,0,0,[0,0,0],[1,1,.8]),(x,y,z)=>{
  const fold=Math.sin(Math.atan2(x,z)*9)*.5+.5;
  if(y<.375)return mix(AZURE_DARK,AZURE,.4);
  return mix(ramp(AZURE_DARK,AZURE,.36,.6)(y),y<.56?AZURE_DARK:AZURE_HI,y<.56?fold*.5:(z>0?.25:0));
 });
 // the split at the front and back of the hem, for riding
 for(const z of [.166,-.166])P.add(new THREE.BoxGeometry(.012,.12,.006),at(0,.42,z),AZURE_DARK);
 // blazon on the chest
 // the charges are bent round the chest so their outer ends lie on the cloth
 const chest=x=>.8*Math.sqrt(Math.max(0,.192*.192-x*x));
 blazon((geo,m,c)=>{
  geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(at(0,.715,.156,[-.08,0,0]),m));
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+chest(p.getX(i))-chest(0));
  geo.computeVertexNormals();P.add(geo,null,c);
 },.22,.2,.006);
 // a red cord at the waist, knotted with hanging ends
 P.add(new THREE.TorusGeometry(.18,.008,5,36),at(0,.575,0,[Math.PI/2,0,0],[1,.8,1]),RED);
 P.add(new THREE.SphereGeometry(.014,8,6),at(.05,.575,.139),RED_DARK);
 for(const [x,r] of [[.045,.08],[.06,-.1]]){
  P.add(new THREE.CylinderGeometry(.005,.005,.08,5),at(x,.53,.144,[0,0,r]),RED);
  P.add(new THREE.ConeGeometry(.01,.02,6),at(x+r*.4,.487,.146),RED_HI);
 }
 // a white sword belt slung low, a gilt buckle, and the empty scabbard at the left hip
 P.add(new THREE.TorusGeometry(.196,.013,5,36),at(0,.49,0,[Math.PI/2+.1,0,-.14],[1,.8,1]),(x,y,z)=>z>0?WHITE:WHITE_SHADE);
 P.add(new THREE.TorusGeometry(.018,.005,5,12),at(.022,.476,.162,[0,0,0],[1.1,.9,1]),GOLD_HI);
 const sheath=m=>new THREE.Matrix4().multiplyMatrices(at(-.178,.5,-.02,[.45,0,-.1]),m);
 P.add(new THREE.CylinderGeometry(.018,.012,.5,10),sheath(at(0,-.25,0,[0,0,0],[1,1,.45])),SCABBARD);
 P.add(new THREE.CylinderGeometry(.02,.019,.03,10),sheath(at(0,-.01,0,[0,0,0],[1,1,.5])),GOLD);
 P.add(new THREE.ConeGeometry(.014,.04,10),sheath(at(0,-.51,0,[Math.PI,0,0],[1,1,.5])),GOLD);
 for(const y of [-.08,-.14])P.add(new THREE.TorusGeometry(.019,.004,4,12),sheath(at(0,y,0,[Math.PI/2,0,0],[1,.5,1])),GOLD_DARK);
 // the mail aventail round the neck, under the helm
 P.add(new THREE.CylinderGeometry(.06,.085,.08,20,4),at(0,.935,0),mail(.9,.98));
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the great helm: a flat-topped steel barrel, a low dome, a brow band, and a riveted rim
 P.add(new THREE.CylinderGeometry(.103,.108,.2,28,4),at(0,.115,.004),(x,y,z)=>mix(ramp(IRON,STEEL,.02,.2)(y),STEEL_HI,THREE.MathUtils.clamp(z*9-.3,0,1)*.5));
 P.add(new THREE.SphereGeometry(.103,28,6,0,Math.PI*2,0,Math.PI*.5),at(0,.214,.004,[0,0,0],[1,.3,1]),(x,y,z)=>mix(STEEL,STEEL_HI,THREE.MathUtils.clamp(z*6+.4,0,1)));
 P.add(new THREE.TorusGeometry(.106,.006,4,28),at(0,.212,.004,[Math.PI/2,0,0]),STEEL_DARK);
 P.add(new THREE.TorusGeometry(.109,.006,4,28),at(0,.018,.004,[Math.PI/2,0,0]),STEEL_DARK);
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;P.add(new THREE.OctahedronGeometry(.005),at(Math.sin(a)*.112,.028,Math.cos(a)*.112+.004),GOLD_DARK);}
 // eye slits either side of the nose strip, each a dark gap with a flared steel lip below
 for(const s of [-1,1]){
  const a=s*.36,x=Math.sin(a)*.106,z=Math.cos(a)*.106+.004;
  P.add(new THREE.BoxGeometry(.062,.011,.006),at(x,.135,z,[0,a,0]),SLIT);
  P.add(new THREE.BoxGeometry(.066,.007,.012),at(Math.sin(a)*.109,.126,Math.cos(a)*.109+.004,[.25,a,0]),STEEL_HI);
 }
 // breaths: rows of small holes on the right cheek
 for(let r=0;r<3;r++)for(let c=0;c<4;c++){
  const a=.34+c*.12,y=.085-r*.022;
  P.add(new THREE.CylinderGeometry(.0045,.0045,.004,6),at(Math.sin(a)*.107,y,Math.cos(a)*.107+.004,[Math.PI/2,0,-a]),SLIT);
 }
 // a gilt cross reinforcing the face: a strip down the front and a bar across the slits
 P.add(new THREE.BoxGeometry(.018,.19,.008),at(0,.11,.113),(x,y)=>ramp(GOLD_DARK,GOLD_HI,.02,.2)(y));
 P.add(new THREE.CylinderGeometry(.111,.111,.016,28,1,true,-.25,.5),at(0,.155,.004),GOLD);
 for(const y of [.05,.08,.18])P.add(new THREE.SphereGeometry(.005,6,4),at(0,y,.118),GOLD_HI);
 // the torse, a twisted wreath of red and white, and a tall plume of red feathers above it
 P.add(new THREE.TorusGeometry(.062,.017,8,32),at(0,.244,.004,[Math.PI/2,0,0]),(x,y,z)=>Math.sin(Math.atan2(x,z-.004)*6)>0?RED:WHITE);
 for(let i=0;i<9;i++){
  const t=i/8,a=(t-.5)*1.2,len=.13+Math.sin(t*Math.PI)*.05;
  const base=new THREE.Vector3(Math.sin(a)*.02,.25,-.01+Math.cos(a)*.01);
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.35-Math.abs(a)*.25,0,-a*.6)),dir=new THREE.Vector3(0,1,0).applyQuaternion(q);
  const c=base.clone().addScaledVector(dir,len/2);
  P.add(new THREE.SphereGeometry(1,8,6),new THREE.Matrix4().compose(c,q,new THREE.Vector3(.022,len/2,.012)),(x,y,z)=>mix(RED_DARK,RED_HI,(new THREE.Vector3(x,y,z).distanceTo(base)/len)*1.2));
 }
 return P.merge();
}

// mail chausses, a steel poleyn with a fan at the knee, a greave, a mail shoe and a gilt spur
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.058,.05,.22,16,10),at(0,-.11,0),mail(-.22,0));
 P.add(new THREE.SphereGeometry(.042,14,10),at(0,-.215,.022,[0,0,0],[1.05,1,.8]),plate);
 P.add(new THREE.CylinderGeometry(.034,.034,.006,14,1,false,0,Math.PI),at(.045,-.215,.012,[0,0,Math.PI/2]),STEEL);
 P.add(new THREE.SphereGeometry(.006,6,4),at(0,-.2,.058),GOLD_HI);
 P.add(new THREE.CylinderGeometry(.049,.042,.17,16,1,true,-Math.PI*.55,Math.PI*1.1),at(0,-.325,.002),plate);
 P.add(new THREE.CylinderGeometry(.045,.04,.17,12,8),at(0,-.325,-.004),mail(-.41,-.24));
 P.add(new THREE.CylinderGeometry(.043,.045,.05,12),at(0,-.43,.004),mail(-.46,-.4));
 P.add(new THREE.SphereGeometry(.045,12,8),at(0,-.44,.052,[0,0,0],[.9,.55,1.6]),mail(-.47,-.42));
 P.add(new THREE.BoxGeometry(.084,.016,.16),at(0,-.462,.038),SOLE);
 P.add(new THREE.TorusGeometry(.046,.004,4,16,Math.PI),at(0,-.44,.0,[Math.PI/2,0,Math.PI]),GOLD);
 P.add(new THREE.ConeGeometry(.007,.03,6),at(0,-.44,-.058,[-Math.PI/2,0,0]),GOLD_HI);
 return P.merge();
}

// a mail sleeve, a steel couter at the elbow, a leather gauntlet with a flared cuff
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.064,16,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),mail(-.05,.05));
 P.add(new THREE.CylinderGeometry(.053,.045,.3,16,14),at(0,-.15,0),mail(-.3,0));
 P.add(new THREE.SphereGeometry(.04,14,10),at(0,-.17,-.016,[0,0,0],[1.1,1,1]),(x,y,z)=>mix(STEEL,STEEL_HI,THREE.MathUtils.clamp(-z*10,0,1)*.6));
 P.add(new THREE.SphereGeometry(.006,6,4),at(0,-.17,-.057),GOLD_HI);
 P.add(new THREE.CylinderGeometry(.048,.036,.06,14,1,true),at(0,-.31,0),(x,y)=>ramp(LEATHER_DARK,LEATHER,-.34,-.28)(y));
 P.add(new THREE.TorusGeometry(.047,.004,4,16),at(0,-.281,0,[Math.PI/2,0,0]),LEATHER_DARK);
 P.add(new THREE.SphereGeometry(.032,10,8),at(0,-.365,.005,[0,0,0],[.9,1.15,1]),LEATHER);
 P.add(new THREE.SphereGeometry(.014,6,4),at(0,-.35,.03,[0,0,0],[1,1.4,1]),LEATHER_DARK);
 return P.merge();
}

// an arming sword held upright: a fullered blade, a straight steel cross, a leather grip and a
// wheel pommel. Built along +y from the grip.
function buildSword(){
 const P=pieces(),len=.66;
 P.add(new THREE.CylinderGeometry(.005,.022,len,4,10),at(0,.07+len/2,0,[0,0,0],[1,1,.22]),(x,y)=>Math.abs(x)<.005&&y<.07+len*.8?STEEL_DARK:STEEL_HI);
 P.add(new THREE.BoxGeometry(.15,.014,.02),at(0,.064,0),(x)=>Math.abs(x)>.06?STEEL_HI:STEEL);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.01,6,4),at(s*.076,.064,0),STEEL_HI);
 P.add(new THREE.CylinderGeometry(.012,.013,.1,8),at(0,.005,0),(x,y)=>Math.sin(y*240)>0?LEATHER_DARK:LEATHER);
 P.add(new THREE.CylinderGeometry(.03,.03,.016,16),at(0,-.068,0,[Math.PI/2,0,0]),(x,y,z)=>Math.abs(z)>.006?GOLD:GOLD_HI);
 P.add(new THREE.SphereGeometry(.008,6,4),at(0,-.068,0,[0,0,0],[1,1,1.6]),GOLD_DARK);
 return P.merge();
}

// a heater shield: a flat-topped board curving to a point, an azure face with the knight's arms,
// a steel rim and a leather strap behind. Built in its own plane; +z is the face.
function buildShield(){
 const P=pieces(),W=.26,H=.36,T=.14;
 const shape=new THREE.Shape();
 shape.moveTo(-W/2,T);shape.lineTo(W/2,T);shape.lineTo(W/2,.02);
 shape.quadraticCurveTo(W/2,T-H*.72,0,T-H);shape.quadraticCurveTo(-W/2,T-H*.72,-W/2,.02);shape.lineTo(-W/2,T);
 P.add(new THREE.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:false,curveSegments:10}),at(0,0,-.007),(x,y,z)=>z>.006?mix(AZURE,AZURE_HI,(y+.2)*1.2):WOOD);
 // a steel rim round the edge, following the outline
 const edge=shape.getSpacedPoints(60);
 for(let i=0;i<edge.length-1;i++){
  const a=edge[i],b=edge[i+1],d=Math.hypot(b.x-a.x,b.y-a.y);if(d<1e-5)continue;
  P.add(new THREE.BoxGeometry(d+.004,.012,.02),at((a.x+b.x)/2,(a.y+b.y)/2,0,[0,0,Math.atan2(b.y-a.y,b.x-a.x)]),(x,y,z)=>z>.004?STEEL_HI:IRON);
 }
 blazon((geo,m,c)=>P.add(geo,new THREE.Matrix4().multiplyMatrices(at(0,T-H*.48,.009),m),c),W*.9,H*.72,.004);
 P.add(new THREE.BoxGeometry(.02,.14,.01),at(0,-.02,-.012),LEATHER);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.25,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(),sword:buildSword(),shield:buildShield()};
 return S;
}
function mesh(parent,geo,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createKnight(){
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
 const shield=new THREE.Group();shield.position.set(-.064,-.25,.02);shield.rotation.y=-Math.PI/2;arms[0].add(shield);
 mesh(shield,S.shield,'shield');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'knight',arms,arm:arms[1],weaponSocket,shieldArm:arms[0],shield,head,hat:null,beard:null,pick:null};
}
