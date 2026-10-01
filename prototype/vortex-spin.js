import * as THREE from 'three';
import {updateVortexFx} from './vortex-fx.js';

// Vortices that whirl (creature animation queue, item 1). creatures.js vortex() builds a stack of
// tilted tori (the funnel) with debris bits between them, or a heap of puffs for the fog cloud,
// and live.js only gave them the generic hover bob, so nothing turned. Now:
// - every ring precesses round the funnel's axis at its own speed, fastest at the bottom, so the
//   tilts and offsets chase each other up the column like a twisting funnel;
// - the debris spirals up the funnel, is flung out at the top and drops back to the floor, over
//   and over, each bit on its own phase, tumbling as it goes (ice shards glint as they turn);
// - the column leans into its travel while it moves and staggers a little on the spot;
// - the energy and fire cores flicker in size; the ground shadow breathes;
// - the fog cloud doesn't spin: its puffs billow in and out and drift slowly round each other.
// When it dies the spin runs down to the next full turn and the debris settles back, so the model
// ends at its exact rest pose (the death fade in deaths.js does the dissipating).
//
// Parts are found in the model, not given handles: rings are TorusGeometry children of the body,
// puffs are the cloud's transparent spheres, debris is any other body mesh but the core. All are
// written absolutely from a stored rest pose; the body's lean is an offset taken back each frame,
// so live.js's hover bob and the action layer still stack. gait.js calls updateVortexSpin.
// Each kind's grit, frost, arcs, steam, embers or mist come from vortex-fx.js, called at the end.

export const VORTEX = {
  // spin: base precession speed (rad/s at the funnel's top; the bottom ring turns BOTTOM times faster);
  // rise: seconds for a bit of debris to climb the funnel and fall back
  'dust vortex': {spin: 2.4, rise: 2.6},
  'ice vortex': {spin: 2.6, rise: 2.9, glint: true},
  'energy vortex': {spin: 3.6, rise: 1.9},
  'steam vortex': {spin: 1.9, rise: 3.2},
  'fire vortex': {spin: 3.3, rise: 2.0},
  'fog cloud': {spin: .22, rise: 0, cloud: true},
};
export const SPIN = {
  bottom: 2.2, // the lowest ring turns this many times faster than the top one
  wobble: .5, // ring speed jitter, so neighbours drift in and out of step
  climb: .72, fling: .12, // debris: share of the cycle spent climbing; how far it's flung out at the top
  lean: .2, // forward lean while travelling (rad)
  stagger: .035, staggerRate: 1.7, // side-to-side lurch on the spot (rad)
  billow: .14, billowRate: .9, // fog puffs swell and shrink by this share
  flicker: .16, // core size flicker
  breathe: .12, // ground shadow swell
  settle: .45, // dead: the spin keeps at least this share of its speed while it runs down to rest
};
const EASE = 4, WALK_IN = 5, WALK_OUT = 3, TAU = Math.PI * 2;
const Y = new THREE.Vector3(0, 1, 0);

export const whirls = a => !!(a && !a.asset && a.body && VORTEX[a.species]);

const approach = (v, target, rate, dt) => target + (v - target) * Math.exp(-rate * dt);

// A bit of debris at cycle phase u (0..1) for a funnel spanning y0..y1 with radius r0 at the bottom
// and r1 at the top, `angle` round the axis. Climbs on a widening spiral, then is flung out and falls.
export function debrisAt(u, angle, y0, y1, r0, r1, fling = SPIN.fling, climb = SPIN.climb) {
  let y, r;
  if (u < climb) {
    const k = u / climb, e = k * k * (3 - 2 * k) * .35 + k * .65;
    y = y0 + (y1 - y0) * e; r = r0 + (r1 - r0) * e;
  } else {
    const k = (u - climb) / (1 - climb);
    // a short toss outward and up, then a fall back to the floor, closing in to the base radius
    y = y1 + (y1 - y0) * .12 * Math.sin(k * Math.PI * .6) - (y1 - y0) * (1.12 * k * k);
    y = Math.max(y0, Math.min(y1 + (y1 - y0) * .1, y));
    r = r1 + fling * Math.sin(k * Math.PI) - (r1 - r0) * k;
  }
  return {x: Math.cos(angle) * r, y, z: Math.sin(angle) * r};
}

function setup(a) {
  const V = VORTEX[a.species], rings = [], puffs = [], debris = [];
  for (const m of a.body.children) {
    if (!m.isMesh || m === a.core) continue;
    const rest = {m, pos: m.position.clone(), quat: m.quaternion.clone(), scale: m.scale.clone(), phi: 0};
    if (m.geometry?.type === 'TorusGeometry') rings.push(rest);
    else if (V.cloud && m.material?.transparent) puffs.push(rest);
    else debris.push(rest);
  }
  const ys = [...rings, ...puffs].map(r => r.pos.y), lo = Math.min(...ys), hi = Math.max(...ys);
  for (const r of [...rings, ...puffs]) r.h = hi > lo ? (r.pos.y - lo) / (hi - lo) : 0;
  // the funnel's extent for the debris path, from the debris' own rest spread
  let y0 = Infinity, y1 = -Infinity, r0 = Infinity, r1 = 0;
  for (const d of debris) {
    const r = Math.hypot(d.pos.x, d.pos.z);
    y0 = Math.min(y0, d.pos.y); y1 = Math.max(y1, d.pos.y); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
  }
  debris.forEach((d, i) => {
    d.angle0 = Math.atan2(d.pos.z, d.pos.x);
    // start each bit where its rest height sits on the climb, so the first frame doesn't jump far
    d.u = y1 > y0 ? ((d.pos.y - y0) / (y1 - y0)) * SPIN.climb : i / Math.max(1, debris.length);
    d.rest = d.m.rotation.clone();
  });
  const ground = a.g.children.find(m => m.isMesh && m.geometry?.type === 'CircleGeometry');
  const core = a.core || a.g.userData.core || null;
  const scale = (a.body.children.find(m => m.geometry?.type === 'TorusGeometry')?.geometry.parameters?.radius || .07) / .07;
  return {
    V, rings, puffs, debris, path: {y0, y1, r0, r1}, fling: SPIN.fling * Math.min(1.2, scale),
    ground, groundScale: ground?.scale.clone(), core, coreScale: core?.scale.clone(),
    life: 0, walk: 0, t: 0, lean: 0, roll: 0, spin: 0,
  };
}

const q = new THREE.Quaternion(), e = new THREE.Euler();

// Call once a frame, after live.js's hover bob (gait.js does). Returns the state, or null.
export function updateVortexSpin(a, dt, walking) {
  if (!whirls(a)) return null;
  const st = a.vortexSpin || (a.vortexSpin = setup(a));
  const {V} = st, dead = !!a.actions?.dead;
  dt = Math.min(Math.max(dt || 0, 0), .1);
  st.t += dt;
  st.life = approach(st.life, dead ? 0 : 1, EASE, dt);
  if (st.life < 1e-3) st.life = 0;
  st.walk = approach(st.walk, walking && !dead ? 1 : 0, walking ? WALK_IN : WALK_OUT, dt);
  const w = st.life, t = st.t;

  // take back last frame's lean, then lean into travel and lurch about
  a.body.rotation.x -= st.lean; a.body.rotation.z -= st.roll;
  st.lean = SPIN.lean * st.walk * w;
  st.roll = SPIN.stagger * w * (1 - .5 * st.walk) * Math.sin(t * SPIN.staggerRate + 1.3 * Math.sin(t * .6));
  a.body.rotation.x += st.lean; a.body.rotation.z += st.roll;

  // rings (and fog puffs) turn round the axis; a dead one runs down to its next full turn
  // (fog puffs drift back the short way instead)
  const turn = (r, speed, drift) => {
    if (dead && drift) {
      r.phi = approach(r.phi, r.phi > Math.PI ? TAU : 0, 2.5, dt);
      if (r.phi < 1e-4 || r.phi > TAU - 1e-4) r.phi = 0;
    } else if (dead) {
      if (r.phi > 0) {
        r.phi += Math.max(speed * Math.max(w, SPIN.settle), 1.2) * dt;
        if (r.phi >= TAU) r.phi = 0;
      }
    } else r.phi = (r.phi + speed * dt) % TAU;
    q.setFromAxisAngle(Y, r.phi);
    r.m.quaternion.copy(r.quat).premultiply(q);
    r.m.position.copy(r.pos).applyQuaternion(q);
  };
  st.rings.forEach((r, i) => {
    const speed = V.spin * (1 + (SPIN.bottom - 1) * (1 - r.h)) * (1 + SPIN.wobble * .3 * Math.sin(t * .7 + i * 2.1));
    turn(r, speed);
  });
  st.puffs.forEach((r, i) => {
    turn(r, V.spin * (1 + .4 * Math.sin(i * 1.7)), true);
    const b = 1 + SPIN.billow * w * Math.sin(t * SPIN.billowRate * (1 + i * .13) + i * 2.4);
    r.m.scale.copy(r.scale).multiplyScalar(b);
  });

  // debris spirals up, is flung out and falls; it eases back to rest as the vortex dies
  const {y0, y1, r0, r1} = st.path;
  if (st.debris.length && y1 > y0 && V.rise > 0) {
    st.debris.forEach((d, i) => {
      if (!dead) d.u = (d.u + dt / (V.rise * (1 + .15 * Math.sin(i * 2.3)))) % 1;
      d.spun = (d.spun || 0) + V.spin * SPIN.bottom * .55 * dt * Math.max(w, .05);
      const p = debrisAt(d.u, d.angle0 + d.spun, y0, y1, r0, r1, st.fling);
      d.m.position.set(d.pos.x + (p.x - d.pos.x) * w, d.pos.y + (p.y - d.pos.y) * w, d.pos.z + (p.z - d.pos.z) * w);
      const tumble = (V.glint ? 7 : 4) * t + i;
      e.set(d.rest.x + Math.sin(tumble) * 1.2 * w, d.rest.y + (tumble * .5 % TAU) * w, d.rest.z + Math.cos(tumble * .7) * .8 * w);
      if (w === 0) e.copy(d.rest);
      d.m.rotation.copy(e);
    });
  }

  if (st.core) {
    const f = 1 + SPIN.flicker * w * (.6 * Math.sin(t * 23) + .4 * Math.sin(t * 37 + 1.1));
    st.core.scale.copy(st.coreScale).multiplyScalar(f);
  }
  if (st.ground) {
    const g = 1 + SPIN.breathe * w * Math.sin(t * V.spin * .9);
    st.ground.scale.copy(st.groundScale).multiplyScalar(g);
  }
  updateVortexFx(a, dt, walking);
  return st;
}
