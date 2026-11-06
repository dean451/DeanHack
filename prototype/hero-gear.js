// What the hero is wearing, on the model. The class kit (hero-kits.js) sets who the hero is: the palette, hair,
// hat, the clothes over the rig and the props. This puts the armour the engine says is worn on top of that
// (frame.player.worn from bridge.c: suit, cloak, shirt, gloves, boots, each {name, otyp, mat, color} or null),
// so taking off a cloak takes the cape away and putting on plate mail puts the plate on:
// - suit: which pieces show follows the kind (plate gets pauldrons, tassets and leg plates; mail a skirt but
//   no pauldrons; leather just the cuirass) and the colour follows the material (iron keeps the kit's steel,
//   mithril shines, bronze is copper, crystal is clear, dragon scales take the dragon's colour). The Valkyrie
//   wears her own suit for any metal or scale armour. With no suit the torso is a padded cloth shirt.
// - cloak: the cape and shoulder mantles, in the cloak's colour; none, no cape.
// - gloves and boots: coloured by material (leather, iron gauntlets and shoes); none, bare hands and feet.
// Material and colour are the appearance's (an unidentified cloak is its "tattered cape"), so nothing is
// shown that the inventory doesn't say. A frame without `worn` (an older engine) leaves the kit as it is.
import * as THREE from 'three';
import {KITS} from './hero-kits.js';

// NetHack's CLR_* colour indexes, as cloth and scale colours that read in the dungeon's light
export const CLR = ['#2a2a2e', '#8a2a24', '#2f6a34', '#6a4a2c', '#2c3f7a', '#7a2f6e', '#2f7a7a', '#7d8288', '#5a5a60', '#b86a2a', '#4aa84a', '#c9b040', '#4a6ad0', '#c050c0', '#50c8c8', '#d8d8d4'];
// metal finishes by material (materialnm[] words); iron is left to the kit's own steel
const METAL = {copper: {color: '#9a6a3a', metalness: .85, roughness: .3}, mithril: {color: '#c9d3dd', metalness: .9, roughness: .18}, silver: {color: '#c4c8cc', metalness: .9, roughness: .2}, gold: {color: '#c9a24a', metalness: .9, roughness: .22}, platinum: {color: '#d4d6d8', metalness: .9, roughness: .2}};
const IRONLIKE = new Set(['iron', 'metal', 'copper', 'mithril', 'silver', 'gold', 'platinum']);
const LEATHER = {color: '#5a3e26', metalness: 0, roughness: .8}, PADDED = {color: '#5d5142', metalness: 0, roughness: .92};

// The worn suit as a kind (which pieces show) and a finish (colour, metalness, roughness, or null to keep the kit's).
export function suitLook(suit) {
  if (!suit) return {kind: 'none', finish: PADDED};
  const name = String(suit.name || '').toLowerCase(), mat = String(suit.mat || '').toLowerCase();
  if (/dragon scales?\b/.test(name) || mat === 'dragon hide') {
    const color = CLR[suit.color] ?? '#5a5a60';
    return {kind: /scale mail/.test(name) ? 'scale' : 'scales', finish: {color, metalness: .35, roughness: .42}};
  }
  if (mat === 'glass' || /crystal/.test(name)) return {kind: 'plate', finish: {color: '#dfe9f0', metalness: .15, roughness: .08}};
  if (mat === 'leather' || /leather|jacket/.test(name)) return {kind: 'leather', finish: LEATHER};
  if (IRONLIKE.has(mat)) {
    const kind = /plate/.test(name) ? 'plate' : /splint|banded/.test(name) ? 'banded' : 'mail';
    return {kind, finish: METAL[mat] ?? null};
  }
  return {kind: 'none', finish: {color: CLR[suit.color] ?? PADDED.color, metalness: 0, roughness: .9}};
}
// which rig pieces a kind of suit shows (the boots, `legGear` on the rig, follow the boots slot instead)
export const SUIT_PIECES = {
  plate: {pauldrons: true, tassets: true},
  scale: {pauldrons: true, tassets: true},
  banded: {pauldrons: true, tassets: true},
  mail: {pauldrons: false, tassets: true},
  scales: {pauldrons: false, tassets: false},
  leather: {pauldrons: false, tassets: false},
  none: {pauldrons: false, tassets: false},
};
const METAL_KINDS = new Set(['plate', 'scale', 'banded', 'mail', 'scales']);
// gloves and boots: a finish by material, or null for bare skin
export function wearFinish(item) {
  if (!item) return null;
  const mat = String(item.mat || '').toLowerCase();
  if (IRONLIKE.has(mat)) return METAL[mat] ?? {color: '#6c7378', metalness: .8, roughness: .3};
  if (mat === 'leather') return {color: '#4a3424', metalness: 0, roughness: .82};
  return {color: CLR[item.color] ?? '#4a3424', metalness: 0, roughness: .88};
}
export const cloakColor = cloak => cloak ? (CLR[cloak.color] ?? '#4b3a2c') : null;

const setVisible = (list, v) => { for (const o of list || []) o.visible = v; };
const KEYS = ['armor', 'armorLight', 'glove', 'boots', 'capeCloth'];
const finishOf = m => ({color: m.color.clone(), metalness: m.metalness, roughness: m.roughness});
const put = (m, f, light = false) => { if (!m || !f) return;m.color.set(f.color);if (light) m.color.offsetHSL(0, 0, .1);m.metalness = f.metalness;m.roughness = f.roughness; };

// The body the gear goes on, made once per rig: bare feet on the legs and a cap at each shoulder, both hidden
// until wearGear shows them. The feet are skin; the caps take the torso's material (shirt, mail or leather).
// The numbers follow knight(): the leg pivots' foot ellipsoid at (0, -.405, .074), the arms pivoting at the
// shoulder with a .056 upper arm, and the cuirass about .158 round at shoulder height.
export const CAP_R = .08, CHEST_SHOULDER_R = .158;
export function bodyParts(parts) {
  if (parts.gearBody) return parts.gearBody;
  const feet = [], caps = [], mats = parts.mats;
  for (const leg of parts.legs || []) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 10), mats.skin);foot.scale.set(.62, .42, 1.25);foot.position.set(0, -.432, .065);foot.name = 'bare foot';
    const toes = new THREE.Mesh(new THREE.SphereGeometry(.04, 10, 8), mats.skin);toes.scale.set(1.35, .55, .85);toes.position.set(0, -.452, .15);toes.name = 'bare toes';
    foot.visible = toes.visible = false;foot.castShadow = toes.castShadow = true;leg.add(foot, toes);feet.push(foot, toes);
  }
  for (const [arm, side] of [[parts.arm, 1], [parts.shieldArm, -1]]) {
    if (!arm) continue;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(CAP_R, 16, 12), mats.armor);cap.scale.set(1, .9, 1);cap.position.set(-side * .022, -.01, 0);cap.name = 'shoulder cap';
    cap.visible = false;cap.castShadow = true;arm.add(cap);caps.push(cap);
  }
  return parts.gearBody = {feet, caps, chestScale: parts.chest.scale.clone()};
}

// hero: the live hero (parts from knight() in main.js, kitKey from dressHero). worn: frame.player.worn.
// Returns true when it changed the model. Cheap when nothing changed: the look is compared as a signature.
export function wearGear(hero, worn) {
  const parts = hero?.parts;if (!parts || !worn || typeof worn !== 'object') return false;
  // the kit's colours, read once per kit (dressHero rewrites them only when the kit changes)
  if (hero.gearKit !== hero.kitKey || !hero.kitFinish) { hero.gearKit = hero.kitKey;hero.kitFinish = Object.fromEntries(KEYS.filter(k => parts.mats[k]).map(k => [k, finishOf(parts.mats[k])]));hero.kitShow = {cape: parts.cape.visible, valkyrie: (parts.valkyrie || []).some(o => o.visible)};hero.gearSig = null; }
  const suit = suitLook(worn.suit), gloves = wearFinish(worn.gloves), boots = wearFinish(worn.boots), cloak = cloakColor(worn.cloak);
  const sig = JSON.stringify([suit, gloves, boots, cloak]);if (sig === hero.gearSig) return false;hero.gearSig = sig;
  const base = hero.kitFinish, mats = parts.mats;
  for (const k of KEYS) if (mats[k] && base[k]) { mats[k].color.copy(base[k].color);mats[k].metalness = base[k].metalness;mats[k].roughness = base[k].roughness; }
  const pieces = SUIT_PIECES[suit.kind], own = hero.kitShow.valkyrie && METAL_KINDS.has(suit.kind);
  // suit: the Valkyrie's own plate for metal and scale armour; otherwise the rig's cuirass, plate or cloth
  for (const o of parts.valkyrie || []) {
    const r = o.userData.valkyrie;if (!hero.kitShow.valkyrie || r === 'Helm' || r === 'Wing' || r === 'Slit' || r === 'Eyes' || /Hair/.test(r)) continue;
    o.visible = own && (r === 'Pauldron' ? pieces.pauldrons : r === 'Tasset' || r === 'SkirtPanel' ? pieces.tassets : true);
  }
  const rig = !own;
  parts.chest.visible = rig;parts.belt.visible = rig;
  setVisible(parts.pauldrons, rig && pieces.pauldrons);setVisible(parts.tassets, rig && pieces.tassets);
  // feet: the Valkyrie's own suit has its sabatons; otherwise boots when boots are worn, and bare feet when not
  const body = bodyParts(parts);
  setVisible(parts.legGear, rig && !!boots);setVisible(body.feet, rig && !boots);
  // shoulders: with no pauldrons and no robe or tunic over them, the arms hung apart from a narrow torso; a cap at
  // each shoulder in the torso's own material joins them, and the torso widens just enough to meet the caps
  /* a tabard is only a front panel */const covered = ['robe', 'tunic'].includes(KITS[String(hero.kitKey || '').split(':')[0]]?.outfit?.kind), bridge = rig && !pieces.pauldrons && !covered;
  setVisible(body.caps, bridge);
  const armX = Math.abs(parts.arm?.position?.x ?? .3), widen = bridge ? Math.min(1.3, Math.max(1, (armX - CAP_R - .005) / CHEST_SHOULDER_R)) : 1;
  parts.chest.scale.x = body.chestScale.x * widen;parts.chest.scale.z = body.chestScale.z * (bridge ? 1.06 : 1);
  if (suit.finish) { put(mats.armor, suit.finish);put(mats.armorLight, suit.finish, true); }
  // cloak: the cape and mantles
  parts.cape.visible = !!cloak;setVisible(parts.mantles, !!cloak);if (cloak && mats.capeCloth) { mats.capeCloth.color.set(cloak);mats.capeCloth.metalness = 0; }
  // gloves and boots, or bare skin
  const skin = mats.skin ? {color: '#' + mats.skin.color.getHexString(), metalness: 0, roughness: .7} : null;
  put(mats.glove, gloves ?? skin);put(mats.boots, boots ?? skin);
  return true;
}
