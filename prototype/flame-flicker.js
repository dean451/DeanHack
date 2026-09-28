// Flickers every lit flame in the scene: the brass lantern and candles (shop-visuals addFlame), the
// Candelabrum, grave candles and a watchman's lantern all tag their flame mesh userData.part='flame'.
// The models stay still; this only animates them. A single flame stretches and squeezes about its
// root (the bottom of its geometry, so it never lifts off the wick), sways a little, and brightens
// and dims, with now and then a short gutter. A mesh holding several merged flames (the
// Candelabrum) only brightens and dims, since stretching it would bob the taller candles' flames.
// The scene is re-scanned twice a second, so flames on items that come and go are picked up.
// Everything is a function of t, so it's frame-rate independent and restore() puts back the rest pose.
// A small fixed pool of warm point lights follows the lit flames nearest the view's focus and
// brightens and dims with them. The pool never grows or shrinks (a change in light count would
// recompile every shader); unused lights sit at intensity 0.
import * as THREE from 'three';

export const FLAME_SCAN_EVERY = .5; // seconds between scene scans
export const FLAME_STRETCH = .16; // peak height change (fraction)
export const FLAME_SQUEEZE = .45; // width change per unit of stretch, the other way
export const FLAME_SWAY = .09; // peak lean, radians
export const FLAME_GLOW = .22; // peak brightness change (fraction)

export const FLAME_LIGHTS = 3; // point lights shared by the nearest flames
export const FLAME_LIGHT_INTENSITY = 5; // a candle; a lantern gets FLAME_LIGHT_LANTERN times this
export const FLAME_LIGHT_LANTERN = 1.6;
export const FLAME_LIGHT_RANGE = 3.2;
export const FLAME_LIGHT_FADE = 4; // level change per second as a light takes or drops a flame

const q = new THREE.Quaternion(), e = new THREE.Euler(), a = new THREE.Vector3(), b = new THREE.Vector3();

// Deterministic 0..1 phase from the mesh, so neighbouring flames don't flicker in step.
function phaseOf(mesh) {
  const x = Math.sin(mesh.id * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * Math.PI * 2;
}

// The flame's shape at time t: stretch (−1..1 scaled by FLAME_STRETCH), lean on x and z, and glow.
export function flameState(t, phase = 0) {
  const s = Math.sin(t * 9.3 + phase) * .5 + Math.sin(t * 15.7 + phase * 1.9) * .3 + Math.sin(t * 23.1 + phase * .6) * .2;
  // A gutter: once every few seconds the flame shrinks and dims for a moment, then recovers.
  const g = Math.max(0, Math.sin(t * .83 + phase * 2.3) - .93) / .07;
  const gutter = g * g * (3 - 2 * g);
  const stretch = s * FLAME_STRETCH - gutter * .22;
  const leanX = (Math.sin(t * 2.7 + phase) * .7 + Math.sin(t * 6.1 + phase * 1.3) * .3) * FLAME_SWAY;
  const leanZ = (Math.sin(t * 2.1 + phase * 1.7) * .7 + Math.sin(t * 5.3 + phase * .4) * .3) * FLAME_SWAY;
  const glow = 1 + (Math.sin(t * 11.3 + phase * 1.1) * .6 + Math.sin(t * 19.9 + phase * .3) * .4) * FLAME_GLOW - gutter * .3;
  return {stretch, leanX, leanZ, glow};
}

function rest(mesh) {
  if (mesh.userData.flameRest) return mesh.userData.flameRest;
  const geo = mesh.geometry;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const box = geo.boundingBox, size = box.getSize(new THREE.Vector3());
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const r = mesh.userData.flameRest = {
    position: mesh.position.clone(), quaternion: mesh.quaternion.clone(), scale: mesh.scale.clone(),
    // The root: bottom centre of the geometry.
    pivot: new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2),
    // Several flames merged side by side are wider than they are tall.
    many: Math.max(size.x, size.z) > size.y * 1.5,
    material, phase: phaseOf(mesh),
  };
  materialRest(material);
  return r;
}

// Materials can be shared (every watchman's lantern flame uses one), so their rest glow lives on
// the material, captured the first time any flame using it is seen.
function materialRest(m) {
  if (!m) return null;
  return m.userData.flameRest ??= {color: m.color?.clone(), emissive: m.emissiveIntensity};
}

function restoreMaterial(m) {
  const r = m?.userData.flameRest;
  if (!r) return;
  if (m.isMeshBasicMaterial && r.color) m.color.copy(r.color);
  else if (r.emissive !== undefined) m.emissiveIntensity = r.emissive;
  delete m.userData.flameRest;
}

// Poses one flame mesh for time t.
export function poseFlame(mesh, t) {
  const r = rest(mesh), f = flameState(t, r.phase), m = r.material, mr = materialRest(m);
  if (mr) {
    if (m.isMeshBasicMaterial && mr.color) m.color.copy(mr.color).multiplyScalar(f.glow);
    else if (mr.emissive !== undefined) m.emissiveIntensity = mr.emissive * f.glow;
  }
  if (r.many) return;
  const sy = 1 + f.stretch, sxz = 1 - f.stretch * FLAME_SQUEEZE;
  mesh.scale.set(r.scale.x * sxz, r.scale.y * sy, r.scale.z * sxz);
  mesh.quaternion.copy(r.quaternion).multiply(q.setFromEuler(e.set(f.leanX, 0, f.leanZ)));
  // Keep the root where it was: rest position + (root at rest) − (root now).
  a.copy(r.pivot).multiply(r.scale).applyQuaternion(r.quaternion);
  b.copy(r.pivot).multiply(mesh.scale).applyQuaternion(mesh.quaternion);
  mesh.position.copy(r.position).add(a).sub(b);
}

// Puts a flame back exactly as it was built. Its material too, unless `keepMaterial` (another
// flame still flickering shares it).
export function restoreFlame(mesh, keepMaterial = false) {
  const r = mesh.userData.flameRest;
  if (!r) return;
  mesh.position.copy(r.position);mesh.quaternion.copy(r.quaternion);mesh.scale.copy(r.scale);
  if (!keepMaterial) restoreMaterial(r.material);
  delete mesh.userData.flameRest;
}

export function findFlames(scene) {
  const out = [];
  scene.traverse(o => { if (o.isMesh && o.userData.part === 'flame') out.push(o); });
  return out;
}

// True when the mesh and every ancestor are visible (Live mode hides its whole group in the demo room).
export function shownInScene(o) {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}

// Where a flame's light sits: a little above its root, in world space.
export function flameLightPosition(mesh, out = new THREE.Vector3()) {
  const r = rest(mesh);
  mesh.updateWorldMatrix(true, false);
  return out.copy(r.pivot).setY(r.pivot.y + .04).applyMatrix4(mesh.matrixWorld);
}

// A lantern flame is bigger than a candle's; a merged row of flames (the Candelabrum) is brighter too.
function flameStrength(mesh) {
  const r = rest(mesh), box = mesh.geometry.boundingBox;
  const tall = (box.max.y - box.min.y) * r.scale.y;
  return (r.many ? 1.8 : tall > .07 ? FLAME_LIGHT_LANTERN : 1) * FLAME_LIGHT_INTENSITY;
}

function createFlameLights(scene) {
  const lights = Array.from({length: FLAME_LIGHTS}, () => {
    const l = new THREE.PointLight(0xffb45e, 0, FLAME_LIGHT_RANGE, 2);
    l.castShadow = false;l.userData = {flame: null, level: 0, strength: 0};
    scene.add(l);return l;
  });
  let last = null;
  const p = new THREE.Vector3();
  return {
    lights,
    update(flames, t, focus) {
      const dt = last === null ? 0 : Math.min(.1, Math.max(0, t - last));last = t;
      const lit = focus ? flames.filter(shownInScene)
        .map(f => ({f, d: flameLightPosition(f, p).distanceToSquared(focus)}))
        .sort((x, y) => x.d - y.d).slice(0, FLAME_LIGHTS).map(x => x.f) : [];
      const wanted = new Set(lit);
      // Lights whose flame is gone fade out; free lights take the new flames.
      for (const l of lights) if (l.userData.flame && !wanted.has(l.userData.flame)) l.userData.target = 0;
      for (const f of lit) {
        if (lights.some(l => l.userData.flame === f)) continue;
        const free = lights.find(l => !l.userData.flame) ?? lights.find(l => !wanted.has(l.userData.flame) && l.userData.level <= 0);
        if (!free) continue;
        Object.assign(free.userData, {flame: f, level: 0, strength: flameStrength(f)});
      }
      for (const l of lights) {
        const u = l.userData;
        if (!u.flame) { l.intensity = 0;continue; }
        const on = wanted.has(u.flame);
        u.level = on ? Math.min(1, u.level + dt * FLAME_LIGHT_FADE) : Math.max(0, u.level - dt * FLAME_LIGHT_FADE);
        if (!on && u.level <= 0) { u.flame = null;l.intensity = 0;continue; }
        flameLightPosition(u.flame, l.position);
        l.intensity = u.strength * u.level * flameState(t, rest(u.flame).phase).glow;
      }
    },
    release(flame) { for (const l of lights) if (l.userData.flame === flame) { l.userData.flame = null;l.userData.level = 0;l.intensity = 0; } },
    restore() { for (const l of lights) { l.userData.flame = null;l.userData.level = 0;l.intensity = 0; } },
    dispose() { for (const l of lights) { l.removeFromParent();l.dispose?.(); } },
  };
}

// `focus` (optional) returns the world point to light around, e.g. the orbit target; without it
// the flame lights stay off.
export function createFlameFlicker(scene, {focus} = {}) {
  let flames = [], nextScan = -Infinity;
  const lights = createFlameLights(scene);
  return {
    get flames() { return flames; },
    get lights() { return lights.lights; },
    update(t) {
      if (t >= nextScan || t < nextScan - FLAME_SCAN_EVERY * 2) {
        const found = findFlames(scene), keep = new Set(found), used = new Set(found.map(f => f.material));
        // A flame that left the scene is put back, in case its item is shown again.
        for (const f of flames) if (!keep.has(f)) { lights.release(f);restoreFlame(f, used.has(f.material)); }
        flames = found;nextScan = t + FLAME_SCAN_EVERY;
      }
      for (const f of flames) if (f.visible) poseFlame(f, t);
      lights.update(flames, t, focus?.());
    },
    restore() { lights.restore();for (const f of flames) restoreFlame(f);flames = [];nextScan = -Infinity; },
    dispose() { this.restore();lights.dispose(); },
  };
}
