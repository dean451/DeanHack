// Body roles: a goal is written once against a role name ("mouth", "paw:rf", "tailtip") and each species
// says where that role is on its own body. A species map is {role: ctx => () => Vector3}; `buildRoles`
// turns a map and a context (the rig and its bones) into the points table `solvePose` and the `goal`
// helpers in feline-pose.js already take, so the same goal solves on any body that has the roles.
//
// The roles: head, mouth, chin, withers, rump, tailtip, paw:lf / rf / lh / rh, hip:l / r,
// shoulder:l / r, and for dragons wingtip:l / r and wingwrist:l / r.
import * as THREE from 'three';
import {points} from './feline-pose.js';

export const ROLES = ['head', 'mouth', 'chin', 'withers', 'rump', 'tailtip', 'paw:lf', 'paw:rf', 'paw:lh', 'paw:rh',
  'hip:l', 'hip:r', 'shoulder:l', 'shoulder:r', 'wingtip:l', 'wingtip:r', 'wingwrist:l', 'wingwrist:r'];

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

// The role table for a built actor, by what it is: the cat, the dragons and the cockerels have maps so far.
export function rolesOf(actor) {
  if (actor.quirk === 'feline' && actor.rig) return catRoles(actor.rig, bonesOf(actor));
  if (actor.quirk === 'dragon' && actor.joints) return dragonRoles(actor);
  if (actor.quirk === 'cockatrice' && actor.joints) return cockatriceRoles(actor);
  throw new Error(`no role map for ${actor.species ?? 'this body'}`);
}
