// Review finding 2026-11-12: the air elemental read as a translucent bubble man (see-through spheres for head, shoulders,
// chest and fists, white disc eyes, a funnel of round hoops). It is now a storm given a body: faceted, opaque, tapered,
// slate wind with torn pale streaks, small glints sunk in black hollows for eyes, and a twisted, ragged funnel.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';

const build = () => createCreature({name: 'air elemental', symbol: 69, color: 7});
const meshes = o => { const out = []; o.traverse(m => { if (m.isMesh) out.push(m); }); return out; };
const glows = m => m.material.emissive && m.material.emissiveIntensity >= 2;

test('the body is faceted and opaque: no smooth see-through head, trunk, shoulders, arms or fists', () => {
  const a = build();
  // everything on the body but the wind itself (the swirl); the head's see-through tatters are skipped below
  const solid = [...meshes(a.head), ...meshes(a.body).filter(m => !a.swirl.getObjectById(m.id) && !a.head.getObjectById(m.id))];
  for (const m of solid) {
    // glows and the black hollows (unlit, so shading cannot round them) aside
    if (glows(m) || m.material.transparent || m.material.color.getHSL({}).l < .06) continue;
    assert(m.material.flatShading, `${m.name || m.geometry.type}: a smooth-shaded piece on the body`);
  }
  // the head and both arm joints hold only opaque, flat-shaded bulk (the wind tatters are thin and ride behind the skull)
  for (const j of [a.head, a.joints.lfore, a.joints.rfore]) {
    const big = meshes(j).filter(m => !glows(m) && m.material.transparent).map(m => new THREE.Box3().setFromObject(m)).filter(b => b.min.z > -.02);
    assert.equal(big.length, 0, 'a see-through piece on the face or arm');
  }
  for (const m of meshes(a.tail)) assert(!m.material.transparent && m.material.flatShading, 'the funnel is solid faceted wind');
});

test('the eyes are small glints in dark hollows', () => {
  const a = build();
  a.g.updateMatrixWorld(true);
  const eyes = meshes(a.head).filter(glows);
  assert.equal(eyes.length >= 1, true);
  const darks = meshes(a.head).filter(m => !glows(m) && m.material.color.getHSL({}).l < .06);
  assert(darks.length >= 1, 'black hollows on the head');
  for (const e of eyes) {
    const b = new THREE.Box3().setFromObject(e), size = b.getSize(new THREE.Vector3());
    assert(size.y < .02 * a.g.scale.y, 'a glint, not a white disc');
    const c = b.getCenter(new THREE.Vector3());
    assert(darks.some(d => new THREE.Box3().setFromObject(d).expandByScalar(.005).containsPoint(c)), 'the glint sits in a hollow');
  }
});

test('at least three tones, and a funnel twisted and torn rather than a stack of hoops', () => {
  const a = build();
  const opaque = meshes(a.g).filter(m => !m.material.transparent && !glows(m));
  const tones = new Set(opaque.map(m => m.material.color.getHexString()));
  assert(tones.size >= 3, `tones: ${[...tones]}`);
  const lum = [...tones].map(h => new THREE.Color('#' + h).getHSL({}).l);
  assert(Math.max(...lum) - Math.min(...lum) > .3, 'dark recesses to pale streaks');
  // the funnel narrows to a point: its top is wide, its tip thin, and its rim radius is jagged around the ring
  for (const m of meshes(a.tail).filter(o => o.isSkinnedMesh)) {
    const p = m.geometry.attributes.position;
    let top = 0, low = Infinity, tipR = 0;
    for (let i = 0; i < p.count; i++) low = Math.min(low, p.getY(i));
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getZ(i));
      if (p.getY(i) > -.1) top = Math.max(top, r);
      if (p.getY(i) < low + .05) tipR = Math.max(tipR, r);
    }
    assert(tipR < top * .35, 'tapers to a point');
  }
  const funnel = meshes(a.tail).filter(o => o.isSkinnedMesh)[0].geometry.attributes.position;
  const radii = [];
  for (let i = 0; i < funnel.count; i++) if (Math.abs(funnel.getY(i) + .06) < .005) radii.push(Math.hypot(funnel.getX(i), funnel.getZ(i)));
  assert(radii.length >= 5 && Math.max(...radii) - Math.min(...radii) > .02, 'the rim is torn, not a smooth ring');
});
