// Never make a fast player wait. NetHack is played at typing speed: hjkl in bursts, a run of moves before the
// first has finished drawing. Two things held such a player back. Keys typed while the engine was still answering
// were kept one at a time (the next replaced the last, so moves were lost), and every animation played at full
// length however far ahead the player was. Here typed commands wait in a short buffer and go out one per command
// prompt, the buffer emptied by any other question (a yes/no, a menu, --More--) so a buffered key never answers
// one; and while the player is ahead, or typing fast, held frames are let go early and actions, slides and steps
// play quicker, so the scene keeps up with the fingers.
export const PACE = {buffer: 8, fastGapMs: 240, hurryScale: 2.5, hurryHoldMs: 90, linger: 1.6};

export function createInputPace({buffer = PACE.buffer, fastGapMs = PACE.fastGapMs, hurryScale = PACE.hurryScale, hurryHoldMs = PACE.hurryHoldMs, linger = PACE.linger} = {}) {
  const keys = [];
  let lastAt = -Infinity, gap = Infinity;
  const hurry = now => keys.length > 0 || (gap < fastGapMs && now - lastAt < fastGapMs * linger);
  return {
    // a command key was pressed (for the typing pace)
    press(now) { gap = now - lastAt;lastAt = now; },
    // a command typed while the engine is still answering the last one
    push(code) { if (keys.length < buffer) keys.push(code); },
    shift() { return keys.shift(); },
    clear() { keys.length = 0; },
    get size() { return keys.length; },
    hurry,
    // how much faster actions and movement play this frame
    timeScale(now) { return hurry(now) ? hurryScale : 1; },
    // the longest a finished frame may be held back for an animation to end
    holdCap(now) { return hurry(now) ? hurryHoldMs : Infinity; },
  };
}
