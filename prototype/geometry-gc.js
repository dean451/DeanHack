// Frees the GPU memory of what the live scene lets go of. three.js never frees a geometry's buffers on its own:
// a released monster, a picked-up item, a whole level's tiles stayed in video memory for the rest of the session
// (a monster alone is 15,000 to 40,000 vertices), so a long game kept growing. Released objects are queued; once a
// frame their geometries are disposed, except any still drawn by something in the scene (shared shapes: the
// lighter monster copies, the tile kit, cached hulls), which a later release frees when its last user goes. A
// geometry disposed while some cache still holds it is simply uploaded again if it is ever drawn.
// Materials are left alone on purpose: disposing one releases its shader program, and the next monster of that
// kind would compile it again, a hitch; their memory is small.
export function createGeometryGC() {
  const pending = new Set();
  return {
    queue(object) { object?.traverse?.(o => { if (o.geometry) pending.add(o.geometry); }); },
    // root: the live scene group. Returns how many geometries were freed.
    flush(root) {
      if (!pending.size) return 0;
      const used = new Set();
      root.traverse(o => { if (o.geometry) used.add(o.geometry); });
      let freed = 0;
      for (const g of pending) if (!used.has(g)) { g.dispose(); freed++; }
      pending.clear();
      return freed;
    },
    get pending() { return pending.size; },
  };
}
