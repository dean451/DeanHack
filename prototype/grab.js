// Grabs and drowning (motion queue item 14, part 1). Eels, krakens and other AD_WRAP
// holders reach only the client as message text and a "hug"/"tentacle" combat event, and the
// frame has no u.ustuck, so this module keeps its own idea of "the hero is held":
// - "<Monster> swings itself around you!" (or "winds", for vegetation) sends a tentacle from
//   the holder's tile that coils up around the hero;
// - "You are being crushed." squeezes the coils;
// - "<Monster> drowns you..." drags the hero under with a big splash and a stream of bubbles;
// - "You get released!", "You pull free…", the holder's death or the hero ending up away
//   from the holder unwinds the coils.
// The holder's tile comes from the frame's player.stuck when the engine sends it, else from the
// combat event (attacker of a hug on the hero); without either the tentacle rises out of the
// floor beside the hero.
//
// grabMessage() and grabShape() are pure, so they can be tested without a renderer;
// createGrab() tracks the state and draws it with one instanced bead mesh and a point cloud.

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = k => { k = clamp01(k); return k * k * (3 - 2 * k); };
const hash = (a, b = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Timings (ms).
export const REACH_MS = 350, COIL_MS = 550, SQUEEZE_MS = 420, DROWN_MS = 1800, RELEASE_MS = 520;
// Coil shape (tiles): helix turns, beads, radius, bottom and top height; tentacle beads.
export const TURNS = 2.5, COIL_BEADS = 40, COIL_R = .21, COIL_Y0 = .16, COIL_Y1 = .58, ARM_BEADS = 14;
export const MAX_BUBBLES = 36;
const SINK = .75;

// Monster name from a message (with articles dropped), or null.
const nameOf = s => s ? s.replace(/^(?:The|the|An?|an?|Your|your)\s+/, '') : null;

// What a message line does to the grab: {phase:'wrap'|'crush'|'drown'|'release'|'brush',
// name, vegetation} or null. hallucination can change the names but not these fixed parts.
export function grabMessage(text) {
  if (typeof text !== 'string') return null;
  let m = text.match(/^(.+?) (swings|winds) itself around you!$/);
  if (m) return {phase: 'wrap', name: nameOf(m[1]), vegetation: m[2] === 'winds'};
  if (/^You are being crushed\.$/.test(text)) return {phase: 'crush'};
  m = text.match(/^(.+?) drowns you\.\.\.$/);
  if (m) return {phase: 'drown', name: nameOf(m[1])};
  if (/^You (?:get|are) released\b/.test(text) || /^You pull free\b/.test(text)) return {phase: 'release'};
  m = text.match(/^(.+?) brushes against your /);
  if (m) return {phase: 'brush', name: nameOf(m[1])};
  return null;
}

// Hide colour for a holder: sea-green eels, blue electric eels, a red kraken, green vines.
export function grabTint(name, vegetation) {
  if (vegetation) return 0x4f7a34;
  const n = typeof name === 'string' ? name.toLowerCase() : '';
  if (n.includes('electric')) return 0x3f6690;
  if (n.includes('kraken')) return 0x8a3b36;
  if (n.includes('eel')) return 0x3f6150;
  return 0x5a5048;
}

const bezier = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;

// The grab at time t (ms). g is {hero:{x,z}, holder:{x,z}|null, wrapAt, squeezeAt, drownAt,
// releaseAt} with times in the same clock as t (missing = not happened). Positions are tiles
// relative to the hero's tile, y up from the floor. Returns null once fully released, else
// {beads:[{x,y,z,r}], bubbles:[{x,y,z,alpha}], sink, squeeze, wrap}; sink is how far (tiles,
// <= 0) the hero is pulled under, for the caller to apply to the hero's model.
export function grabShape(g, t) {
  if (!g || !Number.isFinite(g.wrapAt) || !(t >= g.wrapAt)) return null;
  const age = t - g.wrapAt;
  const reach = smooth(age / REACH_MS);
  let wrap = smooth((age - REACH_MS * .6) / COIL_MS);
  let armOut = reach;
  if (Number.isFinite(g.releaseAt) && t >= g.releaseAt) {
    const k = (t - g.releaseAt) / RELEASE_MS;
    if (k >= 1) return null;
    wrap = Math.min(wrap, 1 - smooth(k * 1.5));
    armOut = Math.min(armOut, 1 - smooth((k - .4) / .6));
  }
  // A squeeze pulses the coils in and back out.
  let squeeze = 0;
  if (Number.isFinite(g.squeezeAt) && t >= g.squeezeAt) {
    const k = (t - g.squeezeAt) / SQUEEZE_MS;
    if (k < 1) squeeze = Math.sin(Math.PI * k) ** 2;
  }
  // Drowning pulls hero and coils under the surface.
  let sink = 0, dk = -1;
  if (Number.isFinite(g.drownAt) && t >= g.drownAt) {
    dk = clamp01((t - g.drownAt) / DROWN_MS);
    sink = -SINK * smooth(dk / .7);
    squeeze = Math.max(squeeze, .6);
  }
  const breathe = .5 + .5 * Math.sin(age / 260);
  const r = COIL_R * (1 - .22 * squeeze) * (1 + .025 * breathe);

  const beads = [];
  // Where the coil starts (bottom of the helix, on the side facing the holder).
  const hx = g.holder ? g.holder.x - g.hero.x : .38, hz = g.holder ? g.holder.z - g.hero.z : .3;
  const a0 = Math.atan2(hz, hx);
  const coilStart = {x: Math.cos(a0) * r, y: COIL_Y0 + sink, z: Math.sin(a0) * r};
  // The arm: a sagging curve from the holder's tile (at the water line) to the coil start.
  if (armOut > 0) {
    const bx = g.holder ? hx : hx * .6, bz = g.holder ? hz : hz * .6, by = g.holder ? .02 : -.05;
    const mx = (bx + coilStart.x) / 2, mz = (bz + coilStart.z) / 2, my = .5 + .08 * breathe + sink * .5;
    const n = Math.max(2, Math.ceil(ARM_BEADS * armOut));
    for (let i = 0; i < n; i++) {
      const u = i / (ARM_BEADS - 1);
      beads.push({x: bezier(bx, mx, coilStart.x, u), y: bezier(by, my, coilStart.y, u), z: bezier(bz, mz, coilStart.z, u),
        r: .075 - .02 * u});
    }
  }
  // The coil: a helix that grows up around the hero as wrap goes to 1, tapering to the tip.
  const shown = Math.floor(COIL_BEADS * wrap);
  for (let i = 0; i < shown; i++) {
    const u = i / (COIL_BEADS - 1);
    const a = a0 + u * TURNS * Math.PI * 2;
    beads.push({x: Math.cos(a) * r, y: COIL_Y0 + (COIL_Y1 - COIL_Y0) * u + sink, z: Math.sin(a) * r,
      r: (.055 - .03 * u) * (1 + .15 * squeeze)});
  }
  // Bubbles rise from the hero's tile while being drowned, thinning out at the end.
  const bubbles = [];
  if (dk >= 0) {
    const sec = (t - g.drownAt) / 1000;
    for (let j = 0; j < MAX_BUBBLES; j++) {
      const born = hash(j, 1) * DROWN_MS / 1000 * .85, life = .5 + .5 * hash(j, 2);
      const k = (sec - born) / life;
      if (k < 0 || k >= 1) continue;
      const a = hash(j, 3) * Math.PI * 2, d = .05 + .2 * hash(j, 4);
      bubbles.push({x: Math.cos(a) * d + .03 * Math.sin(sec * 9 + j), y: sink * (1 - k) + .05 + .25 * k,
        z: Math.sin(a) * d, alpha: (1 - k) * (1 - dk * .6)});
    }
  }
  return {beads, bubbles, sink, squeeze, wrap};
}

// The holder's tile from a frame's player.stuck, or null. Null too when the hero is the one
// doing the sticking (holding), since then nothing coils around the hero. Older engines don't
// send stuck, so everything here also works from messages and combat events alone.
export function stuckHolder(player) {
  const st = player?.stuck;
  if (!st || st.holding || !Number.isFinite(st.x) || !Number.isFinite(st.z)) return null;
  return {x: st.x, z: st.z};
}

const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));

// Tracks and draws the grab. message(text, frame) feeds message lines (frame gives the hero's
// tile); combat(action) takes combatAction() output (a hug or tentacle on the hero sets the
// holder's tile); death(action) and frame(frame) release when the holder dies or the hero is
// no longer next to it. onSplash({x,z,size}) is called when the hero is pulled under.
// update(dt, origin) positions everything and returns {held, beads, bubbles, sink}.
export function createGrab(THREE, parent, {onSplash} = {}) {
  const beadGeo = new THREE.SphereGeometry(1, 10, 8);
  const beadMat = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .45, metalness: .05});
  const maxBeads = COIL_BEADS + ARM_BEADS;
  const beads = new THREE.InstancedMesh(beadGeo, beadMat, maxBeads);
  beads.count = 0; beads.frustumCulled = false; beads.userData.part = 'grab-coil';
  parent.add(beads);

  const bubPos = new Float32Array(MAX_BUBBLES * 3), bubCol = new Float32Array(MAX_BUBBLES * 3);
  const bubGeo = new THREE.BufferGeometry();
  bubGeo.setAttribute('position', new THREE.BufferAttribute(bubPos, 3));
  bubGeo.setAttribute('color', new THREE.BufferAttribute(bubCol, 3));
  bubGeo.setDrawRange(0, 0);
  const bubbles = new THREE.Points(bubGeo, new THREE.PointsMaterial({size: .05, vertexColors: true, transparent: true,
    depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending}));
  bubbles.frustumCulled = false; bubbles.renderOrder = 3; bubbles.userData.part = 'grab-bubbles';
  parent.add(bubbles);

  let g = null, hero = null, lastHolder = null, now = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const tint = new THREE.Color(), col = new THREE.Color();

  function message(text, frame) {
    if (frame?.player) hero = {x: frame.player.x, z: frame.player.z};
    const m = grabMessage(text);
    if (!m) return null;
    if (m.phase === 'wrap') {
      if (!hero) return m;
      // The hug's combat event may come before its message; keep a holder that is next to us.
      const holder = lastHolder && cheb(lastHolder, hero) <= 1 ? lastHolder : null;
      g = {hero: {...hero}, holder, wrapAt: now};
      tint.setHex(grabTint(m.name, m.vegetation));
    } else if (g && !Number.isFinite(g.releaseAt)) {
      if (m.phase === 'crush') g.squeezeAt = now;
      else if (m.phase === 'release') g.releaseAt = now;
      else if (m.phase === 'drown' && !Number.isFinite(g.drownAt)) {
        g.drownAt = now;
        onSplash?.({x: g.hero.x, z: g.hero.z, size: 'large'});
      }
    }
    return m;
  }
  function combat(a) {
    if (!a?.heroDefends || (a.attack !== 'hug' && a.attack !== 'tentacle')) return;
    if (!Number.isFinite(a.attacker?.x) || !Number.isFinite(a.attacker?.z)) return;
    lastHolder = {x: a.attacker.x, z: a.attacker.z};
    if (g && !Number.isFinite(g.releaseAt)) g.holder = lastHolder;
  }
  function death(d) {
    if (g?.holder && d && d.x === g.holder.x && d.z === g.holder.z && !Number.isFinite(g.releaseAt)) g.releaseAt = now;
  }
  function frame(fr) {
    if (!fr?.player) return;
    hero = {x: fr.player.x, z: fr.player.z};
    const st = stuckHolder(fr.player);
    if (st) lastHolder = st;
    if (!g || Number.isFinite(g.releaseAt) || Number.isFinite(g.drownAt)) return;
    if (st) {
      // The bridge says who holds us: follow it, even if the hero's tile changed.
      g.holder = st; g.hero = {...hero}; g.stuck = true;
      return;
    }
    // Once the frame has carried the holder, its absence is the release (a missed message,
    // a teleport, the holder vanishing).
    if (g.stuck) { g.releaseAt = now; return; }
    if (hero.x !== g.hero.x || hero.z !== g.hero.z) {
      // Held heroes don't move, so a move means we missed the release (or a teleport).
      if (!g.holder || cheb(hero, g.holder) > 1) g.releaseAt = now;
      else g.hero = {...hero};
    }
  }

  function update(dt, origin) {
    now += (dt || 0) * 1000;
    const sh = g ? grabShape(g, now) : null;
    if (g && !sh && now > g.wrapAt) g = null;
    const ox = (g?.hero.x ?? 0) - (origin?.x ?? 0), oz = (g?.hero.z ?? 0) - (origin?.z ?? 0);
    let n = 0, b = 0;
    if (sh) {
      for (const bd of sh.beads) {
        if (n >= maxBeads) break;
        p.set(ox + bd.x, bd.y, oz + bd.z); s.setScalar(bd.r);
        beads.setMatrixAt(n, m4.compose(p, q, s));
        // A paler belly on every other bead gives the coil some banding.
        beads.setColorAt(n, col.copy(tint).multiplyScalar(n % 3 === 0 ? 1.25 : 1));
        n++;
      }
      for (const bu of sh.bubbles) {
        bubPos.set([ox + bu.x, bu.y, oz + bu.z], b * 3);
        bubCol.set([.75 * bu.alpha, .9 * bu.alpha, bu.alpha], b * 3);
        b++;
      }
    }
    beads.count = n;
    beads.instanceMatrix.needsUpdate = true;
    if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
    bubGeo.setDrawRange(0, b);
    bubGeo.attributes.position.needsUpdate = true;
    bubGeo.attributes.color.needsUpdate = true;
    return {held: !!sh, beads: n, bubbles: b, sink: sh?.sink ?? 0};
  }

  const clear = () => { g = null; lastHolder = null; update(0); };
  const dispose = () => {
    parent.remove(beads); parent.remove(bubbles);
    beadGeo.dispose(); beadMat.dispose(); bubGeo.dispose(); bubbles.material.dispose();
  };
  return {message, combat, death, frame, update, clear, dispose, get state() { return g; }};
}
