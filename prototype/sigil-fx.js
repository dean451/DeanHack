// The magic traps' sigil (trap.js: teleport, magic / sleeping gas / anti-magic, polymorph,
// ice) is alive. It beats like a slow heart: a double throb, lub-dub, then a long dim wait.
// On each lub the black-candle flames are drawn inward toward the staring eye and stretch,
// as if the sigil were sucking in air, then let go. Between beats each flame gutters on its
// own: a restless lick, now and then a near-snuff that sinks it low and dark before it climbs
// back. The ice sigil has no candles, so it only beats, slower and colder.
// Every magic trap gets the same motion, and a known trap is already on the map, so nothing
// is given away. trap.js sets userData.animate to sigilAnimator(); live.js already calls every
// visible tile's animate(t). The flames are merged into the `sigil-glow` mesh, so they're found
// by height (the strokes lie flat at y .005) and moved in place through that mesh's position
// and colour attributes. Only their slice of the buffers is re-uploaded. No extra draws.

export const BEAT_EVERY = 3.6; // seconds between heartbeats
export const ICE_SLOW = 1.4; // the ice sigil beats this much slower
export const GLOW_REST = 1.05; // the sigil's brightness between beats (trap.js models it at 1.35)
export const LUB = [0, .55, .075]; // [when (0..1 of a beat), extra brightness, width]
export const DUB = [.17, .38, .065];
export const FLAME_MIN_Y = .015; // glow vertices above this are candle flames
export const PULL = .012; // how far a flame tip is drawn toward the eye on a lub
export const STRETCH = .35; // how much taller it grows then
export const SWAY = .004; // a flame tip's restless sideways lick
export const SNUFF = .55; // how far a near-snuff sinks a flame (0..1)

const throb = (u, [at, amp, w]) => {
  // Wrapped so a throb near the end of a beat doesn't clip.
  let d = u - at;d -= Math.round(d);
  return amp * Math.exp(-(d * d) / (w * w));
};

export function beatAt(t, phase = 0, every = BEAT_EVERY) {
  const b = t / every + phase, u = b - Math.floor(b);
  return {u, lub: throb(u, LUB) / LUB[1], glow: GLOW_REST + throb(u, LUB) + throb(u, DUB)};
}

// Flame i at time t: brightness (1 is as modelled), height scale, sideways lick, and pull
// toward the eye (0..1). Smooth in t.
export function flameAt(t, i, phase = 0) {
  const k = i * 2.39 + phase * 17;
  const lick = Math.sin(t * 5.3 + k) * .6 + Math.sin(t * 8.9 + k * 1.7) * .4;
  // A near-snuff: a slow wave that only bites when it's near its peak, about once every ~12 s.
  const w = .5 + .5 * Math.sin(t * .53 + k * 3.1) * Math.sin(t * .31 + k * .7 + 1);
  const snuff = SNUFF * Math.max(0, (w - .72) / .28) ** 2;
  const {lub} = beatAt(t, phase);
  const flicker = .08 * Math.sin(t * 11.7 + k * 2.3) + .05 * Math.sin(t * 17.3 + k);
  return {
    bright: Math.max(.15, (1 + flicker + .25 * lub) * (1 - snuff)),
    height: (1 + STRETCH * lub + .06 * lick) * (1 - .6 * snuff),
    lick: SWAY * lick,
    pull: lub,
  };
}

function phaseOf(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Group the flame vertices of the glow geometry, one cluster per candle.
export function findFlames(geo) {
  const pos = geo.attributes.position, flames = [];
  let lo = Infinity, hi = -1;
  for (let v = 0; v < pos.count; v++) {
    const y = pos.getY(v);
    if (y < FLAME_MIN_Y) continue;
    const x = pos.getX(v), z = pos.getZ(v);
    let f = flames.find(f => Math.hypot(f.x0 - x, f.z0 - z) < .04);
    if (!f) flames.push(f = {x0: x, z0: z, verts: []});
    f.verts.push(v);lo = Math.min(lo, v);hi = Math.max(hi, v);
  }
  for (const f of flames) {
    let sx = 0, sz = 0, y0 = Infinity, y1 = -Infinity;
    for (const v of f.verts) { sx += pos.getX(v);sz += pos.getZ(v);y0 = Math.min(y0, pos.getY(v));y1 = Math.max(y1, pos.getY(v)); }
    f.x = sx / f.verts.length;f.z = sz / f.verts.length;f.y0 = y0;f.h = y1 - y0;
    const r = Math.hypot(f.x, f.z) || 1;f.ix = -f.x / r;f.iz = -f.z / r; // toward the eye
    f.base = f.verts.map(v => [pos.getX(v), pos.getY(v), pos.getZ(v)]);
    f.col = f.verts.map(v => [geo.attributes.color.getX(v), geo.attributes.color.getY(v), geo.attributes.color.getZ(v)]);
  }
  return {flames, lo, hi};
}

export function attachSigilFx(trap) {
  let glow = null;
  trap.traverse(o => { if (!glow && o.isMesh && o.name === 'sigil-glow') glow = o; });
  if (!glow) return null;
  const {flames, lo, hi} = findFlames(glow.geometry);
  return {glow, flames, lo, hi, ice: !!trap.getObjectByName('sigil-frost')};
}

export function poseSigil(fx, t, phase = 0) {
  const {glow, flames, lo, hi, ice} = fx;
  glow.material.color.setScalar(beatAt(t, phase, ice ? BEAT_EVERY * ICE_SLOW : BEAT_EVERY).glow);
  if (!flames.length) return;
  const pos = glow.geometry.attributes.position, col = glow.geometry.attributes.color;
  flames.forEach((f, i) => {
    const s = flameAt(t, i, phase);
    // Sideways is across the inward direction, so a lick and a pull never fight.
    const px = f.ix * PULL * s.pull - f.iz * s.lick, pz = f.iz * PULL * s.pull + f.ix * s.lick;
    f.verts.forEach((v, j) => {
      const [x, y, z] = f.base[j], h = (y - f.y0) / (f.h || 1), bend = h * h;
      pos.setXYZ(v, x + px * bend, f.y0 + (y - f.y0) * s.height, z + pz * bend);
      const [r, g, b] = f.col[j];
      col.setXYZ(v, r * s.bright, g * s.bright, b * s.bright);
    });
  });
  for (const a of [pos, col]) {
    a.clearUpdateRanges?.();a.addUpdateRange?.(lo * 3, (hi - lo + 1) * 3);
    a.needsUpdate = true;
  }
}

// For trap.js: the sigil's userData.animate.
export function sigilAnimator(trap, seed = 0) {
  const phase = phaseOf(seed);
  let fx;
  return t => {
    if (fx === undefined) fx = attachSigilFx(trap);
    if (fx) poseSigil(fx, t, phase);
  };
}
