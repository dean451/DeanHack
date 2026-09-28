import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The Minetown watch used to be the generic guard humanoid (a steel block with a plumed can and a
// spear). A watchman now wears a mail shirt under a green tabard with a gold border and a tower
// badge, a belt with a brass buckle, a pouch and a whistle on a cord, dark hose and turned-down
// boots, and an iron kettle hat. He carries a halberd planted at his side and a lit hand lantern.
// The watch captain wears a darker tabard with a wider gold border, a red sash, gold epaulettes
// and a short cape, a crested helmet with a green plume, and holds an upright arming sword.
// Each moving part is one merged, vertex-coloured mesh with a shared material; the lantern's flame
// has its own glowing material. Watchman 9 draws, captain 7. Geometry is built once per kind.
// Handles: legs, arms, arm (the weapon arm), weaponSocket, head, body, like the priest and nurse.

const SKIN=rgb('#dcb08c'),SKIN_SHADE=rgb('#b48462'),EYE=rgb('#1a1410'),LIPS=rgb('#a86458');
const HAIR=rgb('#4a3222'),HAIR_DARK=rgb('#2a1c12');
const MAIL=rgb('#8e949a'),MAIL_DARK=rgb('#44484e');
const IRON=rgb('#5c6268'),IRON_LIT=rgb('#9aa2aa'),STEEL=rgb('#c4cad0');
const GOLD=rgb('#d8aa3a'),GOLD_DARK=rgb('#8a6420'),BRASS=rgb('#c0923a');
const LEATHER=rgb('#5a3a22'),LEATHER_DARK=rgb('#33200f'),HOSE=rgb('#3a3430'),SOLE=rgb('#241a12');
const WOOD=rgb('#7a5436'),WOOD_DARK=rgb('#4a321e'),RED=rgb('#a8242a'),RED_DARK=rgb('#6a1418');
const GLASS=rgb('#f4d890'),BLACK=rgb('#1c1a18');

const KINDS={
 watchman:{tabard:rgb('#2f7a3a'),trim:.018,captain:false},
 'watch captain':{tabard:rgb('#1d5428'),trim:.03,captain:true},
};

const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
// riveted mail: a fine grid of light rings on dark links, darker toward the hem
const mail=(lo,hi)=>(x,y,z)=>{const a=Math.atan2(x,z),ring=Math.sin(a*36)*Math.sin(y*240);return mix(ramp(MAIL_DARK,MAIL,lo,hi)(y),MAIL_DARK,ring>.3?.55:0);};

function buildBody(k){
 const P=pieces(),{tabard,trim,captain}=k,tabardDark=mix(tabard,[0,0,0],.35);
 // the mail shirt: hauberk to the upper thigh, a thick chest and square shoulders
 P.add(lathe([[.148,.4],[.162,.44],[.158,.56],[.15,.62],[.162,.72],[.176,.8],[.168,.865],[.1,.915],[.05,.925],[0,.927]],36),at(0,0,0,[0,0,0],[1,1,.76]),mail(.4,.86));
 P.add(new THREE.CircleGeometry(.148,24),at(0,.401,0,[Math.PI/2,0,0],[1,.76,1]),MAIL_DARK);
 // the tabard, front and back panels with a gold border; the front carries the watch's badge
 const panel=(x,y)=>Math.abs(x)>.12-trim||y<-.23+trim?(captain?GOLD:mix(GOLD,GOLD_DARK,.2)):ramp(tabardDark,tabard,-.23,.1)(y);
 for(const s of [1,-1])P.add(new THREE.BoxGeometry(.24,.46,.012,16,24,1),at(0,.65,s*.135,[s*-.04,0,0]),panel);
 // shoulder seams joining the panels
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.07,.012,.27),at(s*.085,.868,0),tabard);
 // belt cinching the tabard, brass buckle and a pouch on the right hip
 P.add(new THREE.TorusGeometry(.162,.014,6,32),at(0,.6,0,[Math.PI/2,0,0],[1,.9,1]),LEATHER);
 P.add(new THREE.BoxGeometry(.045,.036,.012),at(0,.6,.148),BRASS);
 P.add(new THREE.BoxGeometry(.022,.018,.014),at(0,.6,.149),LEATHER_DARK);
 P.add(new THREE.BoxGeometry(.07,.08,.035),at(.13,.54,.07,[0,.5,0]),(x,y)=>ramp(LEATHER_DARK,LEATHER,-.04,.04)(y));
 P.add(new THREE.BoxGeometry(.074,.03,.04),at(.13,.575,.07,[-.15,.5,0]),LEATHER_DARK);
 // neck with a mail collar
 P.add(new THREE.CylinderGeometry(.042,.048,.08,10),at(0,.935,0),SKIN_SHADE);
 P.add(lathe([[.07,.955],[.095,.925],[.1,.9]],24),at(0,0,0,[0,0,0],[1,1,.85]),mail(.88,.96));
 if(!captain){
  // gold roundel badge with a dark watch-tower on the chest
  P.add(new THREE.CircleGeometry(.038,20),at(0,.77,.144,[-.04,0,0]),GOLD);
  P.add(new THREE.TorusGeometry(.038,.004,4,20),at(0,.77,.144,[-.04,0,0]),GOLD_DARK);
  P.add(new THREE.BoxGeometry(.022,.036,.004),at(0,.763,.147,[-.04,0,0]),tabardDark);
  for(const x of [-.009,0,.009])P.add(new THREE.BoxGeometry(.006,.008,.004),at(x,.785,.147,[-.04,0,0]),tabardDark);
  // a brass whistle on a cord from the left shoulder
  P.add(new THREE.CylinderGeometry(.0025,.0025,.16,4),at(-.07,.8,.14,[0,0,-.35]),LEATHER_DARK);
  P.add(new THREE.CylinderGeometry(.008,.008,.04,8),at(-.045,.715,.148,[0,0,1.3]),BRASS);
 }else{
  // red sash from the right shoulder to the left hip, knotted with tails
  P.add(new THREE.BoxGeometry(.055,.44,.012,1,12,1),at(0,.69,.146,[-.03,0,-.72]),(x,y)=>ramp(RED_DARK,RED,-.22,.22)(y));
  P.add(new THREE.BoxGeometry(.055,.44,.012,1,12,1),at(0,.69,-.146,[.03,0,.72]),RED_DARK);
  P.add(new THREE.SphereGeometry(.03,10,8),at(-.14,.55,.08,[0,0,0],[1,1,.6]),RED);
  for(const s of [-1,1])P.add(new THREE.BoxGeometry(.03,.12,.008),at(-.15+s*.012,.48,.09,[0,.9,s*.15]),RED_DARK);
  // gold gorget at the throat
  P.add(new THREE.CylinderGeometry(.05,.06,.018,5,1,false,-Math.PI*.4,Math.PI*.8),at(0,.87,.1,[-.9,0,0]),GOLD);
  // short cape hung from the shoulders, open at the front
  P.add(lathe([[.2,.88],[.215,.8],[.25,.6],[.27,.38]],18,Math.PI-1.25,2.5),at(0,0,-.02,[0,0,0],[1,1,.8]),(x,y)=>ramp(RED_DARK,tabardDark,.38,.88)(y));
  P.add(new THREE.TorusGeometry(.19,.012,5,18,2.5),at(0,.885,-.02,[Math.PI/2,0,Math.PI/2+1.25],[1,.8,1]),GOLD);
 }
 return P.merge();
}

function buildHead(k){
 const P=pieces(),{captain,tabard}=k;
 // a squarer face with a heavy jaw, a broad nose and a drooping moustache
 P.add(new THREE.SphereGeometry(.1,18,14),at(0,.1,0,[0,0,0],[.9,1.05,.95]),SKIN);
 P.add(new THREE.BoxGeometry(.11,.06,.08),at(0,.045,.035),(x,y)=>mix(SKIN,SKIN_SHADE,.3));
 P.add(new THREE.ConeGeometry(.016,.04,5),at(0,.088,.1,[Math.PI/2-.35,0,0]),SKIN_SHADE);
 P.add(new THREE.SphereGeometry(.014,8,6),at(0,.048,.078,[0,0,0],[1.5,.4,.6]),LIPS);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.021,8,6),at(s*.092,.095,-.005,[0,0,0],[.5,1,.8]),SKIN_SHADE);
  P.add(new THREE.SphereGeometry(.012,8,6),at(s*.035,.108,.086,[0,0,0],[1.3,.8,.6]),EYE);
  P.add(new THREE.BoxGeometry(.04,.01,.012),at(s*.036,.128,.088,[0,0,s*.1]),HAIR_DARK);
  P.add(new THREE.SphereGeometry(.018,8,6),at(s*.022,.064,.089,[0,0,s*-.5],[1.6,.55,.6]),HAIR);
 }
 // a fringe of hair under the helmet at the back and sides
 P.add(new THREE.SphereGeometry(.104,16,8,Math.PI*.35,Math.PI*1.3,Math.PI*.3,Math.PI*.3),at(0,.1,-.005),HAIR_DARK);
 if(!captain){
  // iron kettle hat: a round crown with a raised rib, a sloping brim, rivets and a chin strap
  P.add(new THREE.SphereGeometry(.112,20,10,0,Math.PI*2,0,Math.PI*.5),at(0,.13,0,[0,0,0],[1,1.05,1]),(x,y)=>ramp(IRON,IRON_LIT,.15,.25)(y));
  P.add(new THREE.TorusGeometry(.112,.004,4,20,Math.PI),at(0,.13,0,[0,Math.PI/2,0],[1,1.05,1]),IRON_LIT);
  P.add(lathe([[.108,.132],[.16,.108],[.172,.098],[.168,.094],[.105,.124]],28),at(0,0,0),(x,y)=>y<.1?IRON_LIT:IRON);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;P.add(new THREE.SphereGeometry(.006,5,4),at(Math.sin(a)*.112,.138,Math.cos(a)*.112),IRON_LIT);}
  for(const s of [-1,1])P.add(new THREE.BoxGeometry(.008,.1,.012),at(s*.088,.075,.02,[0,0,s*-.12]),LEATHER_DARK);
 }else{
  // a crested burgonet: a polished skull, a comb with a gold edge, a peak and hinged cheek guards,
  // and a green plume sweeping back from a gold holder
  P.add(new THREE.SphereGeometry(.114,20,12,0,Math.PI*2,0,Math.PI*.55),at(0,.12,0,[0,0,0],[1,1.05,1.05]),(x,y)=>ramp(IRON_LIT,STEEL,.14,.24)(y));
  P.add(new THREE.CylinderGeometry(.118,.118,.014,24,1,true),at(0,.13,0,[0,0,0],[1,1,1.05]),GOLD);
  P.add(new THREE.CylinderGeometry(.14,.14,.008,24,1,false,-Math.PI*.4,Math.PI*.8),at(0,.13,.012),STEEL);
  P.add(new THREE.TorusGeometry(.1,.02,4,20,Math.PI),at(0,.2,0,[0,Math.PI/2,0],[1,.55,.5]),IRON_LIT);
  P.add(new THREE.TorusGeometry(.105,.005,4,20,Math.PI),at(0,.205,0,[0,Math.PI/2,0],[1,.6,1]),GOLD);
  for(const s of [-1,1])P.add(new THREE.BoxGeometry(.012,.08,.07),at(s*.1,.07,.02,[0,0,s*-.12]),STEEL);
  P.add(new THREE.CylinderGeometry(.012,.016,.04,8),at(0,.25,-.04,[-.5,0,0]),GOLD);
  for(let i=0;i<5;i++)P.add(new THREE.SphereGeometry(.03-i*.003,10,8),at(0,.27+Math.sin(i*.6)*.02,-.06-i*.035,[.4,0,0],[.8,.55,1.6]),mix(tabard,[.6,.9,.55],.25-i*.05));
 }
 return P.merge();
}

// Dark hose and a boot turned down below the knee.
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.052,.042,.24,10),at(0,-.12,0),HOSE);
 P.add(new THREE.CylinderGeometry(.046,.042,.22,12),at(0,-.33,.005),(x,y)=>ramp(LEATHER_DARK,LEATHER,-.44,-.22)(y));
 P.add(new THREE.CylinderGeometry(.056,.05,.045,12),at(0,-.225,.005),LEATHER);
 P.add(new THREE.SphereGeometry(.046,10,8),at(0,-.43,.055,[0,0,0],[.95,.6,1.7]),LEATHER);
 P.add(new THREE.BoxGeometry(.085,.018,.17),at(0,-.458,.045),SOLE);
 return P.merge();
}

// A mail sleeve with a rounded shoulder, a leather bracer and a gloved hand; gold epaulette for
// the captain.
function buildArm(k){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.062,14,10),at(0,-.02,0,[0,0,0],[1,1.1,1]),mail(-.08,.04));
 P.add(new THREE.CylinderGeometry(.045,.036,.2,12),at(0,-.13,0),mail(-.24,-.02));
 P.add(new THREE.CylinderGeometry(.036,.031,.14,10),at(0,-.285,0),(x,y)=>ramp(LEATHER_DARK,LEATHER,-.35,-.22)(y));
 P.add(new THREE.CylinderGeometry(.034,.034,.018,10),at(0,-.22,0),LEATHER_DARK);
 P.add(new THREE.SphereGeometry(.032,8,8),at(0,-.365,.005,[0,0,0],[.85,1.15,1]),LEATHER_DARK);
 if(k.captain){
  P.add(new THREE.SphereGeometry(.07,14,6,0,Math.PI*2,0,Math.PI*.45),at(0,.01,0,[0,0,0],[1.05,.55,1]),GOLD);
  for(let i=0;i<9;i++){const a=(i/8-.5)*Math.PI*.9;P.add(new THREE.CylinderGeometry(.004,.004,.035,4),at(Math.sin(a)*.068,-.012,Math.cos(a)*.03),GOLD_DARK);}
 }
 return P.merge();
}

// A halberd planted beside the watchman: an ash shaft with an iron butt cap, riveted langets, a
// crescent axe blade facing forward, a back hook, a top spike and a green tassel. Built along +y
// from the grip.
function buildHalberd(k){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.013,.015,1.36,8),at(0,.24,0),(x,y)=>Math.abs(y)<.07?LEATHER_DARK:mix(WOOD_DARK,WOOD,.5+.5*Math.sin(y*37)));
 P.add(new THREE.CylinderGeometry(.017,.014,.04,8),at(0,-.43,0),IRON);
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.006,.16,.02),at(s*.015,.72,0),IRON);
 const blade=new THREE.Shape();
 blade.moveTo(.012,.7);blade.lineTo(.07,.665);blade.quadraticCurveTo(.16,.77,.075,.89);blade.lineTo(.012,.84);blade.lineTo(.012,.7);
 const ext={depth:.006,bevelEnabled:true,bevelThickness:.002,bevelSize:.003,bevelSegments:1,curveSegments:10};
 const edge=(x,y,z)=>{const d=Math.hypot(z-.012,y-.77);return d>.075?STEEL:IRON_LIT;};
 P.add(new THREE.ExtrudeGeometry(blade,ext),at(.003,0,0,[0,-Math.PI/2,0]),edge);
 const hook=new THREE.Shape();
 hook.moveTo(-.012,.75);hook.lineTo(-.05,.745);hook.quadraticCurveTo(-.09,.735,-.105,.69);hook.quadraticCurveTo(-.08,.77,-.012,.805);hook.lineTo(-.012,.75);
 P.add(new THREE.ExtrudeGeometry(hook,ext),at(.003,0,0,[0,-Math.PI/2,0]),IRON_LIT);
 P.add(new THREE.ConeGeometry(.012,.13,4),at(0,.975,0),STEEL);
 P.add(new THREE.CylinderGeometry(.016,.016,.02,8),at(0,.66,0),IRON);
 P.add(new THREE.SphereGeometry(.018,8,6),at(0,.64,0,[0,0,0],[1,1.3,1]),k.tabard);
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2;P.add(new THREE.CylinderGeometry(.003,.001,.05,3),at(Math.sin(a)*.012,.605,Math.cos(a)*.012),k.tabard);}
 return P.merge();
}

// The captain's arming sword held upright: a fullered blade, a gilt cross with curled quillons, a
// wire-bound grip and a wheel pommel.
function buildSword(){
 const P=pieces();
 const blade=new THREE.CylinderGeometry(.001,.019,.64,4,8);blade.scale(1,1,.22);
 P.add(blade,at(0,.39,0,[0,Math.PI/4,0]),(x,y,z)=>Math.abs(x)<.004&&y<.2?IRON_LIT:STEEL);
 P.add(new THREE.BoxGeometry(.13,.014,.02),at(0,.065,0),GOLD);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.012,8,6),at(s*.067,.075,0),GOLD_DARK);
 P.add(new THREE.CylinderGeometry(.012,.013,.1,8),at(0,.01,0),(x,y)=>Math.sin(y*260)>0?LEATHER_DARK:BRASS);
 P.add(new THREE.CylinderGeometry(.026,.026,.012,14),at(0,-.045,0,[Math.PI/2,0,0]),GOLD);
 return P.merge();
}

// A tin hand lantern hanging from the bail: a vented cap, four posts and warm horn panes.
function buildLantern(){
 const P=pieces();
 P.add(new THREE.TorusGeometry(.03,.003,4,14,Math.PI),at(0,-.035,0),IRON);
 P.add(new THREE.ConeGeometry(.045,.04,8),at(0,-.075,0),IRON);
 P.add(new THREE.CylinderGeometry(.008,.008,.012,6),at(0,-.05,0),IRON_LIT);
 P.add(new THREE.CylinderGeometry(.04,.04,.01,8),at(0,-.1,0),IRON_LIT);
 P.add(new THREE.CylinderGeometry(.034,.034,.1,8,1,true),at(0,-.155,0),(x,y)=>mix(GLASS,[1,1,.9],(y+.2)*4));
 for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4;P.add(new THREE.BoxGeometry(.007,.11,.007),at(Math.sin(a)*.036,-.155,Math.cos(a)*.036),IRON);}
 P.add(new THREE.CylinderGeometry(.042,.038,.018,8),at(0,-.212,0),IRON);
 P.add(new THREE.CylinderGeometry(.03,.03,.006,8),at(0,-.2225,0),BLACK);
 return P.merge();
}

const cache={};let material=null,flameMaterial=null,flameGeo=null;
function geometry(name){
 if(!material){
  material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.12,side:THREE.DoubleSide});
  flameMaterial=new THREE.MeshStandardMaterial({color:0xffd27a,emissive:0xffa530,emissiveIntensity:2.2,roughness:.4});
  flameGeo=new THREE.SphereGeometry(.012,8,6);flameGeo.scale(1,1.8,1);
 }
 if(cache[name])return cache[name];
 const k=KINDS[name];
 return cache[name]={k,body:buildBody(k),head:buildHead(k),leg:buildLeg(),arm:buildArm(k),weapon:k.captain?buildSword():buildHalberd(k),lantern:k.captain?null:buildLantern()};
}
function mesh(parent,geo,name,mat=material){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export const WATCH=Object.keys(KINDS);

export function createWatch(name){
 const S=geometry(KINDS[name]?name:'watchman'),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.2,.82,0);arm.rotation.z=s*.08;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.365,.012);weaponSocket.rotation.z=-.08;arms[1].add(weaponSocket);
 mesh(weaponSocket,S.weapon,S.k.captain?'sword':'halberd');
 let lantern=null;
 if(S.lantern){
  lantern=new THREE.Group();lantern.position.set(0,-.36,.015);arms[0].add(lantern);
  mesh(lantern,S.lantern,'lantern');
  const flame=mesh(lantern,flameGeo,'flame',flameMaterial);flame.position.y=-.16;flame.castShadow=false;
 }
 return {g,body,legs,tail:null,wings:[],quirk:'guard',kind:name,arms,arm:arms[1],weaponSocket,lantern,head,hat:null,beard:null,pick:null};
}
