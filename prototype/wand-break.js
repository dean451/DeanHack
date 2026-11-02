// Breaking a wand (apply, then the wand: "Raising the wand high above your head, you break it in two!"). The
// hero lifts it over the head in both hands, strains while it bows, and it snaps: a white crack of light at
// the break, sparks, the two halves thrown apart to clatter on the floor, and the arms jerking down. Only then
// does what was inside get out: the engine's explosion (fire, frost, magic, already drawn by explosions.js from
// the fx stream) is held back until the snap, so the boom comes from the break and not before it. After that:
// - "But nothing else happens..." (an empty or harmless wand): a sad grey puff and the halves just drop;
// - "A wall of force smashes down around you!" (striking): a ring of pale force slams down round the hero.
// apply.c do_break_wand() prints all of these. Nothing here says which wand it was; the explosion's own look
// does, as the game shows it.
//
// The arm offsets are swing.js offsets on the hero rig, taken back off every frame before the new ones go on,
// so they layer on whatever actions.js posed; they are exactly at rest at both ends. Particles and a few small
// meshes, no lights; everything is disposed.
import * as THREE from 'three';
import {applySwing} from './swing.js';

export const breakMessage = text => /^Raising .+ high above your .+, you (?:break|snap) it in two!/.test(String(text ?? '').trim());
export const fizzleMessage = text => /^(?:But nothing else happens|Suddenly, and without warning, nothing happens|You really wish you hadn't done that)/.test(String(text ?? '').trim());
export const forceMessage = text => /^A wall of force smashes down around you!/.test(String(text ?? '').trim());

// the beats (seconds): raise, strain, snap, recoil and settle
export const SNAP_AT = .62, BREAK_TIME = 1.3, HALVES_LIFE = 2.6, FIZZLE_LIFE = 1.6, FORCE_LIFE = 1.1;
export const SNAP_MS = Math.round(SNAP_AT * 1000);
const SWING = ['arm', 'armZ', 'elbow', 'wrist', 'socket', 'shield', 'twist', 'lean', 'offArm', 'offElbow'];
const REST = Object.fromEntries(SWING.map(f => [f, 0]));
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
// both hands overhead, gripping the wand between them, the body leaning back a little
const RAISED = {arm: -2.9, armZ: -.35, elbow: .35, wrist: .3, socket: -.2, shield: -.4, twist: 0, lean: -.1, offArm: -2.8, offElbow: .35};
// the snap throws the hands apart and down
const SNAPPED = {arm: -2.2, armZ: .25, elbow: .1, wrist: -.2, socket: .1, shield: .2, twist: 0, lean: .06, offArm: -2.1, offElbow: .1};

// Arm offsets at time t (seconds since the message): rest at 0 and at BREAK_TIME.
export function breakPose(t) {
  const p = {...REST};
  if (!(t > 0) || t >= BREAK_TIME) return p;
  const up = smooth(t / .4), snap = smooth((t - SNAP_AT) / .1), down = smooth((t - SNAP_AT - .15) / (BREAK_TIME - SNAP_AT - .15));
  for (const f of SWING) p[f] = (RAISED[f] + (SNAPPED[f] - RAISED[f]) * snap) * up * (1 - down);
  // the strain: a fast tremble while the wand bows, growing towards the snap
  if (t > .4 && t < SNAP_AT) { const k = (t - .4) / (SNAP_AT - .4), q = Math.sin(t * 90) * .05 * k;p.arm += q;p.offArm -= q;p.lean += q * .3; }
  return p;
}
// How far the wand bows before it goes (0..1), and whether it is in two yet.
export const bowAt = t => t < .4 ? 0 : t < SNAP_AT ? smooth((t - .4) / (SNAP_AT - .4)) : 1;

export function createWandBreak(THREE_, parent, {rnd = Math.random} = {}) {
  let fx = null, applied = null;
  const v = new THREE.Vector3(), wood = new THREE.MeshStandardMaterial({color: '#6b4a2e', roughness: .7}), tip = new THREE.MeshStandardMaterial({color: '#cfc6a8', roughness: .4, metalness: .3, emissive: '#3a3020'});
  const glowTex = (() => { if (typeof document === 'undefined') return null;const c = document.createElement('canvas');c.width = c.height = 64;const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);r.addColorStop(0, 'rgba(255,255,255,1)');r.addColorStop(.35, 'rgba(255,250,230,.6)');r.addColorStop(1, 'rgba(255,240,200,0)');g.fillStyle = r;g.fillRect(0, 0, 64, 64);return new THREE.CanvasTexture(c); })();
  const half = sign => { const g = new THREE.Group(), stick = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .2, 6), wood);stick.position.x = sign * .1;stick.rotation.z = Math.PI / 2;g.add(stick);const end = new THREE.Mesh(new THREE.SphereGeometry(.016, 6, 4), tip);end.position.x = sign * .2;g.add(end);return g; };
  function untrack(actor) { if (applied && actor) { const s = {};for (const f of SWING) s[f] = -applied[f];applySwing(actor, s); }applied = null; }
  function dispose() {
    if (!fx) return;
    parent.remove(fx.root);
    fx.root.traverse(o => { o.geometry?.dispose();if (o.material && o.material !== wood && o.material !== tip) o.material.dispose(); });
    fx = null;
  }
  return {
    get active() { return !!fx; },
    // ms until the snap, for holding the explosion back (0 when no break is coming)
    holdMs() { return fx && fx.t < SNAP_AT ? Math.round((SNAP_AT - fx.t) * 1000) : 0; },
    get age() { return fx ? fx.t : null; },
    // text: each engine message; hero: the live hero (g, head, arm...). True when it started or changed a break.
    message(text, hero) {
      if (breakMessage(text)) {
        if (!hero?.g) return false;
        dispose();
        const root = new THREE.Group();root.name = 'wandBreak';parent.add(root);
        const wand = new THREE.Group(), left = half(-1), right = half(1);wand.add(left, right);root.add(wand);
        const flash = new THREE.Sprite(new THREE.SpriteMaterial({map: glowTex, color: '#fff6dc', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0}));flash.scale.setScalar(.01);root.add(flash);
        const n = 24, sp = new Float32Array(n * 3), vel = [];for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, e = rnd() * .9 - .2;vel.push(Math.cos(a) * Math.cos(e) * 2.2, Math.sin(e) * 2.2 + .6, Math.sin(a) * Math.cos(e) * 2.2); }
        const sparkGeo = new THREE.BufferGeometry();sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
        const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({color: '#fff1c4', size: .05, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0}));sparks.visible = false;sparks.frustumCulled = false;root.add(sparks);
        hero.g.updateMatrixWorld(true);const head = hero.head ?? hero.parts?.head ?? hero.g;head.getWorldPosition(v);v.y += .34; // between the raised fistsparent.worldToLocal(v);
        const floor = new THREE.Vector3();hero.g.getWorldPosition(floor);parent.worldToLocal(floor);
        fx = {root, wand, left, right, flash, sparks, vel, t: 0, at: v.clone(), floor: floor.y + .02, yaw: hero.g.rotation.y, hv: [null, null], fizzle: null, force: null, hero};
        wand.position.copy(fx.at);wand.rotation.y = fx.yaw;
        return true;
      }
      if (!fx) return false;
      if (fizzleMessage(text) && !fx.fizzle) {
        const puff = new THREE.Sprite(new THREE.SpriteMaterial({map: glowTex, color: '#8a8a86', transparent: true, depthWrite: false, opacity: 0}));puff.scale.setScalar(.01);puff.position.copy(fx.at);fx.root.add(puff);
        fx.fizzle = {puff, t: 0};return true;
      }
      if (forceMessage(text) && !fx.force) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 1.6, 28, 1, true), new THREE.MeshBasicMaterial({color: '#cfe0ff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending}));
        ring.position.set(fx.at.x, fx.floor + 3, fx.at.z);fx.root.add(ring);fx.force = {ring, t: 0};return true;
      }
      return false;
    },
    update(dt, hero = null) {
      untrack(hero);
      if (!fx) return;
      const d = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);fx.t += d;const t = fx.t;
      const busy = !!hero?.actions?.dead;
      if (hero?.arm && !busy && t < BREAK_TIME) { applied = breakPose(t);applySwing(hero, applied); }
      // the wand: held overhead, bowing, then two halves flying apart and falling
      const bow = bowAt(t);
      if (t < SNAP_AT) { fx.left.rotation.z = -.35 * bow;fx.right.rotation.z = .35 * bow; }
      else {
        for (const [i, h] of [[0, fx.left], [1, fx.right]]) {
          if (!fx.hv[i]) fx.hv[i] = {vx: (i ? 1 : -1) * (.9 + rnd() * .4), vy: 1.1 + rnd() * .5, spin: (i ? 1 : -1) * (6 + rnd() * 4)};
          const s = fx.hv[i];
          if (h.userData.landed) continue;
          s.vy -= 6 * d;h.position.x += s.vx * d;h.position.y += s.vy * d;h.rotation.z += s.spin * d;
          if (fx.wand.position.y + h.position.y <= fx.floor) { h.position.y = fx.floor - fx.wand.position.y;h.rotation.z = Math.round(h.rotation.z / Math.PI) * Math.PI;h.userData.landed = true; }
        }
        // the crack of light and the sparks at the break
        const k = (t - SNAP_AT) / .35;
        fx.flash.position.copy(fx.at);fx.flash.material.opacity = k < 1 ? (1 - k) * (k < .1 ? k / .1 : 1) : 0;fx.flash.scale.setScalar(.2 + .9 * smooth(k));
        const p = fx.sparks.geometry.attributes.position;fx.sparks.visible = k < 1.6;
        for (let i = 0; i < p.count; i++) { const e = t - SNAP_AT;p.setXYZ(i, fx.at.x + fx.vel[i * 3] * e, fx.at.y + fx.vel[i * 3 + 1] * e - 3 * e * e, fx.at.z + fx.vel[i * 3 + 2] * e); }
        p.needsUpdate = true;fx.sparks.material.opacity = Math.max(0, 1 - k / 1.6);
      }
      // the halves fade once they have lain a while
      if (t > HALVES_LIFE - .5) { const a = clamp01((HALVES_LIFE - t) / .5);for (const m of [wood, tip]) { m.transparent = true;m.opacity = a; } }
      if (fx.fizzle) {
        const f = fx.fizzle;if (t >= SNAP_AT) f.t += d;const u = f.t / FIZZLE_LIFE;
        f.puff.position.y = fx.at.y + .25 * u;f.puff.scale.setScalar(.15 + .5 * smooth(u));f.puff.material.opacity = f.t > 0 ? .55 * (1 - smooth(u)) : 0;
      }
      if (fx.force) {
        const f = fx.force;if (t >= SNAP_AT) f.t += d;const u = f.t / FORCE_LIFE, fall = smooth(u / .25);
        f.ring.position.y = fx.floor + .8 + (1 - fall) * 2.2;f.ring.material.opacity = f.t > 0 ? .45 * (u < .25 ? fall : 1 - smooth((u - .25) / .75)) : 0;f.ring.scale.set(1 + .15 * smooth((u - .25) / .75), 1, 1 + .15 * smooth((u - .25) / .75));
      }
      if (t >= HALVES_LIFE) { for (const m of [wood, tip]) { m.transparent = false;m.opacity = 1; }dispose(); }
    },
    clear(hero = null) { untrack(hero);for (const m of [wood, tip]) { m.transparent = false;m.opacity = 1; }dispose(); },
  };
}
