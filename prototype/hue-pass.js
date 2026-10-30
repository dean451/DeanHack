// Hallucination's colour slide, as a post pass. It used to be an animated CSS backdrop-filter over the whole
// window, which made the browser read back and refilter the full canvas every frame on top of the 3D render.
// Here it is one cheap full-screen shader step in the composer, switched off (and skipped) when not hallucinating.
// The hue swings round the wheel and the saturation breathes, on the same 7 s cycle the CSS used.
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

export const HUE_PERIOD = 7;
// [time fraction, hue degrees, saturation]: the old status-hallu-shift keyframes.
const KEYS = [[0, 0, 1.4], [.22, 95, 1.9], [.41, 210, 1.3], [.63, 290, 2], [.82, 340, 1.6], [1, 360, 1.4]];

export function hueAt(t) {
  const u = ((t / HUE_PERIOD) % 1 + 1) % 1;
  for (let i = 1; i < KEYS.length; i++) if (u <= KEYS[i][0]) {
    const [u0, h0, s0] = KEYS[i - 1], [u1, h1, s1] = KEYS[i], k = (u - u0) / (u1 - u0), e = k * k * (3 - 2 * k);
    return {hue: (h0 + (h1 - h0) * e) % 360, sat: s0 + (s1 - s0) * e};
  }
  return {hue: 0, sat: 1.4};
}

export function createHuePass() {
  const pass = new ShaderPass({
    uniforms: {tDiffuse: {value: null}, hue: {value: 0}, sat: {value: 1}},
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform sampler2D tDiffuse;uniform float hue,sat;varying vec2 vUv;
void main(){vec4 c=texture2D(tDiffuse,vUv);float a=radians(hue),co=cos(a),si=sin(a);
mat3 m=mat3(.213+.787*co-.213*si,.213-.213*co+.143*si,.213-.213*co-.787*si,
 .715-.715*co-.715*si,.715+.285*co+.140*si,.715-.715*co+.715*si,
 .072-.072*co+.928*si,.072-.072*co-.283*si,.072+.928*co+.072*si);
vec3 r=m*c.rgb;float l=dot(r,vec3(.2126,.7152,.0722));gl_FragColor=vec4(max(mix(vec3(l),r,sat),0.0),c.a);}`,
  });
  pass.enabled = false;
  pass.update = (on, t) => {
    pass.enabled = !!on;
    if (!on) return;
    const {hue, sat} = hueAt(t);
    pass.uniforms.hue.value = hue; pass.uniforms.sat.value = sat;
  };
  return pass;
}
