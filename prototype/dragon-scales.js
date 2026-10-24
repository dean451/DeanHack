// A dragon's hide: smooth-shaded, glossy and shimmering, covered in small overlapping scales that are worked
// out in the shader from the surface's own position (not a texture wrapped on a sphere, which stretched,
// smeared at the poles and read as woven cloth). The scales are laid three ways at once (from the side,
// from above, from the front) and blended by which way the surface faces, so they stay one size everywhere;
// they are measured in the model's own frame (the skin's bind pose for the skinned neck, tail and legs), so
// they ride the skin when it bends instead of swimming over it. Each scale is a dome rising from under the
// one before it, so the light catches its leading edge; the seams between scales are a touch darker.
import * as THREE from 'three';

// How many scales to a metre (in world units), how deep they read, and how dark their seams go.
// `tint` and `glint`: how much each scale's colour and shine differ from its neighbours', so the hide sparkles
// unevenly as the light moves over it instead of shining as one sheet.
export const SCALES = {perMetre: 34, depth: .9, seam: .22, tint: .16, glint: .55};

const VERT_PARS = `varying vec3 vScalePos;\nvarying vec3 vScaleNormal;\nuniform float uScalesPerMetre;`;
// object position scaled by the object's own world scale: one scale size whatever the mesh's scale
const VERT = `vScalePos = position * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz)) * uScalesPerMetre;\nvScaleNormal = normal;`;
const FRAG_PARS = `varying vec3 vScalePos;
varying vec3 vScaleNormal;
uniform float uScaleDepth;
uniform float uScaleSeam;
uniform float uScaleTint;
uniform float uScaleGlint;
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
// a steady random number per scale (the same scale gets the same number every frame), blended like the pattern
float scaleHash(vec2 p) {
  float row = floor(p.y); vec2 cell = vec2(floor(p.x + .5 * mod(row, 2.)), row);
  return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
}
float scaleRandom(vec3 p, vec3 n) {
  vec3 w = pow(abs(n), vec3(4.)); w /= (w.x + w.y + w.z + 1e-5);
  return scaleHash(p.zy) * w.x + scaleHash(p.xz) * w.y + scaleHash(p.xy) * w.z;
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
float scaleR = scaleRandom(vScalePos, normalize(vScaleNormal));
diffuseColor.rgb *= (1. - uScaleSeam * (1. - smoothstep(.0, .35, dragonScales(vScalePos, normalize(vScaleNormal))))) * (1. + uScaleTint * (scaleR - .5) * 2.);`;
// each scale a little shinier or duller than the next: the glints come and go as the dragon or the light moves
const FRAG_ROUGH = `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor * (1. - uScaleGlint * (scaleR - .35)), .04, 1.);`;

// Adds the scales to a material in place (any standard or physical material) and marks it.
export function withScales(m, spec = SCALES) {
  m.flatShading = false;
  m.userData.scales = spec;
  m.onBeforeCompile = shader => {
    shader.uniforms.uScalesPerMetre = {value: spec.perMetre};
    shader.uniforms.uScaleDepth = {value: spec.depth};
    shader.uniforms.uScaleSeam = {value: spec.seam};
    shader.uniforms.uScaleTint = {value: spec.tint};
    shader.uniforms.uScaleGlint = {value: spec.glint};
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${VERT_PARS}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT}`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${FRAG_PARS}`).replace('#include <normal_fragment_maps>', FRAG_NORMAL).replace('#include <color_fragment>', FRAG_COLOR).replace('#include <roughnessmap_fragment>', FRAG_ROUGH);
  };
  m.customProgramCacheKey = () => `dragonScales:${Object.values(spec).join(':')}`;
  m.needsUpdate = true;
  return m;
}

// A scaled hide: glossy under a thin clear coat, with a faint iridescent shimmer that shifts as it turns.
// `opts`: colour, roughness, metalness, emissive... (the element's finish); `shimmer`: how strong the shift.
export function scaleHide(color, opts = {}, shimmer = .35) {
  return withScales(new THREE.MeshPhysicalMaterial({
    color, roughness: .4, metalness: .15, clearcoat: .7, clearcoatRoughness: .22,
    iridescence: shimmer, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 650], ...opts,
  }));
}
