import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GNOMES,createGnome} from './gnome.js';
import {createGoblin} from './goblin.js';
import {waddlePose,waddlePoser,waddles,WADDLE,lineTurn,lineTip} from './gnome-waddle.js';
import {rolesOf} from './body-roles.js';
import {MEASURES} from './creature-measures.js';

// Stage 4 of the creature plan for gnomes (family G), step 2: the signature, the waddle caught at its widest stride.
const FAMILY=GNOMES.map(n=>[n,()=>createGnome(n)]);
const make=([,build])=>{const a=build();a.g.updateMatrixWorld(true);return a;};
const lowest=a=>{let y=Infinity;const v=new THREE.Vector3();a.g.updateMatrixWorld(true);
 a.g.traverse(m=>{if(!m.isMesh)return;if(m.isSkinnedMesh)m.skeleton.update();const p=m.geometry.attributes.position;
  for(let i=0;i<p.count;i++){(m.isSkinnedMesh?m.getVertexPosition(i,v):v.fromBufferAttribute(p,i)).applyMatrix4(m.matrixWorld);y=Math.min(y,v.y);}});return y;};
const solved=new Map(),stride=f=>{if(!solved.has(f[0]))solved.set(f[0],waddlePose(make(f)));return solved.get(f[0]);};

test('every gnome waddles; a goblin and nothing do not',()=>{
 for(const f of FAMILY)assert(waddles(make(f)),f[0]);
 assert(!waddles(createGoblin('goblin'))&&!waddles(null));
});

test('the turn is the measured adult swing, halved: about 14 degrees each way',()=>{
 assert(Math.abs(WADDLE.turn-MEASURES.gnome.pelvisRotationAdult/2)<1e-9);
 assert(Math.abs(WADDLE.tip-MEASURES.gnome.pelvisObliquity.short/2)<1e-9,'the side tip is no more than a person\'s');
 assert(WADDLE.turn>MEASURES.gnome.pelvisRotation.control/2+5,'well past a person\'s swing');
});

test('the waddle meets every goal under 2 cm on every gnome',()=>{
 for(const f of FAMILY){const worst=Math.max(...stride(f).residuals.flat().map(v=>Math.abs(v)*100));
  assert(worst<2,`${f[0]}: worst goal ${worst.toFixed(2)} cm`);}
});

test('the stride: pelvis swung, shoulders square, boots split on the floor, arms swung against the legs, head up',()=>{
 for(const f of FAMILY){const a=make(f),floor=a.g.position.y,r=stride(f),P=rolesOf(a);
  waddlePoser(a).apply(r.pose);
  const turn=lineTurn(P['hip:l'](),P['hip:r']());
  assert(turn>WADDLE.turn-WADDLE.slack-.5&&turn<WADDLE.turn+WADDLE.slack+.5,`${f[0]}: pelvis turned ${turn.toFixed(1)} degrees`);
  assert(Math.abs(lineTurn(P['shoulder:l'](),P['shoulder:r']()))<WADDLE.square+.5,`${f[0]}: shoulders square`);
  assert(lineTip(P['hip:l'](),P['hip:r']())<=WADDLE.tip+.1,`${f[0]}: hip line level`);
  for(const s of ['l','r'])assert(Math.abs(P[`paw:${s}h`]().y-floor)<.01,`${f[0]}: ${s} boot on the floor`);
  const split=P['paw:lh']().z-P['paw:rh']().z;
  assert(split>(2*WADDLE.step-.1)*r.stand,`${f[0]}: boots split ${(split/r.stand).toFixed(2)} of the hip height`);
  assert(P['paw:lh']().z>P.rump().z&&P['paw:rh']().z<P.rump().z,`${f[0]}: left boot ahead, right behind`);
  assert(P['paw:lh']().x<P['paw:rh']().x,`${f[0]}: the legs do not cross`);
  assert(P['paw:rf']().z>P.withers().z+(WADDLE.swing-.06)*r.stand,`${f[0]}: weapon hand thrown ahead`);
  assert(P['paw:lf']().z<P.rump().z-(WADDLE.swing-.06)*r.stand,`${f[0]}: other hand swung back`);
  assert(P.mouth().y-floor>=WADDLE.head*r.mouth-.02,`${f[0]}: head carried up`);}
});

test('a knee and an elbow bend only their own way',()=>{
 for(const f of FAMILY){const p=stride(f).pose;
  for(const s of ['l','r']){assert((p[`${s}leg1_1`]?.x??0)>=0,`${f[0]} ${s} knee`);assert((p[`${s}fore_1`]?.x??0)<=0,`${f[0]} ${s} elbow`);}}
});

test('nothing through the floor or the trunk: every vertex of every mesh, hands outside the body',()=>{
 for(const f of FAMILY){const a=make(f),floor=a.g.position.y,standing=lowest(a),P=rolesOf(a);
  const side=s=>Math.abs(a.body.worldToLocal(P[`paw:${s}f`]()).x),before={l:side('l'),r:side('r')};
  waddlePoser(a).apply(stride(f).pose);
  const low=lowest(a);
  assert(low>Math.min(standing,floor)-.003,`${f[0]}: lowest ${((low-floor)*100).toFixed(1)} cm, standing ${((standing-floor)*100).toFixed(1)} cm`);
  for(const s of ['l','r'])assert(side(s)>.8*before[s],`${f[0]}: ${s} hand kept out from the trunk`);
  a.g.updateMatrixWorld(true);
  assert(new THREE.Box3().setFromObject(a.hat,true).min.y>P.withers().y,`${f[0]}: cap above the withers`);}
});

test('posing nothing returns every joint and the body exactly to the built values',()=>{
 for(const f of FAMILY){const a=make(f),built={};
  for(const [n,o] of Object.entries(a.joints))built[n]=o.rotation.toArray().slice(0,3);
  const body=a.body.position.toArray(),turn=a.body.rotation.toArray().slice(0,3);
  waddlePose(a);
  for(const [n,o] of Object.entries(a.joints))assert.deepEqual(o.rotation.toArray().slice(0,3),built[n],`${f[0]} ${n}`);
  assert.deepEqual(a.body.position.toArray(),body);
  assert.deepEqual(a.body.rotation.toArray().slice(0,3),turn);}
});
