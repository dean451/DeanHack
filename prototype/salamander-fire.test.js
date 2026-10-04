import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createFlameFlicker} from './flame-flicker.js';

const flames=a=>{const out=[];a.g.traverse(o=>{if(o.isMesh&&o.userData.part==='flame')out.push(o);});return out;};

test('a salamander burns like a hell hound; other lizards do not',()=>{
 const sal=createCreature({name:'salamander',symbol:58,color:1});
 assert(flames(sal).length>=4,'flames along the spine, brow and tail');
 for(const name of ['newt','lizard','crocodile'])assert.equal(flames(createCreature({name,symbol:58,color:2})).length,0,name);
});

test('salamander flames flicker via flame-flicker, stay finite and restore exactly',()=>{
 const sal=createCreature({name:'salamander',symbol:58,color:1}),scene=new THREE.Scene();scene.add(sal.g);
 const fl=flames(sal),before=fl.map(f=>[f.position.toArray(),f.scale.toArray(),f.quaternion.toArray()]);
 const flicker=createFlameFlicker(scene);
 for(let t=0;t<4;t+=1/30){flicker.update(t);for(const f of fl)for(const v of [...f.position.toArray(),...f.scale.toArray()])assert(Number.isFinite(v));}
 flicker.restore();
 fl.forEach((f,i)=>{assert.deepEqual(f.position.toArray(),before[i][0]);assert.deepEqual(f.scale.toArray(),before[i][1]);});
 const box=new THREE.Box3().setFromObject(sal.g);assert(box.max.y<1.2&&box.min.y>-.01);
});
