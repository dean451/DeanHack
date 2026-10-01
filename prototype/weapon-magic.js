// Magical weapons look magical. A weapon the hero knows to be special gets a lit blade (an
// additive shell hugging its steel, plus an emissive tint that the bloom picks up), a layer or
// two of themed particles, and a swing trail in its colour.
//  - Artifacts each have a signature: Excalibur radiates gold motes, Fire Brand burns, Frost
//    Brand sheds frost and cold mist, Stormbringer draws black souls and red sparks into its
//    blade while its glow beats like a heart, Mjollnir crackles, Magicbane is ringed with
//    violet runes, Grimtooth drips venom, the keen blades (Vorpal Blade, Snickersnee, the
//    Tsurugi) have a white shimmer running up the edge, Sunsword throws out rays. The rest
//    glow in their ARTIFACTS colour with drifting motes. Their swing trail (swing-fx.js) takes
//    the artifact's colour.
//  - An enchanted weapon whose enchantment the hero knows glows more the higher it is, with
//    runes circling the blade: gold when known blessed, violet when known cursed, blue
//    otherwise. A known negative enchantment smoulders with dark smoke instead.
//  - On the floor the same looks rise from the item, and an artifact stands in a soft pillar
//    of light.
//
// Identity rule: only what the hero knows. The artifact comes from the seen name (see
// artifact-gleam.js). `spe` and `buc` are sent by the bridge only once o->known / o->bknown,
// so an unidentified +5 long sword is a plain long sword here.
//
// Everything animates itself in onBeforeRender from the clock, so nothing in live.js has to
// call it each frame, and hidden items cost nothing. Particles are a pure function of time.
import * as THREE from 'three';
import {ARTIFACTS, artifactFromName, heldArtifactKind} from './artifact-gleam.js';

const TAU = Math.PI * 2;
const WEAPON_CLASS = 2, TOOL_CLASS = 6;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const frac = v => ((v % 1) + 1) % 1;

// A particle layer: motion (see particleAt), two colours it fades between over a life, how many,
// size (world units at peak), seconds per life, peak alpha, additive or not, and shape
// (0 soft dot, 1 four-point star, 2 rune).
// Layer sizes are in world units at the blade, but points don't shrink with the actor's Live
// scale and the play camera sits ~19 units back, so they're drawn SIZE_BOOST× bigger, and never
// under about 5 device pixels (uScale × .012) while lit.
export const SIZE_BOOST = 3;
const L = (motion, c0, c1, count, size, period, alpha, o = {}) => ({motion, colors: [c0, c1], count, size, period, alpha, add: o.add ?? true, shape: o.shape ?? 0});

// shell: colour of the light hugging the blade; glow: its strength (0..1); beat: a heartbeat
// pulse instead of the slow shimmer; trail: swing trail colour.
export const THEMES = {
  excalibur: {shell: 0xffdc8a, glow: .85, trail: 0xffe7a1, layers: [L('motes', 0xfff6d0, 0xffc040, 16, .055, 2.4, .95, {shape: 1}), L('edge', 0xffffff, 0xffe7a1, 3, .09, 1.8, 1, {shape: 1})]},
  'fire brand': {shell: 0xff6a1a, glow: .9, flicker: true, trail: 0xff7a26, layers: [L('rise', 0xffe08a, 0xff2a08, 24, .1, .85, .95), L('embers', 0xffb040, 0xff3000, 8, .03, 1.6, 1)]},
  'frost brand': {shell: 0x9fe0ff, glow: .8, trail: 0xbfeaff, layers: [L('fall', 0xffffff, 0x7fc8ff, 16, .05, 2.2, .95, {shape: 1}), L('mist', 0xe8f6ff, 0xb0d8ff, 7, .16, 3, .28, {add: false})]},
  stormbringer: {shell: 0xd0001c, glow: .75, beat: true, trail: 0x9a0018, layers: [L('inward', 0x050204, 0x1a0008, 16, .11, 1.8, .85, {add: false}), L('inward', 0xff2040, 0x700010, 9, .04, 1.3, 1, {shape: 1})]},
  mjollnir: {shell: 0x9fd0ff, glow: .75, flicker: true, trail: 0xcfe6ff, layers: [L('crackle', 0xffffff, 0x80b8ff, 14, .06, .22, 1, {shape: 1}), L('motes', 0xcfe6ff, 0x6090ff, 6, .04, 1.5, .7)]},
  magicbane: {shell: 0xa060ff, glow: .7, trail: 0xc88cff, layers: [L('orbit', 0xead8ff, 0x9050ff, 9, .075, 6, .95, {shape: 2}), L('motes', 0xd0a8ff, 0x7030e0, 8, .035, 2, .7)]},
  grimtooth: {shell: 0x60e030, glow: .45, trail: 0x80e040, layers: [L('drip', 0xc8ff7a, 0x3a8a10, 6, .05, 2.4, .95), L('mist', 0x3a6a10, 0x1a3008, 4, .12, 3, .3, {add: false})]},
  sting: {shell: 0x5fa8ff, glow: .6, trail: 0x8cc8ff, layers: [L('motes', 0xbfe0ff, 0x4f90ff, 10, .045, 2.2, .85)]},
  orcrist: {shell: 0x5fa8ff, glow: .6, trail: 0x8cc8ff, layers: [L('motes', 0xbfe0ff, 0x4f90ff, 12, .05, 2.2, .85)]},
  'vorpal blade': {shell: 0xeaf6ff, glow: .6, trail: 0xf4fbff, layers: [L('edge', 0xffffff, 0xd0e8ff, 8, .07, 1.1, 1, {shape: 1})]},
  snickersnee: {shell: 0xeaf6ff, glow: .55, trail: 0xf4fbff, layers: [L('edge', 0xffffff, 0xd0e8ff, 7, .065, 1.2, 1, {shape: 1})]},
  'tsurugi of muramasa': {shell: 0xeaf6ff, glow: .6, trail: 0xf4fbff, layers: [L('edge', 0xffffff, 0xd0e8ff, 8, .07, 1, 1, {shape: 1}), L('motes', 0xffd0d8, 0xff8090, 6, .04, 2.6, .6)]},
  sunsword: {shell: 0xffd35a, glow: 1, trail: 0xffe08a, layers: [L('rays', 0xfff8d0, 0xffb020, 18, .06, 1.4, .95, {shape: 1})]},
  demonbane: {shell: 0xfff0d0, glow: .7, trail: 0xfff4e0, layers: [L('rise', 0xffffff, 0xffd890, 16, .07, 1.2, .8)]},
};
function themeForArtifact(key) {
  if (THEMES[key]) return THEMES[key];
  const c = ARTIFACTS[key]?.color ?? 0xffffff;
  return {shell: c, glow: .6, trail: c, layers: [L('motes', 0xffffff, c, 12, .05, 2.2, .85, {shape: 1})]};
}

// The look for a known enchantment and blessing, or null for nothing worth showing.
export function enchantTheme(spe, buc) {
  if (!Number.isFinite(spe)) return null;
  if (spe < 0) {
    const e = clamp01(-spe / 4);
    return {shell: 0x5a1a7a, glow: .15 + .2 * e, trail: null,
      layers: [L('smoke', 0x0c080e, 0x241830, 4 + Math.round(6 * e), .12, 2.8, .55 + .25 * e, {add: false}), L('motes', 0x9a40c0, 0x401060, 3, .03, 2, .6)]};
  }
  if (spe < 1) return buc === 'blessed' ? {shell: 0xffeab0, glow: .12, trail: null, layers: [L('motes', 0xfff4d0, 0xffd890, 4, .035, 2.6, .5)]} : null;
  const e = clamp01(spe / 5), c = buc === 'blessed' ? 0xffd890 : buc === 'cursed' ? 0x9a40ff : 0x78b0ff;
  const light = buc === 'blessed' ? 0xfff6dc : buc === 'cursed' ? 0xd8b0ff : 0xd8ecff;
  return {shell: c, glow: .2 + .55 * e, trail: spe >= 2 ? c : null,
    layers: [L('orbit', light, c, Math.min(spe, 7) + 1, .05 + .02 * e, 7 - 3 * e, .55 + .4 * e, {shape: 2}), L('motes', light, c, 3 + spe * 2, .035, 2.4, .5 + .4 * e)]};
}

// What a weapon (the bridge's held or floor object) is, as the hero knows it:
// {kind: 'artifact', key, theme} | {kind: 'enchant', spe, buc, theme} | null.
export function weaponMagic(item, {floor = false} = {}) {
  if (!item || typeof item !== 'object') return null;
  const key = floor ? artifactFromName(item.label, item.class) : heldArtifactKind(item);
  if (key) return {kind: 'artifact', key, theme: themeForArtifact(key)};
  if (item.class !== WEAPON_CLASS && item.class !== TOOL_CLASS) return null;
  const theme = enchantTheme(item.spe, item.buc);
  return theme ? {kind: 'enchant', spe: item.spe, buc: item.buc ?? null, theme} : null;
}
const magicKey = m => m ? (m.kind === 'artifact' ? `a:${m.key}` : `e:${m.spe}:${m.buc}`) : null;

// Small deterministic PRNG and hash, so each weapon keeps its own rhythm.
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return h >>> 0; }
const hash01 = (a, b) => rng(hash(`${a}|${b}`))();

// Particle i of a layer at time t, along a blade from y0 to y1 (x across the blade, half width w).
// Returns {x, y, z, alpha 0..1, size 0..1, mix 0..1 (colour), spin}.
export function particleAt(layer, seed, t, y0, y1, w = .05) {
  const [a, b, c, d] = seed, P = layer.period, u = frac(t / P + d), len = y1 - y0, cyc = Math.floor(t / P + d);
  const along = y0 + len * a, side = b < .5 ? -1 : 1;
  switch (layer.motion) {
    case 'rise': { // flames licking up off both edges
      const wob = Math.sin(t * 9 + c * 20) * .015 * u;
      return {x: side * w * (.6 + .9 * u) + wob, y: along + .2 * u, z: (c - .5) * .03, alpha: smooth(u / .12) * (1 - u) ** 1.3, size: 1 - .65 * u, mix: u, spin: 0};
    }
    case 'embers': { // sparks thrown up and out, drifting
      const r = .03 + .12 * u;
      return {x: Math.cos(c * TAU + u) * r, y: along + .35 * u, z: Math.sin(c * TAU + u) * r, alpha: Math.sin(Math.PI * u) * (.6 + .4 * Math.sin(t * 23 + c * 9) ** 2), size: 1 - .4 * u, mix: u, spin: 0};
    }
    case 'fall': // frost crystals sifting down off the blade
      return {x: side * w * .8 + (c - .5) * .08 * u, y: along - .28 * u, z: (b - .5) * .06, alpha: Math.sin(Math.PI * u) * (.65 + .35 * Math.sin(t * 7 + c * 11) ** 2), size: .7 + .3 * Math.sin(Math.PI * u), mix: u, spin: u * 2 + c * 6};
    case 'mist': // cold or venom haze pooling down off the blade
      return {x: (b - .5) * .1 + (c - .5) * .12 * u, y: along - .18 * u, z: (c - .5) * .08, alpha: Math.sin(Math.PI * u) ** 1.5, size: .6 + .6 * u, mix: u, spin: 0};
    case 'smoke': // dull smoke curling up off a cursed blade
      return {x: (b - .5) * .06 + Math.sin(t * 1.3 + c * 9) * .03 * u, y: along + .22 * u, z: (c - .5) * .06, alpha: Math.sin(Math.PI * u) ** 1.4, size: .5 + .7 * u, mix: u, spin: 0};
    case 'inward': { // drawn in from all round and swallowed by the blade
      const r = .32 * (1 - u) ** 1.4, th = c * TAU + u * 3.5;
      return {x: Math.cos(th) * r, y: along + .1 * (1 - u) * (b - .5), z: Math.sin(th) * r, alpha: smooth(u / .25) * (1 - smooth((u - .82) / .18)), size: 1 - .55 * u, mix: u, spin: 0};
    }
    case 'crackle': { // sparks that jump to a new spot every cycle and flash out
      const h = k => hash01(`${cyc}|${k}`, a);
      const on = u < .45 && h(0) < .7 ? 1 - u / .45 : 0;
      return {x: (h(1) - .5) * w * 4, y: y0 + len * h(2), z: (h(3) - .5) * .08, alpha: on, size: .5 + .5 * h(4), mix: h(5), spin: h(6) * 3};
    }
    case 'orbit': { // runes circling the blade, climbing slowly and wrapping
      const th = t * TAU / P * (b < .5 ? 1 : -1) + a * TAU, y = y0 + len * frac(a * 1.7 + t / (P * 2.3));
      const edge = smooth(Math.min(y - y0, y1 - y) / (len * .12));
      return {x: Math.cos(th) * (w + .04), y, z: Math.sin(th) * (w + .04), alpha: edge * (.6 + .4 * Math.sin(t * 2 + c * TAU)), size: 1, mix: .5 + .5 * Math.sin(t * 1.3 + c * 7), spin: Math.floor(c * 8)};
    }
    case 'drip': { // a bead swells on the edge, then falls
      const swell = smooth(u / .55), fall = Math.max(0, u - .55) / .45;
      return {x: side * w * .9, y: along - .5 * fall * fall, z: 0, alpha: (u < .55 ? swell : 1) * (1 - smooth((fall - .7) / .3)), size: .4 + .6 * swell, mix: fall, spin: 0};
    }
    case 'edge': { // a keen shimmer running up the edge to the point
      const v = frac(u + a * .2);
      return {x: side * w * (1 - v * .7), y: y0 + len * v, z: 0, alpha: Math.sin(Math.PI * v) ** 3 * (u < .6 ? 1 : 1 - smooth((u - .6) / .4)), size: .6 + .4 * Math.sin(Math.PI * v), mix: v, spin: v * 1.2};
    }
    case 'rays': { // light thrown straight out from the blade
      const th = c * TAU, r = .02 + .24 * u;
      return {x: Math.cos(th) * r, y: along + (b - .5) * .04, z: Math.sin(th) * r, alpha: (1 - u) ** 1.5 * smooth(u / .08), size: 1 - .5 * u, mix: u, spin: th};
    }
    default: { // 'motes': drifting, twinkling motes round the blade
      const th = c * TAU + t * .6;
      return {x: Math.cos(th) * (w + .03 + .05 * b), y: along + .12 * u, z: Math.sin(th) * (.03 + .05 * b), alpha: Math.sin(Math.PI * u) * (.55 + .45 * Math.sin(t * (3 + 4 * c) + b * 9) ** 2), size: .7 + .3 * Math.sin(Math.PI * u), mix: u, spin: u * 1.5};
    }
  }
}

// ---- rendering ----
const VERT = `attribute float aAlpha;attribute float aSize;attribute float aSpin;attribute vec3 aColor;uniform float uScale;
varying float vAlpha;varying float vSpin;varying vec3 vColor;
void main(){vAlpha=aAlpha;vSpin=aSpin;vColor=aColor;vec4 mv=modelViewMatrix*vec4(position,1.);float px=aSize*uScale/max(.1,-mv.z);gl_PointSize=aAlpha>.01?max(px,uScale*.012):0.;gl_Position=projectionMatrix*mv;}`;
// shape 0: soft dot; 1: four-pointed star; 2: an angular rune, one of eight, picked by spin.
const FRAG = `uniform float uShape;uniform float uAdd;varying float vAlpha;varying float vSpin;varying vec3 vColor;
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
void main(){vec2 p=gl_PointCoord-.5;float r=length(p)*2.;float a;
if(uShape<.5){a=smoothstep(1.,0.,r);a*=a;}
else if(uShape<1.5){float cs=cos(vSpin),sn=sin(vSpin);vec2 q=vec2(cs*p.x-sn*p.y,sn*p.x+cs*p.y);
 a=min(1.,smoothstep(.45,0.,r)+max(exp(-abs(q.x)*50.)*max(0.,1.-abs(q.y)*2.),exp(-abs(q.y)*50.)*max(0.,1.-abs(q.x)*2.)));}
else{float k=floor(mod(vSpin,8.));float d=seg(p,vec2(0.,-.38),vec2(0.,.38));
 if(k<1.)d=min(d,seg(p,vec2(0.,.1),vec2(.25,.32)));else if(k<2.)d=min(d,min(seg(p,vec2(0.,.2),vec2(.25,0.)),seg(p,vec2(.25,0.),vec2(0.,-.2))));
 else if(k<3.)d=min(d,seg(p,vec2(-.25,.3),vec2(.25,-.1)));else if(k<4.)d=min(d,min(seg(p,vec2(0.,.38),vec2(.25,.18)),seg(p,vec2(0.,.0),vec2(.25,.18))));
 else if(k<5.)d=min(d,min(seg(p,vec2(-.25,.2),vec2(.25,.2)),seg(p,vec2(-.2,-.1),vec2(.2,-.25))));else if(k<6.)d=min(d,min(seg(p,vec2(0.,.3),vec2(-.25,.05)),seg(p,vec2(0.,.3),vec2(.25,.05))));
 else if(k<7.)d=min(d,seg(p,vec2(-.25,-.3),vec2(.25,.3)));else d=min(d,min(seg(p,vec2(-.22,.38),vec2(.22,-.38)),seg(p,vec2(.22,.38),vec2(-.22,-.38))));
 a=smoothstep(.09,.03,d)+.35*smoothstep(.3,0.,d);}
a*=vAlpha;if(a<.01)discard;gl_FragColor=vec4(mix(vColor,vec3(1.),uAdd*(uShape>.5?.25:0.)*a),a);}`;

function makeLayer(layer, seedText) {
  const n = layer.count, random = rng(hash(seedText));
  const seeds = Array.from({length: n}, () => [random(), random(), random(), random()]);
  const geometry = new THREE.BufferGeometry();
  for (const [name, k] of [['position', 3], ['aAlpha', 1], ['aSize', 1], ['aSpin', 1], ['aColor', 3]]) geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(n * k), k));
  const material = new THREE.ShaderMaterial({vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: layer.add ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: {uScale: {value: 400}, uShape: {value: layer.shape}, uAdd: {value: layer.add ? 1 : 0}}});
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; points.renderOrder = layer.add ? 3 : 2;
  const c0 = new THREE.Color(layer.colors[0]), c1 = new THREE.Color(layer.colors[1]), col = new THREE.Color();
  points.userData.update = (t, y0, y1, w, fade) => {
    const pos = geometry.attributes.position.array, al = geometry.attributes.aAlpha.array, sz = geometry.attributes.aSize.array, sp = geometry.attributes.aSpin.array, cc = geometry.attributes.aColor.array;
    for (let i = 0; i < n; i++) {
      const q = particleAt(layer, seeds[i], t, y0, y1, w);
      pos[i * 3] = q.x; pos[i * 3 + 1] = q.y; pos[i * 3 + 2] = q.z;
      al[i] = clamp01(q.alpha) * layer.alpha * fade; sz[i] = q.size * layer.size * SIZE_BOOST; sp[i] = q.spin;
      col.copy(c0).lerp(c1, clamp01(q.mix)); cc[i * 3] = col.r; cc[i * 3 + 1] = col.g; cc[i * 3 + 2] = col.b;
    }
    for (const name of ['position', 'aAlpha', 'aSize', 'aSpin', 'aColor']) geometry.attributes[name].needsUpdate = true;
  };
  points.userData.dispose = () => { geometry.dispose(); material.dispose(); };
  return points;
}

// The shell's brightness at time t: a slow shimmer, a fire's flicker or Stormbringer's heartbeat.
export function shellPulse(theme, t, phase = 0) {
  if (theme.beat) {
    const u = frac(t / 1.15 + phase), lub = Math.exp(-(((u - .05) / .05) ** 2)), dub = .7 * Math.exp(-(((u - .25) / .05) ** 2));
    return .35 + .65 * Math.max(lub, dub);
  }
  if (theme.flicker) return .75 + .15 * Math.sin(t * 17 + phase * 9) + .1 * Math.sin(t * 29 + phase * 4);
  return .8 + .2 * Math.sin(t * 2.1 + phase * TAU);
}

// Push a geometry's vertices out along their normals, for a glowing skin round the steel.
function inflate(geometry, by) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  g.computeVertexNormals();
  // average normals over shared positions, so a faceted blade's skin doesn't split at its edges
  const pos = g.attributes.position, nor = g.attributes.normal, sum = new Map(), key = i => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
  for (let i = 0; i < pos.count; i++) { const k = key(i), s = sum.get(k) || [0, 0, 0]; s[0] += nor.getX(i); s[1] += nor.getY(i); s[2] += nor.getZ(i); sum.set(k, s); }
  for (let i = 0; i < pos.count; i++) {
    const s = sum.get(key(i)), l = Math.hypot(...s) || 1;
    pos.setXYZ(i, pos.getX(i) + s[0] / l * by, pos.getY(i) + s[1] / l * by, pos.getZ(i) + s[2] / l * by);
  }
  return g;
}

// Glowing skins on the steel parts (metalness ≥ .75) under `root`, and an emissive tint on the
// steel itself. Returns {set(level), dispose()}; set() takes 0..1.
export function addShell(root, color, glow) {
  const metal = [];
  root.traverse(o => { if (o.isMesh && !o.userData.magicShell && o.material?.metalness >= .75 && o.geometry?.attributes.position) metal.push(o); });
  const material = new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
  const skins = [], tinted = new Map();
  for (const m of metal) {
    const skin = new THREE.Mesh(inflate(m.geometry, .011), material);
    skin.userData.magicShell = true; skin.castShadow = skin.receiveShadow = false; skin.renderOrder = 1;
    m.add(skin); skins.push(skin);
    if (m.material.emissive && !tinted.has(m.material)) tinted.set(m.material, {color: m.material.emissive.clone(), intensity: m.material.emissiveIntensity});
  }
  const c = new THREE.Color(color);
  return {
    count: skins.length,
    set(level) {
      material.opacity = clamp01(level) * .55 * glow;
      for (const mat of tinted.keys()) { mat.emissive.copy(c); mat.emissiveIntensity = level * glow * .9; }
    },
    dispose() {
      for (const s of skins) { s.removeFromParent(); s.geometry.dispose(); }
      material.dispose();
      for (const [mat, was] of tinted) { mat.emissive.copy(was.color); mat.emissiveIntensity = was.intensity; }
    },
  };
}

// A soft pillar of light for an artifact on the floor.
const PILLAR_VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const PILLAR_FRAG = `uniform vec3 uColor;uniform float uLevel;uniform float uTime;varying vec2 vUv;
void main(){float fade=pow(1.-vUv.y,1.6)*smoothstep(0.,.06,vUv.y);float streak=.65+.35*sin(vUv.x*37.7+uTime*1.3)*sin(vUv.x*18.8-uTime*.7+vUv.y*4.);
gl_FragColor=vec4(uColor,fade*streak*uLevel*.42);}`;
function makePillar(color) {
  const geometry = new THREE.CylinderGeometry(.13, .2, 1.5, 24, 1, true);
  geometry.translate(0, .75, 0);
  const material = new THREE.ShaderMaterial({vertexShader: PILLAR_VERT, fragmentShader: PILLAR_FRAG, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: {uColor: {value: new THREE.Color(color)}, uLevel: {value: 1}, uTime: {value: 0}}});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'artifact pillar'; mesh.renderOrder = 2; mesh.castShadow = mesh.receiveShadow = false; mesh.frustumCulled = false;
  return mesh;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;

// The effect group for `magic` (from weaponMagic). `root` is what holds the weapon's meshes (the
// held weapon or the floor icon), `blade` = {y0, y1, w} where the particles run. Pass `clock` for
// tests. userData.update(t) animates it; it also updates itself each time it renders.
export function createMagicFx(magic, root, blade, {seedText = '', floor = false, clock = now} = {}) {
  const theme = magic.theme, g = new THREE.Group();
  g.name = `weapon magic: ${magicKey(magic)}`;
  g.userData.key = magicKey(magic);
  g.userData.magicShell = true;
  const layers = theme.layers.map((layer, i) => { const p = makeLayer(layer, `${g.userData.key}|${seedText}|${i}`); g.add(p); return p; });
  const shell = root ? addShell(root, theme.shell, theme.glow) : null;
  const pillar = floor && magic.kind === 'artifact' ? makePillar(theme.shell) : null;
  if (pillar) g.add(pillar);
  const phase = hash01(seedText, g.userData.key);
  let last = -1;
  g.userData.update = t => {
    if (t === last) return;
    last = t;
    for (const p of layers) p.userData.update(t, blade.y0, blade.y1, blade.w ?? .05, 1);
    const level = shellPulse(theme, t, phase);
    shell?.set(level);
    if (pillar) { pillar.material.uniforms.uTime.value = t; pillar.material.uniforms.uLevel.value = .75 + .25 * level; }
    g.userData.level = level;
  };
  const drawSize = new THREE.Vector2();
  for (const p of layers) p.onBeforeRender = renderer => {
    for (const q of layers) q.material.uniforms.uScale.value = renderer.getDrawingBufferSize(drawSize).y / 2;
    g.userData.update(clock());
  };
  g.userData.shell = shell;
  g.userData.dispose = () => { for (const p of layers) p.userData.dispose(); shell?.dispose(); if (pillar) { pillar.geometry.dispose(); pillar.material.dispose(); } };
  g.userData.update(0);
  return g;
}

// ---- held weapon (hero) ----
const inv = new THREE.Matrix4(), rel = new THREE.Matrix4(), tmp = new THREE.Vector3();
// The held weapon's reach along the socket's +y, and its widest half-width, ignoring effects.
function bladeOf(socket, weapon) {
  socket.updateWorldMatrix(true, true);
  inv.copy(socket.matrixWorld).invert();
  let top = -Infinity, w = 0;
  weapon.traverse(o => {
    const p = o.isMesh && !o.userData.magicShell && o.geometry?.attributes.position;
    if (!p) return;
    rel.multiplyMatrices(inv, o.matrixWorld);
    for (let i = 0; i < p.count; i++) { tmp.fromBufferAttribute(p, i).applyMatrix4(rel); top = Math.max(top, tmp.y); if (tmp.y > .15) w = Math.max(w, Math.abs(tmp.x)); }
  });
  if (!Number.isFinite(top) || top < .1) return null;
  return {y0: Math.min(.14, top * .3), y1: top - .02, w: Math.min(.09, Math.max(.025, w * .8))};
}
// The weapon model in the socket: its first child that isn't an effect.
const weaponIn = socket => socket.children.find(c => !c.userData.magicShell && !c.isPoints && !/gleam|aura/.test(c.name)) || null;

// Keep the hero's held-weapon magic in step with what is wielded. Call after hero.setWeapon.
export function syncHeldMagic(hero, item, opts = {}) {
  const socket = hero?.weaponSocket;
  if (!socket) return null;
  const st = socket.userData.weaponMagic;
  const magic = weaponMagic(item), key = magicKey(magic), weapon = weaponIn(socket);
  if (st && st.key === key && st.weapon === weapon) return st;
  if (st) { st.fx.removeFromParent(); st.fx.userData.dispose(); socket.userData.weaponMagic = null; }
  if (!magic || !weapon) return null;
  const blade = bladeOf(socket, weapon);
  if (!blade) return null;
  const fx = createMagicFx(magic, weapon, blade, {seedText: 'held', ...opts});
  socket.add(fx);
  // swing-fx.js reads `tint` to colour the swing trail: the theme's trail colour, pushed bright
  const tint = magic.theme.trail != null ? new THREE.Color(magic.theme.trail).toArray().map(c => Math.min(1.6, c * 1.5 + .1)) : null;
  const next = {key, weapon, fx, blade, tint};
  socket.userData.weaponMagic = next;
  return next;
}

// ---- floor ----
export function syncFloorMagic(item, object, seedText = '', opts = {}) {
  const magic = object && (object.class === WEAPON_CLASS || object.class === TOOL_CLASS || artifactFromName(object.label, object.class)) ? weaponMagic(object, {floor: true}) : null;
  const key = magicKey(magic), cur = item.userData.weaponMagic;
  if ((cur?.userData.key ?? null) === key) return cur ?? null;
  if (cur) { cur.removeFromParent(); cur.userData.dispose(); }
  item.userData.weaponMagic = magic ? createMagicFx(magic, item, {y0: .05, y1: .42, w: .07}, {seedText, floor: true, ...opts}) : null;
  if (item.userData.weaponMagic) item.add(item.userData.weaponMagic);
  return item.userData.weaponMagic;
}
