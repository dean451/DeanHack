// Jabberwock menace (jabberwock.js): "came whiffling through the tulgey wood, and burbled as it
// came". The jabberwock never quite holds still. Its low-slung head weaves slowly from side to
// side and bobs, the mantis-bladed forearms stay half raised and flex out of step, and every few
// seconds it burbles: a quick run of jaw snaps. Walking, the weave quickens and tightens (the
// whiffle) and the talons come up a little higher; it still burbles as it comes.
//
// An action (attack, flinch) or death fades all of it out within ~.15 s, so the attack poses
// read cleanly, and a dead jabberwock ends at its exact rest pose. Everything is an offset on
// head.rotation (x, y), each arm's rotation.x and jaw.rotation.x, taken back first every frame,
// so it never drifts and the action layer's deltas still stack. Call it after updateActions.
// The burble is capped so action + burble never opens past JAW_GAPE.

import {JAW_GAPE, jawReach} from './jaw.js';

export const WHIFFLE = {
  // Head weave (yaw) and bob (pitch, + dips the snout), radians and rad/s.
  weave: .16, weaveRate: 1.1, bob: .035, bobRate: 1.7,
  walkWeave: .1, walkWeaveRate: 4.4, walkBob: .05,
  // Talons: held raised (negative rotation.x lifts the forearm) and flexing out of step.
  raise: .08, walkRaise: .14, flex: .05, flexRate: 1.6,
  // Burble: SNAPS snaps over BURBLE_S seconds, each opening to `gape` (before the jaw's reach).
  gape: .26, snaps: 4, burbleS: .9,
  // First burble after FIRST_MIN..+FIRST_SPAN s, then GAP_MIN..+GAP_SPAN apart.
  firstMin: 1.5, firstSpan: 3, gapMin: 3, gapSpan: 5,
  // How fast the weight blends in (1/s) and out.
  fadeIn: 3, fadeOut: 16,
  // How long the walk blend takes to follow (1/s).
  walkRate: 5,
};
const SNAP = 1e-3;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

export const whiffles = a => !!(a?.jaw && a.head && a.g?.name === 'jabberwock' && !a.asset);

// The burble's jaw offset (before reach) at s seconds in: SNAPS rounded snaps under a
// sin envelope, so it starts and ends shut.
export function burblePose(s) {
  const {burbleS, snaps, gape} = WHIFFLE;
  if (!(s > 0) || s >= burbleS) return 0;
  const u = s / burbleS;
  return gape * Math.sin(Math.PI * u) * Math.abs(Math.sin(Math.PI * snaps * u));
}

// The head and arm offsets at time t for weight w and walk blend k (0..1).
export function whifflePose(t, w, k, phase = 0) {
  const W = WHIFFLE, idle = 1 - k;
  const yaw = w * (idle * W.weave * Math.sin(t * W.weaveRate + phase) + k * W.walkWeave * Math.sin(t * W.walkWeaveRate + phase));
  const pitch = w * (idle * W.bob * Math.sin(t * W.bobRate + phase) + k * W.walkBob * Math.abs(Math.sin(t * W.walkWeaveRate + phase)));
  const raise = idle * W.raise + k * W.walkRaise;
  const arms = [0, 1].map(i => -w * (raise + W.flex * Math.sin(t * W.flexRate + phase + i * Math.PI)));
  return {yaw, pitch, arms};
}

// Deterministic per-actor PRNG, so tests and replays are stable.
function rand(st) { st.seed = (st.seed * 1103515245 + 12345) % 2147483648; return st.seed / 2147483648; }

// Call once per frame after updateActions. `walking` is whether it's moving between cells;
// `acting` whether an action is playing or queued. Returns the state (for tests).
export function updateWhiffle(actor, dt, t, walking, acting) {
  if (!whiffles(actor)) return null;
  const W = WHIFFLE;
  const st = actor.whiffle || (actor.whiffle = {seed: ((actor.g?.id ?? 1) * 7919) % 2147483647 || 1,
    phase: 0, w: 0, k: 0, wait: 0, burble: -1, applied: {yaw: 0, pitch: 0, arms: [], jaw: 0}});
  if (!st.phase) st.phase = 6.283 * rand(st) || 1e-6;
  // Take back last frame's offsets.
  const ap = st.applied;
  actor.head.rotation.y -= ap.yaw; actor.head.rotation.x -= ap.pitch; actor.jaw.rotation.x -= ap.jaw;
  (actor.arms || []).forEach((arm, i) => { arm.rotation.x -= ap.arms[i] || 0; });
  st.applied = {yaw: 0, pitch: 0, arms: [], jaw: 0};

  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  t = Number.isFinite(t) ? t : 0;
  const dead = !!actor.actions?.dead, on = !dead && !acting;
  st.w = on ? st.w + (1 - st.w) * (1 - Math.exp(-W.fadeIn * dt)) : st.w * Math.exp(-W.fadeOut * dt);
  if (!on && st.w < SNAP) st.w = 0;
  st.k += ((walking ? 1 : 0) - st.k) * (1 - Math.exp(-W.walkRate * dt));
  st.k = clamp01(st.k);

  // Burble timing: counts down only while it's free to move; an action cuts a burble short.
  if (!on) { st.burble = -1; st.wait = Math.max(st.wait, W.firstMin); }
  else if (st.burble >= 0) { st.burble += dt; if (st.burble >= W.burbleS) { st.burble = -1; st.wait = W.gapMin + W.gapSpan * rand(st); } }
  else {
    if (!(st.wait > 0)) st.wait = W.firstMin + W.firstSpan * rand(st);
    st.wait -= dt;
    if (st.wait <= 0) { st.burble = 0; st.wait = 0; }
  }
  if (!(st.w > 0)) return st;

  const p = whifflePose(t, st.w, st.k, st.phase);
  actor.head.rotation.y += p.yaw; actor.head.rotation.x += p.pitch;
  st.applied.yaw = p.yaw; st.applied.pitch = p.pitch;
  (actor.arms || []).forEach((arm, i) => { const a = p.arms[i % 2]; arm.rotation.x += a; st.applied.arms[i] = a; });
  if (st.burble >= 0) {
    const room = Math.max(0, JAW_GAPE - (actor.actions?.applied?.jaw || 0));
    const j = Math.min(room, burblePose(st.burble) * jawReach(actor) * st.w);
    if (j > 0) { actor.jaw.rotation.x += j; st.applied.jaw = j; }
  }
  return st;
}
