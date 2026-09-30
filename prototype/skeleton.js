import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The skeleton used to fall through to the human zombie on its letter. It now stands as bare,
// yellowed bone: a skull with deep black sockets lit by cold blue pinpoints, a nasal hollow, a
// row of upper teeth over a slack lower jaw; a spine of knobbed vertebrae running down from the
// skull to a flared pelvis; a ribcage of curved ribs around a narrow sternum, with collarbones
// and shoulder blades; paired forearm and shin bones, kneecaps, bony feet and a fist of finger
// bones. Rags of a burial shroud still hang from a rotted cord at the hips, and it grips a
// notched, rust-eaten short sword. The bone is stained darker in the joints and cracked in places.
// Each moving part (body, head, each leg and arm, and the sword) is one merged, vertex-coloured
// mesh on one shared material, plus one small emissive mesh for the eyes: 8 draws. The geometry
// is built once.
// Handles: legs, arms, arm (the sword arm), weaponSocket, head, body, like the elf rig; it keeps
// the 'zombie' quirk it had as a zombie stand-in.

const C={
 bone:rgb('#d8cfb2'),pale:rgb('#ece6d2'),stain:rgb('#8a7a58'),crack:rgb('#3a3226'),
 cavity:rgb('#0e0b0a'),tooth:rgb('#e2d8b8'),
 shroud:rgb('#8a8270'),shroudDark:rgb('#4a4436'),cord:rgb('#3e3424'),
 steel:rgb('#7a7e80'),rust:rgb('#8a4a22'),rustDark:rgb('#4a2614'),leather:rgb('#3a2a1c'),
};
const noise=(x,y,z)=>Math.sin(x*73+z*47+y*23)*Math.sin(y*91-x*29+z*17);
// aged bone: pale where it catches the light, stained in blotches, with the odd hairline crack
function bone(x,y,z){
 const n=noise(x,y,z);
 let c=mix(C.bone,C.pale,Math.max(0,n-.45)*1.4);
 c=mix(c,C.stain,Math.max(0,-n-.25)*.9);
 if(Math.abs(Math.sin(x*160+y*70)*Math.sin(z*130-y*50))>.985)c=mix(c,C.crack,.7);
 return c;
}
// joints are grimier than the shafts
const joint=(x,y,z)=>mix(bone(x,y,z),C.stain,.45);
const up=new THREE.Vector3(0,1,0);
// a tapered cylinder from point a to point b
function limb(P,a,b,r0,r1,colour,seg=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const m=new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1));
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),m,colour);
}
const times=(a,b)=>new THREE.Matrix4().multiplyMatrices(a,b);

// Heights match the elf rig: hips at .46, shoulders at .82, the neck at .93.
export const HIP_Y=.46,SHOULDER=[.16,.82,0],NECK_Y=.93;
const RIBS=[.066,.08,.09,.096,.098,.094,.086];

function buildBody(){
 const P=pieces();
 // the pelvis: sacrum, flared iliac wings, hip sockets and the pubic arch
 P.add(new THREE.SphereGeometry(.045,10,8),at(0,.5,-.035,[.3,0,0],[.85,1.2,.6]),bone);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.065,12,8),at(s*.066,.515,-.005,[0,s*.55,s*.25],[1,.8,.32]),bone);
  P.add(new THREE.SphereGeometry(.03,8,6),at(s*.07,HIP_Y,0),joint);
 }
 P.add(new THREE.TorusGeometry(.05,.012,5,12,Math.PI),at(0,.485,.03,[.25,0,Math.PI]),bone);
 // the lumbar spine, each vertebra with a knob jutting behind
 for(let i=0;i<5;i++){
  const y=.54+i*.024;
  P.add(new THREE.CylinderGeometry(.021,.021,.016,8),at(0,y,-.035),bone);
  P.add(new THREE.BoxGeometry(.012,.012,.026),at(0,y,-.058,[-.3,0,0]),joint);
 }
 // the ribcage: curved ribs either side from the spine round to a narrow sternum
 const cage=at(0,0,-.005,[0,0,0],[1,1,.78]);
 RIBS.forEach((r,i)=>{
  const y=.805-i*.029,arc=Math.PI-.42;
  // each pair slopes down toward the front, as ribs do
  const slope=times(cage,at(0,y,0,[.16,0,0]));
  P.add(new THREE.TorusGeometry(r,.0085,4,14,arc),times(slope,at(0,0,0,[Math.PI/2,0,-Math.PI/2])),bone);
  P.add(new THREE.TorusGeometry(r,.0085,4,14,arc),times(slope,at(0,0,0,[Math.PI/2,0,Math.PI/2+.42])),bone);
 });
 P.add(new THREE.BoxGeometry(.026,.15,.012),at(0,.74,.073,[-.12,0,0]),bone);
 P.add(new THREE.BoxGeometry(.012,.03,.01),at(0,.652,.083,[-.12,0,0]),joint);// the xiphoid tip
 // the thoracic and neck vertebrae running up to the skull
 for(let i=0;i<9;i++){
  const y=.66+i*.026,z=i<7?-.072:-.05+(i-7)*.02;
  P.add(new THREE.CylinderGeometry(.018,.018,.016,8),at(0,y,z),bone);
  P.add(new THREE.BoxGeometry(.01,.01,.022),at(0,y-.004,z-.02,[-.5,0,0]),joint);
 }
 for(let i=0;i<3;i++)P.add(new THREE.CylinderGeometry(.015,.015,.014,8),at(0,.9+i*.016,-.012),bone);
 // collarbones, shoulder blades, and the ball of each shoulder
 for(const s of [-1,1]){
  limb(P,[s*.02,.83,.06],[s*.145,.835,.005],.009,.008,bone,6);
  P.add(new THREE.SphereGeometry(.05,10,8),at(s*.075,.765,-.08,[0,-s*.35,s*.2],[.9,1.3,.22]),bone);
  P.add(new THREE.SphereGeometry(.028,8,6),at(s*SHOULDER[0],SHOULDER[1],0),joint);
 }
 // rags of a burial shroud hanging from a rotted cord at the hips
 P.add(new THREE.TorusGeometry(.085,.008,4,18),at(0,.53,0,[Math.PI/2,0,0],[1.05,1,.85]),C.cord);
 const shroud=(x,y,z)=>{const n=noise(x*.7,y,z*.7);return mix(mix(C.shroud,C.shroudDark,(.53-y)*3.5+n*.2),C.crack,Math.max(0,n-.65));};
 for(const [a,h,w] of [[-.35,.16,.05],[.25,.12,.045],[1.3,.1,.04],[2.9,.15,.05],[3.4,.11,.045],[-1.6,.09,.035]]){
  const x=Math.sin(a)*.09,z=Math.cos(a)*.076;
  P.add(new THREE.BoxGeometry(w,h,.004),at(x,.53-h/2,z,[Math.cos(a)*.1,a,-Math.sin(a)*.08]),shroud);
 }
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // the cranium, the brow, cheekbones and the upper jaw
 P.add(new THREE.SphereGeometry(.082,18,14),at(0,.085,-.008,[0,0,0],[.9,1,1.12]),bone);
 P.add(new THREE.SphereGeometry(.06,12,8),at(0,.098,.045,[0,0,0],[1.2,.32,.55]),bone);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.018,8,6),at(s*.05,.045,.05,[0,0,0],[1.2,.8,1.3]),bone);
  limb(P,[s*.052,.045,.04],[s*.066,.05,-.01],.008,.007,bone,5);// the cheek arch back to the ear
 }
 P.add(new THREE.SphereGeometry(.044,12,8),at(0,.028,.04,[0,0,0],[1,.62,1]),bone);
 // deep sockets and the nasal hollow
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.022,10,8),at(s*.03,.07,.066,[0,0,0],[1,1.05,.8]),C.cavity);
 P.add(new THREE.ConeGeometry(.011,.028,3),at(0,.042,.08,[0,0,Math.PI]),C.cavity);
 // a row of upper teeth, and the slack lower jaw with its own
 for(let i=0;i<8;i++){
  const u=(i-3.5)/3.5,x=u*.03,z=.075-u*u*.022;
  P.add(new THREE.BoxGeometry(.0075,.013,.007),at(x,.007,z,[0,u*.6,0]),C.tooth);
 }
 const jaw=at(0,-.004,.004,[.18,0,0]);
 P.add(new THREE.TorusGeometry(.04,.009,5,14,Math.PI),times(jaw,at(0,-.018,.03,[Math.PI/2+.2,0,0],[1,1.15,1])),bone);
 P.add(new THREE.BoxGeometry(.03,.012,.016),times(jaw,at(0,-.022,.07)),bone);
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.01,.045,.018),times(jaw,at(s*.04,-.003,.028,[.2,0,0])),bone);
 for(let i=0;i<7;i++){
  const u=(i-3)/3,x=u*.027,z=.068-u*u*.02;
  P.add(new THREE.BoxGeometry(.007,.011,.006),times(jaw,at(x,-.009,z,[0,u*.6,0])),C.tooth);
 }
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0075,8,6),at(s*.03,.068,.072),[1,1,1]);
 return P.merge();
}

// A leg from the hip socket: the femur to a knobbed knee with its kneecap, the tibia and the thin
// fibula beside it down to the ankle, a heel, and five long foot bones splayed on the floor.
function buildLeg(side){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.026,8,6),at(0,0,0),joint);
 limb(P,[0,-.01,0],[0,-.205,.006],.017,.014,bone);
 P.add(new THREE.SphereGeometry(.024,10,8),at(0,-.215,.006,[0,0,0],[1.35,.8,1]),joint);
 P.add(new THREE.SphereGeometry(.013,8,6),at(0,-.212,.03,[0,0,0],[1,1.2,.6]),bone);
 limb(P,[0,-.228,.006],[0,-.41,-.004],.016,.012,bone);
 limb(P,[side*.017,-.234,-.002],[side*.013,-.405,-.01],.0065,.006,bone,5);
 P.add(new THREE.SphereGeometry(.019,8,6),at(0,-.425,-.006,[0,0,0],[1.2,.9,1]),joint);
 P.add(new THREE.SphereGeometry(.015,8,6),at(0,-.442,-.026),bone);
 for(let i=0;i<5;i++){
  const x=(i-2)*.011,len=i===2?.004:0;
  limb(P,[x*.6,-.432,.004],[x*1.1,-.449,.052+len],.0055,.005,bone,5);
  P.add(new THREE.SphereGeometry(.0055,6,4),at(x*1.1,-.45,.053+len),joint);
  limb(P,[x*1.1,-.45,.054+len],[x*1.2,-.454,.078+len],.005,.004,bone,5);
 }
 return P.merge();
}

// The grip in the right hand, in the arm's frame: where the weapon socket sits, and the sword's
// grip axis (tipped forward from +y as the elf's sword is).
export const GRIP=[0,-.43,.01];
const TIP=at(0,.02,0,[Math.PI/2-.55,0,0]);

// An arm hanging from the shoulder: the humerus to a knobbed elbow, the paired radius and ulna,
// the wrist bones, and a bony hand. The right hand's fingers curl round the sword grip; the left
// hangs open, the finger bones slightly bent.
function buildArm(side){
 const P=pieces();
 limb(P,[0,-.012,0],[0,-.2,0],.016,.013,bone);
 P.add(new THREE.SphereGeometry(.02,8,6),at(0,-.207,0,[0,0,0],[1.2,1,1]),joint);
 P.add(new THREE.SphereGeometry(.009,6,5),at(0,-.214,-.018),bone);// the point of the elbow
 for(const x of [-.008,.008])limb(P,[x,-.216,0],[x*.8,-.382,.005],.0075,.0065,bone,5);
 P.add(new THREE.SphereGeometry(.017,8,6),at(0,-.394,.005,[0,0,0],[1.25,.75,.9]),joint);
 if(side>0){
  // four finger bones wrapped round the grip, stacked along it, and the thumb across them
  const axis=new THREE.Vector3(0,1,0).applyMatrix4(new THREE.Matrix4().extractRotation(TIP)).normalize();
  const turn=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),axis);
  for(const [i,t] of [-.027,-.009,.009,.027].entries()){
   const c=new THREE.Vector3(...GRIP).addScaledVector(axis,t+.02);
   limb(P,[0,-.404,.006],[c.x-.012,c.y+.006,c.z-.004],.005,.0045,bone,5);
   const ring=new THREE.Matrix4().compose(c,turn,new THREE.Vector3(1,1,1));
   P.add(new THREE.TorusGeometry(.016-i*.0006,.0045,4,8,Math.PI*1.35),times(ring,at(0,0,0,[0,0,Math.PI*.55])),bone);
  }
  limb(P,[.012,-.402,.012],[.004,-.422,.03],.005,.0045,bone,5);
 }else{
  for(const [i,x] of [-.015,-.005,.005,.015].entries()){
   const len=.022+(i===1||i===2?.006:0);
   limb(P,[x*.7,-.405,.006],[x,-.405-len,.008],.005,.0045,bone,5);
   limb(P,[x,-.405-len,.008],[x*1.05,-.405-len*1.75,.018],.0045,.004,bone,5);
  }
  limb(P,[-.014,-.4,.012],[-.022,-.42,.024],.005,.0045,bone,5);
 }
 return P.merge();
}

// A short sword eaten by rust: a straight blade with a nicked edge and a broken-off point, a
// plain iron crossguard, a rotted leather grip and a round pommel. Built along +y from the grip,
// then tipped forward.
function buildSword(){
 const P=pieces();
 const blade=new THREE.Shape();
 blade.moveTo(-.017,0);blade.lineTo(-.018,.1);blade.lineTo(-.012,.115);blade.lineTo(-.018,.13);
 blade.lineTo(-.016,.25);blade.lineTo(-.01,.3);blade.lineTo(.004,.318);blade.lineTo(.008,.296);blade.lineTo(.016,.27);
 blade.lineTo(.018,.19);blade.lineTo(.011,.177);blade.lineTo(.018,.162);blade.lineTo(.017,0);blade.lineTo(-.017,0);
 const geo=new THREE.ExtrudeGeometry(blade,{depth:.005,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1});
 geo.translate(0,.045,-.0025);
 const rust=(x,y,z)=>{
  const n=noise(x*1.5,y*2,z*1.5);
  let c=mix(C.steel,C.rust,.35+n*.45);
  return mix(c,C.rustDark,Math.max(0,-n-.3));
 };
 P.add(geo,TIP,rust);
 P.add(new THREE.BoxGeometry(.075,.012,.016),times(TIP,at(0,.045,0)),rust);
 P.add(new THREE.CylinderGeometry(.01,.011,.08,8),TIP,(x,y,z)=>mix(C.leather,C.rustDark,Math.max(0,noise(x,y,z))));
 P.add(new THREE.SphereGeometry(.016,8,6),times(TIP,at(0,-.047,0)),rust);
 return P.merge();
}

let shared=null;
function geometry(){
 if(!shared)shared={body:buildBody(),head:buildHead(),eyes:buildEyes(),sword:buildSword(),
  leg:{'-1':buildLeg(-1),'1':buildLeg(1)},arm:{'-1':buildArm(-1),'1':buildArm(1)},
  bone:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.05,side:THREE.DoubleSide}),
  eye:new THREE.MeshStandardMaterial({color:0xd4ecff,emissive:0x5a9cff,emissiveIntensity:2.2,roughness:.3})};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createSkeleton(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.bone,'body');
 // the skull tilts a little forward and to one side
 const head=new THREE.Group();head.position.set(0,NECK_Y,.005);head.rotation.set(.1,0,-.06);body.add(head);
 mesh(head,S.head,S.bone,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.07,HIP_Y,0);body.add(leg);mesh(leg,S.leg[s],S.bone,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*SHOULDER[0],SHOULDER[1],0);arm.rotation.z=s*.1;body.add(arm);mesh(arm,S.arm[s],S.bone,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(...GRIP);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.sword,S.bone,'sword');
 return {g,body,legs,tail:null,wings:[],quirk:'zombie',arms,arm:arms[1],weaponSocket,head,heads:[head],hat:null,beard:null,pick:null};
}
