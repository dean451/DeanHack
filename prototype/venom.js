import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Venom (class 17) lying where it landed: a glossy splash that was spat from the -x side, so
// it is a lobed puddle with a spray of droplets and a tapering streak running on towards +x.
// - blinding venom: murky amber with milky swirls through it.
// - acid venom: a sickly yellow-green that fizzes with bubbles and has scorched a ring into
//   the floor around itself.
// - freezing ice: a frozen splash, pale blue and frosted, with ice shards standing out of it.
// - an unidentified splash of venom keeps the plain amber (HI_ORGANIC) with no telltales.
// Colour is baked into vertex colours and each model is one merged mesh on one material,
// resting on y=0.
const LOOKS={
 plain:{deep:0x5a3410,shallow:0xa8702c,gloss:.12},
 blinding:{deep:0x4a2c10,shallow:0x9c6a2e,swirl:0xe6dcc4,gloss:.1},
 acid:{deep:0x5c7a08,shallow:0xc8e03a,bubble:0xe8f5a0,scorch:0x1c1610,gloss:.08,glow:0x2e4a00},
 ice:{deep:0x5f8fb8,shallow:0xcfe6f5,shard:0xeaf6ff,gloss:.22},
};

export function venomKind(name=''){
 const n=name.toLowerCase();
 return /acid/.test(n)?'acid':/blinding/.test(n)?'blinding':/\bice\b|freezing/.test(n)?'ice':'plain';
}

const clamp=t=>Math.min(1,Math.max(0,t));
const noise=(x,z,s=0)=>(Math.sin(x*17.3+z*5.1+s)*Math.cos(z*13.9-x*7.7+s*.7)+Math.sin(x*41.1-z*29.3+s*1.3)*.4)/1.4;

function clean(geo){
 const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
 for(const k of Object.keys(n.attributes))if(!['position','normal','color'].includes(k))n.deleteAttribute(k);
 return n;
}
function paint(geo,fn){
 const p=geo.attributes.position,col=[],c=new THREE.Color();
 for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c);col.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));return geo;
}

// A lobed pool: a polar grid whose rim wobbles, with a flat top that rounds off at the edge
// like a meniscus. Returns the geometry and a height(x, z) for placing things on its surface.
function pool({radius,height,lobes,seed,cx=0,cz=0,stretch=1}){
 const S=48,R=8,pos=[],idx=[];
 const rim=a=>radius*(1+.18*Math.sin(a*lobes+seed)+.09*Math.sin(a*(lobes+3)-seed*2)+.05*noise(Math.cos(a),Math.sin(a),seed));
 const lift=t=>height*Math.sqrt(Math.max(0,1-t**6));
 pos.push(cx,height,cz);
 for(let j=1;j<=R;j++){
  const t=j/R;
  for(let i=0;i<S;i++){const a=i/S*Math.PI*2,r=rim(a)*t;pos.push(cx+Math.cos(a)*r*stretch,j===R?0:lift(t),cz+Math.sin(a)*r);}
 }
 for(let i=0;i<S;i++){const n=(i+1)%S;idx.push(0,1+n,1+i);}
 for(let j=1;j<R;j++){
  const a0=1+(j-1)*S,a1=1+j*S;
  for(let i=0;i<S;i++){const n=(i+1)%S;idx.push(a0+i,a0+n,a1+i,a0+n,a1+n,a1+i);}
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 const heightAt=(x,z)=>{const dx=(x-cx)/stretch,dz=z-cz,a=Math.atan2(dz,dx);return lift(Math.hypot(dx,dz)/rim(a));};
 return {geo,heightAt,rim};
}

// A flattened droplet dome resting on the floor, drawn out along x by `stretch`.
function drop(r,h,x,z,stretch=1,turn=0){
 const geo=new THREE.SphereGeometry(r,12,5,0,Math.PI*2,0,Math.PI/2);
 geo.scale(stretch,h/r,1);geo.rotateY(turn);geo.translate(x,0,z);return clean(geo);
}

export function createVenom(name=''){
 const kind=venomKind(name),L=LOOKS[kind],parts=[];
 const deep=new THREE.Color(L.deep),shallow=new THREE.Color(L.shallow);
 const H=kind==='ice'?.016:.011;
 // Liquid is darker where it is deep and paler towards its thin edges.
 const liquid=(x,y,z,c,h=H)=>{
  c.copy(deep).lerp(shallow,clamp(clamp(1-y/h)*.75+.12*noise(x*3,z*3,5)));
  if(L.swirl){const s=Math.sin(Math.atan2(z,x)*2+Math.hypot(x,z)*38+noise(x,z,1)*2.4);if(s>.72)c.lerp(new THREE.Color(L.swirl),(s-.72)*1.6);}
  if(kind==='ice'&&noise(x*6,z*6,9)>.55)c.lerp(new THREE.Color(L.shard),.5);
 };
 // The main pool, and a smaller second lobe it has run into.
 const main=pool({radius:.14,height:H,lobes:5,seed:1.7,cx:-.07,cz:0});
 const side=pool({radius:.07,height:H*.8,lobes:4,seed:4.1,cx:.07,cz:.05,stretch:1.25});
 for(const p of [main,side])parts.push(paint(clean(p.geo),(x,y,z,c)=>liquid(x,y,z,c)));
 // The streak it left as it hit: a line of drops shrinking and stretching away towards +x.
 for(let i=0;i<6;i++){
  const t=i/5,r=.03*(1-t*.7),x=.14+t*.2,z=.03-.02*i+.006*Math.sin(i*2.3);
  parts.push(paint(drop(r,H*(.9-t*.4),x,z,1.3+t*.9,-.12),(x,y,z,c)=>liquid(x,y,z,c,H*.9)));
 }
 // A spray of tiny droplets thrown out around the pool, mostly forwards.
 let seed=kind.length*7919+13;const rnd=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
 for(let i=0;i<16;i++){
  const a=(rnd()-.5)*Math.PI*1.4,d=.2+rnd()*.17,r=.006+rnd()*.012;
  parts.push(paint(drop(r,r*.55,-.04+Math.cos(a)*d,Math.sin(a)*d*.9,1+rnd()*.6,-a),(x,y,z,c)=>liquid(x,y,z,c,r*.55)));
 }
 const surface=(x,z)=>Math.max(main.heightAt(x,z),side.heightAt(x,z));
 if(kind==='acid'){
  // Bubbles fizzing on the surface, some burst into rings.
  const bubble=new THREE.Color(L.bubble);
  for(let i=0;i<11;i++){
   const a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*.1,x=-.07+Math.cos(a)*d,z=Math.sin(a)*d*.9,r=.005+rnd()*.009,y=surface(x,z);
   const geo=i%4===3?new THREE.TorusGeometry(r,r*.25,4,10).rotateX(Math.PI/2):new THREE.SphereGeometry(r,8,5,0,Math.PI*2,0,Math.PI/2);
   geo.translate(x,y-.0005,z);parts.push(paint(clean(geo),(px,py,pz,c)=>c.copy(bubble).lerp(shallow,clamp(.3+.2*noise(px*9,pz*9)))));
  }
  // A ring of floor it has eaten into, charred dark and ragged at the outside edge.
  const scorch=clean(new THREE.RingGeometry(.02,.27,48,3).rotateX(-Math.PI/2));
  const p=scorch.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z);
   if(r>.25){const a=Math.atan2(z,x),k=1+.12*Math.sin(a*7)+.08*noise(Math.cos(a),Math.sin(a),3);p.setXYZ(i,x*k,.0006,z*k);}else p.setY(i,.0006);
  }
  scorch.translate(-.03,0,0);
  const char=new THREE.Color(L.scorch);
  parts.push(paint(scorch,(x,y,z,c)=>{const r=Math.hypot(x+.03,z)/.27;c.copy(char).lerp(new THREE.Color(0x3a3024),clamp(clamp(r-.55)*1.5+.1*noise(x*7,z*7)));}));
 }
 if(kind==='ice'){
  // Shards of ice that froze standing up out of the splash, leaning away from where it came.
  const shard=new THREE.Color(L.shard);
  for(let i=0;i<7;i++){
   const a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*.1,x=-.07+Math.cos(a)*d,z=Math.sin(a)*d,h=.03+rnd()*.05,y=surface(x,z);
   const geo=new THREE.ConeGeometry(.008+rnd()*.008,h,5,1);
   geo.translate(0,h/2,0);geo.rotateZ(-.25-rnd()*.35);geo.rotateY(rnd()*.8-.4);geo.translate(x,y-.002,z);
   parts.push(paint(clean(geo),(px,py,pz,c)=>c.copy(shallow).lerp(shard,clamp((py-y)/h+.2))));
  }
 }
 const merged=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());
 merged.computeVertexNormals();merged.computeBoundingBox();merged.computeBoundingSphere();
 const material=new THREE.MeshStandardMaterial({vertexColors:true,metalness:0,roughness:L.gloss,
  ...(L.glow?{emissive:L.glow,emissiveIntensity:.35}:{})});
 const mesh=new THREE.Mesh(merged,material);mesh.receiveShadow=true;mesh.castShadow=kind==='ice';
 mesh.userData.part='venom';mesh.userData.kind=kind;
 const g=new THREE.Group();g.name=kind==='plain'?'Splash of venom':kind==='ice'?'Freezing ice':`${kind[0].toUpperCase()+kind.slice(1)} venom`;g.add(mesh);
 g.userData.dispose=()=>{merged.dispose();material.dispose();};
 return g;
}
