import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The ghoul used to fall through to the human zombie on its letter. It now crouches as a small,
// starved corpse-eater: ashen blue-grey hide stretched over the ribs and a ridge of spine knobs,
// the trunk pitched forward over bent, clawed-toed legs, shoulder blades jutting, and a scrap of
// grave shroud knotted at the waist. The long bald skull has swept-back pointed ears, a heavy
// brow over deep sockets lit by pale yellow-green eyes, two slits for a nose, and a lipless jaw
// dropped open on rows of needle teeth. Its arms hang to its knees and end in long fingers with
// black hooked claws (their touch paralyses), caked with grave dirt like its feet.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured mesh on one
// shared material, plus one small emissive mesh for the eyes: 7 draws. The geometry is built once.
// Handles: legs, arms, arm, head, body, like the zombie rig, and it keeps the 'zombie' quirk.

const C={
 skin:rgb('#6a7276'),dark:rgb('#2c3134'),pale:rgb('#8e979a'),vein:rgb('#3a3450'),dirt:rgb('#2a2218'),
 cavity:rgb('#140c0e'),gum:rgb('#4a1a20'),tooth:rgb('#d8d0b0'),claw:rgb('#141210'),
 shroud:rgb('#7a7464'),shroudDark:rgb('#403a30'),cord:rgb('#4a3e2c'),
};
const noise=(x,y,z)=>Math.sin(x*67+z*49+y*19)*Math.sin(y*89-x*37+z*13);
// ashen hide, darker in blotches and toward `low`, with faint veins
function hide(low=null,high=null){
 return (x,y,z)=>{
  const n=noise(x,y,z);
  let c=mix(C.skin,C.pale,Math.max(0,n-.55)*1.2);
  c=mix(c,C.dark,Math.max(0,-n-.35)*.9);
  if(low!=null)c=mix(c,C.dirt,(high-y)/(high-low)*.55);
  if(Math.abs(Math.sin(x*140+y*60)*Math.sin(z*120-y*40))>.97)c=mix(c,C.vein,.5);
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

// The trunk leans forward .55 rad from the pelvis; parts on it are placed in its own frame.
const LEAN=.55,TRUNK=at(0,.5,0,[LEAN,0,0]);
const onTrunk=(x,y,z,r=[0,0,0],s=[1,1,1])=>TRUNK.clone().multiply(at(x,y,z,r,s));
export const SHOULDER_Y=.3,NECK_Y=.36;

function buildBody(){
 const P=pieces(),skin=hide(),R=(()=>{let s=977;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();
 // pelvis and the sunken, ribbed trunk: the hollows between the ribs are darker
 P.add(new THREE.SphereGeometry(.12,14,10),at(0,.46,0,[0,0,0],[1.1,.72,.9]),skin);
 const ribbed=(x,y,z)=>{
  const p=new THREE.Vector3(x,y,z).applyMatrix4(TRUNK.clone().invert()),c=skin(x,y,z);
  if(p.y>.08&&p.y<.27&&Math.sin(p.y*95)>.35)return mix(c,C.dark,.55);
  if(p.y<.1&&p.z>.05)return mix(c,C.dark,.3);// the belly sunk in under the ribs
  return c;
 };
 P.add(new THREE.CylinderGeometry(.14,.1,.34,16),onTrunk(0,.16,0,[0,0,0],[1,1,.72]),ribbed);
 for(const [i,y] of [.12,.16,.2,.24].entries()){
  const arc=1.2-i*.05,r=.106+i*.01;
  P.add(new THREE.TorusGeometry(r,.008,4,12,arc),onTrunk(0,y,0,[Math.PI/2,0,Math.PI/2-arc/2],[1,.76,1]),C.pale);
 }
 // the ridge of spine knobs, and the shoulder blades jutting either side of it
 for(let i=0;i<7;i++){const y=.03+i*.045,r=.1+y*.12;P.add(new THREE.SphereGeometry(.018-i*.001,8,6),onTrunk(0,y,-r*.74),C.pale);}
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.06,10,8),onTrunk(s*.075,.26,-.075,[0,0,s*.3],[1,1.2,.45]),skin);
 // bony shoulders and a thin, corded neck thrust forward
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.052,10,8),onTrunk(s*.15,SHOULDER_Y,0),skin);
 P.add(new THREE.SphereGeometry(.07,10,8),onTrunk(0,.3,0,[0,0,0],[2.1,.7,.8]),skin);
 limb(P,onTrunkPoint(0,.3,.01),[0,NECK[1],NECK[2]],.045,.036,skin,8);
 for(const s of [-1,1])limb(P,onTrunkPoint(s*.035,.3,.04),[s*.02,NECK[1]-.01,NECK[2]+.01],.012,.009,C.pale,5);
 // a scrap of grave shroud knotted round the waist, hanging in tatters
 const shroud=(x,y,z)=>{const n=noise(x*.6,y,z*.6);return mix(mix(C.shroud,C.shroudDark,(.5-y)*3.2+n*.15),C.dirt,Math.max(0,n-.6));};
 P.add(new THREE.TorusGeometry(.125,.013,5,20),at(0,.5,0,[Math.PI/2,0,0],[1.08,.9,1]),C.cord);
 for(let i=0;i<11;i++){
  const a=i*Math.PI*2/11,h=.12+R()*.1;
  if(Math.abs(Math.atan2(Math.sin(a),Math.cos(a))-1.1)<.4)continue;// a gap over the right hip
  P.add(new THREE.CylinderGeometry(.14,.128+h*.25,h,3,1,true,a,Math.PI*2/11*.96),at(0,.51-h/2,0,[0,0,0],[1.05,1,.92]),shroud);
 }
 P.add(new THREE.BoxGeometry(.03,.025,.025),at(.07,.5,.1,[0,.5,.3]),C.cord);
 return P.merge();
}
function onTrunkPoint(x,y,z){const v=new THREE.Vector3(x,y,z).applyMatrix4(TRUNK);return [v.x,v.y,v.z];}
// where the neck meets the head
const NECK=[0,0,0];{const t=onTrunkPoint(0,NECK_Y,.02);NECK[0]=0;NECK[1]=t[1]+.05;NECK[2]=t[2]+.08;}
export const HEAD_AT=[0,NECK[1]+.03,NECK[2]+.04];

function buildHead(){
 const P=pieces(),skin=hide();
 // the long bald skull, sunk at the temples and cheeks
 const face=(x,y,z)=>{
  let c=skin(x,y,z);
  if(z>.02&&y<.0&&y>-.05&&Math.abs(x)>.035)c=mix(c,C.dark,.5);
  if(Math.abs(x)>.06&&y>.0&&y<.05&&z>-.02)c=mix(c,C.dark,.35);
  return c;
 };
 P.add(new THREE.SphereGeometry(.1,18,14),at(0,.02,-.02,[-.25,0,0],[.82,.92,1.22]),face);
 // heavy brow and cheekbones
 P.add(new THREE.SphereGeometry(.07,12,8),at(0,.04,.06,[0,0,0],[1.15,.3,.55]),face);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.024,8,6),at(s*.055,-.02,.06,[0,0,0],[1,.7,1.3]),C.pale);
 // deep sockets, and two slits for a nose
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.024,10,8),at(s*.035,.012,.085),C.cavity);
  P.add(new THREE.BoxGeometry(.006,.02,.01),at(s*.008,-.018,.105,[.3,0,s*.3]),C.cavity);
 }
 // pointed ears swept back along the skull
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.026,.12,6),at(s*.08,.035,-.05,[-1.15,0,-s*.55],[1,1,.4]),face);
 // the lipless mouth dropped open: dark gums and throat, a hanging jaw, needle teeth
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.055,.07,[0,0,0],[1.05,.6,.55]),C.cavity);
 P.add(new THREE.TorusGeometry(.042,.008,5,14,Math.PI),at(0,-.035,.08,[.2,0,Math.PI],[1,.7,1]),C.gum);
 P.add(new THREE.SphereGeometry(.058,14,8,0,Math.PI*2,Math.PI/2,Math.PI/2),at(0,-.07,.035,[.55,0,0],[1,.7,1.25]),face);
 for(let i=0;i<9;i++){
  const u=(i-4)/4,x=u*.038,z=.1-u*u*.03;
  P.add(new THREE.ConeGeometry(.0045,.022+(i%2)*.006,4),at(x,-.046,z,[Math.PI,0,0]),C.tooth);
  if(i%2===0)P.add(new THREE.ConeGeometry(.0045,.02,4),at(x*.95,-.098,z-.022,[.55,0,0]),C.tooth);
 }
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.012,8,6),at(s*.035,.012,.098),[1,1,1]);
 return P.merge();
}

// A leg from the hip, bent in a crouch: the thigh runs down and forward to a knobby knee, the
// shin back down to the ankle, and a long bare foot with three clawed toes sits flat.
function buildLeg(side){
 const P=pieces(),skin=hide(-.44,-.18);
 limb(P,[0,0,0],[0,-.2,.08],.055,.04,skin);
 P.add(new THREE.SphereGeometry(.043,10,8),at(0,-.2,.08),skin);
 P.add(new THREE.SphereGeometry(.022,8,6),at(0,-.195,.115),C.pale);
 limb(P,[0,-.2,.08],[0,-.405,-.01],.038,.026,skin);
 P.add(new THREE.SphereGeometry(.028,8,6),at(0,-.41,-.01),skin);
 P.add(new THREE.SphereGeometry(.036,10,8),at(0,-.425,.045,[0,0,0],[.9,.42,2]),skin);
 for(const [i,x] of [-.022,0,.022].entries()){
  const len=.035+(i===1?.012:0);
  limb(P,[x*.8,-.428,.1],[x*1.2,-.432,.1+len],.011,.008,skin,6);
  P.add(new THREE.ConeGeometry(.007,.028,5),at(x*1.25,-.435,.1+len+.012,[Math.PI/2+.5,0,0]),C.claw);
 }
 P.add(new THREE.ConeGeometry(.008,.025,5),at(-side*.025,-.4,-.045,[-Math.PI/2-.4,0,0]),C.claw);// a dewclaw at the heel
 return P.merge();
}

// An arm from the shoulder (the group turns it forward about x, so local -y runs forward and
// local +z up): a stick-thin upper arm, a knobby elbow, forearm, a bony hand and four long
// fingers ending in black hooked claws, the whole hand grimed with grave dirt.
function buildArm(side){
 const P=pieces(),skin=hide(-.52,-.3);
 limb(P,[0,0,0],[0,-.21,0],.036,.03,skin);
 P.add(new THREE.SphereGeometry(.032,10,8),at(0,-.21,0),skin);
 P.add(new THREE.SphereGeometry(.016,6,5),at(0,-.215,-.026),C.pale);
 limb(P,[0,-.21,0],[0,-.41,.01],.03,.022,skin);
 P.add(new THREE.SphereGeometry(.032,10,8),at(0,-.44,.005,[0,0,0],[1.1,1.2,.5]),skin);
 for(const [i,x] of [-.027,-.009,.009,.027].entries()){
  const len=.07+(i===1||i===2?.018:0),bend=.5+i*.04;
  const k=[x*1.15,-.47-len*.55,.004];
  limb(P,[x,-.46,.004],k,.008,.007,skin,6);
  const tip=[x*1.25,k[1]-len*.45*Math.cos(bend),k[2]-len*.45*Math.sin(bend)];
  limb(P,k,tip,.007,.006,skin,6);
  P.add(new THREE.ConeGeometry(.007,.04,5),at(tip[0],tip[1]-.012,tip[2]-.012,[-(Math.PI-.8),0,0]),C.claw);
 }
 limb(P,[-side*.03,-.43,.004],[-side*.055,-.48,-.02],.009,.007,skin,6);
 P.add(new THREE.ConeGeometry(.006,.028,5),at(-side*.062,-.5,-.026,[-(Math.PI-.5),0,side*.3]),C.claw);
 return P.merge();
}

let shared=null;
function geometry(){
 if(!shared)shared={body:buildBody(),head:buildHead(),eyes:buildEyes(),
  leg:{'-1':buildLeg(-1),'1':buildLeg(1)},arm:{'-1':buildArm(-1),'1':buildArm(1)},
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,side:THREE.DoubleSide}),
  eye:new THREE.MeshStandardMaterial({color:0xe8f4a0,emissive:0xa8c030,emissiveIntensity:2,roughness:.3})};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createGhoul(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(.84);
 mesh(body,S.body,S.hide,'body');
 const head=new THREE.Group();head.position.set(...HEAD_AT);head.rotation.x=-.12;body.add(head);
 mesh(head,S.head,S.hide,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.445,0);leg.rotation.z=-s*.06;body.add(leg);mesh(leg,S.leg[s],S.hide,'leg');legs.push(leg);
  // the arms hang forward from the hunched shoulders, the claws near the knees
  const arm=new THREE.Group();arm.position.set(...onTrunkPoint(s*.15,SHOULDER_Y,0));arm.rotation.set(s>0?-.62:-.4,0,s*.14);body.add(arm);mesh(arm,S.arm[s],S.hide,'arm');arms.push(arm);
 }
 return {g,body,legs,tail:null,wings:[],quirk:'zombie',arms,arm:arms[1],head,heads:[head],hat:null,beard:null,pick:null};
}
