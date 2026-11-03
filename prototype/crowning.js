// Crowning. When a god crowns the hero (pray.c gcrownu(): "The voice of <god> booms out:" and then one of
// "I crown thee...  The Hand of Elbereth!" (lawful), "Thou shalt be my Envoy of Balance!" (neutral) or
// "Thou art chosen to take lives / steal souls for My Glory!" (chaotic)), the moment gets its due once the
// prayer's kneel is over:
// - a column of light in the god's colour drops onto the hero (gold-white, silver-blue, or deep crimson);
// - the hero is lifted off the floor, arms spread and chest up, while motes of light spiral up round them;
// - a ring of light comes down out of the column and settles on the hero's brow, and the title is announced
//   on the level banner ("Crowned by Tyr / The Hand of Elbereth");
// - the hero is set back down, the ring and the column fade.
// About 4.4 s. It keys on the god's own words only. The arm offsets are swing.js offsets, taken back off each
// frame with the head tilt; the lift is written fresh on top of the loop's own bob. No lights; all disposed.
import * as THREE from 'three';
import {applySwing} from './swing.js';

export const CROWN_TIME = 4.4;
export const SIDES = {
  lawful: {color: '#ffe6a0', title: 'The Hand of Elbereth'},
  neutral: {color: '#bfe2ff', title: 'Envoy of Balance'},
  chaotic: {color: '#c8304c', title: null},
};
// The crown line as {side, title}, or null.
export function crownLine(text) {
  const t = String(text ?? '').replace(/^"|"$/g, '').trim();
  if (/^I crown thee\.\.\.\s+The Hand of Elbereth!/.test(t)) return {side: 'lawful', title: SIDES.lawful.title};
  if (/^Thou shalt be my Envoy of Balance!/.test(t)) return {side: 'neutral', title: SIDES.neutral.title};
  const m = /^Thou art chosen to (.+) for My Glory!/.exec(t);
  if (m) return {side: 'chaotic', title: `Chosen to ${m[1]}`};
  return null;
}
// "The voice of Tyr booms out:" names the god for the banner
export const godOf = text => /^The voice of (.+?) (?:booms out|thunders|rings out|booms|rumbles):?/.exec(String(text ?? '').trim())?.[1] ?? null;

const SWING = ['arm', 'armZ', 'elbow', 'wrist', 'socket', 'shield', 'twist', 'lean', 'offArm', 'offElbow'];
const REST = Object.fromEntries(SWING.map(f => [f, 0]));
const SPREAD = {arm: -.55, armZ: .95, elbow: .35, wrist: 0, socket: 0, shield: -.95, twist: 0, lean: -.16, offArm: -.55, offElbow: .35};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };

// The pose at time t: arm offsets, how high the hero floats, how far the head tips up. Rest at both ends.
export function crownPose(t) {
  const up = smooth((t - .4) / 1.1) * (1 - smooth((t - 2.9) / .9));
  const p = {...REST};for (const f of SWING) p[f] = SPREAD[f] * up;
  return {swing: p, lift: .42 * up + .025 * Math.sin(t * 2.2) * up, head: -.3 * up};
}
// the column: drops in, holds, fades (0..1 brightness) and how far down it has come (0 high .. 1 on the floor)
export const columnAt = t => ({glow: smooth(t / .5) * (1 - smooth((t - 3.5) / .9)), drop: smooth(t / .6)});
// the ring: comes down from the column top (1) to the brow (0), bright while it settles, fading at the end
export const ringAt = t => ({down: 1 - smooth((t - 1.2) / 1), glow: smooth((t - 1.2) / .4) * (1 - smooth((t - 3.4) / .8))});
export const TITLE_AT = 2.2;

export function createCrowning(THREE_, parent, {rnd = Math.random, onTitle = null} = {}) {
  let fx = null, applied = null, god = null;
  const v = new THREE.Vector3();
  const shaft = (() => { if (typeof document === 'undefined') return null;const c = document.createElement('canvas');c.width = 64;c.height = 4;const g = c.getContext('2d'), r = g.createLinearGradient(0, 0, 64, 0);r.addColorStop(0, 'rgba(255,255,255,0)');r.addColorStop(.5, 'rgba(255,255,255,1)');r.addColorStop(1, 'rgba(255,255,255,0)');g.fillStyle = r;g.fillRect(0, 0, 64, 4);const t = new THREE.CanvasTexture(c);t.wrapS = THREE.RepeatWrapping;t.repeat.set(6, 1);return t; })();
  function untrack(actor) {
    if (applied && actor) { const s = {};for (const f of SWING) s[f] = -applied.swing[f];applySwing(actor, s);const head = actor.head ?? actor.parts?.head;if (head) head.rotation.x -= applied.head; }
    applied = null;
  }
  function dispose() { if (!fx) return;parent.remove(fx.root);fx.root.traverse(o => { o.geometry?.dispose();o.material?.dispose(); });fx = null; }
  return {
    get active() { return !!fx; },
    get age() { return fx ? fx.t : null; },
    // text: each engine message; wait: seconds to hold before it starts (what is left of the prayer's kneel)
    message(text, wait = 0) {
      const g = godOf(text);if (g) { god = g;return false; }
      const line = crownLine(text);if (!line) return false;
      dispose();
      const col = new THREE.Color(SIDES[line.side].color), root = new THREE.Group();root.name = 'crowning';parent.add(root);
      const add = THREE.AdditiveBlending;
      const column = new THREE.Mesh(new THREE.CylinderGeometry(.5, .62, 6, 24, 1, true), new THREE.MeshBasicMaterial({color: col, map: shaft, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: add}));root.add(column);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 6, 16, 1, true), new THREE.MeshBasicMaterial({color: col.clone().lerp(new THREE.Color(1, 1, 1), .6), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: add}));root.add(core);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.2, .022, 8, 32), new THREE.MeshBasicMaterial({color: col.clone().lerp(new THREE.Color(1, 1, 1), .35), transparent: true, opacity: 0, depthWrite: false, blending: add}));ring.rotation.x = Math.PI / 2;root.add(ring);
      const n = 60, pos = new Float32Array(n * 3), seeds = [];for (let i = 0; i < n; i++) seeds.push({a: rnd() * Math.PI * 2, r: .25 + rnd() * .45, s: .6 + rnd() * .8, d: rnd() * 2});
      const mg = new THREE.BufferGeometry();mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const motes = new THREE.Points(mg, new THREE.PointsMaterial({color: col, size: .05, transparent: true, opacity: 0, depthWrite: false, blending: add}));motes.frustumCulled = false;root.add(motes);
      fx = {root, column, core, ring, motes, seeds, t: -Math.max(0, wait), titled: false, line, god};
      return true;
    },
    // hero: the live hero; call after the loop has written its walk and bob, so the lift goes on top
    update(dt, hero = null) {
      untrack(hero);
      if (!fx) return;
      const d = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);fx.t += d;const t = fx.t;
      if (t >= CROWN_TIME) { dispose();return; }
      if (t < 0 || !hero?.g) { fx.root.visible = false;return; }
      fx.root.visible = true;
      hero.g.getWorldPosition(v);parent.worldToLocal(v);const floor = v.y;
      // the hero: lifted, arms spread, face up
      const p = crownPose(t);
      if (hero.arm && !hero.actions?.dead) {
        applied = {swing: p.swing, head: p.head};applySwing(hero, p.swing);
        const head = hero.head ?? hero.parts?.head;if (head) head.rotation.x += p.head;
        if (hero.body) hero.body.position.y += p.lift; // fresh: the loop writes the bob every frame
      }
      // the column of light coming down onto the hero
      const c = columnAt(t);
      for (const [m, k] of [[fx.column, .1], [fx.core, .16]]) { m.position.set(v.x, floor + 3 + (1 - c.drop) * 4, v.z);m.material.opacity = k * c.glow;m.rotation.y = t * .4; }
      // the ring settling on the brow
      const r = ringAt(t), brow = floor + 1.62 + p.lift;
      fx.ring.position.set(v.x, brow + r.down * 2.6, v.z);fx.ring.material.opacity = .95 * r.glow;fx.ring.scale.setScalar(1 + .6 * r.down);
      // motes spiralling up round the hero
      const a = fx.motes.geometry.attributes.position, mo = smooth((t - .6) / .6) * (1 - smooth((t - 3.2) / 1));
      for (let i = 0; i < fx.seeds.length; i++) { const s = fx.seeds[i], h = ((t * s.s + s.d) % 2.4), ang = s.a + t * 1.8 * s.s;a.setXYZ(i, v.x + Math.cos(ang) * s.r * (1 - h * .2), floor + h, v.z + Math.sin(ang) * s.r * (1 - h * .2)); }
      a.needsUpdate = true;fx.motes.material.opacity = .9 * mo;
      if (!fx.titled && t >= TITLE_AT) { fx.titled = true;onTitle?.({place: fx.god ? `Crowned by ${fx.god}` : 'Crowned', title: fx.line.title, side: fx.line.side}); }
    },
    clear(hero = null) { untrack(hero);dispose(); },
  };
}
