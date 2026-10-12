import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {rgb} from './homunculus.js';

const bodyOf=a=>{let b=null;a.g.traverse(m=>{if(m.isMesh&&m.userData.part==='body')b=m;});return b.geometry;};
const painted=(geo,hex)=>{const [r,g,b]=rgb(hex),c=geo.attributes.color;let n=0;for(let i=0;i<c.count;i++)if(Math.abs(c.getX(i)-r)<.01&&Math.abs(c.getY(i)-g)<.01&&Math.abs(c.getZ(i)-b)<.01)n++;return n;};

test('the baluchitherium carries a gash of three crusted furrows down its right flank',()=>{
 const b=createCreature({name:'baluchitherium',symbol:113,color:7});
 assert(painted(bodyOf(b),'#4a1812')>=72,'three raked furrows');
});
