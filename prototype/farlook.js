// Farlook on hover: the 3D version of `;`. Pointing at a monster or item names it and says whether
// it is a pet, peaceful or hostile. The engine reports no sleep state, so none is shown.

import {itemBuc, bucMark, itemEnchant, enchantMark} from './item-buc.js';

// Bare furniture and hazards the hero can point at, by the bridge's terrain word. Floor, wall and
// unknown stone stay unnamed so the tooltip stays quiet.
const FEATURES = {
  altar: 'altar', fountain: 'fountain', throne: 'throne', sink: 'sink', grave: 'grave', tree: 'tree',
  up: 'stairs up', down: 'stairs down', door: 'closed door', bars: 'iron bars', water: 'water', lava: 'lava',
};

// The map square under a ground point (world x/z, with the origin offset the scene uses).
export function squareAt(point, origin) {
  return {x: Math.round(point.x) + origin.x, z: Math.round(point.z) + origin.z};
}

// A bare square: a seen trap by its name, an open or smashed door, else the furniture or hazard.
function terrainText(cell) {
  const base = bareText(cell);
  const e = cell.engraving;
  if (!e) return base;
  const mark = e.elbereth ? `Elbereth, ${e.type}` : `${e.type} engraving`;
  return base ? `${base} (${mark})` : mark;
}

function bareText(cell) {
  if (cell.trap) return String(cell.trap).toLowerCase();
  if (cell.terrain === 'door' && cell.door === 'open') return 'open door';
  if (cell.door === 'broken') return 'broken door';
  return FEATURES[cell.terrain] || '';
}

// The one quiet line for a square, or '' when there is nothing to name. A square out of sight
// still names what detection or telepathy sensed there, marked as sensed.
export function farlookText(cell) {
  if (!cell) return '';
  if (cell.visible) return seenText(cell);
  if (!cell.sensed || !(cell.name || cell.object?.name)) return '';
  const text = seenText({...cell, visible: true, health: undefined});
  return text ? `${text} (sensed)` : '';
}

function seenText(cell) {
  const name = String(cell.name || cell.object?.name || '').trim();
  if (!name) return cell.kind === 'terrain' || !cell.kind ? terrainText(cell) : '';
  const hurt = cell.health < 25 ? ', near death' : cell.health < 60 ? ', badly wounded' : cell.health < 100 ? ', wounded' : '';
  if (cell.kind === 'pet') return `${name} (pet${hurt})`;
  if (cell.kind === 'monster') return `${name} (${cell.peaceful ? 'peaceful' : 'hostile'}${hurt})`;
  if (cell.object) {
    const marks = [bucMark(itemBuc(name)), enchantMark(itemEnchant(name))].filter(Boolean).join('');
    return marks ? `${marks} ${name}` : name;
  }
  return terrainText(cell);
}

export function createFarlook(doc) {
  const el = doc.createElement('div');
  el.id = 'farlook';
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
  return {
    el,
    show(text, x, y) {
      if (!text) { el.hidden = true; return; }
      el.textContent = text;
      el.style.left = `${x + 14}px`;
      el.style.top = `${y + 16}px`;
      el.hidden = false;
    },
    hide() { el.hidden = true; },
  };
}
