import * as THREE from 'three';

// Readability staging for creatures at gameplay zoom: an ink outline of constant screen
// width and a minimum on-screen size. There are no disposition rings on the floor any more (the
// user dropped the hostile red, then the pet green and the peaceful yellow, 2026-10-25): the
// disposition is still kept on the group (userData.disposition) for the minimap and overlays.

const outlineMaterial=new THREE.ShaderMaterial({
 uniforms:{color:{value:new THREE.Color(0x07090a)},width:{value:.0019},pushBack:{value:0}},
 // The skinning chunks are no-ops unless the renderer defines USE_SKINNING for a SkinnedMesh hull,
 // which then follows the same bones as the fur it outlines.
 vertexShader:`uniform float width;uniform float pushBack;
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

const MIN_SIZE=.72,MAX_FOOTPRINT=.98,MAX_SCALE=1.8;

// A flat-shaded mesh (a low-poly GLB like the fox) has a normal per face, so a hull pushed out
// along them splits at every edge into floating shards. `smoothNormals` gives the hull its own
// copy whose normals are averaged over every vertex at the same position, so it swells as one
// skin; the copy is made once per source geometry and shared by every clone of the model.
const smoothed=new WeakMap();
export function smoothNormals(geo){
 if(smoothed.has(geo))return smoothed.get(geo);
 // a model with no normals at all (the fox: three shades it flat) gets face normals first, then averaged
 const out=geo.clone();if(!out.attributes.normal)out.computeVertexNormals();
 const p=out.attributes.position,n=out.attributes.normal,sum=new Map(),key=i=>`${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
 for(let i=0;i<p.count;i++){const k=key(i),s=sum.get(k)||[0,0,0];s[0]+=n.getX(i);s[1]+=n.getY(i);s[2]+=n.getZ(i);sum.set(k,s);}
 for(let i=0;i<p.count;i++){const s=sum.get(key(i)),l=Math.hypot(...s)||1;n.setXYZ(i,s[0]/l,s[1]/l,s[2]/l);}
 n.needsUpdate=true;smoothed.set(geo,out);return out;
}

// Idempotent: meshes added later (a newly wielded weapon) can be outlined by calling again.
// `smooth` builds the hull from smoothed normals (smoothNormals): for imported, flat-shaded models.
export function addOutlines(g,{smooth=false}={}){
 g.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.outline||mesh.userData.ring||mesh.userData.hasOutline)return;
  const geo=mesh.geometry;mesh.userData.hasOutline=true;
  if(geo.type==='ShapeGeometry'||geo.type==='PlaneGeometry'||mesh.material.transparent||(!geo.attributes.normal&&!smooth))return;
  if(!geo.boundingBox)geo.computeBoundingBox();
  const dims=geo.boundingBox.getSize(new THREE.Vector3()).multiply(mesh.getWorldScale(new THREE.Vector3()));
  if(Math.min(dims.x,dims.y,dims.z)<.022)return;
  // A skinned mesh (the pet cat) gets a skinned hull on its own skeleton: a plain hull would sit
  // in the bind pose as a black cat under the animated one.
  const shell=smooth?smoothNormals(geo):geo;
  const hull=mesh.isSkinnedMesh?new THREE.SkinnedMesh(shell,skinnedOutlineMaterial):new THREE.Mesh(shell,outlineMaterial);
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
 return g;
}
