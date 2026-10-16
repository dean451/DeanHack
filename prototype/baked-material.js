// A standard material that reads colour, roughness and metalness per vertex, so a model's many
// plain materials (coat, skin, beard, brass...) bake into one mesh per body part and one draw
// each (creatures.js mergeStatic with `bake`). The `color` attribute is three's own vertex
// colour; `rm` (roughness, metalness) is this material's. Both ride on vertexColors: turning it
// off (petrify.js does once a monster is stone) puts the material's own roughness and metalness
// back in charge. Being a class keeps the shader hook across clone() (fade, ghosting, stone).
import * as THREE from 'three';

export class BakedMaterial extends THREE.MeshStandardMaterial {
  constructor(options = {}) {
    super({color: '#ffffff', vertexColors: true, roughness: .9, metalness: 0, ...options});
    this.isBakedMaterial = true;
  }
  onBeforeCompile(shader) {
    shader.vertexShader = shader.vertexShader
      .replace('#include <color_pars_vertex>', '#include <color_pars_vertex>\n#ifdef USE_COLOR\nattribute vec2 rm;\nvarying vec2 vRM;\n#endif')
      .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_COLOR\nvRM = rm;\n#endif');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <color_pars_fragment>', '#include <color_pars_fragment>\n#ifdef USE_COLOR\nvarying vec2 vRM;\n#endif')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n#ifdef USE_COLOR\nroughnessFactor = vRM.x;\n#endif')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n#ifdef USE_COLOR\nmetalnessFactor = vRM.y;\n#endif');
  }
  customProgramCacheKey() { return 'baked'; }
}

// True for a material whose look is fully given by colour, roughness and metalness, so it can
// be baked into vertices: a plain opaque standard material with no maps, glow or vertex colours.
export function bakeable(m) {
  return !!m && m.type === 'MeshStandardMaterial' && !m.isBakedMaterial && !m.vertexColors && !m.transparent && m.opacity === 1
    && !m.map && !m.emissiveMap && !m.normalMap && !m.roughnessMap && !m.metalnessMap && !m.alphaMap && !m.aoMap && !m.bumpMap && !m.envMap
    && m.emissive.getHex() === 0 && !m.wireframe && m.alphaTest === 0 && m.blending === THREE.NormalBlending;
}

// The bucket a bakeable material's meshes merge in: everything the baked material can't carry.
export function bakeKey(m) {
  return ['bake', m.flatShading ? 1 : 0, m.side, m.depthWrite ? 1 : 0, m.depthTest ? 1 : 0, m.shadowSide ?? ''].join('|');
}

const cache = new Map();
// One shared baked material per bucket.
export function bakedMaterialFor(m) {
  const key = bakeKey(m);
  if (!cache.has(key)) cache.set(key, new BakedMaterial({flatShading: m.flatShading, side: m.side, depthWrite: m.depthWrite, depthTest: m.depthTest, shadowSide: m.shadowSide}));
  return cache.get(key);
}

// Writes the material's colour, roughness and metalness into every vertex of `geo` (in place).
export function bakeInto(geo, m) {
  const n = geo.attributes.position.count, color = new Float32Array(n * 3), rm = new Float32Array(n * 2);
  const {r, g, b} = m.color;
  for (let i = 0; i < n; i++) { color[i * 3] = r; color[i * 3 + 1] = g; color[i * 3 + 2] = b; rm[i * 2] = m.roughness; rm[i * 2 + 1] = m.metalness; }
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geo.setAttribute('rm', new THREE.BufferAttribute(rm, 2));
  return geo;
}

// Gives an unindexed geometry a plain 0..n-1 index, so every baked part can share one batch
// (BatchedMesh needs all or none indexed). No welding: mergeVertices hashed every vertex and
// cost a level build half a second over forty monsters; the index itself is what the batch needs.
export function withIndex(g) {
  if (g.index) return g;
  const n = g.attributes.position.count, index = new Uint32Array(n);
  for (let i = 0; i < n; i++) index[i] = i;
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

// A plain vertex-coloured standard material (the early-game models are built that way) can
// join the baked family too: its colours are already in the vertices, only `rm` is missing.
export function vertexColoured(m) {
  return !!m && m.type === 'MeshStandardMaterial' && !m.isBakedMaterial && m.vertexColors && !m.transparent && m.opacity === 1
    && !m.map && !m.emissiveMap && !m.normalMap && !m.roughnessMap && !m.metalnessMap && !m.alphaMap && !m.aoMap && !m.bumpMap && !m.envMap
    && m.emissive.getHex() === 0 && !m.wireframe && m.alphaTest === 0 && m.blending === THREE.NormalBlending;
}

// Converts one mesh to the baked material where it stands, keeping the Mesh object (and so
// every field, closure and userData that points at it): the geometry is cloned with the
// material's colour, roughness and metalness written in, and the shared baked material takes
// the material's place. The mesh remembers its colour in userData.color. False if it can't.
export function convertInPlace(mesh) {
  const m = mesh?.material;
  if (!mesh?.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh || Array.isArray(m) || !mesh.geometry?.attributes?.position) return false;
  if (Object.keys(mesh.geometry.morphAttributes || {}).length) return false;
  if (bakeable(m)) {
    mesh.geometry = bakeInto(withIndex(mesh.geometry.clone()), m);
    mesh.userData.color = [m.color.r, m.color.g, m.color.b];
  } else if (vertexColoured(m) && mesh.geometry.attributes.color?.itemSize === 3) {
    const geo = withIndex(mesh.geometry.clone()), n = geo.attributes.position.count, rm = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { rm[i * 2] = m.roughness; rm[i * 2 + 1] = m.metalness; }
    geo.setAttribute('rm', new THREE.BufferAttribute(rm, 2));
    mesh.geometry = geo;
  } else return false;
  mesh.material = bakedMaterialFor(m);
  return true;
}
