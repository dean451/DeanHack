import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A boulder for the `0` object: one weathered granite mass that fills most of its
// tile. An icosphere is sheared by a few fracture planes (flat broken faces with
// crisp edges), roughened by low-frequency noise and settled onto a flattened base.
// Vertex colours bake the weathering: speckled grain, darker fracture faces, a pale
// quartz seam, grime and damp near the floor, dust on the top and moss on the
// shaded side. A few spalled chips and grit lie around it on a soft contact shadow.
// Two draws: the baked stone and the shadow.
// `seed` varies the shape per tile; the same seed always gives the same stone.
export function createBoulder(seed=1){
 const g=new THREE.Group();g.name='Boulder';
 const geometries=[],materials=[];
 const rand=rng(seed||1);
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s=new THREE.Vector3();
 // Nothing on a boulder moves, so the mass, chips and grit are placed in their geometry and
 // baked into one vertex-coloured stone mesh: 2 draws with the shadow, not 9.
 const parts=[];
 const place=(geo,x,y,z,ry,rx=0,rz=0,sx=1,sy=1,sz=1)=>{
  geo.applyMatrix4(m4.compose(p.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
  geo.deleteAttribute('uv');parts.push(geo);return geo;
 };

 const stone=mat({vertexColors:true,roughness:.94,flatShading:true});
 place(rockGeometry(rand,{radius:.31,detail:4,planes:5,sx:1.05,sy:.8,sz:1.1,base:.26,seam:true,moss:true}),0,0,0,rand()*Math.PI*2);

 // Spalled chips and grit that have broken off and settled round the foot.
 const chipCount=3+Math.floor(rand()*2);
 for(let i=0;i<chipCount;i++){
  const a=rand()*Math.PI*2,d=.33+rand()*.07,r=.035+rand()*.03;
  const chip=rockGeometry(rand,{radius:r,detail:1,planes:3,sx:1.2,sy:.6,sz:1,base:.5});
  place(chip,Math.cos(a)*d,0,Math.sin(a)*d,rand()*Math.PI*2);
 }
 // Grit: each grain its own shade of the granite, some dark flecks, some pale felspar.
 const gritTones=[0x5e5a53,0x6e6960,0x4a4743,0x857b70,0x3a3835],c=new THREE.Color();
 for(let i=0;i<14;i++){
  const a=rand()*Math.PI*2,d=.3+rand()*.13,k=.6+rand()*.9;
  const grain=new THREE.TetrahedronGeometry(.012,0);
  c.set(gritTones[Math.floor(rand()*gritTones.length)]);
  const col=new Float32Array(grain.attributes.position.count*3);for(let j=0;j<col.length;j+=3)c.toArray(col,j);
  grain.setAttribute('color',new THREE.BufferAttribute(col,3));
  place(grain,Math.cos(a)*d,.012*k,Math.sin(a)*d,rand()*6,rand()*6,rand()*6,k,k*.6,k);
 }
 const merged=mergeGeometries(parts);parts.forEach(x=>x.dispose());
 merged.computeBoundingBox();merged.computeBoundingSphere();geometries.push(merged);
 const mass=new THREE.Mesh(merged,stone);mass.castShadow=mass.receiveShadow=true;mass.userData.part='mass';g.add(mass);

 // Contact shadow: one disc whose vertex alpha is darkest under the stone and fades smoothly
 // to nothing past its edge (it was three stacked discs, stepped at each rim).
 const shadowMat=new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,depthWrite:false});materials.push(shadowMat);
 const shadowGeo=contactShadowGeometry(.44,rand);geometries.push(shadowGeo);
 const shadow=new THREE.Mesh(shadowGeo,shadowMat);shadow.position.y=.002;shadow.renderOrder=-1;shadow.userData.part='shadow';g.add(shadow);

 g.userData.dispose=()=>{geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());};
 return g;
}

// A flat disc in the floor plane (y=0) with RGBA vertex colours: near-black, alpha .66 out
// to .2 of its radius, then easing to 0 at the rim. The rim wobbles a little so the shadow
// isn't a perfect circle.
function contactShadowGeometry(radius,rand){
 const rings=8,seg=40,pos=[],col=[],idx=[];
 const wob=[rand()*6,rand()*6],ease=t=>t*t*(3-2*t);
 pos.push(0,0,0);col.push(.055,.066,.07,.66);
 for(let r=1;r<=rings;r++){
  const t=r/rings,alpha=.66*(1-ease(Math.max(0,(t-.45)/.55)));
  for(let i=0;i<seg;i++){
   const a=i/seg*Math.PI*2,k=radius*t*(1+.05*t*Math.sin(a*2+wob[0])+.03*t*Math.sin(a*3+wob[1]));
   pos.push(Math.cos(a)*k,0,Math.sin(a)*k);col.push(.055,.066,.07,alpha);
  }
 }
 for(let i=0;i<seg;i++)idx.push(0,1+(i+1)%seg,1+i);
 for(let r=1;r<rings;r++)for(let i=0;i<seg;i++){
  const a=1+(r-1)*seg+i,b=1+(r-1)*seg+(i+1)%seg,c=a+seg,d=b+seg;
  idx.push(a,b,c,b,d,c);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute(new Array(pos.length/3).fill([0,1,0]).flat(),3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(col,4));
 geo.setIndex(idx);geo.computeBoundingSphere();
 return geo;
}

// A carried boulder (the stone giant's): the same weathered granite, fractured on all
// sides with no bedded base or moss, centred on its own middle so a hand can hold it.
// The caller owns the geometry.
export function heldBoulderGeometry(seed=1,radius=.17){
 const geo=rockGeometry(rng(seed),{radius,detail:3,planes:4,sx:1.08,sy:.92,sz:1,base:.02,seam:true});
 geo.computeBoundingBox();const c=geo.boundingBox.getCenter(new THREE.Vector3());
 geo.translate(-c.x,-c.y,-c.z);geo.computeBoundingBox();geo.computeBoundingSphere();
 return geo;
}

function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

// Smooth value noise from a few random sine waves; cheap and deterministic.
function waves(rand,count,freq){
 const w=[];for(let i=0;i<count;i++){const d=new THREE.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize();w.push({d,f:freq*(.7+rand()*.6),ph:rand()*Math.PI*2});}
 return v=>{let n=0;for(const x of w)n+=Math.sin(v.dot(x.d)*x.f+x.ph);return n/count;};
}

// An icosphere shaped into a stone, dropped so its lowest point sits on y=0, with
// baked vertex colours. Non-indexed, so fracture faces stay crisp when flat shaded.
function rockGeometry(rand,{radius,detail,planes,sx,sy,sz,base,seam=false,moss=false}){
 const geo=new THREE.IcosahedronGeometry(1,detail);
 const pos=geo.attributes.position,v=new THREE.Vector3();
 const bumps=waves(rand,6,3.2),grain=waves(rand,9,21),seamWave=waves(rand,3,2.4);
 const cuts=[];for(let i=0;i<planes;i++){const n=new THREE.Vector3(rand()-.5,(rand()-.5)*.8+.15,rand()-.5).normalize();cuts.push({n,d:.72+rand()*.16});}
 const cut=new Uint8Array(pos.count);
 for(let i=0;i<pos.count;i++){
  v.fromBufferAttribute(pos,i);
  v.multiplyScalar(1+bumps(v)*.12);
  for(const c of cuts){const k=v.dot(c.n);if(k>c.d){v.addScaledVector(c.n,c.d-k);cut[i]=1;}}
  v.set(v.x*sx,v.y*sy,v.z*sz);
  // settle: the underside flattens where the stone has bedded into the floor
  const floor=-sy*(1-base);if(v.y<floor)v.y=floor+(v.y-floor)*.15;
  pos.setXYZ(i,v.x*radius,v.y*radius,v.z*radius);
 }
 geo.computeBoundingBox();const bb=geo.boundingBox;
 geo.translate(0,-bb.min.y,0);
 const h=bb.max.y-bb.min.y||1;
 const colors=new Float32Array(pos.count*3),c=new THREE.Color();
 const granite=new THREE.Color(0x77726a),fracture=new THREE.Color(0x8a857b),fleck=new THREE.Color(0x2c2b29),felspar=new THREE.Color(0xa08a78);
 const quartz=new THREE.Color(0xd8d2c4),grime=new THREE.Color(0x2f2d2a),dust=new THREE.Color(0xa29a8a),mossCol=new THREE.Color(0x4f5a2e);
 const seamN=new THREE.Vector3(rand()-.5,.4,rand()-.5).normalize(),mossDir=new THREE.Vector3(rand()-.5,0,rand()-.5).normalize();
 for(let i=0;i<pos.count;i++){
  v.fromBufferAttribute(pos,i);
  const t=v.y/h,u=new THREE.Vector3(v.x,v.y-h*.5,v.z).normalize();
  c.copy(cut[i]?fracture:granite);
  const gr=grain(u);
  if(gr>.42)c.lerp(fleck,.75);else if(gr<-.5)c.lerp(felspar,.5);
  c.multiplyScalar(.9+bumps(u)*.25);
  if(seam){const k=Math.abs(u.dot(seamN)+seamWave(u)*.12);if(k<.045)c.lerp(quartz,.8*(1-k/.045));}
  if(t<.3)c.lerp(grime,(.3-t)/.3*.6);
  if(u.y>.55)c.lerp(dust,(u.y-.55)*.7);
  if(moss){const m=u.dot(mossDir)*.8+u.y*.4+bumps(u)*.5;if(m>.55&&t>.2)c.lerp(mossCol,Math.min(1,(m-.55)*2.4)*.85);}
  colors.set([c.r,c.g,c.b],i*3);
 }
 geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
 geo.computeVertexNormals();
 return geo;
}
