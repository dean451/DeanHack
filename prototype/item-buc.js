// Once an item's blessed or cursed state is known, the engine's item name says so ("a blessed +1
// dagger", "2 cursed potions of sleeping"). The pack shows it with a shape as well as a tint, so it
// does not rely on colour alone. Uncursed stays bare to keep the list quiet.

const MARKS = {blessed: '☼', cursed: '✖'};

// 'blessed', 'cursed' or null for an item line. Only the words before the item's own name count, and
// "uncursed" is not "cursed".
export function itemBuc(text) {
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
  const state = /\b(very |thoroughly )?(rusty|corroded|burnt|rotted)\b/i.exec(t.split('(')[0]);
  if (state) out.push(state[0].toLowerCase());
  if (/\b(rustproof|fireproof|rotproof|corrodeproof|erodeproof)\b/i.test(t.split('(')[0])) out.push('proofed');
  if (/\bpoisoned\b/i.test(t.split('(')[0])) out.push('poisoned');
  if (/\bgreased\b/i.test(t.split('(')[0])) out.push('greased');
  const charges = /\((-?\d+):(-?\d+)\)/.exec(t);
  if (charges) out.push(`${charges[2]} charges`);
  if (/\((?:[^)]*, )?lit\)/i.test(t)) out.push('lit');
  if (/\((?:alternate weapon|off[- ]hand)[^)]*\)/i.test(t)) out.push('alternate weapon');
  if (/\bpartly eaten\b/i.test(t.split('(')[0])) out.push('partly eaten');
  if (/\bpartly used\b/i.test(t.split('(')[0])) out.push('partly used');
  if (/\bempty tins?\b/i.test(t.split('(')[0])) out.push('empty');
  if (/\(laid by you\)/i.test(t)) out.push('laid by you');
  if (/\bdiluted\b/i.test(t.split('(')[0])) out.push('diluted');
  if (/\((?:tethered weapon|weapon|wielded)[^)]*\)/i.test(t)) out.push(/\(tethered weapon\b/i.test(t) ? 'wielded, tethered' : 'wielded');
  else if (/\((?:being worn|worn|on (?:left|right) (?:hand|finger))[^)]*\)/i.test(t)) out.push('worn');
  else if (/\(in quiver[^)]*\)/i.test(t)) out.push('quivered');
  const shop = /\((unpaid|for sale), (\d+) zorkmids?\)/i.exec(t);
  if (shop) out.push(`${shop[1].toLowerCase()} ${shop[2]}zm`);
  const candles = /\((\d+|no) candles? attached\b[^)]*\)/i.exec(t);
  if (candles) out.push(candles[1] === 'no' ? 'no candles' : `${candles[1]} candle${candles[1] === '1' ? '' : 's'}`);
  if (/\((?:chained to you|embedded in your skin)\)/i.test(t)) out.push(/chained/i.test(t) ? 'chained to you' : 'embedded');
  return out;
}

// Hover text that spells the marks out, or '' for a bare item: "blessed, enchanted up, worn".
export function itemHint(text) {
  const parts = [itemBuc(text), {plus: 'enchanted up', minus: 'enchanted down'}[itemEnchant(text)], ...itemFacts(text)];
  return parts.filter(Boolean).join(', ');
}
