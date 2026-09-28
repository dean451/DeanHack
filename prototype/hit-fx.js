// Hit reactions that depend on the blow (motion queue item 6, part 3). A claw rakes the
// defender round, a stab doubles it over, a club or charge knocks it back and squashes it, a
// bite or hug worries it side to side, and a touch, gaze or spell makes it shiver. Also throws
// impact particles by the defender's seen material on monster→hero and pet→monster hits; the
// hero's own swings already burst from swing-fx.js, so hits it caused carry `sprayed`.
//
// hitReactionPose returns the same offset shape as actions.js's actionPose, so it can replace
// the generic knockback there. Everything rests at u=0 and u=1.
import {createImpactBurst, impactKind} from './swing.js';

const TAU = Math.PI * 2;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// Snaps in by `peak`, settles out by 1.
const env = (u, peak) => u <= 0 || u >= 1 ? 0 : u < peak ? smooth(u / peak) : 1 - smooth((u - peak) / (1 - peak));

export const HIT_STYLES = ['knock', 'cut', 'stab', 'crush', 'bite', 'hug', 'jolt', 'engulf'];
// Seconds each reaction lasts.
export const HIT_TIME = {knock: .3, cut: .3, stab: .24, crush: .4, bite: .36, hug: .4, jolt: .34, engulf: .3};
// The impact spray each style throws (swing.js blow names), or null for none.
export const HIT_SPRAY = {knock: 'blunt', cut: 'slash', stab: 'pierce', crush: 'blunt', bite: 'pierce',
  hug: null, jolt: null, engulf: null};

const BY_ATTACK = {claw: 'cut', bite: 'bite', kick: 'crush', butt: 'crush', sting: 'stab', hug: 'hug',
  tentacle: 'hug', touch: 'jolt', gaze: 'jolt', scream: 'jolt', magic: 'jolt', spit: 'jolt', breath: 'jolt',
  explode: 'crush', boom: 'crush', engulf: 'engulf'};
const BY_BLOW = {slash: 'cut', pierce: 'stab', blunt: 'crush'};

// The reaction for an attack type and (for weapons) blow type. Unknown → the generic knock.
export function hitStyle(attack, blow = null) {
  if (attack === 'weapon' || attack == null || attack === 'other') return BY_BLOW[blow] ?? 'knock';
  return BY_ATTACK[attack] ?? 'knock';
}

function restPose() {
  return {dx: 0, dy: 0, dz: 0, yaw: 0, pitch: 0, roll: 0, body: 0, head: 0, arm: 0, wrist: 0,
    socket: 0, leg: 0, fore: 0, tail: 0, wing: 0, scale: 1, stretch: 1};
}

// Offsets at normalised time u for a blow travelling along `dir` (unit [x, z], attacker to
// defender, or null).
export function hitReactionPose(style, u, dir = null) {
  const p = restPose();
  const d = Array.isArray(dir) && dir.every(Number.isFinite) ? dir : null;
  const side = d && d[0] < 0 ? -1 : 1;
  const push = m => { if (d) { p.dx = d[0] * m; p.dz = d[1] * m; } };
  switch (HIT_STYLES.includes(style) ? style : 'knock') {
    case 'cut': { // Raked round and away from the blow.
      const k = env(u, .14);
      push(.08 * k);
      p.roll = side * .2 * k; p.yaw = side * .24 * k; p.pitch = -.12 * k; p.head = -.25 * k;
      break;
    }
    case 'stab': { // A sharp jerk, doubling over the wound.
      const k = env(u, .1);
      push(.06 * k);
      p.pitch = .26 * k; p.head = .22 * k; p.dy = -.02 * k; p.tail = .25 * k;
      break;
    }
    case 'crush': { // Knocked back off its feet a little, squashed by the weight of it.
      const k = env(u, .16);
      push(.2 * k);
      p.dy = u > 0 && u < .6 ? .05 * Math.sin(Math.PI * u / .6) : 0; p.pitch = -.3 * k; p.head = -.35 * k;
      p.stretch = 1 - .14 * env(u, .08); p.leg = .2 * k;
      break;
    }
    case 'bite': { // Held and worried side to side.
      const k = env(u, .12);
      push(.05 * k);
      p.roll = .12 * k * Math.sin(u * TAU * 3); p.yaw = .06 * k * Math.sin(u * TAU * 3 + .8);
      p.head = -.2 * k; p.pitch = -.08 * k;
      break;
    }
    case 'hug': { // Squeezed thin and tall, struggling.
      const k = env(u, .3);
      p.stretch = 1 + .1 * k; p.roll = .05 * k * Math.sin(u * TAU * 2.5);
      p.arm = -.3 * k; p.fore = -.2 * k; p.head = .15 * k;
      break;
    }
    case 'jolt': { // A shiver through the whole body.
      const k = env(u, .08);
      push(.03 * k);
      p.yaw = .08 * k * Math.sin(u * TAU * 6); p.scale = 1 + .04 * k; p.head = -.15 * k;
      p.tail = .3 * k * Math.sin(u * TAU * 4); p.wing = .15 * k;
      break;
    }
    case 'engulf': { // Just a nudge; the engulf itself is the attacker's show.
      const k = env(u, .2);
      push(.03 * k); p.pitch = -.06 * k;
      break;
    }
    default: { // The original generic knockback.
      const k = u < .15 ? smooth(u / .15) : 1 - smooth((u - .15) / .85);
      push(.1 * k);
      p.pitch = -.22 * k; p.roll = (d ? d[0] : 1) * .08 * k; p.head = -.3 * k; p.dy = .02 * k;
    }
  }
  return p;
}

// Chest height to spray from: the staged model's height when readability.js recorded it.
export function hitHeight(actor) {
  const h = actor?.g?.userData?.height;
  return Number.isFinite(h) && h > 0 ? Math.min(1.6, Math.max(.15, h * .55)) : .55;
}

// Sprays impact particles once for each hit action an actor starts playing. `parent` is the
// group the actors live in (Live mode's world group). Call update(actors, dt) every frame
// after updateActions, with any iterable of actors (a Map's values, an array).
export function createHitFx(THREE, parent, max = 160) {
  const burst = createImpactBurst(THREE, max, 11);
  parent.add(burst.points);
  const done = new WeakSet(), at = new THREE.Vector3();
  function update(actors, dt) {
    for (const actor of actors ?? []) {
      const a = actor?.actions?.current, g = actor?.g;
      if (!a || a.kind !== 'hit' || !g || done.has(a)) continue;
      done.add(a);
      if (a.sprayed) continue;
      const spray = HIT_SPRAY[a.style ?? hitStyle(a.attack, a.blow)];
      if (!spray) continue;
      const d = Array.isArray(a.dir) ? a.dir : null;
      // A little back toward the attacker, where the blow landed.
      at.set(g.position.x - (d ? d[0] * .18 : 0), hitHeight(actor), g.position.z - (d ? d[1] * .18 : 0));
      if (![at.x, at.y, at.z].every(Number.isFinite)) continue;
      burst.burst(at, d ?? [0, 0], impactKind(actor.species ?? null), spray);
    }
    burst.update(dt);
  }
  return {burst, update,
    dispose() { parent.remove(burst.points); burst.dispose(); }};
}
