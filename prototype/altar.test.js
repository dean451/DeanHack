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
