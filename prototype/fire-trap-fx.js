import * as THREE from 'three';

// The fire trap (trap.js, kind 'fire') breathes. Its coal bed sinks slowly dark, as if
// something under the grate is drawing in air, then swells back hot in a quicker exhale.
// Now and then a breath comes out as a gasp: the coals flare past white-hot (enough to catch
// the bloom pass) and spit a spray of sparks. Ordinary exhales spit only a few. Each spark
// shoots up through the grate on a jagged, kinked path, never a gentle float, cools from
// yellow through orange to a dull red and winks out before it clears the spikes by much.
// A known fire trap is already showing on the map, so none of this gives anything away.
// trap.js sets the group's userData.animate to fireTrapAnimator(); live.js already calls
// every tile's animate(t). The spark group is added on the first call (so the static model
// is unchanged until it's animated) and disposes its own geometry and material. Everything
// is a function of t, so it's frame-rate independent. One extra draw per trap.

export const BREATH_EVERY = 5.2; // seconds for one inhale and exhale
export const INHALE = .62; // fraction of a breath spent drawing in
export const GLOW_REST = .85; // the coals' brightness between breaths (1 is as modelled)
export const GLOW_LOW = .45; // at the bottom of an inhale
export const GLOW_PEAK = 1.2; // at the top of an exhale
export const GASP_PEAK = 1.65; // at the top of a gasp
export const GASP_CHANCE = .3; // share of breaths that come out as a gasp
export const SPARKS = 10;
export const SPARK_CHANCE = [.3, .9]; // chance each spark flies on an exhale, and on a gasp
export const SPARK_LIFE = [.6, 1.1]; // seconds in the air
export const SPARK_RISE = [.16, .38]; // how high a spark climbs
export const SPARK_REACH = .3; // a spark's sideways reach from the vent centre stays within this
export const SPARK_SIZE = .009;

const HOT = new THREE.Color(0xffe38a), WARM = new THREE.Color(0xff6a14), COLD = new THREE.Color(0x8a1404);

function hash(n) {
  const x = Math.sin(n * 91.345 + 17.17) * 43758.5453;
  return x - Math.floor(x);
}
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = u => u * u * (3 - 2 * u);

// Which breath t falls in, how far through it (0..1), and whether it's a gasp.
export function breathCycle(t, phase = 0) {
  const b = t / BREATH_EVERY + phase, cycle = Math.floor(b);
  return {cycle, u: b - cycle, gasp: hash(cycle * 7.13 + phase * 31.7) < GASP_CHANCE};
}

// The coal glow multiplier at time t: a slow sink, a quicker swell, a faint uneven flicker.
export function breathAt(t, phase = 0) {
  const {u, gasp} = breathCycle(t, phase);
  let glow;
  if (u < INHALE) glow = lerp(GLOW_REST, GLOW_LOW, smooth(u / INHALE));
  else {
    const v = (u - INHALE) / (1 - INHALE), peak = gasp ? GASP_PEAK : GLOW_PEAK;
    glow = lerp(GLOW_LOW, GLOW_REST, v) + (peak - (GLOW_LOW + GLOW_REST) / 2) * Math.sin(Math.PI * v) ** 2;
  }
  const flicker = .03 * Math.sin(t * 7.3 + phase * 9) + .02 * Math.sin(t * 13.1 + phase * 4);
  return Math.max(0, glow + flicker);
}

// Spark i in breath `cycle`: whether it flies, when it leaves (seconds from t=0) and its path.
function flight(i, cycle, phase) {
  const k = n => hash(i * 17.3 + n + cycle * 3.91 + phase * 5.7);
  const gasp = hash(cycle * 7.13 + phase * 31.7) < GASP_CHANCE;
  if (k(1) >= SPARK_CHANCE[gasp ? 1 : 0]) return null;
  const exhale = (cycle + INHALE - phase) * BREATH_EVERY, span = (1 - INHALE) * BREATH_EVERY;
  // Gasps spit sooner and tighter, right on the flare.
  const start = exhale + span * (gasp ? .2 + .25 * k(2) : .15 + .45 * k(2));
  const a0 = k(3) * Math.PI * 2, r0 = Math.sqrt(k(4)) * .1;
  const kinks = [[Math.cos(a0) * r0, Math.sin(a0) * r0]];
  let x = kinks[0][0], z = kinks[0][1];
  const lean = k(5) * Math.PI * 2;
  for (let j = 1; j <= 3; j++) {
    x += Math.cos(lean) * .025 + (k(10 + j) - .5) * .09;
    z += Math.sin(lean) * .025 + (k(20 + j) - .5) * .09;
    kinks.push([x, z]);
  }
  return {start, life: lerp(SPARK_LIFE[0], SPARK_LIFE[1], k(6)), rise: lerp(SPARK_RISE[0], SPARK_RISE[1], k(7)) * (gasp ? 1.15 : 1), kinks, bright: .75 + .5 * k(8)};
}

// Spark i at time t, relative to the vent centre on the floor. `life` is 0..1 in the air, -1 at rest.
export function sparkState(t, i, phase = 0) {
  const {cycle} = breathCycle(t, phase);
  for (const c of [cycle, cycle - 1]) {
    const f = flight(i, c, phase);
    if (!f) continue;
    const age = t - f.start;
    if (age < 0 || age >= f.life) continue;
    const u = age / f.life;
    // Shot out of the coals, slowing near the top.
    const y = .03 + f.rise * (1 - (1 - u) * (1 - u));
    // Straight runs between sharp kinks.
    const s = u * 3, j = Math.min(2, Math.floor(s)), w = s - j;
    let x = lerp(f.kinks[j][0], f.kinks[j + 1][0], w), z = lerp(f.kinks[j][1], f.kinks[j + 1][1], w);
    const d = Math.hypot(x, z);
    if (d > SPARK_REACH) { x *= SPARK_REACH / d;z *= SPARK_REACH / d; }
    const size = SPARK_SIZE * Math.min(1, u / .08) * Math.min(1, (1 - u) / .45) * f.bright;
    return {x, y, z, size, heat: 1 - u, life: u};
  }
  return {x: 0, y: 0, z: 0, size: 0, heat: 0, life: -1};
}

function phaseOf(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();

export function attachFireTrapFx(trap) {
  let coals = null;
  trap.traverse(o => { if (!coals && o.isMesh && o.name === 'coal-glow') coals = o; });
  const group = new THREE.Group();group.name = 'FireTrapBreath';
  const geo = new THREE.OctahedronGeometry(1, 0), mat = new THREE.MeshBasicMaterial({color: 0xffffff, toneMapped: false});
  const sparks = new THREE.InstancedMesh(geo, mat, SPARKS);
  sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < SPARKS; i++) { sparks.setMatrixAt(i, m4.makeScale(1e-5, 1e-5, 1e-5));sparks.setColorAt(i, HOT); }
  sparks.frustumCulled = false;sparks.castShadow = sparks.receiveShadow = false;sparks.userData.part = 'sparks';
  group.add(sparks);
  group.userData.sparks = sparks;group.userData.coals = coals?.material ?? null;
  group.userData.dispose = () => { geo.dispose();mat.dispose();sparks.dispose(); };
  trap.add(group);
  return group;
}

export function poseFireTrap(group, t, phase = 0) {
  const {sparks, coals} = group.userData;
  if (coals) coals.color.setScalar(breathAt(t, phase));
  for (let i = 0; i < SPARKS; i++) {
    const s = sparkState(t, i, phase);
    // Tumbling, so the octahedron glints as it turns.
    q.setFromAxisAngle(v.set(.6, .8, 0), t * 9 + i);
    sparks.setMatrixAt(i, m4.compose(v.set(s.x, s.y, s.z), q, sc.setScalar(Math.max(s.size, 1e-5))));
    if (s.heat > .5) col.copy(WARM).lerp(HOT, (s.heat - .5) * 2);else col.copy(COLD).lerp(WARM, s.heat * 2);
    sparks.setColorAt(i, col);
  }
  sparks.instanceMatrix.needsUpdate = true;
  if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
}

// For trap.js: the fire trap's userData.animate.
export function fireTrapAnimator(trap, seed = 0) {
  const phase = phaseOf(seed);
  let group = null;
  return t => {
    if (!group || group.parent !== trap) group = attachFireTrapFx(trap);
    poseFireTrap(group, t, phase);
  };
}
