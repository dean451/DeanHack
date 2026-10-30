// Items a monster is standing on. The map shows one glyph a square, so when the pet cat (or any monster) steps
// onto an item the square shows the monster and the item's own cell drops out of the frame; the item would
// vanish. It is still there, so live.js keeps drawing it until the game says otherwise:
// - the square shows the floor again (the item went with the monster) or another item: the usual rules drop it;
// - the monster on it picks it up or eats it ("Miso picks up a dagger.", "The kitten eats a tripe ration."):
//   it goes at once.
// Pure helpers, so the rules can be tested without a renderer.

// The ground-item keys (live.js keys them "x,z:glyph:...") under the monster and pet cells of a frame, with who
// stands on each square and whether it is in view: Map(cellId -> {name, pet, keys, visible}).
export function itemsUnderMonsters(cells, itemKeys) {
  const under = new Map();
  if (!cells || !itemKeys) return under;
  const keys = [...itemKeys];
  for (const c of cells) {
    if (c.kind !== 'monster' && c.kind !== 'pet') continue;
    const id = `${c.x},${c.z}`, held = keys.filter(k => k.startsWith(id + ':'));
    if (held.length) under.set(id, {name: String(c.name || '').toLowerCase(), pet: c.kind === 'pet', keys: held, visible: !!(c.visible || c.sensed)});
  }
  return under;
}

// Who picked something up or ate something, from a message line: their name as the game printed it (without a
// leading "The"), or null. The hero's own pickups ("You ...", "d - a dagger.") are not this.
export function takerOf(text) {
  const m = /^(?:the\s+)?(.+?)\s+(?:picks up|eats)\s/i.exec(String(text || '').trim());
  if (!m || /^you$/i.test(m[1])) return null;
  return m[1].toLowerCase();
}

// The squares whose held items the taker took: those where a monster of that name stands; failing that (a pet
// the player named, "Miso"), those under pets.
export function takenSquares(taker, under) {
  if (!taker || !under) return [];
  const byName = [...under].filter(([, h]) => h.name === taker).map(([id]) => id);
  if (byName.length) return byName;
  return [...under].filter(([, h]) => h.pet).map(([id]) => id);
}
