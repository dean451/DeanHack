// "A tower of flame bursts from the floor!" The fire trap's trigger moment. A hot flash
// punches out first, then a column of fire stands up from the hero's square, fat and white
// at the base, licking up past head height in ragged tongues, while a ring of scorch burns
// into the floor and embers lift off it. The column gutters (it stutters, not fades) and is
// gone in about a second and a half. Nothing here is gentle.
//
// live.js calls message(text, x, z) with every engine message (x, z the hero's last known
// square) and settle(x, z) from each frame with the hero's new square, which is the trap's, update(dt) every frame and clear() on a level change. Poses are functions of
// t and return exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const JET = {flash: .12, rise: .18, gutter: 1.0, tongues: 3, embers: 8, ash: 6, total: 1.6};
export const PENDING_WAIT = .3;
export const isFireTrapMessage = text => /a tower of flame (bursts|erupts) (from|out of)/i.test(text || '');

// The column: height (past head height at the peak), width and alpha. It shoots up fast,
// holds with a ragged flicker, then stutters out.
export function columnPose(t) {
  if (t <= 0 || t >= JET.total) return {height: .001, width: .001, alpha: 0};
  const up = smooth(t / JET.rise), out = 1 - smooth(clamp01((t - JET.rise - JET.gutter * .5) / (JET.total - JET.rise - JET.gutter * .5)));
  const stutter = t > JET.rise + JET.gutter * .5 ? .75 + .25 * Math.sin(t * 61) * Math.sin(t * 23) : 1;
  return {height: .05 + 1.45 * up * (.4 + .6 * out), width: .05 + .2 * up * (.35 + .65 * out), alpha: .85 * out * stutter * Math.min(1, t * 20)};
}

// Tongue i: a thinner, taller lick that leans and flickers around the column.
export function tonguePose(i, t) {
  const c = columnPose(t), a = i * 2.1 + t * (3 + i), flick = .8 + .2 * Math.sin(t * (17 + i * 5) + i);
  // The first tongue snaps sideways once, a lick at something that is not there, then settles back.
  const snap = i === 0 ? .09 * Math.sin(clamp01((t - .5) / .08) * Math.PI) : 0;
  return {x: Math.cos(a) * c.width * .8 + snap, z: Math.sin(a) * c.width * .8, height: c.height * (.55 + .12 * i) * flick, width: c.width * .45, alpha: c.alpha * .8};
}

// The hot flash at the base: one hard pulse in the first instants.
export function flashPose(t) {
  const u = clamp01(t / JET.flash);
  return {size: .2 + .9 * u, alpha: t <= 0 || u >= 1 ? 0 : (1 - u) * (1 - u) * 1.0};
}

// The ring of scorch: spreads over the floor and lingers, thinning to nothing.
export function scorchPose(t) {
  const u = clamp01(t / JET.total);
  // Once, as it thins, the scorch catches again: a brief red flare, as if the floor were not done burning.
  const relit = .22 * Math.sin(clamp01((t - .85) / .14) * Math.PI);
  return {radius: .15 + .5 * smooth(Math.min(1, u * 3)), alpha: t <= 0 || u >= 1 ? 0 : .6 * (1 - u) * Math.min(1, t * 12) + relit * (1 - u)};
}

// Ember i: a spark lifted off the base, jagged sideways drift, cooling as it climbs.
export function emberPose(i, t) {
  // The last ember will not go out: it climbs slower and higher, a sullen red spark hanging on.
  const stubborn = i === JET.embers - 1, start = .1 + (i % 4) * .12, u = clamp01((t - start) / (stubborn ? 1.1 : .9));
  const a = i * 2.4;
  // The third ember chokes out mid-climb and catches again a breath later, as if something blew on it.
  const choke = i === 2 && u > .4 && u < .5 ? .15 : 1;
  return {x: Math.cos(a) * (.1 + .12 * u) + Math.sin(u * 14 + i) * .03, y: .1 + (1.1 + (i % 3) * .3 + (stubborn ? .3 : 0)) * u, z: Math.sin(a) * (.1 + .12 * u), alpha: u <= 0 || u >= 1 ? 0 : .9 * (1 - u) * choke, heat: 1 - u};
}

// Ash flake i: once the column gutters, grey flakes of what burned drift down in a lazy,
// lopsided spin and are gone before the jet ends.
export function ashPose(i, t) {
  const start = 1.0 + (i % 3) * .08, u = clamp01((t - start) / (JET.total - start - .02));
  const a = i * 1.9;
  return {x: Math.cos(a) * (.1 + .06 * i / JET.ash) + Math.sin(u * 7 + i) * .05, y: .9 - .8 * u * (.8 + .2 * (i % 2)), z: Math.sin(a) * (.12 + .05 * i / JET.ash), alpha: u <= 0 || u >= 1 ? 0 : .6 * smooth(u / .2) * (1 - smooth((u - .7) / .3))};
}

export function createFireTrapJet(THREE, parent) {
  const live = []; let pending = null;
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'FireTrapJet'; g.position.set(x, 0, z); parent.add(g);
    const geo = new THREE.ConeGeometry(1, 1, 7, 1, true), sph = new THREE.SphereGeometry(1, 6, 4), ringGeo = new THREE.RingGeometry(.8, 1, 20), mats = [];
    const mk = c => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const mkCone = c => { const m = new THREE.Mesh(geo, mk(c)); g.add(m); return m; };
    const column = mkCone(0xff8a1c), core = mkCone(0xffe9a0), tongues = Array.from({length: JET.tongues}, () => mkCone(0xff5a10));
    const flash = new THREE.Mesh(sph, mk(0xfff0c0)); flash.position.y = .2; g.add(flash);
    const scorch = new THREE.Mesh(ringGeo, mk(0x1a0a04)); scorch.rotation.x = -Math.PI / 2; scorch.position.y = .02; g.add(scorch);
    const embers = Array.from({length: JET.embers}, () => { const m = new THREE.Mesh(sph, mk(0xffb040)); m.scale.setScalar(.018); g.add(m); return m; });
    const ash = Array.from({length: JET.ash}, () => { const m = new THREE.Mesh(sph, mk(0x6a625a)); m.scale.set(.03, .008, .03); g.add(m); return m; });
    const light = new THREE.PointLight(0xff7a20, 0, 5); light.position.y = .6; g.add(light);
    live.push({g, geos: [geo, sph, ringGeo], mats, column, core, tongues, flash, scorch, embers, ash, light, t: 0});
  }
  const cone = (m, h, w, a, x = 0, z = 0) => { m.visible = a > .01; m.scale.set(w, Math.max(h, .001), w); m.position.set(x, h / 2, z); m.material.opacity = a; };
  function step(e, dt) {
    e.t += dt;
    const c = columnPose(e.t);
    cone(e.column, c.height, c.width, c.alpha); cone(e.core, c.height * .8, c.width * .45, c.alpha);
    e.tongues.forEach((m, i) => { const p = tonguePose(i, e.t); cone(m, p.height, p.width, p.alpha, p.x, p.z); });
    const f = flashPose(e.t); e.flash.visible = f.alpha > .01; e.flash.scale.setScalar(f.size); e.flash.material.opacity = f.alpha;
    const s = scorchPose(e.t); e.scorch.visible = s.alpha > .01; e.scorch.scale.setScalar(s.radius); e.scorch.material.opacity = s.alpha;
    e.embers.forEach((m, i) => { const p = emberPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.material.opacity = p.alpha; });
    e.ash.forEach((m, i) => { const p = ashPose(i, e.t); m.visible = p.alpha > .01; m.position.set(p.x, p.y, p.z); m.rotation.x = e.t * 3 + i; m.rotation.z = e.t * 2; m.material.opacity = p.alpha; });
    e.light.intensity = (c.alpha * 3 + f.alpha * 4);
    return e.t < JET.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); e.light.dispose?.(); parent.remove(e.g); }
  return {
    add,
    // The message arrives before the frame that carries the hero's new square, so the x, z
    // given here are where the hero stood BEFORE stepping on the trap. Hold the jet and let the
    // next frame (settle) say where the hero, and so the trap, really is; if no frame comes
    // within PENDING_WAIT, fall back to the square given.
    message(text, x, z) { if (isFireTrapMessage(text)) { if (pending) add(pending.x, pending.z); pending = {x, z, wait: 0}; } },
    settle(x, z) { if (pending) { add(x, z); pending = null; } },
    update(dt) {
      if (pending && (pending.wait += dt) >= PENDING_WAIT) { add(pending.x, pending.z); pending = null; } for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { pending = null; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
