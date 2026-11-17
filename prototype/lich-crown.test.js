// Review finding 2026-11-17: the master lich's bone crown and the arch-lich's gold crown sat on the skull, inside the
// faceted cowl (lich-hood.js), so the band's sides vanished into its walls and the points stabbed out through it. The
// crowns are now worn over the cowl (lichCrown): no crown piece may have vertices on both sides of the cowl's shell,
// nor any edge crossing it, standing or in the baked stoop.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {cowlAt} from './lich-hood.js';
import {birdPoser} from './cockatrice-rest.js';
import {REST_POSES} from './lich-rest-poses.js';

const CROWNED = [['master lich', 5], ['arch-lich', 6]];
const make = ([name, color]) => { const a = createCreature({name, symbol: 76, color}); a.g.updateMatrixWorld(true); return a; };
const named = (a, n) => { let h = null; a.g.traverse(o => { if (!h && o.name === n) h = o; }); return h; };
const ray = new THREE.Raycaster();
const meshesOf = crown => { const out = []; crown.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
const worldVerts = m => { const p = m.geometry.attributes.position, v = [];
  for (let i = 0; i < p.count; i++) v.push(m.localToWorld(new THREE.Vector3().fromBufferAttribute(p, i))); return v; };

// which side of the cowl's shell a world point is on: a ray from the cowl's axis at the point's height, out through
// the point, meets the shell before the point (outside) or beyond it (inside); no hit is the open front or above the peak
function side(hood, p) {
  const local = hood.worldToLocal(p.clone()), e = cowlAt(local.y);
  const axis = hood.localToWorld(new THREE.Vector3(e.cx, local.y, e.cz)), d = p.clone().sub(axis), len = d.length();
  if (len < 1e-6) return 'in';
  ray.set(axis, d.normalize()); ray.near = 0; ray.far = Infinity;
  const hit = ray.intersectObject(hood, false)[0];
  if (!hit) return 'open';
  return hit.distance > len + 1e-4 ? 'in' : hit.distance < len - 1e-4 ? 'out' : 'on';
}
// how many edges of `from`'s triangles pass through `to`'s surface
function crossings(from, to) {
  const v = worldVerts(from), idx = from.geometry.index, n = idx ? idx.count : v.length, at = i => v[idx ? idx.getX(i) : i];
  let hits = 0;
  for (let t = 0; t + 2 < n; t += 3) for (const [i, j] of [[0, 1], [1, 2], [2, 0]]) {
    const a = at(t + i), b = at(t + j), d = b.clone().sub(a), len = d.length();
    if (len < 1e-9) continue;
    ray.set(a, d.normalize()); ray.near = 0; ray.far = len;
    if (ray.intersectObject(to, false).length) hits++;
  }
  return hits;
}

function check(a, name, label) {
  a.g.updateMatrixWorld(true);
  const hood = named(a, 'hood'), crown = named(a, 'crown');
  assert(hood && crown, `${name}: a hood and a crown`);
  const meshes = meshesOf(crown);
  assert(meshes.length >= 2, `${name}: the crown's band, points and stones (${meshes.length} meshes)`);
  let spikes = 0;
  for (const m of meshes) {
    const sides = new Set(worldVerts(m).map(p => side(hood, p)));
    assert(!(sides.has('in') && sides.has('out')), `${name} ${label}: a crown mesh on both sides of the cowl (${[...sides]})`);
    assert(!sides.has('in'), `${name} ${label}: a crown mesh inside the cowl, not worn over it`);
    assert.equal(crossings(m, hood), 0, `${name} ${label}: a crown mesh's edges cut the cowl`);
    assert.equal(crossings(hood, m), 0, `${name} ${label}: the cowl's edges cut a crown mesh`);
    if (m.geometry.type === 'ConeGeometry' || m.geometry.attributes.position.count > 200) spikes++;
  }
  assert(spikes >= 1, `${name}: the points are among the meshes checked`);
}

test('the crowned liches wear the crown over the cowl, cutting it nowhere, standing and in the baked stoop', () => {
  for (const m of CROWNED) {
    const a = make(m), name = m[0];
    check(a, name, 'standing');
    const baked = REST_POSES[name];
    assert(baked?.ok, `${name}: a baked stoop`);
    birdPoser(a).apply(baked.pose);
    check(a, name, 'stooped');
  }
});

test('the crown rides with the hood, so the stoop carries them together', () => {
  for (const m of CROWNED) {
    const a = make(m), hood = named(a, 'hood'), crown = named(a, 'crown');
    assert.equal(crown.parent, hood.parent, `${m[0]}: the crown hangs on the hood's bone`);
  }
});

test('the crown points rise above the cowl\'s peak, the arch-lich\'s spire highest', () => {
  const top = m => { const a = make(m), crown = named(a, 'crown'); a.g.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(crown).max.y / a.g.scale.y; };
  const hoodTop = m => { const a = make(m); return new THREE.Box3().setFromObject(named(a, 'hood')).max.y / a.g.scale.y; };
  const [master, arch] = CROWNED.map(top);
  assert(master > hoodTop(CROWNED[0]), `master lich: the points ${master.toFixed(3)} over the peak`);
  assert(arch > master + .05, `arch-lich: the spire ${arch.toFixed(3)} over the master's ${master.toFixed(3)}`);
});
