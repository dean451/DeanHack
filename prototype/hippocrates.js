import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Hippocrates (the Healer quest leader) shares the humans' letter, so he used to be the plain `@`
// humanoid. He now stands as a gaunt, ancient physician, cold and unhurried, who has opened more
// bodies than he has saved. A wreath of dried, bronze-dark laurel sits on a high bald dome fringed
// with lank white hair; the face is long and fleshless, hollow at the cheeks and temples, with a long
// straight nose and pale, cold eyes deep under a heavy brow. A long white beard, combed into jagged
// points, falls down his chest. He wears an ankle-length chiton of undyed linen, its folds fluted
// and its hem rust-spotted with old blood, girt with a cord; over it a slate himation hangs from the
// left shoulder, its lower edge falling slantwise, bordered with a dark key pattern. A leather
// satchel of herbs hangs at his right hip, and at the left a roll of bronze lancets. Thin bare
// forearms, long bony fingers stained at the tips; leather sandals laced up the ankle.
// In his right hand he grips the staff of Asclepius: a gnarled black staff with a lean serpent
// coiled up it, its wedge head reared out at the top with a forked tongue. In his left he holds
// out a shallow bronze bleeding bowl, dark with blood.
// Each moving part (body, head, each leg and arm, the staff) is one merged, vertex-coloured mesh on
// one shared material, plus one small glowing mesh for the eyes: 8 draws. The bowl is baked into
// the left arm. Geometry is built once and shared.
// Handles: legs, arms, arm (the staff arm), weaponSocket, shieldArm (the bowl arm), head, eyes, body.

const C={
 skin:rgb('#bca88c'),skinDark:rgb('#6e5c48'),shadow:rgb('#070605'),lip:rgb('#5a4038'),stain:rgb('#4a1410'),
 hair:rgb('#d8d4c8'),hairDark:rgb('#8a8678'),
 linen:rgb('#cfc6b0'),linenDark:rgb('#7e7664'),blood:rgb('#5a1a12'),bloodDark:rgb('#2a0a08'),
 slate:rgb('#3c4450'),slateDark:rgb('#181c22'),slateHi:rgb('#5c6672'),key:rgb('#0e1014'),
 laurel:rgb('#4a5230'),laurelDark:rgb('#22261a'),laurelHi:rgb('#8a7a3e'),
 leather:rgb('#4a3020'),leatherDark:rgb('#22160e'),leatherHi:rgb('#6e4c30'),cord:rgb('#8a7a5a'),
 bronze:rgb('#7a5a2a'),bronzeHi:rgb('#c89a50'),bronzeDark:rgb('#2e2010'),
 herb:rgb('#4e6a34'),herbDry:rgb('#7a6e3a'),
 wood:rgb('#1e1610'),woodHi:rgb('#3e3024'),
 snake:rgb('#3a4a28'),snakeDark:rgb('#141a0e'),snakeBelly:rgb('#8a8a5a'),snakeEye:rgb('#d8c040'),tongue:rgb('#8a1420'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// pushes a lathe's surface in and out round its axis below `top`, deeper toward the bottom: cloth folds
function flute(geo,n,amp,top){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y>=top)continue;
  const k=1+Math.sin(Math.atan2(x,z)*n+y*1.5)*amp*clamp01((top-y)/top*1.6);
  p.setX(i,x*k);p.setZ(i,z*k);
 }
 geo.computeVertexNormals();
 return geo;
}
// linen: brighter on the fold crests, dark in the troughs, rust-spotted with old blood near the hem
const linen=n=>(x,y,z)=>{
 const fold=Math.sin(Math.atan2(x,z)*n+y*1.5)*.5+.5;
 let c=mix(C.linenDark,C.linen,.45+fold*.55);
 if(y<.32&&hash(Math.floor(x*70)*5+Math.floor(y*70)*11+Math.floor(z*70)*3)>.84+y*.4)c=mix(c,C.blood,.85);
 return c;
};
// the himation's slate wool, with a dark key-pattern border along its lower edge
const slate=(x,y,z)=>{
 const fold=Math.sin(Math.atan2(x,z)*7+y*2)*.5+.5;
 return mix(C.slateDark,mix(C.slate,C.slateHi,fold*.4),.5+fold*.5);
};

export const HIP_Y=.47,SHOULDER_Y=.83,NECK_Y=.94;

const CHITON=[[.2,.09],[.19,.2],[.17,.38],[.15,.52],[.15,.6],[.165,.72],[.17,.8],[.155,.87],[.1,.915],[.055,.93]];
// the chiton's radius at a height, from its profile
function chitonR(y){
 for(let i=1;i<CHITON.length;i++){const [r0,y0]=CHITON[i-1],[r1,y1]=CHITON[i];if(y<=y1)return r0+(r1-r0)*clamp01((y-y0)/(y1-y0));}
 return CHITON[CHITON.length-1][0];
}

function buildBody(){
 const P=pieces();
 // the ankle-length chiton, fluted into folds below the girdle
 P.add(flute(lathe(CHITON,48),11,.07,.56),at(0,0,0,[0,0,0],[1,1,.78]),linen(11));
 P.add(new THREE.CircleGeometry(.2,24),at(0,.09,0,[Math.PI/2,0,0],[1,.78,1]),C.linenDark);
 // the girdle cord, knotted at the front with its ends hanging
 P.add(new THREE.TorusGeometry(.152,.007,5,40),at(0,.55,0,[Math.PI/2,0,0],[1,.78,1]),C.cord);
 P.add(new THREE.SphereGeometry(.013,8,6),at(.03,.55,.12),C.cord);
 for(const s of [0,1])limb(P,[.03+s*.008,.545,.122],[.04+s*.02,.4-s*.03,.15-s*.01],.005,.004,C.cord,5);
 // the himation: slate wool from the left shoulder round the back, its lower edge falling slantwise,
 // lowest at the left side
 const him=lathe([[.21,.12],[.2,.3],[.18,.5],[.18,.66],[.19,.78],[.18,.86],[.13,.91]],30,Math.PI*.55,Math.PI*1.25);
 {
  const p=him.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   // the hem lifts toward the right and the front; drops along the left side
   if(y<.6)p.setY(i,y+(x+.21)*.55*(.6-y)/.48+(z>0?z*.6*(.6-y)/.48:0));
  }
  him.computeVertexNormals();
 }
 // the key border runs along each column's lowest row, whatever height the slant left it at
 P.add(him,at(0,0,-.012,[0,0,0],[1.04,1,.86]),slate);
 const edge=(x,z)=>.12+(x+.21)*.55+(z>0?z*.6:0);
 for(let k=0;k<30;k++){
  const a=Math.PI*.55+(k+.5)/30*Math.PI*1.25,x=Math.sin(a)*.21*1.04,z=Math.cos(a)*.21*.86-.012;
  const y=edge(Math.sin(a)*.21,Math.cos(a)*.21);
  P.add(new THREE.BoxGeometry(.046,.03,.006),at(x*1.01,y+.016,z*1.01,[0,a,0]),(px,py,pz)=>{
   // a square meander: a dark step on alternate halves
   const u=((Math.atan2(px,pz+.012)/(Math.PI*2)*30*2)%2+2)%2,v=(py-y)/.03;
   return (u<1)===(v<.5)?C.key:C.slateHi;
  });
 }
 // the himation's fold thrown over the left shoulder and down the front
 limb(P,[-.13,.88,.02],[-.17,.62,.13],.05,.035,slate,12);
 // the herb satchel on the right hip, its strap across the chest from the left shoulder
 P.add(new THREE.BoxGeometry(.1,.09,.045),at(.19,.42,0,[0,.8,0]),(x,y,z)=>mix(C.leatherDark,C.leather,clamp01((y-.37)*12)));
 P.add(new THREE.BoxGeometry(.104,.035,.05),at(.19,.46,.002,[-.12,.8,0]),C.leatherHi);// the flap
 for(let k=0;k<5;k++)limb(P,[.17+k*.01,.46,-.01],[.15+k*.018+hash(k)*.02,.53+hash(k+9)*.03,-.02],.004,.003,k%2?C.herb:C.herbDry,4);
 // the satchel's strap runs from the left shoulder across the chest, lying on the cloth
 let last=null;
 for(let i=0;i<=8;i++){
  const t=i/8,x=-.13+t*.31,y=.86-t*.39,R=chitonR(y)+.012,z=Math.sqrt(Math.max(0,R*R-x*x))*.78,pt=[x,y,z];
  if(last)limb(P,last,pt,.008,.008,C.leatherDark,5);
  last=pt;
 }
 // the roll of bronze lancets at the left hip
 P.add(new THREE.CylinderGeometry(.022,.022,.09,10),at(-.15,.5,.08,[0,0,Math.PI/2-.3]),C.leatherDark);
 for(let k=0;k<4;k++){
  const x=-.17+k*.013;
  limb(P,[x,.51,.1],[x-.01,.575+hash(k+3)*.02,.105],.004,.0015,k%2?C.bronzeHi:C.bronze,4);
 }
 // the scrawny neck, the tendons standing out
 P.add(new THREE.CylinderGeometry(.036,.046,.07,12),at(0,.945,.005),(x,y,z)=>Math.abs(Math.abs(x)-.016)<.005&&z>0?C.skin:C.skinDark);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the high bald dome, the long fleshless face; head centre at .1
 P.add(new THREE.SphereGeometry(.086,24,18),at(0,.105,0,[0,0,0],[.88,1.14,.98]),(x,y,z)=>{
  // deep sockets under the brow
  for(const s of [-1,1])if(z>.05&&Math.hypot(x-s*.029,(y-.11)*1.4)<.019)return C.shadow;
  // the thin, grim mouth, turned down at the corners
  if(z>.06&&Math.abs(y-(.045-Math.abs(x)*.3))<.0035&&Math.abs(x)<.022)return C.lip;
  let c=mix(C.skinDark,C.skin,clamp01(z*8+.3+(y-.1)*3));
  // hollow cheeks and temples
  if(z>.02&&Math.abs(x)>.034&&y<.09&&y>.035)c=mix(c,C.skinDark,.6);
  if(z>0&&Math.abs(x)>.055&&y>.1&&y<.15)c=mix(c,C.skinDark,.45);
  return c;
 });
 // the heavy brow ridge and the long straight nose
 P.add(new THREE.CapsuleGeometry(.012,.058,4,8),at(0,.127,.068,[0,0,Math.PI/2],[1,1,.8]),C.skinDark);
 P.add(new THREE.BoxGeometry(.016,.055,.024),at(0,.09,.088,[-.18,0,0]),(x,y,z)=>mix(C.skinDark,C.skin,clamp01((z-.08)*60)));
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.018,8,6),at(s*.077,.1,0,[0,s*.4,0],[.35,1.3,.75]),C.skinDark);// the ears
 // the lank white fringe round the back and sides of the skull, hanging past the ears
 P.add(new THREE.SphereGeometry(.092,22,12,Math.PI*.6,Math.PI*.8,Math.PI*.42,Math.PI*.4),at(0,.1,-.006,[0,0,0],[.92,1.2,1]),(x,y,z)=>hash(Math.floor(Math.atan2(x,z)*30))>.5?C.hair:C.hairDark);
 for(let k=0;k<10;k++){
  const a=Math.PI*.68+k/9*Math.PI*.64,r=.083;
  P.add(new THREE.ConeGeometry(.012,.07+hash(k)*.03,5),at(Math.sin(a)*r,.035,Math.cos(a)*r,[Math.PI,0,0]),k%2?C.hair:C.hairDark);
 }
 // the moustache and the long beard, combed into jagged points down the chest
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.01,.05,6),at(s*.02,.052,.082,[0,0,s*(Math.PI/2+.5)]),C.hair);
 P.add(new THREE.SphereGeometry(.052,16,8,0,Math.PI*2,Math.PI*.5,Math.PI*.5),at(0,.06,.026,[0,0,0],[1.08,.8,1]),C.hairDark);
 for(let k=0;k<5;k++){
  const x=(k-2)*.016,len=.14+(2-Math.abs(k-2))*.04+hash(k+20)*.02;
  // each lock hangs from the chin down and forward over the chest, wide at the root, tapering to a point
  const t=.48,rz=.07-Math.abs(k-2)*.008;
  P.add(new THREE.ConeGeometry(.022,len,6),at(x,.045-Math.cos(t)*len/2,rz+Math.sin(t)*len/2,[Math.PI-t,0,-x*1.6]),(px,py,pz)=>hash(Math.floor(Math.atan2(px-x,pz-.05)*4)+Math.floor(py*120))>.4?C.hair:C.hairDark);
 }
 // the wreath of dried laurel round the dome, its leaves bronze-dark and curled
 P.add(new THREE.TorusGeometry(.082,.004,4,28),at(0,.15,-.004,[Math.PI/2-.12,0,0],[.9,1.02,1]),C.laurelDark);
 for(let k=0;k<22;k++){
  const a=(k/22)*Math.PI*2+.14;if(Math.cos(a)>.86)continue;// open over the brow
  for(const s of [-1,1]){
   const x=Math.sin(a)*.082*.9,z=Math.cos(a)*.082*1.02-.004,y=.15-z*.12;
   P.add(new THREE.SphereGeometry(.013,6,4),at(x+Math.cos(a)*s*.008,y+.008,z-Math.sin(a)*s*.008,[0,a+s*.6,s*.5],[.35,.12,1]),(px,py,pz)=>mix(C.laurelDark,hash(k*2+s)>.6?C.laurelHi:C.laurel,clamp01((py-y)*120+.5)));
  }
 }
 return P.merge();
}
// pale, cold eyes deep in their sockets
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0065,8,6),at(s*.029,.109,.083,[0,0,s*.1],[1.4,.7,.6]),[1,1,1]);
 return P.merge();
}

// the linen robe's fall over the shin, a bony ankle, and a sandal laced up it
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.06,0],[.064,-.15],[.07,-.3],[.074,-.38]],14),at(0,0,0),linen(5));
 limb(P,[0,-.38,0],[0,-.455,.005],.024,.028,C.skinDark,8);
 P.add(new THREE.SphereGeometry(.036,10,8),at(0,-.45,.04,[0,0,0],[.8,.4,1.6]),C.skin);// the foot
 for(let k=0;k<4;k++)P.add(new THREE.TorusGeometry(.03-k*.001,.0035,4,12),at(0,-.452+k*.02,.012-k*.004,[Math.PI/2+.25,0,0],[1,1.2,1]),C.leatherDark);
 P.add(new THREE.BoxGeometry(.07,.01,.15),at(0,-.465,.035),C.leather);// the sole
 for(const s of [-1,1])limb(P,[s*.026,-.46,.08],[0,-.448,.04],.003,.003,C.leatherDark,4);
 return P.merge();
}

// a linen sleeve, a thin bare forearm, and a bony hand stained at the fingertips
function arm(P,bowl){
 P.add(new THREE.SphereGeometry(.058,14,10,0,Math.PI*2,0,Math.PI*.62),at(0,0,0),linen(6));
 P.add(lathe([[.058,-.02],[.06,-.1],[.052,-.15]],14),at(0,0,0),linen(6));
 limb(P,[0,-.15,0],[0,-.33,.01],.024,.018,(x,y,z)=>mix(C.skinDark,C.skin,clamp01(z*30+.5)),10);
 P.add(new THREE.SphereGeometry(.026,10,8),at(0,-.355,.008,[0,0,0],[.8,1.15,.8]),C.skinDark);
 const tip=(x,y,z)=>y<-.39?C.stain:C.skin;
 if(bowl){
  // the fingers spread under the bleeding bowl, held out flat
  for(let k=0;k<4;k++)P.add(new THREE.CapsuleGeometry(.006,.028,3,6),at(-.016+k*.011,-.378,.035,[1.35,0,0]),tip);
  // the bowl is tipped back by the arm's lift (.35), so it is tipped forward the same here to sit level
  P.add(new THREE.SphereGeometry(.06,18,6,0,Math.PI*2,Math.PI*.62,Math.PI*.38),at(0,-.33,.07,[.35,0,0],[1,.6,1]),(x,y,z)=>mix(C.bronzeDark,C.bronze,clamp01((y+.37)*30)));
  P.add(new THREE.TorusGeometry(.055,.004,4,24),at(0,-.343,.065,[Math.PI/2+.35,0,0]),C.bronzeHi);
  P.add(new THREE.CircleGeometry(.05,20),at(0,-.349,.066,[-Math.PI/2+.35,0,0]),(x,y,z)=>mix(C.bloodDark,C.blood,clamp01(.6-Math.hypot(x,z-.066)*14)));
 }else{
  // long fingers hooked round the staff
  for(let k=0;k<4;k++)P.add(new THREE.CapsuleGeometry(.006,.022,3,6),at(-.016+k*.011,-.378,.026,[.9,0,0]),tip);
  limb(P,[.02,-.345,.012],[.026,-.372,.03],.008,.006,C.skin,6);// the thumb
 }
}
function buildArm(bowl){const P=pieces();arm(P,bowl);return P.merge();}

// The staff of Asclepius, held upright: a gnarled black staff with a serpent coiled up it, its
// head reared out at the top. Built along +y from the grip.
function buildStaff(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.014,.017,1.2,8,12),at(0,.15,0),(x,y,z)=>mix(C.wood,C.woodHi,clamp01(Math.sin(y*50+Math.atan2(x,z)*2)*.5+.3)));
 // knots along it and a knob at the head
 for(let k=0;k<5;k++)P.add(new THREE.SphereGeometry(.02,6,5),at(0,-.36+k*.22+hash(k)*.05,0,[0,k,0],[1,.6,1]),C.woodHi);
 P.add(new THREE.SphereGeometry(.024,8,6),at(0,.76,0),C.wood);
 // the serpent, coiling three and a half turns up from near the foot
 const pts=[];
 for(let i=0;i<=56;i++){const t=i/56,a=t*Math.PI*7;pts.push(new THREE.Vector3(Math.sin(a)*.028,-.3+t*.98,Math.cos(a)*.028));}
 const curve=new THREE.CatmullRomCurve3(pts);
 const tube=new THREE.TubeGeometry(curve,112,.0095,6,false),tp=tube.attributes.position;
 // taper the tail and thicken the body toward the neck: rings are laid out in order along the length
 const ring=7;
 for(let i=0;i<tp.count;i++){
  const t=Math.floor(i/ring)/112,c=curve.getPointAt(t),k=t<.18?.35+t/.18*.65:1;
  tp.setXYZ(i,c.x+(tp.getX(i)-c.x)*k,c.y+(tp.getY(i)-c.y)*k,c.z+(tp.getZ(i)-c.z)*k);
 }
 tube.computeVertexNormals();
 // scales: dark bands across a green back, a pale belly toward the staff
 P.add(tube,at(0,0,0),(x,y,z)=>Math.hypot(x,z)<.026?C.snakeBelly:(Math.sin(y*160)>.55?C.snakeDark:C.snake));
 // the neck lifting off the staff and the flat wedge head, reared out over the knob
 const end=pts[pts.length-1],neck=[end.x*1.8,end.y+.05,end.z*1.8+.03];
 limb(P,[end.x,end.y,end.z],neck,.0095,.008,C.snake,6);
 const hx=neck[0],hy=neck[1]+.012,hz=neck[2]+.02;
 P.add(new THREE.ConeGeometry(.016,.045,4),at(hx,hy,hz,[Math.PI/2+.25,Math.PI/4,0],[1,1,.55]),(x,y,z)=>y>hy?C.snake:C.snakeDark);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.004,5,4),at(hx+s*.009,hy+.005,hz-.005),C.snakeEye);
 for(const s of [-1,1])limb(P,[hx,hy-.004,hz+.02],[hx+s*.006,hy-.01,hz+.045],.0012,.0008,C.tongue,3);
 const geo=P.merge();
 // stood upright against the arm's forward lift (.25) and its outward hang (.08), the top a little forward
 geo.applyMatrix4(at(0,0,0,[.3,0,-.06]));
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),staffArm:buildArm(false),bowlArm:buildArm(true),staff:buildStaff(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:.06,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#eef6ff',emissive:'#9cc8ff',emissiveIntensity:1.5,roughness:.2,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createHippocrates(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.04);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.02);head.rotation.x=.08;body.add(head);// chin down, looking along his nose
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.07,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.2,SHOULDER_Y,0);arm.rotation.z=s*.08;body.add(arm);mesh(arm,s<0?S.bowlArm:S.staffArm,'arm',S.hide);arms.push(arm);
 }
 arms[0].rotation.x=-.35;// the bowl held out in front
 arms[1].rotation.x=-.25;// the staff planted a little in front, clear of the shoulder
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.36,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.staff,'staff',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'hippocrates',arms,arm:arms[1],weaponSocket,shieldArm:arms[0],head,eyes,hat:null,beard:null,pick:null};
}
