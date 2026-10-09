// Per-class deaths (motion queue item 6). Instead of every creature toppling the same way,
// the seen species name picks a death style:
//   crumble   undead and golems of earth: shudder, sag straight down and fall to dust
//   lichdust  liches and demiliches: crack, drop in stages like a collapsing frame, then a grey
//             dust cloud while the necrotic glow gutters out last
//   splat     jellies, puddings, blobs, molds: bulge, then flatten wide and fade into a puddle
//   dissipate vortices, clouds, ghosts, air elementals: spin up, swell and thin into mist
//   burst     lights and spheres, gas spores: swell fast and pop in a flash
//   petrify   turned to stone (the bridge's `stoned` death, not a species): a gasp, then stone
//             creeps up from the feet and it sets where it stands (petrify.js tints it)
//   topple    everything else: stagger and fall over away from the blow (the old die pose)
//
// deathPose(style, u, dir) gives offsets in actions.js's pose shape plus `sx`/`sy` (squash on
// width and height, volume roughly kept), `spin` (extra yaw) and `fade` (1 opaque → 0 gone).
// createDeathBurst(THREE) is a pooled particle system for the dust, splash, mist or flash
// each style throws off. Only the seen name is used, so nothing here tells you more than the
// map already does.

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

export const DEATH_STYLES = ['topple', 'crumble', 'lichdust', 'splat', 'dissipate', 'burst', 'petrify'];

// Seconds each style takes (topple matches actions.js's die).
export const DEATH_TIME = {topple: .9, crumble: 1, lichdust: 1.8, splat: .8, dissipate: 1, burst: .45, petrify: 1.8};

const RULES = [
  ['lichdust', /\b(demi|arch-?)?lich\b|\bdemilich\b/],
  ['burst', /\b(yellow|black) light\b|\bgas spore\b|\b(flaming|freezing|shocking) sphere\b/],
  ['dissipate', /vortex|\bfog cloud\b|\bair elemental\b|\bghost\b|\bshade\b|\bwraith\b|\bstalker\b|\bwill o'? the wisp\b/],
  ['splat', /\bjelly\b|\bpudding\b|\bblob\b|\booze\b|\bslime\b|\bmold\b|\blichen\b|\bshrieker\b|\bviolet fungus\b/],
  ['crumble', /\bzombie\b|\bmummy\b|\bskeleton\b|\blich\b|\bghoul\b|\bgolem\b|\bearth elemental\b|\bgargoyle\b|\bxorn\b/],
];

// Death style for a seen species name (anything unknown, or hallucinated nulls, topple).
export function deathStyle(name) {
  if (typeof name !== 'string' || !name) return 'topple';
  const n = name.toLowerCase();
  for (const [style, re] of RULES) if (re.test(n)) return style;
  return 'topple';
}

function unit(dir) {
  if (!Array.isArray(dir)) return null;
  const len = Math.hypot(dir[0], dir[1]);
  return Number.isFinite(len) && len > 0 ? [dir[0] / len, dir[1] / len] : null;
}

// Offsets for a death at normalised time u (0..1); the end pose is held.
export function deathPose(style, u, dir = null) {
  const p = {dx: 0, dy: 0, dz: 0, yaw: 0, pitch: 0, roll: 0, body: 0, head: 0, arm: 0, wrist: 0,
    socket: 0, leg: 0, tail: 0, wing: 0, scale: 1, sx: 1, sy: 1, spin: 0, fade: 1, stone: 0};
  u = clamp01(u);
  const d = unit(dir);
  const push = k => { if (d) { p.dx = d[0] * k; p.dz = d[1] * k; } };
  switch (DEATH_STYLES.includes(style) ? style : 'topple') {
    case 'crumble': {
      // A dry shudder, then a last uncanny double take (the head jerks up as if it had heard
      // its name), and only then the frame sags onto itself and sifts away.
      const shake = u < .35 ? Math.sin(u * 90) * .05 * (1 - u / .35) : 0;
      const sag = smooth((u - .25) / .6);
      p.roll = shake;
      p.pitch = .18 * sag;
      p.head = -.5 * sag + .45 * Math.sin(Math.PI * clamp01((u - .3) / .14));
      p.sy = 1 - .72 * sag;
      p.sx = 1 + .18 * sag;
      // A dead twitch of the arm as the dust starts to go, one that is not quite finished with it.
      p.arm = .6 * smooth((u - .35) / .3) + .1 * Math.sin(Math.PI * clamp01((u - .62) / .12)) * Math.sin((u - .62) * 100);
      // The knees go before the rest of it notices: the leg gives in a short jerk early on.
      p.leg = .5 * smooth((u - .15) / .2);
      // The hand lolls after the arm and whatever trailed behind it slumps last.
      p.wrist = .6 * smooth((u - .4) / .25);
      p.tail = .5 * smooth((u - .5) / .3);
      // Whatever it held goes slack with the hand: the grip tips over and slips once the
      // wrist has loosened.
      p.socket = .7 * smooth((u - .35) / .3);
      p.fade = 1 - smooth((u - .6) / .4);
      push(.04 * sag);
      break;
    }
    case 'lichdust': {
      // A rattling shudder, then the frame drops in three jolts (robe, ribs, skull) rather than
      // one smooth sag; the head lolls, the body slumps to a heap, and the dust sifts away with
      // the glow (fade) guttering out last.
      const shake = u < .3 ? Math.sin(u * 150) * .06 * (1 - u / .3) : 0;
      const step = a => smooth((u - a) / .12);
      const sag = (step(.25) + step(.45) + step(.65)) / 3;
      p.roll = shake + .05 * sag;
      p.pitch = .22 * sag;
      // The skull is jolted on each drop, snapping forward as the frame beneath it gives, then
      // lolling back into its slump.
      const jolt = a => Math.sin(Math.PI * clamp01((u - a) / .1));
      p.head = -.7 * smooth((u - .3) / .5) + .1 * (jolt(.25) + jolt(.45) + jolt(.65)) * (1 - smooth((u - .7) / .25));
      p.sy = 1 - .8 * sag;
      p.sx = 1 + .22 * sag;
      p.dy = -.02 * sag;
      // The extremities give out first: the arm drops limp with a dead twitch, the wrist lolls
      // after it, as if the hand had already stopped being a part of it.
      p.arm = .95 * smooth((u - .08) / .22) + .12 * Math.sin(u * 40) * smooth((u - .3) / .1) * (1 - smooth((u - .6) / .2));
      // The hand is not quite finished: one dead twitch of the fingers while the heap is already fading.
      p.wrist = .8 * smooth((u - .18) / .25) + .1 * Math.sin(Math.PI * clamp01((u - .66) / .1)) * Math.sin((u - .66) * 120);
      // Whatever it held slips: the weapon socket tips over with a late catch, a half-grip that
      // fails, before the frame has collapsed around it.
      p.socket = .9 * smooth((u - .2) / .3) - .12 * Math.sin(Math.PI * clamp01((u - .32) / .1));
      // Then the lower frame gives way piece by piece: the leg buckles with a jerk before the
      // robe's hem (tail) slumps after it, each coming apart on its own beat.
      p.leg = .7 * smooth((u - .22) / .2) + .06 * Math.sin(u * 60) * smooth((u - .4) / .1) * (1 - smooth((u - .6) / .2));
      p.tail = .6 * smooth((u - .4) / .3);
      // Midway through the collapse the whole frame creaks round a quarter-turn, as if it meant
      // to look at whoever did this, then jerks back before the dust takes it.
      p.spin = .4 * Math.sin(Math.PI * clamp01((u - .5) / .3)) ** 2;
      p.fade = 1 - smooth((u - .6) / .4);
      push(.03 * sag);
      break;
    }
    case 'splat': {
      // Bulge up on the blow, then slump flat and wide into a puddle that soaks away.
      const bulge = u < .2 ? smooth(u / .2) : 1 - smooth((u - .2) / .15);
      const flat = smooth((u - .2) / .4);
      p.sy = (1 + .25 * bulge) * (1 - .85 * flat);
      // the puddle quivers as it settles, a few shrinking ripples, before it soaks away
      const quiver = Math.sin((u - .4) * 55) * .05 * (1 - smooth((u - .4) / .3)) * smooth((u - .4) / .04);
      p.sx = (1 - .1 * bulge) * (1 + .7 * flat) * (1 + (u > .4 ? quiver : 0));
      // Any eye or head it had slides down the slump and is swallowed last.
      p.head = -.5 * flat;
      p.fade = 1 - smooth((u - .65) / .35);
      push(.08 * flat);
      break;
    }
    case 'dissipate': {
      // Spin faster and faster, swell, lift and thin out. It draws in on itself first, as if
      // sucking in a last breath, so the swell reads as a release.
      const s = smooth(u);
      p.spin = 9 * u * u;
      p.scale = 1 + .6 * s - .14 * Math.sin(Math.PI * clamp01(u / .15));
      p.sy = 1 - .25 * s;
      p.dy = .25 * s;
      p.fade = 1 - smooth((u - .15) / .85);
      // The head tips back in a long sigh as it thins, the wings spread slack and a trailing
      // end streams out behind it, each easing back to nothing before it is gone.
      p.head = -.4 * Math.sin(Math.PI * clamp01((u - .1) / .7));
      p.wing = .5 * Math.sin(Math.PI * clamp01((u - .05) / .8));
      p.tail = .35 * Math.sin(Math.PI * clamp01((u - .2) / .75));
      break;
    }
    case 'burst': {
      // Swell and pop: gone at the flash, a third of the way in.
      // It flinches in on itself first, a held breath, so the swell lands harder.
      const s = smooth(u / .33);
      p.scale = 1 + .55 * s - .1 * Math.sin(Math.PI * clamp01(u / .12));
      p.fade = u < .33 ? 1 : 0;
      // Before it goes it trembles, a fine fast shiver that tightens as the swell peaks.
      p.roll = .05 * Math.sin(u * 220) * smooth(u / .1) * (1 - smooth((u - .2) / .13));
      break;
    }
    case 'petrify': {
      // A sharp gasp: it jerks upright and back, draws itself in and flares its wings; a shiver
      // runs through it as the stone climbs, and it sets in what's left of the gasp. No fall,
      // no fade: the statue takes its place.
      const gasp = u < .12 ? smooth(u / .12) : 1 - .45 * smooth((u - .12) / .3), stone = smooth((u - .14) / .66);
      p.pitch = -.16 * gasp;
      p.dy = .035 * gasp;
      p.head = -.35 * gasp;
      p.wing = .55 * gasp;
      p.scale = 1 + .035 * gasp;
      p.roll = .022 * Math.sin(u * 140) * smooth(u / .1) * (1 - stone);
      p.stone = stone;
      push(-.04 * gasp);
      break;
    }
    default: {
      // Stagger, then topple sideways away from the blow and sink a little. The fall speeds up
      // as it goes over (the body is fastest as it lands), then rebounds a touch off the floor
      // and settles back.
      const s = smooth(u / .25), f = smooth((u - .15) / .75), drop = f * (.5 + .5 * f);
      const rebound = .07 * Math.sin(Math.PI * clamp01((u - .9) / .1));
      push(.06 * s + .12 * f);
      p.pitch = -.2 * s * (1 - f);
      p.roll = 1.45 * drop - rebound;
      p.dy = -.12 * f;
      // The skull knocks the floor on landing and lolls back, once.
      p.head = -.4 * f + .12 * Math.sin(Math.PI * clamp01((u - .88) / .1));
      p.scale = 1 - .12 * f;
      // A last dead twitch of the limb, after it has landed, then still.
      p.arm = .25 * Math.sin(Math.PI * clamp01((u - .8) / .15)) * Math.sin((u - .8) * 90);
      // Then, when it seems finished, one leg kicks out alone, a dead reflex, and drops back.
      // Whatever it held skips out of the slack grip as it lands, and lies still.
      const skip = clamp01((u - .55) / .25);
      p.socket = .3 * (4 * skip * (1 - skip)) ** 2;
      p.leg = .35 * (4 * clamp01((u - .86) / .08) * (1 - clamp01((u - .86) / .08))) ** 2;
      // A tail goes slack as it falls and gives one lazy flick after it has landed, as if the
      // owner were not quite informed.
      p.tail = .3 * f + .12 * Math.sin(Math.PI * clamp01((u - .9) / .08)) * Math.sin((u - .9) * 140);
    }
  }
  return p;
}

// When (u) each style throws off its particles.
export const DEATH_BURST_U = {topple: .8, crumble: .55, lichdust: .5, splat: .25, dissipate: .2, burst: .33, petrify: .62};

// A lich also sheds a small puff of dust at each of its three jolts (see 'lichdust' above), before
// the main cloud: it comes apart piece by piece, not in one puff.
export const DEATH_SHED_U = {lichdust: [.27, .47, .67]};

// Particle looks. Splats take the creature's own colour when one is given.
const LOOKS = {
  topple: {count: 10, speed: .5, up: .5, life: .6, gravity: 1.5, drag: 4, color: [.42, .38, .32], spread: 'ring', size: .04},
  crumble: {count: 44, speed: .35, up: .2, life: 1.1, gravity: 1.2, drag: 2.5, color: [.62, .58, .5], spread: 'column', size: .035},
  lichdust: {count: 70, speed: .3, up: .3, life: 1.6, gravity: .5, drag: 2, color: [.5, .49, .47], spread: 'column', size: .04},
  // Flakes shaken loose at one jolt of a lich's collapse: few, slow, falling straight down.
  lichshed: {count: 16, speed: .15, up: .1, life: 1, gravity: .9, drag: 2.5, color: [.5, .49, .47], spread: 'column', size: .035},
  splat: {count: 34, speed: 1.3, up: 1.1, life: .9, gravity: 5, drag: 1.2, color: [.55, .75, .25], spread: 'ring', size: .05},
  dissipate: {count: 40, speed: .45, up: .6, life: 1.3, gravity: -.25, drag: 1.5, color: [.75, .78, .82], spread: 'swirl', size: .07},
  // Grit shed as the stone sets, sifting down the body.
  petrify: {count: 20, speed: .12, up: .05, life: .9, gravity: 1.6, drag: 3, color: [.56, .56, .53], spread: 'column', size: .03},
  burst: {count: 36, speed: 2.4, up: .4, life: .45, gravity: 0, drag: 3.5, color: [1, .92, .6], spread: 'sphere', size: .05},
  // A corpse getting back up (rise.js): grave dust kicked off the floor, and pale sickly
  // motes curling up round it.
  rise: {count: 22, speed: .7, up: .35, life: .8, gravity: 1.4, drag: 3.5, color: [.46, .42, .36], spread: 'ring', size: .045},
  riseMotes: {count: 26, speed: .3, up: .8, life: 1.4, gravity: -.35, drag: 1.8, color: [.55, .78, .45], spread: 'swirl', size: .04},
};

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

// Pooled particles for deaths. burst(style, at, {dir, color, height}) at the actor's feet
// (`height` is the creature's height, so dust and mist come off its whole body);
// update(dt) each frame. Normal blending, not additive, so dust still reads on light floors.
export function createDeathBurst(THREE, max = 256, seed = 23) {
  const pos = new Float32Array(max * 3).fill(-999), vel = new Float32Array(max * 3);
  const col = new Float32Array(max * 3), base = new Float32Array(max * 3), life = new Float32Array(max);
  const meta = new Array(max);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({size: .055, vertexColors: true, depthWrite: false, sizeAttenuation: true,
    transparent: true, opacity: .9});
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData.part = 'death-burst';
  const rand = rng(seed);
  let next = 0, alive = 0;
  function burst(style, at, {dir = null, color = null, height = .6} = {}) {
    const look = LOOKS[style] ?? LOOKS.topple;
    const d = unit(dir);
    const tint = style === 'splat' && Array.isArray(color) ? color : look.color;
    const h = Number.isFinite(height) && height > 0 ? Math.min(height, 2.5) : .6;
    for (let j = 0; j < look.count; j++) {
      const i = next; next = (next + 1) % max;
      if (life[i] <= 0) alive++;
      const i3 = i * 3, a = rand() * Math.PI * 2, sp = look.speed * (.4 + rand() * .8);
      let vx = Math.cos(a) * sp, vz = Math.sin(a) * sp, vy = look.up * (.3 + rand() * .9);
      let y = .05;
      if (look.spread === 'column') y = rand() * h;
      else if (look.spread === 'swirl') { y = rand() * h; vx = -Math.sin(a) * sp; vz = Math.cos(a) * sp; }
      else if (look.spread === 'sphere') { y = h * .5; vy = (rand() * 2 - 1) * sp; }
      // Splashes lean away from the killing blow.
      if (d && style !== 'dissipate') { vx += d[0] * look.speed * .5; vz += d[1] * look.speed * .5; }
      const r = look.spread === 'ring' ? .05 : .12 * rand();
      pos[i3] = at.x + Math.cos(a) * r; pos[i3 + 1] = at.y + y; pos[i3 + 2] = at.z + Math.sin(a) * r;
      vel[i3] = vx; vel[i3 + 1] = vy; vel[i3 + 2] = vz;
      life[i] = look.life * (.7 + rand() * .5);
      meta[i] = look;
      const shade = .8 + rand() * .3;
      for (let c = 0; c < 3; c++) col[i3 + c] = base[i3 + c] = Math.min(1, tint[c] * shade);
    }
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
    return look.count;
  }
  function update(dt) {
    if (!alive || !(dt > 0)) return alive;
    dt = Math.min(dt, .1);
    for (let i = 0; i < max; i++) {
      if (life[i] <= 0) continue;
      const look = meta[i], i3 = i * 3;
      life[i] -= dt;
      if (life[i] <= 0) { pos[i3] = pos[i3 + 1] = pos[i3 + 2] = -999; alive--; continue; }
      const k = Math.exp(-look.drag * dt);
      vel[i3] *= k; vel[i3 + 2] *= k; vel[i3 + 1] = vel[i3 + 1] * k - look.gravity * dt;
      pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt;
      if (pos[i3 + 1] < .01) { pos[i3 + 1] = .01; vel[i3] *= .4; vel[i3 + 2] *= .4; vel[i3 + 1] = 0; }
      // Darken toward nothing over the last 40% of life.
      const f = Math.min(1, life[i] / (look.life * .4));
      for (let c = 0; c < 3; c++) col[i3 + c] = base[i3 + c] * f;
    }
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
    return alive;
  }
  return {points, burst, update, get alive() { return alive; },
    dispose() { geo.dispose(); mat.dispose(); }};
}

// What a death burst needs from the actor: its body colour (first plain mesh under the body,
// else the whole model; outlines and rings are skipped) and its height (from stageCreature).
export function deathLook(actor) {
  let color = null;
  const pick = o => {
    if (color || !o.isMesh || o.userData.outline || o.userData.ring || Array.isArray(o.material)) return;
    const c = o.material?.color;
    if (c && Number.isFinite(c.r)) color = [c.r, c.g, c.b];
  };
  actor?.body?.traverse?.(pick);
  if (!color) actor?.g?.traverse?.(pick);
  const h = actor?.g?.userData?.height;
  return {color, height: Number.isFinite(h) && h > 0 ? h : .6};
}

// Fades an actor's meshes to `f` (1 = as built). Materials are cloned per actor the first time
// so a fading jelly never fades every other jelly that shares its material. restoreFade puts
// the shared materials back (life saving).
export function applyFade(actor, f) {
  const g = actor?.g;
  if (!g) return;
  f = clamp01(f);
  if (f >= 1 && !actor.fadeSaved) return;
  if (!actor.fadeSaved) {
    actor.fadeSaved = [];
    g.traverse(o => {
      if (!o.isMesh || !o.material || Array.isArray(o.material) || o.userData.keepOpaque) return;
      const m = o.material.clone();
      actor.fadeSaved.push({o, mat: o.material, opacity: m.opacity ?? 1, visible: o.visible});
      m.transparent = true;
      o.material = m;
    });
  }
  for (const s of actor.fadeSaved) {
    s.o.material.opacity = s.opacity * f;
    s.o.visible = s.visible && f > .01;
  }
}

// The disposition ring under a monster is a marker, not part of the body: the moment it dies the
// ring vanishes instead of toppling over with the corpse. restoreFade brings it back.
export function hideDeathRing(actor) {
  const g = actor?.g;
  if (!g || actor.ringHidden) return;
  actor.ringHidden = [];
  g.traverse(o => {
    if (!o.userData?.ring) return;
    actor.ringHidden.push({o, visible: o.visible});
    o.visible = false;
  });
}

export function restoreFade(actor) {
  if (actor?.ringHidden) {
    for (const s of actor.ringHidden) s.o.visible = s.visible;
    actor.ringHidden = null;
  }
  if (!actor?.fadeSaved) return;
  for (const s of actor.fadeSaved) { s.o.material.dispose(); s.o.material = s.mat; s.o.visible = s.visible; }
  actor.fadeSaved = null;
}
