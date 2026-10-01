import * as THREE from 'three';
import {rgb,mix} from './homunculus.js';

// The UnNetHack ferns used to fall back to the generic fungus mound (and their spores to the
// floating eye). A fern is now a clump of jagged, arching fronds, spore-bearing and wrong:
//   - a dark knotted crown, shaggy with brown scales and the snapped stubs of old fronds
//   - six or seven fronds that rise, arch and droop, each with two rows of narrow pinnae whose
//     saw-toothed edges hook toward the tip; dark at the rachis, paling to the tips, some tips
//     blackened and withered; rust (or frost, ember or bile) sori dot their undersides
//   - fiddleheads coiled tight in the middle like clenched claws, furred with scales
//   - two or three stiff fertile spikes crusted with clusters of swollen sporangia (its gaze is
//     a burst of spores), glowing for the blazing fern
//   - one dead frond collapsed on the floor beside it
// A sprout is a smaller clump: three short fronds, more fiddleheads and one spike.
// A fern spore is a floating sporangium: a leathery husk girdled by a beaded annulus, split
// along a jagged mouth with spore dust glowing inside.
// Kinds: dungeon (bright green), arctic (frost blue), blazing (ember orange), swamp (cyan-green);
// the plain "fern spore" is brown.
// Two merged, vertex-coloured meshes per model: the plant (double-sided) and a glossy accent
// mesh (sori, sporangia, spore dust). Geometry is built once per kind and shared.
// Handles: body (the whole plant), quirk 'fungus', like the old mound; spores quirk 'hover'.

const KINDS={
 dungeon:{deep:'#16341a',mid:'#3c7a2e',tip:'#8fd442',stipe:'#241a10',scale:'#6a4524',sorus:'#8a3a18',dead:'#4a3a22',glow:0},
 arctic:{deep:'#1a3242',mid:'#4a7890',tip:'#d4ecf8',stipe:'#1e2a34',scale:'#8a9cac',sorus:'#eaf6ff',dead:'#5a646a',glow:.25},
 blazing:{deep:'#2a0a04',mid:'#a43a14',tip:'#ffae3a',stipe:'#120604',scale:'#3a160c',sorus:'#ff6418',dead:'#1a0e0a',glow:.9},
 swamp:{deep:'#102a28',mid:'#2a6458',tip:'#78c4ac',stipe:'#1c180e',scale:'#4a3a1e',sorus:'#a8b42c',dead:'#3a3420',glow:0},
 plain:{deep:'#2a1e10',mid:'#6a4a24',tip:'#b88a48',stipe:'#1e140a',scale:'#5a3e1e',sorus:'#c8862a',dead:'#3a2c1a',glow:.1},
};
const look=name=>{const k=Object.keys(KINDS).find(k=>name.startsWith(k+' '))||'plain';const c={};for(const [key,v] of Object.entries(KINDS[k]))c[key]=typeof v==='string'?rgb(v):v;return {kind:k,c};};

const rand=seed=>{let s=seed>>>0||1;return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296);};
const noise=(x,y,z,s)=>(Math.sin(x*4.1+s)*Math.sin(z*3.7-s*1.3)+Math.sin(y*5.3+x*2.2+s*2.1)*.6+Math.sin((x-z)*7.9+s*.7)*Math.sin(y*6.1)*.35)/1.95;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

// Collects indexed surfaces with per-vertex colours into one geometry.
function builder(){
 const pos=[],col=[],idx=[];
 const push=(p,c)=>{pos.push(p.x,p.y,p.z);for(let k=0;k<3;k++)col.push(THREE.MathUtils.clamp(c[k],0,1));};
 return {
  // (nu+1)×(nv+1) grid: fn(u,v) -> Vector3, colour(u,v,p) -> [r,g,b]; wrap closes v.
  grid(nu,nv,fn,colour){
   const base=pos.length/3;
   for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){const u=i/nu,v=j/nv,p=fn(u,v);push(p,colour(u,v,p));}
   for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=base+i*(nv+1)+j,b=a+nv+1;idx.push(a,b,a+1,b,b+1,a+1);}
  },
  // a three.js geometry placed by matrix, coloured by colour(p)
  geo(geo,matrix,colour){
   const g=geo.index?geo:geo.toNonIndexed(),p=g.attributes.position,base=pos.length/3,v=V();
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(matrix)v.applyMatrix4(matrix);push(v,typeof colour==='function'?colour(v):colour);}
   if(g.index)for(const i of g.index.array)idx.push(base+i);else for(let i=0;i<p.count;i++)idx.push(base+i);
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
const place=(p,s=1,q=new THREE.Quaternion())=>new THREE.Matrix4().compose(p,q,V(s,s,s));

// A tube along points(t) -> Vector3, radius r(t), coloured by colour(t,around,p).
function tube(B,n,points,r,colour,sides=6){
 const up=V(0,1,0),side=V(),nrm=V(),T=V();
 B.grid(n,sides,(u,v)=>{
  const e=.01,p=points(u);T.copy(points(Math.min(1,u+e))).sub(points(Math.max(0,u-e))).normalize();
  side.crossVectors(T,Math.abs(T.y)>.95?V(1,0,0):up).normalize();nrm.crossVectors(side,T);
  const a=v*Math.PI*2;return p.clone().addScaledVector(side,Math.cos(a)*r(u)).addScaledVector(nrm,Math.sin(a)*r(u));
 },(u,v,p)=>colour(u,v,p));
}

// One frond: a rachis arching out along angle a, pinnae down both sides.
function frond(B,A,c,r,{a,len,peak,droop,pinnae,width,dead=false,base=.05}){
 const dir=V(Math.cos(a),0,Math.sin(a)),across=V(-Math.sin(a),0,Math.cos(a)),curl=(r()-.5)*.25;
 // quadratic bezier in (out, up), plus a slight sideways curl
 const P=s=>{
  const d0=.025,d1=len*.35,d2=len,y0=base,y1=peak*1.6,y2=peak-droop;
  const out=(1-s)**2*d0+2*(1-s)*s*d1+s*s*d2,y=(1-s)**2*y0+2*(1-s)*s*y1+s*s*y2;
  return dir.clone().multiplyScalar(out).addScaledVector(across,curl*s*s*len).setY(y);
 };
 const stem=dead?c.dead:c.stipe,leafLo=dead?c.dead:c.deep,leafHi=dead?mix(c.dead,c.scale,.5):c.mid,tip=dead?mix(c.dead,[.1,.08,.05],.4):c.tip;
 tube(B,14,P,s=>.0085*(1-s*.75),(s)=>mix(stem,leafLo,s*1.2),5);
 const T=V(),S=V(),N=V(),D=V(),W=V();
 for(let k=0;k<pinnae;k++){
  const s=.2+.78*(k+.5)/pinnae,p=P(s);
  T.copy(P(Math.min(1,s+.01))).sub(P(s-.01)).normalize();
  for(const sd of [-1,1]){
   S.copy(across).multiplyScalar(sd);N.crossVectors(T,S).normalize();if(N.y<0)N.negate();
   // sweep toward the tip and droop; the pinnae shorten to the frond's tip and base
   const sweep=.45+.25*s+(dead?.3:0);D.copy(S).multiplyScalar(Math.cos(sweep)).addScaledVector(T,Math.sin(sweep)).addScaledVector(N,dead?-.5:-.12).normalize();
   W.crossVectors(N,D).normalize();
   const lp=width*Math.pow(Math.sin(Math.PI*Math.min(1,(s-.12)/.9)),.7)*(.85+r()*.3),wp=lp*.2;
   const wither=!dead&&r()<.22?.55+r()*.3:2,seed=r()*6;
   B.grid(12,2,(u,v)=>{
    const across=v*2-1,teeth=(u*5)%1;
    const hw=wp*Math.pow(1-u,.6)*(.55+.75*teeth)*(1-u*u*.3);
    // V-shaped channel, edges curled under; the pinna droops more toward its tip
    const q=p.clone().addScaledVector(D,lp*u).addScaledVector(W,hw*across).addScaledVector(N,-Math.abs(across)*hw*.45-lp*u*u*(dead?.4:.22)+.003*Math.sin(seed+u*9));
    q.y=Math.max(q.y,.002);return q;
   },(u,v,q)=>{
    let col=mix(leafLo,leafHi,.25+u*1.1+noise(q.x*60,q.y*60,q.z*60,seed)*.25);
    col=mix(col,tip,(s-.55)*1.6*u);
    if(Math.abs(v-.5)<.2)col=mix(col,leafLo,.45);
    if(u>wither)col=mix(col,c.dead,Math.min(1,(u-wither)*5)*.9);
    return col;
   });
   // sori in two rows under the pinna
   if(!dead&&k%2===0)for(const vv of [-.35,.35])for(const u of [.3,.55]){
    const q=p.clone().addScaledVector(D,lp*u).addScaledVector(W,wp*Math.pow(1-u,.6)*vv).addScaledVector(N,-wp*.25-lp*u*u*.22-.003);
    A.geo(new THREE.SphereGeometry(1,5,3),place(q,.0045),mix(c.sorus,[0,0,0],r()*.35));
   }
  }
 }
}

// A fiddlehead: a scaly stalk rising then coiling forward into a tight spiral.
function fiddlehead(B,c,r,{a,lean,h,coil}){
 const dir=V(Math.cos(a),0,Math.sin(a)),k=.18,turns=1.7,base=V(Math.cos(a)*.02,.05,Math.sin(a)*.02);
 const P=t=>{
  let d,y;
  if(t<.4){const s=t/.4;d=lean*s*s;y=h*s;}
  else{const s=(t-.4)/.6,phi=Math.PI-s*turns*Math.PI*2,rho=coil*Math.exp(-k*s*turns*Math.PI*2);d=lean+coil+rho*Math.cos(phi);y=h+rho*Math.sin(phi);}
  return base.clone().addScaledVector(dir,d).setY(base.y+y);
 };
 const seed=r()*6;
 tube(B,30,P,t=>t<.4?.009:.009*(1-(t-.4)*1.25),(t,v,p)=>{
  const scales=noise(p.x*140,p.y*140,p.z*140,seed);
  return mix(mix(c.deep,c.mid,.3+t*.4),c.scale,.45+scales*.5);
 },6);
}

// A fertile spike: a stiff stalk crusted with clusters of sporangia toward the top.
function spike(B,A,c,r,{a,h}){
 const dir=V(Math.cos(a),0,Math.sin(a)),lean=.04+r()*.04;
 const P=t=>V(0,.05+h*t,0).addScaledVector(dir,.02+lean*t*t);
 tube(B,8,P,t=>.006*(1-t*.5),t=>mix(c.stipe,c.deep,t),5);
 for(let i=0;i<22;i++){
  const t=.45+.53*(i/22),p=P(t),ang=i*2.4+r(),rad=.012*(1-t*.4);
  p.add(V(Math.cos(ang)*rad,(r()-.5)*.01,Math.sin(ang)*rad));
  A.geo(new THREE.SphereGeometry(1,7,5),place(p,.007+r()*.005*(1-t*.5)),mix(c.sorus,mix(c.sorus,c.tip,.5),r()*.6));
 }
}

function buildPlant(c,sprout,seed){
 const B=builder(),A=builder(),r=rand(seed);
 const S=sprout?.55:1;
 // knotted crown: a lumpy dome shaggy with scales
 {
  const geo=new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=noise(x*3,y*3,z*3,seed);p.setXYZ(i,x*.085*S*(1+n*.18),y*.065*S*(1+n*.3),z*.085*S*(1+n*.18));}
  B.geo(geo,null,q=>mix(c.stipe,c.scale,.3+noise(q.x*90,q.y*90,q.z*90,2)*.6));
 }
 // snapped stubs of old fronds round the crown
 for(let i=0;i<(sprout?3:6);i++){
  const a=i/(sprout?3:6)*Math.PI*2+r()*.5,d=.06*S,h=(.03+r()*.03)*S;
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(a)*.7,0,-Math.cos(a)*.7));
  B.geo(new THREE.CylinderGeometry(.004*S,.009*S,h,5),new THREE.Matrix4().compose(V(Math.cos(a)*d,.04*S,Math.sin(a)*d),q,V(1,1,1)),q2=>mix(c.dead,c.stipe,.5+noise(q2.x*80,0,q2.z*80,1)*.5));
 }
 const n=sprout?3:7;
 for(let i=0;i<n;i++){
  const a=i/n*Math.PI*2+(r()-.5)*.4;
  frond(B,A,c,r,{a,len:(.36+r()*.08)*S,peak:(.32+r()*.12)*S,droop:(.18+r()*.1)*S,pinnae:sprout?9:16,width:.085*S,base:.05*S});
 }
 // one dead frond collapsed on the floor
 if(!sprout)frond(B,A,c,r,{a:r()*Math.PI*2,len:.4,peak:.05,droop:.04,pinnae:12,width:.07,dead:true,base:.02});
 const nf=sprout?4:3;
 for(let i=0;i<nf;i++)fiddlehead(B,c,r,{a:i/nf*Math.PI*2+.6+r()*.4,lean:.015*S,h:(.11+r()*.07)*S,coil:(.026+r()*.008)*S});
 const ns=sprout?1:3;
 for(let i=0;i<ns;i++)spike(B,A,c,r,{a:i/ns*Math.PI*2+1.3+r()*.5,h:(.38+r()*.1)*S});
 return {plant:B.done(),accent:A.done()};
}

function buildSpore(c,seed){
 const B=builder(),A=builder(),r=rand(seed),R=.11,Y=.5;
 // leathery husk split along a jagged mouth on its upper side
 const husk=(u,v)=>{
  const th=u*Math.PI,ph=v*Math.PI*2,n=noise(Math.cos(ph)*3,th*2,Math.sin(ph)*3,seed);
  const rr=R*(1+n*.08)*(1+.18*Math.sin(th));
  return V(Math.sin(th)*Math.cos(ph)*rr,Y+Math.cos(th)*R*1.25,Math.sin(th)*Math.sin(ph)*rr);
 };
 // the mouth: a band near the top pried open, its lips jagged
 B.grid(20,24,(u,v)=>{
  const p=husk(u,v),ph=v*Math.PI*2;
  const jag=.06*Math.abs(((ph*3.5/Math.PI)%2)-1),gap=u<.32+jag?.025*Math.max(0,Math.cos(ph)):0;
  return p.add(V(Math.cos(ph)*gap,gap*.6,0));
 },(u,v,p)=>{
  const ph=v*Math.PI*2,lip=Math.abs(u-.3)<.04&&Math.cos(ph)>.2;
  let col=mix(c.stipe,c.mid,.3+noise(p.x*70,p.y*70,p.z*70,seed)*.4+u*.3);
  return lip?mix(col,c.sorus,.6):col;
 });
 // the annulus: a beaded ridge girdling the husk
 for(let i=0;i<22;i++){
  const ph=i/22*Math.PI*2,th=Math.PI*.55,p=husk(th/Math.PI,ph/(Math.PI*2));
  p.add(V(Math.cos(ph),0,Math.sin(ph)).multiplyScalar(.004));
  B.geo(new THREE.SphereGeometry(1,6,4),place(p,.012),mix(c.scale,c.dead,i%2?.2:.6));
 }
 // jagged bracts curling up round the stalk scar at the bottom
 for(let i=0;i<6;i++){
  const ph=i/6*Math.PI*2+r()*.3,dir=V(Math.cos(ph),0,Math.sin(ph));
  const q=new THREE.Quaternion().setFromUnitVectors(V(0,-1,0),dir.clone().multiplyScalar(.6).add(V(0,-1,0)).normalize());
  B.geo(new THREE.ConeGeometry(.012,.07,4),new THREE.Matrix4().compose(V(0,Y-R*1.15,0).addScaledVector(dir,.03),q,V(1,1,.4)),mix(c.deep,c.scale,.4));
 }
 // spore dust heaped in the open mouth
 for(let i=0;i<26;i++){
  const ph=(r()-.5)*1.6,th=.18+r()*.14,p=husk(th,ph/(Math.PI*2)+1).multiplyScalar(1);
  p.set(p.x*.85,p.y-.004,p.z*.85);
  A.geo(new THREE.SphereGeometry(1,5,4),place(p,.006+r()*.006),mix(c.sorus,c.tip,r()*.5));
 }
 return {plant:B.done(),accent:A.done()};
}

const cache=new Map();
function shared(name){
 if(cache.has(name))return cache.get(name);
 const {kind,c}=look(name),spore=/ spore$/.test(name),sprout=/ sprout$/.test(name),seed=[...name].reduce((h,ch)=>h*31+ch.charCodeAt(0)>>>0,7741);
 const geo=spore?buildSpore(c,seed):buildPlant(c,sprout,seed);
 const plantMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:spore?.7:.82,side:spore?THREE.FrontSide:THREE.DoubleSide});
 const accentMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:kind==='swamp'?.15:.35,emissive:new THREE.Color(...c.sorus),emissiveIntensity:c.glow*(spore?1.3:1)});
 const s={...geo,plantMat,accentMat,kind};cache.set(name,s);return s;
}

export const isFern=name=>/^((dungeon|arctic|blazing|swamp) fern( sprout| spore)?|fern spore)$/.test(name);

export function createFern(name){
 const S=shared(name),spore=/ spore$/.test(name);
 const g=new THREE.Group(),body=new THREE.Group();g.name=name;g.add(body);
 for(const [geo,m,part] of [[S.plant,S.plantMat,spore?'husk':'fronds'],[S.accent,S.accentMat,spore?'dust':'sori']]){
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;body.add(mesh);
 }
 return {g,body,legs:[],tail:null,wings:[],quirk:spore?'hover':'fungus',kind:S.kind};
}
