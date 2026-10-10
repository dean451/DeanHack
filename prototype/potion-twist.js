import * as THREE from 'three';
import {potionAuraKind} from './potion-auras.js';

// Bottle-model twists for potions whose true type the name gives away (the aura already keys on
// the same name). The bottle's shape and colour still follow the shuffled look; only the stuff
// inside changes, never its colour (applyPotionTwist puts the look's hue back). Paralysis sets the liquid solid: dull, grey, set like old tallow, with its glow
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
    liquid.material.emissiveIntensity = .5;
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
    liquid.material.emissiveIntensity = 2.1;
    glass.material.color.lerp(new THREE.Color(0x607020), .3);
  },
  sickness(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.lerp(new THREE.Color(0x707a20), .65);
    liquid.material.roughness = .9;
    liquid.material.emissiveIntensity = 0;
    liquid.material.transparent = false;
    liquid.material.opacity = 1;
    glass.material.color.lerp(new THREE.Color(0x4a5018), .3);
  },
  'full healing'(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.lerp(new THREE.Color(0xfff0c0), .5);
    liquid.material.emissive.set(0xffe090);
    liquid.material.emissiveIntensity = 1.8;
    glass.material.color.lerp(new THREE.Color(0xfff4d8), .25);
  },
  // Sleeping: a deep, dim blue gone heavy and drowsy, the glow nearly out.
  sleeping(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.lerp(new THREE.Color(0x1c2850), .6);
    liquid.material.roughness = .8;
    liquid.material.emissiveIntensity *= .25;
    glass.material.color.lerp(new THREE.Color(0x303a60), .25);
  },
  // Confusion: a muddy, murky violet-grey that will not settle, faintly lit from within.
  confusion(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.lerp(new THREE.Color(0x6a5a78), .6);
    liquid.material.roughness = .7;
    liquid.material.emissive.set(0x7a5a98);
    liquid.material.emissiveIntensity = 0.9;
    glass.material.color.lerp(new THREE.Color(0x5a4a68), .25);
  },
  // Holy water: clear and faintly gold, lit from within, the glass kept pale and clean.
  'holy water'(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.lerp(new THREE.Color(0xfff0c8), .6);
    liquid.material.emissive.set(0xffe8a0);
    liquid.material.emissiveIntensity = 1.5;
    glass.material.color.lerp(new THREE.Color(0xfff8e0), .2);
  },
  // Unholy water: a black, oily murk that gives nothing back, the glass gone dark and sooty.
  'unholy water'(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.set(0x0c0a0c);
    liquid.material.roughness = .2;
    liquid.material.transparent = false;
    liquid.material.opacity = 1;
    liquid.material.emissiveIntensity = 0;
    glass.material.color.lerp(new THREE.Color(0x201a20), .4);
  },
  // Monster detection: a bloodshot red murk that pulses faintly, as if something looks back.
  'monster detection'(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.lerp(new THREE.Color(0x7a1810), .6);
    liquid.material.roughness = .75;
    liquid.material.emissive.set(0xc03020);
    liquid.material.emissiveIntensity = 1;
    glass.material.color.lerp(new THREE.Color(0x502018), .25);
  },
  // Polymorph: a sickly green-grey slurry that never looks the same twice.
  polymorph(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.lerp(new THREE.Color(0x5a7a48), .6);
    liquid.material.roughness = .6;
    liquid.material.emissive.set(0x80c060);
    liquid.material.emissiveIntensity = 1.2;
    glass.material.color.lerp(new THREE.Color(0x384830), .25);
  },
  // Hallucination: a garish, feverish magenta that is too bright to be wholesome.
  hallucination(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.lerp(new THREE.Color(0xa02880), .6);
    liquid.material.emissive.set(0xe040b0);
    liquid.material.emissiveIntensity = 1.5;
    glass.material.color.lerp(new THREE.Color(0x601850), .25);
  },
  // Levitation: a pale, weightless liquid with a lifting glow, the glass thinned.
  levitation(parts) {
    const {liquid, glass} = parts;
    liquid.material.color.lerp(new THREE.Color(0xc8e0f4), .55);
    liquid.material.emissive.set(0xb0d4ff);
    liquid.material.emissiveIntensity = 1.2;
    glass.material.opacity *= .8;
  },
};

// Applies the twist for this floor object to the potion meshes in `group`. Returns the twist name
// or null. Materials are the potion's own, so disposal is unchanged.
export function applyPotionTwist(group, object) {
  const kind = potionAuraKind(object);
  if (!kind || !Object.hasOwn(TWISTS, kind)) return null;
  const parts = Object.fromEntries(group.children.map(o => [o.name, o]));
  if (!parts.liquid || !parts.glass) return null;
  // The colour belongs to the shuffled look ("ruby potion"), never the true type: a twist may set
  // the liquid thick, dull, bright or faint, but its hue and the glass's come back to the look's.
  // Water is the exception: every water looks "clear", so holy and unholy water keep their tint.
  const keepHue = !/water$/.test(kind);
  const saved = keepHue ? {liquid: parts.liquid.material.color.clone(), glow: parts.liquid.material.emissive?.clone(), glass: parts.glass.material.color.clone()} : null;
  TWISTS[kind](parts);
  if (saved) {
    parts.liquid.material.color.copy(saved.liquid);
    if (saved.glow) parts.liquid.material.emissive.copy(saved.glow);
    parts.glass.material.color.copy(saved.glass);
  }
  group.userData.twist = kind;
  return kind;
}
