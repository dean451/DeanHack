// Wand auras once identified (motion queue item 9, part 1). A floor wand whose name, as the
// hero knows it, reads "wand of death" gets smoky black wisps round a cold dark core; fire
// sheds embers, cold frost motes, lightning crackles, sleep drifts violet motes, digging
// puffs dust, and so on.
//
// Identity: most wands glow only once the bridge's `label` (the hero's view of the name: "oak
// wand" until identified) says "wand of X". "wand called fire" is the player's guess, not a
// type, so it gets nothing; so does "oak wand named wand of death".
// The big wands are the exception (TELLS: death, fire, cold, lightning, striking, cancellation,
// digging). They show their aura from the true type (the floor object's `name`, the held
// weapon's `type`) even unidentified. The user chose that on 2026-10-01: a player can zap or
// engrave to identify a wand anyway, so learning the glows is one more way in, in the spirit
// of the game.
//
// Each aura is one THREE.Points (death and lightning add a second layer) whose particles are
// a pure function of time, so a frame can land at any moment without state to catch up.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
export const WAND_CLASS = 11;

// motion: how particles move over one life (p runs 0→1). blend: additive light or normal
// smoke. size in world units at the particle's peak; period in seconds per life.
export const WAND_AURAS = {
  death: {color: 0x07060a, blend: 'normal', motion: 'smoke', count: 16, size: .2, period: 3.2, alpha: .75,
    core: {color: 0x5a7fa8, blend: 'add', motion: 'sparkle', count: 6, size: .07, period: 2.4, alpha: .45}},
  fire: {color: 0xff7a26, blend: 'add', motion: 'rise', count: 14, size: .07, period: 1.6, alpha: .95},
  cold: {color: 0xbfe6ff, blend: 'add', motion: 'fall', count: 14, size: .06, period: 2.6, alpha: .85},
  lightning: {color: 0xcfe2ff, blend: 'add', motion: 'sparkle', count: 8, size: .05, period: .9, alpha: .9, crackle: true},
  sleep: {color: 0xa77bff, blend: 'add', motion: 'drift', count: 12, size: .08, period: 4.2, alpha: .7},
  // Low puffs, with little dust devils spinning up off the rod.
  digging: {color: 0x8a6a45, blend: 'normal', motion: 'dust', count: 10, size: .1, period: 1.9, alpha: .5,
    core: {color: 0xa88a62, blend: 'normal', motion: 'devil', count: 18, size: .045, period: 1.3, alpha: .7}},
  'magic missile': {color: 0x8fb4ff, blend: 'add', motion: 'orbit', count: 10, size: .06, period: 1.4, alpha: .9},
  striking: {color: 0xe6dcc0, blend: 'add', motion: 'orbit', count: 6, size: .05, period: 1.1, alpha: .6},
  light: {color: 0xfff1c4, blend: 'add', motion: 'sparkle', count: 12, size: .07, period: 2.2, alpha: .8},
  // The rarest wand: a slow ring of wish-lights circles it, with a shimmering rim of white-gold sparks
  // twinkling along the rod. No other wand has a halo.
  wishing: {color: 0xffd35a, blend: 'add', motion: 'halo', count: 14, size: .075, period: 6, alpha: .9,
    core: {color: 0xfff3c8, blend: 'add', motion: 'sparkle', count: 14, size: .05, period: 1.3, alpha: .95}},
  teleportation: {color: 0xc56bff, blend: 'add', motion: 'orbit', count: 12, size: .06, period: 2, alpha: .8},
  polymorph: {color: 0x7cffb0, blend: 'add', motion: 'drift', count: 12, size: .07, period: 2.6, alpha: .75, rainbow: true},
  cancellation: {color: 0x8c8aa0, blend: 'normal', motion: 'fall', count: 10, size: .08, period: 3, alpha: .5},
  'speed monster': {color: 0x9dff7a, blend: 'add', motion: 'orbit', count: 8, size: .05, period: .7, alpha: .8},
  'slow monster': {color: 0xd9a05a, blend: 'add', motion: 'drift', count: 8, size: .06, period: 6, alpha: .6},
  'undead turning': {color: 0xfff6d8, blend: 'add', motion: 'rise', count: 10, size: .06, period: 2.4, alpha: .7},
  'make invisible': {color: 0xd8f4ff, blend: 'add', motion: 'sparkle', count: 8, size: .05, period: 2.8, alpha: .35},
  'create monster': {color: 0xff6a8a, blend: 'add', motion: 'drift', count: 10, size: .06, period: 3, alpha: .6},
  opening: {color: 0xffe9a8, blend: 'add', motion: 'orbit', count: 6, size: .05, period: 2.2, alpha: .6},
  locking: {color: 0xa8b4c8, blend: 'add', motion: 'orbit', count: 6, size: .05, period: 2.2, alpha: .6},
  probing: {color: 0x7fe3e8, blend: 'add', motion: 'sparkle', count: 8, size: .05, period: 1.8, alpha: .6},
  enlightenment: {color: 0xfff7e0, blend: 'add', motion: 'rise', count: 12, size: .06, period: 2.8, alpha: .75},
  detection: {color: 0xd0c09a, blend: 'add', motion: 'sparkle', count: 8, size: .05, period: 2.4, alpha: .55},
  'secret door detection': {color: 0xd0c09a, blend: 'add', motion: 'sparkle', count: 8, size: .05, period: 2.4, alpha: .55},
  // A wand of nothing, once known, shows nothing.
};


// The loud beat (subtle always, loud on a beat): every few seconds each wand throws one bright, short flash on
// the floor round it, in its own shape. shape: 'flash' (a glow pool that blooms and decays), 'ring' (a ring
// racing outward), 'dark' (a darkening, normal-blended pool: death, cancellation, create monster), 'slow'
// (a long, soft swell). The wand of nothing has none, and neither does lightning (its arcs are the beat).
export const WAND_BEATS = {
  fire: {shape: 'flash', color: 0xff6a1a, period: 6.8, size: .52, alpha: .85},
  cold: {shape: 'flash', color: 0xaadfff, period: 7.9, size: .46, alpha: .8},
  sleep: {shape: 'slow', color: 0x9a6bff, period: 11, size: .58, alpha: .6},
  death: {shape: 'dark', color: 0x020205, period: 9.9, size: .5, alpha: .7},
  'magic missile': {shape: 'ring', color: 0x8fb4ff, period: 5.7, size: .42, alpha: .9},
  digging: {shape: 'ring', color: 0xb89a6a, period: 7.5, size: .46, alpha: .8},
  polymorph: {shape: 'flash', color: 0x7cffb0, period: 7.3, size: .5, alpha: .8, rainbow: true},
  teleportation: {shape: 'ring', color: 0xc56bff, period: 6.6, size: .52, alpha: .9},
  cancellation: {shape: 'dark', color: 0x161422, period: 8.8, size: .42, alpha: .6},
  'make invisible': {shape: 'ring', color: 0xe8f8ff, period: 9.2, size: .36, alpha: .35},
  'speed monster': {shape: 'ring', color: 0x9dff7a, period: 4, size: .5, alpha: .8},
  'slow monster': {shape: 'slow', color: 0xe0a050, period: 15.4, size: .5, alpha: .55},
  striking: {shape: 'ring', color: 0xf2e8cc, period: 6.4, size: .5, alpha: .95},
  'undead turning': {shape: 'flash', color: 0xffe8a0, period: 8.4, size: .46, alpha: .75},
  light: {shape: 'flash', color: 0xfff0c0, period: 7.5, size: .72, alpha: .9},
  detection: {shape: 'ring', color: 0xdcd0aa, period: 8.4, size: .72, alpha: .6},
  'secret door detection': {shape: 'ring', color: 0xdcd0aa, period: 8.4, size: .72, alpha: .6},
  enlightenment: {shape: 'flash', color: 0xfff8e0, period: 7, size: .46, alpha: .85},
  probing: {shape: 'ring', color: 0x7fe3e8, period: 6.6, size: .36, alpha: .75},
  opening: {shape: 'flash', color: 0xffe08a, period: 8.8, size: .32, alpha: .7},
  locking: {shape: 'flash', color: 0xb4c0d4, period: 8.8, size: .32, alpha: .7},
  'create monster': {shape: 'dark', color: 0x4a0a14, period: 9.2, size: .5, alpha: .65},
  wishing: {shape: 'flash', color: 0xffd35a, period: 11, size: .62, alpha: .85},
};
// Where in its life (0..1) a beat is at time t, and how strong: pure, so a frame can land anywhere.
export function beatAt(shape, t, period, phase = 0) {
  const u = (((t / period + phase) % 1) + 1) % 1, attack = Math.min(1, u / .12);
  switch (shape) {
    case 'ring': return {u, level: Math.max(0, (1 - u) ** 1.4) * attack, grow: .2 + u * .95};
    case 'dark': return {u, level: Math.sin(Math.PI * Math.min(1, u / .8)) ** .8 * (u < .8 ? 1 : 0), grow: 1};
    case 'slow': return {u, level: Math.sin(Math.PI * u) ** 2, grow: .8 + .2 * u};
    default: return {u, level: Math.exp(-u * 3.4) * attack, grow: .75 + .3 * Math.min(1, u * 2)};
  }
}

// Other identified magic (item 10). Same rule: the look comes only from the hero's name for the
// item. An unidentified magic lamp is "lamp", like an oil lamp, and stays dark.
export const TOOL_CLASS = 6;
export const MAGIC_AURAS = {
  // A slow golden hum round the bowl, and dust motes curling up from the spout.
  'magic lamp': {color: 0xffc64a, blend: 'add', motion: 'halo', count: 14, size: .07, period: 5.5, alpha: .7,
    core: {color: 0xffe7a0, blend: 'add', motion: 'motes', count: 10, size: .045, period: 3.6, alpha: .85}},
  // Mist swirling in two slow arms inside the orb, with a vision glinting at its heart now and
  // then. Unidentified it's a "glass orb" and stays still.
  'crystal ball': {color: 0x9fc4ff, blend: 'add', motion: 'swirl', count: 18, size: .04, period: 4.8, alpha: .75, rainbow: 'mist',
    core: {color: 0xf2f6ff, blend: 'add', motion: 'vision', count: 4, size: .05, period: 3.3, alpha: .9}},
  // The Amulet of Yendor: gold motes drawn up round the medallion in a slow spiral, over a
  // crimson heartbeat in the stone. Keyed on the bridge's `identified` flag as well as the
  // name, because the real Amulet and the fakes all read "Amulet of Yendor" until each is
  // identified on its own.
  'amulet of yendor': {color: 0xffcf5a, blend: 'add', motion: 'ascend', count: 16, size: .045, period: 6.5, alpha: .75,
    core: {color: 0xff2c4a, blend: 'add', motion: 'heartbeat', count: 5, size: .09, period: 1.6, alpha: .8, sync: true}},
};
const AURAS = {...WAND_AURAS, ...MAGIC_AURAS};

// The big wands, whose aura shows from their true type before they are identified.
export const TELLS = new Set(['death', 'fire', 'cold', 'lightning', 'striking', 'cancellation', 'digging', 'wishing']);

// The kind from the hero's name for the item ("wand(s) of X"), or for a big wand its true type
// (`name`: "fire" or "wand of fire"), or null.
export function wandAuraKind(object) {
  if (!object || object.class !== WAND_CLASS) return null;
  if (typeof object.label === 'string') {
    const seen = object.label.toLowerCase().trim().replace(/ named .*$/, '');
    const m = seen.match(/^(?:\d+ )?wands? of ([a-z ]+)$/);
    if (m && WAND_AURAS[m[1]]) return m[1];
  }
  const type = typeof object.name === 'string' ? object.name.toLowerCase().trim().replace(/^(?:\d+ )?wands? of /, '') : '';
  return TELLS.has(type) ? type : null;
}

// The identified magic item kind (a MAGIC_AURAS key), or null. "lamp called magic" is a guess.
export const AMULET_CLASS = 5;
export function magicAuraKind(object) {
  if (object?.class === AMULET_CLASS && typeof object.label === 'string') {
    const seen = object.label.toLowerCase().trim().replace(/ named .*$/, '');
    return object.identified === true && /^(?:the )?amulet of yendor$/.test(seen) ? 'amulet of yendor' : null;
  }
  if (!object || object.class !== TOOL_CLASS || typeof object.label !== 'string') return null;
  // Drop a trailing "(lit)" or "(0:5)" and the player's own name for it.
  const seen = object.label.toLowerCase().trim().replace(/ named .*$/, '').replace(/(?: \([^)]*\))+$/, '');
  if (/^(?:\d+ )?magic lamps?$/.test(seen)) return 'magic lamp';
  if (/^(?:\d+ )?crystal balls?$/.test(seen)) return 'crystal ball';
  return null;
}

// Any aura kind for a floor item: a wand's or another magic item's.
export function itemAuraKind(object) {
  return wandAuraKind(object) ?? magicAuraKind(object);
}

// Small deterministic PRNG so a wand's particles keep their places.
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// One particle at time t: {x, y, z, alpha (0–1 of the style's), size (0–1 of the style's)}.
// `seed` is the particle's four random numbers. The wand lies along x (−.3….3) at y≈.05.
export function particleAt(motion, seed, p) {
  const [a, b, c, d] = seed, fade = Math.sin(Math.PI * p), along = (a - .5) * .56;
  switch (motion) {
    case 'rise': // embers: lift off the rod, wobble, burn out
      return {x: along + Math.sin(p * 7 + d * TAU) * .04, y: .06 + p * .55, z: (b - .5) * .12 + Math.cos(p * 5 + c * TAU) * .03,
        alpha: fade * (1 - p * .4), size: 1 - p * .6};
    case 'smoke': { // wisps curl up and spread, growing as they thin
      const spin = c * TAU + p * 1.6, r = .03 + p * .14;
      return {x: along * .8 + Math.cos(spin) * r, y: .05 + p * .42, z: Math.sin(spin) * r, alpha: fade * (1 - p * .5), size: .45 + p * .55};
    }
    case 'fall': // frost motes settle gently onto the rod, twinkling
      return {x: along + Math.sin(p * 3 + d * TAU) * .05, y: .5 - p * .44, z: (b - .5) * .2,
        alpha: fade * (.6 + .4 * Math.sin(p * 30 + c * TAU) ** 2), size: .7 + .3 * fade};
    case 'drift': { // lazy loops above the wand
      const ang = d * TAU + p * TAU;
      return {x: along + Math.cos(ang) * .08, y: .12 + b * .22 + Math.sin(p * TAU * 2 + c * TAU) * .04, z: Math.sin(ang) * .08,
        alpha: fade, size: .8 + .2 * Math.sin(p * TAU)};
    }
    case 'dust': { // low puffs kick up and settle
      const out = .04 + p * .16, ang = c * TAU;
      return {x: along + Math.cos(ang) * out, y: .02 + Math.sin(Math.PI * p) * (.08 + b * .08), z: Math.sin(ang) * out,
        alpha: fade * (1 - p * .3), size: .5 + p * .5};
    }
    case 'devil': { // dust devils: two little whirls at points along the rod, spinning up and widening
      const cx = (a < .5 ? -.14 : .14) + (d - .5) * .06, ang = b * TAU + p * TAU * 2.5, r = .015 + p * .06;
      return {x: cx + Math.cos(ang) * r, y: .03 + p * .26, z: Math.sin(ang) * r,
        alpha: Math.sin(Math.PI * p) * (1 - p * .4), size: .6 + .4 * p};
    }
    case 'orbit': { // sparks circle the rod lengthwise
      const ang = d * TAU + p * TAU;
      return {x: along, y: .08 + Math.cos(ang) * (.07 + b * .06) * (Math.cos(ang) < 0 ? .55 : 1), z: Math.sin(ang) * (.07 + b * .06),
        alpha: Math.sqrt(fade), size: .7 + .3 * fade};
    }
    case 'halo': { // a slow ring round a lamp's bowl, breathing in and out with the hum
      const ang = d * TAU + p * TAU * .5, r = .2 + b * .06 + Math.sin(p * TAU * 2 + c * TAU) * .015;
      return {x: Math.cos(ang) * r, y: .08 + b * .08 + Math.sin(p * TAU + c * TAU) * .02, z: Math.sin(ang) * r * .85,
        alpha: fade * (.55 + .45 * Math.sin(p * TAU * 3 + a * TAU) ** 2), size: .75 + .25 * fade};
    }
    case 'motes': { // dust motes curl up out of a lamp's spout (mouth at x .36, y .2)
      const curl = c * TAU + p * 4;
      return {x: .35 - p * .12 + Math.cos(curl) * .04 * p, y: .21 + p * .36, z: (b - .5) * .04 + Math.sin(curl) * .05 * p,
        alpha: fade * (.7 + .3 * Math.sin(p * 20 + d * TAU) ** 2), size: 1 - p * .4};
    }
    case 'swirl': { // mist in two arms spinning round a tilted axis inside a crystal ball (centre y .14, glass r .105)
      const arm = a < .5 ? 0 : Math.PI, r = .015 + b * .065, ang = arm + r * 22 + p * TAU + d * .6;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r, h = (c - .5) * .03 + Math.sin(p * TAU * 2 + d * TAU) * .008;
      return {x: x * .95 + h * .31, y: .14 + h * .95 - x * .31, z,
        alpha: fade * (.5 + .5 * Math.sin(p * TAU * 2 + c * TAU) ** 2), size: .6 + .4 * (1 - b)};
    }
    case 'vision': // a brief glint wells up at the heart of the ball and fades
      return {x: (a - .5) * .05, y: .14 + (b - .5) * .04, z: (c - .5) * .05,
        alpha: Math.max(0, Math.sin(Math.PI * Math.min(1, p / .4))) ** 2, size: .4 + .6 * Math.sin(Math.PI * Math.min(1, p / .4))};
    case 'ascend': { // gold motes drawn up round the Amulet's medallion (pendant centre x 0, z .09), the spiral tightening as they rise
      const ang = d * TAU + p * TAU * 1.5, r = (.075 + b * .03) * (1 - p * .65);
      return {x: Math.cos(ang) * r, y: .03 + p * (.3 + c * .12), z: .09 + Math.sin(ang) * r,
        alpha: fade * (.6 + .4 * Math.sin(p * 18 + a * TAU) ** 2), size: 1 - p * .5};
    }
    case 'heartbeat': { // a double pulse in the Amulet's stone (y .026), all points in step (sync)
      const beat = Math.exp(-(((p - .12) / .045) ** 2)) + .7 * Math.exp(-(((p - .3) / .055) ** 2));
      return {x: (a - .5) * .02, y: .028 + (b - .5) * .01, z: .09 + (c - .5) * .02,
        alpha: Math.min(1, beat) * Math.sin(Math.PI * p), size: .45 + .55 * Math.min(1, beat)};
    }
    default: // sparkle: fixed points round the rod that twinkle on and off
      return {x: along, y: .06 + (b - .25) * .2 + p * .03, z: (c - .5) * .24, alpha: fade ** 3, size: .6 + .4 * fade};
  }
}

const VERT = `attribute float aAlpha;attribute float aSize;attribute vec3 aColor;uniform float uScale;varying float vAlpha;varying vec3 vColor;
void main(){vAlpha=aAlpha;vColor=aColor;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/max(.1,-mv.z);gl_Position=projectionMatrix*mv;}`;
const FRAG = `varying float vAlpha;varying vec3 vColor;
void main(){float r=length(gl_PointCoord-.5)*2.;float a=vAlpha*smoothstep(1.,.2,r);if(a<.01)discard;gl_FragColor=vec4(vColor,a);}`;

function makeLayer(style, random) {
  const n = style.count, geometry = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), alpha = new Float32Array(n), size = new Float32Array(n), color = new Float32Array(n * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  const base = new THREE.Color(style.color), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    // rainbow: every hue (polymorph); 'mist': blue shading to violet (a crystal ball's swirl).
    if (style.rainbow === 'mist') c.copy(base).offsetHSL(i / n * .12, 0, (i % 3 - 1) * .06);
    else if (style.rainbow) c.setHSL(i / n, .8, .65);
    else c.copy(base);
    c.toArray(color, i * 3);
  }
  const material = new THREE.ShaderMaterial({vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: style.blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: {uScale: {value: 400}}});
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2;
  const drawSize = new THREE.Vector2();
  points.onBeforeRender = renderer => { material.uniforms.uScale.value = renderer.getDrawingBufferSize(drawSize).y / 2; };
  const seeds = Array.from({length: n}, () => [random(), random(), random(), random()]);
  // sync: every point shares one phase (the Amulet's heartbeat).
  const offsets = seeds.map(() => style.sync ? (random(), 0) : random());
  function update(t) {
    for (let i = 0; i < n; i++) {
      const p = ((t / style.period + offsets[i]) % 1 + 1) % 1, q = particleAt(style.motion, seeds[i], p);
      pos[i * 3] = q.x; pos[i * 3 + 1] = q.y; pos[i * 3 + 2] = q.z;
      alpha[i] = q.alpha * style.alpha; size[i] = q.size * style.size;
    }
    for (const name of ['position', 'aAlpha', 'aSize']) geometry.attributes[name].needsUpdate = true;
  }
  return {points, update, dispose() { geometry.dispose(); material.dispose(); }};
}

// Lightning: a jagged arc hops along the rod for a blink, then rests 0.3–1.2 s.
const ARC_POINTS = 7;
export function crackleAt(t, seed) {
  // Quarter-second slots; about half flash once for ~75 ms.
  const random = rng(seed + Math.floor(t * 4) * 7919), flashes = random() < .5, start = random() * .6, frac = (t * 4 % 1 + 1) % 1;
  const on = flashes && frac >= start && frac < start + .3;
  const x0 = (random() - .5) * .4, len = .12 + random() * .2, pts = [];
  for (let i = 0; i < ARC_POINTS; i++) {
    const u = i / (ARC_POINTS - 1), kink = i === 0 || i === ARC_POINTS - 1 ? 0 : 1;
    pts.push(x0 + u * len, .05 + kink * (random() - .3) * .09, kink * (random() - .5) * .09);
  }
  return {on, pts};
}
function makeCrackle(seed) {
  const pos = new Float32Array((ARC_POINTS - 1) * 6), geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const material = new THREE.LineBasicMaterial({color: 0xe8f0ff, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false});
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  function update(t) {
    const {on, pts} = crackleAt(t, seed);
    lines.visible = on;
    if (!on) return;
    for (let i = 0; i < ARC_POINTS - 1; i++) for (let k = 0; k < 6; k++) pos[i * 6 + k] = pts[i * 3 + k];
    geometry.attributes.position.needsUpdate = true;
  }
  return {points: lines, update, dispose() { geometry.dispose(); material.dispose(); }};
}

// The wand of death is rare enough that being literal is right: at each beat a pale skull rises out of the smoke,
// grins for a moment and fades. Built from a handful of primitives, one draw each, so it works anywhere.
function makeSkull(period, phase) {
  const g = new THREE.Group(), mats = [];
  const bone = new THREE.MeshBasicMaterial({color: 0xa8c4e8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
  const hole = new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0, depthWrite: false});
  mats.push(bone, hole);
  const part = (geo, x, y, z, sx = 1, sy = 1, sz = 1) => { geo.scale(sx, sy, sz); geo.translate(x, y, z); return geo.index ? geo.toNonIndexed() : geo; };
  const bones = [part(new THREE.SphereGeometry(.04, 12, 8), 0, .02, 0, 1, .92, .95), part(new THREE.BoxGeometry(.05, .02, .034), 0, -.028, .004)];
  const holes = [part(new THREE.ConeGeometry(.006, .014, 3), 0, 0, .04, 1, 1, .5)];
  for (const s of [-1, 1]) {
    holes.push(part(new THREE.SphereGeometry(.012, 8, 6), s * .017, .018, .034, 1, 1.2, .5)); // eye sockets
    bones.push(part(new THREE.BoxGeometry(.004, .014, .01), s * .014, -.03, .02));            // teeth
  }
  for (const [list, m] of [[bones, bone], [holes, hole]]) { const o = new THREE.Mesh(mergeGeometries(list), m); o.renderOrder = 3; g.add(o); }
  g.name = 'skull'; g.visible = false; g.frustumCulled = false;
  function update(t) {
    // rises through the smoke on the beat, brightest at the top of its swell
    const u = (((t / period + phase) % 1) + 1) % 1, k = Math.sin(Math.PI * Math.min(1, u / .45)) ** 2 * (u < .45 ? 1 : 0);
    g.visible = k > .02; g.position.set(0, .16 + u * .22, 0); g.scale.setScalar(.8 + .5 * k);
    bone.opacity = k * .75; hole.opacity = k * .9;
  }
  return {points: g, update, dispose() { g.traverse(o => o.geometry?.dispose()); mats.forEach(m => m.dispose()); }};
}
function makeBeat(style, random) {
  const geo = style.shape === 'ring' ? new THREE.RingGeometry(.86, 1, 40) : new THREE.RingGeometry(.001, 1, 36, 6);
  geo.rotateX(-Math.PI / 2);
  if (style.shape !== 'ring') {
    const p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const k = Math.pow(1 - Math.hypot(p.getX(i), p.getZ(i)), 2); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const dark = style.shape === 'dark';
  const material = new THREE.MeshBasicMaterial({color: style.color, vertexColors: style.shape !== 'ring', transparent: true, opacity: 0, depthWrite: false,
    blending: dark ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide});
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'beat'; mesh.position.y = .028; mesh.frustumCulled = false; mesh.renderOrder = 1;
  const phase = random(), hsl = {};
  function update(t) {
    const {level, grow} = beatAt(style.shape, t, style.period, phase);
    material.opacity = level * style.alpha; mesh.visible = level > .01; mesh.scale.setScalar(style.size * grow);
    if (style.rainbow) material.color.setHSL((t * .2) % 1, .8, .62);
  }
  return {points: mesh, update, phase, dispose() { geo.dispose(); material.dispose(); }};
}

// A Group holding the aura for `kind` (a WAND_AURAS key). userData.update(t) animates it and
// userData.dispose() frees it. `seedText` keeps each wand's particles its own.
export function createWandAura(kind, seedText = '') {
  const style = Object.hasOwn(AURAS, kind) ? AURAS[kind] : null;
  if (!style) return null;
  const seed = hashString(`${kind}|${seedText}`), random = rng(seed), g = new THREE.Group();
  g.name = `wand aura: ${kind}`;
  const layers = [makeLayer(style, random)];
  if (style.core) layers.push(makeLayer(style.core, random));
  if (style.crackle) layers.push(makeCrackle(seed));
  // the loud beat lies on the floor round a wand there; a held wand has none (it would float in the air)
  if (WAND_BEATS[kind] && seedText !== 'held') { const beat = makeBeat(WAND_BEATS[kind], random); layers.push(beat); if (kind === 'death') layers.push(makeSkull(WAND_BEATS.death.period, beat.phase)); }
  for (const layer of layers) g.add(layer.points);
  g.userData.kind = kind;
  g.userData.update = t => { for (const layer of layers) layer.update(t); };
  g.userData.dispose = () => { for (const layer of layers) layer.dispose(); };
  g.userData.update(0);
  return g;
}

// Keeps a ground item's aura in step with its seen name: adds one when the wand (or magic
// lamp, crystal ball or the real Amulet) becomes identified, swaps it if the name changes, removes it if the name stops saying. Returns the
// aura (or null).
export function syncWandAura(item, object, seedText = '') {
  const kind = itemAuraKind(object), current = item.userData.wandAura;
  if ((current?.userData.kind ?? null) === kind) return current ?? null;
  if (current) { item.remove(current); current.userData.dispose(); }
  item.userData.wandAura = kind ? createWandAura(kind, seedText) : null;
  if (item.userData.wandAura) item.add(item.userData.wandAura);
  return item.userData.wandAura;
}

// Held wands (item 9, part 2). The bridge sends a wielded weapon as {name: xname(uwep), class},
// and a wand's true `type` too. xname is the hero's view ("oak wand" until identified), so it
// stands in for `label`; the type lets a big wand show its tell.
export function heldWandObject(weapon) {
  // Only wands: a wielded magic lamp's hum is laid out for a lamp on the floor, not a rod.
  if (weapon?.class !== WAND_CLASS || typeof weapon.name !== 'string') return null;
  return typeof weapon.type === 'string' ? {class: weapon.class, label: weapon.name, name: weapon.type} : {class: weapon.class, label: weapon.name};
}

// Where on the held weapon the aura sits (weapon space: the rod runs along +y from the grip),
// and how big it is next to a floor wand's.
export const HELD_AURA_POINT = new THREE.Vector3(0, .3, 0);
export const HELD_AURA_SCALE = .6;
const heldPoint = new THREE.Vector3();

// Keeps the hero's held-wand aura in step with the wielded weapon's name. The aura hangs from
// the hero's root group rather than the hand, so embers rise and frost falls straight down
// however the arm is posed; updateHeldWandAura moves it to the rod each frame.
export function syncHeldWandAura(hero, weapon) {
  const root = hero?.g;
  if (!root) return null;
  const holder = root.userData.heldWand ??= new THREE.Group();
  if (!holder.parent) { holder.name = 'held wand aura'; holder.scale.setScalar(HELD_AURA_SCALE); root.add(holder); }
  const aura = syncWandAura(holder, heldWandObject(weapon), 'held');
  holder.visible = !!aura && !!hero.weaponSocket;
  return aura;
}

export function updateHeldWandAura(hero, t) {
  const holder = hero?.g?.userData.heldWand, socket = hero?.weaponSocket, aura = holder?.userData.wandAura;
  if (!aura || !socket || !holder.visible) return;
  socket.updateWorldMatrix(true, false);
  heldPoint.copy(HELD_AURA_POINT).applyMatrix4(socket.matrixWorld);
  holder.position.copy(hero.g.worldToLocal(heldPoint));
  aura.userData.update(t);
}
