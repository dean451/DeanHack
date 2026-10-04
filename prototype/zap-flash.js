// The hero's zap: when a ray in the fx stream starts next to the hero and runs away from
// them, the hero turns to the beam, thrusts their arm out along it and a flash bursts from
// the hand in the ray's colours, then the arm holds while the beam flies and drops back.
// It only uses the ray's own look (which rays.js already shows), so it reveals nothing
// about the wand.
//
// A hero polymorphed into a D or d (dragons, hell hounds, winter wolves) has no hands, so
// it can't zap a wand; a ray from such a hero is its breath. Then the hero leans in and
// thrusts their head out instead of the arm, and the flash bursts from the mouth.
//
// The beam doesn't leave at once: over a short windup the hero turns, the arm (or head)
// comes most of the way up and a charge gathers in the hand; then the arm snaps the rest
// of the way and the flash bursts as the beam leaves. live.js delays the hero's own
// timeline by ZAP_WINDUP_MS (delayTimeline in fx.js) so the ray, its marks and any blast
// wait for the release.
//
// zapSource() and zapPose() are pure, so they can be tested without a renderer;
// createZapFlash() poses the hero and draws the flash.
import {rayLook} from './rays.js';

// The arm snaps up over this long (ms), then holds while the beam flies.
export const ZAP_RAISE_MS = 90;
// The windup before the beam leaves (ms), how far up the arm is by the release (0..1),
// and the charge glow's peak size and alpha.
export const ZAP_WINDUP_MS = 120;
export const ZAP_WINDUP_UP = .7;
export const ZAP_CHARGE_SIZE = .09;
export const ZAP_CHARGE_ALPHA = .4;
// The strain: while the charge gathers the arm (or head) shudders like a hand holding
// something that wants to get loose, peaking mid-windup and dying away by the release.
export const ZAP_STRAIN = .035;
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
// Breath: the chin juts up and out while the body leans into it; the kick snaps the head
// down a little as the breath leaves.
export const BREATH_HEAD = -.3;
export const BREATH_LEAN = .16;
export const BREATH_KICK = .14;
// The hero forms whose rays are breath: map symbols of handless breathers.
export const BREATH_SYMBOLS = 'Dd';

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { const x = clamp01(v); return x * x * (3 - 2 * x); };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// True when the hero's own map cell shows a breather's form (see BREATH_SYMBOLS). It uses
// only the glyph the map already draws on the hero's tile.
export function heroBreathes(frame) {
  const px = frame?.player?.x, pz = frame?.player?.z;
  if (!Number.isFinite(px) || !Number.isFinite(pz)) return false;
  const c = (frame.cells ?? []).find(c => c.x === px && c.z === pz);
  return !!c && c.kind === 'monster' && Number.isFinite(c.symbol) && BREATH_SYMBOLS.includes(String.fromCharCode(c.symbol));
}

// The hero's own ray in a timeline: {dir: [dx, dz], look, from, until, breath} or null. A beam is
// the hero's when its first cell is next to the hero's tile and it carries on away from
// them. A monster's beam coming at the hero moves towards the hero, so it doesn't count.
// `frame` (optional) says whether the hero is a breather.
export function zapSource(timeline, player, frame = null) {
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
    best = {dir: [dx, dz], look: rayLook(first.effect), from: first.from, until, breath: false};
  }
  if (best) best.breath = heroBreathes(frame);
  return best;
}

// The pose at t ms into the timeline: {arm, head, body, yaw, flash} or null once it's
// over. A zap moves the arm; a breath moves the head and body instead.
// `face` is the turn (radians) from the hero's heading to the beam. flash is
// {size, alpha, ring, ringAlpha, color} or null; a faint ember stays in the hand while the
// beam flies.
export function zapPose(src, t, face = 0) {
  if (!src) return null;
  // src.windup (ms, optional): the pose starts that long before src.from, the release.
  const lead = Number.isFinite(src.windup) && src.windup > 0 ? src.windup : 0;
  const age = t - src.from, hold = Math.max(ZAP_RAISE_MS, src.until - src.from);
  if (age < -lead || age >= hold + ZAP_LOWER_MS) return null;
  const L = src.look;
  const color = L.dark ? L.spark : L.glow;
  if (age < 0) {
    // The windup: turn to the beam, bring the arm most of the way up, gather a charge.
    const w = smooth((age + lead) / lead), up = ZAP_WINDUP_UP * w;
    const charge = w * w, flicker = .85 + .15 * Math.sin(age / 17);
    const strain = ZAP_STRAIN * 4 * w * (1 - w) * Math.sin(age / 6);
    const flash = {size: .02 + ZAP_CHARGE_SIZE * charge, alpha: ZAP_CHARGE_ALPHA * charge * flicker, ring: 0, ringAlpha: 0, color};
    if (src.breath) return {arm: 0, head: BREATH_HEAD * up + strain, body: BREATH_LEAN * up, yaw: face * w, flash: {...flash, size: flash.size * 1.25}};
    return {arm: ZAP_ARM * up + strain, head: 0, body: 0, yaw: face * w, flash};
  }
  const pre = lead ? ZAP_WINDUP_UP : 0;
  // After a windup the arm eases out of the release, so it snaps at once instead of
  // starting again from rest; without one it eases in as before.
  const r = clamp01(age / ZAP_RAISE_MS), raise = lead ? 1 - (1 - r) * (1 - r) : smooth(r);
  const up = age < hold ? pre + (1 - pre) * raise : 1 - smooth((age - hold) / ZAP_LOWER_MS);
  // After a windup the hero already faces the beam.
  const turn = lead && age < hold ? 1 : up;
  // The kick peaks just after the arm arrives and settles by ~200 ms.
  const kick = age > 40 ? Math.sin(Math.PI * clamp01((age - 40) / 160)) : 0;
  let flash = null;
  if (age < ZAP_FLASH_MS) {
    // After a windup the charge is already lit, so the flash bursts at full size.
    const u = age / ZAP_FLASH_MS, open = lead ? 1 : clamp01(age / 35);
    flash = {size: .06 + .16 * open * (1 - .35 * u), alpha: open * (1 - u) * (1 - u),
      ring: .08 + .42 * Math.sqrt(u), ringAlpha: (1 - u) * .75, color};
  }
  if (age < hold) {
    // The ember: a small, flickering glow while the beam is still out.
    const ember = .22 * up * (.8 + .2 * Math.sin(age / 23));
    if (!flash) flash = {size: .05, alpha: ember, ring: 0, ringAlpha: 0, color};
    else if (flash.alpha < ember) flash.alpha = ember;
  }
  if (src.breath) {
    if (flash) { flash.size *= 1.25; flash.ring *= 1.2; }
    return {arm: 0, head: BREATH_HEAD * up + BREATH_KICK * kick * up, body: BREATH_LEAN * up, yaw: face * turn, flash};
  }
  return {arm: ZAP_ARM * up + ZAP_KICK * kick * up, head: 0, body: 0, yaw: face * turn, flash};
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
  // The mouth, in the head's frame (the knight's chin sits at about y -.115, z .11).
  const MOUTH = [0, -.09, .19];
  let zap = null, applied = null;

  // Returns false, 'zap' or 'breath'. With a windup (ms) the pose starts now and the
  // release comes that much later, so the caller should delay the timeline by the same.
  function play(timeline, player, hero, frame = null, {windup = 0} = {}) {
    const src = zapSource(timeline, player, frame);
    if (!src) return false;
    if (windup > 0) { src.from += windup; src.until += windup; src.windup = windup; }
    const heading = hero?.g?.rotation.y ?? 0;
    zap = {src, t: 0, face: wrap(Math.atan2(src.dir[0], src.dir[1]) - heading)};
    return src.breath ? 'breath' : 'zap';
  }

  function unpose(hero) {
    if (!applied || !hero?.g) return;
    hero.g.rotation.y -= applied.yaw;
    if (hero.arm) hero.arm.rotation.x -= applied.arm;
    if (hero.head) hero.head.rotation.x -= applied.head;
    if (hero.body) hero.body.rotation.x -= applied.body;
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
    if (hero.head) hero.head.rotation.x += p.head;
    if (hero.body) hero.body.rotation.x += p.body;
    applied = {yaw: p.yaw, arm: hero.arm ? p.arm : 0, head: hero.head ? p.head : 0, body: hero.body ? p.body : 0};
    if (!f) return true;
    const breath = zap.src.breath && hero.head;
    const hand = breath ? hero.head : hero.wrist ?? hero.arm ?? hero.g;
    hand.updateWorldMatrix(true, false);
    hand.localToWorld(breath ? at.set(...MOUTH) : at.set(0, 0, 0));
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
