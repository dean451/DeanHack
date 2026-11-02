// The hero's headgear follows the helmet slot (the user, 2026-11-02: "having the items show as the item they are
// is better than the default class hat"). frame.player.helmet (bridge.c: name, otyp, the appearance's material and
// colour) picks what the head wears:
// - nothing: bare-headed, the class's hair (the Valkyrie's long crimson hair and her face);
// - a fedora, a conical hat (cornuthaum or dunce cap, unidentified or not), the Samurai's kabuto, a dented pot or a
//   tinfoil hat: that hat, over the hair;
// - any other helmet (plumed, etched, crested, visored, hard hat, iron skull cap, leather hat): a war-helm that
//   hides the hair; the Valkyrie's own winged helm stands in for hers.
// Only names the inventory shows are read, so nothing is told that the player doesn't already see.
import {HATS} from './hero-kits.js';
import {CLR} from './hero-gear.js';

// item -> 'none' | 'helm' | a HATS builder name
export function headLook(item) {
  if (!item) return 'none';
  const name = String(item.name || '').toLowerCase();
  if (/\bfedora\b/.test(name)) return 'fedora';
  if (/cornuthaum|dunce cap|conical hat/.test(name)) return 'wizard';
  if (/\bkabuto\b/.test(name)) return 'kabuto';
  if (/dented pot/.test(name)) return 'pot';
  if (/tinfoil hat/.test(name)) return 'tinfoil';
  return 'helm';
}
export const softHat = look => look !== 'none' && look !== 'helm';

// Builds the hat for a look on the head (or takes it off): parts from knight(); item for its colour.
// True when it changed what is on the head.
export function wearHat(parts, look, item) {
  const key = softHat(look) && HATS[look] ? `${look}|${item?.color ?? ''}` : null;
  if (parts.hatKey === key) return false;
  for (const obj of parts.hatAdded ?? []) { obj.parent?.remove(obj);obj.traverse(o => o.geometry?.dispose()); }
  parts.hatAdded = [];parts.hatKey = key;
  if (!key) return true;
  const add = (parent, obj) => { parent.add(obj);parts.hatAdded.push(obj);return obj; };
  const color = CLR[item?.color] ?? '#2c3f7a';
  HATS[look](add, parts, {color, hatColor: color, trim: '#9a8a6a'});
  return true;
}
