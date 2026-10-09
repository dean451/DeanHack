import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test('lemure flesh has sloughed away to raw sores and bare rib bone',()=>{
 const a=createCreature({name:'lemure',symbol:105,color:1});
 assert.equal(a.quirk,'lemure');
 const body=a.body.children.find(o=>o.userData.part==='body');
 const col=body.geometry.attributes.color;
 const has=(r,g,b)=>{for(let i=0;i<col.count;i++)if(Math.abs(col.getX(i)-r)<.02&&Math.abs(col.getY(i)-g)<.02&&Math.abs(col.getZ(i)-b)<.02)return true;return false;};
 assert(has(.1411,.0116,.0075),'raw red sore colour present');
 assert(col.count>0);
});
