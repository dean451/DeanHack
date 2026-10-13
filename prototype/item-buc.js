// Once an item's blessed or cursed state is known, the engine's item name says so ("a blessed +1
// dagger", "2 cursed potions of sleeping"). The pack shows it with a shape as well as a tint, so it
// does not rely on colour alone. Uncursed stays bare to keep the list quiet.

const MARKS = {blessed: '☼', cursed: '✖'};

// 'blessed', 'cursed' or null for an item line. Only the words before the item's own name count, and
// "uncursed" is not "cursed".
export function itemBuc(text) {
  // Known holy and unholy water drop the word: the name itself says it ("2 potions of holy water").
  const water = /\b(un)?holy water\b/i.exec(String(text));
  if (water) return water[1] ? 'cursed' : 'blessed';
  const m = /^\s*(?:(?:a|an|the|\d+)\s+)?(?:(?:greased|poisoned|rustproof|fireproof|rotproof|corrodeproof|erodeproof|burnt|rusty|corroded|rotted|very|thoroughly)\s+)*(blessed|cursed|uncursed)\b/i.exec(String(text));
  const kind = m?.[1].toLowerCase();
  return kind === 'blessed' || kind === 'cursed' ? kind : null;
}

// The shape for a state, or '' for none.
export function bucMark(kind) {
  return MARKS[kind] || '';
}

// A known enchantment shows in the name as "+2" or "-1" ("a blessed +2 dagger"). 'plus' or 'minus'
// for a non-zero one, else null; +0 stays bare. Only the first signed number counts, and only
// before a parenthesis, so "(0:3)" charges and "(weapon in hand)" never match.
export function itemEnchant(text) {
  const m = /(?:^|\s)([+-])(\d+)(?=\s)/.exec(String(text).split('(')[0]);
  if (!m || Number(m[2]) === 0) return null;
  return m[1] === '+' ? 'plus' : 'minus';
}

const ENCHANT_MARKS = {plus: '▲', minus: '▼'};

// The shape for an enchantment, or '' for none.
export function enchantMark(kind) {
  return ENCHANT_MARKS[kind] || '';
}

// Other facts the item name carries, spelled out for the hover: erosion words, poison, grease, a
// wand's "(0:3)" charges and where the item is held or worn, a shop price ("unpaid 40zm") and a ball chained to you, and a candelabrum's candles. Each appears once, in this order.
export function itemFacts(text) {
  const t = String(text), out = [];
  for (const state of t.split('(')[0].matchAll(/\b(?:(?:very|thoroughly) )?(?:rusty|corroded|burnt|rotted)\b/gi)) out.push(state[0].toLowerCase());
  const proof = /\b(rustproof|fireproof|rotproof|corrodeproof|erodeproof|fixed)\b/i.exec(t.split('(')[0]);
  if (proof) out.push(proof[1].toLowerCase());
  if (/\bpoisoned\b/i.test(t.split('(')[0])) out.push('poisoned');
  if (/\binvisible\b/i.test(t.split('(')[0])) out.push('invisible');
  if (/\bbroken\b/i.test(t.split('(')[0])) out.push('broken');
  if (/\bgreased\b/i.test(t.split('(')[0])) out.push('greased');
  const label = /\b(named|called) ([^(\[]*?)\s*(?:[(\[]|$)/i.exec(t);
  if (label && label[2]) out.push(`${label[1].toLowerCase()} ${label[2].replace(/\s+(?:of|on|in)\s+.*$/i, '')}`);
  const charges = /\((-?\d+):(-?\d+)\)/.exec(t);
  if (charges) {
    const left = Number(charges[2]);
    out.push(left < 0 ? 'cancelled' : `${left} charge${left === 1 ? '' : 's'}`);
    if (Number(charges[1]) > 0) out.push('recharged');
  }
  if (/\((?:[^)]*, )?lit\)/i.test(t)) out.push('lit');
  if (/\((?:alternate weapon|off[- ]hand)[^)]*\)/i.test(t)) out.push('alternate weapon');
  if (/\bpartly eaten\b/i.test(t.split('(')[0])) out.push('partly eaten');
  const drained = /\b(partly )?drained\b/i.exec(t.split('(')[0]);
  if (drained) out.push(drained[1] ? 'partly drained' : 'drained');
  if (/\bpartly used\b/i.test(t.split('(')[0])) out.push('partly used');
  if (/\bempty\b/i.test(t.split('(')[0])) out.push('empty');
  if (/\(laid by you\)/i.test(t)) out.push('laid by you');
  if (/\bdiluted\b/i.test(t.split('(')[0])) out.push('diluted');
  const tin = /\btins? of (homemade|rotten|pickled|smoked|candied|dried|boiled|broiled|sauteed|deep fried|stir fried|szechuan|french fried|soup made from)\b/i.exec(t.split('(')[0]);
  if (tin) out.push(tin[1].toLowerCase() === 'soup made from' ? 'soup' : tin[1].toLowerCase());
  if (/\bwet towels?\b/i.test(t.split('(')[0])) out.push('wet');
  if (/\((?:tethered weapon|weapon|wielded)[^)]*\)/i.test(t)) {
    out.push(/\(tethered weapon\b/i.test(t) ? 'wielded, tethered' : /\(wielded in other hand\)/i.test(t) ? 'wielded, off hand' : /\(weapon in hands\)/i.test(t) ? 'wielded, two hands' : 'wielded');
  }
  else if (/\(being donned\)/i.test(t)) out.push('putting on');
  else if (/\(being doffed\)/i.test(t)) out.push('taking off');
  else if (/\((?:being worn|worn|on (?:left|right) (?:hand|finger))[^)]*\)/i.test(t)) {
    const hand = /\(on (left|right) (?:hand|finger)/i.exec(t);
    out.push(hand ? `worn, ${hand[1].toLowerCase()} hand` : 'worn');
  }
  else if (/\((?:in quiver|at the ready|quivered)[^)]*\)/i.test(t)) out.push('quivered');
  if (/\((?:[^)]*, )?in use\)/i.test(t)) out.push('in use');
  const leash = /\(attached to ([^)]+)\)/i.exec(t);
  if (leash) out.push(`leashed to ${leash[1]}`);
  if (/\(no charge\)/i.test(t)) out.push('no charge');
  const shop = /\((?:(unpaid|for sale), )?(\d+) zorkmids?( each)?\)/i.exec(t);
  if (shop) out.push(`${shop[1] ? shop[1].toLowerCase() : 'for sale'} ${shop[2]}zm${shop[3] ? ' each' : ''}`);
  const candles = /\((\d+|no) candles? attached\b[^)]*\)/i.exec(t);
  if (candles) out.push(candles[1] === 'no' ? 'no candles' : `${candles[1]} candle${candles[1] === '1' ? '' : 's'}`);
  const held = /\(containing (\d+) items?\)/i.exec(t);
  if (held) out.push(`holds ${held[1]} item${held[1] === '1' ? '' : 's'}`);
  if (/\((?:[^)]*, )?empty(?:,[^)]*)?\)/i.test(t) && !out.includes('empty')) out.push('empty');
  if (/\((?:[^)]*, )?(un)?locked(?:,[^)]*)?\)/i.test(t)) out.push(/\bunlocked\b/i.test(t) ? 'unlocked' : 'locked');
  if (/\((?:[^)]*, )?trapped\)/i.test(t)) out.push('trapped');
  const armour = /\[(-?\d+)\]\s*(?:\(|$)/.exec(t);
  if (armour) out.push(`AC ${armour[1]}`);
  const weight = /\((\d+) aum\)/i.exec(t);
  if (weight) out.push(`${weight[1]} aum`);
  if (/\((?:chained to you|embedded in your skin)\)/i.test(t)) out.push(/chained/i.test(t) ? 'chained to you' : 'embedded');
  return out;
}

// Hover text that spells the marks out, or '' for a bare item: "blessed, enchanted up, worn".
export function itemHint(text) {
  const parts = [itemBuc(text), {plus: 'enchanted up', minus: 'enchanted down'}[itemEnchant(text)], ...itemFacts(text)];
  return parts.filter(Boolean).join(', ');
}
