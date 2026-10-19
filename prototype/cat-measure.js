// Measures the skinned cat's motion against the reference numbers in cat-motion/README.md.
// simulateGait runs the real animator at a steady speed and records every frame; analyseGait
// turns the recording into footfalls, duty factors, joint angles, head travel and foot slip;
// measurePose does the same for a held pose (the sit). tools/cat-lab.html draws all of it, and
// the tests can hold the numbers to the reference.
import * as THREE from 'three';
import {createSkinnedFeline} from './feline-skin.js';

// The reference cat (cat-motion/README.md): an adult of ~4 kg, head-and-body 0.48 m.
// Ranges are [low, high]; `src` names the section of the README they come from.
export const REFERENCE = {
  bodyLength: .48,
  walk: {
    speedBL: [1.3, 1.4], strideBL: [.92, 1.02], strideHz: [1.2, 1.4], swingS: [.2, .3], duty: [.55, .7], diagonality: [.2, .3],
    headTravelCm: [1, 2], headPitchDeg: [2, 4], headBobsPerStride: 2, plantedCm: [-.3, .5], lowestCm: [-.3, 0], src: '§2, §3, §5',
  },
  // interior angles (degrees) of the hind leg at paw contact, paw off and peak swing flexion (§3)
  hind: {
    contact: {hip: 92, knee: 115, ankle: 115}, off: {hip: 135, knee: 120, ankle: 139, at: .62},
    flex: {hip: [91, 8, .9], knee: [98, 9, .8], ankle: [102, 9, .8]}, // [mean, sd, phase]
    // research/hindlimb.md §1c: CONSTRUCTED between the anchors, not measured
    curve: [[0, 92, 115, 115], [.1, 100, 108, 108], [.2, 110, 107, 108], [.3, 118, 110, 115], [.4, 125, 114, 125], [.5, 131, 118, 133], [.62, 135, 119.5, 139], [.7, 115, 105, 115], [.8, 100, 98, 102], [.9, 91, 108, 110], [1, 92, 115, 115]],
  },
  gaits: {walk: [0, 2.1], trot: [2.5, 4.2], gallop: [4.4, 12.7]}, // body lengths per second (§1)
};
export const LEGS = ['lhind', 'lfore', 'rfore', 'rhind'];
// the toe tip below each leg's last bone (feline-skin.js builds the joints; the tip has no bone)
const TIP = {fore: new THREE.Vector3(0, -.035, .02), hind: new THREE.Vector3(0, -.03, .015)};
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const angleAt = (a, b, c) => { const u = v3().subVectors(a, b), w = v3().subVectors(c, b); return THREE.MathUtils.radToDeg(u.angleTo(w)); };

// Head-and-body length of a cat in world units: from the tail root to the tip of the nose.
export function bodyLength(cat) {
  cat.g.updateMatrixWorld(true);
  const geo = cat.fur.geometry; if (!geo.boundingBox) geo.computeBoundingBox();
  const box = geo.boundingBox, tail = cat.rig.tail[0].getWorldPosition(v3());
  const nose = v3(0, 0, box.max.z).applyMatrix4(cat.fur.matrixWorld);
  return Math.hypot(nose.x - tail.x, nose.z - tail.z);
}

function bonesOf(cat) { const out = []; cat.body.traverse(o => { if (o.isBone) out.push(o); }); return out; }
// one frame of every bone's local pose, so a page can play the recording back exactly
function snapshot(bones, root) {
  const a = new Float32Array(bones.length * 7 + 1);
  bones.forEach((b, i) => { b.quaternion.toArray(a, i * 7); b.position.toArray(a, i * 7 + 4); });
  a[bones.length * 7] = root.rotation.y; return a;
}
export function applySnapshot(cat, bones, a) {
  bones.forEach((b, i) => { b.quaternion.fromArray(a, i * 7); b.position.fromArray(a, i * 7 + 4); });
  cat.body.rotation.y = a[bones.length * 7];
}

// Probe points of one frame: toe tips, the left hind leg's joints, the head.
function probe(cat) {
  cat.g.updateMatrixWorld(true);
  const tips = LEGS.map(k => { const bs = cat.rig.legs[k].bones, e = bs[bs.length - 1]; return TIP[k.endsWith('fore') ? 'fore' : 'hind'].clone().applyMatrix4(e.matrixWorld); });
  const lh = cat.rig.legs.lhind.bones, j = lh.map(b => b.getWorldPosition(v3()));
  const back = [cat.rig.hips.getWorldPosition(v3()), cat.rig.chest.getWorldPosition(v3())];
  const hq = cat.rig.head.getWorldQuaternion(new THREE.Quaternion()), fwd = v3(0, 0, 1).applyQuaternion(hq);
  return {
    tips: tips.map(p => p.toArray()), head: cat.rig.head.getWorldPosition(v3()).toArray(), headPitch: -THREE.MathUtils.radToDeg(Math.asin(Math.max(-1, Math.min(1, fwd.y)))), // nose down is positive
    // the hip as the thigh against the back line (pelvis to chest): the pelvis itself has no bone,
    // so compare its swing, not its absolute value, with the reference
    hip: angleAt(v3().addVectors(j[0], v3().subVectors(back[1], back[0])), j[0], j[1]),
    knee: angleAt(j[0], j[1], j[2]), ankle: angleAt(j[1], j[2], j[3]), mtp: angleAt(j[2], j[3], TIP.hind.clone().applyMatrix4(lh[3].matrixWorld)),
  };
}

// Runs the cat forward (+x) at `bl` body lengths per second for `seconds` after a settling
// `warm`, through the same animator update the game calls, and records every `dt`.
export function simulateGait({name = 'kitten', bl = 1.35, seconds = 6, warm = 1.5, dt = 1 / 120, hull = true, cat = null} = {}) {
  cat = cat || createSkinnedFeline(name, undefined, {hull});
  cat.g.rotation.y = Math.PI / 2; cat.g.position.set(0, 0, 0);
  const L = bodyLength(cat), speed = bl * L, bones = bonesOf(cat), frames = [];
  for (let t = -warm, x = 0; t < seconds; t += dt) {
    x += speed * dt; cat.g.position.x = x; cat.slideSpeed = speed; cat.slidePlan = speed;
    const state = cat.animator.update(dt, true);
    if (t >= 0) frames.push({t, x, state: {gait: state?.gait, timeScale: state?.timeScale}, pose: snapshot(bones, cat.body), ...probe(cat)});
  }
  return {name, bl, speed, dt, bodyLength: L, metresPerUnit: REFERENCE.bodyLength / L, frames, cat, bones};
}

// Footfalls and the rest, from a recording.
export function analyseGait(rec) {
  const {frames, dt, metresPerUnit: m} = rec, cm = 100 * m;
  // a paw stands while it holds still on the floor plane (horizontal speed under a fifth of the
  // body's); its height while it stands, and how low it goes at all, are reported separately
  const contact = LEGS.map((_, i) => frames.map((f, k) => { const a = frames[Math.max(0, k - 1)].tips[i], b = frames[Math.min(frames.length - 1, k + 1)].tips[i], span = (Math.min(frames.length - 1, k + 1) - Math.max(0, k - 1)) * dt; return Math.hypot(b[0] - a[0], b[2] - a[2]) / span < rec.speed * .2; }));
  // a real stance lasts a while: fill gaps and drop blips shorter than ~40 ms
  const short = Math.max(1, Math.round(.04 / dt));
  const runs = c => { const r = []; let k = 0; while (k < c.length) { let e = k; while (e < c.length && c[e] === c[k]) e++; r.push([c[k], k, e]); k = e; } return r; };
  for (const c of contact) for (const want of [false, true]) for (const [on, a, b] of runs(c)) if (on === want && b - a < short && a > 0 && b < c.length) c.fill(!want, a, b);
  const onsets = contact.map(c => c.map((on, k) => on && k > 0 && !c[k - 1] ? k : -1).filter(k => k >= 0));
  const offs = contact.map(c => c.map((on, k) => !on && k > 0 && c[k - 1] ? k : -1).filter(k => k >= 0));
  const lh = onsets[0], periods = lh.slice(1).map((k, i) => (k - lh[i]) * dt), period = periods.length ? periods.reduce((a, b) => a + b) / periods.length : NaN;
  const duty = contact.map((c, i) => { const o = onsets[i]; if (o.length < 2) return NaN; let on = 0; for (let k = o[0]; k < o[o.length - 1]; k++) on += c[k]; return on / (o[o.length - 1] - o[0]); });
  // where each fore paw lands in the cycle of the hind paw on its side
  const lag = (hind, fore) => { const v = []; for (let s = 0; s + 1 < onsets[hind].length; s++) { const a = onsets[hind][s], b = onsets[hind][s + 1], f = onsets[fore].find(k => k >= a && k < b); if (f !== undefined) v.push((f - a) / (b - a)); } return v.length ? v.reduce((p, q) => p + q) / v.length : NaN; };
  const diagonality = (lag(0, 1) + lag(3, 2)) / 2;
  // the order the paws come down in, from the first left hind footfall
  const seq = LEGS.flatMap((k, i) => onsets[i].map(f => [f, k])).sort((a, b) => a[0] - b[0]);
  const start = seq.findIndex(s => s[1] === 'lhind'), order = seq.slice(start, start + 4).map(s => s[1]);
  // a standing paw should rest on the floor (0 cm), and no paw should go through it
  const plantedCm = LEGS.map((_, i) => { const h = frames.filter((f, k) => contact[i][k]).map(f => f.tips[i][1] * cm); return h.length ? h.reduce((p, q) => p + q) / h.length : NaN; });
  const lowestCm = LEGS.map((_, i) => Math.min(...frames.map(f => f.tips[i][1] * cm)));
  const peakSwingCm = LEGS.map((_, i) => Math.max(...frames.map(f => f.tips[i][1] * cm)));
  // per stride of the left hind leg: head travel, and the joint angles on a common phase axis
  const BINS = 50, curve = {hip: new Array(BINS).fill(0), knee: new Array(BINS).fill(0), ankle: new Array(BINS).fill(0)}, travel = [], pitch = [], bobs = [];
  let strides = 0;
  for (let s = 0; s + 1 < lh.length; s++) {
    const a = lh[s], b = lh[s + 1], seg = frames.slice(a, b), hy = seg.map(f => f.head[1]), hp = seg.map(f => f.headPitch);
    travel.push((Math.max(...hy) - Math.min(...hy)) * cm); pitch.push(Math.max(...hp) - Math.min(...hp));
    let peaks = 0; for (let k = 1; k + 1 < hy.length; k++) if (hy[k] > hy[k - 1] && hy[k] >= hy[k + 1]) peaks++; bobs.push(peaks);
    for (let i = 0; i < BINS; i++) { const f = frames[a + Math.round(i / BINS * (b - a))]; for (const j of ['hip', 'knee', 'ankle']) curve[j][i] += f[j]; }
    strides++;
  }
  for (const j of Object.keys(curve)) curve[j] = curve[j].map(v => v / strides);
  const mean = v => v.length ? v.reduce((p, q) => p + q) / v.length : NaN;
  const off = mean(lh.slice(0, -1).map((a, s) => { const k = offs[0].find(x => x > a); return k === undefined ? NaN : (k - a) / (lh[s + 1] - a); }).filter(Number.isFinite));
  return {
    contact, onsets, period, strideHz: 1 / period, strideBL: rec.bl * period, duty, diagonality, order, swingS: period * (1 - duty[0]),
    plantedCm, lowestCm, peakSwingCm, headTravelCm: mean(travel), headPitchDeg: mean(pitch), headBobsPerStride: mean(bobs), curve, pawOff: off, strides,
    speedMs: rec.bl * REFERENCE.bodyLength, gaits: [...new Set(frames.map(f => f.state.gait))],
  };
}

// A held pose (sit, idle, pounce at u): the heights that decide whether it reads as resting.
export function measurePose({name = 'kitten', clip = 'sit', u = .25, hull = true, cat = null} = {}) {
  cat = cat || createSkinnedFeline(name, undefined, {hull});
  cat.g.rotation.y = Math.PI / 2; cat.g.position.set(0, 0, 0);
  const at = (c, uu) => { cat.animator.show(c, uu); cat.g.updateMatrixWorld(true); return cat.rig.legs.lhind.bones[0].getWorldPosition(v3()).y; };
  const stand = at('idle', 0), hip = at(clip, u), m = REFERENCE.bodyLength / bodyLength(cat), p = probe(cat);
  // the lowest point of the skin that belongs to the body (mostly weighted to hips, spine or
  // chest, not a leg): the rump, in a sit
  const fur = cat.fur, geo = fur.geometry, pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, sk = v3(), bones = fur.skeleton.bones; let low = Infinity;
  const trunk = new Set(['hips', 'spine', 'chest'].map(n => bones.findIndex(b => b.name === n)));
  for (let i = 0; i < pos.count; i++) {
    let w = 0; for (let c = 0; c < 4; c++) if (trunk.has(si.getComponent(i, c))) w += sw.getComponent(i, c);
    if (w < .6) continue; fur.getVertexPosition(i, sk); sk.applyMatrix4(fur.matrixWorld); if (sk.y < low) low = sk.y;
  }
  return {
    clip, u, hipCm: hip * 100 * m, standHipCm: stand * 100 * m, hipRatio: hip / stand, lowestBodyCm: low * 100 * m,
    pawsCm: p.tips.map(t => t[1] * 100 * m), knee: p.knee, ankle: p.ankle, hip: p.hip, headPitch: p.headPitch,
  };
}
