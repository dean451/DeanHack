// The pet cat's attention and mood: what it looks at, how it carries itself and its tail, and when
// it turns round to face something. One mood at a time, from what is near it (actor.senses, set by
// live.js each frame):
// - wary: a hostile monster within `threatRange` cells: eyes locked on it, body a little lower
//   (`wary` of the hip height), tail low and stiff with a slow lash;
// - hunting: prey within its pounce range (stalk.js findPrey): eyes locked on it, the body sunk
//   into a stalking crouch (`stalk`: a stalking cat's hips sit about 30% lower, its step timing
//   unchanged; Trank 1996), the tail low with its tip twitching, and now and then a wiggle of the
//   haunches before the pounce;
// - content: otherwise. Walking, it looks where it is going and every few seconds glances at the
//   hero; standing, it watches the hero (now and then looking round the room), carries its tail
//   up with the tip hooked over, and now and then gives the hero a slow blink.
// The gaze moves the way an animal's does: a quick turn onto a new target (`snap`), then steady
// tracking (`track`), the neck taking `neckShare` of the turn and the head the rest. A target
// further round than `turnAt` that holds for `turnAfter` s turns the whole cat to face it on the
// spot, stepping its paws round (feline-gait.js `turn`).
import * as THREE from 'three';
import {isPrey, catSize} from './cats.js';

export const MIND = {
  yawMax: 1.3, pitchMax: .5, neckShare: .55, snap: 16, track: 6, settle: .06,
  heroRange: 7, glanceGap: [2.2, 5.5], glanceHold: [.6, 1.2], scanGap: [4, 9], scanHold: [1, 2.2],
  turnAt: 1.25, turnAfter: .4, turnRate: 3, threatRange: 3,
  stalk: .3, wary: .12, wiggleGap: [2.5, 5], wiggle: .8,
  slowBlinkGap: [7, 14], moodRate: 3,
};
// Tail carriage per mood, radians per tail bone (root first): `lift` raises (-) or lowers (+) the
// tail about its root, `hook` curls the tip forward, `twitch`/`lash` swing it sideways, `side` bends
// the upper tail over to one side (the content cat's question-mark tail, its side switching every
// TAIL_HOOK.gap seconds and easing across at TAIL_HOOK.rate).
export const TAIL_MOOD = {
  content: {lift: 0, hook: .3, twitch: 0, lash: 0, side: 1.6},
  hunting: {lift: -.75, hook: -.1, twitch: .35, lash: 0, side: 0},
  wary: {lift: -.55, hook: -.15, twitch: 0, lash: .35, side: 0},
};
// How the side bend shares out down the tail (root first), the seconds between switches, and the
// rate the bend eases to its new side.
export const TAIL_HOOK = {share: [0, .04, .14, .34, .48], gap: [3, 8], rate: 1.4};

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const posOf = a => a?.target ?? a?.g?.position ?? null;

// The nearest hostile monster within range of the pet (not prey: prey is hunted, not feared), as
// {actor, dx, dz, d}, or null.
export function findThreat(cat, actors, range = MIND.threatRange) {
  const p = posOf(cat);
  if (!p || !actors) return null;
  const size = catSize(cat?.species) || 1;
  let best = null;
  for (const other of actors) {
    if (!other || other === cat || other.actions?.dead || other.g?.userData?.disposition !== 'hostile' || isPrey(other.species, size)) continue;
    const q = posOf(other); if (!q) continue;
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    if (d > 1e-3 && d <= range && (!best || d < best.d)) best = {actor: other, dx, dz, d};
  }
  return best;
}

export function createFelineMind(rig, actor, {seed = 1} = {}) {
  let s = (seed * 2654435761) >>> 0 || 1;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32, range = ([a, b]) => a + (b - a) * rnd();
  const st = {mood: 'content', w: {content: 1, hunting: 0, wary: 0}, yaw: 0, pitch: 0, aim: null, kind: null, snapping: false,
    glance: range(MIND.glanceGap), glancing: 0, scan: range(MIND.scanGap), scanning: 0, scanAt: {yaw: 0, pitch: 0},
    behind: 0, turning: false, turnTo: 0, wiggle: range(MIND.wiggleGap), wiggling: 0, blink: range(MIND.slowBlinkGap), t: 0,
    hookSide: rnd() < .5 ? -1 : 1, hookIn: range(TAIL_HOOK.gap), hookAt: 0, sat: 0};
  // each tail bone's sideways bend axis: across its own line (bones rest unturned, so a bone's line
  // is where its child sits), so a bone running back bends about up and one standing up about forward
  const sideAxis = rig.tail.map((b, i) => { const d = (rig.tail[i + 1] || b).position.clone().normalize(), a = d.cross(new THREE.Vector3(1, 0, 0)); return a.lengthSq() > 1e-6 ? a.normalize() : new THREE.Vector3(0, 1, 0); });
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  const g = () => actor?.g;
  const bodyYaw = () => (g()?.rotation.y ?? 0) + (rig.hips.parent?.rotation.y ?? 0);

  // Where to look this frame, as a world point and what it is.
  function choose(dt, ctx) {
    const sn = actor?.senses || {}, gg = g(), hero = sn.hero;
    const heroNear = hero && gg && Math.hypot(hero.x - gg.position.x, hero.z - gg.position.z) <= MIND.heroRange;
    if (sn.threat) return {at: posOf(sn.threat.actor), y: .2, kind: 'threat'};
    if (sn.prey) return {at: posOf(sn.prey.actor), y: .05, kind: 'prey'};
    if (ctx.walking) {
      st.scanning = 0;
      if (st.glancing > 0) { st.glancing -= dt; if (heroNear) return {at: hero, y: .45, kind: 'hero'}; }
      else if ((st.glance -= dt) <= 0) { st.glance = range(MIND.glanceGap); if (heroNear) st.glancing = range(MIND.glanceHold); }
      return {ahead: true, kind: 'ahead'};
    }
    // standing: the hero, with a look round now and then
    if (st.scanning > 0) { st.scanning -= dt; return {rel: st.scanAt, kind: 'scan'}; }
    if ((st.scan -= dt) <= 0) { st.scan = range(MIND.scanGap); st.scanning = range(MIND.scanHold); st.scanAt = {yaw: (rnd() * 2 - 1) * MIND.yawMax * .9, pitch: (rnd() - .4) * MIND.pitchMax}; }
    if (heroNear) return {at: hero, y: .45, kind: 'hero'};
    return {rel: {yaw: 0, pitch: 0}, kind: 'rest'};
  }

  // Per frame, after the turn code has written the neck and before the step solves the legs.
  // `ctx`: {dt, walking, pouncing, sitting}. Returns {crouch, hold, turn} for the step.
  function update(dt, ctx) {
    st.t += dt;
    const sn = actor?.senses || {};
    const mood = ctx.pouncing ? st.mood : sn.threat ? 'wary' : sn.prey ? 'hunting' : 'content';
    st.mood = mood;
    for (const k of Object.keys(st.w)) st.w[k] += ((k === mood ? 1 : 0) - st.w[k]) * (1 - Math.exp(-dt * MIND.moodRate));
    // the gaze: a quick turn onto a new target, then tracking
    const pick = choose(dt, ctx), gg = g();
    let want = {yaw: 0, pitch: 0};
    if (pick.rel) want = pick.rel;
    else if (pick.ahead) want = {yaw: 0, pitch: -.12}; // the way it is going, a little down
    else if (pick.at && gg) {
      rig.head.getWorldPosition(_v);
      const dx = pick.at.x - _v.x, dz = pick.at.z - _v.z, dy = (pick.at.y || 0) + pick.y - _v.y;
      want = {yaw: wrap(Math.atan2(dx, dz) - bodyYaw()), pitch: Math.atan2(dy, Math.hypot(dx, dz))};
    }
    if (pick.kind !== st.kind) { st.kind = pick.kind; st.snapping = true; }
    // something it means to watch is behind it: after a moment, turn round to face it
    const locked = pick.kind === 'threat' || pick.kind === 'prey' || pick.kind === 'hero';
    if (!ctx.walking && !ctx.pouncing && !ctx.sitting && locked && Math.abs(want.yaw) > MIND.turnAt) st.behind += dt; else st.behind = 0;
    // (the turn is measured on the actor's heading, not the body's springy follow-through)
    if (st.behind > MIND.turnAfter && !st.turning && gg) { st.turning = true; st.turnTo = gg.rotation.y + want.yaw; }
    if (st.turning && gg) {
      if (ctx.walking || ctx.pouncing) st.turning = false;
      else {
        const left = wrap(st.turnTo - gg.rotation.y), step = Math.sign(left) * Math.min(Math.abs(left), MIND.turnRate * dt);
        gg.rotation.y += step; if (actor.pathYaw !== undefined) actor.pathYaw = gg.rotation.y; // the trail picks up the new heading
        if (Math.abs(left) < .03) st.turning = false;
      }
    }
    const yawWant = Math.max(-MIND.yawMax, Math.min(MIND.yawMax, want.yaw)), pitchWant = Math.max(-MIND.pitchMax, Math.min(MIND.pitchMax, want.pitch));
    const rate = st.snapping ? MIND.snap : MIND.track, k = 1 - Math.exp(-dt * rate);
    st.yaw += (yawWant - st.yaw) * k; st.pitch += (pitchWant - st.pitch) * k;
    if (Math.abs(yawWant - st.yaw) + Math.abs(pitchWant - st.pitch) < MIND.settle) st.snapping = false;
    // the neck takes its share on top of the turn code's levelling; the head (which nothing else
    // writes on the skinned cat) the rest
    const n = MIND.neckShare;
    rig.neck.quaternion.multiply(_q.setFromEuler(_e.set(-st.pitch * n, st.yaw * n, 0)));
    rig.head.quaternion.setFromEuler(_e.set(-st.pitch * (1 - n), st.yaw * (1 - n), -st.yaw * .08));
    // the tail, by mood (the tail clip writes it fresh each frame)
    const W = st.w, T = TAIL_MOOD, mix = key => W.content * T.content[key] + W.hunting * T.hunting[key] + W.wary * T.wary[key];
    const lift = mix('lift'), hook = mix('hook'), burst = Math.max(0, Math.sin(st.t * 1.7)) ** 6;
    const twitch = mix('twitch') * Math.sin(st.t * 22) * burst, lash = mix('lash') * Math.sin(st.t * 4.4);
    if ((st.hookIn -= dt) <= 0) { st.hookIn = range(TAIL_HOOK.gap); st.hookSide = -st.hookSide; }
    st.hookAt += (st.hookSide - st.hookAt) * (1 - Math.exp(-dt * TAIL_HOOK.rate));
    // sitting, the tail lies along the floor (the sit clip curls it there), so the upright hook eases out
    st.sat += ((ctx.sitting ? 1 : 0) - st.sat) * (1 - Math.exp(-dt * 3));
    const side = mix('side') * st.hookAt * (1 - st.sat);
    rig.tail.forEach((b, i) => {
      const tip = i / (rig.tail.length - 1); b.quaternion.multiply(_q.setFromEuler(_e.set((i ? lift * .15 : lift) + hook * tip * tip, lash * (i ? .25 : 0) + twitch * tip, 0)));
      if (side) b.quaternion.multiply(_q.setFromAxisAngle(sideAxis[i], side * (TAIL_HOOK.share[i] ?? 0)));
    });
    // the haunches wiggle now and then before a pounce
    let wiggle = 0;
    if (mood === 'hunting' && !ctx.walking) { if (st.wiggling > 0) { st.wiggling -= dt; wiggle = Math.sin(st.wiggling * 20) * Math.sin(Math.PI * st.wiggling / MIND.wiggle) * .09; } else if ((st.wiggle -= dt) <= 0) { st.wiggle = range(MIND.wiggleGap); st.wiggling = MIND.wiggle; } }
    if (wiggle) rig.hips.quaternion.multiply(_q.setFromEuler(_e.set(0, wiggle * .5, wiggle)));
    // a slow blink at the hero, now and then, when content and watching them
    let slowBlink = false;
    if (mood === 'content' && pick.kind === 'hero' && !ctx.walking && !st.snapping) { if ((st.blink -= dt) <= 0) { st.blink = range(MIND.slowBlinkGap); slowBlink = true; } }
    const crouch = W.hunting * MIND.stalk + W.wary * MIND.wary;
    return {mood, look: pick.kind, yaw: st.yaw, pitch: st.pitch, crouch, tailSide: st.hookAt, hold: crouch > .01 && !ctx.walking, turn: st.turning, slowBlink, wiggle};
  }
  return {update, state: st};
}
