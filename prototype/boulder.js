import * as THREE from 'three';

// A boulder for the `0` object: one weathered granite mass that fills most of its
// tile. An icosphere is sheared by a few fracture planes (flat broken faces with
// crisp edges), roughened by low-frequency noise and settled onto a flattened base.
// Vertex colours bake the weathering: speckled grain, darker fracture faces, a pale
// quartz seam, grime and damp near the floor, dust on the top and moss on the
// shaded side. A few spalled chips and grit lie around it on a soft contact shadow.
// `seed` varies the shape per tile; the same seed always gives the same stone.
export function createBoulder(seed=1){
 const g=new THREE.Group();g.name='Boulder';
 const geometries=[],materials=[];
 const rand=rng(seed||1);
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const add=(geo,m,x=0,y=0,z=0)=>{geometries.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};

 const stone=mat({vertexColors:true,roughness:.94,flatShading:true});
 const mass=add(rockGeometry(rand,{radius:.31,detail:4,planes:5,sx:1.05,sy:.8,sz:1.1,base:.26,seam:true,moss:true}),stone);
 mass.rotation.y=rand()*Math.PI*2;
 mass.userData.part='mass';

 // Spalled chips and grit that have broken off and settled round the foot.
 const chipCount=3+Math.floor(rand()*2);
 for(let i=0;i<chipCount;i++){
  const a=rand()*Math.PI*2,d=.33+rand()*.07,r=.035+rand()*.03;
  const chip=add(rockGeometry(rand,{radius:r,detail:1,planes:3,sx:1.2,sy:.6,sz:1,base:.5}),stone,Math.cos(a)*d,0,Math.sin(a)*d);
  chip.rotation.y=rand()*Math.PI*2;
 }
 const gritMat=mat({color:0x5e5a53,roughness:1,flatShading:true});
 const grit=new THREE.TetrahedronGeometry(.012,0);geometries.push(grit);
 const gritMesh=new THREE.InstancedMesh(grit,gritMat,14);gritMesh.receiveShadow=true;
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s=new THREE.Vector3();
 for(let i=0;i<14;i++){
  const a=rand()*Math.PI*2,d=.3+rand()*.13,k=.6+rand()*.9;
  e.set(rand()*6,rand()*6,rand()*6);q.setFromEuler(e);p.set(Math.cos(a)*d,.012*k,Math.sin(a)*d);s.set(k,k*.6,k);
  gritMesh.setMatrixAt(i,m4.compose(p,q,s));
 }
 g.add(gritMesh);

 // Contact shadow: a dark core under the stone fading out in two rings.
 for(const [r,o] of [[.4,.22],[.33,.3],[.26,.4]]){
  const shadowMat=new THREE.MeshBasicMaterial({color:0x0e1112,transparent:true,opacity:o,depthWrite:false});materials.push(shadowMat);
  const disc=add(new THREE.CircleGeometry(r,28),shadowMat,0,.002,0);disc.rotation.x=-Math.PI/2;disc.castShadow=disc.receiveShadow=false;disc.renderOrder=-1;
 }

 g.userData.dispose=()=>{geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());};
 return g;
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
