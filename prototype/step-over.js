// The scoop swell (magic item moments, part 1). When a magic item is picked up, its aura swells and
// flings its motes outward as the item lifts into the pack (see pickup-lift.js), then settles back
// to exactly its resting size. Walking over an item without picking it up plays nothing.
import {WAND_AURAS} from './wand-auras.js';

export const STEP_DURATION = .55;
export const STEP_SWELL = .9;
// Swell 0–1 at `age` seconds after arrival: a quick heave that overshoots, then eases away.
// Zero outside the pulse so the aura returns exactly to rest.
export function stepPulseAt(age) {
  if (!(age >= 0) || age >= STEP_DURATION) return 0;
  return Math.sin(Math.PI * (age / STEP_DURATION) ** .6) ** 2;
}

// The aura of a wand, scroll, potion, ring, amulet or enchanted weapon, or an artifact's gleam, is
// what swells (lamps, crystal balls and the Amulet keep their own looks).
export function swellAura(item) {
  const data = item.userData, wand = data.wandAura;
  return wand && Object.hasOwn(WAND_AURAS, wand.userData.kind) ? wand : data.scrollAura ?? data.potionFx ?? data.ringAura ?? data.amuletAura ?? data.toolAura ?? data.weaponAura ?? data.artifactGleam ?? null;
}

// Swells an item's aura for the pickup scoop. `u` is how far through the scoop it is (0 to 1); the
// aura returns exactly to rest at both ends. Walking over an item never calls this.
export function scoopSwell(item, u) {
  const aura = swellAura(item);
  if (aura) aura.scale.setScalar(1 + STEP_SWELL * stepPulseAt(u * STEP_DURATION));
}
