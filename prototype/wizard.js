import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The wizard (the player-monster role) used to be the generic '@' humanoid: a tinted box with a
// ball for a head. He now stands as an old robed mage: a tall pointed hat with a wide brim, a
// gold band and a crescent moon, its tip flopping to one side, scattered with gold stars; a lined old face
// with a hooked nose, bushy white brows and a long forked white beard over the chest. A floor-length
// midnight-blue robe, star-strewn and hemmed in gold, is girt with a knotted rope belt carrying a
// leather pouch and a small spellbook; a short hooded capelet with a gilt clasp lies over the
// shoulders. Wide bell sleeves, gold-trimmed, fall back from bony hands; pointed slippers peep
// out below the hem. He holds an upright gnarled quarterstaff whose head is a wooden claw
// gripping a glowing crystal orb.
// Each moving part (body, head, each leg and arm, the staff) is one merged, vertex-coloured mesh
// with one shared material, plus one small glowing mesh for the orb: 8 draws. Geometry is built
// once and shared.
// Handles: legs, arms, arm (the staff arm), weaponSocket, head, body. The pivots match
// valkyrie.js and knight.js (shoulders ±.215 at .82, hand .37 down the arm, legs ±.08 at .47,
// head at .955).

const ROBE=rgb('#28307a'),ROBE_DARK=rgb('#141a48'),ROBE_HI=rgb('#3c48a8');
const GOLD=rgb('#d8ac40'),GOLD_HI=rgb('#f6d878'),GOLD_DARK=rgb('#8a6420');
const SKIN=rgb('#e0b494'),SKIN_SHADE=rgb('#b68a70'),CHEEK=rgb('#d88a80'),LINE=rgb('#9a6e58');
const BEARD=rgb('#ecebe6'),BEARD_SHADE=rgb('#b8b6b0'),EYE=rgb('#3a5a8a'),EYE_WHITE=rgb('#f2eee4');
const ROPE=rgb('#b89a60'),ROPE_DARK=rgb('#7a6036'),LEATHER=rgb('#6a4226'),LEATHER_DARK=rgb('#3a2414');
const BOOK=rgb('#7a1e22'),PAGE=rgb('#eae0c4'),SLIPPER=rgb('#4a2a5a'),SLIPPER_DARK=rgb('#2a1634');
const WOOD=rgb('#6a4a2c'),WOOD_DARK=rgb('#3a2616'),WOOD_HI=rgb('#8e6a42');

const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
// a small cheap hash so scattered stars and wood grain look irregular but stay the same each build
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};

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
// a five-pointed star as a thin plate facing +z
function star(r){
 const s=new THREE.Shape();
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2,q=i%2?r*.45:r;const x=Math.sin(a)*q,y=Math.cos(a)*q;if(i)s.lineTo(x,y);else s.moveTo(x,y);}
 s.closePath();
 return new THREE.ExtrudeGeometry(s,{depth:.003,bevelEnabled:false});
}
// scatter gold stars over a lathed surface: `surf(a,t)` gives [x,y,z,radius] for angle a, height t
function stars(P,count,seed,surf,size){
 for(let i=0;i<count;i++){
  const a=hash(seed+i)*Math.PI*2,t=hash(seed+i+50);
  const [x,y,z,r]=surf(a,t),n=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
  P.add(star(size*(.7+hash(seed+i+90)*.6)),new THREE.Matrix4().compose(new THREE.Vector3(x,y,z).addScaledVector(n,.001),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),n),new THREE.Vector3(1,1,1)),i%3?GOLD:GOLD_HI);
 }
}

function buildBody(){
 const P=pieces();
 // the robe: floor length, flaring to the hem, gathered at the waist, over the shoulders
 const robe=[[.235,.055],[.226,.12],[.205,.3],[.185,.46],[.172,.57],[.18,.68],[.19,.79],[.176,.87],[.12,.905],[.06,.915]];
 P.add(lathe(robe,40,3),at(0,0,0,[0,0,0],[1,1,.82]),(x,y,z)=>{
  const fold=Math.sin(Math.atan2(x,z)*11)*.5+.5;
  if(y<.09)return mix(GOLD_DARK,GOLD,y>.075?1:.5);
  return mix(ramp(ROBE_DARK,ROBE,.08,.6)(y),y<.57?ROBE_DARK:ROBE_HI,y<.57?fold*.55:(z>0?.2:0));
 });
 P.add(new THREE.CircleGeometry(.235,28),at(0,.056,0,[Math.PI/2,0,0],[1,.82,1]),ROBE_DARK);
 // a gold band down the front opening
 P.add(new THREE.BoxGeometry(.03,.5,.006),at(0,.31,.173,[.085,0,0]),(x,y)=>Math.abs(x)>.011?GOLD_DARK:GOLD);
 // stars on the skirt of the robe, on its surface
 const rAt=y=>{for(let i=1;i<robe.length;i++){const [r0,h0]=robe[i-1],[r1,h1]=robe[i];if(y<=h1)return r0+(r1-r0)*(y-h0)/(h1-h0);}return robe[robe.length-1][0];};
 stars(P,26,3,(a,t)=>{const y=.12+t*.4,r=rAt(y);return [Math.sin(a)*r,y,Math.cos(a)*r*.82,r];},.017);
 // a knotted rope belt with hanging tasselled ends
 P.add(new THREE.TorusGeometry(.176,.011,6,36),at(0,.57,0,[Math.PI/2,0,0],[1,.82,1]),(x,y,z)=>Math.sin(Math.atan2(x,z)*40)>0?ROPE:ROPE_DARK);
 P.add(new THREE.SphereGeometry(.02,8,6),at(.06,.57,.137),ROPE_DARK);
 for(const [x,r] of [[.055,.06],[.072,-.1]]){
  P.add(new THREE.CylinderGeometry(.006,.006,.14,5),at(x,.5,.142,[0,0,r]),ROPE);
  P.add(new THREE.ConeGeometry(.014,.04,6),at(x+r*.7,.42,.144,[0,0,r]),ROPE_DARK);
 }
 // a leather pouch at the right hip and a small red spellbook slung at the left
 P.add(new THREE.SphereGeometry(.045,10,8),at(.152,.51,.06,[0,0,0],[.7,1,.6]),(x,y)=>ramp(LEATHER_DARK,LEATHER,.47,.55)(y));
 P.add(new THREE.TorusGeometry(.02,.004,4,10),at(.154,.548,.06,[Math.PI/2,0,0]),ROPE_DARK);
 P.add(new THREE.BoxGeometry(.03,.11,.085),at(-.168,.49,.03,[0,0,.08]),(x,y,z)=>Math.abs(z-.03)<.034&&x>-.176?PAGE:BOOK);
 P.add(new THREE.BoxGeometry(.034,.02,.09),at(-.168,.49,.03,[0,0,.08]),GOLD_DARK);
 // the capelet over the shoulders, with a hood lying back and a gilt clasp at the throat
 P.add(lathe([[.2,.72],[.205,.76],[.195,.82],[.16,.87],[.1,.9],[.07,.905]],36,3),at(0,0,0,[0,0,0],[1,1,.86]),(x,y,z)=>y<.73?GOLD:mix(ROBE,ROBE_HI,z>0?.4:0));
 P.add(new THREE.SphereGeometry(.1,18,10,0,Math.PI*2,0,Math.PI*.55),at(0,.86,-.08,[-1.2,0,0],[1,.7,.9]),(x,y,z)=>mix(ROBE_DARK,ROBE,.5));
 P.add(new THREE.CylinderGeometry(.018,.018,.008,14),at(0,.85,.13,[Math.PI/2-.3,0,0]),GOLD_HI);
 P.add(new THREE.SphereGeometry(.007,6,4),at(0,.851,.136),[.3,.5,.95]);
 // the neck
 P.add(new THREE.CylinderGeometry(.045,.05,.07,14),at(0,.93,0),SKIN_SHADE);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // an old, lined oval face; head centre at y .1 in the head group
 P.add(new THREE.SphereGeometry(.093,18,14),at(0,.1,0,[0,0,0],[.9,1.08,.95]),(x,y,z)=>z<-.03?SKIN_SHADE:(z>.06&&Math.abs(Math.sin(y*180))>.93&&y>.13?LINE:SKIN));
 // a long hooked nose
 P.add(new THREE.ConeGeometry(.015,.05,6),at(0,.088,.094,[Math.PI/2-.55,0,0]),SKIN_SHADE);
 P.add(new THREE.SphereGeometry(.012,8,6),at(0,.07,.108),SKIN_SHADE);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.018,8,6),at(s*.05,.074,.072,[0,0,0],[1,.7,.5]),mix(SKIN,CHEEK,.5));
  P.add(new THREE.SphereGeometry(.012,8,6),at(s*.033,.108,.078,[0,0,0],[1.3,.7,.5]),EYE_WHITE);
  P.add(new THREE.SphereGeometry(.007,8,6),at(s*.033,.107,.084),EYE);
  // bushy white brows, sweeping up and out
  for(let i=0;i<3;i++)P.add(new THREE.ConeGeometry(.01,.04,5),at(s*(.022+i*.016),.126+i*.004,.084-i*.006,[0,0,-s*(1.3-i*.15)]),i?BEARD:BEARD_SHADE);
  P.add(new THREE.SphereGeometry(.02,8,6),at(s*.086,.098,-.004,[0,0,0],[.45,1.1,.75]),SKIN_SHADE);
  // white hair falling at the sides and back from under the hat
  P.add(new THREE.SphereGeometry(.05,10,8),at(s*.07,.06,-.03,[0,0,s*.15],[.5,1.4,.9]),(x,y)=>mix(BEARD_SHADE,BEARD,(y-.0)*8));
 }
 P.add(new THREE.SphereGeometry(.07,12,8),at(0,.05,-.06,[0,0,0],[1.2,1.3,.6]),BEARD_SHADE);
 // a drooping moustache and a long forked beard reaching the chest
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.016,.07,6),at(s*.028,.045,.092,[0,0,s*2.5],[1,1,.6]),BEARD);
 P.add(new THREE.SphereGeometry(.07,14,10),at(0,.03,.052,[0,0,0],[1.05,.9,.7]),BEARD);
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.045,.26,10),at(s*.022,-.1,.075,[Math.PI-.12,0,s*.1],[1,1,.6]),(x,y,z)=>mix(BEARD,BEARD_SHADE,Math.sin(Math.atan2(x,z-.075)*14)*.25+.25));
 // the hat: a wide, slightly drooping brim, a gold band with a crescent moon, and a tall crown
 // whose tip flops over to the left and back
 P.add(lathe([[.2,.162],[.17,.168],[.12,.176],[.1,.18]],32,2),at(0,0,0),(x,y,z)=>y<.165?ROBE_DARK:ROBE);
 P.add(lathe([[.1,.18],[.2,.162]],32,1),at(0,-.002,0),ROBE_DARK);
 P.add(new THREE.CylinderGeometry(.093,.101,.035,28,1,true),at(0,.198,0),(x,y)=>y>.205?GOLD_HI:GOLD);
 const moon=new THREE.Shape();moon.absarc(0,0,.026,0,Math.PI*2,false);
 const bite=new THREE.Path();bite.absarc(.012,.006,.021,0,Math.PI*2,true);moon.holes.push(bite);
 P.add(new THREE.ExtrudeGeometry(moon,{depth:.004,bevelEnabled:false,curveSegments:16}),at(0,.25,.083,[-.18,0,.4]),GOLD_HI);
 const crown=[];
 for(let i=0;i<=10;i++){const t=i/10;crown.push(new THREE.Vector3(-Math.pow(t,2.4)*.13,.18+t*.34,-Math.pow(t,3)*.05));}
 const path=new THREE.CatmullRomCurve3(crown);
 const tube=new THREE.TubeGeometry(path,20,1,20,false),pos=tube.attributes.position;
 // taper the tube from the brim to a point, keeping it round about its own centre line
 for(let i=0;i<pos.count;i++){
  const ring=Math.floor(i/21),t=ring/20,c=path.getPointAt(t),r=.098*Math.pow(1-t,1.1)+.002;
  pos.setXYZ(i,c.x+(pos.getX(i)-c.x)*r,c.y+(pos.getY(i)-c.y)*r,c.z+(pos.getZ(i)-c.z)*r);
 }
 tube.computeVertexNormals();
 P.add(tube,null,(x,y,z)=>mix(ROBE_DARK,ROBE_HI,THREE.MathUtils.clamp(z*8+.4,0,1)*.6));
 // stars on the hat crown
 for(let i=0;i<9;i++){
  const t=.12+hash(i+200)*.55,a=hash(i+300)*Math.PI*2,c=path.getPointAt(t),r=.098*Math.pow(1-t,1.1)+.003;
  const n=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
  if(Math.min(a,Math.PI*2-a)<.5)continue;
  P.add(star(.012),new THREE.Matrix4().compose(c.clone().addScaledVector(n,r),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),n),new THREE.Vector3(1,1,1)),GOLD);
 }
 return P.merge();
}

// dark hose under the robe and pointed, upturned slippers
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.052,.044,.4,12),at(0,-.2,0),ROBE_DARK);
 P.add(new THREE.CylinderGeometry(.044,.042,.05,12),at(0,-.43,.004),SLIPPER);
 P.add(new THREE.SphereGeometry(.044,12,8),at(0,-.445,.05,[0,0,0],[.9,.5,1.6]),SLIPPER);
 P.add(new THREE.ConeGeometry(.02,.07,8),at(0,-.44,.12,[Math.PI/2-.5,0,0]),SLIPPER);
 P.add(new THREE.SphereGeometry(.007,6,4),at(0,-.418,.149),GOLD_HI);
 P.add(new THREE.BoxGeometry(.08,.012,.13),at(0,-.464,.04),SLIPPER_DARK);
 return P.merge();
}

// a wide bell sleeve trimmed in gold, falling back from a bony hand
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.062,16,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),ROBE);
 P.add(lathe([[.056,0],[.055,-.12],[.066,-.22],[.086,-.3],[.094,-.32]],20,3),at(0,0,0),(x,y)=>y<-.29?GOLD:ramp(ROBE_DARK,ROBE,-.3,-.05)(y));
 P.add(lathe([[.092,-.32],[.05,-.3],[.04,-.26]],20,1),at(0,0,0),ROBE_DARK);
 P.add(new THREE.CylinderGeometry(.024,.028,.08,10),at(0,-.3,0),SKIN_SHADE);
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,-.36,.004,[0,0,0],[.85,1.2,1]),SKIN);
 P.add(new THREE.SphereGeometry(.012,6,4),at(0,-.35,.028,[0,0,0],[1,1.4,1]),SKIN_SHADE);
 return P.merge();
}

// a gnarled quarterstaff held upright, its head a wooden claw of four prongs round the orb.
// Built along +y from the grip. The orb sits at ORB.
const STAFF_TOP=.98,ORB=new THREE.Vector3(0,STAFF_TOP+.05,0);
function buildStaff(){
 const P=pieces(),bottom=-.42;
 const knots=[];
 for(let i=0;i<=12;i++){const t=i/12;knots.push(new THREE.Vector3(Math.sin(t*9)*.008,bottom+t*(STAFF_TOP-bottom),Math.cos(t*7)*.006));}
 const path=new THREE.CatmullRomCurve3(knots),tube=new THREE.TubeGeometry(path,36,1,8,false),pos=tube.attributes.position;
 for(let i=0;i<pos.count;i++){
  const ring=Math.floor(i/9),t=ring/36,c=path.getPointAt(t),r=.016+t*.006+(ring%7===3?.004:0);
  pos.setXYZ(i,c.x+(pos.getX(i)-c.x)*r,c.y+(pos.getY(i)-c.y)*r,c.z+(pos.getZ(i)-c.z)*r);
 }
 tube.computeVertexNormals();
 P.add(tube,null,(x,y,z)=>{const g=Math.sin(Math.atan2(x,z)*3+y*40)*.5+.5;return mix(WOOD_DARK,WOOD_HI,g*.6+hash(Math.round(y*50))*.2);});
 P.add(new THREE.SphereGeometry(.018,8,6),at(0,bottom,0),WOOD_DARK);
 // a leather grip wrap at the hand
 P.add(new THREE.CylinderGeometry(.024,.024,.1,10,6),at(Math.sin(.3*9)*.008,0,Math.cos(.3*7)*.006),(x,y)=>Math.sin(y*260)>0?LEATHER:LEATHER_DARK);
 // the claw: four curved prongs rising round the orb and a collar where they spring
 P.add(new THREE.SphereGeometry(.028,12,8),at(0,STAFF_TOP-.005,0,[0,0,0],[1,.8,1]),WOOD);
 for(let k=0;k<4;k++){
  const a=k/4*Math.PI*2+.4,out=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
  const pts=[0,.25,.5,.75,1].map(t=>ORB.clone().addScaledVector(out,Math.sin(t*Math.PI*.9+.3)*.044).add(new THREE.Vector3(0,-.05+t*.09,0)));
  const prong=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),8,1,5,false),pp=prong.attributes.position,cp=new THREE.CatmullRomCurve3(pts);
  for(let i=0;i<pp.count;i++){const t=Math.floor(i/6)/8,c=cp.getPointAt(t),r=.008*(1-t*.6);pp.setXYZ(i,c.x+(pp.getX(i)-c.x)*r,c.y+(pp.getY(i)-c.y)*r,c.z+(pp.getZ(i)-c.z)*r);}
  prong.computeVertexNormals();
  P.add(prong,null,WOOD_HI);
 }
 return P.merge();
}

let S=null,material=null,glow=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.05,side:THREE.DoubleSide});
 glow=new THREE.MeshStandardMaterial({color:'#9ad8ff',emissive:'#4aa8ff',emissiveIntensity:1.6,roughness:.15,metalness:0,transparent:true,opacity:.9});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(),staff:buildStaff(),orb:new THREE.SphereGeometry(.036,16,12)};
 return S;
}
function mesh(parent,geo,name,m=material){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===material;o.userData.part=name;parent.add(o);return o;}

export function createWizard(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);arm.rotation.z=s*.06;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);weaponSocket.rotation.z=-.06;arms[1].add(weaponSocket);
 mesh(weaponSocket,S.staff,'staff');
 const orb=mesh(weaponSocket,S.orb,'orb',glow);orb.position.copy(ORB);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'wizard',arms,arm:arms[1],weaponSocket,orb,head,hat:null,beard:null,pick:null};
}
