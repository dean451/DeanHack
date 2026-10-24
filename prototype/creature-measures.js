// Real-animal numbers for the creature behaviour plan. Each value cites its source in CREATURE-MEASURES.md,
// where the postures no source gave a number for are described in words. Ranges are [low, high].
export const MEASURES = {
  dragon: {
    // monitor lizard: neck, trunk, tail, walk
    lizard: {
      tailShare: [.45, .6], // of total length, Komodo dragon
      headYaw: 4.76, trunkYaw: 27.0, // degrees, running Acanthodactylus (Goyens and Aerts 2018)
      headRange: {pitch: 3.2, yaw: 4.74, roll: 9.03}, // degrees on flat ground, the same species
      walk: 'standing wave about the girdles at a walk, travelling at speed; head steady; tail base swings more with speed',
    },
    // big cat: lying down, sleep
    bigCat: {
      headBody: {male: [172, 250], female: [158, 192]}, // cm, lion
      tail: [60, 100], // cm
      tailShare: [.40, .41], // of nose-to-tail-tip, adult zoo lions
      sleepHours: [16, 20], // a day, wild lions
    },
    // bat: folding the wings
    bat: {
      forearm: [36, 40], // mm, little brown bat
      span: [222, 269], // mm
      length: [80, 98], // mm, total
      fold: 'fingers fold back beside the body, the third turning over; membrane pleated; may wrap the underside',
    },
    // bird of prey: mantling
    raptor: {
      length: {male: [45, 56], female: [50, 65]}, // cm, red-tailed hawk
      span: [114, 133], // cm
      mantle: 'wings spread and drooped forward over the kill, tail fanned, back arched, shoulders hunched, head down',
    },
  },
  insects: {
    ant: {
      gait: 'alternating tripod', strideExponent: [.3, .6], // s = a v^b (Zollikofer 1994)
      runAbove: 370, // mm/s, Cataglyphis: aerial phases, duty factor under 0.5
      defence: 'gaster lifted and flexed forward over the body to reach an attacker all round the head',
    },
    bee: {
      worker: [10, 15], // mm
      sleepMinutes: 30, // motionless, head lowered, antennae drooping
    },
    stag: {
      male: [36, 89], maleBody: [28, 56], female: [26, 45], // mm, Lucanus cervus; with and without mandibles
    },
  },
  // domestic fowl: the cockerel's head bob, crow and night rest
  fowl: {
    bobPerStep: 1, // head cycles per step: a hold, then a thrust (Necker; Hancock et al. 2014)
    crowSeconds: [1.51, 1.86], // Burgo roosters, morning to noon
    jungleCrowMs: 1416, // red jungle fowl, a sequence of 29 calls
    perchDarkShare: .85, // of the dark, caged hens on a perch (Duncan et al. 1992)
    proneNightShare: .77, // of the night, seven hens lying asleep
  },
  // wild cats: the tiger and leopard's size and rest, and the housecat's stealthy walk
  wildCat: {
    tiger: {headBody: {male: [189, 300], female: [146, 177]}, tail: [72, 109], shoulder: [80, 100]}, // cm
    leopard: {headBody: [91, 191], tail: [58, 110]}, // cm
    sleepHours: [16, 20], // a day, tigers (a keeper's guide)
    stealthRecovery: {mean: .176, sd: .113, max: .379}, // share of mechanical energy recovered walking crouched (Bishop et al. 2008)
  },
};

const mid = ([a, b]) => (a + b) / 2;
// What the dragon's poses use, derived from the numbers above.
export const DRAGON = {
  // the tail is about half the body's length
  tailShare: MEASURES.dragon.lizard.tailShare,
  // walking, the head's yaw is about a sixth of the trunk's
  headSteady: MEASURES.dragon.lizard.headYaw / MEASURES.dragon.lizard.trunkYaw,
  // a bat's forearm against its half-span: the fingers fold back along it, so the folded wing is about this long
  forearmShare: [MEASURES.dragon.bat.forearm[0] / (MEASURES.dragon.bat.span[1] / 2), MEASURES.dragon.bat.forearm[1] / (MEASURES.dragon.bat.span[0] / 2)],
  forearmMid: mid(MEASURES.dragon.bat.forearm) / (mid(MEASURES.dragon.bat.span) / 2),
  // a raptor's span against its length
  spanToLength: [MEASURES.dragon.raptor.span[0] / MEASURES.dragon.raptor.length.female[1], MEASURES.dragon.raptor.span[1] / MEASURES.dragon.raptor.length.male[0]],
  // asleep most of the day, like a big cat
  sleepShare: MEASURES.dragon.bigCat.sleepHours.map(h => h / 24),
};
// What the insects' poses use: the share of a male stag beetle's length that is mandibles
export const INSECTS = {
  mandibleShare: 1 - mid(MEASURES.insects.stag.maleBody) / mid(MEASURES.insects.stag.male),
  strideExponent: MEASURES.insects.ant.strideExponent,
};
// What the cockerels' poses use: a crow lasts this long, and a hen is down on the perch for this share of the dark
export const FOWL = {
  crowSeconds: MEASURES.fowl.crowSeconds,
  lyingDark: MEASURES.fowl.perchDarkShare * MEASURES.fowl.proneNightShare,
};
// What the wild cats' poses use: the tail against head and body, and the share of the day asleep
export const WILDCAT = {
  tailShare: [MEASURES.wildCat.tiger.tail[0] / (MEASURES.wildCat.tiger.headBody.male[1] + MEASURES.wildCat.tiger.tail[0]), MEASURES.wildCat.tiger.tail[1] / (MEASURES.wildCat.tiger.headBody.female[0] + MEASURES.wildCat.tiger.tail[1])],
  sleepShare: MEASURES.wildCat.sleepHours.map(h => h / 24),
};
