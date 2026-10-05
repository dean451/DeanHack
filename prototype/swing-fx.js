// Draws the hero's swing: a blade trail while the arc is fast and an impact burst on the
// frame a hit lands. Reads the per-frame `q.swing` that actions.js sets on the hero's queue
// ({blow, u, trail, dir, contact}); with no swing it just lets the trail and particles fade.
import {createSwingTrail, createImpactBurst, impactKind} from './swing.js';

// Held weapons run along the socket's local +y (equipment.js). Measure how far the held
// weapon reaches, cached per weapon object. Bare hands get a short fist trail.
const reachCache = new WeakMap();
export function weaponReach(socket) {
  const weapon = socket?.children?.find(c => c.children?.length || c.isMesh);
  if (!weapon) return .14;
  if (reachCache.has(weapon)) return reachCache.get(weapon);
  let top = 0;
  weapon.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const y = o.position.y + o.geometry.boundingBox.max.y * o.scale.y;
    if (Number.isFinite(y)) top = Math.max(top, y);
  });
  const reach = top > .05 ? Math.min(top * weapon.scale.y, 2) : .14;
  reachCache.set(weapon, reach);
  return reach;
}

// `parent` is the group the effects live in (Live mode's world group, which also holds the
// hero). The trail and burst are added to it.
export const PLAIN_TINT = [.85, .9, 1];
// The brief cold flash at an off-hand blade's edge when its blow lands: a thin four-point star
// that flares, spins a quarter turn and is gone.
export const GLINT_LIFE = .16, GLINT_SIZE = .34;
export function glintScale(age) {
  if (!(age >= 0) || age >= GLINT_LIFE) return 0;
  const u = age / GLINT_LIFE;
  return Math.sin(Math.PI * Math.sqrt(u)) * GLINT_SIZE;
}
export function createSwingFx(THREE, parent) {
  const trail = createSwingTrail(THREE), burst = createImpactBurst(THREE, 128, 7);
  // A second, shorter ribbon for the off-hand blade of a two-weapon strike.
  const offTrail = createSwingTrail(THREE, 8, .1);
  const glint = new THREE.Group(), glintMat = new THREE.MeshBasicMaterial({color: 0xdfe8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide});
  for (const rz of [0, Math.PI / 2]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1, .07), glintMat);
    bar.rotation.z = rz; glint.add(bar);
  }
  glint.visible = false;
  let glintAge = GLINT_LIFE;
  parent.add(trail.mesh, offTrail.mesh, burst.points, glint);
  const base = new THREE.Vector3(), tip = new THREE.Vector3(), at = new THREE.Vector3();
  // Where along the weapon the ribbon's inner edge sits (the blade, not the grip).
  const INNER = .25;
  function update(hero, dt, targetName = null) {
    const s = hero?.actions?.swing, socket = s?.off && hero?.offhandSocket ? hero.offhandSocket : hero?.weaponSocket;
    if (s?.trail && socket) {
      const reach = weaponReach(socket);
      socket.updateWorldMatrix(true, false);
      socket.localToWorld(base.set(0, reach * INNER, 0));
      socket.localToWorld(tip.set(0, reach, 0));
      parent.updateWorldMatrix(true, false);
      parent.worldToLocal(base); parent.worldToLocal(tip);
      // a magic weapon's trail takes its colour (weapon-magic.js); plain steel stays pale blue
      const ribbon = s.off ? offTrail : trail;
      ribbon.setTint(socket.userData.weaponMagic?.tint ?? PLAIN_TINT);
      if ([base.x, base.y, base.z, tip.x, tip.y, tip.z].every(Number.isFinite)) ribbon.sample(base, tip);
    }
    if (s?.contact && hero.g) {
      const d = Array.isArray(s.dir) ? s.dir : null, len = d ? Math.hypot(d[0], d[1]) : 0;
      // Without a direction, strike where the hero faces.
      const dx = len ? d[0] / len : Math.sin(hero.g.rotation.y), dz = len ? d[1] / len : Math.cos(hero.g.rotation.y);
      at.set(hero.g.position.x + dx * .62, .62, hero.g.position.z + dz * .62);
      // The action's own defender, else the caller's last-known one (text-fallback swings).
      burst.burst(at, [dx, dz], impactKind(s.target ?? targetName), s.blow);
    }
    if (s?.contact && s.off && socket && hero.g) {
      socket.updateWorldMatrix(true, false);
      socket.localToWorld(tip.set(0, weaponReach(socket), 0));
      parent.updateWorldMatrix(true, false);
      parent.worldToLocal(tip);
      if ([tip.x, tip.y, tip.z].every(Number.isFinite)) { glint.position.copy(tip); glintAge = 0; }
    }
    if (glintAge < GLINT_LIFE) {
      glintAge += dt;
      const k = glintScale(glintAge);
      glint.visible = k > 0;
      glint.scale.setScalar(Math.max(k, 1e-4));
      glint.rotation.z = glintAge / GLINT_LIFE * Math.PI / 2;
    } else glint.visible = false;
    trail.update(dt);
    offTrail.update(dt);
    burst.update(dt);
  }
  return {trail, offTrail, burst, glint, update,
    dispose() { parent.remove(trail.mesh, offTrail.mesh, burst.points, glint); glint.children.forEach(c => c.geometry.dispose()); glintMat.dispose(); trail.dispose(); offTrail.dispose(); burst.dispose(); }};
}
