// Poses from goals. A resting or grooming pose is described by what it does, not by joint angles:
// "the mouth at the right forepaw", "the rump and both hind feet on the floor", "the back rising about
// 40 degrees", "nothing through the floor". solvePose turns the goals into the joint angles that meet
// them as nearly as the body allows (damped least squares, Levenberg-Marquardt style, with a numerical
// Jacobian), on the rig itself, so the same goals fit any body the sculpt grows. It works on the
// control bones the clips write (hips, spine, chest, neck, head, the legs, the tail); a rig with
// vertebrae shares their bends out (feline-skin.js distribute) before the goals are measured, so the
// back and the neck curve smoothly however far they bend.
//
// The result is a pose in the shape the clips use ({bone: {x, y, z}, hipsY, hipsZ}), so a clip blends
// solved poses as it blended hand-made ones.
import * as THREE from 'three';

// The solver's settings: iterations, the starting damping, the step for the numerical derivatives,
// and how strongly every angle is pulled back toward its starting value (keeps an answer from
// wandering where no goal cares).
export const SOLVE = {iterations: 40, damping: .05, h: 1e-3, rest: .02};

const _v = new THREE.Vector3(), _e = new THREE.Euler();

// The rig's named points, in world space, for goals to use. `rig` is feline-skin.js's rig.
// - paw:lf, paw:rf, paw:lh, paw:rh: the tips of the feet;
// - hip:l, hip:r: the hip joints; shoulder:l, shoulder:r;
// - head-space points through rig.headLocal: mouth, nose, chin, ear:l/r (behind the ear), brow;
// - body points through `body([x, y, z])` (body space, riding the chest or hips bone nearest);
// - withers, rump, tailtip.
export function points(rig, bones) {
  const tip = key => () => { const L = rig.legs[key], e = L.bones[L.bones.length - 1]; return L.tip.clone().applyMatrix4(e.matrixWorld); };
  const at = name => () => bones[name].getWorldPosition(new THREE.Vector3());
  const head = p => () => rig.headLocal(p).applyMatrix4(bones.head.matrixWorld);
  return {
    'paw:lf': tip('lfore'), 'paw:rf': tip('rfore'), 'paw:lh': tip('lhind'), 'paw:rh': tip('rhind'),
    'hip:l': at('lhind0'), 'hip:r': at('rhind0'), 'shoulder:l': at('lfore0'), 'shoulder:r': at('rfore0'),
    'hock:l': at('lhind2'), 'hock:r': at('rhind2'), 'wrist:l': at('lfore2'), 'wrist:r': at('rfore2'),
    mouth: head([0, -.03, .135]), nose: head([0, 0, .145]), chin: head([0, -.046, .106]), brow: head([0, .05, .09]),
    'ear:r': head([.04, .03, -.01]), 'ear:l': head([-.04, .03, -.01]), cheek: head([.045, -.005, .075]), crown: head([0, .09, .03]),
    withers: at('chest'), rump: at('hips'), head: at('head'),
    // (the tail's last joint carried on by its own length, to the tip)
    tailtip: () => { const n = rig.tail.length, a = rig.tail[n - 2].getWorldPosition(new THREE.Vector3()), b = rig.tail[n - 1].getWorldPosition(new THREE.Vector3()); return b.clone().multiplyScalar(2).sub(a); },
  };
}

// Skin samples for contacts: a few dozen vertices of the skin, chosen from a part (`groups`, the hull's
// part per vertex) and an optional filter on their rest position, posed as the skin is.
export function skinSamples(fur, {groups = null, filter = null, count = 60} = {}) {
  const pos = fur.geometry.attributes.position, part = fur.geometry.userData.groups, keep = [];
  for (let i = 0; i < pos.count; i++) { if (groups && part && !groups.includes(part[i])) continue; if (filter && !filter(pos.getX(i), pos.getY(i), pos.getZ(i))) continue; keep.push(i); }
  const step = Math.max(1, Math.floor(keep.length / count)), picked = keep.filter((_, k) => k % step === 0);
  return () => picked.map(i => { _v.fromBufferAttribute(pos, i); fur.applyBoneTransform(i, _v); return fur.localToWorld(_v.clone()); });
}

// ---- goals: each is a function of the posed rig returning residuals (zero when met) ----
// `P` is the points table above; points are named or given as functions.
const pt = (P, a) => typeof a === 'function' ? a() : typeof a === 'string' ? P[a]() : a;
export const goal = {
  // a point at a place (or at another point), within `within`
  // (as the vector between them, scaled to the distance past `within`, so each step aims straight at it)
  reach: (a, b, {within = 0, weight = 1} = {}) => P => { const pa = pt(P, a), pb = pt(P, b), v = pa.sub(pb), d = v.length(), k = d > 1e-9 ? weight * Math.max(0, d - within) / d : 0; return [v.x * k, v.y * k, v.z * k]; },
  // a point on the floor (its height `y`, say a paw's half-thickness)
  floor: (a, {y = 0, weight = 1} = {}) => P => [weight * (pt(P, a).y - y)],
  // two points kept at least `min` apart (a paw outside the skull)
  apart: (a, b, min, {weight = 1} = {}) => P => [weight * Math.max(0, min - pt(P, a).distanceTo(pt(P, b)))],
  // skin samples kept at least `r` from a line of points (the spine: a tail outside the body); `skip`,
  // the share of the samples nearest `from` (default the line's start) left out (where the tail grows
  // from the body); `plan`, measured in the floor's plane (outside the body as seen from above)
  outside: (samples, line, r, {weight = 1, skip = 0, from = null, plan = false} = {}) => P => {
    const flat = v => plan ? v.clone().setY(0) : v, L = line().map(flat), ps = samples().map(flat), d2seg = (p, a, b) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / (ab.lengthSq() || 1))); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
    const d = ps.map(p => { let m = Infinity; for (let i = 0; i + 1 < L.length; i++) m = Math.min(m, d2seg(p, L[i], L[i + 1])); return m; });
    const root = from ? flat(pt(P, from)) : L[0], order = d.map((v, i) => [ps[i].distanceTo(root), v]).sort((a, b) => a[0] - b[0]).slice(Math.floor(ps.length * skip));
    return order.map(([, v]) => weight * Math.max(0, r - v));
  },
  // the direction from a to b pointing toward c (the face turned toward what it reaches): zero when it does
  facing: (a, b, c, {weight = 1} = {}) => P => { const pa = pt(P, a), d = pt(P, b).sub(pa).normalize(), e = pt(P, c).sub(pa).normalize(); return [weight * Math.max(0, .5 - d.dot(e))]; },
  // a point at least / at most this high
  above: (a, y, {weight = 1} = {}) => P => [weight * Math.max(0, y - pt(P, a).y)],
  below: (a, y, {weight = 1} = {}) => P => [weight * Math.max(0, pt(P, a).y - y)],
  // a point staying (in the floor's plane) where it was when the goals were made
  plant: (a, {weight = 1} = {}) => { let at = null; return P => { const p = pt(P, a); at ??= p.clone(); return [weight * (p.x - at.x), weight * (p.z - at.z)]; }; },
  // the lowest of some skin samples on the floor, and none through it
  rests: (samples, {y = 0, weight = 1} = {}) => () => { const ps = samples(); const low = Math.min(...ps.map(p => p.y)); return [weight * (low - y)]; },
  clear: (samples, {y = 0, weight = 1} = {}) => () => samples().map(p => weight * Math.max(0, y - p.y)),
  // the line from a to b rising at about this many degrees (within `slack`)
  slope: (a, b, deg, {slack = 0, weight = 1} = {}) => P => { const pa = pt(P, a), pb = pt(P, b), d = Math.atan2(pb.y - pa.y, Math.hypot(pb.x - pa.x, pb.z - pa.z)) * 180 / Math.PI; return [weight * Math.max(0, Math.abs(d - deg) - slack) / 30]; },
  // a over b in plan (a vertical line between them), e.g. a shoulder over its paw
  over: (a, b, {weight = 1} = {}) => P => { const pa = pt(P, a), pb = pt(P, b); return [weight * (pa.x - pb.x), weight * (pa.z - pb.z)]; },
  // b ahead of (+) or behind (-) a by this much along the body's facing (the world's z at rest)
  ahead: (a, b, dz, {within = 0, weight = 1} = {}) => P => { const d = pt(P, b).z - pt(P, a).z - dz; return [weight * Math.sign(d) * Math.max(0, Math.abs(d) - within)]; },
};

// Joints, as `bone.axis` keys with their limits [min, max] in radians (absolute angles, as the clips
// write them). `hipsY`, `hipsZ` move the hips (body units). A side-less `fore0.x` (or `hind…`) moves both
// legs alike.
export function expand(key) { const [b, ax] = key.split('.'); return /^(fore|hind)\d/.test(b) ? [['l' + b, ax], ['r' + b, ax]] : [[b, ax]]; }
export function toPose(keys, values, base = {}) {
  const pose = JSON.parse(JSON.stringify(base));
  keys.forEach((key, i) => {
    if (key === 'hipsY' || key === 'hipsZ') { pose[key] = values[i]; return; }
    for (const [b, ax] of expand(key)) pose[b] = {...(pose[b] || {}), [ax]: values[i]};
  });
  return pose;
}

// Solves for the joints `joints` ({key: [min, max]}), starting from `base` (a pose), to meet `goals`
// (functions of the points table returning residuals). `apply(pose)` poses the rig (and shares bends out
// along its vertebrae); returns {pose, cost, residuals}.
export function solvePose({joints, base = {}, goals, apply, points: P, iterations = SOLVE.iterations, rest = SOLVE.rest}) {
  const keys = Object.keys(joints), lo = keys.map(k => joints[k][0]), hi = keys.map(k => joints[k][1]);
  const start = keys.map((k, i) => { const [b, ax] = expand(k)[0]; const v = k === 'hipsY' || k === 'hipsZ' ? base[k] || 0 : base[b]?.[ax] || 0; return Math.min(hi[i], Math.max(lo[i], v)); });
  const clamp = x => x.map((v, i) => Math.min(hi[i], Math.max(lo[i], v)));
  const residuals = x => { apply(toPose(keys, x, base)); const r = []; for (const g of goals) r.push(...g(P)); x.forEach((v, i) => r.push(rest * (v - start[i]))); return r; };
  const norm = r => r.reduce((s, v) => s + v * v, 0);
  let x = [...start], r = residuals(x), cost = norm(r), lambda = SOLVE.damping;
  const n = x.length;
  for (let it = 0; it < iterations; it++) {
    // the Jacobian, column by column
    const J = keys.map((_, j) => { const xp = [...x]; xp[j] += SOLVE.h; const rp = residuals(xp); return rp.map((v, i) => (v - r[i]) / SOLVE.h); });
    // (JᵀJ + λ diag) δ = -Jᵀ r
    const A = Array.from({length: n}, (_, a) => Array.from({length: n}, (_, b) => J[a].reduce((s, v, i) => s + v * J[b][i], 0)));
    const g = Array.from({length: n}, (_, a) => J[a].reduce((s, v, i) => s + v * r[i], 0));
    let improved = false;
    for (let tries = 0; tries < 6 && !improved; tries++) {
      const M = A.map((row, a) => row.map((v, b) => v + (a === b ? lambda * (v + 1e-6) : 0)));
      const d = solveLinear(M, g.map(v => -v)), xn = clamp(x.map((v, i) => v + d[i])), rn = residuals(xn), cn = norm(rn);
      if (cn < cost) { x = xn; r = rn; improved = cost - cn > 1e-10; cost = cn; lambda = Math.max(1e-6, lambda / 3); } else lambda *= 4;
    }
    if (!improved) break;
  }
  const pose = toPose(keys, x, base); apply(pose);
  return {pose, cost, residuals: goals.map(g => g(P))};
}

// Gaussian elimination with partial pivoting.
function solveLinear(A, b) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / (M[r][r] || 1e-12); }
  return x;
}

// Blends two poses (per angle and hips offset), `k` of the way from a to b.
export function blend(a, b, k) {
  const out = {}, names = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const n of names) {
    const va = a[n], vb = b[n];
    if (typeof va === 'number' || typeof vb === 'number') { out[n] = (va || 0) + ((vb || 0) - (va || 0)) * k; continue; }
    const o = {}; for (const ax of ['x', 'y', 'z']) { const p = va?.[ax] || 0, q = vb?.[ax] || 0; if (p || q) o[ax] = p + (q - p) * k; } out[n] = o;
  }
  return out;
}
