// Jaw motion for creatures that have a `jaw` handle (crocodiles, rothes, leocrottas, wumpuses).
// The jaw is a child of the head that hinges about its own x axis; a positive angle drops the
// lower jaw open. Every pose here is an offset from the model's rest angle and never closes
// past it, so interlocking teeth never pass through each other.
//
// jawPose(kind, attack, u, result) gives the offset at normalised time u (0..1) of an action
// from actions.js. A bite gapes through the windup and slams shut just before the strike lands
// (monster-attacks.js strikes at u≈.44); on a hit the jaws stay clamped while the head worries,
// on a miss they snap on air and gnash once more. Spit, breath and screams throw the mouth
// open with the head; an engulf gapes; any other attack bares the teeth a little. A hit makes
// the jaw drop in a grunt, and a death leaves it hanging slack.

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const bump = (u, peak) => u <= 0 || u >= 1 ? 0 : u < peak ? smooth(u / peak) : 1 - smooth((u - peak) / (1 - peak));

// Widest gape, in radians.
export const JAW_GAPE = .6;
// How far each model opens, as a share of JAW_GAPE. The crocodile's long hinged snout takes the
// full gape. The leocrotta's maw already splits back to its ears, so a little less still reads as
// huge. The wumpus and rothe have short, rounded lower jaws that look dislocated at the full .6,
// so they open about half as far. A model can set `jaw.userData.reach` to override this.
export const JAW_REACH = {crocodile: 1, leocrotta: .8, wumpus: .6, rothe: .55};

export function jawReach(actor) {
  const r = actor?.jaw?.userData?.reach ?? JAW_REACH[actor?.g?.name] ?? 1;
  return Number.isFinite(r) ? Math.min(1, Math.max(0, r)) : 1;
}

// Where in a bite the jaw is fully open, and where it has slammed shut.
export const BITE_OPEN_U = .32, BITE_SHUT_U = .42;

export function jawPose(kind, attack, u, result = 'hit') {
  u = clamp01(Number.isFinite(u) ? u : 0);
  if (kind === 'attack') {
    switch (attack) {
      case 'bite': {
        const open = smooth((u - .04) / (BITE_OPEN_U - .04));
        // The snap is fast: a cubic ease-in, so the jaw is still accelerating when it closes.
        const shut = clamp01((u - BITE_OPEN_U - .02) / (BITE_SHUT_U - BITE_OPEN_U - .02));
        let a = JAW_GAPE * open * (1 - shut * shut * shut);
        // A miss closes on nothing, so the jaws part and gnash once more.
        if (result !== 'hit') a += .22 * bump((u - .5) / .3, .45);
        return a;
      }
      case 'spit':
      case 'breath':
      case 'scream':
        // Opens with the throw of the head (monster-attacks.js's strike), held through the blast.
        return (attack === 'breath' ? JAW_GAPE : .45) * bump((u - .14) / .8, .45);
      case 'engulf':
        return JAW_GAPE * bump(u, .5);
      default:
        // A snarl: the lips draw back and the jaw parts a little in the windup.
        return .12 * bump(u / .5, .6);
    }
  }
  if (kind === 'hit') return .18 * bump(u, .22);
  if (kind === 'die') return .38 * smooth((u - .15) / .5);
  return 0;
}
