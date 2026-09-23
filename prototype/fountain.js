import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Both modes use this design. Each instance owns its geometry, materials and
// animation; supplied stone textures remain owned by the scene that created them.
export function createFountain({materials={},scale=1}={}) {
 const g=new THREE.Group();g.name='Fountain';g.visible=true;g.scale.setScalar(scale);
 const own=new Set(),geometries=new Set();
 const material=(name,color,extra={})=>{const m=materials[name]?.clone()||new THREE.MeshStandardMaterial({color,roughness:.85,...extra});own.add(m);return m;};
 const stone=material('stone','#68746e',{roughness:.88}),trim=material('trim','#85877a',{roughness:.7}),gold=material('gold','#b49355',{metalness:.75,roughness:.3});
 g.userData.fountainMaterials={stone,trim,gold};
 const waterMaterial=material('water','#177780',{metalness:.65,roughness:.18,emissive:'#125a60',emissiveIntensity:.65,transparent:true,opacity:.9});
 const glow=material('glow','#97ffed',{emissive:'#46e9ce',emissiveIntensity:3,roughness:.2});
 const add=(geo,mat,x=0,y=0,z=0)=>{geometries.add(geo);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
 const cylinder=(a,b,h,m,x,y,z,n=32)=>add(new THREE.CylinderGeometry(a,b,h,n),m,x,y,z);
 const torus=(r,t,m,x,y,z)=>{const o=add(new THREE.TorusGeometry(r,t,8,48),m,x,y,z);o.rotation.x=Math.PI/2;return o;};
 cylinder(.91,.99,.18,trim,0,.08,0,12);cylinder(.81,.89,.28,stone,0,.24,0,12);torus(.77,.10,trim,0,.4,0);
 const water=cylinder(.72,.72,.035,waterMaterial,0,.34,0,64);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;const slab=add(new RoundedBoxGeometry(.28,.12,.42,3,.04),trim,Math.cos(a)*.76,.39,Math.sin(a)*.76);slab.rotation.y=a;}
 cylinder(.16,.25,.55,trim,0,.58,0);cylinder(.37,.12,.13,gold,0,.89,0);cylinder(.32,.32,.035,waterMaterial,0,.96,0);
 let seed=73;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const dropGeo=new THREE.SphereGeometry(.018,8,6),drops=[];
 for(let i=0;i<100;i++)drops.push({mesh:add(dropGeo,glow),phase:random(),angle:random()*Math.PI*2,r:.24+random()*.38});
 const ripples=Array.from({length:4},()=>torus(.15,.006,glow,0,.366,0));
 g.userData.updateFountain=t=>{
  for(const d of drops){const p=(t*.8+d.phase)%1;d.mesh.position.set(Math.cos(d.angle)*d.r*p,.96+Math.sin(p*Math.PI)*.55-p*.6,Math.sin(d.angle)*d.r*p);d.mesh.scale.setScalar(.6+Math.sin(p*Math.PI)*.6);}
  ripples.forEach((r,i)=>{const p=(t*.45+i/4)%1;r.scale.setScalar(1+p*3.3);r.position.y=.365+Math.sin(t*3+i)*.004;});water.rotation.y=t*.1;
 };
 g.userData.dispose=()=>{geometries.forEach(o=>o.dispose());own.forEach(o=>o.dispose());};
 g.userData.updateFountain(0);return g;
}
