// The death beat (AGENTS "Death sequence"): the splash used to open the instant the engine
// said the game was over, so the hero vanished mid-step. Now the `tombstone` event drops her
// where she stands (the die action, the same topple a monster plays), her bones are left on
// that cell once the fall has finished, and the REST IN PEACE card waits a moment on the body
// before it takes the screen. The card gets an epitaph, a line picked by the name and cause
// so the same character always gets the same one. The body dissolves into the bones rather
// than cutting to them (BONES_FADE_MS).
import {DEATH_TIME} from './deaths.js';

// Milliseconds the camera rests on the body after the fall, before the splash.
export const DEATH_PAUSE_MS = 1800;
// Milliseconds the fallen hero takes to dissolve into her bones once the fall has ended: the
// body fades out as the corpse fades in on the same cell, instead of a cut from one to the other.
export const BONES_FADE_MS = 700;

// How long the whole beat lasts for a death style: the fall, then the pause.
export function deathBeatMs(style = 'topple') {
  return Math.round((DEATH_TIME[style] ?? DEATH_TIME.topple) * 1000) + DEATH_PAUSE_MS;
}

// Tracks one death from the tombstone to the splash. `begin(now)` marks the fall's start,
// `remainingMs(now)` is how long the splash still has to wait, and `corpseDue(finished)` is
// true once, when the fall has played out and the bones should be laid (`finished` is the
// action queue's flag). `crossfade(now)` then runs 0..1 over BONES_FADE_MS from that moment
// (0 before the bones are laid): how far the body has gone and the bones have come.
// `clear()` forgets it all for the next game.
export function createDeathBeat({pause = DEATH_PAUSE_MS, fade = BONES_FADE_MS} = {}) {
  let startedAt = null, fallMs = 0, laid = false, laidAt = null;
  return {
    begin(now, style = 'topple') {
      if (startedAt !== null) return false;
      startedAt = now; fallMs = Math.round((DEATH_TIME[style] ?? DEATH_TIME.topple) * 1000); laid = false; laidAt = null;
      return true;
    },
    get active() { return startedAt !== null; },
    remainingMs(now) { return startedAt === null ? 0 : Math.max(0, startedAt + fallMs + pause - now); },
    corpseDue(finished, now = startedAt + fallMs) {
      if (startedAt === null || laid || !finished) return false;
      laid = true; laidAt = now; return true;
    },
    crossfade(now) { return laidAt === null ? 0 : fade <= 0 ? 1 : Math.min(1, Math.max(0, (now - laidAt) / fade)); },
    clear() { startedAt = null; fallMs = 0; laid = false; laidAt = null; },
  };
}

// Epitaphs, in the dungeon's own dry voice. None names a gender or a role.
export const EPITAPHS = [
  'Came for the Amulet. Stayed for the floor.',
  'The stairs went down. So did the hero.',
  'Not the first to lie here. Not the last.',
  'Ate well. Slept badly. Died quickly.',
  'Took one step too many in the dark.',
  'The dungeon was not impressed.',
  'Left a lamp burning somewhere upstairs.',
  'Had a plan. The dungeon had another.',
  'Found out what was behind the door.',
  'Still owes the shopkeeper.',
  'Prayed once too often, or once too late.',
  'Should have read the scroll first.',
];

const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };

// A line for the card, fixed for a given name and cause. Some causes earn a fitting line.
export function epitaph(tomb) {
  if (!tomb) return '';
  const k = String(tomb.killer || '').toLowerCase();
  if (/starv|hunger/.test(k)) return 'Ate well. Slept badly. Died quickly.';
  if (/shopkeeper/.test(k)) return 'Still owes the shopkeeper.';
  if (/\bfell\b|fall|trap ?door|\bpit\b/.test(k)) return 'The stairs went down. So did the hero.';
  if (/poison|rotten|food/.test(k)) return 'Should have read the label first.';
  if (/\bpray|god|priest|angel|minion/.test(k)) return 'Prayed once too often, or once too late.';
  return EPITAPHS[hash(`${tomb.name || ''}|${k}`) % EPITAPHS.length];
}
