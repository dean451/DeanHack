// Non-wrapping holds. The frame's player.stuck says the hero is held (an owlbear's hug, a
// lichen's touch, a mimic) or, with holding, that the hero holds a monster (polymorphed into
// a lichen). Wrapping holders already get grab.js's coil; for every other hold this draws a
// few sagging, sticky strands between the hero and the other tile, tugging in and out, which
// stretch and fade when the hold breaks. Only the tile is used, never the monster's name.
// The strands lean toward the colour of the glyph drawn on the sticky end's tile (the holder,
// or the hero when holding), so they only ever show what the map already shows; while
// hallucinating they drift with the displayed glyph.
//
// Once the strands have gripped, a drop of glue swells at the low point of each strand and
// falls to the floor, staggered so they don't drip in step; no new drops form once the hold
// breaks, but one already falling lands.
//
// While a non-wrapping holder has the hero (not while the hero holds), the hero is squeezed:
// pressed thinner and a little taller in time with the tug, and rocking side to side as if
// struggling. It eases in with the grip and back out as the hold breaks (holdSqueeze, poseHeld).
//
// holdShape() is pure, so it can be tested without a renderer; createHold() tracks the frame
// and draws it with one instanced bead mesh.

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = k => { k = clamp01(k); return k * k * (3 - 2 * k); };

// Timings (ms).
export const GRIP_MS = 260, LET_GO_MS = 380, TUG_MS = 900;
// Strands, beads per strand, attach heights at the hero and the other end (tiles), sag.
export const STRANDS = 3, STRAND_BEADS = 12, HERO_Y = .34, OTHER_Y = .3, SAG = .13;
export const HOLD_TINT = 0xb8bfa2;
// A drip cycle per strand (ms): the drop swells for DRIP_SWELL of it, then falls. Drop radius.
export const DRIP_MS = 1700, DRIP_SWELL = .82, DRIP_R = .013, DRIP_FLOOR = .012;
// How far the strands lean toward the glyph colour, and how fast a new tint eases in (1/s).
export const TINT_MIX = .5, TINT_RATE = 6;
// The curses glyph colours (CLR_BLACK..CLR_WHITE); 8 is NO_COLOR.
const GLYPH_RGB = [0x34343c, 0xa83b2e, 0x4f8a3a, 0x8a6440, 0x3d5fb0, 0x8a3f8f, 0x3f9a9a, 0x8f8f88,
  null, 0xd9782e, 0x7fbf4f, 0xd6ac3a, 0x5f8fe0, 0xb85cbf, 0x6fd0d0, 0xe2ded2];

const mixRgb = (a, b, k) => {
  let out = 0;
  for (const sh of [16, 8, 0]) {
    const ca = (a >> sh) & 255, cb = (b >> sh) & 255;
    out |= Math.round(ca + (cb - ca) * k) << sh;
  }
  return out;
};

// The strand colour for a hold: HOLD_TINT leaning toward the colour of the monster glyph shown
// at (x, z) in the frame's cells. Anything else (no cell, not a monster, not in sight, no
// colour) keeps the plain HOLD_TINT.
export function holdTint(cells, x, z) {
  if (!Array.isArray(cells)) return HOLD_TINT;
  const cell = cells.find(c => c && c.x === x && c.z === z);
  if (!cell || (cell.kind !== 'monster' && cell.kind !== 'pet') || cell.visible === false) return HOLD_TINT;
  const rgb = Number.isInteger(cell.color) ? GLYPH_RGB[cell.color] : null;
  return rgb == null ? HOLD_TINT : mixRgb(HOLD_TINT, rgb, TINT_MIX);
}

// The hold at time t (ms). h is {dx, dz, holding, startAt, endAt?}: the other tile relative to
// the hero's tile. Returns null before startAt and once fully let go, else {beads:[{x,y,z,r}],
// drips:[{x,y,z,r}], grip, tug}. Positions are tiles relative to the hero's tile, y up from
// the floor.
export function holdShape(h, t) {
  if (!h || !Number.isFinite(h.startAt) || !(t >= h.startAt)) return null;
  if (!Number.isFinite(h.dx) || !Number.isFinite(h.dz)) return null;
  const len = Math.hypot(h.dx, h.dz);
  if (!(len > 1e-6)) return null;
  const age = t - h.startAt;
  // grip runs 0→1 as the strands shoot across, and back down as they snap on release.
  let grip = smooth(age / GRIP_MS), stretch = 0;
  if (Number.isFinite(h.endAt) && t >= h.endAt) {
    const k = (t - h.endAt) / LET_GO_MS;
    if (k >= 1) return null;
    stretch = Math.sin(Math.PI * Math.min(k * 2, 1)) * (1 - k);
    grip = Math.min(grip, 1 - smooth(k));
  }
  // A slow tug: the strands pull taut (less sag) and relax again.
  const tug = .5 + .5 * Math.sin(age / TUG_MS * Math.PI * 2);
  const ux = h.dx / len, uz = h.dz / len;
  // Strands meet the other tile a little short of its centre (on the monster's body).
  const ex = h.dx - ux * .18, ez = h.dz - uz * .18;
  const sx = ux * .12, sz = uz * .12;
  const beads = [], drips = [];
  const reach = smooth(age / GRIP_MS);
  const shown = Math.max(0, Math.ceil(STRAND_BEADS * reach));
  for (let s = 0; s < STRANDS; s++) {
    // Spread the strands sideways and a little in height.
    const side = (s - (STRANDS - 1) / 2) * .07, lift = (s % 2) * .05;
    const px = -uz * side, pz = ux * side;
    const sag = SAG * (1 - .45 * tug) * (1 + .3 * s / STRANDS) + .1 * stretch;
    for (let i = 0; i < shown; i++) {
      const u = i / (STRAND_BEADS - 1);
      // Held: strands grow from the holder to the hero. Holding: from the hero outwards.
      const k = h.holding ? u : 1 - u;
      const x = sx + (ex - sx) * k + px * Math.sin(Math.PI * k);
      const z = sz + (ez - sz) * k + pz * Math.sin(Math.PI * k);
      const y = HERO_Y + lift + (OTHER_Y - HERO_Y) * k - sag * Math.sin(Math.PI * k);
      // Thicker globs at the ends, thin in the middle, all thinning as the hold breaks.
      const end = Math.abs(2 * k - 1) ** 3;
      beads.push({x, y, z, r: (.011 + .012 * end) * (.35 + .65 * grip)});
    }
    const drip = dripAt(h, age, t, s);
    if (drip) {
      // Hanging from the strand's low point (k = .5), then falling straight down from there.
      const x = sx + (ex - sx) * .5 + px, z = sz + (ez - sz) * .5 + pz;
      const low = HERO_Y + lift + (OTHER_Y - HERO_Y) * .5 - sag;
      const hang = low - drip.r * .6;
      const y = drip.fall > 0 ? hang - (hang - DRIP_FLOOR) * drip.fall * drip.fall : hang;
      drips.push({x, y, z, r: drip.r});
    }
  }
  return {beads, drips, grip, tug};
}

// Strand s's drop at hold age `age`: {r, fall} (fall 0 while swelling, then 0→1 as it drops),
// or null. Drops start once the strands have gripped; a drop still swelling when the hold
// breaks is gone, one already falling finishes its fall.
function dripAt(h, age, t, s) {
  const from = age - GRIP_MS - s * DRIP_MS / STRANDS * 1.37;
  if (!(from > 0)) return null;
  const cycle = Math.floor(from / DRIP_MS), ph = (from - cycle * DRIP_MS) / DRIP_MS;
  if (Number.isFinite(h.endAt)) {
    // When did this cycle's fall start? Only drops that let go before the break keep going.
    const fallAt = t - (ph - DRIP_SWELL) * DRIP_MS;
    if (ph < DRIP_SWELL || fallAt > h.endAt) return null;
  }
  if (ph < DRIP_SWELL) return {r: DRIP_R * smooth(ph / DRIP_SWELL), fall: 0};
  const fall = (ph - DRIP_SWELL) / (1 - DRIP_SWELL);
  return {r: DRIP_R * (1 - .25 * fall), fall};
}

// The squeeze on a held hero (see poseHeld): {sx, sy, roll}, sx the sideways scale, sy the
// height scale, roll radians about the hero's forward axis. Null when the hero holds, or when
// there's no hold at t.
export const SQUEEZE = .08, SQUEEZE_ROLL = .07, STRUGGLE_MS = 560;
export function holdSqueeze(h, t) {
  if (!h || h.holding) return null;
  const sh = holdShape(h, t);
  if (!sh) return null;
  // Hardest when the strands pull taut (tug 1), never fully slack while gripped.
  const q = sh.grip * (.4 + .6 * sh.tug);
  const roll = SQUEEZE_ROLL * sh.grip * Math.sin((t - h.startAt) / STRUGGLE_MS * Math.PI * 2);
  return {sx: 1 - SQUEEZE * q, sy: 1 + SQUEEZE * .45 * q, roll};
}

// Applies a holdSqueeze pose to actor.g, taking the last one off first, so it stacks with the
// other additive poses (engulf, polymorph). poseHeld(actor, null) takes it off.
export function poseHeld(actor, pose) {
  const g = actor?.g;
  if (!g) return;
  const o = actor.holdPose;
  if (o) { g.rotation.z -= o.roll; g.scale.x /= o.sx; g.scale.z /= o.sx; g.scale.y /= o.sy; }
  const ok = pose && Number.isFinite(pose.roll) && pose.sx > 0 && pose.sy > 0 && Number.isFinite(pose.sx) && Number.isFinite(pose.sy);
  if (ok) { g.rotation.z += pose.roll; g.scale.x *= pose.sx; g.scale.z *= pose.sx; g.scale.y *= pose.sy; }
  actor.holdPose = ok ? {sx: pose.sx, sy: pose.sy, roll: pose.roll} : null;
}

// The hold from a frame's player: {dx, dz, holding} or null.
export function holdOf(player) {
  const st = player?.stuck;
  if (!st || !Number.isFinite(st.x) || !Number.isFinite(st.z)) return null;
  if (!Number.isFinite(player.x) || !Number.isFinite(player.z)) return null;
  return {dx: st.x - player.x, dz: st.z - player.z, holding: !!st.holding};
}

// Tracks player.stuck across frames. update(dt, origin, {skip}) draws the strands and returns
// {held, beads, drips, squeeze} (squeeze: holdSqueeze's pose or null); skip hides them while grab.js's coil is showing the same hold. The
// material eases toward the sticky end's tint (see holdTint).
export function createHold(THREE, parent) {
  const geo = new THREE.SphereGeometry(1, 8, 6);
  const mat = new THREE.MeshStandardMaterial({color: HOLD_TINT, roughness: .3, metalness: 0,
    transparent: true, opacity: .85});
  const max = STRANDS * (STRAND_BEADS + 1);
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.count = 0; mesh.frustumCulled = false; mesh.userData.part = 'hold-strands';
  parent.add(mesh);

  let h = null, hero = null, now = 0, tint = HOLD_TINT;
  const target = new THREE.Color(HOLD_TINT);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();

  function frame(fr) {
    if (!fr?.player) return;
    const cur = holdOf(fr.player);
    if (cur) {
      // The sticky end: the holder's tile, or the hero's own when the hero holds.
      const sx = cur.holding ? fr.player.x : fr.player.x + cur.dx;
      const sz = cur.holding ? fr.player.z : fr.player.z + cur.dz;
      tint = holdTint(fr.cells, sx, sz);
    }
    const live = h && !Number.isFinite(h.endAt);
    if (cur && live && cur.holding === h.holding && Math.abs(cur.dx) <= 1.5 && Math.abs(cur.dz) <= 1.5) {
      // Same hold; follow the tiles (a displaced hero stays held).
      h.dx = cur.dx; h.dz = cur.dz;
      hero = {x: fr.player.x, z: fr.player.z};
      return;
    }
    if (cur) {
      // A new hold (switching holds in one frame drops the old strands at once).
      hero = {x: fr.player.x, z: fr.player.z};
      h = {...cur, startAt: now};
      // A fresh hold starts in its own colour rather than fading from the last one.
      mat.color.setHex(tint);
    } else if (live) {
      // Let go where the strands were drawn.
      h.endAt = now;
    }
  }

  function update(dt, origin, {skip = false} = {}) {
    let drips = 0;
    now += (dt || 0) * 1000;
    const sh = h ? holdShape(h, now) : null;
    if (h && !sh && Number.isFinite(h.endAt) && now >= h.endAt) h = null;
    target.setHex(tint);
    mat.color.lerp(target, 1 - Math.exp(-TINT_RATE * Math.max(0, dt || 0)));
    let n = 0;
    if (sh && !skip && hero) {
      const ox = hero.x - (origin?.x ?? 0), oz = hero.z - (origin?.z ?? 0);
      for (const b of sh.beads) {
        if (n >= max) break;
        p.set(ox + b.x, b.y, oz + b.z); s.setScalar(b.r);
        mesh.setMatrixAt(n++, m4.compose(p, q, s));
      }
      const strandBeads = n;
      for (const d of sh.drips) {
        if (n >= max || !(d.r > 1e-4)) continue;
        p.set(ox + d.x, d.y, oz + d.z); s.set(d.r * .9, d.r * 1.25, d.r * .9);
        mesh.setMatrixAt(n++, m4.compose(p, q, s));
      }
      drips = n - strandBeads;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    const squeeze = sh && !skip && hero ? holdSqueeze(h, now) : null;
    return {held: !!sh, beads: n - drips, drips, squeeze};
  }

  const clear = () => { h = null; hero = null; tint = HOLD_TINT; mat.color.setHex(HOLD_TINT); update(0); };
  const dispose = () => { parent.remove(mesh); geo.dispose(); mat.dispose(); };
  return {frame, update, clear, dispose, get state() { return h; }, get tint() { return tint; },
    get color() { return mat.color.getHex(); }};
}
