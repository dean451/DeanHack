// Small magic tells on rings lying on the floor, one per ring type, kept subtle: a glint runs
// round the band, a stat ring pulses in its colour, regeneration beats slow and green, hunger
// gnaws at the light, and so on. Like the scroll auras these key on the bridge's true `name`
// ("regeneration", "ring of fire resistance"); a sharp-eyed player is rewarded, and anything
// unknown gets nothing.
//
// Ring space (the ground model): the band lies flat near the origin, about .06 across. Each
// effect is a pure function of time, so a frame can land at any moment without state to catch up.
import {makePointLayer,rng,hashString} from './fx-points.js';
import * as THREE from 'three';

const TAU = Math.PI * 2;
export const RING_CLASS = 4;

// motion: how a particle moves over one life (p 0→1). 'orbit' a glint circling the band, 'pulse'
// a steady swell over the band, 'rise' motes lifting off, 'spark' fixed glints twinkling,
// 'blink' a spark popping in and out, 'gnaw' a dark mote drawn in to the band and swallowed.
export const RING_AURAS = {
  'gain strength': {color: 0xc0703a, blend: 'add', motion: 'pulse', count: 2, size: .07, period: 1.6, alpha: .3},
  'gain constitution': {color: 0xb86a48, blend: 'add', motion: 'pulse', count: 2, size: .07, period: 2.1, alpha: .28},
  'increase damage': {color: 0xff3a1a, blend: 'add', motion: 'spark', count: 4, size: .014, period: 1.4, alpha: .85},
  'increase accuracy': {color: 0xe8f0ff, blend: 'add', motion: 'orbit', count: 1, size: .02, period: 3.4, alpha: .8},
  protection: {color: 0xaab8c8, blend: 'add', motion: 'pulse', count: 2, size: .09, period: 3.6, alpha: .2},
  regeneration: {color: 0x4fd060, blend: 'add', motion: 'pulse', count: 2, size: .08, period: 2.8, alpha: .34},
  searching: {color: 0xfff0b0, blend: 'add', motion: 'orbit', count: 2, size: .018, period: 2.2, alpha: .7},
  stealth: {color: 0x050406, blend: 'normal', motion: 'gnaw', count: 4, size: .05, period: 3.4, alpha: .5},
  hunger: {color: 0x050406, blend: 'normal', motion: 'gnaw', count: 5, size: .045, period: 2.4, alpha: .6},
  levitation: {color: 0xd8ecff, blend: 'add', motion: 'rise', count: 4, size: .014, period: 3.2, alpha: .6},
  'aggravate monster': {color: 0xc02a20, blend: 'add', motion: 'pulse', count: 2, size: .08, period: .7, alpha: .35},
  conflict: {color: 0xd01830, blend: 'add', motion: 'spark', count: 5, size: .015, period: .9, alpha: .9},
  warning: {color: 0xff2a1a, blend: 'add', motion: 'blink', count: 1, size: .022, period: 4.4, alpha: .9},
  'fire resistance': {color: 0xff7a24, blend: 'add', motion: 'rise', count: 3, size: .012, period: 2.6, alpha: .7},
  'cold resistance': {color: 0xbfe4ff, blend: 'add', motion: 'rise', count: 3, size: .012, period: 3.2, alpha: .6},
  'poison resistance': {color: 0x8fd23a, blend: 'add', motion: 'rise', count: 3, size: .012, period: 3, alpha: .6},
  'shock resistance': {color: 0xcfe0ff, blend: 'add', motion: 'spark', count: 3, size: .013, period: .7, alpha: .85},
  teleportation: {color: 0xb070ff, blend: 'add', motion: 'blink', count: 3, size: .02, period: 1.9, alpha: .8},
  invisibility: {color: 0xdfe6ea, blend: 'add', motion: 'pulse', count: 2, size: .07, period: 2.4, alpha: .2},
  'sustain ability': {color: 0xdce8f4, blend: 'add', motion: 'pulse', count: 2, size: .07, period: 6, alpha: .22},
  'slow digestion': {color: 0xe0a030, blend: 'add', motion: 'pulse', count: 2, size: .075, period: 4.8, alpha: .26},
};

// The ring type from a floor object, or null for unknown rings and other classes.
export function ringAuraKind(object) {
  if (!object || object.class !== RING_CLASS || typeof object.name !== 'string') return null;
  const name = object.name.toLowerCase().trim().replace(/^(?:\d+ )?rings? of /, '');
  return Object.hasOwn(RING_AURAS, name) ? name : null;
}

const clamp01 = v => Math.min(1, Math.max(0, v));

// One particle at life p: {x, y, z, alpha (0–1 of the style's), size (0–1 of the style's)}.
export function particleAt(motion, seed, p) {
  const [a, b, c, d] = seed, fade = Math.sin(Math.PI * p), R = .032;
  switch (motion) {
    case 'orbit': { // a glint runs once round the band, brightest at the shoulder, and is gone
      const ang = (a + p * .9) * TAU;
      return {x: Math.cos(ang) * R, y: .02 + Math.sin(ang) * .004, z: Math.sin(ang) * R, alpha: fade ** 2, size: .6 + .4 * fade};
    }
    case 'pulse': // a soft swell hovering over the band, beating in its colour
      return {x: (a - .5) * .02, y: .03 + b * .01, z: (c - .5) * .02, alpha: fade * fade, size: .6 + .4 * fade};
    case 'rise': // motes lift off the band, drift and fade
      return {x: Math.cos(a * TAU) * R + Math.sin(p * 5 + d * TAU) * .008, y: .02 + p * .16,
        z: Math.sin(a * TAU) * R + Math.cos(p * 4 + d * TAU) * .008, alpha: fade * (1 - p * .4), size: 1 - p * .5};
    case 'spark': // fixed glints along the band that flare and die
      return {x: Math.cos(a * TAU) * R, y: .02 + b * .02, z: Math.sin(a * TAU) * R, alpha: fade ** 4, size: .5 + .5 * fade};
    case 'blink': { // a spark pops in near the ring and is gone again
      const on = p < .16 ? Math.sin(Math.PI * p / .16) : 0;
      return {x: (a - .5) * .16, y: .02 + b * .08, z: (c - .5) * .16, alpha: on, size: .5 + .5 * on};
    }
    case 'gnaw': { // a dark mote is drawn in from the dusk round the ring and swallowed by the band
      const ang = a * TAU + p * 2, r = .09 * (1 - p) ** 1.5 + .006;
      return {x: Math.cos(ang) * r, y: .012 + b * .02 * (1 - p), z: Math.sin(ang) * r, alpha: clamp01(p / .2) * (1 - p ** 3), size: 1 - p * .6};
    }
    default:
      return {x: 0, y: .03, z: 0, alpha: 0, size: 0};
  }
}

// A Group holding the effect for `kind` (a RING_AURAS key), in ring space.
// userData.update(t) animates it, userData.dispose() frees it.
export function createRingAura(kind, seedText = '') {
  const style = Object.hasOwn(RING_AURAS, kind) ? RING_AURAS[kind] : null;
  if (!style) return null;
  const random = rng(hashString(`${kind}|${seedText}`)), g = new THREE.Group();
  g.name = `ring aura: ${kind}`;
  const layer = makePointLayer(style, random, (seed, p) => particleAt(style.motion, seed, p));
  g.add(layer.points);
  g.userData.kind = kind;
  g.userData.update = t => layer.update(t);
  g.userData.dispose = () => layer.dispose();
  g.userData.update(0);
  return g;
}

// Keeps a floor item's ring effect in step with what's lying there. Returns the effect (or null).
export function syncRingAura(item, object, seedText = '') {
  const kind = ringAuraKind(object), current = item.userData.ringAura;
  if ((current?.userData.kind ?? null) === kind) return current ?? null;
  if (current) { current.removeFromParent();current.userData.dispose(); }
  item.userData.ringAura = null;
  if (!kind) return null;
  const aura = createRingAura(kind, seedText);
  item.add(aura);
  item.userData.ringAura = aura;
  return aura;
}
