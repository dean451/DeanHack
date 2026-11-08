import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {chargePose, charges, CHARGE} from './quadruped-charge.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

// Stage 4 of the creature plan for the heavy quadrupeds (family q), step 2: the thrown head.
const FAMILY=['rothe','mumak','mastodon','titanothere','baluchitherium','leocrotta','wumpus'];
const PAWS=['paw:lf','paw:rf','paw:lh','paw:rh'];
const make=name=>{const a=createCreature({name,symbol:113,color:7});a.g.updateMatrixWorld(true);return a;};

test('the seven heavy quadrupeds throw the head up; nothing else does',()=>{
 for(const n of FAMILY)assert(charges(make(n)),n);
 assert(!charges(null)&&!charges(make('newt')));
});

test('the thrown head meets every goal under 2 cm on all seven, inside the joint bounds',()=>{
 for(const n of FAMILY){const r=chargePose(make(n)),worst=Math.max(...r.residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${n}: worst goal ${worst.toFixed(2)} cm`);
  assert(r.pose['neck0']&&Math.abs(r.pose.neck0.x)<=CHARGE.bound,`${n}: neck in bounds`);}
});

test('thrown: mouth moved and ahead of the withers, the four feet where they stood, only the neck moves',()=>{
 for(const n of FAMILY){const a=make(n),floor=a.g.position.y,{apply}=birdPoser(a),P0=rolesOf(a),feet=PAWS.map(p=>P0[p]().clone()),
  stand=P0.mouth().y-floor,r=chargePose(a);apply(r.pose);const P=rolesOf(a);
  assert(Math.abs(P.mouth().y-floor-stand)>=CHARGE.change*stand-.01,`${n}: mouth moved ${(Math.abs(P.mouth().y-floor-stand)*100).toFixed(0)} cm of ${(stand*100).toFixed(0)}`);
  assert(P.mouth().z>=P.withers().z+CHARGE.forward*r.high-.02,`${n}: mouth ahead of the withers`);
  PAWS.forEach((p,i)=>assert(P[p]().distanceTo(feet[i])<.01*a.g.scale.x+.005,`${n}: ${p} moved`));
  for(const k of Object.keys(r.pose))assert.equal(k,'neck0',`${n}: only the neck moves (${k})`);}
});

test('the pose is easy to leave: solving returns every joint exactly to the built values',()=>{
 for(const n of FAMILY){const a=make(n),built={};
  for(const [k,o] of Object.entries(a.joints))built[k]=o.rotation.toArray().slice(0,3);
  chargePose(a);
  for(const [k,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[k],`${n} ${k}`);}
});
