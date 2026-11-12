// Review finding 2026-11-12: the stalker's opaque hide turned its air funnel and wind streaks into solid dark hoops
// standing off the body. Its funnel is now its own hide tapering on from the wasp waist, and its wind faint streaks.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const build = name => createCreature({name, symbol: 69, color: 7});
const meshes = o => { const m = []; o.traverse(x => { if (x.isMesh) m.push(x); }); return m; };

test('no hoop stands off the stalker: its funnel holds no ring, and its top sits inside the trunk', () => {
  const s = build('stalker');
  s.g.updateMatrixWorld(true);
  const funnel = s.tail.children.filter(o => o.isSkinnedMesh);
  assert(funnel.length >= 1);
  // the funnel's widest point is no wider than the trunk's waist plus a sliver (the old rings spread to 0.2)
  let wide = 0;
  for (const m of funnel) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) wide = Math.max(wide, Math.hypot(p.getX(i), p.getZ(i))); }
  assert(wide < .09, `funnel reaches ${wide.toFixed(3)} from its axis`);
  // and it reaches up into the trunk, so there is no gap between body and funnel
  const top = Math.max(...funnel.map(m => { m.geometry.computeBoundingBox(); return m.geometry.boundingBox.max.y; }));
  assert(top > 0, 'the funnel starts above the tail pivot, inside the trunk');
});

test('the stalker\'s wind streaks are faint, thin arcs, not solid hoops', () => {
  const s = build('stalker');
  const rings = meshes(s.swirl).filter(m => m.geometry.type === 'TorusGeometry');
  assert(rings.length > 0);
  for (const r of rings) {
    assert(r.material.transparent && r.material.opacity <= .15, 'a solid hoop round the stalker');
    assert(r.geometry.parameters.arc < Math.PI, 'a streak, not a full hoop');
  }
  for (const m of meshes(s.g)) if (m.geometry.type === 'TorusGeometry') assert(m.parent === s.swirl, 'a ring on the stalker outside its faint wind');
});

test('the air elemental keeps its ringed funnel and its gale', () => {
  const a = build('air elemental');
  assert(meshes(a.swirl).some(m => m.geometry.type === 'TorusGeometry' && m.geometry.parameters.arc > Math.PI));
  let wide = 0;
  for (const m of a.tail.children.filter(o => o.isSkinnedMesh)) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) wide = Math.max(wide, Math.hypot(p.getX(i), p.getZ(i))); }
  assert(wide > .15);
});
