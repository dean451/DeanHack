import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAltar} from './altar.js';

test('the altar is finite, stays in its tile, merges static parts per material and keeps its flames',()=>{
 const altar=createAltar();
 altar.updateMatrixWorld(true);
 const statics=altar.children.filter(o=>o.isMesh);
 assert(statics.length<=5,`${statics.length} static meshes`);
 assert.deepEqual(new Set(statics.map(o=>o.material)).size,statics.length,'one mesh per material');
 for(const part of ['stone','brass','cloth','wax','coals'])assert(statics.some(o=>o.userData.part===part),`missing ${part}`);
 const stone=statics.find(o=>o.userData.part==='stone');
 assert(stone.geometry.attributes.color,'the stone has baked weathering');
 for(const o of statics)for(const key of ['position','normal'])for(const x of o.geometry.attributes[key].array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
 assert.equal(altar.userData.flames.length,4);
 for(const f of altar.userData.flames)assert.equal(typeof f.userData.updateFire,'function');
 const bounds=new THREE.Box3();for(const o of statics)bounds.expandByObject(o);
 assert(bounds.min.y>=-.005,`sinks to ${bounds.min.y}`);
 assert(bounds.max.y>.8&&bounds.max.y<1,`top at ${bounds.max.y}`);
 for(const k of ['x','z'])assert(bounds.min[k]>=-.5&&bounds.max[k]<=.5,`leaves its tile on ${k}`);
 let disposed=0;for(const o of statics)o.geometry.addEventListener('dispose',()=>disposed++);
 altar.userData.dispose();assert.equal(disposed,statics.length);
});

// The throne shares the altar's dais conventions, so it is tested alongside it.
test('the throne is finite, stays in its tile and merges into one mesh per material',async()=>{
 const {createThrone}=await import('./throne.js');
 const throne=createThrone();
 throne.updateMatrixWorld(true);
 const meshes=throne.children.filter(o=>o.isMesh);
 assert.equal(meshes.length,throne.children.length,'nothing but merged meshes');
 assert(meshes.length<=6,`${meshes.length} meshes`);
 assert.equal(new Set(meshes.map(o=>o.material)).size,meshes.length,'one mesh per material');
 for(const part of ['stone','gold','velvet','carpet','jewel','ruby'])assert(meshes.some(o=>o.userData.part===part),`missing ${part}`);
 for(const part of ['stone','gold','velvet','carpet'])assert(meshes.find(o=>o.userData.part===part).geometry.attributes.color,`${part} has baked colours`);
 for(const o of meshes)for(const [key,attr] of Object.entries(o.geometry.attributes))for(const x of attr.array)assert(Number.isFinite(x),`${o.userData.part} ${key} is not finite`);
 const bounds=new THREE.Box3();for(const o of meshes)bounds.expandByObject(o);
 assert(bounds.min.y>=-.005,`sinks to ${bounds.min.y}`);
 assert(bounds.max.y>1.1&&bounds.max.y<1.4,`top at ${bounds.max.y}`);
 for(const k of ['x','z'])assert(bounds.min[k]>=-.5&&bounds.max[k]<=.5,`leaves its tile on ${k}`);
 let disposed=0;for(const o of meshes)o.geometry.addEventListener('dispose',()=>disposed++);
 throne.userData.dispose();assert.equal(disposed,meshes.length);
});

test('the throne is sinister: horned skull finials with embers, bones on the tread, a fan of blades over the crest',async()=>{
 const {createThrone}=await import('./throne.js');
 const throne=createThrone(),by=part=>throne.children.find(o=>o.userData.part===part).geometry.attributes;
 const stone=by('stone');let bone=0,ember=0,tread=0,finial=0;
 for(let i=0;i<stone.position.count;i++){
  const r=stone.color.getX(i),g=stone.color.getY(i),b=stone.color.getZ(i),y=stone.position.getY(i),z=stone.position.getZ(i);
  if(r>.5&&g>.42&&b>.3&&b<g)bone++;
  if(r>.8&&g<.3&&b<.1)ember++;
  if(r>.5&&b>.3&&y>.06&&y<.14&&z>.26)tread++;
  if(r>.5&&b>.3&&y>1.05)finial++;
 }
 assert(bone>2000,`${bone} bone vertices`);
 assert(ember>0,'embers in the sockets');
 assert(tread>800,`${tread} bone vertices on the tread`);
 assert(finial>400,`${finial} bone vertices on the column tops`);
 const gold=by('gold').position;let blades=0;for(let i=0;i<gold.count;i++)if(gold.getY(i)>1.27)blades++;
 assert(blades>=5,`${blades} gold vertices above the crest`);
 throne.userData.dispose();
});
