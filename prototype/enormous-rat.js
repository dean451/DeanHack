import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {pieces,rgb,mix,at} from './homunculus.js';
import {segment,chain} from './ant.js';

// The enormous rat (UnNetHack's level-6, dog-sized r) used to borrow the little sewer rat at
// .85 scale, a grey ball of spheres. It is now a hulking, diseased brute, head to the front (+z):
// - Torso: one sphere pulled into a rat's hunch: the spine arches high over the loin and drops
//   to low shoulders, the rump deep and round, the belly slung near the floor. Greasy, matted
//   spikes of fur bristle along the spine and in clumps on the flanks.
// - Coat: filthy brown, darker down the spine and grizzled, a dirty pale belly; bald, mangy
//   patches of grey-pink skin flecked with dark scabs, and an old pale scar raked across the
//   right flank.
// - Head: a long wedge skull to a pointed muzzle and a wet pink nose; the lip drawn back off
//   dark gums over long yellow chisel incisors, top and bottom; small red eyes sunk under a
//   heavy scowling brow; thin round ears, the left one torn; stiff whiskers fanning back.
// - Legs: short forelegs with long pink fingers and dark hooked claws; heavy haunches over long,
//   flat, five-toed hind feet.
// - Tail: long and naked, ringed with scales, furred only at the root, curling round to one side
//   along the floor; a kink and a scabbed nick partway down.
// Five vertex-coloured fur meshes (body, head, two leg shapes, tail), the teeth and nose in one
// glossy mesh and the eyes in one glowing one. Geometry and materials are built once and shared.
// Handles: body, head, legs (four groups), tail; quirk 'rat'.

const SCALE=1.4;
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const smooth=v=>{const t=THREE.MathUtils.clamp(v,0,1);return t*t*(3-2*t);};
const C={
 coat:rgb('#4e3c2c'),spine:rgb('#231a13'),belly:rgb('#7c6c58'),grizzle:rgb('#9a8a72'),
 skin:rgb('#8a6c66'),scab:rgb('#3e1610'),scar:rgb('#b49a8c'),pink:rgb('#b07a76'),
 ear:rgb('#92605e'),gum:rgb('#3a1214'),tooth:rgb('#d49a3c'),toothRoot:rgb('#7a4a1a'),
 claw:rgb('#16110d'),nose:rgb('#b0706e'),nostril:rgb('#2a0e0e'),whisker:rgb('#c8bfae'),
 tail:rgb('#8c6e66'),tailDark:rgb('#5e4440'),eye:'#ff2a12',
};
const NECK=[0,.235,.22],SHOULDER=[.082,.15,.13],HIP=[.092,.18,-.17],TAIL_ROOT=[0,.2,-.32];

// a cone from `base` pointing along `dir`: tufts, claws, teeth
function spike(P,base,dir,r,h,colour,radial=4){
 const d=new THREE.Vector3(...dir).normalize(),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d);
 P.add(new THREE.ConeGeometry(r,h,radial),new THREE.Matrix4().compose(new THREE.Vector3(...base).addScaledVector(d,h/2),q,new THREE.Vector3(1,1,1)),colour);
}

// Mange: bald patches on the flanks and haunch, from a few crossed waves; 0 = furred, 1 = bald.
const mange=(x,y,z)=>smooth((Math.sin(x*31+z*17+1)*Math.sin(y*29-z*23)*Math.sin(z*41+x*13+.5)-.18)*5)*smooth((Math.abs(x)-.05)*20);
// Fur: the coat (darker up the spine, grizzled), mangy skin and scabs, and the flank scar.
function coatAt(x,y,z,spineY){
 let c=mix(C.coat,C.spine,smooth((y-spineY+.06)/.06)*.85);
 const n=hash(x*913.1+y*577.3+z*311.7);
 c=n>.62?mix(c,C.grizzle,(n-.62)*1.3):mix(c,C.spine,(.62-n)*.4);
 const bald=mange(x,y,z);
 if(bald>0){c=mix(c,C.skin,bald);if(bald>.6&&hash(Math.round(x*140)*7+Math.round(y*140)*3+Math.round(z*140))>.82)c=mix(c,C.scab,.85);}
 // three parallel rake marks across the right flank, healed pale and hairless
 if(x>.06)for(let k=0;k<3;k++){const d=Math.abs((y-.22-k*.022)-(z+.04)*.55);if(d<.005&&z>-.2&&z<.08)c=mix(c,C.scar,.8*(1-d/.005));}
 return c;
}

// The torso: a hunched spine high over the loin, low shoulders, a deep rump, a slung belly.
function torso(){
 const geo=new THREE.SphereGeometry(1,32,20);geo.rotateX(Math.PI/2);
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),u=p.getZ(i);
  const arch=Math.exp(-(((u+.25)/.5)**2));
  const w=.128*(1-.1*u)*(1-.08*Math.exp(-(((u-.35)/.25)**2)));
  const yc=.2+.07*arch-.03*Math.max(0,u),ht=.095+.03*arch,hb=.1+.015*arch;
  p.setXYZ(i,x*w,yc+(y>0?y*ht:y*hb),u*.28-.05);
 }
 geo.deleteAttribute('uv');const merged=mergeVertices(geo);geo.dispose();merged.computeVertexNormals();
 return merged;
}
// height of the spine at z, to place the bristles and shade the back
const spineY=z=>{const u=(z+.05)/.28;return .2+.07*Math.exp(-(((u+.25)/.5)**2))-.03*Math.max(0,u)+.095+.03*Math.exp(-(((u+.25)/.5)**2));};

function buildBody(){
 const P=pieces();
 const paint=(x,y,z)=>{let c=coatAt(x,y,z,spineY(z));return mix(c,C.belly,smooth((.15-y)/.06)*(1-mange(x,y,z)*.6));};
 P.add(torso(),null,paint);
 // the neck, thick and low, running up into the head
 segment(P,[0,.21,.14],NECK,.09,.07,paint,14);
 P.add(new THREE.SphereGeometry(.075,14,10),at(...NECK,[0,0,0],[1,.95,1.05]),paint);
 // greasy bristles: a ragged crest down the spine, swept back and to alternate sides
 for(let i=0;i<18;i++){
  const z=.16-i*.026,j=hash(i*3.7),y=spineY(z)-.012,side=i%2?1:-1;
  const len=.035+.05*j*(1-Math.abs(i-7)/14);
  spike(P,[side*.012*j,y,z],[side*.35*j,.75,-.9],.011+.006*j,len,mix(C.spine,C.coat,j*.4),4);
 }
 // matted clumps poking out of the flanks and haunches
 for(let i=0;i<16;i++){
  const side=i%2?1:-1,z=.1-(i>>1)*.05,y=.2+.06*hash(i*5.1),x=side*(.115+.01*hash(i*1.3));
  if(mange(x,y,z)>.3)continue;
  spike(P,[x,y,z],[side*.6,.2+hash(i*2.9)*.3,-.8],.008,.03+.02*hash(i*7.7),coatAt(x,y,z,spineY(z)),4);
 }
 return P.merge();
}

function buildHead(){
 const P=pieces(),Y=C.coat;
 const paint=(x,y,z)=>{let c=coatAt(x+NECK[0],y+NECK[1],z+NECK[2],NECK[1]+.07);
  // paler, thinner fur down the muzzle and under the jaw
  return mix(c,C.belly,Math.max(smooth((z-.12)/.08)*.35,smooth((-.03-y)/.03)*.5));};
 // the skull, a long wedge to the muzzle
 P.add(new THREE.SphereGeometry(1,18,12),at(0,.02,.035,[.08,0,0],[.072,.066,.1]),paint);
 P.add(new THREE.SphereGeometry(1,16,12),at(0,-.004,.125,[.14,0,0],[.048,.042,.09]),paint);
 // lower jaw, hanging a little open
 P.add(new THREE.SphereGeometry(1,16,10),at(0,-.042,.115,[.18,0,0],[.034,.018,.07]),paint);
 // drawn-back lips: a dark gum line along each side of the mouth
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(1,12,8),at(s*.024,-.03,.155,[0,s*.25,0],[.012,.012,.05]),C.gum);
 P.add(new THREE.SphereGeometry(1,12,8),at(0,-.034,.188,[0,0,0],[.018,.01,.016]),C.gum);
 // heavy brows angled down toward the snout: a permanent scowl
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(1,12,8),at(s*.038,.047,.088,[0,0,s*.45],[.026,.011,.022]),mix(C.spine,C.coat,.3));
 // cheek tufts swept back
 for(const s of [-1,1])for(let k=0;k<3;k++)spike(P,[s*.058,-.012+k*.016,.04-k*.012],[s*.5,-.1,-1],.009,.035,mix(Y,C.spine,.3),4);
 // thin round ears; the left one torn, a ragged wedge bitten out of it
 for(const s of [-1,1]){
  const torn=s<0,ear=new THREE.CylinderGeometry(.042,.04,.006,18,1,false,torn?.9:0,torn?Math.PI*1.55:Math.PI*2);
  P.add(ear,at(s*.058,.072,-.002,[Math.PI/2-.35,s*.6,0],[1,1,1.1]),(x,y,z)=>{
   const r=Math.hypot(x-s*.058,y-.072,z+.002);return r<.03?mix(C.ear,C.skin,.3):mix(C.coat,C.spine,.4);});
 }
 // stiff whiskers fanning back from the muzzle
 for(const s of [-1,1])for(let k=0;k<5;k++){
  const a=(k-2)*.2;
  segment(P,[s*.034,-.012+a*.03,.18],[s*(.13+.02*(k%2)),-.025+a*.12,.12-.04*k],.0016,.0008,C.whisker,3);
 }
 return P.merge();
}
// Teeth and nose: the long yellow chisel incisors (darker at the root) and a wet nose.
function buildTeeth(){
 const P=pieces();
 const tooth=root=>(x,y,z)=>mix(C.tooth,C.toothRoot,smooth((root?y-root:0)/.02));
 for(const s of [-1,1]){
  // the uppers curve down out of the gum, the lowers stand up long in front of them
  P.add(new THREE.BoxGeometry(.0085,.042,.006),at(s*.005,-.052,.198,[-.22,0,0]),tooth(-.04));
  P.add(new THREE.BoxGeometry(.0075,.038,.005),at(s*.0045,-.034,.19,[.32,0,0]),(x,y,z)=>mix(C.tooth,C.toothRoot,smooth((-.042-y)/.02)));
  // a chipped notch on one tip
  if(s>0)P.add(new THREE.BoxGeometry(.004,.004,.006),at(.0075,-.071,.202),C.gum);
 }
 P.add(new THREE.SphereGeometry(1,14,10),at(0,-.004,.214,[0,0,0],[.02,.016,.014]),C.nose);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0045,6,4),at(s*.008,-.004,.226),C.nostril);
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0135,10,8),at(s*.044,.03,.098,[0,0,0],[1,.8,1]),[1,1,1]);
 return P.merge();
}

// Claws: dark, hooked down at the tips.
function digit(P,root,dir,len,r,colour){
 const tip=root.map((v,i)=>v+dir[i]*len);
 segment(P,root,tip,r,r*.75,colour,5);
 spike(P,tip,[dir[0],dir[1]-.3,dir[2]],r*.7,len*.5,C.claw,4);
}
// One right-hand leg, shoulder or hip at the origin, the floor at y=-top.
function buildLeg(fore){
 const P=pieces(),[px,py,pz]=fore?SHOULDER:HIP,fy=-py;
 const paint=(x,y,z)=>{const c=coatAt(px+x,py+y,pz+z,1);return mix(c,C.belly,x<-.01?.3:0);};
 if(fore){
  P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.01,0,[0,0,0],[.75,1.1,1]),paint);
  segment(P,[0,0,0],[0,-.07,.012],.04,.026,paint,10);
  P.add(new THREE.SphereGeometry(.026,10,6),at(0,-.07,.012),paint);
  segment(P,[0,-.07,.012],[0,fy+.022,.03],.023,.016,C.pink,8);
  // the hand: a pink palm with four long splayed fingers
  P.add(new THREE.SphereGeometry(1,10,6),at(0,fy+.012,.045,[0,0,0],[.022,.01,.026]),C.pink);
  for(const [a,l] of [[-.55,.034],[-.18,.044],[.18,.044],[.55,.034]])digit(P,[Math.sin(a)*.014,fy+.012,.058],[Math.sin(a)*.6,-.08,Math.cos(a)],l,.0055,C.pink);
 }else{
  // a heavy haunch over a hock bent back, then a long flat foot
  P.add(new THREE.SphereGeometry(1,16,12),at(0,-.02,0,[0,0,0],[.06,.085,.1]),paint);
  segment(P,[0,-.04,.02],[0,fy+.045,-.05],.04,.018,paint,10);
  P.add(new THREE.SphereGeometry(.019,10,6),at(0,fy+.045,-.05),C.pink);
  P.add(new THREE.SphereGeometry(1,12,8),at(0,fy+.011,.0,[0,0,0],[.022,.011,.075]),C.pink);
  for(const [a,l] of [[-.6,.028],[-.28,.04],[0,.046],[.28,.04],[.6,.03]])digit(P,[Math.sin(a)*.015,fy+.012,.065],[Math.sin(a)*.5,-.05,Math.cos(a)],l,.005,C.pink);
 }
 return P.merge();
}

// The tail: naked and ringed, curling round to the side along the floor (local floor y=-.2).
function buildTail(){
 const P=pieces(),n=20;
 const curve=new THREE.CatmullRomCurve3([[0,0,0],[.02,-.085,-.08],[.07,-.165,-.16],[.13,-.19,-.22],[.21,-.192,-.23],[.27,-.192,-.17],[.29,-.193,-.08],[.3,-.194,.01]].map(p=>new THREE.Vector3(...p)));
 const pts=Array.from({length:n+1},(_,i)=>curve.getPoint(i/n).toArray());
 const radii=pts.map((_,i)=>.033*(1-i/n)**.8+.004);
 // lying on the floor, never through it
 pts.forEach((p,i)=>{p[1]=Math.max(p[1],-TAIL_ROOT[1]+radii[i]*1.1);});
 const colour=j=>(x,y,z)=>{
  if(j<2)return coatAt(x+TAIL_ROOT[0],y+TAIL_ROOT[1],z+TAIL_ROOT[2],TAIL_ROOT[1]);
  let c=j%2?C.tail:mix(C.tail,C.tailDark,.55);
  c=mix(c,C.tailDark,smooth((y-pts[j][1])/radii[j])*.4);
  if(j===9)c=mix(c,C.scab,.8);// a scabbed nick
  return c;
 };
 chain(P,pts,radii,colour,8);
 P.add(new THREE.SphereGeometry(radii[0]*1.15,10,8),at(0,0,0),colour(0));
 P.add(new THREE.SphereGeometry(radii[n]*1.05,6,4),at(...pts[n]),C.tailDark);
 return P.merge();
}

let shared=null;
function build(){
 if(shared)return shared;
 const fur=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93,metalness:0});
 const gloss=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.28,metalness:0});
 const eye=new THREE.MeshStandardMaterial({color:C.eye,emissive:C.eye,emissiveIntensity:.9,roughness:.15});
 shared={fur,gloss,eye,body:buildBody(),head:buildHead(),teeth:buildTeeth(),eyes:buildEyes(),fore:buildLeg(true),hind:buildLeg(false),tail:buildTail()};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export const isEnormousRat=name=>name==='enormous rat';

export function createEnormousRat(){
 const S=build(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(SCALE);
 mesh(body,S.body,S.fur,'body');
 // the head hangs low and thrust forward
 const head=new THREE.Group();head.position.set(...NECK);head.rotation.x=.12;body.add(head);
 mesh(head,S.head,S.fur,'head');mesh(head,S.teeth,S.gloss,'teeth');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[];
 for(const s of [-1,1])for(const fore of [false,true]){
  const leg=new THREE.Group();leg.position.set(s*(fore?SHOULDER:HIP)[0],(fore?SHOULDER:HIP)[1],(fore?SHOULDER:HIP)[2]);body.add(leg);
  const m=mesh(leg,fore?S.fore:S.hind,S.fur,fore?'foreleg':'hindleg');if(s<0)m.scale.x=-1;
  legs.push(leg);
 }
 const tail=new THREE.Group();tail.position.set(...TAIL_ROOT);body.add(tail);
 mesh(tail,S.tail,S.fur,'tail');
 return {g,body,legs,tail,wings:[],quirk:'rat',head};
}
