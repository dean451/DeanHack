// Small magic tells on magical tools lying on the floor, in the spirit of the ring and amulet auras:
// a bag of holding swallows light, a bag of tricks twitches, the horns breathe frost and embers.
// Keyed on the bridge's true `name` (the magic lamp and crystal ball keep their own looks in
// wand-auras.js); mundane tools get nothing. Every effect is a pure function of time.
import {makePointLayer,rng,hashString} from './fx-points.js';
import {particleAt} from './ring-auras.js';
import * as THREE from 'three';

export const TOOL_CLASS = 6;

// motion: the ring motions ('orbit', 'pulse', 'rise', 'spark', 'blink', 'gnaw').
export const TOOL_AURAS = {
  'bag of holding': {color: 0x050406, blend: 'normal', motion: 'gnaw', count: 5, size: .05, period: 3, alpha: .6},
  'bag of tricks': {color: 0xc02a20, blend: 'add', motion: 'blink', count: 2, size: .02, period: 2.2, alpha: .85},
  // A slow thread of dark-red ink vapour, not sparkles.
  'magic marker': {color: 0x6e0c14, blend: 'add', motion: 'rise', count: 2, size: .011, period: 3.4, alpha: .45},
  'magic whistle': {color: 0xdce8f4, blend: 'add', motion: 'pulse', count: 2, size: .09, period: 1.6, alpha: .2},
  'magic flute': {color: 0x7a90e0, blend: 'add', motion: 'rise', count: 3, size: .014, period: 3.6, alpha: .55},
  'magic harp': {color: 0xf0d890, blend: 'add', motion: 'spark', count: 4, size: .014, period: 1.8, alpha: .8},
  'frost horn': {color: 0xbfe4ff, blend: 'add', motion: 'rise', count: 4, size: .014, period: 3.2, alpha: .6},
  'fire horn': {color: 0xff7a24, blend: 'add', motion: 'spark', count: 4, size: .014, period: 1.2, alpha: .85},
  'horn of plenty': {color: 0xe0a030, blend: 'add', motion: 'pulse', count: 2, size: .08, period: 4.2, alpha: .24},
  'drum of earthquake': {color: 0x8a7458, blend: 'normal', motion: 'gnaw', count: 4, size: .045, period: 1.4, alpha: .5},
  'unicorn horn': {color: 0xf4f8ff, blend: 'add', motion: 'spark', count: 4, size: .014, period: 2.2, alpha: .9},
  'expensive camera': {color: 0xe8f0ff, blend: 'add', motion: 'blink', count: 1, size: .024, period: 4.4, alpha: .85},
};

// The tool type from a floor object's true name, or null for mundane tools and other classes.
export function toolAuraKind(object) {
  if (!object || object.class !== TOOL_CLASS || typeof object.name !== 'string') return null;
  const name = object.name.toLowerCase().trim().replace(/^(?:\d+ |an? |the )/, '').replace(/(?: \([^)]*\))+$/, '');
  return Object.hasOwn(TOOL_AURAS, name) ? name : null;
}

// A Group holding the effect for `kind` (a TOOL_AURAS key), in item space.
// userData.update(t) animates it, userData.dispose() frees it.
export function createToolAura(kind, seedText = '') {
  const style = Object.hasOwn(TOOL_AURAS, kind) ? TOOL_AURAS[kind] : null;
  if (!style) return null;
  const random = rng(hashString(`${kind}|${seedText}`)), g = new THREE.Group();
  g.name = `tool aura: ${kind}`;
  const layer = makePointLayer(style, random, (seed, p) => particleAt(style.motion, seed, p));
  g.add(layer.points);
  g.userData.kind = kind;
  g.userData.update = t => layer.update(t);
  g.userData.dispose = () => layer.dispose();
  g.userData.update(0);
  return g;
}

// Keeps a floor item's tool effect in step with what's lying there. Returns the effect (or null).
export function syncToolAura(item, object, seedText = '') {
  const kind = toolAuraKind(object), current = item.userData.toolAura;
  if ((current?.userData.kind ?? null) === kind) return current ?? null;
  if (current) { current.removeFromParent();current.userData.dispose(); }
  item.userData.toolAura = null;
  if (!kind) return null;
  const aura = createToolAura(kind, seedText);
  item.add(aura);
  item.userData.toolAura = aura;
  return aura;
}
