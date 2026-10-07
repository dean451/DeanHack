import * as THREE from 'three';
import {scrollAuraKind} from './scroll-auras.js';

// Paper twists for scrolls whose true name the bridge gives away (scroll-auras.js keys on the
// same name). The roll's shape and ribbon still follow the shuffled label; the paper itself
// takes on the effect: fire scorches, flood sodden grey-blue, genocide a black sheet with a
// dull red under-glow, scare monster ashen and dead, destroy armor rust-eaten.
// tint: the colour the paper is pulled toward; mix: how far; glow: emissive colour and strength.
const TWISTS = {
  fire: {tint: 0x2a1a12, mix: .45, glow: 0xff4a10, power: .2},
  flood: {tint: 0x5a6c78, mix: .45},
  genocide: {tint: 0x0c0a0a, mix: .65, glow: 0x8a0a14, power: .2},
  'scare monster': {tint: 0x3a3236, mix: .5},
  'destroy armor': {tint: 0x6a3a1c, mix: .45},
  light: {tint: 0xfff4d0, mix: .3, glow: 0xffe9a8, power: .3},
  teleportation: {tint: 0x6a40b0, mix: .3, glow: 0x9060ff, power: .22},
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
