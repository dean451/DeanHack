// Brings the jewels of every throne in the scene to life (throne.js tags its sapphire mesh
// userData.part='jewel' and its rubies 'ruby', under a group named 'Throne'). The model stays still;
// only the stones' glow changes. The sapphire at the crest breathes slowly brighter and dimmer, and
// every several seconds catches the light in a quick glint. The rubies smoulder on a slower beat,
// out of step with it, and glint more rarely. Each throne has its own phase, so two thrones in one
// room don't pulse together. A throne is dungeon furniture, not an item, so nothing here can give
// away anything unidentified.
// The scene is re-scanned twice a second, so thrones on tiles that come and go are picked up.
// Everything is a function of t, so it's frame-rate independent and restore() puts back the rest glow.

export const GLEAM_SCAN_EVERY = .5; // seconds between scene scans
export const GLEAM_BREATHE = .18; // peak slow change in the sapphire's glow (fraction)
export const GLEAM_SMOULDER = .14; // peak slow change in the rubies' glow (fraction)
export const GLEAM_GLINT = .75; // extra glow at the top of a glint (fraction)
export const GLEAM_GLINT_WIDTH = .09; // seconds; the glint's gaussian width
export const GLEAM_SAPPHIRE_EVERY = 7; // seconds between sapphire glints
export const GLEAM_RUBY_EVERY = 13; // seconds between ruby glints
export const GLEAM_TIC = .4; // peak of the sapphire's late second twitch (fraction)
export const GLEAM_TIC_DELAY = .32; // seconds after the glint that the twitch comes

function phaseOf(obj) {
  const x = Math.sin(obj.id * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * Math.PI * 2;
}

function hash(n) {
  const x = Math.sin(n * 91.345 + 17.17) * 43758.5453;
  return x - Math.floor(x);
}

// A glint once per `every` seconds, at a random point in the middle of each slot, so the
// gaussian's tails never reach the slot's edges. Returns 0..1.
export function glint(t, every, phase = 0, delay = 0) {
  const u = t + phase / (Math.PI * 2) * every, slot = Math.floor(u / every);
  const d = (u - delay - (slot + .2 + hash(slot + phase * 7.1) * .6) * every) / GLEAM_GLINT_WIDTH;
  return Math.exp(-d * d);
}

// The sapphire's tic: after about every third glint it twitches once more, a smaller second
// glint a beat late, like an eye that did not quite close. Never as bright as a real glint, so
// it is not counted as one. Returns 0..GLEAM_TIC.
export function sapphireTic(t, phase = 0) {
  const u = t + phase / (Math.PI * 2) * GLEAM_SAPPHIRE_EVERY, slot = Math.floor(u / GLEAM_SAPPHIRE_EVERY);
  return hash(slot * 3.7 + phase) < .35 ? GLEAM_TIC * glint(t, GLEAM_SAPPHIRE_EVERY, phase, GLEAM_TIC_DELAY) : 0;
}

// Glow multipliers for a throne's stones at time t.
export function gleamState(t, phase = 0) {
  const breathe = Math.sin(t * 1.4 + phase) * .7 + Math.sin(t * .53 + phase * 1.7) * .3;
  const smoulder = Math.sin(t * .83 + phase * 2.3 + 2) * .65 + Math.sin(t * 2.1 + phase * .6) * .35;
  const sapphireGlint = glint(t, GLEAM_SAPPHIRE_EVERY, phase), rubyGlint = glint(t, GLEAM_RUBY_EVERY, phase * 1.9 + 1);
  return {
    sapphire: 1 + breathe * GLEAM_BREATHE + sapphireGlint * GLEAM_GLINT + sapphireTic(t, phase),
    ruby: 1 + smoulder * GLEAM_SMOULDER + rubyGlint * GLEAM_GLINT * .8,
    sapphireGlint, rubyGlint,
  };
}

function restOf(mesh) {
  return mesh.userData.gleamRest ??= {emissiveIntensity: mesh.material.emissiveIntensity};
}

export function poseGleam(throne, stones, t) {
  const c = gleamState(t, throne.userData.gleamPhase ??= phaseOf(throne));
  for (const mesh of stones) mesh.material.emissiveIntensity = restOf(mesh).emissiveIntensity * (mesh.userData.part === 'jewel' ? c.sapphire : c.ruby);
}

export function restoreGleam(mesh) {
  const r = mesh.userData.gleamRest;
  if (!r) return;
  mesh.material.emissiveIntensity = r.emissiveIntensity;
  delete mesh.userData.gleamRest;
}

export function findThrones(scene) {
  const out = [];
  scene.traverse(o => {
    if (o.name !== 'Throne') return;
    const stones = o.children.filter(c => c.isMesh && (c.userData.part === 'jewel' || c.userData.part === 'ruby'));
    if (stones.length) out.push({throne: o, stones});
  });
  return out;
}

export function createThroneGleam(scene) {
  let thrones = [], nextScan = -Infinity;
  return {
    get thrones() { return thrones; },
    update(t) {
      if (t >= nextScan || t < nextScan - GLEAM_SCAN_EVERY * 2) {
        const found = findThrones(scene), keep = new Set(found.flatMap(f => f.stones));
        for (const {stones} of thrones) for (const s of stones) if (!keep.has(s)) restoreGleam(s);
        thrones = found;nextScan = t + GLEAM_SCAN_EVERY;
      }
      for (const {throne, stones} of thrones) if (throne.visible) poseGleam(throne, stones, t);
    },
    restore() { for (const {stones} of thrones) for (const s of stones) restoreGleam(s);thrones = [];nextScan = -Infinity; },
  };
}
