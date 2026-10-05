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
