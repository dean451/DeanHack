// Small textures shared by the magic-square effects (portal-fx.js, vibrating-square.js,
// elbereth-ward.js, throne-vanish.js). Each is made once and never disposed, like the mist's.
// Text textures need a canvas; without a document (node tests) they fall back to the soft dot,
// so every module still builds and animates headless.

let dot = null, ring = null, fade = null;
const texts = new Map();

function data(THREE, n, alpha) {
  const d = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * 2 - 1, y = (j + .5) / n * 2 - 1, k = (i + j * n) * 4;
    d[k] = d[k + 1] = d[k + 2] = 255;
    d[k + 3] = Math.round(255 * Math.max(0, Math.min(1, alpha(x, y))));
  }
  const t = new THREE.DataTexture(d, n, n);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// A soft round glow, bright in the middle.
export function softDot(THREE) {
  return dot ??= data(THREE, 32, (x, y) => { const f = Math.max(0, 1 - Math.hypot(x, y)); return f * f; });
}

// A thin soft ring (for shockwaves and ripples).
export function softRing(THREE) {
  return ring ??= data(THREE, 64, (x, y) => { const r = Math.hypot(x, y); return Math.max(0, 1 - Math.abs(r - .86) / .12) * (r < 1 ? 1 : 0); });
}

// Opaque at the bottom (v=0), fading out towards the top: for columns of light.
export function upFade(THREE) {
  return fade ??= data(THREE, 32, (x, y) => { const v = (y + 1) / 2, e = 1 - Math.abs(x) ** 4; return (1 - v) ** 1.6 * e; });
}

// White text on transparent, for tinting with a material colour. `draw(ctx, w, h)` may paint
// something other than a single string (the Elbereth ring). Cached by key.
export function textTexture(THREE, key, draw, size = 128) {
  if (texts.has(key)) return texts.get(key);
  let t;
  if (typeof document === 'undefined') t = softDot(THREE);
  else {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = ctx.strokeStyle = '#fff';
    draw(ctx, size, size);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
  }
  texts.set(key, t);
  return t;
}

// A single glyph or word, centred.
export function glyphTexture(THREE, text, font = 'bold 84px Georgia, serif', size = 128) {
  return textTexture(THREE, `glyph:${text}:${font}`, (ctx, w, h) => {
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#fff'; ctx.shadowBlur = size / 16;
    ctx.fillText(text, w / 2, h / 2);
  }, size);
}

export const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
export const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
export function rng(seed) {
  let s = (seed * 2654435761 >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
