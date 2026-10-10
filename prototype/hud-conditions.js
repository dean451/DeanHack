// The hero's dangerous conditions as red capital tags in the character panel, right after EXP:
// STUN, CONF, BLIND, HALLU, ILL, STONE, SLIME, STRANGLED, WEAK, FAINTING... Anything that changes how
// the hero plays or moves, or says they are about to die. The bridge sends them on every frame as
// `player.conditions`, in the status line's own words; the status line text is only a fallback for
// an engine built before that field existed.

const LABELS = {
  stone: 'STONE', slime: 'SLIME', strngl: 'STRANGLED', foodpois: 'ILL', ill: 'ILL', termill: 'ILL',
  weak: 'WEAK', fainting: 'FAINTING', fainted: 'FAINTED',
  stun: 'STUN', conf: 'CONF', blind: 'BLIND', hallu: 'HALLU',
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

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
export function conditionTagsHtml(conditions) {
  return conditionTags(conditions).map(t => `<span class="hero-condition">${esc(t)}</span>`).join('');
}
