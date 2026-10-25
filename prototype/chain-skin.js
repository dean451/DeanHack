import * as THREE from 'three';

// A tail (or any tapering chain) as a SkinnedMesh over bones laid through `pts` (the chain's own space,
// first point at the origin of its parent group). Each vertex rides the two bones either end of the segment
// it lies nearest, weighted by where along it the vertex sits, so a turned joint bends the hide smoothly
// and everything past the joint follows it. One mesh, so the mesh caps don't change. `pts` are picked from
// the builder's curve by `pickPoints`.
export function pickPoints(pts,count){
 return Array.from({length:count},(_,i)=>pts[Math.round(i*(pts.length-1)/(count-1))]);
}
export function skinChain(geo,pts){
 const P=pts.map(p=>new THREE.Vector3(...p)),pos=geo.attributes.position,n=pos.count;
 const idx=new Uint16Array(n*4),wt=new Float32Array(n*4),v=new THREE.Vector3(),seg=new THREE.Line3(),c=new THREE.Vector3();
 for(let i=0;i<n;i++){
  v.fromBufferAttribute(pos,i);
  let best=Infinity,bk=0,bt=0;
  for(let k=0;k<P.length-1;k++){seg.set(P[k],P[k+1]);const t=seg.closestPointToPointParameter(v,true);seg.at(t,c);const d=c.distanceToSquared(v);if(d<best-1e-12){best=d;bk=k;bt=t;}}
  idx[i*4]=bk;idx[i*4+1]=bk+1;wt[i*4]=1-bt;wt[i*4+1]=bt;
 }
 geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(idx,4));
 geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(wt,4));
 geo.userData.chain=P.map(p=>p.toArray());
 return geo;
}
// The mesh on `parent`, its bones nested under it: `<name>0` at the first point, each next one at its
// point (relative to the last). Returns {mesh,bones}.
export function rigChain(parent,geo,material,name,{part=name}={}){
 const m=new THREE.SkinnedMesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=part;
 const P=geo.userData.chain,bones=P.map((p,i)=>{const b=new THREE.Bone();b.name=name+i;const q=i?P[i-1]:[0,0,0];b.position.set(p[0]-q[0],p[1]-q[1],p[2]-q[2]);return b;});
 bones.forEach((b,i)=>(i?bones[i-1]:m).add(b));
 parent.add(m);m.updateMatrixWorld(true);m.bind(new THREE.Skeleton(bones));
 return {mesh:m,bones};
}
