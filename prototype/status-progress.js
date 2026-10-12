// How far along a deadly countdown is, from 0 (just begun) to 1 (about to kill). The engine's status line
// only names the condition, so the turn it first appeared on is remembered and the turns since are counted
// against the usual length of that countdown (NetHack: stoning 5, sliming 10, strangling 5, sickness about 15).
const COUNTDOWNS = {stone: 5, slime: 10, strngl: 6, foodpois: 15, ill: 15, termill: 15};
// When the bridge sends the real turns left (`player.countdowns`: stone, slime, strngl, sick), progress is
// 1 - left/length. Stoning, sliming and strangling always start at the same length; sickness starts at a
// Con-based roll, so its length is the largest value seen since it began.
const COUNTDOWN_KEY = {stone: 'stone', slime: 'slime', strngl: 'strngl', foodpois: 'sick', ill: 'sick', termill: 'sick'};
const FIXED_LENGTH = {stone: 5, slime: 10, strngl: 6};

export function createStatusProgress() {
  const since = new Map(), longest = new Map();
  return {
    // conditions: words from the status line; turn: its T: value; countdowns: the bridge's turns left, if any.
    // Returns {word: progress} for the deadly ones.
    update(conditions, turn, countdowns = null) {
      const out = {};
      const present = new Set();
      for (const c of conditions || []) {
        const key = String(c).toLowerCase();
        if (!COUNTDOWNS[key]) continue;
        present.add(key);
        const ck = COUNTDOWN_KEY[key], left = countdowns && Number.isFinite(countdowns[ck]) ? Math.max(0, countdowns[ck]) : null;
        if (left !== null) {
          const length = FIXED_LENGTH[ck] ?? Math.max(left, longest.get(ck) ?? 0);
          longest.set(ck, length);
          out[key] = Math.min(1, Math.max(0, 1 - left / Math.max(1, length)));
          continue;
        }
        if (!since.has(key)) since.set(key, turn);
        const p = (turn - since.get(key) + 1) / COUNTDOWNS[key];
        out[key] = Math.min(1, Math.max(0, p));
      }
      for (const key of [...since.keys()]) if (!present.has(key)) since.delete(key);
      for (const ck of [...longest.keys()]) if (![...present].some(k => COUNTDOWN_KEY[k] === ck)) longest.delete(ck);
      return out;
    },
  };
}

// The furthest-along countdown, as the single number the screen treatment leans on (0 when none).
export function worstProgress(progress) {
  return Math.max(0, ...Object.values(progress || {}));
}
