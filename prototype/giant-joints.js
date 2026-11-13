// Named joints for the giants (family H in the creature plan, stage 1): the giant, stone, hill, fire, frost and
// storm giants, the ettin, the titan, the Cyclops, Lord Surtur and any other `H` built by `giant()` in creatures.js.
// The cat's and the dragon's names, as the humanoids use them: `head`, the arms `lfore` / `rfore` and the legs
// `lleg1` / `rleg1` (a biped's legs are its hind legs; left is -x). The ettin's second head is `head_1`, as a
// three-headed hound's side heads are `head_0` and `head_1`. Only `actor.joints` is set: the actor gains no `arms`,
// so no arm motion turns on.
import * as THREE from 'three';
import {nameHumanoidJoints} from './humanoid-joints.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rigBody, hangOn} from './trunk-skin.js';

export function nameGiantJoints(actor, {heads, arms}) {
  const {joints} = nameHumanoidJoints({head: actor.head, arms, legs: actor.legs});
  heads.filter(h => h !== actor.head).forEach((h, i) => { h.name = 'head_' + (i + 1); joints[h.name] = h; });
  actor.joints = joints;
  return actor;
}

// Stage 1 step 3: the trunk and neck on bones (trunk-skin.js rigBody: `hips`, `spine0`, `spine1`, `neck0`..`neck3`),
// after the limbs are on their three bones. The skin-coloured trunk (the barrel, the chest, the shoulders) and the
// limbs become one skinned hide (flesh in a second material is skinned on the same bones); every other piece built on the trunk (the kilt, the belt, the armour, the seams,
// the necklaces, the ice, the fire giants' core) hangs rigid on the bone at its height, so a hunch carries it and
// it stays a plain mesh the actor batch can draw. The arms hang on the chest and every head on the top of the neck;
// the ettin's neck rises between its two heads, so both ride `neck3`.
export function rigGiant(actor, {heads, arms}) {
  nameGiantJoints(actor, {heads, arms});
  const {body} = actor;
  let skin = null; for (const o of arms) o.traverse(m => { if (m.isSkinnedMesh) skin ??= m.material; });
  // (flesh in a second material, the frost giants' faceted chest, is skinned on the same bones: it bends as the hide)
  const flesh = body.children.filter(o => o.isMesh && !o.isSkinnedMesh && o.material !== skin && o.material.color?.equals(skin.color));
  for (const o of flesh) {
    o.updateMatrix(); o.geometry = o.geometry.clone().applyMatrix4(o.matrix);
    o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.userData.part = 'body';
  }
  const dressing = body.children.filter(o => o.isMesh && !o.isSkinnedMesh && o.material !== skin && !flesh.includes(o));
  // (rigBody skins a piece's geometry as it stands at the body's origin: the skin-coloured pieces, a lone one or a
  // merged one, are baked where they stand into one trunk, so the hide is one draw)
  const pieces = body.children.filter(o => o.isMesh && !o.isSkinnedMesh && o.material === skin);
  if (pieces.length) {
    const geo = mergeGeometries(pieces.map(o => {
      o.updateMatrix(); const g = o.geometry.clone().applyMatrix4(o.matrix);
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      return g.index ? g.toNonIndexed() : g;
    }));
    const trunk = new THREE.Mesh(geo, skin); trunk.castShadow = trunk.receiveShadow = true; trunk.userData.part = 'body';
    for (const o of pieces) body.remove(o);
    body.add(trunk);
  }
  const lead = actor.head;
  // (a two-headed neck: rigBody runs it to a stand-in midway between the heads, then both hang on its last bone)
  let top = lead;
  if (heads.length > 1) {
    top = new THREE.Group();
    top.position.copy(heads.reduce((s, h) => s.add(h.position), new THREE.Vector3()).multiplyScalar(1 / heads.length));
    body.add(top); actor.head = top;
  }
  rigBody(Object.assign(actor, {arms}), {});
  delete actor.arms;
  const j = actor.joints;
  if (top !== lead) { j.neck3.remove(top); actor.head = lead; for (const h of heads) hangOn(j.neck3, h); }
  const spine = [j.hips, j.spine0, j.spine1], box = new THREE.Box3(), c = new THREE.Vector3();
  for (const o of dressing) {
    o.updateMatrix(); box.copy((o.geometry.boundingBox ?? (o.geometry.computeBoundingBox(), o.geometry.boundingBox))).applyMatrix4(o.matrix).getCenter(c);
    hangOn(spine.findLast(b => b.userData.at[1] <= c.y) ?? j.hips, o);
  }
  return actor;
}
