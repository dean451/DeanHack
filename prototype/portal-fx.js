// Magic portals come alive. The bridge says which way a seen portal leads ("sheol", "quest",
// "ludios", "planes" or "other", going by either of its ends).
//
// animatePortal(model, style): trap.js's standing-stone arch keeps its shape. Its rift now turns,
// with each arc spinning at its own speed and alternate arcs turning the other way. The rift
// breathes, a glow pulses behind it, and the motes are drawn into it in a slow spiral. The quest
// portal burns amber, Ludios's gold, and the Planes' a pale starlight; any other stays violet.
//
// createSheolVortex(seed): the portal to Sheol (and back out of it) is no arch but an icy vortex.
// The floor sinks into a frosted funnel with glowing spiral arms turning down into a cold, bright
// eye. Three pale ribbons twist up out of it, widening as they rise. Ice shards and snow are
// sucked round and down into the eye, low mist circles the rim, and frost spikes stand round
// the edge.
//
// Both animate from userData.animate(t), which live.js calls for everything on a visible tile.
// Everything is a function of t.

import * as THREE from 'three';
import {softDot, rng, smooth} from './fx-textures.js';

export const PORTAL_TINTS = {quest: 0xffb84a, ludios: 0xffe07a, planes: 0xd6eaff};
export const VORTEX = {radius: .44, depth: .16, height: 1.15, shards: 9, snow: 70, ribbons: 3};

// Tint and animate trap.js's portal model. Returns false if it has no rift to animate.
export function animatePortal(model, style = 'other', seed = 0) {
  const rift = model.getObjectByName('rift');
  if (!rift) return false;
  const tint = PORTAL_TINTS[style];
  const arcs = rift.children.filter(o => o.geometry?.type === 'TorusGeometry');
  const core = rift.children.find(o => o.geometry?.type === 'CircleGeometry');
  if (tint != null) {
    const c = new THREE.Color(tint);
    arcs.forEach((a, i) => { const k = c.clone().offsetHSL(0, 0, (i % 3 - 1) * .08); a.material.color.copy(k); a.material.emissive.copy(k); });
    if (core) core.material.emissive.copy(c).multiplyScalar(.18);
  }
  const bases = arcs.map(a => a.rotation.z);
  const motes = model.children.filter(o => o.geometry?.type === 'OctahedronGeometry');
  const moteBase = motes.map(m => ({a: Math.atan2(m.position.y - rift.position.y, m.position.x), r: Math.hypot(m.position.x, m.position.y - rift.position.y), z: m.position.z}));
  const glowMat = new THREE.SpriteMaterial({map: softDot(THREE), color: tint ?? 0xd060ff, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false});
  const glow = new THREE.Sprite(glowMat); glow.position.set(0, rift.position.y, 0); glow.scale.set(.95, 1.2, 1); model.add(glow);
  const phase = rng(seed + 7)() * Math.PI * 2, sy = rift.scale.y;
  model.userData.animate = t => {
    arcs.forEach((a, i) => { a.rotation.z = bases[i] + (i % 2 ? -1 : 1) * t * (1.1 + i * .28); });
    const breathe = 1 + .045 * Math.sin(t * 1.9 + phase);
    rift.scale.set(breathe, sy * breathe, 1);
    if (core) core.material.emissiveIntensity = 1 + .6 * Math.sin(t * 2.6 + phase);
    glowMat.opacity = .38 + .16 * Math.sin(t * 2.6 + phase);
    motes.forEach((m, i) => {
      const b = moteBase[i], u = (t * .32 + i / motes.length) % 1, r = b.r * (1 - u) + .02;
      const a = b.a + u * 5;
      m.position.set(Math.cos(a) * r * .9, rift.position.y + Math.sin(a) * r * 1.2, b.z * (1 - u));
      m.scale.setScalar(Math.max(.05, 1 - u * u));
      m.rotation.set(t * 2 + i, t * 3, 0);
    });
  };
  model.userData.animate(0);
  const prior = model.userData.dispose;
  model.userData.dispose = () => { prior?.(); glowMat.dispose(); };
  return true;
}

// The funnel's height at radius r: flat at the rim, sinking smoothly to the eye.
export function funnelY(r) {
  const {radius, depth} = VORTEX;
  if (r >= radius) return 0;
  const k = 1 - r / radius;
  return -depth * k * k * (1.4 - .4 * k);
}

// Where a shard (or snowflake) is on its way into the eye. u runs 0 (at the rim, up high) to 1
// (swallowed); a0 is its starting angle and h0 its starting height.
export function intoEye(u, a0, h0, rim = VORTEX.radius) {
  const r = rim * (1 - smooth(u)) ** 1.2 + .015;
  const a = a0 - u * 7.5;                        // the vortex turns clockwise, seen from above
  const y = h0 * (1 - u) ** 1.5 + funnelY(r) * smooth(u * 1.4) + .02;
  return {x: Math.cos(a) * r, y, z: Math.sin(a) * r, a};
}

let spiralTex = null, ribbonTex = null;
// Spiral arms: bright log-spiral bands on a darker base, fading to nothing at the rim.
function spiralTexture() {
  if (spiralTex) return spiralTex;
  const n = 128, d = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, r = Math.hypot(x, y), a = Math.atan2(y, x);
    const arms = Math.pow(.5 + .5 * Math.cos(a * 4 + Math.log(r + .02) * 7), 3);
    const v = Math.min(1, .25 + .75 * arms * Math.min(1, r * 2.2)) * (r > .98 ? 0 : 1);
    const k = (i + j * n) * 4; d[k] = d[k + 1] = d[k + 2] = Math.round(255 * v); d[k + 3] = 255;
  }
  spiralTex = new THREE.DataTexture(d, n, n);
  spiralTex.magFilter = spiralTex.minFilter = THREE.LinearFilter; spiralTex.needsUpdate = true;
  return spiralTex;
}
// Along a ribbon (u) it fades out towards the top; across it (v) it has soft edges.
function ribbonTexture() {
  if (ribbonTex) return ribbonTex;
  const n = 64, d = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const u = (i + .5) / n, v = (j + .5) / n, k = (i + j * n) * 4;
    d[k] = d[k + 1] = d[k + 2] = 255;
    d[k + 3] = Math.round(255 * Math.min(1, u * 6) * (1 - u) ** 1.2 * Math.sin(v * Math.PI) ** .6);
  }
  ribbonTex = new THREE.DataTexture(d, n, n);
  ribbonTex.magFilter = ribbonTex.minFilter = THREE.LinearFilter; ribbonTex.needsUpdate = true;
  return ribbonTex;
}

export function createSheolVortex(seed = 0) {
  const g = new THREE.Group(); g.name = 'Trap (portal sheol)'; g.userData.hidesFloor = true;
  const geometries = [], materials = [], textures = [];
  const rand = rng(seed + 11);
  const keep = (geo, mat) => { geometries.push(geo); materials.push(mat); return new THREE.Mesh(geo, mat); };
  // The funnel: the whole tile, so the floor slab can go. Frosted stone at the corners, blue ice
  // down the slope, a near-black hole with a cold glow at the eye.
  const plane = new THREE.PlaneGeometry(1, 1, 36, 36); plane.rotateX(-Math.PI / 2);
  const pos = plane.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const rim = new THREE.Color(0xb9c8d4), ice = new THREE.Color(0x4f9ad6), deep = new THREE.Color(0x0a1830);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    pos.setY(i, funnelY(r));
    const k = Math.min(1, r / VORTEX.radius);
    c.copy(deep).lerp(ice, smooth(k * 1.6)).lerp(rim, smooth((k - .75) / .25));
    const frost = .92 + .16 * Math.sin(x * 41 + z * 29) * Math.sin(x * 17 - z * 23);
    col.set([c.r * frost, c.g * frost, c.b * frost], i * 3);
  }
  plane.setAttribute('color', new THREE.BufferAttribute(col, 3)); plane.computeVertexNormals();
  const arms = spiralTexture().clone(); arms.needsUpdate = true; arms.center.set(.5, .5); textures.push(arms);
  const funnelMat = new THREE.MeshStandardMaterial({vertexColors: true, map: arms, roughness: .22, metalness: .15, emissive: 0x3aa0ff, emissiveMap: arms, emissiveIntensity: .8});
  const funnel = keep(plane, funnelMat); funnel.receiveShadow = true; g.add(funnel);
  // The eye: a cold glow deep in the funnel.
  const eyeMat = new THREE.SpriteMaterial({map: softDot(THREE), color: 0xc8f0ff, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false});
  materials.push(eyeMat); const eye = new THREE.Sprite(eyeMat); eye.position.y = -VORTEX.depth + .05; g.add(eye);
  // Ribbons twisting up out of the eye, widening as they rise.
  const ribbons = [], ribbonColors = [0xd8f4ff, 0x8fd0ff, 0xffffff];
  for (let k = 0; k < VORTEX.ribbons; k++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, h = u * VORTEX.height, r = .05 + .3 * u ** 1.3, a = k / VORTEX.ribbons * Math.PI * 2 + u * Math.PI * 3.2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, -VORTEX.depth + .04 + h, Math.sin(a) * r));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .012 + .006 * k, 5, false);
    const mat = new THREE.MeshBasicMaterial({map: ribbonTexture(), color: ribbonColors[k], transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide});
    const o = keep(geo, mat); o.renderOrder = 2; g.add(o); ribbons.push(o);
  }
  // Ice shards being drawn into the eye.
  const shardMat = new THREE.MeshStandardMaterial({color: 0xe4f7ff, emissive: 0x6cc4ff, emissiveIntensity: .7, roughness: .1, metalness: .1, transparent: true, opacity: .88});
  materials.push(shardMat);
  const shardGeo = new THREE.OctahedronGeometry(.03, 0); shardGeo.scale(.6, 1.7, .6); geometries.push(shardGeo);
  const shards = [];
  for (let i = 0; i < VORTEX.shards; i++) {
    const s = new THREE.Mesh(shardGeo, shardMat); s.castShadow = true; g.add(s);
    shards.push({s, a0: rand() * Math.PI * 2, h0: .25 + rand() * .6, speed: .16 + rand() * .1, off: rand()});
  }
  // Snow: points on the same inward spiral, quicker and lower.
  const snowGeo = new THREE.BufferGeometry(), snowPos = new Float32Array(VORTEX.snow * 3);
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3)); geometries.push(snowGeo);
  const snowMat = new THREE.PointsMaterial({map: softDot(THREE), color: 0xf2fbff, size: .045, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false});
  materials.push(snowMat); const snow = new THREE.Points(snowGeo, snowMat); snow.frustumCulled = false; g.add(snow);
  const flakes = Array.from({length: VORTEX.snow}, () => ({a0: rand() * Math.PI * 2, h0: .05 + rand() * .7, speed: .25 + rand() * .3, off: rand()}));
  // Low mist circling the rim.
  const wisps = [];
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.PlaneGeometry(.28, .16); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({map: softDot(THREE), color: 0xe8f6ff, transparent: true, opacity: .22, depthWrite: false});
    const o = keep(geo, mat); g.add(o); wisps.push(o);
  }
  // Frost spikes standing round the edge (static).
  const spikeMat = new THREE.MeshStandardMaterial({color: 0xdff4ff, emissive: 0x3d8fcf, emissiveIntensity: .35, roughness: .15, transparent: true, opacity: .9});
  materials.push(spikeMat);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2 + rand() * .3, r = .4 + rand() * .05, h = .06 + rand() * .1;
    const geo = new THREE.ConeGeometry(.018 + rand() * .01, h, 5); geometries.push(geo);
    const o = new THREE.Mesh(geo, spikeMat); o.position.set(Math.cos(a) * r, h / 2 - .005, Math.sin(a) * r);
    o.rotation.set((rand() - .5) * .5, 0, (rand() - .5) * .5); o.castShadow = true; g.add(o);
  }
  const phase = rand() * Math.PI * 2;
  g.userData.animate = t => {
    arms.rotation = t * 1.3;                     // arms turn clockwise, down into the eye
    funnelMat.emissiveIntensity = .7 + .25 * Math.sin(t * 1.5 + phase);
    const pulse = .5 + .5 * Math.sin(t * 2.2 + phase);
    eyeMat.opacity = .65 + .35 * pulse; eye.scale.setScalar(.34 + .1 * pulse);
    ribbons.forEach((o, k) => { o.rotation.y = -t * (1.5 + k * .45); });
    for (const sh of shards) {
      const u = (t * sh.speed + sh.off) % 1, p = intoEye(u, sh.a0, sh.h0);
      sh.s.position.set(p.x, p.y, p.z);
      sh.s.rotation.set(t * 3 + sh.a0, -p.a, t * 2);
      sh.s.scale.setScalar(Math.max(.02, 1 - u ** 4));
    }
    flakes.forEach((f, i) => {
      const u = (t * f.speed + f.off) % 1, p = intoEye(u, f.a0, f.h0);
      snowPos[i * 3] = p.x; snowPos[i * 3 + 1] = p.y; snowPos[i * 3 + 2] = p.z;
    });
    snowGeo.attributes.position.needsUpdate = true;
    wisps.forEach((o, i) => {
      const a = -t * .6 + i * Math.PI / 2, r = .27 + .03 * Math.sin(t * .7 + i);
      o.position.set(Math.cos(a) * r, .03 + .015 * Math.sin(t + i), Math.sin(a) * r); o.rotation.y = -a;
      o.material.opacity = .14 + .1 * Math.sin(t * .9 + i * 1.7);
    });
  };
  g.userData.animate(0);
  g.userData.dispose = () => { for (const geo of geometries) geo.dispose(); for (const m of materials) m.dispose(); for (const x of textures) x.dispose(); };
  return g;
}
