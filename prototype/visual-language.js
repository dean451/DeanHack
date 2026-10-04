// The game's visual grammar: one colour and one motion per element or effect, so
// fire, frost, poison and the rest look the same on a wand, a breath, a ring or a
// trap. See VISUAL-LANGUAGE.md. Colours are 0xRRGGBB for three.js; motions name the
// vocabulary the aura and particle code already uses (rise, fall, drift, orbit,
// sparkle, pulse, smoke, crackle).

export const ELEMENTS = {
  fire: {color: 0xff7a26, motion: 'rise', note: 'orange embers climbing, heat shimmer'},
  cold: {color: 0xbfe6ff, motion: 'fall', note: 'pale blue frost and mist sinking'},
  poison: {color: 0x7fb23a, motion: 'drift', note: 'sickly green wisps, slow and wet'},
  shock: {color: 0xcfe2ff, motion: 'crackle', note: 'white-blue arcs, brief and jagged'},
  holy: {color: 0xfff1c4, motion: 'rise', note: 'white-gold light lifting steadily'},
  curse: {color: 0x5a2a7a, motion: 'smoke', note: 'dark violet smoke that swallows light'},
  missile: {color: 0x8fb4ff, motion: 'orbit', note: 'violet-blue darts circling'},
  blood: {color: 0x8a1c1c, motion: 'fall', note: 'dark red drips and slow clotting'},
  acid: {color: 0x9acd32, motion: 'sparkle', note: 'corrosive green fizz'},
  sleep: {color: 0x3a4a9a, motion: 'drift', note: 'dim dark-blue motes, drowsy'},
  death: {color: 0x5fae7a, motion: 'pulse', note: 'cold sickly green, silent and dimming'},
  arcane: {color: 0xc56bff, motion: 'orbit', note: 'purple blinks and swirls: teleport, polymorph'},
  earth: {color: 0x8a6a45, motion: 'fall', note: 'grit and rock dust'},
};

export function elementColor(name) {
  const entry = ELEMENTS[name];
  return entry ? entry.color : null;
}

export function elementMotion(name) {
  const entry = ELEMENTS[name];
  return entry ? entry.motion : null;
}

// The ordered list of elements, for galleries and tests.
export const elementNames = () => Object.keys(ELEMENTS);

// Euclidean distance between two 0xRRGGBB colours (0..441), used to keep the
// elements visibly apart from one another.
export function colorDistance(a, b) {
  const d = (shift) => ((a >> shift) & 255) - ((b >> shift) & 255);
  return Math.hypot(d(16), d(8), d(0));
}
