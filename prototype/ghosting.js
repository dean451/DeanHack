// A faint shimmer on the hero while they're invisible. When the frame says the player is
// invisible (bridge.c's `player.invisible`, true exactly when tty hides the hero's own glyph), the
// hero fades over about half a second to a glassy ghost: most of the body see-through, with a slow
// ripple of slightly stronger opacity running up it, like heat haze. When they become visible
// again, they fade back in and every material is put back exactly as it was.
//
// This mirrors what tty already shows (the hero's `@` vanishes), so it gives nothing away. It
// doesn't touch any other actor: invisible monsters stay hidden by live.js as before.
//
// Each mesh's material is cloned the first time the ghost needs it and the original kept in
// `mesh.userData.ghostSaved`, so shared materials elsewhere are never changed. Meshes added later
// (a new helmet or shield) are picked up on the next frame. At full visibility, the clones are
// disposed and the originals restored.

// GHOST: opacity at full invisibility; RIPPLE: how much the haze adds on top; RATE: ripple speed
// (rad/s); BANDS: ripple bands per unit of height; FADE_IN/FADE_OUT: how quickly the ghost comes
// on and goes off (1/s).
export const GHOST = .26, RIPPLE = .1, RATE = 3.2, BANDS = 5, FADE_IN = 6, FADE_OUT = 5;
const SNAP = 1e-3;

// The opacity factor for a mesh at height `y` at time `t` with ghost blend `b` (0..1).
export function ghostOpacity(b, t, y = 0) {
  if (!(b > 0)) return 1;
  const haze = GHOST + RIPPLE * (.5 + .5 * Math.sin(t * RATE - y * BANDS)) * (.75 + .25 * Math.sin(t * 1.3));
  return 1 - Math.min(1, b) * (1 - haze);
}

export function updateGhosting(actor, dt, t, invisible) {
  const g = actor?.g;
  if (!g) return 0;
  let b = actor.ghostBlend ?? 0;
  const target = invisible ? 1 : 0;
  b += (target - b) * (1 - Math.exp(-(invisible ? FADE_IN : FADE_OUT) * Math.max(0, dt || 0)));
  if (!invisible && b < SNAP) b = 0;
  if (invisible && b > 1 - SNAP) b = 1;
  actor.ghostBlend = b;
  if (b === 0) { clearGhosting(actor); return 0; }
  actor.ghosted = true;
  g.traverse(o => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    let saved = o.userData.ghostSaved;
    if (!saved) {
      const m = o.material.clone();
      m.transparent = true;
      saved = o.userData.ghostSaved = {mat: o.material, opacity: o.material.opacity ?? 1};
      o.material = m;
    }
    // Height above the hero's feet, in the hero's frame, so the haze runs up the body.
    const y = o.matrixWorld.elements[13] - g.matrixWorld.elements[13];
    o.material.opacity = saved.opacity * ghostOpacity(b, t, y);
  });
  return b;
}

export function clearGhosting(actor) {
  if (!actor?.ghosted) return;
  actor.g.traverse(o => {
    const saved = o.userData?.ghostSaved;
    if (!saved) return;
    if (o.material !== saved.mat) o.material.dispose();
    o.material = saved.mat;
    delete o.userData.ghostSaved;
  });
  actor.ghosted = false;
  actor.ghostBlend = 0;
}
