// The vibrating square: the spot below the Sanctum where the invocation is done. It used to share
// the teleport trap's model because both are magenta. Now it is its own thing: a square slab of
// black stone set into the floor, cut with three nested square grooves and a diamond at the
// heart, all glowing magenta. The slab never stops trembling, and its hum beats (two close
// tones, so the glow swells and fades about once a second). Each swell sends a square ripple
// out across the floor, and loose grit on the slab hops and creeps about.
//
// createVibratingSquare(seed) animates from userData.animate(t), which live.js calls for
// everything on a visible tile. Everything is a function of t, and it stays inside its tile.

import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {softDot, rng} from './fx-textures.js';

export const VIBRATE = {plate: .62, top: .03, shake: .004, ripples: 3, ripplePeriod: 1.6, reach: .98, grit: 14};
const HUM = [7, 7.8];   // Hz: the two tones; they beat at .8 Hz

// The hum's loudness at time t, 0..1: the beat of the two tones.
export function humBeat(t) { return .5 + .5 * Math.cos((HUM[1] - HUM[0]) * Math.PI * 2 * t); }

// The slab's tremble at time t (a small offset, bigger on the swell).
export function plateShake(t) {
  const k = VIBRATE.shake * (.45 + .55 * humBeat(t));
  return {x: k * Math.sin(t * 2 * Math.PI * HUM[0]), y: k * .6 * Math.sin(t * 2 * Math.PI * HUM[1] + 1), z: k * Math.sin(t * 2 * Math.PI * (HUM[0] + HUM[1]) / 2 + 2)};
}

// Ripple i at time t: its size (full width) and opacity. Each leaves the slab and fades at the tile edge.
export function ripple(i, t) {
  const u = ((t / VIBRATE.ripplePeriod) + i / VIBRATE.ripples) % 1;
  return {size: VIBRATE.plate + (VIBRATE.reach - VIBRATE.plate) * u, alpha: (1 - u) ** 1.5 * Math.min(1, u * 8)};
}

let squareTex = null;
function squareRing() {
  if (squareTex) return squareTex;
  const n = 64, d = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = Math.abs((i + .5) / n * 2 - 1), y = Math.abs((j + .5) / n * 2 - 1), e = Math.max(x, y), k = (i + j * n) * 4;
    d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = Math.round(255 * Math.max(0, 1 - Math.abs(e - .94) / .06));
  }
  squareTex = new THREE.DataTexture(d, n, n);
  squareTex.magFilter = squareTex.minFilter = THREE.LinearFilter; squareTex.needsUpdate = true;
  return squareTex;
}

export function createVibratingSquare(seed = 0) {
  const g = new THREE.Group(); g.name = 'Trap (vibrating square)';
  const geometries = [], materials = [];
  const rand = rng(seed + 3);
  const mat = m => { materials.push(m); return m; };
  const mesh = (geo, m, parent) => { geometries.push(geo); const o = new THREE.Mesh(geo, m); parent.add(o); return o; };
  const plate = new THREE.Group(); g.add(plate);
  const stone = mat(new THREE.MeshStandardMaterial({color: 0x17131c, roughness: .55, metalness: .25}));
  const slab = mesh(new RoundedBoxGeometry(VIBRATE.plate, VIBRATE.top, VIBRATE.plate, 2, .01), stone, plate);
  slab.position.y = VIBRATE.top / 2 - .002; slab.castShadow = slab.receiveShadow = true;
  // Grooves: three nested squares and a diamond, as thin glowing strips on top.
  const groove = mat(new THREE.MeshStandardMaterial({color: 0xf07aff, emissive: 0xc02cff, emissiveIntensity: 1.4, roughness: .4}));
  const y = VIBRATE.top + .0015, w = .012;
  const strips = [];
  const strip = (len, x, z, ry) => { const b = new THREE.BoxGeometry(len, .003, w); b.rotateY(ry); b.translate(x, y, z); strips.push(b); };
  for (const s of [.52, .38, .24]) {
    const h = s / 2;
    strip(s + w, 0, h, 0); strip(s + w, 0, -h, 0); strip(s + w, h, 0, Math.PI / 2); strip(s + w, -h, 0, Math.PI / 2);
  }
  const dh = .07;
  for (const [x, z, r] of [[dh / 2, dh / 2, -Math.PI / 4], [-dh / 2, dh / 2, Math.PI / 4], [dh / 2, -dh / 2, Math.PI / 4], [-dh / 2, -dh / 2, -Math.PI / 4]])
    strip(dh * Math.SQRT2 + w, x, z, r);
  mesh(mergeGeometries(strips), groove, plate); strips.forEach(b => b.dispose());
  // A bed of glow under the grooves.
  const glowMat = mat(new THREE.MeshBasicMaterial({map: softDot(THREE), color: 0xd050ff, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false}));
  const glowGeo = new THREE.PlaneGeometry(.8, .8); glowGeo.rotateX(-Math.PI / 2);
  const glow = mesh(glowGeo, glowMat, g); glow.position.y = .006; glow.renderOrder = 2;
  // Square ripples running out across the floor.
  const ripples = [];
  for (let i = 0; i < VIBRATE.ripples; i++) {
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const m = mat(new THREE.MeshBasicMaterial({map: squareRing(), color: 0xe070ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false}));
    const o = mesh(geo, m, g); o.position.y = .004 + i * .0005; o.renderOrder = 2; ripples.push(o);
  }
  // Loose grit that hops on the slab.
  const gritMat = mat(new THREE.MeshStandardMaterial({color: 0x8a8394, roughness: 1}));
  const gritGeo = new THREE.DodecahedronGeometry(.009, 0); geometries.push(gritGeo);
  const gritMesh = new THREE.InstancedMesh(gritGeo, gritMat, VIBRATE.grit); g.add(gritMesh);
  const grit = [], m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();
  for (let i = 0; i < VIBRATE.grit; i++)
    grit.push({x: (rand() - .5) * .5, z: (rand() - .5) * .5, w: 9 + rand() * 7, p: rand() * 6, drift: rand() * Math.PI * 2, size: .65 + rand() * .7});
  g.userData.animate = t => {
    const beat = humBeat(t), s = plateShake(t);
    plate.position.set(s.x, s.y, s.z);
    groove.emissiveIntensity = .9 + 1.3 * beat;
    glowMat.opacity = .18 + .32 * beat;
    ripples.forEach((o, i) => { const r = ripple(i, t); o.scale.set(r.size, 1, r.size); o.material.opacity = .75 * r.alpha; });
    grit.forEach((q, i) => {
      // creep round a small loop, hop with the hum; stay on the slab
      const lim = VIBRATE.plate / 2 - .03, cl = v => Math.max(-lim, Math.min(lim, v));
      v4.set(cl(q.x + .03 * Math.cos(t * .4 + q.drift)) + s.x, VIBRATE.top + .006 + s.y + .012 * beat * Math.abs(Math.sin(t * q.w + q.p)), cl(q.z + .03 * Math.sin(t * .33 + q.drift)) + s.z);
      gritMesh.setMatrixAt(i, m4.compose(v4, q4.setFromEuler(e4.set(t * q.w * .3, q.p, 0)), s4.setScalar(q.size)));
    });
    gritMesh.instanceMatrix.needsUpdate = true;
  };
  g.userData.animate(0);
  g.userData.dispose = () => { for (const geo of geometries) geo.dispose(); for (const m of materials) m.dispose(); };
  return g;
}
