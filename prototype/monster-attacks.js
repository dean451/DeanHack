// Monster attack motions by attack type (motion queue item 5). Every attack reads from the
// root group and whatever standard parts the creature has, so a model with only a body and
// legs still shows what it did: a claw rears up and rakes with the forelegs, a bite crouches
// and snaps, a butt backs off and charges, a sting curls the tail over, a spit or breath
// rears back and throws the head forward, an engulf swells and surges over the target and
// gulps it down.
//
// monsterAttackPose(type, u, result) gives offsets at normalised time u (0..1). actions.js
// turns `lunge` into movement along the blow and applies the rest; `twist` adds to the turn
// toward the target, `fore` bends the front legs (four or more legs only), `wing` flares the
// wings, and `stretch` scales height against width (volume kept).

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const bump = (u, peak) => u < peak ? smooth(u / peak) : 1 - smooth((u - peak) / (1 - peak));

export const MONSTER_ATTACKS = ['claw', 'bite', 'kick', 'butt', 'touch', 'sting', 'hug', 'tentacle',
  'spit', 'engulf', 'breath', 'explode', 'boom', 'gaze', 'scream', 'magic', 'weapon', 'other'];

export function restAttackPose() {
  return {lunge: 0, dy: 0, twist: 0, pitch: 0, roll: 0, body: 0, head: 0, arm: 0, wrist: 0, socket: 0,
    leg: 0, fore: 0, tail: 0, wing: 0, scale: 1, stretch: 1};
}

export function monsterAttackPose(type, u, result = 'hit') {
  const p = restAttackPose();
  u = clamp01(u);
  // Windup peaks at u≈.28, the strike at u≈.44; a hit recoils a little after contact.
  const W = bump(clamp01(u / .4), .7), S = bump(clamp01((u - .18) / .66), .4);
  const hit = result === 'hit', whiff = hit ? 1 : 1.25;
  const R = hit ? bump(clamp01((u - .44) / .34), .3) : 0;
  const jitter = f => Math.sin(u * f);
  switch (type) {
    case 'claw':
      // Rear up with the forelegs raised, then rake down and across.
      p.lunge = S * .2 * whiff - W * .05;
      p.dy = W * .05;
      p.pitch = -W * .3 + S * .18;
      p.fore = -1.2 * W - .5 * S;
      p.twist = .3 * W - .45 * S;
      p.roll = .16 * (S - W);
      p.arm = -1.9 * bump(u, .45);
      p.wing = .5 * W;
      break;
    case 'bite':
      // Crouch and coil, snap forward, and worry the target on a hit.
      p.lunge = S * .26 * whiff - W * .07;
      p.dy = -.03 * W + .03 * S;
      p.pitch = -.12 * W + .3 * S;
      p.head = -.25 * W + .5 * S;
      p.stretch = 1 - .08 * W + .06 * S;
      p.twist = .12 * jitter(40) * R;
      p.wing = .3 * W;
      break;
    case 'kick':
      // Lean back and drive a leg forward.
      p.lunge = S * .1 - W * .04;
      p.pitch = .08 * W - .14 * S;
      p.leg = .3 * W - 1.3 * S;
      p.dy = .02 * S;
      break;
    case 'butt': {
      // Back off with the head down, then a later, harder charge that bounces off a hit.
      const C = bump(clamp01((u - .3) / .55), .35);
      p.lunge = C * .32 * whiff - W * .12 - R * .05;
      p.pitch = .22 * W + .3 * C;
      p.head = .35 * Math.min(1, W + C);
      p.dy = -.02 * W;
      p.stretch = 1 + .05 * C;
      break;
    }
    case 'sting':
      // Tail curls up over the back, then the body jabs down and forward.
      p.lunge = S * .16 * whiff - W * .04;
      p.tail = 1.5 * W + .5 * S;
      p.pitch = -.15 * W + .3 * S;
      p.dy = .02 * W;
      break;
    case 'touch':
      // A slow, deliberate reach.
      p.lunge = S * .12 * whiff;
      p.arm = -1.2 * S;
      p.pitch = .1 * S;
      p.scale = 1 + .03 * S;
      break;
    case 'hug':
    case 'tentacle':
      // Lunge in, spread and squeeze, and drag the target back on a hit.
      p.lunge = S * .22 * whiff - R * .1;
      p.stretch = 1 - .1 * S;
      p.fore = -1 * S;
      p.arm = -1.6 * S;
      // The mind flayer's face tentacles hang from the mouth; negative pitch lashes them forward
      // and up at the victim's head (positive swung them back into its own chest).
      p.tail = type === 'tentacle' ? -.8 * S : 0;
      p.roll = .06 * jitter(30) * S;
      break;
    case 'spit':
    case 'breath': {
      // Draw in and rear back, then throw the head forward; breath is bigger and flares wings.
      const k = type === 'breath' ? 1.25 : 1;
      p.pitch = k * (-.28 * W + .22 * S);
      p.head = k * (-.35 * W + .45 * S);
      p.lunge = S * .06 * whiff - W * .05;
      p.dy = k * .03 * W;
      p.scale = 1 + k * .06 * W;
      p.wing = type === 'breath' ? .6 * W : 0;
      break;
    }
    case 'engulf': {
      // Swell with the maw rearing open, then surge over the target's tile, flattening as it
      // spreads and snapping shut. A hit is swallowed in two beats: a tight squeeze (tall and
      // thin) that pushes it down, then a heavy bulge that settles. A miss deflates and shudders.
      const G1 = bump(clamp01((u - .5) / .22), .4), G2 = bump(clamp01((u - .64) / .26), .35);
      const M = hit ? 0 : bump(clamp01((u - .52) / .4), .3);
      p.scale = 1 + .22 * W + .1 * S - .07 * G1 + .06 * G2 - .1 * M;
      p.lunge = S * .34 * whiff;
      p.stretch = 1 - .12 * S + (hit ? .13 * G1 - .07 * G2 : -.04 * M);
      p.dy = .05 * W - .03 * G2 - .02 * M;
      p.head = -.3 * W + .3 * S;
      p.twist = .06 * jitter(55) * M;
      break;
    }
    case 'explode':
    case 'boom':
      // Swell and shudder.
      p.scale = 1 + .25 * S;
      p.twist = .08 * jitter(60) * S;
      p.lunge = S * .05;
      break;
    case 'gaze':
      // Rise and lean in, staring.
      p.dy = .05 * bump(u, .4);
      p.pitch = .1 * S;
      p.head = .2 * S;
      p.scale = 1 + .05 * S;
      p.lunge = S * .04;
      break;
    case 'scream':
      // Rear back and shake.
      p.pitch = -.25 * S;
      p.head = -.4 * S;
      p.scale = 1 + .08 * S;
      p.twist = .06 * jitter(50) * S;
      p.lunge = S * .03;
      break;
    case 'magic':
      // Rise with arms up and wings spread.
      p.dy = .06 * S;
      p.arm = -2.2 * S;
      p.wing = .5 * S;
      p.scale = 1 + .04 * S;
      p.lunge = S * .04;
      break;
    default: {
      // Weapon swing or anything else: lean back, lunge through, wave the arm.
      const reach = .18;
      p.lunge = S * reach * whiff - W * .06;
      p.pitch = S * .14 - W * .1;
      p.body = S * .03;
      if (type === 'weapon') {
        p.arm = -1.9 * bump(u, .45);
        p.wrist = .34 * bump(u, .45);
        p.socket = -1.18 * bump(u, .45);
      }
    }
  }
  return p;
}

// Front legs of a creature with four or more legs; none otherwise.
const foreCache = new WeakMap();
export function foreLegs(actor) {
  const legs = actor?.legs;
  if (!Array.isArray(legs) || legs.length < 4) return [];
  let f = foreCache.get(legs);
  if (!f) {
    // The front-most pair (or row): legs within a whisker of the largest z, if that's forward.
    const z = l => l?.position?.z ?? 0, front = Math.max(...legs.map(z));
    f = front > .02 ? legs.filter(l => z(l) > front - .03) : [];
    foreCache.set(legs, f);
  }
  return f;
}

// Side sign for a wing (its own userData.side, else left/right by index).
export const wingSide = (w, i) => w?.userData?.side || (i ? 1 : -1);
