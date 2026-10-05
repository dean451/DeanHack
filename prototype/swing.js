// Hero weapon swings (motion queue item 4). Replaces poseMelee()'s single up-and-down wave with
// a windup, a strike through the target and a follow-through, shaped by the bridge's blow type
// (combat event `weapon.blow`): slash is a diagonal arc across the body, pierce a straight
// thrust, blunt an overhead chop. A hit freezes briefly at contact (hitstop); a miss whiffs
// past with a longer follow-through. Also a fading weapon trail and impact particles chosen by
// what was struck.
//
// Poses are offsets on the hero rig from main.js (arm, elbow, wrist, weaponSocket, shieldArm,
// body), applied and taken back off like actions.js does, so they layer on the walk cycle.

export const SWING_TIME = .5;
export const HITSTOP = .07;
// Normalised time the blade reaches the target, per blow.
export const CONTACT_U = {slash: .46, pierce: .42, blunt: .5};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const FIELDS = ['arm', 'armZ', 'elbow', 'wrist', 'socket', 'shield', 'twist', 'lean', 'offArm', 'offElbow'];
const REST = Object.fromEntries(FIELDS.map(f => [f, 0]));

// Keyframes: [u, offsets]. Rest at both ends. arm = shoulder pitch (negative raises forward),
// armZ = shoulder roll (positive swings out to the sword side), elbow is added to the rest
// bend (-.65, positive straightens), twist turns the torso (positive draws the sword
// shoulder back), lean pitches the torso forward.
const KEYS = {
  slash: [
    [0, REST],
    [.3, {arm: -2.35, armZ: .75, elbow: -.25, wrist: -.3, socket: .35, shield: .2, twist: .38, lean: -.06}],
    [.46, {arm: -1.35, armZ: -.05, elbow: .45, wrist: .2, socket: -.7, shield: .05, twist: -.05, lean: .08}],
    [.68, {arm: -.55, armZ: -.75, elbow: .3, wrist: .4, socket: -1.2, shield: -.1, twist: -.42, lean: .12}],
    [1, REST],
  ],
  pierce: [
    [0, REST],
    [.28, {arm: .3, armZ: .12, elbow: -.55, wrist: -.25, socket: -.35, shield: .15, twist: .3, lean: -.05}],
    [.42, {arm: -1.55, armZ: -.1, elbow: .62, wrist: -.35, socket: -.55, shield: -.05, twist: -.28, lean: .16}],
    [.6, {arm: -1.45, armZ: -.08, elbow: .55, wrist: -.3, socket: -.5, shield: -.05, twist: -.24, lean: .13}],
    [1, REST],
  ],
  blunt: [
    [0, REST],
    [.34, {arm: -2.85, armZ: .2, elbow: -.4, wrist: -.45, socket: .5, shield: .25, twist: .15, lean: -.14}],
    [.5, {arm: -1.1, armZ: -.05, elbow: .4, wrist: .35, socket: -1.1, shield: .05, twist: -.1, lean: .2}],
    [.66, {arm: -.4, armZ: -.1, elbow: .3, wrist: .4, socket: -1.3, shield: 0, twist: -.16, lean: .18}],
    [1, REST],
  ],
};

export function blowOf(blow) {
  return blow === 'pierce' || blow === 'blunt' ? blow : 'slash';
}

// Offsets at normalised time u. A miss carries on further past where the target would be.
export function swingPose(blow, u, result = 'hit') {
  const keys = KEYS[blowOf(blow)];
  u = clamp01(Number.isFinite(u) ? u : 1);
  let i = 0;
  while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
  const [u0, a] = keys[i], [u1, b] = keys[i + 1];
  const contact = CONTACT_U[blowOf(blow)];
  // The blade is fastest at contact: the strike eases in to it and the follow-through eases out
  // of it, rather than slowing to a stop at the contact key the way the other joins do.
  const raw = clamp01((u - u0) / (u1 - u0));
  const k = u1 === contact ? raw * raw : u0 === contact ? raw * (2 - raw) : smooth(raw);
  const whiff = result === 'hit' ? 1 : 1 + .3 * smooth((u - contact) / .12) * (1 - smooth((u - .8) / .2));
  const p = {};
  for (const f of FIELDS) p[f] = ((a[f] ?? 0) + ((b[f] ?? 0) - (a[f] ?? 0)) * k) * (u > contact ? whiff : 1);
  // A whiff overbalances the hero: the torso pitches on after the blade and lurches, then
  // hauls itself back upright. Zero at the end of the swing, so it still returns to rest.
  if (result !== 'hit' && u > contact) {
    const w = clamp01((u - contact) / (1 - contact));
    const lurch = Math.sin(Math.PI * w) * (1 - w);
    p.lean += .16 * lurch;
    p.twist -= .1 * lurch;
  }
  return p;
}

// Two-weapon fighting: strikes alternate, right hand then left. On the off-hand's turn the
// sword arm only half-commits (a guard) and the off arm drives forward through the blow, peaking
// at contact; on the sword hand's turn the off arm just draws back a little, ready. Both are
// zero at the ends, so the swing still returns to rest.
export const DUAL_GUARD = .55;
export function dualSwingPose(blow, u, result = 'hit', offLead = false) {
  const p = swingPose(blow, u, result);
  const c = CONTACT_U[blowOf(blow)];
  u = clamp01(Number.isFinite(u) ? u : 1);
  const env = u < c ? smooth(u / c) : 1 - smooth((u - c) / (1 - c));
  if (offLead) {
    for (const f of ['arm', 'armZ', 'elbow', 'wrist', 'socket', 'twist']) p[f] *= DUAL_GUARD;
    // The off hand cocks back a little before it drives through (anticipation), settling
    // to zero by a third of the way to contact.
    const cock = Math.sin(Math.PI * clamp01(u / (c * .6)));
    p.offArm = -1.15 * env + .3 * cock; p.offElbow = .55 * env - .25 * cock;
  } else {
    p.offArm = .3 * env; p.offElbow = -.2 * env;
  }
  return p;
}

// Seconds of a swing, including the hitstop on a hit.
export function swingLength(result) {
  return SWING_TIME + (result === 'hit' ? HITSTOP : 0);
}

// Normalised pose time for `t` seconds into a swing. A hit holds at contact for HITSTOP.
export function swingPhase(t, blow, result = 'hit') {
  if (!Number.isFinite(t) || t <= 0) return 0;
  const tc = CONTACT_U[blowOf(blow)] * SWING_TIME;
  if (result === 'hit') {
    if (t >= tc && t < tc + HITSTOP) return tc / SWING_TIME;
    if (t >= tc + HITSTOP) t -= HITSTOP;
  }
  return clamp01(t / SWING_TIME);
}

// Whether the blade is in its fast part, where the trail should be drawn.
export function swingTrailOn(blow, u) {
  const c = CONTACT_U[blowOf(blow)];
  return u > c - .14 && u < c + .2;
}

export function applySwing(actor, p) {
  if (!actor || !p) return;
  if (actor.arm) { actor.arm.rotation.x += p.arm; actor.arm.rotation.z += p.armZ; }
  if (actor.elbow) actor.elbow.rotation.x += p.elbow;
  if (actor.wrist) actor.wrist.rotation.x += p.wrist;
  if (actor.weaponSocket) actor.weaponSocket.rotation.z += p.socket;
  if (actor.shieldArm) actor.shieldArm.rotation.z += p.shield;
  if (actor.shieldArm && p.offArm) actor.shieldArm.rotation.x += p.offArm;
  if (actor.shieldElbow && p.offElbow) actor.shieldElbow.rotation.x += p.offElbow;
  if (actor.body) { actor.body.rotation.y += p.twist; actor.body.rotation.x += p.lean; }
}

export function clearSwing(actor, p) {
  if (!p) return;
  const neg = {};
  for (const f of FIELDS) neg[f] = -p[f];
  applySwing(actor, neg);
}

// What a blow strikes, from the defender's (seen) name. Only the visible species decides this;
// an unnamed (hallucinated or unseen) target bleeds like flesh.
const MATERIAL = [
  [/\b(iron|clay|stone|glass|gold|wood|paper|rope|leather|straw|flesh) golem\b/, m => ({iron: 'metal', gold: 'metal', glass: 'metal',
    stone: 'stone', clay: 'stone', wood: 'dust', paper: 'dust', straw: 'dust', rope: 'dust', leather: 'dust', flesh: 'flesh'})[m[1]]],
  [/\b(skeleton|lich|mummy|zombie|ghoul|bone)\b/, 'bone'],
  [/\b(jelly|pudding|ooze|slime|blob|mold|lichen|fungus|brown mold|green mold)\b/, 'ooze'],
  [/\b(earth elemental|xorn|gargoyle|rock mole)\b/, 'stone'],
  [/\b(ghost|shade|wraith|spectre|vortex|light|elemental|will o' the wisp|fog cloud)\b/, 'mist'],
];
export function impactKind(name) {
  const n = typeof name === 'string' ? name.toLowerCase() : '';
  for (const [re, kind] of MATERIAL) {
    const m = n.match(re);
    if (m) return typeof kind === 'function' ? kind(m) : kind;
  }
  return 'flesh';
}

// Particle looks: colour, count, launch speed, gravity, drag (per second), life (s).
export const IMPACTS = {
  metal: {color: [1, .82, .4], count: 16, speed: 3.2, gravity: 6, drag: 2.5, life: .32},
  flesh: {color: [.5, .03, .03], count: 12, speed: 1.9, gravity: 9, drag: 1.2, life: .5},
  bone: {color: [.82, .77, .64], count: 12, speed: 1.2, gravity: 3, drag: 3, life: .6},
  stone: {color: [.52, .5, .46], count: 12, speed: 1.8, gravity: 9, drag: 1.5, life: .45},
  ooze: {color: [.36, .62, .16], count: 10, speed: 1.4, gravity: 8, drag: 1, life: .55},
  mist: {color: [.72, .8, 1], count: 10, speed: .8, gravity: -.5, drag: 2.5, life: .6},
  dust: {color: [.66, .56, .38], count: 10, speed: 1.1, gravity: 2, drag: 3.5, life: .55},
};

// Deterministic tiny PRNG so bursts are testable.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

// A pooled Points cloud of impact particles. burst() at the contact point, update(dt) each
// frame; dead particles park far below the floor.
export function createImpactBurst(THREE, max = 96, seed = 1) {
  const pos = new Float32Array(max * 3).fill(-999), col = new Float32Array(max * 3);
  const vel = new Float32Array(max * 3), life = new Float32Array(max), meta = new Array(max).fill(null);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({size: .045, vertexColors: true, depthWrite: false, sizeAttenuation: true});
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData.part = 'impact';
  const rand = rng(seed);
  let next = 0, alive = 0;
  function burst(at, dir, kind = 'flesh', blow = 'slash') {
    const look = IMPACTS[kind] ?? IMPACTS.flesh;
    const d = Array.isArray(dir) ? dir : [0, 0], len = Math.hypot(d[0], d[1]) || 1;
    const dx = d[0] / len, dz = d[1] / len;
    const n = Math.round(look.count * (blow === 'pierce' ? .7 : blow === 'blunt' ? .85 : 1));
    for (let j = 0; j < n; j++) {
      const i = next; next = (next + 1) % max;
      if (life[i] <= 0) alive++;
      // Spray mostly onward along the blow, fanned out and upward.
      const spread = (rand() - .5) * (blow === 'pierce' ? .9 : 1.8), sp = look.speed * (.5 + rand() * .7);
      const ca = Math.cos(spread), sa = Math.sin(spread);
      vel[i * 3] = (dx * ca - dz * sa) * sp;
      vel[i * 3 + 1] = (.35 + rand() * .9) * sp * .6;
      vel[i * 3 + 2] = (dz * ca + dx * sa) * sp;
      pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z;
      life[i] = look.life * (.7 + rand() * .5);
      meta[i] = look;
      const shade = .8 + rand() * .3;
      col[i * 3] = look.color[0] * shade; col[i * 3 + 1] = look.color[1] * shade; col[i * 3 + 2] = look.color[2] * shade;
    }
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
    return n;
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
      // Settle on the floor rather than falling through it.
      if (pos[i3 + 1] < .01) { pos[i3 + 1] = .01; vel[i3] *= .5; vel[i3 + 2] *= .5; vel[i3 + 1] = 0; }
      // Fade toward the floor colour over the last third of life.
      const f = Math.min(1, life[i] / (look.life * .35));
      for (let c = 0; c < 3; c++) col[i3 + c] = Math.min(col[i3 + c], look.color[c] * (.25 + .85 * f));
    }
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
    return alive;
  }
  return {points, burst, update, get alive() { return alive; },
    dispose() { geo.dispose(); mat.dispose(); }};
}

// A fading ribbon behind the blade: sample(base, tip) each frame while the swing is fast,
// update(dt) always. Additive, so colours fading to black fade the ribbon out.
export function createSwingTrail(THREE, segments = 12, life = .14) {
  const pos = new Float32Array(segments * 2 * 3), col = new Float32Array(segments * 2 * 3);
  const idx = [];
  for (let i = 0; i < segments - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.userData.part = 'swing-trail';
  const hist = []; // newest first: {bx,by,bz,tx,ty,tz,age}
  let tint = [.85, .9, 1];
  function write() {
    const n = Math.min(hist.length, segments);
    for (let i = 0; i < segments; i++) {
      const h = hist[Math.min(i, n - 1)];
      const o = i * 6;
      if (!h) { pos.fill(0, o, o + 6); col.fill(0, o, o + 6); continue; }
      pos[o] = h.bx; pos[o + 1] = h.by; pos[o + 2] = h.bz; pos[o + 3] = h.tx; pos[o + 4] = h.ty; pos[o + 5] = h.tz;
      // Brightest at the tip and the newest sample; the base edge stays faint.
      const f = i < n ? Math.max(0, 1 - h.age / life) * (1 - i / segments) : 0;
      for (let c = 0; c < 3; c++) { col[o + c] = tint[c] * f * .15; col[o + 3 + c] = tint[c] * f * .75; }
    }
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
    mesh.visible = n >= 2;
  }
  function sample(base, tip) {
    hist.unshift({bx: base.x, by: base.y, bz: base.z, tx: tip.x, ty: tip.y, tz: tip.z, age: 0});
    if (hist.length > segments) hist.length = segments;
    write();
  }
  function update(dt) {
    if (!hist.length) return 0;
    for (const h of hist) h.age += Math.max(0, dt);
    while (hist.length && hist[hist.length - 1].age >= life) hist.pop();
    write();
    return hist.length;
  }
  return {mesh, sample, update, setTint(rgb) { tint = rgb; }, get samples() { return hist.length; },
    dispose() { geo.dispose(); mat.dispose(); }};
}
