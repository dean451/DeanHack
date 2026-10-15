import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const draws = a => { let n = 0; a.g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('long worm tail segments carry a ridge of spines and stay a low hump', () => {
  const a = createCreature({name: 'long worm tail', symbol: 126, color: 3});
  assert(a.g.userData.spined);
  assert(draws(a) <= 30, `${draws(a)} draws`);
  a.g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(a.g);
  assert(b.max.y < .55, `low (${b.max.y})`);
  assert(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) < .85, 'fits its tile');
});

test('long worm tail has a dull dark hide whatever colour the engine paints it, and its ridges sit on the surface', async () => {
  const {surfaceGap} = await import('./fit-check.js');
  for (const color of [undefined, 5, '#ff00ff']) {
    const a = createCreature({name: 'long worm tail', symbol: 126, color});
    const c = new THREE.Color(); a.g.userData.hide.color && c.copy(a.g.userData.hide.color);
    const hsl = {}; c.getHSL(hsl, THREE.SRGBColorSpace);
    assert(hsl.s < .4 && hsl.l < .3, `dull and dark (s ${hsl.s.toFixed(2)}, l ${hsl.l.toFixed(2)})`);
    const bands = a.g.userData.bands;
    assert(bands.length >= 4);
    for (const band of bands) assert(surfaceGap(band, a.g.userData.arch) < .03, 'band hugs the body');
  }
});
