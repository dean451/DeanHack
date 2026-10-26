// Body roles: a goal is written once against a role name ("mouth", "paw:rf", "tailtip") and each species
// says where that role is on its own body. A species map is {role: ctx => () => Vector3}; `buildRoles`
// turns a map and a context (the rig and its bones) into the points table `solvePose` and the `goal`
// helpers in feline-pose.js already take, so the same goal solves on any body that has the roles.
//
// The roles: head, mouth, chin, withers, rump, tailtip, paw:lf / rf / lh / rh, hip:l / r,
// shoulder:l / r, for dragons wingtip:l / r and wingwrist:l / r, and for six-legged bodies the middle pair's
// paw:lm / rm.
import * as THREE from 'three';
import {points} from './feline-pose.js';

export const ROLES = ['head', 'mouth', 'chin', 'withers', 'rump', 'tailtip', 'paw:lf', 'paw:rf', 'paw:lh', 'paw:rh',
  'hip:l', 'hip:r', 'shoulder:l', 'shoulder:r', 'wingtip:l', 'wingtip:r', 'wingwrist:l', 'wingwrist:r', 'paw:lm', 'paw:rm'];

// Helpers for writing a species map: a joint's world position, a point in a joint's frame, and a
// point carried on past the last joint of a chain by its own length (the tip of a tail).
export const at = joint => () => joint().getWorldPosition(new THREE.Vector3());
export const inFrame = (joint, local) => () => joint().localToWorld(new THREE.Vector3(...local));
export const pastEnd = chain => () => {
  const list = chain(), n = list.length, a = list[n - 2].getWorldPosition(new THREE.Vector3()), b = list[n - 1].getWorldPosition(new THREE.Vector3());
  return b.clone().multiplyScalar(2).sub(a);
};

// A points table from a species map. Asking for a role the species has no map entry for throws a
// plain error naming it, rather than aiming a goal at nothing.
export function buildRoles(map, ctx) {
  const table = {};
  for (const [role, make] of Object.entries(map)) table[role] = make(ctx);
  return guard(table);
}
const guard = table => new Proxy(table, {get: (t, role) => { if (role in t || typeof role === 'symbol') return t[role]; throw new Error(`no role "${String(role)}" on this body`); }, has: (t, role) => role in t});

// The cat's map is feline-pose.js's own points table, re-exported as is.
export const catRoles = (rig, bones) => guard(points(rig, bones));

// The bones of a built actor by name.
export function bonesOf(actor) {
  const out = {};
  actor.g.traverse(o => { if (o.isBone) out[o.name] = o; });
  return out;
}

// The dragon's map, from the joints `dragon()` exposes (actor.joints). `head` and `mouth` go through the
// head group (the mouth at the jaw tip), `withers` sits at the wing roots (the base of the neck on a
// wingless form), `rump` at the tail root, `tailtip` past the last tail joint, each paw at the sole under the last
// bone of its leg, each wing point at the wing's `edge` points in the wing's inner frame. Roles a form has no
// part for (a wyvern's forepaws, a serpent's legs, a wingless dragon's wings) are left out.
export function dragonRoles(actor) {
  const j = actor.joints, chain = prefix => { const out = []; for (let i = 0; j[prefix + i]; i++) out.push(j[prefix + i]); return out; };
  const map = {
    head: () => at(() => j.head),
    // (a tatzelworm's short cat face has its mouth much closer in than a dragon's long jaw)
    mouth: () => inFrame(() => j.head, j.head.userData.cat ? [0, -.065, .125] : [0, -.066, .225]),
    chin: () => inFrame(() => j.head, j.head.userData.cat ? [0, -.085, .11] : [0, -.09, .2]),
    rump: () => at(() => j.tail0),
    tailtip: () => pastEnd(() => chain('tail')),
  };
  const roots = actor.wings.map(w => w.userData.inner);
  map.withers = () => roots.length ? () => { const p = new THREE.Vector3(); for (const r of roots) p.add(r.getWorldPosition(new THREE.Vector3())); return p.divideScalar(roots.length); } : at(() => j.neck0);
  for (const leg of actor.legs) {
    const side = leg.name[0], fore = /fore/.test(leg.name), bones = chain(leg.name);
    map[`paw:${side}${fore ? 'f' : 'h'}`] = () => inFrame(() => bones[bones.length - 1], [0, -.016, 0]);
    map[`${fore ? 'shoulder' : 'hip'}:${side}`] = () => at(() => bones[0]);
  }
  for (const w of actor.wings) {
    const side = w.userData.side < 0 ? 'l' : 'r', [, wrist, tip] = w.userData.inner.userData.edge;
    map[`wingwrist:${side}`] = () => inFrame(() => w.userData.inner, [wrist[0], wrist[1], 0]);
    map[`wingtip:${side}`] = () => inFrame(() => w.userData.inner, [tip[0], tip[1], 0]);
  }
  return buildRoles(map, {});
}

// The cockerel family's map (chickatrice, cockatrice, pyrolisk), from the joints `cockatrice()` exposes. The
// head group carries the beak, so the mouth and chin are points in its frame; the four leg groups are a
// front pair and a hind pair like the cat's, each paw at the toes' sole; the tail is one group, so its tip is
// the end of its last segment in the tail's frame; each wing's tip and wrist are points of its flat shape.
export function cockatriceRoles(actor) {
  const j = actor.joints, map = {
    head: () => at(() => j.head),
    mouth: () => inFrame(() => j.head, [0, -.03, .17]),
    chin: () => inFrame(() => j.head, [0, -.07, .15]),
    withers: () => inFrame(() => actor.body, [0, .2, .1]),
    rump: () => at(() => j.tail0),
    tailtip: () => inFrame(() => j.tail0, [0, -.06, -.5]),
  };
  for (const side of ['l', 'r']) {
    const s = side === 'l' ? -1 : 1;
    for (const [i, pair] of [[0, 'f'], [1, 'h']]) {
      const leg = j[`${side}leg${i}`];
      map[`paw:${side}${pair}`] = () => inFrame(() => leg, [s * .13, -.146, .07]);
      map[`${pair === 'f' ? 'shoulder' : 'hip'}:${side}`] = () => at(() => leg);
    }
    const wing = j[`${side}wing`];
    map[`wingwrist:${side}`] = () => inFrame(() => wing, [s * .17, .065, 0]);
    map[`wingtip:${side}`] = () => inFrame(() => wing, [s * .15, -.05, 0]);
  }
  return buildRoles(map, {});
}

// The six-legged family's map (ants, bees, beetles, locusts), from the joints `insect-joints.js` names. Each
// paw is the claw's tip on the leg's tibia bone (so it follows the bent leg): `paw:lf` / `rf` the front pair,
// `paw:lm` / `rm` the middle pair, `paw:lh` / `rh` the hind pair; the front hips are the shoulders and the hind
// hips the hips. The head group is the neck pivot; the mouth is the front of the head's lower half (below the
// feelers) and the chin the underside behind it, both read off the head's own mesh; the rump is the waist
// (`tail0`) and the tail tip the abdomen's farthest point back (the sting, on those that have one); a bee's
// wing tip is its wing's farthest point. The withers sit between the front hips.
export function insectRoles(actor) {
  const j = actor.joints, V = (...a) => new THREE.Vector3(...a);
  const verts = obj => { const out = []; obj.traverse(m => { if (!m.isMesh || m === obj) return; m.updateMatrix(); const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) out.push(V().fromBufferAttribute(p, i).applyMatrix4(m.matrix)); }); return out; };
  const meshes = (group, keep = m => true) => group.children.filter(m => m.isMesh && keep(m));
  // the head's own mesh (not the jaws or anything hung on it): its lower half, where the mouthparts are
  const head = meshes(j.head)[0], hv = []; { const p = head.geometry.attributes.position; head.updateMatrix(); for (let i = 0; i < p.count; i++) hv.push(V().fromBufferAttribute(p, i).applyMatrix4(head.matrix)); }
  const ys = hv.map(v => v.y), lo = Math.min(...ys), mid = (lo + Math.max(...ys)) / 2, low = hv.filter(v => v.y < mid);
  const front = low.reduce((a, b) => b.z > a.z ? b : a), mouth = [0, front.y, front.z], chin = [0, lo, front.z - (front.z - Math.min(...low.map(v => v.z))) * .35];
  const map = {
    head: () => at(() => j.head),
    mouth: () => inFrame(() => j.head, mouth),
    chin: () => inFrame(() => j.head, chin),
    withers: () => () => j.lleg0.getWorldPosition(V()).add(j.rleg0.getWorldPosition(V())).multiplyScalar(.5),
  };
  if (j.tail0) { const tv = verts(j.tail0), tip = tv.reduce((a, b) => b.z < a.z ? b : a); map.rump = () => at(() => j.tail0); map.tailtip = () => inFrame(() => j.tail0, tip.toArray()); }
  for (const side of ['l', 'r']) {
    for (const [i, pair] of [[0, 'f'], [1, 'm'], [2, 'h']]) {
      const leg = j[`${side}leg${i}`], tibia = j[`${side}leg${i}_2`], foot = leg.userData.foot;
      map[`paw:${side}${pair}`] = () => inFrame(() => tibia, foot);
    }
    map[`shoulder:${side}`] = () => at(() => j[`${side}leg0`]);
    map[`hip:${side}`] = () => at(() => j[`${side}leg2`]);
    const wing = j[`${side}wing`];
    if (wing) { const tip = verts(wing).reduce((a, b) => b.length() > a.length() ? b : a); map[`wingtip:${side}`] = () => inFrame(() => wing, tip.toArray()); }
  }
  return buildRoles(map, {});
}

// The wild cats' map (jaguar, lynx, panther, tiger, displacer beast), from the joints `createFeline` exposes:
// they have no `rig`, so the pet cat's map does not apply. Each paw is the lowest point of its leg's skin at
// rest, carried on the leg's last bone (`<leg>_2`) so it follows the bent leg; the shoulders and hips are each
// leg's first bone, the withers `spine0` and the rump `tail0`. The mouth is the head's nose end at the height of
// its lower half's front and the chin the lowest point of the front half, both read off the head's own mesh
// (in the head group's frame); the tail tip is the tail skin's farthest point back, in `tail4`'s frame.
export function wildCatRoles(actor) {
  const j = actor.joints, V = (...a) => new THREE.Vector3(...a);
  actor.g.updateMatrixWorld(true);
  const skinned = (parent, part) => parent.children.find(o => o.isSkinnedMesh && o.userData.part === part);
  const worldVerts = m => { const out = [], v = V(); for (let i = 0; i < m.geometry.attributes.position.count; i++) { m.getVertexPosition(i, v); out.push(v.clone().applyMatrix4(m.matrixWorld)); } return out; };
  const extreme = (list, better) => list.reduce((a, b) => better(b, a) ? b : a);
  const hm = j.head.children.find(o => o.isMesh && o.userData.part === 'head'), hv = [];
  { const p = hm.geometry.attributes.position; for (let i = 0; i < p.count; i++) hv.push(V().fromBufferAttribute(p, i)); }
  const ys = hv.map(v => v.y), lo = Math.min(...ys), mid = (lo + Math.max(...ys)) / 2, nose = extreme(hv.filter(v => v.y < mid), (a, b) => a.z > b.z);
  const mouth = [0, nose.y, nose.z], chin = [0, lo, nose.z * .6];
  const tailMesh = skinned(actor.tail, 'tail'), tip = extreme(worldVerts(tailMesh), (a, b) => a.z < b.z);
  const map = {
    head: () => at(() => j.head),
    mouth: () => inFrame(() => j.head, mouth),
    chin: () => inFrame(() => j.head, chin),
    withers: () => at(() => j.spine0),
    rump: () => at(() => j.tail0),
    tailtip: () => inFrame(() => j.tail4, j.tail4.worldToLocal(tip.clone()).toArray()),
  };
  for (const side of ['l', 'r']) for (const [i, pair] of [[0, 'f'], [1, 'h']]) {
    const leg = j[`${side}leg${i}`], bone = j[`${side}leg${i}_2`], sole = extreme(worldVerts(skinned(leg, i ? 'hindleg' : 'foreleg')), (a, b) => a.y < b.y);
    map[`paw:${side}${pair}`] = () => inFrame(() => bone, bone.worldToLocal(sole.clone()).toArray());
    map[`${pair === 'f' ? 'shoulder' : 'hip'}:${side}`] = () => at(() => j[`${side}leg${i}_0`]);
  }
  return buildRoles(map, {});
}

// The role table for a built actor, by what it is: the pet cat, the wild cats, the dragons, the cockerels and the insects have maps so far.
export function rolesOf(actor) {
  if (actor.quirk === 'feline' && actor.rig) return catRoles(actor.rig, bonesOf(actor));
  if (actor.quirk === 'feline' && actor.joints?.spine0) return wildCatRoles(actor);
  if (actor.quirk === 'dragon' && actor.joints) return dragonRoles(actor);
  if (actor.quirk === 'cockatrice' && actor.joints) return cockatriceRoles(actor);
  if ((actor.quirk === 'insect' || actor.quirk === 'bee') && actor.joints?.lleg0_2) return insectRoles(actor);
  throw new Error(`no role map for ${actor.species ?? 'this body'}`);
}
