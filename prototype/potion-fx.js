// Floor potions come alive a little. Every bottle catches a glint of light that slides up the
// glass now and then, and the liquid moves the way its look suggests:
//  - bubbly, effervescent, fizzy, sparkling: bubbles rise from the bottom, wobbling, and pop at the top
//  - soapy: bigger, slower soap-film suds that show against the pale liquid
//  - smoky: a slow grey smoke coils in the air above the liquid, inside the glass
//  - steamy: vapour seeps out round the cork and rises
//  - swirly: pale streaks spiral round inside the liquid
//  - cloudy, milky, murky, muddy: specks hang in the liquid and drift
//  - viscous, gooey, greasy, oily, slimy, squishy: a slow drop oozes down the outside of the glass
//  - dark, black, blood-red: two dim red points drift together in the depths, and blink
//  - glowing, luminescent, sparkling: the liquid's own glow swells and fades
// Identity: it keys only on the shuffled appearance (the same word that picks the bottle and its
// colour), never the potion's true type, so it tells you nothing a glance at the bottle wouldn't.
// Positions are in the ground model's space, inside each bottle of the stack (potion.js
// userData.layout). Everything is a pure function of time.
import * as THREE from 'three';
import {makePointLayer,rng,hashString} from './fx-points.js';
import {radiusAt} from './potion.js';

const TAU = Math.PI * 2;
export const POTION_CLASS = 8;

// Each style: a regex on the look, and the point layer (motion, colour, per-bottle count, ...).
// colour 'liquid' or 'light' takes the liquid's own colour, or a paler version of it.
export const POTION_STYLES = [
  // Soap suds: bigger, lazier bubbles in a blue-grey soap film, drawn (not added as light) so they
  // show against a soapy potion's pale liquid, where light bubbles vanished.
  {name: 'suds', test: /soapy/, motion: 'bubbles', color: 0x5d88a6, blend: 'normal', count: 10, size: .021, period: 2.8, alpha: .8},
  {name: 'bubbles', test: /bubbly|effervescent|fizzy|sparkling/, motion: 'bubbles', color: 'light', blend: 'add', count: 11, size: .015, period: 1.4, alpha: .85},
  {name: 'smoke', test: /smoky/, motion: 'smoke', color: 0x4a4a48, blend: 'normal', count: 8, size: .05, period: 5, alpha: .45},
  {name: 'steam', test: /steamy/, motion: 'steam', color: 0xdfe6e6, blend: 'normal', count: 5, size: .06, period: 3.2, alpha: .18},
  {name: 'swirl', test: /swirly/, motion: 'swirl', color: 'light', blend: 'add', count: 9, size: .014, period: 4.2, alpha: .5},
  {name: 'specks', test: /cloudy|milky|murky|muddy/, motion: 'specks', color: 'light', blend: 'normal', count: 8, size: .008, period: 9, alpha: .7},
  {name: 'ooze', test: /viscous|gooey|greasy|oily|slimy|squishy/, motion: 'ooze', color: 'liquid', blend: 'normal', count: 1, size: .016, period: 7, alpha: .95},
  {name: 'lurk', test: /^dark$|black|blood-red/, motion: 'lurk', color: 0xb0141a, blend: 'add', count: 2, size: .008, period: 8, alpha: .75, together: true},
];
export const GLOW_STYLE = /glowing|luminescent|sparkling/;
export const GLINT = {motion: 'glint', color: 0xffffff, blend: 'add', count: 1, size: .03, period: 6.5, alpha: .5};

export function potionStyle(look = '') {
  return POTION_STYLES.find(s => s.test.test(look)) ?? null;
}

const clamp01 = v => Math.min(1, Math.max(0, v));

// One particle at life p inside a bottle laid out as `L` (layout), standing at (bx, bz).
export function particleAt(motion, seed, p, L, bx = 0, bz = 0) {
  const [a, b, c, d] = seed, fade = Math.sin(Math.PI * p), wall = .008;
  const inside = y => Math.max(.002, radiusAt(L.profile, y) - wall);
  switch (motion) {
    case 'bubbles': { // rise from the bottom with a wobble, quicker near the top, and pop
      const y = .012 + (L.fill - .016) * p * p * (1.6 - .6 * p), r = inside(y) * (.15 + .7 * b), ang = a * TAU + Math.sin(p * 9 + d * TAU) * .3;
      return {x: bx + Math.cos(ang) * r, y, z: bz + Math.sin(ang) * r, alpha: p > .95 ? (1 - p) / .05 : clamp01(p / .08), size: .5 + .7 * p};
    }
    case 'smoke': { // coiling slowly in the headspace between the liquid and the neck
      const top = Math.max(L.fill + .02, L.top - .05), y = L.fill + .008 + (top - L.fill - .008) * (.5 + .5 * Math.sin(p * TAU + c * TAU));
      const ang = a * TAU + p * TAU * (b < .5 ? 1 : -1), r = inside(y) * (.25 + .55 * d);
      return {x: bx + Math.cos(ang) * r, y, z: bz + Math.sin(ang) * r, alpha: .5 + .5 * fade, size: .6 + .4 * fade};
    }
    case 'steam': { // seeping out round the cork and rising, spreading as it thins
      const ang = a * TAU + p * 1.5, r = L.neck + .004 + p * .03;
      return {x: bx + Math.cos(ang) * r, y: L.top + .01 + p * .22, z: bz + Math.sin(ang) * r, alpha: clamp01(p / .2) * (1 - p), size: .4 + p * .6};
    }
    case 'swirl': { // streaks spiralling round inside the liquid, rising and sinking
      const y = .015 + (L.fill - .025) * (.5 + .45 * Math.sin(p * TAU * 2 + c * TAU)), ang = a * TAU + p * TAU * 2;
      return {x: bx + Math.cos(ang) * inside(y) * .8, y, z: bz + Math.sin(ang) * inside(y) * .8, alpha: .4 + .6 * fade, size: .6 + .4 * fade};
    }
    case 'specks': { // hanging in the liquid, drifting about
      const y = .015 + (L.fill - .025) * clamp01(b + Math.sin(p * TAU + d * TAU) * .12), ang = a * TAU + p * TAU * .3;
      const r = inside(y) * (.2 + .7 * c);
      return {x: bx + Math.cos(ang) * r, y, z: bz + Math.sin(ang) * r, alpha: 1, size: .6 + .4 * d};
    }
    case 'ooze': { // a drop gathers under the lip, crawls down the outside and spreads at the foot
      const ang = a * TAU, start = L.top - .015, u = clamp01((p - .15) / .7), y = start - (start - .004) * u * u;
      const r = radiusAt(L.profile, y) + .004;
      return {x: bx + Math.cos(ang) * r, y, z: bz + Math.sin(ang) * r, alpha: p < .1 ? p / .1 : p > .9 ? (1 - p) / .1 : 1,
        size: p < .15 ? .5 + .5 * p / .15 : p > .85 ? 1 + (p - .85) * 3 : 1};
    }
    case 'lurk': { // two dim points drift together in the depths, now and then blinking
      const y = L.fill * (.35 + .2 * Math.sin(p * TAU)), ang = p * TAU + Math.sin(p * TAU * 3) * .4, r = inside(y) * .45;
      const side = a < .5 ? -1 : 1, ex = -Math.sin(ang) * side * .007, ez = Math.cos(ang) * side * .007;
      const blink = Math.abs(((p * 5) % 1) - .5) < .03 ? 0 : 1;
      return {x: bx + Math.cos(ang) * r + ex, y, z: bz + Math.sin(ang) * r + ez, alpha: (.5 + .5 * Math.sin(p * TAU * 2) ** 2) * blink, size: 1};
    }
    case 'glint': { // light sliding up the glass on the side facing the camera
      const u = clamp01((p - .05) / .3), y = .02 + (L.fill + .03) * u, r = radiusAt(L.profile, y) + .001;
      return {x: bx + r * .5, y, z: bz + r * .86, alpha: Math.sin(Math.PI * u) * (p < .35 ? 1 : 0), size: .6 + .4 * Math.sin(Math.PI * u)};
    }
    default:
      return {x: bx, y: 0, z: bz, alpha: 0, size: 0};
  }
}

// The liquid's glow multiplier for glowing looks: a slow swell with a faint shimmer.
export function glowPulse(t, phase = 0) {
  return 1 + .6 * Math.sin(t * 1.1 + phase * TAU) ** 2 + .08 * Math.sin(t * 5.3 + phase * 9);
}

// A Group with the effects for a ground potion model (the createGroundModel group, holding
// userData.potion), in the model's space. userData.update(t) animates it.
export function createPotionFx(model, seedText = '') {
  const L = model?.userData.potion;
  if (!L) return null;
  let liquid = null;
  model.traverse(o => { if (!liquid && o.isMesh && o.name === 'liquid') liquid = o; });
  const tint = new THREE.Color(liquid?.material.emissive ?? 0x88ccff);
  const random = rng(hashString(`${L.look}|${seedText}`)), g = new THREE.Group();g.name = 'potion fx';
  const style = potionStyle(L.look), layers = [];
  const layer = s => {
    const color = s.color === 'liquid' ? tint.clone() : s.color === 'light' ? tint.clone().lerp(new THREE.Color(0xffffff), .55) : s.color;
    const n = L.bottles.length;
    const made = makePointLayer({...s, color, count: s.count * n}, random,
      (seed, p, i) => { const bottle = L.bottles[i % n];return particleAt(s.motion, seed, p, L, bottle.x, bottle.z); });
    layers.push(made);g.add(made.points);
  };
  layer(GLINT);
  if (style) layer(style);
  const glows = GLOW_STYLE.test(L.look) && liquid, base = liquid?.material.emissiveIntensity ?? 0, phase = random();
  g.userData.style = style?.name ?? null;g.userData.glows = !!glows;
  g.userData.update = t => {
    for (const l of layers) l.update(t);
    if (glows) liquid.material.emissiveIntensity = base * glowPulse(t, phase);
  };
  g.userData.dispose = () => { if (glows) liquid.material.emissiveIntensity = base;for (const l of layers) l.dispose(); };
  g.userData.update(0);
  model.add(g);
  return g;
}

// Adds the effects to a floor item holding a potion model, once. Returns them (or null).
export function syncPotionFx(item, object, seedText = '') {
  if (item.userData.potionFx !== undefined) return item.userData.potionFx;
  let model = null;
  if (object?.class === POTION_CLASS) item.traverse(o => { if (!model && o.userData.potion) model = o; });
  item.userData.potionFx = model ? createPotionFx(model, seedText) : null;
  return item.userData.potionFx;
}
