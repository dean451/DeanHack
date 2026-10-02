import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Thoth Amon (the Barbarian's quest nemesis, the Stygian sorcerer) shares the humans' letter, so he
// used to be the plain `@` humanoid. He now stands as a tall, gaunt priest of Set. His skull is
// shaven and long, the dark bronze skin drawn tight over the cheekbones; a hooked nose, a thin,
// cruel mouth and a narrow braided beard on the chin. His eyes are lined in kohl that sweeps back
// in long wings, and they burn a venom green. A gold circlet rings his brow with a rearing cobra at
// the front. A stiff black collar fans up behind his head into jagged points, edged with gold. His
// floor-length black robe shimmers serpent-green in the folds and falls to a hem cut into ragged
// fangs; a crimson panel runs down the front, bordered in gold and scored with gold glyphs. A broad
// collar of gold, lapis, carnelian and jade lies over the shoulders, and a crimson sash hangs at the
// waist. Narrow sleeves flare at the wrist into torn points over long, bony hands with black,
// clawed nails (his claw steals amulets). A gold serpent armlet coils round each upper arm. On the
// left hand he wears the Serpent Ring of Set, a gold coil with an emerald eye, and a black asp winds
// up the left forearm, its head reared over the back of the hand. In his right hand he holds a tall
// black staff banded in gold and crowned with a rearing cobra, hood spread, eyes green.
// Each moving part (body, head, each leg and arm, the staff) is one merged, vertex-coloured mesh on
// one shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once and
// shared.
// Handles: legs, arms, arm (the staff arm), weaponSocket, head, eyes, body. The pivots match
// wizard.js (shoulders ±.215 at .82, hand .37 down the arm, legs ±.08 at .47, head at .955).

const C={
 skin:rgb('#6a4630'),skinDark:rgb('#3e2618'),skinHi:rgb('#8e6446'),lip:rgb('#2e1610'),kohl:rgb('#060406'),
 robe:rgb('#121014'),robeDark:rgb('#060507'),robeSheen:rgb('#1c3a2e'),
 crimson:rgb('#5a0e12'),crimsonDark:rgb('#2e0608'),
 gold:rgb('#c89a38'),goldHi:rgb('#f2d27a'),goldDark:rgb('#6e4e18'),
 lapis:rgb('#1c348a'),carnelian:rgb('#a8341c'),jade:rgb('#2e7a4e'),emerald:rgb('#38ff8a'),
 nail:rgb('#0c0a0a'),beard:rgb('#0e0c0c'),beardHi:rgb('#2a2622'),
 scale:rgb('#101612'),scaleHi:rgb('#2e4a36'),fang:rgb('#e8e0c8'),
 wood:rgb('#0e0b0a'),woodHi:rgb('#2a221e'),
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
// cut the lowest (or, with `rise`, the highest) row of a lathe into uneven fangs
function fangs(geo,edge,depth,teeth,seed,rise=false){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);
  if(rise?y<edge-1e-4:y>edge+1e-4)continue;
  const a=Math.atan2(p.getX(i),p.getZ(i))*teeth/Math.PI+seed,f=a-Math.floor(a);
  p.setY(i,y+(rise?1:-1)*depth*(.4+.6*hash(Math.floor(a)+seed*7))*(1-Math.abs(f-.5)*2));
 }
 geo.computeVertexNormals();
 return geo;
}
// a snake's body as a tube along a curve through `pts`, black scales with a green sheen and a pale
// belly line
function serpent(P,pts,r,belly=null){
 const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
 const geo=new THREE.TubeGeometry(curve,Math.max(12,pts.length*3),r,8,false);
 // taper the tail end
 const p=geo.attributes.position,n=p.count,ring=9;
 for(let i=0;i<n;i++){
  const t=Math.floor(i/ring)/(n/ring-1),c=curve.getPointAt(Math.min(1,t)),k=.25+.75*clamp01(t*3);
  p.setXYZ(i,c.x+(p.getX(i)-c.x)*k,c.y+(p.getY(i)-c.y)*k,c.z+(p.getZ(i)-c.z)*k);
 }
 geo.computeVertexNormals();
 P.add(geo,null,(x,y,z)=>{
  const s=Math.sin(x*420)*Math.sin(y*420)*Math.sin(z*420);
  return belly&&belly(x,y,z)?C.goldDark:mix(C.scale,C.scaleHi,clamp01(s*.5+.5)*.6);
 });
 return curve;
}
// a cobra's head with its hood spread, at `pos`, the face looking along +z (rotated by `rot`)
function cobraHead(P,pos,rot,size,colourHood,eye){
 const m=new THREE.Matrix4().compose(new THREE.Vector3(...pos),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),new THREE.Vector3(size,size,size));
 const on=a=>new THREE.Matrix4().multiplyMatrices(m,a);
 // the hood: a flattened shield behind the head, its rim drawn out to points
 P.add(new THREE.SphereGeometry(.05,10,8),on(at(0,-.04,-.012,[0,0,0],[1.25,1.6,.28])),(x,y,z)=>colourHood);
 // the head, wedge-shaped, the jaw a little open
 P.add(new THREE.SphereGeometry(.028,12,8),on(at(0,.02,.02,[0,0,0],[.9,.6,1.4])),C.scale);
 P.add(new THREE.ConeGeometry(.016,.04,8),on(at(0,.008,.052,[Math.PI/2+.25,0,0],[1,1,.5])),C.scale);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.0075,6,4),on(at(s*.017,.03,.035)),eye);
  P.add(new THREE.ConeGeometry(.003,.016,4),on(at(s*.008,.0,.058,[Math.PI,0,0])),C.fang);
 }
}

function buildBody(){
 const P=pieces();
 // the robe: from a narrow chest it falls to the floor, flaring at the foot into ragged fangs. Black
 // with a serpent-green sheen in the folds; a crimson panel down the front, bordered in gold and
 // scored with a column of gold glyphs
 const robe=(x,y,z)=>{
  const a=Math.atan2(x,z),fold=Math.sin(a*13+y*3)*.5+.5;
  if(z>0&&Math.abs(x)<.05+(.5-y)*.06*(y<.5?1:0)){
   const edge=.05+(.5-y)*.06*(y<.5?1:0);
   if(Math.abs(x)>edge-.01)return C.gold;
   // the glyphs: a column of little gold marks, one per row
   const row=Math.floor(y*34),cx=Math.abs(x)/edge;
   if(y<.82&&y>.12&&hash(row*3+Math.floor(cx*3))>.55&&Math.sin(y*34*Math.PI)>.2&&cx<.6)return C.goldDark;
   return mix(C.crimsonDark,C.crimson,fold*.6);
  }
  let c=mix(C.robeDark,C.robe,fold);
  return mix(c,C.robeSheen,Math.pow(fold,6)*.8);
 };
 const skirt=fangs(lathe([[.14,.93],[.165,.86],[.18,.78],[.172,.66],[.16,.56],[.178,.44],[.2,.3],[.226,.16],[.25,.07],[.262,.05]],48),.05,.05,9,4);
 P.add(skirt,at(0,0,0,[0,0,0],[1,1,.84]),robe);
 // a dark lining seen up under the hem
 P.add(lathe([[.245,.08],[.23,.2]],48,0,Math.PI*2).scale(1,1,.84),null,C.robeDark);
 // the crimson sash at the waist, knotted at the left hip with two hanging, fanged ends
 P.add(new THREE.CylinderGeometry(.168,.168,.045,40,1,true),at(0,.56,0,[0,0,0],[1,1,.86]),(x,y,z)=>mix(C.crimsonDark,C.crimson,Math.sin(Math.atan2(x,z)*9)*.5+.5));
 P.add(new THREE.SphereGeometry(.024,8,6),at(-.13,.56,.09),C.crimson);
 for(const [dx,len] of [[-.012,.2],[.014,.15]]){
  P.add(new THREE.BoxGeometry(.03,len,.008),at(-.13+dx,.55-len/2,.1,[0,-.6,dx*4]),(x,y)=>mix(C.crimsonDark,C.crimson,clamp01((y-.3)*4)));
  P.add(new THREE.ConeGeometry(.016,.04,3),at(-.13+dx,.53-len,.1,[Math.PI,-.6,0],[1,1,.3]),C.crimsonDark);
 }
 // the broad collar over the shoulders: rings of gold, lapis, carnelian and jade, with a fringe of
 // gold drops
 const bands=[C.gold,C.lapis,C.gold,C.carnelian,C.gold,C.jade,C.gold];
 P.add(lathe([[.075,.93],[.12,.915],[.17,.885],[.2,.85],[.21,.825]],40),at(0,0,0,[0,0,0],[1,1,.86]),(x,y,z)=>{
  const r=Math.hypot(x,z/.86),k=Math.floor(clamp01((r-.075)/.14)*bands.length);
  const c=bands[Math.min(bands.length-1,k)];
  return c===C.gold&&Math.sin(Math.atan2(x,z)*40)>.6?C.goldHi:c;
 });
 for(let i=0;i<22;i++){
  const a=(i/22)*Math.PI*2;
  P.add(new THREE.SphereGeometry(.009,5,4),at(Math.sin(a)*.212,.815,Math.cos(a)*.212*.86,[0,0,0],[1,1.5,1]),i%2?C.gold:C.lapis);
 }
 // the stiff collar fanning up behind the head, black inside, gold along its jagged top
 const fan=fangs(lathe([[.085,.9],[.1,.98],[.13,1.06],[.165,1.13]],24,Math.PI*.62,Math.PI*.76),1.13,-.06,6,2,true);
 P.add(fan,at(0,0,-.015,[0,0,0],[1,1,.8]),(x,y)=>y>1.1?C.gold:mix(C.robeDark,C.robeSheen,clamp01((y-.9)*3)*.6));
 // the neck, lean and corded
 P.add(new THREE.CylinderGeometry(.045,.055,.08,14),at(0,.94,.01),C.skinDark);
 limb(P,[.025,.91,.05],[.012,.975,.03],.008,.006,C.skin,5);
 limb(P,[-.025,.91,.05],[-.012,.975,.03],.008,.006,C.skin,5);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the shaven skull, long and drawn back; head centre at .1
 P.add(new THREE.SphereGeometry(.088,20,14),at(0,.11,-.01,[-.3,0,0],[.9,1.08,1.18]),(x,y,z)=>{
  // the kohl: an almond round each eye, sweeping back in a long wing
  for(const s of [-1,1]){
   const dx=x-s*.033,dy=y-.112;
   if(z>.04&&Math.abs(dy+dx*s*.25)<.009&&s*dx>-.02&&s*dx<.045)return C.kohl;
  }
  // sunken cheeks and temples in shadow, the crown catching the light
  if(z>.02&&y<.1&&Math.abs(x)>.035)return mix(C.skin,C.skinDark,.6);
  return mix(C.skinDark,C.skinHi,clamp01((y-.05)*5)*.6+clamp01(z*6)*.3);
 });
 // the face narrowing to a long jaw and pointed chin
 P.add(new THREE.SphereGeometry(.058,16,12),at(0,.05,.03,[0,0,0],[.95,1.05,1]),(x,y,z)=>{
  if(z>.06&&Math.abs(y-.048)<.004&&Math.abs(x)<.022)return C.lip;// the thin mouth
  return mix(C.skinDark,C.skin,clamp01(z*12));
 });
 // high cheekbones and a heavy, glowering brow
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.018,8,6),at(s*.05,.088,.062,[0,0,0],[1,.6,.8]),C.skinHi);
  P.add(new THREE.CapsuleGeometry(.01,.03,2,6),at(s*.034,.128,.078,[0,0,Math.PI/2-s*.3]),C.skinDark);
  // flat, close ears
  P.add(new THREE.SphereGeometry(.02,8,6),at(s*.082,.1,-.005,[0,0,0],[.35,1.1,.7]),C.skinDark);
  // the eye sockets sunk deep
  P.add(new THREE.SphereGeometry(.014,8,6),at(s*.033,.112,.072,[0,0,0],[1.3,.6,.5]),C.kohl);
 }
 // the hooked nose
 P.add(new THREE.ConeGeometry(.013,.05,8),at(0,.088,.09,[.5,0,0],[1,1,1.2]),C.skin);
 P.add(new THREE.SphereGeometry(.01,8,6),at(0,.068,.098),C.skinHi);
 // the narrow braided beard, in four knots down from the chin, bound in gold at the tip
 for(let i=0;i<4;i++)P.add(new THREE.SphereGeometry(.013-i*.0015,8,6),at(0,.0-i*.022,.07-i*.006,[0,0,0],[1,1.3,1]),i%2?C.beardHi:C.beard);
 P.add(new THREE.CylinderGeometry(.008,.006,.014,8),at(0,-.088,.052),C.gold);
 P.add(new THREE.ConeGeometry(.007,.02,6),at(0,-.104,.05,[Math.PI,0,0]),C.beard);
 // the gold circlet round the brow, the cobra rearing at its front
 P.add(new THREE.TorusGeometry(.088,.007,5,40),at(0,.148,-.008,[Math.PI/2-.25,0,0],[1,1.12,1]),(x,y,z)=>Math.sin(Math.atan2(x,z)*24)>.7?C.goldHi:C.gold);
 cobraHead(P,[0,.19,.088],[-.2,0,0],.55,C.gold,C.emerald);
 limb(P,[0,.165,.088],[0,.185,.09],.008,.009,C.gold,6);
 return P.merge();
}
// venom-green eyes in the kohl
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0075,8,6),at(s*.033,.112,.08,[0,0,s*.25],[1.5,.6,.6]),[1,1,1]);
 return P.merge();
}

// the robe falls over the leg; a gold-strapped sandal and a bony foot show below it
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.05,.044,.4,12),at(0,-.2,0),C.robeDark);
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.448,.05,[0,0,0],[.85,.45,1.75]),C.skinDark);
 P.add(new THREE.BoxGeometry(.075,.01,.15),at(0,-.465,.045),C.goldDark);
 P.add(new THREE.TorusGeometry(.036,.005,4,14),at(0,-.44,.06,[Math.PI/2-.2,0,0],[1,1.4,1]),C.gold);
 for(let k=0;k<4;k++)P.add(new THREE.SphereGeometry(.0045,5,4),at(-.018+k*.012,-.452,.108),C.nail);
 return P.merge();
}

// a narrow black sleeve flaring at the wrist into torn points, a gold serpent armlet round the upper
// arm, and a long bony hand with black clawed nails. The left also wears the Serpent Ring and carries
// the asp coiled up the forearm
function buildArm(left){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.058,16,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),C.robe);
 const sleeve=fangs(lathe([[.052,0],[.05,-.12],[.054,-.2],[.072,-.27],[.086,-.31]],24),-.31,.05,5,left?3:6);
 P.add(sleeve,null,(x,y,z)=>{
  const fold=Math.sin(Math.atan2(x,z)*7+y*20)*.5+.5;
  return mix(mix(C.robeDark,C.robe,fold),C.robeSheen,Math.pow(fold,6)*.8);
 });
 // the serpent armlet: three turns of gold coil round the upper arm
 for(let i=0;i<3;i++)P.add(new THREE.TorusGeometry(.055,.006,5,24),at(0,-.07-i*.016,0,[Math.PI/2+.15,0,0]),i===1?C.goldHi:C.gold);
 // the bony wrist and long hand, fingers half curled into claws
 P.add(new THREE.CylinderGeometry(.024,.028,.08,10),at(0,-.32,0),C.skinDark);
 P.add(new THREE.SphereGeometry(.03,12,8),at(0,-.37,.006,[0,0,0],[.8,1.25,.75]),C.skin);
 for(let k=0;k<4;k++){
  const x=-.018+k*.012,len=.05+(k===1||k===2?.012:0);
  limb(P,[x,-.39,.012],[x,-.39-len,.03],.0065,.005,C.skin,5);
  P.add(new THREE.ConeGeometry(.0045,.026,4),at(x,-.395-len-.006,.046,[Math.PI/2+.7,0,0]),C.nail);
 }
 limb(P,[.026,-.36,.012],[.034,-.395,.04],.008,.006,C.skin,5);// the thumb
 P.add(new THREE.ConeGeometry(.004,.02,4),at(.036,-.404,.054,[Math.PI/2+.5,0,0]),C.nail);
 if(left){
  // the Serpent Ring of Set: a gold coil round the middle finger with an emerald eye
  P.add(new THREE.TorusGeometry(.009,.003,5,12),at(-.006,-.41,.02,[.3,0,0]),C.gold);
  P.add(new THREE.SphereGeometry(.005,6,4),at(-.006,-.41,.031),C.emerald);
  // the asp, coiled three times round the sleeve, then out over the cuff, its head reared above the
  // back of the hand
  const sleeveR=y=>y>-.2?.052+(-.2-y)*0:(y>-.27?.054+(-.2-y)/.07*.018:.072+(-.27-y)/.04*.014);
  const pts=[];
  for(let i=0;i<=18;i++){const t=i/18,a=t*Math.PI*5,y=-.12-t*.15,r=sleeveR(y)+.011;pts.push([Math.sin(a)*r,y,Math.cos(a)*r]);}
  pts.push([0,-.3,.1],[0,-.325,.118],[0,-.305,.14],[0,-.275,.145]);
  serpent(P,pts,.011);
  cobraHead(P,[0,-.262,.145],[-.25,0,0],.42,C.scaleHi,C.emerald);
 }
 return P.merge();
}

// the staff: tall, black, banded in gold, crowned with a rearing cobra, hood spread. Built along +y
// from the grip
function buildStaff(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.013,.017,1.2,8,10),at(0,.17,0),(x,y,z)=>{
  if(Math.abs(y-.62)<.015||Math.abs(y-.4)<.01||Math.abs(y+.38)<.012)return C.gold;
  return mix(C.wood,C.woodHi,(Math.sin(Math.atan2(x,z)*3+y*7)*.5+.5)*.5);
 });
 P.add(new THREE.ConeGeometry(.014,.05,6),at(0,-.45,0,[Math.PI,0,0]),C.goldDark);// the iron-shod foot
 // the cobra: its body wraps the top of the staff once, then rears up and back
 const pts=[];
 for(let i=0;i<=10;i++){const t=i/10,a=t*Math.PI*2.2;pts.push([Math.sin(a)*.026,.6+t*.12,Math.cos(a)*.026]);}
 pts.push([0,.76,.012],[0,.8,.022],[0,.84,.018]);
 serpent(P,pts,.014,(x,y,z)=>z>.022&&y>.74);
 cobraHead(P,[0,.86,.018],[-.15,0,0],1,C.scaleHi,C.emerald);
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[.12,0,0]));
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),armL:buildArm(true),armR:buildArm(false),staff:buildStaff(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.18,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#d8ffe0',emissive:'#3cff7a',emissiveIntensity:1.9,roughness:.2,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createThothAmon(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.08);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,.955,.012);head.rotation.x=.06;body.add(head);// chin down, staring
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);arm.rotation.z=s*.07;body.add(arm);mesh(arm,s<0?S.armL:S.armR,'arm',S.hide);arms.push(arm);
 }
 // the asp arm held a little forward, the hand turned in
 arms[0].rotation.x=-.25;arms[0].rotation.y=.3;
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.03);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.staff,'staff',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'thoth amon',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
