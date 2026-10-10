// "Water gushes forth from the overflowing fountain!" The basin does not bubble politely: a
// black column of water punches straight up, stalls, and falls apart into a ring of heavy
// droplets that arc out over the rim and slap the flagstones. A dark film of it creeps across
// the floor, shivers once as if something below disagreed, and soaks away.
//
// live.js calls message(text, x, z) with every engine message and x, z the hero's square (the
// fountain is always the hero's own), update(dt) every frame and clear() on a level change.
// Poses are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const GUSH = {drops: 14, jet: .45, total: 2.6};
const LAND = (1.6 + Math.sqrt(1.6 * 1.6 + 4 * 3.2 * .55)) / 6.4; // seconds in the air until y reaches 0
export const isGushMessage = text => /water gushes forth from the overflowing fountain/i.test(text || '');

// The jet column at time t: height (0 to 1 of full), width and alpha. It shoots up fast, hangs,
// then collapses as the drops leave it.
export function jetPose(t) {
  const up = 1 - (1 - clamp01(t / GUSH.jet)) ** 3;
  const fall = smooth((t - GUSH.jet - .25) / .4);
  // At the top the column coughs: two quick sputters, as if something below choked on it.
  const ts = t - GUSH.jet, cough = ts > 0 && ts < .25 ? Math.abs(Math.sin(ts / .25 * Math.PI * 2)) * .12 : 0;
  return {height: up * (1 - fall) * (1 - cough), width: .06 + .05 * up * (1 - fall), alpha: (1 - fall) * Math.min(1, t * 8)};
}

// Drop i at time t: a ballistic arc out from the top of the jet; it vanishes where it lands.
export function dropPose(i, t) {
  const dt = t - GUSH.jet - (i % 4) * .05;
  const angle = i / GUSH.drops * Math.PI * 2 + i * .7;
  const speed = .55 + (i * 37 % 7) / 7 * .5;
  const air = Math.min(Math.max(dt, 0), LAND), y = .55 + 1.6 * air - 3.2 * air * air;
  const landed = dt >= LAND;
  return {r: .08 + speed * air, y: landed ? 0 : y, angle, alpha: dt <= 0 || landed ? 0 : 1, landed};
}

// The wet film on the floor: radius, one shiver as it settles, and alpha fading to nothing.
export function filmPose(t) {
  const u = clamp01((t - GUSH.jet - .45) / 1.2);
  const grow = 1 - (1 - u) ** 2;
  const tw = t - GUSH.jet - 1.2;
  const shiver = tw > 0 && tw < .3 ? Math.sin(tw / .3 * Math.PI * 4) * .03 * (1 - tw / .3) : 0;
  return {radius: .15 + .65 * grow + shiver, alpha: .55 * smooth(u * 4) * (1 - smooth((t - GUSH.total + .8) / .8))};
}

export function createFountainGush(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'FountainGush'; g.position.set(x, 0, z); parent.add(g);
    const mat = new THREE.MeshStandardMaterial({color: 0x10181c, roughness: .2, metalness: .2, transparent: true, opacity: 0});
    const geo = new THREE.SphereGeometry(1, 6, 4), cyl = new THREE.CylinderGeometry(1, 1, 1, 8), disc = new THREE.CircleGeometry(1, 20);
    const jet = new THREE.Mesh(cyl, mat); g.add(jet);
    const drops = Array.from({length: GUSH.drops}, () => { const m = new THREE.Mesh(geo, mat); m.scale.set(.035, .045, .035); g.add(m); return m; });
    const filmMat = mat.clone(); const film = new THREE.Mesh(disc, filmMat); film.rotation.x = -Math.PI / 2; film.position.y = .012; g.add(film);
    live.push({g, geos: [geo, cyl, disc], mats: [mat, filmMat], jet, drops, film, filmMat, mat, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const j = jetPose(e.t); e.jet.visible = j.alpha > .01;
    e.jet.scale.set(j.width, Math.max(j.height * 1.6, .001), j.width); e.jet.position.y = j.height * .8;
    e.mat.opacity = Math.max(j.alpha, 0) * .85;
    e.drops.forEach((m, i) => {
      const p = dropPose(i, e.t); m.visible = p.alpha > 0;
      m.position.set(Math.cos(p.angle) * p.r, p.y, Math.sin(p.angle) * p.r);
    });
    const f = filmPose(e.t); e.film.visible = f.alpha > .01; e.film.scale.setScalar(f.radius); e.filmMat.opacity = f.alpha;
    return e.t < GUSH.total;
  }
  function drop(e) { e.geos.forEach(x => x.dispose()); e.mats.forEach(x => x.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isGushMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
