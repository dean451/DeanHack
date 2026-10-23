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

// The role table for a built actor, by what it is. Only the cat has a map so far.
export function rolesOf(actor) {
  if (actor.quirk === 'feline' && actor.rig) return catRoles(actor.rig, bonesOf(actor));
  throw new Error(`no role map for ${actor.species ?? 'this body'}`);
}
