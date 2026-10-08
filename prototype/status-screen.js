// Whole-screen treatment for the hero's status conditions, so the player feels a state and not only reads
// its word. Blindness closes the edges of the view in on a dark that breathes; confusion
// sways the view and smears it with a drifting sick violet; stunned jolts the whole view off its footing in
// sharp, uneven lurches; hallucination slides the colours of the whole view round the wheel, in slow
// sickly surges; strangulation cinches a dark cord of vignette in round the view, tightening in hard
// gasps with a slack beat between; stoning creeps a cold grey up from the bottom of the view in stiff
// lurches, desaturating what it covers; sliming oozes a sick green in from the edges of the view in slow, wet
// surges that never quite drain back. STATE_CLASSES is where further states join.

const STATE_CLASSES = {blind: 'status-blind', conf: 'status-confused', confused: 'status-confused', stun: 'status-stunned', stunned: 'status-stunned', hallu: 'status-hallu', hallucinating: 'status-hallu', strngl: 'status-strangled', strangled: 'status-strangled', stone: 'status-stoned', stoned: 'status-stoned', slime: 'status-slimed', slimed: 'status-slimed'};

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
