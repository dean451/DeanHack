// Input that waited out a freeze is dropped. While the page is blocked (a long frame, a hang), the browser keeps
// every key press and click and hands them all over the moment it recovers, so moves typed in the dark played out
// at once: a player who kept pressing keys through a 20-second freeze walked into a fight and died. An event the
// game sees more than STALE_INPUT_MS after it happened (its timeStamp, on the same clock as performance.now) is
// thrown away instead.
export const STALE_INPUT_MS = 1000;

export function isStale(e, now = performance.now()) {
  const t = e?.timeStamp;
  return Number.isFinite(t) && t > 0 && t <= now + 50 && now - t > STALE_INPUT_MS;
}

// Swallows stale key presses and clicks before any other handler sees them, while `when()` is true (Live).
export function guardStaleInput(target, when = () => true, onDrop = null, now = () => performance.now()) {
  const drop = e => { if (!when() || !isStale(e, now())) return; e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();onDrop?.(e); };
  for (const type of ['keydown', 'pointerdown', 'pointerup', 'click']) target.addEventListener(type, drop, true);
  return () => { for (const type of ['keydown', 'pointerdown', 'pointerup', 'click']) target.removeEventListener(type, drop, true); };
}
