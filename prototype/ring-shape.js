// Disposition rings must not rely on colour alone: a pet's ring is solid, a peaceful monster's
// ring is broken into dashes, so the two read apart in greyscale too.

export const RING_DASHES = {pet: 0, peaceful: 8};

// Arcs (start, end radians) to paint for a ring with `dashes` dashes; 0 dashes is one solid ring.
export function ringArcs(dashes) {
  if (!dashes) return [[0, Math.PI * 2]];
  const step = (Math.PI * 2) / dashes, arcs = [];
  for (let i = 0; i < dashes; i++) arcs.push([i * step, i * step + step * 0.55]);
  return arcs;
}
