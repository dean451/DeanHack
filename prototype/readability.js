import * as THREE from 'three';
import {RING_DASHES,ringArcs} from './ring-shape.js';

// Readability staging for creatures at gameplay zoom: an ink outline of constant screen
// width, a disposition ring on the floor, and a minimum on-screen size.

const outlineMaterial=new THREE.ShaderMaterial({
 uniforms:{color:{value:new THREE.Color(0x07090a)},width:{value:.0019},pushBack:{value:0}},
 // The skinning chunks are no-ops unless the renderer defines USE_SKINNING for a SkinnedMesh hull,
 // which then follows the same bones as the fur it outlines.
 vertexShader:`uniform float width;
#include <skinning_pars_vertex>
void main(){vec3 objectNormal=vec3(normal);vec3 transformed=vec3(position);
#include <skinbase_vertex>
#include <skinnormal_vertex>
#include <skinning_vertex>
vec4 mv=modelViewMatrix*vec4(transformed,1.);vec3 n=normalize(normalMatrix*objectNormal);float d=width*-mv.z;mv.xyz+=n*d;mv.z-=d*pushBack;gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`uniform vec3 color;void main(){gl_FragColor=vec4(color,1.);}`,
 side:THREE.BackSide,
});
// A skinned body is one mesh of overlapping parts: its hull is pushed back by the ink width as well, so
// the hull only shows past the true silhouette and the seams where parts overlap draw no ink rings.
const skinnedOutlineMaterial=outlineMaterial.clone();skinnedOutlineMaterial.uniforms.pushBack.value=1;

function ringMaterial(color,dashes){
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
 // a stroked ring (solid or dashed) with a soft halo, so the shape survives without colour
 ctx.lineCap='butt';
 for(const [w,a] of [[14,.35],[7,.95]]){
  ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.lineWidth=w;
  for(const [s,e] of ringArcs(dashes)){ctx.beginPath();ctx.arc(64,64,48,s,e);ctx.stroke();}
 }
 const texture=new THREE.CanvasTexture(c);
 return new THREE.MeshBasicMaterial({map:texture,color,transparent:true,depthWrite:false,toneMapped:false,opacity:.85});
}
// Hostile monsters get no ring: most monsters are enemies and the ring states the obvious.
const RINGS={pet:ringMaterial(0x4fe08a,RING_DASHES.pet),peaceful:ringMaterial(0xe8c860,RING_DASHES.peaceful)};
const ringGeo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);

const MIN_SIZE=.72,MAX_FOOTPRINT=.98,MAX_SCALE=1.8;

// Idempotent: meshes added later (a newly wielded weapon) can be outlined by calling again.
export function addOutlines(g){
 g.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.outline||mesh.userData.ring||mesh.userData.hasOutline)return;
  const geo=mesh.geometry;mesh.userData.hasOutline=true;
  if(geo.type==='ShapeGeometry'||geo.type==='PlaneGeometry'||mesh.material.transparent||!geo.attributes.normal)return;
  if(!geo.boundingBox)geo.computeBoundingBox();
  const dims=geo.boundingBox.getSize(new THREE.Vector3()).multiply(mesh.getWorldScale(new THREE.Vector3()));
  if(Math.min(dims.x,dims.y,dims.z)<.022)return;
  // A skinned mesh (the pet cat) gets a skinned hull on its own skeleton: a plain hull would sit
  // in the bind pose as a black cat under the animated one.
  const hull=mesh.isSkinnedMesh?new THREE.SkinnedMesh(geo,skinnedOutlineMaterial):new THREE.Mesh(geo,outlineMaterial);
  if(mesh.isSkinnedMesh){hull.bindMode=mesh.bindMode;hull.bind(mesh.skeleton,mesh.bindMatrix);}
  hull.castShadow=hull.receiveShadow=false;hull.userData.outline=true;mesh.add(hull);
 });
 return g;
}

export function stageCreature(g,{disposition=null,normalize=true}={}){
 g.updateMatrixWorld(true);
 const box=new THREE.Box3(),inverse=g.matrixWorld.clone().invert(),local=new THREE.Box3();
 g.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.outline)return;
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  local.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);box.union(local);
 });
 if(box.isEmpty())return addOutlines(g);
 const gs=g.scale.x,world=box.getSize(new THREE.Vector3()).multiplyScalar(gs);
 if(normalize){
  const footprint=Math.max(world.x,world.z),current=Math.max(world.y,footprint);
  let s=Math.min(MAX_SCALE,Math.max(1,MIN_SIZE/current));
  s=Math.min(s,Math.max(1,MAX_FOOTPRINT/footprint));
  if(s>1.001){for(const child of g.children){child.scale.multiplyScalar(s);child.position.multiplyScalar(s);}box.min.multiplyScalar(s);box.max.multiplyScalar(s);world.multiplyScalar(s);g.updateMatrixWorld(true);}
 }
 g.userData.height=world.y;
 addOutlines(g);
 if(disposition)g.userData.disposition=disposition;
 if(disposition&&RINGS[disposition]){
  const ring=new THREE.Mesh(ringGeo,RINGS[disposition]);const d=Math.min(1,Math.max(.62,Math.max(world.x,world.z)*1.15));
  ring.scale.set(d/gs,1,d/gs);ring.position.set((box.min.x+box.max.x)/2,.02/gs,(box.min.z+box.max.z)/2);ring.renderOrder=-1;ring.userData.ring=true;g.add(ring);
 }
 return g;
}
