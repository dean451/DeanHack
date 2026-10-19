// Run from prototype/: node tools/pose-search.mjs loaf|curl [kitten]. Tunes a resting pose's constants
// (feline-skin.js LOAF, CURL) on the sculpted cat's rig against what real cats show, and prints the
// constants it finds and what each target costs. The pose is applied straight to the bones through
// the game's own pose function (applyPose), so what is searched is what plays.
// - loaf: the belly on the floor along its length, the back level, the front paws tucked under the
//   chest, the hind feet folded beside the flank, the tail lying along the floor;
// - curl: on its side on the floor, low and round from above, the nose down by the hind feet, the tail
//   tip wrapped round to the face, nothing through the floor.
const THREE = await import(process.cwd() + '/node_modules/three/build/three.module.js');
const skin = await import(process.cwd() + '/feline-skin.js');
const {createSkinnedFeline, applyPose} = skin;
const which = process.argv[2] || 'loaf', name = process.argv[3] || 'kitten';
const SPEC = {
  loaf: {consts: skin.LOAF, pose: skin.loafPose, keys: ['drop', 'hz', 'hips', 'spine', 'chest', 'thigh', 'knee', 'hock', 'paw', 'fore', 'elbow', 'wrist', 'tail']},
  curl: {consts: skin.CURL, pose: skin.curlPose, keys: ['drop', 'hz', 'roll', 'flex', 'neckX', 'headX', 'headY', 'thigh', 'knee', 'hock', 'paw', 'fore', 'elbow', 'wrist', 'tail.0', 'tail.1', 'tail.2', 'tail.3', 'tail.4']},
}[which];
const a = createSkinnedFeline(name, undefined, {sculpt: true}), bones = {}; a.g.traverse(o => { if (o.isBone) bones[o.name] = o; });
const rest = Object.fromEntries(Object.entries(bones).map(([k, b]) => [k, b.position.clone()]));
const wp = b => b.getWorldPosition(new THREE.Vector3());
const pos = a.fur.geometry.attributes.position, groups = a.fur.geometry.userData.groups, body = [], tail = [], trunk = [];
for (let i = 0; i < pos.count; i += 4) { (groups[i] === 'tail' ? tail : body).push(i); if (groups[i] === 'body') trunk.push([i, pos.getZ(i)]); }
const get = k => { const [n, j] = k.split('.'); return j === undefined ? SPEC.consts[n] : SPEC.consts[n][+j]; };
const set = (k, v) => { const [n, j] = k.split('.'); if (j === undefined) SPEC.consts[n] = v; else SPEC.consts[n][+j] = v; };
const p = new THREE.Vector3(), posed = i => { p.fromBufferAttribute(pos, i); a.fur.applyBoneTransform(i, p); return a.fur.localToWorld(p).clone(); };
function pose(v) { SPEC.keys.forEach((k, i) => set(k, v[i])); applyPose(SPEC.pose(0), bones, rest); a.g.updateMatrixWorld(true); a.fur.skeleton.update(); }
const zs = trunk.map(t => t[1]), z0 = Math.min(...zs), z1 = Math.max(...zs);
function cost(v, report = false) {
  pose(v);
  const pts = body.map(posed), tp = tail.map(posed), low = Math.min(...pts.map(q => q.y)), tailLow = Math.min(...tp.map(q => q.y));
  const t = {floor: 3000 * Math.max(0, -low - .003) ** 2 + 300 * Math.max(0, low - .004) ** 2 + 2000 * Math.max(0, -tailLow - .004) ** 2};
  const hips = wp(bones.hips), chest = wp(bones.chest), sh = wp(bones.lfore0), fp = wp(bones.lfore2), hj = wp(bones.lhind0), hp = wp(bones.lhind3), head = wp(bones.head), tip = wp(bones.tail4);
  if (which === 'loaf') {
    // the belly on the floor at the back, the middle and the front of the trunk
    const bins = [[], [], []]; trunk.forEach(([i, z]) => bins[Math.min(2, Math.floor((z - z0) / (z1 - z0) * 3))].push(posed(i).y));
    t.belly = bins.reduce((c, b) => c + 200 * Math.max(0, Math.min(...b) - .01) ** 2, 0);
    t.level = .002 * (Math.atan2(chest.y - hips.y, chest.z - hips.z) * 180 / Math.PI) ** 2;
    t.foreTucked = 60 * (Math.max(0, fp.z - sh.z - .01) ** 2 + Math.max(0, sh.z - .09 - fp.z) ** 2 + Math.max(0, fp.y - .03) ** 2);
    t.hindFolded = 60 * (Math.max(0, hp.y - .03) ** 2 + Math.max(0, hj.z - hp.z) ** 2 + Math.max(0, hp.z - hj.z - .13) ** 2);
    t.tailDown = 20 * tp.reduce((c, q) => c + Math.max(0, q.y - .04) ** 2, 0) / tp.length;
  } else {
    // low and round from above, the nose by the hind feet, the tail tip at the face
    const xs = pts.map(q => q.x), zz = pts.map(q => q.z), w = Math.max(...xs) - Math.min(...xs), d = Math.max(...zz) - Math.min(...zz), high = Math.max(...pts.map(q => q.y));
    t.round = 8 * (Math.max(w, d) - Math.min(w, d)) ** 2 + 4 * (w * d);
    t.low = 40 * Math.max(0, high - .15) ** 2;
    t.noseDown = 30 * Math.max(0, head.y - .06) ** 2 + 6 * head.distanceToSquared(hp);
    t.tailRound = 6 * tip.distanceToSquared(head);
    // the face shows: the head on the outside of the curl (not tucked under), a little up off the floor
    const cx = pts.reduce((c, q) => c + q.x, 0) / pts.length, cz = pts.reduce((c, q) => c + q.z, 0) / pts.length, far = Math.max(...pts.map(q => Math.hypot(q.x - cx, q.z - cz)));
    t.faceShows = 20 * Math.max(0, .6 - Math.hypot(head.x - cx, head.z - cz) / far) ** 2 + 60 * Math.max(0, .045 - head.y) ** 2;
  }
  // (joints within what the skin takes: the back and the neck bend at single joints here, where a cat's
  // spine shares the curl over dozens of vertebrae)
  const cap = k => k === 'drop' || k === 'hz' ? .3 : k === 'flex' ? 1.15 : k === 'neckX' ? 1.5 : 2.4;
  t.limits = 3 * v.reduce((c, x, i) => c + Math.max(0, Math.abs(x) - cap(SPEC.keys[i])) ** 2, 0);
  const c = Object.values(t).reduce((x, y) => x + y, 0);
  if (report) return {c: +c.toFixed(5), t: Object.fromEntries(Object.entries(t).map(([k, x]) => [k, +x.toFixed(5)])), low: +low.toFixed(3), tailLow: +tailLow.toFixed(3), fp: fp.toArray().map(x => +x.toFixed(3)), hp: hp.toArray().map(x => +x.toFixed(3)), head: head.toArray().map(x => +x.toFixed(3))};
  return c;
}
let best = SPEC.keys.map(get), bc = cost(best);
console.log('now', JSON.stringify(cost(best, true)));
let rnd = 7; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
for (let restart = 0; restart < 4; restart++) {
  let cur = restart ? best.map((x, i) => x + (R() - .5) * (SPEC.keys[i] === 'drop' || SPEC.keys[i] === 'hz' ? .05 : .7)) : [...best], cc = cost(cur);
  for (let step = .3; step > .006; step *= .6) for (let it = 0; it < 4; it++) { let improved = false; for (let i = 0; i < cur.length; i++) for (const d of [step, -step]) { const n = [...cur]; n[i] += SPEC.keys[i] === 'drop' || SPEC.keys[i] === 'hz' ? d * .15 : d; const nc = cost(n); if (nc < cc) { cur = n; cc = nc; improved = true; } } if (!improved) break; }
  if (cc < bc) { best = cur; bc = cc; }
  console.log('restart', restart, bc.toFixed(5));
}
console.log(JSON.stringify(Object.fromEntries(SPEC.keys.map((k, i) => [k, +best[i].toFixed(3)]))));
console.log(JSON.stringify(cost(best, true)));
