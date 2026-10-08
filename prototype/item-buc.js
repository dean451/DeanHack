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
