// Run from prototype/: node tools/sit-search.mjs [kitten]. Prints the SIT angles it finds and what each target costs.
// The sit, searched on the sculpted kitten against side-on photos of sitting cats: the back rising
// 50-60 degrees, straight or a touch hollow (never bulging past the line from haunch to withers),
// the pelvis taking the tilt, the hind feet flat on the floor with the toes just behind the front
// paws, the front legs straight and upright, the rump on the floor.
const THREE = await import(process.cwd() + '/node_modules/three/build/three.module.js');
const {createSkinnedFeline, SIT} = await import(process.cwd() + '/feline-skin.js');
const {felineBuild} = await import(process.cwd() + '/feline.js');
const name = process.argv[2] || 'kitten', {L} = felineBuild(name);
const a = createSkinnedFeline(name, undefined, {sculpt: true}), bones = {}; a.g.traverse(o => { if (o.isBone) bones[o.name] = o; });
const restHips = a.rig.hips.position.clone();
const wp = b => b.getWorldPosition(new THREE.Vector3());
a.g.updateMatrixWorld(true);
const rest = {fpaw: wp(bones.lfore2), hpaw: wp(bones.lhind3), shoulder: wp(bones.lfore0)};
const pos = a.fur.geometry.attributes.position, groups = a.fur.geometry.userData.groups, sample = [], dorsal = [];
for (let i = 0; i < pos.count; i++) { if (groups[i] === 'tail') continue; if (i % 5 === 0) sample.push(i); const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); if (groups[i] === 'body' && Math.abs(x) < .012 && y > L.Y + .04 && z > -.25 && z < .23) dorsal.push([i, z]); }
dorsal.sort((p, q) => p[1] - q[1]);
const P = ['drop', 'hz', 'hips', 'spine', 'chest', 'thigh', 'knee', 'hock', 'paw', 'fore', 'elbow', 'wrist'];
const e = x => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, 0, 0));
function apply(v) {
  for (const b of Object.values(bones)) b.quaternion.identity();
  bones.hips.quaternion.copy(e(v.hips)); bones.spine.quaternion.copy(e(v.spine)); bones.chest.quaternion.copy(e(v.chest));
  for (const k of ['l', 'r']) { bones[k + 'hind0'].quaternion.copy(e(v.thigh)); bones[k + 'hind1'].quaternion.copy(e(v.knee)); bones[k + 'hind2'].quaternion.copy(e(v.hock)); bones[k + 'hind3'].quaternion.copy(e(v.paw)); bones[k + 'fore0'].quaternion.copy(e(v.fore)); bones[k + 'fore1'].quaternion.copy(e(v.elbow)); bones[k + 'fore2'].quaternion.copy(e(v.wrist)); }
  a.rig.hips.position.set(restHips.x, restHips.y - v.drop, restHips.z + v.hz);
  a.g.updateMatrixWorld(true); a.fur.skeleton.update();
}
const p = new THREE.Vector3(), posed = i => { p.fromBufferAttribute(pos, i); a.fur.applyBoneTransform(i, p); return a.fur.localToWorld(p).clone(); };
function hull() { let m = Infinity; for (const i of sample) { const q = posed(i); if (q.y < m) m = q.y; } return m; }
// how far the back line stands outside the chord from the haunch top to the withers (positive: a hump)
// the back line in bins along its rest length, posed, as yz points
function backLine() { const bins = []; for (const [i, z] of dorsal) { const k = Math.floor((z + .25) / .02); (bins[k] ||= []).push(posed(i)); } return bins.filter(Boolean).map(b => b.reduce((a, q) => a.add(q), new THREE.Vector3()).divideScalar(b.length)); }
function bulge() {
  const pts = backLine(), upper = pts.slice(Math.floor(pts.length * .4)), A = upper[0], B = upper[upper.length - 1], d = B.clone().sub(A).normalize(), hips = wp(bones.hips);
  let n = new THREE.Vector3(0, -d.z, d.y); if (n.dot(hips.clone().sub(A)) > 0) n.negate();
  let worst = -Infinity; for (const q of upper) worst = Math.max(worst, q.clone().sub(A).dot(n));
  // the sharpest turn between neighbouring stretches of the line (a corner at the haunch)
  let corner = 0; for (let k = 1; k + 1 < pts.length; k++) { const u = pts[k].clone().sub(pts[k - 1]).normalize(), w = pts[k + 1].clone().sub(pts[k]).normalize(); corner = Math.max(corner, Math.acos(Math.max(-1, Math.min(1, u.dot(w))))); }
  // where the line turns upward (steepening as it climbs: a knee, not a slope easing off to the shoulders)
  let knee = 0; for (let k = 1; k + 1 < pts.length; k++) { const u = pts[k].clone().sub(pts[k - 1]), w = pts[k + 1].clone().sub(pts[k]); const t = Math.atan2(u.z * w.y - u.y * w.z, u.y * w.y + u.z * w.z); knee += Math.max(0, t - .07) ** 2; }
  return [worst, corner, knee];
}
function cost(v, report = false) {
  apply(v);
  const fp = wp(bones.lfore2), hp = wp(bones.lhind3), hk = wp(bones.lhind2), sh = wp(bones.lfore0), hi = wp(bones.hips), ch = wp(bones.chest), hj = wp(bones.lhind0), kn = wp(bones.lhind1);
  const m = hull(), sp = Math.atan2(ch.y - hi.y, ch.z - hi.z) * 180 / Math.PI, [bu, corner, knee] = bulge();
  const t = {
    // the front paws stay on the floor and may step back under the shoulders (a few cm), the legs upright
    frontPawStays: 600 * (fp.y - rest.fpaw.y) ** 2 + 40 * Math.max(0, Math.abs(fp.z - rest.fpaw.z) - .035) ** 2,
    foreUpright: 120 * (sh.z - fp.z) ** 2,
    hindPawDown: 40 * (hp.y - rest.hpaw.y) ** 2,
    footFlat: 40 * (hk.y - rest.hpaw.y * 1.2) ** 2,
    toesBehindFront: 25 * (hp.z - (fp.z - .045)) ** 2,
    hockBack: 10 * Math.max(0, hk.z - hp.z + .07) ** 2,
    floor: 3000 * Math.max(0, -m - .004) ** 2 + 60 * Math.max(0, m - .006) ** 2,
    backAngle: .004 * (Math.max(0, 44 - sp) ** 2 + Math.max(0, sp - 58) ** 2),
    noHump: 400 * Math.max(0, bu + .002) ** 2,
    noCorner: .5 * Math.max(0, corner - .45) ** 2,
    softSlope: 2 * knee,
    // the hind leg folds in a Z under the haunch: the thigh forward and level (the knee near the elbow),
    // the shin back down to the hock at the rump, the foot flat forward
    thighForward: 30 * Math.max(0, hj.z + .07 - kn.z) ** 2 + 30 * Math.max(0, hj.y - .025 - kn.y) ** 2,
    hockUnderRump: 20 * Math.max(0, hk.z - (hj.z + .01)) ** 2,
    shoulderUp: 60 * Math.max(0, rest.shoulder.y * 1.02 - sh.y) ** 2,
    // the pelvis tips, the back above it stays nearly straight, the chest lifts a touch (no folding forward mid-back)
    pelvis: .05 * (Math.max(0, -.6 - v.hips) * 0 + Math.max(0, v.hips + .6) ** 2) + .3 * Math.max(0, -v.spine - .6) ** 2 + .3 * Math.max(0, -v.chest - .05) ** 2,
    limits: .5 * (Math.max(0, Math.abs(v.spine) - .8) ** 2 + Math.max(0, v.chest - .25) ** 2 * 4 + Math.max(0, -v.chest - .1) ** 2 * 4 + Math.max(0, Math.abs(v.hips) - 1.3) ** 2 + Math.max(0, Math.abs(v.elbow) - .5) ** 2 + Math.max(0, Math.abs(v.wrist) - .6) ** 2 + Math.max(0, v.knee - 2.6) ** 2),
  };
  const c = Object.values(t).reduce((x, y) => x + y, 0);
  if (report) return {c: +c.toFixed(6), t: Object.fromEntries(Object.entries(t).map(([k, x]) => [k, +x.toFixed(6)])), backDeg: +sp.toFixed(1), hump: +bu.toFixed(4), cornerDeg: +(corner * 57.3).toFixed(0), knee: +knee.toFixed(4), hullMin: +m.toFixed(4), shoulderZ: +sh.z.toFixed(3), shoulderY: +sh.y.toFixed(3), restShoulderY: +rest.shoulder.y.toFixed(3), fpRestZ: +rest.fpaw.z.toFixed(3), fp: fp.toArray().map(x => +x.toFixed(3)), hp: hp.toArray().map(x => +x.toFixed(3)), hock: hk.toArray().map(x => +x.toFixed(3)), hipJoint: hj.toArray().map(x => +x.toFixed(3)), knee: kn.toArray().map(x => +x.toFixed(3))};
  return c;
}
const now = {...SIT};
console.log('now', JSON.stringify(cost(now, true)));
let best = {drop: 0.154, hz: 0.087, hips: -0.9, spine: -0.05, chest: 0, thigh: -0.759, knee: 1.041, hock: -0.955, paw: 1.33, fore: 0.488, elbow: 0.611, wrist: -0.44}, bc = cost(best);
let rnd = 7; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
for (let restart = 0; restart < 5; restart++) {
  let cur = restart ? Object.fromEntries(P.map(k => [k, best[k] + (R() - .5) * (k === 'drop' || k === 'hz' ? .06 : .6)])) : {...best}, cc = cost(cur);
  for (let step = .3; step > .004; step *= .6) for (let it = 0; it < 5; it++) { let improved = false; for (const k of P) for (const d of [step, -step]) { const s = k === 'drop' || k === 'hz' ? d * .15 : d; const n = {...cur, [k]: cur[k] + s}, nc = cost(n); if (nc < cc) { cur = n; cc = nc; improved = true; } } if (!improved) break; }
  if (cc < bc) { best = cur; bc = cc; }
  console.log('restart', restart, bc.toFixed(5));
}
console.log(JSON.stringify(Object.fromEntries(P.map(k => [k, +best[k].toFixed(3)]))));
console.log(JSON.stringify(cost(best, true)));
