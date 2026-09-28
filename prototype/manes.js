import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Manes share the minor demons' letter, so they used to be the imp humanoid tinted dark red, wings
// and all. They now crouch as the damned souls they are: a hunched, wingless husk with a sagging
// belly under a cage of ribs, a knobbed spine, long arms that hang to the knees and end in three
// hooked talons (manes claw twice and bite), bowed legs on clawed feet, and a bald, forward-thrust
// head with a gaping jaw of jagged teeth, swept-back ears and dim ember eyes in sunken sockets.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured mesh with a
// shared material, plus one small emissive mesh for the eyes: 7 draws. Geometry is built once
// and shared by every manes.
// Handles: legs, arms, arm, head, body, like the humanoid rig. No wings or tail.

const C={
 skin:rgb('#8a2f2a'),skinDark:rgb('#4a1512'),belly:rgb('#b0685a'),rib:rgb('#c08070'),knob:rgb('#b89080'),
 socket:rgb('#1a0606'),mouth:rgb('#220808'),tooth:rgb('#d8cca8'),claw:rgb('#1a1210'),
};
const skinShade=(lo,hi)=>(x,y)=>mix(C.skinDark,C.skin,(y-lo)/(hi-lo));

function buildBody(){
 const P=pieces();
 // narrow hips and a sagging belly, paler at the front and underneath
 P.add(new THREE.SphereGeometry(.09,12,10),at(0,.28,-.02,[0,0,0],[1.2,.8,1]),skinShade(.2,.36));
 P.add(new THREE.SphereGeometry(.11,14,12),at(0,.33,.04,[0,0,0],[1,1,.95]),(x,y,z)=>z>.06?mix(C.skin,C.belly,(z-.06)/.07-(y-.3)*2):skinShade(.22,.44)(x,y));
 // a gaunt chest pushed forward over the belly: the hunch
 P.add(new THREE.SphereGeometry(.1,14,10),at(0,.47,.04,[.35,0,0],[1.1,.85,.8]),skinShade(.38,.58));
 // ribs showing through the skin, as half rings round the front of the chest
 for(const [y,r] of [[.42,.092],[.46,.098],[.5,.094]])P.add(new THREE.TorusGeometry(r,.008,4,14,Math.PI),at(0,y,.045,[Math.PI/2-.2,0,0],[1.08,1,.95]),C.rib);
 // bony shoulders and a knobbed spine curving over the back
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.045,10,8),at(s*.1,.52,.05),C.skin);
 for(let i=0;i<6;i++){const u=i/5;P.add(new THREE.IcosahedronGeometry(.017,0),at(0,.27+u*.28,-.11+u*.07+Math.sin(u*Math.PI)*-.02),C.knob);}
 // a stringy neck thrust forward
 P.add(new THREE.CylinderGeometry(.03,.042,.1,8),at(0,.56,.09,[.7,0,0]),C.skin);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // long bald skull and a heavy brow
 P.add(new THREE.SphereGeometry(.085,14,12),at(0,.04,0,[0,0,0],[.95,.88,1.2]),skinShade(-.03,.12));
 P.add(new THREE.SphereGeometry(.04,10,6),at(0,.07,.075,[0,0,0],[2.1,.5,.8]),C.skinDark);
 // sunken sockets for the eyes and two nostril slits
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.026,8,6),at(s*.034,.045,.078),C.socket);
  P.add(new THREE.SphereGeometry(.007,5,4),at(s*.01,.018,.1,[0,0,0],[.6,1.4,1]),C.socket);
 }
 // the jaw hangs open under a dark maw, with jagged teeth above and below
 P.add(new THREE.SphereGeometry(.05,10,6),at(0,-.005,.055,[0,0,0],[1.1,.45,.9]),C.mouth);
 P.add(new THREE.SphereGeometry(.058,12,8),at(0,-.045,.04,[.25,0,0],[1.05,.45,1.1]),skinShade(-.07,-.02));
 for(const x of [-.036,-.018,0,.018,.036]){
  const z=.09-Math.abs(x)*.5;
  P.add(new THREE.ConeGeometry(.007,.028+(x===0?0:.006),4),at(x,.005,z,[Math.PI,0,0]),C.tooth);
  P.add(new THREE.ConeGeometry(.006,.022,4),at(x*1.05,-.03,z-.008,[.25,0,0]),C.tooth);
 }
 // ears swept back along the skull
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.022,.08,5),at(s*.075,.06,-.02,[-1.3,0,s*-.45],[1,1,.45]),C.skin);
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.013,8,6),at(s*.034,.045,.094),[1,1,1]);
 return P.merge();
}

// A bowed leg: knobbly knee, a shin angled back and a splayed three-toed clawed foot.
function buildLeg(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.045,10,8),at(0,-.05,.02,[0,0,0],[1,1.5,1]),skinShade(-.12,0));
 P.add(new THREE.SphereGeometry(.026,8,6),at(0,-.12,.05),C.knob);
 P.add(new THREE.CylinderGeometry(.021,.016,.11,8),at(0,-.18,.03,[.35,0,0]),skinShade(-.24,-.12));
 P.add(new THREE.SphereGeometry(.032,8,6),at(0,-.245,.03,[0,0,0],[1.1,.45,1.5]),C.skin);
 for(const a of [-.5,0,.5]){
  const dx=Math.sin(a)*.045,dz=Math.cos(a)*.045;
  P.add(new THREE.CylinderGeometry(.011,.014,.05,6),at(dx*.8,-.25,.035+dz*.8,[Math.PI/2,0,-a]),C.skin);
  P.add(new THREE.ConeGeometry(.01,.035,5),at(dx*1.35,-.254,.035+dz*1.35,[Math.PI/2+.35,0,-a]),C.claw);
 }
 return P.merge();
}

// A long, thin arm that hangs to the knee, ending in three hooked talons.
function buildArm(side){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.021,.027,.16,8),at(0,-.08,0),skinShade(-.16,0));
 P.add(new THREE.SphereGeometry(.024,8,6),at(0,-.16,0),C.knob);
 P.add(new THREE.CylinderGeometry(.015,.021,.16,8),at(0,-.24,.015,[-.18,0,0]),skinShade(-.32,-.16));
 P.add(new THREE.SphereGeometry(.03,8,6),at(0,-.33,.035,[0,0,0],[.85,1.1,.8]),C.skin);
 for(const a of [-.4,0,.4]){
  const x=side*Math.sin(a)*.022;
  P.add(new THREE.CylinderGeometry(.007,.009,.055,5),at(x,-.37,.045+Math.cos(a)*.008,[.35,0,-a*.5]),C.skin);
  P.add(new THREE.ConeGeometry(.009,.045,5),at(x*1.2,-.41,.07,[2.3,0,-a*.3]),C.claw);
 }
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8});
 const eye=new THREE.MeshStandardMaterial({color:0xff6a3a,emissive:0xc02a10,emissiveIntensity:2,roughness:.3});
 shared={material,eye,body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),arm:{'-1':buildArm(-1),'1':buildArm(1)}};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createManes(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,.6,.13);body.add(head);
 mesh(head,S.head,S.material,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.075,.258,-.02);leg.rotation.z=s*.06;body.add(leg);mesh(leg,S.leg,S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.13,.52,.05);arm.rotation.set(-.22,0,s*.14);body.add(arm);mesh(arm,S.arm[s],S.material,'arm');arms.push(arm);
 }
 return {g,body,legs,tail:null,wings:[],quirk:'manes',arms,arm:arms[1],head,hat:null,beard:null,pick:null};
}
