// How an actor slides from cell to cell in Live. Most monsters glide over with an exponential
// ease (rate 10: most of the way in ~.25 s), which suits quick creatures. A heavy, slow monster
// like the giant turtle looks wrong darting off and then creeping in, and at that pace a whole
// move lasts under half of its plod's stride. Heavy movers instead pull away from rest, cruise
// at a steady walking speed and brake into the new cell, so one cell takes about a second.
//
// If a heavy mover falls far behind its target (a teleport, a level change or several queued
// moves), it catches up with the ordinary ease so it never lags the game.

// Ordinary exponential rate (1/s) for everything else, and for catching up.
export const EASE_RATE = 10;
// cruise: top speed (cells/s); accel: pull-away (cells/s²); brake: speed per cell still to go,
// so it slows over the last ~.35 cell; creep: the slowest it goes, so it lands instead of
// crawling forever; catchup: distance (cells) past which it eases instead.
export const HEAVY = {turtle: {cruise: 1.4, accel: 5, brake: 4, creep: .15, catchup: 1.6}};
// Other slow, heavy movers share generic quirks, so they're picked by species (live.js sets
// actor.species to the lower-case monster name). Zombies shamble a little quicker than the
// turtle; the heavy golems (NetHack speed 3–8) trudge with a slow pull-away; the gelatinous
// cube and the puddings ooze, with a long soft stop. The ghoul (speed 6, like a human zombie)
// lopes: it pulls away harder and cruises a little faster than a zombie, then brakes short.
// The skeleton (speed 8) jerks into motion quicker still and stops dead, like a marionette.
export const SPECIES_SLIDE = {
  zombie: {cruise: 1.6, accel: 4.5, brake: 4, creep: .15, catchup: 1.6},
  ghoul: {cruise: 1.9, accel: 6, brake: 4.5, creep: .15, catchup: 1.6},
  skeleton: {cruise: 2, accel: 8, brake: 6, creep: .2, catchup: 1.6},
  golem: {cruise: 1.3, accel: 3.5, brake: 4.5, creep: .15, catchup: 1.6},
  ooze: {cruise: 1.2, accel: 3.5, brake: 3, creep: .12, catchup: 1.6},
};
const HEAVY_GOLEMS = new Set(['leather golem', 'wood golem', 'flesh golem', 'clay golem',
  'stone golem', 'glass golem', 'iron golem']);
const OOZES = new Set(['gelatinous cube', 'brown pudding', 'black pudding', 'gray ooze']);

export function speciesSlide(species) {
  if (typeof species !== 'string') return null;
  if (/ zombie$/.test(species)) return SPECIES_SLIDE.zombie;
  if (species === 'ghoul') return SPECIES_SLIDE.ghoul;
  if (species === 'skeleton') return SPECIES_SLIDE.skeleton;
  if (HEAVY_GOLEMS.has(species)) return SPECIES_SLIDE.golem;
  if (OOZES.has(species)) return SPECIES_SLIDE.ooze;
  return null;
}
// Closer than this and the actor is set exactly on its target.
const ARRIVE = 2e-3;

// A skinned, legged animal (the pet cat, the fox on our rig) walks from tile to tile at a cat's own
// pace and hurries only when it falls behind: its cruise depends on how far it has to go, in hip
// heights per second (`pace`: [distance in cells, h/s] points, linear between), so a cat a tile away
// walks (2.8 h/s, a real cat's 0.65 m/s), one falling behind trots and one far behind gallops
// (cat-motion/README.md §1). Only past `catchup` cells (a teleport) does it ease straight there. An
// actor opts in with `actor.glide` (createSkinnedFeline, rigFox); its animator's stepper knows its
// hip height.
export const FELINE_GLIDE = {
  pace: [[1.2, 2.8], [2.5, 6], [4, 11]], accel: 12, brake: 7, creep: .15, catchup: 8,
  cruise(actor, d) {
    const hip = (actor?.animator || actor?.asset?.animator)?.stepper?.hip?.() || .2, P = this.pace;
    let hs = P[0][1];
    for (let i = 1; i < P.length; i++) if (d > P[i - 1][0]) hs = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * Math.min(1, (d - P[i - 1][0]) / (P[i][0] - P[i - 1][0]));
    return hs * hip;
  },
};
export const heavySlide = a => a?.glide || HEAVY[a?.quirk] || speciesSlide(a?.species);

// Moves actor.g toward actor.target by one frame of dt seconds.
export function slideTo(actor, dt) {
  beginHop(actor);
  glide(actor, dt);
  endHop(actor, dt);
}

function glide(actor, dt) {
  const pos = actor.g.position, target = actor.target;
  const heavy = heavySlide(actor);
  const d = pos.distanceTo(target);
  if (!heavy || d > heavy.catchup) {
    actor.slideSpeed = 0;
    // the speed this move is taking, for an animator choosing a gait before the body is up to speed
    actor.slidePlan = d > ARRIVE ? Math.min(12, d * EASE_RATE) : 0;
    pos.lerp(target, 1 - Math.exp(-dt * EASE_RATE));
    return;
  }
  if (d < ARRIVE) {
    actor.slideSpeed = 0; actor.slidePlan = 0;
    pos.copy(target);
    return;
  }
  // a glide knows its cruise from the first frame of the step: the gait it calls for holds to the end
  const cruise = typeof heavy.cruise === 'function' ? heavy.cruise(actor, d) : heavy.cruise;
  actor.slidePlan = cruise;
  const v = Math.min(cruise, (actor.slideSpeed || 0) + heavy.accel * dt);
  const speed = Math.min(v, Math.max(d * heavy.brake, heavy.creep));
  actor.slideSpeed = speed;
  const step = speed * dt;
  if (step >= d) pos.copy(target);
  else pos.lerp(target, step / d);
}

// Hops. A step that changes height (onto an altar, up a stair, off a grave; see perch.js)
// would otherwise ramp straight up through the furniture's edge. Instead the actor's height
// follows an arc over the step: the straight line from where it stood to the new height, plus
// a bump of lift + k·|rise| that peaks halfway across, so it springs up and drops onto the top,
// or hops off and lands on the floor. Progress is how much of the step's ground distance is
// covered, so the hop keeps pace with whichever slide carries it, but never ahead of its own
// clock (`time` s): the ordinary ease covers 15% of a step in its first frame, which would pop. Steps of under `min` rise
// (the down stair's .03) just ramp; a jump of more than `far` (a teleport, a level change) or a
// height change with no step under it (the furniture appearing under someone) just eases.
export const HOP = {min: .05, lift: .07, k: .25, near: .3, far: 1.6, time: .3};

// Height of the hop at progress p (0–1) from y0 to y1.
export function hopArc(y0, y1, p) {
  if (p >= 1) return y1;
  if (p <= 0) return y0;
  return y0 + (y1 - y0) * p + (HOP.lift + HOP.k * Math.abs(y1 - y0)) * 4 * p * (1 - p);
}

// beginHop and endHop go round whatever moves actor.g toward actor.target this frame. The
// move itself sees a plain straight-line height (actor.slideY); endHop puts the arc on top and
// remembers the shown height (actor.hopAt.y), which others may add to and take back between frames.
export function beginHop(actor) {
  const pos = actor.g.position, target = actor.target, at = actor.hopAt;
  // Something else put the actor somewhere new (a level change): start from where it is.
  const moved = !at || Math.abs(at.x - pos.x) > 1e-6 || Math.abs(at.z - pos.z) > 1e-6;
  const shown = moved ? pos.y : at.y;
  if (moved) actor.slideY = shown;
  const h = actor.hop;
  if (!h || h.tx !== target.x || h.ty !== target.y || h.tz !== target.z) {
    const ground = Math.hypot(target.x - pos.x, target.z - pos.z), rise = target.y - shown;
    actor.hop = {tx: target.x, ty: target.y, tz: target.z, ground, y0: shown, t: 0,
      on: Math.abs(rise) >= HOP.min && ground >= HOP.near && ground <= HOP.far};
    actor.slideY = shown;
  }
  pos.y = actor.slideY ?? shown;
}

export function endHop(actor, dt) {
  const pos = actor.g.position, target = actor.target, h = actor.hop;
  actor.slideY = pos.y;
  if (h?.on) {
    h.t += dt;
    const p = Math.min(1 - Math.hypot(target.x - pos.x, target.z - pos.z) / h.ground, h.t / HOP.time);
    if (p >= 1 - 1e-4) { h.on = false; pos.y = target.y; actor.slideY = target.y; }
    else pos.y = hopArc(h.y0, h.ty, p);
  }
  actor.hopAt = {x: pos.x, y: pos.y, z: pos.z};
}
