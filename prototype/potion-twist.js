import * as THREE from 'three';
import {potionAuraKind} from './potion-auras.js';

// Bottle-model twists for potions whose true type the name gives away (the aura already keys on
// the same name). The bottle's shape and colour still follow the shuffled look; only the stuff
// inside changes. Paralysis sets the liquid solid: dull, grey, set like old tallow, with its glow
// put out. Invisibility fades the liquid and the glass until the bottle is barely there.
const TWISTS = {
  paralysis(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.set(0x8a9096);
    liquid.material.roughness = .95;
    liquid.material.emissiveIntensity = 0;
    liquid.material.transparent = false;
    liquid.material.opacity = 1;
    glass.material.color.lerp(new THREE.Color(0xc8d0d8), .5);
  },
  invisibility(parts) {
    const {liquid, glass} = parts;
    liquid.material.transparent = true;
    liquid.material.opacity = .32;
    liquid.material.depthWrite = false;
    liquid.material.emissiveIntensity *= .4;
    glass.material.opacity *= .45;
  },
  // Blood clots dark and thick; vampire blood is darker still and keeps a hungry red under the skin.
  blood(parts) {
    const {liquid} = parts;
    liquid.material.color.set(0x3a0509);
    liquid.material.roughness = .9;
    liquid.material.transparent = false;
    liquid.material.opacity = 1;
    liquid.material.emissiveIntensity *= .3;
  },
  'vampire blood'(parts) {
    const {liquid} = parts;
    liquid.material.color.set(0x1c0306);
    liquid.material.roughness = .85;
    liquid.material.transparent = false;
    liquid.material.opacity = 1;
    liquid.material.emissive.set(0x901018);
    liquid.material.emissiveIntensity = .35;
  },
  // Oil is a black slick that swallows the glow.
  oil(parts) {
    const {liquid} = parts;
    liquid.material.color.set(0x14100a);
    liquid.material.roughness = .15;
    liquid.material.transparent = false;
    liquid.material.opacity = 1;
    liquid.material.emissiveIntensity *= .2;
  },
  // Blindness: a milky film, flat and pale, that gives no light back.
  blindness(parts) {
    const {liquid} = parts;
    liquid.material.color.set(0xd8d8cc);
    liquid.material.roughness = 1;
    liquid.material.transparent = false;
    liquid.material.opacity = 1;
    liquid.material.emissiveIntensity = 0;
  },
  acid(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.lerp(new THREE.Color(0x70e020), .6);
    liquid.material.emissive.set(0x50c010);
    liquid.material.emissiveIntensity = .7;
    glass.material.color.lerp(new THREE.Color(0x607020), .3);
  },
};

// Applies the twist for this floor object to the potion meshes in `group`. Returns the twist name
// or null. Materials are the potion's own, so disposal is unchanged.
export function applyPotionTwist(group, object) {
  const kind = potionAuraKind(object);
  if (!kind || !Object.hasOwn(TWISTS, kind)) return null;
  const parts = Object.fromEntries(group.children.map(o => [o.name, o]));
  if (!parts.liquid || !parts.glass) return null;
  TWISTS[kind](parts);
  group.userData.twist = kind;
  return kind;
}
