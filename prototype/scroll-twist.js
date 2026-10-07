import * as THREE from 'three';
import {scrollAuraKind} from './scroll-auras.js';

// Paper twists for scrolls whose true name the bridge gives away (scroll-auras.js keys on the
// same name). The roll's shape and ribbon still follow the shuffled label; the paper itself
// takes on the effect: fire scorches, flood sodden grey-blue, genocide a black sheet with a
// dull red under-glow, scare monster ashen and dead, destroy armor rust-eaten, create monster blood-stained, stinking cloud sickly green, punishment
// iron-grey, amnesia washed out, the enchant scrolls and remove curse faintly lit, taming a leashed
// sage green, charging crackling blue-white and identify a clear pale blue.
// tint: the colour the paper is pulled toward; mix: how far; glow: emissive colour and strength.
const TWISTS = {
  fire: {tint: 0x2a1a12, mix: .45, glow: 0xff4a10, power: .2},
  flood: {tint: 0x5a6c78, mix: .45},
  genocide: {tint: 0x0c0a0a, mix: .65, glow: 0x8a0a14, power: .2},
  'scare monster': {tint: 0x3a3236, mix: .5},
  'destroy armor': {tint: 0x6a3a1c, mix: .45},
  light: {tint: 0xfff4d0, mix: .3, glow: 0xffe9a8, power: .3},
  teleportation: {tint: 0x6a40b0, mix: .3, glow: 0x9060ff, power: .22},
  'create monster': {tint: 0x2a0a0a, mix: .4, glow: 0xc01a10, power: .14},
  'stinking cloud': {tint: 0x6a7428, mix: .4},
  punishment: {tint: 0x4a4c50, mix: .45},
  amnesia: {tint: 0x8a8a94, mix: .4},
  'enchant weapon': {tint: 0x9cb8e8, mix: .3, glow: 0x7a9ee0, power: .18},
  'enchant armor': {tint: 0xd8e0e6, mix: .3, glow: 0xcad6e0, power: .16},
  'remove curse': {tint: 0xf8faff, mix: .35, glow: 0xf0f4ff, power: .18},
  taming: {tint: 0x4a7a40, mix: .4, glow: 0xb8f0a8, power: .12},
  charging: {tint: 0x3a4a8a, mix: .4, glow: 0xcfe0ff, power: .25},
  identify: {tint: 0x9ab8d8, mix: .4, glow: 0xd8ecff, power: .14},
};

export function scrollTwistKind(object) {
  const kind = scrollAuraKind(object);
  return kind && Object.hasOwn(TWISTS, kind) ? kind : null;
}

// Recolours the baked scroll mesh's vertex colours in `group`. Returns the twist name or null.
export function applyScrollTwist(group, object) {
  const kind = scrollTwistKind(object);
  if (!kind) return null;
  const {tint, mix, glow, power} = TWISTS[kind], to = new THREE.Color(tint), c = new THREE.Color();
  group.traverse(o => {
    const col = o.geometry?.attributes?.color;
    if (!col) return;
    for (let i = 0; i < col.count; i++) {
      c.fromBufferAttribute(col, i).lerp(to, mix);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    if (glow !== undefined) {
      o.material.emissive.set(glow);
      o.material.emissiveIntensity = power;
    }
  });
  group.userData.twist = kind;
  return kind;
}
