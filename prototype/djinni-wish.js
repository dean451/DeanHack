// A djinni is freed from a bottle or a lamp and grants a wish: smoke pours out of nowhere
// and stands up into a vast shape with two cold eyes. It leans down to look the hero over,
// as if pricing them, gives one slow bow and unspools into the air. Dark-humoured, never jolly.
//
// live.js calls wish(v, x, z) for the bridge `wish` event (x, z the hero's square), update(dt)
// every frame and clear() on a level change. Poses are functions of t and return exactly to
// rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const DJINNI = {total: 3.2};
// Only a freed djinni gets it; a wand or a water demon has its own.
export const isDjinniWish = v => v?.type === 'wish' && v.source === 'bottle';

// The column of smoke: it pours up fast, holds, then unspools from the top down.
export function smokePose(t) {
  const u = clamp01(t / DJINNI.total);
  if (u <= 0 || u >= 1) return {height: .001, width: .001, alpha: 0, lean: 0};
  const rise = smooth(clamp01(u / .25)), fade = smooth(clamp01((u - .7) / .3));
  // The lean: it stoops over the hero, then a slow bow before it goes.
  const lean = .5 * smooth(clamp01((u - .3) / .15)) * (1 - smooth(clamp01((u - .5) / .1))) + .35 * Math.sin(Math.PI * clamp01((u - .55) / .2));
  return {height: 2.6 * rise * (1 - .6 * fade) + .001, width: (.25 + .35 * rise) * (1 + .8 * fade), alpha: .6 * rise * (1 - fade), lean};
}

// The eyes open late, stare, and are the first thing to go out.
export function eyePose(t) {
  const u = clamp01(t / DJINNI.total);
  if (u <= .3 || u >= .65) return {alpha: 0, size: .001, glance: 0};
  const open = smooth(clamp01((u - .3) / .04)), shut = smooth(clamp01((u - .6) / .05));
  // One slow blink in the middle of the stare.
  // Then, as if unsure it was seen, a second quicker blink.
  const blink = (u > .45 && u < .48) || (u > .515 && u < .53) ? .15 : 1;
  // Between the blinks the stare slides off the hero to something behind them, lingers, and snaps back.
  const gu = clamp01((u - .485) / .03), glance = gu > 0 && gu < 1 ? .1 * Math.sin(Math.PI * gu) ** 2 : 0;
  return {alpha: open * (1 - shut), size: .06 * blink + .001, glance};
}

// The curl of smoke at the foot: a ring that thickens and drifts out.
export function curlPose(t) {
  const u = clamp01(t / DJINNI.total);
  if (u <= 0 || u >= 1) return {radius: .001, alpha: 0};
  return {radius: .2 + 1.1 * (1 - (1 - u) ** 2), alpha: .45 * Math.sin(Math.PI * u) ** 2};
}

export function createDjinniWish(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'DjinniWish'; g.position.set(x, 0, z); parent.add(g);
    const geo = new THREE.SphereGeometry(1, 10, 8), ringGeo = new THREE.RingGeometry(.7, 1, 24), mats = [];
    const mk = (c, add) => { const m = new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: 0, depthWrite: false, ...(add ? {blending: THREE.AdditiveBlending} : {})}); mats.push(m); return m; };
    const smoke = new THREE.Mesh(geo, mk(0x2a2630)); g.add(smoke);
    const eyes = [-1, 1].map(s => { const e = new THREE.Mesh(geo, mk(0xffb347, true)); e.userData.side = s; g.add(e); return e; });
    const curl = new THREE.Mesh(ringGeo, mk(0x3a3440)); curl.rotation.x = -Math.PI / 2; curl.position.y = .03; g.add(curl);
    live.push({g, geos: [geo, ringGeo], mats, smoke, eyes, curl, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const s = smokePose(e.t);
    e.smoke.visible = s.alpha > .01; e.smoke.scale.set(s.width, s.height / 2, s.width); e.smoke.position.set(s.lean * s.height * .3, s.height / 2, 0);
    e.smoke.rotation.z = -s.lean; e.smoke.material.opacity = s.alpha;
    const y = e.smoke.position.y + s.height * .3, x = e.smoke.position.x + s.lean * .25;
    const p = eyePose(e.t);
    for (const eye of e.eyes) { eye.visible = p.alpha > .01; eye.scale.setScalar(p.size); eye.position.set(x + .25, y, eye.userData.side * .12 + p.glance); eye.material.opacity = p.alpha; }
    const c = curlPose(e.t); e.curl.visible = c.alpha > .01; e.curl.scale.setScalar(c.radius); e.curl.material.opacity = c.alpha;
    return e.t < DJINNI.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    wish(v, x, z) { if (isDjinniWish(v)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
