import * as THREE from 'three';
import {rgb,mix} from './homunculus.js';

// Devil's Snare (X, green; a stationary strangling plant) used to fall back to the xorn. It is now
// a nest of thorned, constricting vines rooted in the floor:
//   - a gnarled, bark-ridged root knot heaved up through the flagstones, ringed with ragged blades
//   - eight vines rising in slow serpentine S-curves, two pairs braided round each other, every tip
//     coiled forward into a hook like a beckoning finger; dark green at the root, blood-dark at the tip
//   - hooked thorns down every vine and runner, raked back toward the root, bone-pale at the point
//   - five thick runners creeping out over the floor, arching in humps; one threads through the
//     half-buried ribs of something it caught, and a skull lies sunk at the knot's edge
//   - beads of sickly sap at the tips and on the thorns
// Two merged, vertex-coloured meshes: the plant (vines, knot, runners, bones) and a glossy accent
// mesh (thorns and sap). Geometry is built once and shared.
// Handles: body (the whole plant), vines (the plant mesh), quirk 'fungus', like the other plants.

const C={
 bark:rgb('#241c12'),deep:rgb('#10220f'),mid:rgb('#2e5622'),pale:rgb('#5c7a34'),tip:rgb('#3e1014'),
 blade:rgb('#1e3a18'),dead:rgb('#3a3020'),thorn:rgb('#4a2016'),point:rgb('#cfc29a'),
 bone:rgb('#b9ac8a'),socket:rgb('#1a140c'),sap:rgb('#b4c83a'),
};

const rand=seed=>{let s=seed>>>0||1;return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296);};
const noise=(x,y,z,s)=>(Math.sin(x*4.1+s)*Math.sin(z*3.7-s*1.3)+Math.sin(y*5.3+x*2.2+s*2.1)*.6+Math.sin((x-z)*7.9+s*.7)*Math.sin(y*6.1)*.35)/1.95;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const UP=V(0,1,0);

// Collects indexed surfaces with per-vertex colours into one geometry.
function builder(){
 const pos=[],col=[],idx=[];
 const push=(p,c)=>{pos.push(p.x,p.y,p.z);for(let k=0;k<3;k++)col.push(THREE.MathUtils.clamp(c[k],0,1));};
 return {
  grid(nu,nv,fn,colour){
   const base=pos.length/3;
   for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){const u=i/nu,v=j/nv,p=fn(u,v);push(p,colour(u,v,p));}
   for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=base+i*(nv+1)+j,b=a+nv+1;idx.push(a,b,a+1,b,b+1,a+1);}
  },
  geo(geo,matrix,colour){
   const p=geo.attributes.position,base=pos.length/3,v=V();
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(matrix)v.applyMatrix4(matrix);push(v,typeof colour==='function'?colour(v):colour);}
   if(geo.index)for(const i of geo.index.array)idx.push(base+i);else for(let i=0;i<p.count;i++)idx.push(base+i);
   geo.dispose();
  },
  done(){
   const g=new THREE.BufferGeometry();
   g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
   g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
   g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();return g;
  },
 };
}
const place=(p,s,q=new THREE.Quaternion())=>new THREE.Matrix4().compose(p,q,s.isVector3?s:V(s,s,s));

// The frame of a centreline at t: tangent, side and normal.
function frame(P,t){
 const e=.004,T=P(Math.min(1,t+e)).sub(P(Math.max(0,t-e))).normalize();
 const side=V().crossVectors(T,Math.abs(T.y)>.97?V(1,0,0):UP).normalize(),nrm=V().crossVectors(side,T);
 return {T,side,nrm};
}

// A tube along P(t), radius r(t), coloured by colour(t,around,p); the end is capped to a point.
function tube(B,n,P,r,colour,sides=7){
 B.grid(n,sides,(u,v)=>{
  const {side,nrm}=frame(P,u),a=v*Math.PI*2,rr=u>=1?0:r(u);
  return P(u).addScaledVector(side,Math.cos(a)*rr).addScaledVector(nrm,Math.sin(a)*rr);
 },colour);
}

// Hooked thorns raked back toward the root, every `step` along the tube, on alternating sides.
function thorns(A,r,P,rad,{from=.06,to=.9,step=.07,len=.026}){
 for(let t=from+r()*step*.5;t<to;t+=step*(.7+r()*.6)){
  const {T,side,nrm}=frame(P,t),a=r()*Math.PI*2,out=side.clone().multiplyScalar(Math.cos(a)).addScaledVector(nrm,Math.sin(a));
  const D=out.clone().addScaledVector(T,-.75).normalize(),h=len*(1-t*.55)*(.75+r()*.5),w=Math.max(.0035,rad(t)*.42);
  const p=P(t).addScaledVector(out,rad(t)*.8).addScaledVector(D,h*.45);
  if(p.y-h*.5<.001)continue;
  A.geo(new THREE.ConeGeometry(w,h,5),place(p,1,new THREE.Quaternion().setFromUnitVectors(UP,D)),q=>mix(C.thorn,C.point,THREE.MathUtils.clamp(q.distanceTo(P(t))/(h+rad(t))*1.3-.35,0,1)));
  if(r()<.18)A.geo(new THREE.SphereGeometry(1,6,4),place(p.clone().addScaledVector(D,h*.1).addScaledVector(out,w*.6),.0045),C.sap);
 }
}

// A rising vine: a serpentine S-curve, its tip coiled forward into a hook.
function risingVine({a,h,lean,amp,waves,phase,coil}){
 const dir=V(Math.cos(a),0,Math.sin(a)),across=V(-Math.sin(a),0,Math.cos(a)),base=dir.clone().multiplyScalar(.07).setY(.07);
 const split=.72,turns=.85,k=.22;
 const stem=s=>base.clone().addScaledVector(dir,lean*s*s).addScaledVector(across,amp*Math.sin(s*Math.PI*waves+phase)*Math.min(1,s*3)).setY(base.y+h*s);
 const E=stem(1);
 return t=>{
  if(t<=split)return stem(t/split);
  const s=(t-split)/(1-split),th=Math.PI-s*turns*Math.PI*2,rho=coil*Math.exp(-k*s*turns*Math.PI*2);
  return E.clone().addScaledVector(dir,coil+rho*Math.cos(th)).setY(E.y+rho*Math.sin(th));
 };
}

// A path braided round another: offset helically about P's own frame.
const braid=(P,amp,turns,phase)=>t=>{const {side,nrm}=frame(P,t),a=phase+t*turns*Math.PI*2,w=amp*Math.min(1,t*4)*(1-t*.6);return P(t).addScaledVector(side,Math.cos(a)*w).addScaledVector(nrm,Math.sin(a)*w);};

// A floor runner: creeps out along angle a, humping up and down, its end curling up.
function runner({a,len,bend,humps,phase,r0}){
 const dir=V(Math.cos(a),0,Math.sin(a)),across=V(-Math.sin(a),0,Math.cos(a));
 return t=>{
  const d=.08+len*t,rad=r0*(1-t*.8)+.002;
  const y=rad+.003+Math.max(0,Math.sin(t*Math.PI*humps+phase))*.035*(1-t*.3)+Math.max(0,t-.85)*.35;
  return dir.clone().multiplyScalar(d).addScaledVector(across,bend*t*t).setY(y);
 };
}

function vineColour(seed,len){
 return (t,v,p)=>{
  const ridge=.5+.5*Math.sin(v*Math.PI*2*3+t*len*55+seed),n=noise(p.x*60,p.y*60,p.z*60,seed);
  let c=mix(C.bark,C.deep,Math.min(1,t*5));
  c=mix(c,C.mid,THREE.MathUtils.clamp((t-.15)*1.6,0,1)*(.7+n*.3));
  c=mix(c,C.pale,ridge*.18*(1-t));
  return mix(c,C.tip,THREE.MathUtils.clamp((t-.7)*3.2,0,1)*.85);
 };
}

function build(){
 const B=builder(),A=builder(),r=rand(6661);

 // the root knot: a gnarled, ridged dome heaved up through the floor
 {
  const geo=new THREE.SphereGeometry(1,20,9,0,Math.PI*2,0,Math.PI/2),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ang=Math.atan2(z,x),n=noise(x*3,y*3,z*3,4);
   const ridge=Math.pow(Math.abs(Math.sin(ang*5+y*3)),3)*.22;
   p.setXYZ(i,x*.15*(1+n*.15+ridge),y*.11*(1+n*.35),z*.15*(1+n*.15+ridge));
  }
  B.geo(geo,null,q=>mix(C.bark,C.deep,.25+noise(q.x*70,q.y*70,q.z*70,9)*.5+q.y*2));
 }
 // heaved, broken flagstones round the knot
 for(let i=0;i<5;i++){
  const a=i/5*Math.PI*2+.4+r()*.5,d=.17+r()*.03,q=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(a)*.22,r()*3,-Math.cos(a)*.22));
  B.geo(new THREE.BoxGeometry(.07+r()*.03,.012,.05+r()*.02),place(V(Math.cos(a)*d,.021,Math.sin(a)*d),1,q),q2=>mix([.2,.19,.17],[.3,.28,.25],noise(q2.x*90,0,q2.z*90,i)*.5+.5));
 }
 // ragged blades round the knot, some withered
 for(let i=0;i<9;i++){
  const a=i/9*Math.PI*2+r()*.4,dir=V(Math.cos(a),0,Math.sin(a)),across=V(-Math.sin(a),0,Math.cos(a));
  const len=.09+r()*.06,w=.016+r()*.006,lift=.12+r()*.1,dead=r()<.3,seed=r()*6;
  B.grid(10,2,(u,v)=>{
   const x=v*2-1,teeth=(u*6)%1,hw=w*Math.sin(Math.PI*Math.min(1,u*1.15+.05))*(.55+.6*teeth);
   const q=dir.clone().multiplyScalar(.1+len*u).addScaledVector(across,hw*x+Math.sin(u*3+seed)*.01);
   q.y=Math.max(.004,.06+lift*u-.22*u*u*len/.12-Math.abs(x)*hw*.35);return q;
  },(u,v,q)=>mix(dead?C.dead:C.blade,dead?C.bark:C.mid,u*.6+noise(q.x*80,q.y*80,q.z*80,seed)*.2));
 }

 // the victim: half-buried ribs at one side, a skull sunk at the knot's edge
 const ribA=2.5,ribAt=V(Math.cos(ribA)*.27,0,Math.sin(ribA)*.27),spine=V(-Math.sin(ribA),0,Math.cos(ribA)),ribOut=V(Math.cos(ribA),0,Math.sin(ribA));
 tube(B,10,t=>ribAt.clone().addScaledVector(spine,(t-.5)*.16).setY(.008),()=>.008,(t,v,p)=>mix(C.bone,C.dead,.3+noise(p.x*90,0,p.z*90,3)*.3),6);
 for(let i=0;i<4;i++){
  const o=ribAt.clone().addScaledVector(spine,(i-1.5)*.045),R=.075-i*.006;
  tube(B,12,t=>{const a=t*Math.PI*.92;return o.clone().addScaledVector(ribOut,(Math.cos(a)-1)*R*.15+Math.sin(a*.5)*.01).addScaledVector(spine,Math.sin(a)*.01).setY(Math.sin(a)*R*1.1+.006);},t=>.0055*(1-t*.4),(t,v,p)=>mix(C.bone,C.dead,.15+t*.3+noise(p.x*90,p.y*90,p.z*90,i)*.2),5);
 }
 {
  const sa=-.9,sp=V(Math.cos(sa)*.19,.024,Math.sin(sa)*.19),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.5,sa+2.2,.35));
  const m=place(sp,V(.05,.044,.06),q),eyeL=V(-.42,.15,.78).applyMatrix4(m),eyeR=V(.42,.15,.78).applyMatrix4(m),nose=V(0,-.2,.95).applyMatrix4(m);
  // sunk to the brow: whatever lies under the floor is flattened onto it
  const geo=new THREE.SphereGeometry(1,14,10).applyMatrix4(m),gp=geo.attributes.position;
  for(let i=0;i<gp.count;i++)gp.setY(i,Math.max(.002,gp.getY(i)));
  B.geo(geo,null,p=>{
   const d=Math.min(p.distanceTo(eyeL),p.distanceTo(eyeR));
   if(d<.017)return mix(C.socket,C.bone,d/.017*.4);
   if(p.distanceTo(nose)<.011)return C.socket;
   return mix(C.bone,C.dead,Math.max(0,.1-p.y*2.5)*3+noise(p.x*90,p.y*90,p.z*90,5)*.15);
  });
 }

 // the floor runners; the first threads through the ribs
 const runners=[
  {a:ribA-.05,len:.3,bend:.05,humps:3,phase:.4,r0:.019},
  {a:.3,len:.3,bend:-.06,humps:2,phase:1.2,r0:.017},
  {a:1.5,len:.26,bend:.07,humps:2.5,phase:2,r0:.016},
  {a:3.7,len:.28,bend:-.05,humps:2,phase:.1,r0:.017},
  {a:5.1,len:.25,bend:.06,humps:3,phase:1.6,r0:.015},
 ];
 runners.forEach((o,i)=>{
  const P=runner(o),rad=t=>o.r0*(1-t*.8)+.002;
  tube(B,24,P,rad,vineColour(i+3,o.len),7);
  thorns(A,r,P,rad,{from:.1,to:.95,step:.11,len:.02});
 });

 // the rising vines; two pairs braid round each other
 const vines=[];
 for(let i=0;i<6;i++){
  const a=i/6*Math.PI*2+.3+(r()-.5)*.5;
  vines.push({P:risingVine({a,h:.5+r()*.3,lean:.1+r()*.12,amp:.04+r()*.04,waves:1.4+r()*.8,phase:r()*6,coil:.035+r()*.02}),r0:.024+r()*.006});
 }
 for(const i of [0,3]){
  const P=vines[i].P;vines[i].P=braid(P,.022,2.2,0);
  vines.push({P:braid(P,.022,2.2,Math.PI),r0:vines[i].r0*.75});
 }
 vines.forEach(({P,r0},i)=>{
  const rad=t=>r0*Math.pow(1-t,.75)+.0018;
  tube(B,46,P,rad,vineColour(i,1),8);
  thorns(A,r,P,rad,{from:.08,to:.88,step:.065,len:.03});
  // a bead of sap hanging from the hook
  A.geo(new THREE.SphereGeometry(1,7,5),place(P(.985).add(V(0,-.006,0)),V(.006,.008,.006)),C.sap);
 });
 return {plant:B.done(),accent:A.done()};
}

let S=null;
function shared(){
 if(S)return S;
 const {plant,accent}=build();
 S={plant,accent,
  plantMat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62}),
  accentMat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.22})};
 return S;
}

export const isDevilsSnare=name=>name==="devil's snare";

export function createDevilsSnare(){
 const s=shared(),g=new THREE.Group(),body=new THREE.Group();g.name="Devil's Snare";g.add(body);
 let vines;
 for(const [geo,m,part] of [[s.plant,s.plantMat,'vines'],[s.accent,s.accentMat,'thorns']]){
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;body.add(mesh);
  if(part==='vines')vines=mesh;
 }
 return {g,body,vines,legs:[],tail:null,wings:[],quirk:'fungus',kind:'devils snare'};
}
