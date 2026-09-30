import * as THREE from 'three';

// What a dragon's breath has done to it. UnNetHack draws every dragon brown until its scales are
// identified, and once they are, the glyph colour names the breath (invent.c identify_dragon):
// red fire, white or silver cold, orange sleep, black disintegration, blue lightning, green poison,
// yellow acid, gray magic missile, bright magenta lava; the shimmering dragon is always cyan and
// the chromatic dragon magenta. So the colour, and only the colour, picks the look. A brown
// (unidentified) dragon gets nothing, which gives nothing away.
//
//  fire      ember cracks glowing along the flanks, soot-black horn tips, a flame-tongued tail
//  cold      a ridge of icicles, icicles hanging from the jaw and the wings, frost shards
//  silver    mirror scales down the back and a polished breastplate, a few small icicles
//  sleep     long drooping whisker barbels, soft frond tufts along the spine, drifting motes
//  disint    tall obsidian spines and a violet rift across the chest
//  lightning forked antlers, zigzag bolts crackling down the flanks, a charged orb on the tail
//  poison    venom dripping from the fangs, swollen glands along the flanks and a throat sac
//  acid      corrosion pits over the hide, acid drool and bulging glands on the neck
//  missile   glowing runes on the flanks and wings, and a rune ring hovering over the horns
//  lava      basalt crust plates over the back with molten veins, glowing spikes, a dripping tail
//  shimmer   iridescent translucent crest fins and wing edges (the hide shimmers too)
//  chromatic ridge spikes in all five colours of Tiamat's heads
//
// Glowing details use the breath material (`m.glow`), which the idle loop pulses, so the embers,
// bolts and veins breathe with the throat.
export const DRAGON_ELEMENTS = {
  0: 'disint', 1: 'fire', 2: 'poison', 4: 'lightning', 5: 'chromatic', 6: 'shimmer', 7: 'missile',
  9: 'sleep', 11: 'acid', 13: 'lava', 14: 'silver', 15: 'cold',
};
export const dragonElement = index => DRAGON_ELEMENTS[index] ?? null;

// Hide finish per element, merged over the plain hide material's options.
export const HIDE_FINISH = {
  disint: {roughness: .16, metalness: .35},
  cold: {roughness: .32},
  lava: {roughness: .95},
  shimmer: {roughness: .22, metalness: .25},
  fire: {roughness: .55, emissiveK: .06},
};

const cache = new Map();
function mat(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({color, roughness: .6, ...options}));
  return cache.get(key);
}
const glowMat = (color, k = 3) => mat(color, {emissive: color, emissiveIntensity: k, roughness: .35});
// opaque, so the icicles merge into one draw with the rest of the dragon
const ICE = () => mat('#d6f2ff', {roughness: .06, metalness: .1, emissive: '#6fc4ff', emissiveIntensity: .3});
const TIAMAT_GLOWS = ['#ff5a1a', '#5ab8ff', '#8aee3a', '#c8f8ff', '#9a4aff'];

function add(parent, geo, material, p, q) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(p); if (q) mesh.quaternion.copy(q);
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
const Y = new THREE.Vector3(0, 1, 0), v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const along = dir => new THREE.Quaternion().setFromUnitVectors(Y, dir.clone().normalize());
// a cone standing on p, pointing along dir
function spike(parent, p, dir, r, h, material, seg = 5) {
  const d = dir.clone().normalize();
  return add(parent, new THREE.ConeGeometry(r, h, seg), material, p.clone().addScaledVector(d, h * .45), along(d));
}
function ball(parent, p, r, material, s = [1, 1, 1]) {
  const m = add(parent, new THREE.SphereGeometry(r, 8, 6), material, p); m.scale.set(...s); return m;
}
function streak(parent, pts, r, material) {
  return add(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 4, r, 4, false), material, v3(0, 0, 0));
}
// deterministic jitter, so every dragon of a kind looks the same between frames and tests
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

// The trunk: surface points on the body, t from the chest (0) to the tail root (1) and a from the
// spine (0) round the flank (±π/2) to the belly (π). Returns {p, n} in the trunk's parent.
export function torsoTrunk(parent, {center, radii, tilt = 0}) {
  const g = new THREE.Group(); g.position.copy(center); g.rotation.x = tilt; parent.add(g);
  const [hx, hy, hz] = radii;
  return {group: g, at(t, a, lift = 1) {
    const z = hz * (.82 - 1.64 * t), s = Math.sqrt(Math.max(0, 1 - (z / hz) ** 2));
    const p = v3(hx * s * Math.sin(a) * lift, hy * s * Math.cos(a) * lift, z);
    return {p, n: v3(p.x / hx / hx, p.y / hy / hy, p.z / hz / hz).normalize()};
  }};
}
export function serpentTrunk(parent, {curve, r0, r1}) {
  const g = new THREE.Group(); parent.add(g);
  return {group: g, at(t, a, lift = 1) {
    const c = curve.getPoint(t), T = curve.getTangent(t), side = new THREE.Vector3().crossVectors(T, Y).normalize();
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    const up = new THREE.Vector3().crossVectors(side, T).normalize(), r = (r0 + (r1 - r0) * t) * lift;
    const n = side.clone().multiplyScalar(Math.sin(a)).addScaledVector(up, Math.cos(a) * .9).normalize();
    return {p: c.clone().addScaledVector(side, r * Math.sin(a)).addScaledVector(up, r * .9 * Math.cos(a)), n};
  }};
}

// Head anchors in the head group's own space (see dragonHead in creatures.js).
function headAnchors(cat) {
  return cat
    ? {jaw: v3(0, -.08, .11), snout: v3(0, -.01, .14), crown: v3(0, .12, -.01), horns: [v3(-.075, .15, -.01), v3(.075, .15, -.01)], fangs: [v3(-.02, -.08, .12), v3(.02, -.08, .12)], throat: v3(0, -.1, .02)}
    : {jaw: v3(0, -.09, .16), snout: v3(0, .02, .24), crown: v3(0, .1, -.04), horns: [v3(-.06, .09, -.07), v3(.06, .09, -.07)], fangs: [v3(-.045, -.05, .21), v3(.045, -.05, .21)], throat: v3(0, -.1, .02)};
}

// Dress a finished dragon. `o`: {element, m (dragonMats), trunk, heads:[{head, m, cat}], tail,
// tailCurve, wings:[{inner, edge:[[x,y]...]}], baby}. Adds meshes only; the handles are untouched.
export function dressDragon(o) {
  const dress = DRESS[o.element];
  if (!dress) return 0;
  const before = count(o);
  dress({...o, k: o.baby ? .65 : 1});
  return count(o) - before;
}
function count(o) { let n = 0; for (const root of [o.trunk.group, o.tail, ...o.heads.map(h => h.head), ...o.wings.map(w => w.inner)]) root?.traverse(x => { if (x.isMesh) n++; }); return n; }

function tailTip(o) { const c = o.tailCurve; return {p: c.getPoint(1), d: c.getTangent(1)}; }
function ridge(o, n, fn) { for (let i = 0; i < n; i++) { const t = .08 + .8 * i / Math.max(1, n - 1), {p, n: nn} = o.trunk.at(t, 0); fn(p, nn, i, t); } }
function flanks(o, n, a, fn) { for (const s of [-1, 1]) for (let i = 0; i < n; i++) { const t = .15 + .65 * i / Math.max(1, n - 1); const {p, n: nn} = o.trunk.at(t, s * a); fn(p, nn, s, i, t); } }
function wingEdge(w, fn) { const e = w.edge; for (let i = 0; i + 1 < e.length; i++) fn(v3(e[i][0], e[i][1], 0), v3(e[i + 1][0], e[i + 1][1], 0), i); }

const DRESS = {
  fire(o) {
    const {m, k} = o, soot = mat('#1a1210', {roughness: .9});
    // ember cracks: short glowing forked seams on each flank
    const rand = rng(11);
    flanks(o, 4, 1.25, (p, n, s, i) => {
      const a = o.trunk.at(.15 + .65 * i / 3 + .04, s * (1.05 + .3 * rand()), 1.01).p, b = o.trunk.at(.15 + .65 * i / 3 - .03, s * (1.45 + .2 * rand()), 1.01).p;
      streak(o.trunk.group, [p.clone().addScaledVector(n, .004), a, b], .006 * k, m.glow);
    });
    for (const h of o.heads) { const A = headAnchors(h.cat); if (!h.cat) for (const hp of A.horns) spike(h.head, hp.clone().add(v3(Math.sign(hp.x) * .04, .1, -.09)), v3(Math.sign(hp.x) * .3, 1, -.9), .012, .05, soot, 5); }
    // the tail burns: three flame tongues around the tip
    const {p, d} = tailTip(o);
    for (let i = 0; i < 3; i++) { const sway = v3(Math.cos(i * 2.1) * .5, .6 + .3 * i, Math.sin(i * 2.1) * .5).add(d); spike(o.tail, p.clone().addScaledVector(d, .02), sway, .03 * k * (1 - i * .2), .13 * k * (1 - i * .15), i ? glowMat('#ffb040', 3.5) : m.glow, 5); }
  },
  cold(o) {
    const {k} = o, ice = ICE();
    ridge(o, 7, (p, n, i) => spike(o.trunk.group, p, n.clone().add(v3(0, 0, -.35)), .022 * k, (.1 + .05 * Math.sin(i * 1.7)) * k, ice, 5));
    for (const h of o.heads) { const A = headAnchors(h.cat); for (let i = -2; i <= 2; i++) spike(h.head, A.jaw.clone().add(v3(i * .018, 0, -Math.abs(i) * .02)), v3(0, -1, 0), .008, (.05 - Math.abs(i) * .01) * (h.cat ? .8 : 1), ice, 4); }
    for (const w of o.wings) wingEdge(w, (a, b) => { for (let j = 1; j <= 2; j++) spike(w.inner, a.clone().lerp(b, j / 3), v3(0, -1, 0), .006, .045, ice, 4); });
    flanks(o, 2, 1.0, (p, n) => { for (let j = 0; j < 3; j++) spike(o.trunk.group, p, n.clone().add(v3((j - 1) * .5, .4, (j - 1) * .3)), .012 * k, (.06 + j * .015) * k, ice, 4); });
  },
  silver(o) {
    const {k} = o, mirror = mat('#e8f2f6', {roughness: .04, metalness: 1}), ice = ICE();
    // mirror scales: a double row of polished hexagonal plates along the back
    ridge(o, 7, (p, n, i) => { for (const s of [-1, 1]) { const q = o.trunk.at(.08 + .8 * i / 6, s * .35, 1.02); add(o.trunk.group, new THREE.CylinderGeometry(.03 * k, .03 * k, .006, 6), mirror, q.p, along(q.n)); } });
    // a polished breastplate on the chest
    const chest = o.trunk.at(0, Math.PI * .72, 1.02); add(o.trunk.group, new THREE.CylinderGeometry(.075 * k, .065 * k, .01, 6), mirror, chest.p, along(chest.n));
    for (const h of o.heads) { const A = headAnchors(h.cat); for (let i = -1; i <= 1; i++) spike(h.head, A.jaw.clone().add(v3(i * .02, 0, -Math.abs(i) * .02)), v3(0, -1, 0), .006, .035, ice, 4); }
  },
  sleep(o) {
    const {m, k} = o, frond = mat('#f3d6a8', {roughness: 1}), mote = glowMat('#ffd9a0', 2.5);
    for (const h of o.heads) {
      const A = headAnchors(h.cat);
      // long whisker barbels drooping from the snout, curling at the ends
      for (const s of [-1, 1]) streak(h.head, [A.snout.clone().add(v3(s * .03, -.02, -.02)), A.snout.clone().add(v3(s * .1, -.06, .02)), A.snout.clone().add(v3(s * .16, -.16, -.02)), A.snout.clone().add(v3(s * .13, -.22, -.08))], .005, m.dark);
      // drifting sleep motes about the head
      const rand = rng(29);
      for (let i = 0; i < 5; i++) ball(h.head, v3((rand() - .5) * .4, .05 + rand() * .2, .05 + rand() * .25), .008 + rand() * .006, mote);
    }
    // soft frond tufts along the spine instead of hard spikes
    ridge(o, 6, (p, n) => { for (let j = -1; j <= 1; j++) spike(o.trunk.group, p, n.clone().add(v3(j * .45, 0, -.6)), .02 * k, .08 * k, frond, 4); });
  },
  disint(o) {
    const {m, k} = o, obsidian = mat('#0a0810', {roughness: .08, metalness: .5});
    // tall obsidian spines, jagged in height, raked back
    ridge(o, 6, (p, n, i) => spike(o.trunk.group, p, n.clone().add(v3(0, 0, -.25)), .03 * k, (.14 + .07 * ((i * 3) % 2)) * k, obsidian, 4));
    flanks(o, 3, 1.1, (p, n) => spike(o.trunk.group, p, n.clone().add(v3(0, .3, -.4)), .014 * k, .06 * k, obsidian, 4));
    // a violet rift splitting the chest
    const a = o.trunk.at(.02, Math.PI * .55, 1.01).p, b = o.trunk.at(.08, Math.PI * .72, 1.01).p, c = o.trunk.at(.03, Math.PI * .9, 1.01).p, d = o.trunk.at(.12, Math.PI, 1.01).p;
    streak(o.trunk.group, [a, b, c, d], .009 * k, m.glow);
    for (const h of o.heads) if (!h.cat) for (const hp of headAnchors(false).horns) spike(h.head, hp.clone().add(v3(Math.sign(hp.x) * .02, .02, .02)), v3(Math.sign(hp.x) * .5, 1, .2), .01, .06, obsidian, 4);
  },
  lightning(o) {
    const {m, k} = o, horn = mat('#2a3450', {roughness: .4, metalness: .4});
    // forked antlers: a second tine off each horn, tipped with a spark
    for (const h of o.heads) { const A = headAnchors(h.cat); for (const hp of A.horns) { const s = Math.sign(hp.x), base = hp.clone().add(v3(s * .02, .03, -.02)); spike(h.head, base, v3(s * 1, .8, .1), .01, .08, horn, 4); ball(h.head, base.clone().add(v3(s * .06, .05, .01)), .012, m.glow); } }
    // zigzag bolts crackling down each flank
    for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 6; i++) pts.push(o.trunk.at(.12 + .7 * i / 6, s * (1.1 + (i % 2 ? .35 : -.1)), 1.02).p); streak(o.trunk.group, pts, .006 * k, m.glow); }
    for (const w of o.wings) { const e = w.edge, pts = []; for (let i = 0; i <= 4; i++) { const f = i / 4, x = e[0][0] + (e[2][0] - e[0][0]) * f, y = e[0][1] + (e[2][1] - e[0][1]) * f - .08 * Math.abs(e[2][0]) * (i % 2 ? 1 : .2); pts.push(v3(x, y, .006)); } streak(w.inner, pts, .005, m.glow); }
    const {p, d} = tailTip(o); ball(o.tail, p.clone().addScaledVector(d, .1 * k), .035 * k, m.glow);
  },
  poison(o) {
    const {m, k} = o, sac = mat('#6f9a2a', {roughness: .35, emissive: '#3c6a10', emissiveIntensity: .5});
    for (const h of o.heads) { const A = headAnchors(h.cat); for (const f of A.fangs) { ball(h.head, f.clone().add(v3(0, -.03, 0)), .01, m.glow, [1, 1.6, 1]); ball(h.head, f.clone().add(v3(0, -.07, .01)), .006, m.glow); } ball(h.head, A.throat, .06, sac, [1.1, .8, 1.2]); }
    flanks(o, 3, 1.15, (p, n, s, i) => { ball(o.trunk.group, p, (.035 - i * .005) * k, sac); ball(o.trunk.group, p.clone().addScaledVector(n, .02 * k), .012 * k, m.glow); });
  },
  acid(o) {
    const {m, k} = o, pit = mat('#3a3410', {roughness: 1}), gland = mat('#c8d040', {roughness: .3, emissive: '#8a9a10', emissiveIntensity: .6});
    const rand = rng(53);
    for (let i = 0; i < 14; i++) { const q = o.trunk.at(.1 + .8 * rand(), (rand() * 2 - 1) * 1.6, 1.0); ball(o.trunk.group, q.p, (.012 + .012 * rand()) * k, pit, [1, .35, 1]).quaternion.copy(along(q.n)); }
    for (const h of o.heads) { const A = headAnchors(h.cat); for (let i = 0; i < 3; i++) ball(h.head, A.jaw.clone().add(v3((i - 1) * .025, -.02 - i * .012, .02)), .009, m.glow, [1, 1.8, 1]); for (const s of [-1, 1]) ball(h.head, A.throat.clone().add(v3(s * .07, .03, -.04)), .035, gland, [.9, 1, 1.3]); }
  },
  missile(o) {
    const {m, k} = o;
    // runes: little glowing glyphs (a bar and a crossbar) on each flank and each wing
    flanks(o, 3, 1.2, (p, n, s) => { const q = along(n), r = add(o.trunk.group, new THREE.BoxGeometry(.05 * k, .004, .01 * k), m.glow, p.clone().addScaledVector(n, .003), q); add(o.trunk.group, new THREE.BoxGeometry(.01 * k, .004, .04 * k), m.glow, r.position, q); });
    for (const w of o.wings) { const e = w.edge; for (const f of [.35, .65]) { const c = v3(e[1][0] * f, e[1][1] * f + .04 * Math.abs(e[1][0]), .004); add(w.inner, new THREE.TorusGeometry(.025, .004, 4, 12), m.glow, c); } }
    // a rune ring hovering over the horns
    for (const h of o.heads) { const A = headAnchors(h.cat), ring = add(h.head, new THREE.TorusGeometry(.09, .006, 4, 24), m.glow, A.crown.clone().add(v3(0, .1, 0))); ring.rotation.x = Math.PI / 2 - .2; }
  },
  lava(o) {
    const {m, k} = o, basalt = mat('#1c1414', {roughness: 1});
    // crust plates over the back, the glow showing through the seams between them
    ridge(o, 6, (p, n, i) => { for (const s of [-1, 0, 1]) { const q = o.trunk.at(.08 + .8 * i / 5, s * .5, 1.03); const plate = add(o.trunk.group, new THREE.CylinderGeometry(.045 * k, .05 * k, .02, 5), basalt, q.p, along(q.n)); plate.rotateY(i + s); } });
    for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 5; i++) pts.push(o.trunk.at(.1 + .8 * i / 5, s * (.25 + (i % 2) * .12), 1.03).p); streak(o.trunk.group, pts, .006 * k, m.glow); }
    ridge(o, 5, (p, n) => spike(o.trunk.group, p.clone().addScaledVector(n, .02), n, .012 * k, .05 * k, m.glow, 4));
    // molten drips under the tail tip, only as far as the floor allows (coiled tails lie low)
    const {p, d} = tailTip(o), room = o.tail.position.y + p.y - .03;
    for (let i = 0; i < 2; i++) { const drop = .04 + i * .035; if (drop + .02 * k < room) ball(o.tail, p.clone().add(v3(0, -drop, 0)).addScaledVector(d, .02), .014 * (1 - i * .3) * k, m.glow, [1, 1.5, 1]); }
  },
  shimmer(o) {
    const {k} = o, film = mat('#9ff0ff', {roughness: .1, metalness: .3, transparent: true, opacity: .45, side: THREE.DoubleSide, emissive: '#40c0d0', emissiveIntensity: .6});
    ridge(o, 7, (p, n, i) => { const fin = spike(o.trunk.group, p, n.clone().add(v3(0, 0, -.5)), .045 * k, .1 * k, film, 3); fin.scale.set(1, 1, .15); });
    for (const w of o.wings) wingEdge(w, (a, b) => streak(w.inner, [a.clone().setZ(.003), a.clone().lerp(b, .5).setZ(.006), b.clone().setZ(.003)], .012, film));
  },
  chromatic(o) {
    const {k} = o;
    ridge(o, 10, (p, n, i) => spike(o.trunk.group, p, n.clone().add(v3(0, 0, -.35)), .022 * k, .09 * k, glowMat(TIAMAT_GLOWS[i % 5], 1.2), 4));
  },
};
