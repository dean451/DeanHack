import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A drift of poison gas (S_poisoncloud, drawn as a bright green '#'): a low, roiling bank of
// sickly yellow-green vapour hanging over the floor, thick and dark at its heart, with
// ragged wisps curling off the top. It is a veil, not a floor, so the tile underneath still
// shows through it. Lumpy puffs are baked with vertex colours and merged into two meshes:
// `userData.part` is core (the dense, dark middle) or wisps (the thin, pale edges).
export function createPoisonCloud(seed=0){
 const g=new THREE.Group();g.name='Poison cloud';
 const materials=[],geometries=[];
 const rand=i=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const mat=o=>{const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,transparent:true,depthWrite:false,...o});materials.push(m);return m;};
 const parts={
  core:{material:mat({opacity:.62,emissive:0x2c4a08,emissiveIntensity:.5}),list:[],dark:.55},
  wisps:{material:mat({opacity:.34,emissive:0x4a6a10,emissiveIntensity:.4}),list:[],dark:1},
 };
 // A ragged puff: a sphere with its surface torn about by seeded noise, then squashed.
 const puff=(part,x,y,z,r,sy,i)=>{
  const geo=new THREE.SphereGeometry(1,10,7),p=geo.attributes.position;
  for(let v=0;v<p.count;v++){
   const k=.55+rand(i*131+v)*.9;
   p.setXYZ(v,x+p.getX(v)*r*k,y+p.getY(v)*r*sy*k,z+p.getZ(v)*r*k);
  }
  const flat=geo.toNonIndexed();geo.dispose();
  flat.deleteAttribute('uv');flat.computeVertexNormals();
  const q=flat.attributes.position,col=new Float32Array(q.count*3);
  for(let v=0;v<q.count;v++){
   // Yellow-green, bruised darker toward the bottom and the centre of the bank.
   const t=THREE.MathUtils.clamp(.45+q.getY(v)*.9,.2,1)*part.dark*(.85+rand(i*17+v)*.3);
   col[v*3]=.46*t;col[v*3+1]=.62*t;col[v*3+2]=.1*t;
  }
  flat.setAttribute('color',new THREE.BufferAttribute(col,3));
  part.list.push(flat);
 };
 for(let i=0;i<5;i++)puff(parts.core,(rand(i)-.5)*.44,.1+rand(i+9)*.1,(rand(i+5)-.5)*.44,.2+rand(i+3)*.08,.7,i);
 for(let i=0;i<5;i++)puff(parts.wisps,(rand(i+20)-.5)*.62,.22+rand(i+25)*.4,(rand(i+30)-.5)*.62,.09+rand(i+35)*.07,1.5,i+20);
 for(const [name,part] of Object.entries(parts)){
  const geo=mergeGeometries(part.list);part.list.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,part.material);mesh.userData.part=name;mesh.renderOrder=name==='core'?1:2;
  g.add(mesh);
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}
