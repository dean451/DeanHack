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

// Sprites visible at time t (ms) into the replay.
export function fxSpritesAt(timeline, t) {
  return timeline.sprites.filter(s => t >= s.from && t < s.until);
}
