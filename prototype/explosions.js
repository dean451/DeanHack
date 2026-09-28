// Explosions (motion queue item 12). NetHack's explode() (scroll of fire, a broken wand,
// gas spores, exploding lights, fireball spells) draws a 3×3 block of explosion glyphs
// with tmp_at() for a couple of delay ticks; the bridge's fx stream records them with
// their type and which of the nine parts each cell is. Here each one becomes a set-piece:
// a fireball that swells over the block and burns out, a shockwave ring along the floor,
// embers (or frost motes, spray, mud, sparkles) thrown out and falling, a smoke or haze
// puff that rises after, and a light flash for the caller.
//
// explosionBursts() and explosionFrame() are pure, so they can be tested without a
// renderer; createExplosions() draws them with small pools of meshes and one point cloud.

// A burst plays for this long after its first cell was drawn (ms), whatever NetHack's own
// delay was, so it reads as one blast.
export const BURST_MS = 900;
export const EMBERS_PER_BURST = 28;
// The fireball's centre height and its full radius (tiles): it covers the 3×3 block.
export const BALL_Y = .45;
export const BALL_R = 1.35;
// The shockwave ring's outer radius when it has finished spreading.
export const RING_R = 1.9;

// core: the hot centre early on; color: the ball as it burns; ember: the thrown bits;
// smoke: a puff that rises after (null for none); light: flash colour and strength 0..1.
// dark (a "dark" explosion, e.g. a black light) draws the ball as a shadow, not a glow.
export const EXPLOSION_LOOKS = {
  fiery: {core: 0xfff2c0, color: 0xff6a14, ember: 0xffa040, smoke: 0x2a2420, light: 0xffa050, flash: 1, gravity: 8},
  frosty: {core: 0xffffff, color: 0x8fdcff, ember: 0xe0f8ff, smoke: 0xcfe8f0, light: 0xb8e8ff, flash: .7, gravity: .8},
  magical: {core: 0xfff0ff, color: 0xc060ff, ember: 0xffd8ff, smoke: null, light: 0xd890ff, flash: .8, gravity: -.4},
  wet: {core: 0xe8f6ff, color: 0x4aa0f0, ember: 0xcfe8ff, smoke: 0x9ccbe8, light: 0x80c0ff, flash: .3, gravity: 7},
  muddy: {core: 0xc8a060, color: 0x7a5a24, ember: 0x5a4020, smoke: 0x4a3a20, light: 0xa08040, flash: .2, gravity: 8},
  noxious: {core: 0xe0ff90, color: 0x6ab82a, ember: 0xa6e05a, smoke: 0x5a8a20, light: 0x90e050, flash: .35, gravity: -.2},
  dark: {core: 0x100418, color: 0x2a0c3a, ember: 0x6a3a86, smoke: 0x0a0610, light: 0x000000, flash: 0, gravity: .5, dark: true},
};

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
// Deterministic 0..1 noise, so embers replay the same way.
const hash = (a, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const mixHex = (a, b, k) => {
  const ch = (h, s) => (h >> s) & 255;
  const m = s => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * k);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};

export function explosionLook(effect) {
  return effect?.kind === 'explosion' ? EXPLOSION_LOOKS[effect.explosion] ?? null : null;
}

// The explosions in a timeline: {x, z, t, type, seed}, one per sequence, centred on the
// middle of the 3×3 block even when only some of its cells were in view. Part p (0..8) is
// NetHack's S_explode1..9, top-left to bottom-right, so it sits at (p%3-1, p/3-1) from
// the centre. t is when its first cell was drawn, in the timeline's ms.
export function explosionBursts(timeline) {
  const bySeq = new Map();
  for (const s of timeline?.sprites ?? []) {
    const e = s.effect;
    if (!explosionLook(e) || !Number.isFinite(s.x) || !Number.isFinite(s.z)) continue;
    const p = Number.isInteger(e.part) && e.part >= 0 && e.part < 9 ? e.part : 4;
    const cx = s.x - (p % 3 - 1), cz = s.z - (Math.floor(p / 3) - 1);
    const had = bySeq.get(s.seq);
    if (!had) bySeq.set(s.seq, {x: cx, z: cz, t: s.from, type: e.explosion, seed: hash(cx, cz, s.seq + 3)});
    else had.t = Math.min(had.t, s.from);
  }
  return [...bySeq.values()].sort((a, b) => a.t - b.t);
}

// What a burst looks like `age` ms after it started, relative to its centre, or null once
// it's over. {ball, ring, smoke, embers:[{x,y,z,size,alpha}], light, look}.
// ball/smoke: {y, r, alpha, color}; ring: {r, alpha, color}; light: 0..1.
export function explosionFrame(burst, age) {
  const look = EXPLOSION_LOOKS[burst?.type];
  if (!look || !(age >= 0) || age >= BURST_MS) return null;
  const k = age / BURST_MS;
  // The ball swells fast (ease-out over the first 22%), then burns down and shrinks a bit.
  const swell = 1 - (1 - clamp01(k / .22)) ** 3;
  const burn = clamp01((k - .22) / .6);
  const ball = {
    y: BALL_Y + .15 * burn,
    r: BALL_R * (.12 + .88 * swell) * (1 - .25 * burn),
    alpha: clamp01(k / .04) * (1 - burn) ** 1.5 * (look.dark ? .8 : .9),
    color: mixHex(look.core, look.color, clamp01(k / .3)),
  };
  // The ring runs out along the floor ahead of the ball and thins as it goes.
  const rk = clamp01(k / .5);
  const ring = {r: RING_R * (1 - (1 - rk) ** 2), alpha: rk >= 1 ? 0 : .8 * (1 - rk) ** 1.5, color: look.core};
  // Smoke gathers as the ball burns down, then rises and thins.
  const sk = clamp01((k - .3) / .7);
  const smoke = look.smoke == null ? null : {
    y: BALL_Y + .2 + 1.1 * sk, r: BALL_R * (.5 + .5 * sk),
    alpha: .5 * Math.sin(Math.PI * sk) * (look.dark ? 1.2 : 1), color: look.smoke,
  };
  // Embers fly out on a hash-picked heading and speed, fall under the look's gravity, and
  // settle on the floor (y ≥ 0) while fading.
  const embers = [];
  const ts = age / 1000;
  for (let i = 0; i < EMBERS_PER_BURST; i++) {
    const h1 = hash(burst.seed * 97, i), h2 = hash(i, burst.seed * 53), h3 = hash(burst.seed * 11, i, 7);
    const yaw = h1 * Math.PI * 2, speed = 1.2 + 2.2 * h2, up = .6 + 1.8 * h3;
    const life = .45 + .55 * h2;
    const lk = clamp01(k / life);
    if (lk >= 1) continue;
    // Drag slows them so they stay near the blast: travel = speed * (1 - e^-3t) / 3.
    const travel = speed * (1 - Math.exp(-3 * ts)) / 3;
    const y = Math.max(0, BALL_Y + up * ts - .5 * look.gravity * ts * ts);
    embers.push({x: Math.cos(yaw) * travel, y, z: Math.sin(yaw) * travel,
      size: .04 + .05 * h3, alpha: (1 - lk) * (lk < .05 ? lk / .05 : 1)});
  }
  const light = look.flash * clamp01(age / 40) * (1 - clamp01((age - 40) / 520)) ** 2;
  return {ball, ring, smoke, embers, light, look};
}

const MAX_BURSTS = 6;
const MAX_EMBERS = MAX_BURSTS * EMBERS_PER_BURST;

// Draws explosions. add(timeline) queues a timeline's bursts to start now (at their own
// offsets); update(dt, origin) advances them and returns {count, light, color, x, z}:
// the strongest flash (0..1), its colour and its world position, for the caller to put a
// light there if it wants one.
export function createExplosions(THREE, parent) {
  const ballGeo = new THREE.SphereGeometry(1, 20, 14);
  const ringGeo = new THREE.RingGeometry(.82, 1, 40, 1).rotateX(-Math.PI / 2);
  const pool = (geo, make) => Array.from({length: MAX_BURSTS}, () => {
    const mesh = new THREE.Mesh(geo, make());
    mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.userData.part = 'explosion';
    parent.add(mesh);
    return mesh;
  });
  const glow = () => new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide});
  const shade = () => new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, toneMapped: false});
  // Separate pools for glowing and dark balls, so no material ever switches blending.
  const balls = pool(ballGeo, glow), darkBalls = pool(ballGeo, shade), smokes = pool(ballGeo, shade), rings = pool(ringGeo, glow);
  const emberPos = new Float32Array(MAX_EMBERS * 3), emberCol = new Float32Array(MAX_EMBERS * 3);
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  emberGeo.setAttribute('color', new THREE.BufferAttribute(emberCol, 3));
  emberGeo.setDrawRange(0, 0);
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({size: .09, vertexColors: true, transparent: true,
    depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, sizeAttenuation: true}));
  embers.frustumCulled = false; embers.renderOrder = 2; embers.userData.part = 'explosion-embers';
  parent.add(embers);

  const bursts = [];
  let now = 0;
  const c = new THREE.Color();

  function add(timeline) {
    const found = explosionBursts(timeline);
    for (const b of found) bursts.push({...b, t: now + b.t});
    if (bursts.length > MAX_BURSTS) bursts.splice(0, bursts.length - MAX_BURSTS);
    return found.length;
  }

  function update(dt, origin) {
    now += (dt || 0) * 1000;
    const ox = origin?.x ?? 0, oz = origin?.z ?? 0;
    for (let i = bursts.length - 1; i >= 0; i--) if (now - bursts[i].t >= BURST_MS) bursts.splice(i, 1);
    for (const m of [...balls, ...darkBalls, ...smokes, ...rings]) m.visible = false;
    let e = 0, count = 0, best = {light: 0, color: 0, x: 0, z: 0};
    bursts.forEach((b, i) => {
      const f = explosionFrame(b, now - b.t);
      if (!f) return;
      count++;
      const bx = b.x - ox, bz = b.z - oz;
      const ball = (f.look.dark ? darkBalls : balls)[i];
      ball.visible = f.ball.alpha > .002;
      ball.position.set(bx, f.ball.y, bz); ball.scale.setScalar(f.ball.r);
      ball.material.color.setHex(f.ball.color); ball.material.opacity = f.ball.alpha;
      const ring = rings[i];
      ring.visible = f.ring.alpha > .002;
      ring.position.set(bx, .02, bz); ring.scale.set(f.ring.r, 1, f.ring.r);
      ring.material.color.setHex(f.ring.color); ring.material.opacity = f.ring.alpha;
      if (f.smoke) {
        const s = smokes[i];
        s.visible = f.smoke.alpha > .002;
        s.position.set(bx, f.smoke.y, bz); s.scale.set(f.smoke.r, f.smoke.r * .6, f.smoke.r);
        s.material.color.setHex(f.smoke.color); s.material.opacity = clamp01(f.smoke.alpha);
      }
      // Additive points: fade by scaling the colour down.
      c.setHex(f.look.ember);
      for (const p of f.embers) {
        if (e >= MAX_EMBERS) break;
        emberPos.set([bx + p.x, p.y, bz + p.z], e * 3);
        emberCol.set([c.r * p.alpha, c.g * p.alpha, c.b * p.alpha], e * 3);
        e++;
      }
      if (f.light > best.light) best = {light: f.light, color: f.look.light, x: b.x, z: b.z};
    });
    emberGeo.setDrawRange(0, e);
    emberGeo.attributes.position.needsUpdate = true;
    emberGeo.attributes.color.needsUpdate = true;
    return {count, embers: e, ...best};
  }

  const clear = () => { bursts.length = 0; update(0); };
  const dispose = () => {
    for (const m of [...balls, ...darkBalls, ...smokes, ...rings]) { parent.remove(m); m.material.dispose(); }
    parent.remove(embers); emberGeo.dispose(); embers.material.dispose(); ballGeo.dispose(); ringGeo.dispose();
  };
  return {add, update, clear, dispose, get active() { return bursts.length; }};
}
