// Light and shadow as mood: the dark is a place, and the player can read how far their light
// reaches. Everything here comes from what the frame already says, never from invented state:
//
// - Which cells the hero can see (`cell.visible`, the engine's cansee()). The hero always sees the
//   eight cells around them; beyond that, only lit cells. So when every visible cell lies inside
//   NetHack's own vision circle of radius 1, 2 or 3 around the hero (vision.c circle_data), the
//   hero stands in the dark and that radius is how far their light reaches: 1 with no light at all,
//   2 for a candle, 3 for a lit lamp or lantern (timeout.c begin_burn). Anything seen past radius 3
//   means a lit room or a lit area in view, and the dark treatment stays off.
// - Blindness (`player.conditions` has Blind) and being engulfed (`engulfer`) turn it off: the
//   blind screen and the engulf view have their own looks.
//
// The veil: one screen-facing quad drawn after the scene that darkens everything outside an
// ellipse around the hero, the ellipse being the floor circle of the light radius as the camera
// sees it. The halo: one warm ring on the floor at the edge of the hero's own light, shown only
// when that light is more than the bare radius 1 (so a light source is lit), swaying a little with
// the hero's steps like a carried lantern. Two meshes in all, no lights, no per-cell cost.

// NetHack's vision circles (vision.c circle_data): for radius r, the furthest |dx| seen at each |dy|.
export const CIRCLES = {1: [1, 1], 2: [2, 2, 1], 3: [3, 3, 2, 1]};
export const MAX_LIGHT = 3;

export function inCircle(dx, dz, r) {
  const lim = CIRCLES[r];
  if (!lim) return false;
  const ady = Math.abs(dz);
  return ady < lim.length && Math.abs(dx) <= lim[ady];
}

const OFF = Object.freeze({dark: false, radius: 0, carried: false});

// {dark, radius, carried} for a frame. radius is the hero's light reach in cells (1..3) while dark.
export function lightAround(frame) {
  const p = frame?.player, cells = frame?.cells;
  if (!p || !Array.isArray(cells)) return OFF;
  if (frame.engulfer) return OFF;
  if ((p.conditions || []).some(c => /^blind$/i.test(String(c)))) return OFF;
  let radius = 1, any = false;
  for (const c of cells) {
    if (!c.visible) continue;
    any = true;
    const dx = c.x - p.x, dz = c.z - p.z;
    while (radius <= MAX_LIGHT && !inCircle(dx, dz, radius)) radius++;
    if (radius > MAX_LIGHT) return OFF;
  }
  if (!any) return OFF;
  return {dark: true, radius, carried: radius >= 2};
}

// The veil: inside the light it is clear, past it darkness deepens to VEIL_ALPHA by VEIL_FAR
// light radii. The remembered-tile fog (remembered.js) still does its own dimming underneath.
export const VEIL_COLOR = 0x020306, VEIL_ALPHA = .58, VEIL_NEAR = 1, VEIL_FAR = 2.6;
// How far past the last lit cell's centre the light's edge sits (half a cell).
export const LIGHT_EDGE = .5;
// Halo: warm, faint, thin; it sways STEP_SWAY world units with each step and breathes a little.
export const HALO_COLOR = 0xffa64d, HALO_ALPHA = .34, HALO_WIDTH = .16, STEP_SWAY = .07;
// Fade rates (1/s): the dark comes on slower than it lifts, so stepping into a lit room is quick.
export const FADE_IN = 2.2, FADE_OUT = 4;
// Draw order: after every other transparent thing; dark-eyes.js draws its glints just above.
export const VEIL_ORDER = 900;

const veilVertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const veilFragment = `uniform vec3 color;uniform float alpha,aspect,near,far;uniform vec2 center,radii;varying vec2 vUv;
void main(){vec2 p=vec2((vUv.x-center.x)*aspect,vUv.y-center.y);float d=length(vec2(p.x/max(radii.x,1e-4),p.y/max(radii.y,1e-4)));
gl_FragColor=vec4(color,alpha*smoothstep(near,far,d));}`;
const haloVertex = veilVertex;
const haloFragment = `uniform vec3 color;uniform float alpha,radius,width;varying vec2 vUv;
void main(){float d=length(vUv-.5)*2.;float k=(d-radius)/width;float a=exp(-k*k)+.18*(1.-smoothstep(radius*.3,radius,d));
gl_FragColor=vec4(color*a*alpha,1.);}`;
// The halo quad's half-size in world units; its ring radius is given as a fraction of it.
export const HALO_HALF = MAX_LIGHT + LIGHT_EDGE + .6;

export function createDarkness(THREE, parent) {
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: {color: {value: new THREE.Color(VEIL_COLOR)}, alpha: {value: 0}, aspect: {value: 1}, near: {value: VEIL_NEAR}, far: {value: VEIL_FAR}, center: {value: new THREE.Vector2(.5, .5)}, radii: {value: new THREE.Vector2(.1, .1)}},
    vertexShader: veilVertex, fragmentShader: veilFragment, transparent: true, depthTest: false, depthWrite: false,
  }));
  veil.name = 'darkness veil'; veil.renderOrder = VEIL_ORDER; veil.frustumCulled = false; veil.visible = false;
  veil.castShadow = veil.receiveShadow = false; veil.userData.unbatched = true;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(HALO_HALF * 2, HALO_HALF * 2), new THREE.ShaderMaterial({
    uniforms: {color: {value: new THREE.Color(HALO_COLOR)}, alpha: {value: 0}, radius: {value: .5}, width: {value: .05}},
    vertexShader: haloVertex, fragmentShader: haloFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.name = 'light halo'; halo.rotation.x = -Math.PI / 2; halo.visible = false; halo.castShadow = halo.receiveShadow = false;
  parent.add(veil, halo);
  const state = {dark: false, radius: 0, carried: false, veil: 0, halo: 0, shownRadius: 1};
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), right = new THREE.Vector3(), fwd = new THREE.Vector3();
  const toUv = (p, camera, out) => { out.copy(p).project(camera); return out; };
  return {
    veil, halo, state,
    // Read the frame's light. Returns the new reading.
    frame(frame) { const l = lightAround(frame); state.dark = l.dark; state.radius = l.radius; state.carried = l.carried; return l; },
    // Turned off at once (a new level, back to the splash).
    clear() { state.dark = state.carried = false; state.radius = 0; state.veil = state.halo = 0; veil.visible = halo.visible = false; },
    update(t, dt, {at, camera, moving = false} = {}) {
      dt = Math.max(0, dt || 0);
      const ease = (cur, on) => cur + ((on ? 1 : 0) - cur) * (1 - Math.exp(-(on ? FADE_IN : FADE_OUT) * dt));
      state.veil = ease(state.veil, state.dark); if (!state.dark && state.veil < .01) state.veil = 0;
      state.halo = ease(state.halo, state.dark && state.carried); if (!(state.dark && state.carried) && state.halo < .01) state.halo = 0;
      if (state.radius) state.shownRadius += (state.radius - state.shownRadius) * (1 - Math.exp(-6 * dt));
      const reach = state.shownRadius + LIGHT_EDGE;
      veil.visible = state.veil > 0 && !!at && !!camera;
      if (veil.visible) {
        camera.updateMatrixWorld();
        // Cover the view: a quad just past the near plane, facing the camera.
        const d = Math.max(camera.near * 2, .2), h = 2 * d * Math.tan((camera.fov || 36) * Math.PI / 360), w = h * (camera.aspect || 1);
        camera.getWorldDirection(v);
        veil.position.copy(camera.position).addScaledVector(v, d); veil.quaternion.copy(camera.quaternion); veil.scale.set(w * 1.02, h * 1.02, 1);
        veil.updateMatrix(); veil.matrixWorldNeedsUpdate = true;
        // The light's floor circle as the camera sees it: its centre and its two screen radii.
        a.set(at.x, .3, at.z); toUv(a, camera, b);
        const cx = b.x, cy = b.y, aspect = camera.aspect || 1;
        right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
        fwd.set(v.x, 0, v.z); if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1); fwd.normalize();
        toUv(a.set(at.x + right.x * reach, .3, at.z + right.z * reach), camera, b); const rx = Math.hypot((b.x - cx) * aspect, b.y - cy) / 2;
        toUv(a.set(at.x + fwd.x * reach, .3, at.z + fwd.z * reach), camera, b); const ry = Math.hypot((b.x - cx) * aspect, b.y - cy) / 2;
        const u = veil.material.uniforms;
        u.center.value.set((cx + 1) / 2, (cy + 1) / 2); u.radii.value.set(rx, Math.max(ry, rx * .25)); u.aspect.value = aspect;
        u.alpha.value = VEIL_ALPHA * state.veil;
      }
      halo.visible = state.halo > 0 && !!at;
      if (halo.visible) {
        // A held light swings with the stride: side to side once per two steps, a dip on each.
        const swing = moving ? Math.sin(t * 9) : Math.sin(t * 1.3) * .25;
        halo.position.set(at.x + swing * STEP_SWAY, .02, at.z + (moving ? Math.abs(Math.cos(t * 9)) - .5 : 0) * STEP_SWAY * .6);
        const u = halo.material.uniforms, breathe = 1 + Math.sin(t * 2.1) * .015 + Math.sin(t * 7.3) * .008;
        u.radius.value = Math.min(.97, reach * breathe / HALO_HALF); u.width.value = HALO_WIDTH / HALO_HALF;
        u.alpha.value = HALO_ALPHA * state.halo;
      }
    },
    dispose() { for (const m of [veil, halo]) { m.removeFromParent(); m.geometry.dispose(); m.material.dispose(); } },
  };
}
