// Our own rig for the fox. models/fox.glb is PixelMannen's CC0 fox body and nothing else (the rig
// and clips the Khronos sample shipped, which carry a credit, were stripped with
// tools/strip-glb.mjs). This builds the cat's skeleton inside it, the same 24 bones under the same
// names (hips, spine, chest, neck, head, five tail bones, three per foreleg, four per hind leg),
// weights the body to it, and hands it to the cat's animator (feline-skin.js), so the fox walks,
// runs, idles, sits and pounces on the same clips with planted feet, a trailing tail and eased turns.
//
// The landmarks below were measured on the mesh in its own units (it stands 79 tall, nose to +z,
// tail to -z) and are scaled into the cat's body units, so the clips' heights and strides fit.
import * as THREE from 'three';
import {chainWeights, createFelineAnimator, BLEND} from './feline-skin.js';

const smooth = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
export const FOX = {
  // mesh units to body units: the hips at a housecat's height
  scale: .0062,
  hips: [0, 46, -36], spine: [0, 47, -12], chest: [0, 47, 14], neck: [0, 57, 27], head: [0, 62, 38],
  // shoulder, elbow, wrist, toe; hip, knee, hock, ball, toe (right side; the left mirrors x)
  fore: [[6.8, 38, 17], [6.8, 24, 18.5], [6.8, 6, 18], [6.8, 0, 23]],
  hind: [[7, 40, -38], [7, 26, -36], [7, 12, -38], [7, 3, -34], [7, 0, -30]],
  // the brush hangs back and down from its root
  tail: [[0, 46, -42], [0, 36, -54], [0, 28, -65], [0, 22, -76], [0, 17, -88]],
  // how far a leg column reaches across, how far below the shoulder or hip the leg takes over
  legReach: 6.5, legBlend: 7,
};

// A leg vertex: within the column, below its root; the weights run down its chain by height.
function legOf(x, y, z) {
  for (const [key, chain] of [['fore', FOX.fore], ['hind', FOX.hind]]) {
    const [rx, ry, rz] = chain[0], side = x < 0 ? -1 : 1, bottom = chain[chain.length - 1];
    if (y > ry || Math.abs(x - side * rx) > FOX.legReach) continue;
    const zc = (rz + bottom[2]) / 2, zr = Math.abs(rz - bottom[2]) / 2 + 9;
    if (Math.abs(z - zc) > zr) continue;
    if (key === 'hind' && z < -44 && y > 10) continue; // the drooping brush, not the leg
    return (side < 0 ? 'l' : 'r') + key;
  }
  return null;
}

// Builds the skeleton and the skinned body inside `model` (a clone of the glTF scene: one Mesh).
// Returns {skinned, bones, rig, animator}; the original Mesh is replaced in place.
export function rigFox(model, actor = null, opts = {}) {
  let src = null; model.traverse(o => { if (o.isMesh && !src) src = o; });
  if (!src) return null;
  const S = FOX.scale, sc = v => v.map(c => c * S);
  const bones = [], names = {};
  const bone = (key, parent, at, parentAt) => { const b = new THREE.Bone(); b.name = key; const p = sc(at), q = parentAt ? sc(parentAt) : [0, 0, 0]; b.position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (parent) parent.add(b); bones.push(b); names[key] = bones.length - 1; return b; };
  const hips = bone('hips', null, FOX.hips), spine = bone('spine', hips, FOX.spine, FOX.hips), chest = bone('chest', spine, FOX.chest, FOX.spine);
  const neck = bone('neck', chest, FOX.neck, FOX.chest), head = bone('head', neck, FOX.head, FOX.neck);
  const tail = []; let prev = hips, prevAt = FOX.hips;
  FOX.tail.forEach((at, i) => { const b = bone('tail' + i, prev, at, prevAt); tail.push(b); prev = b; prevAt = at; });
  const legs = {};
  for (const side of [-1, 1]) for (const [kind, chain, attach, attachAt] of [['fore', FOX.fore, chest, FOX.chest], ['hind', FOX.hind, hips, FOX.hips]]) {
    const key = (side < 0 ? 'l' : 'r') + kind, pts = chain.map(([x, y, z]) => [side * x, y, z]), list = [];
    let p = attach, pa = attachAt;
    pts.slice(0, -1).forEach((at, i) => { const b = bone(key + i, p, at, pa); list.push(b); p = b; pa = at; });
    const [ta, tb] = pts.slice(-2).map(sc); // the toe tip below the last bone
    legs[key] = {bones: list, joints: pts.map(q => q[1] * S), root: sc(pts[0]), tip: new THREE.Vector3(tb[0] - ta[0], tb[1] - ta[1], tb[2] - ta[2])};
  }
  // the weights, per vertex, in mesh units
  const geo = src.geometry.clone(), pos = geo.attributes.position, n = pos.count;
  const idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
  const tj = FOX.tail, arcs = [0]; for (let i = 1; i < tj.length; i++) arcs.push(arcs[i - 1] + Math.hypot(tj[i][1] - tj[i - 1][1], tj[i][2] - tj[i - 1][2]));
  const bodyW = z => chainWeights(z, [-52, -24, 2, 30], BLEND.spine / S).map(([k, w]) => [names[['hips', 'spine', 'chest'][k]], w]);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let list;
    const leg = legOf(x, y, z);
    if (leg) {
      const kind = leg.slice(1), chain = kind === 'fore' ? FOX.fore : FOX.hind, ys = chain.map(c => c[1]);
      const inLeg = chainWeights(y, ys, BLEND.leg / S).map(([k, w]) => [names[leg + Math.min(k, chain.length - 2)], w]);
      const t = smooth((ys[0] - y) / FOX.legBlend); // up into the body, the leg hands over to the trunk
      list = [...inLeg.map(([b, w]) => [b, w * t]), ...bodyW(z).map(([b, w]) => [b, w * (1 - t)])];
    } else if (z < -42 && !(Math.abs(x) > 3.5 && y < 34 && z > -46)) {
      // the brush: by arc length along its joints, eased in from the hips at the root
      let best = 0, bs = 0, bd = Infinity;
      for (let k = 0; k < tj.length - 1; k++) { const a = tj[k], b = tj[k + 1], dy = b[1] - a[1], dz = b[2] - a[2], L2 = dy * dy + dz * dz || 1, t = Math.max(0, Math.min(1, ((y - a[1]) * dy + (z - a[2]) * dz) / L2)), d = (y - a[1] - dy * t) ** 2 + (z - a[2] - dz * t) ** 2; if (d < bd) { bd = d; best = k; bs = arcs[k] + Math.sqrt(L2) * t; } }
      const inTail = chainWeights(bs, arcs, BLEND.tail / S).map(([k, w]) => [names['tail' + k], w]), t = smooth(bs / 6);
      list = [...inTail.map(([b, w]) => [b, w * t]), [names.hips, 1 - t]];
    } else if (z > 24 && y > 40) {
      // the neck hands over to the head between the shoulders and the skull
      const h = smooth((z - FOX.neck[2]) / (FOX.head[2] - FOX.neck[2])), c = smooth((z - 22) / 6);
      list = [[names.head, h * c], [names.neck, (1 - h) * c], [names.chest, 1 - c]];
    } else list = bodyW(z);
    list = list.filter(([, w]) => w > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = list.reduce((a, [, w]) => a + w, 0) || 1;
    list.forEach(([b, w], k) => { idx[i * 4 + k] = b; wt[i * 4 + k] = w / sum; });
  }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(wt, 4));
  geo.scale(S, S, S);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  // the body group: what the animator turns for eased turns, under whatever holds the model
  const body = new THREE.Group(); body.name = 'fox body';
  const skinned = new THREE.SkinnedMesh(geo, src.material); skinned.name = 'fox';
  skinned.castShadow = skinned.receiveShadow = true; skinned.frustumCulled = false;
  body.add(hips); body.add(skinned);
  src.parent.add(body); src.removeFromParent();
  model.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skinned.bind(skeleton, skinned.matrixWorld); skeleton.update();
  for (const b of bones) b.userData.world = b.getWorldPosition(new THREE.Vector3()).toArray();
  const rig = {hips, spine, chest, neck, head, tail, legs, yaw: 0, lean: 0};
  const w = new THREE.Vector3();
  const animator = createFelineAnimator(body, rig, actor, {rest: false,
    // the live actor's group turns toward each step; one body unit is this many world units
    yaw: () => actor?.g?.rotation.y ?? 0,
    scale: () => body.getWorldScale(w).x,
    ...opts,
  });
  return {skinned, bones, rig, animator, body};
}
