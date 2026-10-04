// Furniture that fills its tile (an altar block, a throne, a washstand, a stair flight, a
// grave mound) would swallow whoever stands on it, now that the bridge keeps sending the
// furniture under the hero or a monster. They stand on top instead: the height of the
// model's walking surface at the tile centre, measured by casting down onto each model
// (perch.test.js checks the numbers still match). slideTo eases the actor up and down
// with its step, so it climbs on as it arrives and steps off as it leaves.
// Floor, water, lava, doorways and fountains (whose basin the occupant stands in) stay 0.
export const PERCH = {altar: .395, throne: .41, sink: .04, up: .285, down: .03, grave: .12};

// Stand height (world y) for a map cell's terrain name.
export const perchHeight = terrain => PERCH[terrain] || 0;
