// Keeps a toppled body on the floor. deaths.js's topple rolls the actor onto its side about
// its feet, so everything on the side it falls towards swings under the floor: a housecat
// sank about .2 and a dwarf .7, most of its body. A revived corpse (rise.js) starts from that
// same pose. This lifts the actor, frame by frame, just enough that its lowest point settles
// a touch into the floor instead.
//
// groundSamples(g) takes a sparse set of points from the actor's visible meshes, in g's own
// space, once, at rest. groundLift(g, samples, restY) then says how far to raise g, whose
// local matrix already holds the pose, so those points stay above the floor.

import * as THREE from 'three';
import {DEATH_STYLES} from './deaths.js';

// How far (world units) a fallen body may sink into the floor, and the most points kept.
export const SETTLE = .02;
export const MAX_SAMPLES = 600;

const inv = new THREE.Matrix4(), rel = new THREE.Matrix4(), v = new THREE.Vector3();

function shown(o, root) {
  for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false;
  return true;
}

// Points (flat x,y,z) from g's visible meshes in g's space, plus `low`: the lowest of them.
// Each mesh gives an even spread of its vertices and its six extreme ones, so tips aren't missed.
export function groundSamples(g, max = MAX_SAMPLES) {
  if (!g) return null;
  g.updateMatrixWorld(true);
  inv.copy(g.matrixWorld).invert();
  const meshes = [];
  let total = 0;
  g.traverse(o => {
    const pos = o.isMesh && o.geometry?.attributes?.position;
    if (pos && pos.count && shown(o, g)) { meshes.push([o, pos]); total += pos.count; }
  });
  if (!total) return null;
  const stride = Math.max(1, Math.ceil(total / max));
  const pts = [];
  let low = Infinity;
  const add = (pos, i) => {
    v.fromBufferAttribute(pos, i).applyMatrix4(rel);
    if (!Number.isFinite(v.x + v.y + v.z)) return;
    pts.push(v.x, v.y, v.z);
    if (v.y < low) low = v.y;
  };
  for (const [o, pos] of meshes) {
    rel.multiplyMatrices(inv, o.matrixWorld);
    const ext = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < pos.count; i++) {
      for (let a = 0; a < 3; a++) {
        const c = pos.getComponent(i, a);
        if (c < pos.getComponent(ext[a * 2], a)) ext[a * 2] = i;
        if (c > pos.getComponent(ext[a * 2 + 1], a)) ext[a * 2 + 1] = i;
      }
    }
    for (const i of new Set(ext)) add(pos, i);
    for (let i = 0; i < pos.count; i += stride) add(pos, i);
  }
  return pts.length ? {pts: new Float32Array(pts), low, scaleY: g.scale.y} : null;
}

// How far to raise g (>= 0) so the posed samples sit no lower than its rest floor, less SETTLE.
// `restY` is g.position.y before the pose was applied. Anything that already hung below g's
// feet at rest (a tail on the ground, a model set into the floor) keeps that depth.
export function groundLift(g, s, restY, settle = SETTLE) {
  if (!g || !s?.pts?.length || !Number.isFinite(restY)) return 0;
  g.updateMatrix();
  const e = g.matrix.elements;
  // Only y is needed: row 1 of the matrix.
  let lowest = Infinity;
  for (let i = 0; i < s.pts.length; i += 3) {
    const y = e[1] * s.pts[i] + e[5] * s.pts[i + 1] + e[9] * s.pts[i + 2] + e[13];
    if (y < lowest) lowest = y;
  }
  const floor = restY + Math.min(0, s.low) * s.scaleY - settle;
  const lift = floor - lowest;
  return Number.isFinite(lift) && lift > 0 ? lift : 0;
}

// Whether an action lies the body down and so should be kept on the floor: a topple death or
// a rise from one (a buried corpse climbs up out of the ground, so it's left alone).
export function grounds(action, style) {
  if (!action) return false;
  if (action.kind === 'rise') return !action.buried;
  return action.kind === 'die' && !(DEATH_STYLES.includes(style) && style !== 'topple');
}
