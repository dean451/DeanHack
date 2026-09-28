// The hero's zap: when a ray in the fx stream starts next to the hero and runs away from
// them, the hero turns to the beam, thrusts their arm out along it and a flash bursts from
// the hand in the ray's colours, then the arm holds while the beam flies and drops back.
// It only uses the ray's own look (which rays.js already shows), so it reveals nothing
// about the wand.
//
// zapSource() and zapPose() are pure, so they can be tested without a renderer;
// createZapFlash() poses the hero and draws the flash.
import {rayLook} from './rays.js';

// The arm snaps up over this long (ms), then holds while the beam flies.
export const ZAP_RAISE_MS = 90;
// The hand flash lasts this long (ms) from the first cell.
export const ZAP_FLASH_MS = 320;
// Once the beam ends, the arm lowers over this long (ms).
export const ZAP_LOWER_MS = 260;
// The arm never holds out longer than this (ms), however long the beam.
export const ZAP_HOLD_MAX_MS = 1000;
// Arm pitch when pointing (the elbow's bend makes the forearm roughly level), and the
// recoil kick on release.
export const ZAP_ARM = -1.15;
export const ZAP_KICK = .16;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { const x = clamp01(v); return x * x * (3 - 2 * x); };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// The hero's own ray in a timeline: {dir: [dx, dz], look, from, until} or null. A beam is
// the hero's when its first cell is next to the hero's tile and it carries on away from
// them. A monster's beam coming at the hero moves towards the hero, so it doesn't count.
export function zapSource(timeline, player) {
  const px = player?.x, pz = player?.z;
  if (!Number.isFinite(px) || !Number.isFinite(pz)) return null;
  const runs = new Map();
  for (const s of timeline?.sprites ?? []) {
    if (!rayLook(s.effect) || !Number.isFinite(s.x) || !Number.isFinite(s.z)) continue;
    if (!runs.has(s.seq)) runs.set(s.seq, []);
    runs.get(s.seq).push(s);
  }
  let best = null;
  for (const run of runs.values()) {
    run.sort((a, b) => a.from - b.from);
    const first = run[0], dx = first.x - px, dz = first.z - pz;
    if (Math.abs(dx) > 1 || Math.abs(dz) > 1 || (!dx && !dz)) continue;
    const next = run[1];
    if (next && (Math.sign(next.x - first.x) !== dx || Math.sign(next.z - first.z) !== dz)) continue;
    if (best && best.from <= first.from) continue;
    const until = Math.min(first.from + ZAP_HOLD_MAX_MS, Math.max(...run.map(s => s.until)));
    best = {dir: [dx, dz], look: rayLook(first.effect), from: first.from, until};
  }
  return best;
}

// The pose at t ms into the timeline: {arm, yaw, flash} or null once the arm is down.
// `face` is the turn (radians) from the hero's heading to the beam. flash is
// {size, alpha, ring, ringAlpha, color} or null; a faint ember stays in the hand while the
// beam flies.
export function zapPose(src, t, face = 0) {
  if (!src) return null;
  const age = t - src.from, hold = Math.max(ZAP_RAISE_MS, src.until - src.from);
  if (age < 0 || age >= hold + ZAP_LOWER_MS) return null;
  const up = age < hold ? smooth(age / ZAP_RAISE_MS) : 1 - smooth((age - hold) / ZAP_LOWER_MS);
  // The kick peaks just after the arm arrives and settles by ~200 ms.
  const kick = age > 40 ? Math.sin(Math.PI * clamp01((age - 40) / 160)) : 0;
  const L = src.look;
  const color = L.dark ? L.spark : L.glow;
  let flash = null;
  if (age < ZAP_FLASH_MS) {
    const u = age / ZAP_FLASH_MS, open = clamp01(age / 35);
    flash = {size: .06 + .16 * open * (1 - .35 * u), alpha: open * (1 - u) * (1 - u),
      ring: .08 + .42 * Math.sqrt(u), ringAlpha: (1 - u) * .75, color};
  }
  if (age < hold) {
    // The ember: a small, flickering glow while the beam is still out.
    const ember = .22 * up * (.8 + .2 * Math.sin(age / 23));
    if (!flash) flash = {size: .05, alpha: ember, ring: 0, ringAlpha: 0, color};
    else if (flash.alpha < ember) flash.alpha = ember;
  }
  return {arm: ZAP_ARM * up + ZAP_KICK * kick * up, yaw: face * up, flash};
}

// Poses the hero and draws the hand flash. In the frame loop, call unpose(hero) right after
// the hero's clearActionPose (before the loop sets the heading) and update(dt, hero) after
// updateActions, so the offsets stack with the action layer and come off cleanly.
export function createZapFlash(THREE, parent) {
  const glowMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false});
  const coreMat = glowMat.clone();
  const ringMat = glowMat.clone(); ringMat.side = THREE.DoubleSide;
  const sphere = new THREE.SphereGeometry(1, 14, 10), ringGeo = new THREE.RingGeometry(.8, 1, 24);
  const glow = new THREE.Mesh(sphere, glowMat), core = new THREE.Mesh(sphere, coreMat), ring = new THREE.Mesh(ringGeo, ringMat);
  for (const m of [glow, core, ring]) { m.visible = false; m.frustumCulled = false; m.renderOrder = 6; m.userData.part = 'zap-flash'; parent.add(m); }
  const white = new THREE.Color(0xffffff), color = new THREE.Color(), at = new THREE.Vector3();
  let zap = null, applied = null;

  function play(timeline, player, hero) {
    const src = zapSource(timeline, player);
    if (!src) return false;
    const heading = hero?.g?.rotation.y ?? 0;
    zap = {src, t: 0, face: wrap(Math.atan2(src.dir[0], src.dir[1]) - heading)};
    return true;
  }

  function unpose(hero) {
    if (!applied || !hero?.g) return;
    hero.g.rotation.y -= applied.yaw;
    if (hero.arm) hero.arm.rotation.x -= applied.arm;
    applied = null;
  }

  function update(dt, hero) {
    unpose(hero);
    const p = zap && hero?.g ? zapPose(zap.src, (zap.t += dt * 1000), zap.face) : null;
    if (!p) zap = null;
    const f = p?.flash;
    for (const m of [glow, core, ring]) m.visible = !!f;
    if (!p) return false;
    hero.g.rotation.y += p.yaw;
    if (hero.arm) hero.arm.rotation.x += p.arm;
    applied = {yaw: p.yaw, arm: hero.arm ? p.arm : 0};
    if (!f) return true;
    const hand = hero.wrist ?? hero.arm ?? hero.g;
    hand.updateWorldMatrix(true, false);
    hand.localToWorld(at.set(0, 0, 0));
    parent.updateWorldMatrix(true, false);
    parent.worldToLocal(at);
    glow.position.copy(at); core.position.copy(at); ring.position.copy(at);
    glow.scale.setScalar(f.size);
    glowMat.color.setHex(f.color).multiplyScalar(f.alpha);
    core.scale.setScalar(f.size * .45);
    coreMat.color.setHex(f.color).lerp(white, .7).multiplyScalar(Math.min(1, f.alpha * 1.4));
    // The ring faces along the beam and spreads out from the hand.
    ring.visible = f.ringAlpha > 0;
    ring.rotation.set(0, Math.atan2(zap.src.dir[0], zap.src.dir[1]), 0);
    ring.scale.setScalar(Math.max(.001, f.ring));
    ringMat.color.setHex(f.color).lerp(white, .3).multiplyScalar(f.ringAlpha);
    return true;
  }

  function clear(hero) { unpose(hero); zap = null; for (const m of [glow, core, ring]) m.visible = false; }
  const dispose = () => {
    for (const m of [glow, core, ring]) parent.remove(m);
    sphere.dispose(); ringGeo.dispose(); glowMat.dispose(); coreMat.dispose(); ringMat.dispose();
  };
  return {play, update, unpose, clear, dispose, glow, core, ring, get active() { return !!zap; }};
}
