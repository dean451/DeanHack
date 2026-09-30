// Doors breaking. When a door is kicked in, forced with a force bolt or wand of striking,
// razed by digging or smashed by a giant, the client only sees a frame where the door tile
// has become a plain doorway (terrain 'floor' with no `door:'open'`), and live.js drops the
// door model in one frame. This module plays the break over that swap: the leaf bursts into
// plank shards and a few bits of strap iron that fly out away from the hero (the way the
// blow pushed them), tumble, bounce and skid on the floor, lie there a moment and sink
// away, with a puff of dust and wood chips from the doorway.
//
// findBreaks(), shardsFor(), stepShard() and dustFrame() are pure, so they can be tested
// without a renderer; createDoorBreak() draws every shard in one instanced mesh and the
// dust in one point cloud.

export const MAX_BREAKS = 3;
export const SHARDS = 16, DUST = 28;
// How long a break lasts, when the shards start sinking away, and the dust's life (s).
export const BREAK = {life: 3.2, sink: 2.5, dust: 1.1, gravity: 9.8, bounce: .32, scuff: .55, friction: 6, spinDamp: 5, flatten: 8};
// The leaf's size, from door.js's DOOR_LEAF (width .8, height .95, off the floor by .03).
const LEAF_W = .8, LEAF_H = .95, LEAF_Y = .03;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hash = (a, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

const cellMap = frame => new Map((frame?.cells ?? []).map(c => [`${c.x},${c.z}`, c]));
const STANDING = ['wall', 'bars', 'door'];
const isDoor = c => c?.terrain === 'door' || c?.door === 'open';

// The tiles whose door was destroyed between prev and frame, each {x, z, seed, turn, push}.
// seed and turn (0 or π/2 about y) match how live.js built the door; push (±1) is which side
// of the leaf the shards fly to, away from the hero. The tile must be in view in both frames
// (a door broken out of sight and seen later as a doorway doesn't burst), and a level change
// finds nothing. A door that goes from closed to open isn't broken.
export function findBreaks(prev, frame) {
  if (!prev?.cells || !frame?.cells) return [];
  if (prev.branch !== frame.branch || prev.depth !== frame.depth) return [];
  const before = cellMap(prev);
  const out = [];
  for (const c of frame.cells) {
    if (c.terrain !== 'floor' || isDoor(c) || c.visible === false) continue;
    const was = before.get(`${c.x},${c.z}`);
    if (!isDoor(was) || was.visible === false) continue;
    // The door faced along the walls it joined, as live.js turns it (from prev).
    const joined = (dx, dz) => Number(STANDING.includes(before.get(`${c.x + dx},${c.z + dz}`)?.terrain));
    const h = joined(-1, 0) + joined(1, 0), v = joined(0, -1) + joined(0, 1);
    const turn = h !== v && v > h ? Math.PI / 2 : 0;
    // Across the leaf is +z at turn 0 and +x at π/2. Shards go away from the hero.
    const px = frame.player?.x ?? prev.player?.x, pz = frame.player?.z ?? prev.player?.z;
    const across = Number.isFinite(px) && Number.isFinite(pz)
      ? (px - c.x) * Math.sin(turn) + (pz - c.z) * Math.cos(turn) : 0;
    const seed = c.x * 61 + c.z * 37;
    const push = across > 0 ? -1 : across < 0 ? 1 : (hash(seed, 1) < .5 ? -1 : 1);
    out.push({x: c.x, z: c.z, seed, turn, push});
  }
  return out;
}

// The shards of one break, in the door's own frame (x along the leaf, z across it, y up
// from the floor; +z is the push side). Each is a plank splinter or a bit of iron with a
// size, a start position on the leaf, a velocity, a spin and a tint (0..1 shade).
export function shardsFor(seed = 0) {
  const out = [];
  for (let i = 0; i < SHARDS; i++) {
    const r = k => hash(seed, i, k);
    const iron = i < 2;
    // Planks: long along y, a few cm wide, as thick as the leaf. Iron: short flat straps.
    const size = iron ? [.1 + .08 * r(1), .025, .012] : [.035 + .05 * r(1), .1 + .26 * r(2), .028];
    // Spread over the leaf, more of them low down where a kick lands.
    const x = (r(3) - .5) * LEAF_W * .9, y = LEAF_Y + LEAF_H * (.08 + .8 * r(4) ** 1.4);
    // Out across the leaf and away from its middle, and up a little.
    const out_ = .9 + 1.3 * r(5);
    const vel = [x * (.8 + 1.2 * r(6)) + (r(7) - .5) * .6, .6 + 1.8 * r(8), out_];
    const spin = [(r(9) - .5) * 22, (r(10) - .5) * 14, (r(11) - .5) * 22];
    const sh = {iron, size, pos: [x, y, (r(12) - .5) * .03], vel, spin, rot: [0, 0, (r(13) - .5) * .4], tint: .75 + .3 * r(14)};
    sh.pos[1] = Math.max(y, halfHeight(sh));
    out.push(sh);
  }
  return out;
}

// How far a shard reaches above and below its centre, for its 'YXZ' rotation: the y row
// of Ry·Rx·Rz is (cos x sin z, cos x cos z, -sin x).
export function halfHeight(s) {
  const cx = Math.cos(s.rot[0]), sx = Math.sin(s.rot[0]);
  const cz = Math.cos(s.rot[2]), sz = Math.sin(s.rot[2]);
  return .5 * (Math.abs(cx * sz) * s.size[0] + Math.abs(cx * cz) * s.size[1] + Math.abs(sx) * s.size[2]);
}

// Step one shard by h seconds: gravity, a bounce off the floor (losing most of its speed),
// then skidding to a stop. Its centre is kept its vertical half extent off the floor, so it
// never dips below it, and once it lies flat it rests on its face.
export function stepShard(s, h) {
  const g = BREAK.gravity;
  s.vel[1] -= g * h;
  for (let k = 0; k < 3; k++) { s.pos[k] += s.vel[k] * h; s.rot[k] += s.spin[k] * h; }
  if (s.pos[1] <= halfHeight(s)) {
    // An impact loses much of the sideways speed too.
    if (s.vel[1] < 0) { if (s.vel[1] < -.4) { s.vel[0] *= BREAK.scuff; s.vel[2] *= BREAK.scuff; } s.vel[1] = -s.vel[1] * BREAK.bounce; }
    if (s.vel[1] < .4) s.vel[1] = 0;
    // On the floor it skids and stops turning over, and settles flat on its face: rot is a
    // 'YXZ' Euler, so pitch (x) goes to an odd multiple of π/2 and roll (z) to a multiple of
    // π, which puts the shard's thin z axis upright. Its yaw (y) is left where it lands.
    const f = Math.exp(-BREAK.friction * h), d = Math.exp(-BREAK.flatten * h);
    s.vel[0] *= f; s.vel[2] *= f;
    for (let k = 0; k < 3; k++) s.spin[k] *= Math.exp(-BREAK.spinDamp * h);
    const pitch = Math.round((s.rot[0] - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
    const roll = Math.round(s.rot[2] / Math.PI) * Math.PI;
    s.rot[0] = pitch + (s.rot[0] - pitch) * d;
    s.rot[2] = roll + (s.rot[2] - roll) * d;
    s.pos[1] = halfHeight(s);
  }
  return s;
}

// How big a shard is at age t (s): full size, then shrinking into the floor at the end.
export const shardScale = t => 1 - clamp01((t - BREAK.sink) / (BREAK.life - BREAK.sink));

// The dust at age t (s): points in the door's frame with an alpha, or [] when it's gone.
export function dustFrame(seed, t) {
  if (!(t >= 0) || t >= BREAK.dust) return [];
  const k = t / BREAK.dust, e = 1 - (1 - k) ** 3;
  const out = [];
  for (let j = 0; j < DUST; j++) {
    const r = n => hash(seed, j + 40, n);
    const chip = j % 4 === 0;
    const x = (r(1) - .5) * LEAF_W + (r(2) - .5) * .5 * e;
    // Dust billows out and rises; chips fly out and fall.
    const z = (.1 + .7 * r(3)) * e * (chip ? 1.4 : 1);
    const y = chip ? Math.max(.01, .15 + .6 * r(4) + 1.5 * t - 4.9 * t * t) : .05 + .5 * r(4) * .6 + .35 * e * r(5);
    out.push({x, y, z, chip, alpha: (1 - k) * (chip ? 1 : .55) * clamp01(k * 12)});
  }
  return out;
}

// Draws breaks. frame(frame) starts a burst on every tile whose door was destroyed since the
// last frame, add(brk) starts one directly and update(dt, origin) advances them, returning
// {count, shards, dust}.
export function createDoorBreak(THREE, parent) {
  const shardGeo = new THREE.BoxGeometry(1, 1, 1);
  const shardMat = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .85, metalness: .1});
  const shardMesh = new THREE.InstancedMesh(shardGeo, shardMat, MAX_BREAKS * SHARDS);
  shardMesh.count = 0; shardMesh.frustumCulled = false; shardMesh.castShadow = true; shardMesh.userData.part = 'door-break-shards';
  parent.add(shardMesh);

  const dustPos = new Float32Array(MAX_BREAKS * DUST * 3), dustCol = new Float32Array(MAX_BREAKS * DUST * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
  dustGeo.setDrawRange(0, 0);
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({size: .05, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending}));
  dust.frustumCulled = false; dust.renderOrder = 3; dust.userData.part = 'door-break-dust';
  parent.add(dust);

  const breaks = [];
  let prev = null;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qTurn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const col = new THREE.Color(), wood = new THREE.Color(0x7a5534), iron = new THREE.Color(0x3a3634);
  const dustTint = new THREE.Color(0x8a7a66), chipTint = new THREE.Color(0xb08a5a);

  function add(brk) {
    if (!brk || !Number.isFinite(brk.x) || !Number.isFinite(brk.z)) return null;
    const b = {...brk, turn: brk.turn ?? 0, push: brk.push < 0 ? -1 : 1, seed: brk.seed ?? 0, t: 0};
    b.shards = shardsFor(b.seed);
    const same = breaks.findIndex(o => o.x === b.x && o.z === b.z);
    if (same >= 0) breaks.splice(same, 1);
    breaks.push(b);
    if (breaks.length > MAX_BREAKS) breaks.shift();
    return b;
  }
  const frame = fr => {
    const out = findBreaks(prev, fr).map(add);
    if (fr?.cells) prev = fr;
    return out;
  };

  function update(dt, origin) {
    const h = Math.min(Math.max(dt || 0, 0), .1);
    const ox = origin?.x ?? 0, oz = origin?.z ?? 0;
    for (let i = breaks.length - 1; i >= 0; i--) {
      breaks[i].t += h;
      if (breaks[i].t >= BREAK.life) breaks.splice(i, 1);
    }
    let n = 0, d = 0;
    for (const b of breaks) {
      const cos = Math.cos(b.turn), sin = Math.sin(b.turn), cx = b.x - ox, cz = b.z - oz;
      // Door-local (x along the leaf, z across, pushed) to the scene, turned like the door.
      const at = (x, y, z) => p.set(cx + x * cos + z * b.push * sin, y, cz - x * sin + z * b.push * cos);
      const k = shardScale(b.t);
      for (const sh of b.shards) {
        if (h > 0) { let left = h; while (left > 0) { const st = Math.min(left, 1 / 60); stepShard(sh, st); left -= st; } }
        at(...sh.pos);
        // Sinking: shrink towards the floor.
        p.y = sh.pos[1] * k;
        q.setFromEuler(e.set(sh.rot[0], sh.rot[1], sh.rot[2], 'YXZ')).premultiply(qTurn.setFromAxisAngle(up, b.turn));
        s.set(sh.size[0] * k, sh.size[1] * k, sh.size[2] * k);
        shardMesh.setMatrixAt(n, m4.compose(p, q, s));
        shardMesh.setColorAt(n, col.copy(sh.iron ? iron : wood).multiplyScalar(sh.tint));
        n++;
      }
      for (const pt of dustFrame(b.seed, b.t)) {
        at(pt.x, pt.y, pt.z);
        const c = pt.chip ? chipTint : dustTint;
        dustPos.set([p.x, p.y, p.z], d * 3);
        dustCol.set([c.r * pt.alpha, c.g * pt.alpha, c.b * pt.alpha], d * 3);
        d++;
      }
    }
    shardMesh.count = n;
    shardMesh.instanceMatrix.needsUpdate = true;
    if (shardMesh.instanceColor) shardMesh.instanceColor.needsUpdate = true;
    dustGeo.setDrawRange(0, d);
    dustGeo.attributes.position.needsUpdate = true;
    dustGeo.attributes.color.needsUpdate = true;
    return {count: breaks.length, shards: n, dust: d};
  }

  const clear = () => { breaks.length = 0; prev = null; update(0); };
  const dispose = () => {
    clear();
    parent.remove(shardMesh); parent.remove(dust);
    shardGeo.dispose(); shardMat.dispose(); dustGeo.dispose(); dust.material.dispose();
  };
  return {add, frame, update, clear, dispose};
}
