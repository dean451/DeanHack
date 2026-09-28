import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A unicorn horn lying on the floor. The shaft tapers from a thick root to a fine point
// with a slight upward sweep, and two ridges wind round it in a tight spiral, as on a
// narwhal tusk. At the root a knobbly burr of bone rings the stump, and the cut face
// shows porous bone. Colour is baked into vertex colours: yellowed ivory at the root
// fading to pearl white at the tip, darker in the spiral grooves, with faint lengthwise
// streaks. Everything is one merged mesh on one material, resting on y=0.
const L=.5,R0=.052,TURNS=4.5,BEND=.035;
const hash=(a,b)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s);};

export function createUnicornHorn(){
 const g=new THREE.Group();g.name='Unicorn horn';
 const ivory=new THREE.Color(0xeee4cb),root=new THREE.Color(0xc9b184),pearl=new THREE.Color(0xfbf8f1),groove=new THREE.Color(0x9c8a66),bone=new THREE.Color(0xb49a72),pore=new THREE.Color(0x6d5a44);
 const centre=t=>new THREE.Vector3(-L/2+t*L,BEND*t*t,0);
 const radius=t=>R0*Math.pow(1-t,.85)+.0015*(1-t);
 const c=new THREE.Color();

 // Shaft: rings along the length, each ring pushed out on two helical ridges.
 const N=72,M=28,pos=[],col=[],idx=[];
 for(let i=0;i<=N;i++){
  const t=i/N,o=centre(t),r=radius(t);
  for(let j=0;j<=M;j++){
   const a=j/M*Math.PI*2,phase=a*2-t*TURNS*Math.PI*2,ridge=Math.cos(phase);
   const rr=r*(1+.1*ridge*Math.min(1,t*12)*(1-t*.5));
   pos.push(o.x,o.y+Math.cos(a)*rr,o.z+Math.sin(a)*rr);
   c.copy(root).lerp(ivory,Math.min(1,t/.35));
   if(t>.55)c.lerp(pearl,(t-.55)/.45);
   c.lerp(groove,Math.max(0,-ridge)*.38*Math.min(1,t*10));
   const streak=hash(j%M,Math.floor(t*6));
   c.multiplyScalar(.93+streak*.1);
   col.push(c.r,c.g,c.b);
  }
 }
 for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;idx.push(a,a+1,b,a+1,b+1,b);}
 const shaft=new THREE.BufferGeometry();
 shaft.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 shaft.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 shaft.setIndex(idx);shaft.computeVertexNormals();

 // The cut face: a slightly domed disc of porous bone closing the root.
 const face=new THREE.CircleGeometry(radius(0)*1.08,M);
 face.rotateY(-Math.PI/2);face.translate(-L/2-.001,0,0);
 {
  const p=face.attributes.position,fc=[];
  for(let i=0;i<p.count;i++){
   const y=p.getY(i),z=p.getZ(i),d=Math.hypot(y,z)/(radius(0)*1.08);
   p.setX(i,p.getX(i)-.004*(1-d*d));
   c.copy(pore).lerp(bone,Math.min(1,d*1.3)*.8+hash(y*400,z*400)*.2);
   fc.push(c.r,c.g,c.b);
  }
  face.setAttribute('color',new THREE.Float32BufferAttribute(fc,3));face.computeVertexNormals();
 }

 // The burr: a lumpy ring of bone where the horn met the brow.
 const burr=new THREE.TorusGeometry(radius(0)*1.02,.013,8,M);
 burr.rotateY(Math.PI/2);burr.translate(-L/2+.012,0,0);
 {
  const p=burr.attributes.position,bc=[];
  for(let i=0;i<p.count;i++){
   const y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,y),k=1+.35*(hash(Math.floor((a+Math.PI)*4),3)-.5);
   const r=Math.hypot(y,z),r0=radius(0)*1.02;
   const nr=r0+(r-r0)*k;
   p.setY(i,y/r*nr);p.setZ(i,z/r*nr);
   c.copy(bone).lerp(root,.4+hash(a*9,1)*.3).multiplyScalar(.8+.2*(r>r0?1:0));
   bc.push(c.r,c.g,c.b);
  }
  burr.setAttribute('color',new THREE.Float32BufferAttribute(bc,3));burr.computeVertexNormals();
 }

 const parts=[shaft,face,burr].map(geo=>{const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();for(const k of Object.keys(n.attributes))if(!['position','normal','color'].includes(k))n.deleteAttribute(k);return n;});
 const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.36,metalness:0});
 const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part='horn';
 // Lay it down: tip the root onto the floor so the underside of the taper rests flat,
 // turn it a little across the tile, then settle the lowest point onto y=0.
 mesh.rotation.set(0,.4,-Math.atan2(R0,L)*.8);
 g.add(mesh);
 g.updateMatrixWorld(true);mesh.position.y-=new THREE.Box3().setFromObject(g).min.y;
 g.userData.dispose=()=>{geo.dispose();material.dispose();};
 return g;
}
