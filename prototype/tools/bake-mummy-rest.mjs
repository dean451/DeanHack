// Bakes every mummy's laid-out rest (mummy-rest.js restPose) into mummy-rest-poses.js, so the game never solves one
// mid-play. Run from prototype/ after changing a mummy's body or the rest's goals:
//   node tools/bake-mummy-rest.mjs   (or names to re-bake just those: node tools/bake-mummy-rest.mjs "ettin mummy")
// A mummy is marked ok only when every goal is met to under 2 cm; the others do not lie still in play.
import {createCreature} from '../creatures.js';
import {MUMMIES} from '../mummy.js';
import {restPose, rests} from '../mummy-rest.js';

const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../mummy-rest-poses.js')).REST_POSES} : {};
for (const name of Object.keys(MUMMIES)) {
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 77, color: 7});
  a.g.updateMatrixWorld(true);
  if (!rests(a)) continue;
  const t0 = Date.now(), r = restPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') continue; const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(14), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../mummy-rest-poses.js', import.meta.url), `// Baked by tools/bake-mummy-rest.mjs from mummy-rest.js: each mummy's laid-out rest (the forearms crossed over the
// chest), by name, as radians added to the standing frame. \`ok\`: every goal met to under 2 cm (only those lie still
// in play); \`worst\`: the worst goal residual, in metres. Do not edit by hand: re-bake.
export const REST_POSES = ${JSON.stringify(out)};
`);
