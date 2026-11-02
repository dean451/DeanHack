// Special levels, each its own place. Branch moods (branch-mood.js) give the Mines, Sokoban and Gehennom their air;
// this gives the named levels theirs: the Oracle hushed and moonlit, Minetown in warm lamplight, the Big Room wide
// open, Medusa's island cold over still water, the Castle under a storm, the Valley grey and drained, the demon
// lairs, Vlad's and the Wizard's towers, Ludios's gold, Sheol's snow, and the Planes (earth, air, fire, water,
// astral). A look is a fog colour (and the background behind it), how far the fog reaches, a tint the ambient
// light leans toward, and air: particles around the hero. Everything eases in and out over a couple of seconds.
// No lights are added (the count is baked into every shader): the Castle's lightning briefly lifts the ambient.
import * as THREE from 'three';

const A = (kind, color, count, size, opacity) => ({kind, color, count, size, opacity});
export const SPECIAL_MOODS = {
  oracle: {fog: '#0b1422', reach: 1.2, tint: '#b4c8ff', air: A('drift', '#bcd0ff', 60, .035, .5)},
  minetown: {fog: '#140d06', reach: 1.1, tint: '#ffd29a', air: A('drift', '#ffc27a', 50, .03, .45)},
  bigroom: {fog: '#06090c', reach: 1.9, tint: null, air: null},
  medusa: {fog: '#071518', reach: .8, tint: '#8fd6c8', air: A('mist', '#9fe0d2', 26, 1.6, .08)},
  castle: {fog: '#0a0e14', reach: 1, tint: '#b9c6dc', air: A('rain', '#a8bfd8', 220, .025, .35), storm: true},
  ludios: {fog: '#0e0b04', reach: 1.1, tint: '#ffe7a3', air: A('sparkle', '#ffd77a', 40, .04, .7)},
  valley: {fog: '#0c0c0c', reach: .75, tint: '#a0a0a0', air: A('mist', '#c8c8c8', 30, 1.8, .07)},
  juiblex: {fog: '#0b1407', reach: .8, tint: '#a8cc8a', air: A('bubbles', '#9fd07a', 40, .05, .5)},
  orcus: {fog: '#0d0b10', reach: .9, tint: '#a89ab8', air: A('fall', '#8a8090', 120, .025, .4)},
  asmodeus: {fog: '#060a12', reach: .9, tint: '#8ca4d8', air: A('fall', '#cfe0ff', 60, .02, .4)},
  baalzebub: {fog: '#120606', reach: .85, tint: '#d89a8a', air: A('drift', '#2a2016', 90, .03, .7)},
  sanctum: {fog: '#1a0404', reach: .85, tint: '#ff9a8a', air: A('rise', '#ff6a30', 90, .035, .7)},
  vlad: {fog: '#130509', reach: .9, tint: '#d88c9c', air: A('drift', '#a03040', 50, .03, .5)},
  wizard: {fog: '#0e0816', reach: .95, tint: '#b9a0e8', air: A('sparkle', '#c6a6ff', 40, .035, .6)},
  sheol: {fog: '#0a1218', reach: .9, tint: '#bcd8ec', air: A('fall', '#e8f4ff', 140, .025, .6)},
  moria: {fog: '#0a0806', reach: .85, tint: '#c8b49a', air: A('fall', '#8a7a66', 80, .02, .35)},
  blackmarket: {fog: '#0e0a06', reach: 1, tint: '#e6b878', air: A('drift', '#e0b070', 40, .03, .4)},
  dragons: {fog: '#140806', reach: .9, tint: '#e0a080', air: A('rise', '#ff8a40', 70, .035, .6)},
  earth: {fog: '#120d08', reach: .8, tint: '#d8c09a', air: A('fall', '#a08a6a', 120, .02, .45)},
  air: {fog: '#b8c6d2', reach: 2.2, tint: '#ffffff', air: A('mist', '#ffffff', 40, 1.4, .1)},
  fire: {fog: '#1c0902', reach: .9, tint: '#ffb08a', air: A('rise', '#ff7a2a', 140, .04, .75)},
  water: {fog: '#04131c', reach: .85, tint: '#86c0e0', air: A('bubbles', '#bfe6ff', 90, .045, .5)},
  astral: {fog: '#0a0a16', reach: 1.6, tint: '#ece4ff', air: A('sparkle', '#ffffff', 90, .03, .8)},
};

// The look for a frame's special level (the bridge sends the level's prototype name), or null.
const NAMES = [[/^oracle/, 'oracle'], [/^minetn/, 'minetown'], [/^bigrm/, 'bigroom'], [/^medusa|^medufill/, 'medusa'], [/^castle/, 'castle'],
  [/^knox/, 'ludios'], [/^valley/, 'valley'], [/^juiblex/, 'juiblex'], [/^orcus/, 'orcus'], [/^asmod/, 'asmodeus'], [/^baalz/, 'baalzebub'],
  [/^sanctum/, 'sanctum'], [/^tower/, 'vlad'], [/^(wizard|fakewiz)/, 'wizard'], [/^sheol/, 'sheol'], [/^moria/, 'moria'], [/^blkmar/, 'blackmarket'],
  [/^drgn/, 'dragons'], [/^earth$/, 'earth'], [/^air$/, 'air'], [/^fire$/, 'fire'], [/^water$/, 'water'], [/^astral$/, 'astral']];
export function specialMoodFor(special = '') {
  const s = String(special || '').toLowerCase();
  for (const [re, key] of NAMES) if (re.test(s)) return key;
  return null;
}

// How a particle of each kind moves: dy per second (fall and rise wrap through 0..HEIGHT), drift and wobble.
const HEIGHT = 3, FIELD = 14;
export const MOTION = {drift: {dy: .02, wander: .12}, rise: {dy: .55, wander: .25}, fall: {dy: -.6, wander: .08}, rain: {dy: -6, wander: 0},
  bubbles: {dy: .35, wander: .3}, sparkle: {dy: 0, wander: .03}, mist: {dy: 0, wander: .15}};

function softDot() {
  const c = document.createElement('canvas');c.width = c.height = 32;const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');g.addColorStop(1, 'rgba(255,255,255,0)');x.fillStyle = g;x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

// group: the live group; cavern: its fog, background and fog reach (cavern.js); ambient: [{light}] (live.js).
export function createSpecialMood({group, cavern, ambient = [], doc = globalThis.document}) {
  const calmFog = cavern.fog.color.clone(), calmBack = cavern.background.clone();
  const base = ambient.map(({light}) => ({light, color: light.color.clone(), ground: light.groundColor?.clone() ?? null}));
  const MAX = 240, pos = new Float32Array(MAX * 3), seed = new Float32Array(MAX);
  for (let i = 0; i < MAX; i++) { pos[i * 3] = (Math.random() - .5) * FIELD;pos[i * 3 + 1] = Math.random() * HEIGHT;pos[i * 3 + 2] = (Math.random() - .5) * FIELD;seed[i] = Math.random() * 100; }
  const geo = new THREE.BufferGeometry();geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));geo.setDrawRange(0, 0);
  const mat = new THREE.PointsMaterial({size: .03, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, map: doc ? softDot() : null});
  const points = new THREE.Points(geo, mat);points.name = 'Special level air';points.frustumCulled = false;points.visible = false;group.add(points);
  let key = null, look = null, mix = 0, reach = 1, flash = 0, nextFlash = 8, calmLift = null;
  const target = {fog: calmFog.clone(), back: calmBack.clone(), reach: 1, tint: null};
  const c = new THREE.Color();
  return {
    get key() { return key; },
    points,
    frame(special) {
      const next = specialMoodFor(special);
      if (next === key) return;
      key = next;look = key ? SPECIAL_MOODS[key] : null;
      target.fog.set(look?.fog ?? calmFog);target.back.set(look?.fog ?? calmBack);target.reach = look?.reach ?? 1;target.tint = look?.tint ? new THREE.Color(look.tint) : null;
      const air = look?.air;
      if (air) { mat.color.set(air.color);mat.size = air.size;mat.blending = air.kind === 'mist' ? THREE.NormalBlending : THREE.AdditiveBlending;mat.needsUpdate = true;geo.setDrawRange(0, Math.min(MAX, air.count));points.visible = true; }
      mix = 0;
    },
    update(t, dt, hero) {
      const ease = 1 - Math.exp(-dt * 1.2);
      cavern.fog.color.lerp(target.fog, ease);cavern.background.lerp(target.back, ease);
      reach += (target.reach - reach) * ease;cavern.setFogReach?.(reach);
      for (const b of base) { c.copy(b.color);if (target.tint) c.lerp(target.tint, .35);b.light.color.lerp(c, ease);if (b.ground) { c.copy(b.ground);if (target.tint) c.lerp(target.tint, .2);b.light.groundColor.lerp(c, ease); } }
      // the air fades in with the look, and out (then hides) when the level has none
      const air = look?.air;mix = Math.min(1, mix + dt * .6);
      mat.opacity = air ? air.opacity * mix : Math.max(0, mat.opacity - dt * .6);
      if (!air && mat.opacity <= 0) points.visible = false;
      if (points.visible && hero) {
        points.position.set(hero.x, 0, hero.z);
        const m = MOTION[air?.kind] ?? MOTION.drift, n = geo.drawRange.count;
        for (let i = 0; i < n; i++) {
          const s = seed[i], k = i * 3;
          pos[k] += Math.sin(t * .7 + s) * m.wander * dt;pos[k + 2] += Math.cos(t * .6 + s * 1.3) * m.wander * dt;
          pos[k + 1] += m.dy * dt * (.7 + (s % 1) * .6);
          if (air?.kind === 'mist') pos[k + 1] = .25 + (s % 1) * .5;
          if (pos[k + 1] > HEIGHT) pos[k + 1] -= HEIGHT;else if (pos[k + 1] < 0) pos[k + 1] += HEIGHT;
        }
        if (air?.kind === 'sparkle') mat.opacity = air.opacity * mix * (.6 + .4 * Math.sin(t * 3.1));
        geo.attributes.position.needsUpdate = true;
      }
      // the Castle's storm: now and then the ambient flares and fades, as lightning would light the moat
      if (look?.storm) {
        nextFlash -= dt;
        if (nextFlash <= 0) { nextFlash = 6 + Math.random() * 9;flash = 1;calmLift = ambient.map(({light}) => light.intensity); }
      }
      if (flash > 0) {
        flash = Math.max(0, flash - dt * 3.5);
        const lift = 1 + 1.6 * flash * flash;ambient.forEach(({light}, i) => { light.intensity = calmLift[i] * lift; });
        if (!flash) calmLift = null;
      }
    },
  };
}
