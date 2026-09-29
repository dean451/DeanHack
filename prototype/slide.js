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
// cube and the puddings ooze, with a long soft stop.
export const SPECIES_SLIDE = {
  zombie: {cruise: 1.6, accel: 4.5, brake: 4, creep: .15, catchup: 1.6},
  golem: {cruise: 1.3, accel: 3.5, brake: 4.5, creep: .15, catchup: 1.6},
  ooze: {cruise: 1.2, accel: 3.5, brake: 3, creep: .12, catchup: 1.6},
};
const HEAVY_GOLEMS = new Set(['leather golem', 'wood golem', 'flesh golem', 'clay golem',
  'stone golem', 'glass golem', 'iron golem']);
const OOZES = new Set(['gelatinous cube', 'brown pudding', 'black pudding', 'gray ooze']);

export function speciesSlide(species) {
  if (typeof species !== 'string') return null;
  if (/ zombie$/.test(species)) return SPECIES_SLIDE.zombie;
  if (HEAVY_GOLEMS.has(species)) return SPECIES_SLIDE.golem;
  if (OOZES.has(species)) return SPECIES_SLIDE.ooze;
  return null;
}
// Closer than this and the actor is set exactly on its target.
const ARRIVE = 2e-3;

export const heavySlide = a => HEAVY[a?.quirk] || speciesSlide(a?.species);

// Moves actor.g toward actor.target by one frame of dt seconds.
export function slideTo(actor, dt) {
  const pos = actor.g.position, target = actor.target;
  const heavy = heavySlide(actor);
  const d = pos.distanceTo(target);
  if (!heavy || d > heavy.catchup) {
    actor.slideSpeed = 0;
    pos.lerp(target, 1 - Math.exp(-dt * EASE_RATE));
    return;
  }
  if (d < ARRIVE) {
    actor.slideSpeed = 0;
    pos.copy(target);
    return;
  }
  const v = Math.min(heavy.cruise, (actor.slideSpeed || 0) + heavy.accel * dt);
  const speed = Math.min(v, Math.max(d * heavy.brake, heavy.creep));
  actor.slideSpeed = speed;
  const step = speed * dt;
  if (step >= d) pos.copy(target);
  else pos.lerp(target, step / d);
}
