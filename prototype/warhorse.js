import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The warhorse used to be the generic horse (stacked spheres) in a darker coat with a little steel
// nose plate and a red blanket. It is now a destrier of its own: a massive black barrel with a deep
// chest and a muscular, sloping croup under a thick, arched neck and a long, heavy, roman-nosed head.
// It goes to war armoured: a riveted steel chanfron over the face with eye guards and a brow spike,
// overlapping crinet lames down the crest of the neck, a curved peytral over the chest studded with
// bosses, all pitted with rust. A ragged caparison of blood-crimson cloth hangs from the barrel with a
// jagged, torn hem and a faded bone sigil on each flank; a high war saddle sits on top with stirrups
// hanging. The tail is braided and bound; heavy dark feathering hides iron-shod hooves.
//
// Each moving part (body, head, tail, each leg) is one merged vertex-coloured mesh on a matte
// material plus, where it has armour, one on a steel material. The legs keep the horse's order
// (front then hind, left then right) and quirk 'unicorn', so the horse gait still drives them.

const L={
 coat:'#17120f',sheen:'#3a2c22',hair:'#0b0a09',muzzle:'#2a221d',eye:'#0a0605',
 cloth:'#4a1016',clothDark:'#240709',sigil:'#b8ad92',leather:'#2a1a12',brass:'#8a6a34',
 steel:'#70757b',rust:'#5c3a24',feather:'#221c18',hoof:'#3a3a3c',
 Y:.62,frontZ:.25,hindZ:-.29,legX:.115,
};
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const UP=new THREE.Vector3(0,1,0);
const C=Object.fromEntries(Object.entries(L).filter(([,v])=>typeof v==='string').map(([k,v])=>[k,rgb(v)]));
const along=(a,b,r0,r1,seg=12)=>{
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const g=new THREE.CylinderGeometry(r1,r0,len,seg);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,d.normalize()));
 return g.translate((A.x+B.x)/2,(A.y+B.y)/2,(A.z+B.z)/2);
};
// pitted steel: mostly grey with rust blooms
const steelPaint=(x,y,z)=>mix(C.steel,C.rust,hash(Math.round(x*60)*13+Math.round(y*60)*7+Math.round(z*60))>.8?.7:hash(Math.round(x*25)+Math.round(z*31)*5)*.18);
const coatPaint=(x,y,z)=>mix(C.coat,C.sheen,Math.max(0,y-.72)*1.4+hash(Math.round(x*40)+Math.round(z*40)*3)*.06);

function buildBody(){
 const P=pieces(),S=pieces(),Y=L.Y;
 // the barrel, deep chest and heavy croup
 P.add(new THREE.CapsuleGeometry(.205,.42,8,18),at(0,Y+.12,-.02,[Math.PI/2,0,0],[.92,1,1.02]),coatPaint);
 P.add(new THREE.SphereGeometry(.2,18,14),at(0,Y+.1,.24,[0,0,0],[.98,1.08,.95]),coatPaint);
 P.add(new THREE.SphereGeometry(.21,18,14),at(0,Y+.16,-.27,[0,0,0],[1.02,.98,1.02]),coatPaint);
 // the thick, arched neck rising to the poll, with the braided mane along the crest
 const neck=new THREE.CatmullRomCurve3([[0,Y+.2,.3],[0,Y+.42,.42],[0,Y+.56,.55]].map(p=>new THREE.Vector3(...p)));
 const tube=new THREE.TubeGeometry(neck,16,.11,14,false),tp=tube.attributes.position,v=new THREE.Vector3();
 for(let i=0;i<tp.count;i++){v.fromBufferAttribute(tp,i);const t=Math.min(1,Math.max(0,(v.y-(Y+.2))/.36)),k=1.15-t*.45;tp.setX(i,v.x*k*.85);const c=neck.getPoint(t);tp.setZ(i,c.z+(v.z-c.z)*k);}
 tube.computeVertexNormals();P.add(tube,null,coatPaint);
 for(let i=0;i<10;i++){const t=i/9,p=neck.getPoint(t);P.add(new THREE.SphereGeometry(.026,8,6),at(0,p.y+.1-t*.03,p.z-.06,[0,0,0],[1,1,1.3]),C.hair);}
 // crinet: overlapping steel lames down the crest of the neck
 for(let i=0;i<7;i++){const t=.1+i*.12,p=neck.getPoint(t),tan=neck.getTangent(t);
  const g=new THREE.CylinderGeometry(.12,.12,.07,14,1,true,-Math.PI*.55,Math.PI*1.1);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,tan));
  S.add(g.translate(p.x,p.y+.015,p.z-.01),at(0,0,0,[0,0,0],[.92,1,1]),steelPaint);
  S.add(new THREE.SphereGeometry(.011,6,4),at(0,p.y+.14,p.z-.03),C.brass);}
 // peytral: a curved breastplate over the chest, studded with bosses
 S.add(new THREE.CylinderGeometry(.21,.23,.24,20,1,true,-Math.PI/2.1,Math.PI/1.05),at(0,Y+.06,.26,[.18,0,0],[1.02,1,.95]),steelPaint);
 for(const [x,y] of [[-.12,.08],[0,.12],[.12,.08],[-.07,-.02],[.07,-.02]])S.add(new THREE.SphereGeometry(.02,8,6),at(x,Y+y+.02,.48-Math.abs(x)*.3),C.brass);
 // the caparison: crimson cloth round the sides and back of the barrel, its hem torn into jagged points
 const cap=new THREE.CylinderGeometry(.235,.265,.3,40,5,true,Math.PI*.3,Math.PI*1.4),cp=cap.attributes.position;
 for(let i=0;i<cp.count;i++){v.fromBufferAttribute(cp,i);if(v.y<-.149){const a=Math.atan2(v.x,v.z);v.y-=.04+.06*Math.abs(Math.sin(a*9))+hash(Math.round(a*40))*.05;}cp.setXYZ(i,v.x,v.y,v.z);}
 cap.computeVertexNormals();
 P.add(cap,at(0,Y+.04,-.03,[0,0,0],[1,1,1.95]),(x,y,z)=>{
  // the faded sigil on each flank: a bone-pale ring round a downward blade
  const dz=z+.03,dy=y-(Y+.06),r=Math.hypot(dz,dy);
  if(Math.abs(x)>.18&&((r>.065&&r<.085)||(Math.abs(dz)<.012&&dy<.06&&dy>-.09)))return mix(C.sigil,C.cloth,.25+hash(Math.round(y*90)+Math.round(z*90))*.35);
  return mix(C.cloth,C.clothDark,y<Y-.05?.6:.15+hash(Math.round(x*30)+Math.round(z*30))*.15);
 });
 // a broken arrow still stuck in the right flank: a bone-grey shaft snapped short, a few ragged fletching vanes
 P.add(along([.19,Y+.04,-.04],[.37,Y+.12,-.08],.007,.006,5),null,C.sigil);
 for(const k of [-1,0,1])P.add(new THREE.ConeGeometry(.012,.07,3),at(.37,Y+.12+k*.012,-.08-k*.02,[0,0,-Math.PI/2+k*.5],[1,1,.3]),C.rust);
 // the war saddle: a high cantle and pommel, girth and hanging stirrups
 P.add(new THREE.BoxGeometry(.3,.05,.32),at(0,Y+.33,-.04,[0,0,0]),C.leather);
 P.add(new THREE.CylinderGeometry(.07,.08,.12,12,1,false,0,Math.PI),at(0,Y+.38,-.19,[0,Math.PI/2,Math.PI/2],[1,1,1.6]),C.leather);
 P.add(new THREE.SphereGeometry(.05,10,8),at(0,Y+.39,.11,[0,0,0],[1.2,1.1,.8]),C.leather);
 P.add(new THREE.TorusGeometry(.215,.018,5,30),at(0,Y+.12,.02,[0,Math.PI/2,0],[1,1.05,.92]),C.leather);
 for(const s of [-1,1]){P.add(along([s*.15,Y+.32,-.03],[s*.2,Y-.05,-.02],.008,.008,4),null,C.leather);S.add(new THREE.TorusGeometry(.035,.007,5,12),at(s*.2,Y-.08,-.02,[0,Math.PI/2,0]),steelPaint);}
 return {matte:P.merge(),steel:S.merge()};
}

function buildHead(){
 const P=pieces(),S=pieces();
 // built along +z, pitched down by the head group: a heavy skull and a long, roman-nosed muzzle
 P.add(new THREE.SphereGeometry(.09,16,12),at(0,0,0,[0,0,0],[.85,1,1.1]),coatPaint);
 P.add(along([0,-.005,.04],[0,-.03,.3],.072,.056,14),null,coatPaint);
 P.add(new THREE.SphereGeometry(.058,14,10),at(0,-.035,.3,[0,0,0],[.95,.85,1.05]),C.muzzle);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.013,8,6),at(s*.026,-.03,.355),C.hair);
  P.add(new THREE.SphereGeometry(.018,8,6),at(s*.068,.02,.06),C.eye);
  P.add(new THREE.ConeGeometry(.026,.09,5),at(s*.045,.1,-.03,[-.5,0,-s*.2]),C.coat);
 }
 P.add(new THREE.SphereGeometry(.045,10,8),at(0,.08,.02,[0,0,0],[1,.55,1.6]),C.hair);
 // the chanfron: a riveted steel plate down the face, eye guards and a brow spike
 S.add(new THREE.BoxGeometry(.11,.012,.3),at(0,.062,.13,[.1,0,0]),steelPaint);
 S.add(new THREE.BoxGeometry(.016,.02,.28),at(0,.072,.13,[.1,0,0]),steelPaint);
 for(const s of [-1,1]){S.add(new THREE.TorusGeometry(.03,.007,5,12,Math.PI),at(s*.064,.03,.06,[0,s*Math.PI/2,0]),steelPaint);for(let k=0;k<3;k++)S.add(new THREE.SphereGeometry(.007,5,4),at(s*.045,.07-k*.004,.05+k*.1),C.brass);}
 S.add(new THREE.ConeGeometry(.018,.12,6),at(0,.12,.04,[-.45,0,0]),steelPaint);
 // bridle: noseband and cheek straps
 P.add(new THREE.TorusGeometry(.06,.008,5,16),at(0,-.03,.24,[0,0,0],[.9,1,1]),C.leather);
 return {matte:P.merge(),steel:S.merge()};
}

function buildTail(){
 const P=pieces();
 // a short dock, then a braided switch bound with a band, the loose end flaring
 P.add(along([0,0,0],[0,-.06,-.08],.045,.035,10),null,C.coat);
 for(let i=0;i<9;i++){const t=i/8;P.add(new THREE.SphereGeometry(.03-t*.008,8,6),at(Math.sin(i*1.9)*.006,-.08-t*.3,-.1-t*.06),C.hair);}
 P.add(new THREE.TorusGeometry(.03,.008,5,12),at(0,-.2,-.12,[Math.PI/2,0,0]),C.brass);
 for(let k=-2;k<=2;k++)P.add(new THREE.ConeGeometry(.02,.14,4),at(k*.012,-.46,-.17,[Math.PI+k*.08,0,k*.12]),C.hair);
 return P.merge();
}

function buildLeg(front){
 const P=pieces(),S=pieces(),Y=L.Y,b=front?.01:-.05;
 // forearm or gaskin, knee or hock, cannon, fetlock under heavy feathering, an iron-shod hoof
 P.add(new THREE.SphereGeometry(.085,12,10),at(0,-.02,front?.0:-.01,[0,0,0],[.85,1.3,1.05]),coatPaint);
 P.add(along([0,0,0],[0,-Y*.5,b],.07,.05),null,coatPaint);
 P.add(new THREE.SphereGeometry(.045,10,8),at(0,-Y*.5,b),coatPaint);
 P.add(along([0,-Y*.5,b],[0,-Y*.84,front?0:-.02],.04,.036),null,coatPaint);
 const fz=front?0:-.02;
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2;P.add(new THREE.ConeGeometry(.024,.13,3),at(Math.sin(a)*.045,-Y*.86,fz+Math.cos(a)*.045,[Math.PI+Math.cos(a)*.35,0,-Math.sin(a)*.35],[1,1,.4]),mix(C.feather,C.sheen,hash(i*3.3)*.4));}
 P.add(along([0,-Y*.84,fz],[0,-Y+.07,fz+.02],.04,.05,12),null,C.feather);
 S.add(new THREE.CylinderGeometry(.05,.06,.07,14),at(0,-Y+.035,fz+.025),C.hoof);
 return {matte:P.merge(),steel:S.merge()};
}

let shared=null;
function geometry(){
 if(shared)return shared;
 shared={body:buildBody(),head:buildHead(),tail:buildTail(),front:buildLeg(true),hind:buildLeg(false),
  matte:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78}),
  steel:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.36,metalness:.82})};
 return shared;
}
function mesh(parent,geo,mat,name){if(!geo)return null;const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createWarhorse(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.name='warhorse';g.add(body);g.scale.setScalar(.95);body.position.z=-.16; // centred on its tile, head and tail alike
 mesh(body,S.body.matte,S.matte,'body');mesh(body,S.body.steel,S.steel,'barding');
 const head=new THREE.Group();head.position.set(0,L.Y+.6,.6);head.rotation.x=.78;body.add(head);
 mesh(head,S.head.matte,S.matte,'head');mesh(head,S.head.steel,S.steel,'chanfron');
 const tail=new THREE.Group();tail.position.set(0,L.Y+.2,-.46);body.add(tail);mesh(tail,S.tail,S.matte,'tail');
 const legs=[];
 for(const side of [-1,1]){
  const f=new THREE.Group();f.position.set(side*L.legX,L.Y,L.frontZ);body.add(f);mesh(f,S.front.matte,S.matte,'leg');mesh(f,S.front.steel,S.steel,'shoe');legs.push(f);
  const h=new THREE.Group();h.position.set(side*L.legX,L.Y,L.hindZ);body.add(h);mesh(h,S.hind.matte,S.matte,'leg');mesh(h,S.hind.steel,S.steel,'shoe');legs.push(h);
 }
 return {g,body,legs,tail,wings:[],quirk:'unicorn',head};
}
