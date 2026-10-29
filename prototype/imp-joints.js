// Named joints for the imps (imp, homunculus, quasit, tengu, lemure): the humanoid names (`head`, `neck0`,
// `lfore` / `rfore`, `lleg1` / `rleg1`; left is -x) plus `tail0` where there is a tail and `lwing` / `rwing`
// where there are wings. Every member's arms, legs and tail are skinned onto bones (`lfore_0`.., `lleg1_0`..,
// `tail0`..`tail4` under the `tail` pivot), and its trunk and neck too (`rigImp`, below).
import * as THREE from 'three';
import {nameHumanoidJoints,skinLimb,rigLimb} from './humanoid-joints.js';
import {skinTrunk,rigTrunk,hangOn} from './trunk-skin.js';

export function nameImpJoints(actor){
 nameHumanoidJoints(actor);
 const {joints,tail,wings}=actor;
 if(tail){
  const skinned=tail.children.some(o=>o.isSkinnedMesh);
  if(skinned){tail.name='tail';tail.traverse(b=>{if(b.isBone)joints[b.name]=b;});}
  else{tail.name='tail0';joints.tail0=tail;}
 }
 for(const w of wings){const name=(w.position.x<0?'l':'r')+'wing';w.name=name;joints[name]=w;}
 return actor;
}

// The rest of stage 1 for the whole family: limbs still one plain mesh (the tengu's and the lemure's) skinned onto
// three bones; then the trunk and neck on bones (trunk-skin.js): a pelvis root `hips`, `spine0` at the waist,
// `spine1` at the chest, `neck0`..`neck3` from the top of the trunk to the head's pivot. The head hangs on `neck3`
// (so `neck0` is a bone, no longer the head group) and the arms and wings on the chest, so a hunch carries them;
// the legs and the tail stay on the pelvis. The vertebrae are placed from where the creature's own hips,
// shoulders and head sit. The body was already its own mesh, so the draw count does not change (a uranium imp's
// glow is skinned the same way, on the same bones). `S`: the creature's shared geometry (the skinned copies are
// cached on it).
export function rigImp(actor, S) {
  for (const [list, stem] of [[actor.legs, 'leg1_'], [actor.arms, 'fore_']]) for (const o of list) skinPlainLimb(o, (o.position.x < 0 ? 'l' : 'r') + stem);
  nameImpJoints(actor);
  const {body, head, legs, arms, wings} = actor, legY = legs[0].position.y, armY = arms[0].position.y, h = head.position;
  const spine = [['hips', [0, 0, 0]], ['spine0', [0, legY + .35 * (armY - legY), 0]], ['spine1', [0, legY + .75 * (armY - legY), 0]]];
  const root = [0, armY + .35 * (h.y - armY), .5 * h.z], neck = [0, 1, 2, 3].map(i => ['neck' + i, root.map((v, k) => v + (h.toArray()[k] - v) * i / 3)]);
  const def = {spine, neck, blend: .03, r: .045};
  const plain = body.children.find(o => o.isMesh && o.userData.part === 'body'), glow = body.children.find(o => o.isMesh && o.userData.part === 'glow');
  S.trunkGeo ??= skinTrunk(plain.geometry.clone(), def);
  body.remove(plain);
  const {mesh, bones} = rigTrunk(body, S.trunkGeo, plain.material);
  if (glow) { S.glowGeo ??= skinTrunk(glow.geometry.clone(), def); body.remove(glow); const m = new THREE.SkinnedMesh(S.glowGeo, glow.material); m.castShadow = glow.castShadow; m.receiveShadow = glow.receiveShadow; m.userData.part = 'glow'; body.add(m); m.updateMatrixWorld(true); m.bind(mesh.skeleton, m.matrixWorld); }
  hangOn(bones.neck3, head);
  for (const o of [...arms, ...wings]) hangOn(bones.spine1, o);
  Object.assign(actor.joints, bones);
  return actor;
}
// A limb that is one plain mesh hanging down -y, skinned onto three bones `<prefix>0`..`2` (at the root, about
// half its length and nine tenths of it) under its group, as the imp's own (humanoid-joints.js).
const LIMBS = new WeakMap();
function skinPlainLimb(group, prefix) {
  const m = group.children.find(o => o.isMesh && !o.isSkinnedMesh);
  if (!m) return;
  if (!LIMBS.has(m.geometry)) { m.geometry.computeBoundingBox(); const y = m.geometry.boundingBox.min.y; LIMBS.set(m.geometry, skinLimb(m.geometry.clone(), [[0, 0, 0], [0, .5 * y, 0], [0, .9 * y, 0]])); }
  group.remove(m);
  rigLimb(group, LIMBS.get(m.geometry), m.material, prefix, m.userData.part);
}
