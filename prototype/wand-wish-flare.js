// A wand of wishing is zapped and the wish is granted: the tin wand's whole stored hope goes
// off at once. A hard white-gold flash on the hero's square, a thin ring racing out over the
// floor and a spike of light standing up and snapping off. It is a short, violent beat before
// the quieter wish effect takes over.
//
// live.js calls wish(v, x, z) for the bridge `wish` event (x, z the hero's square), update(dt)
// every frame and clear() on a level change. Poses are functions of t and return exactly to
// rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const FLARE = {total: .9};
// Only a wand's wish gets it; a djinni or a water demon has its own.
export const isWandWish = v => v?.type === 'wish' && v.source === 'wand';

// The flash: it slams to full at once and bleeds away.
export function flashPose(t) {
  if (t <= 0 || t >= FLARE.total) return {size: .001, alpha: 0};
  const u = t / FLARE.total, hit = smooth(clamp01(t / .05));
  return {size: .15 + .55 * Math.sqrt(u), alpha: hit * (1 - u) * (1 - u)};
}

// The ring races out over the floor, thinning as it goes.
export function ringPose(t) {
  const u = clamp01(t / FLARE.total);
  if (u <= 0 || u >= 1) return {radius: .001, alpha: 0};
  return {radius: .15 + 1.6 * (1 - (1 - u) ** 3), alpha: .8 * (1 - u) ** 2};
}

// The wand's last gasp: a second, fainter ring crawls out late and stalls short, flickering,
// like something small that came through after the rest and found nobody left to impress.
export function echoPose(t) {
  const u = clamp01((t - .3) / (FLARE.total - .3));
  if (u <= 0 || u >= 1) return {radius: .001, alpha: 0};
  return {radius: .1 + .9 * (1 - (1 - u) ** 2), alpha: .35 * Math.sin(Math.PI * u) * (.65 + .35 * Math.sin(u * 45))};
}

// The spike stands up tall in an instant, then snaps off from the top down.
export function spikePose(t) {
  const u = clamp01(t / FLARE.total);
  if (u <= 0 || u >= 1) return {height: .001, y: 0, alpha: 0};
  const rise = smooth(clamp01(u / .12)), fall = smooth(clamp01((u - .25) / .5));
  return {height: 1.6 * rise * (1 - fall) + .001, y: .8 * rise * (1 - fall) + 1.6 * fall * .3, alpha: .9 * (1 - u)};
}

export function createWandWishFlare(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'WandWishFlare'; g.position.set(x, 0, z); parent.add(g);
    const geo = new THREE.SphereGeometry(1, 8, 6), ringGeo = new THREE.RingGeometry(.85, 1, 28), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending}); mats.push(m); return m; };
    const flash = new THREE.Mesh(geo, mk(0xfff6d0)); flash.position.y = .6; g.add(flash);
    const ring = new THREE.Mesh(ringGeo, mk(0xffd35a)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
    const echo = new THREE.Mesh(ringGeo, mk(0xb8892a)); echo.rotation.x = -Math.PI / 2; echo.position.y = .03; g.add(echo);
    const spike = new THREE.Mesh(geo, mk(0xffffff)); g.add(spike);
    live.push({g, geos: [geo, ringGeo], mats, flash, ring, echo, spike, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const f = flashPose(e.t); e.flash.visible = f.alpha > .01; e.flash.scale.setScalar(f.size); e.flash.material.opacity = f.alpha;
    const r = ringPose(e.t); e.ring.visible = r.alpha > .01; e.ring.scale.setScalar(r.radius); e.ring.material.opacity = r.alpha;
    const c = echoPose(e.t); e.echo.visible = c.alpha > .01; e.echo.scale.setScalar(c.radius); e.echo.material.opacity = c.alpha;
    const s = spikePose(e.t); e.spike.visible = s.alpha > .01; e.spike.position.y = s.y; e.spike.scale.set(.03, s.height, .03); e.spike.material.opacity = s.alpha;
    return e.t < FLARE.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    wish(v, x, z) { if (isWandWish(v)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
