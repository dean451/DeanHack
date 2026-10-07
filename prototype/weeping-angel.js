import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Weeping angels (UnNetHack's 'A' statues that only move when unseen) used to fall back on the
// generic glowing angel of their letter, robed in their glyph colour with a flaming sword. They are
// now weathered grave statues: a tall figure of pitted grey stone in a long gown whose folds run to
// a ragged hem on the floor, moss and lichen creeping up from the base and hairline cracks wandering
// over it. The head is bowed and both hands are pressed over the eyes, the fingers too long and
// ending in points that splay over the brow; black weeping stains run down the cheeks from under
// them, and below the hands the stone mouth hangs open on a row of jagged teeth. Two great wings of
// stone feathers stand folded behind, their crowns rising over the bowed head and their pointed,
// chipped primaries hanging nearly to the floor. The weeping archangel is larger, its stone darker
// and colder, its wings standing taller, and it wears a broken circlet of stone spikes.
// One vertex-coloured stone material; the body, head, each arm and each wing is one merged mesh:
// 6 draws. Geometry is built once per kind and shared.
// Handles: body, head, arms, arm (right), weaponSocket (empty, at the right palm), stoneWings (left,
// right; pivots at the shoulder blades). There are no legs, and the stone wings are deliberately
// not `wings`, so the generic wing flutter in live.js leaves them still.

const KINDS={
 'weeping angel':{stone:'#9a978e',dark:'#3e3c38',hi:'#c8c4b8',moss:'#5a6a3a',scale:1.2,wing:1},
 'weeping archangel':{stone:'#77767a',dark:'#26262c',hi:'#a8a8ae',moss:'#3e5236',scale:1.3,wing:1.18,circlet:true},
};
const CRACK=rgb('#1e1d1b'),STAIN=rgb('#151413'),MAW=rgb('#0c0a0a');
const HEAD_AT=[0,.79,.01],BOW=.38;

const hash=(a,b=0)=>{const h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
const V=p=>new THREE.Vector3(...p);
const lathe=(profile,segments=32)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
// a tube that narrows from r0 to r1 along a smooth curve through pts
function taper(pts,r0,r1,segments=10,radial=8){
 const curve=new THREE.CatmullRomCurve3(pts.map(V)),geo=new THREE.TubeGeometry(curve,segments,1,radial,false);
 const p=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<=segments;i++){const t=i/segments,r=r0+(r1-r0)*t;curve.getPointAt(t,c);for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(p,k).sub(c).multiplyScalar(r).add(c);p.setXYZ(k,v.x,v.y,v.z);}}
 geo.computeVertexNormals();
 return {geo,curve};
}
// a point/direction in head space carried into body space (the head is bowed about HEAD_AT)
const headQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(BOW,0,0));
const fromHead=p=>V(p).applyQuaternion(headQ).add(V(HEAD_AT));
const dirFromHead=p=>V(p).applyQuaternion(headQ).normalize();

// pitted, weathered stone: a fine grain, darker pits, hairline cracks, moss creeping up from the
// floor and gathering on the tops of things
function stoneOf(k){
 const S=rgb(k.stone),D=rgb(k.dark),H=rgb(k.hi),M=rgb(k.moss);
 return (x,y,z)=>{
  const grain=.5+.5*Math.sin(x*53+Math.sin(y*37)*2)*Math.sin(z*47+y*29);
  let c=mix(mix(D,S,.72+.2*grain),H,Math.max(0,grain-.8)*1.5);
  if(hash(Math.floor(x*60),Math.floor(y*60+z*60))>.93)c=mix(c,D,.55);
  const crack=Math.abs(Math.sin(x*21+y*33+Math.sin(z*19+y*7)*3));
  if(crack<.03&&Math.sin(y*6+x*9+z*4)>.35)c=mix(c,CRACK,.75);
  const lichen=.5+.5*Math.sin(x*31+z*27)*Math.sin(y*23-x*11);
  if(y<.22)c=mix(c,M,(.22-y)/.22*(.4+.6*lichen));
  else if(lichen>.86)c=mix(c,M,(lichen-.86)*3);
  return c;
 };
}

function buildBody(k,stone){
 const P=pieces();
 // the gown: a lathe from the floor to the waist, its folds deepening toward a ragged hem
 const gown=lathe([[.21,0],[.215,.03],[.2,.12],[.175,.26],[.15,.4],[.13,.5]],40);
 {const p=gown.attributes.position;for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z),deep=Math.max(0,.5-y)/.5;
  const w=1+(.09*Math.sin(a*9)+.035*Math.sin(a*17+1))*deep;
  // the hem is chipped into a ragged edge
  const hem=y<.035?(hash(Math.round(a*12))*.025):0;
  p.setXYZ(i,x*w,y+hem,z*w*.86);
 }gown.computeVertexNormals();}
 P.add(gown,null,stone);
 // bodice and shoulders up to the neck, a knotted cord at the waist
 P.add(lathe([[.13,.49],[.125,.56],[.135,.64],[.14,.69],[.11,.735],[.05,.76],[.035,.78]],28),at(0,0,0,[0,0,0],[1,1,.82]),stone);
 const cord=new THREE.TorusGeometry(.132,.012,6,28);
 P.add(cord,at(0,.505,0,[Math.PI/2,0,0],[1,.84,1]),stone);
 for(const s of [-1,1])P.add(taper([[s*.03,.5,.11],[s*.04,.4,.13],[s*.035,.3,.15]],.011,.008,6,6).geo,null,stone);
 // gathered folds falling from the bodice
 for(let i=0;i<5;i++){const x=(i-2)*.045;P.add(taper([[x,.68,.11],[x*1.1,.6,.115],[x*1.15,.52,.11]],.008,.012,6,5).geo,null,stone);}
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.055,14,10),at(s*.125,.705,0,[0,0,s*.4],[1.1,.8,.9]),stone);
 return P.merge();
}

// the bowed head, built in head space (pivot at the top of the neck, face toward +z): smooth
// stone features, hair drawn back into a knot, weeping stains under the eyes and a gaping,
// jagged-toothed mouth below where the hands cover the face
function buildHead(k,stone){
 const P=pieces();
 const face=(x,y,z)=>{
  const c=stone(x,y,z);
  // the stains run down from under each hand, darkest near the eyes
  if(z>.05&&y<.07&&y>-.02){const d=Math.abs(Math.abs(x)-.034);if(d<.009&&Math.sin(x*420)>-.3)return mix(c,STAIN,.85*(1-d/.009)*(y+.02)/.09+.25);}
  return c;
 };
 P.add(new THREE.CylinderGeometry(.036,.042,.06,12),at(0,-.01,0),stone);
 P.add(new THREE.SphereGeometry(.082,24,18),at(0,.07,.01,[0,0,0],[.95,1.12,1]),face);
 // jaw and chin, a little long
 P.add(new THREE.SphereGeometry(.05,14,10),at(0,.012,.045,[0,0,0],[1,.8,.9]),face);
 // the open mouth and its jagged teeth
 P.add(new THREE.SphereGeometry(.024,12,8),at(0,.012,.088,[0,0,0],[1.15,.6,.5]),MAW);
 for(let i=0;i<7;i++){
  const x=(i-3)*.0068,top=i%2===0;
  P.add(new THREE.ConeGeometry(.0034,.011+hash(i,4)*.005,4),at(x,top?.022:.002,.097,[top?Math.PI:0,0,0]),stone);
 }
 // hair: a cap swept back from the brow into a heavy knot, with grooves
 P.add(new THREE.SphereGeometry(.088,22,14,0,Math.PI*2,0,Math.PI*.62),at(0,.082,-.004,[-.25,0,0],[1,1.05,1.05]),(x,y,z)=>{const c=stone(x,y,z);return Math.sin(Math.atan2(x,-z)*26)>.55?mix(c,rgb(k.dark),.4):c;});
 P.add(new THREE.SphereGeometry(.045,14,10),at(0,.1,-.085,[0,0,0],[1.1,.9,.9]),stone);
 if(k.circlet){
  P.add(new THREE.TorusGeometry(.086,.008,6,28),at(0,.125,.0,[Math.PI/2-.25,0,0],[1,1.08,1]),stone);
  // the spikes, some broken off short
  for(let i=0;i<9;i++){const a=(i/9)*Math.PI*2,len=hash(i,7)>.65?.02:.05+hash(i,9)*.02;
   P.add(new THREE.ConeGeometry(.009,len,4),at(Math.sin(a)*.086,.125+Math.cos(a)*.02+len/2,Math.cos(a)*.093,[-.25,0,0]),stone);}
 }
 return P.merge();
}

// an arm for side s, in shoulder space: up from the shoulder to the face, in a wide sleeve that
// hangs from the forearm, and a hand of long pointed fingers pressed over the eyes
function buildArm(k,stone,s){
 const P=pieces(),sh=V([s*.13,.705,0]);
 const n=dirFromHead([0,-.15,1]),up=dirFromHead([0,1,0]);
 const palm=fromHead([s*.036,.075,.085]).addScaledVector(n,.022),wrist=palm.clone().addScaledVector(up,-.045).add(V([s*.012,0,.01]));
 const elbow=V([s*.18,.58,.14]);
 const L=v=>v.clone().sub(sh).toArray(),st=(x,y,z)=>stone(x+sh.x,y+sh.y,z+sh.z);
 P.add(new THREE.SphereGeometry(.045,12,10),null,st);
 P.add(taper([[0,0,0],L(V([s*.16,.65,.06])),L(elbow)],.042,.035).geo,null,st);
 P.add(new THREE.SphereGeometry(.036,10,8),at(...L(elbow)),st);
 P.add(taper([L(elbow),L(elbow.clone().lerp(wrist,.5).add(V([0,0,.02]))),L(wrist)],.033,.022).geo,null,st);
 // the sleeve: a rippled bell from the forearm, its mouth hanging below the elbow
 {const sleeve=new THREE.CylinderGeometry(.03,.075,.22,18,4,true);const p=sleeve.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z),f=1+(.11-y*.4)*Math.sin(a*7)*.5;p.setXYZ(i,x*f,y+(y<-.1?hash(Math.round(a*5),s)*.02:0),z*f);}
  sleeve.computeVertexNormals();
  const mid=elbow.clone().lerp(wrist,.35),q=new THREE.Quaternion().setFromUnitVectors(V([0,1,0]),wrist.clone().sub(elbow).normalize().add(V([0,.9,0])).normalize());
  P.add(sleeve,new THREE.Matrix4().compose(V(L(mid)).add(V([0,-.07,0])),q,V([1,1,1])),st);}
 // the palm, flat against the face
 const flat=new THREE.Quaternion().setFromUnitVectors(V([0,0,1]),n);
 P.add(new THREE.SphereGeometry(.03,12,10),new THREE.Matrix4().compose(V(L(palm)),flat,V([1,1.15,.38])),st);
 // four long fingers splayed up over the brow, curling in, ending in points; the thumb on the cheek
 const across=V([s,0,0]).sub(n.clone().multiplyScalar(n.x*s)).normalize();
 for(let f=0;f<4;f++){
  const off=(f-1.5)*.012*s,spread=(f-1.5)*.18*s;
  const base=palm.clone().addScaledVector(up,.026).addScaledVector(across,-off);
  const dir=up.clone().addScaledVector(across,-spread).normalize(),len=.06+(f===1||f===2?.012:0);
  const pts=[base,base.clone().addScaledVector(dir,len*.5).addScaledVector(n,.004),base.clone().addScaledVector(dir,len).addScaledVector(n,-.008)];
  const {geo,curve}=taper(pts.map(L),.0078,.005,8,6);P.add(geo,null,st);
  const tip=curve.getPointAt(1),t=curve.getTangentAt(1);
  P.add(new THREE.ConeGeometry(.005,.02,5).translate(0,.01,0),new THREE.Matrix4().compose(tip,new THREE.Quaternion().setFromUnitVectors(V([0,1,0]),t),V([1,1,1])),st);
 }
 const tb=palm.clone().addScaledVector(across,.022).addScaledVector(up,-.012);
 P.add(taper([tb,tb.clone().addScaledVector(across,.012).addScaledVector(up,-.03),tb.clone().addScaledVector(across,.008).addScaledVector(up,-.05).addScaledVector(n,-.008)].map(L),.008,.005,6,6).geo,null,st);
 return {geo:P.merge(),palm:V(L(palm))};
}

// a folded stone wing for side s, in shoulder-blade space: a heavy leading edge rising behind the
// head and hooking over at the crown, the long pointed primaries hanging from it nearly to the
// floor, and two rows of shorter coverts over their roots
function buildWing(k,stone,s){
 const P=pieces(),root=V([s*.07,.67,-.11]),h=k.wing;
 const st=(x,y,z)=>stone(x+root.x,y+root.y,z+root.z);
 const edge=t=>V([s*(.03+.15*Math.sin(t*Math.PI*.55)),(.04+.52*t-.06*t*t*t)*h,-.03-.07*t-.05*t*t]);
 const pts=[];for(let i=0;i<=8;i++)pts.push(edge(i/8*1.08).toArray());
 P.add(taper(pts,.03,.014,16,8).geo,null,st);
 // the crown: a few feathers hooking up and outward over the top of the edge
 for(let i=0;i<4;i++){const t=.86+i*.06,p=edge(t);
  P.add(new THREE.ConeGeometry(.026,.12-i*.012,4),at(p.x+s*.01,p.y+.04,p.z-.01,[-.2,0,s*-(.15+i*.2)],[1,1,.3]),st);}
 // primaries and secondaries: each hangs from the edge, longest at the crown
 const feather=(t,layer)=>{
  const p=edge(t),len=(layer===0?.26+.66*Math.pow(t,1.15):layer===1?.14+.26*t:.08+.1*t)*h,w=layer===0?.034:layer===1?.038:.032;
  const tilt=s*(.02+.07*t)*(layer===0?1:1.3),z=p.z-.012-layer*.012;
  const geo=new THREE.ConeGeometry(w,len,4).rotateX(Math.PI).translate(0,-len/2,0);
  // chip the point of some feathers off
  if(hash(t*40,layer)>.7){const q=geo.attributes.position;for(let i=0;i<q.count;i++)if(q.getY(i)<-len*.9)q.setY(i,-len*.88);}
  P.add(geo,at(p.x,p.y,z,[-.05-.08*t,0,tilt],[1,1,.28]),(x,y,zz)=>{const c=st(x,y,zz);return mix(c,rgb(k.dark),Math.max(0,(p.y-y)/len-.6)*.6);});
 };
 for(let i=0;i<14;i++)feather(.05+i/13*.93,0);
 for(let i=0;i<11;i++)feather(.04+i/10*.9,1);
 for(let i=0;i<8;i++)feather(.03+i/7*.85,2);
 return P.merge();
}

const cache=new Map();
function geometry(name){
 if(!cache.has(name)){
  const k=KINDS[name],stone=stoneOf(k),arms=[-1,1].map(s=>buildArm(k,stone,s));
  cache.set(name,{
   body:buildBody(k,stone),head:buildHead(k,stone),arms:arms.map(a=>a.geo),palm:arms[1].palm,wings:[-1,1].map(s=>buildWing(k,stone,s)),
   material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93,metalness:0,side:THREE.DoubleSide}),
  });
 }
 return cache.get(name);
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export const WEEPING_ANGELS=Object.keys(KINDS);
export function createWeepingAngel(name){
 const k=KINDS[name],S=geometry(name),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(k.scale);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(...HEAD_AT);head.rotation.x=BOW;body.add(head);
 mesh(head,S.head,S.material,'head');
 const arms=[],stoneWings=[];
 [-1,1].forEach((s,i)=>{
  const arm=new THREE.Group();arm.position.set(s*.13,.705,0);body.add(arm);mesh(arm,S.arms[i],S.material,'arm');arms.push(arm);
  const wing=new THREE.Group();wing.position.set(s*.07,.67,-.11);wing.userData.side=s;body.add(wing);mesh(wing,S.wings[i],S.material,'wing');stoneWings.push(wing);
 });
 const weaponSocket=new THREE.Group();weaponSocket.position.copy(S.palm);arms[1].add(weaponSocket);
 return {g,body,legs:[],tail:null,wings:[],stoneWings,quirk:'idle',kind:name,arms,arm:arms[1],weaponSocket,head};
}
