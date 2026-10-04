// The balrog's burning whip sheds embers. A handful of sparks tear off points along the lash
// (creatures.js tags the whip mesh part 'whip' and keeps its path in userData.path), drop with a
// little gravity and a sideways drift, cool from yellow to dull red and shrink out before they
// settle on the floor. Each one rests for a while between falls, so it never becomes a stream.
// The embers are a child group of the whip's parent (the body), so they ride along with the
// creature, in the same space as the path. Everything is a function of t, so it's frame-rate
// independent. One shared sphere and material: EMBERS tiny draws per whip-wielder.
import * as THREE from 'three';

export const WHIP_EMBERS = 7; // sparks per whip
export const EMBER_LIFE = [.7, 1.3]; // seconds in the air
export const EMBER_GAP = [.5, 2.4]; // seconds of rest before it tears off again
export const EMBER_SIZE = .012; // radius when it leaves the lash
export const EMBER_DROP = .5; // downward acceleration (world units per s²)
export const EMBER_DRIFT = .05; // sideways wander

const HOT = new THREE.Color(0xffd070), COLD = new THREE.Color(0x8a1806);

function hash(n) {
  const x = Math.sin(n * 91.345 + 17.17) * 43758.5453;
  return x - Math.floor(x);
}
const lerp = (a, b, u) => a + (b - a) * u;

// Ember i at time t: offset from the point on the path where it left (x,y,z), where along the
// path that was (at, 0..1), its size and heat. `life` is 0..1 in the air and -1 at rest.
export function emberState(t, i, phase = 0) {
  const h = k => hash(i * 13.7 + k + phase * 5.3);
  const life = lerp(EMBER_LIFE[0], EMBER_LIFE[1], h(1)), period = life + lerp(EMBER_GAP[0], EMBER_GAP[1], h(2));
  const local = t + h(3) * period + phase * 7, cycle = Math.floor(local / period), age = local - cycle * period;
  if (!(age < life)) return {at: 0, x: 0, y: 0, z: 0, size: 0, heat: 0, life: -1};
  const k = n => hash(i * 13.7 + n + cycle * 3.17 + phase * 5.3);
  const u = age / life;
  const x = (k(4) - .5) * 2 * EMBER_DRIFT * u + Math.sin(u * 7 + k(5) * 6) * .008 * u;
  const z = (k(6) - .5) * 2 * EMBER_DRIFT * u;
  const y = -.5 * EMBER_DROP * age * age;
  const size = EMBER_SIZE * Math.min(1, u / .08) * Math.min(1, (1 - u) / .6) * (.7 + .5 * k(7));
  return {at: .25 + .75 * k(8), x, y, z, size, heat: 1 - u, life: u};
}

let shared = null;
function sharedParts() {
  return shared ??= {geo: new THREE.SphereGeometry(1, 6, 4), };
}

function whipOf(a) {
  if (a.g.userData.whip !== undefined) return a.g.userData.whip;
  let w = null;
  a.g.traverse(o => { if (!w && o.userData.part === 'whip' && o.userData.path) w = o; });
  return (a.g.userData.whip = w);
}

const p = new THREE.Vector3(), c = new THREE.Color();

// Call once per frame. Creates the embers the first time, then poses them for time t.
export function updateWhipEmbers(a, dt, t) {
  if (!a || a.asset) return null;
  const whip = whipOf(a);
  if (!whip) return null;
  const st = a.whipEmbers ??= (() => {
    const {geo} = sharedParts(), group = new THREE.Group();
    group.name = 'WhipEmbers';
    const meshes = Array.from({length: WHIP_EMBERS}, () => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: 0xffa030, toneMapped: false}));
      m.castShadow = m.receiveShadow = false;m.visible = false;group.add(m);return m;
    });
    whip.parent.add(group);
    return {group, meshes, curve: new THREE.CatmullRomCurve3(whip.userData.path.map(q => new THREE.Vector3(...q))), phase: ((a.g.id ?? 1) * 2.399) % (Math.PI * 2)};
  })();
  const dead = !!a.actions?.dead;
  t = Number.isFinite(t) ? t : 0;
  st.meshes.forEach((m, i) => {
    const e = dead ? {life: -1} : emberState(t, i, st.phase);
    if (e.life < 0) { m.visible = false;return; }
    st.curve.getPoint(e.at, p);
    m.position.set(p.x + e.x, Math.max(.004, p.y + e.y), p.z + e.z); // they settle on the floor, never through it
    m.scale.setScalar(e.size);
    m.material.color.copy(c.copy(COLD).lerp(HOT, e.heat));
    m.visible = true;
  });
  return st;
}
