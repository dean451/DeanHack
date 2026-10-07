import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The giant turtle used to be a smooth half-sphere with seven blobs on top. It is
// now a big tortoise standing up on its legs, facing +z. The high carapace is
// cut into horn scutes: five down the spine, four costals on each side and a
// ring of marginals that flares out over the legs and tail. Each scute is a
// raised pad with a pale centre, dark growth rings and grooved seams. Under it
// sits a cream plastron with dark seams. The head has a wrinkled neck, a scaly
// crown, a hooked horn beak and dark eyes. The legs are elephantine columns
// armoured with big scales, with blunt nails and spurs on the hind thighs.
// Each moving part (body, head, tail, each leg) is one merged, vertex-coloured
// mesh with a shared material: 7 draws. The geometry is built once and shared.
// Handles: body, head, tail, legs. It keeps the 'turtle' quirk.

const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const smooth=(a,b,v)=>{const t=clamp01((v-a)/(b-a));return t*t*(3-2*t);};
const hash=i=>{const s=Math.sin(i*12.9898+4.1)*43758.5453;return s-Math.floor(s);};

const C={
 horn:rgb('#4f4d2a'),areola:rgb('#a8944e'),ring:rgb('#2c2a16'),seam:rgb('#15130a'),rimUnder:rgb('#2a2616'),
 plastron:rgb('#c9b67a'),plastronSeam:rgb('#4a3a1e'),
 skin:rgb('#6d6a4c'),skinDark:rgb('#4a4832'),scale:rgb('#8a8458'),belly:rgb('#a79e70'),
 beak:rgb('#2a2418'),nail:rgb('#1e1a12'),eye:rgb('#120c06'),glint:rgb('#e8e4d0'),
};

// Carapace: a half-ellipsoid with its rim at SHELL.y.
const SHELL={y:.1,w:.27,h:.25,len:.33};

// Scute centres on the unit dome, as polar angle from the top and azimuth
// (0 toward the head, π/2 toward +x).
const dir=(p,a)=>new THREE.Vector3(Math.sin(p)*Math.sin(a),Math.cos(p),Math.sin(p)*Math.cos(a));
const SCUTES=[];
for(const [p,a] of [[.8,0],[.4,0],[0,0],[.4,Math.PI],[.8,Math.PI]])SCUTES.push({c:dir(p,a),kind:'vertebral'});
for(const s of [-1,1])for(const a of [.62,1.2,1.78,2.36])SCUTES.push({c:dir(1.0,s*a),kind:'costal'});
for(let k=0;k<24;k++)SCUTES.push({c:dir(1.42,k*Math.PI/12),kind:'marginal'});

// Which scute a direction falls in, and how far it is from that scute's edge.
function cell(d){
 let i1=-1,d1=Infinity,d2=Infinity;
 SCUTES.forEach((s,i)=>{const dd=s.c.distanceTo(d);if(dd<d1){d2=d1;d1=dd;i1=i;}else if(dd<d2)d2=dd;});
 return {i:i1,edge:d2-d1,centre:d1};
}

// How the unit dome is pushed out: raised pads between grooved seams, a rim that
// flares out (most at the back) and arches up over the neck.
function shapeShell(v){
 const {edge}=cell(v),p=Math.acos(THREE.MathUtils.clamp(v.y,-1,1));
 const r=1-.03*(1-smooth(0,.06,edge))+.03*smooth(0,.32,edge);
 const rim=smooth(1.15,Math.PI/2,p),flare=1+.07*rim*(1+.8*Math.max(0,-v.z));
 const arch=.16*rim*Math.pow(Math.max(0,v.z),4)+.05*rim*Math.pow(Math.max(0,-v.z),4);
 return new THREE.Vector3(v.x*r*flare*SHELL.w,SHELL.y+(v.y*r+arch)*SHELL.h,v.z*r*flare*SHELL.len);
}
function shellColour(x,y,z){
 const d=new THREE.Vector3(x/SHELL.w,(y-SHELL.y)/SHELL.h,z/SHELL.len).normalize(),{i,edge}=cell(d);
 const kind=SCUTES[i].kind,tint=(hash(i)-.5)*.14;
 // pale areola in the middle, growth rings stepping out to the dark seam
 let c=mix(C.horn,C.areola,smooth(.06,.26,edge)+tint);
 c=mix(c,C.ring,(.5+.5*Math.sin(edge*70))*.35*smooth(.02,.08,edge)*(1-smooth(.22,.34,edge)));
 if(kind==='marginal')c=mix(c,C.horn,.25);
 c=mix(c,C.seam,1-smooth(.008,.03,edge));
 // the underside of the rim, where it tucks in
 return mix(c,C.rimUnder,1-smooth(.02,.12,d.y));
}
function buildBody(){
 const P=pieces();
 const dome=new THREE.SphereGeometry(1,56,22,0,Math.PI*2,0,Math.PI/2),pos=dome.attributes.position,v=new THREE.Vector3();
 for(let k=0;k<pos.count;k++){v.fromBufferAttribute(pos,k);pos.setXYZ(k,...shapeShell(v.normalize()).toArray());}
 dome.computeVertexNormals();
 P.add(dome,null,shellColour);
 // plastron: a flat cream shield with dark seams across it and down the middle
 const seams=[-.23,-.12,-.01,.1,.2];
 P.add(new THREE.SphereGeometry(1,28,8),at(0,SHELL.y-.002,-.005,[0,0,0],[SHELL.w*.9,.04,SHELL.len*.95]),(x,y,z)=>{
  let c=mix(C.plastron,C.plastronSeam,clamp01(.15-(y-SHELL.y+.03)*6));
  const seam=Math.min(Math.abs(x),...seams.map(s=>Math.abs(z-s)));
  return mix(c,C.plastronSeam,1-smooth(.004,.012,seam));
 });
 // skin filling the openings for the neck, legs and tail
 P.add(new THREE.SphereGeometry(1,20,10),at(0,SHELL.y+.03,.24,[0,0,0],[.1,.06,.08]),C.skinDark);
 P.add(new THREE.SphereGeometry(1,16,8),at(0,SHELL.y+.02,-.28,[0,0,0],[.08,.05,.06]),C.skinDark);
 return P.merge();
}

// A tapered rod from a to b.
function rod(P,a,b,r0,r1,colour,segments=10){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const geo=r1>0?new THREE.CylinderGeometry(r1,r0,len,segments,3):new THREE.ConeGeometry(r0,len,segments);
 P.add(geo,new THREE.Matrix4().compose(A.clone().addScaledVector(d,.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()),new THREE.Vector3(1,1,1)),colour);
}

// Head space: the neck leaves the shell at the origin and rises forward along +z.
const NECK=[[0,0,0,.055],[0,.018,.035,.05],[0,.038,.07,.046],[0,.055,.1,.043]];
function buildHead(){
 const P=pieces();
 // the neck, folded into loose rings of wrinkled skin
 const folds=(x,y,z)=>mix(mix(C.skin,C.belly,clamp01(-(y-.02)*12)),C.skinDark,(.5+.5*Math.sin(z*150))*.45);
 NECK.forEach(([x,y,z,r],k)=>P.add(new THREE.SphereGeometry(r,14,8),at(x,y,z,[-.35,0,0],[1,.92,1.1]),folds));
 // skull, snout and lower jaw
 const H=[0,.07,.15];
 P.add(new THREE.SphereGeometry(1,20,14),at(H[0],H[1],H[2],[0,0,0],[.05,.043,.062]),(x,y)=>mix(C.skin,C.belly,clamp01((.06-y)*18)));
 P.add(new THREE.SphereGeometry(1,16,12),at(0,.062,.198,[.25,0,0],[.034,.03,.03]),(x,y,z)=>mix(C.skin,C.beak,smooth(.205,.222,z)));
 P.add(new THREE.SphereGeometry(1,14,8),at(0,.038,.182,[0,0,0],[.037,.017,.04]),(x,y,z)=>mix(C.belly,C.beak,smooth(.2,.215,z)));
 // hooked horn beak on the upper jaw, and the dark line of the mouth
 P.add(new THREE.ConeGeometry(.011,.026,8),at(0,.045,.225,[Math.PI*.82,0,0],[1.4,1,.8]),C.beak);
 for(const s of [-1,1])rod(P,[s*.034,.046,.15],[s*.022,.043,.212],.0035,.003,C.beak,6);
 // nostrils, and big scales on the crown and cheeks
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.004,6,4),at(s*.009,.08,.222),C.beak);
 for(const [x,y,z,w,l] of [[0,.112,.16,.022,.026],[-.02,.108,.19,.013,.016],[.02,.108,.19,.013,.016],[-.022,.106,.128,.017,.02],[.022,.106,.128,.017,.02],[0,.107,.12,.015,.016]])
  P.add(new THREE.SphereGeometry(1,10,5),at(x,y,z,[-.25,0,0],[w,.006,l]),C.scale);
 for(const s of [-1,1])for(const [y,z] of [[.058,.12],[.075,.108],[.045,.14]])P.add(new THREE.SphereGeometry(1,8,5),at(s*.046,y,z,[0,s*.6,0],[.004,.012,.014]),C.scale);
 // dark eyes under a heavy lid, each with a glint
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.014,12,8),at(s*.037,.084,.176),C.eye);
  P.add(new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI*.55),at(s*.037,.086,.174,[-.3,0,s*-.3],[.017,.012,.017]),C.skinDark);
  P.add(new THREE.SphereGeometry(.0035,6,4),at(s*.045,.087,.186),C.glint);
 }
 return P.merge();
}

// A leg from the hip at the origin down to the floor at y=-drop: a thick column
// armoured with big scales on the front, a round foot with blunt nails.
function buildLeg(side,hind,drop){
 const P=pieces(),k=hind?1.12:1;
 const skin=(x,y)=>mix(C.skinDark,C.skin,clamp01((y+drop)/drop*1.4));
 const foot=[side*.07,-drop+.02,hind?-.005:.02];
 P.add(new THREE.SphereGeometry(.055*k,12,8),at(side*.01,0,0,[0,0,0],[1,.9,1]),skin);
 rod(P,[side*.01,0,0],[foot[0],-drop+.045,foot[2]],.048*k,.044*k,skin,14);
 P.add(new THREE.SphereGeometry(1,16,8),at(foot[0],-drop+.02,foot[2]+.006,[0,0,0],[.056*k,.02,.058*k]),skin);
 // overlapping scales on the front of the column, largest low down
 const rows=hind?3:4;
 for(let r=0;r<rows;r++){
  const t=(r+.5)/rows,y=-t*(drop-.03),x=side*(.01+.06*t),z=(hind?-.005:.02)*t;
  for(const a of hind?[-.5,.5]:[-.75,0,.75]){
   const R=.047*k,sz=.015+.008*t;
   P.add(new THREE.SphereGeometry(1,8,5),at(x+Math.sin(a)*R,y,z+Math.cos(a)*R*(hind?-1:1),[.3*(hind?-1:1),a,0],[sz,sz*.8,.006]),mix(C.scale,C.areola,.2*hash(r*7+a*3)));
  }
 }
 // blunt nails round the front of the foot
 const nails=hind?[-.5,-.17,.17,.5]:[-.66,-.33,0,.33,.66];
 for(const a of nails){
  const dx=Math.sin(a),dz=Math.cos(a),R=.052*k;
  P.add(new THREE.ConeGeometry(.009,.022,6),at(foot[0]+dx*R,-drop+.016,foot[2]+.006+dz*R,[Math.PI/2-.35,a,0],[1,1,.7]),C.nail);
 }
 // conical spurs on the back of the hind thighs
 if(hind)for(const [y,dx] of [[-.02,0],[-.04,.018]])P.add(new THREE.ConeGeometry(.012,.032,6),at(side*(.02+dx),y,-.05,[-Math.PI/2+.3,0,0]),C.scale);
 return P.merge();
}

// Tail space: the root at the origin, a short thick tail hanging back and down.
function buildTail(){
 const P=pieces();
 const pts=[[0,0,0,.028],[0,-.014,-.03,.022],[0,-.03,-.055,.015],[0,-.045,-.075,.009]];
 for(const [x,y,z,r] of pts)P.add(new THREE.SphereGeometry(r,12,8),at(x,y,z,[0,0,0],[1,.85,1.3]),(px,py)=>mix(C.skinDark,C.skin,clamp01((py-y+r)/(2*r))));
 P.add(new THREE.ConeGeometry(.007,.02,6),at(0,-.052,-.09,[-Math.PI/2-.5,0,0]),C.nail);
 return P.merge();
}

const LEGS=[{z:.17,hind:false,y:.12},{z:-.17,hind:true,y:.115}];
let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.04,side:THREE.DoubleSide});
 const leg={};
 for(const {hind,y} of LEGS)for(const s of [-1,1])leg[`${hind?'hind':'front'}${s}`]=buildLeg(s,hind,y);
 shared={material,body:buildBody(),head:buildHead(),tail:buildTail(),leg};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createTurtle(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(1.2);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,SHELL.y+.03,.27);body.add(head);mesh(head,S.head,S.material,'head');
 const tail=new THREE.Group();tail.position.set(0,SHELL.y+.01,-.31);body.add(tail);mesh(tail,S.tail,S.material,'tail');
 const legs=[];
 for(const {z,hind,y} of LEGS)for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.2,y,z);body.add(leg);
  mesh(leg,S.leg[`${hind?'hind':'front'}${s}`],S.material,'leg');legs.push(leg);
 }
 return {g,body,legs,tail,wings:[],quirk:'turtle',head};
}
