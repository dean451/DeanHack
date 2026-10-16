import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
const meshes=g=>{let n=0;g.traverse(o=>{if(o.isMesh)n++;});return n;};
test('a black light bristles with barbs the yellow light lacks, inside its tile',()=>{
 const y=createCreature({name:'yellow light',symbol:121,color:11}),b=createCreature({name:'black light',symbol:121,color:5});
 assert.ok(meshes(b.g)>=meshes(y.g)+7,'seven barbs');
 let far=0;b.g.updateMatrixWorld(true);b.g.traverse(o=>{if(o.isMesh){const p=o.getWorldPosition(o.position.clone());far=Math.max(far,Math.hypot(p.x,p.z));}});
 assert.ok(far<.5,'barbs stay near the core '+far);
});
