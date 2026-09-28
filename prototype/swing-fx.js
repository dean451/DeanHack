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
export function createSwingFx(THREE, parent) {
  const trail = createSwingTrail(THREE), burst = createImpactBurst(THREE, 128, 7);
  parent.add(trail.mesh, burst.points);
  const base = new THREE.Vector3(), tip = new THREE.Vector3(), at = new THREE.Vector3();
  // Where along the weapon the ribbon's inner edge sits (the blade, not the grip).
  const INNER = .25;
  function update(hero, dt, targetName = null) {
    const s = hero?.actions?.swing, socket = hero?.weaponSocket;
    if (s?.trail && socket) {
      const reach = weaponReach(socket);
      socket.updateWorldMatrix(true, false);
      socket.localToWorld(base.set(0, reach * INNER, 0));
      socket.localToWorld(tip.set(0, reach, 0));
      parent.updateWorldMatrix(true, false);
      parent.worldToLocal(base); parent.worldToLocal(tip);
      if ([base.x, base.y, base.z, tip.x, tip.y, tip.z].every(Number.isFinite)) trail.sample(base, tip);
    }
    if (s?.contact && hero.g) {
      const d = Array.isArray(s.dir) ? s.dir : null, len = d ? Math.hypot(d[0], d[1]) : 0;
      // Without a direction, strike where the hero faces.
      const dx = len ? d[0] / len : Math.sin(hero.g.rotation.y), dz = len ? d[1] / len : Math.cos(hero.g.rotation.y);
      at.set(hero.g.position.x + dx * .62, .62, hero.g.position.z + dz * .62);
      // The action's own defender, else the caller's last-known one (text-fallback swings).
      burst.burst(at, [dx, dz], impactKind(s.target ?? targetName), s.blow);
    }
    trail.update(dt);
    burst.update(dt);
  }
  return {trail, burst, update,
    dispose() { parent.remove(trail.mesh, burst.points); trail.dispose(); burst.dispose(); }};
}
