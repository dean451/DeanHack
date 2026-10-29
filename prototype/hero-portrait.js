// The hero portrait: a small framed head-and-shoulders picture of the player's own hero in the
// character panel, beside the hitpoints, in the manner of the old isometric RPG portraits.
//
// It is the live model, not a picture: the hero's own group (class kit, gender, helmet, held
// weapon, polymorph stand-in) is drawn by a second camera into a small render target, a few times
// a second (PORTRAIT_INTERVAL_MS by quality tier), and sooner when the hitpoints stage, the
// conditions or the kit change. Drawing borrows the hero for the length of one render: the group
// is moved into the portrait's own little scene (its own three lights, no fog, nothing else), then
// put back where it was, so the main scene gains no lights and no copy of the hero. The pixels come
// back through an asynchronous read (no pipeline stall) and are painted onto a 2D canvas.
//
// Everything the portrait says about the hero's state is drawn over that canvas by the HUD
// (style.css, #hero-portrait): the frame rusts and the glass cracks in stages as hitpoints fall,
// conditions show as small glyph marks and treatments (a blindfold, a sickly tint, stone grey),
// and at death the picture freezes, drained of colour, fully cracked, in a dulled frame.
import {LOW_HP} from './hud.js';
import {conditionTags} from './hud-conditions.js';
import {conditionGlyph} from './condition-glyph.js';

// Milliseconds between refreshes with nothing changed: the hero breathes and her cape sways, so
// the picture stays alive, but it never costs a render per frame.
export const PORTRAIT_INTERVAL_MS = {high: 200, balanced: 250, low: 500};
// However fast things change (a flurry of blows), renders stay at least this far apart.
export const PORTRAIT_MIN_GAP_MS = 80;
// The portrait's size on screen in CSS pixels (style.css matches); drawn at up to twice that.
export const PORTRAIT_CSS = {w: 64, h: 80};
// At most this many condition marks on the frame; the panel's tags list them all.
export const PORTRAIT_MARKS = 4;

// How battered the portrait looks: 0 whole, 1 scuffed (under three quarters), 2 cracked and
// tinted red (the panel's own low-hitpoints threshold), 3 shattered (under 15%).
export function hpStage(hp, maxhp) {
  if (!(maxhp > 0)) return 0;
  const f = hp / maxhp;
  if (f < .15) return 3;
  if (f < LOW_HP) return 2;
  if (f < .75) return 1;
  return 0;
}

// Conditions that change the picture itself, not only add a mark.
const TREATMENTS = {
  BLIND: 'blind', CONF: 'conf', STUN: 'stun', HALLU: 'hallu', ILL: 'ill', SLIME: 'slime',
  STONE: 'stone', STRANGLED: 'strangled', WEAK: 'gaunt', FAINTING: 'gaunt', FAINTED: 'gaunt',
};
const MILD = new Set(['HUNGRY', 'SATIATED', 'DEAF']);

// What the portrait shows for a hero state: the damage stage, the treatments, the marks (glyph and
// tag, amber for the mild ones as in the panel) and a key that changes whenever any of it does.
export function portraitLook({hp = 1, maxhp = 1, conditions = [], dead = false} = {}) {
  const words = {};
  for (const c of conditions || []) { const tag = conditionTags([c])[0]; if (tag && !words[tag]) words[tag] = c; }
  const tags = conditionTags(conditions);
  const stage = dead ? 3 : hpStage(hp, maxhp);
  const treatments = dead ? [] : [...new Set(tags.map(t => TREATMENTS[t]).filter(Boolean))];
  const marks = dead ? [] : tags.slice(0, PORTRAIT_MARKS).map(tag => ({tag, glyph: conditionGlyph(words[tag]), mild: MILD.has(tag)}));
  const more = dead ? 0 : Math.max(0, tags.length - PORTRAIT_MARKS);
  const key = `${dead ? 'dead' : stage}|${treatments.join(',')}|${tags.join(',')}`;
  return {stage, dead: !!dead, treatments, marks, more, key};
}

// When to draw: at once when the key changes, else once per interval, never closer than minGap.
export function createRefreshGate({minGap = PORTRAIT_MIN_GAP_MS} = {}) {
  let last = -Infinity, lastKey = null;
  return {
    due(now, key, interval) {
      if (now - last < minGap) return false;
      return key !== lastKey || now - last >= interval;
    },
    mark(now, key) { last = now; lastKey = key; },
    get last() { return last; },
  };
}

// Crack lines over the glass, drawn in a 64 x 80 box; each stage adds its own set to the last.
const CRACKS = [
  // stage 1: a hairline from the top-right corner
  ['M64 6 L55 13 L57 19 L49 26', 'M55 13 L60 21'],
  // stage 2: a break across the lower left, a spur off the first
  ['M0 58 L9 54 L14 59 L23 52 L27 56', 'M9 54 L7 47', 'M49 26 L44 35 L47 41', 'M14 59 L16 67'],
  // stage 3: shattered from a strike point by the jaw
  ['M38 62 L30 70 L33 80', 'M38 62 L47 66 L52 80', 'M38 62 L44 52 L42 44', 'M38 62 L26 60 L20 66', 'M38 62 L55 58 L64 61', 'M44 52 L52 49'],
];

// The portrait's DOM, inside the character panel. Returns the view the controller paints on.
export function mountPortraitView(doc, parent) {
  const root = doc.createElement('div');
  root.id = 'hero-portrait';
  root.setAttribute('aria-hidden', 'true');
  const paths = CRACKS.map((set, i) => set.map(d => `<path class="crack-${i + 1}" d="${d}"/>`).join('')).join('');
  root.innerHTML = `<div class="portrait-frame"><div class="portrait-well"><canvas></canvas><i class="portrait-blindfold"></i><i class="portrait-tint"></i><svg class="portrait-cracks" viewBox="0 0 64 80" preserveAspectRatio="none">${paths}</svg></div></div><div class="portrait-marks"></div>`;
  // beside the hitpoints: before the HITPOINTS row, so it floats next to the total, the bar and the stats
  const health = parent.querySelector('.health');
  if (health) parent.insertBefore(root, health); else parent.prepend(root);
  const canvas = root.querySelector('canvas'), marks = root.querySelector('.portrait-marks');
  const ctx = canvas.getContext('2d');
  let image = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  return {
    root, canvas,
    // Pixels as rendered: rows bottom-up, so they are flipped on the way into the canvas.
    size() { const r = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1)); return {w: Math.round(PORTRAIT_CSS.w * r), h: Math.round(PORTRAIT_CSS.h * r)}; },
    visible() { return !doc.hidden && root.getClientRects().length > 0; },
    draw(pixels, w, h) {
      if (canvas.width !== w || canvas.height !== h || !image) { canvas.width = w; canvas.height = h; image = ctx.createImageData(w, h); }
      const row = w * 4;
      for (let y = 0; y < h; y++) image.data.set(pixels.subarray((h - 1 - y) * row, (h - y) * row), y * row);
      ctx.putImageData(image, 0, 0);
    },
    setLook(look) {
      root.className = [`stage-${look.stage}`, look.dead && 'dead', ...look.treatments.map(t => `t-${t}`)].filter(Boolean).join(' ');
      marks.innerHTML = look.marks.map(m => `<span class="${m.mild ? 'mild' : ''}" title="${esc(m.tag)}">${esc(m.glyph)}</span>`).join('') + (look.more ? `<span class="more">+${look.more}</span>` : '');
    },
  };
}

// The renderer side. `view` is mountPortraitView's (or a test's stand-in). Call update every frame;
// it decides whether this frame draws. `subject` is {g, head, shape, kit, hp, maxhp, conditions, dead}
// or null (no hero to show yet).
export function createHeroPortrait({THREE, renderer, view, fov = 26}) {
  const {w, h} = view.size();
  const target = new THREE.WebGLRenderTarget(w, h, {samples: 4, colorSpace: THREE.SRGBColorSpace});
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, w / h, .05, 20);
  // Studio light for a portrait: a cool fill from above, a warm key from the front left, and a cold
  // rim behind the far shoulder that cuts the silhouette out of the dark well.
  const fill = new THREE.HemisphereLight(0x9fb2bf, 0x241a12, 1.1);
  const key = new THREE.DirectionalLight(0xffd2a0, 2.6), rim = new THREE.DirectionalLight(0x86b4d8, 2.2);
  const aim = new THREE.Object3D();
  key.target = aim; rim.target = aim;
  scene.add(fill, key, rim, aim);
  const pixels = new Uint8Array(w * h * 4);
  const gate = createRefreshGate();
  const v = new THREE.Vector3(), dir = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), quat = new THREE.Quaternion(), box = new THREE.Box3(), clear = new THREE.Color();
  let shownKey = null, identity = null, warming = false, pending = false, drawn = false, renders = 0;

  // Move the hero into the portrait scene for the length of `fn`, then back to the same place among
  // its parent's children, with no added/removed events (nothing else should notice).
  function borrow(g, fn) {
    const parent = g.parent, at = parent ? parent.children.indexOf(g) : -1;
    if (parent) parent.children.splice(at, 1);
    g.parent = scene; scene.children.push(g);
    try { return fn(); } finally {
      scene.children.splice(scene.children.indexOf(g), 1);
      g.parent = parent;
      if (parent) { parent.children.splice(at, 0, g); g.updateMatrixWorld(true); }
    }
  }

  // Head and shoulders, three-quarter view from the hero's front left, lights following the camera.
  function frame(subject) {
    const g = subject.g;
    scene.updateMatrixWorld();
    let height;
    if (subject.shape) {
      // polymorphed: frame the top of the stand-in, whatever its shape
      box.setFromObject(subject.shape);
      const size = box.getSize(dir);
      v.set((box.min.x + box.max.x) / 2, box.max.y - size.y * .3, (box.min.z + box.max.z) / 2);
      height = Math.max(.45, size.y * .62);
    } else {
      (subject.head || g).getWorldPosition(v);
      if (!subject.head) v.y += 1.15;
      // the head joint sits at the jaw: framed there, the eyes land about two fifths down
      height = .75;
    }
    g.getWorldQuaternion(quat);
    dir.set(Math.sin(-.42), .12, Math.cos(-.42)).normalize().applyQuaternion(quat);
    const dist = height / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    camera.position.copy(v).addScaledVector(dir, dist);
    camera.lookAt(v);
    camera.updateMatrixWorld();
    aim.position.copy(v);
    right.crossVectors(dir, up).normalize();
    key.position.copy(v).addScaledVector(dir, 1.6).addScaledVector(right, 1.2).addScaledVector(up, 1.3);
    rim.position.copy(v).addScaledVector(dir, -1.6).addScaledVector(right, -1.3).addScaledVector(up, .7);
    scene.updateMatrixWorld();
  }

  function draw(subject) {
    const prev = renderer.getRenderTarget(), alpha = renderer.getClearAlpha(), shadowDue = renderer.shadowMap?.needsUpdate;
    renderer.getClearColor(clear);
    try {
      borrow(subject.g, () => {
        frame(subject);
        renderer.setRenderTarget(target);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(scene, camera);
      });
    } finally {
      renderer.setRenderTarget(prev);
      renderer.setClearColor(clear, alpha);
      if (renderer.shadowMap) renderer.shadowMap.needsUpdate = shadowDue;
    }
    renders++;
    pending = true;
    const done = () => { pending = false; };
    const shown = () => { view.draw(pixels, w, h); drawn = true; };
    if (renderer.readRenderTargetPixelsAsync) {
      Promise.resolve(renderer.readRenderTargetPixelsAsync(target, 0, 0, w, h, pixels)).then(shown, () => {}).then(done);
    } else { renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels); shown(); done(); }
  }

  // A new kit or form brings materials the portrait's light set has not compiled yet: compile them
  // off the frame (compileAsync) before the first draw, instead of stalling that frame.
  function warm(subject) {
    if (!renderer.compileAsync) return;
    warming = true;
    const prev = renderer.getRenderTarget();
    let job;
    try {
      job = borrow(subject.g, () => { frame(subject); renderer.setRenderTarget(target); return renderer.compileAsync(scene, camera); });
    } catch { job = null; } finally { renderer.setRenderTarget(prev); }
    Promise.resolve(job).catch(() => {}).then(() => { warming = false; });
  }

  return {
    get renders() { return renders; },
    get look() { return shownKey; },
    get size() { return {w, h}; },
    get state() { return {warming, pending, drawn, identity}; },
    update(now, subject, {interval = PORTRAIT_INTERVAL_MS.balanced} = {}) {
      if (!subject?.g) return false;
      const look = portraitLook(subject);
      if (look.key !== shownKey) { shownKey = look.key; view.setLook(look); }
      if (!view.visible()) return false;
      // At death the picture freezes on the last living frame.
      if (look.dead && drawn) return false;
      if (!subject.g.visible) return false;
      const id = `${subject.kit || ''}|${subject.shape?.uuid || ''}`;
      if (id !== identity) { identity = id; warm(subject); }
      if (warming || pending) return false;
      const k = `${id}|${look.key}`;
      if (!gate.due(now, k, interval)) return false;
      gate.mark(now, k);
      draw(subject);
      return true;
    },
    dispose() { target.dispose(); view.root?.remove?.(); },
  };
}
