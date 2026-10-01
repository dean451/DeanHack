import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The doppelganger shares the humans' letter, so it used to be the plain `@` humanoid. It is now a
// mimic caught halfway through a change: too tall and gaunt, its putty-grey flesh never quite
// settled (faint ripples run round it, bruised blotches, lumps still swelling on the left shoulder
// and flank) and a raw seam splitting it down the sternum. Its right side has finished copying a
// person: a long-fingered human hand and a bare foot. Its left side has not: the forearm stretches
// into three jointed bone talons that hang past the knee, spurs run down its back, and the foot is
// clawed. A crown of bone spines has burst out of the right shoulder blade. The face is a smooth,
// blank mask with only the impression of features: shallow sockets with pinprick pale eyes, a
// lipless smile far too wide, and the seam running up through the forehead. A few lank borrowed
// strands of hair hang from one side. It still wears scraps of its last victim: a torn dark cloak
// over the right shoulder and a belt half sunk into its waist.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured mesh on one shared
// material, plus one small emissive mesh for the eyes: 7 draws. The geometry is built once.
// Handles: legs, arms, arm (the human right arm), weaponSocket (in its right hand), head, body.

const C={
 putty:rgb('#b4ada2'),pale:rgb('#d2ccc0'),dark:rgb('#6c6660'),bruise:rgb('#5e4c5e'),
 raw:rgb('#8a3038'),deep:rgb('#2a1014'),bone:rgb('#d8cfba'),boneDark:rgb('#8a7e66'),claw:rgb('#1a1614'),
 cavity:rgb('#140c0e'),tooth:rgb('#e0d8c0'),hair:rgb('#2a2420'),
 cloak:rgb('#2e3440'),cloakDark:rgb('#161a22'),leather:rgb('#4a3424'),brass:rgb('#a88a48'),
};
const noise=(x,y,z)=>Math.sin(x*61+z*47+y*23)*Math.sin(y*83-x*41+z*17);
// unsettled flesh: mottled with bruises, with faint ripple bands where it is still moving, and a raw
// seam where |x| is near 0 on the front (when `seam` is set)
function flesh(seam=false){
 return (x,y,z)=>{
  const n=noise(x,y,z);
  let c=mix(C.putty,C.pale,Math.max(0,n-.5)*1.3);
  c=mix(c,C.bruise,Math.max(0,-n-.45)*1.1);
  if(Math.sin(y*72+n*2.5)>.86)c=mix(c,C.dark,.38);
  if(seam&&z>0&&Math.abs(x)<.011)c=mix(C.raw,C.deep,1-Math.abs(x)/.011);
  return c;
 };
}
const up=new THREE.Vector3(0,1,0);
// a tapered cylinder from point a to point b
function limb(P,a,b,r0,r1,colour,seg=10){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const m=new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1));
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),m,colour);
}
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
const rand=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};

export const HIP_Y=.47,SHOULDER_Y=.84,NECK_Y=.97;

function buildBody(){
 const P=pieces(),skin=flesh(true),R=rand(4271);
 // pelvis and a gaunt trunk pinched at the waist, flattened front to back
 P.add(new THREE.SphereGeometry(.11,14,10),at(0,HIP_Y+.01,0,[0,0,0],[1.1,.75,.78]),skin);
 P.add(lathe([[.105,.47],[.118,.52],[.092,.62],[.112,.7],[.145,.8],[.15,.85],[.11,.9],[.045,.93],[0,.935]],28),at(0,0,0,[0,0,0],[1,1,.7]),skin);
 // ribs pressing through on the left only, the half that hasn't finished
 for(let i=0;i<4;i++){
  const y=.69+i*.035,r=.112+i*.009;
  P.add(new THREE.TorusGeometry(r,.007,4,10,.95),at(0,y,0,[Math.PI/2,0,Math.PI*.55],[1,.7,1]),C.pale);
 }
 // lumps still swelling out of the left shoulder and flank
 for(let i=0;i<7;i++){
  const a=R(),y=.62+R()*.22,r=.022+R()*.026,ang=Math.PI*(.5+a*.55),rad=.105+(y-.6)*.2;
  P.add(new THREE.SphereGeometry(r,9,7),at(-Math.abs(Math.sin(ang))*rad,y,Math.cos(ang)*rad*.7),flesh());
 }
 // a crown of bone spines burst out of the right shoulder blade, raw where they broke through
 for(const [x,y,len,rx,rz] of [[.06,.82,.17,-.95,-.35],[.09,.77,.13,-1.1,-.6],[.04,.75,.1,-1.25,-.2],[.1,.84,.09,-.7,-.85],[.075,.7,.08,-1.35,-.5]]){
  const z=-.09-(y-.7)*.15;
  P.add(new THREE.TorusGeometry(.016+len*.06,.006,4,9),at(x,y,z,[Math.PI/2+rx*.35,0,0]),C.raw);
  P.add(new THREE.ConeGeometry(.016+len*.06,len,5),at(x,y,z,[rx,0,rz]).multiply(at(0,len/2,0)),(px,py,pz)=>mix(C.boneDark,C.bone,THREE.MathUtils.clamp((py-y)/len*1.6,0,1)));
 }
 // smaller spurs running down the back on the left of the spine
 for(let i=0;i<5;i++)P.add(new THREE.ConeGeometry(.009,.04-i*.004,4),at(-.025,.8-i*.05,-.085+i*.004,[-1.3,0,.3]).multiply(at(0,.018,0)),C.boneDark);
 // shoulders, and a long neck with cords standing out
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.05,10,8),at(s*.15,SHOULDER_Y,0,[0,0,0],[1,1,.85]),skin);
 limb(P,[0,.92,0],[0,NECK_Y+.02,.01],.04,.032,skin,10);
 for(const s of [-1,1])limb(P,[s*.03,.91,.03],[s*.012,NECK_Y,.035],.009,.006,C.pale,5);
 // its last victim's belt, half sunk into the waist, the buckle askew
 P.add(new THREE.TorusGeometry(.098,.011,5,24,Math.PI*1.35),at(0,.585,0,[Math.PI/2,0,.4],[1.02,.72,1]),C.leather);
 P.add(new THREE.BoxGeometry(.034,.03,.008),at(.035,.582,.072,[0,.45,.12]),C.brass);
 P.add(new THREE.BoxGeometry(.03,.012,.06),at(-.11,.56,.04,[0,.3,-.9]),C.leather);// the loose tongue hanging
 // and a torn strip of its dark cloak caught over the right shoulder, ragged at the ends
 const cloth=(x,y)=>mix(C.cloakDark,C.cloak,THREE.MathUtils.clamp((y-.55)/.35,0,1));
 P.add(new THREE.BoxGeometry(.075,.012,.21),at(.13,.885,.0,[0,0,-.32]),cloth);
 P.add(new THREE.BoxGeometry(.07,.3,.008),at(.135,.73,-.105,[.12,0,-.08]),cloth);
 P.add(new THREE.BoxGeometry(.06,.2,.008),at(.12,.78,.105,[-.15,0,.05]),cloth);
 for(const [x,y,z,h] of [[.115,.57,-.112,.06],[.14,.565,-.113,.09],[.16,.575,-.114,.05],[.105,.67,.11,.05],[.13,.665,.112,.08]])
  P.add(new THREE.ConeGeometry(.012,h,3),at(x,y-h/2+.01,z,[Math.PI,0,0],[1,1,.3]),C.cloakDark);
 return P.merge();
}

function buildHead(){
 const P=pieces(),skin=flesh(true);
 // a long, smooth egg of a skull, the face a near-blank mask
 const face=(x,y,z)=>{
  let c=skin(x,y,z);
  if(z>.06&&Math.abs(x)>.02&&Math.abs(x)<.06&&y>.1&&y<.135)c=mix(c,C.dark,.5);// the shallow sockets
  if(z>.0&&y>.13&&Math.abs(x)<.009)c=mix(C.raw,C.deep,1-Math.abs(x)/.009);// the seam up the forehead
  return c;
 };
 P.add(new THREE.SphereGeometry(.1,20,16),at(0,.105,0,[-.1,0,0],[.82,1.18,.92]),face);
 // the barest brow ridge, and a nub of a nose
 P.add(new THREE.SphereGeometry(.06,12,8),at(0,.14,.055,[0,0,0],[1.15,.22,.45]),face);
 P.add(new THREE.SphereGeometry(.013,8,6),at(0,.095,.09,[0,0,0],[.7,1.6,.8]),C.putty);
 // a lipless smile cut far too wide, nearly ear to ear, turned up at the corners, with a dark
 // gap of needle teeth showing in the middle
 const curve=new THREE.CatmullRomCurve3([[-.072,.072,.035],[-.05,.058,.068],[0,.052,.082],[.05,.058,.068],[.072,.072,.035]].map(p=>new THREE.Vector3(...p)));
 P.add(new THREE.TubeGeometry(curve,24,.0045,5),null,C.cavity);
 P.add(new THREE.SphereGeometry(.03,10,6),at(0,.055,.072,[0,0,0],[1.2,.3,.4]),C.cavity);
 for(let i=0;i<7;i++){const u=(i-3)/3,x=u*.028;P.add(new THREE.ConeGeometry(.003,.012,4),at(x,.06,.081-u*u*.006,[Math.PI,0,0]),C.tooth);}
 // a few lank, borrowed strands hanging from the left side of the crown
 for(let i=0;i<6;i++){
  const a=-.5-i*.17,x=Math.sin(a)*.08,z=Math.cos(a)*.07-.02,len=.12+(i%3)*.04;
  limb(P,[x,.19,z],[x*1.25,.19-len,z-.02],.005,.0025,C.hair,4);
 }
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.008,8,6),at(s*.038,.118,.083),[1,1,1]);
 return P.merge();
}

// A thin bare leg from the hip. The right foot is a person's; the left is long and clawed.
function buildLeg(side){
 const P=pieces(),skin=flesh();
 limb(P,[0,0,0],[0,-.22,.015],.048,.034,skin);
 P.add(new THREE.SphereGeometry(.034,10,8),at(0,-.22,.015),skin);
 limb(P,[0,-.22,.015],[0,-.43,-.005],.032,.022,skin);
 P.add(new THREE.SphereGeometry(.024,8,6),at(0,-.435,-.005),skin);
 if(side>0){
  P.add(new THREE.SphereGeometry(.034,10,8),at(0,-.452,.04,[0,0,0],[.85,.42,1.9]),skin);
  for(const [i,x] of [-.02,-.01,0,.01,.02].entries())P.add(new THREE.SphereGeometry(.007,6,5),at(x,-.458,.1-Math.abs(i-1.5)*.004),C.putty);
 }else{
  P.add(new THREE.SphereGeometry(.034,10,8),at(0,-.45,.05,[0,0,0],[.9,.4,2.3]),flesh());
  for(const x of [-.024,0,.024]){
   limb(P,[x*.7,-.452,.11],[x*1.3,-.456,.16],.01,.007,skin,6);
   P.add(new THREE.ConeGeometry(.007,.035,5),at(x*1.35,-.46,.176,[Math.PI/2+.45,0,0]),C.claw);
  }
  P.add(new THREE.ConeGeometry(.008,.04,5),at(0,-.42,-.05,[-Math.PI/2-.5,0,0]),C.boneDark);// a spur at the heel
 }
 return P.merge();
}

// An arm hanging from the shoulder along local -y (+z forward).
// Right: a person's arm, a little too long, with a long-fingered hand.
// Left: the forearm stretches and splits into three jointed bone talons hanging past the knee.
function buildArm(side){
 const P=pieces(),skin=flesh();
 limb(P,[0,0,0],[0,-.21,0],.036,.028,skin);
 P.add(new THREE.SphereGeometry(.028,10,8),at(0,-.21,0),skin);
 if(side>0){
  limb(P,[0,-.21,0],[0,-.41,.01],.027,.02,skin);
  P.add(new THREE.SphereGeometry(.026,10,8),at(0,-.435,.012,[0,0,0],[.75,1.15,1]),skin);
  for(const [i,z] of [-.016,-.005,.006,.017].entries()){
   const len=.065+(i===1||i===2?.012:0);
   limb(P,[-.004,-.455,z+.012],[-.012,-.455-len,z*1.2+.02],.0055,.004,skin,5);
  }
  limb(P,[.012,-.43,.025],[.02,-.47,.045],.006,.0045,skin,5);// the thumb
 }else{
  // the forearm swells, mottled and seamed, with spurs along its back
  const raw=(x,y,z)=>Math.abs(z+.01)<.006&&x>0?C.raw:skin(x,y,z);
  limb(P,[0,-.21,0],[0,-.44,.02],.034,.026,raw);
  for(let i=0;i<4;i++)P.add(new THREE.ConeGeometry(.008,.04-i*.006,4),at(0,-.25-i*.05,-.026,[-2.2,0,0]).multiply(at(0,.018,0)),C.boneDark);
  P.add(new THREE.SphereGeometry(.032,10,8),at(0,-.46,.02,[0,0,0],[1.1,1,.9]),flesh());
  // three long bone talons, each in two joints curling forward at the tips
  for(const [i,x] of [-.02,0,.02].entries()){
   const a=[x,-.47,.02],k=[x*1.4,-.6-(i===1?.03:0),.028],tip=[x*1.6,-.7-(i===1?.03:0),.075];
   limb(P,a,k,.011,.008,C.bone,6);
   P.add(new THREE.SphereGeometry(.01,6,5),at(...k),C.boneDark);
   limb(P,k,tip,.008,.005,C.bone,6);
   P.add(new THREE.ConeGeometry(.006,.045,5),at(tip[0],tip[1]+.004,tip[2]+.02,[Math.PI/2+.9,0,0]),C.claw);
  }
 }
 return P.merge();
}

let shared=null;
function geometry(){
 if(!shared)shared={body:buildBody(),head:buildHead(),eyes:buildEyes(),
  leg:{'-1':buildLeg(-1),'1':buildLeg(1)},arm:{'-1':buildArm(-1),'1':buildArm(1)},
  flesh:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.04,side:THREE.DoubleSide}),
  eye:new THREE.MeshStandardMaterial({color:0xf2ecc8,emissive:0xd8d0a0,emissiveIntensity:1.8,roughness:.3})};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createDoppelganger(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.06);
 mesh(body,S.body,S.flesh,'body');
 const head=new THREE.Group();head.position.set(0,NECK_Y,.012);head.rotation.set(.08,0,-.1);body.add(head);// cocked a little, watching
 mesh(head,S.head,S.flesh,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.065,HIP_Y,0);body.add(leg);mesh(leg,S.leg[s],S.flesh,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.165,SHOULDER_Y,0);arm.rotation.set(s>0?-.05:-.18,0,s*.1);body.add(arm);mesh(arm,S.arm[s],S.flesh,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.44,.02);arms[1].add(weaponSocket);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'doppelganger',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
