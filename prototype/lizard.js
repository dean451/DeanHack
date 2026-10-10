import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';
import {segment,chain} from './ant.js';
import {hellfire} from './canine.js';

// The lizards (newt, gecko, lizard, iguana, chameleon, salamander, basilisk) used to be yellow planks with
// button eyes. One sculpt, seven variants (see VARIANTS): a small, wet, grimy lizard lying low on the floor,
// head to the front (+z). The newt is the reference:
// - Body: one tapering tube from neck to tail tip with a slight S, warty olive-ochre on the back, mottled
//   darker, an orange belly flecked with black spots, a faint pale line down the spine.
// - Head: a broad flat spade with a blunt snout, a dark mouth line, two nostril pits and a raised brow over
//   small, bulging gold eyes with a slit-less black pupil.
// - Legs: thin, jointed, sprawled out sideways and bent down at the elbow and knee, ending in splayed
//   fingers (four in front, five behind) that grip the stone.
// - Tail: long, thin and flattened side to side, with a ragged fin along the top.
// Five merged, vertex-coloured meshes (body, head, two leg shapes, tail), the crest and one or two eye meshes,
// built once per kind and shared. Handles: body, head, legs (four groups), tail; quirk 'lizard'.

const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const smooth=v=>{const t=THREE.MathUtils.clamp(v,0,1);return t*t*(3-2*t);};
const BASE={
 back:rgb('#8c6a30'),dark:rgb('#4a3418'),line:rgb('#b89448'),belly:rgb('#cc6a28'),spot:rgb('#1c1008'),
 wart:rgb('#a47c3a'),lip:rgb('#2a1608'),finDark:rgb('#5c3c1a'),finLight:rgb('#a87a34'),toe:rgb('#7a5a2c'),
 pupil:rgb('#0a0804'),
};
// scale: world scale; bulk: body thickness; head/snout: head size and muzzle length; fin: tail fin height;
// crest {n,h,col}: spines along the back; slit: vertical pupil; bands: banded tail; pads: toe discs; spots: belly spots;
// dewlap, casque, curl (chameleon tail), turret (chameleon eyes), fire (salamander), glow (eye emissive), mottle strength.
const VARIANTS={
 newt:{scale:.8,bulk:1,head:1,snout:1,fin:1,spots:true,mottle:.8,eye:'#e6b030',glow:.25,palette:{}},
 gecko:{scale:.62,bulk:.8,head:1.3,snout:.8,fin:0,pads:true,slit:true,mottle:.5,eye:'#e0a830',glow:.3,eyeSize:1.12,
  palette:{back:'#9ab068',dark:'#566a30',belly:'#d8d0a0',line:'#c0cc88',wart:'#b4c47c',toe:'#b8b078',spot:'#3a4a22'}},
 lizard:{scale:.85,bulk:.9,head:1,snout:1.35,fin:0,mottle:.55,eye:'#c8a030',glow:.2,
  palette:{back:'#5c7c36',dark:'#2e4420',belly:'#cbc48c',line:'#9ab860',wart:'#7a9a48',toe:'#4a5a30',spot:'#2a3a18'}},
 iguana:{scale:1.1,bulk:1.28,head:1.15,snout:1.1,fin:0,crest:{n:12,h:.026,col:'#5a5a38'},dewlap:true,bands:true,mottle:.6,eye:'#d8a030',glow:.2,
  palette:{back:'#76764c',dark:'#3e3e26',belly:'#aaa27a',line:'#9a9a66',wart:'#8a8a58',toe:'#5a5a3a',spot:'#2a2a18'}},
 chameleon:{scale:.9,bulk:1.15,head:1.15,snout:.8,fin:0,curl:true,turret:true,casque:true,mottle:.7,eye:'#d8c040',glow:.25,tall:1.25,
  palette:{back:'#4a9a76',dark:'#2a5a6a',belly:'#a8d09a',line:'#d8e07a',wart:'#7ac0a0',toe:'#3a7a6a',spot:'#c8c040'}},
 salamander:{scale:1.4,bulk:1.1,head:1.1,snout:1,fin:.6,fire:true,mottle:1,eye:'#ff8a20',glow:2,emissive:'#ff4a10',emissiveIntensity:.3,
  palette:{back:'#34201a',dark:'#160c08',belly:'#e8641c',line:'#ff8a30',wart:'#4a2a1c',toe:'#1e120c',spot:'#ffb040',lip:'#ff6a20',finDark:'#2a140c',finLight:'#e8641c'}},
 basilisk:{scale:1.5,bulk:1.3,head:1.2,snout:1.1,fin:0,crest:{n:9,h:.04,col:'#14140e'},gaze:true,bands:true,mottle:1,eye:'#d8ff30',glow:3,
  palette:{back:'#3e3e2a',dark:'#1e1e14',belly:'#6e6030',line:'#8a8a24',wart:'#52523a',toe:'#26261a',spot:'#8a8a20',lip:'#14100a'}},
};
let V=VARIANTS.newt,C=BASE;
const Y0=.055; // height of the spine's centre line above the floor
const NECK=[0,Y0+.012,.2];

// the spine path: neck to tail tip, a gentle S, hugging the floor
const spineFor=(curl,lift=0)=>{
 const pts=curl
  ?[[0,Y0+.012,.2],[0,Y0+.015,.12],[0,Y0+.016,.03],[0,Y0+.012,-.06],[.01,Y0+.02,-.16],[.04,Y0+.06,-.24],[.06,Y0+.11,-.2],[.04,Y0+.14,-.13],[0,Y0+.13,-.1]]
  :[[0,Y0+.012,.2],[0,Y0+.015,.12],[0,Y0+.016,.03],[0,Y0+.012,-.06],[.012,Y0+.006,-.15],[.03,Y0,-.25],[.026,Y0-.012,-.36],[0,Y0-.02,-.46],[-.03,Y0-.025,-.55]];
 return new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p[0],p[1]+lift*(p[2]>-.15?1:Math.max(0,(p[2]+.5)/.35)),p[2])));
};
let SPINE=spineFor(false);
const N=22;
const radiusAt=t=>V.bulk*(t<.35?.052+.012*Math.sin(t/.35*Math.PI*.5):.064*(1-smooth((t-.35)/.65))**.9*.95)+.0035;

// mottled warty back, orange belly with black spots
function skinAt(x,y,z,yc){
 const n=hash(Math.round(x*400)*7.1+Math.round(z*400)*3.3+Math.round(y*400)*1.7);
 let c=mix(C.back,C.dark,smooth((hash(Math.floor(z*60)*5.3+Math.floor(x*60))-.35)*2.2)*Math.min(1,V.mottle));
 if(V.bands&&Math.floor(z*22)%2===0)c=mix(c,C.dark,.35);
 if(n>.88)c=mix(c,C.wart,.8);
 if(Math.abs(x)<.006&&y>yc)c=mix(c,C.line,.55);
 const belly=smooth((yc-y)/.025);
 if(belly>0){let b=C.belly;if(V.spots!==false&&hash(Math.floor(z*80)*9.7+Math.floor(x*80)*2.1)>.82)b=mix(b,C.spot,.9);c=mix(c,b,belly);}
 return c;
}

// a fatter lizard is wider, not taller: it must still lie on the floor
const vk=()=>1;
function buildBody(){
 const P=pieces(),pts=[],radii=[],hip=Math.round(N*.46);
 for(let i=0;i<=N;i++){const t=i/N;pts.push(SPINE.getPoint(t).toArray());radii.push(radiusAt(t));}
 for(let j=0;j<hip;j++){
  const a=pts[j],b=pts[j+1],yc=(a[1]+b[1])/2;
  const geo=new THREE.CylinderGeometry(radii[j+1],radii[j],new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b)),9,1);
  const dir=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
  const m=new THREE.Matrix4().compose(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5),q,new THREE.Vector3(1,vk(),1));
  P.add(geo,m,(x,y,z)=>skinAt(x,y,z,yc));
  if(j>0)P.add(new THREE.SphereGeometry(radii[j]*1.02,9,6),at(...pts[j],[0,0,0],[1,vk(),1]),(x,y,z)=>skinAt(x,y,z,pts[j][1]));
 }
 // close the neck end under the head
 P.add(new THREE.SphereGeometry(radii[0]*1.04,10,8),at(...pts[0],[0,0,0],[1,.92,1]),(x,y,z)=>skinAt(x,y,z,pts[0][1]+.02));
 // an iguana's loose throat pouch
 if(V.dewlap)P.add(new THREE.SphereGeometry(1,10,8),at(0,pts[0][1]-.045,pts[0][2]-.01,[0,0,0],[.012,.045,.05]),mix(C.belly,C.back,.4));
 return P.merge();
}
// spines along the back from the neck: iguana's soft crest, basilisk's black blades (their own mesh)
function buildCrest(){
 const P=pieces(),k=V.crest;if(!k)return null;
 const col=rgb(k.col);
 for(let i=0;i<k.n;i++){
  const t=.04+.5*i/(k.n-1),p=SPINE.getPoint(t),r=radiusAt(t),h=k.h*(1-.45*Math.abs(i/(k.n-1)-.35))*(V.gaze?1+.4*Math.sin(i*1.3):1);
  const d=new THREE.Vector3(0,1,-.55).normalize(),base=new THREE.Vector3(p.x,p.y+r*.8*(V.tall||1),p.z);
  P.add(new THREE.ConeGeometry(.012+k.h*.18,h*2.2,4),new THREE.Matrix4().compose(base.clone().addScaledVector(d,h),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d),new THREE.Vector3(1,1,1)),col);
 }
 return P.merge();
}
// the tail is its own mesh so it can sway: from the hip back
function buildTail(){
 const P=pieces(),start=Math.round(N*.46),pts=[],radii=[],o=SPINE.getPoint(start/N);
 for(let i=start;i<=N;i++){const t=i/N,p=SPINE.getPoint(t);pts.push([p.x-o.x,p.y-o.y,p.z-o.z]);radii.push(radiusAt(t));}
 chain(P,pts,radii,j=>(x,y,z)=>mix(skinAt(x,y,z,pts[j][1]),C.dark,.15+.5*smooth(j/pts.length)),8);
 // a ragged fin along the top, flattened side to side (newts and salamanders)
 if(V.fin)for(let j=1;j<pts.length-1;j++){
  const h=((.016+.008*hash(j*3.1))*(1-j/pts.length)+.004)*V.fin;
  P.add(new THREE.SphereGeometry(1,6,4),at(pts[j][0],pts[j][1]+radii[j]+h*.35,pts[j][2],[0,0,0],[.003,h,.026]),mix(C.finDark,C.finLight,hash(j*1.7)));
 }
 P.add(new THREE.SphereGeometry(radii[pts.length-1]*1.1,6,4),at(...pts[pts.length-1]),C.dark);
 return P.merge();
}
function buildHead(){
 const P=pieces(),h=(x,y,z)=>skinAt(x,y+NECK[1],z+NECK[2],NECK[1]-.03),sn=V.snout;
 // the skull, and a muzzle whose length varies from a gecko's stub to a lizard's long wedge
 P.add(new THREE.SphereGeometry(1,16,10),at(0,0,.045,[0,0,0],[.056,.03*(V.tall?1.2:1),.07]),h);
 P.add(new THREE.SphereGeometry(1,14,8),at(0,-.004,.045+.055*sn,[0,0,0],[.036,.022,.05*sn]),h);
 // lower jaw and a dark mouth line
 P.add(new THREE.SphereGeometry(1,12,6),at(0,-.014,.04+.045*sn,[0,0,0],[.034,.012,.06*sn]),mix(C.back,C.belly,.4));
 P.add(new THREE.BoxGeometry(.062,.0035,.07*sn),at(0,-.0105,.04+.045*sn),C.lip);
 // raised brows over the eyes
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(1,10,6),at(s*.032,.0205,.047,[0,0,s*.12],[.016,.006,.022]),mix(C.dark,C.back,.5));
 // nostril pits
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0035,6,4),at(s*.009,.004,.045+.1*sn),C.lip);
 // a chameleon's helmet: a tall casque sweeping back over the skull
 if(V.casque)P.add(new THREE.SphereGeometry(1,10,8),at(0,.032,-.005,[-.5,0,0],[.009,.03,.05]),mix(C.back,C.line,.4));
 // the basilisk's brow crown of short horns
 if(V.gaze)for(let k=-2;k<=2;k++)P.add(new THREE.ConeGeometry(.007,.03,4),at(k*.012,.033,-.012-Math.abs(k)*.006,[-.5,0,k*.2]),rgb('#14140e'));
 return P.merge();
}
function buildEyes(side){
 const P=pieces(),sizeK=V.eyeSize||1,R=V.turret?.016:.0135;
 for(const s of side?[side]:[-1,1]){
  const x=s*(V.turret?.04:.034),z=V.turret?.035:.043,y=V.turret?.034:.021;
  if(V.turret)P.add(new THREE.SphereGeometry(1,10,8),at(x,y-.004,z,[0,0,0],[.018,.016,.018]),mix(C.back,C.dark,.2)); // the turret socket
  P.add(new THREE.SphereGeometry(1,10,8),at(x,y,z,[0,0,0],[R*sizeK,R*.93*sizeK,R*sizeK]),rgb(V.eye));
  // the pupil: a round dot, or a hard vertical slit
  const pr=V.slit?[.003,.0105,.004]:[.0065,.0075,.0045];
  P.add(new THREE.SphereGeometry(1,8,6),at(x+s*R*sizeK*.32,y+R*sizeK*.1,z+R*sizeK*.62,[0,0,0],pr),C.pupil);
 }
 return P.merge();
}
// One right-hand leg: the shoulder or hip at the origin, the floor at y=-Y0.
function buildLeg(fore){
 const P=pieces(),fy=-Y0+.004,skin=(x,y,z)=>mix(mix(C.back,C.dark,.35),C.toe,smooth((-.03-y)/.03)*.5);
 const elbow=[.052,-.016,fore?.012:-.01],hand=[.07,fy+.008,fore?.04:-.03];
 segment(P,[0,0,0],elbow,.012,.0095,skin,6);P.add(new THREE.SphereGeometry(.0105,6,4),at(...elbow),skin);
 segment(P,elbow,hand,.0095,.007,skin,6);
 // splayed fingers (four in front, five behind), thin and fine, tipped with small dark claws (or sticky pads on a gecko)
 const n=V.turret?2:fore?4:5;
 for(let k=0;k<n;k++){
  const a=(k-(n-1)/2)*(V.turret?.9:fore?.5:.42),dir=[Math.sin(a)*.7+.3,-.04,Math.cos(a)],len=fore?.026:.032;
  const tip=[hand[0]+dir[0]*len,fy+.003,hand[2]+(fore?1:1.15)*Math.cos(a)*len];
  segment(P,[hand[0],hand[1],hand[2]],tip,.0034,.0022,C.toe,4);
  if(V.pads)P.add(new THREE.CylinderGeometry(.0042,.0042,.0014,8),at(tip[0],tip[1]-.002,tip[2]+.002),mix(C.toe,C.belly,.4));
  else P.add(new THREE.ConeGeometry(.0018,.006,4),at(tip[0],tip[1]-.001,tip[2]+.003,[Math.PI/2,0,0]),C.lip);
 }
 P.add(new THREE.SphereGeometry(1,8,6),at(hand[0],hand[1],hand[2]-.002,[0,0,0],[.011,.005,.012]),C.toe);
 return P.merge();
}

const SH=[.05,Y0+.005,.12],HP=[.052,Y0,-.1];
const shared={};
function build(kind){
 if(shared[kind])return shared[kind];
 V=VARIANTS[kind];C={...BASE};for(const [k,v] of Object.entries(V.palette))C[k]=rgb(v);SPINE=spineFor(!!V.curl,Math.max(0,(V.bulk-1))*.075);
 const skin=new THREE.MeshStandardMaterial({vertexColors:true,roughness:V.fire?.6:.4,metalness:0,...(V.emissive?{emissive:V.emissive,emissiveIntensity:V.emissiveIntensity}:{})});
 const eye=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.15,emissive:V.eye,emissiveIntensity:V.glow});
 const gaze=V.gaze?[buildEyes(-1),buildEyes(1)]:null;
 shared[kind]={skin,eye,spine:SPINE,V,C,body:buildBody(),tail:buildTail(),head:buildHead(),eyes:gaze?null:buildEyes(),gaze,crest:buildCrest(),fore:buildLeg(true),hind:buildLeg(false)};
 return shared[kind];
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export const LIZARD_KINDS=Object.keys(VARIANTS);
export const isLizard=name=>name in VARIANTS;
export const isNewt=name=>name==='newt';
export function createLizard(kind='newt'){
 const S=build(kind),v=S.V,g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(v.scale);
 mesh(body,S.body,S.skin,'body');
 if(S.crest)mesh(body,S.crest,S.skin,'crest');
 const head=new THREE.Group();head.position.set(...NECK);head.scale.setScalar(v.head);body.add(head);
 head.add(Object.assign(new THREE.Mesh(S.head,S.skin),{castShadow:true,receiveShadow:true,userData:{part:'head'}}));
 if(S.gaze)S.gaze.forEach((geo,i)=>mesh(head,geo,S.eye,i?'eyeR':'eyeL'));else mesh(head,S.eyes,S.eye,'eyes');
 const legs=[];
 for(const s of [-1,1])for(const fore of [false,true]){
  const [x,y,z]=fore?SH:HP,leg=new THREE.Group();leg.position.set(s*x,y,z);body.add(leg);
  const m=mesh(leg,fore?S.fore:S.hind,S.skin,fore?'foreleg':'hindleg');if(s<0)m.scale.x=-1;
  legs.push(leg);
 }
 const root=S.spine.getPoint(Math.round(N*.46)/N),tail=new THREE.Group();tail.position.copy(root);body.add(tail);
 mesh(tail,S.tail,S.skin,'tail');
 // salamanders burn like hell hounds: tongues of flame (tagged part 'flame', so flame-flicker.js flickers and lights them)
 if(v.fire){
  [[.14,.8],[.04,1],[-.06,.9]].forEach(([z,sc],i)=>hellfire(body,(i%2?.01:-.01),.1,z+.08,sc*.5,-.5,(i%2?-1:1)*.15));
  hellfire(head,0,.04,-.01,.4,-.7);
  hellfire(tail,0,0,-.18,.5,.3);
 }
 return {g,body,legs,tail,wings:[],quirk:'lizard',head};
}
export const createNewt=()=>createLizard('newt');
