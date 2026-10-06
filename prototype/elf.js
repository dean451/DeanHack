import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Elves share the humans' letter, so they used to be the plain `@` humanoid tinted by the glyph.
// They now stand tall and slender: a fitted tunic with a flared, hemmed skirt and a belt with a
// leaf buckle, a long cloak hanging from two leaf brooches with its hood folded behind the neck,
// fine features with long swept-back pointed ears, hair falling down the back, pale glowing eyes,
// slim leggings in tall soft boots and leather bracers. The rank and file carry a longbow and a
// quiver of arrows across the back; lords wear a silver circlet and the Elvenking a gold crown of
// leaves and a trailing cape. Each holds a leaf-bladed elven sword.
// Each moving part (body, head, each leg and arm, and the sword) is one merged, vertex-coloured
// mesh with a shared material, plus one small mesh for the eyes: 8 draws. The geometry is built
// once per kind and shared by every elf of that kind.
// Handles: legs, arms, arm (the sword arm), weaponSocket, head, body, like the humanoid rig.

const SKIN=rgb('#e8d6c2'),SKIN_SHADE=rgb('#c9ad96'),LEATHER=rgb('#5a3e26'),LEATHER_DARK=rgb('#3a2818');
const SILVER=rgb('#c8d0d8'),GOLD=rgb('#d8b04a'),WOOD=rgb('#7a5430'),FLETCH=rgb('#e8e2d0');

export const ELVES={
 'woodland-elf':{cloak:'#3c5a2a',tunic:'#62783a',hair:'#6a4428',trim:'#b08a48',bow:true},
 'green-elf':{cloak:'#2e7a36',tunic:'#78b048',hair:'#d0a850',trim:'#d0b860',bow:true},
 'grey-elf':{cloak:'#62666e',tunic:'#9ea2a8',hair:'#dcdde2',trim:'#c8d0d8',bow:true},
 'elf-lord':{cloak:'#26448a',tunic:'#5a7cc4',hair:'#e2d09a',trim:'#c8d0d8',circlet:true},
 'elvenking':{cloak:'#5a2468',tunic:'#8e4aa4',hair:'#ece4cc',trim:'#d8b04a',crown:true,train:true},
 'elf':{cloak:'#cfc8b4',tunic:'#eee6d4',hair:'#dcbc6c',trim:'#d8b04a',bow:true},
 'high-elf':{cloak:'#d8d2c0',tunic:'#f2ecde',hair:'#e8d08a',trim:'#d8b04a',circlet:true},
};

const lathe=(profile,segments=20,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));

function buildBody(o){
 const P=pieces(),C=o.C;
 // fitted tunic, flattened front to back, lighter at the chest
 P.add(lathe([[0,.44],[.14,.46],[.12,.6],[.145,.74],[.125,.84],[.05,.885],[0,.89]]),at(0,0,0,[0,0,0],[1,1,.72]),(x,y)=>ramp(C.tunicDark,C.tunic,.44,.8)(y));
 // flared skirt with a hemmed edge
 P.add(lathe([[.19,.35],[.18,.4],[.15,.5],[.13,.62]]),at(0,0,0,[0,0,0],[1,1,.78]),(x,y)=>y<.375?C.trim:ramp(C.tunicDark,C.tunic,.36,.62)(y));
 // belt with a leaf buckle, and a trimmed collar
 P.add(new THREE.TorusGeometry(.128,.014,5,22),at(0,.6,0,[Math.PI/2,0,0],[1,.74,1]),LEATHER);
 P.add(new THREE.SphereGeometry(.024,8,6),at(0,.6,.098,[0,0,Math.PI/4],[.6,1.2,.4]),C.trim);
 P.add(new THREE.TorusGeometry(.085,.012,5,18),at(0,.855,0,[Math.PI/2,0,0],[1,.8,1]),C.trim);
 // neck
 P.add(new THREE.CylinderGeometry(.036,.042,.1,10),at(0,.9,.005),SKIN_SHADE);
 // cloak: the back half of a long cone, darker toward the hem, with a trimmed edge
 const hem=o.train?.03:.14,flare=o.train?.33:.29;
 P.add(lathe([[flare,hem],[.25,.4],[.21,.64],[.175,.8],[.14,.87]],22,Math.PI/2+.25,Math.PI-.5),at(0,0,-.01,[0,0,0],[1,1,.8]),(x,y)=>y<hem+.03?C.trim:ramp(C.cloakDark,C.cloak,hem,.86)(y));
 // hood folded down behind the neck, and a leaf brooch at each shoulder
 P.add(new THREE.SphereGeometry(.09,12,8),at(0,.87,-.1,[.3,0,0],[1.25,.6,.8]),C.cloakDark);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.022,8,6),at(s*.1,.83,.075,[0,0,s*.6],[.6,1.3,.45]),C.trim);
  P.add(new THREE.SphereGeometry(.03,8,6),at(s*.145,.8,0),C.tunic);
 }
 if(o.bow){
  // longbow slung across the back, with its string
  const bow=new THREE.CatmullRomCurve3([[-.2,.3,-.19],[-.1,.48,-.26],[.02,.64,-.28],[.13,.8,-.26],[.22,.97,-.19]].map(p=>new THREE.Vector3(...p)));
  P.add(new THREE.TubeGeometry(bow,24,.012,6,false),null,(x,y)=>Math.abs(y-.64)<.04?LEATHER_DARK:WOOD);
  P.add(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(-.2,.3,-.19),new THREE.Vector3(.22,.97,-.19)),2,.003,4,false),null,FLETCH);
  // quiver over the other shoulder, with fletched arrows
  const tilt=-.45;
  P.add(new THREE.CylinderGeometry(.04,.034,.34,10),at(-.05,.68,-.21,[0,0,tilt]),(x,y)=>Math.abs(y-.72)<.015||Math.abs(y-.56)<.015?C.trim:LEATHER);
  for(const [dx,dz] of [[-.015,0],[.012,.01],[0,-.015],[.02,-.008]]){
   const tx=-.05+Math.sin(-tilt)*.21+dx,ty=.68+Math.cos(tilt)*.21;
   P.add(new THREE.CylinderGeometry(.004,.004,.08,4),at(tx-.012,ty-.02,-.21+dz,[0,0,tilt]),WOOD);
   P.add(new THREE.ConeGeometry(.014,.05,3),at(tx,ty+.01,-.21+dz,[0,0,tilt],[1,1,.3]),FLETCH);
  }
 }
 return P.merge();
}

function buildHead(o){
 const P=pieces(),C=o.C;
 // long oval face with a narrow pointed chin and a fine nose
 P.add(new THREE.SphereGeometry(.1,16,12),at(0,.1,0,[0,0,0],[.88,1.08,.95]),SKIN);
 P.add(new THREE.SphereGeometry(.06,10,8),at(0,.035,.035,[0,0,0],[.9,.9,1]),SKIN);
 P.add(new THREE.ConeGeometry(.012,.04,5),at(0,.09,.098,[Math.PI/2-.3,0,0]),SKIN_SHADE);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.03,8,6),at(s*.037,.132,.078,[0,0,s*-.25],[1.2,.3,.6]),C.hairDark);
 // long ears swept up and back
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.026,.15,6),at(s*.13,.14,-.02,[-.45,0,s*-1.0],[1,1,.45]),(x,y,z)=>z>-.02?SKIN:SKIN_SHADE);
 // hair: a cap parted in the middle and a long fall down the back
 P.add(new THREE.SphereGeometry(.108,16,10,0,Math.PI*2,0,Math.PI*.55),at(0,.105,-.012,[-.25,0,0],[.95,1.1,1]),C.hair);
 P.add(new THREE.SphereGeometry(.1,14,12),at(0,-.03,-.075,[.12,0,0],[1,2,.5]),(x,y)=>mix(C.hairDark,C.hair,(y+.2)/.3));
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.04,8,8),at(s*.085,.01,-.02,[0,0,s*.1],[.6,2,.6]),C.hair);
 if(o.circlet){
  P.add(new THREE.TorusGeometry(.098,.007,4,24),at(0,.155,.005,[Math.PI/2+.25,0,0],[1,1.05,1]),SILVER);
  P.add(new THREE.OctahedronGeometry(.016,0),at(0,.13,.1,[0,0,0],[1,1.3,.6]),C.gem);
 }
 if(o.crown){
  // a gold band set with upright leaves
  P.add(new THREE.CylinderGeometry(.1,.096,.028,20,1,true),at(0,.18,-.005),GOLD);
  for(let i=0;i<9;i++){
   const a=i/9*Math.PI*2,r=.098;
   P.add(new THREE.SphereGeometry(.022,6,6),at(Math.sin(a)*r,.215,Math.cos(a)*r-.005,[0,a,0],[.55,1.5,.25]),GOLD);
  }
  P.add(new THREE.OctahedronGeometry(.016,0),at(0,.18,.1,[0,0,0],[1,1.3,.6]),C.gem);
 }
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.016,10,8),at(s*.037,.105,.083,[0,0,0],[1.3,.8,.6]),[1,1,1]);
 return P.merge();
}

function buildLeg(o){
 const P=pieces(),C=o.C;
 // slim leggings into tall soft boots with a folded cuff and a pointed toe
 P.add(new THREE.CylinderGeometry(.052,.042,.24,10),at(0,-.12,0),ramp(C.tunicDark,C.tunic,-.24,0));
 P.add(new THREE.CylinderGeometry(.044,.04,.2,10),at(0,-.33,0),(x,y)=>y>-.25?LEATHER:mix(LEATHER_DARK,LEATHER,(y+.43)/.18));
 P.add(new THREE.TorusGeometry(.046,.012,5,14),at(0,-.235,0,[Math.PI/2,0,0]),LEATHER);
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.44,.035,[0,0,0],[.95,.5,2]),LEATHER_DARK);
 return P.merge();
}

// A sleeved arm hanging from the shoulder, a laced leather bracer on the forearm and a slender hand.
function buildArm(o){
 const P=pieces(),C=o.C;
 P.add(new THREE.CylinderGeometry(.04,.036,.22,10),at(0,-.11,0),ramp(C.tunicDark,C.tunic,-.22,0));
 P.add(new THREE.CylinderGeometry(.036,.03,.18,10),at(0,-.31,0),(x,y)=>Math.abs(y+.31)<.012?C.trim:LEATHER);
 P.add(new THREE.SphereGeometry(.028,8,8),at(0,-.42,.005,[0,0,0],[.8,1.25,1]),SKIN);
 return P.merge();
}

// A leaf-bladed elven sword: a midrib down a swelling blade, a crossguard curving toward the
// blade, a leather grip and a leaf pommel. Built along +y from the grip, then tipped forward.
function buildSword(o){
 const P=pieces(),C=o.C;
 const blade=new THREE.Shape();
 blade.moveTo(-.013,0);blade.bezierCurveTo(-.02,.12,-.032,.24,-.026,.32);blade.quadraticCurveTo(-.015,.39,0,.43);
 blade.quadraticCurveTo(.015,.39,.026,.32);blade.bezierCurveTo(.032,.24,.02,.12,.013,0);blade.lineTo(-.013,0);
 const geo=new THREE.ExtrudeGeometry(blade,{depth:.006,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,curveSegments:8});
 geo.translate(0,.05,-.003);
 const tip=at(0,.02,0,[Math.PI/2-.55,0,0]);
 P.add(geo,tip,(x,y,z)=>mix(rgb('#9aa8b4'),SILVER,.5+Math.abs(z)*40));
 P.add(new THREE.TorusGeometry(.045,.008,5,12,Math.PI),new THREE.Matrix4().multiplyMatrices(tip,at(0,.05,0,[0,0,Math.PI])),C.trim);
 P.add(new THREE.CylinderGeometry(.011,.012,.08,8),new THREE.Matrix4().multiplyMatrices(tip,at(0,0,0)),LEATHER_DARK);
 P.add(new THREE.SphereGeometry(.018,8,6),new THREE.Matrix4().multiplyMatrices(tip,at(0,-.05,0,[0,0,0],[.8,1.3,.8])),C.trim);
 return P.merge();
}

const cache=new Map();
let material=null,eyeMaterial=null,eyes=null;
function geometry(kind){
 if(cache.has(kind))return cache.get(kind);
 if(!material){
  material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:.08,side:THREE.DoubleSide});
  eyeMaterial=new THREE.MeshStandardMaterial({color:0xd8f4e4,emissive:0x8fd8b0,emissiveIntensity:1.6,roughness:.2});
  eyes=buildEyes();
 }
 const e=ELVES[kind],cloak=rgb(e.cloak),tunic=rgb(e.tunic),hair=rgb(e.hair);
 const o={...e,C:{cloak,cloakDark:mix(cloak,[0,0,0],.45),tunic,tunicDark:mix(tunic,[0,0,0],.35),hair,hairDark:mix(hair,[0,0,0],.3),trim:rgb(e.trim),gem:e.crown?rgb('#c0304a'):rgb('#4a90e0')}};
 const S={body:buildBody(o),head:buildHead(o),leg:buildLeg(o),arm:buildArm(o),sword:buildSword(o)};
 cache.set(kind,S);
 return S;
}
function mesh(parent,geo,mat,name){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

const ELF_SCALE={'elf-lord':1.07,elvenking:1.12,'high-elf':1.04};

export function createElf(name){
 const kind=ELVES[name]?name:'elf',S=geometry(kind);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(ELF_SCALE[kind]||1);// lords and kings loom over the woodland rank and file
 mesh(body,S.body,material,'body');
 const head=new THREE.Group();head.position.set(0,.93,.005);body.add(head);
 mesh(head,S.head,material,'head');mesh(head,eyes,eyeMaterial,'eyes');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.07,.46,0);body.add(leg);mesh(leg,S.leg,material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.16,.82,0);arm.rotation.z=s*.1;body.add(arm);mesh(arm,S.arm,material,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.43,.01);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.sword,material,'sword');
 return {g,body,legs,tail:null,wings:[],quirk:'elf',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
