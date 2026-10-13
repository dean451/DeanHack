// The hero's dangerous conditions as red capital tags in the character panel, right after EXP:
// STUN, CONF, BLIND, HALLU, ILL, STONE, SLIME, STRANGLED, HUNGRY, WEAK, FAINTING... Anything that changes how
// the hero plays or moves, or says they are about to die. The bridge sends them on every frame as
// `player.conditions`, in the status line's own words; the status line text is only a fallback for
// an engine built before that field existed.

const LABELS = {
  stone: 'STONE', slime: 'SLIME', strngl: 'STRANGLED', foodpois: 'ILL', ill: 'ILL', termill: 'ILL',
  hungry: 'HUNGRY', weak: 'WEAK', fainting: 'FAINTING', fainted: 'FAINTED',
  stun: 'STUN', deaf: 'DEAF', conf: 'CONF', blind: 'BLIND', hallu: 'HALLU',
  lev: 'LEV', legs: 'LEGS', trap: 'TRAPPED', held: 'HELD',
  burdened: 'BURDENED', stressed: 'STRESSED', strained: 'STRAINED', overtaxed: 'OVERTAXED', overloaded: 'OVERLOADED',
};

// The tags to show, in order, without repeats (FoodPois and Ill are both ILL).
export function conditionTags(conditions) {
  const out = [];
  for (const c of conditions || []) {
    const tag = LABELS[String(c).toLowerCase().trim()];
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

// The conditions to act on: the frame's list when the engine sends one, else the words on the
// status line after the turn counter.
export function heroConditions(frameConditions, statusText = '') {
  if (Array.isArray(frameConditions)) return frameConditions.map(String);
  return (String(statusText).split(/T:\d+/)[1] || '').trim().split(/\s+/).filter(Boolean);
}

import {conditionGlyph} from './condition-glyph.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
export function conditionTagsHtml(conditions) {
  // Hungry and deaf are warnings, not yet dangers: the same tag, but amber instead of red.
  // Each tag leads with the condition's shape, so a red tag and an amber one differ without colour too.
  const first = {};
  for (const c of conditions || []) { const tag = LABELS[String(c).toLowerCase().trim()]; if (tag && !first[tag]) first[tag] = c; }
  return conditionTags(conditions).map(t => `<span class="hero-condition${t === 'HUNGRY' || t === 'DEAF' ? ' mild' : ''}"><i aria-hidden="true">${conditionGlyph(first[t])}</i> ${esc(t)}</span>`).join('');
}
