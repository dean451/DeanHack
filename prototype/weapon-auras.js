// A faint edge-light on enchanted weapons lying on the floor (magic item moments, weapons). A glint
// runs along the blade from hilt to tip and fades; the more enchanted the weapon, the more glints,
// the brighter and the quicker they come. +1 barely shows, +5 and up is unmistakable. It reads only
// the enchantment the hero already knows (the bridge's `spe`, sent once the weapon is identified
// that far), so an unknown weapon stays dull. Every effect is a pure function of time.
import {makePointLayer,rng,hashString} from './fx-points.js';
import * as THREE from 'three';

export const WEAPON_CLASS = 2;
export const WEAPON_MAX_SPE = 7;
// Half the length of the blade the glint runs along, in item space.
const HALF = .16;

// The look for a known enchantment, or null for unenchanted, cursed-negative and unknown weapons.
export function weaponAuraStyle(spe) {
  if (!Number.isFinite(spe) || spe < 1) return null;
  const k = Math.min(spe, WEAPON_MAX_SPE) / WEAPON_MAX_SPE;
  return {color: k > .6 ? 0xeaf4ff : 0xb8d4f0, blend: 'add', count: 1 + Math.ceil(k * 3), size: .014 + .008 * k, period: 2.6 - 1.4 * k, alpha: .35 + .6 * k};
}

export function weaponAuraKey(object) {
  if (!object || object.class !== WEAPON_CLASS) return null;
  return weaponAuraStyle(object.spe) ? Math.min(object.spe, WEAPON_MAX_SPE) : null;
}

// One particle at life p: a glint sliding hilt to tip, bright mid-run, gone at both ends.
export function particleAt(seed, p) {
  const v = Math.sin(Math.PI * p) ** 2;
  return {x: -HALF + 2 * HALF * p ** 1.3, y: .02 + seed[1] * .012, z: (seed[2] - .5) * .02, alpha: v, size: .5 + .5 * v};
}

export function createWeaponAura(level, seedText = '') {
  const style = weaponAuraStyle(level);
  if (!style) return null;
  const g = new THREE.Group();
  g.name = `weapon aura: +${level}`;
  const layer = makePointLayer(style, rng(hashString(`weapon|${level}|${seedText}`)), (seed, p) => particleAt(seed, p));
  g.add(layer.points);
  g.userData.kind = level;
  g.userData.update = t => layer.update(t);
  g.userData.dispose = () => layer.dispose();
  g.userData.update(0);
  return g;
}

// Keeps a floor item's edge-light in step with what's lying there. Returns the effect (or null).
export function syncWeaponAura(item, object, seedText = '') {
  const kind = weaponAuraKey(object), current = item.userData.weaponAura;
  if ((current?.userData.kind ?? null) === kind) return current ?? null;
  if (current) { current.removeFromParent(); current.userData.dispose(); }
  item.userData.weaponAura = null;
  if (!kind) return null;
  const aura = createWeaponAura(kind, seedText);
  item.add(aura);
  item.userData.weaponAura = aura;
  return aura;
}
