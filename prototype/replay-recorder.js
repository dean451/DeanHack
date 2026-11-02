// The replay recorder: the last stretch of a live game, kept so a bug seen on the player's machine can be played
// back here, message for message (replay-player.js, ?replay). Every engine message the client handles is kept with
// its time, and every reply the player sends. Frames carry every square the hero knows (hundreds of KB late in a
// game), so most are kept as the squares that changed since the frame before, with a whole frame every KEY_EVERY;
// the oldest entries go first once the record passes its byte cap, and it always starts at a whole frame.
export const REPLAY_VERSION = 1, KEY_EVERY = 100, MAX_BYTES = 24e6;

const cellKey = c => `${c.x},${c.z}`;

export function createRecorder({maxBytes = MAX_BYTES, keyEvery = KEY_EVERY, now = () => performance.now()} = {}) {
  let entries = [], bytes = 0, last = null, sinceKey = 0, enabled = true;
  let base = new Map(); // the squares as of the first entry kept, so a trimmed record can open on a whole frame
  function encodeFrame(v) {
    const cells = v.cells ?? [], map = new Map();
    for (const c of cells) map.set(cellKey(c), JSON.stringify(c));
    let out;
    if (!last || sinceKey >= keyEvery) { out = {...v, key: true};sinceKey = 0; }
    else {
      const set = [], del = [];
      for (const [k, j] of map) if (last.get(k) !== j) set.push(JSON.parse(j));
      for (const k of last.keys()) if (!map.has(k)) del.push(k);
      const {cells: _, ...rest} = v;out = {...rest, set, del};
    }
    last = map;sinceKey++;
    return out;
  }
  const isFrame = e => e.d === 'in' && e.v?.type === 'frame';
  const applyTo = (map, v) => {
    if (v.key) { map.clear();for (const c of v.cells ?? []) map.set(cellKey(c), c); }
    else { for (const k of v.del ?? []) map.delete(k);for (const c of v.set ?? []) map.set(cellKey(c), c); }
  };
  const drop = () => { const e = entries.shift();bytes -= e.size;if (isFrame(e)) applyTo(base, e.v); };
  function trim() {
    while (bytes > maxBytes && entries.length) drop();
    // a record must open on a whole frame: messages before the first frame left go, and that frame, if it was
    // kept as changes, is made whole again from the squares as they stood
    while (entries.length && !isFrame(entries[0])) drop();
    const first = entries[0];
    if (first && !first.v.key) {
      applyTo(base, first.v);
      const {set, del, ...rest} = first.v;first.v = {...rest, key: true, cells: [...base.values()]};
      bytes -= first.size;first.size = JSON.stringify(first).length;bytes += first.size;
    }
  }
  return {
    // dir 'in': a message from the engine; 'out': a reply the player sent
    record(dir, v) {
      if (!enabled) return;
      const e = {t: Math.round(now()), d: dir, v: dir === 'in' && v?.type === 'frame' ? encodeFrame(v) : v};
      e.size = JSON.stringify(e).length;
      entries.push(e);bytes += e.size;
      if (bytes > maxBytes) trim();
    },
    get bytes() { return bytes; },
    get length() { return entries.length; },
    set enabled(on) { enabled = !!on; },
    export(meta = {}) { return {version: REPLAY_VERSION, savedAt: new Date().toISOString(), ...meta, entries: entries.map(({size, ...e}) => e)}; },
    clear() { entries = [];bytes = 0;last = null;sinceKey = 0;base = new Map(); },
  };
}

// The entries of a saved record with every frame whole again, ready to play.
export function decodeReplay(record) {
  if (!record || record.version !== REPLAY_VERSION || !Array.isArray(record.entries)) throw new Error('not a DeanHack replay');
  let cells = null;
  return record.entries.map(e => {
    if (e.d !== 'in' || e.v?.type !== 'frame') return e;
    const {key, set, del, ...v} = e.v;
    if (key) cells = new Map((v.cells ?? []).map(c => [cellKey(c), c]));
    else {
      if (!cells) throw new Error('replay does not open on a whole frame');
      for (const k of del ?? []) cells.delete(k);
      for (const c of set ?? []) cells.set(cellKey(c), c);
    }
    return {...e, v: {...v, cells: [...cells.values()]}};
  });
}

// The record as a file: gzip where the browser can, else plain JSON.
export async function replayBlob(record) {
  const json = new Blob([JSON.stringify(record)], {type: 'application/json'});
  if (typeof CompressionStream !== 'function') return {blob: json, name: 'deanhack-replay.json'};
  const gz = await new Response(json.stream().pipeThrough(new CompressionStream('gzip'))).blob();
  return {blob: gz, name: 'deanhack-replay.json.gz'};
}

export async function readReplayFile(file) {
  const gz = /\.gz$/i.test(file.name ?? '') || (new Uint8Array(await file.slice(0, 2).arrayBuffer())).join() === '31,139';
  const text = gz ? await new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text() : await file.text();
  return JSON.parse(text);
}

// Download the record (the browser saves the file; nothing leaves the machine).
export async function saveReplay(recorder, meta, doc = globalThis.document) {
  const {blob, name} = await replayBlob(recorder.export(meta));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const a = doc.createElement('a');a.href = URL.createObjectURL(blob);a.download = name.replace('replay', `replay-${stamp}`);
  doc.body.append(a);a.click();a.remove();setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return a.download;
}
