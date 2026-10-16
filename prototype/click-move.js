// Click to move: a left click on a floor square the hero can see. A neighbouring square is one
// step; a farther one is the engine's travel command (`_`), whose position prompt `live.js` answers
// by walking the cursor to the clicked square (`aimKeys`), the way the targeting previews do.

const WALKABLE = new Set(['floor', 'up', 'down']);
const STEP_KEY = {'-1,0': 'h', '1,0': 'l', '0,-1': 'k', '0,1': 'j', '-1,-1': 'y', '1,-1': 'u', '-1,1': 'b', '1,1': 'n'};
export const TRAVEL_KEY = 95; // '_'

// What a click on map square `sq` does: null (nothing to walk to), a single `step` with its key
// code, or a `travel` with the command code. Monsters and items on the square do not block a
// click; the engine fights or picks up as a move there would.
export function clickMove(player, sq, cell) {
  if (!player || !sq || !cell || !cell.visible || !WALKABLE.has(cell.terrain)) return null;
  const dx = sq.x - player.x, dz = sq.z - player.z;
  if (!dx && !dz) return null;
  const key = STEP_KEY[`${dx},${dz}`];
  if (key) return {kind: 'step', code: key.charCodeAt(0)};
  return {kind: 'travel', code: TRAVEL_KEY, to: {x: sq.x, z: sq.z}};
}
