// Plays a decoded replay (replay-recorder.js decodeReplay) into the live game: the engine's messages go to `inject`
// at their recorded pace, long pauses (the player thinking) shortened to MAX_GAP_MS, at a chosen speed. step()
// runs up to the next time the game waited on the player. The player's own replies are only reported (onInput):
// the engine messages that followed them already carry what they did.
export const MAX_GAP_MS = 1200, SPEEDS = [1, 2, 4, 8];

export function createReplayPlayer(entries, inject, {onInput = null, onProgress = null, setTimer = setTimeout, clearTimer = clearTimeout} = {}) {
  let i = 0, playing = false, speed = 1, timer = null;
  const done = () => i >= entries.length;
  function run1() {
    const e = entries[i++];
    if (e.d === 'in') inject(e.v);else onInput?.(e.v);
    onProgress?.(i, entries.length, e);
    return e;
  }
  function schedule() {
    clearTimer(timer);timer = null;
    if (!playing || done()) { if (done()) playing = false;return; }
    const prev = entries[i - 1], gap = prev ? Math.min(MAX_GAP_MS, Math.max(0, entries[i].t - prev.t)) / speed : 0;
    timer = setTimer(() => { run1();schedule(); }, gap);
  }
  return {
    play() { if (done()) return;playing = true;schedule(); },
    pause() { playing = false;clearTimer(timer);timer = null; },
    // up to and including the next request for the player's input
    step() { this.pause();while (!done()) { const e = run1();if (e.d === 'in' && e.v?.type === 'request') break; } },
    setSpeed(s) { speed = Math.max(.25, Number(s) || 1);if (playing) schedule(); },
    get index() { return i; },
    get total() { return entries.length; },
    get playing() { return playing; },
    get speed() { return speed; },
  };
}
