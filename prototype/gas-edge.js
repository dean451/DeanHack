import * as THREE from 'three';

// A hero standing in poison gas feels it: the edges of the screen take on a faint sickly green,
// and every few seconds the hero coughs: a short, ragged double heave that flares the tint and
// jolts the whole view a hair. The tint is a fixed overlay (a radial gradient, clear in the
// middle), so it costs no scene work. Exposure is how deep inside a cloud the hero stands: full
// within GAS_INNER of a cloud's centre, fading to none at GAS_OUTER. It eases in and out, so the
// edges creep green rather than flash. Everything but the DOM overlay is pure and testable.
export const GAS_INNER = .35; // tile units: full exposure within this of a cloud's centre
export const GAS_OUTER = 1.05; // tile units: no exposure beyond this
export const GAS_TINT = .42; // peak overlay opacity from breathing the gas
export const GAS_EASE = 2.2; // how fast exposure eases (1/s)
export const COUGH_EVERY = 4.6; // seconds between coughs while deep in gas
export const COUGH_LEN = .7; // seconds one cough lasts
export const COUGH_FLARE = .3; // extra overlay opacity at the peak of a cough
export const COUGH_JOLT = 2.2; // peak view jolt in pixels

// How deep the hero is in the gas: 0 outside every cloud, 1 at the heart of one.
export function gasExposure(hero, clouds) {
  if (!hero) return 0;
  let best = 0;
  for (const c of clouds) {
    const d = Math.hypot(hero.x - c.x, hero.z - c.z);
    const k = Math.min(1, Math.max(0, (GAS_OUTER - d) / (GAS_OUTER - GAS_INNER)));
    if (k > best) best = k;
  }
  return best;
}

// One cough at time t (0 when not coughing): two quick heaves, the second weaker, easing to nothing.
export function coughState(t, exposure) {
  if (exposure < .5) return {flare: 0, jolt: 0};
  const age = (((t % COUGH_EVERY) + COUGH_EVERY) % COUGH_EVERY) / COUGH_LEN;
  if (age >= 1) return {flare: 0, jolt: 0};
  const heave = Math.abs(Math.sin(age * Math.PI * 2)) * (1 - age) * (1 - age * .4);
  return {flare: heave * COUGH_FLARE * exposure, jolt: heave * COUGH_JOLT * exposure * Math.sin(age * 40)};
}

// The hero's body folds forward with each heave (radians of forward lean), and is upright between coughs.
export const COUGH_HUNCH = .34;
export const coughHunch = cough => Math.min(1, cough.flare / COUGH_FLARE) * COUGH_HUNCH;

// The tint's opacity from smoothed exposure and the cough flare.
export const gasTint = (exposure, flare = 0) => Math.min(1, exposure * GAS_TINT + flare);

export function createGasEdge(doc = globalThis.document) {
  let level = 0, last = null, el = null, hunch = 0;
  const scratch = new THREE.Vector3();
  return {
    get level() { return level; },
    get hunch() { return hunch; },
    update(t, dt, heroWorld, gasMeshes) {
      const clouds = [];
      const seen = new Set();
      for (const m of gasMeshes) {
        const p = m.parent;
        if (!p || seen.has(p) || !m.visible) continue;
        seen.add(p);clouds.push(p.getWorldPosition(scratch).clone());
      }
      const target = gasExposure(heroWorld, clouds);
      level += (target - level) * (1 - Math.exp(-dt * GAS_EASE));
      if (level < .004 && target === 0) level = 0;
      const cough = coughState(t, level);
      hunch = coughHunch(cough);
      if (!el && level > 0 && doc) {
        el = doc.createElement('div');el.id = 'gas-edge';
        el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;background:radial-gradient(ellipse at center,rgba(70,110,20,0) 45%,rgba(78,120,24,.55) 80%,rgba(40,70,10,.9) 100%)';
        doc.body.appendChild(el);
      }
      if (!el) return;
      const opacity = gasTint(level, cough.flare), key = opacity.toFixed(3) + cough.jolt.toFixed(1);
      if (key === last) return;
      last = key;el.style.opacity = String(opacity);
      const s = doc.getElementById('scene');
      if (s) s.style.transform = cough.jolt ? `translate(${cough.jolt.toFixed(1)}px,${(cough.jolt * .5).toFixed(1)}px)` : '';
    },
  };
}
