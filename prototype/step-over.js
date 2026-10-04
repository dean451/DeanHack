// The step-over hit (magic item moments, part 1: wands). When the hero arrives on a floor
// wand, its aura answers: the motes fling outward and the whole glow swells for half a second,
// then settles back to exactly its resting size. It fires once per arrival, so pacing back and
// forth is a small jackpot each time, and it never touches input.
import {WAND_AURAS} from './wand-auras.js';

export const STEP_DURATION = .55;
export const STEP_SWELL = .9;
// How close (world units) the hero must be to count as having arrived on the item.
export const STEP_RADIUS = .55;

// Swell 0–1 at `age` seconds after arrival: a quick heave that overshoots, then eases away.
// Zero outside the pulse so the aura returns exactly to rest.
export function stepPulseAt(age) {
  if (!(age >= 0) || age >= STEP_DURATION) return 0;
  return Math.sin(Math.PI * (age / STEP_DURATION) ** .6) ** 2;
}

// Advances one floor item's step-over. `near` is whether the hero is standing on it now.
// Only the aura of a wand swells (lamps, crystal balls and the Amulet keep their own looks).
export function updateStepOver(item, near, dt) {
  const aura = item.userData.wandAura, data = item.userData;
  if (!aura || !Object.hasOwn(WAND_AURAS, aura.userData.kind)) { data.stepAge = null; data.stepNear = false; return; }
  if (near && !data.stepNear) data.stepAge = 0;
  data.stepNear = near;
  if (data.stepAge == null) return;
  data.stepAge += dt;
  const pulse = stepPulseAt(data.stepAge);
  aura.scale.setScalar(1 + STEP_SWELL * pulse);
  if (data.stepAge >= STEP_DURATION) { data.stepAge = null; aura.scale.setScalar(1); }
}
