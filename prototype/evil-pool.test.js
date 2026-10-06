import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {hideDeathRing,restoreFade} from './deaths.js';

const pools=a=>{const out=[];a.g.traverse(o=>{if(o.isMesh&&o.userData.ring&&o.material.name==='evil-glow')out.push(o);});return out;};

test('the evil floor pool is dim, small and counts as a ring, not part of the body',()=>{
 for(const name of ['balrog','asmodeus','nazgul','vampire lord','demilich']){
  const a=createCreature({name,symbol:38,color:1}),p=pools(a);
  assert.equal(p.length,1,name+' has one floor pool');
  assert(p[0].material.opacity<=.18,name+' pool is dim: '+p[0].material.opacity);
  assert(p[0].geometry.parameters.radiusTop<=.4,name+' pool is small');
 }
});

test('the pool is hidden when the demon dies, so it never topples, and returns on restore',()=>{
 const a=createCreature({name:'balrog',symbol:38,color:1}),p=pools(a)[0];
 assert.equal(p.visible,true);
 hideDeathRing(a);
 assert.equal(p.visible,false);
 restoreFade(a);
 assert.equal(p.visible,true);
});
