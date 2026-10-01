// A small layer of soft round points whose places, alphas and sizes come from a pure function of
// time, shared by the scroll and potion effects. One THREE.Points (one draw) per layer.
import * as THREE from 'three';

export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// A small point is drawn at its true size in world units (projectionMatrix[1][1] is the camera's
// focal factor, about 3 for the play camera; leaving it out drew every spark a third of its size,
// under a pixel from the play camera). Big soft layers (smoke, shadow, vapour, .12 and up) only
// grow 1.5×, so they don't swallow the tile. A lit point is never smaller than MIN_PX of
// the drawing buffer's half-height (about 6 device pixels on a 1600-pixel-high canvas), so the
// small sparks still read when zoomed out.
export const MIN_PX = .0075;
const VERT = `attribute float aAlpha;attribute float aSize;uniform float uScale;varying float vAlpha;
void main(){vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);float k=mix(projectionMatrix[1][1],1.5,smoothstep(.05,.12,aSize));float px=aSize*uScale*k/max(.1,-mv.z);
gl_PointSize=aAlpha>.01&&aSize>0.?max(px,uScale*${MIN_PX}):0.;gl_Position=projectionMatrix*mv;}`;
const FRAG = `uniform vec3 uColor;varying float vAlpha;
void main(){float r=length(gl_PointCoord-.5)*2.;float a=vAlpha*smoothstep(1.,.2,r);if(a<.01)discard;gl_FragColor=vec4(uColor,a);}`;

// style: {color, blend ('add'|'normal'), count, size, period, alpha, together?}. particleAt(seed,
// p, i) gives {x, y, z, alpha, size} (alpha and size 0–1 of the style's) at life p (0→1).
// `together` starts every point on the same beat (a pair of eyes); otherwise lives are spread out.
export function makePointLayer(style, random, particleAt) {
  const n = style.count, geometry = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), alpha = new Float32Array(n), size = new Float32Array(n);
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const material = new THREE.ShaderMaterial({vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: style.blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {uScale: {value: 400}, uColor: {value: new THREE.Color(style.color)}}});
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;points.renderOrder = 2;
  const drawSize = new THREE.Vector2();
  points.onBeforeRender = renderer => { material.uniforms.uScale.value = renderer.getDrawingBufferSize(drawSize).y / 2; };
  const seeds = Array.from({length: n}, () => [random(), random(), random(), random()]);
  const offsets = seeds.map((_, i) => style.together ? 0 : (i + random() * .6) / n);
  const phase = random();
  const at = (t, i) => ((t / style.period + offsets[i] + phase) % 1 + 1) % 1;
  function update(t) {
    for (let i = 0; i < n; i++) {
      const q = particleAt(seeds[i], at(t, i), i);
      pos[i * 3] = q.x;pos[i * 3 + 1] = q.y;pos[i * 3 + 2] = q.z;
      alpha[i] = q.alpha * style.alpha;size[i] = q.size * style.size;
    }
    for (const name of ['position', 'aAlpha', 'aSize']) geometry.attributes[name].needsUpdate = true;
  }
  return {points, update, seeds, at, dispose() { geometry.dispose();material.dispose(); }};
}
