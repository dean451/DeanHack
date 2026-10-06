import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The Dark One (the Priest quest nemesis) shares the humans' letter, so it used to be the plain `@`
// humanoid. It now stands as a tall, gaunt apostate high priest who glides rather than walks: a
// floor-length alb of black with a faint violet sheen, torn at the hem into jagged points that drag
// on the floor, with no feet showing. Over it hangs a black chasuble, pointed front and back like a
// shield, its orphrey a cross worked in tarnished gold and turned upside down, and a blood-dark stole
// fringed at the ends. A high collar of black spines fans up round the back of the neck. The face is
// corpse-pale and hollow, black veins creeping out from sunken sockets where two violet pinpricks
// burn. On its head it wears the stolen Mitre of Holiness: tall white panels gone ash-grey, the gilt
// bands cracked, the front cross scorched and smeared black, and two lappets hanging behind. Bell
// sleeves with tarnished cuffs show long, pale, spidery hands with black talons. In its right hand
// it carries a black iron crozier whose crook curls into a thorned spiral.
// Each moving part (body, head, each leg and arm, the crozier) is one merged, vertex-coloured mesh
// on one shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once
// and shared.
// Handles: legs, arms, arm (the crozier arm), weaponSocket, head, eyes, body.

const C={
 skin:rgb('#b4b0c2'),skinDark:rgb('#5a5468'),skinHi:rgb('#d8d4e4'),vein:rgb('#1a1024'),shadow:rgb('#030205'),
 robe:rgb('#17141c'),robeDark:rgb('#060508'),robeHi:rgb('#3a2e4a'),
 gold:rgb('#9a7a34'),goldHi:rgb('#d4b25a'),goldDark:rgb('#4a3814'),
 stole:rgb('#4a0c14'),stoleHi:rgb('#7a1a22'),
 mitre:rgb('#b8b2a4'),mitreDark:rgb('#6e6a62'),soot:rgb('#141012'),
 iron:rgb('#16161a'),ironHi:rgb('#4a4a54'),nail:rgb('#0a080c'),
};
const up=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
// a tapered cylinder from point a to point b
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// a ring of downward-hanging jagged points along an arc of a hem (angles a0..a1, radius r, depth zs)
function tatters(P,count,r,y,zs,a0,a1,len,w,colour,seed){
 for(let i=0;i<count;i++){
  const a=a0+(i+.5+(hash(seed+i)-.5)*.4)/count*(a1-a0),h=len*(.5+hash(seed+i+40)*.8);
  P.add(new THREE.ConeGeometry(w,h,4),at(Math.sin(a)*r,y-h/2,Math.cos(a)*r*zs,[0,a,Math.PI],[1,1,.3]),colour);
 }
}
// tarnished gold, pitted with black
const tarnish=(x,y,z)=>{const s=hash(Math.floor(x*400)+Math.floor(y*400)*7+Math.floor(z*400)*13);return s>.8?C.goldDark:s>.55?C.goldHi:C.gold;};

export const HIP_Y=.47,SHOULDER_Y=.85,NECK_Y=.97;

// the alb: black with a violet sheen along its folds
const robe=(x,y,z)=>{
 const fold=Math.sin(Math.atan2(x,z)*11+y*3)*.5+.5;
 let c=mix(C.robeDark,C.robe,fold*.8+clamp01((y-.3)*1.4)*.2);
 if(fold>.9)c=mix(c,C.robeHi,.45);
 return c;
};

function buildBody(){
 const P=pieces();
 // the alb, narrow at the chest and falling straight to the floor
 P.add(lathe([[.22,.03],[.215,.1],[.19,.3],[.16,.5],[.15,.62],[.165,.74],[.18,.84],[.16,.9],[.1,.94],[.05,.955]],40),at(0,0,0,[0,0,0],[1,1,.8]),robe);
 P.add(new THREE.CircleGeometry(.22,32),at(0,.03,0,[Math.PI/2,0,0],[1,.8,1]),C.robeDark);
 // the hem torn into long jagged points that drag on the floor
 tatters(P,26,.218,.035,.8,0,Math.PI*2,.034,.026,C.robeDark,23);
 // the chasuble, front and back panels hanging in a shield shape over the alb, ending in a point
 const chasuble=(x,y,z)=>{
  let c=mix(C.robeDark,C.robe,clamp01((y-.3)*1.5)*.6+(Math.sin(x*60)*.5+.5)*.2);
  // the orphrey: an inverted cross in tarnished gold, front only
  if(z>0&&(Math.abs(x)<.02||(Math.abs(y-.44)<.016&&Math.abs(x)<.085)))c=tarnish(x,y,z);
  // a tarnished border along the bottom edge
  const edge=.3+Math.abs(x)*1.4;
  if(y<edge+.02&&y>edge-.03)c=tarnish(x,y,z);
  return c;
 };
 for(const [a0,turn] of [[-.95,0],[Math.PI-.95,1]]){
  // a partial bell, a little proud of the alb
  const geo=lathe([[.12,.94],[.185,.86],[.2,.74],[.19,.55],[.21,.35],[.215,.22]],12,a0,1.9);
  // cut the bottom into a point: pull the lowest rows up at the panel's sides
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),floor=.24+Math.abs(x)*1.3;
   if(y<floor)p.setY(i,floor-(hash(i%13)*.02));
  }
  P.add(geo,at(0,0,0,[0,0,0],[1,1,.82]),turn?(x,y)=>chasuble(x,y,-1).map(v=>v*.85):chasuble);
 }
 // a jagged point at the foot of each panel
 for(const s of [1,-1])P.add(new THREE.ConeGeometry(.03,.1,4),at(0,.2,s*.18,[0,0,Math.PI],[1,1,.35]),C.robeDark);
 // the blood-dark stole, two bands from the neck down the front, fringed at the ends
 for(const s of [-1,1]){
  limb(P,[s*.055,.9,.135],[s*.07,.62,.16],.022,.022,(x,y)=>Math.abs(y-.75)<.012?C.goldDark:mix(C.stole,C.stoleHi,(Math.sin(y*90)*.5+.5)*.35),4);
  limb(P,[s*.07,.62,.16],[s*.075,.24,.19],.022,.024,(x,y)=>Math.abs(y-.3)<.012?C.gold:mix(C.stole,C.stoleHi,(Math.sin(y*90)*.5+.5)*.35),4);
  for(let k=0;k<5;k++)limb(P,[s*.075+(k-2)*.008,.225,.19],[s*.075+(k-2)*.01,.18-hash(k+s*7)*.03,.195],.003,.0015,C.goldDark,3);
 }
 // a high collar of black spines fanning up round the back and sides of the neck
 for(let i=0;i<11;i++){
  const a=1.25+i/10*(Math.PI*2-2.5),h=.12+Math.sin(i/10*Math.PI)*.08+hash(i+60)*.03;
  P.add(new THREE.ConeGeometry(.018,h,4),at(Math.sin(a)*.11,.93+h/2,Math.cos(a)*.09,[-Math.cos(a)*.35,0,Math.sin(a)*.35],[1,1,.4]),(x,y)=>mix(C.robe,C.robeHi,clamp01((y-.93)*5)*.5));
 }
 P.add(lathe([[.13,.9],[.12,.95],[.1,.97]],24,1.2,Math.PI*2-2.4),at(0,0,0,[0,0,0],[1,1,.8]),C.robeDark);
 // the neck, thin and pale
 P.add(new THREE.CylinderGeometry(.032,.042,.08,12),at(0,.95,.02,[.12,0,0]),(x,y,z)=>Math.abs(Math.sin(x*90))<.15&&z>.02?C.vein:C.skinDark);
 return P.merge();
}

// the face: pale, hollow, black veins creeping out of the sockets; head centre at .1
const SOCKET_Y=.112,SOCKET_X=.026;
function face(x,y,z){
 for(const s of [-1,1]){
  const dx=x-s*SOCKET_X,dy=(y-SOCKET_Y)*1.3,d=Math.hypot(dx,dy);
  if(z>.03&&d<.019)return mix(C.shadow,C.skinDark,clamp01((d-.012)*80));
  // veins: thin wandering lines radiating from the socket
  if(z>.02&&d<.05&&Math.abs(Math.sin(Math.atan2(dy,dx)*5+d*90))<.12*(1-d*14))return C.vein;
 }
 let c=mix(C.skinDark,C.skin,clamp01(z*14+.2));
 for(const s of [-1,1]){
  if(Math.hypot(x-s*.038,y-.085)<.014&&z>.04)c=mix(c,C.skinHi,.5);// the cheekbones
  if(Math.hypot(x-s*.034,y-.058)<.018&&z>.03)c=mix(c,C.shadow,.55);// the hollow cheeks
 }
 if(z>.05&&Math.abs(y-.042)<.0035&&Math.abs(x)<.02)return C.vein;// the thin black mouth
 return c;
}
// one mitre panel, a pointed arch, flat in x/y, facing +z
function mitreShape(){
 const s=new THREE.Shape(),w=.068,h=.19;
 s.moveTo(-w,0);s.lineTo(w,0);s.quadraticCurveTo(w*1.05,h*.6,0,h);s.quadraticCurveTo(-w*1.05,h*.6,-w,0);
 return s;
}
function buildHead(){
 const P=pieces();
 // the long, hollow face
 P.add(new THREE.SphereGeometry(.07,22,16),at(0,.1,0,[0,0,0],[.82,1.12,.95]),face);
 P.add(new THREE.ConeGeometry(.042,.065,14),at(0,.045,.02,[Math.PI+.25,0,0],[1,1,.85]),face);
 // the jutting brow, and a thin hooked nose
 P.add(new THREE.BoxGeometry(.084,.011,.028),at(0,.136,.05,[.3,0,0]),C.skinDark);
 P.add(new THREE.ConeGeometry(.008,.042,4),at(0,.093,.07,[-.4,0,0]),(x,y,z)=>mix(C.skinDark,C.skinHi,clamp01((z-.06)*60)));
 // pointed ears, close to the skull
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.012,.05,4),at(s*.058,.12,-.005,[0,0,-s*.5],[1,1,.4]),C.skinDark);
 // the Mitre of Holiness, stolen and defiled. The base band, gilt and cracked
 P.add(new THREE.CylinderGeometry(.064,.06,.032,24,1,true),at(0,.175,-.004,[0,0,0],[1,1,.95]),(x,y,z)=>hash(Math.floor(Math.atan2(x,z)*12))>.8&&Math.abs(y-.175)<.004?C.soot:tarnish(x,y,z));
 // the two tall panels, front and back, leaning together
 const panel=(x,y,z)=>{
  let c=mix(C.mitreDark,C.mitre,clamp01((y-.19)*6)*.7+hash(Math.floor(x*200)+Math.floor(y*200)*3)*.15);
  // a gold band up the middle, and on the front (s>0) the cross, scorched and smeared with soot
  if(Math.abs(x)<.008)c=tarnish(x,y,0);
  if(z>0&&Math.abs(y-.29)<.008&&Math.abs(x)<.035)c=tarnish(x,y,0);
  if(z>0&&Math.hypot(x*1.4,y-.28)<.045)c=mix(c,C.soot,clamp01((.045-Math.hypot(x*1.4,y-.28))*60));
  // soot dripping down from the burn
  if(z>0&&y<.28&&y>.2&&hash(Math.floor(x*160))>.7)c=mix(c,C.soot,.8);
  return c;
 };
 for(const s of [1,-1]){
  const m=at(0,.188,s*.032-.004,[s*-.14,s<0?Math.PI:0,0]);
  P.add(new THREE.ExtrudeGeometry(mitreShape(),{depth:.008,bevelEnabled:false,curveSegments:10}).translate(0,0,-.004),m,(x,y)=>panel(x,y,s));
  // the gilt edging round the arch, broken in places
  const edge=mitreShape().getPoints(8).slice(1).map(p=>new THREE.Vector3(p.x,p.y,s*.006).applyMatrix4(m));
  for(let i=1;i<edge.length;i++)if(hash(i*3+(s>0?1:2))<.85)limb(P,edge[i-1].toArray(),edge[i].toArray(),.0045,.0045,tarnish,4);
 }
 // the lappets, two long tails hanging down the back from under the mitre, tarnished at the ends
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.024,.17,.005),at(s*.032,.1,-.07,[.18,0,s*.06]),(x,y)=>y<.04?tarnish(x,y,0):mix(C.mitreDark,C.mitre,.4));
 return P.merge();
}
// two violet pinpricks burning in the sockets
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.008,8,6),at(s*SOCKET_X,SOCKET_Y,.058,[0,0,-s*.3],[1.4,.7,.6]),[1,1,1]);
 return P.merge();
}

// a thin shin hidden inside the alb: it glides, nothing shows below the hem
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.032,.024,.38,6),at(0,-.22,0),C.robeDark);
 return P.merge();
}

// a wide bell sleeve with a tarnished cuff over a pale, spidery hand with black talons, curled to grip
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.06,14,10),at(0,-.01,0),robe);
 P.add(lathe([[.055,0],[.06,-.12],[.08,-.22],[.105,-.29]],16),at(0,0,0),(x,y,z)=>robe(x,y+.5,z));
 P.add(lathe([[.106,-.27],[.108,-.295],[.09,-.293],[.07,-.26]],16),at(0,0,0),(x,y,z)=>y<-.285&&y>-.29?C.robeDark:tarnish(x,y,z));
 tatters(P,7,.1,-.292,1,0,Math.PI*2,.05,.02,C.robeDark,47);
 // the thin wrist, veined
 limb(P,[0,-.22,0],[0,-.355,.006],.022,.017,(x,y,z)=>Math.abs(Math.sin(y*160+x*60))<.12?C.vein:C.skinDark,8);
 // the long hand, fingers curled round a grip, black talons at their tips
 P.add(new THREE.SphereGeometry(.026,10,8),at(0,-.38,.008,[0,0,0],[.8,1.25,.7]),C.skin);
 for(let k=0;k<4;k++){
  const x=-.017+k*.0115;
  limb(P,[x,-.4,.012],[x,-.41,.048],.006,.005,C.skin,5);
  limb(P,[x,-.41,.048],[x,-.385,.06],.005,.004,C.skinDark,5);
  P.add(new THREE.ConeGeometry(.0042,.022,4),at(x,-.37,.06,[.25,0,0]),C.nail);
 }
 limb(P,[.021,-.375,.012],[.03,-.4,.046],.007,.005,C.skin,5);// the thumb
 P.add(new THREE.ConeGeometry(.004,.016,4),at(.032,-.405,.054,[1.7,0,0]),C.nail);
 return P.merge();
}

// The crozier, held upright: a black iron shaft, knotted with spurs, rising to a crook that curls
// into a tight spiral studded with thorns. Built along +y from the grip, the crook curling toward +z.
function buildCrozier(){
 const P=pieces();
 const shaft=(x,y,z)=>{
  if(Math.abs(y)<.06)return Math.sin(y*260)>0?C.stole:C.robeDark;// the bound grip
  return mix(C.iron,C.ironHi,(Math.sin(Math.atan2(x,z)*4+y*20)*.5+.5)*.35);
 };
 limb(P,[0,-.44,0],[0,.82,0],.011,.013,shaft,8);
 P.add(new THREE.ConeGeometry(.014,.05,6),at(0,-.46,0,[Math.PI,0,0]),C.iron);// the spiked foot
 // knots up the shaft, each with a little backward spur
 for(const y of [-.25,.2,.5]){
  P.add(new THREE.SphereGeometry(.02,8,6),at(0,y,0,[0,0,0],[1,.7,1]),C.ironHi);
  P.add(new THREE.ConeGeometry(.007,.04,4),at(0,y+.012,-.025,[-1.1,0,0]),C.iron);
 }
 // a gold-tarnished collar where the crook springs from the shaft
 P.add(new THREE.CylinderGeometry(.022,.017,.05,10),at(0,.84,0),tarnish);
 // the crook: up, over toward +z and down, then in a tightening spiral
 const pts=[];
 for(let i=0;i<=40;i++){
  const t=i/40,a=t*Math.PI*2.2,r=.085*(1-t*.62);
  pts.push(new THREE.Vector3(0,.95+Math.sin(a)*r-(t<.2?(.2-t)*.35:0),.085-Math.cos(a)*r));
 }
 pts[0].set(0,.86,0);
 const curve=new THREE.CatmullRomCurve3(pts);
 P.add(new THREE.TubeGeometry(curve,64,.011,7,false),null,(x,y,z)=>mix(C.iron,C.ironHi,(Math.sin(y*80+z*80)*.5+.5)*.4));
 // thorns along the outer curve of the crook, pointing outward
 for(let i=0;i<9;i++){
  const t=.1+i/9*.75,p=curve.getPoint(t),c=new THREE.Vector3(0,.95,.085),dir=p.clone().sub(c).normalize();
  const m=new THREE.Matrix4().compose(p.clone().addScaledVector(dir,.016),new THREE.Quaternion().setFromUnitVectors(up,dir),new THREE.Vector3(1,1,1));
  P.add(new THREE.ConeGeometry(.0055,.03+hash(i+80)*.015,4),m,C.ironHi);
 }
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[.02,0,-.05],[.92,.92,.92]));
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(),crozier:buildCrozier(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.1,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#ecd8ff',emissive:'#8a2cff',emissiveIntensity:2.2,roughness:.3,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createDarkOne(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.3);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.035);head.rotation.x=.1;body.add(head);// tilted down, looking along its nose
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.07,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.19,SHOULDER_Y,0);arm.rotation.z=s*.09;body.add(arm);mesh(arm,S.arm,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.39,.035);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.crozier,'crozier',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'dark one',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
