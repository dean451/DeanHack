// The sleeping dragon: the pet cat's curl (feline-rest.js) written by body role (body-roles.js) and solved on
// the dragon's own joints (creatures.js dragonSkin), from the real-animal measures in creature-measures.js.
//
// A four-legged dragon (or a wyvern) lies down like a big cat: the belly on the floor, the forelegs reached
// out in front and the chin laid on the forepaws (a wyvern, with no forelegs, lays its chin on the floor),
// the hind legs folded alongside the haunches, the tail laid round the body on the floor toward the face.
// A serpent lies in a coil with its chin on its own coils. The wings fold like a bat's: the fingers back
// along the forearm, so the folded wing is not much longer than the forearm, raised over the back with the
// wrists above the shoulders and the tips behind the hips.
//
// The pose is solved once per form and cached, in stages (lie down, the head, the wings, the tail), each a
// solvePose run over that stage's joints and goals. A pose is {joint: {x, y, z} (radians, added to the
// joint's built rotation), body: {y} (the body's drop, body units), <wing>_inner: {s} (the wing's fold)}.
import * as THREE from 'three';
import {solvePose, goal} from './feline-pose.js';
import {wrapTail} from './feline-rest.js';
import {rolesOf} from './body-roles.js';
import {DRAGON} from './creature-measures.js';

// Sizes in the dragon's own units (multiplied by its scale):
// - sprawl: where each paw lies from its shoulder or hip when sprawled (out to the side, forward or back);
// - frontPaw: where each forepaw lies from its shoulder (in toward the middle, forward) when the chin rests
//   forward on them;
// - curlPawL, curlPawR: where each forepaw lies from its shoulder (x, z), curled round to the left where the
//   head lies: the left out at the chest's front corner, the right tucked under the chest toward it;
// - hindForward, hindOut: how far the hind paws sit forward of the hips and out from the middle;
// - chinOver: how high the chin rests over the paws; neckRise: how far the neck may rise off the chest
//   before it slopes down to the chin; headClear: the mouth's least height;
// - tailGap: the tail's gap from the body (it lies on its own underside); tailDrop: how far along it the
//   tail eases down to the floor from the rump;
// - a serpent's coilLie: the coil's height on the floor (its thick body lies about evenly); coilDrop: how
//   far along it the coil eases down from the front; coilFront: how high the front is held.
export const SLEEP = {curlPawL: [-.1, .2], curlPawR: [-.14, .2], hindForward: .12, hindOut: .26, chinOver: .05, tailGap: .05, tailDrop: .3, coilLie: .1, coilDrop: .2, coilFront: .24, headClear: .04, neckRise: .08, frontPaw: [.12, .26], sprawl: [.28, .06]};

// The folded wing's size against the open wing: a bat's fingers fold back along its forearm, so the
// folded wing is about the forearm's length; on the dragon's wing the forearm runs from the root to the
// elbow (creatures.js dragonWing's leading edge), and the fold keeps a tenth more for the folded fingers.
export function wingFold(inner) { const [, elbow, tip] = inner.userData.edge; return 1.1 * Math.hypot(...elbow) / Math.hypot(...tip); }

// Poses an actor: rotations added to each joint's built rotation, the body's drop, the wings' fold.
// (the built rotations are read once per actor, so a poser made on a posed dragon still knows its rest)
export function dragonPoser(a) {
  if (!a.jointRest) { a.jointRest = {rest: {}, body: a.body.position.clone(), bodyRz: a.body.rotation.z}; for (const [n, o] of Object.entries(a.joints)) a.jointRest.rest[n] = {x: o.rotation.x, y: o.rotation.y, z: o.rotation.z, s: o.scale.x}; }
  const {rest, body} = a.jointRest;
  const apply = pose => {
    for (const [n, o] of Object.entries(a.joints)) {
      const r = rest[n], p = pose[n] || {};
      o.rotation.set(r.x + (p.x || 0), r.y + (p.y || 0), r.z + (p.z || 0));
      if (p.s !== undefined || o.scale.x !== r.s) o.scale.setScalar(p.s ?? r.s);
    }
    a.body.position.set(body.x, body.y + (pose.body?.y || 0), body.z);
    a.body.rotation.z = (a.jointRest.bodyRz || 0) + (pose.body?.rz || 0);
    a.g.updateMatrixWorld(true);
  };
  return {apply, rest};
}

// Blends two dragon poses, k of the way from a to b (every axis, the fold included).
export function blendDragon(a, b, k) {
  const out = {};
  for (const n of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const o = {}; for (const ax of ['x', 'y', 'z', 's']) { const p = a[n]?.[ax], q = b[n]?.[ax]; if (p === undefined && q === undefined) continue; const dflt = ax === 's' ? 1 : 0; o[ax] = (p ?? dflt) + ((q ?? dflt) - (p ?? dflt)) * k; } out[n] = o;
  }
  return out;
}

// World points sampled from the dragon's skin: every static mesh on the body and every skinned mesh (posed),
// `every` vertices apart; `keep(local)` filters by the vertex's position in the body's frame at rest.
// `skip` leaves out skinned vertices that ride mostly on bones whose names match it (the tail, before it is
// laid); `only` keeps just those that do (the legs, sampled densely so a flat foot stays out of the floor).
function samples(a, {every = 23, keep = null, skinned = true, bodyOnly = false, skip = null, only = null} = {}) {
  const list = [], inv = new THREE.Matrix4(), v = new THREE.Vector3();
  a.g.updateMatrixWorld(true); inv.copy(a.body.matrixWorld).invert();
  a.g.traverse(o => {
    if (!o.isMesh || !o.visible || (o.material?.transparent && !o.isSkinnedMesh)) return;
    if (o.isSkinnedMesh ? !skinned : bodyOnly && o.parent !== a.body) return;
    if (!o.isSkinnedMesh && !isOnBody(a, o)) return;
    const pos = o.geometry.attributes.position;
    const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
    for (let i = 0; i < pos.count; i += every) {
      if ((skip || only) && !o.isSkinnedMesh && only) continue;
      if ((skip || only) && o.isSkinnedMesh) { const n = o.skeleton.bones[sw.getX(i) >= .5 ? si.getX(i) : si.getY(i)].name; if (skip?.test(n) || (only && !only.test(n))) continue; }
      v.fromBufferAttribute(pos, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld);
      if (keep && !keep(v.clone().applyMatrix4(inv))) continue;
      list.push({o, i});
    }
  });
  return () => { const out = []; for (const {o, i} of list) { const p = new THREE.Vector3().fromBufferAttribute(o.geometry.attributes.position, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, p); out.push(p.applyMatrix4(o.matrixWorld)); } return out; };
}
// a static mesh that rides the body (not the wings, which fold on their own goals)
function isOnBody(a, o) { for (let p = o.parent; p; p = p.parent) { if (a.wings.includes(p)) return false; if (p === a.body) return true; } return false; }

const at = o => () => o.getWorldPosition(new THREE.Vector3());
const mid = (P, a, b) => () => P[a]().add(P[b]()).multiplyScalar(.5);
// a point behind (lower z than) another, by at least `by`
const behind = (a, b, by = 0, {weight = 1} = {}) => P => [weight * Math.max(0, P[a]().z - (typeof b === 'function' ? b() : P[b]()).z + by)];
// a point at least `d` from the middle line (x = 0), or at most
const outward = (p, d, {weight = 1} = {}) => () => [weight * Math.max(0, d - Math.abs(p().x))];
const inward = (p, d, {weight = 1} = {}) => () => [weight * Math.max(0, Math.abs(p().x) - d)];
// points kept at or above a height (a function of the pose, for the back's moving top line)
const overLine = (pts, y, {weight = 1} = {}) => P => pts.map(p => weight * Math.max(0, y() - P[p]().y));
const floorAll = (pts, y, {weight = 1} = {}) => () => pts.map(p => weight * Math.max(0, y - p().y));

// How far the skin reaches below each of these bones at rest (the chain's thickness under it), from the
// skinned vertices that ride mostly on it (a spade or barbs included): so a tapering tail lies with its
// underside on the floor.
function undersides(a, bones) {
  a.g.updateMatrixWorld(true); const depth = bones.map(() => []), v = new THREE.Vector3(), at = bones.map(b => b.getWorldPosition(new THREE.Vector3()).y);
  a.g.traverse(o => { if (!o.isSkinnedMesh) return; o.skeleton.update(); const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight, p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = bones.indexOf(o.skeleton.bones[sw.getX(i) >= .5 ? si.getX(i) : si.getY(i)]); if (k < 0) continue; v.fromBufferAttribute(p, i); o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); depth[k].push(at[k] - v.y); } });
  return depth.map(d => Math.max(0, ...d));
}

const solved = new Map();
// The sleeping pose for a dragon actor, solved on first use for its form (key) and cached.
// Returns {pose, report: {stage: {cost, worst}}, goals: the final goals by name, for tests}.
// A cached pose comes back with this actor's own `apply` and `points`; `goals` only from the solve itself.
export function sleepPose(a, key = a.form ?? a.g.uuid) {
  if (solved.has(key)) { const c = solved.get(key); return {...c, apply: dragonPoser(a).apply, points: rolesOf(a), goals: c.actor === a ? c.goals : null}; }
  const {apply} = dragonPoser(a), P = rolesOf(a), j = a.joints, S = a.g.scale.x, u = d => d * S;
  const has = r => { try { P[r]; return true; } catch { return false; } };
  const serpent = !!j.spine0, legs = a.legs.map(l => l.name), fore = legs.filter(n => /fore/.test(n)), hind = legs.filter(n => /hind/.test(n));
  const chain = p => { const out = []; for (let i = 0; j[p + i]; i++) out.push(j[p + i]); return out; };
  const neck = chain('neck'), tail = chain('tail'), spine = chain('spine');
  const tailUnder = undersides(a, tail);
  // the other heads (Tiamat has five): head_1.. on necks neck_2_0.., neck_3_0..
  const extra = []; for (let k = 1; j['head_' + k]; k++) extra.push({head: j['head_' + k], neck: chain(`neck_${k + 1}_`)});
  // Each variant is solved whole; the curl is preferred, and a form whose curl can't be met (a short neck
  // and a big head can't reach round beside the chest) lies with its chin forward on its paws instead.
  // A third way, for legs that won't fold under (a sirrush's pillars), is a resting lizard's sprawl: belly down,
  // the legs splayed out to the sides, the chin on the floor ahead.
  const variants = serpent ? ['front'] : extra.length ? ['front', 'sprawl'] : ['curl', 'front', 'sprawl'];
  let best = null;
  for (const variant of variants) {
    apply({});
    const r = solveVariant(variant);
    if (!best || r.worst < best.worst) best = r;
    if (r.worst < .02) break;
  }
  apply(best.pose);
  const out = {pose: best.pose, report: best.report, goals: best.named, apply, points: P, variant: best.variant};
  solved.set(key, {...out, actor: a});
  return out;

  function solveVariant(variant) {
  const curl = variant === 'curl', sprawl = variant === 'sprawl', report = {}, named = {};
  let pose = {};
  const run = (name, joints, goals, opts = {}) => { const r = solvePose({joints, base: pose, goals: Object.values(goals), apply, points: P, iterations: opts.iterations ?? 60, rest: opts.rest ?? .01}); pose = r.pose; Object.assign(named, goals); report[name] = {cost: r.cost, worst: Math.max(0, ...r.residuals.flat().map(Math.abs))}; };
  apply(pose);

  // the body's half-width (its static meshes at rest), for laying the head alongside it
  const W = serpent ? 0 : Math.max(...samples(a, {skinned: false, bodyOnly: true, every: 3})().map(p => Math.abs(p.x)));
  // 1. lie down: the belly on the floor, nothing through it, the legs folded
  const belly = samples(a, {keep: v => v.y < (serpent ? 1 : .3), skinned: serpent});
  const skin = samples(a, {every: 41, skip: serpent ? null : /^tail/});
  // (a slight roll onto one side is allowed: Ixoth lies off the lance in its right flank)
  const joints1 = {'body.y': [-.6, 0], 'body.rz': [-.3, .3]};
  for (const l of legs) { for (let i = 0; j[l + i]; i++) joints1[`${l}${i}.x`] = [-2.6, 2.6]; joints1[`${l}0.z`] = sprawl ? [-1.6, 1.6] : [-.5, .5]; }
  const feet = samples(a, {every: 4, only: /^[lr](fore|hind)\d/});
  const goals1 = {belly: goal.rests(belly, {y: u(.01), weight: 2}), skin: goal.clear(skin, {y: 0, weight: 3}), ...(serpent ? {} : {feet: goal.clear(feet, {y: 0, weight: 3})})};
  for (const l of legs) {
    const side = l[0], f = /fore/.test(l), paw = `paw:${side}${f ? 'f' : 'h'}`, root = `${f ? 'shoulder' : 'hip'}:${side}`;
    goals1[paw] = goal.floor(paw, {y: u(.01)});
    goals1[l + 'Joints'] = floorAll(chain(l).slice(1).map(at), u(.015));
    // the forepaws curled round to the side the head lies on (its left): the left one out at the front corner
    // of the chest, the right one tucked in under the chest toward it
    // (or, lying with the chin forward, both reached out in front and drawn in together under the chin)
    if (sprawl) { const sx = side === 'l' ? -1 : 1; goals1[l + 'Reach'] = goal.reach(paw, () => P[root]().add(new THREE.Vector3(sx * u(SLEEP.sprawl[0]), 0, u(f ? SLEEP.sprawl[1] : -SLEEP.sprawl[1]))).setY(P[paw]().y), {within: u(.04)}); }
    else if (f) { const [ox, oz] = curl ? (side === 'l' ? SLEEP.curlPawL : SLEEP.curlPawR) : [side === 'l' ? SLEEP.frontPaw[0] : -SLEEP.frontPaw[0], SLEEP.frontPaw[1]]; goals1[l + 'Reach'] = goal.reach(paw, () => P[root]().add(new THREE.Vector3(u(ox), 0, u(oz))).setY(P[paw]().y), {within: u(.03)}); }
    else { goals1[l + 'Fwd'] = goal.ahead(root, paw, u(SLEEP.hindForward), {within: u(.05)}); goals1[l + 'Out'] = outward(P[paw], u(SLEEP.hindOut)); goals1[l + 'Knee'] = outward(at(j[l + '1']), u(SLEEP.hindOut - .03)); }
  }
  if (serpent) {
    // a serpent lies in a coil: the spine and the tail laid once round a ring on the floor, easing down from
    // its reared front; then its legs, if it has any, folded on the floor (the body itself stays put)
    // (first the body comes down until its front is a little over the coils)
    pose.body = {y: -Math.max(0, spine[0].getWorldPosition(new THREE.Vector3()).y - u(SLEEP.coilFront)) / S}; apply(pose);
    // (a serpent with legs brings its front lower still, until its paws reach the floor)
    if (fore.length) { const lift = Math.min(...fore.map(l => P[`paw:${l[0]}f`]().y)) - u(.01); if (lift > 0) { pose.body.y -= lift / S; apply(pose); } }
    // (the coil lies on its own underside: the middle of its spine's thickness, a thick serpent higher)
    const sp = undersides(a, spine).sort((p, q) => p - q), coilLie = Math.max(u(SLEEP.coilLie), sp[Math.floor(sp.length / 2)] + u(.01));
    const all = [...spine, ...tail], len = all.slice(1).reduce((s, b) => s + b.position.length() * S, 0), R = len / (2 * Math.PI) * .97;
    const c = spine[0].getWorldPosition(new THREE.Vector3()).setY(0).add(new THREE.Vector3(R, 0, 0));
    const ring = Array.from({length: 48}, (_, k) => new THREE.Vector3(c.x + R * Math.cos(k / 48 * Math.PI * 2), 0, c.z + R * Math.sin(k / 48 * Math.PI * 2)));
    const t = wrapTail({pose, apply, P, tail: all, outline: ring, paws: new THREE.Vector2(c.x, c.z + R), gap: 0, lie: coilLie, scale: S, bend: [-1.8, 1.8], drop: u(SLEEP.coilDrop), iterations: 400});
    // (the ring is a guide, not a mould: a few centimetres off it on a body this thick still reads as a neat coil, so it counts half)
    pose = t.pose; report.coil = t.report; named.coil = () => all.slice(1).map((b, k) => .5 * b.getWorldPosition(new THREE.Vector3()).distanceTo(t.targets[k + 1]));
    delete joints1['body.y']; delete joints1['body.rz']; delete goals1.belly;
    for (const l of fore) delete goals1[l + 'Reach'];
    if (legs.length) run('lie', joints1, goals1);
  } else run('lie', joints1, goals1);

  // 2. the head: the chin laid on the forepaws (or the floor ahead, or the coil), nothing through the floor
  const joints2 = {}; for (const b of neck) for (const ax of ['x', 'y', 'z']) joints2[`${b.name}.${ax}`] = ax === 'z' ? [-.3, .3] : ax === 'x' ? [-1.2, 1.2] : [-.7, .7];
  joints2['head.x'] = [-.9, .9]; joints2['head.y'] = [-.8, .8]; joints2['head.z'] = [-.6, .6];
  // A cat curls its head round to lie along its flank: the chin on the left forepaw (a wyvern's on the floor
  // at the front corner of its chest), the face turned back toward the haunch, the head beside the body.
  // Lying with the chin forward: the chin on the forepaws, or on the floor ahead of the chest.
  const rest = serpent ? () => { const s = spine[Math.floor(spine.length * .6)].getWorldPosition(new THREE.Vector3()); return s.setY(u(.2)); }
    : sprawl ? () => P.withers().setY(u(SLEEP.chinOver)).add(new THREE.Vector3(0, 0, u(.35)))
    : !curl ? (fore.length === 2 ? () => mid(P, 'paw:lf', 'paw:rf')().add(new THREE.Vector3(0, u(SLEEP.chinOver), -u(.03))) : () => P.withers().setY(u(SLEEP.chinOver)).add(new THREE.Vector3(0, 0, u(.35))))
    : has('paw:lf') ? () => P['paw:lf']().add(new THREE.Vector3(-u(.02), u(SLEEP.chinOver), -u(.04)))
    : () => P.withers().setY(u(SLEEP.chinOver)).add(new THREE.Vector3(-W - u(.04), 0, u(.12)));
  // where the face looks: back along the left flank
  const back = () => P.chin().add(new THREE.Vector3(-u(.15), 0, -u(1)));
  const goals2 = {
    chin: goal.reach('chin', rest, {within: u(.02), weight: 3}),
    level: goal.slope('chin', 'mouth', 5, {slack: 20}),
    headClear: goal.above('mouth', u(SLEEP.headClear)), chinClear: goal.above('chin', u(.02)),
    neckClear: floorAll(neck.map(at), u(.06)),
    // the neck rising no more than a hand's breadth off the chest before it curls down and round (not arched
    // up over the head and hooked down), the face turned back along the flank, the head beside the body
    neckLow: serpent ? () => [0] : () => { const ys = neck.map(b => b.getWorldPosition(new THREE.Vector3()).y); return [2 * Math.max(0, Math.max(...ys) - ys[0] - u(SLEEP.neckRise))]; },
    faceBack: serpent ? () => [0] : curl ? goal.facing('chin', 'mouth', back, {weight: 2}) : goal.ahead('chin', 'mouth', u(.05), {within: u(.04), weight: 2}),
    beside: serpent || !curl ? () => [0] : outward(at(j.head), W + u(.02), {weight: 2}),
    skin: goal.clear(skin, {y: 0, weight: 3}),
  };
  // the other heads laid out in a fan beside the first, chins on the floor, each apart from the next
  const chins = extra.map(({head}) => () => head.localToWorld(new THREE.Vector3(0, -.09, .2)));
  extra.forEach(({head, neck: nk}, k) => {
    for (const b of nk) for (const ax of ['x', 'y', 'z']) joints2[`${b.name}.${ax}`] = ax === 'z' ? [-.3, .3] : ax === 'x' ? [-1.2, 1.2] : [-.7, .7];
    joints2[`${head.name}.x`] = [-.9, .9]; joints2[`${head.name}.y`] = [-.8, .8];
    const side = head.getWorldPosition(new THREE.Vector3()).x < 0 ? -1 : 1;
    goals2['chin' + k] = goal.reach(chins[k], () => P.withers().setY(u(SLEEP.chinOver)).add(new THREE.Vector3(side * u(.16 + .12 * Math.floor(k / 2)), 0, u(.32 - .08 * Math.floor(k / 2)))), {within: u(.04), weight: 2});
    goals2['clear' + k] = goal.above(chins[k], u(.02));
    goals2['neckClear' + k] = floorAll(nk.map(at), u(.06));
  });
  if (extra.length) goals2.apart = () => { const all = [P.chin(), ...chins.map(f => f())], out = []; for (let p = 0; p < all.length; p++) for (let q = p + 1; q < all.length; q++) out.push(Math.max(0, u(.1) - all[p].distanceTo(all[q]))); return out; };
  // (first the chin to its rest, then the neck laid low and the face turned back from there)
  const {neckLow, faceBack, beside, ...reach} = goals2;
  run('head', joints2, reach, {iterations: 120});
  run('head', joints2, goals2, {iterations: 160});

  // 3. the wings, folded like a bat's and raised over the back: wrists above the shoulders, tips behind the
  // hips, every wing point above the back's top line, held in close
  if (a.wings.length) {
    const top = samples(a, {keep: v => v.y > .55, skinned: false, bodyOnly: true, every: 7});
    // (a serpent's back is the top of its coils, measured at their middle, not its raised front)
    const coilTop = () => { const ys = spine.map(b => b.getWorldPosition(new THREE.Vector3()).y).sort((p, q) => p - q); return ys[Math.floor(ys.length / 2)] + u(.12); };
    const backTop = () => Math.max(...top().map(p => p.y), serpent ? coilTop() : 0);
    // (a baby's wings are short: they may stop a little short of the hips and sit just at the back's top line)
    const baby = a.g.scale.x < .9, joints3 = {}, goals3 = {};
    for (const w of a.wings) {
      const n = w.name, s = n[0];
      Object.assign(joints3, {[`${n}.y`]: [-1.8, 1.8], [`${n}.x`]: [-.6, .6], [`${n}_inner.x`]: [-1.8, 1.8], [`${n}_inner.y`]: [-1.8, 1.8], [`${n}_inner.z`]: [-1.8, 1.8]});
      pose[`${n}_inner`] = {...(pose[`${n}_inner`] || {}), s: wingFold(w.userData.inner)};
      goals3[n + 'Over'] = overLine([`wingwrist:${s}`, `wingtip:${s}`], () => backTop() + (baby ? -u(.01) : u(.02)), {weight: 2});
      goals3[n + 'Wrist'] = goal.above(`wingwrist:${s}`, P.withers().y);
      goals3[n + 'Tip'] = behind(`wingtip:${s}`, has('hip:l') ? (() => P[`hip:${s === 'l' ? 'l' : 'r'}`]()) : P.rump, baby ? -u(.08) : u(.02));
      goals3[n + 'Close'] = inward(P[`wingtip:${s}`], u(.22));
      goals3[n + 'WristIn'] = inward(P[`wingwrist:${s}`], u(.2));
    }
    // (the fold can settle with the wings held out to the side; try it from a few starts, swept back either way)
    const start = pose, tries = [];
    for (const sweep of [0, 1, -1]) {
      pose = JSON.parse(JSON.stringify(start));
      for (const w of a.wings) pose[w.name] = {...(pose[w.name] || {}), y: sweep * (w.userData.side || 1) * .9};
      run('wings', joints3, goals3, {iterations: 80});
      tries.push({pose, worst: Math.max(0, ...Object.values(goals3).flatMap(g => [g(P)].flat(2).map(Math.abs)))});
      if (tries.at(-1).worst < .01) break;
    }
    pose = tries.reduce((p, q) => q.worst < p.worst ? q : p).pose; apply(pose);
  }

  // 4. the tail, laid round the body on the floor toward the face (the cat's wrap)
  if (!serpent && tail.length) {
    const outline = [...skin(), ...legs.map(l => P[`paw:${l[0]}${/fore/.test(l) ? 'f' : 'h'}`]())];
    const face = P.chin();
    const t = wrapTail({pose, apply, P, tail, outline, paws: new THREE.Vector2(face.x, face.z), gap: u(SLEEP.tailGap), lie: k => tailUnder[k] + u(.015), scale: S, drop: u(SLEEP.tailDrop), bend: [-1, 1], iterations: 400});
    pose = t.pose; report.tail = t.report; named.tail = () => tail.slice(1).map((b, k) => b.getWorldPosition(new THREE.Vector3()).distanceTo(t.targets[k + 1]));
  }
  // 5. settle: the legs, the tail (and a serpent's spine) eased together so nothing at all is through the
  // floor, every goal so far still held (a dense look at the skin this time)
  {
    // (every second vertex, or every one for a many-headed dragon, whose heads crowd the floor)
    const dense = samples(a, {every: extra.length ? 1 : 2}), joints5 = {};
    for (const b of [...tail, ...spine]) if (b !== tail.at(-1)) for (const ax of ['x', 'y', 'z']) joints5[`${b.name}.${ax}`] = [(pose[b.name]?.[ax] || 0) - .3, (pose[b.name]?.[ax] || 0) + .3];
    for (const l of legs) { for (let i = 0; j[l + i]; i++) joints5[`${l}${i}.x`] = [(pose[l + i]?.x || 0) - .3, (pose[l + i]?.x || 0) + .3]; joints5[`${l}0.z`] = [(pose[l + '0']?.z || 0) - .3, (pose[l + '0']?.z || 0) + .3]; }
    // (and the necks, which nothing since the head stage has eased out of the floor)
    for (const nk of [neck, ...extra.map(e => e.neck)]) for (const b of nk) for (const ax of ['x', 'y']) joints5[`${b.name}.${ax}`] = [(pose[b.name]?.[ax] || 0) - .2, (pose[b.name]?.[ax] || 0) + .2];
    run('settle', joints5, {...named, floor: goal.clear(dense, {y: u(.004), weight: 3})}, {iterations: 80, rest: .02});
  }
  apply(pose);
  const worst = Math.max(0, ...Object.values(named).flatMap(g => [g(P)].flat(2).map(Math.abs)));
  return {pose, report, named, worst, variant};
  }
}
