// Pure helpers for the live character panel and level header (live.js draws them).
//
// levelTitle(frame): the header for the level the hero is on. The bridge sends the dungeon's
// name (`dungeon`) and, on a special level, its prototype name (`special`: "medusa", "orcus",
// "tower1"...). A known special level is named ("Medusa's Island"); a level in another branch
// takes the branch's name ("Vlad's Tower", "Sheol"); a plain Dungeons of Doom level stays
// "The Dungeons". `named` says whether the level is worth announcing on arrival.
//
// lowHealth(hp, maxhp): below LOW_HP of the maximum the vitality bar turns red and flashes.
//
// parseAttributes(text): the six attributes and alignment from the first bottom status line
// ("[Wanderer the Swashbuckler]  St:18/50 Dx:17 Co:17 In:8 Wi:8 Ch:9  Lawful"), or null.

export const LOW_HP = .4;
export const lowHealth = (hp, maxhp) => maxhp > 0 && hp / maxhp < LOW_HP;

const HOME = 'The Dungeons of Doom';
// [prototype pattern, name]. Levels not listed take their branch's name.
const SPECIAL = [
  [/^oracle$/, 'The Oracle'],
  [/^bigrm/, 'The Big Room'],
  [/^medusa/, "Medusa's Island"],
  [/^castle/, 'The Castle'],
  [/^valley/, 'The Valley of the Dead'],
  [/^sanctum$/, "Moloch's Sanctum"],
  [/^juiblex$/, "Juiblex's Swamp"],
  [/^baalz/, "Baalzebub's Lair"],
  [/^asmod/, "Asmodeus' Lair"],
  [/^orcus/, 'Orcus Town'],
  [/^minetn/, 'Minetown'],
  [/^minend/, "Mines' End"],
  [/^knox/, 'Fort Ludios'],
  [/^blkmar/, "One-eyed Sam's Market"],
  [/^x-strt$/, 'The Quest · Home'],
  [/^x-loca$/, 'The Quest · Locate'],
  [/^x-goal$/, 'The Quest · Goal'],
  [/^astral$/, 'The Astral Plane'],
  [/^water$/, 'The Plane of Water'],
  [/^fire$/, 'The Plane of Fire'],
  [/^air$/, 'The Plane of Air'],
  [/^earth$/, 'The Plane of Earth'],
];

export function levelTitle(frame = {}) {
  const dungeon = frame.dungeon || HOME, depth = String(frame.depth ?? 0).padStart(2, '0');
  const special = frame.special ? SPECIAL.find(([re]) => re.test(frame.special))?.[1] : null;
  const title = special || (dungeon === HOME ? 'The Dungeons' : dungeon);
  return {title, place: `${dungeon.toUpperCase()} · DEPTH ${depth}`, named: title !== 'The Dungeons'};
}

const ATTRS = [['St', 'STR'], ['Dx', 'DEX'], ['Co', 'CON'], ['In', 'INT'], ['Wi', 'WIS'], ['Ch', 'CHA']];
export function parseAttributes(text = '') {
  const found = ATTRS.map(([key, label]) => {
    const m = String(text).match(new RegExp(`\\b${key}:(\\d+(?:/(?:\\d+|\\*\\*))?)`));
    return m && {label, value: m[1]};
  });
  if (found.some(a => !a)) return null;
  const alignment = String(text).match(/\b(Lawful|Neutral|Chaotic|Unaligned)\b/)?.[1] ?? null;
  return {attributes: found, alignment};
}
