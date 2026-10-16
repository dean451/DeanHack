// Persistent combat marks: a fight leaves a dark stain where it happened. What it leaves depends
// on what died (remains.js): a flesh-and-bone creature's hit leaves a small puddle and its kill
// a wider pool with bone shards beside it; a boneless one bleeds but leaves no bones; dry undead
// leave bone shards on a grey dust smudge and no blood; jellies, puddings and oozes leave an acid
// slick; lights, elementals and the like leave nothing. Puddles are smooth, gently lobed outlines (never spiky stars), quiet in colour,
// with shared geometry, a hard cap, and the oldest mark fading out first when the cap is reached.
// Positions and species come from combat events (combat-events.js).
import {remainsOf} from './remains.js';
import {boneGeometries, boneMaterial, placeBone, SHAPES as BONE_KINDS} from './bone-shards.js';

export const MARK_MAX = 40, FADE_S = 1.2, SPLAT_SIDES = 40;
export const KINDS = {
  splat: {color: 0x3a0909, opacity: .55, r: .13},
  pool: {color: 0x2a0606, opacity: .68, r: .3},
  bone: {color: 0xcfc5a8, opacity: 1, r: .15}, // a small lit solid (bone-shards.js), not a flat cut-out
  skull: {color: 0xcfc5a8, opacity: 1, r: .14}, // one per dry kill
  // the dry kinds: a dust smudge where a skeleton came apart, a chip of bone where it was struck
  dust: {color: 0x4e4840, opacity: .38, r: .27},
  chip: {color: 0xcfc5a8, opacity: 1, r: .06}, // a splinter
  // the acid kinds: a drip where a jelly was struck, a slick with a few drips where it died
  drip: {color: 0x6f8a1e, opacity: .5, r: .1},
  slick: {color: 0x55701a, opacity: .62, r: .3},
};
// The bones a kill leaves: shape 0 long bone, 1 rib, 2 splinter, 3 vertebra (bone-shards.js);
// a dry kill adds a skull.
export const BONE_SHAPES = 4;

// Deterministic pseudo-random in [0,1) from a cell and a salt, so the same fight draws the same marks.
export const hash = (x, z, n = 0) => {
  const s = Math.sin(x * 127.1 + z * 311.7 + n * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

// The marks one event makes: [{kind, x, z, rot, s, shape?}] in cell coordinates with a little
// scatter. `ev.name` is the seen species; a pet's kill leaves no bones (it is eaten).
export function marksFor(ev) {
  if (!ev || !Number.isFinite(ev.x) || !Number.isFinite(ev.z)) return [];
  const {x, z} = ev, out = [], what = remainsOf(ev.name);
  if (what === 'none') return out;
  const at = (kind, n, spread, shape) => out.push({kind, x: x + (hash(x, z, n) - .5) * spread, z: z + (hash(x, z, n + 9) - .5) * spread,
    rot: hash(x, z, n + 3) * Math.PI * 2, s: .75 + hash(x, z, n + 5) * .6, ...(shape == null ? {} : {shape})});
  const bones = n => { for (let i = 0; i < n; i++) at('bone', 20 + i, .7, Math.floor(hash(x, z, 30 + i) * BONE_SHAPES)); };
  if (ev.type === 'death') {
    if (what === 'bones') { at('dust', 1, .2); bones(3 + (hash(x, z, 40) > .5 ? 1 : 0)); at('skull', 60, .5); }
    else if (what === 'slick') { at('slick', 1, .2); for (let i = 0; i < 2; i++) at('drip', 50 + i, .9); }
    else { at('pool', 1, .2); if (what === 'flesh' && !ev.pet) bones(2 + (hash(x, z, 40) > .5 ? 1 : 0)); }
  } else if (what === 'bones') at('chip', 1, .3);
  else if (what === 'slick') at('drip', 1, .3);
  else at('splat', 1, .3);
  return out;
}

// A flat puddle: a smooth outline whose radius swells in two or three slow lobes, so it reads
// as liquid that ran and settled, not a spiky star.
export function puddleRadius(seed, a) {
  const p1 = hash(seed, 1) * 6.283, p2 = hash(seed, 2) * 6.283, p3 = hash(seed, 3) * 6.283;
  return .78 + .14 * Math.sin(2 * a + p1) + .09 * Math.sin(3 * a + p2) + .04 * Math.sin(5 * a + p3);
}
function splatGeometry(THREE, seed) {
  const pts = [];
  for (let i = 0; i < SPLAT_SIDES; i++) {
    const a = i / SPLAT_SIDES * Math.PI * 2, r = puddleRadius(seed, a);
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
  g.rotateX(-Math.PI / 2);
  return g;
}

export function createMarks(THREE, parent, {cap = MARK_MAX} = {}) {
  const splats = [0, 1, 2].map(i => splatGeometry(THREE, i + 1));
  const bones = boneGeometries(), shapeOf = m => m.kind === 'skull' ? 'skull' : m.kind === 'chip' ? 'splinter' : BONE_KINDS[m.shape ?? 0];
  const live = []; // oldest first
  const drop = m => { parent.remove(m.mesh); m.mesh.material.dispose(); };
  function add(ev) {
    for (const m of marksFor(ev)) {
      const k = KINDS[m.kind], bone = m.kind === 'bone' || m.kind === 'chip' || m.kind === 'skull';
      let mesh;
      if (bone) { mesh = new THREE.Mesh(bones[shapeOf(m)], boneMaterial()); placeBone(mesh, shapeOf(m), {...m, seed: hash(m.x, m.z, 8) * 100}, k.r); }
      else {
        const mat = new THREE.MeshBasicMaterial({color: k.color, transparent: true, opacity: k.opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
        mesh = new THREE.Mesh(splats[Math.floor(hash(m.x, m.z, 7) * 3)], mat);
        mesh.position.set(m.x, .035 + live.length % 8 * .001, m.z);
        mesh.rotation.y = m.rot; mesh.scale.setScalar(k.r * m.s); mesh.renderOrder = 1;
      }
      parent.add(mesh);
      live.push({mesh, base: k.opacity, fade: 0, bone});
    }
    // Over the cap: start the oldest not-yet-fading marks fading, stains before bones, so a
    // fight's bones stay on the floor after its blood has faded. The total cap is unchanged.
    let over = live.filter(m => !m.fade).length - cap;
    for (const bone of [false, true])
      for (const m of live) if (over > 0 && !m.fade && m.bone === bone) { m.fade = 1; over--; }
  }
  function update(dt) {
    dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    for (let i = live.length - 1; i >= 0; i--) {
      const m = live[i];
      if (!m.fade) continue;
      m.fade -= dt / FADE_S;
      if (m.fade <= 0) { drop(m); live.splice(i, 1); } else { const mat = m.mesh.material; if (!mat.transparent) { mat.transparent = true; mat.needsUpdate = true; } mat.opacity = m.base * m.fade; }
    }
  }
  function clear() { live.forEach(drop); live.length = 0; }
  return {add, update, clear, count: () => live.length, solid: () => live.filter(m => !m.fade).length, bones: () => live.filter(m => !m.fade && m.bone).length};
}
