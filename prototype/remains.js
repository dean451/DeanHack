// What a creature leaves on the floor when it is hurt or killed (marks.js draws it). A blood pool
// and bone shards under every kill looked lazy: a yellow light has neither, a floating eye has no
// bones, an earth elemental is rock. The seen species name picks a remains class:
//   flesh  blood when hit, a pool and bone shards when killed (animals, humanoids, dragons, demons)
//   blood  blood but no bones: insects, spiders, worms, eyes and other boneless soft things
//   bones  dry: bone shards and a grey dust smudge, no blood (skeletons, zombies, mummies, ghouls,
//          liches, wraiths, wights, the Nazgul)
//   slick  an acid slick, no blood or bone: jellies, puddings, oozes, blobs, slimes
//   none   nothing: lights and spheres, gas spores, vortices, clouds, ghosts, elementals, golems,
//          molds, fungi, stone things
// Only the seen name is used, so nothing here tells you more than the map already does.
import {impactKind} from './swing.js';

export const REMAINS = ['flesh', 'blood', 'bones', 'slick', 'none'];

// Dry undead come first: swing.js sprays mist for a wraith, but what it leaves is bone.
const DRY = /\b(skeleton|zombie|mummy|ghoul|lich|demilich|wraith|wight|nazgul|nazg[uû]l|bone devil)\b/;
// Soft and boneless: it bleeds, but there is nothing left to pick clean.
const BONELESS = /\b(ant|beetle|bee|bug|fly|flies|centipede|spider|scorpion|locust|xan|moth|worm|leech|slug|snail|eye|eel|jellyfish|piercer|lurker above|trapper|mimic|squid|kraken|grub|larva|maggot|tick|louse|roach)\b/;
// Wet and acid: what runs out of a jelly or a pudding eats a slick into the floor.
const ACID = /\b(jelly|pudding|ooze|blob|slime)\b/;
// Nothing at all: it was gas, light, water or stone.
const EMPTY = /\b(light|sphere|spore|vortex|cloud|elemental|ghost|shade|spectre|stalker|golem|xorn|gargoyle|shrieker|fungus|mold|lichen|will o' the wisp|wisp)\b/;

export function remainsOf(name) {
  const n = typeof name === 'string' ? name.toLowerCase() : '';
  if (!n) return 'flesh';
  if (DRY.test(n)) return 'bones';
  if (ACID.test(n)) return 'slick';
  if (EMPTY.test(n)) return 'none';
  const kind = impactKind(n);
  if (kind === 'bone') return 'bones';
  if (kind !== 'flesh') return 'none'; // ooze, stone, mist, metal, dust
  if (BONELESS.test(n)) return 'blood';
  return 'flesh';
}
