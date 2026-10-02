// Thrown objects in flight. The fx stream (fx.js) records a thrown or fired object as a
// flash sequence: its glyph drawn one cell per tick along the path. Map frames only show
// where it ended up, so this module flies a small model along those cells: arrows and bolts
// (the real arrow.js models), darts and spears point where they're going on a shallow arc (a dart rolling on its
// flights), daggers tumble end over
// end, shuriken spin flat, stones, gems and potions lob, and boulders roll along the floor.
// An aklys (the real aklys.js club) tumbles end over end with its rawhide thong paid out
// behind it, whipping and sagging along its path (thongTrail).
// A boomerang (the bridge's cmap `boomerang` sequence, not an object) whirls flat along its
// looping path, banked into the turn, and comes back to the thrower's hand.
//
// The shape comes from the object's class and the bridge's `shape` (from the weapon's
// skill), and the metal from its material, never from its identity: every appearance of a
// type flies the same way, so nothing unidentified shows through. Arrows also take their
// look from the glyph's appearance ("runed arrow"), which is what the map shows anyway.
//
// flightShape(), flightsFromFx() and flightFrame() are pure; createFlights() draws them.

import {FX_TICK_MS} from './fx.js';
import {buildShuriken, SHURIKEN_CENTER} from './shuriken.js';
import {buildDart} from './dart.js';
import {buildBoomerang} from './boomerang.js';
import {buildArrow} from './arrow.js';
import {buildAklys} from './aklys.js';

// Object classes and materials from include/objclass.h.
const WEAPON_CLASS = 2, POTION_CLASS = 8, COIN_CLASS = 12, GEM_CLASS = 13, ROCK_CLASS = 14, BALL_CLASS = 15,
  VENOM_CLASS = 17;
const WOOD = 8, BONE = 9, COPPER = 13, SILVER = 14, GOLD = 15, PLATINUM = 16, MITHRIL = 17, GLASS = 19,
  GEMSTONE = 20;

// How each shape flies: `spin` is 'point' (nose along the path), 'tumble' (end over end),
// 'flat' (spins about the vertical) or 'roll' (along the floor); `rate` is rad/s for tumble
// and flat. The arc's peak is `arc` + `perCell` per cell of path, capped at `maxArc`.
// A flat spinner is thrown banked: it leans `bank` rad about its line of flight, and the lean
// wobbles by `wobble` at `wobbleRate` rad/s, so the spinning face catches the light.
// A pointed shape with `roll` turns that many rad/s about its own length, as fletching spins it.
// One with `wag` leaves the string fishtailing: its nose swings side to side by up to `wag`
// rad at `wagRate` rad/s, dying away at `wagDamp` per second (a shot arrow flexing round the
// bow until its fletching steadies it). The wag is 0 at release, so it starts on the line.
// A `curve` shape follows a smooth spline through its cells instead of straight hops, banks
// into its turn (the lean's sign follows the path) and spins the way it turns.
export const STYLES = {
  arrow: {spin: 'point', roll: 8, wag: .07, wagRate: 46, wagDamp: 9, arc: .05, perCell: .02, maxArc: .3},
  bolt: {spin: 'point', roll: 5, arc: .04, perCell: .015, maxArc: .22},
  dart: {spin: 'point', roll: 16, arc: .06, perCell: .025, maxArc: .32},
  spear: {spin: 'point', arc: .08, perCell: .03, maxArc: .4},
  dagger: {spin: 'tumble', rate: 17, arc: .08, perCell: .03, maxArc: .4},
  aklys: {spin: 'tumble', rate: 10, arc: .1, perCell: .035, maxArc: .45},
  weapon: {spin: 'tumble', rate: 12, arc: .1, perCell: .035, maxArc: .45},
  shuriken: {spin: 'flat', rate: 28, arc: .04, perCell: .015, maxArc: .22, bank: .22, wobble: .07, wobbleRate: 14},
  boomerang: {spin: 'flat', rate: 24, arc: .1, perCell: 0, maxArc: .1, bank: .38, wobble: .06, wobbleRate: 9, curve: true},
  stone: {spin: 'tumble', rate: 9, arc: .12, perCell: .05, maxArc: .6},
  gem: {spin: 'tumble', rate: 11, arc: .12, perCell: .05, maxArc: .6},
  coin: {spin: 'tumble', rate: 20, arc: .14, perCell: .05, maxArc: .6},
  flask: {spin: 'tumble', rate: 8, arc: .14, perCell: .06, maxArc: .7},
  ball: {spin: 'tumble', rate: 5, arc: .1, perCell: .04, maxArc: .45},
  lump: {spin: 'tumble', rate: 8, arc: .12, perCell: .05, maxArc: .6},
  boulder: {spin: 'roll', radius: .36},
};
// The arrow.js name an arrow or bolt flies as, from what the glyph shows: the appearance
// ("crude arrow") if the type has one, else the bolt shape or the silver of a silver arrow.
// Other shapes have no look.
export function flightLook(effect, shape) {
  if (shape === 'bolt') return 'crossbow bolt';
  if (shape !== 'arrow') return '';
  if (effect?.appearance) return effect.appearance;
  return effect?.material === SILVER ? 'silver arrow' : 'arrow';
}
// Height (tiles) the object leaves the thrower's hand at and comes down to at the last cell.
export const LAUNCH_Y = .85, LAND_Y = .4;
export const MAX_FLIGHTS = 12;
// boomhit() (zap.c) draws at most 9 cells of its loop; on the 10th step it is back on the
// thrower, who catches it (or is hit). Either way it flies home.
export const BOOMERANG_LOOP = 9;

// The flight shape for an fx object effect, or null for things other modules draw (venom).
export function flightShape(effect) {
  if (effect?.kind === 'boomerang') return 'boomerang';
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

// Which way a path turns overall: +1 toward +x when heading +z (counterclockwise seen from
// above), -1 the other way, 0 if straight.
function pathTurn(knots) {
  let sum = 0;
  for (let i = 2; i < knots.length; i++) {
    const ax = knots[i - 1].x - knots[i - 2].x, az = knots[i - 1].z - knots[i - 2].z;
    const bx = knots[i].x - knots[i - 1].x, bz = knots[i].z - knots[i - 1].z;
    sum += az * bx - ax * bz;
  }
  return Math.sign(sum);
}

// Flights in a replayed fx timeline: [{seq, shape, metal, look, knots:[{x, z, t}], start, end}].
// A boomerang also has `turn` (pathTurn) and, when it made the whole loop and came back,
// `endY` at the hand and a last knot on the thrower one tick after its last cell.
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
    const extra = {};
    if (last.shape === 'boomerang') {
      const tail = cells[cells.length - 1];
      if (cells.length >= BOOMERANG_LOOP && Math.max(Math.abs(tail.x - lx), Math.abs(tail.z - lz)) === 1) {
        knots.push({x: lx, z: lz, t: knots[knots.length - 1].t + FX_TICK_MS});
        extra.endY = LAUNCH_Y;
      }
      extra.turn = pathTurn(knots);
    }
    const end = knots[knots.length - 1].t;
    if (!(end > first.from)) continue;
    out.push({seq, shape: last.shape, metal: flightMetal(last.s.effect?.material), look: flightLook(last.s.effect, last.shape), knots, start: first.from, end, ...extra});
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
// is positive), spin (radians about the style's axis; a pointed shape's roll about its
// length) and bank (lean about the line of flight).
export function flightFrame(flight, t) {
  if (!flight || !(t >= flight.start) || t >= flight.end) return null;
  const S = STYLES[flight.shape] ?? STYLES.lump;
  const k = flight.knots;
  let i = 1;
  while (i < k.length - 1 && t >= k[i].t) i++;
  const a = k[i - 1], b = k[i];
  const u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1;
  let x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u;
  let dx = b.x - a.x, dz = b.z - a.z;
  if (S.curve) {
    // Uniform Catmull-Rom through the cells, the ends held: passes through every knot.
    const p0 = k[Math.max(0, i - 2)], p3 = k[Math.min(k.length - 1, i + 1)];
    const cr = (q0, q1, q2, q3) => .5 * (2 * q1 + (q2 - q0) * u + (2 * q0 - 5 * q1 + 4 * q2 - q3) * u * u
      + (3 * q1 - q0 - 3 * q2 + q3) * u * u * u);
    const dcr = (q0, q1, q2, q3) => .5 * ((q2 - q0) + 2 * (2 * q0 - 5 * q1 + 4 * q2 - q3) * u
      + 3 * (3 * q1 - q0 - 3 * q2 + q3) * u * u);
    x = cr(p0.x, a.x, b.x, p3.x); z = cr(p0.z, a.z, b.z, p3.z);
    const tx = dcr(p0.x, a.x, b.x, p3.x), tz = dcr(p0.z, a.z, b.z, p3.z);
    if (tx || tz) { dx = tx; dz = tz; }
  }
  if (!dx && !dz) { const f = k[0], l = k[k.length - 1]; dx = l.x - f.x; dz = l.z - f.z; }
  let yaw = dx || dz ? Math.atan2(dx, dz) : 0;
  const L = pathLength(k);
  const sec = (t - flight.start) / 1000;
  if (S.wag) yaw += S.wag * Math.exp(-S.wagDamp * sec) * Math.sin(S.wagRate * sec);
  if (S.spin === 'roll') {
    // Rolls along the floor: the distance covered so far over the radius.
    let run = 0;
    for (let j = 1; j < i; j++) run += Math.hypot(k[j].x - k[j - 1].x, k[j].z - k[j - 1].z);
    run += Math.hypot(x - a.x, z - a.z);
    return {x, z, y: S.radius, yaw, pitch: 0, spin: run / S.radius, bank: 0};
  }
  const K = (t - flight.start) / (flight.end - flight.start);
  const arc = Math.min(S.maxArc, S.arc + S.perCell * L);
  const endY = flight.endY ?? LAND_Y;
  const y = LAUNCH_Y + (endY - LAUNCH_Y) * K + arc * 4 * K * (1 - K);
  const dy = (endY - LAUNCH_Y) + arc * 4 * (1 - 2 * K);
  const pitch = L > 0 ? Math.atan2(dy, L) : -Math.PI / 2;
  // A curving shape spins and leans the way its path turns (a lean toward +x is negative z).
  const turn = S.curve ? flight.turn || 1 : 1;
  const spin = (S.spin === 'point' ? S.roll ?? 0 : S.rate) * sec * turn;
  const bank = S.bank ? (S.bank + S.wobble * Math.sin(S.wobbleRate * sec)) * (S.curve ? -turn : 1) : 0;
  return {x, z, y, yaw, pitch, spin, bank};
}

// The aklys's thong in flight: THONG_LEN tiles of cord in THONG_SEGS links. It trails back
// along the path the club has flown (so it curves with the arc), sags toward its free end
// and whips side to side in a wave running down its length; near the launch the unpaid
// rest of it is still bunched at the hand.
export const THONG_LEN = .6, THONG_SEGS = 10;
const THONG_SAG = .09, THONG_WHIP = .07, THONG_WHIP_RATE = 26, THONG_WAVE = 4.5, THONG_STEP_MS = 4;
// THONG_SEGS + 1 points {x, z (map cells), y (tiles)}, from the club's centre at t back to
// the free end, or null when the flight isn't in the air.
export function thongTrail(flight, t) {
  const here = flightFrame(flight, t);
  if (!here) return null;
  const seg = THONG_LEN / THONG_SEGS, sec = (t - flight.start) / 1000;
  const px = Math.cos(here.yaw), pz = -Math.sin(here.yaw);
  const pts = [{x: here.x, y: here.y, z: here.z}];
  let prev = here, run = 0, tt = t;
  while (pts.length <= THONG_SEGS) {
    const back = Math.max(flight.start, tt - THONG_STEP_MS);
    const fr = back < tt ? flightFrame(flight, back) : null;
    if (!fr) break;
    const d = Math.hypot(fr.x - prev.x, fr.y - prev.y, fr.z - prev.z);
    // Drop a point at each whole link along the way back.
    while (pts.length <= THONG_SEGS && run + d >= seg * pts.length) {
      const u = d > 0 ? (seg * pts.length - run) / d : 0;
      pts.push({x: prev.x + (fr.x - prev.x) * u, y: prev.y + (fr.y - prev.y) * u, z: prev.z + (fr.z - prev.z) * u});
    }
    run += d; prev = fr; tt = back;
  }
  while (pts.length <= THONG_SEGS) pts.push({x: prev.x, y: prev.y, z: prev.z});
  for (let i = 1; i < pts.length; i++) {
    const s = i / THONG_SEGS, w = THONG_WHIP * s * Math.sin(THONG_WHIP_RATE * sec - THONG_WAVE * s);
    pts[i].x += px * w; pts[i].z += pz * w;
    pts[i].y = Math.max(.02, pts[i].y - THONG_SAG * s ** 1.5);
  }
  return pts;
}

// Draws flights. play(timeline) queues a replay's flights, update(dt, origin) moves them and
// returns the number in the air, clear() drops them all.
export function createFlights(THREE, parent) {
  const mats = {
    wood: new THREE.MeshStandardMaterial({color: 0x7a5534, roughness: .85}),
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
  const geos = [], extraMats = [];
  const geo = g => (geos.push(g), g);
  // Models point along +z with their centre of mass near the origin.
  const along = (g, z = 0) => geo(g.rotateX(Math.PI / 2).translate(0, 0, z));
  const shaftGeo = (r, len, z = 0) => along(new THREE.CylinderGeometry(r, r, len, 6), z);
  const headGeo = (r, h, z, seg = 4) => along(new THREE.ConeGeometry(r, h, seg), z);

  // A held model (the hand at the origin, the point up +y) centred on its length with the
  // point turned to +z.
  function pointed(root, held) {
    const box = new THREE.Box3();
    for (const mesh of held.children) {
      mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox);
    }
    const mid = (box.min.y + box.max.y) / 2;
    for (const mesh of [...held.children]) {
      geo(mesh.geometry.translate(0, -mid, 0).rotateX(Math.PI / 2));
      root.add(mesh);
    }
    return mid;
  }
  function arrow(root, look) {
    const held = new THREE.Group();
    buildArrow(held, look);
    extraMats.push(...held.userData.extraMaterial);
    root.userData.arrow = held.userData.arrow;
    pointed(root, held);
  }
  const build = {
    // The real arrow.js arrow or bolt, in the look the glyph shows (flightLook); its iron
    // and wood are its own, so it ignores the metal.
    arrow: (r, m, look) => arrow(r, look || 'arrow'),
    bolt: r => arrow(r, 'crossbow bolt'),
    dart(r) {
      // The held model (dart.js); darts are iron, so it ignores the metal.
      const held = new THREE.Group();
      buildDart(held);
      extraMats.push(...held.userData.extraMaterial);
      pointed(r, held);
    },
    aklys(r) {
      // The held model (aklys.js); its iron eye (where the thong is tied) sits at y -.127.
      const held = new THREE.Group();
      buildAklys(held);
      extraMats.push(...held.userData.extraMaterial);
      r.userData.thongEye = new THREE.Vector3(0, 0, -.127 - pointed(r, held));
    },
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
    boomerang(r) {
      // The held model (boomerang.js) lies flat in xy with the hand at the origin; centre it
      // on its bounds (near where it whirls about) and lay it flat in xz.
      const held = new THREE.Group();
      buildBoomerang(held);
      extraMats.push(...held.userData.extraMaterial);
      const box = new THREE.Box3();
      for (const mesh of held.children) {
        mesh.geometry.computeBoundingBox();
        box.union(mesh.geometry.boundingBox);
      }
      const mid = box.getCenter(new THREE.Vector3());
      for (const mesh of [...held.children]) {
        geo(mesh.geometry.translate(-mid.x, -mid.y, -mid.z).rotateX(-Math.PI / 2));
        r.add(mesh);
      }
    },
    shuriken(r) {
      // The held model (shuriken.js) stands in the xy plane above the hand; centre it and lay
      // it flat in xz. Its raked points lead counterclockwise seen from above, the way the
      // flight spins it (+y).
      const held = new THREE.Group();
      buildShuriken(held);
      extraMats.push(held.userData.extraMaterial);
      for (const mesh of [...held.children]) {
        geo(mesh.geometry.translate(0, -SHURIKEN_CENTER, 0).rotateX(-Math.PI / 2));
        r.add(mesh);
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
  // One thong link: a unit-long cord from the origin up +y, stretched and turned per frame.
  const thongGeo = geo(new THREE.CylinderGeometry(.0055, .0055, 1, 5, 1, true).translate(0, .5, 0));
  const thongMat = new THREE.MeshStandardMaterial({color: 0x6b5038, roughness: .9, side: THREE.DoubleSide});
  extraMats.push(thongMat);
  // The thong lives under the flight's outer group (so it goes when the flight does) but is
  // laid out in the parent's space: its matrix undoes the outer group's.
  function makeThong() {
    const g = new THREE.Group();
    g.matrixAutoUpdate = false;
    for (let i = 0; i < THONG_SEGS; i++) g.add(new THREE.Mesh(thongGeo, thongMat));
    return g;
  }
  const UP = new THREE.Vector3(0, 1, 0), eye = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  function layThong(fl, t, ox, oz) {
    const pts = thongTrail(fl.f, t);
    if (!pts) return;
    fl.outer.updateMatrix();
    fl.inner.updateMatrix();
    fl.thong.matrix.copy(fl.outer.matrix).invert();
    // clone() copies userData through JSON, so the eye is a plain {x, y, z} here.
    const e = fl.inner.userData.thongEye;
    eye.set(e.x, e.y, e.z).applyMatrix4(fl.inner.matrix).applyMatrix4(fl.outer.matrix);
    for (let i = 0; i < THONG_SEGS; i++) {
      const link = fl.thong.children[i];
      if (i) a.set(pts[i].x - ox, pts[i].y, pts[i].z - oz); else a.copy(eye);
      b.set(pts[i + 1].x - ox, pts[i + 1].y, pts[i + 1].z - oz);
      const len = a.distanceTo(b);
      link.visible = len > 1e-4;
      if (!link.visible) continue;
      link.position.copy(a);
      link.quaternion.setFromUnitVectors(UP, b.sub(a).divideScalar(len));
      link.scale.set(1, len, 1);
    }
  }
  const templates = new Map();
  function model(shape, metal, look = '') {
    const key = `${shape}:${metal}:${look}`;
    if (!templates.has(key)) {
      const g = new THREE.Group();
      (build[shape] ?? build.lump)(g, metal, look);
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
      const {outer, inner} = model(f.shape, f.metal, f.look);
      outer.visible = false;
      parent.add(outer);
      const thong = inner.userData.thongEye ? makeThong() : null;
      if (thong) outer.add(thong);
      flights.push({f, t0: now, outer, inner, thong});
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
      fl.inner.rotation.set(0, 0, 0, 'XYZ');
      if (style === 'tumble' || style === 'roll') fl.inner.rotation.x = fr.spin;
      else if (style === 'point') fl.inner.rotation.z = fr.spin;
      // ZYX: spin about the star's own axis first, then lean the spinning star over.
      else if (style === 'flat') fl.inner.rotation.set(0, fr.spin, fr.bank, 'ZYX');
      if (fl.f.shape === 'stone' || fl.f.shape === 'gem' || fl.f.shape === 'lump') fl.inner.rotation.z = fr.spin * .6;
      if (fl.thong) layThong(fl, t, ox, oz);
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
    for (const m of [...Object.values(mats), ...extraMats]) m.dispose();
  }
  return {play, update, clear, dispose, get count() { return flights.length; }};
}
