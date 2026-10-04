// Small magic tells on amulets lying on the floor, one per amulet type, in the same spirit as the
// ring auras: amulets pulse like a heartbeat, ESP stares, reflection glints bounce outward,
// strangulation gnaws. Keyed on the bridge's true `name` ("life saving", "amulet of ESP"); the
// Amulet of Yendor and anything unknown get nothing. Every effect is a pure function of time.
import {makePointLayer,rng,hashString} from './fx-points.js';
import {particleAt as ringParticleAt} from './ring-auras.js';
import * as THREE from 'three';

export const AMULET_CLASS = 5;

// motion: 'beat' is a double heartbeat (lub-dub then a rest) swelling over the chain; the rest are
// the ring motions ('orbit', 'pulse', 'rise', 'spark', 'blink', 'gnaw').
export const AMULET_AURAS = {
  ESP: {color: 0xc8e0ff, blend: 'add', motion: 'blink', count: 2, size: .024, period: 3.6, alpha: .8},
  'life saving': {color: 0xffc040, blend: 'add', motion: 'beat', count: 2, size: .1, period: 1.5, alpha: .42},
  strangulation: {color: 0x1a0c10, blend: 'normal', motion: 'gnaw', count: 5, size: .05, period: 2, alpha: .65},
  'restful sleep': {color: 0x4060c0, blend: 'add', motion: 'pulse', count: 2, size: .08, period: 5.2, alpha: .26},
  'versus poison': {color: 0x7fd040, blend: 'add', motion: 'pulse', count: 2, size: .07, period: 3.2, alpha: .24},
  change: {color: 0xd070e0, blend: 'add', motion: 'orbit', count: 2, size: .02, period: 2.4, alpha: .75},
  unchanging: {color: 0xdde2e8, blend: 'add', motion: 'pulse', count: 1, size: .06, period: 7, alpha: .22},
  reflection: {color: 0xf0f8ff, blend: 'add', motion: 'spark', count: 4, size: .018, period: 1.2, alpha: .9},
  'magical breathing': {color: 0x50d0c0, blend: 'add', motion: 'rise', count: 4, size: .014, period: 2.8, alpha: .6},
  flying: {color: 0xe8f0ff, blend: 'add', motion: 'rise', count: 4, size: .013, period: 3.8, alpha: .55},
};

// The amulet type from a floor object, or null for unknown amulets, the Amulet of Yendor and other classes.
export function amuletAuraKind(object) {
  if (!object || object.class !== AMULET_CLASS || typeof object.name !== 'string') return null;
  const name = object.name.trim().replace(/^(?:\d+ )?(?:cheap plastic imitation of the |amulets? (?:of|versus) )/i, m => /versus/i.test(m) ? 'versus ' : '');
  const key = Object.keys(AMULET_AURAS).find(k => k.toLowerCase() === name.toLowerCase());
  return key ?? null;
}

// One particle at life p: {x, y, z, alpha (0–1 of the style's), size (0–1 of the style's)}.
export function particleAt(motion, seed, p) {
  if (motion !== 'beat') return ringParticleAt(motion, seed, p);
  // Two quick swells (lub-dub) in the first half of the life, then stillness.
  const lub = p < .14 ? Math.sin(Math.PI * p / .14) : 0, dub = p > .2 && p < .38 ? Math.sin(Math.PI * (p - .2) / .18) * .7 : 0;
  const v = Math.max(lub, dub);
  return {x: (seed[0] - .5) * .012, y: .035 + seed[1] * .008, z: (seed[2] - .5) * .012, alpha: v * v, size: .6 + .4 * v};
}

// A Group holding the effect for `kind` (an AMULET_AURAS key), in item space.
// userData.update(t) animates it, userData.dispose() frees it.
export function createAmuletAura(kind, seedText = '') {
  const style = Object.hasOwn(AMULET_AURAS, kind) ? AMULET_AURAS[kind] : null;
  if (!style) return null;
  const random = rng(hashString(`${kind}|${seedText}`)), g = new THREE.Group();
  g.name = `amulet aura: ${kind}`;
  const layer = makePointLayer(style, random, (seed, p) => particleAt(style.motion, seed, p));
  g.add(layer.points);
  g.userData.kind = kind;
  g.userData.update = t => layer.update(t);
  g.userData.dispose = () => layer.dispose();
  g.userData.update(0);
  return g;
}

// Keeps a floor item's amulet effect in step with what's lying there. Returns the effect (or null).
export function syncAmuletAura(item, object, seedText = '') {
  const kind = amuletAuraKind(object), current = item.userData.amuletAura;
  if ((current?.userData.kind ?? null) === kind) return current ?? null;
  if (current) { current.removeFromParent();current.userData.dispose(); }
  item.userData.amuletAura = null;
  if (!kind) return null;
  const aura = createAmuletAura(kind, seedText);
  item.add(aura);
  item.userData.amuletAura = aura;
  return aura;
}
