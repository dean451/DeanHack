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
//
// It also walks the way it was led rather than straight at its newest cell: `trail: true` keeps the
// cells it has been sent to as a path (TRAIL), its pace set by the distance left along it.
export const FELINE_GLIDE = {
  pace: [[1.2, 2.8], [2.5, 6], [4, 11]], accel: 12, brake: 7, creep: .15, catchup: 8, trail: true,
  cruise(actor, d) {
    const hip = (actor?.animator || actor?.asset?.animator)?.stepper?.hip?.() || .2, P = this.pace;
    let hs = P[0][1];
    for (let i = 1; i < P.length; i++) if (d > P[i - 1][0]) hs = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * Math.min(1, (d - P[i - 1][0]) / (P[i][0] - P[i - 1][0]));
    return hs * hip;
  },
};
export const heavySlide = a => a?.glide || HEAVY[a?.quirk] || speciesSlide(a?.species);

// Following a trail (an actor whose glide sets `trail`): each new cell it is sent to joins the end
// of actor.trail, unless it lies more than `jump` cells from the last (a teleport, a level change),
// which starts the trail over. The body steers for a point `look` cells ahead along the trail (at
// least; `lookTime` seconds of travel at speed), turning no faster than its speed allows on a curve
// of radius `radius` cells (plus `spin` rad/s on the spot), so it carves round corners on an arc
// and cuts them a little, the way a cat takes the widest line through a turn. It eases off as the
// way ahead bends (to `corner` of its speed for a right-angle turn), and with `finish` cells to go
// it walks straight onto the last cell. A cell counts as passed within `reach` of it, or once the
// body is past it along the way it came. actor.pathYaw is its heading and actor.pathLeft the distance
// still to go, for live.js to face it and to know it is walking.
export const TRAIL = {jump: 2.2, look: .35, lookTime: .15, reach: .2, radius: .25, spin: 3, corner: .55, finish: .25};

// Moves actor.g toward actor.target by one frame of dt seconds.
export function slideTo(actor, dt) {
  beginHop(actor);
  glide(actor, dt);
  endHop(actor, dt);
}

function glide(actor, dt) {
  const pos = actor.g.position, target = actor.target;
  const heavy = heavySlide(actor);
  if (heavy?.trail) return followTrail(actor, dt, heavy);
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

function followTrail(actor, dt, heavy) {
  const pos = actor.g.position, target = actor.target, trail = actor.trail || (actor.trail = []);
  const last = trail[trail.length - 1];
  if (!last || Math.hypot(target.x - last.x, target.z - last.z) > 1e-3) {
    if (last && Math.hypot(target.x - last.x, target.z - last.z) > TRAIL.jump) { trail.length = 0; actor.trailFrom = null; }
    trail.push(target.clone());
  }
  // drop the cells already reached: close to one, or past it along the way it was approached
  while (trail.length > 1) {
    const a = trail[0], prev = actor.trailFrom || pos, ax = pos.x - a.x, az = pos.z - a.z;
    if (Math.hypot(ax, az) < TRAIL.reach || ax * (a.x - prev.x) + az * (a.z - prev.z) > 0) actor.trailFrom = trail.shift(); else break;
  }
  let left = Math.hypot(trail[0].x - pos.x, trail[0].z - pos.z);
  for (let i = 1; i < trail.length; i++) left += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].z - trail[i - 1].z);
  actor.pathLeft = left;
  if (actor.pathYaw === undefined) actor.pathYaw = actor.g.rotation.y;
  // far behind (a teleport, a level change): ease straight there as everything else does
  if (left > heavy.catchup) {
    actor.slideSpeed = 0; actor.slidePlan = Math.min(12, left * EASE_RATE);
    pos.lerp(target, 1 - Math.exp(-dt * EASE_RATE)); trail.length = 0; trail.push(target.clone());
    return;
  }
  if (left < ARRIVE) { actor.slideSpeed = 0; actor.slidePlan = 0; actor.pathLeft = 0; pos.x = target.x; pos.z = target.z; trail.length = 0; trail.push(target.clone()); return; }
  // the point to steer for: `look` along the trail from where the body is
  const v0 = actor.slideSpeed || 0, look = Math.max(TRAIL.look, v0 * TRAIL.lookTime);
  let aim = trail[trail.length - 1], from = pos, need = look;
  for (const p of trail) { const seg = Math.hypot(p.x - from.x, p.z - from.z); if (seg >= need) { const k = need / seg; aim = {x: from.x + (p.x - from.x) * k, z: from.z + (p.z - from.z) * k}; break; } need -= seg; from = p; }
  const want = Math.atan2(aim.x - pos.x, aim.z - pos.z), off = Math.atan2(Math.sin(want - actor.pathYaw), Math.cos(want - actor.pathYaw));
  // pace: the cruise for the distance left, slowed by how far the way ahead bends, braking to land
  const cruise = (typeof heavy.cruise === 'function' ? heavy.cruise(actor, left) : heavy.cruise) * (1 - (1 - TRAIL.corner) * Math.min(1, Math.abs(off) / (Math.PI / 2)));
  actor.slidePlan = cruise;
  const speed = Math.min(cruise, v0 + heavy.accel * dt, Math.max(left * heavy.brake, heavy.creep));
  actor.slideSpeed = speed;
  // turn toward the aim no faster than the speed allows on the arc, then step along the heading;
  // the last stretch walks straight onto the cell
  const turn = (speed / TRAIL.radius + TRAIL.spin) * dt;
  actor.pathYaw += Math.max(-turn, Math.min(turn, off));
  const step = speed * dt;
  if (left <= TRAIL.finish && trail.length === 1) {
    const d = Math.hypot(target.x - pos.x, target.z - pos.z);
    if (step >= d) { pos.x = target.x; pos.z = target.z; } else { pos.x += (target.x - pos.x) * step / d; pos.z += (target.z - pos.z) * step / d; }
  } else { pos.x += Math.sin(actor.pathYaw) * step; pos.z += Math.cos(actor.pathYaw) * step; }
  // the height (a perch) comes along in step with the ground still to cover
  pos.y += (target.y - pos.y) * Math.min(1, step / Math.max(left, step));
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
