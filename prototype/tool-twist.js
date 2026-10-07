import * as THREE from 'three';

// Model twists for magic tools whose true name the bridge gives away (tool-auras.js keys on the
// same name). The shape stays the common tool's; the material takes on the effect: the frost horn
// frosts over and glows cold, the fire horn smoulders with an ember glow, the horn of plenty
// warms to old gold, the magic harp gleams
// like tarnished gilt, the magic flute and whistle take a cold, hollow sheen, the bag of tricks stains blood-dark,
// the drum of earthquake dulls to dusty brown, the marker bleeds violet ink and the unicorn horn pales to ivory.
// tint: the colour the materials are pulled toward; mix: how far; glow: the emissive colour and strength.
const TWISTS = {
  'frost horn': {tint: 0xb4d8ee, mix: .45, glow: 0x6aa8d8, power: .3},
  'fire horn': {tint: 0x5a2410, mix: .4, glow: 0xff5a14, power: .4},
  'horn of plenty': {tint: 0xc8942c, mix: .35, glow: 0xe0a030, power: .18},
  'magic harp': {tint: 0xb8923a, mix: .3, glow: 0xf0d890, power: .16},
  'magic flute': {tint: 0x8a9ac8, mix: .3, glow: 0x7a90e0, power: .16},
  'magic whistle': {tint: 0xc4d0dc, mix: .3, glow: 0xdce8f4, power: .14},
  'bag of tricks': {tint: 0x4a1410, mix: .4, glow: 0xc02a20, power: .22},
  'drum of earthquake': {tint: 0x6a5238, mix: .4, glow: 0x8a5a2a, power: .16},
  'magic marker': {tint: 0x2a1860, mix: .35, glow: 0x4a2a90, power: .2},
  'unicorn horn': {tint: 0xf0ece0, mix: .4, glow: 0xf4f8ff, power: .2},
};

export function toolTwistKind(name) {
  const n = String(name || '').toLowerCase().trim().replace(/^(?:\d+ |an? |the )/, '').replace(/(?: \([^)]*\))+$/, '');
  return Object.hasOwn(TWISTS, n) ? n : null;
}

// Tints the tool's own materials in `group` (disposal is unchanged). Returns the twist name or null.
export function applyToolTwist(group, object) {
  const kind = toolTwistKind(object?.name);
  if (!kind) return null;
  const {tint, mix, glow, power} = TWISTS[kind], seen = new Set();
  group.traverse(o => {
    const m = o.material;
    if (!m?.color || !m.emissive || seen.has(m)) return;
    seen.add(m);
    if (!m.vertexColors) m.color.lerp(new THREE.Color(tint), mix);
    m.emissive.set(glow);
    m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, power);
  });
  group.userData.twist = kind;
  return kind;
}
