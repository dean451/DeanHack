// Bakes every naga's rear (naga-rear.js rearPose) into naga-rear-poses.js, so the game never solves one mid-play.
// Run from prototype/ after changing a naga's body or the rear's goals:
//   node tools/bake-naga-rear.mjs   (or names to re-bake just those: node tools/bake-naga-rear.mjs "red naga")
// A naga is marked ok only when every goal is met to under 2 cm; the others do not rear in play.
import {createCreature} from '../creatures.js';
import {rearPose, rearsUp} from '../naga-rear.js';

const NAGAS = ['red', 'black', 'golden', 'guardian', 'white'].flatMap(k => [`${k} naga`, `${k} naga hatchling`]);
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../naga-rear-poses.js')).REAR_POSES} : {};
for (const name of NAGAS) {
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 78});
  a.g.updateMatrixWorld(true);
  if (!rearsUp(a)) continue;
  const t0 = Date.now(), r = rearPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') continue; const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(24), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../naga-rear-poses.js', import.meta.url), `// Baked by tools/bake-naga-rear.mjs from naga-rear.js: each naga's rear (the neck drawn up into a straight post over
// the coil, the head hooked forward), by name, as radians added to the standing frame. \`ok\`: every goal met to under
// 2 cm (only those rear in play); \`worst\`: the worst goal residual, in metres. Do not edit by hand: re-bake.
export const REAR_POSES = ${JSON.stringify(out)};
`);
