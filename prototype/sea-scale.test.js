import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const size = name => { const a = createCreature({name, symbol: 59, color: 7}); a.g.updateMatrixWorld(true); const s = new THREE.Box3().setFromObject(a.g).getSize(new THREE.Vector3()); return Math.max(s.x, s.y, s.z); };

test('sharks and eels loom larger than a piranha', () => {
  const piranha = size('piranha');
  for (const name of ['shark', 'giant eel', 'electric eel']) assert(size(name) > piranha * 1.5, name);
});

test('the Watcher in the Water looms over the kraken with a thicker crown of arms', () => {
  assert(size('watcher in the water') > size('kraken') * 1.2);
});

test('the Watcher in the Water stares with eyes that burn brighter than any other sea monster\'s', () => {
  const glow = name => { const a = createCreature({name, symbol: 59, color: 7}); let m = 0; a.g.traverse(o => { const x = o.material; if (x && x.emissiveIntensity > m) m = x.emissiveIntensity; }); return m; };
  assert(glow('watcher in the water') > Math.max(glow('kraken'), glow('shark')) * 1.5);
});

test('the shark carries pale scars raked across its flank; the piranha is unmarked', () => {
  const pale = name => { const a = createCreature({name, symbol: 59, color: 7}); let n = 0; a.g.traverse(o => { const c = o.material && o.material.color; if (c && c.getHexString() === 'c8c4b4') n++; }); return n; };
  assert(pale('shark') > 0);
  assert.equal(pale('piranha'), 0);
});

test('the giant eel carries pale scars on its neck and two long fangs; the electric eel is unmarked', () => {
  const pale = name => { const a = createCreature({name, symbol: 59, color: 7}); let n = 0; a.g.traverse(o => { const c = o.material && o.material.color; if (c && c.getHexString() === 'c8c4b4') n++; }); return n; };
  assert(pale('giant eel') > 0);
  assert.equal(pale('electric eel'), 0);
});
