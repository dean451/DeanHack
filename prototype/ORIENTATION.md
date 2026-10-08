# Orientation convention

One rule for which way things face. Use `orientation.js`; do not add a per-object rotation fudge.

## World
- x runs east, z runs south (down the screen), y is up. Map cell (x, z) sits at world (x, z).
- A model is authored facing **+z** (south) at yaw 0. Yaw turns it about +y.
- A map step (dx, dz) becomes a yaw with `atan2(dx, dz)` (`yawToward`): south 0, east +PI/2, north PI, west -PI/2. `stepOfYaw` goes back.
- The move keys are `h` west, `l` east, `k` north, `j` south, `y u b n` the diagonals (`DIRECTIONS`).

## Monsters, pets and the hero
Face the step they are moving or attacking along: `rotation.y = yawToward(dx, dz, current)`. A zero step keeps the current facing.

## Things in walls (doors, grates, bars, drawbridges)
Authored with the wall running along x and the front (the side a door opens toward) on +z. Count wall neighbours along each axis and use `wallYaw(alongX, alongZ)`: 0 when the wall runs along x, PI/2 along z, `null` when undecided (leave as is). A door in a horizontal wall opens toward +z.

## Held weapons
Authored upright from the grip (+y). `turnHeld` in `equipment.js` rotates them a quarter (`HELD_TURN`) about their own axis once, in one place, so the flat of the blade faces forward. Do not add other turns per weapon.

## Traps and boulders
Flat things need no facing. A rolling boulder rolls along its travel step: yaw from `yawToward`, tumble about its local x axis.

## Adoption
Done: the helper, and doors, grates and drawbridges via `wallYaw`/`yawToward`. Next, one category per PR: doors that look 90 degrees off in a doorway (check against a live game), then monster facing, then held weapon angle.
