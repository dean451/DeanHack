// Bakes every naga's brooding rest (naga-rest.js restPose) into naga-rest-poses.js, so the game never solves one
// mid-play. Run from prototype/ after changing a naga's body or the rest's goals:
//   node tools/bake-naga-rest.mjs   (or names to re-bake just those: node tools/bake-naga-rest.mjs "red naga")
// A naga is marked ok only when every goal is met to under 2 cm; the others do not lie still in play.
import {createCreature} from '../creatures.js';
import {restPose, rests} from '../naga-rest.js';

const NAGAS = ['red', 'black', 'golden', 'guardian', 'white'].flatMap(k => [`${k} naga`, `${k} naga hatchling`]);
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../naga-rest-poses.js')).REST_POSES} : {};
for (const name of NAGAS) {
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 78});
  a.g.updateMatrixWorld(true);
  if (!rests(a)) continue;
  const t0 = Date.now(), r = restPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') continue; const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(24), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../naga-rest-poses.js', import.meta.url), `// Baked by tools/bake-naga-rest.mjs from naga-rest.js: each naga's brooding rest (the neck laid down over the coil,
// the chin on its scales), by name, as radians added to the standing frame. \`ok\`: every goal met to under 2 cm (only
// those lie still in play); \`worst\`: the worst goal residual, in metres. Do not edit by hand: re-bake.
export const REST_POSES = ${JSON.stringify(out)};
`);
