// Orientation debug overlay: one arrow per thing with a facing, so the convention in
// ORIENTATION.md can be checked by eye. Off in normal play; `?orient` or `window.__dh.live.orient(true)`
// turns it on in a live game, and orientation-review.html draws it over a gallery.
//
// An arrow is three segments on the floor plane above the object: a shaft along the object's forward
// (world +z of the object, the authored front) and two barbs at the tip. A short tick at the tail marks
// where the object stands. Every arrow is one LineSegments with a shared buffer, rebuilt each frame
// while the overlay is on, so it costs one draw call and nothing when off.
import * as THREE from 'three';

export const COLORS = Object.freeze({hero: 0xffe066, monster: 0x6fe0ff, pet: 0x8dff8d, door: 0xff9a3c, feature: 0xd08cff, weapon: 0xff5c5c, boulder: 0xc8c8c8});
export const MAX_ARROWS = 400;
const SEGMENTS = 4; // shaft, two barbs, tail tick

// The six points (three segments) of an arrow from `origin` along the unit `dir`, in the plane
// normal to `up`. Pure, so a test can check the geometry.
export function arrowPoints(origin, dir, up, length = .5, head = .14) {
  const o = new THREE.Vector3().copy(origin), d = new THREE.Vector3().copy(dir).normalize();
  const side = new THREE.Vector3().crossVectors(up, d).normalize();
  const tip = o.clone().addScaledVector(d, length), back = tip.clone().addScaledVector(d, -head);
  const tailA = o.clone().addScaledVector(side, -.06), tailB = o.clone().addScaledVector(side, .06);
  return [o, tip, tip, back.clone().addScaledVector(side, head * .6), tip, back.clone().addScaledVector(side, -head * .6), tailA, tailB];
}

// World-space forward of an object: its local +z by default (the authored front), or local +y for
// things authored upright (a held weapon points along its own +y from the grip).
export function forwardOf(object, axis = 'z', out = new THREE.Vector3()) {
  object.updateWorldMatrix(true, false);
  const q = object.getWorldQuaternion(new THREE.Quaternion());
  return out.set(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0).applyQuaternion(q).normalize();
}

export function createOrientationOverlay(parent) {
  const positions = new Float32Array(MAX_ARROWS * SEGMENTS * 2 * 3), colors = new Float32Array(MAX_ARROWS * SEGMENTS * 2 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({vertexColors: true, transparent: true, opacity: .95, depthTest: false, depthWrite: false});
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'orientation overlay'; lines.renderOrder = 50; lines.frustumCulled = false; lines.visible = false;
  parent.add(lines);
  const up = new THREE.Vector3(0, 1, 0), color = new THREE.Color(), origin = new THREE.Vector3(), dir = new THREE.Vector3();
  let enabled = false, count = 0;
  // entries: [{object, kind, axis?, length?, lift?}]; the arrow floats `lift` above the object's origin
  function update(entries) {
    count = 0;
    if (!enabled) { lines.visible = false; geometry.setDrawRange(0, 0); return 0; }
    for (const e of entries) {
      if (!e?.object || count >= MAX_ARROWS) break;
      if (e.object.visible === false) continue;
      e.object.getWorldPosition(origin); origin.y += e.lift ?? .06;
      forwardOf(e.object, e.axis ?? 'z', dir);
      if (e.axis !== 'y') dir.y = 0; // facing is about yaw; keep the arrow flat on the floor
      if (dir.lengthSq() < 1e-6) continue;
      const pts = arrowPoints(origin, dir, e.axis === 'y' ? new THREE.Vector3(1, 0, 0) : up, e.length ?? .5);
      color.setHex(COLORS[e.kind] ?? 0xffffff);
      for (let i = 0; i < pts.length; i++) { const k = (count * SEGMENTS * 2 + i) * 3; positions[k] = pts[i].x; positions[k + 1] = pts[i].y; positions[k + 2] = pts[i].z; colors[k] = color.r; colors[k + 1] = color.g; colors[k + 2] = color.b; }
      count++;
    }
    geometry.attributes.position.needsUpdate = true; geometry.attributes.color.needsUpdate = true;
    geometry.setDrawRange(0, count * SEGMENTS * 2);
    lines.visible = count > 0;
    return count;
  }
  return {
    lines,
    get enabled() { return enabled; },
    get count() { return count; },
    set(on) { enabled = !!on; if (!enabled) update([]); return enabled; },
    update,
    dispose() { parent.remove(lines); geometry.dispose(); material.dispose(); },
  };
}

// What a live scene offers the overlay: the hero, each actor, each door and axis feature, each held
// weapon (hero and actors, local +y), and each boulder in flight. Pure over plain objects, so a test
// can feed it fakes.
export function liveEntries({hero, actors = [], tiles = [], flights = []} = {}) {
  const out = [];
  if (hero?.g) { out.push({object: hero.g, kind: 'hero', length: .6, lift: .08}); const w = heldOf(hero); if (w) out.push({object: w, kind: 'weapon', axis: 'y', length: .35}); }
  for (const a of actors) { if (!a?.g) continue; out.push({object: a.g, kind: (a.disposition ?? a.g.userData?.disposition) === 'pet' ? 'pet' : 'monster'}); const w = heldOf(a); if (w) out.push({object: w, kind: 'weapon', axis: 'y', length: .3}); }
  for (const t of tiles) { if (t?.userData?.door) out.push({object: t.userData.door, kind: 'door', length: .45, lift: .5}); if (t?.userData?.axisFeature) out.push({object: t.userData.axisFeature, kind: 'feature', length: .45, lift: .3}); }
  for (const f of flights) if (f?.outer && f.shape === 'boulder') out.push({object: f.outer, kind: 'boulder', length: .6, lift: .55});
  return out;
}
function heldOf(actor) {
  const socket = actor.weaponSocket ?? actor.g?.userData?.weaponSocket;
  const held = socket?.children?.find(c => c.visible !== false);
  return held ?? null;
}
