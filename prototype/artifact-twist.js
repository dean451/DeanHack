import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {ARTIFACTS, artifactFromName} from './artifact-gleam.js';

// Floor artifacts take their power in the material: the base item's shape stays, its metal is
// pulled toward the artifact's own glint colour and smoulders faintly in it (Stormbringer
// bleeds red, Frost Brand frosts, Fire Brand embers). Like artifact-gleam.js the look keys on
// the name as the hero sees it (`label`), never the true type. Excalibur burns brightest.
const MIX = .3, POWER = .2;
const POWER_BY_KIND = {
  excalibur: .32, stormbringer: .3, 'fire brand': .3, 'frost brand': .26,
  // The great non-weapon artifacts burn hardest: they are the strongest magic on the floor.
  'heart of ahriman': .38, 'orb of fate': .32, 'palantir of westernesse': .32, 'eye of the aethiopica': .32,
  'magic mirror of merlin': .28, 'eyes of the overworld': .28, mjollnir: .28, 'vorpal blade': .28,
};

// Shape twists: a few artifacts add one merged mesh in their glint colour, so the silhouette says
// what they are. The mirror lies flat (glass centred at x -.075, oval 1.18 wide), the card flat.
// The material is shared per colour and lives for the session, so no model has to free it.
const SHAPE_MATERIALS = new Map();
const shapeMaterial = hex => {
  if (!SHAPE_MATERIALS.has(hex)) SHAPE_MATERIALS.set(hex, new THREE.MeshStandardMaterial({color: hex, emissive: hex, emissiveIntensity: .5, metalness: .6, roughness: .35}));
  return SHAPE_MATERIALS.get(hex);
};
const SHAPES = {
  // A crown of seven sharp thorns round the frame, leaning outward like a broken halo.
  'magic mirror of merlin'() {
    const parts = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, thorn = new THREE.ConeGeometry(.008, .05 + (i % 3) * .012, 4);
      thorn.rotateZ(-Math.cos(a) * .35); thorn.rotateX(Math.sin(a) * .35);
      thorn.translate(-.075 + Math.cos(a) * .118 * 1.18, .05, Math.sin(a) * .118);
      parts.push(thorn);
    }
    return parts;
  },
  // The ball is a freed prisoner's: a lit seam splits it round its belly and a broken shackle ring
  // hangs open above it. The ball rests on y=0, radius .16, centred a hair under .16.
  'iron ball of liberation'() {
    const R = .16, seam = new THREE.TorusGeometry(R * 1.012, .005, 6, 40), shackle = new THREE.TorusGeometry(.046, .004, 6, 18, Math.PI * 1.7);
    seam.rotateX(Math.PI / 2); seam.rotateZ(.3); seam.translate(0, R * .97, 0);
    shackle.rotateX(Math.PI / 2 - .35); shackle.translate(0, R * 1.97 + .075, 0);
    return [seam, shackle];
  },
  // The Eye of the Aethiopica is an eye that never shuts: a lit almond lid round the pendant with a
  // vertical slit pupil, lying just above the pendant (centred on the origin, lid 1.9 times as wide).
  'eye of the aethiopica'() {
    const lid = new THREE.TorusGeometry(.05, .004, 5, 28), slit = new THREE.BoxGeometry(.008, .004, .06);
    lid.rotateX(Math.PI / 2); lid.scale(1.9, 1, .55); lid.translate(0, .038, 0);
    slit.translate(0, .04, 0);
    return [lid, slit];
  },
  // The Heart of Ahriman beats: a thin lit ring on the floor round the stone, and five black-hot
  // shards standing round it, leaning in like the ribs of a cage. The stone spans about .34 wide.
  'heart of ahriman'() {
    const parts = [], ring = new THREE.TorusGeometry(.2, .004, 5, 36);
    ring.rotateX(Math.PI / 2); ring.translate(0, .006, 0);
    parts.push(ring);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + .3, shard = new THREE.ConeGeometry(.012, .09 + (i % 2) * .03, 4);
      shard.translate(0, .05 + (i % 2) * .015, 0);
      shard.rotateZ(Math.cos(a) * .3); shard.rotateX(-Math.sin(a) * .3);
      shard.translate(Math.cos(a) * .21, 0, Math.sin(a) * .21);
      parts.push(shard);
    }
    return parts;
  },
  // A thin hard edge of light round the card, like a razor ground into its rim.
  'platinum yendorian express card'() {
    const w = .114, d = .09, t = .004;
    return [[0, -d, w, t], [0, d, w, t], [-w, 0, t, d], [w, 0, t, d]].map(([x, z, hx, hz]) => new THREE.BoxGeometry(hx * 2, .006, hz * 2).translate(x, .008, z));
  },
};

// Tints the item's own materials in `group` (disposal is unchanged). Returns the artifact key or null.
// `clone`: give each mesh its own copy of the material first, for models whose materials may be shared.
export function applyArtifactTwist(group, object, {clone = false} = {}) {
  const kind = object ? artifactFromName(object.label, object.class) : null;
  if (!kind || group.userData.artifact === kind) return kind && group.userData.artifact;
  const color = new THREE.Color(ARTIFACTS[kind].color), seen = new Set(), copies = new Map();
  group.traverse(o => {
    let m = o.material;
    if (!m?.color || !m.emissive || o.userData.magicShell) return;
    if (clone) {
      if (!copies.has(m)) copies.set(m, m.clone());
      m = o.material = copies.get(m);
    }
    if (seen.has(m)) return;
    seen.add(m);
    if (!m.vertexColors) m.color.lerp(color, MIX);
    m.emissive.copy(color);
    m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, POWER_BY_KIND[kind] ?? POWER);
  });
  const shape = SHAPES[kind]?.();
  if (shape) {
    const mesh = new THREE.Mesh(mergeGeometries(shape), shapeMaterial(ARTIFACTS[kind].color));
    mesh.userData.magicShell = true; mesh.castShadow = true;
    group.add(mesh);
  }
  group.userData.artifact = kind;
  return kind;
}
