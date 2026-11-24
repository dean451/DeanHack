// What a public splash needs besides the game (deploy/PUBLISH.md):
// - Credits and licences: who made what the page ships, under which licence, with the source link and the
//   NetHack General Public License (served as /LICENSE-NETHACK.txt, a verbatim copy of dat/license).
// - A keyboard notice: DeanHack is played from the keyboard, so a touch-only device is told so on the splash
//   instead of reaching a game it cannot move in.
// - The keys card: the first time a browser lands in a game, a small card names the keys a newcomer needs.
//   It never takes a keypress: it closes on its own button, on Escape, or after a while, and shows once.
// start-screen.js wires all three in.

export const SOURCE_URL = 'https://github.com/dean451/DeanHack';
export const LICENSE_URL = '/LICENSE-NETHACK.txt';
export const PRIVACY_URL = '/privacy.html'; // what the server and browser keep (public/privacy.html)
export const KEYS_SEEN = 'deanhack.keysSeen';
export const KEYS_MS = 45000;

// [what, who, licence, link] for everything the page ships that we did not make
export const CREDITS = [
  ['NetHack', 'the NetHack DevTeam', 'NetHack General Public License', 'https://www.nethack.org/'],
  ['UnNetHack', 'the UnNetHack team', 'NetHack General Public License', 'https://github.com/UnNetHack/UnNetHack'],
  ['three.js', 'the three.js authors', 'MIT', 'https://threejs.org/'],
  ['meshoptimizer', 'Arseny Kapoulkine', 'MIT', 'https://github.com/zeux/meshoptimizer'],
  ['Fox model', 'PixelMannen (CC0); glTF conversion by @AsoboStudio and @scurest', 'CC0 1.0 / CC BY 4.0', 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox'],
  ['Almendra, Cinzel, Cormorant Garamond, IM Fell English, Inter, Pirata One', 'their designers, via Google Fonts', 'SIL Open Font License', 'https://fonts.google.com/'],
  ['English Towne', 'Dieter Steffmann', 'freeware font', 'https://www.1001fonts.com/users/steffmann/'],
];

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const link = (href, text) => `<a class="start-link" href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>`;

export function creditsHtml() {
  return `<div class="start-about"><p>DeanHack is a free, open-source fork of ${link('https://github.com/UnNetHack/UnNetHack', 'UnNetHack')}, itself a variant of ${link('https://www.nethack.org/', 'NetHack')}. Its source is on ${link(SOURCE_URL, 'GitHub')}, under the ${link(LICENSE_URL, 'NetHack General Public License')}. It is not affiliated with the NetHack DevTeam. It comes with no warranty. ${link(PRIVACY_URL, 'What it keeps about you')}.</p>
<ul>${CREDITS.map(([what, who, lic, href]) => `<li><b>${link(href, what)}</b> <span>${esc(who)}</span> <i>${esc(lic)}</i></li>`).join('')}</ul></div>`;
}

// The Credits toggle beside the leaderboard: fills its box once, opens and closes it.
export function installCredits({button, box}) {
  if (!button || !box) return null;
  button.addEventListener('click', () => {
    if (!box.innerHTML) box.innerHTML = creditsHtml();
    box.hidden = !box.hidden;button.setAttribute('aria-expanded', String(!box.hidden));
  });
  return {button, box};
}

// A touch-only device: no hover and a coarse pointer, and no fine pointer anywhere (a tablet with a trackpad
// or keyboard cover reports one and may play).
export function touchOnly(win) {
  const mq = q => { try { return !!win?.matchMedia?.(q)?.matches; } catch { return false; } };
  return mq('(hover: none) and (pointer: coarse)') && !mq('(any-pointer: fine)');
}
export const KEYBOARD_NOTE = 'DeanHack is played with a keyboard. Come back on a computer to explore the dungeon.';

// A game that could not start goes back to the splash with the server's own reason: "The dungeon is full right
// now. Try again in a few minutes." when every engine slot is taken (engine/server.js, DEANHACK_MAX_ENGINES), or
// whatever else went wrong. A local checkout with no engine built is told how to build one.
export function startFailedNote(message) {
  const m = String(message ?? '').trim() || 'The game could not start.';
  if (/dungeon is full/i.test(m)) return m;
  if (/manifest|ENOENT|engine:build|not built/i.test(m)) return `The game could not start: ${m}. On a local checkout, run npm run engine:build first.`;
  return `The game could not start: ${m}`;
}

// The essential keys, NetHack's own: [keys, what they do]
export const KEYS = [
  ['h j k l', 'move west, south, north, east'],
  ['y u b n', 'move diagonally'],
  [',', 'pick up'],
  ['i', 'inventory'],
  ['s', 'search'],
  ['< >', 'go up or down stairs'],
  ['.', 'rest a turn'],
  ['?', 'help, and every other command'],
];

export function keysHtml() {
  return `<div class="keys-card" role="note" aria-label="Keys"><b>Keys</b><dl>${KEYS.map(([k, w]) => `<dt>${esc(k)}</dt><dd>${esc(w)}</dd>`).join('')}</dl><p>Save &amp; quit is at the bottom of the screen.</p><button type="button" class="keys-close" aria-label="Close">Got it</button></div>`;
}

// Shows the keys card the first time this browser lands in a game; never again once seen.
export function createKeysCard({doc = document, storage, ms = KEYS_MS} = {}) {
  const store = storage ?? (() => { try { return localStorage; } catch { return null; } })();
  const seen = () => { try { return store?.getItem(KEYS_SEEN) === '1'; } catch { return false; } };
  let card = null, timer = null;
  const win = doc.defaultView;
  const onKey = e => { if (e.key === 'Escape') close(); };
  function close() {
    if (!card) return;
    card.remove();card = null;
    if (timer) { win?.clearTimeout?.(timer);timer = null; }
    doc.removeEventListener?.('keydown', onKey, true);
  }
  return {
    get open() { return !!card; },
    show() {
      if (card || seen()) return false;
      try { store?.setItem(KEYS_SEEN, '1'); } catch {}
      const wrap = doc.createElement('div');wrap.innerHTML = keysHtml();card = wrap.firstElementChild;
      card.querySelector('.keys-close')?.addEventListener('click', close);
      doc.body.append(card);
      doc.addEventListener?.('keydown', onKey, true); // capture: the game's own key handler stops the key; this only looks, never takes it
      timer = win?.setTimeout?.(close, ms) ?? null;
      return true;
    },
    close,
  };
}
