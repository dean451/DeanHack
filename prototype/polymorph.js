// Polymorph bursts (motion queue item 15, part 1). A monster or the hero changing form only
// reaches the client as message text ("The newt turns into a jackal!", "You turn into a
// vampire!") and a frame where a different creature stands on the tile, so this module plays
// a transformation over the swap:
// - gather: iridescent motes spiral in and up around the creature while it squeezes thin;
// - flash: a bright pulse and a shockwave ring on the floor as the new form pops in;
// - settle: the motes scatter outwards and fade while the new form wobbles back to rest.
//
// polyMessage(), resolveBursts() and burstFrame() are pure, so they can be tested without a
// renderer; createPolymorph() draws the bursts with one point cloud and two instanced meshes,
// and reports a squash/stretch pose per tile that the actor code can apply to the model.

export const BURST_MS = 1100;
// Phase boundaries as fractions of BURST_MS.
const GATHER = .38, FLASH = .5;
export const MAX_BURSTS = 6;
const MOTES = 36;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hash = (a, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const easeOut = k => 1 - (1 - k) ** 3;

// Monster name from a message, lower case with its article dropped.
const nameOf = s => typeof s === 'string'
  ? s.trim().replace(/^(?:the|an?|your)\s+/i, '').toLowerCase() : null;

// One message line as {who: 'hero'|'monster', from, to}, or null. mon.c newcham() says
// "Oldmon turns into a newmon!", mhitm.c "It turns into a newmon." and polyself.c "You turn
// into a …!", "You feel like a new …!" (same form again) or "You return to human form!".
export function polyMessage(text) {
  if (typeof text !== 'string') return null;
  let m = /^You (?:turn into an?|feel like a new) (.+)!$/.exec(text);
  if (m) return {who: 'hero', from: null, to: nameOf(m[1])};
  m = /^You return to (.+) form!$/.exec(text);
  if (m) return {who: 'hero', from: null, to: null};
  m = /^(.+?) turns into (?:an?|the) (.+?)[.!]$/.exec(text);
  // "Your mind turns into a pretzel!" (sit.c) isn't a creature.
  if (m && !/^Your mind$/.test(m[1])) return {who: 'monster', from: nameOf(m[1]), to: nameOf(m[2])};
  return null;
}

const creatureCells = frame => (frame?.cells ?? []).filter(c => (c.kind === 'monster' || c.kind === 'pet') && c.visible !== false);
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

// Places heard polymorphs on a frame's tiles. prev is the frame before (or null). A hero
// change goes on the hero's tile. A monster change goes to the tile where the new form now
// stands, preferring one that held a different creature in prev (the swap itself), then the
// one nearest the hero; hallucination scrambles names, so with no name match it falls back
// to any creature tile whose name changed. Unplaced ones are dropped.
export function resolveBursts(heard, frame, prev) {
  const hero = frame?.player;
  if (!hero) return [];
  const now = creatureCells(frame);
  const before = new Map(creatureCells(prev).map(c => [`${c.x},${c.z}`, nameOf(c.name)]));
  const changed = c => {
    const was = before.get(`${c.x},${c.z}`);
    return was !== undefined && was !== nameOf(c.name);
  };
  const used = new Set();
  const out = [];
  for (const h of heard ?? []) {
    if (h.who === 'hero') { out.push({x: hero.x, z: hero.z, hero: true}); continue; }
    const free = now.filter(c => !used.has(`${c.x},${c.z}`));
    let pool = free.filter(c => h.to && nameOf(c.name) === h.to);
    if (pool.some(changed)) pool = pool.filter(changed);
    if (!pool.length) pool = free.filter(changed);
    if (!pool.length) continue;
    const best = pool.reduce((a, b) => dist2(b, hero) < dist2(a, hero) ? b : a);
    used.add(`${best.x},${best.z}`);
    out.push({x: best.x, z: best.z, hero: false});
  }
  return out;
}

// One burst at an age (ms), or null when it's over or hasn't started. motes are in tiles
// relative to the burst's cell (floor is y 0) with a hue 0–1 and alpha; flash is {r, alpha}
// or null; ring is {r, alpha} or null; pose is the squash/stretch for the creature's model
// ({sx, sy} scale factors, 1 at rest).
export function burstFrame(burst, age) {
  if (!burst || !(age >= 0) || age >= BURST_MS) return null;
  const k = age / BURST_MS;
  const size = burst.hero ? 1.15 : 1;
  const i0 = (burst.x ?? 0) * 31 + (burst.z ?? 0) * 17;
  const motes = [];
  for (let j = 0; j < MOTES; j++) {
    const a0 = (j / MOTES) * Math.PI * 2 + hash(i0, j) * .6;
    const h0 = .1 + .8 * hash(i0, j, 5);
    const hue = (j / MOTES + k * 1.5) % 1;
    let r, y, a, alpha;
    if (k < FLASH) {
      // Spiral in and up: wide and low at the start, tight round the body at the flash.
      const g = easeOut(clamp01(k / FLASH));
      r = (.55 - .4 * g) * size;
      y = (h0 * (1 - .4 * g) + .35 * g) * size;
      a = a0 + g * Math.PI * 3;
      alpha = clamp01(k / .12) * (.55 + .45 * hash(i0, j, 9));
    } else {
      // Scatter out and drift up, fading.
      const s = (k - FLASH) / (1 - FLASH);
      r = (.15 + .75 * easeOut(s) * (.7 + .3 * hash(i0, j, 11))) * size;
      y = (.35 + (h0 - .35) * .6 + .35 * s) * size;
      a = a0 + Math.PI * 3 + s * 1.2;
      alpha = (1 - s) ** 1.5 * (.55 + .45 * hash(i0, j, 9));
    }
    motes.push({x: Math.cos(a) * r, y, z: Math.sin(a) * r, hue, alpha});
  }
  let flash = null;
  const fk = (k - GATHER) / (FLASH + .12 - GATHER);
  if (fk > 0 && fk < 1) flash = {r: (.12 + .38 * Math.sin(fk * Math.PI)) * size, alpha: Math.sin(fk * Math.PI)};
  let ring = null;
  const rk = (k - FLASH + .04) / (1 - FLASH);
  if (rk > 0 && rk < 1) ring = {r: (.1 + .8 * easeOut(rk)) * size, alpha: (1 - rk) * .85};
  // Squeeze thin and tall while gathering, snap small at the flash, then overshoot and
  // settle back to 1 with a damped wobble.
  let sx, sy;
  if (k < GATHER) {
    const g = Math.sin(clamp01(k / GATHER) * Math.PI / 2);
    sx = 1 - .35 * g; sy = 1 + .18 * g;
  } else if (k < FLASH) {
    const f = (k - GATHER) / (FLASH - GATHER);
    sx = .65 - .3 * f; sy = 1.18 - .78 * f;
  } else {
    const s = (k - FLASH) / (1 - FLASH);
    const grow = easeOut(clamp01(s / .35));
    const wob = Math.sin(s * Math.PI * 4) * (1 - s) ** 2 * .22;
    sx = .35 + .65 * grow - wob * .6;
    sy = .4 + .6 * grow + wob;
    // Land exactly on rest by the end.
    const tail = clamp01((s - .9) / .1);
    sx += (1 - sx) * tail; sy += (1 - sy) * tail;
  }
  return {motes, flash, ring, pose: {sx, sy}};
}

const MAX_MOTES = MAX_BURSTS * MOTES;

// Draws bursts. message(text) listens for polymorph lines, frame(frame) places what was heard
// on that frame's tiles (the message comes before the frame that shows the new form),
// add(burst) starts one directly, update(dt, origin) advances them and returns
// {count, motes, poses} where poses maps "x,z" to the {sx, sy} for the creature there.
export function createPolymorph(THREE, parent) {
  const motePos = new Float32Array(MAX_MOTES * 3), moteCol = new Float32Array(MAX_MOTES * 3);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  moteGeo.setAttribute('color', new THREE.BufferAttribute(moteCol, 3));
  moteGeo.setDrawRange(0, 0);
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({size: .07, vertexColors: true, transparent: true,
    depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending}));
  motes.frustumCulled = false; motes.renderOrder = 3; motes.userData.part = 'polymorph-motes';
  parent.add(motes);

  // Flash and ring fade through their instance colour (additive, so darker is fainter).
  const flashGeo = new THREE.SphereGeometry(1, 16, 10);
  const flashMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending});
  const flashes = new THREE.InstancedMesh(flashGeo, flashMat, MAX_BURSTS);
  flashes.count = 0; flashes.frustumCulled = false; flashes.renderOrder = 3; flashes.userData.part = 'polymorph-flash';
  parent.add(flashes);

  const ringGeo = new THREE.RingGeometry(.8, 1, 40, 1).rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide});
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, MAX_BURSTS);
  rings.count = 0; rings.frustumCulled = false; rings.renderOrder = 3; rings.userData.part = 'polymorph-ring';
  parent.add(rings);

  const bursts = [];
  const heard = [];
  let prev = null, now = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const col = new THREE.Color();
  const FLASH_COL = new THREE.Color(1, .92, 1), RING_COL = new THREE.Color(.8, .6, 1);

  function add(burst) {
    if (!burst || !Number.isFinite(burst.x) || !Number.isFinite(burst.z)) return null;
    // A second change on the same tile restarts its burst rather than stacking.
    const same = bursts.findIndex(b => b.x === burst.x && b.z === burst.z);
    if (same >= 0) bursts.splice(same, 1);
    bursts.push({...burst, t: now});
    if (bursts.length > MAX_BURSTS) bursts.shift();
    return burst;
  }
  const message = text => {
    const m = polyMessage(text);
    if (m) heard.push(m);
    return !!m;
  };
  const frame = fr => {
    const out = heard.length ? resolveBursts(heard, fr, prev).map(add) : [];
    heard.length = 0;
    if (fr?.cells) prev = fr;
    return out;
  };

  function update(dt, origin) {
    now += (dt || 0) * 1000;
    const ox = origin?.x ?? 0, oz = origin?.z ?? 0;
    for (let i = bursts.length - 1; i >= 0; i--) if (now - bursts[i].t >= BURST_MS) bursts.splice(i, 1);
    let d = 0, f = 0, r = 0, count = 0;
    const poses = new Map();
    for (const b of bursts) {
      const fr = burstFrame(b, now - b.t);
      if (!fr) continue;
      count++;
      poses.set(`${b.x},${b.z}`, fr.pose);
      const cx = b.x - ox, cz = b.z - oz;
      for (const mt of fr.motes) {
        if (d >= MAX_MOTES) break;
        col.setHSL(mt.hue, .9, .65).multiplyScalar(mt.alpha);
        motePos.set([cx + mt.x, mt.y, cz + mt.z], d * 3);
        moteCol.set([col.r, col.g, col.b], d * 3);
        d++;
      }
      if (fr.flash) {
        p.set(cx, .4 * (b.hero ? 1.15 : 1), cz); s.setScalar(fr.flash.r);
        flashes.setMatrixAt(f, m4.compose(p, q, s));
        flashes.setColorAt(f, col.copy(FLASH_COL).multiplyScalar(fr.flash.alpha));
        f++;
      }
      if (fr.ring) {
        p.set(cx, .03, cz); s.set(fr.ring.r, 1, fr.ring.r);
        rings.setMatrixAt(r, m4.compose(p, q, s));
        rings.setColorAt(r, col.copy(RING_COL).multiplyScalar(fr.ring.alpha));
        r++;
      }
    }
    moteGeo.setDrawRange(0, d);
    moteGeo.attributes.position.needsUpdate = true;
    moteGeo.attributes.color.needsUpdate = true;
    flashes.count = f; rings.count = r;
    flashes.instanceMatrix.needsUpdate = true; rings.instanceMatrix.needsUpdate = true;
    if (flashes.instanceColor) flashes.instanceColor.needsUpdate = true;
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
    return {count, motes: d, poses};
  }

  const clear = () => { bursts.length = 0; heard.length = 0; prev = null; update(0); };
  const dispose = () => {
    for (const m of [motes, flashes, rings]) parent.remove(m);
    moteGeo.dispose(); flashGeo.dispose(); ringGeo.dispose();
    motes.material.dispose(); flashMat.dispose(); ringMat.dispose();
  };
  return {add, message, frame, update, clear, dispose};
}

// Swaps the squash pose on an actor's model: undoes the one applied last frame (kept on
// actor.polyPose) and multiplies in the new one, so it stacks with the action layer's own
// scale changes and leaves the base scale exactly as it was once the pose is null.
export function poseActor(actor, pose) {
  const g = actor?.g;
  if (!g) return;
  const o = actor.polyPose;
  if (o) { g.scale.x /= o.sx; g.scale.z /= o.sx; g.scale.y /= o.sy; }
  const p = pose && Number.isFinite(pose.sx) && Number.isFinite(pose.sy) && pose.sx > 0 && pose.sy > 0 ? pose : null;
  if (p) { g.scale.x *= p.sx; g.scale.z *= p.sx; g.scale.y *= p.sy; }
  actor.polyPose = p ? {sx: p.sx, sy: p.sy} : null;
}
