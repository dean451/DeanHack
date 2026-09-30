import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The evil eye used to fall back on the floating eye with a magenta iris. It now has
// its own look: a bloodshot eyeball with a slit pupil and a glowing magenta iris, glaring
// out of an almond slit in a heavy, wrinkled socket of dark flesh. The upper lid frowns
// down over the iris and is fringed with black lash spines; three horned spurs rise above
// it, and torn nerve roots trail below.
// 3 draws: the flesh (1 vertex-coloured mesh), the eyeball with its veins and pupil
// (1 glossy vertex-coloured mesh) and the iris (1 emissive mesh). The geometry and
// materials are built once and shared.
// Handles: body, head (the eyeball and iris, pivoting at the eyeball's centre, so a
// head pitch rolls the eye inside its lids). Quirk 'hover'.
const LIFT=.6,R=.17;

// Collects non-indexed, vertex-coloured pieces for merging. `colour` gets the
// position after `matrix` and returns [r,g,b].
function pieces(){
 const list=[];
 return {
  add(geo,matrix,colour){
   const flat=geo.index?geo.toNonIndexed():geo.clone();geo.dispose();
   for(const key of Object.keys(flat.attributes))if(key!=='position'&&key!=='normal')flat.deleteAttribute(key);
   if(matrix)flat.applyMatrix4(matrix);
   const p=flat.attributes.position,col=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){const c=colour(p.getX(i),p.getY(i),p.getZ(i));for(let k=0;k<3;k++)col[i*3+k]=THREE.MathUtils.clamp(c[k],0,1);}
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   list.push(flat);
  },
  merge(){const geo=mergeGeometries(list);list.forEach(g=>g.dispose());return geo;},
 };
}
const rgb=hex=>{const c=new THREE.Color(hex);return [c.r,c.g,c.b];};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
// A point on a sphere of radius r, `up` radians above and `side` radians right of the +z axis.
const onBall=(r,up,side)=>new THREE.Vector3(r*Math.cos(up)*Math.sin(side),r*Math.sin(up),r*Math.cos(up)*Math.cos(side));
// A tube whose radius runs from r0 to r1 along the points.
function taper(points,r0,r1,tubular=12,radial=6){
 const curve=new THREE.CatmullRomCurve3(points),geo=new THREE.TubeGeometry(curve,tubular,1,radial,false);
 const pos=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<=tubular;i++){curve.getPointAt(i/tubular,c);const r=r0+(r1-r0)*i/tubular;
  for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(pos,k).sub(c).multiplyScalar(r).add(c);pos.setXYZ(k,v.x,v.y,v.z);}}
 geo.computeVertexNormals();return geo;
}

// The almond opening, in angles from the +z axis: `x` across, `y` up. The upper edge
// dips at the middle into a frown, so the lid hangs over the top of the iris.
const W=.98,TOP=.52,FROWN=.16,BOTTOM=.4;
const upperEdge=x=>TOP*(1-(x/W)**2)-FROWN*(1-Math.abs(x/W))**2;
const lowerEdge=x=>-BOTTOM*(1-(x/W)**2);

const C={
 flesh:rgb('#4a1824'),deep:rgb('#2a0c14'),wet:rgb('#b2384a'),rim:rgb('#6e2432'),lash:rgb('#141012'),horn:rgb('#2a2224'),hornTip:rgb('#c8b8a0'),
 nerve:rgb('#7a3040'),nerveTip:rgb('#c05868'),
 sclera:rgb('#e6d8b8'),yolk:rgb('#c8a878'),vein:rgb('#a8142a'),pupil:rgb('#050304'),
 iris:rgb('#e05ad8'),irisDark:rgb('#4a0e48'),irisHot:rgb('#ffb0f4'),
};

// The socket: one shell round the eyeball, open at the front in the almond. Each row
// runs from the lid edge (t=0) to the back pole (t=1), so the shell closes behind.
function socket(P){
 const around=72,rows=26,pos=[],idx=[];
 for(let t=0;t<=rows;t++)for(let s=0;s<=around;s++){
  const f=t/rows,beta=s/around*Math.PI*2;
  // the edge angle for this bearing: walk out from the centre until outside the almond
  const cx=Math.cos(beta),cy=Math.sin(beta);let lo=0,hi=Math.PI*.6;
  for(let k=0;k<24;k++){const m=(lo+hi)/2,x=m*cx,y=m*cy,inside=Math.abs(x)<W&&y<upperEdge(x)&&y>lowerEdge(x);if(inside)lo=m;else hi=m;}
  const alpha=lo+(Math.PI-lo)*f**.8;
  // the lid rolls out from the ball into a thick rim, then settles; the back is wrinkled
  const roll=Math.sin(Math.min(f/.12,1)*Math.PI)*.028*(cy>0?1.25:.8),crease=f>.1?.004*Math.sin(beta*7+f*26)*smooth(.1,.4,f):0;
  const r=R+.004+roll+.012*smooth(0,.25,f)+crease;
  pos.push(r*Math.sin(alpha)*cx,r*Math.sin(alpha)*cy,r*Math.cos(alpha));
 }
 for(let t=0;t<rows;t++)for(let s=0;s<around;s++){const a=t*(around+1)+s,b=a+around+1;idx.push(a,b,a+1,a+1,b,b+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 P.add(geo,null,(x,y,z)=>{
  const r=Math.hypot(x,y,z),alpha=Math.acos(THREE.MathUtils.clamp(z/r,-1,1)),edge=Math.max(0,1-alpha/.62);
  const lines=.5+.5*Math.sin(Math.atan2(y,x)*7+alpha*12);
  let c=mix(C.flesh,C.deep,.35*lines*smooth(.7,1.6,alpha));
  c=mix(c,C.rim,smooth(.35,.6,edge));
  return mix(c,C.wet,smooth(.72,.95,edge));
 });
}

// Black lash spines along the upper lid, fanning up and out, longest at the middle.
function lashes(P){
 for(let i=0;i<11;i++){
  const u=-.82+i*.164,x=u*W,base=onBall(R+.034,upperEdge(x)+.04,x);
  const out=base.clone().normalize(),dir=out.clone().add(new THREE.Vector3(Math.sign(u)*.25*Math.abs(u),.9,0)).normalize();
  const len=.05+.035*(1-u*u),geo=new THREE.ConeGeometry(.008,len,5);geo.translate(0,len/2,0);
  const m=new THREE.Matrix4().compose(base,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir),new THREE.Vector3(1,1,1));
  P.add(geo,m,()=>C.lash);
 }
}

// Three curved spurs of horn rising from the brow, the middle one tallest.
function horns(P){
 for(const [side,h] of [[-.55,.075],[0,.1],[.55,.075]]){
  const root=onBall(R+.01,.72,side*.9),up=new THREE.Vector3(Math.sin(side)*.5,1,-.25).normalize();
  const pts=[root,root.clone().addScaledVector(up,h*.5).add(new THREE.Vector3(0,0,.012)),root.clone().addScaledVector(up,h).add(new THREE.Vector3(side*.02,.01,.03))];
  const geo=taper(pts,.018,.002,10,6),tip=root.y+h;
  P.add(geo,null,(x,y)=>mix(C.horn,C.hornTip,smooth(tip-.05,tip,y)));
 }
}

// Torn nerve roots trailing down and back from under the socket.
function roots(P){
 for(let i=0;i<5;i++){
  const a=-1.2+i*.6,sway=Math.sin(i*2.1)*.03,len=.16+((i*37)%5)*.02;
  const start=new THREE.Vector3(Math.sin(a)*.07,-R*.8,-.06+Math.cos(a)*.03);
  const pts=[start,start.clone().add(new THREE.Vector3(Math.sin(a)*.04+sway,-len*.45,-.05)),start.clone().add(new THREE.Vector3(Math.sin(a)*.07-sway,-len*.8,-.03)),start.clone().add(new THREE.Vector3(Math.sin(a)*.06,-len,-.06+sway))];
  const geo=taper(pts,.022-i%2*.005,.004,14,6),bottom=start.y-len;
  P.add(geo,null,(x,y)=>mix(C.nerve,C.nerveTip,smooth(bottom+.06,bottom,y)));
 }
}

// The eyeball: a pale, yellowing sclera flushed red toward the back, red veins creeping in
// from the corners of the lids toward the iris, and a black slit pupil over the iris.
function eyeball(P){
 P.add(new THREE.SphereGeometry(R,40,28),null,(x,y,z)=>{const f=z/R;return mix(mix(C.sclera,C.yolk,smooth(.9,.3,f)),C.vein,.45*smooth(.2,-.6,f));});
 for(let i=0;i<9;i++){
  const side=i%2?1:-1,up=((i*53)%7-3)*.1,start=[up,side*(.95+((i*29)%3)*.05)],end=[up*.6+Math.sin(i)*.08,side*.54];
  const pts=[];for(let k=0;k<=5;k++){const f=k/5;pts.push(onBall(R+.0015,start[0]+(end[0]-start[0])*f+Math.sin(f*6+i)*.04,start[1]+(end[1]-start[1])*f));}
  P.add(taper(pts,.0042,.0012,16,4),null,()=>C.vein);
  // a fork off each vein
  const mid=pts[2],fork=[mid,onBall(R+.0015,end[0]+(i%3-1)*.14,side*.62),onBall(R+.0015,end[0]+(i%3-1)*.2,side*.56)];
  P.add(taper(fork,.003,.001,10,4),null,()=>C.vein);
 }
 // the slit: a sliver of the sphere just proud of the iris, pointed at both ends
 const slit=new THREE.PlaneGeometry(1,1,6,18),sp=slit.attributes.position,nr=slit.attributes.normal,v=new THREE.Vector3();
 for(let i=0;i<sp.count;i++){const u=sp.getX(i),w=sp.getY(i),up=w*.84,side=u*.12*Math.sqrt(Math.max(0,1-(2*w)**2));v.copy(onBall(R+.0055,up/2,side));sp.setXYZ(i,v.x,v.y,v.z);v.normalize();nr.setXYZ(i,v.x,v.y,v.z);}
 P.add(slit,null,()=>C.pupil);
}

// The iris: a cap on the eyeball, dark at the limbus, streaked, and hot near the pupil.
function iris(){
 const P=pieces(),cap=new THREE.SphereGeometry(R+.0025,48,10,0,Math.PI*2,0,.5);cap.rotateX(Math.PI/2);
 P.add(cap,null,(x,y,z)=>{
  const a=Math.acos(THREE.MathUtils.clamp(z/Math.hypot(x,y,z),-1,1))/.5,streak=.5+.5*Math.sin(Math.atan2(y,x)*26);
  let c=mix(C.iris,C.irisDark,.3*streak);c=mix(c,C.irisHot,smooth(.45,.1,a));return mix(c,C.irisDark,smooth(.78,.98,a));
 });
 return P.merge();
}

let shared=null;
function build(){
 const flesh=pieces();socket(flesh);lashes(flesh);horns(flesh);roots(flesh);
 const ball=pieces();eyeball(ball);
 return {
  flesh:flesh.merge(),ball:ball.merge(),iris:iris(),
  fleshMat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.05}),
  ballMat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.12}),
  irisMat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.18,emissive:'#c028b8',emissiveIntensity:.9}),
 };
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createEvilEye(){
 shared||=build();
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group(),head=new THREE.Group();
 g.add(body);body.add(lift);lift.add(head);lift.position.y=LIFT;
 mesh(lift,shared.flesh,shared.fleshMat,'flesh');mesh(head,shared.ball,shared.ballMat,'eyeball');mesh(head,shared.iris,shared.irisMat,'iris');
 return {g,body,legs:[],tail:null,wings:[],quirk:'hover',head};
}
