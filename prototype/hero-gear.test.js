import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {suitLook, wearFinish, cloakColor, wearGear, SUIT_PIECES, CLR} from './hero-gear.js';

const I = (name, mat, color = 7) => ({name, mat, color, otyp: 1});
const NONE = {suit: null, cloak: null, shirt: null, gloves: null, boots: null};

test('a suit is read as a kind and a finish from its name and material', () => {
  assert.equal(suitLook(I('plate mail', 'iron')).kind, 'plate');
  assert.equal(suitLook(I('plate mail', 'iron')).finish, null, 'iron keeps the kit\'s steel');
  assert.equal(suitLook(I('bronze plate mail', 'copper')).finish.color, '#9a6a3a');
  assert.equal(suitLook(I('ring mail', 'iron')).kind, 'mail');
  assert.equal(suitLook(I('splint mail', 'iron')).kind, 'banded');
  assert.equal(suitLook(I('elven mithril-coat', 'mithril')).kind, 'mail');
  assert.equal(suitLook(I('crystal plate mail', 'glass')).kind, 'plate');
  assert.equal(suitLook(I('leather armor', 'leather')).kind, 'leather');
  assert.equal(suitLook(I('studded leather armor', 'leather')).kind, 'leather');
  const dsm = suitLook(I('silver dragon scale mail', 'dragon hide', 14));
  assert.equal(dsm.kind, 'scale');assert.equal(dsm.finish.color, CLR[14]);
  assert.equal(suitLook(I('red dragon scales', 'dragon hide', 1)).kind, 'scales');
  assert.equal(suitLook(null).kind, 'none');
  for (const k of Object.keys(SUIT_PIECES)) assert.ok(SUIT_PIECES[k]);
});

test('gloves, boots and cloaks take their material and colour; nothing worn is bare', () => {
  assert.ok(wearFinish(I('gauntlets of power', 'iron')).metalness > .5);
  assert.equal(wearFinish(I('leather gloves', 'leather')).metalness, 0);
  assert.equal(wearFinish(null), null);
  assert.equal(cloakColor(I('opera cloak', 'cloth', 1)), CLR[1]);
  assert.equal(cloakColor(null), null);
});

// a stand-in for knight()'s rig: the parts and shared materials wearGear touches
function hero(valkyrie = false) {
  const mat = (c, metal = .8) => new THREE.MeshStandardMaterial({color: c, metalness: metal, roughness: .3});
  const mats = {armor: mat('#6f7f86'), armorLight: mat('#c4d0d2'), glove: mat('#7a5238', 0), boots: mat('#1b2224', 0), capeCloth: mat('#7b2a28', 0), skin: mat('#d6a88c', 0)};
  const m = (material, role) => { const o = new THREE.Mesh(new THREE.BoxGeometry(), material);if (role) o.userData.valkyrie = role;return o; };
  const valk = valkyrie ? ['Plate', 'Pauldron', 'Tasset', 'SkirtPanel', 'Helm', 'Hair'].map(r => m(mats.armor, r)) : [];
  const parts = {mats, chest: m(mats.armor), belt: m(mats.armor), cape: new THREE.Group(), pauldrons: [m(mats.armor)], tassets: [m(mats.armor)], legGear: [m(mats.armor)], mantles: [m(mats.capeCloth)], valkyrie: valk};
  parts.chest.visible = !valkyrie;parts.cape.visible = !valkyrie;for (const o of valk) o.visible = true;
  return {parts, kitKey: valkyrie ? 'Valkyrie:female' : 'Knight:female'};
}

test('plate shows pauldrons, tassets and leg plates; mail drops the pauldrons; nothing is a padded shirt', () => {
  const h = hero();
  assert.equal(wearGear(h, {...NONE, suit: I('plate mail', 'iron')}), true);
  assert.ok(h.parts.chest.visible && h.parts.pauldrons[0].visible && h.parts.tassets[0].visible && h.parts.legGear[0].visible);
  assert.equal(h.parts.mats.armor.color.getHexString(), '6f7f86', 'iron keeps the kit\'s steel');
  wearGear(h, {...NONE, suit: I('ring mail', 'iron')});
  assert.ok(h.parts.chest.visible && !h.parts.pauldrons[0].visible && h.parts.tassets[0].visible && !h.parts.legGear[0].visible);
  wearGear(h, NONE);
  assert.ok(h.parts.chest.visible, 'a body under the clothes');assert.ok(!h.parts.tassets[0].visible);
  assert.equal(h.parts.mats.armor.metalness, 0, 'cloth, not steel');
  wearGear(h, {...NONE, suit: I('plate mail', 'iron')});
  assert.equal(h.parts.mats.armor.metalness, .8, 'the kit\'s finish comes back with the plate');
});

test('the same gear twice changes nothing; a frame without worn leaves the kit alone', () => {
  const h = hero();
  assert.equal(wearGear(h, NONE), true);assert.equal(wearGear(h, NONE), false);
  assert.equal(wearGear(h, undefined), false);
});

test('a cloak brings the cape in its colour, and taking it off takes the cape away', () => {
  const h = hero();
  wearGear(h, {...NONE, cloak: I('opera cloak', 'cloth', 1)});
  assert.ok(h.parts.cape.visible && h.parts.mantles[0].visible);assert.equal('#' + h.parts.mats.capeCloth.color.getHexString(), CLR[1]);
  wearGear(h, NONE);
  assert.ok(!h.parts.cape.visible && !h.parts.mantles[0].visible);
});

test('bare hands and feet are skin; gauntlets are steel', () => {
  const h = hero();
  wearGear(h, NONE);
  assert.equal(h.parts.mats.glove.color.getHexString(), 'd6a88c');assert.equal(h.parts.mats.boots.color.getHexString(), 'd6a88c');
  wearGear(h, {...NONE, gloves: I('gauntlets', 'iron'), boots: I('high boots', 'leather', 3)});
  assert.ok(h.parts.mats.glove.metalness > .5);assert.equal(h.parts.mats.boots.metalness, 0);
});

test('the Valkyrie wears her own suit for metal armour and the rig\'s cloth or leather otherwise; her helm and hair are left to the helmet', () => {
  const h = hero(true), role = r => h.parts.valkyrie.find(o => o.userData.valkyrie === r);
  wearGear(h, {...NONE, suit: I('ring mail', 'iron')});
  assert.ok(role('Plate').visible && !role('Pauldron').visible && role('Tasset').visible && !h.parts.chest.visible);
  wearGear(h, NONE);
  assert.ok(!role('Plate').visible && !role('Tasset').visible && h.parts.chest.visible);
  assert.ok(role('Helm').visible && role('Hair').visible, 'the helmet and hair are not the suit\'s');
  wearGear(h, {...NONE, suit: I('leather armor', 'leather')});
  assert.ok(!role('Plate').visible && h.parts.chest.visible);
});

test('the live game dresses the hero from the frame\'s worn armour, and the bridge sends it', () => {
  assert.match(readFileSync(new URL('./live-apply.js', import.meta.url), 'utf8'), /wearGear\(hero,frame\.player\.worn\)/);
  const bridge = readFileSync(new URL('./engine/bridge.c', import.meta.url), 'utf8');
  for (const [slot, v] of [['suit', 'uarm'], ['cloak', 'uarmc'], ['shirt', 'uarmu'], ['gloves', 'uarmg'], ['boots', 'uarmf']]) assert.match(bridge, new RegExp(`${slot}\\\\":"\\);worn_piece\\(${v}\\)`));
  assert.match(bridge, /materialnm\[objects\[o->otyp\]\.oc_material\]/, 'the appearance\'s material, never the true type');
});
