import test from 'node:test';
import assert from 'node:assert/strict';
import {DWARVES,createDwarf} from './dwarf.js';
import {createHobbit} from './hobbit.js';
import {updateDwarfGuard, braceFor, GUARD, DROP, RISE, SHIFT} from './humanoid-guard.js';
import {rolesOf} from './body-roles.js';

const make=n=>{const a=createDwarf(n);a.g.updateMatrixWorld(true);return a;};
const snap=a=>JSON.stringify([Object.values(a.joints).map(o=>o.rotation.toArray().slice(0,3)),a.body.position.toArray()]);
const run=(a,secs,busy=false,look=null,t0=0)=>{let p=0;const n=Math.round(secs*20);for(let i=0;i<n;i++)p=updateDwarfGuard(a,.05,t0+i*.05,busy,look);return p;};
const heroAt=(a,d)=>({x:a.g.position.x+d,z:a.g.position.z});

test('a hero close by sets the dwarf in its brace; a far one does not',()=>{
 const a=make(DWARVES[0]),built=snap(a);
 assert.equal(run(a,3,false,heroAt(a,GUARD+2)),0);assert.equal(snap(a),built,'untouched');
 const stand=rolesOf(a).rump().y;
 assert.equal(run(a,DROP+.5,false,heroAt(a,GUARD-1)),1);
 a.g.updateMatrixWorld(true);
 assert(rolesOf(a).rump().y<stand-.05,'pelvis sunk');
});

test('held, the chest rolls within the set amount',()=>{
 const a=make(DWARVES[0]),look=heroAt(a,1),zs=[];
 run(a,DROP+.5,false,look);
 for(let i=0;i<60;i++){updateDwarfGuard(a,.05,10+i*.05,false,look);zs.push(a.joints.spine0.rotation.z);}
 assert(Math.max(...zs)-Math.min(...zs)>SHIFT,'moves');
 assert(Math.max(...zs)-Math.min(...zs)<=2*SHIFT+1e-9,'but only a little');
});

test('never while moving or acting',()=>{
 const a=make(DWARVES[0]),built=snap(a);
 assert.equal(run(a,3,true,heroAt(a,1)),0);assert.equal(snap(a),built);
});

test('the hero leaving, or the dwarf moving, straightens it and returns every joint exactly',()=>{
 for(const n of DWARVES){const a=make(n),built=snap(a);
  run(a,DROP+1,false,heroAt(a,1));assert.notEqual(snap(a),built,n);
  assert.equal(run(a,RISE+.5,false,heroAt(a,GUARD+3)),0,n);assert.equal(snap(a),built,`${n}: back exactly`);
  run(a,DROP+1,false,heroAt(a,1));
  assert.equal(run(a,RISE+.5,true,heroAt(a,1)),0,n);assert.equal(snap(a),built,`${n}: back exactly when it moves`);}
});

test('half-braced also returns exactly, and the pose is solved once per kind',()=>{
 const a=make(DWARVES[1]),built=snap(a);
 run(a,DROP/2,false,heroAt(a,1));const mid=updateDwarfGuard(a,0,0,false,heroAt(a,1));assert(mid>0&&mid<1);
 run(a,RISE+.5,false,null);assert.equal(snap(a),built);
 assert.equal(braceFor(a),braceFor(make(DWARVES[1])));
});

test('hobbits and other creatures are left alone',()=>{
 const h=createHobbit();assert.equal(updateDwarfGuard(h,1,0,false,{x:0,z:0}),0);assert.equal(h.dwarfGuard,undefined);
});
