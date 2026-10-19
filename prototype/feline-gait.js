// The step: a cat's walk and trot built from its footfalls, after the measurements in
// cat-motion/README.md, instead of from looping clips.
//
// Lengths and speeds are in hip heights (h, the hip joint's height off the floor at rest), the
// way gait scales between animals of different builds: a real cat's hip is 0.23 m up, so its calm
// walk of 0.65 m/s is 2.8 h/s, its trot begins near 1 m/s (4.6 h/s) and its gallop near 2.1 m/s.
// - A phase clock runs the four legs in the cat's order (left hind, left fore, right hind, right
//   fore). The fore paw lands `diagonality` of a stride after the hind paw on its side: a quarter
//   in the walk, a half in the trot, sliding between them over trotFrom..trotTo (§1, §2).
// - Speed sets the stride: its length grows with speed (`stride` h at `strideAt` h/s, as
//   speed^strideExp), and a paw's time in the air stays near `swing` seconds whatever the speed,
//   so going faster shortens the time each paw stands, not the swing (§2). A small cat's swing
//   is shorter by the square root of its size.
// - A stride can be no longer than the legs reach: each cat's stance sweep is capped by what its
//   shortest leg covers at `reach` of its length (with the shoulder blade's slide for a foreleg),
//   so a short-legged cat takes more, shorter steps rather than over-reaching.
//   A rig whose legs stand nearly straight (the fox's) has no room to step at all, so while it
//   steps its body carries low enough for the legs to sweep at least `minSweep` h, as an animal
//   walks on flexed legs.
// - A cat's shoulder blade is not fixed to its ribs: it slides forward as the foreleg reaches and
//   back as it pushes, and sinks as the paw takes weight, giving the foreleg much of its step
//   (§4). Each shoulder follows its paw by `scapula` of the paw's reach, up to `scapulaMax` h.
// - A standing paw is pinned to the floor where it landed. A swinging paw travels a low arc
//   (`lift` h, highest `liftPeak` into the swing) to where it will land: ahead of its
//   hip or shoulder by half the distance the body covers while it stands, pulled in toward the
//   midline (`track`), so the paws fall nearly in line as a cat's do (§2, video notes).
// - Each leg is solved from its paw. The hind ankle follows the measured interior-angle curve
//   over the stride (§3) and the knee and hip fall out of where the paw is, so the lab can hold
//   them to the reference; the toes curl through the swing. The fore paw rolls up onto its toes
//   at the end of the stance and the wrist flicks back as it lifts, then the leg reaches out
//   straight before landing (§4, video notes).
// - The body dips twice a stride (`bob` h) as the weight passes over each pair, and the head nods
//   with it (`nod` radians); a cat's head stays steadier than its body, about 1.5 cm and 3 degrees (§5).
// - The gallop (from gallopFrom to gallopTo h/s, about 2 to 2.3 m/s, the trot sliding into it as
//   cats' coordination does) is the same machinery with the gallop's numbers: a near-constant
//   `gallopHz` strides a second (3.1 for an adult) so the stride lengthens with speed, the swing
//   near `gallopSwing` s, the hind paws landing `gallopHind` of a stride apart and the fore pair
//   `gallopFore` apart starting `gallopLead` after the first hind, which leaves one moment a
//   stride with every paw in the air (§1, research/gaits.md). Much of a gallop's reach is the
//   spine: it gathers as the hind paws land (hips forward, back humped) and stretches out by the
//   time the fore paws land (chest forward), `stretch` h each way, so the body covers more ground
//   per stance than the legs sweep (Kim 2014); the body lifts `gallopLift` h in the flight. The
//   tail streams out behind (`gallopTail` radians down from its carriage) and the head reaches
//   forward and lower (`gallopHead`).
// - A stop lets the swinging paws land under the body and lifts no more, so the cat stands on
//   four planted feet before the idle takes over.
import * as THREE from 'three';
import {REFERENCE} from './cat-reference.js';

const LEGS = ['lhind', 'lfore', 'rhind', 'rfore'];
export const STEP = {
  stride: 2, strideAt: 2.8, strideExp: .5, swing: .25, duty: [.25, .8],
  diagonality: [.25, .5], trotFrom: 4, trotTo: 5,
  lift: .07, liftPeak: .4, track: .45, scapula: .5, scapulaMax: .3, scapulaSink: .03, reach: .93, minSweep: .8,
  toeCurl: .4, wristFlick: 1.7, flickPeak: .3, heelLift: .55, heelFrom: .78,
  bob: .045, nod: .025, fadeIn: .15, fadeOut: .3, quickStep: .6,
  gallopFrom: 8.5, gallopTo: 10, gallopHz: 3.1, gallopSwing: .22, gallopHind: .11, gallopFore: .2, gallopLead: .38,
  stretch: .18, arch: .2, gallopLift: .05, gallopTail: .9, gallopHead: .3,
};
const frac = v => v - Math.floor(v), clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
const jerk = v => { v = clamp(v, 0, 1); return v * v * v * (10 + v * (6 * v - 15)); }; // minimum-jerk 0..1
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const ang = v => Math.atan2(v.z, v.y); // a direction's angle in a leg's plane (y up, z forward)
const DEG = Math.PI / 180;

// The stride at `hs` hip heights per second for a cat of `size` (its scale): seconds per stride,
// the share of it each paw stands, when in the stride each paw lands (`offsets`), how much of a
// gallop it is (`gallop`, 0..1) and its spine stretch (`stretch`, h). `sweep` caps how far (in h)
// a paw can travel while it stands; past it the stride shortens (the swing time holds).
export function strideAt(hs, size = 1, sweep = Infinity) {
  const v = Math.max(hs, .1), root = Math.sqrt(size);
  const gallop = smooth((hs - STEP.gallopFrom) / (STEP.gallopTo - STEP.gallopFrom));
  // walk and trot: the stride grows as speed^strideExp; gallop: the stride rate holds
  const walkPeriod = STEP.stride * Math.pow(v / STEP.strideAt, STEP.strideExp) / v, gallopPeriod = root / STEP.gallopHz;
  let period = walkPeriod + (gallopPeriod - walkPeriod) * gallop;
  const swing = (STEP.swing + (STEP.gallopSwing - STEP.swing) * gallop) * root, stretch = STEP.stretch * gallop;
  const dutyOf = p => clamp(1 - swing / p, STEP.duty[0], STEP.duty[1]);
  const diagonality = STEP.diagonality[0] + (STEP.diagonality[1] - STEP.diagonality[0]) * smooth((hs - STEP.trotFrom) / (STEP.trotTo - STEP.trotFrom));
  // each paw's landing in the stride: the walk-trot pattern sliding into the gallop's
  const walk = {lhind: 0, lfore: diagonality, rhind: .5, rfore: .5 + diagonality};
  const run = {lhind: 0, rhind: STEP.gallopHind, lfore: STEP.gallopLead, rfore: STEP.gallopLead + STEP.gallopFore};
  const offsets = {}; for (const k of LEGS) { let d = run[k] - walk[k]; d -= Math.round(d); offsets[k] = frac(walk[k] + d * gallop); }
  // what a paw sweeps while it stands is the body's travel less how far the spine slides its root
  // back over that stance; the least helped leg sets the cap, past which the stride shortens
  // (a stance lasts period - swing, so the stride that just fits is (sweep - slide) / speed + swing)
  const slideOf = d => Math.max(...LEGS.map(k => { const h = k.endsWith('hind'), o = offsets[k]; return rootSlide(h, o + d, stretch) - rootSlide(h, o, stretch); }));
  let duty = dutyOf(period);
  for (let i = 0; i < 4 && v * period * duty + slideOf(duty) > sweep + 1e-9; i++) { period = Math.max(swing * 1.05, (sweep - slideOf(duty)) / v + swing); duty = dutyOf(period); }
  return {length: v * period, period, duty, diagonality, offsets, gallop, stretch};
}
// The spine's state at stride phase u: -1 gathered (as the hind paws land), +1 stretched (as the
// fore paws land), back to gathered by the end of the fore stance.
export function spineAt(u, lead = STEP.gallopLead) {
  const w = u < lead ? u / lead * .5 : .5 + (u - lead) / (1 - lead) * .5;
  return -Math.cos(w * Math.PI * 2);
}
// How far (h) a leg's root sits forward of its rest at stride phase u, from the spine's stretch:
// the hips go back as it stretches, the chest forward.
const rootSlide = (hind, u, stretch) => (hind ? -1 : 1) * stretch * spineAt(frac(u));

// The hind ankle's interior angle (radians) at a leg's phase u, the stance mapped onto the
// reference's stance (paw off at 62%) and the swing onto its swing.
export function ankleAt(u, duty) {
  const c = REFERENCE.hind.curve, off = REFERENCE.hind.off.at, p = u < duty ? u / duty * off : off + (u - duty) / (1 - duty) * (1 - off);
  let i = 0; while (i < c.length - 2 && c[i + 1][0] < p) i++;
  const k = (p - c[i][0]) / (c[i + 1][0] - c[i][0]); return (c[i][3] + (c[i + 1][3] - c[i][3]) * k) * DEG;
}

export function createStepper(rig, actor, opts = {}) {
  const unit = () => opts.scale ? opts.scale() : (actor?.g?.scale.x || 1);
  // the hip height, in the rig's own units (the leg root's height over the toe at rest)
  const hipLocal = (() => { const L = rig.legs.lhind; let y = L.tip.y; for (let i = L.bones.length - 1; i >= 1; i--) y += L.bones[i].position.y; return -y; })();
  const _s = new THREE.Vector3(), hip = () => hipLocal * rig.hips.getWorldScale(_s).x; // in world units
  // each leg's segments at rest, in its own plane: lengths and rest angles
  const legs = {};
  for (const key of LEGS) {
    const leg = rig.legs[key], bones = leg.bones, segs = [...bones.slice(1).map(b => b.position), leg.tip];
    const rest = segs.map(ang);
    legs[key] = {key, leg, bones, hind: key.endsWith('hind'), len: segs.map(s => Math.hypot(s.y, s.z)), rest, restAnkle: Math.PI - Math.abs(wrap(rest[2] - rest[1])), stance: true, plant: null, lift: null, swingFrom: 0, swingTo: 0, sink: 0, q: bones.map(() => new THREE.Quaternion())};
  }
  // Each paw's resting reach ahead of its hip or shoulder (`neutral`) and its leg's drop, in the
  // rig's units; then the crouch and the longest stance sweep the legs allow. A leg is checked over
  // a stance: at each moment its paw is somewhere between landing ahead and lifting behind, a
  // foreleg's shoulder blade has slid after it, and a hind ankle is at the reference's angle for
  // that moment; it fits if every moment is within `reach` of the leg's length. The crouch is the
  // least lowering that fits a minSweep stance; the sweep, the longest stance that fits after it.
  const tri3 = (b, m, A) => Math.sqrt(b * b + m * m - 2 * b * m * Math.cos(A));
  const fits = (L, c, need) => {
    const [a, b, m] = L.len, slide = L.hind ? 0 : STEP.scapulaMax * hipLocal;
    for (let i = 0; i <= 20; i++) {
      const k = i / 20, pawAt = L.neutral + need / 2 - k * need, end = pawAt - L.leg.tip.z, shoulder = L.hind ? 0 : clamp((pawAt - L.neutral) * STEP.scapula, -slide, slide);
      const reach = STEP.reach * (L.hind ? a + tri3(b, m, ankleAt(k * .62, .62)) : a + b);
      if (Math.hypot(end - shoulder, L.drop - c) > reach) return false;
    }
    return true;
  };
  let crouch = 0;
  for (const L of Object.values(legs)) {
    const p = L.leg.tip.clone(); for (let i = L.bones.length - 1; i >= 1; i--) p.add(L.bones[i].position); L.neutral = p.z; L.drop = -p.y + L.leg.tip.y;
    const need = STEP.minSweep * hipLocal;
    let lo = 0, hi = L.drop; if (!fits(L, 0, need)) { for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (fits(L, mid, need)) hi = mid; else lo = mid; } crouch = Math.max(crouch, hi); }
  }
  let lo = STEP.minSweep, hi = 3;
  for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (Object.values(legs).every(L => fits(L, crouch, mid * hipLocal))) lo = mid; else hi = mid; }
  const sweep = lo; // in h
  const st = {phase: 0, weight: 0, go: false, stopping: false, settled: true, vel: new THREE.Vector3(), last: null, stride: strideAt(1), gait: 'walk'};
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _qz = new THREE.Quaternion(), _qx = new THREE.Quaternion();
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1), UP = new THREE.Vector3(0, 1, 0);
  const top = () => actor?.g || rig.hips.parent;
  const tipOf = (L, out) => { const e = L.bones[L.bones.length - 1]; return out.copy(L.leg.tip).applyMatrix4(e.matrixWorld); };
  const floorY = () => top().getWorldPosition(_c).y;
  // the body's heading on the floor: the hips' forward axis, flattened
  const heading = out => { rig.hips.getWorldQuaternion(_q); out.copy(Z).applyQuaternion(_q); out.y = 0; return out.lengthSq() > 1e-8 ? out.normalize() : out.set(0, 0, 1); };

  // Where a paw lands if its swing ends `ahead` seconds from now.
  function landing(L, ahead, out) {
    const root = L.bones[0], mid = L.hind ? rig.hips : rig.chest, F = heading(new THREE.Vector3());
    // from the shoulder's rest, not where its blade has slid to, or the paw would chase the blade
    if (L.rootRest) { root.parent.updateWorldMatrix(true, false); out.copy(L.rootRest).applyMatrix4(root.parent.matrixWorld); } else root.getWorldPosition(out);
    mid.getWorldPosition(_a);
    // pull in toward the midline: keep `track` of the root's sideways offset from the spine
    // (a stopping cat sets its paws down at their own width, ready for the idle)
    _b.subVectors(out, _a); const side = _b.dot(_c.crossVectors(UP, F).normalize()); out.addScaledVector(_c, -side * (1 - (st.stopping ? 1 : STEP.track)));
    // the neutral reach (where the paw sits under the leg at rest), then the lead into the stance
    // the root's travel over the stance is the body's, plus the spine's slide of that root; the paw
    // lands half of it ahead, from where the root will be when it lands
    const s = st.stride, land = st.phase + ahead / s.period, k = hip(), slideNow = rootSlide(L.hind, st.phase, s.stretch);
    const slideOn = rootSlide(L.hind, land, s.stretch), slideOff = rootSlide(L.hind, land + s.duty, s.stretch);
    const lead = st.stopping ? 0 : (s.length * s.duty + slideOff - slideOn) * k / 2;
    out.addScaledVector(F, L.neutral * rig.hips.getWorldScale(_b).x + lead + (slideOn - slideNow) * k).addScaledVector(st.vel, ahead); out.y = floorY();
    return out;
  }

  // Solves one leg so its toe tip is at `T` (world), the paw pointing `pitch` radians from its
  // rest direction (positive turns it back), the hind ankle at interior angle `ankle`. Writes the
  // bones' quaternions blended by `w` over what is there.
  function solve(L, T, pitch, ankle, w) {
    const R = L.bones[0], P = R.parent; P.updateWorldMatrix(true, false);
    _m.copy(P.matrixWorld).invert();
    if (!L.hind) {
      // the shoulder blade follows the paw fore and aft, and sinks while the paw bears weight
      if (!L.rootRest) L.rootRest = R.position.clone();
      const along = _a.copy(T).applyMatrix4(_m).z - L.rootRest.z - L.neutral, max = STEP.scapulaMax * hipLocal;
      L.sink += ((L.stance ? 1 : 0) - L.sink) * Math.min(1, st.dt * 12);
      R.position.set(L.rootRest.x, L.rootRest.y - L.sink * STEP.scapulaSink * hipLocal * w, L.rootRest.z + clamp(along * STEP.scapula, -max, max) * w);
    }
    const t = _a.copy(T).applyMatrix4(_m).sub(R.position);
    // the paw's direction: its rest direction in the body's heading frame, turned by `pitch`, in the parent's frame
    P.getWorldQuaternion(_qi); _qi.invert();
    const F = heading(new THREE.Vector3()), restAng = L.rest[L.rest.length - 1] + pitch;
    const pawDir = new THREE.Vector3().copy(UP).multiplyScalar(Math.cos(restAng)).addScaledVector(F, Math.sin(restAng)).applyQuaternion(_qi);
    // swing the leg's plane about z so it holds the paw, then work in (y, z): the paw hinges in that
    // plane too, so its direction is the wanted one laid into the plane (a few rounds settle it)
    const pawLen = L.len[L.len.length - 1], E = new THREE.Vector3(), flat = new THREE.Vector3();
    let psi = Math.atan2(t.x, -t.y), unz = new THREE.Quaternion();
    for (let i = 0; i < 3; i++) {
      _qz.setFromAxisAngle(Z, psi); unz.copy(_qz).invert();
      flat.copy(pawDir).applyQuaternion(unz); flat.x = 0; flat.normalize().applyQuaternion(_qz);
      E.copy(t).addScaledVector(flat, -pawLen); psi = Math.atan2(E.x, -E.y);
    }
    _qz.setFromAxisAngle(Z, psi); unz.copy(_qz).invert();
    E.applyQuaternion(unz); pawDir.copy(flat).applyQuaternion(unz);
    const a = L.len[0], d = Math.max(1e-6, Math.hypot(E.y, E.z)), phiE = Math.atan2(E.z, E.y), dirs = [];
    const tri = (p, q, r) => Math.acos(clamp((p * p + q * q - r * r) / (2 * p * q), -1, 1)); // angle between p and q, opposite r
    if (L.hind) {
      // the shin and the metatarsus held at the ankle's angle make one link from the knee to the paw's ball
      const b = L.len[1], m = L.len[2], c2 = Math.sqrt(b * b + m * m - 2 * b * m * Math.cos(ankle));
      const dd = Math.min(d, (a + c2) * .9995), d0 = phiE - tri(a, dd, c2); L.reach = d / (a + c2); // the knee forward
      const K = new THREE.Vector3(0, a * Math.cos(d0), a * Math.sin(d0)), KE = new THREE.Vector3().subVectors(E, K);
      const d1 = ang(KE) + tri(b, c2, m); // the hock behind the knee-to-ball line
      const H = new THREE.Vector3(0, K.y + b * Math.cos(d1), K.z + b * Math.sin(d1));
      dirs.push(d0, d1, ang(new THREE.Vector3().subVectors(E, H)), ang(pawDir));
    } else {
      const b = L.len[1], dd = Math.min(d, (a + b) * .9995), d0 = phiE + tri(a, dd, b); L.reach = d / (a + b); // the elbow back
      const El = new THREE.Vector3(0, a * Math.cos(d0), a * Math.sin(d0));
      dirs.push(d0, ang(new THREE.Vector3().subVectors(E, El)), ang(pawDir));
    }
    let prev = 0;
    dirs.forEach((dir, i) => { const abs = wrap(dir - L.rest[i]), th = wrap(abs - prev); prev = abs; _qx.setFromAxisAngle(X, th); if (i === 0) _qx.premultiply(_qz); L.bones[i].quaternion.slerp(_qx, w); L.q[i].copy(L.bones[i].quaternion); });
    L.wrote = true;
  }

  // Moves a bone `value` along an axis from where the mixer left it. The mixer rewrites a position
  // only while a clip that moves it plays, so a value still holding last frame's write is put back
  // first, and the offset never piles up.
  const wrote = new Map();
  function offset(bone, axis, value) {
    const key = bone.name + axis, last = wrote.get(key);
    if (last && bone.position[axis] === last.at) bone.position[axis] -= last.by;
    bone.position[axis] += value; wrote.set(key, {at: bone.position[axis], by: value});
  }

  // Per frame, after the mixer has posed the body. `go`: the pet is stepping; `speed` its speed
  // (world units per second); `release`: another gait (the gallop) is taking the legs, so let go of
  // them at once instead of finishing the steps. Returns the gait's state for the animator.
  function update(dt, go, speed, release = false) {
    const g = top(); g.updateMatrixWorld(true);
    const pos = g.getWorldPosition(new THREE.Vector3());
    if (st.last && dt > 0) { _a.subVectors(pos, st.last).divideScalar(dt); _a.y = 0; st.vel.lerp(_a, 1 - Math.exp(-dt * 12)); }
    st.last = (st.last || new THREE.Vector3()).copy(pos);
    st.dt = dt; const hs = speed / hip();
    if (go && !st.go) start();
    if (!go && st.go) st.stopping = true;
    if (release) { st.stopping = false; st.settled = true; }
    st.go = go;
    if (st.go || !st.settled) {
      // the clock: a stride's worth of phase per stride
      st.stride = strideAt(st.stopping ? Math.max(hs, 1.2) : hs, unit(), sweep);
      st.gait = st.stride.gallop > .5 ? 'gallop' : st.stride.diagonality > .375 ? 'trot' : 'walk';
      if (go || st.stopping) st.phase += dt / st.stride.period;
    }
    st.weight = clamp(st.weight + (st.go || !st.settled ? dt / STEP.fadeIn : -dt / STEP.fadeOut), 0, 1);
    // a leg bone still holding what the step wrote last frame was not posed by the mixer this frame
    // (only the idle plays, and it leaves the legs alone): it starts again from rest, so the step
    // blends over the pose underneath and fades back to it
    // Over a leg at rest the step fades in by what it asks of the leg (the ankle's angle, the paw's
    // pitch), solving exactly each frame, so a planted paw stays put through the fade; over a pose
    // the mixer gives the legs (a pounce, the sit) it blends by rotation instead.
    for (const L of Object.values(legs)) { L.bones.forEach((b, i) => { if (L.wrote && b.quaternion.equals(L.q[i])) b.quaternion.identity(); }); L.fromRest = L.bones.every(b => Math.abs(b.quaternion.w) > 1 - 1e-9); }
    if (st.weight <= 0) {
      offset(rig.hips, 'y', 0); offset(rig.hips, 'z', 0); offset(rig.spine, 'y', 0); offset(rig.spine, 'z', 0);
      for (const L of Object.values(legs)) { L.plant = null; L.leg.plant = null; L.wrote = false; if (L.rootRest) L.bones[0].position.copy(L.rootRest); }
      return state();
    }
    // the body: in the walk and trot two small dips a stride, as the weight passes over each pair;
    // in the gallop the spine gathers and stretches (hips and chest sliding apart, the back humping
    // when gathered) and the body lifts in the flight
    const moving = st.go || !st.settled, s0 = st.stride, gal = s0.gallop, w = st.weight;
    // the flight: from the last fore paw lifting to the first hind paw landing, when no paw is down
    const spine = moving ? spineAt(frac(st.phase)) : 0, airFrom = s0.offsets.rfore + s0.duty, u0 = frac(st.phase);
    const flight = airFrom < 1 && u0 > airFrom ? Math.sin(Math.PI * (u0 - airFrom) / (1 - airFrom)) : 0;
    const dip = moving ? STEP.bob * (.5 - .5 * Math.cos(st.phase * Math.PI * 4)) * (1 - gal) - STEP.gallopLift * flight * gal : 0;
    offset(rig.hips, 'y', -(dip + crouch / hipLocal) * hipLocal * w);
    offset(rig.hips, 'z', -s0.stretch * spine * hipLocal * w);
    offset(rig.spine, 'z', 2 * s0.stretch * spine * hipLocal * w);
    const a = moving ? STEP.arch * gal * -spine * w : 0;
    // the hump bends the back at the spine; lowering the spine by what the bend lifts the chest keeps the shoulders where the legs expect them
    offset(rig.spine, 'y', -rig.chest.position.z * Math.sin(a));
    if (moving && gal > 0) {
      rig.spine.quaternion.multiply(_qx.setFromAxisAngle(X, -a)); rig.chest.quaternion.multiply(_qx.setFromAxisAngle(X, a));
      // (the tail and neck clips and the turn code write those bones fresh each frame)
      rig.tail.forEach((b, i) => b.quaternion.multiply(_qx.setFromAxisAngle(X, -(i ? STEP.gallopTail * .15 : STEP.gallopTail) * gal * w)));
      rig.neck.quaternion.multiply(_qx.setFromAxisAngle(X, STEP.gallopHead * gal * w));
    }
    // and the head nods a little with the walk (the neck is written fresh each frame by the turn code)
    if (moving) rig.neck.quaternion.multiply(_qx.setFromAxisAngle(X, STEP.nod * Math.sin(st.phase * Math.PI * 4) * (1 - gal) * w));
    g.updateMatrixWorld(true);
    const s = st.stride, off = s.offsets, swingS = s.period * (1 - s.duty);
    let standing = 0;
    for (const L of Object.values(legs)) {
      // a leg's phase u: its paw lands at 0 and lifts at duty. It lifts as u crosses duty, swings
      // until an end set when it lifted (where its next landing falls in the stride, or a quick step
      // when it had to step early), and then stands until it crosses duty again.
      const u = frac(st.phase - off[L.key]), crossed = L.lastU !== undefined && L.lastU < s.duty && u >= s.duty && u - L.lastU < .5; L.lastU = u;
      if (!L.plant) { L.plant = tipOf(L, new THREE.Vector3()); L.plant.y = floorY(); L.stance = true; }
      // (an early step ends at the leg's own next landing, so it falls back into the gait's rhythm,
      // unless that is far off: then it is a quick step)
      const lift = quick => { if (quick) L.forced = (L.forced || 0) + 1; L.stance = false; L.lift = L.plant.clone(); L.swingFrom = st.phase; L.swingTo = st.phase + (quick && 1 - u > 1.6 * (1 - s.duty) ? STEP.quickStep * (1 - s.duty) : 1 - u); };
      if (L.stance && (crossed || L.late) && !st.stopping && st.go) { L.late = false; lift(false); }
      else if (!L.stance && st.phase >= L.swingTo) { L.stance = true; landing(L, 0, L.plant); }
      let pitch = 0, T = L.plant;
      const ankle = L.hind ? ankleAt(L.stance ? Math.min(u, s.duty) : Math.max(u, s.duty), s.duty) : 0;
      if (L.stance) {
        standing++;
        // the fore paw rolls up onto its toes at the end of the stance
        if (!L.hind && st.go && !st.stopping) pitch = -STEP.heelLift * smooth((u / s.duty - STEP.heelFrom) / (1 - STEP.heelFrom));
      } else {
        const k = clamp((st.phase - L.swingFrom) / Math.max(1e-6, L.swingTo - L.swingFrom), 0, 1);
        const land = landing(L, (L.swingTo - st.phase) * s.period, new THREE.Vector3()), h = STEP.lift * hip();
        T = new THREE.Vector3().lerpVectors(L.lift, land, jerk(k)); T.y += h * Math.sin(Math.PI * Math.pow(k, Math.log(.5) / Math.log(STEP.liftPeak)));
        // the toes curl and the wrist flicks back, then the paw reaches out flat to land
        pitch = L.hind ? STEP.toeCurl * Math.sin(Math.PI * k) : STEP.wristFlick * Math.sin(Math.PI * clamp(k / (2 * STEP.flickPeak), 0, 1));
      }
      const k = L.fromRest ? st.weight : 1;
      solve(L, T, pitch * k, L.hind ? L.restAnkle + (ankle - L.restAnkle) * k : 0, L.fromRest ? 1 : st.weight);
      L.leg.plant = L.stance ? L.plant : null; L.leg.ik = {reach: L.reach, stance: L.stance, forced: L.forced || 0};
      // a planted paw the leg can no longer reach (a teleport, a shove, a change of gait) steps at once
      if (L.stance && L.reach > 1 && st.go && !st.stopping) lift(true);
    }
    if (st.stopping && standing === 4) { st.settled = true; st.stopping = false; }
    return state();
  }
  function start() {
    st.stopping = false; st.settled = false;
    // begin with the left hind about to lift, every paw standing where it is
    const s = strideAt(2.8, unit(), sweep); st.phase = s.duty;
    // (a paw whose turn in the stride has already come lifts at once)
    for (const L of Object.values(legs)) { L.stance = true; L.plant = null; const u = frac(st.phase - s.offsets[L.key]); L.lastU = u - 1e-6; L.late = u > s.duty; }
  }
  function state() { return {hip: hip(), sweep, crouch: crouch / hipLocal, weight: st.weight, gait: st.gait, phase: st.phase, duty: st.stride.duty, period: st.stride.period, diagonality: st.stride.diagonality, stepping: st.go || !st.settled}; }
  return {update, legs, state, hip, get weight() { return st.weight; }};
}
