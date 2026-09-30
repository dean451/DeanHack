// A square with Elbereth on it becomes a ward. The word, written twice round a ring on the floor,
// glows and slowly turns, with Varda's eight-pointed star in the middle turning the other way.
// A faint column of light rises off it and motes of starlight spiral up through the column.
// The colour follows how it was written: dust is silver starlight (and flickers, being
// fragile), an engraving is pale blue, a burned one is gold, graffiti is green, and blood is a
// slow crimson.
//
// The bridge only says "elbereth" for an engraving the hero has read or written, and it goes by
// what the hero last read, not what the square says now, so this never tells the player more
// than they know. syncWard(tile, cell) adds, swaps or removes the ward on a map tile; the ward
// animates from userData.animate(t), which live.js calls for everything on a visible tile.

import * as THREE from 'three';
import {softDot, upFade, textTexture, rng} from './fx-textures.js';

export const WARD_COLORS = {dust: 0xdde8ff, engrave: 0x8fd4ff, burn: 0xffb45a, mark: 0xb8ffc8, blood: 0xff3a3a, other: 0xdde8ff};
export const WARD_Y = .014;       // just above the floor slab
export const WARD_RADIUS = .45;   // the ring stays inside its tile
export const WARD_MOTES = 10;
export const WARD_COLUMN = .9;    // height of the light column
const MOTE_PERIOD = 3.2;

function ringTexture() {
  return textTexture(THREE, 'elbereth-ring', (ctx, w) => {
    const c = w / 2;
    ctx.lineWidth = w / 170;
    for (const r of [.97, .9, .68, .63]) { ctx.beginPath(); ctx.arc(c, c, c * r, 0, Math.PI * 2); ctx.stroke(); }
    // the word twice round the band between the circles, letters standing out from the centre
    const word = 'ELBERETH ✦ ELBERETH ✦ ', n = word.length;
    ctx.font = `600 ${Math.round(w / 13)}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      ctx.save(); ctx.translate(c + Math.sin(a) * c * .79, c - Math.cos(a) * c * .79); ctx.rotate(a);
      ctx.fillText(word[i], 0, 0); ctx.restore();
    }
    // small ticks round the outside
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2, r0 = c * .9, r1 = c * (i % 4 ? .93 : .96);
      ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); ctx.stroke();
    }
  }, 512);
}

// Varda's star: eight long points over eight short ones, and a bright heart.
function starTexture() {
  return textTexture(THREE, 'elbereth-star', (ctx, w) => {
    const c = w / 2;
    const star = (n, ro, ri, rot) => {
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * Math.PI * 2, r = i % 2 ? ri : ro; ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
      ctx.closePath();
    };
    ctx.globalAlpha = .55; star(8, c * .62, c * .2, Math.PI / 8); ctx.fill();
    ctx.globalAlpha = 1; ctx.lineWidth = w / 90; star(8, c * .95, c * .22, 0); ctx.stroke();
    ctx.globalAlpha = .35; ctx.fill();
    const g = ctx.createRadialGradient(c, c, 0, c, c, c * .3);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, c * .3, 0, Math.PI * 2); ctx.fill();
  }, 256);
}

// How bright the ward is at time t (about .55–1). Dust flickers; blood beats slowly.
export function wardGlow(type, t, phase = 0) {
  let g = .8 + .2 * Math.sin(t * 2.1 + phase);
  if (type === 'dust') g *= .9 + .1 * Math.sin(t * 13.7 + phase) * Math.sin(t * 7.3 + phase * 2);
  else if (type === 'burn') g *= .92 + .08 * Math.sin(t * 9.1 + phase) * Math.sin(t * 3.7);
  else if (type === 'blood') g = .7 + .3 * Math.max(0, Math.sin(t * 1.3 + phase)) ** 3;
  return g;
}

// Where mote i is at time t: spiralling up through the column, fading in and out.
export function wardMote(i, t, phase = 0) {
  const u = ((t + i / WARD_MOTES * MOTE_PERIOD + phase) / MOTE_PERIOD) % 1;
  const a = i * 2.39996 + u * Math.PI * 1.6, r = .12 + .2 * (1 - u) * ((i * 7) % 5 + 3) / 7;
  return {x: Math.cos(a) * r, y: .04 + u * WARD_COLUMN, z: Math.sin(a) * r, alpha: Math.sin(u * Math.PI) ** 1.5, size: .035 + .025 * Math.sin(u * Math.PI)};
}

export function createElberethWard(type = 'dust', seed = 0) {
  const key = WARD_COLORS[type] ? type : 'other', color = new THREE.Color(WARD_COLORS[key]);
  const g = new THREE.Group(); g.name = 'ElberethWard'; g.userData.wardType = key;
  const geometries = [], materials = [];
  const additive = (map, opacity, extra = {}) => { const m = new THREE.MeshBasicMaterial({map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, ...extra}); materials.push(m); return m; };
  const flat = (size, map, opacity, y) => { const geo = new THREE.CircleGeometry(size / 2, 48); geometries.push(geo); const o = new THREE.Mesh(geo, additive(map, opacity)); o.rotation.x = -Math.PI / 2; o.position.y = y; o.renderOrder = 2; g.add(o); return o; };
  const pool = flat(WARD_RADIUS * 2.1, softDot(THREE), .35, WARD_Y - .002);
  const ring = flat(WARD_RADIUS * 2, ringTexture(), .9, WARD_Y);
  const star = flat(WARD_RADIUS * .95, starTexture(), .8, WARD_Y + .002);
  const colGeo = new THREE.CylinderGeometry(WARD_RADIUS * .8, WARD_RADIUS * .86, WARD_COLUMN, 28, 1, true);
  colGeo.translate(0, WARD_COLUMN / 2, 0); geometries.push(colGeo);
  const column = new THREE.Mesh(colGeo, additive(upFade(THREE), .16)); column.renderOrder = 2; g.add(column);
  const motes = [];
  for (let i = 0; i < WARD_MOTES; i++) {
    const m = new THREE.SpriteMaterial({map: softDot(THREE), color: color.clone().lerp(new THREE.Color(0xffffff), .5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false});
    materials.push(m); const s = new THREE.Sprite(m); g.add(s); motes.push(s);
  }
  const phase = rng(seed + 1)() * Math.PI * 2;
  g.userData.animate = t => {
    const glow = wardGlow(key, t, phase);
    ring.material.opacity = .9 * glow; star.material.opacity = .8 * glow; pool.material.opacity = .3 * glow;
    column.material.opacity = .16 * glow;
    ring.rotation.z = t * .12 + phase; star.rotation.z = -t * .2 - phase;
    star.scale.setScalar(1 + .05 * Math.sin(t * 1.7 + phase));
    motes.forEach((s, i) => { const p = wardMote(i, t, phase); s.position.set(p.x, p.y, p.z); s.material.opacity = p.alpha * glow; s.scale.setScalar(p.size); });
  };
  g.userData.animate(0);
  g.userData.dispose = () => { for (const geo of geometries) geo.dispose(); for (const m of materials) m.dispose(); };
  return g;
}

// Keep a tile's ward in step with its cell: one while the hero believes Elbereth is written
// there, in the look of how it was written; none otherwise.
export function syncWard(tile, cell) {
  const e = cell.engraving, want = e?.elbereth ? (WARD_COLORS[e.type] ? e.type : 'other') : null;
  const have = tile.userData.ward;
  if ((have?.userData.wardType ?? null) === want) return have ?? null;
  if (have) { have.userData.dispose(); tile.remove(have); tile.userData.ward = null; }
  if (!want) return null;
  const w = createElberethWard(want, cell.x * 73 + cell.z * 19);
  tile.add(w); tile.userData.ward = w;
  return w;
}
