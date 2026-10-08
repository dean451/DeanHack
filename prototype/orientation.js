// The one orientation convention. Read ORIENTATION.md first.
//
// World: x runs east, z runs south (down the screen), y is up. A map cell (x, z) sits at world
// (x, z). A model's forward is +z at yaw 0; yaw turns it about +y, so a direction (dx, dz)
// becomes the yaw atan2(dx, dz): south 0, east +PI/2, north PI, west -PI/2.
export const FORWARD = Object.freeze({x: 0, z: 1});

// NetHack's eight move keys as map steps.
export const DIRECTIONS = Object.freeze({
  h: [-1, 0], l: [1, 0], k: [0, -1], j: [0, 1],
  y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
});

// The yaw that points a model's forward along the map step (dx, dz). A zero step has no
// direction: it returns `fallback` so callers keep a creature's current facing.
export function yawToward(dx, dz, fallback = 0) {
  return dx === 0 && dz === 0 ? fallback : Math.atan2(dx, dz);
}

// The map step (unit length, not snapped) a yaw faces: the inverse of yawToward.
export function stepOfYaw(yaw) {
  return {x: Math.sin(yaw), z: Math.cos(yaw)};
}

// Models that sit in a wall (doors, grates, bars, drawbridges) are authored with the wall
// running along x and their front facing +z. Pass how many wall neighbours the cell has
// along each axis; get the yaw that lines the model up, or null when that does not settle it.
export function wallYaw(alongX, alongZ) {
  return alongX === alongZ ? null : alongX > alongZ ? 0 : Math.PI / 2;
}

// Held weapons are authored upright from the grip (+y); equipment.js turns them a quarter
// about their own axis (HELD_TURN) so the flat of the blade faces forward.
