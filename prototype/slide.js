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
// Closer than this and the actor is set exactly on its target.
const ARRIVE = 2e-3;

export const heavySlide = a => HEAVY[a?.quirk] || null;

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
