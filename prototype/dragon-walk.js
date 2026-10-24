// The dragon's walk, after a monitor lizard's (CREATURE-MEASURES.md, "Monitor lizard"): the legs step in
// diagonal pairs (the left fore with the right hind), the trunk swings from side to side with each stride,
// the tail's base swings the opposite way to the hips with its curve unchanged, and the neck holds the head
// steady: level against the body's bob, its yaw about a sixth of the trunk's (a running lizard's head turns
// 4.76° to its trunk's 27°). A serpent (a spine and no legs) sends a wave down its spine and tail instead.
//
// Called from updateDragonMenace (dragon-menace.js) after live.js has written the frame's leg swing and body
// bob. It blends in and out with `walking`, and every write is an offset taken back first thing next frame
// unless something else rewrote the value since (live.js writes the legs and the bob afresh every frame), so
// a dragon that stops is exactly back where it was.
import {DRAGON} from './creature-measures.js';

// rate: stride phase speed (rad/s; one cycle is a step with each diagonal pair); trunk: how far the trunk
// yaws either side (radians: the trunk is one rigid body here, so it swings less than a lizard's single
// trunk segment, 27°); headSteady: the head's yaw against the trunk's (from the lizard); tail: how far the
// tail's base yaws past the hips the other way, as a share of the trunk's swing (1: the tail swings as far
// as the trunk, opposite); stride: the legs' swing (radians); lift: the knee's bend as a foot swings
// forward; blend: how fast the walk blends in
// and out (1/s). A serpent's wave: wave (radians a joint), waveLength (joints per wave).
export const WALK = {rate: 8, trunk: .14, headSteady: DRAGON.headSteady, tail: 1, stride: .3, lift: .45, blend: 6, wave: .16, waveLength: 9};

const DIAGONAL = {lfore: 0, rhind: 0, rfore: Math.PI, lhind: Math.PI};

// The neck root carrying each head: head on neck0, head_1 on neck_2_0, ...
const neckRoot = (a, head) => { const k = /^head_(\d+)$/.exec(head.name); return a.joints[k ? `neck_${+k[1] + 1}_0` : 'neck0']; };

// A point's height in the dragon's group frame (local matrices only, so it doesn't need world matrices).
function heightIn(o, g) {
  let x = 0, y = 0, z = 0, first = true;
  for (let p = o; p && p !== g; p = p.parent) {
    p.updateMatrix(); const e = p.matrix.elements;
    if (first) { x = e[12]; y = e[13]; z = e[14]; first = false; continue; }
    const nx = e[0] * x + e[4] * y + e[8] * z + e[12], ny = e[1] * x + e[5] * y + e[9] * z + e[13], nz = e[2] * x + e[6] * y + e[10] * z + e[14];
    x = nx; y = ny; z = nz;
  }
  return y;
}

export function takeBackWalk(st) {
  // (back to exactly the value found, not by subtracting, so the layers under it see their own value again)
  for (let i = st.written.length - 1; i >= 0; i--) { const w = st.written[i]; if (w.o[w.k] === w.left) w.o[w.k] = w.was; }
  st.written.length = 0;
}

// One frame of the walk. Returns {w (the walk's blend), phase, yaw (the trunk's yaw this frame)}.
export function updateDragonWalk(a, st, dt, walking) {
  st.w += ((walking ? 1 : 0) - st.w) * (1 - Math.exp(-WALK.blend * dt));
  if (st.w < 1e-4) { st.w = 0; return {w: 0, phase: st.ph, yaw: 0}; }
  if (walking) st.ph += dt * WALK.rate;
  const w = st.w, ph = st.ph, j = a.joints, S = a.g.scale.x || 1;
  const add = (o, k, d) => { if (!d) return; const was = o[k]; o[k] += d; st.written.push({o, k, left: o[k], was}); };
  // the trunk swings with the stride (a serpent's front stays on its heading; its wave does the swinging)
  const serpent = !!j.spine0, yaw = serpent ? 0 : WALK.trunk * Math.sin(ph) * w;
  add(a.body.rotation, 'y', yaw);
  const rest = a.jointRest?.body?.y ?? 0;
  // the legs in diagonal pairs, the knee bent as the foot swings forward
  const feet = st.feet ??= restFeet(a);
  for (const leg of a.legs || []) {
    const off = DIAGONAL[leg.name] ?? 0, s = Math.sin(ph + off);
    add(leg.rotation, 'x', (WALK.stride * s - leg.rotation.x) * w);
    const knee = j[leg.name + '1']; if (knee) add(knee.rotation, 'x', WALK.lift * Math.max(0, Math.cos(ph + off)) * w * (/fore/.test(leg.name) ? -1 : 1));
  }
  // the body rides as high as its planted feet hold it: the lowest foot stays on the floor (over whatever bob
  // the frame wrote), so it rises and falls a little with each footfall
  if (!serpent && feet.length) {
    const by = a.body.position.y; a.body.position.y = rest;
    const drop = Math.min(...feet.map(f => heightIn(f.bone, a.g) - f.y));
    a.body.position.y = by;
    add(a.body.position, 'y', (rest - drop / S - by) * w);
  }
  // the tail's base swings the other way to the hips, its curve unchanged (the bend is all at the base)
  if (j.tail0 && !serpent) add(j.tail0.rotation, 'y', -(1 + WALK.tail) * yaw);
  // a serpent's wave runs back down its spine and tail
  if (serpent) { const n = countOf(j, 'spine'); for (const p of ['spine', 'tail']) for (let i = 0; j[p + i]; i++) add(j[p + i].rotation, 'y', WALK.wave * Math.sin(ph - (p === 'spine' ? i : n + i) * 2 * Math.PI / WALK.waveLength) * w); }
  // the heads held steady: each neck turns back most of the trunk's yaw and pitches to hold its head at the
  // height it would stand at without the bob, the head pitched back the same so the face stays level
  for (const head of a.heads || []) {
    const root = neckRoot(a, head); if (!root) continue;
    add(root.rotation, 'y', -(1 - WALK.headSteady) * yaw);
    const by = a.body.position.y; a.body.position.y = rest; const level = heightIn(head, a.g); a.body.position.y = by;
    // (two Newton steps on the neck root's pitch; the trial values are put back exactly before the write)
    const x0 = root.rotation.x;
    let tilt = 0;
    for (let it = 0; it < 2; it++) {
      root.rotation.x = x0 + tilt; const y0 = heightIn(head, a.g);
      root.rotation.x = x0 + tilt + 1e-3; const dy = (heightIn(head, a.g) - y0) / 1e-3;
      if (Math.abs(dy) < 1e-6) break;
      tilt += (level - y0) / dy;
    }
    root.rotation.x = x0; add(root.rotation, 'x', tilt); add(head.rotation, 'x', -tilt);
  }
  return {w, phase: ph, yaw};
}
// Each leg's last bone and its height standing (legs straight down, the body at rest), in the group's frame.
function restFeet(a) {
  const j = a.joints, saved = [], rest = a.jointRest?.rest || {};
  const set = (o, k, v) => { saved.push([o, k, o[k]]); o[k] = v; };
  set(a.body.position, 'y', a.jointRest?.body?.y ?? 0);
  const out = [];
  for (const leg of a.legs || []) {
    set(leg.rotation, 'x', 0);
    let n = 0; while (j[leg.name + n]) { const b = j[leg.name + n]; if (rest[b.name]) set(b.rotation, 'x', rest[b.name].x); n++; }
    if (n) out.push({bone: j[leg.name + (n - 1)]});
  }
  for (const f of out) f.y = heightIn(f.bone, a.g);
  for (let i = saved.length - 1; i >= 0; i--) { const [o, k, v] = saved[i]; o[k] = v; }
  return out;
}
const countOf = (j, p) => { let n = 0; while (j[p + n]) n++; return n; };
