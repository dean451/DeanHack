// Does an attached part (a collar, belt, strap, band, bracer) actually sit on the body it wraps?
// surfaceGap returns, in world units, how far the attached part's worst vertex is from the nearest
// vertex of the body: a fitted collar is a few millimetres off the neck, a hoop floating round it
// (the 2026-10-13 pet-cat collar) is centimetres off. Tests use it as: surfaceGap(collar, neck) < .012.
// Brute force over vertices: fine for a test, never call it per frame.
import * as THREE from 'three';

function worldPoints(obj, step = 1) {
  const pts = [], v = new THREE.Vector3();
  obj.updateWorldMatrix(true, true);
  obj.traverse(o => {
    const pos = o.isMesh && o.geometry?.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i += step) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone());
  });
  return pts;
}

export function surfaceGap(attached, body, {step = 1} = {}) {
  const a = worldPoints(attached, step), b = worldPoints(body);
  if (!a.length || !b.length) return Infinity;
  let worst = 0;
  for (const p of a) {
    let best = Infinity;
    for (const q of b) { const d = p.distanceToSquared(q); if (d < best) best = d; }
    worst = Math.max(worst, best);
  }
  return Math.sqrt(worst);
}
