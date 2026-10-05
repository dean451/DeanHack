// Small magic tells over potions lying on the floor, one per potion type: healing breathes a red
// glow up from the cork, gain level streams gold light skyward, sleeping lets dim motes drift
// down, blindness swallows light, acid spits green sparks. Unlike potion-fx.js (which keys on the
// shuffled appearance and tells you nothing), these key on the bridge's true `name`, so a
// sharp-eyed player is rewarded; anything unknown, water, booze and juice get nothing.
//
// Positions are in item space above the first bottle (necks top out at y .17 to .29).
// Every effect is a pure function of time.
import {makePointLayer,rng,hashString} from './fx-points.js';
import * as THREE from 'three';

const TAU = Math.PI * 2;
export const POTION_CLASS = 8;
const TOP = .3;

// motion: 'column' motes lift off the cork, 'stream' a tight fast column, 'spiral' a helix round
// the neck, 'beat' a swell over the cork, 'spark' glints flaring over the bottle, 'drift' motes
// sinking slowly (paralysis: one mote, nearly still), 'gnaw' dark motes drawn into the cork and swallowed.
export const POTION_AURAS = {
  healing: {color: 0xff4a50, blend: 'add', motion: 'column', count: 3, size: .02, period: 3, alpha: .55},
  'extra healing': {color: 0xe02030, blend: 'add', motion: 'beat', count: 2, size: .1, period: 1.8, alpha: .34},
  'full healing': {color: 0xfff0c0, blend: 'add', motion: 'column', count: 5, size: .022, period: 2.6, alpha: .7},
  'gain level': {color: 0xffd040, blend: 'add', motion: 'stream', count: 6, size: .02, period: 1.4, alpha: .8},
  'gain ability': {color: 0xffe080, blend: 'add', motion: 'spiral', count: 5, size: .016, period: 2.8, alpha: .7},
  'gain energy': {color: 0x60a0ff, blend: 'add', motion: 'spark', count: 4, size: .016, period: .8, alpha: .9},
  'restore ability': {color: 0xe8f4ff, blend: 'add', motion: 'beat', count: 2, size: .08, period: 4, alpha: .24},
  speed: {color: 0xf0f8ff, blend: 'add', motion: 'stream', count: 4, size: .012, period: .7, alpha: .7},
  sleeping: {color: 0x5070b0, blend: 'add', motion: 'drift', count: 4, size: .02, period: 6, alpha: .4},
  blindness: {color: 0x08080a, blend: 'normal', motion: 'gnaw', count: 4, size: .05, period: 3, alpha: .55},
  confusion: {color: 0xb890d0, blend: 'add', motion: 'spiral', count: 3, size: .02, period: 1.6, alpha: .55},
  hallucination: {color: 0xe060d0, blend: 'add', motion: 'spark', count: 4, size: .018, period: 1.1, alpha: .8},
  sickness: {color: 0xa8c030, blend: 'add', motion: 'column', count: 3, size: .026, period: 2.4, alpha: .5},
  acid: {color: 0x80ff30, blend: 'add', motion: 'spark', count: 4, size: .014, period: .9, alpha: .85},
  'see invisible': {color: 0xf0f4ff, blend: 'add', motion: 'spark', count: 1, size: .024, period: 5, alpha: .85},
  levitation: {color: 0xd8ecff, blend: 'add', motion: 'column', count: 4, size: .014, period: 3.6, alpha: .6},
  enlightenment: {color: 0xfff8d8, blend: 'add', motion: 'beat', count: 1, size: .07, period: 3.4, alpha: .5},
  paralysis: {color: 0xb8c0c8, blend: 'add', motion: 'drift', count: 1, size: .016, period: 14, alpha: .3},
  invisibility: {color: 0xdcdcff, blend: 'add', motion: 'spark', count: 2, size: .02, period: 3.2, alpha: .3},
  'monster detection': {color: 0xff5040, blend: 'add', motion: 'beat', count: 2, size: .12, period: 2.4, alpha: .26},
  'object detection': {color: 0xffd060, blend: 'add', motion: 'spark', count: 5, size: .01, period: 1.5, alpha: .8},
  polymorph: {color: 0xa0e0a0, blend: 'add', motion: 'spiral', count: 4, size: .02, period: 1.2, alpha: .65},
  oil: {color: 0xd08030, blend: 'add', motion: 'column', count: 2, size: .018, period: 3.2, alpha: .4},
  blood: {color: 0x7a0c14, blend: 'normal', motion: 'drift', count: 2, size: .024, period: 7, alpha: .55},
  'vampire blood': {color: 0xb01020, blend: 'normal', motion: 'gnaw', count: 3, size: .04, period: 2.6, alpha: .65},
};

// The potion type from a floor object, or null for unknown potions, water and other classes.
export function potionAuraKind(object) {
  if (!object || object.class !== POTION_CLASS || typeof object.name !== 'string') return null;
  const name = object.name.toLowerCase().trim().replace(/^(?:\d+ )?potions? of /, '');
  return Object.hasOwn(POTION_AURAS, name) ? name : null;
}

const clamp01 = v => Math.min(1, Math.max(0, v));

// One particle at life p: {x, y, z, alpha (0–1 of the style's), size (0–1 of the style's)}.
export function particleAt(motion, seed, p) {
  const [a, b, c, d] = seed, fade = Math.sin(Math.PI * p);
  switch (motion) {
    case 'column': // motes lift off the cork, wander a little and fade
      return {x: (a - .5) * .03 + Math.sin(p * 5 + d * TAU) * .008, y: TOP * .8 + p * .2, z: (c - .5) * .03 + Math.cos(p * 4 + d * TAU) * .008, alpha: fade, size: 1 - p * .4};
    case 'stream': // a tight, quick column
      return {x: (a - .5) * .012, y: TOP * .8 + p * p * .3, z: (c - .5) * .012, alpha: fade, size: 1 - p * .5};
    case 'spiral': { // a helix round the neck, climbing
      const ang = (a + p * 1.5) * TAU;
      return {x: Math.cos(ang) * .035, y: TOP * .7 + p * .22, z: Math.sin(ang) * .035, alpha: fade, size: .6 + .4 * fade};
    }
    case 'beat': // a soft swell over the cork
      return {x: (a - .5) * .02, y: TOP * .9 + b * .02, z: (c - .5) * .02, alpha: fade * fade, size: .6 + .4 * fade};
    case 'spark': // glints flaring and dying over the bottle
      return {x: (a - .5) * .1, y: TOP * .6 + b * .14, z: (c - .5) * .1, alpha: fade ** 4, size: .5 + .5 * fade};
    case 'drift': // motes sinking slowly down over the glass
      return {x: (a - .5) * .1 + Math.sin(p * 3 + d * TAU) * .015, y: TOP * 1.1 - p * .2, z: (c - .5) * .1, alpha: fade * .8, size: .7 + .3 * fade};
    case 'gnaw': { // a dark mote is drawn in from the dusk and swallowed by the cork
      const ang = a * TAU + p * 2, r = .09 * (1 - p) ** 1.5 + .006;
      return {x: Math.cos(ang) * r, y: TOP * .8 + b * .03 * (1 - p), z: Math.sin(ang) * r, alpha: clamp01(p / .2) * (1 - p ** 3), size: 1 - p * .6};
    }
    default:
      return {x: 0, y: TOP, z: 0, alpha: 0, size: 0};
  }
}

// A Group holding the effect for `kind` (a POTION_AURAS key), in item space.
// userData.update(t) animates it, userData.dispose() frees it.
export function createPotionAura(kind, seedText = '') {
  const style = Object.hasOwn(POTION_AURAS, kind) ? POTION_AURAS[kind] : null;
  if (!style) return null;
  const random = rng(hashString(`${kind}|${seedText}`)), g = new THREE.Group();
  g.name = `potion aura: ${kind}`;
  const layer = makePointLayer(style, random, (seed, p) => particleAt(style.motion, seed, p));
  g.add(layer.points);
  g.userData.kind = kind;
  g.userData.update = t => layer.update(t);
  g.userData.dispose = () => layer.dispose();
  g.userData.update(0);
  return g;
}

// Keeps a floor item's potion effect in step with what's lying there. Returns the effect (or null).
export function syncPotionAura(item, object, seedText = '') {
  const kind = potionAuraKind(object), current = item.userData.potionAura;
  if ((current?.userData.kind ?? null) === kind) return current ?? null;
  if (current) { current.removeFromParent();current.userData.dispose(); }
  item.userData.potionAura = null;
  if (!kind) return null;
  const aura = createPotionAura(kind, seedText);
  item.add(aura);
  item.userData.potionAura = aura;
  return aura;
}
