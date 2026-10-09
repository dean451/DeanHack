import test from 'node:test';
import assert from 'node:assert/strict';
import {createGridBug} from './grid-bug.js';

test('grid bug shell is burnt through in glowing scorch pits',()=>{
 const a=createGridBug();
 let pits=0;a.g.traverse(o=>{if(o.name==='scorch-pit')pits++;});
 assert.equal(pits,3);
 assert.equal(a.quirk,'gridbug');
 a.g.userData.dispose();
});
