// Bakes every Kop's halt (kop-halt.js haltPose) into kop-halt-poses.js, so the game never solves one
// mid-play. Run from prototype/ after changing a Kop's body or the halt goals:
//   node tools/bake-kop-halt.mjs   (or names to re-bake just those: node tools/bake-kop-halt.mjs "kop kaptain")
// A Kop is marked ok only when every goal is met to under 2 cm; the others do not halt in play.
import {createCreature} from '../creatures.js';
import {haltPose, halts} from '../kop-halt.js';

const KOP_NAMES = ['keystone kop', 'kop sergeant', 'kop lieutenant', 'kop kaptain'];
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../kop-halt-poses.js')).HALT_POSES} : {};
for (const name of KOP_NAMES) {
  if (only.length && !only.includes(name)) continue;
  // built as the game builds it (the Kops' coats come from their name, not the cell's colour)
  const a = createCreature({name, symbol: 75, color: 4});
  a.g.updateMatrixWorld(true);
  if (!halts(a)) continue;
  const t0 = Date.now(), r = haltPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') { if (n === 'hipsY') pose.hipsY = round(o); continue; } const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(16), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../kop-halt-poses.js', import.meta.url), `// Baked by tools/bake-kop-halt.mjs from kop-halt.js: each Kop's halt, by name, as radians added to the
// standing frame. \`ok\`: every goal met to under 2 cm (only those halt in play); \`worst\`: the worst goal
// residual, in metres. Do not edit by hand: re-bake.
export const HALT_POSES = ${JSON.stringify(out)};
`);
