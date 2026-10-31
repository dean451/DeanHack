import test from 'node:test';
import assert from 'node:assert/strict';
import {createBugbear} from './bugbear.js';
import {createHobbit} from './hobbit.js';
import {updateBugbearLurk, ambushFor, LURK} from './humanoid-lurk.js';
import {rolesOf} from './body-roles.js';

const make=()=>{const a=createBugbear();a.g.updateMatrixWorld(true);return a;};
const snap=a=>JSON.stringify([Object.values(a.joints).map(o=>o.rotation.toArray().slice(0,3)),a.body.position.toArray()]);
const run=(a,secs,busy=false,look=null,t0=0)=>{let p=0;const n=Math.round(secs*20);for(let i=0;i<n;i++)p=updateBugbearLurk(a,.05,t0+i*.05,busy,look);return p;};
const heroAt=(a,d)=>({x:a.g.position.x+d,z:a.g.position.z});

test('a hero in range but not upon it sets the bugbear in its crouch; a far one does not',()=>{
 const a=make(),built=snap(a);
 assert.equal(run(a,3,false,heroAt(a,LURK.RANGE+2)),0);assert.equal(snap(a),built,'untouched');
 const stand=rolesOf(a).rump().y;
 assert.equal(run(a,LURK.DROP+.5,false,heroAt(a,4)),1);
 a.g.updateMatrixWorld(true);
 assert(rolesOf(a).rump().y<stand-.06,'pelvis sunk');
});

test('held, the chest breathes within the set amount',()=>{
 const a=make(),look=heroAt(a,4),xs=[];
 run(a,LURK.DROP+.5,false,look);
 for(let i=0;i<80;i++){updateBugbearLurk(a,.05,10+i*.05,false,look);xs.push(a.joints.spine1.rotation.x);}
 const span=Math.max(...xs)-Math.min(...xs);
 assert(span>LURK.BREATH&&span<=2*LURK.BREATH+1e-9,`span ${span}`);
});

test('the hero coming within reach springs it up faster than it rises, and returns every joint exactly',()=>{
 const a=make(),built=snap(a);
 run(a,LURK.DROP+.5,false,heroAt(a,4));assert.notEqual(snap(a),built);
 run(a,LURK.SPRING+.1,false,heroAt(a,LURK.POUNCE-.5));
 assert.equal(updateBugbearLurk(a,0,0,false,heroAt(a,LURK.POUNCE-.5)),0);assert.equal(snap(a),built,'sprung up exactly');
 assert(LURK.SPRING<LURK.RISE&&LURK.RISE<LURK.DROP*2);
});

test('the hero leaving, or the bugbear moving, rises it and returns every joint exactly, also mid-drop',()=>{
 const a=make(),built=snap(a);
 run(a,LURK.DROP+.5,false,heroAt(a,4));
 assert.equal(run(a,LURK.RISE+.5,false,heroAt(a,LURK.RANGE+3)),0);assert.equal(snap(a),built);
 run(a,LURK.DROP+.5,false,heroAt(a,4));
 assert.equal(run(a,LURK.RISE+.5,true,heroAt(a,4)),0);assert.equal(snap(a),built);
 run(a,LURK.DROP/2,false,heroAt(a,4));assert.notEqual(snap(a),built);
 run(a,LURK.RISE+.5,false,null);assert.equal(snap(a),built);
});

test('never while acting, and the pose is solved once per kind',()=>{
 const a=make(),built=snap(a);
 assert.equal(run(a,3,true,heroAt(a,4)),0);assert.equal(snap(a),built);
 assert.equal(ambushFor(a),ambushFor(make()));
});

test('hobbits and other creatures are left alone',()=>{
 const h=createHobbit();assert.equal(updateBugbearLurk(h,1,0,false,{x:0,z:0}),0);assert.equal(h.bugbearLurk,undefined);
});
