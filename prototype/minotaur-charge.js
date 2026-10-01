// The minotaur (minotaur.js): the labyrinth's brute, all weight and temper.
//  - It breathes like a bellows: a slow heave of the great hump, deeper with the hero near.
//  - Every SNORT_MIN..+SNORT_SPAN s (sooner with the hero near) it snorts: the head tosses up,
//    then hooks down and over with a jolt through the shoulders, the tail lashing.
//  - With the hero within RANGE tiles it glares: the head swings round to them and drops, the horns
//    levelled. Standing still near them it paws the floor: one hoof scrapes back hard, two or three
//    times, the body rocking with each scrape, before a charge that may or may not come.
//  - Its butt (actions.js already charges it in head down): it digs in the back hoof, ducks its
//    head lower still, and after the impact hooks the horns up and across in a gore, rearing back.
//    Its claws and the labrys swing are left to actions.js.
//  - A blow: it shakes its head hard and snorts.
//  - Death: everything eases back to rest. Turned to stone (`a.stone`): it holds.
// Handles used: body, head, legs, tail. No extra draws.

const TAU = Math.PI * 2;
// Hero sensing (tiles) and the glare: most head turn (rad), the horn drop (rad) and its rate (1/s).
export const RANGE = 6, GLARE_TURN = .7, GLARE_DROP = .14, GLARE_RATE = 4;
// The breath: hump heave (scale) and rate (Hz), deeper near the hero.
export const HEAVE = .022, HEAVE_HZ = .38, HEAVE_NEAR = 1.6;
// The snort: gap and length (s), toss up (head x, negative is up), hook down and across (rad).
export const SNORT_MIN = 5, SNORT_SPAN = 5, SNORT_NEAR = .5, SNORT_LEN = 1.1, TOSS = -.42, HOOK = .22, HOOK_SIDE = .26;
// Pawing the floor: gap (s) while standing near, the scrapes, each scrape's length (s), the leg
// forward reach and back drag (rad) and the body rock (rad).
export const PAW_MIN = 3, PAW_SPAN = 4, PAW_SCRAPES = [2, 3], SCRAPE_LEN = .55, PAW_REACH = -.45, PAW_DRAG = .5, PAW_ROCK = .05;
// The gore (on top of actions.js's butt): head ducks lower, then hooks up and across; the body rears.
export const GORE = {duck: .3, toss: -.9, twist: .35, rear: -.16, dig: .45};
export const REST_RATE = 3;
const SNAP = 1e-3;

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clamp01 = v => clamp(v, 0, 1);
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const approach = (v, to, rate, dt) => to + (v - to) * Math.exp(-rate * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export const isMinotaur = a => !!(a && !a.asset && a.kind === 'minotaur' && a.g && a.body && a.head && a.legs?.length === 2);

function rand(st) { st.seed = (st.seed * 16807) % 2147483647; return (st.seed - 1) / 2147483646; }

// The snort over its progress v: toss and hook weights. The toss peaks early, the hook follows.
export function snortCurve(v) {
  if (!(v > 0) || !(v < 1)) return {toss: 0, hook: 0};
  const up = smooth(v / .22), down = smooth((v - .22) / .16), back = 1 - smooth((v - .45) / .55);
  return {toss: up * (1 - down), hook: down * back};
}

// One scrape over its progress v: the hoof reaches forward, then drags back hard, then settles.
// Returns the leg angle weight: negative is the forward reach, positive the drag.
export function scrapeCurve(v) {
  if (!(v > 0) || !(v < 1)) return 0;
  const reach = smooth(v / .3), drag = smooth((v - .3) / .25), settle = 1 - smooth((v - .6) / .4);
  return (PAW_REACH * reach * (1 - drag) + PAW_DRAG * drag * settle) / PAW_DRAG;
}

// The gore over the butt's action progress u: the duck while it charges, the hook after impact.
export function goreCurve(u) {
  if (!(u > 0) || !(u < 1)) return {duck: 0, hook: 0, dig: 0};
  const duck = smooth(u / .3) * (1 - smooth((u - .45) / .1));
  const hook = smooth((u - .47) / .12) * (1 - smooth((u - .7) / .3));
  const dig = smooth((u - .2) / .15) * (1 - smooth((u - .5) / .2));
  return {duck, hook, dig};
}

function setup(a) {
  const seed = ((a.g.id ?? 1) * 48271) % 2147483647 || 1;
  const st = {seed, life: 1, T: 0, off: new Map(), look: 0, drop: 0, snort: null, snortWait: 0,
    paw: null, pawWait: 0, shake: 0, lastHit: null};
  st.snortWait = SNORT_MIN + SNORT_SPAN * rand(st);
  st.pawWait = PAW_MIN + PAW_SPAN * rand(st);
  st.bp = rand(st) * TAU; st.deep = 1;
  return st;
}

// An offset on obj[prop][axis] taken back next frame, unless someone has rewritten it since (live.js
// rewrites the legs' swing every frame). The match has a tolerance for the actions.js round trip.
function offset(st, obj, prop, axis, v) {
  const key = obj.uuid + prop + axis, o = st.off.get(key);
  if (o && Math.abs(obj[prop][axis] - o.out) < 1e-9) obj[prop][axis] -= o.v;
  obj[prop][axis] += v;
  st.off.set(key, {v, out: obj[prop][axis]});
}

function sense(a, look) {
  const g = a.g;
  if (!look || !Number.isFinite(look.x) || !Number.isFinite(look.z)) return null;
  const dx = look.x - g.position.x, dz = look.z - g.position.z, d = Math.hypot(dx, dz);
  return {b: d > 1e-3 ? wrap(Math.atan2(dx, dz) - g.rotation.y) : 0, d};
}

// Call once a frame (fidget.js does). `busy` is true while it moves or acts; `look` is the hero's
// position (same parent as actor.g). Returns the state, or null for anything else.
export function updateMinotaurCharge(a, dt, t, busy, look = null) {
  if (!isMinotaur(a)) return null;
  const st = a.minotaurCharge || (a.minotaurCharge = setup(a));
  dt = a.stone ? 0 : Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
  st.T += dt;
  const q = a.actions, cur = q?.current, dead = !!q?.dead;
  st.life = dead ? approach(st.life, 0, REST_RATE, dt) : 1;
  if (st.life < SNAP) st.life = 0;
  const live = !dead && !a.stone;

  // The glare: head round to the hero and the horns dropped.
  const h = sense(a, look), close = !!(h && h.d <= RANGE), near = close && live;
  st.look = approach(st.look, near ? clamp(h.b, -GLARE_TURN, GLARE_TURN) : 0, near ? GLARE_RATE : REST_RATE, dt);
  st.drop = approach(st.drop, near ? GLARE_DROP : 0, near ? GLARE_RATE : REST_RATE, dt);

  // A blow: a hard head shake and a snort.
  if (!dead && cur?.kind === 'hit' && cur !== st.lastHit) {
    st.lastHit = cur;
    st.shake = 1;
    st.snort = {v: .15, dir: rand(st) < .5 ? -1 : 1};
  }
  st.shake = st.shake > SNAP ? st.shake * Math.exp(-4 * dt) : 0;

  // The snort, now and then; sooner near the hero.
  if (live && !st.snort) {
    st.snortWait -= dt * (near ? 1 / SNORT_NEAR : 1);
    if (st.snortWait <= 0) { st.snort = {v: 0, dir: rand(st) < .5 ? -1 : 1}; st.snortWait = SNORT_MIN + SNORT_SPAN * rand(st); }
  }
  let sn = {toss: 0, hook: 0};
  if (st.snort) {
    st.snort.v += dt / SNORT_LEN;
    sn = snortCurve(st.snort.v);
    if (st.snort.v >= 1) st.snort = null;
  }

  // Pawing: only standing still with the hero near; anything else cuts it off.
  if (near && !busy) {
    if (!st.paw) {
      st.pawWait -= dt;
      if (st.pawWait <= 0) {
        st.paw = {v: 0, n: PAW_SCRAPES[0] + Math.floor(rand(st) * (PAW_SCRAPES[1] - PAW_SCRAPES[0] + 1)), leg: rand(st) < .5 ? 0 : 1};
        st.pawWait = PAW_MIN + PAW_SPAN * rand(st);
      }
    }
  } else if (!a.stone) st.paw = null;
  let scrape = 0, pawLeg = 0;
  if (st.paw) {
    st.paw.v += dt / SCRAPE_LEN;
    scrape = scrapeCurve(st.paw.v % 1);
    pawLeg = st.paw.leg;
    if (st.paw.v >= st.paw.n) st.paw = null;
  }
  st.scrape = scrape;

  // The gore, on top of actions.js's butt charge.
  const atk = !dead && cur?.kind === 'attack' && cur.attack === 'butt' && (q.age ?? 0) >= (cur.wait ?? 0) ? cur : null;
  const gr = atk ? goreCurve(q.u ?? 0) : {duck: 0, hook: 0, dig: 0};
  const gs = atk ? (atk.dir?.[0] ?? 0) >= 0 ? 1 : -1 : 1;

  const w = st.life, sd = st.snort?.dir ?? 1;
  // the breath deepens and quickens smoothly as the hero comes near (its phase is accumulated, so no jump)
  st.deep = approach(st.deep, close ? HEAVE_NEAR : 1, 1.5, dt);
  st.bp = (st.bp + dt * HEAVE_HZ * st.deep * TAU) % TAU;
  const deep = st.deep, breath = Math.sin(st.bp);
  const shake = st.shake * Math.sin(st.T * 9 * TAU);
  // the hump heaves; the snort jolts the shoulders; a scrape rocks the body; the gore rears it back
  offset(st, a.body, 'scale', 'y', HEAVE * deep * breath * w);
  offset(st, a.body, 'scale', 'z', HEAVE * .6 * deep * breath * w);
  offset(st, a.body, 'rotation', 'x', (.06 * sn.hook + PAW_ROCK * scrape + GORE.rear * gr.hook + .08 * gr.duck) * w);
  offset(st, a.body, 'rotation', 'z', (.04 * sn.hook * sd + .03 * shake) * w);
  // the head: glare, toss and hook, duck and gore, shake
  offset(st, a.head, 'rotation', 'x', (st.drop + TOSS * sn.toss + HOOK * sn.hook + GORE.duck * gr.duck + GORE.toss * gr.hook) * w);
  offset(st, a.head, 'rotation', 'y', (st.look * (1 - gr.duck - gr.hook * .5) + .1 * shake) * w);
  offset(st, a.head, 'rotation', 'z', (HOOK_SIDE * sn.hook * sd + GORE.twist * gr.hook * gs + .22 * shake) * w);
  // the legs: the pawing hoof, and the back hoof dug in for the charge
  offset(st, a.legs[pawLeg], 'rotation', 'x', PAW_DRAG * scrape * w);
  offset(st, a.legs[1 - pawLeg], 'rotation', 'x', GORE.dig * gr.dig * w);
  // the tail lashes with a snort
  if (a.tail) offset(st, a.tail, 'rotation', 'z', (.5 * sn.hook * sd + .3 * shake) * w);
  return st;
}
