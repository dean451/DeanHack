// Bakes every dragon's mantle (dragon-mantle.js mantlePose) into dragon-mantle-poses.js, so the game never
// solves one mid-play. Run from prototype/ after changing a dragon's body or the mantle goals:
//   node tools/bake-dragon-mantle.mjs   (or name forms to re-bake just those: node tools/bake-dragon-mantle.mjs tiamat)
// A form is marked ok only when every goal is met to under 2 cm; the others keep the hand-set mantle
// (dragon-menace.js SPREAD, RAISE, CUP, REAR, TAIL_UP).
import {readFileSync, writeFileSync} from 'node:fs';
import {createCreature} from '../creatures.js';
import {mantlePose} from '../dragon-mantle.js';

const only = process.argv.slice(2).map(n => n.toLowerCase());
const names = JSON.parse(readFileSync(new URL('./creature-names.json', import.meta.url))).filter(m => m.letter === 'D');
const round = v => Math.round(v * 1e4) / 1e4;
const out = only.length ? {...(await import('../dragon-mantle-poses.js')).MANTLE_POSES} : {};
// each with its own glyph colour, as the game sends it (the colour picks the element, whose dressing changes the body)
for (const {name: n, color} of names) {
  const name = n.toLowerCase();
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 68, color});
  if (a.quirk !== 'dragon' || !a.joints || !a.heads?.length) continue;
  const t0 = Date.now(), r = mantlePose(a);
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  const bad = Object.entries(r.goals).map(([k, g]) => [k, Math.max(0, ...[g(r.points)].flat(2).map(Math.abs))]).filter(([, v]) => v >= .02).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}`);
  out[name] = {ok: r.worst < .02, worst: round(r.worst), pose};
  console.log(name.padEnd(24), out[name].ok ? 'ok ' : 'NO ', `worst ${(r.worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`, bad.join(', '));
}
writeFileSync(new URL('../dragon-mantle-poses.js', import.meta.url), `// Baked by tools/bake-dragon-mantle.mjs from dragon-mantle.js: each dragon's mantle, by species name, as
// radians added to the standing frame. \`ok\`: every goal met to under 2 cm (only those mantle this way in
// play; the rest keep the hand-set mantle); \`worst\`: the worst goal residual, in metres. Do not edit by hand: re-bake.
export const MANTLE_POSES = ${JSON.stringify(out)};
`);
