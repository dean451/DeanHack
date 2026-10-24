import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const COLORS = Object.fromEntries(JSON.parse(readFileSync(new URL('./tools/creature-names.json', import.meta.url))).filter(m => m.letter === 'D').map(m => [m.name.toLowerCase(), m.color]));
const make = name => createCreature({name, symbol: 68, color: COLORS[name]});
const v = new THREE.Vector3();

// Every separate piece of a model (connected by its triangles and shared corners), in world space.
function pieces(a) {
  a.g.updateMatrixWorld(true); const out = [];
  a.g.traverse(o => {
    if (!o.isMesh) return; if (o.isSkinnedMesh) o.skeleton.update();
    const g = o.geometry, p = g.attributes.position, n = p.count, idx = g.index ? g.index.array : null, tri = idx ? idx.length : n;
    const parent = Int32Array.from({length: n}, (_, i) => i), find = i => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; }, join = (x, y) => { x = find(x); y = find(y); if (x !== y) parent[x] = y; };
    const at = new Map(); for (let i = 0; i < n; i++) { const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; if (at.has(k)) join(i, at.get(k)); else at.set(k, i); }
    for (let t = 0; t < tri; t += 3) { const A = idx ? idx[t] : t; join(A, idx ? idx[t + 1] : t + 1); join(A, idx ? idx[t + 2] : t + 2); }
    const wp = []; for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); wp.push(v.applyMatrix4(o.matrixWorld).clone()); }
    const by = new Map(); for (let i = 0; i < n; i++) { const r = find(i); if (!by.has(r)) by.set(r, {pts: [], tris: [], color: o.material.color?.getHexString()}); by.get(r).pts.push(wp[i]); }
    for (let t = 0; t < tri; t += 3) { const A = idx ? idx[t] : t; by.get(find(A)).tris.push(new THREE.Triangle(wp[A], wp[idx ? idx[t + 1] : t + 1], wp[idx ? idx[t + 2] : t + 2])); }
    for (const pc of by.values()) if (pc.pts.length > 1) out.push(pc);
  });
  return out;
}
// how far a piece is from every other piece's surface (stops early once it is near)
function gap(ps, i, near) {
  let best = Infinity; const q = new THREE.Vector3(), box = new THREE.Box3().setFromPoints(ps[i].pts).expandByScalar(near);
  // (both ways: a broad pad's corners can be far from a narrow toe that rests flat against its face)
  for (let j = 0; j < ps.length && best > near; j++) { if (j === i || !box.intersectsBox(new THREE.Box3().setFromPoints(ps[j].pts))) continue;
    for (const t of ps[j].tris) for (const p of ps[i].pts) { t.closestPointToPoint(p, q); best = Math.min(best, q.distanceTo(p)); }
    for (const t of ps[i].tris) for (const p of ps[j].pts) { t.closestPointToPoint(p, q); best = Math.min(best, q.distanceTo(p)); } }
  return best;
}

test('nothing floats off any dragon: every piece (ribs, plates, scars, bones, the lance, the dressing) sits within 1.5 cm of the body', () => {
  for (const name of Object.keys(COLORS)) {
    const ps = pieces(make(name)), loose = [];
    ps.forEach((pc, i) => { const d = gap(ps, i, .015); if (d > .015) { const c = pc.pts.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(pc.pts.length); loose.push(`${pc.color} ${(d * 100).toFixed(1)} cm at ${c.toArray().map(x => x.toFixed(2)).join(',')}`); } });
    assert.deepEqual(loose, [], `${name}: pieces off the body`);
  }
});

test('the wyvern\'s venom bead hangs from its stinger\'s point, not in the air past it', () => {
  const ps = pieces(make('wyvern')), bead = ps.findIndex(pc => pc.color === '7fd23a');
  assert(bead >= 0, 'the bead is there');
  const ivory = ps.map((pc, i) => [pc, i]).filter(([pc]) => pc.color === 'e6dcc0'), q = new THREE.Vector3();
  let best = Infinity; for (const [pc] of ivory) for (const t of pc.tris) for (const p of ps[bead].pts) { t.closestPointToPoint(p, q); best = Math.min(best, q.distanceTo(p)); }
  assert(best < .005, `the bead ${(best * 100).toFixed(1)} cm from the stinger`);
});
