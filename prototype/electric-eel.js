import * as THREE from 'three';

// The electric eel. It used to be the giant eel in blue with a few glowing dots. Now it rears
// out of the water as something you don't want near your rings: a long, near-black, slate-blue
// body with a sickly orange throat and belly, the electric organ glowing in dashed stripes
// down both flanks, a ribbon fin rippling under the tail, and a broad flat head with a hinged
// maw full of needle teeth, beady ice-blue slit eyes under a scowling brow and glowing
// sensory pits.
//
// And it is never quiet. Jagged arcs crackle across its coils all the time, flickering on and
// off; every second or two it snaps a big arc down into the floor with a flash and a pop of
// sparks. When it bites, the charge surges: arcs spit out of the open mouth, and a big pop
// bursts where the bite lands. When it dies it throws one last discharge and fizzles out.
//
// Handles, as the old eel: body (the front, rearing), tail (the rear coils, which the snake
// quirk sways), head and jaw (for jaw.js). g.userData.updateEel(t, actions) animates the
// electricity; live.js calls it every frame with the actor's action queue.
//
// jagged() and snapTimes() are pure; the model owns its own seeded random stream so two
// eels crackle differently.

// About .82 of a tile long and .6 tall: a bit bigger than the giant eel, inside its tile.
export const EEL_SCALE = .95;
// Arcs: at most this many at once, each this many segments long.
export const MAX_ARCS = 12, ARC_SEGS = 7;
// An idle arc's white core width (model units, before EEL_SCALE), and its blue glow's width as a
// multiple of the core. Snaps and bites draw thicker.
export const ARC_W = .011, GLOW_W = 3.5;
// Idle crackle re-draws every FLICKER_MS[0]..[1] ms; snaps come every SNAP_S[0]..[1] seconds
// and last SNAP_MS.
export const FLICKER_MS = [40, 85];
export const SNAP_S = [.8, 2.3];
export const SNAP_MS = 140;
// Sparks from snaps and bites: pool size, lifetime (s).
export const SPARKS = 64, SPARK_LIFE = .45;
// How long a flash lasts (s), and how long a death takes to fizzle out (s).
export const FLASH_S = .12, FIZZLE_S = 1.1;
// When in a bite (seconds into the attack action) the pop lands.
export const BITE_POP_S = .18;

export const ARC_CORE = 0xf2fbff, ARC_GLOW = 0x5cc8ff, ORGAN = 0x8ae8ff;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A jagged bolt from a to b ([x, y, z]) in `segs` pieces: every inner point is pushed off the
// straight line by up to `jag` of its length, most in the middle. rand() gives 0..1.
export function jagged(a, b, segs, jag, rand) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const pts = [a.slice()];
  for (let i = 1; i < segs; i++) {
    const u = i / segs, w = Math.sin(Math.PI * u) * jag * len;
    pts.push([a[0] + (b[0] - a[0]) * u + (rand() * 2 - 1) * w, a[1] + (b[1] - a[1]) * u + (rand() * 2 - 1) * w,
      a[2] + (b[2] - a[2]) * u + (rand() * 2 - 1) * w]);
  }
  pts.push(b.slice());
  return pts;
}

// The snap times (s) from t0 up to t1 for a stream of gaps between lo and hi seconds.
export function snapTimes(t0, t1, rand, [lo, hi] = SNAP_S) {
  const out = [];
  for (let t = t0 + lo + rand() * (hi - lo); t < t1; t += lo + rand() * (hi - lo)) out.push(t);
  return out;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const col = hex => new THREE.Color(hex);

// A tube swept along a curve with its own radius and colour at each point: r(s), and
// color(s, up) where up is how far round the tube faces up (1 on the back, -1 on the belly).
function sweep(points, n, radial, r, color) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => V(...p)));
  const frames = curve.computeFrenetFrames(n, false);
  const pos = [], cols = [], idx = [];
  const upAxis = V(0, 1, 0), p = V(), nrm = V();
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    curve.getPointAt(s, p);
    const N = frames.normals[i], B = frames.binormals[i], rad = r(s);
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2;
      nrm.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      pos.push(p.x + nrm.x * rad, p.y + nrm.y * rad, p.z + nrm.z * rad);
      const c = color(s, nrm.dot(upAxis));
      cols.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return {geo, curve, frames};
}

// The skin: slate on the back, mottled, darkening to near black, going over to a dirty
// orange on the belly.
const BACK = col(0x0c1119), FLANK = col(0x1d2c3c), BELLY = col(0xb8642a), THROAT = col(0xd8843a);
function skin(seed) {
  return (s, up) => {
    const m = .5 + .5 * Math.sin(s * 61 + seed) * Math.sin(s * 23 + seed * 2);
    const c = up > .15 ? BACK.clone().lerp(FLANK, (1 - up) * .6 + m * .15) : FLANK.clone().lerp(s > .7 && seed === 1 ? THROAT : BELLY, Math.min(1, (-up + .15) * 1.3));
    return c.multiplyScalar(.85 + .3 * m);
  };
}

// The rearing front (body frame) and the coils behind (tail frame), as the old eel's, longer.
const FRONT = [[0, .06, -.05], [.02, .1, .02], [.06, .22, .05], [.02, .36, .06], [-.03, .46, .1], [-.02, .52, .17]];
const REAR = [[0, 0, 0], [.13, .06, -.01], [.23, .2, -.02], [.12, .36, -.03], [-.1, .4, -.04], [-.24, .3, -.045], [-.22, .13, -.05], [-.08, .04, -.055]];

export function createElectricEel({seed = (Math.random() * 1e9) | 0} = {}) {
  const rand = rng(seed);
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body); g.name = 'electric eel'; g.scale.setScalar(EEL_SCALE);
  const skinMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .32, metalness: .1});
  // The organ glow is this eel's own, so it can pulse with its own crackle.
  const organ = new THREE.MeshStandardMaterial({color: 0x16384a, emissive: ORGAN, emissiveIntensity: 1.4, roughness: .3, toneMapped: false});
  const eyeMat = new THREE.MeshStandardMaterial({color: 0xcff4ff, emissive: 0x9ae8ff, emissiveIntensity: 2.2, roughness: .15});
  const dark = new THREE.MeshStandardMaterial({color: 0x07090c, roughness: .4});
  const tooth = new THREE.MeshStandardMaterial({color: 0xe8e2cc, roughness: .3});
  const mouth = new THREE.MeshStandardMaterial({color: 0x3a0a10, roughness: .9, side: THREE.DoubleSide});
  const finMat = new THREE.MeshStandardMaterial({color: 0x1a2430, roughness: .5, transparent: true, opacity: .82, side: THREE.DoubleSide});
  const materials = [skinMat, organ, eyeMat, dark, tooth, mouth, finMat];
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };

  // The front, thick at the base and narrowing to the neck.
  const front = sweep(FRONT, 40, 12, s => .062 - .016 * s, skin(1));
  add(body, front.geo, skinMat);
  // The rear coils on the tail, tapering to a point.
  const tail = new THREE.Group(); tail.position.set(0, .06, -.05); tail.rotation.x = -Math.PI / 2; body.add(tail);
  const rear = sweep(REAR, 56, 10, s => .062 * (1 - .88 * s ** 1.3) + .004, skin(2));
  add(tail, rear.geo, skinMat);

  // The electric organ: dashed glowing stripes down both flanks, front and rear.
  const dashes = [];
  const stripe = (sw, r, from, to, count) => {
    for (let k = 0; k < count; k++) {
      const s0 = from + (to - from) * k / count, s1 = s0 + (to - from) / count * .55;
      for (const side of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 4; i++) {
          const s = s0 + (s1 - s0) * i / 4, idx = Math.round(s * (sw.frames.normals.length - 1));
          const p = sw.curve.getPointAt(s), B = sw.frames.binormals[idx], N = sw.frames.normals[idx];
          // just below the flank's widest point
          const out = r(s) * .98;
          pts.push(p.addScaledVector(B, side * out * .93).addScaledVector(N, -out * .3));
        }
        dashes.push({geo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, .0075, 4, false), parent: sw === front ? body : tail});
      }
    }
  };
  stripe(front, s => .062 - .016 * s, .05, .85, 7);
  stripe(rear, s => .062 * (1 - .88 * s ** 1.3) + .004, .02, .8, 10);
  for (const d of dashes) add(d.parent, d.geo, organ);

  // The ribbon fin under the rear coils, its free edge rippled.
  {
    const pos = [], idx = [], n = 40;
    for (let i = 0; i <= n; i++) {
      const s = .1 + .88 * i / n, idx2 = Math.round(s * (rear.frames.normals.length - 1));
      const p = rear.curve.getPointAt(s), N = rear.frames.normals[idx2];
      const r = .062 * (1 - .88 * s ** 1.3) + .004, h = .05 * Math.sin(Math.PI * (i / n)) + .012;
      const base = p.clone().addScaledVector(N, -r * .8), edge = p.clone().addScaledVector(N, -r - h).addScaledVector(rear.frames.binormals[idx2], .012 * Math.sin(i * 1.3));
      pos.push(base.x, base.y, base.z, edge.x, edge.y, edge.z);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    add(tail, geo, finMat);
  }

  // The head: broad and flat, hinged maw, needle teeth, slit eyes, scowling brow, glowing pits.
  const head = new THREE.Group(); head.position.set(-.02, .53, .19); head.rotation.x = .3; body.add(head);
  const skull = new THREE.SphereGeometry(.07, 20, 12); skull.scale(1.25, .62, 1.75);
  const hc = []; const hp = skull.attributes.position, sk = skin(1);
  for (let i = 0; i < hp.count; i++) { const c = sk(.95, hp.getY(i) / .045); hc.push(c.r, c.g, c.b); }
  skull.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3));
  add(head, skull, skinMat, 0, .012, .04);
  // the gape, lined dark red
  const gape = add(head, new THREE.CircleGeometry(.052, 16), mouth, 0, -.016, .1);
  gape.scale.set(1.15, .5, 1); gape.rotation.x = -.35;
  // upper needle teeth, curved back
  for (let k = 0; k < 11; k++) {
    const a = (k / 10 - .5) * 2.3, x = Math.sin(a) * .066, z = .04 + Math.cos(a) * .085;
    const t = add(head, new THREE.ConeGeometry(.0045, .03 - .01 * Math.abs(a) / 1.15, 4), tooth, x, -.018, z);
    t.rotation.set(Math.PI - .25, 0, 0);
  }
  // the lower jaw, hinged at the back of the head
  const jaw = new THREE.Group(); jaw.position.set(0, -.024, -.05); jaw.rotation.x = .12; jaw.userData.reach = .9; head.add(jaw);
  const jg = new THREE.SphereGeometry(.066, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); jg.scale(1.18, .42, 1.7);
  const jc = []; const jp = jg.attributes.position;
  for (let i = 0; i < jp.count; i++) { const c = THROAT.clone().lerp(BACK, Math.max(0, Math.min(1, (jp.getY(i) + .028) / .028)) * .3); jc.push(c.r, c.g, c.b); }
  jg.setAttribute('color', new THREE.Float32BufferAttribute(jc, 3));
  add(jaw, jg, skinMat, 0, 0, .09);
  for (let k = 0; k < 10; k++) {
    const a = (k / 9 - .5) * 2.1, x = Math.sin(a) * .062, z = .09 + Math.cos(a) * .082;
    add(jaw, new THREE.ConeGeometry(.0042, .026 - .008 * Math.abs(a), 4), tooth, x, .008, z).rotation.x = .2;
  }
  // eyes: small, set forward, ice-blue with vertical slits, under a scowling ridge
  for (const side of [-1, 1]) {
    add(head, new THREE.SphereGeometry(.014, 12, 8), eyeMat, side * .058, .034, .1);
    const slit = add(head, new THREE.BoxGeometry(.003, .018, .004), dark, side * .064, .034, .11);
    slit.rotation.y = side * .5;
    // painted BACK through the skin material's vertex colours, so the brows merge with the skull
    const browGeo = new THREE.BoxGeometry(.05, .012, .022);
    browGeo.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({length: browGeo.attributes.position.count}, () => [BACK.r, BACK.g, BACK.b]).flat(), 3));
    const brow = add(head, browGeo, skinMat, side * .045, .05, .098);
    brow.rotation.set(.2, side * -.35, side * -.5);
    // the sensory pits along the jaw line, faintly lit
    for (let k = 0; k < 4; k++) add(head, new THREE.SphereGeometry(.005, 6, 4), organ, side * (.07 - k * .004), -.004, .07 - k * .03);
  }

  // ---- the electricity, drawn in the body's frame ----
  const box = new THREE.BoxGeometry(1, 1, 1);
  // Each arc segment is two instances of one mesh (one draw): a thin white-hot core and a wider
  // blue glow round it. The blend is additive, so the glow's .6 opacity goes into its colour.
  const arcMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
  const N = MAX_ARCS * ARC_SEGS;
  const arcMesh = new THREE.InstancedMesh(box, arcMat, N * 2);
  const flashGeo = new THREE.IcosahedronGeometry(1, 1);
  const flashMat = new THREE.MeshBasicMaterial({color: 0xbfeaff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
  const flash = new THREE.Mesh(flashGeo, flashMat); flash.visible = false;
  const sparkGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(SPARKS * 3), sc = new Float32Array(SPARKS * 3);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const sparkMat = new THREE.PointsMaterial({size: .05, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  // The unit box and flash ball would make stageCreature measure the eel as a metre-wide
  // blob, so their bounds are pinned to a point inside the body. keepOpaque keeps the death
  // fade from swapping their materials, so the last discharge can still fizzle out.
  for (const geo of [box, flashGeo]) geo.boundingBox = new THREE.Box3(V(0, .1, 0), V(0, .1, 0));
  for (const o of [arcMesh, flash, sparks]) { o.frustumCulled = false; o.renderOrder = 5; o.userData.part = 'electricity'; o.userData.keepOpaque = true; body.add(o); }
  arcMesh.count = 0; sparkGeo.setDrawRange(0, SPARKS);
  materials.push(arcMat, flashMat, sparkMat);
  const geometries = [box, flashGeo, sparkGeo];

  // Anchor points on the skin (body frame): the tail's are moved through its current pose.
  const anchorsFront = [], anchorsRear = [];
  for (let i = 0; i <= 10; i++) anchorsFront.push(front.curve.getPointAt(.05 + .9 * i / 10));
  for (let i = 0; i <= 14; i++) anchorsRear.push(rear.curve.getPointAt(.02 + .9 * i / 14));
  const tmp = V();
  function anchor(pushOut = .07) {
    const useRear = rand() < .55;
    const list = useRear ? anchorsRear : anchorsFront;
    tmp.copy(list[(rand() * list.length) | 0]);
    if (useRear) { tail.updateMatrix(); tmp.applyMatrix4(tail.matrix); }
    return [tmp.x + (rand() * 2 - 1) * pushOut, tmp.y + (rand() * 2 - 1) * pushOut, tmp.z + (rand() * 2 - 1) * pushOut];
  }
  const mouthAt = () => { head.updateMatrix(); const m = V(0, -.01, .16).applyMatrix4(head.matrix); return [m.x, m.y, m.z]; };

  // Live state.
  const spark = Array.from({length: SPARKS}, () => ({p: [0, 0, 0], v: [0, 0, 0], life: 0}));
  let last = null, arcs = [], nextFlicker = 0, nextSnap = null, snapUntil = -1, flashAt = -1, flashPos = [0, 0, 0], flashSize = .1;
  let spike = 0, dying = null, lastAge = -1, lastAction = null;
  const state = {arcs: 0, sparks: 0, flash: 0, spike: 0, intensity: 1};

  function burst(at, count, speed) {
    for (let i = 0, made = 0; i < SPARKS && made < count; i++) {
      const s = spark[i];
      if (s.life > 0) continue;
      const th = rand() * Math.PI * 2, ph = rand() * 1.2 - .2, v = speed * (.4 + .8 * rand());
      s.p = at.slice(); s.v = [Math.cos(th) * Math.cos(ph) * v, Math.sin(ph) * v + .4, Math.sin(th) * Math.cos(ph) * v]; s.life = SPARK_LIFE * (.6 + .6 * rand());
      made++;
    }
  }
  function pop(at, size) { flashAt = last; flashPos = at; flashSize = size; spike = 1; burst(at, size > .15 ? 26 : 14, size > .15 ? 2.2 : 1.5); }

  const q = new THREE.Quaternion(), m = new THREE.Matrix4(), p = V(), s = V(), d = V(), x = V(1, 0, 0), c = new THREE.Color();
  function drawArcs(intensity) {
    let n = 0;
    for (const arc of arcs) {
      for (let i = 0; i < arc.pts.length - 1 && n < N; i++) {
        const a = arc.pts[i], b = arc.pts[i + 1];
        d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const len = d.length();
        if (len < 1e-6) continue;
        q.setFromUnitVectors(x, d.divideScalar(len));
        p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
        m.compose(p, q, s.set(len * 1.08, arc.w, arc.w)); arcMesh.setMatrixAt(n * 2, m);
        arcMesh.setColorAt(n * 2, c.setHex(ARC_CORE).multiplyScalar(arc.k * intensity));
        m.compose(p, q, s.set(len * 1.15, arc.w * GLOW_W, arc.w * GLOW_W)); arcMesh.setMatrixAt(n * 2 + 1, m);
        arcMesh.setColorAt(n * 2 + 1, c.setHex(ARC_GLOW).multiplyScalar(arc.k * intensity * .8 * .6));
        n++;
      }
    }
    arcMesh.count = n * 2;
    arcMesh.instanceMatrix.needsUpdate = true; if (arcMesh.instanceColor) arcMesh.instanceColor.needsUpdate = true;
    return n;
  }

  // t in seconds; actions is the actor's queue from actions.js (or null).
  function updateEel(t, actions = null) {
    if (!Number.isFinite(t)) return state;
    const dt = last === null ? 0 : Math.min(.05, Math.max(0, t - last));
    last = t;
    if (nextSnap === null) nextSnap = t + SNAP_S[0] + rand() * (SNAP_S[1] - SNAP_S[0]);
    // A death: one last discharge, then everything fizzles out.
    if (actions?.dead && dying === null) { dying = t; pop(mouthAt(), .22); nextFlicker = t; }
    const fade = dying === null ? 1 : Math.max(0, 1 - (t - dying) / FIZZLE_S);
    const act = actions?.current;
    const biting = act?.kind === 'attack' && !actions?.dead;
    if (act !== lastAction) { lastAge = -1; lastAction = act; }
    const age = actions?.age ?? 0;
    if (biting && lastAge < BITE_POP_S && age >= BITE_POP_S) {
      // the bite lands: a big pop just past the jaws
      const m = mouthAt();
      pop([m[0], m[1] - .02, m[2] + .12], act.result === 'hit' ? .2 : .12);
    }
    if (biting) lastAge = age;
    // Snaps to the floor.
    if (fade > 0 && t >= nextSnap) {
      nextSnap = t + SNAP_S[0] + rand() * (SNAP_S[1] - SNAP_S[0]);
      snapUntil = t + SNAP_MS / 1000;
      nextFlicker = t;
    }
    const snapping = t < snapUntil;
    // Re-draw the crackle on its flicker clock.
    if (t >= nextFlicker) {
      nextFlicker = t + (FLICKER_MS[0] + rand() * (FLICKER_MS[1] - FLICKER_MS[0])) / 1000;
      arcs = [];
      if (fade > 0) {
        const idle = rand() < .08 ? 0 : 1 + ((rand() * 3) | 0);
        for (let i = 0; i < idle * (dying === null ? 1 : 2); i++) {
          const a = anchor(), b = anchor();
          arcs.push({pts: jagged(a, b, ARC_SEGS, .35, rand), w: ARC_W, k: .7 + .3 * rand()});
        }
        if (snapping) {
          const a = anchor(.03), b = [a[0] + (rand() * 2 - 1) * .3, -.05, a[2] + (rand() * 2 - 1) * .3];
          arcs.push({pts: jagged(a, b, ARC_SEGS, .3, rand), w: ARC_W * 1.8, k: 1.3});
          for (let f = 0; f < 2; f++) arcs.push({pts: jagged(a, [b[0] + (rand() * 2 - 1) * .15, -.05, b[2] + (rand() * 2 - 1) * .15], 4, .4, rand), w: ARC_W, k: 1});
          if (flashAt < 0 || t - flashAt > FLASH_S) pop(b, .14);
        }
        if (biting) {
          const m = mouthAt();
          for (let f = 0; f < 4; f++) {
            const b = [m[0] + (rand() * 2 - 1) * .18, m[1] + (rand() * 2 - 1) * .14, m[2] + .2 + rand() * .25];
            arcs.push({pts: jagged(m, b, 5, .4, rand), w: ARC_W * 1.3, k: 1.2});
          }
          for (let i = 0; i < 3; i++) { const a = anchor(), b = anchor(); arcs.push({pts: jagged(a, b, ARC_SEGS, .35, rand), w: ARC_W * 1.15, k: 1}); }
        }
        arcs = arcs.slice(0, MAX_ARCS);
      }
    }
    spike = Math.max(0, spike - dt * 5);
    // Sparks fly, fall and bounce once off the floor.
    let live = 0;
    for (let i = 0; i < SPARKS; i++) {
      const s = spark[i];
      if (s.life > 0) {
        s.life -= dt;
        s.v[1] -= 6 * dt;
        for (let k = 0; k < 3; k++) s.p[k] += s.v[k] * dt;
        if (s.p[1] < -.05) { s.p[1] = -.05; s.v[1] *= -.35; s.v[0] *= .6; s.v[2] *= .6; }
      }
      const k = Math.max(0, s.life) / SPARK_LIFE;
      sp.set(s.p, i * 3);
      sc[i * 3] = .75 * k; sc[i * 3 + 1] = .92 * k; sc[i * 3 + 2] = 1 * k;
      if (s.life > 0) live++;
    }
    sparkGeo.attributes.position.needsUpdate = sparkGeo.attributes.color.needsUpdate = true;
    // The flash.
    const fa = flashAt < 0 ? 1 : (t - flashAt) / FLASH_S;
    flash.visible = fa < 1;
    if (flash.visible) {
      flash.position.set(...flashPos);
      flash.scale.setScalar(flashSize * (.5 + fa));
      flashMat.opacity = (1 - fa) * (1 - fa);
    }
    // The organ and eyes throb with the charge.
    const flick = .75 + .5 * rand();
    organ.emissiveIntensity = fade * (1.1 + .5 * flick * (arcs.length ? 1 : .4) + 3 * spike + (biting ? 1.2 : 0));
    eyeMat.emissiveIntensity = .4 + fade * (1.8 + 2 * spike);
    state.arcs = drawArcs(fade);
    state.sparks = live; state.flash = flash.visible ? flashMat.opacity : 0; state.spike = spike; state.intensity = fade;
    return state;
  }

  g.userData.updateEel = updateEel;
  g.userData.dispose = () => {
    g.traverse(o => { if (o.geometry && !geometries.includes(o.geometry)) o.geometry.dispose(); });
    geometries.forEach(x => x.dispose());
    materials.forEach(m => m.dispose());
  };
  return {g, body, head, jaw, tail, legs: [], wings: [], quirk: 'snake'};
}
