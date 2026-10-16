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
