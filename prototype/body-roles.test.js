import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSkinnedFeline} from './feline-skin.js';
import {points, solvePose, goal} from './feline-pose.js';
import {rolesOf, bonesOf, buildRoles, at, pastEnd, ROLES} from './body-roles.js';

test('every cat role resolves to the same world point as points()', () => {
  for (const name of ['kitten', 'housecat', 'large cat']) {
    const a = createSkinnedFeline(name);
    a.g.updateMatrixWorld(true);
    const roles = rolesOf(a), direct = points(a.rig, bonesOf(a));
    const shared = ROLES.filter(r => r in direct);
    for (const r of ['head', 'mouth', 'chin', 'withers', 'rump', 'tailtip', 'paw:lf', 'paw:rf', 'paw:lh', 'paw:rh', 'hip:l', 'hip:r', 'shoulder:l', 'shoulder:r'])
      assert.ok(shared.includes(r), `${name} has ${r}`);
    for (const r of Object.keys(direct)) assert.ok(roles[r]().distanceTo(direct[r]()) < 1e-9, `${name} ${r}`);
    assert.throws(() => roles['wingtip:l'], /no role "wingtip:l"/);
  }
});

test('a toy rig with other bone names meets a reach on a role to under 1 mm', () => {
  // two chains of two links, named nothing like the cat's, each with its own map
  const root = new THREE.Object3D(), mk = (name, x, z, top) => {
    const a = new THREE.Object3D(), b = new THREE.Object3D(), tip = new THREE.Object3D();
    a.name = name + 'A'; b.name = name + 'B'; a.position.set(x, 0, z); b.position.set(0, 1, 0); tip.position.set(0, top, 0);
    root.add(a); a.add(b); b.add(tip); return {a, b, tip};
  };
  const arm = mk('arm', -1, 0, 1), leg = mk('leg', -1, 1, .5);
  root.updateMatrixWorld(true);
  const map = {mouth: c => at(() => c.arm.tip), 'paw:lf': c => at(() => c.leg.tip)};
  const P = buildRoles(map, {arm, leg});
  const apply = p => { arm.a.rotation.set(p.armA?.x || 0, 0, 0); arm.b.rotation.set(p.armB?.x || 0, 0, 0); root.updateMatrixWorld(true); };
  const target = new THREE.Vector3(-1, 1.2, 1.1);
  const r = solvePose({joints: {'armA.x': [-3, 3], 'armB.x': [-3, 3]}, goals: [goal.reach('mouth', target)], apply, points: P, rest: 0});
  assert.ok(P.mouth().distanceTo(target) < 1e-3, `reached ${P.mouth().toArray()}`);
  // the same goal written between two roles
  apply({});
  const r2 = solvePose({joints: {'armA.x': [-3, 3], 'armB.x': [-3, 3]}, goals: [goal.reach('mouth', 'paw:lf', {within: 0})], apply, points: P, rest: 0});
  assert.ok(P.mouth().distanceTo(P['paw:lf']()) < 1e-3 && r2.cost < 1e-6, 'reaches a role');
  assert.throws(() => P.rump, /no role "rump"/);
  apply({});
  assert.ok(pastEnd(() => [arm.a, arm.b])().distanceTo(new THREE.Vector3(-1, 2, 0)) < 1e-9, 'a chain carried on past its last joint');
});
