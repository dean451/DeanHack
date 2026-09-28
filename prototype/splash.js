// Splashes (motion queue item 13, part 3). Things that fall into water and fountains that
// overflow only reach the client as their end state (an object gone, a pool that was already
// there) or as message text, so this module finds them and plays a small set-piece:
// - a thrown or kicked object whose flight (the fx stream's last drawn cell) ends on water
//   drops in with a crown of droplets and ripples, sized by what it is;
// - the hero falling into water ("You fall into the water") makes a big splash and a column;
// - an overflowing fountain ("Water gushes forth…", "Water sprays all over you.", a kicked
//   sink's "Water spurts out!") shoots a pulsing jet out of the hero's tile.
//
// splashesFromFx(), splashFromMessage() and splashFrame() are pure, so they can be tested
// without a renderer; createSplash() draws them with one point cloud and two instanced meshes.

// Object classes from include/objclass.h.
const COIN_CLASS = 12, GEM_CLASS = 13, ROCK_CLASS = 14, BALL_CLASS = 15, CHAIN_CLASS = 16, RING_CLASS = 4;

// Per size: drop count, crown speed (tiles/s out, up), ripple count and reach, column height
// and how long the whole splash lasts (ms). A gush repeats its jet in pulses.
export const SIZES = {
  small: {drops: 8, out: .5, up: 1.3, ripples: 1, reach: .35, column: 0, ms: 650},
  medium: {drops: 14, out: .8, up: 1.8, ripples: 2, reach: .5, column: 0, ms: 800},
  large: {drops: 26, out: 1.1, up: 2.5, ripples: 3, reach: .75, column: .45, ms: 1000},
  gush: {drops: 30, out: .55, up: 3.4, ripples: 3, reach: .65, column: .9, ms: 1600, pulses: 3},
};
export const MAX_SPLASHES = 6;
const GRAVITY = 4.9;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hash = (a, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

// Small things plop, boulders, iron balls and chains land heavily, the rest in between.
export function objectSize(effect) {
  const c = effect?.class;
  if (c === ROCK_CLASS || c === BALL_CLASS || c === CHAIN_CLASS) return 'large';
  if (c === COIN_CLASS || c === GEM_CLASS || c === RING_CLASS) return 'small';
  return 'medium';
}

const cellAt = (frame, x, z) => frame?.cells?.find(c => c.x === x && c.z === z);

// Splashes for a replayed fx timeline (see fx.js): each object flight that ends on a visible
// water cell of the current frame. at is when (ms into the replay) the object lands.
export function splashesFromFx(timeline, frame) {
  const last = new Map();
  for (const s of timeline?.sprites ?? []) {
    if (s.effect?.kind !== 'object') continue;
    const prev = last.get(s.seq);
    if (!prev || s.from >= prev.from) last.set(s.seq, s);
  }
  const out = [];
  for (const s of last.values()) {
    const c = cellAt(frame, s.x, s.z);
    if (c?.terrain !== 'water' || c.visible === false) continue;
    out.push({x: s.x, z: s.z, size: objectSize(s.effect), at: s.until});
  }
  return out;
}

// Messages that put a splash on the hero's own tile. hliquid() can swap "water" for a
// hallucinatory liquid, so only the fixed parts of each line are matched.
const HERO_MESSAGES = [
  [/^You (?:fall|plunge|dive|sink) into the /, 'large'],
  [/^Splash!$/, 'medium'],
  [/^Plop!$/, 'small'],
  [/gushes forth from the overflowing fountain!/, 'gush'],
  [/ sprays all over you\.$/, 'gush'],
  [/^The pipes break!  \w+ spurts out!$/, 'gush'],
];

// A splash at the hero's tile for one message line, or null.
export function splashFromMessage(text, frame) {
  const p = frame?.player;
  if (typeof text !== 'string' || !p) return null;
  for (const [re, size] of HERO_MESSAGES) if (re.test(text)) return {x: p.x, z: p.z, size, at: 0};
  return null;
}

// One splash at an age (ms), or null when it's over or hasn't started. drops are in tiles
// relative to the splash's cell (the water surface is y 0); ripples are rings {r, alpha};
// column is a jet {h, r, alpha} or null.
export function splashFrame(splash, age) {
  const S = SIZES[splash?.size];
  if (!S || !(age >= 0) || age >= S.ms) return null;
  const k = age / S.ms, sec = age / 1000;
  const i0 = (splash.x ?? 0) * 31 + (splash.z ?? 0) * 17;
  const pulses = S.pulses ?? 1;
  const drops = [];
  for (let p = 0; p < pulses; p++) {
    const launch = p * S.ms * .22 / 1000;
    const t = sec - launch;
    if (t < 0) continue;
    for (let j = 0; j < S.drops; j++) {
      const a = (j / S.drops + hash(i0, j, p) * .15) * Math.PI * 2;
      const out = S.out * (.55 + .45 * hash(i0, j, p + 7));
      const up = S.up * (.6 + .4 * hash(i0, j, p + 13));
      const y = up * t - GRAVITY * t * t;
      if (y < 0) continue;
      drops.push({x: Math.cos(a) * out * t, y, z: Math.sin(a) * out * t, alpha: clamp01(1 - k) * (.6 + .4 * hash(i0, j, 3))});
    }
  }
  const ripples = [];
  for (let r = 0; r < S.ripples; r++) {
    const kr = (k - r * .18) / (1 - r * .18);
    if (kr <= 0) continue;
    ripples.push({r: .06 + S.reach * Math.sqrt(kr), alpha: (1 - kr) * .75});
  }
  let column = null;
  if (S.column) {
    // A jet that shoots up, holds while the pulses last, then collapses.
    const hold = pulses > 1 ? .7 : .25;
    const h = k < .12 ? k / .12 : k < hold ? 1 - .12 * Math.sin((k - .12) * 30) ** 2 : 1 - (k - hold) / (1 - hold);
    column = {h: S.column * clamp01(h), r: .06 + .05 * clamp01(h), alpha: .7 * clamp01(h)};
    if (column.h <= .002) column = null;
  }
  return {drops, ripples, column};
}

const MAX_DROPS = MAX_SPLASHES * SIZES.gush.drops * SIZES.gush.pulses;
const MAX_RIPPLES = MAX_SPLASHES * 3;

// Draws splashes. add(splash, delayMs) queues one (e.g. to wait for the object's flight
// to finish), fromFx(timeline, frame) and fromMessage(text, frame) find and queue them,
// update(dt, origin) advances them and returns {count, drops, ripples, columns}.
export function createSplash(THREE, parent) {
  const dropPos = new Float32Array(MAX_DROPS * 3), dropCol = new Float32Array(MAX_DROPS * 3);
  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPos, 3));
  dropGeo.setAttribute('color', new THREE.BufferAttribute(dropCol, 3));
  dropGeo.setDrawRange(0, 0);
  const drops = new THREE.Points(dropGeo, new THREE.PointsMaterial({size: .06, vertexColors: true, transparent: true,
    depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending}));
  drops.frustumCulled = false; drops.renderOrder = 3; drops.userData.part = 'splash-drops';
  parent.add(drops);

  // Ripples fade through their instance colour (additive, so darker is fainter).
  const ringGeo = new THREE.RingGeometry(.82, 1, 32, 1).rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending});
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, MAX_RIPPLES);
  rings.count = 0; rings.frustumCulled = false; rings.renderOrder = 3; rings.userData.part = 'splash-ripples';
  parent.add(rings);

  const colGeo = new THREE.CylinderGeometry(.35, 1, 1, 12, 1, true).translate(0, .5, 0);
  const colMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide});
  const cols = new THREE.InstancedMesh(colGeo, colMat, MAX_SPLASHES);
  cols.count = 0; cols.frustumCulled = false; cols.renderOrder = 3; cols.userData.part = 'splash-column';
  parent.add(cols);

  const splashes = [];
  let now = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const col = new THREE.Color();
  const WATER = new THREE.Color(.72, .88, 1);

  function add(splash, delayMs = 0) {
    if (!splash || !SIZES[splash.size]) return null;
    splashes.push({...splash, t: now + Math.max(0, delayMs || 0)});
    if (splashes.length > MAX_SPLASHES) splashes.shift();
    return splash;
  }
  const fromFx = (timeline, frame) => splashesFromFx(timeline, frame).map(sp => add(sp, sp.at));
  const fromMessage = (text, frame) => add(splashFromMessage(text, frame));

  function update(dt, origin) {
    now += (dt || 0) * 1000;
    const ox = origin?.x ?? 0, oz = origin?.z ?? 0;
    for (let i = splashes.length - 1; i >= 0; i--) if (now - splashes[i].t >= SIZES[splashes[i].size].ms) splashes.splice(i, 1);
    let d = 0, r = 0, c = 0, count = 0;
    for (const sp of splashes) {
      const fr = splashFrame(sp, now - sp.t);
      if (!fr) continue;
      count++;
      const cx = sp.x - ox, cz = sp.z - oz;
      for (const dr of fr.drops) {
        if (d >= MAX_DROPS) break;
        dropPos.set([cx + dr.x, .03 + dr.y, cz + dr.z], d * 3);
        dropCol.set([WATER.r * dr.alpha, WATER.g * dr.alpha, WATER.b * dr.alpha], d * 3);
        d++;
      }
      for (const rp of fr.ripples) {
        if (r >= MAX_RIPPLES) break;
        p.set(cx, .035, cz); s.set(rp.r, 1, rp.r);
        rings.setMatrixAt(r, m4.compose(p, q, s));
        rings.setColorAt(r, col.copy(WATER).multiplyScalar(rp.alpha));
        r++;
      }
      if (fr.column && c < MAX_SPLASHES) {
        p.set(cx, .03, cz); s.set(fr.column.r, fr.column.h, fr.column.r);
        cols.setMatrixAt(c, m4.compose(p, q, s));
        cols.setColorAt(c, col.copy(WATER).multiplyScalar(fr.column.alpha));
        c++;
      }
    }
    dropGeo.setDrawRange(0, d);
    dropGeo.attributes.position.needsUpdate = true;
    dropGeo.attributes.color.needsUpdate = true;
    rings.count = r; cols.count = c;
    rings.instanceMatrix.needsUpdate = true; cols.instanceMatrix.needsUpdate = true;
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
    if (cols.instanceColor) cols.instanceColor.needsUpdate = true;
    return {count, drops: d, ripples: r, columns: c};
  }

  const clear = () => { splashes.length = 0; update(0); };
  const dispose = () => {
    for (const m of [drops, rings, cols]) parent.remove(m);
    dropGeo.dispose(); ringGeo.dispose(); colGeo.dispose();
    drops.material.dispose(); ringMat.dispose(); colMat.dispose();
  };
  return {add, fromFx, fromMessage, update, clear, dispose};
}
