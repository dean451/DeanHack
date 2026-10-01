// Structured melee and death events from the bridge ({"type":"combat"} / {"type":"death"}).
// The bridge only sends what the hero perceives: an unseen side has seen:false and no
// position, and names are null while hallucinating. These helpers turn an event into the
// shape the action layer needs; nothing here predicts game rules.

const ATTACKS = new Set(['claw', 'bite', 'kick', 'butt', 'touch', 'sting', 'hug', 'spit', 'engulf',
  'breath', 'explode', 'boom', 'gaze', 'tentacle', 'scream', 'weapon', 'magic', 'other']);

function side(a) {
  if (!a || typeof a !== 'object') return null;
  if (a.you) return {you: true, x: a.x, z: a.z};
  if (!a.seen || !Number.isFinite(a.x) || !Number.isFinite(a.z)) return {seen: false};
  return {seen: true, x: a.x, z: a.z, name: typeof a.name === 'string' ? a.name : null, pet: !!a.pet};
}
const placed = s => !!s && Number.isFinite(s.x) && Number.isFinite(s.z);

export function combatAction(ev) {
  if (!ev || ev.type !== 'combat') return null;
  const attacker = side(ev.attacker), defender = side(ev.defender);
  if (!attacker || !defender) return null;
  // One-step compass direction from attacker to defender (as meleeDirection gives it).
  const dir = placed(attacker) && placed(defender)
    ? [Math.sign(defender.x - attacker.x), Math.sign(defender.z - attacker.z)] : null;
  return {
    attack: ATTACKS.has(ev.attack) ? ev.attack : 'other',
    result: ev.result === 'hit' || ev.result === 'wild' ? ev.result : 'miss',
    blow: ev.weapon?.blow ?? null,
    weapon: ev.weapon ?? null,
    attacker, defender,
    dir: dir && (dir[0] || dir[1]) ? dir : null,
    heroAttacks: !!attacker.you,
    heroDefends: !!defender.you,
  };
}

export function deathAction(ev) {
  if (!ev || ev.type !== 'death' || !Number.isFinite(ev.x) || !Number.isFinite(ev.z)) return null;
  return {x: ev.x, z: ev.z, name: typeof ev.name === 'string' ? ev.name : null, pet: !!ev.pet, stoned: !!ev.stoned};
}
