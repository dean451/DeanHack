// Small magic tells on magical armour lying on the floor, in the spirit of the tool and ring auras:
// boots of speed leave a streak of cold sparks, a cloak of invisibility fades into the dusk, a
// shield of reflection throws pale glints. Keyed on the bridge's true `name`; mundane armour and
// other classes get nothing. Every effect is a pure function of time.
import {makePointLayer,rng,hashString} from './fx-points.js';
import {particleAt} from './ring-auras.js';
import * as THREE from 'three';

export const ARMOR_CLASS = 3;

// motion: the ring motions ('orbit', 'pulse', 'rise', 'spark', 'blink', 'gnaw').
export const ARMOR_AURAS = {
  'speed boots': {color: 0xd8f0ff, blend: 'add', motion: 'spark', count: 4, size: .013, period: 1, alpha: .85},
  'water walking boots': {color: 0x3a78a8, blend: 'add', motion: 'rise', count: 3, size: .013, period: 3, alpha: .55},
  'jumping boots': {color: 0xe8d070, blend: 'add', motion: 'blink', count: 2, size: .02, period: 1.6, alpha: .8},
  'elven boots': {color: 0x2a5a3a, blend: 'normal', motion: 'gnaw', count: 3, size: .04, period: 3.4, alpha: .5},
  'levitation boots': {color: 0xc8d0f0, blend: 'add', motion: 'rise', count: 4, size: .012, period: 2.6, alpha: .6},
  'fumbling boots': {color: 0x5a3a18, blend: 'normal', motion: 'gnaw', count: 3, size: .045, period: 2.2, alpha: .5},
  'cloak of invisibility': {color: 0x040406, blend: 'normal', motion: 'gnaw', count: 5, size: .05, period: 3.2, alpha: .55},
  'cloak of magic resistance': {color: 0x9a7ae8, blend: 'add', motion: 'pulse', count: 2, size: .09, period: 3.8, alpha: .22},
  'cloak of protection': {color: 0xd8d0b0, blend: 'add', motion: 'orbit', count: 2, size: .014, period: 3, alpha: .7},
  'cloak of displacement': {color: 0xa8b8d0, blend: 'add', motion: 'blink', count: 2, size: .022, period: 1.8, alpha: .65},
  'gauntlets of power': {color: 0xd04020, blend: 'add', motion: 'pulse', count: 2, size: .07, period: 1.4, alpha: .3},
  'gauntlets of dexterity': {color: 0xa8e8c0, blend: 'add', motion: 'spark', count: 3, size: .012, period: 1.6, alpha: .75},
  'helm of brilliance': {color: 0xfff0a0, blend: 'add', motion: 'spark', count: 4, size: .014, period: 2, alpha: .85},
  'helm of telepathy': {color: 0x7a2ac0, blend: 'add', motion: 'blink', count: 1, size: .026, period: 3.6, alpha: .85},
  'helm of opposite alignment': {color: 0x600810, blend: 'add', motion: 'rise', count: 3, size: .012, period: 2.8, alpha: .6},
  'shield of reflection': {color: 0xf4f8ff, blend: 'add', motion: 'blink', count: 2, size: .022, period: 1.5, alpha: .9},
};

// The armour type from a floor object's true name, or null for mundane armour and other classes.
export function armorAuraKind(object) {
  if (!object || object.class !== ARMOR_CLASS || typeof object.name !== 'string') return null;
  const name = object.name.toLowerCase().trim().replace(/^(?:\d+ |an? |the )/, '').replace(/^(?:(?:blessed|uncursed|cursed) )/, '').replace(/^[+-]\d+ /, '').replace(/(?: \([^)]*\))+$/, '');
  return Object.hasOwn(ARMOR_AURAS, name) ? name : null;
}

// A Group holding the effect for `kind` (an ARMOR_AURAS key), in item space.
// userData.update(t) animates it, userData.dispose() frees it.
export function createArmorAura(kind, seedText = '') {
  const style = Object.hasOwn(ARMOR_AURAS, kind) ? ARMOR_AURAS[kind] : null;
  if (!style) return null;
  const random = rng(hashString(`${kind}|${seedText}`)), g = new THREE.Group();
  g.name = `armor aura: ${kind}`;
  const layer = makePointLayer(style, random, (seed, p) => particleAt(style.motion, seed, p));
  g.add(layer.points);
  g.userData.kind = kind;
  g.userData.update = t => layer.update(t);
  g.userData.dispose = () => layer.dispose();
  g.userData.update(0);
  return g;
}

// Keeps a floor item's armour effect in step with what's lying there. Returns the effect (or null).
export function syncArmorAura(item, object, seedText = '') {
  const kind = armorAuraKind(object), current = item.userData.armorAura;
  if ((current?.userData.kind ?? null) === kind) return current ?? null;
  if (current) { current.removeFromParent();current.userData.dispose(); }
  item.userData.armorAura = null;
  if (!kind) return null;
  const aura = createArmorAura(kind, seedText);
  item.add(aura);
  item.userData.armorAura = aura;
  return aura;
}
