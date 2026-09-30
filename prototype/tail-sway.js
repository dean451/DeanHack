// The idle side-to-side sway of an actor's tail handle (rotation.z), written absolutely by live.js
// each frame. Most tails swing on one sine at a rate and reach set by the model's quirk. Mind
// flayers' tail is their bundle of face tentacles, which on the generic 3 rad/s swing looked like a
// wagging dog's tail; theirs now drifts slowly, with a faster, smaller second wave on top so it
// never quite repeats, and each flayer starts at its own phase so two side by side don't sway in step.

// Rate (rad/s) and swing (rad) per quirk; DEFAULT for everything else.
const QUIRKS = {dog: [7, .34], turtle: [1.1, .06], unicorn: [2.6, .16], nymph: [1.4, .07]};
const DEFAULT = [3, .24];
// Flayer tentacles: slow wave RATE/SWING, plus a second wave RATE2/SWING2.
export const FLAYER_RATE = 1.2, FLAYER_SWING = .1, FLAYER_RATE2 = 2.9, FLAYER_SWING2 = .035;
const FLAYERS = new Set(['mind flayer', 'master mind flayer']);

// A stable phase for an actor, from where it was first seen, so it doesn't jump as it walks.
const phaseOf = a => a.tailPhase ??= ((a.g?.position.x || 0) * 1.7 + (a.g?.position.z || 0) * 2.3) % (Math.PI * 2);

export function tailSway(a, t) {
  if (FLAYERS.has(a.species)) {
    const ph = phaseOf(a);
    return Math.sin(t * FLAYER_RATE + ph) * FLAYER_SWING + Math.sin(t * FLAYER_RATE2 + ph * 1.7) * FLAYER_SWING2;
  }
  const [rate, swing] = QUIRKS[a.quirk] || DEFAULT;
  return Math.sin(t * rate) * swing;
}
