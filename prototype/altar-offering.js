import * as THREE from 'three';
import {softDot, softRing, upFade, smooth, clamp01} from './fx-textures.js';

// Things laid on an altar.
//
// Corpses waiting to be sacrificed are laid out on the slab: turned so their length runs along
// it, shrunk if they would hang over the edges, and centred, like an offering set down, not a
// body dropped in a heap.
//
// "There is an amber flash as a +0 long sword hits the altar." The god marks what is blessed and
// what is cursed, and the stone shows it. A blessed thing throws a warm amber flare off the slab,
// a column of light and motes rising. A cursed thing does the opposite: the light goes out of
// the stone in a dark, smoky gulp that spreads across the slab and is pulled back in. While
// hallucinating the colour is any colour at all (hcolor), so the flash takes that colour and the
// blessed flare's shape, since there is no telling which it was.

// The slab's top face (altar.js: mensa .84 by .68), less a margin so nothing hangs over.
export const SLAB = {x: .74, z: .58, height: .42};

// Lay a corpse model (a child of the item icon, the icon resting on the slab) along the slab.
export function layOnSlab(corpse) {
  corpse.updateMatrix();
  const measure = () => { corpse.updateMatrixWorld(true); return new THREE.Box3().setFromObject(corpse); };
  let box = measure(), size = box.getSize(new THREE.Vector3());
  // Turn the long axis along x, the slab's long side.
  if (size.z > size.x) { corpse.rotation.y += Math.PI / 2; box = measure(); size = box.getSize(new THREE.Vector3()); }
  const k = Math.min(1, SLAB.x / Math.max(size.x, 1e-6), SLAB.z / Math.max(size.z, 1e-6), SLAB.height / Math.max(size.y, 1e-6));
  if (k < 1) { corpse.scale.multiplyScalar(k); box = measure(); }
  const c = box.getCenter(new THREE.Vector3());
  // corpse.position is in the icon's frame, which the box (taken with the icon at its own
  // origin, before it is placed) shares.
  corpse.position.x -= c.x; corpse.position.z -= c.z; corpse.position.y -= box.min.y;
  return k;
}

// "There is an amber flash as ... hits the altar." / "There is a black flash as ...".
const FLASH_RE = /^There is an? (.+?) flash as .+ hits? the altar\./i;
export function altarFlash(text) {
  const m = FLASH_RE.exec(text || '');
  if (!m) return null;
  const colour = m[1].toLowerCase();
  if (colour === 'amber') return {kind: 'blessed', colour: 0xffb347};
  if (colour === 'black') return {kind: 'cursed', colour: 0x07040a};
  const c = new THREE.Color(); try { c.setStyle(colour.replace(/\s+/g, '')); } catch { /* not a CSS colour */ }
  return {kind: 'blessed', colour: c.getHex() || 0xc080ff, hallucinated: true};
}

export const FLASH = {blessed: 1.3, cursed: 1.5};

// Blessed: how bright the flare is and how high the column has risen at age t (0..1 each).
export function blessedPose(t) {
  const u = clamp01(t / FLASH.blessed);
  const flare = t < .08 ? smooth(t / .08) : Math.max(0, 1 - (t - .08) / .5) ** 1.5;
  return {flare, column: smooth(u / .35) * (1 - smooth((u - .55) / .45)), rise: smooth(u)};
}
// Cursed: the darkness swells out across the slab, hangs, then is gulped back in.
export function cursedPose(t) {
  const u = clamp01(t / FLASH.cursed);
  const spread = u < .35 ? smooth(u / .35) : 1 - .85 * smooth((u - .55) / .4);
  return {spread, dark: u < .1 ? smooth(u / .1) : 1 - smooth((u - .6) / .4), smoke: smooth(u / .5) * (1 - smooth((u - .7) / .3))};
}

const glow = (color, map, opacity = 0) => ({color, map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
const shade = (color, map, opacity = 0) => ({color, map, transparent: true, opacity, depthWrite: false});

export function createAltarFlashes(parent, {top = .345} = {}) {
  const live = [];
  const plane = new THREE.PlaneGeometry(1, 1), floorPlane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  function blessed(g, colour) {
    const c = new THREE.Color(colour).multiplyScalar(3);
    const flare = new THREE.Sprite(new THREE.SpriteMaterial(glow(c, softDot(THREE))));
    flare.position.y = top + .12; g.add(flare);
    const column = new THREE.Group(); column.position.y = top; g.add(column);
    const colMat = new THREE.MeshBasicMaterial({...glow(new THREE.Color(colour).multiplyScalar(1.6), upFade(THREE)), side: THREE.DoubleSide});
    for (const r of [0, Math.PI / 2]) { const m = new THREE.Mesh(plane, colMat); m.rotation.y = r; m.position.y = .5; column.add(m); }
    column.scale.set(.5, 1.6, .5);
    const n = 18, pos = new Float32Array(n * 3), seeds = [];
    for (let i = 0; i < n; i++) seeds.push([(Math.random() - .5) * .5, (Math.random() - .5) * .4, .3 + Math.random() * .9, Math.random() * 6]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const motes = new THREE.Points(geo, new THREE.PointsMaterial({...glow(c, softDot(THREE)), size: .045}));
    motes.frustumCulled = false; g.add(motes);
    return {total: FLASH.blessed, mats: [flare.material, colMat, motes.material], geos: [geo], update(t) {
      const p = blessedPose(t);
      flare.material.opacity = p.flare; flare.scale.setScalar(.35 + p.flare * .9);
      colMat.opacity = p.column * .85; column.scale.y = .6 + p.rise * 1.4;
      for (let i = 0; i < n; i++) { const [x, z, v, w] = seeds[i]; pos[i * 3] = x + Math.sin(t * 3 + w) * .03; pos[i * 3 + 1] = top + .03 + v * p.rise * .9; pos[i * 3 + 2] = z + Math.cos(t * 2.6 + w) * .03; }
      geo.attributes.position.needsUpdate = true; motes.material.opacity = p.column;
    }};
  }
  function cursed(g, colour) {
    const dark = new THREE.Color(colour);
    const pool = new THREE.Mesh(floorPlane, new THREE.MeshBasicMaterial({...shade(dark, softDot(THREE)), side: THREE.DoubleSide}));
    pool.position.y = top + .006; pool.renderOrder = 5; g.add(pool);
    const rim = new THREE.Mesh(floorPlane, new THREE.MeshBasicMaterial({...glow(new THREE.Color(0x5a2a6a).multiplyScalar(1.2), softRing(THREE)), side: THREE.DoubleSide}));
    rim.position.y = top + .008; g.add(rim);
    const puffs = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial(shade(dark, softDot(THREE))));
      const a = i / 6 * Math.PI * 2; s.userData.dir = [Math.cos(a), Math.sin(a)]; g.add(s); puffs.push(s);
    }
    return {total: FLASH.cursed, mats: [pool.material, rim.material, ...puffs.map(p => p.material)], geos: [], update(t) {
      const p = cursedPose(t);
      pool.material.opacity = p.dark * .92; pool.scale.setScalar(.15 + p.spread * .95);
      rim.material.opacity = p.dark * .6; rim.scale.setScalar(.2 + p.spread * 1.05);
      for (const s of puffs) {
        const r = .08 + p.spread * .3;
        s.position.set(s.userData.dir[0] * r, top + .06 + p.smoke * .22, s.userData.dir[1] * r * .8);
        s.material.opacity = p.smoke * .75; s.scale.setScalar(.12 + p.smoke * .22);
      }
    }};
  }
  // Several things dropped at once each get their flash, a beat apart.
  let nextDelay = 0;
  function flash(text, x, z) {
    const f = altarFlash(text);
    if (!f || !Number.isFinite(x) || !Number.isFinite(z)) return null;
    const g = new THREE.Group(); g.name = `AltarFlash ${f.kind}`; g.position.set(x, 0, z); parent.add(g);
    const fx = (f.kind === 'cursed' ? cursed : blessed)(g, f.colour);
    live.push({g, fx, t: -nextDelay}); nextDelay += .18;
    fx.update(0);
    return g;
  }
  function drop(e) { e.fx.mats.forEach(m => m.dispose()); e.fx.geos.forEach(g => g.dispose()); parent.remove(e.g); }
  return {
    message: flash,
    update(dt) {
      dt = Math.min(Math.max(dt || 0, 0), .1); nextDelay = Math.max(0, nextDelay - dt);
      for (let i = live.length - 1; i >= 0; i--) {
        const e = live[i]; e.t += dt;
        if (e.t >= e.fx.total) { drop(e); live.splice(i, 1); continue; }
        e.g.visible = e.t >= 0; if (e.t >= 0) e.fx.update(e.t);
      }
    },
    clear() { live.forEach(drop); live.length = 0; nextDelay = 0; },
    get count() { return live.length; },
    dispose() { this.clear(); plane.dispose(); floorPlane.dispose(); },
  };
}
