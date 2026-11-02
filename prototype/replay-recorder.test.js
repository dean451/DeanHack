import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRecorder, decodeReplay, replayBlob, readReplayFile, REPLAY_VERSION} from './replay-recorder.js';
import {createReplayPlayer} from './replay-player.js';

const frame = (turn, cells, x = 1) => ({type: 'frame', turn, player: {x, z: 1}, cells});
const cell = (x, z, terrain = 'floor', kind = 'terrain') => ({x, z, terrain, kind});

test('frames are kept as changes and come back whole, in order, with the replies between them', () => {
  let t = 0;const rec = createRecorder({now: () => t += 100, keyEvery: 3});
  const f1 = frame(1, [cell(1, 1), cell(2, 1)]), f2 = frame(2, [cell(1, 1), cell(2, 1, 'floor', 'monster'), cell(3, 1)]), f3 = frame(3, [cell(1, 1), cell(3, 1)]);
  rec.record('in', f1);rec.record('in', {type: 'request', kind: 'command', id: 1});rec.record('out', {id: 1, value: 108});rec.record('in', f2);rec.record('in', f3);
  const record = rec.export({turn: 3});
  assert.equal(record.version, REPLAY_VERSION);
  assert.ok(record.entries[0].v.key && !record.entries[3].v.cells, 'the first frame whole, the next as changes');
  assert.deepEqual(record.entries[3].v.set, [cell(2, 1, 'floor', 'monster'), cell(3, 1)]);
  const out = decodeReplay(JSON.parse(JSON.stringify(record)));
  assert.deepEqual(out.map(e => e.d), ['in', 'in', 'out', 'in', 'in']);
  assert.deepEqual(out[3].v.cells, f2.cells);assert.deepEqual(out[4].v.cells, f3.cells, 'a square no longer known is gone again');
  assert.deepEqual(out[4].v.player, f3.player);
});

test('past its byte cap the oldest entries go, and the record still opens on a whole frame', () => {
  const rec = createRecorder({maxBytes: 4000, keyEvery: 4, now: () => 0});
  const big = n => Array.from({length: 30}, (_, i) => cell(i, n % 3));
  for (let n = 0; n < 40; n++) { rec.record('in', frame(n, big(n)));rec.record('in', {type: 'message', text: `turn ${n}`}); }
  assert.ok(rec.bytes <= 4000);
  const {entries} = rec.export();
  assert.ok(entries[0].v.type === 'frame' && entries[0].v.key);
  assert.equal(decodeReplay(rec.export()).at(-1).v.text, 'turn 39', 'the newest is kept');
});

test('a record saved as gzip reads back the same', async () => {
  const rec = createRecorder({now: () => 5});rec.record('in', frame(1, [cell(1, 1)]));
  const {blob, name} = await replayBlob(rec.export());
  assert.match(name, /\.json\.gz$/);
  const back = await readReplayFile(Object.assign(blob, {name}));
  assert.deepEqual(back.entries, rec.export().entries);
});

test('the player paces the engine messages, reports the replies, and steps to the next request', () => {
  const entries = [{t: 0, d: 'in', v: {type: 'frame'}}, {t: 50, d: 'in', v: {type: 'request'}}, {t: 5000, d: 'out', v: {value: 108}}, {t: 5100, d: 'in', v: {type: 'frame'}}, {t: 5200, d: 'in', v: {type: 'request'}}];
  const got = [], inputs = [], timers = [];
  const player = createReplayPlayer(entries, v => got.push(v.type), {onInput: v => inputs.push(v.value), setTimer: (f, ms) => { timers.push(ms);f(); }, clearTimer() {}});
  player.step();assert.deepEqual(got, ['frame', 'request'], 'step stops when the game waits on the player');
  player.setSpeed(2);player.play();
  assert.deepEqual(got, ['frame', 'request', 'frame', 'request']);assert.deepEqual(inputs, [108]);
  assert.equal(Math.max(...timers), 600, 'a long think is cut to 1.2 s, then halved at 2×');
  assert.equal(player.playing, false, 'it stops at the end');
});

test('live.js records what it handles and sends, and a replay sends nothing', () => {
  const live = readFileSync(new URL('./live.js', import.meta.url), 'utf8'), main = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  assert.match(live, /const handle=v=>\{recorder\.record\('in',v\);/);
  assert.match(live, /async function reply\(value\)\{if\(!pending\|\|replaying\)return;const req=pending;recorder\.record\('out'/);
  assert.match(live, /startReplay\(\)\{replaying=true;recorder\.enabled=false;setMode\(true\);connect\(\{replay:true\}\);return currentHandle;\}/);
  assert.match(main, /if\(wantsReplay\(location\.search\)\)mountReplayUI\(\{live\}\);/);
});
