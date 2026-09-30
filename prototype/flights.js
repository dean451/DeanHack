// Thrown objects in flight. The fx stream (fx.js) records a thrown or fired object as a
// flash sequence: its glyph drawn one cell per tick along the path. Map frames only show
// where it ended up, so this module flies a small model along those cells: arrows, bolts,
// darts and spears point where they're going on a shallow arc, daggers tumble end over
// end, shuriken spin flat, stones, gems and potions lob, and boulders roll along the floor.
//
// The shape comes from the object's class and the bridge's `shape` (from the weapon's
// skill), and the metal from its material, never from its identity: every appearance of a
// type flies the same way, so nothing unidentified shows through.
//
// flightShape(), flightsFromFx() and flightFrame() are pure; createFlights() draws them.

import {FX_TICK_MS} from './fx.js';

// Object classes and materials from include/objclass.h.
const WEAPON_CLASS = 2, POTION_CLASS = 8, COIN_CLASS = 12, GEM_CLASS = 13, ROCK_CLASS = 14, BALL_CLASS = 15,
  VENOM_CLASS = 17;
const WOOD = 8, BONE = 9, COPPER = 13, SILVER = 14, GOLD = 15, PLATINUM = 16, MITHRIL = 17, GLASS = 19,
  GEMSTONE = 20;

// How each shape flies: `spin` is 'point' (nose along the path), 'tumble' (end over end),
// 'flat' (spins about the vertical) or 'roll' (along the floor); `rate` is rad/s for tumble
// and flat. The arc's peak is `arc` + `perCell` per cell of path, capped at `maxArc`.
export const STYLES = {
  arrow: {spin: 'point', arc: .05, perCell: .02, maxArc: .3},
  bolt: {spin: 'point', arc: .04, perCell: .015, maxArc: .22},
  dart: {spin: 'point', arc: .06, perCell: .025, maxArc: .32},
  spear: {spin: 'point', arc: .08, perCell: .03, maxArc: .4},
  dagger: {spin: 'tumble', rate: 17, arc: .08, perCell: .03, maxArc: .4},
  weapon: {spin: 'tumble', rate: 12, arc: .1, perCell: .035, maxArc: .45},
  shuriken: {spin: 'flat', rate: 28, arc: .04, perCell: .015, maxArc: .22},
  stone: {spin: 'tumble', rate: 9, arc: .12, perCell: .05, maxArc: .6},
  gem: {spin: 'tumble', rate: 11, arc: .12, perCell: .05, maxArc: .6},
  coin: {spin: 'tumble', rate: 20, arc: .14, perCell: .05, maxArc: .6},
  flask: {spin: 'tumble', rate: 8, arc: .14, perCell: .06, maxArc: .7},
  ball: {spin: 'tumble', rate: 5, arc: .1, perCell: .04, maxArc: .45},
  lump: {spin: 'tumble', rate: 8, arc: .12, perCell: .05, maxArc: .6},
  boulder: {spin: 'roll', radius: .36},
};
// Height (tiles) the object leaves the thrower's hand at and comes down to at the last cell.
export const LAUNCH_Y = .85, LAND_Y = .4;
export const MAX_FLIGHTS = 12;

// The flight shape for an fx object effect, or null for things other modules draw (venom).
export function flightShape(effect) {
  if (effect?.kind !== 'object') return null;
  const c = effect.class;
  if (c === VENOM_CLASS) return null;
  if (c === WEAPON_CLASS) return STYLES[effect.shape] && effect.shape !== 'boulder' ? effect.shape : 'weapon';
  // Gems and worthless glass look alike until identified, so both fly as a 'gem'; grey
  // stones and rocks (mineral) fly as a 'stone'.
  if (c === GEM_CLASS) return effect.material === GLASS || effect.material === GEMSTONE ? 'gem' : 'stone';
  if (c === ROCK_CLASS) return 'boulder';
  if (c === BALL_CLASS) return 'ball';
  if (c === COIN_CLASS) return 'coin';
  if (c === POTION_CLASS) return 'flask';
  return 'lump';
}

// The metal of a weapon's business end, by material.
export function flightMetal(material) {
  if (material === WOOD) return 'wood';
  if (material === BONE) return 'bone';
  if (material === SILVER || material === PLATINUM || material === MITHRIL) return 'silver';
  if (material === COPPER || material === GOLD) return 'gold';
  return 'steel';
}

// Flights in a replayed fx timeline: [{seq, shape, metal, knots:[{x, z, t}], start, end}].
// A sprite is on a cell from `from` to `until`; the object reaches that cell at `until`, so
// it covers the first cell's tick coming from the thrower's side and lands on the last cell
// just as the sprite goes (when splash.js drops it into water). The launch point is one cell
// back along the first step; a one-cell flight with no direction just drops where it shows.
export function flightsFromFx(timeline) {
  const bySeq = new Map();
  for (const s of timeline?.sprites ?? []) {
    const shape = flightShape(s.effect);
    if (!shape || !Number.isFinite(s.x) || !Number.isFinite(s.z)) continue;
    if (!bySeq.has(s.seq)) bySeq.set(s.seq, []);
    bySeq.get(s.seq).push({s, shape});
  }
  const out = [];
  for (const [seq, list] of bySeq) {
    list.sort((a, b) => a.s.from - b.s.from);
    const cells = list.map(({s}) => s);
    const first = cells[0], next = cells.find(c => c.x !== first.x || c.z !== first.z);
    let lx = first.x, lz = first.z;
    if (next) {
      const dx = Math.sign(next.x - first.x), dz = Math.sign(next.z - first.z);
      lx -= dx; lz -= dz;
    }
    const knots = [{x: lx, z: lz, t: first.from}];
    for (const c of cells) knots.push({x: c.x, z: c.z, t: Math.max(c.until, knots[knots.length - 1].t)});
    const last = list[list.length - 1];
    const end = knots[knots.length - 1].t;
    if (!(end > first.from)) continue;
    out.push({seq, shape: last.shape, metal: flightMetal(last.s.effect.material), knots, start: first.from, end});
  }
  return out;
}

const pathLength = knots => {
  let L = 0;
  for (let i = 1; i < knots.length; i++) L += Math.hypot(knots[i].x - knots[i - 1].x, knots[i].z - knots[i - 1].z);
  return L;
};

// Where a flight is at t ms into the replay, or null before it starts or once it has landed:
// {x, z} in (fractional) map cells, y in tiles, yaw (about +y, 0 = facing +z), pitch (nose up
// is positive) and spin (radians about the style's axis).
export function flightFrame(flight, t) {
  if (!flight || !(t >= flight.start) || t >= flight.end) return null;
  const S = STYLES[flight.shape] ?? STYLES.lump;
  const k = flight.knots;
  let i = 1;
  while (i < k.length - 1 && t >= k[i].t) i++;
  const a = k[i - 1], b = k[i];
  const u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1;
  const x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u;
  let dx = b.x - a.x, dz = b.z - a.z;
  if (!dx && !dz) { const f = k[0], l = k[k.length - 1]; dx = l.x - f.x; dz = l.z - f.z; }
  const yaw = dx || dz ? Math.atan2(dx, dz) : 0;
  const L = pathLength(k);
  const sec = (t - flight.start) / 1000;
  if (S.spin === 'roll') {
    // Rolls along the floor: the distance covered so far over the radius.
    let run = 0;
    for (let j = 1; j < i; j++) run += Math.hypot(k[j].x - k[j - 1].x, k[j].z - k[j - 1].z);
    run += Math.hypot(x - a.x, z - a.z);
    return {x, z, y: S.radius, yaw, pitch: 0, spin: run / S.radius};
  }
  const K = (t - flight.start) / (flight.end - flight.start);
  const arc = Math.min(S.maxArc, S.arc + S.perCell * L);
  const y = LAUNCH_Y + (LAND_Y - LAUNCH_Y) * K + arc * 4 * K * (1 - K);
  const dy = (LAND_Y - LAUNCH_Y) + arc * 4 * (1 - 2 * K);
  const pitch = L > 0 ? Math.atan2(dy, L) : -Math.PI / 2;
  const spin = S.spin === 'point' ? 0 : S.rate * sec;
  return {x, z, y, yaw, pitch, spin};
}

// Draws flights. play(timeline) queues a replay's flights, update(dt, origin) moves them and
// returns the number in the air, clear() drops them all.
export function createFlights(THREE, parent) {
  const mats = {
    wood: new THREE.MeshStandardMaterial({color: 0x7a5534, roughness: .85}),
    shaft: new THREE.MeshStandardMaterial({color: 0x9a7448, roughness: .8}),
    fletch: new THREE.MeshStandardMaterial({color: 0xd8d0c0, roughness: .9, side: THREE.DoubleSide}),
    steel: new THREE.MeshStandardMaterial({color: 0xc8d2d8, metalness: .8, roughness: .28}),
    silver: new THREE.MeshStandardMaterial({color: 0xeef2f6, metalness: .9, roughness: .18}),
    gold: new THREE.MeshStandardMaterial({color: 0xd8a84e, metalness: .85, roughness: .3}),
    bone: new THREE.MeshStandardMaterial({color: 0xe6dcc0, roughness: .7}),
    leather: new THREE.MeshStandardMaterial({color: 0x4a3024, roughness: .9}),
    stone: new THREE.MeshStandardMaterial({color: 0x8a8580, roughness: .95, flatShading: true}),
    glass: new THREE.MeshStandardMaterial({color: 0xcfe4ee, metalness: .1, roughness: .08, transparent: true, opacity: .75}),
    iron: new THREE.MeshStandardMaterial({color: 0x45484c, metalness: .7, roughness: .45}),
    lump: new THREE.MeshStandardMaterial({color: 0xb09a74, roughness: .7}),
  };
  const geos = [];
  const geo = g => (geos.push(g), g);
  // Models point along +z with their centre of mass near the origin.
  const along = (g, z = 0) => geo(g.rotateX(Math.PI / 2).translate(0, 0, z));
  const shaftGeo = (r, len, z = 0) => along(new THREE.CylinderGeometry(r, r, len, 6), z);
  const headGeo = (r, h, z, seg = 4) => along(new THREE.ConeGeometry(r, h, seg), z);
  const vane = (w, len, z) => geo(new THREE.BoxGeometry(.002, w, len).translate(0, w / 2 + .008, z));

  function fletched(root, {len, r, head, vanes, vaneW, vaneLen}, metal) {
    root.add(new THREE.Mesh(shaftGeo(r, len), mats.shaft));
    root.add(new THREE.Mesh(headGeo(head[0], head[1], len / 2 + head[1] / 2), mats[metal]));
    const v = vane(vaneW, vaneLen, -len / 2 + vaneLen / 2 + .01);
    for (let j = 0; j < vanes; j++) {
      const m = new THREE.Mesh(v, mats.fletch);
      m.rotation.z = j * Math.PI * 2 / vanes;
      root.add(m);
    }
  }
  const build = {
    arrow: (r, m) => fletched(r, {len: .44, r: .011, head: [.026, .07], vanes: 3, vaneW: .03, vaneLen: .09}, m),
    bolt: (r, m) => fletched(r, {len: .3, r: .015, head: [.032, .06], vanes: 2, vaneW: .028, vaneLen: .07}, m),
    dart: (r, m) => fletched(r, {len: .18, r: .01, head: [.018, .06], vanes: 3, vaneW: .025, vaneLen: .06}, m),
    spear(r, m) {
      r.add(new THREE.Mesh(shaftGeo(.017, .9, -.08), mats.wood));
      const head = new THREE.Mesh(headGeo(.038, .17, .455), mats[m]);
      head.scale.set(1, .35, 1);
      r.add(head);
    },
    dagger(r, m) {
      const blade = new THREE.Mesh(headGeo(.03, .22, .07), mats[m === 'wood' ? 'steel' : m]);
      blade.scale.set(1, .3, 1);
      r.add(blade);
      r.add(new THREE.Mesh(geo(new THREE.BoxGeometry(.1, .018, .02).translate(0, 0, -.045)), mats.gold));
      r.add(new THREE.Mesh(shaftGeo(.014, .09, -.1), mats.leather));
    },
    weapon(r, m) {
      r.add(new THREE.Mesh(geo(new THREE.BoxGeometry(.03, .03, .3)), mats[m]));
      r.add(new THREE.Mesh(geo(new THREE.BoxGeometry(.09, .02, .02).translate(0, 0, -.06)), mats.leather));
    },
    shuriken(r, m) {
      const arm = geo(new THREE.BoxGeometry(.17, .006, .03));
      for (let j = 0; j < 2; j++) {
        const s = new THREE.Mesh(arm, mats[m]);
        s.rotation.y = j * Math.PI / 2;
        r.add(s);
        const d = new THREE.Mesh(arm, mats[m]);
        d.rotation.y = Math.PI / 4 + j * Math.PI / 2;
        d.scale.set(.7, 1, .8);
        r.add(d);
      }
    },
    stone: r => r.add(new THREE.Mesh(geo(new THREE.IcosahedronGeometry(.055, 0)), mats.stone)),
    gem: r => r.add(new THREE.Mesh(geo(new THREE.OctahedronGeometry(.045, 0)), mats.glass)),
    coin: r => r.add(new THREE.Mesh(geo(new THREE.CylinderGeometry(.035, .035, .008, 12)), mats.gold)),
    flask(r) {
      r.add(new THREE.Mesh(geo(new THREE.SphereGeometry(.05, 10, 8)), mats.glass));
      r.add(new THREE.Mesh(geo(new THREE.CylinderGeometry(.016, .018, .05, 8).translate(0, .06, 0)), mats.glass));
    },
    ball: r => r.add(new THREE.Mesh(geo(new THREE.SphereGeometry(.12, 12, 10)), mats.iron)),
    boulder: r => r.add(new THREE.Mesh(geo(new THREE.IcosahedronGeometry(STYLES.boulder.radius, 1)), mats.stone)),
    lump: r => r.add(new THREE.Mesh(geo(new THREE.BoxGeometry(.09, .07, .11)), mats.lump)),
  };
  const templates = new Map();
  function model(shape, metal) {
    const key = `${shape}:${metal}`;
    if (!templates.has(key)) {
      const g = new THREE.Group();
      (build[shape] ?? build.lump)(g, metal);
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      templates.set(key, g);
    }
    // clone() shares the geometries and materials; the outer group carries yaw and pitch,
    // the inner one the spin.
    const outer = new THREE.Group();
    outer.rotation.order = 'YXZ';
    const inner = templates.get(key).clone();
    outer.add(inner);
    outer.userData.part = 'flight';
    return {outer, inner};
  }

  const flights = [];
  let now = 0;
  function play(timeline) {
    const found = flightsFromFx(timeline);
    for (const f of found) {
      const {outer, inner} = model(f.shape, f.metal);
      outer.visible = false;
      parent.add(outer);
      flights.push({f, t0: now, outer, inner});
      while (flights.length > MAX_FLIGHTS) parent.remove(flights.shift().outer);
    }
    return found;
  }
  function update(dt, origin) {
    now += (dt || 0) * 1000;
    const ox = origin?.x ?? 0, oz = origin?.z ?? 0;
    for (let i = flights.length - 1; i >= 0; i--) {
      const fl = flights[i], t = now - fl.t0;
      if (t >= fl.f.end) { parent.remove(fl.outer); flights.splice(i, 1); continue; }
      const fr = flightFrame(fl.f, t);
      fl.outer.visible = !!fr;
      if (!fr) continue;
      fl.outer.position.set(fr.x - ox, fr.y, fr.z - oz);
      fl.outer.rotation.set(-fr.pitch, fr.yaw, 0);
      const style = STYLES[fl.f.shape]?.spin;
      fl.inner.rotation.set(0, 0, 0);
      if (style === 'tumble' || style === 'roll') fl.inner.rotation.x = fr.spin;
      else if (style === 'flat') fl.inner.rotation.y = fr.spin;
      if (fl.f.shape === 'stone' || fl.f.shape === 'gem' || fl.f.shape === 'lump') fl.inner.rotation.z = fr.spin * .6;
    }
    return flights.length;
  }
  function clear() {
    for (const fl of flights) parent.remove(fl.outer);
    flights.length = 0;
  }
  function dispose() {
    clear();
    for (const g of geos) g.dispose();
    for (const m of Object.values(mats)) m.dispose();
  }
  return {play, update, clear, dispose, get count() { return flights.length; }};
}
