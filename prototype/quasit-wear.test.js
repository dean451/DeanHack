import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {rgb} from './homunculus.js';

const bodyOf=a=>{let b=null;a.g.traverse(m=>{if(m.isMesh&&m.userData.part==='body')b=m;});return b.geometry;};
const painted=(geo,hex)=>{const [r,g,b]=rgb(hex),c=geo.attributes.color;let n=0;for(let i=0;i<c.count;i++)if(Math.abs(c.getX(i)-r)<.01&&Math.abs(c.getY(i)-g)<.01&&Math.abs(c.getZ(i)-b)<.01)n++;return n;};

test('the quasit carries three crusted claw wounds across its belly',()=>{
 const q=createCreature({name:'quasit',symbol:105,color:4});
 assert(painted(bodyOf(q),'#4a1218')>=72,'three raked wounds');
});
