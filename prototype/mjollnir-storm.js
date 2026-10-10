import * as THREE from 'three';
import {HEAD_Y} from './mjollnir.js';
import {softRing, softDot} from './fx-textures.js';

// Mjollnir's storm, in two parts.
//
// The crackle: while wielded, short jagged arcs keep jumping between points on the head (the
// striking faces, the block corners, the collar rings) and now and then run down the haft or leap
// off a face into the air and fork. The runes flicker with them. After a strike it all surges.
//
// The strike: "The massive hammer hits!  Lightning strikes the jackal!" brings a forked bolt down
// out of the dark onto the target. It lands with a white flash, a ring of light across the floor
// and a burst of sparks, flickers twice more like real lightning and is gone in under half a second.
//
// Both draw additive, untone-mapped light brighter than 1, so the bloom pass gives them their glow.

const ARC_COLOR = new THREE.Color(0xd2ecff).multiplyScalar(3.2);
const BOLT_COLOR = new THREE.Color(0xeaf6ff).multiplyScalar(6);
const SHEATH_COLOR = new THREE.Color(0x7fb8ff).multiplyScalar(2.2);
const light = (color, opacity = 1) => ({color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false});

// Points on the hammer (held frame) the arcs jump between.
const W = .22, H = .088, D = .082;
const HEAD_POINTS = [];
for (const sx of [-1, 1]) {
  HEAD_POINTS.push([sx * (W + .012), HEAD_Y, 0]);
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) HEAD_POINTS.push([sx * W, HEAD_Y + sy * H, sz * D]);
  HEAD_POINTS.push([sx * .1, HEAD_Y + H, 0], [sx * .1, HEAD_Y - H, 0]);
}
HEAD_POINTS.push([0, HEAD_Y, .08], [0, HEAD_Y, -.08], [0, HEAD_Y + .085, 0]);
const HAFT_POINTS = [[0, .38, .03], [0, .14, -.035], [0, -.13, .035]];

// A small seeded random source, so tests can pin the crackle down.
export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// A jagged path from a to b in `n` steps, kicked sideways by up to `jag` of the span.
export function jaggedPath(a, b, n, jag, rand) {
  const pts = [], span = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  for (let i = 0; i <= n; i++) {
    if (i === 0 || i === n) { pts.push([...(i ? b : a)]); continue; }
    const u = i / n, k = i === 0 || i === n ? 0 : jag * span * Math.sin(u * Math.PI);
    pts.push([a[0] + (b[0] - a[0]) * u + (rand() - .5) * 2 * k, a[1] + (b[1] - a[1]) * u + (rand() - .5) * 2 * k, a[2] + (b[2] - a[2]) * u + (rand() - .5) * 2 * k]);
  }
  return pts;
}

// ---------------------------------------------------------------- the crackle on the held hammer

const MAX_ARCS = 6, ARC_STEPS = 8;
export function createCrackle(hammer, {seed = 7} = {}) {
  const rand = makeRng(seed);
  const pos = new Float32Array(MAX_ARCS * ARC_STEPS * 2 * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setDrawRange(0, 0);
  const mat = new THREE.LineBasicMaterial(light(ARC_COLOR));
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false; lines.name = 'mjollnir crackle'; lines.userData.magicShell = true;
  hammer.add(lines);
  const sparkPos = new Float32Array(24 * 3), sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({...light(ARC_COLOR), size: .028, map: softDot(THREE)});
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false; sparks.userData.magicShell = true; hammer.add(sparks);
  const sparkVel = new Float32Array(24 * 3), sparkLife = new Float32Array(24);
  const arcs = [];
  let surge = 0, clock = 0, nextLeap = .8;
  const pick = list => list[Math.floor(rand() * list.length)];
  function spawn(kind) {
    let a = pick(HEAD_POINTS), b = pick(HEAD_POINTS), jag = .22;
    if (kind === 'haft') { a = pick(HEAD_POINTS.slice(-3)); b = pick(HAFT_POINTS); jag = .12; }
    if (kind === 'leap') {
      // off a striking face into the air, a hand's width out
      const s = rand() < .5 ? -1 : 1;
      a = [s * (W + .012), HEAD_Y + (rand() - .5) * .1, (rand() - .5) * .1];
      b = [s * (W + .14 + rand() * .1), HEAD_Y + (rand() - .3) * .25, (rand() - .5) * .25];
      jag = .3;
    }
    if (a === b) b = HEAD_POINTS[(HEAD_POINTS.indexOf(a) + 3) % HEAD_POINTS.length];
    // The line buffer holds MAX_ARCS arcs: a new one (a strike's leaps) replaces the oldest.
    if (arcs.length >= MAX_ARCS) arcs.shift();
    arcs.push({pts: jaggedPath(a, b, ARC_STEPS, jag, rand), life: .05 + rand() * .09, flick: rand() * 6});
    if (kind === 'leap') for (let i = 0; i < 4; i++) spark(b);
  }
  function spark(at) {
    let i = sparkLife.findIndex(l => l <= 0); if (i < 0) i = Math.floor(rand() * 24);
    sparkPos.set(at, i * 3);
    sparkVel.set([(rand() - .5) * .9, rand() * .7, (rand() - .5) * .9], i * 3);
    sparkLife[i] = .25 + rand() * .25;
  }
  function update(dt, t = clock) {
    dt = Math.min(Math.max(dt || 0, 0), .1); clock += dt;
    surge = Math.max(0, surge - dt * 1.2);
    // Keep a few arcs alive; more while surging. Leaps and haft runs now and then.
    const want = 2 + Math.round(surge * 4);
    for (const a of arcs) a.life -= dt;
    for (let i = arcs.length - 1; i >= 0; i--) if (arcs[i].life <= 0) arcs.splice(i, 1);
    while (arcs.length < Math.min(MAX_ARCS, want)) spawn(rand() < .2 + surge * .3 ? 'haft' : 'head');
    nextLeap -= dt * (1 + surge * 4);
    if (nextLeap <= 0 && arcs.length < MAX_ARCS) { spawn('leap'); nextLeap = .7 + rand() * 1.1; }
    let n = 0;
    for (const a of arcs) {
      if (Math.sin(t * 90 + a.flick) < -.6) continue; // the arcs stutter
      for (let i = 0; i < a.pts.length - 1 && n * 3 + 6 <= pos.length; i++) { pos.set(a.pts[i], n * 3); pos.set(a.pts[i + 1], n * 3 + 3); n += 2; }
    }
    geo.setDrawRange(0, n); geo.attributes.position.needsUpdate = true;
    mat.opacity = .75 + .25 * Math.sin(t * 53) * Math.sin(t * 31) + surge * .3;
    for (let i = 0; i < 24; i++) {
      if (sparkLife[i] <= 0) { sparkPos[i * 3 + 1] = -99; continue; }
      sparkLife[i] -= dt;
      sparkVel[i * 3 + 1] -= 2.4 * dt;
      for (let k = 0; k < 3; k++) sparkPos[i * 3 + k] += sparkVel[i * 3 + k] * dt;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    const runes = hammer.userData.runes;
    if (runes) runes.emissiveIntensity = 2 + .9 * Math.abs(Math.sin(t * 37) * Math.sin(t * 13)) + surge * 3;
    return n;
  }
  return {
    update,
    // A strike surges the crackle: more arcs, bigger leaps, the runes blazing, easing back over ~1s.
    surge(amount = 1) { surge = Math.min(1.5, surge + amount); for (let i = 0; i < 3; i++) spawn('leap'); },
    get arcs() { return arcs.length; },
    get surgeLevel() { return surge; },
    dispose() { geo.dispose(); mat.dispose(); sparkGeo.dispose(); sparkMat.dispose(); hammer.remove(lines, sparks); },
  };
}

// Call every frame with the hero: finds a wielded Mjollnir in the weapon socket, gives it a
// crackle the first time and runs it. Returns the crackle (or null when Mjollnir isn't wielded).
export function updateHeldMjollnir(hero, dt, t) {
  const hammer = hero?.weaponSocket?.children?.find(c => c.userData.mjollnir);
  if (!hammer) return null;
  if (!hammer.userData.crackle) {
    hammer.userData.crackle = createCrackle(hammer);
    const dispose = hammer.userData.dispose;
    hammer.userData.dispose = () => { hammer.userData.crackle.dispose(); dispose?.(); };
  }
  hammer.userData.crackle.update(dt, t);
  return hammer.userData.crackle;
}

// ---------------------------------------------------------------- the lightning strike

// "The massive hammer hits!  Lightning strikes the jackal!" (artifact.c, Mjollnir's AD_ELEC).
export const STRIKE_RE = /Lightning strikes (?:the |an? )?(.+?)!\s*$/i;
export function strikeVictim(text) {
  const m = STRIKE_RE.exec(text || '');
  return m ? m[1] : null;
}

// The bolt's life (s) and how bright it is at age t: a hard first flash, a dark gap, two quick
// re-strikes, then gone, the way a real return stroke stutters.
export const STRIKE = {total: .46, height: 6.5};
export function strikeAlpha(t) {
  if (t < 0 || t >= STRIKE.total) return 0;
  if (t < .07) return 1;
  if (t < .11) return .08;
  if (t < .17) return .85;
  if (t < .21) return .1;
  if (t < .27) return .7;
  return .7 * (1 - (t - .27) / (STRIKE.total - .27));
}

// A forked channel from the sky down to (x, y, z): segments as [a, b] pairs.
export function boltSegments(x, y, z, rand, height = STRIKE.height) {
  const segs = [], top = [x + (rand() - .5) * 1.4, y + height, z + (rand() - .5) * 1.4];
  const main = jaggedPath(top, [x, y, z], 16, .07, rand);
  for (let i = 0; i < main.length - 1; i++) segs.push([main[i], main[i + 1], 1]);
  // two or three forks peel off the upper two thirds and die out in the air
  const forks = 2 + Math.floor(rand() * 2);
  for (let f = 0; f < forks; f++) {
    const at = main[2 + Math.floor(rand() * 9)], len = .8 + rand() * 1.4, ang = rand() * Math.PI * 2;
    const end = [at[0] + Math.cos(ang) * len * .6, at[1] - len, at[2] + Math.sin(ang) * len * .6];
    const fork = jaggedPath(at, end, 6, .12, rand);
    for (let i = 0; i < fork.length - 1; i++) segs.push([fork[i], fork[i + 1], .45]);
  }
  return segs;
}

const up = new THREE.Vector3(0, 1, 0);
function channelGeometry(segs, width) {
  const parts = [];
  for (const [a, b, w] of segs) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length();
    if (!(len > 1e-5)) continue;
    const c = new THREE.CylinderGeometry(width * w, width * w, len, 4, 1, true);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
    c.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    parts.push(c);
  }
  return parts;
}

export function createLightningStrikes(parent, {seed = 11} = {}) {
  const rand = makeRng(seed), live = [];
  const ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), ringTex = softRing(THREE), dotTex = softDot(THREE);
  function strike(x, z, {y = .45} = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const g = new THREE.Group(); g.name = 'MjollnirStrike'; parent.add(g);
    const segs = boltSegments(x, y, z, rand);
    const merge = list => { const geo = new THREE.BufferGeometry(); let count = 0; const arrays = [];
      for (const p of list) { const q = p.toNonIndexed(); arrays.push(q.attributes.position.array); count += q.attributes.position.count; q.dispose(); p.dispose(); }
      const all = new Float32Array(count * 3); let o = 0; for (const a of arrays) { all.set(a, o); o += a.length; }
      geo.setAttribute('position', new THREE.BufferAttribute(all, 3)); return geo; };
    const coreMat = new THREE.MeshBasicMaterial(light(BOLT_COLOR)), sheathMat = new THREE.MeshBasicMaterial(light(SHEATH_COLOR, .35));
    const core = new THREE.Mesh(merge(channelGeometry(segs, .022)), coreMat);
    const sheath = new THREE.Mesh(merge(channelGeometry(segs, .075)), sheathMat);
    for (const m of [core, sheath]) { m.frustumCulled = false; m.renderOrder = 30; g.add(m); }
    // where it lands: a flash of light across the floor and a burst of sparks
    const ringMat = new THREE.MeshBasicMaterial({...light(SHEATH_COLOR), map: ringTex, side: THREE.DoubleSide});
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.set(x, .03, z); g.add(ring);
    const flashMat = new THREE.SpriteMaterial({...light(BOLT_COLOR), map: dotTex});
    const flash = new THREE.Sprite(flashMat); flash.position.set(x, y + .1, z); g.add(flash);
    const n = 36, sp = new Float32Array(n * 3), sv = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      sp.set([x, y, z], i * 3);
      const a = rand() * Math.PI * 2, s = 1.2 + rand() * 2.2;
      sv.set([Math.cos(a) * s, .8 + rand() * 2.4, Math.sin(a) * s], i * 3);
    }
    const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const sparkMat = new THREE.PointsMaterial({...light(BOLT_COLOR), size: .06, map: dotTex});
    const sparks = new THREE.Points(sparkGeo, sparkMat); sparks.frustumCulled = false; g.add(sparks);
    const e = {g, t: 0, coreMat, sheathMat, ring, ringMat, flash, flashMat, sparkGeo, sparkMat, sv, mats: [coreMat, sheathMat, ringMat, flashMat, sparkMat], geos: [core.geometry, sheath.geometry, sparkGeo]};
    live.push(e);
    return g;
  }
  function frame(e, dt) {
    e.t += Math.min(Math.max(dt || 0, 0), .1);
    const a = strikeAlpha(e.t), u = Math.min(1, e.t / STRIKE.total);
    e.coreMat.opacity = a; e.sheathMat.opacity = .35 * a;
    e.ringMat.opacity = (1 - u) * .9; e.ring.scale.setScalar(.4 + u * 2.6);
    e.flashMat.opacity = a; e.flash.scale.setScalar(.6 + a * .9);
    const p = e.sparkGeo.attributes.position.array, dt2 = Math.min(Math.max(dt || 0, 0), .1);
    for (let i = 0; i < p.length; i += 3) {
      e.sv[i + 1] -= 6 * dt2;
      for (let k = 0; k < 3; k++) p[i + k] += e.sv[i + k] * dt2;
      if (p[i + 1] < .02) { p[i + 1] = .02; e.sv[i + 1] *= -.3; e.sv[i] *= .6; e.sv[i + 2] *= .6; }
    }
    e.sparkGeo.attributes.position.needsUpdate = true;
    e.sparkMat.opacity = 1 - u;
    return e.t < STRIKE.total + .25;
  }
  function drop(e) { e.mats.forEach(m => m.dispose()); e.geos.forEach(g => g.dispose()); parent.remove(e.g); }
  return {
    strike,
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!frame(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get count() { return live.length; },
    dispose() { this.clear(); ringGeo.dispose(); },
  };
}
