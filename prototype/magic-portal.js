// "You activated a magic portal!" The hero is dragged through a portal (the message text is from
// NetHack source and unconfirmed against a live engine). On the old square three thin rings spin
// against each other and wind inward as if down a drain, while the floor light sours from violet
// to a sick green-black, and a last tug snaps them shut. On the new level the same rings unwind
// outward, stuttering, and settle. Nothing here is gentle or pretty.
//
// live.js calls message(text, x, z) with every engine message, levelChanged(x, z) when a new level
// arrives, update(dt) every frame and clear() otherwise. Poses are functions of t and return
// exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const PORTAL = {rings: 3, out: .8, arrive: .7, armed: 3};
export const isPortalMessage = text => /^You activated a magic portal/.test(text || '');

// Ring i winding in (dir -1, the departure) or unwinding out (dir 1, the arrival).
export function ringPose(i, t, dir) {
  const life = dir < 0 ? PORTAL.out : PORTAL.arrive;
  if (t <= 0 || t >= life) return {radius: 1.2, spin: 0, alpha: 0};
  // The last ring on the arrival hangs back a beat, stuck at the centre, then tears loose.
  const lag = dir > 0 && i === PORTAL.rings - 1 ? .08 : 0, u = clamp01((t - lag) / (life - lag)), v = dir < 0 ? u * u : 1 - (1 - u) * (1 - u);
  // The last tug: just before they snap shut the departing rings recoil outward, as if the portal had bitten on nothing.
  const recoil = dir < 0 ? .07 * Math.sin(clamp01((u - .78) / .14) * Math.PI) : 0;
  const radius = dir < 0 ? 1.2 - (1.1 - .1 * i) * v + recoil : .1 + (1.1 - .1 * i) * v;
  const stutter = dir > 0 ? .75 + .25 * Math.sin(u * 41 + i * 2) : 1;
  // On the way down the middle ring hitches once, jerking back against its own spin as if it caught on something.
  const hitch = dir < 0 && i === 1 ? -.6 * Math.sin(clamp01((u - .5) / .1) * Math.PI) : 0;
  return {radius, spin: (i % 2 ? -1 : 1) * (u * 9 + i + hitch) * dir * -1, alpha: .7 * stutter * Math.min(1, t * 12) * (1 - smooth(clamp01((u - .7) / .3)))};
}

// The light's colour mix, 0 violet to 1 sick green-black.
export const sourPose = t => clamp01(t / PORTAL.out);

export function createMagicPortal(THREE, parent) {
  const live = []; let armed = 0;
  function build(x, z, dir) {
    const g = new THREE.Group(); g.name = 'MagicPortal'; g.position.set(x, 0, z); parent.add(g);
    const ringGeo = new THREE.RingGeometry(.88, 1, 5), mats = [];
    const mk = () => { const m = new THREE.MeshBasicMaterial({color: 0x9a5cff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}); mats.push(m); return m; };
    const rings = Array.from({length: PORTAL.rings}, () => { const m = new THREE.Mesh(ringGeo, mk()); m.rotation.x = -Math.PI / 2; m.position.y = .03; g.add(m); return m; });
    const light = new THREE.PointLight(0x9a5cff, 0, 5); light.position.y = .5; g.add(light);
    live.push({g, geos: [ringGeo], mats, rings, light, dir, t: 0});
  }
  const violet = new THREE.Color(0x9a5cff), sick = new THREE.Color(0x2c4a1c);
  function step(e, dt) {
    e.t += dt; const life = e.dir < 0 ? PORTAL.out : PORTAL.arrive, k = e.dir < 0 ? sourPose(e.t) : 0;
    let peak = 0;
    e.rings.forEach((r, i) => {
      const p = ringPose(i, e.t, e.dir); r.visible = p.alpha > .01; r.scale.setScalar(p.radius); r.rotation.z = p.spin;
      r.material.opacity = p.alpha; r.material.color.copy(violet).lerp(sick, k); peak = Math.max(peak, p.alpha);
    });
    e.light.intensity = peak * 3; e.light.color.copy(violet).lerp(sick, k);
    return e.t < life;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); e.light.dispose?.(); parent.remove(e.g); }
  return {
    message(text, x, z) { if (isPortalMessage(text)) { build(x, z, -1); armed = PORTAL.armed; } },
    // A new level arrived: drop the old level's effects and, if the portal was ours, unwind it here.
    levelChanged(x, z) { live.forEach(drop); live.length = 0; if (armed > 0) build(x, z, 1); armed = 0; },
    update(dt) {
      if (armed > 0) armed = Math.max(0, armed - dt);
      for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); }
    },
    clear() { armed = 0; live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
