// Whole-screen treatment for the hero's status conditions, so the player feels a state and not only reads
// its word. Blindness closes the edges of the view in on a dark that breathes; confusion
// sways the view and smears it with a drifting sick violet. The other states (stunned, hallucinating) still
// wait; STATE_CLASSES is where they join.

const STATE_CLASSES = {blind: 'status-blind', conf: 'status-confused', confused: 'status-confused'};

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
  for (const cls of new Set(Object.values(STATE_CLASSES))) el.classList.toggle(cls, want.includes(cls));
  return want;
}
