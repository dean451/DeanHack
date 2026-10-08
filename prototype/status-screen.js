// Whole-screen treatment for the hero's status conditions, so the player feels a state and not only reads
// its word. Step one is blindness: the edges of the view close in on a dark that breathes. The other states
// (confused, stunned, hallucinating) still wait; STATE_CLASSES is where they join.

const STATE_CLASSES = {blind: 'status-blind'};

// The screen classes for the conditions on the engine's status line ('Blind', 'Hungry'...), in a fixed order.
export function statusScreenClasses(conditions) {
  const out = [];
  for (const c of conditions || []) {
    const cls = STATE_CLASSES[String(c).toLowerCase()];
    if (cls && !out.includes(cls)) out.push(cls);
  }
  return out;
}

// Puts the matching classes on the overlay element and takes the rest off.
export function applyStatusScreen(el, conditions) {
  const want = statusScreenClasses(conditions);
  for (const cls of Object.values(STATE_CLASSES)) el.classList.toggle(cls, want.includes(cls));
  return want;
}
