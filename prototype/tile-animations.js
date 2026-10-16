// The animated parts of the level's tiles: sconce flames, altar candles, a fire trap's embers, a
// magic trap's sigil. They carry `updateFire(t)` or `animate(t)` in their userData. The render loop
// used to find them by walking every object under every visible tile each frame (about 2,400 objects
// on a fresh level to reach a dozen hooks), a cost that grew with everything on the map. Now each tile
// is walked once when it is built and its hooks are kept here; a frame runs only those, and only
// for tiles that are visible. A tile that is released or replaced drops out.

export function createAnimatedRegistry() {
  const byTile = new Map(); // tile -> its hooked objects
  const hooked = o => !!(o.userData && (o.userData.updateFire || o.userData.animate));
  return {
    // Walks the tile once; nothing is kept for a tile with no hooks.
    add(tile) {
      if (!tile?.traverse) return 0;
      const list = [];
      tile.traverse(o => { if (hooked(o)) list.push(o); });
      if (list.length) byTile.set(tile, list); else byTile.delete(tile);
      return list.length;
    },
    remove(tile) { byTile.delete(tile); },
    clear() { byTile.clear(); },
    // Runs this frame's hooks on the visible tiles.
    update(t) {
      let ran = 0;
      for (const [tile, list] of byTile) {
        if (!tile.visible) continue;
        for (const o of list) { o.userData.updateFire?.(t); o.userData.animate?.(t); ran++; }
      }
      return ran;
    },
    get tiles() { return byTile.size; },
    get hooks() { let n = 0; for (const l of byTile.values()) n += l.length; return n; },
  };
}
