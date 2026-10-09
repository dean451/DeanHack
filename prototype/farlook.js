// Farlook on hover: the 3D version of `;`. Pointing at a monster or item names it and says whether
// it is a pet, peaceful or hostile. The engine reports no sleep state, so none is shown.

import {itemBuc, bucMark} from './item-buc.js';

// The map square under a ground point (world x/z, with the origin offset the scene uses).
export function squareAt(point, origin) {
  return {x: Math.round(point.x) + origin.x, z: Math.round(point.z) + origin.z};
}

// The one quiet line for a square, or '' when there is nothing to name.
export function farlookText(cell) {
  if (!cell || !cell.visible) return '';
  const name = String(cell.name || cell.object?.name || '').trim();
  if (!name) return '';
  if (cell.kind === 'pet') return `${name} (pet)`;
  if (cell.kind === 'monster') return `${name} (${cell.peaceful ? 'peaceful' : 'hostile'})`;
  if (cell.object) { const buc = itemBuc(name); return buc ? `${bucMark(buc)} ${name}` : name; }
  return '';
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
