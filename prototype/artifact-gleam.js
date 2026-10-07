// Artifact glints and Excalibur's gleam (motion queue item 10, part 3). An artifact lying on
// the floor flashes a four-pointed star glint now and then over a few faint motes; a wielded
// artifact has a gleam that runs up the blade from hilt to tip. Excalibur's is gold and
// comes most often.
//
// Identity rule: the look comes only from the name as the hero sees it (the bridge's `label`
// for floor items, xname(uwep) for the wielded weapon), never from the true type. That name
// is safe to trust here because the game won't let the hero write most artifact names:
// naming anything "Excalibur" (or any SPFX_RESTR artifact) makes the hand slip and scuffs a
// letter. Sting, Orcrist and the three gems can be written on the wrong type, so those need
// a base name that only the real thing can have ("runed broadsword" could be a runesword).
//
// Particles are a pure function of time, so a frame can land at any moment.
import * as THREE from 'three';

const WEAPON_CLASS = 2, ARMOR_CLASS = 3, AMULET_CLASS = 5, TOOL_CLASS = 6, GEM_CLASS = 13, BALL_CLASS = 15;

// Lower-case artifact name (without "the") → class, star colour, and for the names a player
// can write freely, the base names that prove it's the real one.
export const ARTIFACTS = {
  excalibur: {cls: WEAPON_CLASS, color: 0xffe7a1, style: 'excalibur'},
  'luck blade': {cls: WEAPON_CLASS, color: 0xb8ffb0},
  stormbringer: {cls: WEAPON_CLASS, color: 0xff3048},
  thiefbane: {cls: WEAPON_CLASS, color: 0xc0a0ff},
  mjollnir: {cls: WEAPON_CLASS, color: 0xa8d4ff},
  cleaver: {cls: WEAPON_CLASS, color: 0xf2eee0},
  grimtooth: {cls: WEAPON_CLASS, color: 0xb6ff6a},
  orcrist: {cls: WEAPON_CLASS, color: 0x8cc8ff, bases: ['elven broadsword']},
  sting: {cls: WEAPON_CLASS, color: 0x8cc8ff, bases: ['elven dagger', 'runed dagger']},
  magicbane: {cls: WEAPON_CLASS, color: 0xc88cff},
  'frost brand': {cls: WEAPON_CLASS, color: 0xbfeaff},
  'fire brand': {cls: WEAPON_CLASS, color: 0xff9a3c},
  dragonbane: {cls: WEAPON_CLASS, color: 0xffd08a},
  demonbane: {cls: WEAPON_CLASS, color: 0xfff4e0},
  werebane: {cls: WEAPON_CLASS, color: 0xe8f0ff},
  grayswandir: {cls: WEAPON_CLASS, color: 0xe8f0ff},
  giantslayer: {cls: WEAPON_CLASS, color: 0xffe0b0},
  ogresmasher: {cls: WEAPON_CLASS, color: 0xffe0b0},
  trollsbane: {cls: WEAPON_CLASS, color: 0xffe0b0},
  'vorpal blade': {cls: WEAPON_CLASS, color: 0xf4fbff},
  snickersnee: {cls: WEAPON_CLASS, color: 0xf4fbff},
  sunsword: {cls: WEAPON_CLASS, color: 0xffd35a},
  itlachiayaque: {cls: ARMOR_CLASS, color: 0xf0f4ff},
  'heart of ahriman': {cls: GEM_CLASS, color: 0xd8dde8, style: 'grand'},
  'sceptre of might': {cls: WEAPON_CLASS, color: 0xffd98a},
  'iron ball of liberation': {cls: BALL_CLASS, color: 0xe0e6f0},
  'palantir of westernesse': {cls: TOOL_CLASS, color: 0xc8b8ff, style: 'grand'},
  'staff of aesculapius': {cls: WEAPON_CLASS, color: 0xb8ffcf},
  'magic mirror of merlin': {cls: TOOL_CLASS, color: 0xf0f4ff},
  'eyes of the overworld': {cls: TOOL_CLASS, color: 0xd0f0ff},
  'mitre of holiness': {cls: ARMOR_CLASS, color: 0xfff4d0},
  'longbow of diana': {cls: WEAPON_CLASS, color: 0xe0f0ff},
  'master key of thievery': {cls: TOOL_CLASS, color: 0xffe0a0},
  'tsurugi of muramasa': {cls: WEAPON_CLASS, color: 0xf4fbff},
  'platinum yendorian express card': {cls: TOOL_CLASS, color: 0xf0f4ff},
  'orb of fate': {cls: TOOL_CLASS, color: 0xc8b8ff, style: 'grand'},
  'eye of the aethiopica': {cls: AMULET_CLASS, color: 0xd0e8ff, style: 'grand'},
  earthstone: {cls: GEM_CLASS, color: 0x7fa8ff, bases: ['sapphire']},
  moonstone: {cls: GEM_CLASS, color: 0xd8d0ff, bases: ['black opal']},
  sunstone: {cls: GEM_CLASS, color: 0xfff0c0, bases: ['diamond']},
};

// How often and how brightly each look glints. period: seconds between glints.
export const GLEAM_STYLES = {
  artifact: {period: 3.4, flash: .45, size: .16, motes: 4, moteAlpha: .35},
  excalibur: {period: 2.2, flash: .5, size: .2, motes: 7, moteAlpha: .55},
  // The great non-weapon artifacts: a slow, heavy glint over a thick ring of motes.
  grand: {period: 2.8, flash: .6, size: .19, motes: 6, moteAlpha: .5},
};

const stripThe = s => s.replace(/^the /, '');

// The artifact (an ARTIFACTS key) from the name as the hero sees it, or null.
export function artifactFromName(name, cls) {
  if (typeof name !== 'string') return null;
  const seen = stripThe(name.toLowerCase().trim()), m = seen.match(/^(.+?) named (.+)$/);
  const key = stripThe(m ? m[2] : seen), art = Object.hasOwn(ARTIFACTS, key) ? ARTIFACTS[key] : null;
  if (!art || art.cls !== cls) return null;
  // Fully identified, xname gives the bare name, which nothing else can show. Otherwise the
  // written name only counts where a player couldn't have written it on a plain item.
  if (m && art.bases && !art.bases.includes(m[1])) return null;
  return key;
}

export const artifactKind = object => object ? artifactFromName(object.label, object.class) : null;
export const heldArtifactKind = weapon => weapon ? artifactFromName(weapon.name, weapon.class) : null;

// A glint's brightness at time t: 0 most of the time, a quick sin² flare lasting `flash`
// seconds once per period, offset by phase (0–1).
export function glintAt(t, period, flash, phase) {
  const local = ((t / period + phase) % 1 + 1) % 1 * period;
  return local < flash ? Math.sin(Math.PI * local / flash) ** 2 : 0;
}

// Small deterministic PRNG and string hash, so each artifact keeps its own rhythm.
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Particle i at time t: {x, y, z, alpha 0–1, size 0–1 of the style's, spin}. Particle 0 is the
// star glint; the rest are motes. Floor: the glint pops at a spot that moves each time, over
// motes that twinkle slowly round the item. Held: the glint runs from y0 to y1 up the blade
// and the motes sit along it.
export function gleamParticle(style, i, seeds, t, {held = false, y0 = .13, y1 = .8} = {}) {
  const [a, b, c, d] = seeds[i];
  if (i === 0) {
    const cycle = Math.floor(t / style.period + a), local = ((t / style.period + a) % 1 + 1) % 1 * style.period;
    const on = glintAt(t, style.period, style.flash, a), u = Math.min(1, local / style.flash);
    if (held) return {x: 0, y: y0 + (y1 - y0) * u, z: .012, alpha: on, size: .6 + .4 * on, spin: u * .8};
    const r = rng(hashString(`${cycle}|${b}`));
    return {x: (r() - .5) * .36, y: .05 + r() * .14, z: (r() - .5) * .24, alpha: on, size: .5 + .5 * on, spin: r() * 1.5};
  }
  const tw = Math.sin(t * (1.1 + c * 1.4) + d * Math.PI * 2) ** 2;
  if (held) return {x: (b - .5) * .05, y: y0 + (y1 - y0) * a, z: (c - .5) * .05, alpha: tw * style.moteAlpha, size: .18 + .08 * tw, spin: 0};
  const ang = d * Math.PI * 2 + t * (.15 + b * .2);
  return {x: Math.cos(ang) * (.1 + a * .14), y: .06 + b * .2 + Math.sin(t * .7 + c * 6) * .02, z: Math.sin(ang) * (.08 + a * .1),
    alpha: tw * style.moteAlpha, size: .2 + .1 * tw, spin: 0};
}

const VERT = `attribute float aAlpha;attribute float aSize;attribute float aSpin;uniform float uScale;varying float vAlpha;varying float vSpin;
void main(){vAlpha=aAlpha;vSpin=aSpin;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/max(.1,-mv.z);gl_Position=projectionMatrix*mv;}`;
// A soft core with two thin crossed rays: the classic four-pointed glint.
const FRAG = `uniform vec3 uColor;varying float vAlpha;varying float vSpin;
void main(){vec2 p=gl_PointCoord-.5;float cs=cos(vSpin),sn=sin(vSpin);p=vec2(cs*p.x-sn*p.y,sn*p.x+cs*p.y);
float r=length(p)*2.;float core=smoothstep(.45,0.,r);
float rays=max(exp(-abs(p.x)*60.)*max(0.,1.-abs(p.y)*2.),exp(-abs(p.y)*60.)*max(0.,1.-abs(p.x)*2.));
float a=vAlpha*min(1.,core+rays);if(a<.01)discard;gl_FragColor=vec4(mix(uColor,vec3(1.),core*.6),a);}`;

// A Group holding the gleam for `kind` (an ARTIFACTS key). userData.update(t) animates it,
// userData.dispose() frees it. One Points object: one draw call.
export function createArtifactGleam(kind, {held = false, y0, y1, seedText = ''} = {}) {
  const art = Object.hasOwn(ARTIFACTS, kind) ? ARTIFACTS[kind] : null;
  if (!art) return null;
  const style = GLEAM_STYLES[art.style ?? 'artifact'], n = 1 + style.motes, random = rng(hashString(`${kind}|${seedText}`));
  const seeds = Array.from({length: n}, () => [random(), random(), random(), random()]);
  const pos = new Float32Array(n * 3), alpha = new Float32Array(n), size = new Float32Array(n), spin = new Float32Array(n);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geometry.setAttribute('aSpin', new THREE.BufferAttribute(spin, 1));
  const material = new THREE.ShaderMaterial({vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, uniforms: {uScale: {value: 400}, uColor: {value: new THREE.Color(art.color)}}});
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2;
  const drawSize = new THREE.Vector2();
  points.onBeforeRender = renderer => { material.uniforms.uScale.value = renderer.getDrawingBufferSize(drawSize).y / 2; };
  const g = new THREE.Group();
  g.name = `artifact gleam: ${kind}`;
  g.add(points);
  const opts = {held, y0, y1};
  g.userData.kind = kind;
  g.userData.update = t => {
    for (let i = 0; i < n; i++) {
      const q = gleamParticle(style, i, seeds, t, opts);
      pos[i * 3] = q.x; pos[i * 3 + 1] = q.y; pos[i * 3 + 2] = q.z;
      alpha[i] = q.alpha; size[i] = q.size * style.size; spin[i] = q.spin;
    }
    for (const name of ['position', 'aAlpha', 'aSize', 'aSpin']) geometry.attributes[name].needsUpdate = true;
  };
  g.userData.dispose = () => { geometry.dispose(); material.dispose(); };
  g.userData.update(0);
  return g;
}

// Keeps a ground item's glint in step with its seen name. Returns the gleam (or null).
export function syncArtifactGleam(item, object, seedText = '') {
  const kind = artifactKind(object), current = item.userData.artifactGleam;
  if ((current?.userData.kind ?? null) === kind) return current ?? null;
  if (current) { item.remove(current); current.userData.dispose(); }
  item.userData.artifactGleam = kind ? createArtifactGleam(kind, {seedText}) : null;
  if (item.userData.artifactGleam) item.add(item.userData.artifactGleam);
  return item.userData.artifactGleam;
}

// The held weapon's reach up the socket's +y (from its meshes, in socket space), so the gleam
// runs the whole blade of a dagger or a two-handed sword alike. Null if nothing is held.
const inverse = new THREE.Matrix4(), local = new THREE.Matrix4(), v = new THREE.Vector3();
export function heldReach(socket, skip) {
  socket.updateWorldMatrix(true, true);
  inverse.copy(socket.matrixWorld).invert();
  let top = -Infinity;
  for (const child of socket.children) {
    if (child === skip) continue;
    child.traverse(o => {
      const p = o.isMesh && o.geometry?.attributes.position;
      if (!p) return;
      local.multiplyMatrices(inverse, o.matrixWorld);
      for (let i = 0; i < p.count; i++) top = Math.max(top, v.fromBufferAttribute(p, i).applyMatrix4(local).y);
    });
  }
  return Number.isFinite(top) && top > .1 ? top : null;
}

// Keeps the gleam on the hero's wielded artifact in step with its name. It hangs from the
// weapon socket, so it follows every swing. Call after hero.setWeapon.
export function syncHeldGleam(hero, weapon) {
  const socket = hero?.weaponSocket;
  if (!socket) return null;
  const kind = heldArtifactKind(weapon), name = weapon?.name ?? null, current = socket.userData.artifactGleam;
  if (current && current.userData.kind === kind && current.userData.weaponName === name) return current;
  if (current) { socket.remove(current); current.userData.dispose(); socket.userData.artifactGleam = null; }
  const top = kind ? heldReach(socket) : null;
  if (!kind || top == null) return null;
  const gleam = createArtifactGleam(kind, {held: true, y0: Math.min(.13, top * .3), y1: top - .03, seedText: 'held'});
  gleam.name = 'held artifact gleam';
  gleam.userData.weaponName = name;
  socket.userData.artifactGleam = gleam;
  socket.add(gleam);
  return gleam;
}

export function updateHeldGleam(hero, t) {
  hero?.weaponSocket?.userData.artifactGleam?.userData.update(t);
}
