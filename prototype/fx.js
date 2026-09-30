// Replay timing for the bridge's {"type":"fx"} events: the temporary glyphs NetHack draws
// with tmp_at() (beams, bounces, thrown objects, explosions), which map frames only show
// the end state of. fxTimeline() turns the recorded steps into sprites with a start and
// end time, so later effects (rays, explosions, throws) can play them back in order.

// NetHack pauses 50ms per delay_output(); the client replays at the same pace.
export const FX_TICK_MS = 50;

const KEEPS_TRAIL = new Set(['beam', 'all', 'tether']);

// Returns {duration, sprites:[{seq, mode, effect, glyph, x, z, from, until}]} in ms.
// Beams keep every cell lit until their sequence ends; flashes show one cell at a time.
// A sequence left open (the engine stopped for a prompt mid-effect) ends with the event.
export function fxTimeline(event, tickMs = FX_TICK_MS) {
  const sprites = [];
  const stack = [];
  let t = 0, nextSeq = 0;
  const closeFlash = s => { if (s.current) { s.current.until = t; s.current = null; } };
  for (const step of event?.steps ?? []) {
    const top = stack[stack.length - 1];
    if (step.op === 'start') {
      stack.push({seq: nextSeq++, mode: step.mode, glyph: step.glyph, effect: step.effect, lit: [], current: null});
    } else if (step.op === 'change' && top) {
      top.glyph = step.glyph; top.effect = step.effect;
    } else if ((step.op === 'draw' || step.op === 'retract') && top && Number.isInteger(step.x) && Number.isInteger(step.z)) {
      const sprite = {seq: top.seq, mode: top.mode, effect: top.effect, glyph: top.glyph, x: step.x, z: step.z, from: t, until: null};
      if (step.op === 'retract') { const last = top.lit.pop(); if (last) last.until = t; }
      if (KEEPS_TRAIL.has(top.mode)) top.lit.push(sprite); else { closeFlash(top); top.current = sprite; }
      sprites.push(sprite);
    } else if (step.op === 'tick') {
      t += tickMs;
    } else if (step.op === 'end' && top) {
      stack.pop();
      for (const s of top.lit) if (s.until === null) s.until = t;
      closeFlash(top);
    }
  }
  // Anything still showing ends one tick after the last recorded moment.
  const duration = t + (sprites.some(s => s.until === null) ? tickMs : 0);
  for (const s of sprites) if (s.until === null || s.until <= s.from) s.until = Math.max(s.from + tickMs, s.until ?? duration);
  return {duration: Math.max(duration, ...sprites.map(s => s.until), 0), sprites};
}

// The same timeline started `ms` later: every sprite and the duration shift by ms. The
// hero's zap uses it so the arm can wind up before the beam leaves the hand.
export function delayTimeline(timeline, ms) {
  const d = Number.isFinite(ms) && ms > 0 ? ms : 0;
  if (!timeline || !d) return timeline;
  return {...timeline, duration: (timeline.duration ?? 0) + d,
    sprites: (timeline.sprites ?? []).map(s => ({...s, from: s.from + d, until: s.until + d}))};
}

// Sprites visible at time t (ms) into the replay.
export function fxSpritesAt(timeline, t) {
  return timeline.sprites.filter(s => t >= s.from && t < s.until);
}

// How long (ms) to hold back the next map frame so a ray or explosion plays before the
// frame shows its result (a corpse, a scorched door). Only sequences the client draws
// (zaps, the digging beam, explosions and thrown objects) count; a blast gets extra time
// for its fireball to swell. Holding a dig keeps the wall standing until the beam has gone
// through it; holding a throw keeps the landed item and the target's hit off the map until
// the flight arrives. Throws get a lower cap, since a long volley is many short flights.
// Capped so the map never lags far behind the game.
export const FX_HOLD_MAX_MS = 1000;
export const FX_BLAST_HOLD_MS = 250;
export const FX_OBJECT_HOLD_MAX_MS = 600;
export function fxHoldMs(timeline, cap = FX_HOLD_MAX_MS) {
  let ms = 0, thrown = 0;
  for (const s of timeline?.sprites ?? []) {
    const kind = s.effect?.kind;
    if (kind === 'zap' || kind === 'dig') ms = Math.max(ms, s.until);
    else if (kind === 'explosion') ms = Math.max(ms, s.from + FX_BLAST_HOLD_MS, s.until);
    else if (kind === 'object') thrown = Math.max(thrown, s.until);
  }
  ms = Math.max(ms || 0, Math.min(FX_OBJECT_HOLD_MAX_MS, thrown || 0));
  return Math.min(cap, Math.max(0, Math.ceil(ms)));
}
