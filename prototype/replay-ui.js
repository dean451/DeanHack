// The replay page (?replay): pick or drop a saved replay (replay-recorder.js), then play it through the real game,
// with play/pause, step (to the next time the game waited on the player), speed and where it is. Nothing talks
// to an engine: the record carries every message, and the game is drawn exactly as it was.
import {decodeReplay, readReplayFile} from './replay-recorder.js';
import {createReplayPlayer, SPEEDS} from './replay-player.js';

export const wantsReplay = (search = '') => new URLSearchParams(search).has('replay');

export function mountReplayUI({doc = document, live}) {
  // the splash is the way into a real game; a replay skips it
  doc.body.classList.remove('start-open');doc.getElementById('start-screen')?.remove();doc.getElementById('start-cover')?.remove();
  const el = doc.createElement('div');el.id = 'replay-panel';
  el.innerHTML = `<label class="replay-file">Open replay <input type="file" accept=".gz,.json,application/json,application/gzip"></label>
<button type="button" data-act="play" disabled>Play</button><button type="button" data-act="step" disabled>Step</button>
<select aria-label="Speed" disabled>${SPEEDS.map(s => `<option value="${s}">${s}×</option>`).join('')}</select>
<span class="replay-where">Drop a replay file anywhere, or open one.</span><span class="replay-input"></span>`;
  doc.body.append(el);
  const $ = s => el.querySelector(s), play = $('[data-act=play]'), step = $('[data-act=step]'), speed = $('select'), where = $('.replay-where'), input = $('.replay-input');
  let player = null;
  const show = (i, n, e) => { const turn = e?.v?.type === 'frame' ? e.v.turn : null;if (turn != null) el.dataset.turn = turn;where.textContent = `${i} / ${n}${el.dataset.turn ? ` · turn ${el.dataset.turn}` : ''}`;play.textContent = player?.playing ? 'Pause' : 'Play'; };
  async function open(file) {
    try {
      const record = await readReplayFile(file), entries = decodeReplay(record);
      player?.pause();
      const inject = live.startReplay();
      player = createReplayPlayer(entries, inject, {onProgress: show, onInput: v => { input.textContent = `you: ${typeof v?.value === 'number' ? String.fromCharCode(v.value) : v?.value ?? ''}`; }});
      for (const b of [play, step, speed]) b.disabled = false;
      where.textContent = `${entries.length} messages, saved ${record.savedAt ?? ''}`;
    } catch (e) { where.textContent = `Could not open that file: ${e.message}`; }
  }
  $('input[type=file]').addEventListener('change', e => { const f = e.target.files?.[0];if (f) open(f); });
  doc.addEventListener('dragover', e => e.preventDefault());
  doc.addEventListener('drop', e => { e.preventDefault();const f = e.dataTransfer?.files?.[0];if (f) open(f); });
  play.onclick = () => { if (!player) return;if (player.playing) player.pause();else player.play();play.textContent = player.playing ? 'Pause' : 'Play'; };
  step.onclick = () => player?.step();
  speed.onchange = () => player?.setSpeed(speed.value);
  return {open, get player() { return player; }};
}
