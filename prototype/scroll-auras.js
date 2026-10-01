// Small magic tells on scrolls lying on the floor, one per scroll type, kept subtle: a scroll of
// flood is damp, sitting in a sheen of water with drops beading off the roll's ends; fire
// smoulders along the edge of its tongue and lets off a thread of smoke; earth twitches grit
// around it; scare monster sits in a low shadow and shivers; create monster twitches, and two
// red pin-points peer out of the end of the roll; and so on.
//
// Identity: unlike the wand auras, these key on the bridge's true `name` ("fire", "flood"). The
// user chose that on 2026-09-30: a player can always gamble on reading one, and the effects
// stay subtle. Blank paper and mail (and anything unknown) get nothing.
//
// Scroll space (the ground model, before its own .35 turn): the roll lies along x (±.16) at
// y≈.045, and the unrolled tongue runs from z 0 to .17 on the floor. Each effect is a pure
// function of time, so a frame can land at any moment without state to catch up.
import * as THREE from 'three';
import {makePointLayer,rng,hashString} from './fx-points.js';

const TAU = Math.PI * 2;
export const SCROLL_CLASS = 9;

// motion: how a particle moves over one life (p 0→1). blend: additive light or normal smoke.
// size in world units at the particle's peak; period in seconds per life; alpha its peak.
// extra: 'puddle' (flood's water sheen and ripples), 'shiver' (the scroll trembles now and
// then), 'twitch' (it jerks as if something inside the roll stirred).
export const SCROLL_AURAS = {
  flood: {color: 0xcfe6f2, blend: 'add', motion: 'drip', count: 3, size: .03, period: 3.4, alpha: .7, extra: 'puddle'},
  fire: {color: 0x77706a, blend: 'normal', motion: 'smoke', count: 7, size: .11, period: 3.6, alpha: .22,
    core: {color: 0xff5a14, blend: 'add', motion: 'embers', count: 9, size: .026, period: 2.2, alpha: .85}},
  earth: {color: 0x5a4632, blend: 'normal', motion: 'grit', count: 9, size: .022, period: 1.7, alpha: .8},
  light: {color: 0xfff0c0, blend: 'add', motion: 'glow', count: 4, size: .2, period: 4.5, alpha: .14,
    core: {color: 0xfff6d8, blend: 'add', motion: 'rise', count: 5, size: .025, period: 3, alpha: .6}},
  teleportation: {color: 0xb070ff, blend: 'add', motion: 'blink', count: 6, size: .03, period: 1.9, alpha: .7},
  'gold detection': {color: 0xffd25a, blend: 'add', motion: 'sparkle', count: 6, size: .025, period: 2.4, alpha: .8},
  'food detection': {color: 0x0c0a08, blend: 'normal', motion: 'fly', count: 1, size: .016, period: 2.8, alpha: .95},
  identify: {color: 0xd8ecff, blend: 'add', motion: 'sparkle', count: 4, size: .022, period: 3.2, alpha: .55},
  'magic mapping': {color: 0x7fd8ff, blend: 'add', motion: 'trace', count: 6, size: .02, period: 4, alpha: .6},
  'enchant weapon': {color: 0x8fb8ff, blend: 'add', motion: 'glint', count: 3, size: .03, period: 2.6, alpha: .75},
  'enchant armor': {color: 0xdfe6ea, blend: 'add', motion: 'glint', count: 3, size: .03, period: 3, alpha: .65},
  'remove curse': {color: 0xf4f8ff, blend: 'add', motion: 'rise', count: 6, size: .024, period: 3.4, alpha: .5},
  'destroy armor': {color: 0x8a4a22, blend: 'normal', motion: 'flake', count: 6, size: .018, period: 2.6, alpha: .8},
  'confuse monster': {color: 0xe07ad0, blend: 'add', motion: 'wander', count: 5, size: .024, period: 3.8, alpha: .6},
  'scare monster': {color: 0x06050a, blend: 'normal', motion: 'shadow', count: 7, size: .16, period: 4.2, alpha: .35, extra: 'shiver'},
  'create monster': {color: 0xff2a1a, blend: 'add', motion: 'eyes', count: 2, size: .014, period: 5.5, alpha: .9, extra: 'twitch'},
  taming: {color: 0xb8f0a8, blend: 'add', motion: 'rise', count: 5, size: .024, period: 3.6, alpha: .5},
  genocide: {color: 0x050404, blend: 'normal', motion: 'shadow', count: 8, size: .17, period: 3.8, alpha: .45,
    core: {color: 0xb0101a, blend: 'add', motion: 'sparkle', count: 4, size: .02, period: 2.8, alpha: .7}},
  punishment: {color: 0x5a5c60, blend: 'normal', motion: 'flake', count: 4, size: .024, period: 3.2, alpha: .7},
  charging: {color: 0xcfe0ff, blend: 'add', motion: 'sparkle', count: 6, size: .02, period: .8, alpha: .85},
  'stinking cloud': {color: 0xa8b83a, blend: 'normal', motion: 'vapor', count: 6, size: .14, period: 4.6, alpha: .2},
  amnesia: {color: 0x9a9aa4, blend: 'normal', motion: 'vapor', count: 4, size: .1, period: 5, alpha: .14},
};

// The scroll type from a floor object, or null for blank paper, mail and anything unknown.
export function scrollAuraKind(object) {
  if (!object || object.class !== SCROLL_CLASS || typeof object.name !== 'string') return null;
  const name = object.name.toLowerCase().trim().replace(/^(?:\d+ )?scrolls? of /, '');
  return Object.hasOwn(SCROLL_AURAS, name) ? name : null;
}

const clamp01 = v => Math.min(1, Math.max(0, v));

// When a drop leaves roll end `side` (−1 or 1) in its life p: it beads (p<.6), falls (to .72)
// and lands. Shared by the drip particle and its ripple.
export const DRIP_FALL = [.6, .72];

// One particle at life p: {x, y, z, alpha (0–1 of the style's), size (0–1 of the style's)}.
// `seed` is the particle's four random numbers.
export function particleAt(motion, seed, p) {
  const [a, b, c, d] = seed, fade = Math.sin(Math.PI * p);
  switch (motion) {
    case 'drip': { // a bead swells on the underside of a roll end, falls and is gone
      const side = a < .5 ? -1 : 1, x = side * (.15 + b * .01), z = (c - .5) * .05;
      if (p < DRIP_FALL[0]) return {x, y: .012, z, alpha: .5 + .5 * p / DRIP_FALL[0], size: .4 + .6 * p / DRIP_FALL[0]};
      if (p < DRIP_FALL[1]) { const u = (p - DRIP_FALL[0]) / (DRIP_FALL[1] - DRIP_FALL[0]);
        return {x, y: .012 * (1 - u * u), z, alpha: 1, size: 1 - u * .3}; }
      return {x, y: 0, z, alpha: 0, size: 0};
    }
    case 'smoke': { // a thread of smoke off the smouldering tip of the tongue, curling and spreading
      const curl = d * TAU + p * 3, r = .01 + p * .06;
      return {x: (a - .5) * .18 + Math.cos(curl) * r, y: .01 + p * .42, z: .16 + Math.sin(curl) * r * .7 - p * .04,
        alpha: clamp01(p / .15) * (1 - p) ** 1.3, size: .3 + p * .7};
    }
    case 'embers': // pin-points of glow creeping along the charred edge of the tongue, flaring and fading
      return {x: (a - .5) * .26 + Math.sin(p * TAU + d * TAU) * .006, y: .005 + b * .004, z: .162 + c * .01,
        alpha: (.35 + .65 * Math.sin(p * TAU * 2 + d * TAU) ** 2) * fade, size: .6 + .4 * fade};
    case 'grit': { // grains jump and settle round the scroll as if the floor were trembling
      const ang = a * TAU, r = .14 + b * .1, hop = Math.max(0, Math.sin(p * TAU * 2 + c * TAU)) ** 3 * (.015 + d * .02);
      return {x: Math.cos(ang) * r, y: .004 + hop, z: .07 + Math.sin(ang) * r * .8, alpha: fade ** .5, size: .6 + .4 * d};
    }
    case 'glow': // soft swells of warm light hovering over the paper
      return {x: (a - .5) * .18, y: .06 + b * .03, z: .05 + c * .08, alpha: fade, size: .7 + .3 * fade};
    case 'rise': // motes lift off the paper, drift and fade
      return {x: (a - .5) * .26 + Math.sin(p * 5 + d * TAU) * .02, y: .03 + p * .3, z: c * .16 + Math.cos(p * 4 + d * TAU) * .02,
        alpha: fade * (1 - p * .4), size: 1 - p * .5};
    case 'blink': { // a spark pops in somewhere near the scroll and is gone again
      const on = p < .18 ? Math.sin(Math.PI * p / .18) : 0;
      return {x: (a - .5) * .4, y: .02 + b * .12, z: -.06 + c * .3, alpha: on, size: .5 + .5 * on};
    }
    case 'sparkle': // fixed glints on the paper that twinkle on and off
      return {x: (a - .5) * .28, y: .01 + b * .07, z: c * .16, alpha: fade ** 4, size: .6 + .4 * fade};
    case 'glint': { // a glint runs along the roll and is gone
      const u = clamp01((p - .1) / .5);
      return {x: -.16 + u * .32, y: .05 + (b - .5) * .03, z: (c - .5) * .04 + .03, alpha: Math.sin(Math.PI * u) * (p < .6 ? 1 : 0), size: .7 + .3 * Math.sin(Math.PI * u)};
    }
    case 'trace': { // points pace the edges of a little map on the tongue
      const per = ((p + a) % 1) * 4, side = Math.floor(per), u = per - side, w = .2, h = .1;
      const corners = [[-w / 2, .02], [w / 2, .02], [w / 2, .02 + h], [-w / 2, .02 + h], [-w / 2, .02]];
      const [x0, z0] = corners[side], [x1, z1] = corners[side + 1];
      return {x: x0 + (x1 - x0) * u, y: .006, z: .02 + z0 + (z1 - z0) * u, alpha: .6 + .4 * Math.sin(p * TAU * 3 + d * TAU) ** 2, size: .8};
    }
    case 'flake': { // flecks crumble off the roll and drop to the floor
      const u = clamp01(p / .6);
      return {x: (a - .5) * .28, y: .07 - u * u * .066, z: (c - .5) * .08 + u * (b - .5) * .04,
        alpha: p < .85 ? 1 : (1 - p) / .15, size: .6 + .4 * d};
    }
    case 'wander': { // motes looping about aimlessly, changing their minds
      const k = p * TAU;
      return {x: Math.sin(k * 2 + a * TAU) * .12 + Math.sin(k * 5 + b * TAU) * .03, y: .06 + Math.sin(k * 3 + c * TAU) * .03,
        z: .07 + Math.cos(k * 1.5 + d * TAU) * .09, alpha: fade, size: .7 + .3 * fade};
    }
    case 'shadow': { // a low dark breath pooled round the scroll, creeping and thinning
      const ang = a * TAU + p * .8, r = .06 + b * .1 + p * .05;
      return {x: Math.cos(ang) * r * 1.3, y: .015 + p * .04, z: .07 + Math.sin(ang) * r, alpha: fade, size: .7 + .3 * p};
    }
    case 'eyes': { // two red pin-points open in the dark mouth of the roll, look, and close
      const open = p < .45 ? Math.max(0, Math.sin(Math.PI * clamp01((p - .05) / .4))) : 0;
      const blink = Math.abs(p - .25) < .015 ? 0 : 1;
      return {x: .162, y: .045 + .006, z: (a < .5 ? -1 : 1) * .009, alpha: open * blink, size: .8 + .2 * open};
    }
    case 'vapor': { // a low, sickly vapour seeping out and spreading over the floor
      const ang = a * TAU + p * .5, r = .04 + p * .14;
      return {x: Math.cos(ang) * r, y: .02 + p * .06, z: .08 + Math.sin(ang) * r * .8, alpha: clamp01(p / .2) * (1 - p), size: .5 + p * .5};
    }
    case 'fly': { // a fly loops over the scroll, darting and hovering
      const k = p * TAU;
      return {x: Math.sin(k) * .14 + Math.sin(k * 7) * .015, y: .12 + Math.sin(k * 3) * .04 + Math.sin(k * 11) * .01,
        z: .07 + Math.sin(k * 2) * .1 + Math.cos(k * 9) * .015, alpha: 1, size: 1};
    }
    default:
      return {x: 0, y: .05, z: 0, alpha: 0, size: 0};
  }
}

// The scroll's own tremble for 'shiver' and 'twitch', as small rotations (radians) at time t.
export function trembleAt(extra, t, phase = 0) {
  if (extra === 'shiver') { // every ~4 s a short, fine shudder
    const u = ((t / 4.1 + phase) % 1 + 1) % 1, on = u < .12 ? Math.sin(Math.PI * u / .12) : 0;
    return {x: 0, z: on * .03 * Math.sin(t * 70), y: on * .02 * Math.sin(t * 53)};
  }
  if (extra === 'twitch') { // every ~5.5 s, in step with the eyes, one sharp jerk that dies away
    const u = ((t / 5.5 + phase) % 1 + 1) % 1, k = u > .5 && u < .6 ? (u - .5) / .1 : -1;
    const jerk = k >= 0 ? Math.exp(-k * 5) * Math.sin(k * 30) : 0;
    return {x: jerk * .06, y: jerk * .05, z: 0};
  }
  return {x: 0, y: 0, z: 0};
}

function makeLayer(style, random) {
  return makePointLayer({...style, together: style.motion === 'eyes'}, random, (seed, p) => particleAt(style.motion, seed, p));
}

// Flood: a dark, glassy sheen of water under the scroll, and a ring spreading where each drop lands.
function makePuddle(drips) {
  const g = new THREE.Group();g.name = 'scroll puddle';
  const sheetGeo = new THREE.CircleGeometry(1, 28);sheetGeo.rotateX(-Math.PI / 2);
  const sheetMat = new THREE.MeshStandardMaterial({color: 0x10181e, roughness: .06, metalness: .3, transparent: true, opacity: .42, depthWrite: false});
  const sheet = new THREE.Mesh(sheetGeo, sheetMat);sheet.scale.set(.24, 1, .17);sheet.position.set(0, .0015, .06);sheet.receiveShadow = true;
  g.add(sheet);
  const ringGeo = new THREE.RingGeometry(.8, 1, 24);ringGeo.rotateX(-Math.PI / 2);
  const rings = drips.seeds.map(() => {
    const m = new THREE.MeshBasicMaterial({color: 0xbfd8e6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending});
    const r = new THREE.Mesh(ringGeo, m);r.position.y = .002;g.add(r);return r;
  });
  return {group: g, update(t) {
    drips.seeds.forEach((seed, i) => {
      const p = drips.at(t, i), ring = rings[i], q = particleAt('drip', seed, DRIP_FALL[0]);
      const u = (p - DRIP_FALL[1]) / (1 - DRIP_FALL[1]);
      ring.visible = u >= 0;
      if (u < 0) return;
      ring.position.x = q.x;ring.position.z = q.z;ring.scale.setScalar(.008 + u * .05);ring.material.opacity = .35 * (1 - u) ** 2;
    });
  }, dispose() { sheetGeo.dispose();sheetMat.dispose();ringGeo.dispose();rings.forEach(r => r.material.dispose()); }};
}

// A Group holding the effect for `kind` (a SCROLL_AURAS key), in scroll space. `scroll` is the
// scroll's mesh, for the tremble. userData.update(t) animates it, userData.dispose() frees it.
export function createScrollAura(kind, seedText = '', scroll = null) {
  const style = Object.hasOwn(SCROLL_AURAS, kind) ? SCROLL_AURAS[kind] : null;
  if (!style) return null;
  const seed = hashString(`${kind}|${seedText}`), random = rng(seed), g = new THREE.Group();
  g.name = `scroll aura: ${kind}`;
  const layers = [makeLayer(style, random)];
  if (style.core) layers.push(makeLayer(style.core, random));
  if (style.extra === 'puddle') layers.push({...makePuddle(layers[0]), points: null});
  for (const layer of layers) g.add(layer.points ?? layer.group);
  const rest = scroll ? scroll.rotation.clone() : null, phase = random();
  g.userData.kind = kind;
  g.userData.update = t => {
    for (const layer of layers) layer.update(t);
    if (rest && (style.extra === 'shiver' || style.extra === 'twitch')) {
      const r = trembleAt(style.extra, t, style.extra === 'twitch' ? 0 : phase);
      scroll.rotation.set(rest.x + r.x, rest.y + r.y, rest.z + r.z);
    }
  };
  g.userData.dispose = () => { if (rest) scroll.rotation.copy(rest);for (const layer of layers) layer.dispose(); };
  g.userData.update(0);
  return g;
}

// Keeps a floor item's scroll effect in step with what's lying there. It's added beside the
// scroll's mesh (so it turns with the model). Returns the effect (or null).
export function syncScrollAura(item, object, seedText = '') {
  const kind = scrollAuraKind(object), current = item.userData.scrollAura;
  if ((current?.userData.kind ?? null) === kind) return current ?? null;
  if (current) { current.removeFromParent();current.userData.dispose(); }
  item.userData.scrollAura = null;
  if (!kind) return null;
  let scroll = null;
  item.traverse(o => { if (!scroll && o.userData.part === 'scroll') scroll = o; });
  if (!scroll) return null;
  const aura = createScrollAura(kind, seedText, scroll);
  scroll.parent.add(aura);
  // Let release()'s traverse free it with the item.
  item.userData.scrollAura = aura;
  return aura;
}
