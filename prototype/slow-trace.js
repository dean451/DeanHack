// Catches a freeze in the act, on the development server. A rolling JS self-profile (the browser's Profiler API,
// allowed by the Document-Policy header vite.config.js sends) runs in five-second windows; when the main thread
// was blocked for more than SLOW_MS in a window, the functions that took the time are summed from the samples and
// kept, and a small note offers to copy the report, so a hang we cannot reproduce here can be read from the
// player's own machine. Nothing runs where the API is missing (a production build, Safari, Firefox).
export const SLOW_MS = 2000, WINDOW_MS = 5000, SAMPLE_MS = 10, KEY = 'deanhack.freezeReport';

// The functions traces spent their samples in: own time (the top frame) and with callees (anywhere on the
// stack). `range` ({start, end}, ms on the page clock) keeps only the samples taken during the freeze.
export function summarize(traces, top = 25, range = null) {
  const self = new Map(), total = new Map();let count = 0;
  for (const trace of [].concat(traces).filter(Boolean)) tally(trace, range, self, total, () => count++);
  const rank = m => [...m].sort((a, b) => b[1] - a[1]).slice(0, top).map(([fn, n]) => [fn, n * SAMPLE_MS]);
  return {samples: count, self: rank(self), total: rank(total)};
}
function tally(trace, range, self, total, counted) {
  const name = i => { const f = trace.frames[i];if (!f) return '?';const r = trace.resources?.[f.resourceId] ?? '';return `${f.name || '(anonymous)'} ${String(r).split('/').pop().split('?')[0]}:${f.line ?? '?'}`; };
  const stackFrames = id => { const out = [];for (let s = trace.stacks[id]; s; s = s.parentId === undefined ? null : trace.stacks[s.parentId]) out.push(s.frameId); return out; };
  for (const sample of trace.samples) {
    if (range && !(sample.timestamp >= range.start && sample.timestamp <= range.end)) continue;
    counted();
    if (sample.stackId === undefined) continue;
    const frames = stackFrames(sample.stackId);
    if (!frames.length) continue;
    const own = name(frames[0]);self.set(own, (self.get(own) || 0) + 1);
    for (const n of new Set(frames.map(name))) total.set(n, (total.get(n) || 0) + 1);
  }
}

// playing(): only freezes during play are reported (loading the page and the splash are slow by nature).
export function installSlowTrace({win = globalThis, doc = globalThis.document, storage = globalThis.localStorage, enabled = true, actions = [], playing = () => !!doc?.body?.classList.contains('live-engine')} = {}) {
  if (!enabled || typeof win.Profiler !== 'function' || typeof win.PerformanceObserver !== 'function') return null;
  // the long task is often reported only after the window that sampled it has closed (the freeze held up the
  // timer too), so the last window's trace is kept and the samples are picked by the freeze's own time
  let worst = null, profiler = null, previous = null;
  try { new win.PerformanceObserver(list => { for (const e of list.getEntries()) if (playing() && e.duration >= SLOW_MS && (!worst || e.duration > worst.duration)) worst = {start: e.startTime, duration: e.duration}; }).observe({entryTypes: ['longtask']}); } catch { return null; }
  const start = () => { try { profiler = new win.Profiler({sampleInterval: SAMPLE_MS, maxBufferSize: Math.ceil(WINDOW_MS * 4 / SAMPLE_MS)}); } catch { profiler = null; } };
  const note = report => {
    if (!doc?.body) return;
    let el = doc.getElementById('freeze-note');
    if (!el) { el = doc.createElement('div');el.id = 'freeze-note';el.innerHTML = '<span></span><button type="button">Copy freeze report</button><button type="button" aria-label="Dismiss">×</button>';doc.body.append(el); }
    el.querySelector('span').textContent = `The game froze for ${(report.blockedMs / 1000).toFixed(1)} s.`;
    const [copy, close] = el.querySelectorAll('button');
    // more buttons from the caller (main.js: Save replay, so the freeze can be played back)
    for (const {label, run} of actions) if (!el.querySelector(`[data-action="${label}"]`)) { const b = doc.createElement('button');b.type = 'button';b.dataset.action = label;b.textContent = label;b.onclick = run;close.before(b); }
    copy.onclick = () => { win.navigator?.clipboard?.writeText(JSON.stringify(report, null, 1)).then(() => { copy.textContent = 'Copied'; }, () => {}); };
    close.onclick = () => el.remove();
  };
  const cycle = async () => {
    const p = profiler;start();
    if (!p) return;
    let trace;try { trace = await p.stop(); } catch { return; }
    const freeze = worst, older = previous;previous = trace;
    if (!freeze) return;
    worst = null;
    const report = {at: new Date().toISOString(), blockedMs: Math.round(freeze.duration), ...summarize([older, trace], 25, {start: freeze.start - 50, end: freeze.start + freeze.duration + 50})};
    try { storage?.setItem(KEY, JSON.stringify(report)); } catch {}
    win.console?.warn?.('DeanHack froze', report);
    note(report);
  };
  start();
  const timer = win.setInterval(cycle, WINDOW_MS);
  return {stop() { win.clearInterval(timer);profiler?.stop().catch(() => {}); }, cycle};
}
