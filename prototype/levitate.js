// Levitation, for the hero. The status line shows "Lev" (or "Lv" when abbreviated) while
// the hero levitates; this reads that and floats the character, quietly: a small lift off
// the floor with a slow bob and sway, legs hanging loose instead of walking, and a faint
// ripple of air spreading on the floor below. It eases up when levitation starts and
// settles back down when it ends.
//
// levitationFromStatus() and levitatePose() are pure; createLevitation() draws the ripple
// and applies the pose to the hero (live.js calls it after the idle pose, before actions,
// so attacks still layer on top).

// Height of the float (tiles) and its bob; seconds per bob and per sway.
export const LIFT = .2;
export const BOB = .03, BOB_S = 2.6;
export const SWAY = .025, SWAY_S = 3.9;
// Easing time constants (s) going up and coming down.
export const RISE_S = .45, FALL_S = .22;
// Legs: how far they hang back at rest, how much they drift, and how far they trail when gliding.
export const DANGLE = .16, DRIFT = .07, TRAIL = .32;
// The floor ripple: seconds per ring, its size and its brightest.
export const RIPPLE_S = 1.9;
export const RIPPLE_ALPHA = .16;
export const RIPPLE_COLOR = 0xd4e6ff;

const TAU = Math.PI * 2;

// true or false from the bottom status line that carries the conditions (the one with
// Dlvl/HP/T:), null for any other line (the name-and-stats line says nothing either way).
export function levitationFromStatus(text) {
  const s = String(text ?? '');
  if (!/\b(Dlvl|HP|T):/.test(s)) return null;
  return /(^|\s)(Lev|Lv)(?=\s|$)/.test(s);
}

// The float at easing k (0 on the floor, 1 fully up), time t (s): {lift, sway, legs:[a, b],
// ripples:[{scale, alpha}]}. moving: gliding from square to square, legs trail behind.
export function levitatePose(k, t, moving = false) {
  k = k < 0 ? 0 : k > 1 ? 1 : k;
  if (!k) return {lift: 0, sway: 0, legs: [0, 0], ripples: [{scale: .55, alpha: 0}, {scale: .55, alpha: 0}]};
  const lift = k * (LIFT + BOB * Math.sin(t * TAU / BOB_S));
  const sway = k * SWAY * Math.sin(t * TAU / SWAY_S);
  const hang = moving ? TRAIL : DANGLE;
  const legs = [0, 1].map(i => k * (hang + DRIFT * Math.sin(t * TAU / BOB_S * .7 + i * 1.9)));
  const ripples = [0, .5].map(off => {
    const u = ((t / RIPPLE_S + off) % 1 + 1) % 1;
    return {scale: .55 + .8 * u, alpha: k * RIPPLE_ALPHA * Math.sin(Math.PI * u) * (1 - u)};
  });
  return {lift, sway, legs, ripples};
}

// Steps the easing k toward on (1) or off (0) over dt seconds.
export function easeLevitation(k, on, dt) {
  const tau = on ? RISE_S : FALL_S;
  const target = on ? 1 : 0;
  const next = target + (k - target) * Math.exp(-Math.max(0, dt) / tau);
  return Math.abs(next - target) < 1e-2 ? target : next;
}

// status(text) reads a status line; update(hero, dt, t, moving) eases, poses the hero's body
// and legs and places the ripple, returning the lift for live.js to add to hero.g.position.y.
export function createLevitation(THREE, parent) {
  const geo = new THREE.RingGeometry(.3, .34, 40);
  geo.rotateX(-Math.PI / 2);
  const mats = [0, 1].map(() => new THREE.MeshBasicMaterial({color: RIPPLE_COLOR, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}));
  const rings = mats.map(m => { const r = new THREE.Mesh(geo, m); r.visible = false; r.renderOrder = 4; r.userData.part = 'levitation'; parent.add(r); return r; });
  let on = false, k = 0;

  function status(text) {
    const v = levitationFromStatus(text);
    if (v !== null) on = v;
  }
  function update(hero, dt, t, moving = false) {
    k = easeLevitation(k, on, dt);
    for (const r of rings) r.visible = k > 0;
    if (!k || !hero?.g) return 0;
    const p = levitatePose(k, t, moving);
    // The float replaces the walk: no stepping bounce, legs hang loose.
    if (hero.body) { hero.body.position.y *= 1 - k; hero.body.rotation.z = p.sway; }
    hero.legs?.forEach((l, i) => { l.rotation.x = l.rotation.x * (1 - k) + p.legs[i % 2]; });
    p.ripples.forEach((rp, i) => {
      rings[i].position.set(hero.g.position.x, .015, hero.g.position.z);
      rings[i].scale.setScalar(rp.scale);
      mats[i].opacity = rp.alpha;
    });
    return p.lift;
  }
  function clear(hero) {
    on = false; k = 0;
    for (const r of rings) r.visible = false;
    if (hero?.body) hero.body.rotation.z = 0;
  }
  const dispose = () => { for (const r of rings) parent.remove(r); geo.dispose(); mats.forEach(m => m.dispose()); };
  return {status, update, clear, dispose, rings, get levitating() { return on; }, get easing() { return k; }};
}
