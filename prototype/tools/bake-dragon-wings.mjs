// Bakes every winged dragon's folded wings and wingbeat (dragon-wings.js wingPoses) into dragon-wing-poses.js,
// so the game never solves them mid-play. Run from prototype/ after changing a dragon's wings or the goals:
//   node tools/bake-dragon-wings.mjs   (or name forms to re-bake just those: node tools/bake-dragon-wings.mjs tiamat)
// A form is marked ok only when every goal of all three poses is met to under 2 cm; the others keep the
// hand-set furl (dragon-menace.js FURL, FURL_DROOP) and do not flap.
import {readFileSync, writeFileSync} from 'node:fs';
import {createCreature} from '../creatures.js';
import {wingPoses} from '../dragon-wings.js';

const only = process.argv.slice(2).map(n => n.toLowerCase());
const names = JSON.parse(readFileSync(new URL('./creature-names.json', import.meta.url))).filter(m => m.letter === 'D');
const round = v => Math.round(v * 1e4) / 1e4;
const out = only.length ? {...(await import('../dragon-wing-poses.js')).WING_POSES} : {};
const tidy = pose => { const o = {}; for (const [n, p] of Object.entries(pose)) { const q = {}; for (const [ax, v] of Object.entries(p)) if (ax === 's' ? Math.abs(v - 1) > 1e-5 : Math.abs(v) > 1e-5) q[ax] = round(v); if (Object.keys(q).length) o[n] = q; } return o; };
// each with its own glyph colour, as the game sends it (the colour picks the element, whose dressing changes the body)
for (const {name: n, color} of names) {
  const name = n.toLowerCase();
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 68, color});
  if (a.quirk !== 'dragon' || !a.joints || !a.wings?.length) continue;
  const t0 = Date.now(), r = wingPoses(a), worst = Math.max(...Object.values(r.worst));
  out[name] = {ok: worst < .02, worst: round(worst), fold: tidy(r.fold), up: tidy(r.up), down: tidy(r.down)};
  console.log(name.padEnd(24), out[name].ok ? 'ok ' : 'NO ', Object.entries(r.worst).map(([k, v]) => `${k} ${(v * 100).toFixed(1)} cm`).join(', '), `${Date.now() - t0} ms`);
}
writeFileSync(new URL('../dragon-wing-poses.js', import.meta.url), `// Baked by tools/bake-dragon-wings.mjs from dragon-wings.js: each winged dragon's folded wings and the top and
// bottom of its wingbeat, by species name, as radians added to the standing frame (and the wing's folded scale).
// \`ok\`: every goal met to under 2 cm (only those fold and flap this way in play); \`worst\`: the worst goal
// residual, in metres. Do not edit by hand: re-bake.
export const WING_POSES = ${JSON.stringify(out)};
`);
