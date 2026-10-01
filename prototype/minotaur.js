import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The minotaur used to be the generic giant with a round ball for a head and thin pale horns
// sticking straight out. It is now the thing at the heart of the labyrinth: a hunched, heavy
// brute carrying its head low and forward under a great shaggy hump of shoulder, the hide near
// black and scarred. The skull is a long bull's wedge under a scowling brow, with small ember eyes
// sunk deep beneath it, flared wet nostrils and an iron ring through the septum. Thick aurochs horns,
// ridged at the root and pale at the points, sweep out and then forward to hook at whatever is in
// front of it. Coarse spiky shag bristles off the hump, the neck and the dewlap. It stands on
// digitigrade bull legs with shaggy hocks and cloven black hooves, a ragged studded loincloth at
// its hips and a tufted tail behind. Its left wrist still wears the broken manacle it was chained
// with, a few links of chain hanging off it; its right hand grips a notched, blood-darkened labrys, carried back over the shoulder.
// Each moving part (body, head, each leg and arm, the tail) is one merged, vertex-coloured mesh on
// one shared material, plus an emissive mesh for the eyes and a metal one for the labrys: 9 draws.
// The geometry is built once.
// Handles: legs, arms, arm (the right, axe arm), weaponSocket (in its right hand), head, body, tail.

const C={
 hide:rgb('#2e2018'),hideDark:rgb('#160e0a'),hideLit:rgb('#4a3324'),belly:rgb('#5a4232'),scar:rgb('#8a6a58'),
 muzzle:rgb('#4e423a'),muzzleDark:rgb('#241c18'),nostril:rgb('#0c0606'),wet:rgb('#1e1414'),
 hornRoot:rgb('#2a241c'),horn:rgb('#8a7c62'),hornTip:rgb('#e6dcc2'),
 hoof:rgb('#121010'),iron:rgb('#3a3634'),rust:rgb('#5a3424'),
 leather:rgb('#3a261a'),leatherDark:rgb('#1e140e'),bronze:rgb('#8a6a34'),
};
const noise=(x,y,z)=>Math.sin(x*53+z*37+y*29)*Math.sin(y*71-x*43+z*19);
// near-black hide, mottled, lit a little on top and darker underneath
const hide=(x,y,z)=>{const n=noise(x,y,z);let c=mix(C.hideDark,C.hide,.55+n*.45);if(n>.6)c=mix(c,C.hideLit,(n-.6)*1.6);return c;};
const up=new THREE.Vector3(0,1,0);
// a tapered cylinder from point a to point b
function limb(P,a,b,r0,r1,colour,seg=10){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const m=new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,d.normalize()),new THREE.Vector3(1,1,1));
 P.add(new THREE.CylinderGeometry(r1,r0,len,seg),m,colour);
}
// a tube along a curve whose radius tapers from r0 to r1
function taper(points,r0,r1,segments=16,radial=8){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const geo=new THREE.TubeGeometry(curve,segments,1,radial,false),pos=geo.attributes.position,v=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<=segments;i++){curve.getPointAt(i/segments,c);const r=r0+(r1-r0)*Math.pow(i/segments,.8);
  for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(pos,k).sub(c).multiplyScalar(r).add(c);pos.setXYZ(k,v.x,v.y,v.z);}}
 geo.computeVertexNormals();return {geo,curve};
}
const rand=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
// a spike of coarse shag at p, leaning along dir
function tuft(P,p,dir,len,r,colour=C.hideDark){
 const d=new THREE.Vector3(...dir).normalize(),q=new THREE.Quaternion().setFromUnitVectors(up,d);
 P.add(new THREE.ConeGeometry(r,len,4),new THREE.Matrix4().compose(new THREE.Vector3(...p).addScaledVector(d,len/2),q,new THREE.Vector3(1,1,1)),colour);
}

export const HIP_Y=.62,SHOULDER_Y=1.1,NECK=[0,1.17,.2];

function buildBody(){
 const P=pieces(),R=rand(9187);
 // pelvis, a narrow waist and a huge barrel chest pitched forward
 P.add(new THREE.SphereGeometry(.15,16,12),at(0,.67,0,[0,0,0],[1.15,.8,.9]),hide);
 P.add(new THREE.SphereGeometry(.16,16,12),at(0,.8,.03,[.15,0,0],[1,1,.85]),(x,y,z)=>z>.06?mix(hide(x,y,z),C.belly,(z-.06)*4):hide(x,y,z));
 P.add(new THREE.SphereGeometry(.25,20,16),at(0,.98,.06,[.3,0,0],[1.08,.95,.85]),(x,y,z)=>z>.16&&y<1?mix(hide(x,y,z),C.belly,(z-.16)*3):hide(x,y,z));
 // the hump: a great ridge of muscle behind the neck that the head hangs forward from
 P.add(new THREE.SphereGeometry(.2,18,14),at(0,1.17,-.04,[.2,0,0],[1.35,.85,1.05]),hide);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.12,12,10),at(s*.27,SHOULDER_Y,.02,[0,0,0],[1,1,1.05]),hide);
 // a thick neck thrust forward
 limb(P,[0,1.12,.02],[...NECK],.13,.1,hide,12);
 // pectorals and a seam of belly muscle
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.11,12,10),at(s*.1,1.0,.2,[.2,0,0],[1.1,.8,.55]),hide);
 // old pale scars raked across the chest and flank
 for(const [a,b] of [[[-.17,1.06,.2],[.04,.9,.27]],[[-.12,1.02,.23],[.06,.87,.27]],[[.2,.95,.16],[.24,.78,.06]]]){
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(...a),new THREE.Vector3(...b)]);
  P.add(new THREE.TubeGeometry(curve,4,.006,4),null,C.scar);
 }
 // coarse shag bristling off the hump, the back of the neck and the shoulders, swept back and up
 for(let i=0;i<46;i++){
  const a=(R()-.5)*2.4,yy=1.06+R()*.22,rx=Math.sin(a)*.27,rz=-.04-Math.cos(a)*.17;
  const z=rz+(yy-1.1)*.25;
  tuft(P,[rx,yy,z+.03],[Math.sin(a)*.6,.7+R()*.4,-.5-R()*.4],.07+R()*.07,.018+R()*.01,R()<.3?C.hide:C.hideDark);
 }
 for(let i=0;i<12;i++){const s=i%2?1:-1,yy=1.0+R()*.12;tuft(P,[s*(.3+R()*.06),yy,(R()-.5)*.1],[s,.3,-.3],.06+R()*.04,.015);}
 // the loincloth: a studded belt, a ragged front flap and a shorter back flap
 P.add(new THREE.TorusGeometry(.165,.022,6,26),at(0,.72,0,[Math.PI/2,0,0],[1.05,.82,1]),C.leatherDark);
 for(let i=0;i<9;i++){const a=(i-4)*.36;P.add(new THREE.SphereGeometry(.012,6,5),at(Math.sin(a)*.175,.72,Math.cos(a)*.142),C.bronze);}
 P.add(new THREE.CylinderGeometry(.04,.04,.012,10),at(0,.72,.148,[Math.PI/2,0,0]),C.bronze);
 const cloth=(x,y)=>mix(C.leatherDark,C.leather,THREE.MathUtils.clamp((y-.45)/.25,0,1));
 P.add(new THREE.BoxGeometry(.18,.22,.012),at(0,.6,.14,[-.12,0,0]),cloth);
 P.add(new THREE.BoxGeometry(.22,.16,.012),at(0,.63,-.14,[.15,0,0]),cloth);
 for(const [x,h,z] of [[-.07,.07,.152],[-.02,.1,.155],[.03,.06,.155],[.075,.09,.152],[-.08,.06,-.165],[0,.08,-.17],[.08,.05,-.165]])
  P.add(new THREE.ConeGeometry(.025,h,3),at(x,.49-h/2+.01+(z<0?.06:0),z,[Math.PI,0,0],[1,1,.3]),C.leatherDark);
 return P.merge();
}

// The head hangs off the end of the neck, +z forward; the caller pitches it down.
function buildHead(){
 const P=pieces(),R=rand(331);
 const face=(x,y,z)=>{
  if(z>.1)return mix(C.muzzle,C.muzzleDark,THREE.MathUtils.clamp((.02-y)*8,0,1));
  return hide(x,y,z);
 };
 // a long, heavy wedge of a skull, and the curly boss between the horns
 P.add(new THREE.SphereGeometry(.11,18,14),at(0,.04,.04,[.12,0,0],[1,.92,1.35]),face);
 P.add(new THREE.SphereGeometry(.085,12,10),at(0,.1,.0,[0,0,0],[1.25,.75,1]),hide);
 for(let i=0;i<14;i++){const a=R()*Math.PI*2,r=R()*.06;P.add(new THREE.SphereGeometry(.016,6,5),at(Math.cos(a)*r,.15+R()*.02,Math.sin(a)*r*.7),C.hideDark);}
 // the broad, flat muzzle with flared, wet nostrils
 P.add(new THREE.SphereGeometry(.08,14,10),at(0,-.03,.16,[.25,0,0],[1.12,.82,1.05]),face);
 P.add(new THREE.BoxGeometry(.13,.07,.03),at(0,-.035,.23,[.2,0,0]),C.wet);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.018,8,6),at(s*.032,-.025,.245,[0,s*.4,0],[1.3,.8,.6]),C.nostril);
 // a heavy lower jaw and a grim mouth line
 P.add(new THREE.SphereGeometry(.07,12,8),at(0,-.08,.11,[0,0,0],[1,.6,1.3]),face);
 P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-.07,-.055,.12],[-.04,-.065,.2],[0,-.068,.225],[.04,-.065,.2],[.07,-.055,.12]].map(p=>new THREE.Vector3(...p))),16,.005,4),null,C.nostril);
 // the iron ring through the septum, hanging down over the lip
 P.add(new THREE.TorusGeometry(.03,.006,6,18),at(0,-.075,.235,[.25,0,0]),(x,y)=>y<-.09?C.rust:C.iron);
 // a scowling brow: two heavy ridges slanting down to the middle, the eyes sunk deep in shadow
 for(const s of [-1,1]){
  P.add(new THREE.BoxGeometry(.085,.03,.05),at(s*.05,.085,.115,[.3,s*-.25,s*.38]),hide);
  P.add(new THREE.SphereGeometry(.024,10,8),at(s*.066,.05,.112,[0,0,0],[1,.8,.6]),C.nostril);
 }
 // ears thrust out sideways under the horns
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.035,.11,6),at(s*.14,.05,-.01,[0,.3*s,-s*(Math.PI/2+.25)],[1,1,.4]),(x,y,z)=>Math.abs(z+.01)<.004?C.belly:hide(x,y,z));
 // the horns: thick aurochs horns sweeping out, then forward and up to points, ridged at the root
 for(const s of [-1,1]){
  const {geo,curve}=taper([[s*.07,.13,-.01],[s*.17,.15,-.03],[s*.27,.17,.03],[s*.31,.22,.14],[s*.27,.3,.24]],.045,.004,24,10);
  P.add(geo,null,(x,y,z)=>{const t=THREE.MathUtils.clamp((Math.abs(x)-.07)/.28+(z>.1?(z-.1)*1.2:0),0,1);return t<.5?mix(C.hornRoot,C.horn,t*2):mix(C.horn,C.hornTip,(t-.5)*2);});
  for(let i=0;i<4;i++){const u=.06+i*.06,p=curve.getPointAt(u),tan=curve.getTangentAt(u);
   P.add(new THREE.TorusGeometry(.043-i*.004,.005,4,12),new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),tan),new THREE.Vector3(1,1,1)),C.hornRoot);}
 }
 // a shaggy dewlap and a fringe under the jaw
 for(let i=0;i<10;i++){const x=(i-4.5)*.016;tuft(P,[x,-.09,.06-Math.abs(x)*.5],[x*3,-1,-.25],.05+R()*.04,.012);}
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.011,8,6),at(s*.064,.05,.126,[0,0,0],[1.3,.8,.6]),[1,1,1]);
 return P.merge();
}

// A bull's hind leg from the hip: a heavy thigh, a hock bent back, a shaggy fetlock and a cloven hoof.
function buildLeg(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.1,12,10),at(0,-.04,0,[0,0,0],[1,1.2,1.05]),hide);
 limb(P,[0,-.02,0],[0,-.27,.07],.1,.07,hide,12);
 P.add(new THREE.SphereGeometry(.068,10,8),at(0,-.27,.07),hide);
 limb(P,[0,-.27,.07],[0,-.45,-.05],.062,.04,hide,10);
 P.add(new THREE.SphereGeometry(.042,10,8),at(0,-.45,-.05),hide);
 limb(P,[0,-.45,-.05],[0,-.57,-.02],.036,.032,hide,10);
 // shag at the hock and the fetlock
 for(let i=0;i<7;i++){const a=(i/7)*Math.PI*2;tuft(P,[Math.cos(a)*.034,-.53,-.02+Math.sin(a)*.03],[Math.cos(a)*.6,-1,Math.sin(a)*.6],.05,.012);}
 for(let i=0;i<4;i++)tuft(P,[(i-1.5)*.02,-.43,-.085],[0,-.4,-1],.05,.012);
 // the cloven hoof, split down the front
 for(const s of [-1,1])P.add(new THREE.CylinderGeometry(.022,.032,.05,6,1,false,s>0?0:Math.PI,Math.PI),at(s*.004,-.595,-.005),C.hoof);
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.02,.04,5),at(s*.018,-.6,.035,[Math.PI/2+.3,0,0],[1,1,.6]),C.hoof);
 return P.merge();
}

// An arm hanging from the shoulder along local -y (+z forward): huge, knotted with muscle, with a
// heavy fist. The left wrist wears a broken manacle trailing a few links of chain.
function buildArm(side){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.09,12,10),at(0,-.13,0,[0,0,0],[1,1.4,1]),hide);
 limb(P,[0,-.02,0],[0,-.3,.01],.085,.07,hide,12);
 P.add(new THREE.SphereGeometry(.068,10,8),at(0,-.3,.01),hide);
 limb(P,[0,-.3,.01],[0,-.55,.04],.072,.052,hide,12);
 P.add(new THREE.SphereGeometry(.06,10,8),at(0,-.6,.045,[0,0,0],[1,1.1,1.05]),hide);
 for(let i=0;i<4;i++){const x=(i-1.5)*.026;P.add(new THREE.SphereGeometry(.018,6,5),at(x,-.645,.075),C.hideDark);}
 // shag down the back of the upper arm
 for(let i=0;i<6;i++)tuft(P,[side*.03,-.06-i*.04,-.07],[side*.3,-.3,-1],.05,.013);
 if(side<0){
  // the broken manacle: an iron cuff, its hinge and lock, and three links of chain
  P.add(new THREE.CylinderGeometry(.066,.066,.06,12,1,true),at(0,-.52,.035),(x,y,z)=>noise(x*3,y*3,z*3)>.3?C.rust:C.iron);
  P.add(new THREE.TorusGeometry(.066,.008,4,14),at(0,-.49,.035,[Math.PI/2,0,0]),C.iron);
  P.add(new THREE.TorusGeometry(.066,.008,4,14),at(0,-.55,.035,[Math.PI/2,0,0]),C.iron);
  P.add(new THREE.BoxGeometry(.03,.04,.02),at(0,-.52,.105),C.iron);
  for(let i=0;i<3;i++)P.add(new THREE.TorusGeometry(.016,.005,4,10),at(.01*i,-.565-i*.03,.105+i*.004,[0,i%2?Math.PI/2:0,.2],[1,1.4,1]),i===2?C.rust:C.iron);
 }else{
  // a leather bracer on the axe arm
  P.add(new THREE.CylinderGeometry(.068,.062,.12,12),at(0,-.47,.03),C.leather);
  for(const y of [-.43,-.51])P.add(new THREE.TorusGeometry(.067,.006,4,14),at(0,y,.03,[Math.PI/2,0,0]),C.leatherDark);
 }
 return P.merge();
}

// A bull's tail from the base: a long rope ending in a dark tuft.
function buildTail(){
 const P=pieces();
 const {geo}=taper([[0,0,0],[0,-.08,-.06],[.02,-.25,-.09],[.03,-.42,-.06]],.022,.012,12,6);
 P.add(geo,null,hide);
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2;tuft(P,[.03,-.42,-.06],[Math.cos(a)*.35,-1,Math.sin(a)*.35],.09,.016);}
 return P.merge();
}

// The labrys, in weapon space (+y up the haft from the hand): a long iron-shod haft and a
// double head of crescent blades in blackened bronze, their edges notched and darkened with old
// blood, and a short spike on top.
function buildLabrys(){
 const P=pieces();
 limb(P,[0,-.28,0],[0,.82,0],.021,.019,C.leatherDark,8);
 P.add(new THREE.ConeGeometry(.022,.07,5),at(0,-.31,0,[Math.PI,0,0]),C.iron);
 for(let i=0;i<5;i++)P.add(new THREE.TorusGeometry(.023,.005,4,10),at(0,.42+i*.025,0,[Math.PI/2,0,0]),C.leatherDark);
 P.add(new THREE.CylinderGeometry(.034,.034,.13,8),at(0,.7,0),C.bronze);
 const blade=new THREE.Shape();
 blade.moveTo(.02,.06);
 blade.quadraticCurveTo(.12,.06,.2,.15);
 // the cutting edge: a deep crescent with notches bitten out of it
 const edge=[[.2,.15],[.25,.09],[.235,.08],[.27,.02],[.265,-.04],[.245,-.05],[.25,-.1],[.2,-.15]];
 for(const [x,y] of edge.slice(1))blade.lineTo(x,y);
 blade.quadraticCurveTo(.12,-.06,.02,-.06);
 blade.closePath();
 for(const s of [-1,1]){
  const geo=new THREE.ExtrudeGeometry(blade,{depth:.016,bevelEnabled:true,bevelThickness:.005,bevelSize:.006,bevelSegments:1,curveSegments:8});
  geo.translate(0,0,-.008);
  P.add(geo,at(0,.7,0,[0,s>0?0:Math.PI,0]),(x,y)=>{const out=Math.abs(x);return out>.2?mix(C.bronze,C.rust,THREE.MathUtils.clamp((out-.2)*25+(y<.68?.5:0),0,1)):mix(C.bronze,C.hideDark,.25);});
 }
 P.add(new THREE.ConeGeometry(.02,.12,4),at(0,.83,0),C.iron);
 return P.merge();
}

let shared=null;
function geometry(){
 if(!shared)shared={body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),
  arm:{'-1':buildArm(-1),'1':buildArm(1)},tail:buildTail(),labrys:buildLabrys(),
  flesh:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.02}),
  metal:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:.72}),
  eye:new THREE.MeshStandardMaterial({color:0xff5a1e,emissive:0xe0300a,emissiveIntensity:2.6,roughness:.3})};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createMinotaur(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.flesh,'body');
 // the head hangs low off the thrust neck, the horns levelled at whatever is in front of it
 const head=new THREE.Group();head.position.set(...NECK);head.rotation.set(.32,0,0);body.add(head);
 mesh(head,S.head,S.flesh,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.12,HIP_Y,0);body.add(leg);mesh(leg,S.leg,S.flesh,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.32,SHOULDER_Y-.02,.03);arm.rotation.set(s>0?-.3:-.1,0,s*.14);body.add(arm);mesh(arm,S.arm[s],S.flesh,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.6,.05);weaponSocket.rotation.set(-.35,Math.PI/2,-.25);arms[1].add(weaponSocket);// the labrys rests back over the right shoulder
 mesh(weaponSocket,S.labrys,S.metal,'labrys');
 const tail=new THREE.Group();tail.position.set(0,.72,-.14);body.add(tail);mesh(tail,S.tail,S.flesh,'tail');
 return {g,body,legs,tail,wings:[],quirk:'orc',kind:'minotaur',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
