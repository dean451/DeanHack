// The mind flayer's menace (a Baldur's Gate 3 touch for the illithids): you feel one before it reaches you.
// - Pressure: while a living mind flayer is within RANGE tiles of the hero, a violet pressure creeps in at the
//   edges of the view, stronger the closer it comes (full at NEAR tiles), throbbing slowly, the way the status
//   screen treatments do (style.css #psionic). The strongest flayer sets it; it eases in and out, never snaps.
// - Ripples: out of every mind flayer's swollen cranium, faint violet shells of force swell and fade, one after
//   another, a slow psionic pulse you can see across the room. Each is a sphere drawn only at its rim (a fresnel
//   glow), so it reads as a bubble of pressure, not an object on the head (flat rings read as a hat brim). They are added to the head the first time a
//   flayer is updated (not part of the model, so its draws and its corpse are unchanged; the corpse bake drops
//   additive parts anyway), additive and unlit, one shared geometry.
// Only what the engine shows: the flayers on the map, alive, and the hero's place.
import * as THREE from 'three';

export const PSI = {range: 6, near: 1.5, ease: 3, rings: 3, period: 2.4, grow: 2.6, base: .16, opacity: .9};
export const isFlayer = a => !!(a && /mind flayer/.test(a.species || '') && !a.actions?.dead);

const smooth = v => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };

// The pressure (0..1) from the nearest living flayer: 1 within PSI.near tiles, 0 from PSI.range out.
export function psiPressure(heroPos, actors) {
  if (!heroPos || !actors) return 0;
  let best = 0;
  for (const a of actors) {
    if (!isFlayer(a)) continue;
    const p = a.target || a.g?.position; if (!p) continue;
    const d = Math.hypot(p.x - heroPos.x, p.z - heroPos.z);
    best = Math.max(best, 1 - smooth((d - PSI.near) / (PSI.range - PSI.near)));
  }
  return best;
}

// Eases the overlay's level toward the target and writes it (--psi on the element, `psionic-on` while > 0).
export function updatePsionicScreen(el, state, target, dt) {
  state.v = (state.v ?? 0) + (target - (state.v ?? 0)) * (1 - Math.exp(-PSI.ease * Math.max(0, dt || 0)));
  if (state.v < 1e-3 && target === 0) state.v = 0;
  if (el) { el.style.setProperty('--psi', state.v.toFixed(3)); el.classList.toggle('psionic-on', state.v > 0); }
  return state.v;
}

let ringGeo = null;
// The shell's rim glow: bright where the sphere turns edge-on to the eye, nothing where it faces it. Its strength
// is the material's own `opacity` (copied to the shader each frame).
function shellMaterial() {
  const m = new THREE.ShaderMaterial({
    uniforms: {color: {value: new THREE.Color('#b47cff')}, strength: {value: 0}},
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 color; uniform float strength; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(color * rim * strength, rim * strength); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  m.opacity = 0; return m;
}
function ringParts() {
  if (!ringGeo) { ringGeo = new THREE.SphereGeometry(1, 24, 16); ringGeo.deleteAttribute('uv'); }
  return {ringGeo};
}

// One frame of a flayer's ripples (call for every actor; non-flayers are left alone). The rings ride the head,
// tilted with the cranium, each its own material instance so they can fade on their own phase.
export function updateFlayerPsi(a, dt, t) {
  if (!a?.head || !/mind flayer/.test(a.species || '')) return null;
  let st = a.flayerPsi;
  if (!st) {
    const {ringGeo: geo} = ringParts(), group = new THREE.Group();
    group.position.set(0, .1, -.02); a.head.add(group);
    const rings = Array.from({length: PSI.rings}, (_, i) => { const m = new THREE.Mesh(geo, shellMaterial()); m.userData.part = 'psi'; m.castShadow = m.receiveShadow = false; m.renderOrder = 3; group.add(m); return m; });
    st = a.flayerPsi = {group, rings, life: 1};
  }
  // a dead flayer's ripples die away
  st.life += ((a.actions?.dead ? 0 : 1) - st.life) * (1 - Math.exp(-3 * Math.max(0, dt || 0)));
  st.rings.forEach((m, i) => {
    const u = ((t / PSI.period) + i / PSI.rings) % 1;
    m.scale.setScalar(PSI.base * (1 + PSI.grow * u));
    m.material.opacity = PSI.opacity * Math.sin(Math.PI * u) * (1 - u * .4) * st.life;
    m.material.uniforms.strength.value = m.material.opacity;
    m.visible = m.material.opacity > .004;
  });
  return st;
}
