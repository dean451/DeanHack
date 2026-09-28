// A leaky tap for every sink in the scene (sink.js builds a `Sink` group whose merged `water`
// mesh holds the basin pool and a drip hanging from the spout). The model stays still; this adds
// a drop that swells under the spout, lets go, falls under gravity and lands in the pool, where
// two rings spread and fade. Each sink drips on its own period, so a row of sinks doesn't tick in step.
// The spout tip and pool height are read from the water mesh itself (the vertices above the
// basin are the hanging drip, the rest is the pool), so a reshaped sink keeps dripping in the
// right place. The scene is re-scanned twice a second, so sinks that come and go are picked up.
// Everything is a function of t, so it's frame-rate independent.
import * as THREE from 'three';

export const DRIP_SCAN_EVERY = .5; // seconds between scene scans
export const DRIP_PERIOD = [2.4, 3.8]; // seconds between drops, picked per sink
export const DRIP_SWELL = 1.1; // seconds a drop takes to swell before it lets go
export const DRIP_GRAVITY = 9.8; // tiles are a metre
export const DRIP_RIPPLE = .75; // seconds a ring takes to spread and fade
export const DRIP_RING_DELAY = .16; // the second, smaller ring follows this much later
export const DRIP_RING_RADIUS = .065; // how far the first ring spreads
export const DRIP_RADIUS = .008; // the drop, the same size as the one hanging in the model

const DROP_GEO = new THREE.SphereGeometry(DRIP_RADIUS, 10, 8);
const RING_GEO = new THREE.RingGeometry(.78, 1, 28).rotateX(-Math.PI / 2);

// Where a sink's water mesh drips from and lands, in the water mesh's own space.
// The pool is a flat disc; the hanging drip is the cluster of vertices well above it.
export function dripPoints(geometry) {
  const p = geometry.attributes.position;
  // The drip is the highest cluster: everything within 3 drop radii of the top vertex.
  let top = -Infinity;
  for (let i = 0; i < p.count; i++) top = Math.max(top, p.getY(i));
  const tip = new THREE.Vector3();let n = 0, pool = -Infinity;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > top - DRIP_RADIUS * 3) {tip.x += p.getX(i);tip.y += y;tip.z += p.getZ(i);n++;}
    else pool = Math.max(pool, y);
  }
  if (!n || !Number.isFinite(pool) || top - pool < .05) return null;
  tip.divideScalar(n);
  return {tip, pool};
}

function phaseOf(object) {
  const x = Math.sin(object.id * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// The drip at time t for a sink with this period and offset: the drop's position below the tip
// (`fall`, 0 while swelling), its size and stretch, and the two rings' radius and opacity.
export function dripState(t, period, offset, height) {
  const u = ((t + offset) % period + period) % period;
  const fallTime = Math.sqrt(2 * height / DRIP_GRAVITY);
  const out = {drop: false, fall: 0, size: 0, stretch: 1, rings: [{r: 0, a: 0}, {r: 0, a: 0}]};
  if (u < DRIP_SWELL) {
    // Swells from nothing, and sags into a teardrop just before it lets go.
    const k = u / DRIP_SWELL;
    out.drop = true;out.size = .25 + .75 * k * k * (3 - 2 * k);out.stretch = 1 + .45 * k * k * k;
    out.fall = DRIP_RADIUS * .6 * k * k; // it sags a little as it grows
  } else if (u < DRIP_SWELL + fallTime) {
    const s = u - DRIP_SWELL;
    out.drop = true;out.size = 1;out.stretch = 1.45 + .25 * s / fallTime;
    out.fall = Math.min(height, DRIP_RADIUS * .6 + .5 * DRIP_GRAVITY * s * s);
  }
  const landed = u - DRIP_SWELL - fallTime;
  out.rings.forEach((ring, i) => {
    const s = (landed - i * DRIP_RING_DELAY) / DRIP_RIPPLE;
    if (s < 0 || s >= 1) return;
    const grow = 1 - (1 - s) * (1 - s);
    ring.r = (.006 + DRIP_RING_RADIUS * grow) * (i ? .6 : 1);
    ring.a = (i ? .32 : .55) * (1 - s) * (1 - s);
  });
  return out;
}

export function findSinks(scene) {
  const out = [];
  scene.traverse(o => { if (o.isGroup && o.name === 'Sink') out.push(o); });
  return out;
}

export function createSinkDrip(scene) {
  const dropMaterial = new THREE.MeshStandardMaterial({color: 0x7fc2e4, emissive: 0x1b4d6a, emissiveIntensity: .6,
    roughness: .04, metalness: .1, transparent: true, opacity: .85});
  const sinks = new Map(); // sink group -> its drip rig
  let nextScan = -Infinity;

  function rig(sink) {
    const water = sink.children.find(o => o.isMesh && o.userData.part === 'water');
    const points = water && dripPoints(water.geometry);
    if (!points) return null;
    water.updateMatrix();
    const tip = points.tip.clone().applyMatrix4(water.matrix);
    const pool = new THREE.Vector3(points.tip.x, points.pool, points.tip.z).applyMatrix4(water.matrix);
    const g = new THREE.Group();g.name = 'sink-drip';
    const drop = new THREE.Mesh(DROP_GEO, dropMaterial);drop.visible = false;drop.castShadow = false;
    const rings = [0, 1].map(() => {
      const m = new THREE.MeshBasicMaterial({color: 0xcdeeff, transparent: true, opacity: 0, depthWrite: false,
        side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2});
      const ring = new THREE.Mesh(RING_GEO, m);ring.position.set(tip.x, pool.y + .001, tip.z);ring.visible = false;
      return ring;
    });
    g.add(drop, ...rings);sink.add(g);
    const k = phaseOf(sink);
    return {g, drop, rings, tip, height: tip.y - pool.y,
      period: DRIP_PERIOD[0] + (DRIP_PERIOD[1] - DRIP_PERIOD[0]) * k, offset: k * 7.3};
  }

  function drop(sink) {
    const r = sinks.get(sink);
    if (r) {sink.remove(r.g);for (const ring of r.rings) ring.material.dispose();}
    sinks.delete(sink);
  }

  function scan() {
    const found = new Set(findSinks(scene));
    for (const sink of [...sinks.keys()]) if (!found.has(sink)) drop(sink);
    for (const sink of found) if (!sinks.has(sink)) sinks.set(sink, rig(sink));
  }

  return {
    update(t) {
      if (t >= nextScan || t < nextScan - DRIP_SCAN_EVERY * 2) {nextScan = t + DRIP_SCAN_EVERY;scan();}
      for (const r of sinks.values()) {
        if (!r) continue;
        const s = dripState(t, r.period, r.offset, r.height);
        r.drop.visible = s.drop;
        if (s.drop) {
          r.drop.position.set(r.tip.x, r.tip.y - s.fall, r.tip.z);
          const w = s.size / Math.sqrt(s.stretch);
          r.drop.scale.set(w, s.size * s.stretch, w);
        }
        s.rings.forEach((ring, i) => {
          const mesh = r.rings[i];
          mesh.visible = ring.a > 0;
          mesh.material.opacity = ring.a;
          if (ring.a > 0) mesh.scale.setScalar(ring.r);
        });
      }
    },
    // Hides every drop and ring (the sinks look as built).
    restore() {
      for (const r of sinks.values()) if (r) {r.drop.visible = false;for (const ring of r.rings) ring.visible = false;}
    },
    // Takes the drips off every sink and frees their materials.
    dispose() {
      for (const sink of [...sinks.keys()]) drop(sink);
      dropMaterial.dispose();
    },
    get count() { return [...sinks.values()].filter(Boolean).length; },
  };
}
