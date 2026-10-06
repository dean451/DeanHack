import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Charon (UnNetHack's ferryman of the Styx) shares the humans' letter, so he used to be the plain
// `@` humanoid. He now looms as a tall, gaunt, hunched ferryman. A deep, ragged hood comes to a
// point bent back over a hump of spine and shadows a skull-thin face: grey-green skin drawn tight
// over the cheekbones, sunken black sockets with ember-red eyes burning in them (Dante's "eyes of
// burning coal"), and a long, thin white beard hanging in wisps to the chest. His robe is the
// colour of river murk, falling in long folds to the floor; the hem is soaked black and slimed
// green with Styx water, and it is torn into points that trail on the ground. A knotted rope
// girdle holds a fat leather purse; round his neck hangs a cord strung with the gold obols paid
// for passage. Wide sleeves torn at the cuffs show bony forearms and long, clawed grey fingers.
// Only the tips of his bare, bony toes show under the hem. In his right hand he carries his oar
// upright: a long, warped black shaft bound with iron, the broad blade nicked and split, dark with
// wet and crusted with verdigris, and an iron ring at its throat hung with three more coins.
// Each moving part (body, head, each leg and arm, the oar) is one merged, vertex-coloured mesh on
// one shared material, plus one small glowing mesh for the eyes: 8 draws. Geometry is built once and
// shared.
// Handles: legs, arms, arm (the oar arm), weaponSocket, head, eyes, body.

const C={
 skin:rgb('#7c8676'),skinDark:rgb('#3e463c'),skinHi:rgb('#a8b09e'),bone:rgb('#c4c0a6'),shadow:rgb('#040404'),
 robe:rgb('#26282a'),robeDark:rgb('#0e0f10'),robeHi:rgb('#3e4244'),wet:rgb('#07090a'),slime:rgb('#2e4a30'),slimeHi:rgb('#5a7a44'),
 beard:rgb('#d8d6cc'),beardDark:rgb('#8c8a80'),
 rope:rgb('#5a4a32'),ropeHi:rgb('#86704c'),purse:rgb('#3a2616'),purseHi:rgb('#5e4028'),
 gold:rgb('#c89a32'),goldHi:rgb('#f0d070'),goldDark:rgb('#7a5a18'),
 wood:rgb('#141210'),woodHi:rgb('#2e2820'),iron:rgb('#2c2e30'),ironHi:rgb('#62666a'),verdigris:rgb('#3e7a66'),
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
// a ring of downward-hanging torn points along an arc of a hem (angles a0..a1, radius r, depth zs)
function tatters(P,count,r,y,zs,a0,a1,len,w,colour,seed){
 for(let i=0;i<count;i++){
  const a=a0+(i+.5+(hash(seed+i)-.5)*.4)/count*(a1-a0),h=len*(.5+hash(seed+i+40)*.8);
  P.add(new THREE.ConeGeometry(w,h,4),at(Math.sin(a)*r,y-h/2,Math.cos(a)*r*zs,[0,a,Math.PI],[1,1,.3]),colour);
 }
}
// one gold obol, a thin stamped disc facing +z before the matrix
function obol(P,x,y,z,r=[0,0,0],size=.016){
 P.add(new THREE.CylinderGeometry(size,size,.004,10),at(x,y,z,[Math.PI/2+r[0],r[1],r[2]]),(px,py,pz)=>{
  const d=Math.hypot(px-x,py-y);
  return d>size*.8?C.goldDark:hash(Math.floor(px*900)+Math.floor(py*900)*3)>.6?C.goldHi:C.gold;
 });
}

export const HIP_Y=.47,SHOULDER_Y=.83,NECK_Y=.95;

// the robe: river-murk folds from the shoulders to the floor, the hem soaked and slimed
const robe=(x,y,z)=>{
 const fold=Math.sin(Math.atan2(x,z)*13+y*2)*.5+.5;
 let c=mix(C.robeDark,C.robe,fold*.75+clamp01((y-.3)*1.2)*.25);
 if(fold>.92&&y>.2)c=mix(c,C.robeHi,.5);
 // the soaked hem, going up in a ragged waterline
 const line=.2+hash(Math.floor(Math.atan2(x,z)*9)+5)*.08;
 if(y<line){
  c=mix(c,C.wet,clamp01((line-y)*9));
  const s=hash(Math.floor(x*60)*7+Math.floor(y*60)*13+Math.floor(z*60));
  if(y<line-.05&&s>.62)c=mix(c,s>.86?C.slimeHi:C.slime,.85);
 }
 return c;
};

function buildBody(){
 const P=pieces();
 // the robe, narrow at the waist and flaring to the floor; the chest is sunken, the back hunched
 P.add(lathe([[.235,.035],[.225,.09],[.2,.22],[.175,.38],[.15,.52],[.145,.6],[.16,.7],[.18,.8],[.17,.86],[.12,.91],[.05,.935]],40),at(0,0,0,[0,0,0],[1,1,.82]),robe);
 P.add(new THREE.CircleGeometry(.235,32),at(0,.035,0,[Math.PI/2,0,0],[1,.82,1]),C.wet);
 // the torn hem, trailing points on the floor
 tatters(P,22,.233,.04,.82,0,Math.PI*2,.045,.03,(x,y,z)=>mix(C.wet,C.slime,hash(Math.floor(x*80)+Math.floor(z*80)*5)*.7),17);
 // the hump of the spine under the robe, pushing the hood forward
 P.add(new THREE.SphereGeometry(.12,18,12),at(0,.86,-.07,[0,0,0],[1.15,.75,.9]),robe);
 // long folds down the front, two deep creases either side of the girdle
 for(const s of [-1,1])P.add(new THREE.CylinderGeometry(.012,.022,.48,6),at(s*.07,.27,.17,[-.12,0,s*.04]),(x,y,z)=>robe(x,y,z).map(v=>v*.7));
 // the knotted rope girdle, its ends hanging down the front
 P.add(new THREE.TorusGeometry(.152,.011,5,36),at(0,.56,0,[Math.PI/2,0,0],[1,.82,1]),(x,y,z)=>Math.sin(Math.atan2(x,z)*40)>.3?C.ropeHi:C.rope);
 P.add(new THREE.SphereGeometry(.02,8,6),at(.03,.555,.125),C.rope);
 for(const [dx,len] of [[.022,.2],[.042,.15]]){
  limb(P,[dx,.55,.128],[dx+.012,.55-len,.15],.008,.006,(x,y)=>Math.sin(y*300)>0?C.ropeHi:C.rope,5);
  P.add(new THREE.ConeGeometry(.012,.03,5),at(dx+.012,.53-len,.15,[Math.PI,0,0]),C.rope);// the frayed end
 }
 // a fat leather purse on the girdle at the left hip, tied at the neck, an obol showing at the mouth
 P.add(new THREE.SphereGeometry(.05,12,10),at(-.13,.47,.07,[0,0,.2],[.9,1.05,.75]),(x,y,z)=>mix(C.purse,C.purseHi,clamp01((z-.05)*20)*.6));
 P.add(new THREE.TorusGeometry(.024,.006,4,12),at(-.122,.515,.07,[Math.PI/2,0,0]),C.rope);
 P.add(new THREE.ConeGeometry(.028,.04,8),at(-.12,.54,.07),C.purseHi);
 obol(P,-.11,.548,.085,[-.5,0,.3],.012);
 // a cord round the neck strung with obols, hanging low over the sunken chest
 for(let i=0;i<=20;i++){
  const t=i/20-.5,x=t*.22,y=.875-Math.cos(t*Math.PI)*.12,z=.145-Math.abs(t)*.13+(1-Math.abs(t)*2)*.012;
  P.add(new THREE.SphereGeometry(.0045,4,3),at(x,y,z),C.rope);
 }
 for(let i=0;i<7;i++){
  const t=(i-3)/7,x=t*.22,y=.86-Math.cos(t*Math.PI)*.12,z=.155-Math.abs(t)*.13+(1-Math.abs(t)*2)*.012;
  obol(P,x,y,z,[-.25,t*1.4,hash(i)*.8],.0135+hash(i+9)*.004);
 }
 // the sinewy neck
 P.add(new THREE.CylinderGeometry(.036,.048,.08,12),at(0,.93,.02,[.2,0,0]),(x,y,z)=>Math.abs(Math.sin(x*80))<.18&&z>.02?C.skinHi:C.skinDark);
 return P.merge();
}

// the face: skin drawn tight on the skull, sunken sockets, hollow cheeks; head centre at .1
const SOCKET_Y=.112,SOCKET_X=.028;
function face(x,y,z){
 for(const s of [-1,1]){const d=Math.hypot(x-s*SOCKET_X,(y-SOCKET_Y)*1.3);if(z>.03&&d<.021)return mix(C.shadow,C.skinDark,clamp01((d-.012)*80));}
 let c=mix(C.skinDark,C.skin,clamp01(z*14+.2));
 // the cheekbones catch the light; under them the cheeks sink in
 for(const s of [-1,1]){
  if(Math.hypot(x-s*.04,y-.085)<.016&&z>.04)c=mix(c,C.skinHi,.55);
  if(Math.hypot(x-s*.035,y-.058)<.018&&z>.03)c=mix(c,C.shadow,.5);
 }
 // the thin, lipless mouth
 if(z>.05&&Math.abs(y-.04)<.003&&Math.abs(x)<.018)return C.shadow;
 return c;
}
function buildHead(){
 const P=pieces();
 // the skull-thin face, long in the jaw
 P.add(new THREE.SphereGeometry(.07,22,16),at(0,.1,0,[0,0,0],[.82,1.12,.95]),face);
 P.add(new THREE.ConeGeometry(.044,.07,14),at(0,.042,.022,[Math.PI+.25,0,0],[1,1,.85]),face);
 // the jutting brow over the sockets, and a long thin nose
 P.add(new THREE.BoxGeometry(.088,.012,.03),at(0,.137,.05,[.25,0,0]),C.skinDark);
 P.add(new THREE.ConeGeometry(.009,.04,4),at(0,.095,.07,[-.35,0,0]),(x,y,z)=>mix(C.skinDark,C.skinHi,clamp01((z-.06)*60)));
 // the long, thin white beard hanging in wisps from the chin, the moustache drooping into it
 const beard=(x,y,z)=>mix(C.beardDark,C.beard,clamp01((y+.15)*4)*.6+hash(Math.floor(x*300))*.4);
 for(let i=0;i<9;i++){
  const t=(i-4)/4,len=.12+hash(i+21)*.13-Math.abs(t)*.05;
  limb(P,[t*.03,.03,.055-Math.abs(t)*.012],[t*.04+(hash(i+3)-.5)*.03,.03-len,.07+hash(i+7)*.02],.009,.0015,beard,5);
 }
 for(const s of [-1,1])limb(P,[s*.012,.052,.066],[s*.03,.0,.066],.004,.0015,beard,4);
 // the deep hood, open at the face, coming to a ragged point bent back over the hump
 const hood=(x,y,z)=>{
  let c=mix(C.robeDark,C.robe,clamp01(y*3+.2)*.7+(Math.sin(Math.atan2(x,z)*7)*.5+.5)*.3);
  // the shadowed inside of the hood near the face
  if(z>.04&&Math.abs(x)<.11)c=mix(c,C.shadow,clamp01((z-.04)*9)*.6);
  return c;
 };
 P.add(new THREE.SphereGeometry(.118,28,18,Math.PI/2+.72,Math.PI*2-1.44,0,Math.PI*.78),at(0,.11,-.012,[0,0,0],[.94,1.12,1.05]),hood);
 P.add(new THREE.SphereGeometry(.112,28,18,Math.PI/2+.72,Math.PI*2-1.44,0,Math.PI*.78),at(0,.11,-.012,[0,0,0],[.94,1.12,1.05]),C.robeDark);
 // the brim, a thick ragged lip arching over the face
 P.add(new THREE.TorusGeometry(.09,.012,5,20,Math.PI),at(0,.112,.075,[-.35,0,0],[1,1.15,1]),(x,y,z)=>mix(C.robe,C.robeHi,hash(Math.floor(x*120))*.6));
 tatters(P,6,.09,.21,.6,-.8,.8,.035,.014,C.robe,71);
 // the point: two cones bending back and down
 P.add(new THREE.ConeGeometry(.07,.11,14),at(0,.24,-.04,[-.55,0,0]),hood);
 P.add(new THREE.ConeGeometry(.032,.09,10),at(0,.29,-.11,[-1.35,0,0]),hood);
 // the hood falls over the shoulders as a mantle, its edge torn
 P.add(lathe([[.09,.02],[.15,-.02],[.21,-.06],[.235,-.085]],32),at(0,0,-.02,[0,0,0],[1,1,.86]),(x,y,z)=>mix(C.robeDark,C.robe,clamp01((y+.09)*10)));
 tatters(P,18,.232,-.083,.86,0,Math.PI*2,.06,.03,C.robeDark,91);
 return P.merge();
}
// ember-red eyes burning deep in the sockets
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.009,8,6),at(s*SOCKET_X,SOCKET_Y,.058,[0,0,-s*.3],[1.3,.75,.6]),[1,1,1]);
 return P.merge();
}

// a bony shin hidden in the robe and a bare, bony foot whose long toes poke out under the hem
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.034,.026,.38,8),at(0,-.22,0),C.skinDark);
 limb(P,[0,-.4,0],[0,-.44,.08],.026,.024,C.skinDark,8);// the long instep
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,-.445,.11,[0,0,0],[.9,.5,1.8]),(x,y,z)=>mix(C.skinDark,C.skin,clamp01((y+.45)*30)));
 for(let k=0;k<4;k++){
  const x=-.018+k*.012,len=.06-k*.008;
  limb(P,[x,-.45,.15],[x*1.2,-.462,.15+len],.0065,.004,C.skin,5);
  P.add(new THREE.ConeGeometry(.004,.014,4),at(x*1.2,-.464,.157+len,[Math.PI/2+.4,0,0]),C.bone);// a yellowed claw
 }
 return P.merge();
}

// a wide, torn sleeve over a bony forearm and a long, clawed grey hand curled round a grip
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.062,14,10),at(0,-.01,0),robe);
 P.add(lathe([[.056,0],[.06,-.1],[.075,-.2],[.095,-.27]],16),at(0,0,0),(x,y,z)=>robe(x,y+.5,z));
 P.add(lathe([[.093,-.27],[.08,-.268],[.06,-.24]],16),at(0,0,0),C.robeDark);// the dark inside of the cuff
 tatters(P,9,.094,-.265,1,0,Math.PI*2,.06,.022,(x,y,z)=>robe(x,y+.5,z),33);
 // the forearm, all tendon and bone, and the knobbed wrist
 limb(P,[0,-.2,0],[0,-.34,.006],.025,.019,(x,y,z)=>Math.abs(Math.sin(x*140))<.2?C.skinHi:C.skinDark,8);
 P.add(new THREE.SphereGeometry(.022,8,6),at(0,-.345,.006),C.skin);
 // the long hand, the fingers curled round a grip, yellow claws at their tips
 P.add(new THREE.SphereGeometry(.028,10,8),at(0,-.375,.008,[0,0,0],[.85,1.2,.75]),C.skin);
 for(let k=0;k<4;k++){
  const x=-.018+k*.012;
  limb(P,[x,-.395,.012],[x,-.4,.045],.0065,.0055,C.skin,5);
  limb(P,[x,-.4,.045],[x,-.375,.058],.0055,.0045,C.skinDark,5);
  P.add(new THREE.ConeGeometry(.0045,.016,4),at(x,-.364,.058,[.2,0,0]),C.bone);
 }
 limb(P,[.022,-.37,.012],[.03,-.395,.045],.008,.006,C.skin,5);// the thumb
 return P.merge();
}

// The oar, held upright: a warped black shaft bound with iron, the broad blade at the top nicked and
// split, dark with wet and crusted with verdigris, an iron ring at the throat hung with three
// obols. Built along +y from the grip, the blade's flat facing +z.
function buildOar(){
 const P=pieces();
 // the shaft, with a slight warp along its length
 const shaft=(x,y,z)=>{
  if(Math.abs(y)<.07)return Math.sin(y*240)>0?C.rope:C.ropeHi;// the rope-wrapped grip
  if(Math.abs(y-.28)<.012||Math.abs(y+.26)<.012)return C.ironHi;// iron bands
  return mix(C.wood,C.woodHi,(Math.sin(Math.atan2(x,z)*3+y*13)*.5+.5)*.6);
 };
 for(let i=0;i<6;i++){
  const y0=-.42+i*.16,y1=y0+.16,b=(y)=>Math.sin((y+.42)*3.2)*.012;
  limb(P,[b(y0),y0,0],[b(y1),y1,0],.015-i*.0005,.015-(i+1)*.0005,shaft,8);
 }
 P.add(new THREE.SphereGeometry(.019,8,6),at(.0,-.42,0,[0,0,0],[1,.7,1]),C.iron);// the iron-shod butt
 // the throat, flaring into the blade, with its iron ring and the coins hung on it
 P.add(new THREE.CylinderGeometry(.03,.013,.08,8),at(-.008,.54,0,[0,0,0],[1,1,.45]),C.wood);
 P.add(new THREE.TorusGeometry(.032,.005,5,14),at(-.004,.48,.0,[Math.PI/2,0,0]),C.ironHi);
 for(let i=0;i<3;i++){
  const a=-.9+i*.9,x=-.004+Math.sin(a)*.03,z=Math.cos(a)*.032;
  P.add(new THREE.TorusGeometry(.0055,.0018,4,8),at(x,.468,z,[0,a,0]),C.iron);
  obol(P,x*1.1,.448-hash(i)*.01,z*1.15,[0,a,hash(i+4)*.5],.012);
 }
 // the blade: a long, broad paddle drawn in x/y, nicked along its edges and split at the tip
 const s=new THREE.Shape(),pts=[];
 for(let k=0;k<=14;k++){const t=k/14,y=.56+t*.38,w=.028+Math.sin(Math.min(1,t*1.6)*Math.PI/2)*.042-(t>.85?(t-.85)*.2:0);pts.push([w-(hash(k+30)>.78?.01:0),y]);}
 s.moveTo(0,.55);
 for(const [w,y] of pts)s.lineTo(w,y);
 s.lineTo(.012,.955);s.lineTo(.003,.88);s.lineTo(-.008,.95);// the split at the tip
 for(const [w,y] of pts.slice().reverse())s.lineTo(-w+(hash(Math.floor(y*100))>.8?.009:0),y);
 s.lineTo(0,.55);
 const blade=new THREE.ExtrudeGeometry(s,{depth:.012,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1}).translate(-.004,0,-.006);
 P.add(blade,null,(x,y,z)=>{
  let c=mix(C.wood,C.woodHi,(Math.sin(x*90+y*8)*.5+.5)*.5);
  // the wet, nearly black lower blade, the line where it dips into the river
  if(y<.75)c=mix(c,C.wet,clamp01((.75-y)*8)*.7);
  // verdigris crusting the edges
  const edge=Math.abs(x)/(.07*clamp01((y-.55)*4)+.03);
  if(edge>.7&&hash(Math.floor(y*90)*5+Math.floor(x*90))>.4)c=mix(c,C.verdigris,.7);
  return c;
 });
 // a raised spine down the blade's face
 P.add(new THREE.BoxGeometry(.012,.3,.022),at(0,.72,0),(x,y,z)=>mix(C.wood,C.wet,clamp01((.75-y)*6)));
 const geo=P.merge();
 geo.applyMatrix4(at(0,0,0,[.12,0,-.06],[.92,.92,.92]));
 return geo;
}

let S=null;
function geometry(){
 if(!S)S={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:buildArm(),oar:buildOar(),
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:.08,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#ffd8b0',emissive:'#ff3a0a',emissiveIntensity:2.2,roughness:.3,metalness:0})};
 return S;
}
function mesh(parent,geo,name,m){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===S.hide;o.userData.part=name;parent.add(o);return o;}

export function createCharon(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.3);
 mesh(body,S.body,'body',S.hide);
 const head=new THREE.Group();head.position.set(0,NECK_Y,.05);head.rotation.x=.16;body.add(head);// thrust forward off the hump, looking down
 mesh(head,S.head,'head',S.hide);const eyes=mesh(head,S.eyes,'eyes',S.glow);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.075,HIP_Y,0);body.add(leg);mesh(leg,S.leg,'leg',S.hide);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.2,SHOULDER_Y,0);arm.rotation.z=s*.1;body.add(arm);mesh(arm,S.arm,'arm',S.hide);arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.385,.035);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.oar,'oar',S.hide);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'charon',arms,arm:arms[1],weaponSocket,head,eyes,hat:null,beard:null,pick:null};
}
