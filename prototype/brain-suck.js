// A mind flayer's (or Cthulhu's) brain-eating attack (AT_TENT, AD_DRIN). Four tentacles lash out of the
// flayer's mouth, reach the hero's face and wrap round the head. What happens next comes from
// the message that follows "<flayer>'s tentacles suck you!" (mhitu.c):
//  - "Your brain is eaten!": the coils clamp and throb, gulps run down each tentacle back to the
//    mouth, the hero's head jerks, and then they let go and draw back;
//  - "Your <helmet> blocks the attack to your head.": the tips strike the helmet with a burst
//    of sparks and recoil;
//  - "<flayer> grabs you, but cannot hold onto your greased <helmet>!": the coils close, then
//    slide up off the slick helmet, flinging glistening drops, and recoil;
//  - "You don't seem harmed." (no head, or a weapon that defends): they wrap and let go;
//  - a missed tentacle combat event: they lash short of the face and whip back.
// The flayer's tile comes from the tentacle combat event (attacker of a tentacle on the hero).
// A master mind flayer can attack several times a turn; attacks queue and play in turn.
//
// suckMessage() and suckShape() are pure, so they can be tested without a renderer;
// createBrainSuck() tracks attacks and draws them with one instanced bead mesh and a point cloud.

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = k => { k = clamp01(k); return k * k * (3 - 2 * k); };
const TAU = Math.PI * 2;

// Heights (tiles): the flayer's mouth and the middle of the hero's head; the head's wrap radius.
export const MOUTH_Y = 1.07, MOUTH_FORWARD = .15, HEAD_Y = 1.31, HEAD_R = .15;
export const TENTACLES = 4, BEADS = 18, MAX_PARTICLES = 28, MAX_QUEUE = 5;
// Timings (ms) per outcome: when the coil is fully closed, and when it's all over.
export const REACH_MS = 300;
export const DURATION = {eaten: 1900, harmless: 1300, helmet: 900, grease: 1250, miss: 650};

const nameOf = s => s ? s.replace(/^(?:The|the|An?|an?|Your|your)\s+/, '') : null;

// What a message line means for the attack: {phase:'suck', name} for the hit, {outcome} for how
// it ended, {greaseOff:true} when the grease wears off, or null.
export function suckMessage(text) {
  if (typeof text !== 'string') return null;
  let m = text.match(/^(.+?)(?:'s?|’s?) tentacles suck you!$/);
  if (m) return {phase: 'suck', name: nameOf(m[1])};
  if (/^Your brain is eaten!$/.test(text)) return {outcome: 'eaten'};
  if (/^Your .+ blocks the attack to your head\.$/.test(text)) return {outcome: 'helmet'};
  if (/ grabs you, but cannot hold onto your (?:greased|slippery) /.test(text)) return {outcome: 'grease'};
  if (/^You don't seem harmed\.$/.test(text)) return {outcome: 'harmless'};
  if (/^The grease wears off\.$/.test(text)) return {greaseOff: true};
  return null;
}

// Skin for the tentacles: the flayer's own mauve, paler for a master.
export function suckTint(name) {
  return suckStyle(name).tint;
}

// Whose tentacles they are. A mind flayer's come from its mouth at MOUTH_Y. Cthulhu (also
// AT_TENT AD_DRIN) is half again a man's height, so its beard tentacles reach down from a maw
// at about 1.52 and .44 forward of its tile, half again as thick, in its green hide with the
// pale suckers of its model (cthulhu.js) on every third bead.
const STYLE = {flayer: {tint: 0xa07aa8, sucker: null, mouthY: MOUTH_Y, mouthForward: MOUTH_FORWARD, girth: 1},
  master: {tint: 0xb088c0, sucker: null, mouthY: MOUTH_Y, mouthForward: MOUTH_FORWARD, girth: 1},
  cthulhu: {tint: 0x3a6036, sucker: 0xcfcaa0, mouthY: 1.52, mouthForward: .44, girth: 1.5}};
export function suckStyle(name) {
  if (typeof name !== 'string') return STYLE.flayer;
  if (/^cthulhu$/i.test(name.trim())) return STYLE.cthulhu;
  return /master/i.test(name) ? STYLE.master : STYLE.flayer;
}

// Per-tentacle wrap: height offset on the head, which way round, and how far.
const WRAP = [[.05, 1, 1.5], [-.03, -1, 1.35], [.015, -1, 1.6], [-.07, 1, 1.25]];
const SPREAD = [-.55, .5, -.18, .2];

// The pose of attack `a` ({hero:{x,z}, flayer:{x,z}|null, outcome}) at ms t since it started:
// {beads:[{x,y,z,r,heat}], particles:[{x,y,z,alpha,kind}], shake, done}. Positions in tiles.
export function suckShape(a, t) {
  const outcome = a.outcome ?? 'harmless', dur = DURATION[outcome] ?? DURATION.harmless;
  if (t < 0 || t >= dur) return null;
  const hx = a.hero.x, hz = a.hero.z;
  // Toward the flayer; with no tile known the tentacles come from in front (+z).
  let dx = a.flayer ? a.flayer.x - hx : 0, dz = a.flayer ? a.flayer.z - hz : 1;
  const dl = Math.hypot(dx, dz) || 1;dx /= dl;dz /= dl;
  const fx = hx + dx * dl, fz = hz + dz * dl;
  const fwd = a.mouthForward ?? MOUTH_FORWARD, girth = a.girth ?? 1;
  const S = {x: fx - dx * fwd, y: a.mouthY ?? MOUTH_Y, z: fz - dz * fwd};
  const face = Math.atan2(dz, dx);
  // Reach (e), how much of each tentacle is wrapped round the head (k), the coil's slide up
  // and loosening (slide), recoil wiggle, and the gulps (pulse).
  const reachEnd = REACH_MS, close = reachEnd + 300;
  let e = smooth(t / reachEnd), k = 0, slide = 0, wiggle = 0, pulse = -1, shake = 0;
  const particles = [];
  if (outcome === 'miss') {
    // Lash to just short of the face and whip back.
    e = t < reachEnd ? smooth(t / reachEnd) * .8 : .8 * (1 - smooth((t - reachEnd) / (dur - reachEnd)));
    wiggle = t > reachEnd ? Math.sin((t - reachEnd) * .04) * (1 - (t - reachEnd) / (dur - reachEnd)) : 0;
  } else if (outcome === 'helmet') {
    const hit = reachEnd + 120;
    k = .18 * smooth((t - reachEnd) / 120);
    if (t > hit) { const u = (t - hit) / (dur - hit);e = 1 - smooth(u);k *= 1 - u;wiggle = Math.sin((t - hit) * .05) * (1 - u); }
    // Sparks where the tips strike the helmet.
    if (t > hit - 20 && t < hit + 380) {
      const u = (t - hit + 20) / 400;
      for (let i = 0; i < 12; i++) {
        const ang = face + (i / 12 - .5) * 2.2, up = .4 + (i * .37) % .6, sp = .5 + (i * .61) % .5;
        particles.push({x: hx + Math.cos(face) * HEAD_R * .9 + Math.cos(ang) * sp * u * .35, y: HEAD_Y + .06 + up * u * .25 - u * u * .35,
          z: hz + Math.sin(face) * HEAD_R * .9 + Math.sin(ang) * sp * u * .35, alpha: (1 - u) ** 1.5, kind: 'spark'});
      }
    }
  } else if (outcome === 'grease') {
    k = .5 * smooth((t - reachEnd) / 300);
    const slip = close + 60;
    if (t > slip) {
      const u = (t - slip) / (dur - slip);slide = smooth(u / .45);
      e = 1 - smooth((u - .35) / .65);k *= 1 - smooth((u - .3) / .5);wiggle = Math.sin((t - slip) * .03) * u;
      // Drops flung off the slick helmet as the coils slide away.
      if (u < .8) for (let i = 0; i < 10; i++) {
        const ang = face + i * 2.4, v = u / .8, out = .05 + v * (.16 + (i % 3) * .05);
        particles.push({x: hx + Math.cos(ang) * (HEAD_R + out), y: HEAD_Y + .12 + v * .1 - v * v * .5, z: hz + Math.sin(ang) * (HEAD_R + out),
          alpha: (1 - v) * .9, kind: 'grease'});
      }
    }
  } else {
    // Eaten or harmless: close, clamp (and gulp), let go.
    const letGo = dur - 420;
    k = .55 * smooth((t - reachEnd) / 300);
    if (t > letGo) { const u = (t - letGo) / 420;k *= 1 - smooth(u / .6);e = 1 - smooth((u - .3) / .7); }
    if (outcome === 'eaten' && t > close && t < letGo) {
      pulse = ((t - close) / 380) % 1;
      shake = Math.sin((t - close) * .045) * Math.min(1, (t - close) / 200) * Math.min(1, (letGo - t) / 200);
    }
  }
  const beads = [];
  const H = {x: hx, y: HEAD_Y + slide * .28, z: hz}, R = HEAD_R * (1 + slide * .7);
  for (let i = 0; i < TENTACLES; i++) {
    const [dy, dir, span] = WRAP[i], a0 = face + SPREAD[i];
    const E = {x: H.x + Math.cos(a0) * R, y: H.y + dy, z: H.z + Math.sin(a0) * R};
    // Bow up and out to the side between the mouth and the face; recoil whips it sideways.
    const side = (i % 2 ? 1 : -1) * (.08 + .05 * i) + wiggle * .12 * (i % 2 ? -1 : 1);
    const C = {x: (S.x + E.x) / 2 - dz * side, y: Math.max(S.y, E.y) + .12, z: (S.z + E.z) / 2 + dx * side};
    for (let j = 0; j < BEADS; j++) {
      const u = j / (BEADS - 1) * e, split = 1 - k;
      let x, y, z;
      if (u <= split || k <= 0) {
        const s = split > 0 ? Math.min(1, u / split) : 1, w = 1 - s;
        x = w * w * S.x + 2 * w * s * C.x + s * s * E.x;y = w * w * S.y + 2 * w * s * C.y + s * s * E.y;z = w * w * S.z + 2 * w * s * C.z + s * s * E.z;
      } else {
        const v = (u - split) / k, phi = a0 + dir * span * Math.PI * v;
        x = H.x + Math.cos(phi) * R;y = H.y + dy + v * .03 * dir;z = H.z + Math.sin(phi) * R;
      }
      const taper = (.028 - .016 * (j / (BEADS - 1))) * girth;
      // A gulp: a swelling that runs from the head back to the mouth.
      const gulp = pulse >= 0 ? Math.exp(-((((j / (BEADS - 1)) - (1 - pulse)) / .1) ** 2)) : 0;
      beads.push({x, y, z, r: taper * (1 + .7 * gulp), heat: gulp});
    }
  }
  return {beads, particles, shake, done: false};
}

const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));

// Tracks and draws attacks. message(text, frame) feeds message lines; combat(action) takes
// combatAction() output; update(dt, origin) positions everything and returns {active, shake}.
export function createBrainSuck(THREE, parent) {
  const beadGeo = new THREE.SphereGeometry(1, 10, 8);
  const beadMat = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .35, metalness: .05});
  const max = TENTACLES * BEADS;
  const beads = new THREE.InstancedMesh(beadGeo, beadMat, max);
  beads.count = 0;beads.frustumCulled = false;beads.userData.part = 'brain-suck';
  parent.add(beads);
  const pPos = new Float32Array(MAX_PARTICLES * 3), pCol = new Float32Array(MAX_PARTICLES * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  pGeo.setDrawRange(0, 0);
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({size: .035, vertexColors: true, transparent: true,
    depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending}));
  points.frustumCulled = false;points.renderOrder = 3;points.userData.part = 'brain-suck-sparks';
  parent.add(points);

  let queue = [], current = null, hero = null, lastFlayer = null, now = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const tint = new THREE.Color(), sucker = new THREE.Color(), col = new THREE.Color(), hot = new THREE.Color(0x8a1030);
  const SPARK = new THREE.Color(0xfff2c8), GREASE = new THREE.Color(0xd8c070);

  const pending = () => queue.at(-1) ?? null;
  function start(name, outcome) {
    if (!hero) return null;
    const flayer = lastFlayer && cheb(lastFlayer, hero) <= 1 ? {...lastFlayer} : null;
    const st = suckStyle(name);
    const a = {hero: {...hero}, flayer, outcome, name, tint: st.tint, sucker: st.sucker, mouthY: st.mouthY,
      mouthForward: st.mouthForward, girth: st.girth, queuedAt: now};
    if (queue.length < MAX_QUEUE) queue.push(a);
    return a;
  }
  function message(text, frame) {
    if (frame?.player) hero = {x: frame.player.x, z: frame.player.z};
    const m = suckMessage(text);
    if (!m) return null;
    if (m.phase === 'suck') start(m.name, null);
    else if (m.outcome) { const a = pending();if (a && !a.outcome) a.outcome = m.outcome; }
    return m;
  }
  function combat(a) {
    if (!a?.heroDefends || a.attack !== 'tentacle') return;
    if (Number.isFinite(a.defender?.x) && Number.isFinite(a.defender?.z)) hero = {x: a.defender.x, z: a.defender.z};
    if (Number.isFinite(a.attacker?.x) && Number.isFinite(a.attacker?.z)) {
      lastFlayer = {x: a.attacker.x, z: a.attacker.z};
      for (const x of queue) if (!x.flayer) x.flayer = {...lastFlayer};
    }
    if (a.result === 'miss') start(a.attacker?.name ?? null, 'miss');
  }

  function update(dt, origin) {
    now += (dt || 0) * 1000;
    if (current && now - current.startAt >= (DURATION[current.outcome] ?? DURATION.harmless)) current = null;
    // An attack whose outcome never came (a message we didn't match) plays as a plain wrap.
    if (!current && queue.length) { current = queue.shift();current.outcome ??= 'harmless';current.startAt = now; }
    const sh = current ? suckShape(current, now - current.startAt) : null;
    const ox = -(origin?.x ?? 0), oz = -(origin?.z ?? 0);
    let n = 0, b = 0;
    if (sh) {
      tint.setHex(current.tint);
      if (current.sucker != null) sucker.setHex(current.sucker);
      for (const bd of sh.beads) {
        if (n >= max) break;
        beads.setMatrixAt(n, m4.compose(p.set(ox + bd.x, bd.y, oz + bd.z), q, s.setScalar(bd.r)));
        // Suckers: a paler bead every third, flushed dark red where a gulp passes.
        if (n % 3 === 0 && current.sucker != null) col.copy(sucker);
        else col.copy(tint).multiplyScalar(n % 3 === 0 ? 1.2 : .9);
        beads.setColorAt(n, col.lerp(hot, bd.heat * .7));
        n++;
      }
      for (const pt of sh.particles) {
        if (b >= MAX_PARTICLES) break;
        const c = pt.kind === 'spark' ? SPARK : GREASE;
        pPos.set([ox + pt.x, pt.y, oz + pt.z], b * 3);pCol.set([c.r * pt.alpha, c.g * pt.alpha, c.b * pt.alpha], b * 3);b++;
      }
    }
    beads.count = n;beads.instanceMatrix.needsUpdate = true;
    if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
    pGeo.setDrawRange(0, b);pGeo.attributes.position.needsUpdate = true;pGeo.attributes.color.needsUpdate = true;
    return {active: !!sh, beads: n, particles: b, shake: sh?.shake ?? 0, outcome: current?.outcome ?? null};
  }
  const clear = () => { queue = [];current = null;lastFlayer = null;update(0); };
  const dispose = () => { parent.remove(beads);parent.remove(points);beadGeo.dispose();beadMat.dispose();pGeo.dispose();points.material.dispose(); };
  return {message, combat, update, clear, dispose, get queue() { return queue; }, get current() { return current; }};
}

// The hero's head jerks while its brain is eaten; offsets only, taken back next call.
export function poseBrainSuck(hero, shake) {
  const head = hero?.head;
  if (!head) return;
  const prev = head.userData.brainShake ?? 0;
  head.rotation.z += (shake * .22) - prev * .22;
  head.rotation.x += (Math.abs(shake) * -.12) - Math.abs(prev) * -.12;
  head.userData.brainShake = shake;
}
