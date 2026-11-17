import * as THREE from 'three';

// The snakes' coil on bones (family S, stage 1). creatures.js snake() draws the whole body as one tapered
// tube: a spiral coil from the pointed tip (curve start, outer turn) in to where it rises, then a short rise
// to the head. This hangs `tail0` (where the coil rises, the spiral's inner end) out to `tail11` (the tip)
// in order on the body along the spiral, and swaps the tube for one SkinnedMesh on them. Each ring rides the
// two bones either side of it by where it lies along the curve (not by distance: the turns lie close, so a
// nearest-bone weight would hang a ring on the turn inside it), as the nagas' coil does (naga.js). The rise
// rides a bone of its own, `rise`, at the same spot (not a joint: the neck and head go on bones later), so a
// turned coil joint swings the coil past it out and leaves the rise and the head where they are. The
// slither's ripple (slither.js) writes the tube's rest positions, which the skin carries, so it still works.
export const COIL_BONES = 12;

// The curve's arc-length fraction u at its parameter t (inverse of getUtoTmapping).
function uAt(curve, t) {
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (curve.getUtoTmapping(m) < t) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// tube: the coil mesh (a TubeGeometry on `body`, at its origin); coilEnd: the index of the curve's control
// point where the coil ends and the rise begins, of `count` control points. Returns {mesh, bones}.
export function skinSnakeCoil(body, tube, coilEnd, count) {
  const geo = tube.geometry, {path, tubularSegments: S, radialSegments: R} = geo.parameters;
  const U0 = uAt(path, coilEnd / (count - 1)), N = COIL_BONES;
  const pts = Array.from({length: N}, (_, i) => path.getPointAt(U0 * (1 - i / (N - 1))));
  const rise = new THREE.Bone(); rise.name = 'rise'; rise.position.copy(pts[0]); body.add(rise);
  const bones = pts.map((p, i) => { const b = new THREE.Bone(); b.name = 'tail' + i; b.position.copy(i ? p.clone().sub(pts[i - 1]) : p); return b; });
  bones.forEach((b, i) => (i ? bones[i - 1] : body).add(b));
  // ring r (R + 1 vertices) sits at u = r / S along the curve: past U0 it is the rise
  const n = geo.attributes.position.count, idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) {
    const u = Math.floor(v / (R + 1)) / S;
    if (u > U0) { idx[v * 4] = N; wt[v * 4] = 1; continue; }
    const s = THREE.MathUtils.clamp((1 - u / U0) * (N - 1), 0, N - 1), k = Math.min(N - 2, Math.floor(s)), t = s - k;
    idx[v * 4] = k; idx[v * 4 + 1] = k + 1; wt[v * 4] = 1 - t; wt[v * 4 + 1] = t;
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
  const mesh = new THREE.SkinnedMesh(geo, tube.material);
  mesh.castShadow = tube.castShadow; mesh.receiveShadow = tube.receiveShadow;
  mesh.userData = {...tube.userData, coil: true, part: 'coil'};
  body.add(mesh); body.remove(tube);
  // bind with the actor's scale in the world matrices (see "Lessons so far": a stale one skins it twice over)
  let root = body; while (root.parent) root = root.parent;
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([...bones, rise]));
  return {mesh, bones};
}
