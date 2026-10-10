import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';
import {segment,chain} from './ant.js';

// The newt used to be a yellow plank with two black button eyes. It is now a small, wet, grimy
// salamander lying low on the floor, head to the front (+z):
// - Body: one tapering tube from neck to tail tip with a slight S, warty olive-ochre on the back, mottled
//   darker, an orange belly flecked with black spots, a faint pale line down the spine.
// - Head: a broad flat spade with a blunt snout, a dark mouth line, two nostril pits and a raised brow over
//   small, bulging gold eyes with a slit-less black pupil.
// - Legs: thin, jointed, sprawled out sideways and bent down at the elbow and knee, ending in splayed
//   fingers (four in front, five behind) that grip the stone.
// - Tail: long, thin and flattened side to side, with a ragged fin along the top.
// Five merged, vertex-coloured meshes (body, head, two leg shapes, tail) and one small eye mesh, built once
// and shared. Handles: body, head, legs (four groups), tail; quirk 'lizard'.

const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const smooth=v=>{const t=THREE.MathUtils.clamp(v,0,1);return t*t*(3-2*t);};
const C={
 back:rgb('#8c6a30'),dark:rgb('#4a3418'),line:rgb('#b89448'),belly:rgb('#cc6a28'),spot:rgb('#1c1008'),
 wart:rgb('#a47c3a'),lip:rgb('#2a1608'),finDark:rgb('#5c3c1a'),finLight:rgb('#a87a34'),toe:rgb('#7a5a2c'),
 eye:'#e6b030',pupil:rgb('#0a0804'),
};
const Y0=.055; // height of the spine's centre line above the floor
const NECK=[0,Y0+.012,.2];

// the spine path: neck to tail tip, a gentle S, hugging the floor
const SPINE=(()=>{
 const pts=[[0,Y0+.012,.2],[0,Y0+.015,.12],[0,Y0+.016,.03],[0,Y0+.012,-.06],[.012,Y0+.006,-.15],[.03,Y0,-.25],[.026,Y0-.012,-.36],[0,Y0-.02,-.46],[-.03,Y0-.025,-.55]];
 return new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
})();
const N=22;
const radiusAt=t=>t<.35?.052+.012*Math.sin(t/.35*Math.PI*.5)-.0*t:.064*(1-smooth((t-.35)/.65))**.9*.95+.0035;

// mottled warty back, orange belly with black spots
function skinAt(x,y,z,yc){
 const n=hash(Math.round(x*400)*7.1+Math.round(z*400)*3.3+Math.round(y*400)*1.7);
 let c=mix(C.back,C.dark,smooth((hash(Math.floor(z*60)*5.3+Math.floor(x*60))-.35)*2.2)*.8);
 if(n>.88)c=mix(c,C.wart,.8);
 if(Math.abs(x)<.006&&y>yc)c=mix(c,C.line,.55);
 const belly=smooth((yc-y)/.025);
 if(belly>0){let b=C.belly;if(hash(Math.floor(z*80)*9.7+Math.floor(x*80)*2.1)>.82)b=mix(b,C.spot,.9);c=mix(c,b,belly);}
 return c;
}

function buildBody(){
 const P=pieces(),pts=[],radii=[];
 for(let i=0;i<=N;i++){const t=i/N;pts.push(SPINE.getPoint(t).toArray());radii.push(radiusAt(t));}
 // the tube: flattened a little top to bottom (the body lies on the floor)

 for(let j=0;j<Math.round(N*.46);j++){
  const a=pts[j],b=pts[j+1],yc=(a[1]+b[1])/2;
  const geo=new THREE.CylinderGeometry(radii[j+1],radii[j],new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b)),9,1);
  const dir=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
  const m=new THREE.Matrix4().compose(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5),q,new THREE.Vector3(1,1,1));
  P.add(geo,m,(x,y,z)=>skinAt(x,y,z,yc));
  if(j>0)P.add(new THREE.SphereGeometry(radii[j]*1.02,9,6),at(...pts[j]),(x,y,z)=>skinAt(x,y,z,pts[j][1]));
 }
 // close the neck end under the head
 P.add(new THREE.SphereGeometry(radii[0]*1.04,10,8),at(...pts[0],[0,0,0],[1,.92,1]),(x,y,z)=>skinAt(x,y,z,pts[0][1]+.02));
 return P.merge();
}
// the tail is its own mesh so it can sway: from the hip back
function buildTail(){
 const P=pieces(),start=Math.round(N*.46),pts=[],radii=[];
 for(let i=start;i<=N;i++){const t=i/N,p=SPINE.getPoint(t);pts.push([p.x-SPINE.getPoint(start/N).x,p.y-SPINE.getPoint(start/N).y,p.z-SPINE.getPoint(start/N).z]);radii.push(radiusAt(t));}
 chain(P,pts,radii,j=>(x,y,z)=>mix(skinAt(x,y,z,pts[j][1]),C.dark,.15+.5*smooth(j/pts.length)),8);
 // a ragged fin along the top, flattened side to side
 for(let j=1;j<pts.length-1;j++){
  const h=(.016+.008*hash(j*3.1))*(1-j/pts.length)+.004;
  P.add(new THREE.SphereGeometry(1,6,4),at(pts[j][0],pts[j][1]+radii[j]+h*.35,pts[j][2],[0,0,0],[.003,h,.026]),mix(C.finDark,C.finLight,hash(j*1.7)));
 }
 P.add(new THREE.SphereGeometry(radii[pts.length-1]*1.1,6,4),at(...pts[pts.length-1]),C.dark);
 return P.merge();
}
function buildHead(){
 const P=pieces(),h=(x,y,z)=>skinAt(x,y+NECK[1],z+NECK[2],NECK[1]-.03);
 // the broad, flat spade of a skull, and a blunt snout
 P.add(new THREE.SphereGeometry(1,16,10),at(0,0,.045,[0,0,0],[.056,.03,.07]),h);
 P.add(new THREE.SphereGeometry(1,14,8),at(0,-.004,.1,[0,0,0],[.036,.022,.05]),h);
 // lower jaw and a dark mouth line
 P.add(new THREE.SphereGeometry(1,12,6),at(0,-.014,.085,[0,0,0],[.034,.012,.06]),mix(C.back,C.belly,.4));
 P.add(new THREE.BoxGeometry(.062,.0035,.07),at(0,-.0105,.085),C.lip);
 // raised brows over the eyes
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(1,10,6),at(s*.032,.0205,.047,[0,0,s*.12],[.016,.006,.022]),mix(C.dark,C.back,.5));
 // nostril pits
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0035,6,4),at(s*.009,.004,.145),C.lip);
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(1,10,8),at(s*.034,.021,.043,[0,0,0],[.0135,.0125,.0135]),rgb(C.eye));
  P.add(new THREE.SphereGeometry(1,8,6),at(s*.0385,.0235,.0465,[0,0,0],[.0065,.0075,.0045]),C.pupil);
 }
 return P.merge();
}
// One right-hand leg: the shoulder or hip at the origin, the floor at y=-Y0.
function buildLeg(fore){
 const P=pieces(),fy=-Y0+.004,skin=(x,y,z)=>mix(mix(C.back,C.dark,.35),C.toe,smooth((-.03-y)/.03)*.5);
 const elbow=[.052,-.016,fore?.012:-.01],hand=[.07,fy+.008,fore?.04:-.03];
 segment(P,[0,0,0],elbow,.012,.0095,skin,6);P.add(new THREE.SphereGeometry(.0105,6,4),at(...elbow),skin);
 segment(P,elbow,hand,.0095,.007,skin,6);
 // splayed fingers (four in front, five behind), thin and fine, tipped with small dark claws
 const n=fore?4:5;
 for(let k=0;k<n;k++){
  const a=(k-(n-1)/2)*(fore?.5:.42),dir=[Math.sin(a)*.7+.3,-.04,Math.cos(a)*(fore?1:.9)*(fore?1:1.1)],len=fore?.026:.032;
  const tip=[hand[0]+dir[0]*len,fy+.003,hand[2]+(fore?1:1.15)*Math.cos(a)*len*(fore?1:1)];
  segment(P,[hand[0],hand[1],hand[2]],tip,.0034,.0022,C.toe,4);
  P.add(new THREE.ConeGeometry(.0018,.006,4),at(tip[0],tip[1]-.001,tip[2]+.003,[Math.PI/2,0,0]),C.lip);
 }
 P.add(new THREE.SphereGeometry(1,8,6),at(hand[0],hand[1],hand[2]-.002,[0,0,0],[.011,.005,.012]),C.toe);
 return P.merge();
}

const SH=[.05,Y0+.005,.12],HP=[.052,Y0,-.1];
let shared=null;
function build(){
 if(shared)return shared;
 const skin=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4,metalness:0});
 const eye=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.15,emissive:C.eye,emissiveIntensity:.25});
 shared={skin,eye,body:buildBody(),tail:buildTail(),head:buildHead(),eyes:buildEyes(),fore:buildLeg(true),hind:buildLeg(false)};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export const isNewt=name=>name==='newt';
export const NEWT_SCALE=.8;
export function createNewt(){
 const S=build(),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(NEWT_SCALE);
 mesh(body,S.body,S.skin,'body');
 const head=new THREE.Group();head.position.set(...NECK);body.add(head);
 head.add(Object.assign(new THREE.Mesh(S.head,S.skin),{castShadow:true,receiveShadow:true,userData:{part:'head'}}));
 const eyes=new THREE.Mesh(S.eyes,S.eye);eyes.userData.part='eyes';head.add(eyes);
 const legs=[];
 for(const s of [-1,1])for(const fore of [false,true]){
  const [x,y,z]=fore?SH:HP,leg=new THREE.Group();leg.position.set(s*x,y,z);body.add(leg);
  const m=mesh(leg,fore?S.fore:S.hind,S.skin,fore?'foreleg':'hindleg');if(s<0)m.scale.x=-1;
  legs.push(leg);
 }
 const root=SPINE.getPoint(Math.round(N*.46)/N),tail=new THREE.Group();tail.position.copy(root);body.add(tail);
 mesh(tail,S.tail,S.skin,'tail');
 return {g,body,legs,tail,wings:[],quirk:'lizard',head};
}
