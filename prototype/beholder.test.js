import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const E=101;// 'e'
function parts(actor){const meshes=[];actor.g.traverse(o=>{if(o.isMesh)meshes.push(o);});return meshes;}

test('the beholder is a fanged orb with a great eye and ten eyestalks in 4 shared draws, not the floating eye',()=>{
 const eye=parts(createCreature({name:'floating eye',symbol:E,color:4}));
 const actor=createCreature({name:'beholder',symbol:E,color:3}),meshes=parts(actor);
 assert.equal(actor.quirk,'hover');assert(actor.body);assert(actor.head);
 assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['eyeball','hide','iris','stalk eyes']);
 assert(meshes.length<eye.length,'fewer draws than the floating eye');
 assert.equal(new Set(meshes.map(m=>m.material)).size,3,'3 materials');
 for(const m of meshes)for(const key of ['position','normal','color']){
  const arr=m.geometry.attributes[key].array;for(const v of arr)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(key==='color')for(const v of arr)assert(v>=0&&v<=1);}
 const byPart=Object.fromEntries(meshes.map(m=>[m.userData.part,m]));
 // the great eye turns inside its lids about the eyeball's centre
 for(const p of ['eyeball','iris'])assert.equal(byPart[p].parent.parent,actor.head);
 for(const p of ['hide','stalk eyes'])assert.notEqual(byPart[p].parent.parent,actor.head);
 assert(byPart.iris.material.emissiveIntensity>0);
 actor.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(actor.g);
 assert(b.min.y>.3&&b.max.y<1.35,`height ${b.min.y}..${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.35,'too wide');
 // ten stalk eyes, all above the crown
 const s=byPart['stalk eyes'],sb=new THREE.Box3().setFromObject(s),hb=new THREE.Box3().setFromObject(byPart.hide);
 assert(sb.min.y>.62+.25,'stalk eyes above the body');assert(sb.max.y<=hb.max.y+.06);
 // from the front: the iris over the eye's centre, hide above it, and a dark maw with teeth below
 const rc=new THREE.Raycaster(),centre=actor.head.getWorldPosition(new THREE.Vector3());
 const hit=(x,y)=>{rc.set(new THREE.Vector3(x,y,2),new THREE.Vector3(0,0,-1));return rc.intersectObject(actor.g,true)[0];};
 assert.equal(hit(0,centre.y).object.userData.part,'iris');
 assert.equal(hit(0,centre.y+.12).object.userData.part,'hide');
 let dark=0,bright=0;
 for(let y=.5;y<.6;y+=.005)for(let x=-.08;x<=.08;x+=.005){const h=hit(x,y);if(h?.object.userData.part!=='hide')continue;
  const c=h.object.geometry.attributes.color,l=[h.face.a,h.face.b,h.face.c].map(i=>c.getX(i)+c.getY(i)+c.getZ(i));
  if(Math.max(...l)<.03)dark++;if(Math.max(...l)>1.2)bright++;}
 assert(dark>20,`maw ${dark}`);assert(bright>5,`teeth ${bright}`);
 // shared between instances
 assert.equal(parts(createCreature({name:'beholder'}))[0].geometry,meshes[0].geometry);
});
