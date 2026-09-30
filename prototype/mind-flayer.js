import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Mind flayers used to be a stack of primitives: a robe cylinder, a box chest, two spheres for a
// head and four even tubes for tentacles, in about twenty draws. They now stand as gaunt robed
// illithids: a long robe split at the front over a coloured lining, with embroidered bands at the
// hem, a sash and a clasp at the throat; a tall stiff collar flaring up behind the head, ribbed and
// lined; bell sleeves with long, thin three-fingered hands and dark nails. The head is a swollen
// cranium swept up and back, ridged like a brain and veined at the temples, over a narrow face with
// a heavy brow and big, slanted, pupil-less glowing eyes. Four tapering tentacles hang from the
// mouth, the middle two longest, curling out at the tips. Master mind flayers wear gold trim and
// a gold circlet with a glowing stone.
// Each moving part (body, head, tentacles, each leg and arm) is one merged vertex-coloured mesh
// sharing one material; the eyes (and a master's circlet stone) are one more mesh on an emissive
// material: 8 draws. Geometry is built once per kind and shared.
// Handles: body, head, tail (the tentacles, pivoting at the mouth, which live.js sways and the
// tentacle attack lifts), legs, arms, arm (right) and weaponSocket (empty, at the right hand).

const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const lathe=(profile,segments=28,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const V=p=>new THREE.Vector3(...p);
// A tube that narrows from r0 to r1 along a smooth curve through pts.
function taper(pts,r0,r1,segments=18,radial=7){
 const curve=new THREE.CatmullRomCurve3(pts.map(V)),geo=new THREE.TubeGeometry(curve,segments,1,radial,false);
 const p=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<=segments;i++){const t=i/segments,r=r0+(r1-r0)*t;curve.getPointAt(t,c);for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(p,k).sub(c).multiplyScalar(r).add(c);p.setXYZ(k,v.x,v.y,v.z);}}
 return geo;
}

export const MIND_FLAYER_KINDS={
 'mind flayer':{skin:'#a07aa8',skinDark:'#6a4a78',vein:'#4e3a86',robe:'#3a2a52',robeDark:'#1e1630',lining:'#6a1f2e',trim:'#a498bc',boot:'#241c2c',
  eye:{color:0xcfe8c0,emissive:0x6fa860,emissiveIntensity:1.2}},
 'master mind flayer':{skin:'#b088c0',skinDark:'#74508a',vein:'#5a2a7a',robe:'#4a1f4a',robeDark:'#260c26',lining:'#1f2a52',trim:'#d0a848',boot:'#2a1420',
  eye:{color:0xffb66b,emissive:0xd95b1e,emissiveIntensity:2.5},circlet:'#d8b050',scale:1.1},
};

// the head's big cranium: an ellipsoid swept up and back
const CRANIUM={c:new THREE.Vector3(0,.15,-.05),a:new THREE.Vector3(.155,.165,.205),tilt:new THREE.Euler(-.4,0,0)};
// a circlet band round the cranium, level in the world, above the brow; phi 0 is the front
function onCircle(phi,lift=1.025,h=.3){
 const n=new THREE.Vector3(0,Math.cos(.4),Math.sin(.4)),e2=new THREE.Vector3(0,-Math.sin(.4),Math.cos(.4)),r=Math.sqrt(1-h*h);
 const d=n.multiplyScalar(h).add(new THREE.Vector3(Math.sin(phi)*r,0,0)).add(e2.multiplyScalar(Math.cos(phi)*r));
 return d.multiply(CRANIUM.a).multiplyScalar(lift).applyEuler(CRANIUM.tilt).add(CRANIUM.c).toArray();
}
function onCranium(u,th,lift=1.01){
 const s=Math.sqrt(1-u*u),d=new THREE.Vector3(u,s*Math.sin(th),s*Math.cos(th));
 return d.multiply(CRANIUM.a).multiplyScalar(lift).applyEuler(CRANIUM.tilt).add(CRANIUM.c).toArray();
}

function buildBody(C){
 const P=pieces(),gap=.26;
 // skirt: open at the front over the lining, darker toward the hem
 const skirt=[[.3,.2],[.285,.27],[.255,.38],[.225,.5],[.2,.6]];
 P.add(lathe(skirt,32,gap,Math.PI*2-2*gap),at(0,0,0,[0,0,0],[1,1,.8]),ramp(C.robeDark,C.robe,.2,.5));
 P.add(lathe(skirt.map(([r,y])=>[r*.94,y]),24),at(0,0,0,[0,0,0],[1,1,.8]),ramp(mix(C.lining,C.robeDark,.4),C.lining,.2,.45));
 // embroidered band round the hem, and down both edges of the slit
 P.add(lathe([[.303,.2],[.308,.225],[.3,.25]],32,gap,Math.PI*2-2*gap),at(0,0,0,[0,0,0],[1,1,.8]),C.trim);
 for(const s of [-1,1]){
  const edge=skirt.map(([r,y])=>[s*r*Math.sin(gap)*1.01,y,r*Math.cos(gap)*.8*1.01]);
  P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge.map(V)),10,.009,5),null,C.trim);
 }
 // chest and shoulders
 P.add(lathe([[.2,.58],[.205,.66],[.22,.76],[.235,.86],[.23,.92],[.19,.97],[.11,1.0],[.05,1.01]],28),at(0,0,0,[0,0,0],[1,1,.78]),(x,y,z)=>mix(ramp(C.robeDark,C.robe,.58,.9)(y),C.robeDark,z<-.05?.25:0));
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.085,12,8),at(s*.2,.93,-.01,[0,0,s*.3],[1.1,.7,1]),C.robe);
 // a row of trim down the chest to the sash
 P.add(new THREE.BoxGeometry(.035,.34,.01),at(0,.8,.18,[-.06,0,0]),C.trim);
 // sash knotted at the left hip, tails hanging
 P.add(new THREE.TorusGeometry(.205,.022,6,30),at(0,.6,0,[Math.PI/2,0,0],[1,.8,1]),C.lining);
 P.add(new THREE.SphereGeometry(.03,8,6),at(-.12,.59,.13),C.lining);
 for(const [dx,len,rz] of [[-.13,.2,.08],[-.1,.16,-.1]])P.add(new THREE.BoxGeometry(.04,len,.008),at(dx,.58-len/2,.14,[.12,0,rz]),ramp(mix(C.lining,C.robeDark,.4),C.lining,.36,.58));
 // the tall collar: flaring up behind the head, open at the front, lined inside and ribbed outside
 const collar=[[.13,.95],[.15,1.03],[.19,1.14],[.25,1.27],[.3,1.39],[.32,1.44]],cs=.95,cl=Math.PI*2-2*cs;
 P.add(lathe(collar,28,cs,cl),at(0,0,-.02,[0,0,0],[1,1,.85]),ramp(C.robeDark,C.robe,1,1.4));
 P.add(lathe(collar.map(([r,y])=>[r-.012,y+.004]),28,cs,cl),at(0,0,-.02,[0,0,0],[1,1,.85]),ramp(C.robeDark,C.lining,.98,1.4));
 P.add(lathe([[.314,1.425],[.33,1.448],[.322,1.46]],28,cs,cl),at(0,0,-.02,[0,0,0],[1,1,.85]),C.trim);
 for(let i=0;i<7;i++){
  const phi=cs+.15+i*(cl-.3)/6;
  const rib=collar.map(([r,y])=>[(r+.006)*Math.sin(phi),y,(r+.006)*Math.cos(phi)*.85-.02]);
  P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rib.map(V)),10,.006,4),null,C.trim);
 }
 // the clasp at the throat
 P.add(new THREE.CylinderGeometry(.03,.03,.012,12),at(0,.97,.15,[Math.PI/2-.3,0,0]),C.trim);
 P.add(new THREE.SphereGeometry(.016,8,6),at(0,.972,.158),C.lining);
 // neck: thin and sinewy
 P.add(new THREE.CylinderGeometry(.045,.058,.14,10),at(0,1.04,.015),ramp(C.skinDark,C.skin,.97,1.1));
 return P.merge();
}

function buildHead(C){
 const P=pieces();
 // the narrow face and the swollen cranium, darker and veinier toward the back
 P.add(new THREE.SphereGeometry(.085,16,12),at(0,.04,.05,[.15,0,0],[1,1.2,1]),(x,y,z)=>mix(C.skin,C.skinDark,THREE.MathUtils.clamp((.02-y)*6,0,.5)));
 P.add(new THREE.SphereGeometry(1,28,20),at(CRANIUM.c.x,CRANIUM.c.y,CRANIUM.c.z,CRANIUM.tilt.toArray().slice(0,3),CRANIUM.a.toArray()),(x,y,z)=>mix(C.skin,C.skinDark,THREE.MathUtils.clamp(-z*2.2,0,.45)));
 // brain-like ridges running from the brow over the crown to the nape
 for(const u of [-.52,-.26,0,.26,.52]){
  const pts=[];for(let i=0;i<=10;i++)pts.push(onCranium(u,.55+i*.2+(u?Math.sin(i*1.7+u*9)*.05:0)));
  P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(V)),20,u?.009:.012,5),null,mix(C.skin,C.skinDark,.35));
 }
 // veins wandering over the temples
 for(const s of [-1,1])for(let k=0;k<3;k++){
  const pts=[];for(let i=0;i<=5;i++)pts.push(onCranium(s*(.78-i*.03+hash(k*5+i)*.04),.6+k*.45+i*.12,1.006));
  P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(V)),10,.004,4),null,C.vein);
 }
 // heavy brow, deep sockets under it, and a pinched nose ridge
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.04,10,8),at(s*.052,.112,.1,[0,0,s*.35],[1.3,.45,.7]),C.skin);
  P.add(new THREE.SphereGeometry(.034,10,8),at(s*.055,.084,.098,[0,0,s*.3],[1.4,.85,.5]),C.skinDark);
 }
 P.add(new THREE.SphereGeometry(.018,8,6),at(0,.062,.125,[0,0,0],[.7,1.3,.8]),C.skinDark);
 // the mouth the tentacles grow from
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.005,.1,[0,0,0],[1,.7,.7]),mix(C.skinDark,C.vein,.3));
 if(C.circlet){
  const ring=[];for(let i=0;i<40;i++)ring.push(V(onCircle(i/40*Math.PI*2)));
  P.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring,true),60,.011,5,true),null,C.circlet);
  const [x,y,z]=onCircle(0,1.06);P.add(new THREE.OctahedronGeometry(.024,0),at(x,y,z,[.35,0,0],[1,1.3,.6]),C.circlet);
 }
 return P.merge();
}

function buildEyes(C){
 const P=pieces(),white=[1,1,1];
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.03,12,8),at(s*.056,.086,.112,[0,s*.3,s*.35],[1.35,.62,.55]),white);
 if(C.circlet){const [x,y,z]=onCircle(0,1.13);P.add(new THREE.SphereGeometry(.012,8,6),at(x,y,z),white);}
 return P.merge();
}

// four tentacles from the mouth (the tail group sits at the mouth), longest in the middle,
// hanging over the chest and curling out at the tips, with pale suckers underneath
function buildTentacles(C){
 const P=pieces();
 for(const [x,len] of [[-.045,.25],[-.016,.32],[.016,.32],[.045,.25]]){
  const s=Math.sign(x),pts=[[x,0,0],[x*1.1,-.06,.04],[x*1.35,-len*.5,.08],[x*1.6+s*.01,-len*.8,.1],[x*1.9+s*.04,-len,.13],[x*2+s*.07,-len*.98,.17]];
  const shade=(px,py)=>mix(C.skin,C.skinDark,THREE.MathUtils.clamp(-py/len,0,1)*.6);
  P.add(taper(pts,.019,.004),null,shade);
  const curve=new THREE.CatmullRomCurve3(pts.map(V));
  for(let i=2;i<9;i++){const q=curve.getPointAt(i/10);P.add(new THREE.SphereGeometry(.0055,5,4),at(q.x,q.y,q.z+.015*(1-i/12)),mix(C.skin,[1,.9,.95],.45));}
 }
 return P.merge();
}

// Dark trousers and a soft pointed slipper; the robe covers the rest.
function buildLeg(C){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.052,.043,.28,10),at(0,-.15,0),ramp(C.robeDark,mix(C.robeDark,C.robe,.5),-.3,-.05));
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.33,.04,[0,0,0],[.9,.55,1.9]),(x,y)=>y<-.345?mix(C.boot,[0,0,0],.3):C.boot);
 P.add(new THREE.ConeGeometry(.022,.07,8),at(0,-.318,.145,[Math.PI/2-.5,0,0]),C.boot);
 P.add(new THREE.TorusGeometry(.046,.008,4,14),at(0,-.3,0,[Math.PI/2,0,0]),C.trim);
 return P.merge();
}

// A bell sleeve hanging from the shoulder, a bony wrist and a long three-fingered hand.
function buildArm(C){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.07,12,8),at(0,-.02,0),C.robe);
 const sleeve=[[.065,0],[.07,-.1],[.078,-.2],[.1,-.29],[.125,-.35]];
 P.add(lathe(sleeve,20),null,ramp(C.robe,C.robeDark,-.05,-.35));
 P.add(lathe(sleeve.map(([r,y])=>[r*.9,y-.003]),20),null,C.lining);
 P.add(lathe([[.126,-.34],[.132,-.35],[.126,-.362]],20),null,C.trim);
 P.add(new THREE.CylinderGeometry(.022,.026,.14,8),at(0,-.36,.005),C.skinDark);
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,-.44,.01,[0,0,0],[.9,1.2,.55]),C.skin);
 for(const [dx,rz] of [[-.018,.12],[0,0],[.018,-.12]]){
  const m=new THREE.Matrix4().multiplyMatrices(at(dx,-.46,.012,[.12,0,rz]),at(0,-.05,0));
  P.add(new THREE.CylinderGeometry(.0075,.006,.1,6),m,C.skin);
  for(const y of [-.018,.018])P.add(new THREE.SphereGeometry(.0085,6,4),new THREE.Matrix4().multiplyMatrices(m,at(0,y,0)),C.skin);
  P.add(new THREE.ConeGeometry(.006,.02,5),new THREE.Matrix4().multiplyMatrices(m,at(0,-.058,0,[Math.PI,0,0])),mix(C.boot,[0,0,0],.4));
 }
 P.add(new THREE.CylinderGeometry(.007,.006,.06,6),at(0,-.44,.035,[.9,0,0]),C.skin);
 return P.merge();
}

const cache=new Map();
function geometry(name){
 if(cache.has(name))return cache.get(name);
 const o=MIND_FLAYER_KINDS[name],C={};
 for(const [k,v] of Object.entries(o))if(typeof v==='string')C[k]=rgb(v);
 const S={
  body:buildBody(C),head:buildHead(C),eyes:buildEyes(C),tentacles:buildTentacles(C),leg:buildLeg(C),arm:buildArm(C),
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.04,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({...o.eye,vertexColors:true,roughness:.3}),
 };
 cache.set(name,S);return S;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createMindFlayer(name){
 const S=geometry(name),g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(MIND_FLAYER_KINDS[name].scale||1);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,1.08,.02);body.add(head);
 mesh(head,S.head,S.material,'head');
 const eyes=mesh(head,S.eyes,S.glow,'eyes');eyes.castShadow=false;
 const tail=new THREE.Group();tail.position.set(0,-.01,.13);head.add(tail);
 mesh(tail,S.tentacles,S.material,'tentacles');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.09,.36,0);body.add(leg);mesh(leg,S.leg,S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.25,.92,0);arm.rotation.set(-.15,0,s*.1);body.add(arm);mesh(arm,S.arm,S.material,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.47,.02);arms[1].add(weaponSocket);
 return {g,body,legs,tail,wings:[],quirk:'idle',arms,arm:arms[1],weaponSocket,head};
}
