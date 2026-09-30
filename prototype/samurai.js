import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The samurai (the player-monster role, and the hero's own starting role in NetHack) used to be
// the generic '@' humanoid. He now stands in lacquered o-yoroi style armour: a black-lacquered
// suji-bachi kabuto (a ribbed iron dome with a gilt tehen ring at the crown and a peaked visor),
// a gold crescent maedate rising from the brow, turned-back fukigaeshi at the temples and a
// four-tier shikoro flaring over the neck. A red-lacquered menpo covers the lower face with a
// white horsehair moustache; dark eyes and brows show above it. The do (cuirass) is rows of black
// lamellae laced in vermilion silk, with a gilt mon on the breast plate, over a white-and-gold
// obi; a skirt of seven kusazuri panels, laced the same way, hangs over wide indigo hakama. A
// wakizashi is thrust through the obi at the left hip, beside the empty lacquered katana saya.
// Laced sode plates hang from the shoulders over mail-and-plate kote sleeves; lacquered suneate
// guard the shins above white tabi and straw waraji. He holds a katana: a curved blade with a
// pale hamon edge, a round iron tsuba and a diamond-wrapped hilt.
// Each moving part (body, head, each leg and arm, the katana) is one merged, vertex-coloured mesh
// with one shared material: 7 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the sword arm), weaponSocket, head, body. The pivots match
// valkyrie.js and soldier.js (shoulders ±.215 at .82, hand .37 down the arm, legs ±.08 at .47,
// head at .955).

const SKIN=rgb('#dcb48e'),SKIN_SHADE=rgb('#b48a68'),EYE=rgb('#1c1410'),EYE_WHITE=rgb('#eee6da'),BROW=rgb('#1e1814');
const LACQUER=rgb('#1c1a1c'),LACQUER_HI=rgb('#4a464c'),LACQUER_RED=rgb('#8e1e1a'),LACQUER_RED_HI=rgb('#c8403a');
const LACE=rgb('#d8442a'),LACE_DARK=rgb('#8a2416'),GOLD=rgb('#dcae44'),GOLD_HI=rgb('#f6dc8a'),GOLD_DARK=rgb('#8e6a22');
const IRON=rgb('#3e4248'),STEEL=rgb('#a4abb2'),STEEL_HI=rgb('#e6eaee'),STEEL_DARK=rgb('#2c3034'),HAMON=rgb('#f4f6f8');
const INDIGO=rgb('#2a3458'),INDIGO_DARK=rgb('#161c34'),WHITE=rgb('#ece6d8'),WHITE_SHADE=rgb('#bcb4a4');
const SILK=rgb('#e8e2d2'),SILK_DARK=rgb('#2a2224'),SAME=rgb('#e2dccc'),STRAW=rgb('#c8a860'),STRAW_DARK=rgb('#8a7038');
const HORSEHAIR=rgb('#f2eee6'),HORSEHAIR_SHADE=rgb('#b8b2a6');

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
// laced lamellae: rows of lacquered scales, each row lit at its top edge and dark at its seam,
// with vertical pairs of silk lacing running down through every row
const lamellar=(rows,lo,hi,lace=40)=>(x,y,z)=>{
 const t=(y-lo)/(hi-lo)*rows,f=t-Math.floor(t),a=Math.atan2(x,z)*lace;
 if(Math.abs(Math.sin(a))>.8)return f<.12?LACE_DARK:LACE;
 if(f<.1)return LACQUER;
 return mix(LACQUER,LACQUER_HI,(f-.1)*.8);
};
// the same on a flat panel (sode): x across it, y down it
const panelLamellar=(rows,lo,hi,step)=>(x,y,z,u)=>{
 const t=(y-lo)/(hi-lo)*rows,f=t-Math.floor(t);
 if(Math.abs(Math.sin(u/step*Math.PI))>.8)return f<.12?LACE_DARK:LACE;
 return f<.1?LACQUER:mix(LACQUER,LACQUER_HI,(f-.1)*.8);
};

function buildBody(){
 const P=pieces();
 // wide indigo hakama at the hips, pleated
 P.add(lathe([[.17,.4],[.176,.5],[.168,.57]],32,0,Math.PI*2,3),at(0,0,0,[0,0,0],[1,1,.82]),(x,y,z)=>mix(INDIGO_DARK,INDIGO,(Math.sin(Math.atan2(x,z)*10)*.5+.5)*.7+(y-.4)*2));
 P.add(new THREE.CircleGeometry(.17,24),at(0,.401,0,[Math.PI/2,0,0],[1,.82,1]),INDIGO_DARK);
 // seven kusazuri panels hanging from the waist, flaring out over the hakama
 for(let i=0;i<7;i++){
  const w=Math.PI*2/7,start=i*w+.03+Math.PI/7;
  P.add(lathe([[.21,.385],[.19,.47],[.18,.55]],12,start,w-.06,6),at(0,0,0,[0,0,0],[1,1,.84]),lamellar(4,.385,.55,10));
 }
 // the do: rows of lamellae laced in vermilion, fuller over the chest, a solid breast plate
 P.add(lathe([[.178,.54],[.182,.62],[.19,.72],[.195,.78]],72,0,Math.PI*2,6),at(0,0,0,[0,0,0],[1,1,.82]),lamellar(6,.54,.78,12));
 P.add(lathe([[.195,.78],[.188,.83],[.15,.87],[.1,.9],[.07,.905]],36,0,Math.PI*2,2),at(0,0,0,[0,0,0],[1,1,.82]),(x,y)=>ramp(LACQUER,LACQUER_HI,.78,.9)(y));
 P.add(new THREE.TorusGeometry(.193,.006,5,40),at(0,.782,0,[Math.PI/2,0,0],[1,.82,1]),GOLD);
 // a gilt mon on the breast plate: a ring round three commas' worth of petals
 P.add(new THREE.TorusGeometry(.024,.004,5,18),at(0,.83,.154,[-.55,0,0]),GOLD_HI);
 for(let i=0;i<3;i++){const a=i/3*Math.PI*2;P.add(new THREE.SphereGeometry(.011,8,6),at(Math.sin(a)*.01,.83+Math.cos(a)*.01*.85,.152+Math.cos(a)*.005,[-.55,0,a],[1,.6,.4]),GOLD);}
 // a white obi with a gold stripe, knotted at the front
 P.add(new THREE.CylinderGeometry(.186,.186,.04,32,3,true),at(0,.555,0,[0,0,0],[1,1,.84]),(x,y)=>Math.abs(y-.555)<.006?GOLD:WHITE);
 P.add(new THREE.SphereGeometry(.022,10,8),at(.03,.555,.158,[0,0,0],[1.2,.8,.6]),WHITE_SHADE);
 // the wakizashi thrust through the obi at the left hip, hilt forward, beside the empty katana saya
 // each scabbard is built along its own +y (the mouth, forward and a little up) in the hip frame
 const hip=(dx,dz,m)=>at(-.2+dx,.555,dz,[0,.25,0]).multiply(at(0,0,0,[Math.PI/2-.25,0,0])).multiply(m);
 const saya=(len,r,dx,dz)=>{
  P.add(new THREE.CylinderGeometry(r,r*.9,len,8),hip(dx,dz,at(0,0,0)),LACQUER_RED);
  P.add(new THREE.CylinderGeometry(r*.95,r*.9,.02,8),hip(dx,dz,at(0,-len/2+.01,0)),GOLD_DARK);
  P.add(new THREE.CylinderGeometry(r*1.08,r*1.08,.012,8),hip(dx,dz,at(0,len/2-.006,0)),LACQUER);
 };
 saya(.5,.013,-.012,-.2);
 saya(.36,.012,.01,-.13);
 // the wakizashi's small tsuba and wrapped hilt, standing out of its saya in front of the hip
 P.add(new THREE.CylinderGeometry(.02,.02,.005,12),hip(.01,-.13,at(0,.183,0)),IRON);
 P.add(new THREE.CylinderGeometry(.01,.011,.09,6,4),hip(.01,-.13,at(0,.23,0)),(x,y,z)=>Math.sin(z*400+x*400)>.3?SILK_DARK:SAME);
 P.add(new THREE.CylinderGeometry(.011,.011,.01,6),hip(.01,-.13,at(0,.278,0)),GOLD_DARK);
 // nodowa throat guard and neck
 P.add(lathe([[.08,.895],[.075,.92],[.056,.94]],20),at(0,0,0),LACQUER);
 P.add(new THREE.CylinderGeometry(.04,.046,.07,12),at(0,.94,0),SKIN_SHADE);
 return P.merge();
}

// the gilt crescent maedate: two circles of radius R, one raised by d, cut from each other
function crescent(R,d,n=24){
 const s=new THREE.Shape(),al=Math.asin(d/(2*R));
 for(let i=0;i<=n;i++){const th=Math.PI-al+(Math.PI+2*al)*i/n;const x=R*Math.cos(th),y=R*Math.sin(th);i?s.lineTo(x,y):s.moveTo(x,y);}
 for(let i=1;i<n;i++){const th=-al-(Math.PI-2*al)*i/n;s.lineTo(R*Math.cos(th),d+R*Math.sin(th));}
 return new THREE.ExtrudeGeometry(s,{depth:.006,bevelEnabled:false,curveSegments:4});
}

function buildHead(){
 const P=pieces();
 // the face, dark eyes and brows above the menpo; head centre at y .1 in the head group
 P.add(new THREE.SphereGeometry(.095,18,14),at(0,.1,0,[0,0,0],[.88,1.04,.94]),(x,y,z)=>z<-.03?SKIN_SHADE:SKIN);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.013,8,6),at(s*.033,.108,.08,[0,0,0],[1.35,.7,.5]),EYE_WHITE);
  P.add(new THREE.SphereGeometry(.0075,8,6),at(s*.033,.108,.086),EYE);
  P.add(new THREE.BoxGeometry(.038,.009,.01),at(s*.035,.127,.084,[0,0,-s*.2]),BROW);
 }
 // the red-lacquered menpo over the lower face: a jutting chin, a nose guard, cheek flanges
 P.add(new THREE.SphereGeometry(.1,18,10,Math.PI*.08,Math.PI*.84,Math.PI*.52,Math.PI*.36),at(0,.1,.004,[0,0,0],[.93,1.05,1.02]),(x,y,z)=>ramp(LACQUER_RED,LACQUER_RED_HI,.02,.09)(y));
 P.add(new THREE.ConeGeometry(.016,.04,6),at(0,.088,.1,[Math.PI/2-.3,0,0]),LACQUER_RED_HI);
 P.add(new THREE.SphereGeometry(.022,10,8),at(0,.025,.075,[0,0,0],[1.2,.8,1]),LACQUER_RED);
 P.add(new THREE.BoxGeometry(.03,.004,.006),at(0,.05,.1),LACQUER);
 // the white horsehair moustache, sweeping down past the mouth slit
 for(const s of [-1,1])for(let i=0;i<3;i++)P.add(new THREE.ConeGeometry(.007,.05,5),at(s*(.014+i*.006),.058-i*.006,.1-i*.004,[0,0,-s*(2.3+i*.12)],[1,1,.6]),(x,y)=>mix(HORSEHAIR_SHADE,HORSEHAIR,(y-.02)*20));
 // throat plates (yodare-kake) hanging from the menpo chin
 for(let i=0;i<3;i++)P.add(lathe([[.07,0],[.074,.018]],14,-Math.PI*.4,Math.PI*.8),at(0,.004-i*.018,-.005,[0,0,0],[1,1,1.08]),(x,y)=>y>.004-i*.018+.012?LACE:LACQUER);
 // the kabuto: a ribbed iron dome, a gilt tehen ring at the crown, a peaked visor
 P.add(new THREE.SphereGeometry(.114,48,10,0,Math.PI*2,0,Math.PI*.5),at(0,.14,0,[0,0,0],[1,.92,1.06]),(x,y,z)=>Math.cos(Math.atan2(x,z)*12)>.7?LACQUER_HI:ramp(LACQUER,mix(LACQUER,LACQUER_HI,.5),.14,.25)(y));
 P.add(new THREE.TorusGeometry(.016,.005,6,16),at(0,.245,0,[Math.PI/2,0,0]),GOLD_HI);
 P.add(new THREE.CylinderGeometry(.117,.117,.016,28,1,true),at(0,.142,0,[0,0,0],[1,1,1.06]),GOLD_DARK);
 P.add(lathe([[.118,0],[.15,-.02],[.158,-.026]],18,-Math.PI*.36,Math.PI*.72),at(0,.14,0,[0,0,0],[1,1,1.08]),(x,y)=>y<.12?LACQUER_HI:LACQUER);
 // the shikoro: four tiers of laced lamellae flaring over the back and sides of the neck
 for(let i=0;i<4;i++){
  const r=.12+i*.022,y=.135-i*.04;
  P.add(lathe([[r,y],[r+.022,y-.045]],48,Math.PI*.3,Math.PI*1.4,2),at(0,0,-.004,[0,0,0],[1,1,1.05]),(x,yy,z)=>Math.abs(Math.sin(Math.atan2(x,z)*10))>.82?LACE:yy<y-.038?LACE_DARK:ramp(LACQUER,LACQUER_HI,y-.045,y)(yy));
 }
 // fukigaeshi turned back at the temples, lacquered with a gilt rim
 for(const s of [-1,1]){
  P.add(new THREE.BoxGeometry(.012,.07,.06),at(s*.132,.13,.05,[0,s*.7,s*.22]),(x,y,z)=>y>.155?GOLD:LACQUER);
  P.add(new THREE.SphereGeometry(.009,6,4),at(s*.14,.13,.075),GOLD_HI);
 }
 // the maedate: a gold crescent standing from a gilt socket on the brow
 P.add(new THREE.BoxGeometry(.03,.024,.012),at(0,.165,.118,[-.2,0,0]),GOLD_DARK);
 P.add(crescent(.12,.075),at(0,.28,.124,[-.12,0,0]),(x,y)=>mix(GOLD,GOLD_HI,(y-.17)*6));
 return P.merge();
}

// wide indigo hakama, lacquered suneate, white tabi and straw waraji
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.068,.082,.3,14,6),at(0,-.15,0),(x,y,z)=>mix(INDIGO_DARK,INDIGO,(Math.sin(Math.atan2(x,z)*5)*.5+.5)*.8));
 // the hakama gathered above the shin guard
 P.add(new THREE.TorusGeometry(.066,.014,6,16),at(0,-.3,0,[Math.PI/2,0,0]),INDIGO_DARK);
 // suneate: vertical lacquered splints joined by a gilt band at top and bottom, round the front
 P.add(lathe([[.052,-.42],[.058,-.3]],40,-Math.PI*.55,Math.PI*1.1,3),at(0,0,.004),(x,y,z)=>Math.cos(Math.atan2(x,z)*11)>.6?LACQUER_HI:y>-.315||y<-.405?GOLD_DARK:LACQUER);
 P.add(new THREE.CylinderGeometry(.045,.044,.12,12),at(0,-.36,0),WHITE_SHADE);
 // tabi and waraji with their straw ties
 P.add(new THREE.CylinderGeometry(.043,.045,.04,12),at(0,-.435,.005),WHITE);
 P.add(new THREE.SphereGeometry(.044,10,8),at(0,-.44,.055,[0,0,0],[.95,.5,1.6]),WHITE);
 P.add(new THREE.BoxGeometry(.09,.014,.165),at(0,-.463,.04),(x,y,z)=>Math.sin(z*260)>0?STRAW:STRAW_DARK);
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.008,.006,.07),at(s*.02,-.44,.07,[.3,s*.5,0]),STRAW_DARK);
 return P.merge();
}

// a kote sleeve of mail and splints over dark silk, a hand, and a laced sode plate hanging from the
// shoulder on the outside (side s)
function buildArm(s){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.06,14,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),SILK_DARK);
 P.add(new THREE.CylinderGeometry(.05,.045,.17,36,8),at(0,-.09,0),(x,y,z)=>Math.sin(Math.atan2(x,z)*18)*Math.sin(y*260)>.3?STEEL_DARK:SILK_DARK);
 P.add(new THREE.CylinderGeometry(.043,.036,.16,24,8),at(0,-.25,0),(x,y,z)=>Math.cos(Math.atan2(x,z)*6)>.55?LACQUER_HI:Math.sin(y*300)>.6?STEEL_DARK:SILK_DARK);
 P.add(new THREE.TorusGeometry(.04,.005,4,14),at(0,-.33,0,[Math.PI/2,0,0]),GOLD_DARK);
 // gauntlet back and hand
 P.add(new THREE.SphereGeometry(.031,10,8),at(0,-.37,.005,[0,0,0],[.85,1.15,.95]),SKIN);
 P.add(new THREE.SphereGeometry(.024,8,6,0,Math.PI,0,Math.PI),at(0,-.36,0,[0,s>0?Math.PI/2:-Math.PI/2,0],[1,1.2,1.2]),LACQUER);
 // the sode: a broad curved plate of five laced rows, hanging from the shoulder top
 const sode=lathe([[.084,.02],[.098,-.18]],16,s>0?Math.PI/2-.6:-Math.PI/2-.6,1.2,15),paint=panelLamellar(5,.02,-.18,.03);
 P.add(sode,at(0,0,0),(x,y,z)=>paint(x,y,z,z));
 P.add(new THREE.TorusGeometry(.012,.003,4,10),at(s*.086,.025,0,[0,Math.PI/2,0]),GOLD);
 return P.merge();
}

// a katana held forward and up: a gently curved blade with a pale hamon edge, a round iron tsuba,
// a diamond-wrapped hilt with a gilt kashira. Built along +y from the grip.
function buildKatana(){
 const P=pieces(),len=.6,segs=12;
 const blade=new THREE.BoxGeometry(.006,len,.024,1,segs,3),p=blade.attributes.position;
 for(let i=0;i<p.count;i++){
  const t=(p.getY(i)+len/2)/len,tip=t>.9?(t-.9)/.1:0;
  // taper toward the point (kissaki) and curve back (sori), edge forward at +z
  p.setZ(i,p.getZ(i)*(1-tip*.85)+(p.getZ(i)>0?0:tip*.01)-t*t*.05);
  p.setX(i,p.getX(i)*(1-t*.4));
 }
 blade.computeVertexNormals();
 P.add(blade,at(0,.07+len/2,0),(x,y,z)=>{const t=(y-.07)/len;return z>.004-t*t*.05?HAMON:STEEL;});
 P.add(new THREE.BoxGeometry(.012,.018,.03),at(0,.068,-.001),GOLD);
 P.add(new THREE.CylinderGeometry(.036,.036,.006,20),at(0,.056,0),(x,y,z)=>Math.hypot(x,z)>.03?STEEL_DARK:IRON);
 P.add(new THREE.CylinderGeometry(.013,.012,.13,6,6),at(0,-.012,0,[0,0,0],[.75,1,1]),(x,y,z)=>Math.abs(Math.sin(y*110+Math.atan2(x,z)*2))>.6?SILK_DARK:SAME);
 P.add(new THREE.CylinderGeometry(.012,.013,.014,8),at(0,-.082,0,[0,0,0],[.75,1,1]),GOLD_DARK);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.45,metalness:.2,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arms:[buildArm(-1),buildArm(1)],katana:buildKatana()};
 return S;
}
function mesh(parent,geo,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createSamurai(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 [-1,1].forEach((s,i)=>{
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);arm.rotation.z=s*.06;body.add(arm);mesh(arm,S.arms[i],'arm');arms.push(arm);
 });
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);weaponSocket.rotation.set(.35,0,-.06);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.katana,'katana');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'samurai',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
