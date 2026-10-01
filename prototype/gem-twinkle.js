// Floor gems twinkle. Each cut stone carries a few four-pointed star glints on its facets (built in
// ground-models.js and baked into one mesh). Before this they sat there at full brightness and
// never moved, so a gem read as a stone with white stickers on it. Now the stars rest as faint
// specks and, one at a time, each flares up into a full star and dies away again, so the stone
// seems to catch the light as you look at it.
// Identity: the timing comes only from the seed ground-models.js gives it (the shared colour word),
// which real stones share with their glass, so a twinkle never tells them apart.

// Each star: a flash lasts FLASH s and comes every PERIOD..+PERIOD_SPAN s (its own fixed cycle).
// Between flashes a star rests at REST of its brightness and REST_SIZE of its size; at the peak it
// grows to PEAK_SIZE. The flash rises fast (RISE share of FLASH) and fades slowly.
export const FLASH = .55, PERIOD = 1.8, PERIOD_SPAN = 1.6, REST = .22, REST_SIZE = .45, PEAK_SIZE = 1.25, RISE = .25;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

// The flash's strength (0..1) at progress u (0..1) through it.
export function flashCurve(u) {
  if (!(u > 0) || !(u < 1)) return 0;
  if (u < RISE) { const k = u / RISE; return k * k * (3 - 2 * k); }
  const k = (u - RISE) / (1 - RISE);
  return (1 - k) * (1 - k);
}

// Star i's {glow, size} at time t, for a stone seeded with `seed` (an unsigned int). Stars are
// spaced evenly round their cycles so they take turns.
export function twinkleAt(t, i, n, seed) {
  if (!Number.isFinite(t)) t = 0;
  const h = Math.imul((seed >>> 0) ^ (i + 1) * 0x9e3779b1, 2654435761) >>> 0;
  const period = PERIOD + PERIOD_SPAN * (h % 1000) / 1000;
  const phase = ((seed >>> 0) % 997) / 997 + i / Math.max(1, n);
  const s = ((t / period + phase) % 1 + 1) % 1 * period;
  const f = flashCurve(s / FLASH);
  return {glow: REST + (1 - REST) * f, size: REST_SIZE + (PEAK_SIZE - REST_SIZE) * f};
}

// Turns a baked glint mesh into a twinkling one. `stars` is [{start, count, centre: [x,y,z]}] in
// vertex order of the baked geometry. Returns update(t). The material must use vertexColors.
export function makeTwinkle(mesh, stars, seed) {
  const geo = mesh.geometry, pos = geo.attributes.position, col = geo.attributes.color;
  const base = Float32Array.from(pos.array);
  return t => {
    stars.forEach(({start, count, centre: [cx, cy, cz]}, i) => {
      const {glow, size} = twinkleAt(t, i, stars.length, seed);
      for (let v = start; v < start + count; v++) {
        const o = v * 3;
        pos.array[o] = cx + (base[o] - cx) * size;
        pos.array[o + 1] = cy + (base[o + 1] - cy) * size;
        pos.array[o + 2] = cz + (base[o + 2] - cz) * size;
        col.array[o] = col.array[o + 1] = col.array[o + 2] = clamp01(glow);
      }
    });
    pos.needsUpdate = col.needsUpdate = true;
  };
}
