import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rgb,mix,at} from './homunculus.js';

// The paper golem used to be the stone golem's slab body tinted cream. It is now folded from the
// blank scrolls it was made of: every face is a flat, creased plane, so it reads as paper under any
// light. The torso is an eight-sided folded lantern, with a creased tabard of printed pages hanging
// down the front and back, a wax seal on the chest, a twisted paper cord at the waist and a skirt of
// loose printed pages below it. The arms and legs are concertina-folded tubes ending in folded
// wedge feet and pyramid fingers, a pleated fan sits on each shoulder and a pleated ruff round the
// neck. The head is a folded box with a pyramid nose, inked brows and mouth, and a folded newspaper
// hat. The only light is the pair of slit eyes, which are the golem's `core` so the glow pulses.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured, flat-shaded mesh
// on one shared material, plus one mesh for the eyes: 7 draws. The geometry is built once and shared.
// Handles: body, head, legs, arms, arm, core, like the straw golem.

const C={
 paper:rgb('#efe6cc'),white:rgb('#f8f4e8'),aged:rgb('#dcc79a'),edge:rgb('#c4ad7c'),
 ink:rgb('#2b2622'),seal:rgb('#8e1c1c'),sealDark:rgb('#5a0f0f'),cord:rgb('#d2c092'),
};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const tint=(seed)=>{const h=hash(seed);return h<.4?C.paper:h<.7?C.white:mix(C.paper,C.aged,.3+.5*hash(seed*3.1));};

// Collects pieces into one flat-shaded, vertex-coloured geometry. Degenerate triangles (the apex of
// a cone, a closed lathe pole) are dropped so every normal is a unit vector.
function collector(){
 const list=[];
 return {
  // colour is read in the geometry's own frame, before the matrix places it
  add(geo,matrix,colour){
   const flat=geo.index?geo.toNonIndexed():geo.clone();geo.dispose();
   const local=flat.attributes.position.clone();
   if(matrix)flat.applyMatrix4(matrix);
   const src=flat.attributes.position;
   const pos=[],col=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
   for(let i=0;i<src.count;i+=3){
    a.fromBufferAttribute(src,i);b.fromBufferAttribute(src,i+1);c.fromBufferAttribute(src,i+2);
    if(c.clone().sub(b).cross(a.clone().sub(b)).lengthSq()<1e-14)continue;
    for(let k=0;k<3;k++){
     pos.push(src.getX(i+k),src.getY(i+k),src.getZ(i+k));
     const v=typeof colour==='function'?colour(local.getX(i+k),local.getY(i+k),local.getZ(i+k)):colour;
     col.push(...v.map(x=>THREE.MathUtils.clamp(x,0,1)));
    }
   }
   flat.dispose();
   const out=new THREE.BufferGeometry();
   out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
   out.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
   out.computeVertexNormals();
   list.push(out);
  },
  merge(){const geo=mergeGeometries(list);list.forEach(g=>g.dispose());return geo;},
 };
}

// A lathe of few sides: each face flat, like folded card. `rings` is [[y,r],...] bottom to top;
// phiStart puts a flat face toward +z. sx/sz squash it.
function folded(P,matrix,rings,{sides=8,sx=1,sz=1,colour=C.paper}={}){
 const geo=new THREE.LatheGeometry(rings.map(([y,r])=>new THREE.Vector2(r,y)),sides,Math.PI/sides);
 geo.scale(sx,1,sz);
 P.add(geo,matrix,colour);
}

// a concertina tube from y0 down to y1: square in section, pleating in and out every `step`
function concertina(P,matrix,{y0,y1,r,inner=.74,step=.03,seed=1}){
 const n=Math.max(2,Math.round((y0-y1)/step)),rings=[];
 for(let i=n;i>=0;i--)rings.push([y1+(y0-y1)*i/n,i%2?r*inner:r]);
 rings.reverse();
 const c=tint(seed);
 folded(P,matrix,rings,{sides:4,colour:(x,y)=>mix(c,C.edge,.18*hash(Math.round((y-y1)/(y0-y1)*n)+seed))});
}

// a line of print on a sheet lying in the local xy plane facing +z: words of ink with gaps
function printLine(P,matrix,x0,x1,y,h,seed,z=.0016){
 let x=x0,k=0;
 while(x<x1-.006){
  const w=Math.min(x1-x,.012+.03*hash(seed+k*1.7));
  const g=new THREE.PlaneGeometry(w,h);g.translate(x+w/2,y,z);P.add(g,matrix,C.ink);
  x+=w+.007+.004*hash(seed+k*3.3);k++;
 }
}

// a sheet of paper w×h hanging from its top edge at the origin, facing +z, printed in `rows`
// lines. `curl` bends the bottom out toward +z; `crease` folds it down the middle into a shallow V.
function page(P,matrix,{w,h,rows=5,seed=1,curl=0,crease=0,margin=.14,colour}){
 const geo=new THREE.PlaneGeometry(w,h,crease?2:1,4);geo.translate(0,-h/2,0);
 const bend=(x,y)=>curl*(y/h)**2+crease*(1-Math.abs(x)/(w/2))*.5;
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++)p.setZ(i,bend(p.getX(i),p.getY(i)));
 const c=colour||tint(seed);
 P.add(geo,matrix,(x,y)=>mix(c,C.edge,.5*Math.max(0,1-Math.min(w/2-Math.abs(x),h+y,-y)/.012)));
 const m=w*margin,lh=h*.07;
 for(let r=0;r<rows;r++){
  const y=-h*(.14+.72*r/Math.max(1,rows-1));
  // follow the page's curl and crease so the print sits on it
  const half=(x0,x1)=>{
   const z=bend((x0+x1)/2,y)+.0016;
   printLine(P,matrix,x0,x1,y,lh,seed*13+r*7+(x0<0?0:50),z);
  };
  const end=w/2-m-(r===rows-1?w*.3*hash(seed+r):0);
  if(crease){half(-w/2+m,-.006);half(.006,end);}else half(-w/2+m,end);
 }
}

// A pleated fan in the local xy plane, blades spread over `arc` around +y, pleats along z.
function fan(P,matrix,{r0,r1,n,arc,depth,seed=1,full=false}){
 const pos=[],steps=n*2,ang=i=>full?i/steps*Math.PI*2:-arc/2+arc*i/steps;
 const pt=(i,r)=>{const a=ang(i);return [Math.sin(a)*r,Math.cos(a)*r,(i%2)*depth*(r/r1)];};
 for(let i=0;i<steps;i++){
  const a0=pt(i,r0),a1=pt(i,r1),b0=pt(i+1,r0),b1=pt(i+1,r1);
  pos.push(...a0,...a1,...b1,...a0,...b1,...b0);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 const c=tint(seed);
 P.add(geo,matrix,(x,y,z)=>{const r=Math.hypot(x,y);return mix(z>depth*.3*(r/r1)?c:mix(c,C.aged,.25),C.edge,r>r1*.93?.5:0);});
}

function buildBody(){
 const P=collector();
 // the torso: a folded eight-sided lantern, hips at .40 swelling to the chest, closing at the neck
 folded(P,null,[[.4,.1],[.44,.135],[.52,.12],[.6,.12],[.69,.155],[.77,.17],[.83,.14],[.87,.07],[.9,.055]],
  {sx:1.1,sz:.76,colour:(x,y)=>mix(C.paper,C.aged,.2+.2*Math.sin(y*40))});
 // the tabard: a creased printed page down the front and a plainer one down the back
 page(P,at(0,.83,.118,[-.08,0,0]),{w:.2,h:.34,rows:8,seed:5,crease:.018,curl:.02});
 page(P,at(0,.83,-.118,[.08,Math.PI,0]),{w:.2,h:.3,rows:6,seed:7,crease:.012,curl:.015});
 // a wax seal on the chest with a pressed ring
 const seal=new THREE.CylinderGeometry(.028,.03,.01,10);seal.rotateX(Math.PI/2);
 P.add(seal,at(0,.75,.139),(x,y,z)=>Math.hypot(x,y)<.014&&z>.003?C.sealDark:C.seal);
 for(const s of [-1,1]){const tail=new THREE.PlaneGeometry(.012,.05);tail.translate(0,-.025,0);P.add(tail,at(s*.01,.73,.137,[0,0,s*.25]),C.seal);}
 // the waist: a twisted paper cord, with a knot and tails
 const cord=new THREE.TorusGeometry(.14,.011,5,20);cord.rotateX(Math.PI/2);cord.scale(1.1,1,.78);
 P.add(cord,at(0,.47,0),(x,y,z)=>mix(C.cord,C.edge,.5+.5*Math.sin(Math.atan2(z,x)*14+y*200)));
 P.add(new THREE.IcosahedronGeometry(.02,0),at(.1,.47,.08),C.cord);
 for(const s of [-1,1]){const t=new THREE.CylinderGeometry(.006,.004,.09,4);t.translate(0,-.045,0);P.add(t,at(.1+s*.01,.465,.085,[.12,0,s*.2]),C.cord);}
 // a skirt of loose printed pages hanging from the cord, clear of the tabard in front
 for(let i=0;i<9;i++){
  const a=Math.PI*(.28+1.44*i/8),x=Math.sin(a)*.15,z=Math.cos(a)*.11;
  page(P,at(x,.49,z,[0,a,0]).multiply(at(0,0,0,[-.12-.1*hash(i+3),0,(hash(i*2.7)-.5)*.2])),{w:.11+.02*hash(i),h:.14+.04*hash(i*1.3),rows:4,seed:20+i,curl:.02});
 }
 // the ruff: a pleated paper collar round the neck
 fan(P,at(0,.86,0,[-Math.PI/2+.25,0,0]),{r0:.06,r1:.13,n:14,arc:0,depth:.016,seed:31,full:true});
 return P.merge();
}

// the head's front face, at its widest ring
const FACE=.12*Math.SQRT1_2*.9+.004;

function buildHead(){
 const P=collector();
 // a folded box, narrow at the chin, square at the brow, with a flat face toward +z
 folded(P,null,[[0,.06],[.025,.1],[.09,.12],[.155,.115],[.19,.1],[.2,.07]],{sides:4,sz:.9,colour:(x,y)=>mix(C.white,C.paper,y/.2)});
 const face=FACE;
 // a folded pyramid nose
 const nose=new THREE.ConeGeometry(.02,.06,3);nose.rotateY(Math.PI);nose.scale(1,1,.8);
 P.add(nose,at(0,.085,face+.005),C.paper);
 // inked brows above the eye slits and a stern mouth
 for(const s of [-1,1]){const brow=new THREE.PlaneGeometry(.045,.007);P.add(brow,at(s*.036,.137,face+.002,[0,0,s*.3]),C.ink);}
 const mouth=new THREE.PlaneGeometry(.05,.005);P.add(mouth,at(0,.045,.07,[-.1,0,0]),C.ink);
 // the folded newspaper hat: a triangular prism across the head, a band folded up at the base
 const shape=new THREE.Shape([new THREE.Vector2(-.105,0),new THREE.Vector2(.105,0),new THREE.Vector2(0,.15)]);
 const hat=new THREE.ExtrudeGeometry(shape,{depth:.27,bevelEnabled:false});hat.translate(0,0,-.135);hat.rotateY(Math.PI/2);
 P.add(hat,at(0,.19,0),(x,y)=>mix(C.white,C.aged,.25*hash(Math.floor(y*60))));
 for(const s of [-1,1]){
  const band=new THREE.BoxGeometry(.28,.035,.006);
  P.add(band,at(0,.207,s*.1,[s*-.61,0,0]),C.paper);
  // headlines and print on the slopes of the hat
  const slope=at(0,.19,0).multiply(at(0,0,0,[0,s>0?0:Math.PI,0])).multiply(at(0,0,.105,[-Math.atan2(.105,.15),0,0]));
  for(let r=0;r<4;r++)printLine(P,slope,-.1,.1-(r===3?.07:0),.06+r*.026,r===0?.008:.005,90+r*11+(s>0?0:40),.002);
 }
 return P.merge();
}

function buildEyes(){
 const list=[];
 const face=FACE;
 for(const s of [-1,1]){const g=new THREE.BoxGeometry(.036,.011,.006);g.rotateZ(s*.18);g.translate(s*.036,.115,face);list.push(g);}
 const geo=mergeGeometries(list);list.forEach(g=>g.dispose());return geo;
}

// a leg hangs from the hip pivot; its folded wedge foot rests on the ground 0.44 below
function buildLeg(side){
 const P=collector();
 concertina(P,null,{y0:-.01,y1:-.39,r:.074,seed:61+side});
 // the foot: a side profile of heel and pointed toe, folded across the width
 const shape=new THREE.Shape([new THREE.Vector2(-.06,0),new THREE.Vector2(.13,0),new THREE.Vector2(.04,.04),new THREE.Vector2(-.045,.065)]);
 const foot=new THREE.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:false});foot.translate(0,0,-.045);foot.rotateY(-Math.PI/2);
 P.add(foot,at(0,-.44,-.005),(x,y)=>mix(tint(63+side),C.edge,y<.004?.4:0));
 return P.merge();
}

// an arm hangs from the shoulder pivot: a concertina, a folded palm and pyramid fingers,
// with a pleated fan over the shoulder
function buildArm(side){
 const P=collector();
 concertina(P,null,{y0:-.02,y1:-.33,r:.058,step:.028,seed:71+side});
 const palm=new THREE.BoxGeometry(.05,.05,.03);P.add(palm,at(0,-.355,0),C.paper);
 for(let f=0;f<4;f++){
  const x=(f-1.5)*.013,finger=new THREE.ConeGeometry(.009,.055,4);finger.rotateX(Math.PI);
  P.add(finger,at(x,-.405,.004,[.25,0,(f-1.5)*-.08]),tint(80+f));
 }
 const thumb=new THREE.ConeGeometry(.009,.045,4);thumb.rotateX(Math.PI);
 P.add(thumb,at(-side*.03,-.37,.012,[.3,0,side*.7]),C.paper);
 fan(P,at(side*.02,.0,0,[0,side*Math.PI/2,-side*.35]),{r0:.012,r1:.11,n:5,arc:Math.PI*.9,depth:.02,seed:75+side});
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,side:THREE.DoubleSide});
 const eye=new THREE.MeshStandardMaterial({color:0xffc46a,emissive:0xff8a20,emissiveIntensity:4.5,roughness:.3});
 shared={material,eye,body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:{[-1]:buildLeg(-1),1:buildLeg(1)},arm:{[-1]:buildArm(-1),1:buildArm(1)}};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createPaperGolem(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,.895,0);head.rotation.z=-.05;body.add(head);
 mesh(head,S.head,S.material,'head');const core=mesh(head,S.eyes,S.eye,'eyes');core.castShadow=false;
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.075,.44,0);body.add(leg);mesh(leg,S.leg[s],S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.265,.8,0);arm.rotation.z=s*.1;body.add(arm);mesh(arm,S.arm[s],S.material,'arm');arms.push(arm);
 }
 g.userData.core=core;
 return {g,body,legs,tail:null,wings:[],quirk:'golem',core,arms,arm:arms[1],head};
}
