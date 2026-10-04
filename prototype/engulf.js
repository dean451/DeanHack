// Engulfing (motion queue item 16). While the hero is swallowed, NetHack clears the map down to
// the 3x3 swallow border and the bridge adds player.engulfer {name} to every frame (name is null
// while blind or hallucinating). This module closes a chamber in around the hero and pulls the
// camera inside it with a wider, breathing field of view, then bursts it open on the way out:
// - gullet (purple worm, trapper, lurker above): wet fleshy ribs with a peristaltic squeeze and
//   drips falling from the roof;
// - ooze (ochre jelly, Juiblex): a wobbling translucent slime with bubbles rising through it;
// - wind (air elemental, fog cloud and the vortices): twisting streaks that race round the hero,
//   with dust, frost, sparks, steam or embers carried along by type.
// An unknown (null) engulfer gets a dim, dark gullet.
//
// engulfLook(), chamberPoint(), moteAt() and engulfFrame() are pure, so they can be tested
// without a renderer. createEngulf() draws the chamber (one back-faced sphere, vertices bent on
// the CPU) and the motes (one Points cloud); engulfCamera() applies the view change so that it
// comes off exactly on the next frame.

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = k => { k = clamp01(k); return k * k * (3 - 2 * k); };
const hash = (a, b = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const hexRgb = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// Timings (ms) and sizes (tiles).
export const ENTER_MS = 520, EXIT_MS = 480;
export const CHAMBER_R = 1.5, CHAMBER_Y = .55, OPEN_R = 3.4, BURST_R = 3.8;
export const MAX_MOTES = 64;
// Camera: distance from the hero inside the chamber, and the extra field of view (degrees).
export const INSIDE_DIST = 1.4, FOV_ADD = 16, FOV_BREATHE = 2;
// How much of the full motion is used: the hero's tumble, lift and throw, the walls' heave and
// spin, and the chamber's breathing. The user found the full amount too much on screen.
export const CALM = .55;

// wall/groove: chamber colours; mote: particle colour; spin: rad/s; pulse: Hz; opacity.
const LOOKS = {
  'purple worm': {style: 'gullet', wall: 0x8a3a62, groove: 0x2c0c1e, mote: 0xd07aa0, pulse: 1.1},
  'trapper': {style: 'gullet', wall: 0x55624a, groove: 0x1a2016, mote: 0x9fb07a, pulse: .8},
  'lurker above': {style: 'gullet', wall: 0x4d5a5e, groove: 0x14191c, mote: 0x8fa3a8, pulse: .8},
  'ochre jelly': {style: 'ooze', wall: 0xb0842a, groove: 0x4a300a, mote: 0xffd070, pulse: .45},
  'Juiblex': {style: 'ooze', wall: 0x5e7a26, groove: 0x1e2a08, mote: 0xb8e060, pulse: .35},
  'air elemental': {style: 'wind', wall: 0x9fb8d0, groove: 0x34465a, mote: 0xe8f4ff, spin: 4.2},
  'fog cloud': {style: 'wind', wall: 0x9a9fa4, groove: 0x44484c, mote: 0xd8dcdf, spin: 1.4},
  'dust vortex': {style: 'wind', wall: 0x9a7a52, groove: 0x3a2a18, mote: 0xd8b888, spin: 3.4},
  'ice vortex': {style: 'wind', wall: 0xbfe4f2, groove: 0x4a7a90, mote: 0xffffff, spin: 3.2},
  'energy vortex': {style: 'wind', wall: 0x4a64c8, groove: 0x10183a, mote: 0xa8c8ff, spin: 4.8},
  'steam vortex': {style: 'wind', wall: 0xc4ccd2, groove: 0x5a6268, mote: 0xf0f4f6, spin: 2.6},
  'fire vortex': {style: 'wind', wall: 0xe06a24, groove: 0x4a1204, mote: 0xffc060, spin: 3.8},
};
const UNKNOWN = {style: 'gullet', wall: 0x3e2a30, groove: 0x120a0c, mote: 0x806068, pulse: .9};
const DEFAULTS = {gullet: {opacity: .97, spin: 0, pulse: 1}, ooze: {opacity: .82, spin: .15, pulse: .45},
  wind: {opacity: .7, spin: 3, pulse: .6}};

// The look for an engulfer's seen name (null or unknown names get the dark gullet).
export function engulfLook(name) {
  const base = (typeof name === 'string' && LOOKS[name]) || UNKNOWN;
  const d = DEFAULTS[base.style];
  return {...d, ...base, name: typeof name === 'string' ? name : null,
    wallRgb: hexRgb(base.wall), grooveRgb: hexRgb(base.groove), moteRgb: hexRgb(base.mote)};
}

// One chamber vertex: (nx,ny,nz) is its unit direction from the centre, t in seconds.
// Returns {scale, rgb}: how far out it sits (x CHAMBER radius) and its colour (0..1).
export function chamberPoint(look, nx, ny, nz, t) {
  if (look.style === 'wind') {
    // Streaks twisting round the vertical axis, racing past; the far top and bottom stay calm.
    const a = Math.atan2(nz, nx) + t * look.spin * CALM + ny * 2.4;
    const streak = Math.pow(.5 + .5 * Math.sin(a * 7), 3);
    const gust = .5 + .5 * Math.sin(a * 3 - t * 1.7 + ny * 5);
    const k = clamp01(streak * (.55 + .45 * gust) * (1 - .5 * Math.abs(ny)));
    return {scale: 1 + CALM * (.035 * Math.sin(a * 3 + t * 2) - .03 * streak), rgb: mix(look.grooveRgb, look.wallRgb, .35 + .65 * k)};
  }
  if (look.style === 'ooze') {
    const w = t * look.pulse * Math.PI * 2;
    const n = Math.sin(nx * 5 + w * .7) * Math.sin(nz * 4.3 - w * .5) * Math.sin(ny * 3.7 + w * .4);
    // Pale blisters where the slime bulges in, darker where it thins.
    const blister = Math.pow(clamp01(n * 1.6), 2);
    return {scale: 1 - CALM * .08 * n, rgb: mix(mix(look.grooveRgb, look.wallRgb, .6 + .4 * n), [1, 1, .9], .25 * blister)};
  }
  // Gullet: rings across the vertical axis, with a squeeze wave running up them.
  const w = t * look.pulse * Math.PI * 2;
  const rib = .5 + .5 * Math.cos(ny * 16 + Math.sin(Math.atan2(nz, nx) * 3) * .5);
  const wave = Math.pow(.5 + .5 * Math.sin(ny * 3 - w), 4);
  const wet = Math.pow(clamp01(rib * 1.2 - .1), 6) * (.4 + .6 * wave);
  const c = mix(look.grooveRgb, look.wallRgb, .25 + .75 * rib);
  return {scale: 1 - CALM * (.06 * rib + .12 * wave), rgb: mix(c, [1, .9, .92], .3 * wet)};
}

// Particle i of the look at t seconds, relative to the hero's tile (y up from the floor).
// Returns {x, y, z, alpha} or null when that particle isn't out.
export function moteAt(look, i, t) {
  const h1 = hash(i, 1), h2 = hash(i, 2), h3 = hash(i, 3), h4 = hash(i, 4);
  if (look.style === 'wind') {
    const r = .4 + .65 * h1, y = .08 + 1 * h2;
    const a = h3 * Math.PI * 2 + t * look.spin * CALM * (1.35 - r * .5);
    return {x: Math.cos(a) * r, y: y + .05 * Math.sin(t * 3 + i), z: Math.sin(a) * r, alpha: .45 + .55 * Math.abs(Math.sin(t * 2.3 + i * 1.7))};
  }
  if (look.style === 'ooze') {
    // Bubbles rise through the slime and pop near the roof.
    const life = 2.2 + 1.6 * h4, k = ((t / life) + h1) % 1;
    const r = .35 + .7 * h2, a = h3 * Math.PI * 2 + .4 * Math.sin(t * .7 + i);
    return {x: Math.cos(a) * r, y: .02 + 1.18 * k, z: Math.sin(a) * r, alpha: Math.sin(Math.PI * k)};
  }
  // Gullet: drips gather at the roof and fall, fading as they reach the floor. Half are out.
  if (h4 < .5) return null;
  const life = 1.4 + h1, k = ((t / life) + h2) % 1;
  const r = .45 + .45 * h3, a = hash(i, 5) * Math.PI * 2;
  const fall = k < .35 ? 0 : ((k - .35) / .65) ** 2;
  return {x: Math.cos(a) * r, y: 1.2 - 1.18 * fall, z: Math.sin(a) * r, alpha: k < .35 ? k / .35 * .6 : 1 - fall * .8};
}

// The chamber at time t (ms). e is {look, at, outAt?}. Returns null before it starts and once it
// has burst open, else {k, radius, opacity, breathe, camera:{inside, fovAdd}}: k is how closed
// the chamber is (0..1), radius its size (tiles). camera is always {inside: 0, fovAdd: 0}: being
// engulfed never moves the camera or the lens.
export function engulfFrame(e, t) {
  if (!e || !Number.isFinite(e.at) || !(t >= e.at)) return null;
  const sec = t / 1000;
  const out = Number.isFinite(e.outAt) && t >= e.outAt;
  // Once expelled, the closing stops where it was, so a quick escape never snaps shut.
  const close = smooth(((out ? Math.max(e.at, e.outAt) : t) - e.at) / ENTER_MS);
  let k = close, radius = OPEN_R + (CHAMBER_R - OPEN_R) * close;
  if (out) {
    const x = (t - e.outAt) / EXIT_MS;
    if (x >= 1) return null;
    const open = smooth(x);
    k = close * (1 - open);
    radius = radius + (BURST_R - radius) * open;
  }
  const breathe = Math.sin(sec * e.look.pulse * Math.PI * 2);
  radius *= 1 + CALM * .04 * breathe * k;
  return {k, radius, opacity: e.look.opacity * k, breathe,
    // The camera no longer zooms in or widens its lens when engulfed (it was broken on screen).
    camera: {inside: 0, fovAdd: 0}};
}

// The hero's own motion at time t (ms), or null when there's none. Swallowed, the hero is
// yanked up off the floor; inside, a gullet squeezes them in time with its wave, an ooze holds
// them bobbing in the slime and wind tumbles them round; expelled, they're thrown up and back and
// land with a squash. Returns {dy, pitch, roll, sx, sy}: a lift (tiles), tilts (radians) and a
// squash (sx across, sy up), all at rest (0, 0, 0, 1, 1) once the chamber has opened.
export function engulfHeroPose(e, t) {
  const f = engulfFrame(e, t);
  if (!f) return null;
  const sec = t / 1000, look = e.look, k = f.k;
  let dy = 0, pitch = 0, roll = 0, sx = 1, sy = 1;
  if (look.style === 'wind') {
    const spin = look.spin * CALM;
    roll = .2 * Math.sin(sec * spin * .9);
    pitch = .14 * Math.sin(sec * spin * .6 + 1);
    dy = .16 + .04 * Math.sin(sec * 3);
  } else if (look.style === 'ooze') {
    roll = .07 * Math.sin(sec * 1.3);
    pitch = .06 * Math.sin(sec * .9 + 2);
    dy = .1 + .03 * f.breathe;
    sx = 1 + .04 * f.breathe; sy = 1 - .05 * f.breathe;
  } else {
    // The same squeeze wave that runs up the gullet's ribs, taken at the hero's middle.
    const sq = Math.pow(.5 + .5 * Math.sin(-sec * look.pulse * Math.PI * 2), 4);
    sx = 1 - .08 * sq; sy = 1 + .06 * sq;
    pitch = .05 * Math.sin(sec * look.pulse * Math.PI * 2);
  }
  const c = CALM * k;
  dy *= c; pitch *= c; roll *= c; sx = 1 + (sx - 1) * c; sy = 1 + (sy - 1) * c;
  const out = Number.isFinite(e.outAt) && t >= e.outAt;
  if (!out && t - e.at < ENTER_MS) {
    const hop = Math.sin(Math.PI * (t - e.at) / ENTER_MS);
    dy += CALM * .22 * hop; sy *= 1 + CALM * .12 * hop; sx *= 1 - CALM * .06 * hop;
  }
  if (out) {
    const x = (t - e.outAt) / EXIT_MS;
    if (x < .8) {
      const arc = Math.sin(Math.PI * x / .8);
      dy += CALM * .35 * arc; pitch -= CALM * .6 * arc;
    } else {
      const s = Math.sin(Math.PI * (x - .8) / .2);
      sy *= 1 - CALM * .18 * s; sx *= 1 + CALM * .09 * s;
    }
  }
  return {dy, pitch, roll, sx, sy};
}

// Swaps the engulf pose on an actor's model: takes off the one applied last time (kept on
// actor.engulfPose) and adds the new one, so it stacks with the action layer and the polymorph
// squash. Pass null to take it off.
export function poseEngulfed(actor, pose) {
  const g = actor?.g;
  if (!g) return;
  const o = actor.engulfPose;
  if (o) { g.position.y -= o.dy; g.rotation.x -= o.pitch; g.rotation.z -= o.roll; g.scale.x /= o.sx; g.scale.z /= o.sx; g.scale.y /= o.sy; }
  const ok = pose && ['dy', 'pitch', 'roll', 'sx', 'sy'].every(key => Number.isFinite(pose[key])) && pose.sx > 0 && pose.sy > 0;
  if (ok) { g.position.y += pose.dy; g.rotation.x += pose.pitch; g.rotation.z += pose.roll; g.scale.x *= pose.sx; g.scale.z *= pose.sx; g.scale.y *= pose.sy; }
  actor.engulfPose = ok ? {dy: pose.dy, pitch: pose.pitch, roll: pose.roll, sx: pose.sx, sy: pose.sy} : null;
}

// Moves the camera in (or back out) for view {inside, fovAdd}. The change from the last call is
// taken off first, so the orbit and follow code keep working on the undistorted view; controls'
// minDistance is lowered while inside so OrbitControls doesn't clamp the camera back out.
export function engulfCamera(camera, controls, view) {
  const u = camera.userData, prev = u.engulfCam;
  const offset = camera.position.clone().sub(controls.target);
  if (prev) {
    offset.divideScalar(prev.scale);
    camera.fov -= prev.fov;
    controls.minDistance = prev.minDistance;
    u.engulfCam = null;
  }
  const inside = view && view.inside > 0 ? clamp01(view.inside) : 0;
  const len = offset.length();
  if (!inside || !(len > 1e-6)) {
    if (prev) { camera.position.copy(controls.target).add(offset); camera.updateProjectionMatrix(); }
    return 0;
  }
  const dist = len + (INSIDE_DIST - len) * smooth(inside);
  const scale = dist / len, fov = Number.isFinite(view.fovAdd) ? view.fovAdd : 0;
  camera.position.copy(controls.target).add(offset.multiplyScalar(scale));
  camera.fov += fov;
  camera.updateProjectionMatrix();
  u.engulfCam = {scale, fov, minDistance: controls.minDistance};
  controls.minDistance = Math.min(controls.minDistance, dist * .99);
  return dist;
}

// Puts the camera's field of view and the controls back without moving the camera (for a level
// change or leaving Live mode, where the caller places the camera itself).
export function dropEngulfCamera(camera, controls) {
  const prev = camera.userData.engulfCam;
  if (!prev) return;
  camera.fov -= prev.fov;
  controls.minDistance = prev.minDistance;
  camera.updateProjectionMatrix();
  camera.userData.engulfCam = null;
}

// Draws the chamber. frame(frame) starts it when player.engulfer appears and opens it when it
// goes; update(dt, origin) returns {engulfed, inside, fovAdd, motes} for engulfCamera(), plus
// hero: the hero's pose for poseEngulfed() (null when not engulfed).
export function createEngulf(THREE, parent) {
  const geo = new THREE.SphereGeometry(1, 48, 32);
  const pos = geo.attributes.position;
  const dirs = Float32Array.from(pos.array);
  const cols = new Float32Array(pos.count * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const mat = new THREE.MeshBasicMaterial({vertexColors: true, side: THREE.BackSide, transparent: true,
    depthWrite: false, toneMapped: false});
  const chamber = new THREE.Mesh(geo, mat);
  chamber.visible = false; chamber.frustumCulled = false; chamber.renderOrder = 2;
  chamber.userData.part = 'engulf-chamber';
  parent.add(chamber);

  const motePos = new Float32Array(MAX_MOTES * 3), moteCol = new Float32Array(MAX_MOTES * 3);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  moteGeo.setAttribute('color', new THREE.BufferAttribute(moteCol, 3));
  moteGeo.setDrawRange(0, 0);
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({size: .06, vertexColors: true, transparent: true,
    depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending}));
  motes.frustumCulled = false; motes.renderOrder = 3; motes.userData.part = 'engulf-motes';
  parent.add(motes);

  let e = null, now = 0;

  function frame(fr) {
    const p = fr?.player;
    if (!p) return;
    const eng = p.engulfer;
    if (eng) {
      if (!e || Number.isFinite(e.outAt)) e = {look: engulfLook(eng.name), at: now, hero: {x: p.x, z: p.z}};
      else {
        e.hero = {x: p.x, z: p.z};
        const name = typeof eng.name === 'string' ? eng.name : null;
        if (name !== e.look.name) e.look = engulfLook(name);
      }
    } else if (e && !Number.isFinite(e.outAt)) e.outAt = now;
  }

  function update(dt, origin) {
    now += (dt || 0) * 1000;
    const f = e ? engulfFrame(e, now) : null;
    if (e && !f && Number.isFinite(e.outAt) && now >= e.outAt) e = null;
    if (!f) {
      chamber.visible = false; moteGeo.setDrawRange(0, 0);
      return {engulfed: false, inside: 0, fovAdd: 0, motes: 0, hero: null};
    }
    const sec = now / 1000, look = e.look;
    const ox = e.hero.x - (origin?.x ?? 0), oz = e.hero.z - (origin?.z ?? 0);
    chamber.visible = true;
    chamber.position.set(ox, CHAMBER_Y, oz);
    chamber.scale.setScalar(f.radius);
    mat.opacity = f.opacity;
    for (let i = 0; i < pos.count; i++) {
      const nx = dirs[i * 3], ny = dirs[i * 3 + 1], nz = dirs[i * 3 + 2];
      const c = chamberPoint(look, nx, ny, nz, sec);
      pos.setXYZ(i, nx * c.scale, ny * c.scale, nz * c.scale);
      cols[i * 3] = c.rgb[0]; cols[i * 3 + 1] = c.rgb[1]; cols[i * 3 + 2] = c.rgb[2];
    }
    pos.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
    let n = 0;
    for (let i = 0; i < MAX_MOTES; i++) {
      const m = moteAt(look, i, sec);
      if (!m) continue;
      const a = m.alpha * f.k;
      motePos[n * 3] = ox + m.x; motePos[n * 3 + 1] = m.y; motePos[n * 3 + 2] = oz + m.z;
      moteCol[n * 3] = look.moteRgb[0] * a; moteCol[n * 3 + 1] = look.moteRgb[1] * a; moteCol[n * 3 + 2] = look.moteRgb[2] * a;
      n++;
    }
    moteGeo.setDrawRange(0, n);
    moteGeo.attributes.position.needsUpdate = true; moteGeo.attributes.color.needsUpdate = true;
    return {engulfed: true, inside: f.camera.inside, fovAdd: f.camera.fovAdd, motes: n, hero: engulfHeroPose(e, now)};
  }

  const clear = () => { e = null; update(0); };
  const dispose = () => {
    parent.remove(chamber); parent.remove(motes);
    geo.dispose(); mat.dispose(); moteGeo.dispose(); motes.material.dispose();
  };
  return {frame, update, clear, dispose, get state() { return e; }};
}
