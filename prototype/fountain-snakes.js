// "An endless stream of snakes pours forth!" A fountain quaffed or dipped wrong can spit out
// water moccasins. They do not leap or spring: they ooze up over the rim one after another,
// black and glistening, each drawn out as a slow S-curve of links that undulates as it crawls
// away across the floor, stops dead for a beat to taste the air, then slides into the dark
// and is gone. The real monsters arrive in the map frames; this is only the pour.
//
// live.js calls message(text, x, z) with every engine message and x, z the hero's square (the
// fountain is always the hero's own), update(dt) every frame and clear() on a level change.
// Poses are functions of t and return exactly to rest (nothing showing) at the end.

import {clamp01, smooth} from './fx-textures.js';

export const SNAKES = {count: 5, stagger: .22, crawl: 1.5, total: 3.2};
const LINKS = 7;
export const isSnakeMessage = text => /an endless stream of .* pours forth/i.test(text || '');

// Snake i at time t: how far it has crawled, a stop-dead pause, the sideways weave of each
// link (a wave running down the body) and its visibility (0 to 1).
export function snakePose(i, t) {
  const u = clamp01((t - i * SNAKES.stagger) / SNAKES.crawl);
  const pause = u > .55 && u < .7;
  const dist = .1 + .75 * (u < .55 ? u : pause ? .55 : .55 + (u - .7) * 1.2);
  const alpha = u <= 0 ? 0 : Math.min(1, u * 6) * (1 - smooth((u - .8) / .2));
  const weave = k => Math.sin(t * 7 + i * 1.7 - k * 1.1) * .05 * (pause ? .25 : 1) * (1 - k / LINKS * .3);
  // While it tastes the air the head rises off the floor, links nearest it lifting most, and
  // sinks back as it slides on. Zero outside the pause.
  const rear = k => pause ? Math.sin(Math.PI * (u - .55) / .15) * .09 * Math.max(0, 1 - k / 4) ** 2 * (k === 0 ? 1.3 : 1) : 0;
  return {dist, alpha, weave, rear, angle: i / SNAKES.count * Math.PI * 2 + i * .5};
}

export function createFountainSnakes(THREE, parent) {
  const live = [];
  function add(x, z) {
    const g = new THREE.Group(); g.name = 'FountainSnakes'; g.position.set(x, 0, z); parent.add(g);
    const geo = new THREE.SphereGeometry(1, 6, 4);
    const snakes = Array.from({length: SNAKES.count}, (_, i) => {
      const sg = new THREE.Group(); g.add(sg);
      const mat = new THREE.MeshStandardMaterial({color: 0x161a12, roughness: .35, metalness: .1, transparent: true, opacity: 0});
      const links = Array.from({length: LINKS}, (_, k) => {
        const m = new THREE.Mesh(geo, mat); const r = .05 - k * .004; m.scale.set(r, r * .8, r * 1.3); sg.add(m); return m;
      });
      return {sg, links, mat};
    });
    live.push({g, geo, snakes, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    e.snakes.forEach(({sg, links, mat}, i) => {
      const p = snakePose(i, e.t);
      sg.visible = p.alpha > .01;
      sg.rotation.y = p.angle; mat.opacity = p.alpha;
      links.forEach((m, k) => m.position.set(p.dist - k * .075, (k === 0 ? .045 : .03) + p.rear(k), p.weave(k)));
    });
    return e.t < SNAKES.total;
  }
  function drop(e) { e.geo.dispose(); e.snakes.forEach(s => s.mat.dispose()); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isSnakeMessage(text)) add(x, z); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
