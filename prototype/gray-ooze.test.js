import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGrayOoze} from './gray-ooze.js';
import {createCreature} from './creatures.js';

const parts = a => { const out = {}; a.g.traverse(o => { if (o.isMesh) out[o.userData.part] = o; }); return out; };

test('the gray ooze is its own low rusting slick in four draws: mass, inside, crust, pool', () => {
  const a = createCreature({name: 'gray ooze', symbol: 80, color: 0});
  assert.equal(a.quirk, 'blob');
  const p = parts(a);
  assert.deepEqual(Object.keys(p).sort(), ['crust', 'inside', 'mass', 'pool']);
  assert.ok(p.mass.material.transparent && p.mass.material.clearcoat > .5, 'a wet translucent skin');
  assert.ok(!p.inside.material.transparent && !p.crust.material.transparent, 'the iron and the scabs are solid');
  assert.ok(!p.pool.castShadow && p.mass.castShadow);
  for (const m of Object.values(p)) assert.ok(m.geometry.attributes.color, `${m.userData.part} is vertex coloured`);
});

test('it is low and wide, sits on the floor, and keeps to its tile', () => {
  const a = createGrayOoze(); a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g, true), size = b.getSize(new THREE.Vector3());
  assert.ok(size.y < .4 && size.x > .9 && size.z > .8, `low and wide: ${size.toArray().map(v => v.toFixed(2))}`);
  assert.ok(b.min.y > -.01 && b.min.y < .01, 'on the floor');
  assert.ok(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < 1.1, 'fits its tile');
});

test('rust shows: the skin bleeds orange on one flank and the pool is stained, the crown stays grey', () => {
  const p = parts(createGrayOoze());
  const rusty = (geo, pick) => { const c = geo.attributes.color, pos = geo.attributes.position; let n = 0, t = 0; for (let i = 0; i < c.count; i++) { if (!pick(pos.getX(i), pos.getY(i), pos.getZ(i))) continue; t++; if (c.getX(i) > c.getZ(i) * 1.6 && c.getX(i) > .3) n++; } return [n, t]; };
  const [right, rt] = rusty(p.mass.geometry, x => x > .15), [left, lt] = rusty(p.mass.geometry, x => x < -.15);
  assert.ok(right / rt > .1, `rust on the +x flank: ${right}/${rt}`);
  assert.ok(left / lt < .02, `the far flank is grey: ${left}/${lt}`);
  const [stain, st] = rusty(p.pool.geometry, () => true);
  assert.ok(stain / st > .1, `a stained pool: ${stain}/${st}`);
});
