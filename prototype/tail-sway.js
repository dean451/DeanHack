// The idle side-to-side sway of an actor's tail handle (rotation.z), written absolutely by live.js
// each frame. Most tails swing on one sine at a rate and reach set by the model's quirk. Mind
// flayers' tail is their bundle of face tentacles, which on the generic 3 rad/s swing looked like a
// wagging dog's tail; theirs now drifts slowly, with a faster, smaller second wave on top so it
// never quite repeats, and each flayer starts at its own phase so two side by side don't sway in step.
// Cthulhu's tentacle beard drifts the same way (cthulhu-writhe.js writhes the tentacles on top).

// Rate (rad/s) and swing (rad) per quirk; DEFAULT for everything else.
const QUIRKS = {dog: [7, .34], turtle: [1.1, .06], unicorn: [2.6, .16], nymph: [1.4, .07]};
const DEFAULT = [3, .24];
// Flayer tentacles: slow wave RATE/SWING, plus a second wave RATE2/SWING2.
export const FLAYER_RATE = 1.2, FLAYER_SWING = .1, FLAYER_RATE2 = 2.9, FLAYER_SWING2 = .035;
const FLAYERS = new Set(['mind flayer', 'master mind flayer', 'cthulhu']);
// The shambling horror's tail handle is its head, built lolled over by HORROR_LOLL; it hangs there
// and drifts slowly instead of wagging (shambler-lurch.js lolls and snaps it on top).
export const HORROR_LOLL = .32, HORROR_DRIFT = .07;

// A dog's wag now and then cuts out: every DOG_PERIOD s it snaps still and holds the tail stiff for
// about DOG_HOLD s, as if it had caught a scent or a sound it didn't like, then picks the wag back up.
// Each dog has its own timing. The tail stays inside its usual reach and eases in and out (DOG_IN, DOG_OUT).
export const DOG_PERIOD = 7.3, DOG_HOLD = .9, DOG_IN = .12, DOG_OUT = .3, DOG_STILL = .08;

// A unicorn's slow swish now and then turns irritated: every UNI_PERIOD s the tail lashes twice
// (UNI_FLICK rad on top of the swish, over UNI_LEN s), as if it had felt something on its flank that
// was not there. The lash is zero at both ends, so the tail never jumps. Each unicorn has its own timing.
export const UNI_PERIOD = 9.7, UNI_LEN = .8, UNI_FLICK = .22;
export function unicornLash(t, ph) {
  const w = (((t + ph * 1.9) % UNI_PERIOD) + UNI_PERIOD) % UNI_PERIOD;
  if (w >= UNI_LEN) return 0;
  const u = w / UNI_LEN;
  return UNI_FLICK * Math.sin(Math.PI * u) ** 2 * Math.sin(Math.PI * 4 * u);
}

// A stable phase for an actor, from where it was first seen, so it doesn't jump as it walks.
const phaseOf = a => a.tailPhase ??= ((a.g?.position.x || 0) * 1.7 + (a.g?.position.z || 0) * 2.3) % (Math.PI * 2);

// `phase` offsets the plain quirk sine (the gallery staggers its actors this way); flayers already
// carry their own phase.
const smooth = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
// The share of the wag left at time t: 1 normally, DOG_STILL while the tail is frozen.
export function dogFreeze(t, ph) {
  const w = (((t + ph * 1.3) % DOG_PERIOD) + DOG_PERIOD) % DOG_PERIOD;
  return 1 - (1 - DOG_STILL) * (smooth(w / DOG_IN) - smooth((w - DOG_HOLD) / DOG_OUT));
}

export function tailSway(a, t, phase = 0) {
  // Medusa's tail lies along the floor; medusa-coil.js bends it with a wave instead of rocking it.
  if (a.kind === 'medusa' || a.species === 'medusa') return 0;
  if (a.kind === 'shambling horror') {
    const ph = phaseOf(a);
    return HORROR_LOLL + Math.sin(t * .7 + ph) * HORROR_DRIFT + Math.sin(t * 1.9 + ph * 2.3) * HORROR_DRIFT * .35;
  }
  if (FLAYERS.has(a.species)) {
    const ph = phaseOf(a);
    return Math.sin(t * FLAYER_RATE + ph) * FLAYER_SWING + Math.sin(t * FLAYER_RATE2 + ph * 1.7) * FLAYER_SWING2;
  }
  const [rate, swing] = QUIRKS[a.quirk] || DEFAULT;
  if (a.quirk === 'dog') return Math.sin(t * rate + phase) * swing * dogFreeze(t, phaseOf(a));
  if (a.quirk === 'unicorn') return Math.sin(t * rate + phase) * swing + unicornLash(t, phaseOf(a));
  return Math.sin(t * rate + phase) * swing;
}
