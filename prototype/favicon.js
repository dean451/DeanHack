// The tab icon turns between crossed swords, a dragon and a shield, one every few seconds.
// Each is an emoji drawn into a tiny SVG, so there are no image files to ship.
export const FAVICONS = ['⚔️', '🐉', '🛡️'];
export const FAVICON_MS = 4000;
export const faviconHref = glyph =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${glyph}</text></svg>`)}`;

export function startFavicon(doc = globalThis.document, {setInterval: every = globalThis.setInterval} = {}) {
  const link = doc?.querySelector?.('link[rel="icon"]');
  if (!link) return null;
  let i = 0;
  link.href = faviconHref(FAVICONS[0]);
  return every(() => { i = (i + 1) % FAVICONS.length; link.href = faviconHref(FAVICONS[i]); }, FAVICON_MS);
}
startFavicon();
