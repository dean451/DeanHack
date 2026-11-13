import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GNOMES, createGnome, BELT} from './gnome.js';
import {waddlePoser} from './gnome-waddle.js';
import {WADDLE_POSES} from './gnome-waddle-poses.js';
import {surfaceGap} from './fit-check.js';

// Review finding 2026-11-13: in the waddle's widest stride the belt hung round the gnome as a hoop, a clear gap on
// the leading side. The belt is part of the skinned hide, so both it and the tunic are measured where the skin
// draws them (posed by the bones): the belt's vertices, and the tunic round the belt line sampled densely over its
// triangles (its lathe is coarse, so its own vertices would be centimetres apart).
const hideOf = a => { let h = null; a.body.traverse(o => { if (!h && o.isSkinnedMesh && o.userData.part === 'body') h = o; }); return h; };
function shapes(a, name) {
  a.g.updateMatrixWorld(true);
  const hide = hideOf(a), pos = hide.geometry.attributes.position, {belt: [s, e]} = BELT(name), k = a.body.scale.y;
  hide.skeleton.update();
  const at = i => hide.applyBoneTransform(i, new THREE.Vector3().fromBufferAttribute(pos, i)).applyMatrix4(hide.matrixWorld);
  const belt = [], body = [], n = 14;
  for (let i = s; i < e; i++) belt.push(at(i));
  for (let i = 0; i < s; i += 3) {
    const A = at(i), B = at(i + 1), C = at(i + 2), ys = [A.y, B.y, C.y];
    if (Math.max(...ys) < .2 * k || Math.min(...ys) > .48 * k) continue;
    for (let u = 0; u <= n; u++) for (let v = 0; v <= n - u; v++) body.push(new THREE.Vector3().addScaledVector(A, u / n).addScaledVector(B, v / n).addScaledVector(C, (n - u - v) / n));
  }
  const mesh = pts => new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(pts));
  return [mesh(belt), mesh(body), k];
}

test('every gnome has its belt in its hide, a run of the trunk', () => {
  for (const name of GNOMES) {
    const {belt: [s, e], trunk} = BELT(name);
    assert(s > 0 && e > s && e <= trunk, name);
  }
});

test('the belt wraps the waist, standing and in the waddle\'s widest stride', () => {
  for (const name of GNOMES) {
    const a = createGnome(name);
    const [belt, body, k] = shapes(a, name), rest = surfaceGap(belt, body);
    assert(rest < .015 * k, `${name}: belt ${rest.toFixed(3)} off the tunic standing`);
    waddlePoser(a).apply(WADDLE_POSES[name].pose);
    const [b2, t2] = shapes(a, name), wide = surfaceGap(b2, t2);
    assert(wide < .015 * k, `${name}: belt ${wide.toFixed(3)} off the tunic in the stride`);
  }
});

