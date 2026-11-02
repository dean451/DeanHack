// The death recap. When a game ends, NetHack asks whether to show what the hero had, identified, then their
// attributes, the conduct kept, the monsters vanquished and the species genocided, each a window to page through.
// Here the client answers yes to each of those end-of-game questions itself, keeps every window's text under its
// heading instead of making the player click through them one by one, and the splash lays the whole recap out under
// the tombstone. Only those end-of-game questions are answered (they start the recap); anything else is left to
// the player, and the recap closes when the game ends.
const ASKS = [
  [/^Do you want (to see what you had when you|your possessions identified)/, 'Possessions'],
  [/^Do you want to see your attributes/, 'Attributes'],
  [/^Do you want to see your conduct/, 'Conduct'],
  [/^Do you want an account of creatures vanquished/, 'Vanquished'],
  [/^Do you want a list of species genocided/, 'Genocided'],
];
const Y = 121, ENTER = 13;
export const recapAsk = prompt => { for (const [re, title] of ASKS) if (re.test(String(prompt || ''))) return title; return null; };

export function createDeathRecap() {
  let on = false, title = null, sections = [];
  const keep = lines => { const text = lines.map(l => String(l ?? '')).filter(l => l.trim()); if (text.length) sections.push({title: title ?? 'More', lines: text}); };
  return {
    get collecting() { return on; },
    // A request from the engine; returns the reply to send for it, or null to leave it to the player.
    answer(req, menu, lines) {
      if (req?.type !== 'request') return null;
      const asked = req.kind === 'key' ? recapAsk(req.prompt) : null;
      if (asked) { on = true;title = asked;return Y; }
      if (!on) return null;
      if (req.kind === 'menu' && menu?.items) { keep(menu.items.map(i => i.text));return '!'; }
      if (req.kind === 'more') { if (lines?.length) keep(lines);return ENTER; }
      return null;
    },
    // The recap gathered so far, and done with.
    take() { const out = sections;sections = [];on = false;title = null;return out; },
  };
}
