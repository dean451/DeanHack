// The sculpted pet's tabby coat, drawn per pixel (feline-sculpt.js grows the body; this paints it).
// The markings are worked out in the shader from where each point sits on the cat at rest, so they
// ride the skin as it moves and stay sharp however close the camera comes, instead of being as
// coarse as the mesh's vertices. Reference: a brown mackerel tabby photographed side-on.
// - Ground: the vertex colours (warm grey-brown, darker along the back, cream underneath and on the
//   chest, chin and muzzle) under fine ticking: each hair banded, so the coat has a grain.
// - Flanks: narrow near-black stripes running down from the spine and leaning back, each one's
//   path bent by layered noise (domain warping), so they waver, thicken and thin, and break; on
//   the belly they break up into spots.
// - Spine: a dark line down the back, with broken lines either side of it.
// - Chest: two or three necklace bands across the throat and chest.
// - Legs: the flank's stripes carry on over the thigh and upper arm; below the knee and elbow, bars
//   across the outside of the leg, fading out toward the paws.
// - Tail: rings, closer together toward the dark tip.
// - Face: a thin M of four short strokes above the eyes, a few broken lines back over the crown, the two swirls running
//   back from the outer corner of each eye, dark eye rims inside pale spectacles.
import * as THREE from 'three';
import {follicles} from './feline-sculpt.js';

// Shapes of the markings, in body units (the housecat's build, before the look's scale).
export const COAT = {
  stripePitch: .062, stripeLean: .35, stripeWidth: .42, warp: .7, warpScale: 9, breakScale: 16, breakUp: .22,
  spine: .011, spineSide: .03, necklace: .05, legPitch: .045, tailRings: 7, tailTip: .88, tick: .2, strength: .92,
};
// The fur: the skin drawn again `shells` times, each pushed out along the surface by its share of the
// hair's length (`length` body units, times the region's own: FUR_LENGTH), keeping only the hairs that
// reach that far, so they thin to tips and the outline goes soft. `density` hairs per body unit
// across; `comb` how far the tips lie back and down along the body (of the length); `root` how dark
// the coat is down at the hairs' roots.
export const FUR = {shells: 10, length: .014, density: 480, comb: .6, root: .76};
// Hair length by region (of FUR.length): longest on the chest, belly and tail, short on the face,
// the legs and the paws.
export const FUR_LENGTH = {body: 1, belly: 1.35, head: .45, cheek: .8, tail: 1.2, leg: .55, paw: .3};

// Per vertex, for the shader: where it sits at rest (body space), how much of it is body, head,
// tail and leg (from its bone weights, so the patterns blend across the joints), and how far along
// the tail it is (0 at the root, 1 at the tip). `tail` is the tail's joints in body space.
export function coatAttributes(geometry, boneNames, tail, {Y = .3, front = .2, neckY = Y + .13} = {}) {
  const pos = geometry.attributes.position, si = geometry.attributes.skinIndex, sw = geometry.attributes.skinWeight, n = pos.count;
  const part = new Float32Array(n * 4), arc = new Float32Array(n);
  const kind = boneNames.map(b => b === 'head' ? 1 : b.startsWith('tail') ? 2 : /fore|hind/.test(b) ? 3 : 0);
  const arcs = [0]; for (let i = 1; i < tail.length; i++) arcs.push(arcs[i - 1] + Math.hypot(...tail[i].map((v, k) => v - tail[i - 1][k])));
  const total = arcs.at(-1);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 4; c++) part[i * 4 + kind[si.getComponent(i, c)]] += sw.getComponent(i, c);
    if (part[i * 4 + 2] > 0) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); let bd = Infinity, bs = 0;
      for (let k = 0; k + 1 < tail.length; k++) {
        const a = tail[k], b = tail[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l2 = dx * dx + dy * dy + dz * dz;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / l2)), d = (x - a[0] - dx * t) ** 2 + (y - a[1] - dy * t) ** 2 + (z - a[2] - dz * t) ** 2;
        if (d < bd) { bd = d; bs = arcs[k] + Math.sqrt(l2) * t; }
      }
      arc[i] = bs / total;
    }
  }
  // the fur's length per vertex
  const fur = new Float32Array(n), F = FUR_LENGTH;
  for (let i = 0; i < n; i++) {
    const [b, h, t, l] = [0, 1, 2, 3].map(c => part[i * 4 + c]), x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const body = y < Y - .05 || z > front ? F.belly : F.body, head = Math.abs(x) > .03 && y < neckY ? F.cheek : F.head, leg = y < .04 ? F.paw : F.leg;
    fur[i] = b * body + h * head + t * F.tail + l * leg;
  }
  geometry.setAttribute('aFur', new THREE.BufferAttribute(fur, 1));
  geometry.setAttribute('aRest', pos.clone());
  geometry.setAttribute('aPart', new THREE.BufferAttribute(part, 4));
  geometry.setAttribute('aArc', new THREE.BufferAttribute(arc, 1));
}

const GLSL = `
uniform vec3 uStripe; uniform float uY, uHeadScale, uFront; uniform vec2 uEyeR; uniform vec3 uNeck; uniform vec3 uEye;
varying vec3 vRest; varying vec4 vPart; varying float vArc;
float h31(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { return .5 * vnoise(p) + .25 * vnoise(p * 2.03 + 1.7) + .125 * vnoise(p * 4.01 + 3.1) + .0625 * vnoise(p * 8.07 + 5.3); }
// a stripe of width w (0..1 of its pitch) on a phase that repeats every 1, softened over the pixel
float stripe(float ph, float w) { float d = abs(fract(ph) - .5) * 2., aa = fwidth(ph) * 2. + .02; return 1. - smoothstep(w - aa, w + aa, d); }
// smoothstep that also runs downhill (a > b), which GLSL's own leaves undefined
const vec3 FOLLICLE[${follicles().length}] = vec3[](${follicles().map(f => `vec3(${f.map(v => v.toFixed(4)).join(', ')})`).join(', ')});
// distance from p to the segment a-b
float seg2(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }
float rs(float a, float b, float x) { return a < b ? smoothstep(a, b, x) : 1. - smoothstep(b, a, x); }
vec3 tabby(vec3 base) {
  vec3 p = vRest; float ax = abs(p.x);
  vec3 q = p * ${COAT.warpScale.toFixed(1)};
  vec2 warp = vec2(fbm(q), fbm(q + vec3(5.2, 1.3, 2.8))) - .5;
  float broken = rs(${COAT.breakUp.toFixed(2)}, ${(COAT.breakUp + .25).toFixed(2)}, fbm(p * ${COAT.breakScale.toFixed(1)} + 9.));
  // wider up by the spine, thinner down the flank, and never quite even
  float wid = ${COAT.stripeWidth.toFixed(2)} * (.7 + .6 * fbm(p * 14. + 2.)) * mix(.75, 1.2, rs(uY - .06, uY + .08, p.y));
  // flanks: down from the spine, leaning back as they go down, wavering
  float down = uY + .1 - p.y;
  float ph = (p.z + down * ${COAT.stripeLean.toFixed(2)}) / ${COAT.stripePitch.toFixed(3)} + warp.x * ${(COAT.warp * 2).toFixed(2)} + warp.y * ${COAT.warp.toFixed(2)} * down * 3.;
  float flank = stripe(ph, wid) * broken;
  // the belly: the stripes break into spots, then fade
  float belly = rs(uY - .02, uY - .08, p.y);
  float spots = step(.72, fbm(p * 40. + 4.)) * .8;
  flank = mix(flank, spots, belly) * rs(uY - .14, uY - .1, p.y);
  // the spine: a dark line, broken lines either side
  float top = rs(uY + .045, uY + .075, p.y);
  float spine = top * max(1. - rs(${COAT.spine.toFixed(3)} * .7, ${COAT.spine.toFixed(3)} * 1.3, ax + (warp.x) * .006),
    stripe((ax - ${COAT.spineSide.toFixed(3)}) / .03 + .5 + warp.y * .4, .3) * step(.4, fbm(p * 18.)) * rs(${COAT.spineSide.toFixed(3)} + .02, ${COAT.spineSide.toFixed(3)} + .01, ax));
  // the necklaces: bands across the throat and chest
  float front = rs(uFront, uFront + .05, p.z) * rs(uY + .06, uY + .01, p.y);
  float neck = front * stripe((p.y + p.z * .5) / ${COAT.necklace.toFixed(3)} + warp.x * 1.2, .34) * rs(.3, .45, fbm(p * 12. + 7.) + .2);
  float body = max(max(flank, spine), neck);
  // legs: bars round the outside of the leg, fading toward the paw
  float leg = stripe(p.y / ${COAT.legPitch.toFixed(3)} + warp.x * 1.4 + p.z * 4., .38) * rs(.04, .1, p.y) * rs(.02, .045, ax) * (.6 + .4 * broken);
  // tail: rings, then a dark tip
  float rings = stripe(vArc * ${COAT.tailRings.toFixed(1)} + vArc * vArc * 2. + warp.x * .5, .42);
  float tail = max(rings * rs(.06, .14, vArc), rs(${COAT.tailTip.toFixed(2)}, ${(COAT.tailTip + .04).toFixed(2)}, vArc));
  // the face, in head space (before the look's head size)
  vec3 h = (p - uNeck) / uHeadScale; float hx = abs(h.x);
  // the forehead: many fine faint lines between the ears, running down toward the eyes and fading
  // above them (the tabby's M seen up close), broken here and there; a few carry on over the crown
  float forehead = rs(.035, .05, h.y) * rs(.11, .095, h.z) * rs(.032, .022, hx) * step(.3, fbm(p * 60.));
  float mLines = forehead * stripe(hx / .0085 + .5 + warp.x * .35, .3) * .95;
  float eyeD = length(vec2((hx - uEye.x) / uEyeR.x, (h.y - uEye.y) / uEyeR.y));
  float behindEye = rs(uEye.z + .01, uEye.z - .03, h.z);
  float swirl1 = (1. - rs(.003, .007, abs(h.y - (uEye.y - .005) + (uEye.z - h.z) * .25))) * rs(.045, .06, hx) * behindEye;
  float swirl2 = (1. - rs(.003, .007, abs(h.y - (uEye.y - .03) + (uEye.z - h.z) * .55))) * rs(.04, .055, hx) * behindEye * rs(uEye.z - .07, uEye.z - .03, h.z);
  // the lid line right at the eye's edge (the eye's half-width is about .7 of eyeD's unit), pale fur just outside it
  float rim = (1. - rs(.0, .1, abs(eyeD - 1.))) * rs(.06, .09, h.z) * .8;
  float specs = (1. - rs(.08, .28, abs(eyeD - 1.32))) * rs(.06, .09, h.z) * .6;
  // whisker spots: rows of small dark follicles across each whisker pad
  float follicles = 0.;
  for (int i = 0; i < ${follicles().length}; i++) follicles = max(follicles, 1. - smoothstep(.0008, .0013, length(vec2(hx, h.y) - FOLLICLE[i].xy)) * step(FOLLICLE[i].z - .02, h.z));
  // under the nose, the dark line down to the mouth and the mouth's two short arms (an inverted Y)
  float mouth = max(1. - rs(.0007, .0014, seg2(vec2(hx, h.y), vec2(0., -.009), vec2(0., -.026))), 1. - rs(.0007, .0014, seg2(vec2(hx, h.y), vec2(0., -.026), vec2(.013, -.033)))) * rs(.115, .125, h.z);
  float head = max(max(mLines, rim), max(max(swirl1, swirl2) * .9, max(follicles * .45, mouth * .8)));
  // the thigh and upper arm carry the flank's stripes on round them; the bars start at the knee and elbow
  leg = mix(body, leg, rs(uY - .06, uY - .13, p.y));
  float dark = dot(vPart, vec4(body, head, tail, leg)) * ${COAT.strength.toFixed(2)};
  vec3 c = mix(base, mix(base, vec3(1.), .25), specs * vPart.y * .6);
  c = mix(c, uStripe, clamp(dark, 0., 1.));
  // ticking: the grain of banded hairs
  float tick = h31(floor(p * 900.)), tick2 = vnoise(p * 300.);
  c *= 1. - ${COAT.tick.toFixed(2)} + ${(COAT.tick * 2).toFixed(2)} * (.6 * tick + .4 * tick2);
  return c;
}
`;

const cache = new Map();
// The coat material for a look: `L` is feline.js's layout, `neck` the head's pivot and `scale` its
// size, `eye` the eye centre and `eyeR` the half-size of its opening in head space, `front` where the chest's necklaces begin (z). `shell`
// (0..1) makes the material for one layer of fur that far out. Shared by every cat of the look.
export function coatMaterial(L, {neck, scale, eye, eyeR, front}, shell = 0) {
  const key = [L.coat, L.stripe, L.Y, scale, front, eyeR, shell].join('|');
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .86, metalness: 0, sheen: .2, sheenRoughness: .7, sheenColor: new THREE.Color(L.belly)});
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, {uStripe: {value: new THREE.Color(L.stripe)}, uY: {value: L.Y}, uNeck: {value: new THREE.Vector3(...neck)}, uHeadScale: {value: scale}, uEye: {value: new THREE.Vector3(...eye)}, uFront: {value: front}, uEyeR: {value: new THREE.Vector2(...eyeR)}, uShell: {value: shell}});
    sh.vertexShader = 'attribute vec3 aRest; attribute vec4 aPart; attribute float aArc; attribute float aFur; uniform float uShell; varying vec3 vRest; varying vec4 vPart; varying float vArc; varying float vFur;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = aRest; vPart = aPart; vArc = aArc; vFur = aFur;')
      // a shell stands out along the skinned normal by its share of the hair, the tips lying back and down
      .replace('#include <skinning_vertex>', `#include <skinning_vertex>
        float furOut = uShell * aFur * ${FUR.length.toFixed(4)};
        transformed += normalize(objectNormal) * furOut + vec3(0., -.35, -1.) * furOut * uShell * ${FUR.comb.toFixed(2)};`);
    sh.fragmentShader = GLSL + 'uniform float uShell; varying float vFur;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb = tabby(diffuseColor.rgb);
      if (uShell > 0.) {
        // one hair per cell: its own length; it reaches this shell, and thins toward its tip
        vec3 cell = vRest * ${FUR.density.toFixed(1)}, inCell = fract(cell) - .5;
        float len = .35 + .65 * h31(floor(cell) + 3.7);
        if (vFur < .05 || len < uShell || dot(inCell, inCell) > .32 * (1. - uShell / len)) discard;
      }
      // darker down among the roots, lighter at the tips
      diffuseColor.rgb *= uShell > 0. ? mix(${FUR.root.toFixed(2)}, 1.05, uShell) : mix(1., ${((1 + FUR.root) / 2).toFixed(2)}, smoothstep(.3, .8, vFur));`);
  };
  m.customProgramCacheKey = () => 'feline-coat' + (shell > 0 ? '-shell' : '');
  cache.set(key, m);
  return m;
}
