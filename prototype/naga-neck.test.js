import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

// The naga's neck in the coil's own section (review finding 2026-11-18: at rest the neck laid over the coil read as a
// smooth, swollen eight-sided tube fatter than the coil). Measured on the built geometry, ring by ring: each ring's
// radius around its centre, so a faceted, notched section varies around the ring and a round tube does not.
const NAMES = ['red', 'black', 'golden', 'guardian', 'white'].flatMap(k => [`${k} naga`, `${k} naga hatchling`]);
const part = (a, name) => { let m = null; a.g.traverse(o => { if (o.isMesh && o.userData.part === name) m = o; }); return m; };
// rings of a tube: `sides` + 1 vertices each (the last repeats the first); per ring its widest radius and its
// spread around the ring relative to its mean radius
function rings(geo, sides) {
  const pos = geo.attributes.position, R = sides + 1, out = [], v = new THREE.Vector3();
  for (let i = 0; i < pos.count / R; i++) {
    const c = new THREE.Vector3();
    for (let j = 0; j < sides; j++) c.add(v.fromBufferAttribute(pos, i * R + j));
    c.divideScalar(sides);
    const d = Array.from({length: sides}, (_, j) => v.fromBufferAttribute(pos, i * R + j).distanceTo(c));
    const mean = d.reduce((s, x) => s + x, 0) / sides;
    out.push({max: Math.max(...d), spread: (Math.max(...d) - Math.min(...d)) / mean});
  }
  return out;
}
const sidesOf = geo => geo.parameters?.radialSegments ?? 6;
const avg = xs => xs.reduce((s, x) => s + x, 0) / xs.length;

test('the neck has the coil\'s section: its middle rings vary around the ring as much as the coil\'s, and no ring of it is wider than the coil\'s widest', () => {
  for (const name of NAMES) {
    const a = createCreature({name, symbol: 78}), neck = part(a, 'neck'), coil = part(a, 'coil');
    assert.ok(neck && coil, `${name}: neck and coil`);
    assert.equal(neck.scale.x, coil.scale.x, `${name}: measured in the same scale`);
    const N = rings(neck.geometry, sidesOf(neck.geometry)), K = rings(coil.geometry, sidesOf(coil.geometry));
    const mid = (r, a0, a1) => r.slice(Math.floor(r.length * a0), Math.ceil(r.length * a1));
    const nSpread = avg(mid(N, .25, .75).map(r => r.spread)), kSpread = avg(mid(K, .25, .75).map(r => r.spread));
    assert.ok(Math.min(...mid(N, .25, .75).map(r => r.spread)) > .1, `${name}: every middle ring of the neck is faceted`);
    assert.ok(nSpread >= kSpread, `${name}: the neck's middle rings vary ${nSpread.toFixed(3)} around the ring, the coil's ${kSpread.toFixed(3)}`);
    const nWide = Math.max(...N.map(r => r.max)), kWide = Math.max(...K.map(r => r.max));
    assert.ok(nWide <= kWide, `${name}: the neck's widest ring ${(nWide * 100).toFixed(2)} cm, the coil's ${(kWide * 100).toFixed(2)} cm`);
    // where the neck leaves the coil it is no thicker than the coil's last turn under it
    assert.ok(N[0].max <= Math.max(...K.slice(-6).map(r => r.max)) + 1e-6, `${name}: the neck no thicker than the coil where they meet`);
    // flat-shaded like the coil, so the facets catch the light
    assert.ok(neck.material.flatShading, `${name}: the neck is flat-shaded`);
  }
});
