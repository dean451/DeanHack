// Status conditions must not rely on colour alone: each carries a small shape before its name,
// so a hunger warning, a poisoning and a burden read apart in greyscale too.

const GLYPHS = {
  satiated: '●', hungry: '◔', weak: '◑', fainting: '◕', fainted: '◕', starved: '○',
  blind: '▬', deaf: '≈', conf: '✱', stun: '✦', hallu: '❖', foodpois: '☠', ill: '☠', termill: '☠', slime: '≋', stone: '▣', strngl: '⊗',
  burdened: '▼', stressed: '▼▼', strained: '▼▼▼', overtaxed: '▼▼▼▼', overloaded: '▼▼▼▼▼',
  lev: '△', fly: '△', ride: '◆',
};

// The shape for a status word from the engine's status line ('Hungry', 'Burdened'...), or '·' when unknown.
export function conditionGlyph(word) {
  return GLYPHS[String(word).toLowerCase()] || '·';
}
