// A dragon's hide: smooth-shaded, glossy and shimmering, covered in small overlapping scales that are worked
// out in the shader from the surface's own position (not a texture wrapped on a sphere, which stretched,
// smeared at the poles and read as woven cloth). The scales are laid three ways at once (from the side,
// from above, from the front) and blended by which way the surface faces, so they stay one size everywhere;
// they are measured in the model's own frame (the skin's bind pose for the skinned neck, tail and legs), so
// they ride the skin when it bends instead of swimming over it. Each scale is a dome rising from under the
// one before it, so the light catches its leading edge; the seams between scales are a touch darker.
import * as THREE from 'three';

// How many scales to a metre (in world units), how deep they read, and how dark their seams go.
export const SCALES = {perMetre: 34, depth: .9, seam: .22};

const VERT_PARS = `varying vec3 vScalePos;\nvarying vec3 vScaleNormal;\nuniform float uScalesPerMetre;`;
// object position scaled by the object's own world scale: one scale size whatever the mesh's scale
const VERT = `vScalePos = position * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz)) * uScalesPerMetre;\nvScaleNormal = normal;`;
const FRAG_PARS = `varying vec3 vScalePos;
varying vec3 vScaleNormal;
uniform float uScaleDepth;
uniform float uScaleSeam;
// one plane of scales: rows offset by half a scale, each a dome highest just behind its leading edge
float scaleRow(vec2 p) {
  float row = floor(p.y);
  vec2 c = vec2(fract(p.x + .5 * mod(row, 2.)) - .5, fract(p.y));
  float d = length(vec2(c.x * 1.7, c.y - .38));
  return clamp(1. - d * 1.55, 0., 1.) * (1. - .45 * c.y);
}
float dragonScales(vec3 p, vec3 n) {
  vec3 w = pow(abs(n), vec3(4.)); w /= (w.x + w.y + w.z + 1e-5);
  return scaleRow(p.zy) * w.x + scaleRow(p.xz) * w.y + scaleRow(p.xy) * w.z;
}
vec3 scalePerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sx = normalize(dFdx(surfPos)), sy = normalize(dFdy(surfPos)), r1 = cross(sy, surfNorm), r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  return normalize(abs(det) * surfNorm - sign(det) * (dHdxy.x * r1 + dHdxy.y * r2));
}`;
// after the normal is known: tilt it by the scales' slope, and darken the seams a little
const FRAG_NORMAL = `#include <normal_fragment_maps>
float scaleH = dragonScales(vScalePos, normalize(vScaleNormal));
normal = scalePerturb(-vViewPosition, normal, vec2(dFdx(scaleH), dFdy(scaleH)) * uScaleDepth, faceDirection);`;
const FRAG_COLOR = `#include <color_fragment>
diffuseColor.rgb *= 1. - uScaleSeam * (1. - smoothstep(.0, .35, dragonScales(vScalePos, normalize(vScaleNormal))));`;

// Adds the scales to a material in place (any standard or physical material) and marks it.
export function withScales(m, spec = SCALES) {
  m.flatShading = false;
  m.userData.scales = spec;
  m.onBeforeCompile = shader => {
    shader.uniforms.uScalesPerMetre = {value: spec.perMetre};
    shader.uniforms.uScaleDepth = {value: spec.depth};
    shader.uniforms.uScaleSeam = {value: spec.seam};
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${VERT_PARS}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT}`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${FRAG_PARS}`).replace('#include <normal_fragment_maps>', FRAG_NORMAL).replace('#include <color_fragment>', FRAG_COLOR);
  };
  m.customProgramCacheKey = () => `dragonScales:${spec.perMetre}:${spec.depth}:${spec.seam}`;
  m.needsUpdate = true;
  return m;
}

// A scaled hide: glossy under a thin clear coat, with a faint iridescent shimmer that shifts as it turns.
// `opts`: colour, roughness, metalness, emissive... (the element's finish); `shimmer`: how strong the shift.
export function scaleHide(color, opts = {}, shimmer = .35) {
  return withScales(new THREE.MeshPhysicalMaterial({
    color, roughness: .45, metalness: .12, clearcoat: .55, clearcoatRoughness: .3,
    iridescence: shimmer, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 650], ...opts,
  }));
}
