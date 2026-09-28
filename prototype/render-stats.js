// Render stats readout (F9, or ?stats in the URL). The composer renders the scene
// several times a frame (scene, SSAO normals, bloom, output), and three.js resets
// renderer.info on every render call, so by default it only ever shows the last
// pass. This turns the auto reset off and resets once per frame instead, so the
// numbers are the whole frame's draw calls and triangles.

const SAMPLE_EVERY = .25; // seconds between text refreshes
const COUNT_EVERY = 1; // seconds between scene walks (meshes, materials, lights)

// Walks the scene and counts what drives draw calls: visible meshes, unique
// materials, and shadow-casting lights (each one re-renders its casters).
export function sceneCounts(scene) {
  const materials = new Set();
  const counts = {objects: 0, meshes: 0, instances: 0, materials: 0, lights: 0, shadowLights: 0};
  scene.traverseVisible(object => {
    counts.objects++;
    if (object.isLight) {
      counts.lights++;
      if (object.castShadow) counts.shadowLights++;
    }
    if (!(object.isMesh || object.isPoints || object.isLine || object.isSprite)) return;
    counts.meshes++;
    if (object.isInstancedMesh) counts.instances += object.count;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  counts.materials = materials.size;
  return counts;
}

function compact(n) {
  if (!Number.isFinite(n)) return '–';
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}

export function formatStats(s) {
  const lines = [
    `fps       ${Number.isFinite(s.fps) ? s.fps.toFixed(0) : '–'}  (${Number.isFinite(s.ms) ? s.ms.toFixed(1) : '–'} ms)`,
    `calls     ${compact(s.calls)}`,
    `triangles ${compact(s.triangles)}`,
    `geoms     ${compact(s.geometries)}   textures ${compact(s.textures)}`,
  ];
  if (s.counts) lines.push(
    `meshes    ${compact(s.counts.meshes)}   materials ${compact(s.counts.materials)}`,
    `lights    ${compact(s.counts.lights)}   shadow ${compact(s.counts.shadowLights)}`,
  );
  return lines.join('\n');
}

export function createRenderStats(renderer, scene, {doc = globalThis.document, visible = false} = {}) {
  renderer.info.autoReset = false;
  let panel = null, shown = false, sinceSample = 0, sinceCount = COUNT_EVERY, frames = 0, time = 0, counts = null;
  const last = {calls: 0, triangles: 0, points: 0, lines: 0};
  const summary = {fps: NaN, ms: NaN, calls: 0, triangles: 0, geometries: 0, textures: 0, counts: null};

  function ensurePanel() {
    if (panel || !doc) return panel;
    panel = doc.createElement('pre');
    panel.id = 'render-stats';
    panel.setAttribute('aria-label', 'Render stats');
    Object.assign(panel.style, {position: 'fixed', top: '8px', right: '8px', zIndex: 50, margin: 0, padding: '6px 9px', font: '11px/1.35 ui-monospace, Menlo, monospace', color: '#d8e6c8', background: 'rgba(8,10,12,.78)', border: '1px solid rgba(160,190,140,.35)', borderRadius: '4px', pointerEvents: 'none', whiteSpace: 'pre'});
    doc.body.append(panel);
    return panel;
  }

  function show(on) {
    shown = on;
    if (on) { ensurePanel(); sinceCount = COUNT_EVERY; sinceSample = SAMPLE_EVERY; }
    if (panel) panel.hidden = !on;
  }

  show(visible);
  return {
    get visible() { return shown; },
    toggle() { show(!shown); return shown; },
    show,
    // Call just before the frame's first render.
    begin() { renderer.info.reset(); },
    // Call after the frame's last render.
    end(dt) {
      const r = renderer.info.render;
      last.calls = r.calls; last.triangles = r.triangles; last.points = r.points; last.lines = r.lines;
      if (!shown) return;
      frames++; time += dt; sinceSample += dt; sinceCount += dt;
      if (sinceCount >= COUNT_EVERY) { counts = sceneCounts(scene); sinceCount = 0; }
      if (sinceSample < SAMPLE_EVERY) return;
      summary.fps = time > 0 ? frames / time : NaN;
      summary.ms = frames > 0 ? time * 1000 / frames : NaN;
      summary.calls = last.calls; summary.triangles = last.triangles;
      summary.geometries = renderer.info.memory.geometries; summary.textures = renderer.info.memory.textures;
      summary.counts = counts;
      if (panel) panel.textContent = formatStats(summary);
      frames = 0; time = 0; sinceSample = 0;
    },
    // Whole-frame totals from the last completed frame.
    frame() { return {...last}; },
    summary() { return {...summary, counts: counts && {...counts}}; },
    dispose() { panel?.remove(); panel = null; renderer.info.autoReset = true; },
  };
}
