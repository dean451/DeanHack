import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Both modes use this design. Each instance owns its geometry, materials and
// animation; supplied stone textures remain owned by the scene that created them.
//
// A round basin on a twelve-sided plinth: a moulded lathe wall capped by eight
// dressed coping slabs, a baluster pedestal and a gilt bowl whose four lips pour
// thin streams back into the pool. Stone is lightly roughened by a position-keyed
// noise, and its weathering is baked into vertex colours (mottling, dark seams, a wet
// band at the waterline, moss in the damp places, grime at the foot). Static parts
// are merged into one mesh per material; the pool surface stays its own mesh, and
// the spray and ripples are two instanced meshes, so the whole fountain is 7 draws.
export function createFountain({materials={},scale=1}={}) {
 const g=new THREE.Group();g.name='Fountain';g.visible=true;g.scale.setScalar(scale);
 const own=new Set(),geometries=new Set();
 const material=(name,color,extra={})=>{const m=materials[name]?.clone()||new THREE.MeshStandardMaterial({color,roughness:.85,...extra});own.add(m);return m;};
 const stone=material('stone','#68746e',{roughness:.88}),trim=material('trim','#85877a',{roughness:.7}),gold=material('gold','#b49355',{metalness:.75,roughness:.3});
 stone.vertexColors=trim.vertexColors=true;
 g.userData.fountainMaterials={stone,trim,gold};
 const waterMaterial=material('water','#177780',{metalness:.65,roughness:.18,emissive:'#125a60',emissiveIntensity:.65,transparent:true,opacity:.9});
 const glow=material('glow','#97ffed',{emissive:'#46e9ce',emissiveIntensity:3,roughness:.2});

 const bins=new Map([[stone,[]],[trim,[]],[gold,[]],[waterMaterial,[]]]);
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3(1,1,1);
 const put=(geo,m,x=0,y=0,z=0,ry=0,tint=1)=>{geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(0,ry,0)),s));geo.userData.tint=tint;bins.get(m).push(geo);return geo;};
 const lathe=(profile,seg)=>new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),seg);
 // Push each vertex outward along its radius by a position-keyed noise (shared
 // seam vertices move together, so the lathe does not split).
 const roughen=(geo,amount,freq=24)=>{
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z);if(r<1e-4)continue;
   const k=1+(noise3(x*freq,y*freq,z*freq)-.5)*2*amount/r;p.setXYZ(i,x*k,y+(noise3(z*freq+5,x*freq,y*freq)-.5)*amount*.6,z*k);}
  geo.computeVertexNormals();return geo;
 };

 // Plinth: a twelve-sided step with a chamfered top edge.
 put(roughen(lathe([[0,0],[.99,0],[.99,.14],[.95,.18],[0,.18]],12),.006),trim,0,0,0,0,.95);
 // Basin wall: a base moulding, a gently swelling drum and a rounded lip; the
 // inside drops to a floor under the water.
 put(roughen(lathe([[.9,.18],[.9,.2],[.87,.22],[.855,.25],[.87,.3],[.875,.33],[.85,.36],[.73,.37],[.72,.35],[.71,.24],[.66,.22],[0,.22]],40),.008),stone);
 // Eight dressed coping slabs laid round the lip with small gaps between them.
 for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8;
  const slab=new RoundedBoxGeometry(.56,.075,.22,2,.025);
  const p=slab.attributes.position;
  for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j),wx=x+i*9,n=(noise3(wx*18,y*18,z*18)-.5)*.012;p.setXYZ(j,x+n,y+(y>0?n*.6:0),z+n);}
  slab.computeVertexNormals();
  put(slab,trim,Math.cos(a)*.77,.4,Math.sin(a)*.77,-a-Math.PI/2,.94+(i*37%5)*.03);
 }
 // Pedestal: a baluster with a square-ish foot moulding rising from the pool.
 put(roughen(lathe([[0,.22],[.29,.22],[.29,.27],[.25,.3],[.22,.34],[.18,.36],[.15,.42],[.13,.52],[.125,.62],[.15,.68],[.17,.71],[.14,.74],[.1,.77],[.09,.82],[.12,.845],[0,.845]],28),.004),trim);
 // Gilt bowl: a stem collar, a flaring cup and a rolled rim.
 put(lathe([[0,.83],[.11,.83],[.12,.85],[.2,.87],[.3,.9],[.365,.935],[.385,.955],[.38,.968],[.36,.966],[.345,.95],[.2,.918],[0,.91]],40),gold);
 put(new THREE.TorusGeometry(.12,.012,8,28).rotateX(Math.PI/2),gold,0,.845,0);
 // Four pouring lips and the streams falling from them into the pool.
 for(let i=0;i<4;i++){const a=i*Math.PI/2;
  put(new THREE.BoxGeometry(.05,.018,.06),gold,Math.cos(a)*.395,.958,Math.sin(a)*.395,-a+Math.PI/2);
  const pts=[new THREE.Vector3(.4,.958,0),new THREE.Vector3(.5,.93,0),new THREE.Vector3(.56,.7,0),new THREE.Vector3(.58,.35,0)];
  const stream=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.011,6,false);
  put(stream,waterMaterial,0,0,0,-a);
 }
 put(new THREE.CylinderGeometry(.35,.35,.012,40),waterMaterial,0,.955,0);

 // Bake weathering into the stone and trim, then merge each bin into one mesh.
 const n=new THREE.Vector3();
 for(const [mat,list] of bins){
  const parts=list.map(geo=>{
   const tint=geo.userData.tint??1;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal','uv'].includes(key))flat.deleteAttribute(key);
   if(mat===stone||mat===trim){
    const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i);const c=stoneColour(p.getX(i),p.getY(i),p.getZ(i),n,tint);col.set(c,i*3);}
    flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   }
   return flat;
  });
  const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());geometries.add(geo);
  const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=mat!==waterMaterial;mesh.receiveShadow=true;
  mesh.userData.part=mat===stone?'stone':mat===trim?'trim':mat===gold?'gold':'streams';
  g.add(mesh);
 }

 // The pool surface turns slowly, so it stays a mesh of its own.
 const poolGeo=new THREE.CylinderGeometry(.715,.715,.035,64);geometries.add(poolGeo);
 const water=new THREE.Mesh(poolGeo,waterMaterial);water.position.y=.34;water.receiveShadow=true;water.userData.part='pool';g.add(water);

 // Spray and ripples: one instanced mesh each, moved by `updateFountain`.
 let seed=73;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const dropGeo=new THREE.SphereGeometry(.018,8,6),drops=[];geometries.add(dropGeo);
 for(let i=0;i<100;i++)drops.push({phase:random(),angle:random()*Math.PI*2,r:.24+random()*.38});
 const spray=new THREE.InstancedMesh(dropGeo,glow,drops.length);spray.userData.part='spray';
 const rippleGeo=new THREE.TorusGeometry(.15,.006,8,48).rotateX(Math.PI/2);geometries.add(rippleGeo);
 const ripples=new THREE.InstancedMesh(rippleGeo,glow,4);ripples.userData.part='ripples';
 // They move beyond the bounds of their base geometry, so skip culling.
 for(const o of [spray,ripples]){o.frustumCulled=false;o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);g.add(o);}
 const unit=new THREE.Quaternion();
 g.userData.updateFountain=t=>{
  drops.forEach((d,i)=>{const p=(t*.8+d.phase)%1;v.set(Math.cos(d.angle)*d.r*p,.96+Math.sin(p*Math.PI)*.55-p*.6,Math.sin(d.angle)*d.r*p);s.setScalar(.6+Math.sin(p*Math.PI)*.6);spray.setMatrixAt(i,m4.compose(v,unit,s));});
  for(let i=0;i<4;i++){const p=(t*.45+i/4)%1;v.set(0,.365+Math.sin(t*3+i)*.004,0);s.set(1+p*3.3,1,1+p*3.3);ripples.setMatrixAt(i,m4.compose(v,unit,s));}
  s.set(1,1,1);spray.instanceMatrix.needsUpdate=ripples.instanceMatrix.needsUpdate=true;water.rotation.y=t*.1;
 };
 g.userData.dispose=()=>{geometries.forEach(o=>o.dispose());own.forEach(o=>o.dispose());spray.dispose();ripples.dispose();};
 g.userData.updateFountain(0);return g;
}

// A multiplier over the material's own colour and texture: mottling, dark seams,
// a darker wet band round the waterline, moss where it stays damp, grime at the foot.
function stoneColour(x,y,z,n,tint){
 const r=Math.hypot(x,z);
 let k=(.9+(noise3(x*9,y*9,z*9)-.5)*.3+(noise3(x*70,y*70,z*70)-.5)*.1)*tint;
 const seam=Math.abs(noise3(x*4+y*2,y*3,z*4)-.5);if(seam<.02)k*=.6+seam*18;
 if(n.y<-.4)k*=.7;
 k*=.74+.26*Math.min(1,y/.14);
 let cr=k,cg=k,cb=k;
 // Wet: inside the basin and the pedestal foot below the lip, and the skirt under
 // the streams where they splash over.
 const wet=(r<.74&&y<.38)||(y<.4&&y>.2&&noise3(x*6,z*6,1)>.62);
 if(wet){cr*=.62;cg*=.7;cb*=.74;}
 const mossy=noise3(x*11+3,y*11,z*11+7);
 const damp=(wet?1:0)+(y<.24?.5:0)+(n.y>.5?.3:0);
 if(mossy+damp*.2>.78){const m=Math.min(1,(mossy+damp*.2-.78)*5);cr*=1-.45*m;cg*=1+.05*m;cb*=1-.55*m;}
 return [cr,cg,cb];
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
