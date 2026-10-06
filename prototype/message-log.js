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

// A message's tone, for colour and a marker that does not depend on colour. First match wins,
// so a warning outranks the damage it comes with.
const TONES = [
  ['warning', /\b(hungry|weak from|faint|starv|burdened|stressed|strained|overtaxed|overloaded|trap|beware|careful|you cannot|you can't|confus|stunned|blind|nauseated|sick|poisoned|drown|choke|strangle|you die|you are slowing|vomit|low on|danger)\w*\b/i],
  ['damage', /\b(hits?|bites?|stings?|claws?|kicks?|butts?|whips?|slash(?:es)?|pierc|stabs?|misses you|touch(?:es)? you|burns?|freez|shock|bleed|wound|kill|destroy|slay|damage|explod|blast|crush|smash|swings?|thrusts?|shoots?|hurl|fires?)\w*\b/i],
  ['magic', /\b(zap|wands?(?![a-z])|spell|casts?|glow|shimmer|sparkl|magic|enchant|polymorph|teleport|aura|bless|curse|pray|prayer|vibrat|mana|energy|your .* (?:is|are) surrounded|you feel)\w*\b/i],
  ['pickup', /^[A-Za-z$] - |\b(you (?:pick up|now have|see here|find)|picks? up|there (?:is|are) .* here)\w*\b/i],
];
export function messageTone(text) {
  const t = String(text ?? '');
  for (const [tone, re] of TONES) if (re.test(t)) return tone;
  return 'plain';
}

export function entryText(entry) {
  return entry.count > 1 ? `${entry.text} (x${entry.count})` : entry.text;
}

// What the panel draws: the newest entry for the main line, then up to `visible` before it.
export function panelView(log, visible = VISIBLE) {
  const [newest, ...rest] = log.entries;
  const shown = rest.slice(0, visible);
  return {
    line: newest ? entryText(newest) : '', lineTone: newest ? messageTone(newest.text) : 'plain',
    earlier: shown.map(entryText), earlierTones: shown.map(e => messageTone(e.text)),
  };
}

// The whole history as lines, newest first, for a message-history view.
export function allLines(log) {
  return log.entries.map(entryText);
}

// The same, with each line's tone.
export function allRows(log) {
  return log.entries.map(e => ({text: entryText(e), tone: messageTone(e.text)}));
}
