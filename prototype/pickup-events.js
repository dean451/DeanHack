// Pickup events (magic item moments, part 2b). The bridge sends {"type":"pickup","x","z"} the moment
// the hero picks something up, and only then, so the scoop is driven by it rather than by a guess
// that an item vanishing near the hero was taken by the hero.
export const PICKUP_NOTE_LIFE = 5000;

export function createPickupNotes() {
  const notes = new Map();
  return {
    // Remembers that the hero picked something up on map square (x, z) at `now` (ms).
    note(x, z, now) { notes.set(`${x},${z}`, now); },
    // True once for a note on (x, z) that is still fresh; the note is spent either way.
    take(x, z, now) {
      const key = `${x},${z}`, at = notes.get(key);
      notes.delete(key);
      return at !== undefined && now - at <= PICKUP_NOTE_LIFE;
    },
    clear() { notes.clear(); },
  };
}

// The square an item's ground key ("x,z:glyph...") sits on.
export const squareOfKey = key => key.split(':', 1)[0];
