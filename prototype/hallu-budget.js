// Hallucination re-rolls every monster's glyph each turn, and a monster's model is keyed on its glyph, so in a
// crowded level (the Big Room) every monster was rebuilt from scratch every turn: dozens of procedural models a
// turn. While the hero hallucinates, only REMODEL_BUDGET monsters a frame get a new model; the rest keep the
// model they had (a monster that just changed glyph near where one stood is the same monster) until a later
// frame has budget for them. The look still churns, a few at a time.
export const REMODEL_BUDGET = 2;

export const hallucinating = conditions => Array.isArray(conditions) && conditions.some(c => /^hallu/i.test(String(c)));

// The number of new models this frame may build: unlimited unless hallucinating.
export const remodelBudget = conditions => hallucinating(conditions) ? REMODEL_BUDGET : Infinity;
