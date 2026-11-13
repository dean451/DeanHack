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
  canine: {
    curledShare: .71, // owners reporting a curled sleeping dog (Guide Dogs survey of 2,000 UK owners)
    ownerSleepHours: 9, // what those owners believe
    walkSpeed: [.78, .96], // m/s, Labrador retrievers on a treadmill
    trotSpeed: [.9, 1.1], // m/s, small trotting dogs on a pressure walkway
  },
  // gargoyles and gremlins: a macaque's rest and a hawk's one-footed perch
  gargoyle: {
    macaqueRest: [.3383, .341], // share of the day resting: rhesus in Nepal, mangrove macaques
    hawkOneFoot: .22, // peak share of time a merlin stands on one foot (Laterality 2024, as quoted)
  },
  // imps: a monkey's walk and a bird's head bob
  imp: {
    monkeyWalkSpeed: [.4, 1.0], // m/s, rhesus and cynomolgus on a treadmill
    macaqueTreadmill: [.4, 1.7], // m/s, Japanese macaques, diagonal at every speed
    gullBobSpeed: 2.56, // head lengths a second while bobbing (Ring-billed gulls)
    gullNoBobSpeed: 3.98, // head lengths a second while not bobbing
  },
  // kobolds: a crouched human walk and a dog's head on its neck
  kobold: {
    crouchKnee: 30, // degrees of minimum knee flexion that makes a walk a crouch
    crouchKneeSim: 45, // degrees held by healthy men simulating crouch gait
    crouchSpeedShare: .5, // their pace against their normal pace
    atlasSwing: {labrador: [5.7, 14.5], chihuahua: [9.1, 18.7]}, // degrees, sagittal rotation of the skull on the neck, mean through a walk
  },
  // leprechaun: a human squatting to rest, and skipping (the jig is a hop-step gait)
  leprechaun: {
    squatKnee: 112, // degrees of peak knee flexion in a deep squat (35 healthy subjects, mean)
    squatHip: 107, // degrees of peak hip flexion in the same squat
    skipSpeed: [2.5, 2.68], // m/s, the fixed speeds skipping was measured at (two lab studies)
    usualWalk: 1.31, // m/s, usual outdoor pace, to set the skip against
  },
  // nymphs: a person sitting at ease
  nymph: {
    uprightSit: 90, // degrees at hip and knee in the upright "90-90-90" sit (an ergonomic guide, not a population measure)
    relaxedTrunkThigh: 135, // degrees between trunk and thigh at which the lumbar spine sits neutral (Keegan 1953; positional MRI, RSNA 2006)
    seatBack: [23, 53], // degrees of seat-back angle 24 people were measured at; more recline, pelvis tilted back and less lumbar flexion
  },
  // hobbit, dwarves, bugbear, mind flayer: an adult human's walk
  human: {
    walkSpeed: [1.27, 1.35], // m/s, usual pace outdoors, 95% CI of the mean (Murtagh et al. 2020)
    cadence: 116.65, // steps a minute at that pace
    stepWidth: .13, // preferred step width as a share of leg length (SFU locomotion lab)
  },
  // goblins and orcs: a drilled soldier's march and stand at ease
  soldier: {
    quickTime: 120, // steps a minute (the Army's range is 116 to 124)
    quickStep: .762, // metres, the 30-inch step
    slowMarch: 106, // steps a minute, a modern normal cadence (Army Heritage Center)
    doubleTime: 180, // steps a minute
    atEaseFeet: [.254, .305], // metres the left foot moves out: 10 inches and 12 inches, two summaries
    lumbarUpright: .6, // share of L5/S1 flexion range already used sitting upright
  },
  // rothe, mumak, leocrotta, wumpus, titanothere, baluchitherium: an elephant's walk, a cow's lying, a rhino's sleep
  quadruped: {
    elephantWalk: 1.1, // m/s, Asian elephants filmed on a 15 m path (Kongsawasdi et al. 2017)
    elephantStride: [1.92, 1.99], // metres, mean stride length at that pace
    elephantStrideTime: [2.26, 2.34], // seconds, mean gait cycle time of each limb
    elephantSlowest: .4, // m/s, the slowest walk in 2,400 strides of 62 elephants (Hutchinson et al. 2006)
    elephantFastest: 6.8, // m/s, the fastest verified Asian elephant
    cowLying: [10, 12], // hours a day a lactating cow lies down (Tucker, in Texas Dairy Matters)
    cowLyingPasture: 9.3, // hours a day on pasture
    cowLyingFreestall: 11.4, // hours a day in a freestall barn
    rhinoSleep: 8, // hours a day, at most, in intervals; deep sleep lying with the feet curled to one side (International Rhino Foundation)
  },
  // enormous, giant, rabid and sewer rats: a brown rat's walk, its face-washing chain and its sleep
  rat: {
    walkSpeed: [.2, .8], // m/s, the range over which a walking rat's gait keeps its pattern (Quantitative aspects of normal locomotion in rats, 1979)
    slowWalk: .319, // m/s, a slow walk's speed per stride (1975 rat locomotion study)
    walkStrideTime: .5, // seconds, a walking stride (same study)
    gallop: 1.259, // m/s, a gallop's speed per stride (same study)
    groomChain: 5, // seconds, the stereotyped face-washing chain (Berridge, Fentress and Parr 1987)
    groomStrokes: 25, // at most, forelimb strokes and body licks in that chain
    groomPhases: 4,
    asleepLight: .584 + .069, // share of the light phase asleep at 75 days old (NREM 58.4% and REM 6.9%, Frontiers in Neurology 2019)
    asleepDark: .375 + .063, // share of the dark phase asleep (NREM 37.5% and REM 6.3%)
  },
  // the zruty: a bear's walk and a gorilla's night
  zruty: {
    bearWalk: 1.7, // m/s, a captive grizzly's walk (SICB conference abstract, four females on a runway)
    bearRunningWalk: 2.6, // m/s, its running walk (same abstract)
    bearCanter: 2.9, // m/s, its canter (same abstract)
    bearEfficientWalk: 4.2 / 3.6, // m/s, the most energy-efficient walking speed on a treadmill (4.2 km/h, PopSci on the grizzly treadmill study)
    bearWildWalk: .6, // m/s, wild grizzlies recorded walking (same article)
    gorillaNight: [12, 13], // hours a night in the nest (Taronga Zoo says about 13; other pages say 12)
    gorillaNestBefore: 1, // hours before sunset a gorilla starts building its night nest
  },
  // cave and giant spiders and the scorpions: a spider's running speed, a scorpion's tail
  spider: {
    gaitLegs: 4, // legs in each of the two alternating sets of a running wolf spider (Ward and Humphreys 1981)
    maxSpeedExponent: .353, // maximum speed scales with body mass to this power in wolf and huntsman spiders (J. Comp. Physiol. A 2021)
    meanSpeedExponent: .197, // mean running speed scales to this power (same study)
    fastest: 3.59, // m/s, Heteropoda jugulans over a very short burst (preprint, ScienceAlert)
    scorpionTailShare: .25, // about a quarter of a fat-tailed scorpion's mass is its tail (Telheiro et al. 2021)
  },
  // bats and the raven: a little brown bat's day on the roost, a horseshoe bat's flight, a raven's size
  bat: {
    roostDay: 15, // hours a day a little brown bat spends in day roosts (Kunz 1980, as quoted by a sleep review)
    roostNight: 5, // hours a day in night roosts (same)
    forage: 4, // hours a day foraging (same)
    sleepRecord: 19.9, // hours a day asleep, the 1969 record from one captive bat (Guinness World Records; questioned)
    minPowerSpeed: 4.8, // m/s, a greater horseshoe bat's minimum-power flight speed, with a reduced-span upstroke (Aldridge 1987)
    ravenLength: [.58, .69], // m, a common raven bill to tail (BirdForum Opus)
    ravenSpan: [1.2, 1.5], // m, its wingspan (same)
  },
  // the stalker and the fire and earth elementals: a person standing still, creeping, and a fire's flicker
  elemental: {
    swayVelocity: 9.2, // mm/s, mean centre-of-pressure speed in quiet stance, eyes open, 100 young adults (Posturographic standards, PMC10170532)
    swayVelocityClosed: [11.2, 12.38], // mm/s, the same with eyes closed, women and men (same)
    swayAP: [5.5, 5.6], // mm, front-to-back sway amplitude over 10 s in active students, before fatigue (J Hum Kinet)
    stepLengthExponent: .577, // step length grows as speed to this power in very slow walking (Smith and Lemaire 2019)
    stepTimeExponent: .423, // step time shrinks as speed to this power (same)
    doubleSupport: {usual: .12, slowest: .55}, // share of the gait cycle on both feet, self-selected and slowest speed (same)
    flickerFactor: [1.5, 1.68], // Hz·m^0.5: a buoyant flame puffs at about this over the square root of its base width in metres (Xia et al., arXiv 1803.10400; Malalasekera 1996)
  },
  // the pony, horse, warhorse and unicorns: a horse's sleep, its lying down, the cocked hind leg and the walk
  horse: {
    sleepHours: [2.5, 5], // hours a day an adult horse sleeps (Animals 2021, PMC8614510)
    sleepStanding: .8, // share of that sleep standing (same)
    lyingMinutes: {low: 0, mean: 67.4, high: 319}, // minutes a day lying down, 83 sanctuary horses (same)
    remMinLying: 30, // minutes a day lying down for minimal REM sleep (same; Frontiers 2017)
    sternalShare: [.06, .10], // share of the time budget lying on the chest (Frontiers 2017, PMC5339441)
    lateralShare: [.01, .04], // share lying flat on the side (same)
    walkSpeed: {collected: 1.37, medium: 1.73, extended: 1.82}, // m/s, six dressage horses (Clayton 1995)
    walkStride: [1.57, 1.93], // m, collected to extended (same)
    walkStrideTime: [1.064, 1.159], // s, extended to collected (same)
    restLeg: 'one hind leg locked by the stay apparatus carries the hindquarter, the other rests flexed on the toe of its hoof (WikiVet)',
  },
  // the long worms, purple worms and remorhaz: an earthworm's peristaltic crawl and coiled rest, a snake's concertina and strike
  worm: {
    massRange: [.012, 8.5], // g, the earthworms filmed crawling (Quillin 1999, J Exp Biol 202:661)
    speedExp: .33, strideExp: .41, freqExp: -.07, dutyExp: -.03, // crawling speed, stride length, stride frequency and duty factor against body mass (same)
    strideHz: .25, strideBL: .15, // stride frequency, Hz, and stride length, body lengths, near 1 g (a secondary summary of the same; unconfirmed)
    contacts: [4, 6], // anchor points a corn snake presses on the walls of a 4 cm channel in concertina (Marvi and Hu 2012)
    wallPush: 9, // times its body weight a snake pushes the walls with, climbing a 60 degree channel (same)
    strike: {
      ratSnake: {v: 2.67, dist: .167, ms: 74}, // mean peak speed m/s, reach m and duration ms (Penning, Sawvel and Moon 2016)
      cottonmouth: {v: 2.98, dist: .136, ms: 66}, // (same)
    },
    strikeReach: [1 / 3, 1], // share of its length a rattlesnake can strike (Crotalus summary)
    strikeUsual: .5, // and it rarely strikes past this share (same)
    rest: 'an earthworm waits out drought coiled into a tight ball in a mucus-lined chamber; a resting snake lies coiled, loosely or tightly',
  },
  // the gnomes: a short-legged person (achondroplasia) standing and walking; the waddle is the pelvis's swing
  gnome: {
    walkSpeed: {short: .98, control: 1.32}, // m/s, self-selected, 16 children with achondroplasia and 19 controls (Broström et al. 2022)
    stepLength: {short: .38, control: .61}, // m (same)
    cadence: {short: 152.8, control: 128.3}, // steps a minute (same)
    normSpeed: {short: .49, control: .48}, // speed over the square root of g times leg length: the same once leg length is taken out (same)
    pelvisTilt: {short: 20.0, control: 11.0}, // degrees, peak forward tilt of the pelvis (same)
    pelvisTiltAdult: 21.9, // degrees, mean forward tilt in adults with achondroplasia (EORS 2016 abstract)
    pelvisRotation: {short: 19.6, control: 12.2}, // degrees, the pelvis's range of turn about the vertical over a stride, children (Broström et al. 2022)
    pelvisRotationAdult: 28.7, // degrees, the same range in adults (EORS 2016 abstract)
    pelvisObliquity: {short: 7.4, control: 8.0}, // degrees, the pelvis's side-to-side tip over a stride: not raised (Broström et al. 2022)
    adultVsControl: {speed: -.23, stride: -.29, strideFreq: .13}, // 10 adults against 17 controls (Sims et al. 2020)
    walkRunFroude: .5, // a person changes from a walk to a run near this Froude number, at any leg length
  },
  // the grid bugs and xans: a cockroach resting, running and escaping (grid bug, chillbug); a wasp's sting (xan)
  gridBug: {
    tripodSpeed: [.44, 1.0], // m/s, the American cockroach (0.83 g) runs an alternating tripod over this range (Full and Tu 1991, J Exp Biol 156:215)
    fewLegSpeed: [1.0, 1.5], // m/s, four and then two legs, with aerial phases (same)
    topBL: 50, // body lengths a second, flat out (UF Book of Insect Records, ch. 39)
    earlyBL: 40, earlySpeed: 1.3, // the earlier record, nearly 40 lengths a second at 1.3 m/s (McConnell and Richards 1955, as cited)
    tripodHz: 7, // stepping faster than this holds a tight tripod (Bender et al., PLoS ONE, Blaberus discoidalis)
    gaitFroude: .4, // the gait changes near this Froude number (same)
    escapeLatency: {usual: .058, fastest: .011}, // s, wind puff to escape starting (Camhi, Tom and Volman 1978, as cited)
    escapeThreshold: .012, // m/s, the slowest puff that sets it off (Plummer and Camhi 1981, as cited)
    rest: 'the body and the antennae both touching the surface; alert but still, it stands on extended legs with the body partly raised and the antennae moving',
    escape: 'it first turns away from the attack, then runs',
    stingAngle: {wasp: 10, bee: 6}, // degrees, the most efficient insertion slant, modelled (Scientific Reports 2018)
    sting: 'a paper wasp bends its abdomen swiftly into a sharp curve under the body to strike; the thin waist lets it',
  },
  // the couatl, ki-rin and angels: a flying snake's glide (couatl), a resting snake's coil, a horse's levade (ki-rin), a person's upright stance and raised arm (angels)
  angelic: {
    glideHz: 1.4, // Hz, a paradise tree snake's aerial undulation in an equilibrium glide (Socha and LaBarbera 2005, J Exp Biol 208:1835)
    glideHzRange: [1.15, 1.46], // Hz, the sample trials of the 3D motion-capture study (Yeaton, Ross, Baumgardner and Socha 2020, Nature Physics, SI)
    glideAmplitude: .23, // the wave's height as a share of snout-vent length in that glide (Socha and LaBarbera 2005)
    glideAmplitudeRange: [.20, .34], // the same over earlier glides (as quoted with Socha and LaBarbera 2005)
    glideAngle: 25, // degrees below the horizontal at equilibrium (Socha and LaBarbera 2005)
    diveAngle: [52, 62], // degrees, the ballistic dive after the jump, before the glide shallows (same)
    glideSpeed: {forward: 6.8, sink: 3.0}, // m/s (same)
    coil: 'an ambushing rattlesnake rests coiled on the ground, the head on or near the top of the coil, for hundreds of hours at a stretch (Maag and Clark 2022, 250 coiled hours a predator encounter)',
    coiledHoursPerThreat: 250, // coiled hours per predator encounter, averaged over six rattlesnake populations (same)
    levade: [30, 35], // degrees, the horse's body to the ground in the levade, forehand raised on lowered, coiled hindquarters (Airs above the ground)
    pesade: 45, // degrees, the older, steeper rear (same)
    standLean: 3, // degrees, a person's usual forward lean in quiet standing, the centre of mass a little ahead of the ankle (Physiology News, Understanding standing)
    shoulderFlexion: 180, // degrees, the arm raised forward and up over the head, the textbook normal (AAOS values, Physiopedia)
    shoulderFlexionActive: 168, // degrees, a measured active norm (PMC1713230, table 2)
    elbowFlexion: [145, 150], // degrees, normal elbow flexion (CDC joint range of motion study; AAOS values)
  },
  // the centaurs: a horse's trot and its restless pawing for the horse half (the walk and rest are `horse`), an archer's draw for the man's half
  centaur: {
    trotSpeed: {collected: 3.20, working: 3.61, medium: 4.47, extended: 4.93}, // m/s, six trained dressage horses (Clayton 1994, Equine Vet J 26:230)
    trotStride: {collected: 2.50, working: 2.73, medium: 3.26, extended: 3.55}, // m, the stride at each of those trots (same)
    pawedShare: .585, // of 41 Standardbred racehorses, the share seen pawing at least once (Butler and Houpt 2014, J Equine Sci 25:57)
    pawingShare: {morning: .09, afternoon: .112}, // share of scan observations spent pawing, before and after training (same)
    paw: 'a horse standing tied or stalled paws: one foreleg lifted, swung forward and dragged back along the ground, again and again, more when sore or kept waiting (Butler and Houpt 2014)',
    drawSeconds: [.985, 2.228], // s, the drawing phase in two groups of elite archers (PMC8000336, ARST and ARW2 group means)
    holdSeconds: [3.042, 4.414], // s, the holding phase at full draw in the same two groups (same)
    drawShoulder: {elite: 99.0, novice: 107.2}, // degrees, drawing arm's shoulder abduction while aiming (Shinohara and Urabe, as cited in Frontiers in Sports and Active Living 2025)
    drawElbow: {elite: 138, novice: 144}, // degrees, drawing arm's elbow flexion while aiming (same)
  },
  // the giants: a heavy person's slower, wider walk and slow rise from a seat, and a thrower's heave (giants hurl boulders)
  giant: {
    walkSpeed: {heavy: 1.40, lean: 1.47}, // m/s, preferred walking speed of 10 obese and 10 normal-weight women (Browning and Kram 2005, Obes Res 13:891)
    stepWidthGain: .30, // obese adults stepped about 30% wider at every speed from 0.5 to 1.75 m/s (Browning and Kram 2007, Med Sci Sports Exerc 39:1632, as summarized)
    riseSeconds: {heavy: 3.02, lean: 1.67}, // s, sit to stand in women who were obese against lean women (Univ. of Kentucky study)
    riseTrunkFlexion: {heavy: 28.9, lean: 35.8}, // degrees, peak trunk flexion while rising (same): the heavy body leans forward less
    rise: 'a heavy person rises from a seat slowly and with little forward lean, pushing up with the knees more than the hips (Sibella et al. 2003)',
    throwSeconds: [1.60, 1.62], // s, a rotational shot put from the first double support to release, one athlete's two throws (ISBS 1996, Konstanz archive)
    deliverySeconds: [.18, .20], // s, the last double support phase, the heave itself (same)
    releaseAngle: [37, 38], // degrees, the release angle top shot putters cluster round (arXiv 1007.3689)
  },
  // the jabberwock: a heron's neck and strike (its long neck thrusts the head out low); the walk is the monitor lizard's (dragon.lizard)
  heron: {
    aimSpeed: .52, // m/s, the head's slow pre-strike phase, western reef heron at underwater prey (Katzir and Intrator 1987, J Comp Physiol A 160)
    strikeSpeed: {underwater: 2.70, surface: 1.54}, // m/s, the strike phase itself (same; at prey above the water the two phases blur)
    strikePath: 33, // degrees, the mean angle of the head's path in the strike (same)
    strikeSeconds: .167, // s, about ten frames at 60 fps, a great blue heron filmed by an amateur: a rough check, not a measurement
    cervical: 17, // neck vertebrae, the same in herons of very different size (SICB abstract, scaling of the axial skeleton in Ardeidae)
    forageShare: .62, // of an adult great blue heron's day budget spent foraging, standing or wading slowly (Crested Butte Land Trust 2019 report)
    vigilantShare: .031, // of the same budget spent upright and vigilant (same)
    rest: 'stands still for long spells, often on one leg, the neck folded back into an S with the head sunk on the shoulders; strikes from that S, one long vertebra acting as the hinge',
  },  // the Kops: a policeman at ease and a runner, played back as a silent comedy was (undercranked, then shown faster)
  kop: {
    runCadence: 165, // steps a minute, 21 experienced recreational runners' preferred cadence (de Ruiter et al. 2020)
    runCadenceEfficient: 171, // steps a minute, the same runners' most economical cadence (same)
    runCadenceSpread: [160, 210], // steps a minute, the spread among runners of one 100 km race (Burns, quoted by Outside)
    crankFps: [12, 14], // frames a second the Mutual-era comedies were cranked at (silentfilmmusic.com, Mutual restorations)
    projectFps: [16, 18], // frames a second, the projection speed films of the early and mid teens are best seen at (silentfilmmusic.com)
    keystoneFps: [20, 21], // frames a second Keystone shorts can be run at and keep the slapstick readable (silentfilmmusic.com)
    soundFps: 24, // frames a second, sound film's projection rate, locked in 1925 or 1926 (same)
    rest: 'stands at ease, the hands at the small of the back centred on the belt (a police academy drill page); the feet as the soldier\'s (soldier.atEaseFeet)',
  },
  // the liches: a wasted, rigid human, measured from frailty and parkinsonian gait (slow, stooped, arms still, the hands trembling, turning in one piece)
  lich: {
    slowWalk: .8, // m/s, at or under this usual pace a person counts as slow in sarcopenia (EWGSOP2) and at risk of disability (PMC12017394)
    armSwingLoss: 7.07, // degrees less arm swing range than healthy walkers, pooled over 15 studies (Navarro-Lopez et al. 2022, Gait Posture 98)
    stoop: {lower: 30, upper: 45}, // degrees of standing forward bend that count as camptocormia, bending at the hips or at the chest (2018 consensus)
    tremorHz: [4, 6], // the parkinsonian rest tremor, distal and often one-sided (J Parkinsons Dis review)
    turnSeconds: {pd: 2.18, control: 1.79}, // s, a 180 degree turn, early parkinson\'s against age-matched people (Salarian et al. 2009, inertial sensors)
    turnSteps: {pd: 4, control: 3}, // steps for that turn: people with parkinson\'s take more than 4, healthy people 2 to 3 (Tzu Chi Med J 2013 review)
    rest: 'stands bent forward from the hips or chest, the bend gone only when lying down; arms hang still at the sides, the hands trembling at rest',
  },
  // the mummies: a stiff human, measured from the stiff-knee gait (the knee barely bends in the swing, the leg hiked round) and how real mummies were laid out
  mummy: {
    swingKnee: [61, 68], // degrees, a healthy adult's peak knee flexion in the swing, by sex (Oberg et al. 1994, 233 subjects)
    swingKneeAgeLoss: [.5, .8], // degrees less of it each decade of age (same)
    stiffKnee: 40, // degrees, peak swing knee flexion under this is diagnosed stiff-knee gait (PMC9654761)
    stiffKneeSide: {peak: 44.3, gap: 17}, // degrees: under 44.3, or 17 less than the other leg, picks out stiff-knee gait after stroke (Lee et al., Clin Biomech 120)
    severeKnee: [7, 26], // degrees, peak swing knee flexion in a small post-stroke sample walking 0.35 to 0.5 m/s (PMC7448457)
    clearance: 'hip hiking', // how a braced stiff leg clears the floor: hiked at the hip and swung round, not abducted (Akbas et al., bioRxiv 520684)
    rest: 'laid out with the forearms crossed over the chest, or one across the chest and one along the flank (Amenhotep I, Saleem and Hawass 2021)',
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
// What the canines' poses use: the share of the day asleep as owners see it, and the walk's pace
export const CANINE = {
  sleepShare: MEASURES.canine.ownerSleepHours / 24,
  curledMostly: MEASURES.canine.curledShare > .5,
  walkMid: mid(MEASURES.canine.walkSpeed),
};

// What the gargoyles' poses use: how much of a day a monkey rests, and the most a hawk perches on one foot
export const GARGOYLE = {
  restShare: mid(MEASURES.gargoyle.macaqueRest),
  oneFootMax: MEASURES.gargoyle.hawkOneFoot,
};

// What the humanoids' poses use: a person's pace, and the step length and width that come with it
export const HUMAN = {
  walkMid: mid(MEASURES.human.walkSpeed),
  // metres a step covers at the mid pace
  stepLength: mid(MEASURES.human.walkSpeed) / (MEASURES.human.cadence / 60),
  stepWidth: MEASURES.human.stepWidth,
};

// What the imps' poses use: the pace of a monkey's diagonal walk, and that a bird bobs only below a run
export const IMP = {
  walkMid: mid(MEASURES.imp.monkeyWalkSpeed),
  bobbingBelowRun: MEASURES.imp.gullBobSpeed < MEASURES.imp.gullNoBobSpeed,
};

// What the kobolds' poses use: how bent a crouch is, how slow it walks, and how far the dog-like head tips on its neck
export const KOBOLD = {
  crouchKnee: MEASURES.kobold.crouchKnee * Math.PI / 180,
  crouchPace: MEASURES.kobold.crouchSpeedShare * HUMAN.walkMid,
  headSwing: [MEASURES.kobold.atlasSwing.labrador[0], MEASURES.kobold.atlasSwing.chihuahua[1]].map(d => d * Math.PI / 180),
};

// What the nymphs' poses use: how a person sits upright and how far back a relaxed sit leans
export const NYMPH = {
  uprightHip: MEASURES.nymph.uprightSit * Math.PI / 180,
  relaxedHip: MEASURES.nymph.relaxedTrunkThigh * Math.PI / 180,
  leanBack: (MEASURES.nymph.relaxedTrunkThigh - MEASURES.nymph.uprightSit) * Math.PI / 180,
};

// What the leprechaun's poses use: how deep it squats and how fast it skips
export const LEPRECHAUN = {
  squatKnee: MEASURES.leprechaun.squatKnee * Math.PI / 180,
  squatHip: MEASURES.leprechaun.squatHip * Math.PI / 180,
  skipMid: mid(MEASURES.leprechaun.skipSpeed),
  skipOverWalk: mid(MEASURES.leprechaun.skipSpeed) / MEASURES.leprechaun.usualWalk,
};

// What the goblins' and orcs' poses use: a drilled march's pace and the stance at ease
export const SOLDIER = {
  // metres a second at quick time
  quickPace: MEASURES.soldier.quickTime / 60 * MEASURES.soldier.quickStep,
  slowOverQuick: MEASURES.soldier.slowMarch / MEASURES.soldier.quickTime,
  chargeOverQuick: MEASURES.soldier.doubleTime / MEASURES.soldier.quickTime,
  atEaseFeet: mid(MEASURES.soldier.atEaseFeet),
};

// What the heavy quadrupeds' poses use: an elephant's slow walk and how long a bovine lies
export const QUADRUPED = {
  // stride frequency at the filmed pace, strides a second
  strideHz: 1 / mid(MEASURES.quadruped.elephantStrideTime),
  // metres a second a stride of that length covers in that time
  stridePace: mid(MEASURES.quadruped.elephantStride) / mid(MEASURES.quadruped.elephantStrideTime),
  // the share of a day a cow spends lying down
  cowLyingShare: mid(MEASURES.quadruped.cowLying) / 24,
  // the share of a day a rhino sleeps, at most
  rhinoSleepShare: MEASURES.quadruped.rhinoSleep / 24,
};

// What the rats' poses use: the stride of a slow walk and how much of a day a rat sleeps
export const RAT = {
  // strides a second in a walk
  strideHz: 1 / MEASURES.rat.walkStrideTime,
  // metres a stride covers at the slow walk
  slowStride: MEASURES.rat.slowWalk * MEASURES.rat.walkStrideTime,
  // the share of a whole day asleep, light and dark phases twelve hours each
  asleepShare: (MEASURES.rat.asleepLight + MEASURES.rat.asleepDark) / 2,
  // seconds a face-washing stroke takes, evenly spread over the chain
  strokeTime: MEASURES.rat.groomChain / MEASURES.rat.groomStrokes,
};

// What the zruty's poses use: a bear's walking pace against its canter and how much of a day a gorilla sleeps
export const ZRUTY = {
  walkMid: MEASURES.zruty.bearWalk,
  canterOverWalk: MEASURES.zruty.bearCanter / MEASURES.zruty.bearWalk,
  // the share of a whole day asleep, taking the night as twelve hours
  asleepShare: mid(MEASURES.zruty.gorillaNight) / 24,
};

// What the spiders' poses use: how much faster a spider's top speed grows with size than its usual pace, and the tail's weight
export const SPIDER = {
  // top speed against mean speed grows by this power of mass
  sprintGap: MEASURES.spider.maxSpeedExponent - MEASURES.spider.meanSpeedExponent,
  // legs stepping at once in a running gait (the other four are planted)
  legsPerSet: MEASURES.spider.gaitLegs,
  // the share of a scorpion's weight carried in its tail
  tailShare: MEASURES.spider.scorpionTailShare,
};

// What the bats' and the raven's poses use: how much of a day a bat hangs, and a raven's span against its length
export const BAT = {
  // the share of a day spent in a roost, day or night
  roostShare: (MEASURES.bat.roostDay + MEASURES.bat.roostNight) / 24,
  // the share spent flying and foraging
  forageShare: MEASURES.bat.forage / 24,
  // a raven's wingspan over its length, mid to mid
  ravenSpanOverLength: mid(MEASURES.bat.ravenSpan) / mid(MEASURES.bat.ravenLength),
};

// What the elementals' poses use: a standing body's slow drift, the stalker's creep, and how fast a fire elemental flickers
export const ELEMENTAL = {
  // metres of front-to-back drift a body standing still shows, mid of the measured amplitude
  swayAmplitude: mid(MEASURES.elemental.swayAP) / 1000,
  // step length at a creep of 0.3 m/s against the usual pace, from the slow-walking power law
  creepStepShare: (.3 / HUMAN.walkMid) ** MEASURES.elemental.stepLengthExponent,
  // share of a creeping stride with both feet down
  creepDoubleSupport: MEASURES.elemental.doubleSupport.slowest,
  // the flicker of a flame body about 0.5 m across, Hz, for the two published factors
  flickerHz: MEASURES.elemental.flickerFactor.map(k => k / Math.sqrt(.5)),
};

// What the horses' poses use: how rarely a horse lies down against dozing on its feet, and its walking pace
export const HORSE = {
  // the share of a day spent lying, from the mean minutes
  lyingShare: MEASURES.horse.lyingMinutes.mean / (24 * 60),
  // hours a day of sleep taken standing, cocked on one hind leg, mid of the range
  standingSleepHours: mid(MEASURES.horse.sleepHours) * MEASURES.horse.sleepStanding,
  // of the time lying, the share on the chest rather than flat out, mid to mid
  sternalOfLying: mid(MEASURES.horse.sternalShare) / (mid(MEASURES.horse.sternalShare) + mid(MEASURES.horse.lateralShare)),
  // the usual (medium) walk, m/s, and the stride at it, m
  walkMid: MEASURES.horse.walkSpeed.medium,
  strideMid: mid(MEASURES.horse.walkStride),
};

// What the worms' poses use: a slow crawl that speeds up by longer strides, a few anchors, and a fast short strike from a coil
export const WORM = {
  // crawling speed near 1 g, body lengths a second (stride frequency times stride length)
  crawlBL: MEASURES.worm.strideHz * MEASURES.worm.strideBL,
  // the anchors along a crawling body, mid of the range
  anchors: mid(MEASURES.worm.contacts),
  // a strike's duration, s, and its mean speed over the reach, m/s, mid of the two snakes
  strikeS: (MEASURES.worm.strike.ratSnake.ms + MEASURES.worm.strike.cottonmouth.ms) / 2000,
  strikeMeanV: (MEASURES.worm.strike.ratSnake.dist / MEASURES.worm.strike.ratSnake.ms + MEASURES.worm.strike.cottonmouth.dist / MEASURES.worm.strike.cottonmouth.ms) / 2 * 1000,
  // the usual strike reach, a share of the body's length: no more than half
  strikeShare: MEASURES.worm.strikeUsual,
};

// What the gnomes' poses use: short legs walk slower by shorter, quicker steps; the pelvis tips forward and swings round, not side to side
export const GNOME = {
  // the short walk against a person's: speed, step and cadence, children's values
  speedShare: MEASURES.gnome.walkSpeed.short / MEASURES.gnome.walkSpeed.control,
  stepShare: MEASURES.gnome.stepLength.short / MEASURES.gnome.stepLength.control,
  cadenceShare: MEASURES.gnome.cadence.short / MEASURES.gnome.cadence.control,
  // seconds a step takes at the short walk
  stepTime: 60 / MEASURES.gnome.cadence.short,
  // the standing pelvis's forward tilt, rad, children to adults
  pelvisTilt: [MEASURES.gnome.pelvisTilt.short, MEASURES.gnome.pelvisTiltAdult].map(d => d * Math.PI / 180),
  // the waddle: the pelvis's turn about the vertical, each way from straight (half the range), rad, children to adults
  waddleYaw: [MEASURES.gnome.pelvisRotation.short, MEASURES.gnome.pelvisRotationAdult].map(d => d / 2 * Math.PI / 180),
  // its side-to-side tip, each way, rad: a person's, no more
  waddleRoll: MEASURES.gnome.pelvisObliquity.short / 2 * Math.PI / 180,
};

// What the grid bugs and xans use: lie flat at rest, scuttle in quick tripods, startle away in a twentieth of a second; the xan stings in a curl at a slant
export const GRIDBUG = {
  // the startle's delay, s, from the hero coming near to the turn starting
  startle: MEASURES.gridBug.escapeLatency.usual,
  // the fewest steps a second for a tight tripod scuttle
  scuttleHz: MEASURES.gridBug.tripodHz,
  // body lengths a second flat out, the record range
  dashBL: [MEASURES.gridBug.earlyBL, MEASURES.gridBug.topBL],
  // the sting's slant off the target, rad
  stingSlant: MEASURES.gridBug.stingAngle.wasp * Math.PI / 180,
};

// What the couatl, ki-rin and angels use: the couatl swims the air in slow wide waves, a ki-rin rears into a levade, an angel stands tall, leaning a hair forward, and raises its blade overhead
export const ANGELIC = {
  // the couatl's wave, Hz, and its height against the body's length
  glideHz: MEASURES.angelic.glideHz,
  waveShare: MEASURES.angelic.glideAmplitude,
  // the couatl's body pitched nose down as it glides, rad
  glidePitch: MEASURES.angelic.glideAngle * Math.PI / 180,
  // a ki-rin's rear: the body's angle to the floor, rad, mid of the levade
  rear: mid(MEASURES.angelic.levade) * Math.PI / 180,
  // an angel's lean forward from the ankles at rest, rad
  lean: MEASURES.angelic.standLean * Math.PI / 180,
  // the sword arm raised overhead, rad from hanging, the measured active reach
  raise: MEASURES.angelic.shoulderFlexionActive * Math.PI / 180,
};

// What the centaurs use: the horse half trots and paws, the man's half draws and holds a bow
export const CENTAUR = {
  // the working trot, m/s, and its stride, m; strides a second at it
  trotMid: MEASURES.centaur.trotSpeed.working,
  trotStride: MEASURES.centaur.trotStride.working,
  trotHz: MEASURES.centaur.trotSpeed.working / MEASURES.centaur.trotStride.working,
  // the share of an idle stand spent pawing, mid of the morning and afternoon shares
  pawShare: (MEASURES.centaur.pawingShare.morning + MEASURES.centaur.pawingShare.afternoon) / 2,
  // the draw and the hold at full draw, s, mid of the two groups
  draw: mid(MEASURES.centaur.drawSeconds),
  hold: mid(MEASURES.centaur.holdSeconds),
  // the drawing arm at full draw: shoulder raised out to the side and elbow folded, rad, the elite archers'
  drawShoulder: MEASURES.centaur.drawShoulder.elite * Math.PI / 180,
  drawElbow: MEASURES.centaur.drawElbow.elite * Math.PI / 180,
};

// What the giants use: a heavy person's lumber (slower and wider than a person's usual walk), the slow rise and the boulder heave
export const GIANT = {
  // the heavy walk's speed as a share of a lean one's, and its step width against the humanoids' (a share of leg length)
  walkOverLean: MEASURES.giant.walkSpeed.heavy / MEASURES.giant.walkSpeed.lean,
  stepWidth: MEASURES.human.stepWidth * (1 + MEASURES.giant.stepWidthGain),
  // standing up from the sit, s, and the forward lean on the way up, rad
  rise: MEASURES.giant.riseSeconds.heavy,
  riseLean: MEASURES.giant.riseTrunkFlexion.heavy * Math.PI / 180,
  // the whole throw and the heave at its end, s, mid of the measured throws
  throw: mid(MEASURES.giant.throwSeconds),
  heave: mid(MEASURES.giant.deliverySeconds),
  // the boulder leaves the hands rising at this angle, rad
  release: mid(MEASURES.giant.releaseAngle) * Math.PI / 180,
};

// What the jabberwock uses: the heron's slow aim and sudden strike from a folded neck, and the dragon's lizard walk
export const JABBERWOCK = {
  // the head creeps forward, then shoots out about five times faster
  aim: MEASURES.heron.aimSpeed,
  strike: MEASURES.heron.strikeSpeed.underwater,
  strikeOverAim: MEASURES.heron.strikeSpeed.underwater / MEASURES.heron.aimSpeed,
  // the head's path down onto the prey, rad, and the strike's length, s
  strikePath: MEASURES.heron.strikePath * Math.PI / 180,
  strikeTime: MEASURES.heron.strikeSeconds,
  // most of its time it stands and stalks; a little of it upright and watching
  stalkShare: MEASURES.heron.forageShare,
  watchShare: MEASURES.heron.vigilantShare,
  // walking, the head holds steady against the trunk's swing, as a dragon's does
  headSteady: MEASURES.dragon.lizard.headYaw / MEASURES.dragon.lizard.trunkYaw,
};

// What the Kops use: a runner's cadence sped up the way a silent comedy was, and a policeman's stand at ease
export const KOP = {
  // a runner's preferred step rate, Hz
  cadence: MEASURES.kop.runCadence / 60,
  // how much faster the run looked in its day (cranked at 12 to 14, shown at 16 to 18), and seen today at sound speed
  comicSpeed: [MEASURES.kop.projectFps[0] / MEASURES.kop.crankFps[1], MEASURES.kop.projectFps[1] / MEASURES.kop.crankFps[0]],
  modernSpeed: MEASURES.kop.soundFps / MEASURES.kop.projectFps[0],
  // the step rate of the comic run as the audience saw it, Hz: the runner's, sped up by the middle of that range
  comicCadence: MEASURES.kop.runCadence / 60 * mid([MEASURES.kop.projectFps[0] / MEASURES.kop.crankFps[1], MEASURES.kop.projectFps[1] / MEASURES.kop.crankFps[0]]),
  // at ease: the soldier's foot spread, the hands behind at the belt
  atEaseFeet: mid(MEASURES.soldier.atEaseFeet),
  handsBehind: /small of the back/.test(MEASURES.kop.rest),
};

// What the liches use: a wasted walker's slow pace, the stoop, the still arms, the rest tremor and the turn in one piece
export const LICH = {
  // usual pace, m/s, and as a share of a healthy walker's
  walk: MEASURES.lich.slowWalk,
  walkShare: MEASURES.lich.slowWalk / mid(MEASURES.human.walkSpeed),
  // the stoop at rest, rad: the lower (hip) bend, never past the upper (chest) one
  stoop: MEASURES.lich.stoop.lower * Math.PI / 180,
  stoopUpper: MEASURES.lich.stoop.upper * Math.PI / 180,
  // the arm swing taken away, rad
  armSwingLoss: MEASURES.lich.armSwingLoss * Math.PI / 180,
  // the hands' tremor, Hz, mid of the range
  tremor: mid(MEASURES.lich.tremorHz),
  // a half turn takes this much longer than a healthy one, and more steps
  turnSlow: MEASURES.lich.turnSeconds.pd / MEASURES.lich.turnSeconds.control,
  turnSteps: MEASURES.lich.turnSteps.pd,
};

// What the mummies use: the knee held nearly straight through the swing, the hip hiked to clear the floor, the arms crossed at rest
export const MUMMY = {
  // a living walker's peak swing knee, rad, mid of the range
  liveKnee: mid(MEASURES.mummy.swingKnee) * Math.PI / 180,
  // the mummy's peak swing knee, rad: the middle of the badly stiff sample, under the stiff-knee cut-off
  swingKnee: mid(MEASURES.mummy.severeKnee) * Math.PI / 180,
  // the cut-off it must stay under, rad
  stiffKnee: MEASURES.mummy.stiffKnee * Math.PI / 180,
  // the share of a living knee's swing it keeps
  kneeShare: mid(MEASURES.mummy.severeKnee) / mid(MEASURES.mummy.swingKnee),
  // a worse leg: at least this much less bend than the other, rad
  legGap: MEASURES.mummy.stiffKneeSide.gap * Math.PI / 180,
  // the leg clears the floor by hiking the hip, not by swinging it out
  hipHike: /hip hiking/.test(MEASURES.mummy.clearance),
  armsCrossed: /crossed over the chest/.test(MEASURES.mummy.rest),
};
