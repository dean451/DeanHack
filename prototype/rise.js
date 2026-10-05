// Corpses getting back up. The bridge sends {"type":"revive"} when a corpse comes back to
// life: a troll regenerating, undead turning, a zombie digging itself out. Before this the
// monster just popped in where the corpse had been. Now it starts out lying as a toppled
// death leaves it, twitches, and hauls itself upright, with a puff of grave dust and a few
// sickly motes. A body that got up out of the hero's pack, or was nudged to the next free
// square, slides over from where the corpse lay as it rises.
//
// reviveAction(ev) normalises the event. createRiseWatch() keeps the last few revivals until
// the map frame with the new monster arrives and live.js asks claim() about each new actor.
// risePose(u, from) gives action-layer offsets (see actions.js).

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// Seconds to get up; when (u) the dust puffs, as it starts to push itself up.
export const RISE_TIME = 1.8;
export const RISE_BURST_U = .3;
// How long a revival waits for its monster to show up in a frame (ms).
export const RISE_WAIT_MS = 4000;

const WHERE = new Set(['floor', 'invent', 'minvent', 'buried', 'contained', 'other']);
const cell = p => !!p && Number.isInteger(p.x) && Number.isInteger(p.z);

export function reviveAction(ev) {
  if (!ev || ev.type !== 'revive' || !cell(ev)) return null;
  return {
    x: ev.x, z: ev.z,
    from: cell(ev.from) ? {x: ev.from.x, z: ev.from.z} : {x: ev.x, z: ev.z},
    where: WHERE.has(ev.where) ? ev.where : 'other',
    name: typeof ev.name === 'string' ? ev.name : null,
    pet: !!ev.pet,
  };
}

// The action for a revival: `from` is the offset (in tiles) from the monster's square back to
// the corpse's, so it can slide over as it gets up. A buried zombie climbs out of the ground.
export function riseActionFor(r) {
  if (!r) return null;
  const dx = r.from.x - r.x, dz = r.from.z - r.z;
  const far = Math.hypot(dx, dz) > 2.5;          // a long way off: don't drag it across the map
  return {kind: 'rise', from: far ? [0, 0] : [dx, dz], buried: r.where === 'buried'};
}

export function createRiseWatch(wait = RISE_WAIT_MS) {
  let pending = [];
  return {
    add(r, now) { if (r) { pending.push({...r, until: now + wait}); if (pending.length > 8) pending.shift(); } },
    // A new actor appeared at map square (x, z) as `name`: the revival it came from, if any.
    claim(x, z, name, now) {
      pending = pending.filter(p => p.until > now);
      const i = pending.findIndex(p => p.x === x && p.z === z && (!p.name || !name || name.includes(p.name)));
      return i < 0 ? null : pending.splice(i, 1)[0];
    },
    get size() { return pending.length; },
  };
}

// Offsets at normalised time u (0..1), in actions.js's pose shape. It begins exactly where
// deaths.js's topple ends (on its side, sunk a little, head down, a size smaller) and ends at
// rest, so a body that fell that way gets up out of the same pose.
export function risePose(u, from = null, buried = false) {
  const p = {dx: 0, dy: 0, dz: 0, pitch: 0, roll: 0, head: 0, scale: 1};
  u = clamp01(u);
  const up = smooth((u - .3) / .55);                 // hauling itself upright
  // lying still, then two twitches as life comes back
  const twitch = u < .3 ? Math.sin(u / .3 * Math.PI * 2) * Math.sin(u / .3 * Math.PI) * .12 : 0;
  // it overshoots upright, swaying back past vertical, then steadies
  const sway = u > .7 ? Math.sin((u - .7) / .3 * Math.PI * 2) * .1 * (1 - (u - .7) / .3) : 0;
  const hunch = Math.sin(up * Math.PI);              // bent forward while it pushes up
  // halfway up, the neck cracks sideways the wrong way, once, and the head lolls back into place
  const crick = Math.sin(Math.PI * clamp01((u - .55) / .14)) ** 2 * .3;
  p.roll = 1.45 * (1 - up) + twitch + sway;
  p.pitch = .3 * hunch;
  p.head = -.4 * (1 - up) + .3 * hunch * (1 - up) + twitch * 1.5 + crick;
  p.scale = 1 - .12 * (1 - up);
  if (buried) {
    // clawing out of the ground: sunk to the shoulders, standing as it comes up
    p.roll = twitch + sway;
    p.dy = -.9 * (1 - smooth((u - .15) / .7));
  } else p.dy = -.12 * (1 - up);
  if (Array.isArray(from)) {
    const k = 1 - smooth((u - .25) / .6);
    if (Number.isFinite(from[0]) && Number.isFinite(from[1])) { p.dx = from[0] * k; p.dz = from[1] * k; }
  }
  return p;
}
