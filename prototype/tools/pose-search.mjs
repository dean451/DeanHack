// Run from prototype/: node tools/pose-search.mjs loaf|curl|bow|lick|wash|flank|scratch|eat [kitten]. Tunes a resting pose's constants
// (feline-skin.js LOAF, CURL) on the sculpted cat's rig against what real cats show, and prints the
// constants it finds and what each target costs. The pose is applied straight to the bones through
// the game's own pose function (applyPose), so what is searched is what plays.
// - loaf: the belly on the floor along its length, the back level, the front paws tucked under the
//   chest, the hind feet folded beside the flank, the tail lying along the floor;
// - bow (the front stretch): the fore paws reached well forward along the floor, the hind paws where
//   they stood, the chest sunk, the rump up, the head up;
// - curl: on its side on the floor, low and round from above, the nose down by the hind feet, the tail
//   tip wrapped round to the face, nothing through the floor.
const THREE = await import(process.cwd() + '/node_modules/three/build/three.module.js');
const skin = await import(process.cwd() + '/feline-skin.js');
const {createSkinnedFeline, applyPose} = skin;
const which = process.argv[2] || 'loaf', name = process.argv[3] || 'kitten';
// The reach poses (grooming, the scratch): the sit with some bones turned further (`bone.axis` keys),
// a point on one bone brought to a point on another.
const sitBase = () => skin.sitPose(0), reachPose = (consts, base = sitBase) => () => { const p = {...base()}; for (const [key, v] of Object.entries(consts)) { if (key === 'hipsY') { p.hipsY = (p.hipsY || 0) + v; continue; } const [b, ax] = key.split('.'); for (const bone of /^(fore|hind)/.test(b) ? ['l' + b, 'r' + b] : [b]) p[bone] = {...(p[bone] || {}), [ax]: ((p[bone] || {})[ax] || 0) + v}; } return p; };
const MOUTH_PT = [0, -.03, .135], EAR_PT = [.04, .04, .045], CHEEK_PT = [.045, -.005, .075];
const SPEC = {
  lick: {consts: skin.LICK, pose: reachPose(skin.LICK), keys: Object.keys(skin.LICK), reach: [['paw', 'r'], ['head', MOUTH_PT, .012]]},
  wash: {consts: skin.WASH, pose: reachPose(skin.WASH), keys: Object.keys(skin.WASH), reach: [['paw', 'r'], ['head', EAR_PT, .006]], also: [['paw', 'r'], ['head', CHEEK_PT, .03]]},
  scratch: {consts: skin.SCRATCH, pose: reachPose(skin.SCRATCH), keys: Object.keys(skin.SCRATCH), reach: [['hipjoint', 'r'], ['head', skin.SCRATCHING.at, .2]], stays: ['lfore2', 'rfore2', 'lhind3'], down: ['neck.x'], caps: {'spine.y': .6, 'chest.y': .6, 'neck.y': 1, 'hips.z': .35, 'hips.y': .5, 'chest.z': .35, 'head.z': .8, 'head.x': .8, 'neck.x': 1.3, 'spine.x': .6, 'chest.x': .7}, headAbove: .14},
  eat: {consts: skin.EAT, pose: skin.eatPose.bind(null, .5), keys: Object.keys(skin.EAT), reach: [['head', MOUTH_PT], ['floorAhead', .045, .008]], stays: ['lfore2', 'rfore2', 'lhind3', 'rhind3'], planted: ['lfore2', 'rfore2', 'lhind3', 'rhind3'], down: ['neck.x'], caps: {hipsY: .15, 'chest.x': .5, 'spine.x': .4}},
  flank: {consts: skin.FLANK, pose: reachPose(skin.FLANK), keys: Object.keys(skin.FLANK), reach: [['head', MOUTH_PT], ['body', [.07, .06, .16], .015]], down: ['neck.x', 'head.x'], same: ['spine.y', 'chest.y', 'neck.y', 'head.y']},
  loaf: {consts: skin.LOAF, pose: skin.loafPose, keys: ['drop', 'hz', 'hips', 'spine', 'chest', 'thigh', 'knee', 'hock', 'paw', 'fore', 'elbow', 'wrist', 'tail']},
  bow: {consts: skin.BOW, pose: () => skin.bowPose(1), keys: ['drop', 'hz', 'hips', 'spine', 'chest', 'fore', 'elbow', 'wrist', 'thigh', 'knee', 'hock', 'paw', 'head']},
  curl: {consts: skin.CURL, pose: skin.curlPose, keys: ['drop', 'hz', 'roll', 'flex', 'neckX', 'headX', 'headY', 'thigh', 'knee', 'hock', 'paw', 'fore', 'elbow', 'wrist', 'tail.0', 'tail.1', 'tail.2', 'tail.3', 'tail.4']},
}[which];
const a = createSkinnedFeline(name, undefined, {sculpt: true}), bones = {}; a.g.traverse(o => { if (o.isBone) bones[o.name] = o; });
const rest = Object.fromEntries(Object.entries(bones).map(([k, b]) => [k, b.position.clone()]));
// where things stand at rest (the bow is measured against the standing cat)
a.g.updateMatrixWorld(true); const at0 = Object.fromEntries(['lfore2', 'lhind3', 'chest', 'hips', 'lfore0'].map(k => [k, bones[k].getWorldPosition(new THREE.Vector3())])), atRest = Object.fromEntries(['lfore2', 'rfore2', 'lhind3', 'rhind3'].map(k => [k, bones[k].getWorldPosition(new THREE.Vector3())]));
const wp = b => b.getWorldPosition(new THREE.Vector3());
const pos = a.fur.geometry.attributes.position, groups = a.fur.geometry.userData.groups, body = [], tail = [], trunk = [];
const {felineBuild} = await import(process.cwd() + '/feline.js'), Y = felineBuild(name).L.Y, dorsal = [];
for (let i = 0; i < pos.count; i += 4) { (groups[i] === 'tail' ? tail : body).push(i); if (groups[i] === 'body') trunk.push([i, pos.getZ(i)]); if (groups[i] === 'body' && Math.abs(pos.getX(i)) < .012 && pos.getY(i) > Y + .04) dorsal.push([i, pos.getZ(i)]); }
const get = k => { if (k in SPEC.consts) return SPEC.consts[k]; const [n, j] = k.split('.'); return j === undefined ? SPEC.consts[n] : SPEC.consts[n][+j]; };
const set = (k, v) => { if (k in SPEC.consts) { SPEC.consts[k] = v; return; } const [n, j] = k.split('.'); if (j === undefined) SPEC.consts[n] = v; else SPEC.consts[n][+j] = v; };
const p = new THREE.Vector3(), posed = i => { p.fromBufferAttribute(pos, i); a.fur.applyBoneTransform(i, p); return a.fur.localToWorld(p).clone(); };
function pose(v) { SPEC.keys.forEach((k, i) => set(k, v[i])); const P = SPEC.pose(0); applyPose(P, bones, rest); if (bones.jaw) bones.jaw.rotation.x = -.07; a.g.updateMatrixWorld(true); a.fur.skeleton.update(); }
const zs = trunk.map(t => t[1]), z0 = Math.min(...zs), z1 = Math.max(...zs);
function cost(v, report = false) {
  pose(v);
  const pts = body.map(posed), tp = tail.map(posed), low = Math.min(...pts.map(q => q.y)), tailLow = Math.min(...tp.map(q => q.y));
  const t = {floor: 3000 * Math.max(0, -low - .003) ** 2 + 300 * Math.max(0, low - .004) ** 2 + (SPEC.reach ? 0 : 2000 * Math.max(0, -tailLow - .004) ** 2)}; // (a sat tail is laid on the floor at run time)
  const hips = wp(bones.hips), chest = wp(bones.chest), sh = wp(bones.lfore0), fp = wp(bones.lfore2), hj = wp(bones.lhind0), hp = wp(bones.lhind3), head = wp(bones.head), tip = wp(bones.tail4);
  // a reach: one point brought within `r` of another (and an optional second, looser)
  const point = ([what, at]) => {
    if (what === 'paw') { const L = a.rig.legs[at + 'fore'], e = L.bones[L.bones.length - 1]; return L.tip.clone().applyMatrix4(e.matrixWorld); }
    if (what === 'hind') { const L = a.rig.legs[at + 'hind'], e = L.bones[L.bones.length - 1]; return L.tip.clone().applyMatrix4(e.matrixWorld); }
    if (what === 'floorAhead') return new THREE.Vector3(0, .012, at0.lfore2.z + at);
    if (what === 'hipjoint') return bones[at + 'hind0'].getWorldPosition(new THREE.Vector3());
    if (what === 'head') return a.rig.headLocal(at).applyMatrix4(bones.head.matrixWorld);
    if (what === 'body') { const v = new THREE.Vector3(at[0], Y + at[1], at[2]); return v.sub(new THREE.Vector3(...bones.chest.userData.world)).applyMatrix4(bones.chest.matrixWorld); }
  };
  if (SPEC.reach) {
    for (const [pair, w] of [[SPEC.reach, 2000], [SPEC.also, 400]]) if (pair) { const d = point(pair[0]).distanceTo(point(pair[1])); t['reach' + w] = w * Math.max(0, d - pair[1][2]) ** 2; }
    // the rest of the sit stays: the other paws and the rump where they were
    t.stay = 400 * (SPEC.stays || ['lfore2', 'lhind3', 'rhind3']).reduce((c, k) => c + Math.max(0, bones[k].getWorldPosition(new THREE.Vector3()).y - .05) ** 2, 0);
    // nothing through the head: the paw stays outside the skull (a little in front of or beside it)
    const c = a.rig.headLocal([0, .035, .035]).applyMatrix4(bones.head.matrixWorld), pw = point(SPEC.reach[0][0] === 'hipjoint' ? ['paw', 'r'] : SPEC.reach[0]);
    t.outside = 800 * Math.max(0, .06 * (a.g.scale.x) - pw.distanceTo(c)) ** 2;
    // `planted`: these paws stay where they stood (on the floor and in place)
    if (SPEC.planted) t.planted = 300 * SPEC.planted.reduce((c, k) => c + bones[k].getWorldPosition(new THREE.Vector3()).distanceToSquared(atRest[k]), 0);
    // `headAbove`: the head kept up off the floor (world height of the head bone)
    if (SPEC.headAbove) t.headUp = 400 * Math.max(0, SPEC.headAbove - head.y) ** 2;
  } else if (which === 'loaf') {
    // the belly on the floor at the back, the middle and the front of the trunk
    const bins = [[], [], []]; trunk.forEach(([i, z]) => bins[Math.min(2, Math.floor((z - z0) / (z1 - z0) * 3))].push(posed(i).y));
    t.belly = bins.reduce((c, b) => c + 200 * Math.max(0, Math.min(...b) - .01) ** 2, 0);
    t.level = .002 * (Math.atan2(chest.y - hips.y, chest.z - hips.z) * 180 / Math.PI) ** 2;
    t.foreTucked = 60 * (Math.max(0, fp.z - sh.z - .01) ** 2 + Math.max(0, sh.z - .09 - fp.z) ** 2 + Math.max(0, fp.y - .03) ** 2);
    t.hindFolded = 60 * (Math.max(0, hp.y - .03) ** 2 + Math.max(0, hj.z - hp.z) ** 2 + Math.max(0, hp.z - hj.z - .13) ** 2);
    t.tailDown = 20 * tp.reduce((c, q) => c + Math.max(0, q.y - .04) ** 2, 0) / tp.length;
  } else if (which === 'bow') {
    // the fore paws reached well forward along the floor, the hind paws where they stood, the chest
    // sunk, the rump kept up, the head up off the chest
    t.reach = 80 * Math.max(0, at0.lfore2.z + .09 - fp.z) ** 2 + 400 * (fp.y - at0.lfore2.y) ** 2;
    t.hindStay = 200 * (hp.distanceToSquared(at0.lhind3));
    t.chestDown = 80 * Math.max(0, chest.y - (at0.chest.y - .06)) ** 2;
    t.rumpUp = 120 * Math.max(0, at0.hips.y - .015 - hips.y) ** 2;
    t.headUp = 60 * Math.max(0, chest.y + .03 - head.y) ** 2;
    // the back sags from the rump to the withers: no point of it above the straight line between them
    const bins = []; for (const [i, z] of dorsal) (bins[Math.floor((z + .35) / .03)] ||= []).push(posed(i));
    const line = bins.filter(Boolean).map(b => b.reduce((c, q) => c.add(q), new THREE.Vector3()).divideScalar(b.length)), A = line[0], B = line.at(-1);
    t.sag = line.reduce((c, q) => { const k = (q.z - A.z) / (B.z - A.z), above = q.y - (A.y + (B.y - A.y) * k); return c + 400 * Math.max(0, above + .004) ** 2; }, 0);
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
  const cap = k => SPEC.caps?.[k] ?? (k === 'drop' || k === 'hz' ? .3 : k === 'flex' ? 1.15 : k === 'neckX' || k.startsWith('neck') || k.startsWith('spine') || k.startsWith('chest') ? 1.5 : 2.4);
  // `down`: these bend the head down, never back up; `same`: these all turn the same way (one twist)
  if (SPEC.down) t.down = 50 * SPEC.down.reduce((c, k) => c + Math.max(0, -v[SPEC.keys.indexOf(k)]) ** 2, 0);
  if (SPEC.same) { const s0 = Math.sign(v[SPEC.keys.indexOf(SPEC.same.at(-1))]) || 1; t.same = 50 * SPEC.same.reduce((c, k) => c + Math.max(0, -s0 * v[SPEC.keys.indexOf(k)]) ** 2, 0); }
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
