// The glowing eyes of the Executioner (executioner.js), Croesus (croesus.js), One-eyed Sam
// (one-eyed-sam.js), the miner (miner.js), the black marketeer (black-marketeer.js), the mugger
// (mugger.js), the convict (convict.js), Thoth Amon (thoth-amon.js), Charon (charon.js) and the prisoner (prisoner.js). Each model hangs a small emissive `eyes` mesh on the head; this makes those
// eyes live.
//  - Executioner: a cold, slow burn behind the hood's holes. It breathes a little brighter and
//    dimmer, and now and then the eyes narrow to a long glare. With the hero within RANGE tiles
//    they burn brighter and steadier.
//  - Croesus: small greedy eyes that shift. They dart side to side in their sockets, and every
//    few seconds catch a sharp gold glint, much more often with the hero near (eyeing their purse).
//  - One-eyed Sam: a single ember-red eye beside the patch. It smoulders with a restless ember
//    flicker and shifts in its socket, now and then narrowing in a sly squint. With the hero near it
//    settles into a held squint, sizing them up, with a cold glint every so often.
//  - Miner: pale eyes gone half-blind in the tunnels. A dull, slow glow; every few seconds the lids
//    droop in a heavy blink and the glow sinks with them. With the hero near they open wide in a
//    hollow stare and pale up, flicking a little in their sockets.
//  - Black marketeer: sickly eyes in the cowl's shadow that never settle. Alone they flick quickly
//    side to side, watching for the watch, and now and then narrow in a sidelong, calculating look.
//    With the hero near they go still and fix on them, half-lidded, with a greedy glint every few
//    seconds (sizing up their purse).
//  - Mugger: a low, mean glare from the sack's eyeholes. Alone, a dull red smoulder that now and then
//    narrows to a hard squint. With the hero near they narrow and burn hotter, and every few seconds
//    flick down and aside to the hero's pack and belt, hold a beat with a covetous glint, and come back.
//  - Convict: pale, feral eyes deep in the sockets that never rest. Alone they dart about in quick
//    nervous flicks, and now and then start wide, white and bright, at some sound behind. With the
//    hero near they stay wide like a cornered animal's, the flicks come faster and wider, and every
//    few seconds they cut hard aside (and a hair up) toward a way out, hold, and come back. When the
//    convict jerks its head round over a shoulder (convict-hunted.js) the eyes go to the corners
//    with it, looking further back still.
//  - Thoth Amon: venom-green serpent's eyes that never dart. Alone a slow, cold smoulder, and now and
//    then a long, contemptuous narrowing. With the hero near they draw down to slits and the glow
//    throbs slow and deep, a mesmeric pulse, and every few seconds they flash wide and bright with a
//    surge of sorcery before sinking back to slits.
//  - Charon: eyes of burning coal, deep in the hood. Alone a low, slow coal-glow with a restless
//    ember flicker, and now and then a weary droop of the lids that dims them like banked coals. With
//    the hero near the coals are fanned: brighter, the flicker fiercer, the lids narrowed in a cold
//    appraisal (waiting for the obol), and every few seconds a slow flare as if a bellows breathed on them.
//  - Prisoner: pale, wet eyes peering up from a hung head, broken by years in the dark. Alone a dim,
//    watery glow; the eyes wander in slow, uneasy flicks and now and then the lids droop in a weary
//    sag. With the hero near they stare wide and frightened, a little brighter, the flicks quick and
//    jumpy, and every few seconds they cringe: squeezed shut and dimmed, dropped and turned aside as if
//    from a raised hand, then they creep back up.
//  - An attack: the eyes blaze up through the wind-up and widen (the Executioner, the miner, the convict, Charon, the prisoner) or
//    narrow to slits (Croesus, Sam, the marketeer, the mugger, Thoth Amon), peak just before the blow lands, and die back down after.
//  - A blow: a hard blink, then they flare in anger and settle.
//  - Death: they gutter out, flickering down to dark as the lids sag. Stone (`a.stone`): petrify.js
//    greys the glow and this holds.
//
// Each actor gets its own clone of the shared glow material (no extra draws). Owns the eyes' scale
// and position (scaled about their own centre) and the material's emissiveIntensity.

const TAU = Math.PI * 2;
export const RANGE = 6, NEAR_RATE = 2, REST_RATE = 3;
export const LOOK = {
  executioner: {near: 1.35, breath: .12, breathHz: .35, glareMin: 4, glareSpan: 6, glareLen: 1.6, glareY: .55, glareGlow: 1.3,
    atkGlow: 3, atkX: 1.35, atkY: 1.5, dart: 0, glintMin: 0, glintSpan: 0},
  croesus: {near: 1.15, breath: .06, breathHz: .5, glareMin: 0, glareSpan: 0, glareLen: 0, glareY: 1, glareGlow: 1,
    atkGlow: 3.2, atkX: 1.15, atkY: .55, dart: .0045, glintMin: 2, glintSpan: 3, glintNear: 2.5, glintLen: .28, glintGlow: 2},
  'one-eyed sam': {near: 1.25, nearY: .7, ember: .07, breath: .08, breathHz: .3, glareMin: 3, glareSpan: 5, glareLen: 1.1, glareY: .5, glareGlow: 1.35,
    atkGlow: 2.8, atkX: 1.2, atkY: .4, dart: .003, glintMin: 3, glintSpan: 4, glintNear: 2, glintLen: .22, glintGlow: 1.7},
  // the "glare" here is a heavy-lidded droop (a slow blink), and nearY > 1 widens them into a stare
  miner: {near: 1.3, nearY: 1.25, breath: .1, breathHz: .22, glareMin: 2, glareSpan: 3.5, glareLen: .75, glareY: .18, glareGlow: .7,
    atkGlow: 2.6, atkX: 1.25, atkY: 1.45, dart: .002, glintMin: 0, glintSpan: 0},
  // shifty: quick darts while alone (dartGap [far, near] s between looks), still and fixed with the
  // hero near (dartNear scales the dart), where the glint comes much sooner
  'black marketeer': {near: 1.2, nearY: .75, breath: .06, breathHz: .4, glareMin: 3, glareSpan: 4, glareLen: .9, glareY: .5, glareGlow: 1.25,
    atkGlow: 2.8, atkX: 1.2, atkY: .45, dart: .004, dartNear: .25, dartGap: [.22, 1.3], glintMin: 3, glintSpan: 4, glintNear: 2.4, glintLen: .25, glintGlow: 1.8},
  // a low glare: glints only with the hero near (glintFar 0), and each one is a glance at their pack,
  // the eyes flicking down by glintDrop and aside by up to glintSide (head-local units) for the glint
  mugger: {near: 1.3, nearY: .65, breath: .05, breathHz: .25, glareMin: 4, glareSpan: 5, glareLen: 1.3, glareY: .5, glareGlow: 1.3,
    atkGlow: 3, atkX: 1.15, atkY: .4, dart: .0015, dartNear: .5, dartGap: [1.4, 1.8], glintMin: 2.5, glintSpan: 3, glintNear: 1, glintFar: 0,
    glintLen: .9, glintGlow: 1.5, glintDrop: .0045, glintSide: .0025},
  // hunted: the "glare" is a start (glareY > 1, wide and bright); wide with the hero near (nearY > 1)
  // with faster, wider flicks (dartNear > 1); each glint is a hard look aside toward a way out (a
  // negative glintDrop lifts it); follow moves the eyes with convict-hunted.js's head turn; xMax caps
  // the total sideways shift (the socket is about .013 wider than the eye each side)
  convict: {near: 1.25, nearY: 1.2, breath: .07, breathHz: .45, glareMin: 3, glareSpan: 4, glareLen: .7, glareY: 1.3, glareGlow: 1.45,
    atkGlow: 2.8, atkX: 1.1, atkY: 1.4, dart: .0035, dartNear: 1.3, dartGap: [.28, .16], glintMin: 3, glintSpan: 4, glintNear: 1.8,
    glintLen: .6, glintGlow: 1.35, glintDrop: -.001, glintSide: .004, follow: .004, xMax: .0065},
  // serpentine: slits with the hero near (nearY < 1) where the slow breath deepens into a throb
  // (breathNear > 1 scales its depth there; the others quieten, .5), and each glint is a flash of
  // sorcery that opens the eyes wide (glintY) and bright
  'thoth amon': {near: 1.3, nearY: .55, breath: .1, breathHz: .18, breathNear: 2.2, glareMin: 4, glareSpan: 5, glareLen: 1.5, glareY: .45, glareGlow: 1.3,
    atkGlow: 3, atkX: 1.1, atkY: .5, dart: 0, glintMin: 4, glintSpan: 4, glintNear: 1.6, glintLen: .55, glintGlow: 2, glintY: 1.5},
  // burning coals: the "glare" is a weary droop that banks them (glareGlow < 1); the ember flicker
  // grows with the hero near (emberNear > 1 scales it there; Sam's quietens, .5), and each glint is a
  // slow bellows flare
  charon: {near: 1.4, nearY: .8, ember: .12, emberNear: 1.8, breath: .08, breathHz: .15, glareMin: 4, glareSpan: 5, glareLen: 1.4, glareY: .3, glareGlow: .7,
    atkGlow: 3.2, atkX: 1.3, atkY: 1.45, dart: 0, glintMin: 4, glintSpan: 4, glintNear: 1.8, glintLen: 1.1, glintGlow: 1.8},
  // cowed: the "glare" is a weary sag of the lids (like the miner's); wide and jumpy with the hero
  // near (nearY > 1, dartNear > 1), and each glint is a cringe, only then (glintFar 0): squeezed shut
  // (glintY < 1) and dimmed (glintGlow < 1), dropped and turned aside (glintDrop, glintSide). The
  // socket's dark is about .007 wider than the eye each side, so xMax keeps it in.
  prisoner: {near: 1.25, nearY: 1.3, breath: .09, breathHz: .2, glareMin: 3, glareSpan: 4, glareLen: 1.2, glareY: .3, glareGlow: .7,
    atkGlow: 3, atkX: 1.15, atkY: 1.4, dart: .002, dartNear: 1.6, dartGap: [.9, .25], glintMin: 2.5, glintSpan: 3, glintNear: 1, glintFar: 0,
    glintLen: .9, glintGlow: .55, glintY: .25, glintDrop: .0025, glintSide: .002, xMax: .005},
};
// The blink and the anger after a blow (s), and the gutter at death.
export const BLINK_LEN = .22, ANGER = 1.7, ANGER_RATE = 2.5, DEATH_RATE = 1.6, DEATH_Y = .35;
const SNAP = 1e-3;
// convict-hunted.js's full look over the shoulder (rad), for `follow`
const HUNT_YAW = 1.05;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);

export const hasEyes = a => !!(a && !a.asset && LOOK[a.kind] && a.eyes?.isMesh && a.eyes.material && a.head);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The attack's flare over action progress u: up through the wind-up, held to the strike, then down.
export function attackCurve(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  return smooth(u / .3) * (1 - smooth((u - .5) / .5));
}
// A blink's openness over its progress v: shut fast, open a little slower. 1 outside.
export function blinkCurve(v) {
  if (!(v > 0) || !(v < 1)) return 1;
  return v < .35 ? 1 - .88 * smooth(v / .35) : .12 + .88 * smooth((v - .35) / .65);
}
// A narrowing (the glare, a glint) over its progress v: in, held, out. 0 outside.
export const holdCurve = v => !(v > 0) || !(v < 1) ? 0 : smooth(v / .2) * (1 - smooth((v - .7) / .3));

function setup(a) {
  const L = LOOK[a.kind], st = {seed: ((a.g?.id ?? 1) * 40692) % 2147483647 || 1, T: 0, L, life: 1, near: 0, anger: 0,
    blink: null, glare: null, glint: null, glance: 0, side: 0, dart: 0, dartTo: 0, dartWait: 0, lastHit: null};
  a.eyes.material = a.eyes.material.clone();
  st.base = a.eyes.material.emissiveIntensity;
  a.eyes.geometry.computeBoundingBox();
  st.c = a.eyes.geometry.boundingBox.getCenter(a.eyes.position.clone());
  st.pos = a.eyes.position.clone();
  st.glareWait = L.glareMin + L.glareSpan * rand(st);
  st.glintWait = L.glintMin + L.glintSpan * rand(st);
  st.ph = rand(st) * TAU;
  return st;
}

// Call once a frame (fidget.js does). `look` is the hero's position (same parent as actor.g).
// Returns the state, or null for anything else.
export function updateEyeFlare(a, dt, t, busy, look = null) {
  if (!hasEyes(a)) return null;
  const st = a.eyeFlare || (a.eyeFlare = setup(a)), L = st.L;
  if (a.stone) return st;
  dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  const q = a.actions, cur = q?.current, dead = !!q?.dead;
  st.life = dead ? approach(st.life, 0, DEATH_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;

  let near = false;
  if (look && Number.isFinite(look.x) && Number.isFinite(look.z))
    near = Math.hypot(look.x - a.g.position.x, look.z - a.g.position.z) <= RANGE;
  near = near && !dead;
  st.near = approach(st.near, near ? 1 : 0, near ? NEAR_RATE : REST_RATE, dt);

  // A blow: a hard blink, then anger.
  if (!dead && cur?.kind === 'hit' && cur !== st.lastHit) { st.lastHit = cur; st.blink = 0; st.anger = 1; }
  let open = 1;
  if (st.blink !== null) { st.blink += dt / BLINK_LEN; open = blinkCurve(st.blink); if (st.blink >= 1) st.blink = null; }
  st.anger = st.anger > SNAP ? st.anger * Math.exp(-ANGER_RATE * dt) : 0;

  // The Executioner's glare: a long narrowing, now and then.
  let glare = 0;
  if (L.glareLen && !dead) {
    if (st.glare === null) { st.glareWait -= dt; if (st.glareWait <= 0 && !busy) { st.glare = 0; st.glareWait = L.glareMin + L.glareSpan * rand(st); } }
    if (st.glare !== null) { st.glare += dt / L.glareLen; glare = holdCurve(st.glare); if (st.glare >= 1) st.glare = null; }
  }
  // Croesus, the marketeer, the mugger, the convict, Thoth Amon, Charon and the prisoner: a darting look (not Thoth's or Charon's), and a glint (much sooner with
  // the hero near; the mugger's is a glance down at their pack, so only then, the convict's a
  // look aside for a way out, and the prisoner's a cringe, also only then).
  let glint = 0;
  st.glance = 0;
  if (L.glintLen && !dead) {
    if (st.glint === null) {
      st.glintWait -= dt * (near ? L.glintNear : L.glintFar ?? 1);
      if (st.glintWait <= 0 && !(busy && L.glintDrop)) {
        st.glint = 0; st.glintWait = L.glintMin + L.glintSpan * rand(st);
        if (L.glintSide) st.side = (rand(st) * 2 - 1) * L.glintSide;
      }
    }
    if (st.glint !== null) {
      st.glint += dt / L.glintLen; const v = st.glint;
      glint = v > 0 && v < 1 ? Math.sin(Math.PI * v) ** 2 : 0;
      if (L.glintDrop) st.glance = holdCurve(v);
      if (st.glint >= 1) st.glint = null;
    }
  }
  if (L.dart && !dead) {
    st.dartWait -= dt;
    if (st.dartWait <= 0) {
      const gap = L.dartGap ?? [.9, .4];
      st.dartTo = (rand(st) * 2 - 1) * L.dart * (1 + ((L.dartNear ?? 1) - 1) * st.near);
      st.dartWait = gap[near ? 1 : 0] + (L.dartGap ? gap[near ? 1 : 0] : 1.6) * rand(st);
    }
  } else st.dartTo = 0;
  st.dart = approach(st.dart, st.dartTo, 14, dt);

  // The attack, on any kind of attack once it starts.
  const atk = !dead && cur?.kind === 'attack' && (q.age ?? 0) >= (cur.wait ?? 0) ? attackCurve(q.u ?? 0) : 0;

  // The glow.
  const breath = 1 + L.breath * (1 + ((L.breathNear ?? .5) - 1) * st.near) * Math.sin(st.T * L.breathHz * TAU + st.ph);
  let k = breath * (1 + (L.near - 1) * st.near) * (1 + (L.glareGlow - 1) * glare) * (1 + ((L.glintGlow ?? 1) - 1) * glint);
  // an ember's restless flicker: Sam's quieter as the eye fixes on the hero, Charon's coals fanned
  if (L.ember) k *= 1 + L.ember * (1 + ((L.emberNear ?? .5) - 1) * st.near) * Math.sin(st.T * 9.3 + st.ph) * Math.sin(st.T * 5.1 + 2 * st.ph);
  k *= 1 + (L.atkGlow - 1) * atk + (ANGER - 1) * st.anger;
  k *= .35 + .65 * open;
  if (dead) {
    // guttering: a ragged flicker as it dies down
    const fl = .75 + .25 * Math.sin(st.T * 31 + st.ph) * Math.sin(st.T * 13.7);
    k = k * st.life * (st.life > .02 ? fl : 1);
  }
  a.eyes.material.emissiveIntensity = st.base * k;
  st.k = k;

  // The shape: widened or narrowed in the attack, narrowed in a glare, shut in a blink, sagged dead.
  let sx = 1 + (L.atkX - 1) * atk, sy = 1 + (L.atkY - 1) * atk;
  sy *= 1 + (L.glareY - 1) * glare;
  if (L.glintY) sy *= 1 + (L.glintY - 1) * glint;
  if (L.nearY) sy *= 1 + (L.nearY - 1) * st.near * (1 - atk);
  sy *= open;
  sy *= DEATH_Y + (1 - DEATH_Y) * st.life;
  const sz = 1;
  a.eyes.scale.set(sx, sy, sz);
  const gl = st.glance * st.life;
  // the head turn of convict-hunted.js (last frame's; it runs after this), the eyes leading it
  let dx = st.dart + st.side * gl;
  if (L.follow) {
    const yaw = a.convictHunted?.applied?.yaw;
    if (Number.isFinite(yaw)) dx += L.follow * Math.max(-1, Math.min(1, yaw / HUNT_YAW)) * st.life;
  }
  if (L.xMax) dx = Math.max(-L.xMax, Math.min(L.xMax, dx));
  a.eyes.position.set(st.pos.x + st.c.x * (1 - sx) + dx,
    st.pos.y + st.c.y * (1 - sy) - (L.glintDrop ?? 0) * gl, st.pos.z + st.c.z * (1 - sz));
  return st;
}
