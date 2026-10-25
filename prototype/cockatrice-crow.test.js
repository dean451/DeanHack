import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {crowPose, crows, CROW} from './cockatrice-crow.js';
import {birdPoser} from './cockatrice-rest.js';
import {rolesOf} from './body-roles.js';
import {FOWL} from './creature-measures.js';

const FAMILY=['chickatrice','cockatrice','pyrolisk'];
const make=name=>{const a=createCreature({name,symbol:99,color:11});a.g.updateMatrixWorld(true);return a;};
const cm=v=>Math.hypot(...v)*100;

test('the crow is as long as the measured crow',()=>{
 assert(CROW.seconds>=FOWL.crowSeconds[0]&&CROW.seconds<=FOWL.crowSeconds[1]);
});

test('every member crows, and the pose meets every goal under 2 cm',()=>{
 for(const name of FAMILY){const a=make(name);assert(crows(a),name);
  const worst=Math.max(...crowPose(a).residuals.map(cm));
  assert(worst<2,`${name}: worst goal ${worst.toFixed(2)} cm`);}
});

test('crowing: feet planted, beak and wings thrown up, wings out to their own sides, nothing through the floor',()=>{
 for(const name of FAMILY){const a=make(name),s=a.g.scale.x,floor=a.g.position.y,P0=rolesOf(a),feet=['paw:lf','paw:rf','paw:lh','paw:rh'].map(p=>P0[p]().clone()),built={wing:P0['wingtip:l']().y,mouth:P0.mouth().y};
  const r=crowPose(a);birdPoser(a).apply(r.pose);const P=rolesOf(a);
  feet.forEach((f,i)=>assert(P[['paw:lf','paw:rf','paw:lh','paw:rh'][i]]().distanceTo(f)<.02,`${name}: foot ${i} planted`));
  assert(P.mouth().y>P.withers().y+(CROW.beak-.02)*s,`${name}: beak up`);
  assert(P['wingtip:l']().y>P.withers().y&&P['wingtip:r']().y>P.withers().y,`${name}: wings up`);
  assert(P['wingtip:l']().x<P['hip:l']().x&&P['wingtip:r']().x>P['hip:r']().x,`${name}: wings stay out on their own sides`);
  assert(P['wingtip:l']().y>built.wing+.05*s&&P.mouth().y>built.mouth+.1*s,`${name}: lifted from the built pose`);
  assert(new THREE.Box3().setFromObject(a.g).min.y>floor-.012,`${name}: through the floor`);}
});

test('the pose is easy to leave: every joint and the body return exactly',()=>{
 for(const name of FAMILY){const a=make(name),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray();
  crowPose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${name} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);}
});
