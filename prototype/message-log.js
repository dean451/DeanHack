// The message history behind the live panel. The panel shows the newest message on its own line
// and the few before it beneath; this keeps everything else (a long run of messages, a burst
// that arrives in one turn) so nothing is lost, and folds an unbroken repeat into one entry
// ("You miss. (x3)") instead of letting it push the real news out of view.

export const HISTORY_LIMIT = 200;   // entries kept, newest first
export const VISIBLE = 6;           // earlier messages drawn under the newest in the panel

export function createMessageLog(limit = HISTORY_LIMIT) {
  return {limit, entries: []};
}

// Add a message. Returns the entry it landed in (a repeat bumps the existing newest entry).
export function addMessage(log, text) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  const newest = log.entries[0];
  if (newest && newest.text === t) {
    newest.count += 1;
    return newest;
  }
  const entry = {text: t, count: 1};
  log.entries.unshift(entry);
  if (log.entries.length > log.limit) log.entries.length = log.limit;
  return entry;
}

export function entryText(entry) {
  return entry.count > 1 ? `${entry.text} (x${entry.count})` : entry.text;
}

// What the panel draws: the newest entry for the main line, then up to `visible` before it.
export function panelView(log, visible = VISIBLE) {
  const [newest, ...rest] = log.entries;
  return {line: newest ? entryText(newest) : '', earlier: rest.slice(0, visible).map(entryText)};
}

// The whole history as lines, newest first, for a message-history view.
export function allLines(log) {
  return log.entries.map(entryText);
}
