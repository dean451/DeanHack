// "From the murky depths, a hand reaches up to bless the sword." Dipping a long sword in a
// fountain can bring the Lady of the Lake. She is no pretty maiden: a drowned, pale-green
// arm comes up out of black water, slowly, with ripples running ahead of it, and holds a
// sword that burns cold. It stops, turns the blade once, deliberately, as if inspecting
// the hero, gives one sharp twitch, and then drags the blade up for the hero to see before
// the arm sinks back and the water closes over it. The sword glow lingers a moment after.
//
// live.js calls add(x, z) at the hero's square when the message arrives, update(dt) every
// frame and clear() on a level change. The Lady only comes to the hero's own fountain (the
// dip is the hero's), so the message always means the square under them. The hero model
// stands on that square and would hide a single arm there, so she rises on the four squares
// around the hero instead (north, south, east, west; one world unit per square), all four
// arms in step. No floor check: an arm next to a wall simply rises out of it. Poses are
// functions of t and return exactly to rest (nothing showing) at the end.

import {softDot, softRing, clamp01, smooth} from './fx-textures.js';
import {buildExcalibur, createExcaliburGlow} from './excalibur.js';

export const LADY = {rise: .45, riseTime: 1.1, turnAt: 1.9, twitchAt: 2.75, sinkAt: 3.2, sinkTime: .9, total: 4.4};
export const ARM_MAX = .85; // how far the wrist clears the water
const GRIP_Z = .036; // the sword's grip runs through her fist in front of the wrist, so the pommel clears it
export const STIR = {at: .05, end: .55}; // the water bulges and shivers before the arm breaks it
// The four squares orthogonally next to the hero's square (x, z), where the arms rise.
export const ladySquares = (x, z) => [[x, z - 1], [x, z + 1], [x + 1, z], [x - 1, z]];
export const isLadyMessage = text => /a hand reaches up to bless the sword/i.test(text || '');
// The other outcome: she curses the blade instead. Same arm, but the sword gutters a bruised
// violet, the blade turns the wrong way and the glow stutters like a failing flame.
export const isLadyCurseMessage = text => /a hand reaches up to curse the sword/i.test(text || '');

// The arm at time t: height out of the water, the blade's turn about its own axis, a sideways
// twitch, the sword's glow (0 to 1) and the ripple progress.
export function ladyPose(t, curse = false) {
  const up = smooth((t - LADY.rise) / LADY.riseTime);
  const down = smooth((t - LADY.sinkAt) / LADY.sinkTime);
  const rise = ARM_MAX * up * (1 - down);
  const turn = Math.PI * 2 * smooth((t - LADY.turnAt) / .7);
  const tw = t - LADY.twitchAt;
  const twitch = tw > 0 && tw < .25 ? Math.sin(tw / .25 * Math.PI * 3) * .22 * (1 - tw / .25) : 0;
  const glowIn = smooth((t - LADY.rise - .5) / .8), glowOut = smooth((t - LADY.sinkAt - .5) / (LADY.total - LADY.sinkAt - .5));
  const sputter = curse ? .55 + .45 * Math.sin(t * 23) * Math.sin(t * 7.3 + 1) : .85 + .15 * Math.sin(t * 9);
  const glow = glowIn * (1 - glowOut) * Math.min(1, Math.max(0, sputter));
  const ripple = clamp01(t / (LADY.sinkAt + LADY.sinkTime));
  // A dark swell under the surface that heaves and shivers, then slides away as the arm breaks through.
  const sk = clamp01((t - STIR.at) / (STIR.end - STIR.at));
  const stir = t <= STIR.at || t >= STIR.end ? 0 : Math.sin(sk * Math.PI) * (.9 + .1 * Math.sin(t * 38));
  return {stir, rise, turn: t >= LADY.turnAt + .7 ? 0 : curse ? 0 - turn : turn, twitch, glow: t >= LADY.total ? 0 : glow, ripple};
}

export function createFountainLady(THREE, parent) {
  const live = [];
  function add(x, z, curse = false) { for (const [sx, sz] of ladySquares(x, z)) addArm(sx, sz, curse); }
  function addArm(x, z, curse) {
    const g = new THREE.Group(); g.name = 'FountainLady'; g.position.set(x, .3, z); parent.add(g);
    // A woman's arm: pale, wet skin, clothed to the forearm in white samite as the legend has it.
    const flesh = new THREE.MeshStandardMaterial({color: 0xc9ab98, roughness: .45, metalness: 0});
    const samite = new THREE.MeshStandardMaterial({color: 0xeef2f0, roughness: .6, side: THREE.DoubleSide});
    const geos = [];
    const mesh = (geo, mat, parentObj = g) => { geos.push(geo); const m = new THREE.Mesh(geo, mat); parentObj.add(m); return m; };
    const arm = new THREE.Group(); g.add(arm);
    // the forearm: slender, swelling a little below the elbow and narrowing to a fine wrist
    const forePts = [[.0, -ARM_MAX], [.03, -ARM_MAX], [.031, -ARM_MAX * .75], [.027, -ARM_MAX * .45], [.02, -.08], [.017, -.02], [.0, 0]].map(([r, y]) => new THREE.Vector2(r, y));
    mesh(new THREE.LatheGeometry(forePts, 14), flesh, arm);
    // the sleeve: white samite clinging wet up to mid-forearm, its cuff flared and trailing
    const sleevePts = [[.036, -ARM_MAX], [.037, -ARM_MAX * .7], [.034, -ARM_MAX * .5], [.046, -ARM_MAX * .42], [.05, -ARM_MAX * .4]].map(([r, y]) => new THREE.Vector2(r, y));
    const sleeve = mesh(new THREE.LatheGeometry(sleevePts, 16), samite, arm); sleeve.rotation.z = .04;
    const hand = new THREE.Group(); arm.add(hand);
    // a slim hand closed round the grip: a narrow palm, four fine fingers wrapped about the leather and the
    // thumb laid over them
    const palm = mesh(new THREE.SphereGeometry(1, 12, 8), flesh, hand); palm.scale.set(.024, .04, .014); palm.position.set(0, .0, .012);
    for (let i = 0; i < 4; i++) { const f = mesh(new THREE.TorusGeometry(.031, .0075 - i * .0007, 6, 12, Math.PI * 1.35), flesh, hand); f.rotation.set(Math.PI / 2, 0, -Math.PI * .2); f.position.set(0, .03 - i * .019, GRIP_Z); }
    const thumb = mesh(new THREE.CapsuleGeometry(.0075, .03, 3, 6), flesh, hand); thumb.position.set(.018, .04, GRIP_Z + .022); thumb.rotation.set(.3, 0, -.9);
    // The sword is Excalibur as the hero wields it (excalibur.js): its broad blade, burning fuller and runes,
    // the gold guard with its sapphires, the wire-wound grip and the ruby pommel, the grip in her hand. Blessed,
    // it sheds the wielded blade's sparks; cursed, its steel and fuller burn a bruised violet instead.
    const blade = new THREE.Group(); blade.position.set(0, -.01, GRIP_Z); hand.add(blade);
    buildExcalibur(blade);
    const meshes = blade.children.filter(c => c.isMesh), steel = meshes.find(m => /steel/.test(m.name)).material, fuller = blade.userData.fuller;
    for (const m of meshes) { geos.push(m.geometry); }
    if (curse) { steel.emissive.set(0x8a2bd0); fuller.color.set(0xd8b0ff); fuller.emissive.set(0x9b3fd8); }
    const sparks = curse ? null : createExcaliburGlow(blade);
    const glowMat = new THREE.SpriteMaterial({map: softDot(THREE), color: curse ? 0x9b3fd8 : 0xfff0c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
    const glow = new THREE.Sprite(glowMat); glow.position.y = .55; glow.scale.setScalar(1.3); blade.add(glow);
    const ringGeo = new THREE.PlaneGeometry(1, 1); ringGeo.rotateX(-Math.PI / 2);
    const rings = [0, .18].map(delay => {
      const mat = new THREE.MeshBasicMaterial({map: softRing(THREE), color: 0xa8d8d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
      const r = new THREE.Mesh(ringGeo, mat); r.position.y = .02; g.add(r); return {r, mat, delay};
    });
    const swellMat = new THREE.MeshBasicMaterial({map: softDot(THREE), color: 0x0c1814, transparent: true, opacity: 0, depthWrite: false});
    const swell = new THREE.Mesh(ringGeo, swellMat); swell.position.y = .015; g.add(swell);
    live.push({curse, swell, swellMat, g, arm, hand, blade, steel, fuller, sparks, glowMat, rings, geos, mats: [flesh, samite, ...meshes.map(m => m.material), glowMat, swellMat, ...rings.map(r => r.mat)], ringGeo, t: 0});
  }
  function step(e, dt) {
    e.t += dt;
    const p = ladyPose(e.t, e.curse);
    e.swell.scale.set(.25 + .5 * p.stir, 1, .25 + .5 * p.stir); e.swellMat.opacity = .75 * p.stir;
    e.arm.visible = p.rise > .01;
    e.arm.position.set(p.twitch, p.rise, 0);
    e.hand.rotation.z = p.twitch * 1.5;
    e.blade.rotation.y = p.turn;
    // (the steel keeps its wielded sheen and brightens with the glow; the fuller burns as the glow comes up)
    if (e.sparks) e.sparks.update(dt, e.t);
    e.steel.emissiveIntensity = .4 + 1.1 * p.glow; e.fuller.emissiveIntensity = 3 * p.glow; e.glowMat.opacity = .8 * p.glow;
    for (const {r, mat, delay} of e.rings) {
      const k = clamp01((p.ripple - delay * .2) * 1.15);
      r.scale.set(.2 + 1.3 * k, 1, .2 + 1.3 * k); mat.opacity = k <= 0 ? 0 : .7 * Math.sin(k * Math.PI) * (e.t < LADY.sinkAt ? 1 : 1 - smooth((e.t - LADY.sinkAt) / LADY.sinkTime));
    }
    return e.t < LADY.total;
  }
  function drop(e) { e.sparks?.dispose(); e.geos.forEach(x => x.dispose()); e.mats.forEach(m => m.dispose()); e.ringGeo.dispose(); parent.remove(e.g); }
  return {
    add,
    message(text, x, z) { if (isLadyCurseMessage(text)) add(x, z, true); },
    update(dt) { for (let i = live.length - 1; i >= 0; i--) if (!step(live[i], dt)) { drop(live[i]); live.splice(i, 1); } },
    clear() { live.forEach(drop); live.length = 0; },
    get active() { return live.length; },
  };
}
