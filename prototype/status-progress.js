// How far along a deadly countdown is, from 0 (just begun) to 1 (about to kill). The engine's status line
// only names the condition, so the turn it first appeared on is remembered and the turns since are counted
// against the usual length of that countdown (NetHack: stoning 5, sliming 10, strangling 5, sickness about 15).
const COUNTDOWNS = {stone: 5, slime: 10, strngl: 5, foodpois: 15, ill: 15, termill: 15};

export function createStatusProgress() {
  const since = new Map();
  return {
    // conditions: words from the status line; turn: its T: value. Returns {word: progress} for the deadly ones.
    update(conditions, turn) {
      const out = {};
      const present = new Set();
      for (const c of conditions || []) {
        const key = String(c).toLowerCase();
        if (!COUNTDOWNS[key]) continue;
        present.add(key);
        if (!since.has(key)) since.set(key, turn);
        const p = (turn - since.get(key) + 1) / COUNTDOWNS[key];
        out[key] = Math.min(1, Math.max(0, p));
      }
      for (const key of [...since.keys()]) if (!present.has(key)) since.delete(key);
      return out;
    },
  };
}

// The furthest-along countdown, as the single number the screen treatment leans on (0 when none).
export function worstProgress(progress) {
  return Math.max(0, ...Object.values(progress || {}));
}
