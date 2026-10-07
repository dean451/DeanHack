import * as THREE from 'three';
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
  group.userData.artifact = kind;
  return kind;
}
