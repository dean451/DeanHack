// Cat attacks (motion queue item 7, part 1). A cat that goes for small prey (rats, mice,
// newts and the like) crouches with its rear wiggling and tail twitching, springs in an arc
// onto the prey's tile, pins it and hops back. Anything bigger gets a quick one-paw swipe:
// rear up a little, cock the paw and rake it across. Kittens, housecats and the large cats
// scale the leap height and length with their size.
//
// catAttackPose(move, u, result, size) has the same shape as monsterAttackPose (actions.js
// applies it the same way) plus `paw` (lift of one forepaw) and `pawSide` (its sweep across).

import {restAttackPose} from './monster-attacks.js';

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const bump = (u, peak) => u < peak ? smooth(u / peak) : 1 - smooth((u - peak) / (1 - peak));
// 0 → 1 over [a, b].
const ramp = (u, a, b) => smooth((u - a) / (b - a));

// Relative size (housecat = 1).
export const CAT_SIZE = {kitten: .75, housecat: 1, 'large cat': 1.2, lynx: 1.1, jaguar: 1.35, panther: 1.4, tiger: 1.5};
// Seconds per move at housecat size.
export const CAT_TIME = {pounce: .95, swipe: .36};

// Size of a cat species, or null when it isn't one.
export function catSize(species) {
  const s = typeof species === 'string' ? species.toLowerCase().trim() : '';
  if (!s) return null;
  if (CAT_SIZE[s]) return CAT_SIZE[s];
  return /\bkitten\b/.test(s) ? CAT_SIZE.kitten : /\bcat\b/.test(s) ? CAT_SIZE.housecat : null;
}

const SMALL_PREY = /\b(rats?|mouse|mice|newts?|geckos?|lizards?|grid bugs?|cave spiders?|centipedes?|bats?)\b/;
// What a large cat will also leap on.
const BIG_PREY = /\b(jackals?|coyotes?|fox(es)?|kobolds?|gnomes?|hobbits?|rabbits?)\b/;

export function isPrey(target, size = 1) {
  const t = typeof target === 'string' ? target.toLowerCase() : '';
  return !!t && (SMALL_PREY.test(t) || (size >= 1.3 && BIG_PREY.test(t)));
}

// 'pounce' or 'swipe' for a cat's melee attack on `target` (a monster name, or null for the
// hero or an unseen target); null when the attacker isn't a cat or it wasn't a melee attack.
export function catMove(species, attack, target) {
  const size = catSize(species);
  if (!size || !['bite', 'claw', 'other'].includes(attack)) return null;
  return isPrey(target, size) ? 'pounce' : 'swipe';
}

export const catLength = (move, size = 1) => (CAT_TIME[move] ?? CAT_TIME.swipe) * (.8 + .2 * size);

export function catAttackPose(move, u, result = 'hit', size = 1) {
  const p = {...restAttackPose(), paw: 0, pawSide: 0};
  u = clamp01(u);
  const hit = result === 'hit', k = Math.min(1.6, Math.max(.6, size));
  if (move === 'pounce') {
    // Crouch 0–.34 (rear wiggle), leap .34–.58, land and pin .58–.74, hop back .74–1.
    const crouch = ramp(u, 0, .16) * (1 - ramp(u, .34, .42));
    const wiggle = Math.sin(u * 70) * ramp(u, .08, .18) * (1 - ramp(u, .3, .36));
    const out = ramp(u, .34, .58), back = ramp(u, .74, .98);
    // A miss overshoots and skids; a hit stops on the prey.
    const reach = (hit ? .72 : .86) * (.9 + .1 * k);
    p.lunge = reach * out * (1 - back) - .04 * crouch;
    const leap = Math.sin(Math.PI * clamp01((u - .34) / .24)), hop = Math.sin(Math.PI * clamp01((u - .74) / .24));
    p.dy = .22 * k * leap + .06 * k * hop - .05 * k * crouch;
    // Nose up on the way up, down on the way down, then a nose-down pin on the prey.
    const arc = u > .34 && u < .58 ? Math.sin(2 * Math.PI * (u - .34) / .24) : 0;
    p.pitch = .16 * crouch - .28 * arc + (hit ? .14 : .05) * bump(clamp01((u - .56) / .2), .4);
    p.twist = .06 * wiggle;
    p.roll = .09 * wiggle;
    p.stretch = 1 - .12 * crouch + .1 * leap - .12 * bump(clamp01((u - .56) / .1), .5);
    p.fore = -1.1 * leap + (hit ? .5 : .2) * bump(clamp01((u - .56) / .2), .4) - .3 * hop;
    p.tail = .35 * crouch + .25 * Math.sin(u * 55) * crouch - .5 * leap;
    p.head = .2 * crouch;
    return p;
  }
  // Swipe: rear a little and cock the paw, rake it across, and settle.
  const W = bump(clamp01(u / .45), .75), S = bump(clamp01((u - .3) / .5), .35);
  const whiff = hit ? 1 : 1.3;
  p.lunge = .12 * k * S * whiff - .03 * W;
  p.dy = .04 * k * W;
  p.pitch = -.2 * W + .1 * S;
  p.paw = -1.3 * W - .5 * S;
  p.pawSide = .55 * W - .8 * S * whiff;
  p.twist = .18 * W - .3 * S;
  p.roll = .08 * (W - S);
  p.tail = .3 * W;
  p.head = -.1 * W + .15 * S;
  return p;
}
