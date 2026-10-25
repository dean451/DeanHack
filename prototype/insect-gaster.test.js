import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {gasterPose, raises, GASTER} from './insect-gaster.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';

const ANTS=['giant ant','soldier ant','snow ant','fire ant'];
const make=name=>{const a=createCreature({name,symbol:97,color:3});a.g.updateMatrixWorld(true);return a;};
const cm=v=>Math.hypot(...v)*100;
const PAWS=['paw:lf','paw:rf','paw:lm','paw:rm','paw:lh','paw:rh'];

test('ants raise the gaster; beetles, locusts and bees do not',()=>{
 assert(ANTS.every(n=>raises(make(n))));
 for(const n of ['giant beetle','locust','killer bee'])assert(!raises(make(n)),n);
});

test('the raised gaster meets every goal under 2 cm on every ant, inside the joint bounds',()=>{
 for(const name of ANTS){const r=gasterPose(make(name)),worst=Math.max(...r.residuals.map(cm));
  assert(worst<2,`${name}: worst goal ${worst.toFixed(2)} cm`);
  assert(Math.abs(r.pose.tail0.x)<=2.6,`${name}: tail0 in bounds`);}
});

test('raised: the sting over the back and forward of the rump, the six feet where they stood, the other joints still',()=>{
 for(const name of ANTS){const a=make(name),s=a.g.scale.x,{apply}=birdPoser(a),P0=rolesOf(a),feet0=PAWS.map(p=>P0[p]().clone()),
  r=gasterPose(a);apply(r.pose);const P=rolesOf(a);
  assert(P.tailtip().y>=P.withers().y+GASTER.lift*s-.02*s,`${name}: sting over the withers`);
  assert(P.tailtip().z>P.rump().z,`${name}: sting forward of the rump`);
  PAWS.forEach((p,i)=>assert(P[p]().distanceTo(feet0[i])<.01*s,`${name}: ${p} moved`));
  for(const n of Object.keys(r.pose))assert.equal(n,'tail0',`${name}: only the gaster moves (${n})`);}
});

test('the pose is easy to leave: solving leaves every joint exactly at the built values',()=>{
 for(const name of ANTS){const a=make(name),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  gasterPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${name} ${n}`);}
});
