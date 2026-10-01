import * as THREE from 'three';
import {rgb,mix} from './homunculus.js';

// Piercers (p) used to be a smooth nine-sided cone with three rings, a pair of eyes and a
// smile, and the rock piercer missed the table and fell back to it in its glyph grey.
// A piercer is now a stalactite that has dropped point-up and waits:
//   - a twisted spire, star-shaped in section, its seven ridges knife-sharp and jagged, the
//     tip hooked a little to one side; banded with mineral strata, darker in the grooves
//   - no eyes (piercers have none): instead a ragged gash low on the front, lined with two
//     rows of needle teeth that point inward, wet and dark inside, with a string of drool
//   - a lumpy flared root where it has bitten into the floor, crusted with pale flowstone
//   - a few pits weeping mineral, and the glistening drip of the cave still on its tip
//   - shards of broken stone scattered round the base from its fall
// Kinds: piercer (brown limestone), rock piercer (grey slate), iron piercer (rust-streaked
// iron, metallic), glass piercer (clear, glassy, see-through).
// Two merged, vertex-coloured meshes per model, flat-shaded so the facets catch the light:
// the hide (spire, root, shards) and a glossy accent (teeth, drool, drips).
// Geometry and materials are built once per kind and shared. Handles: body, quirk 'idle'.

const KINDS={
 piercer:{scale:1,stone:'#8a7a64',groove:'#3e3428',band:'#b0a088',crust:'#d4c8ae',maw:'#2a0c0a',tooth:'#e0d4b8',wet:'#a89c80',rough:.92,metal:0},
 'rock piercer':{scale:1.05,stone:'#6c6e70',groove:'#2a2c30',band:'#9a9a96',crust:'#c4c6c0',maw:'#220a0c',tooth:'#d8d4c8',wet:'#8a9098',rough:.9,metal:0},
 'iron piercer':{scale:1.15,stone:'#4e5c62',groove:'#1e2428',band:'#8a4a22',crust:'#a65a24',maw:'#1a0806',tooth:'#b8c0c4',wet:'#6a3a1a',rough:.42,metal:.65},
 'glass piercer':{scale:1.25,stone:'#c8e6ee',groove:'#6a9aac',band:'#eaf8fc',crust:'#ffffff',maw:'#3a1424',tooth:'#f4fcff',wet:'#d8f0f8',rough:.08,metal:.1,glass:true},
};
export const PIERCER_KINDS=Object.keys(KINDS);
export const isPiercer=name=>name in KINDS;

const rand=seed=>{let s=seed>>>0||1;return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296);};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const smooth=(e0,e1,v)=>{const t=THREE.MathUtils.clamp((v-e0)/(e1-e0),0,1);return t*t*(3-2*t);};
const wrap=d=>Math.atan2(Math.sin(d),Math.cos(d));

// Collects indexed surfaces with per-vertex colours into one geometry.
function builder(){
 const pos=[],col=[],idx=[];
 // Anything that dips below the floor (shard undersides) is flattened onto it.
 const push=(p,c)=>{pos.push(p.x,Math.max(0,p.y),p.z);for(let k=0;k<3;k++)col.push(THREE.MathUtils.clamp(c[k],0,1));};
 return {
  // (nu+1)×(nv+1) grid: fn(u,v) -> Vector3, colour(u,v,p) -> [r,g,b].
  grid(nu,nv,fn,colour){
   const base=pos.length/3;
   for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){const u=i/nu,v=j/nv,p=fn(u,v);push(p,colour(u,v,p));}
   for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=base+i*(nv+1)+j,b=a+nv+1;idx.push(a,a+1,b,b,a+1,b+1);}
  },
  // a three.js geometry placed by matrix, coloured by colour(p)
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
   g.setIndex(idx);
   // Flat shading: split to unindexed so each facet takes its own normal.
   const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();flat.computeBoundingSphere();return flat;
  },
 };
}
const place=(p,s,q=new THREE.Quaternion())=>new THREE.Matrix4().compose(p,q,s.isVector3?s:V(s,s,s));
const aim=(dir,roll=0)=>new THREE.Quaternion().setFromUnitVectors(V(0,1,0),dir.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(V(0,1,0),roll));

const H=.84,RIDGES=7,MOUTH_A=0,MOUTH_Y=.15,MOUTH_W=.62,MOUTH_H=.05;

function build(c,seed){
 const B=builder(),A=builder(),r=rand(seed);
 const jag=Array.from({length:RIDGES*40},()=>r());
 // Hook: the top third bends off toward −x, and the whole spire twists as it rises.
 const axis=y=>{const t=y/H;return V(-.07*t**3,y,.025*t**2);};
 const twist=y=>.9*(y/H)+.25*(y/H)**2;
 // Mouth: a ragged gash on the front (+z), its lips jagged.
 const lipJag=a=>.012*Math.sin(a*37+seed%7)+.008*Math.sin(a*91);
 const gash=(a,y)=>{
  const da=wrap(a-MOUTH_A)/MOUTH_W;if(Math.abs(da)>=1)return 0;
  const open=MOUTH_H*(1-da*da)+lipJag(a),dy=(y-MOUTH_Y)/Math.max(open,.004);
  return Math.abs(dy)<1?(1-dy*dy)*(1-da*da):0;
 };
 // Radius of the section at height y and angle a (in the spire's own twisted frame).
 const radius=(y,a)=>{
  const t=y/H,base=.25*(1-t)**1.3+.006;
  const k=a*RIDGES/(Math.PI*2),ridge=Math.abs(((k%1)+1)%1-.5)*2; // 1 on the ridge, 0 in the groove
  const notch=jag[(Math.floor(k+RIDGES*8)%RIDGES)*40+Math.min(39,Math.floor(t*40))];
  // Ridges stand proud and are chipped into teeth along their length; the root flares and lumps.
  let rr=base*(.78+.3*ridge**2.2*(.75+.5*notch));
  rr+=.07*(1-smooth(0,.09,y))*(1+.35*Math.sin(a*3+seed)+.2*Math.sin(a*7));
  // strata: shallow steps every few centimetres
  rr*=1-.035*smooth(.6,1,Math.sin(y*58+Math.sin(a*2)*1.3));
  return rr;
 };
 const NU=44,NV=RIDGES*6;
 B.grid(NU,NV,(u,v)=>{
  const y=u*H,a=v*Math.PI*2,tw=twist(y),aw=a+tw;
  let rr=radius(y,a);
  // The gash cuts into the front, in world angle (it doesn't twist with the ridges).
  const g=gash(aw,y);rr*=1-.55*g;
  const o=axis(y);return V(o.x+Math.sin(aw)*rr,y,o.z+Math.cos(aw)*rr);
 },(u,v,p)=>{
  const y=u*H,a=v*Math.PI*2,aw=a+twist(y),k=a*RIDGES/(Math.PI*2),ridge=Math.abs(((k%1)+1)%1-.5)*2;
  let col=mix(c.groove,c.stone,.25+.75*ridge**.7);
  if(Math.sin(y*58+Math.sin(a*2)*1.3)>.7)col=mix(col,c.band,.55);
  col=mix(col,c.crust,.7*(1-smooth(0,.07,y))*(.6+.4*Math.sin(a*5+seed)));
  // Weeping streaks run down from the tip in the grooves.
  col=mix(col,c.wet,.35*(1-ridge)*smooth(.3,.9,u)*(Math.sin(a*RIDGES*.5+seed)>.2?1:0));
  const g=gash(aw,y);if(g>0)col=mix(col,c.maw,Math.min(1,g*2.5));
  return col;
 });
 // A tip cap: close the point.
 const top=axis(H);B.geo(new THREE.ConeGeometry(.012,.04,6).translate(0,.02,0),place(top.clone().setY(H-.012),1,aim(V(-.25,1,.05))),mix(c.stone,c.band,.4));
 // The floor plug: a flat disc under the root so it doesn't read hollow from a low angle.
 B.geo(new THREE.CircleGeometry(.3,NV).rotateX(Math.PI/2),place(V(0,.001,0),1),c.groove);

 // Teeth: two rows along the lips, pointing in and across the gash, the middle ones longest.
 const lipPoint=(a,up)=>{
  const da=wrap(a-MOUTH_A)/MOUTH_W,open=MOUTH_H*(1-da*da)+lipJag(a),y=MOUTH_Y+up*open*.92;
  const rr=radius(y,a-twist(y))*(1-.55*gash(a,y))+.002,o=axis(y);
  return {p:V(o.x+Math.sin(a)*rr,y,o.z+Math.cos(a)*rr),open,da};
 };
 for(const up of [1,-1]){
  const n=up>0?9:8;
  for(let i=0;i<n;i++){
   const a=MOUTH_A+MOUTH_W*.86*((i+.5)/n*2-1)+(r()-.5)*.03,{p,open,da}=lipPoint(a,up);
   const len=(.022+.026*(1-da*da))*(.75+.5*r()),out=V(Math.sin(a),0,Math.cos(a));
   const dir=V(0,-up,0).addScaledVector(out,-.55).add(V((r()-.5)*.25,0,(r()-.5)*.2));
   A.geo(new THREE.ConeGeometry(.0065*(.8+.4*r()),len,4).translate(0,len/2,0),place(p.addScaledVector(out,-.006),1,aim(dir,r()*3)),mix(c.tooth,c.maw,.15*r()));
  }
 }
 // Drool: a thin string sagging from the lower lip almost to the floor, with a bead at its end.
 {
  const a=MOUTH_A+.18,{p}=lipPoint(a,-1),out=V(Math.sin(a),0,Math.cos(a)),end=p.clone().addScaledVector(out,.035).setY(.035);
  const curve=new THREE.CatmullRomCurve3([p.clone().addScaledVector(out,.004),p.clone().addScaledVector(out,.022).setY(p.y-.03),end]);
  A.geo(new THREE.TubeGeometry(curve,8,.0028,4,false),null,c.wet);
  A.geo(new THREE.SphereGeometry(.0075,6,4),place(end.clone().setY(end.y-.006),V(1,1.35,1)),c.wet);
 }
 // The cave's drip still clinging to the tip, and a few weeping pits on the flanks.
 A.geo(new THREE.SphereGeometry(.011,6,5),place(top.clone().setY(H+.022),V(1,1.5,1)),c.wet);
 for(let i=0;i<5;i++){
  const y=.26+i*.1+r()*.04,a=r()*Math.PI*2,aw=a+twist(y),rr=radius(y,a)*.96,o=axis(y);
  if(Math.abs(wrap(aw-MOUTH_A))<MOUTH_W+.2&&y<.3)continue;
  A.geo(new THREE.SphereGeometry(.009,5,4),place(V(o.x+Math.sin(aw)*rr,y-.006,o.z+Math.cos(aw)*rr),V(.8,1.6,.8)),c.wet);
 }
 // Shards from the fall: flat, broken slabs and splinters lying round the base.
 for(let i=0;i<9;i++){
  const a=i*.71+r()*.4+.6,d=.27+r()*.14,s=.022+r()*.03;
  if(Math.abs(wrap(a-Math.PI/2))<.25)continue; // keep the front of the mouth clear
  const shard=new THREE.TetrahedronGeometry(1,0);
  const scl=V(s*(1+r()),s*(.35+.4*r()),s*(.6+r())),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(r()*.6,r()*6.3,r()*.6));
  B.geo(shard,place(V(Math.cos(a)*d,s*.25,Math.sin(a)*d),scl,q),mix(c.stone,c.groove,.2+.4*r()));
 }
 return {hide:B.done(),accent:A.done()};
}

const cache=new Map();
function shared(name){
 if(cache.has(name))return cache.get(name);
 const K=KINDS[name],c={};for(const [k,v] of Object.entries(K))c[k]=typeof v==='string'&&v[0]==='#'?rgb(v):v;
 const geo=build(c,[...name].reduce((h,ch)=>h*31+ch.charCodeAt(0)>>>0,4219));
 const hideMat=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:K.rough,metalness:K.metal,
  ...(K.glass?{transparent:true,opacity:.62,emissive:0x1c3a48,emissiveIntensity:.35}:{})});
 const accentMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.12,metalness:K.metal*.5});
 const s={...geo,hideMat,accentMat,scale:K.scale};cache.set(name,s);return s;
}

export function createPiercer(name){
 const S=shared(name);
 const g=new THREE.Group(),body=new THREE.Group();g.name=name;g.add(body);body.scale.setScalar(S.scale);
 for(const [geo,m,part] of [[S.hide,S.hideMat,'hide'],[S.accent,S.accentMat,'teeth']]){
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;body.add(mesh);
 }
 return {g,body,legs:[],tail:null,wings:[],quirk:'idle',kind:name};
}
