// Persistent combat marks: a fight leaves a dark stain where it happened. A hit spatters a small
// ragged splat on the floor, a kill leaves a wider pool with a few bone shards beside it. Flat,
// angular shapes (never round blobs), shared geometry, a hard cap, and the oldest mark fades out
// first when the cap is reached. Positions come from combat events (combat-events.js).
export const MARK_MAX = 40, FADE_S = 1.2, SPLAT_SIDES = 9;
export const KINDS = {
  splat: {color: 0x4a0c0c, opacity: .78, r: .2},
  pool: {color: 0x2e0707, opacity: .86, r: .36},
  bone: {color: 0xb8ae94, opacity: .9, r: .07},
};

// Deterministic pseudo-random in [0,1) from a cell and a salt, so the same fight draws the same marks.
export const hash = (x, z, n = 0) => {
  const s = Math.sin(x * 127.1 + z * 311.7 + n * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

// The marks one event makes: [{kind, x, z, rot, s}] in cell coordinates with a little scatter.
export function marksFor(ev) {
  if (!ev || !Number.isFinite(ev.x) || !Number.isFinite(ev.z)) return [];
  const {x, z} = ev, out = [];
  const at = (kind, n, spread) => out.push({kind, x: x + (hash(x, z, n) - .5) * spread, z: z + (hash(x, z, n + 9) - .5) * spread,
    rot: hash(x, z, n + 3) * Math.PI * 2, s: .75 + hash(x, z, n + 5) * .6});
  if (ev.type === 'death') {
    at('pool', 1, .2);
    if (!ev.pet) for (let i = 0; i < 2 + (hash(x, z, 40) > .5 ? 1 : 0); i++) at('bone', 20 + i, .7);
  } else at('splat', 1, .3);
  return out;
}

// A jagged flat polygon: alternating long and short radii give a spiky, angular stain.
function splatGeometry(THREE, seed) {
  const pts = [];
  for (let i = 0; i < SPLAT_SIDES * 2; i++) {
    const a = i / (SPLAT_SIDES * 2) * Math.PI * 2, r = (i % 2 ? .45 : .75) + hash(seed, i) * .25;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
  g.rotateX(-Math.PI / 2);
  return g;
}

export function createMarks(THREE, parent, {cap = MARK_MAX} = {}) {
  const splats = [0, 1, 2].map(i => splatGeometry(THREE, i + 1));
  const shard = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-1, 0), new THREE.Vector2(.2, .35), new THREE.Vector2(1, 0), new THREE.Vector2(.1, -.2)]));
  shard.rotateX(-Math.PI / 2);
  const live = []; // oldest first
  const drop = m => { parent.remove(m.mesh); m.mesh.material.dispose(); };
  function add(ev) {
    for (const m of marksFor(ev)) {
      const k = KINDS[m.kind];
      const mat = new THREE.MeshBasicMaterial({color: k.color, transparent: true, opacity: k.opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
      const mesh = new THREE.Mesh(m.kind === 'bone' ? shard : splats[Math.floor(hash(m.x, m.z, 7) * 3)], mat);
      mesh.position.set(m.x, .035 + live.length % 8 * .001, m.z);
      mesh.rotation.y = m.rot; mesh.scale.setScalar(k.r * m.s); mesh.renderOrder = 1;
      parent.add(mesh);
      live.push({mesh, base: k.opacity, fade: 0, bone: m.kind === 'bone'});
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
      if (m.fade <= 0) { drop(m); live.splice(i, 1); } else m.mesh.material.opacity = m.base * m.fade;
    }
  }
  function clear() { live.forEach(drop); live.length = 0; }
  return {add, update, clear, count: () => live.length, solid: () => live.filter(m => !m.fade).length, bones: () => live.filter(m => !m.fade && m.bone).length};
}
