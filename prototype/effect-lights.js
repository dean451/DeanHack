// A fixed pool of point lights for one-shot effects: the teleport blink, the fire trap's jet,
// the magic portal. three bakes the number of lights into every shader, so a light added
// mid-game recompiles every material on screen, a hitch of tens to hundreds of milliseconds
// right as the effect plays. The pool's lights sit in the scene from the start at intensity 0.
// An effect borrows one and re-parents it into its own group (the count never changes), then
// gives it back. With the pool spent, an effect gets a light that is never visible: no glow,
// but no recompile either.
export const EFFECT_LIGHTS = 3; // blink out + blink in can overlap a trap's jet

export function createEffectLights(THREE, parent, {size = EFFECT_LIGHTS} = {}) {
  const pool = Array.from({length: size}, () => { const l = new THREE.PointLight(0xffffff, 0, 5); l.name = 'effect light'; l.userData.busy = false; parent.add(l); return l; });
  return {
    lights: pool,
    get free() { return pool.filter(l => !l.userData.busy).length; },
    acquire(color, distance = 5) {
      let l = pool.find(l => !l.userData.busy);
      if (l) l.userData.busy = true;
      else { l = new THREE.PointLight(color, 0, distance); l.visible = false; l.name = 'effect light (overflow)'; l.userData.overflow = true; }
      l.color.set(color); l.distance = distance; l.intensity = 0; l.position.set(0, 0, 0);
      return l;
    },
    release(l) {
      if (!l) return;
      if (l.userData.overflow) { l.removeFromParent(); l.dispose?.(); return; }
      l.intensity = 0; l.userData.busy = false; parent.add(l);
    },
  };
}
