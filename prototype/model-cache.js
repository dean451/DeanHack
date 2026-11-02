// Built map features, kept and copied instead of rebuilt. Stairs, doors, graves, bars and the like are carved from
// noise-roughened, vertex-painted geometry, tens of milliseconds each, every time a square shows one (a reveal, a
// new level, a level revisited). The first build of a key (the builder and its seed) is kept as a template; later
// ones are copies that share its geometry and get their own materials, with any userData that points at the
// template's parts pointed at the copy's own (and small three values, a rest pose, cloned). A model a copy could not reproduce (anything but groups and meshes,
// or userData functions other than dispose: a fire's animation, say) is not kept and is built fresh each time.
import * as THREE from 'three';

export const CACHE_SIZE = 160;
const templates = new Map(); // key -> template, or null for a model that cannot be copied

const isPlain = v => v && typeof v === 'object' && (v.constructor === Object || Array.isArray(v));
// small three values (a rest pose, a tint) are cloned per copy
const isValue = v => !!(v?.isVector2 || v?.isVector3 || v?.isVector4 || v?.isEuler || v?.isQuaternion || v?.isColor || v?.isMatrix4);
function copyable(root) {
  let ok = true;
  const plain = v => { if (typeof v === 'function') return false;if (v?.isObject3D || isValue(v)) return true;if (isPlain(v)) return Object.values(v).every(plain);return v === null || typeof v !== 'object'; };
  root.traverse(o => {
    if (!(o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && !Array.isArray(o.material)) && !(o.type === 'Group' || o.type === 'Object3D')) ok = false;
    for (const [k, v] of Object.entries(o.userData)) if (!(o === root && k === 'dispose') && !plain(v)) ok = false;
  });
  return ok;
}

function copyOf(template) {
  const map = new Map(), materials = [];
  const copy = o => {
    let c;
    if (o.isMesh) { const m = o.material.clone();materials.push(m);c = new THREE.Mesh(o.geometry, m);c.castShadow = o.castShadow;c.receiveShadow = o.receiveShadow;c.frustumCulled = o.frustumCulled; }
    else c = new THREE.Group();
    c.name = o.name;c.position.copy(o.position);c.quaternion.copy(o.quaternion);c.scale.copy(o.scale);c.visible = o.visible;c.renderOrder = o.renderOrder;
    map.set(o, c);for (const ch of o.children) c.add(copy(ch));
    return c;
  };
  const root = copy(template);
  const remap = v => v?.isObject3D ? (map.get(v) ?? v) : isValue(v) ? v.clone() : Array.isArray(v) ? v.map(remap) : isPlain(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, remap(x)])) : v;
  for (const [o, c] of map) for (const [k, v] of Object.entries(o.userData)) if (typeof v !== 'function') c.userData[k] = remap(v);
  // the geometry is the template's, kept for the next copy: a copy frees only its own materials
  root.userData.dispose = () => { for (const m of materials) m.dispose(); };
  return root;
}

// The model for `key`, built by `build()` the first time and copied after.
export function cachedModel(key, build) {
  if (templates.has(key)) {
    const t = templates.get(key);templates.delete(key);templates.set(key, t); // most recently used last
    return t ? copyOf(t) : build();
  }
  const model = build();
  const keep = copyable(model);
  templates.set(key, keep ? model : null);
  if (templates.size > CACHE_SIZE) templates.delete(templates.keys().next().value);
  return keep ? copyOf(model) : model;
}

export const cacheStats = () => ({size: templates.size, copyable: [...templates.values()].filter(Boolean).length});
