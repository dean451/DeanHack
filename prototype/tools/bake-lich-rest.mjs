// Bakes every lich's stoop (lich-rest.js restPose) into lich-rest-poses.js, so the game never solves one mid-play.
// Run from prototype/ after changing a lich's body or the stoop's goals:
//   node tools/bake-lich-rest.mjs   (or names to re-bake just those: node tools/bake-lich-rest.mjs "arch-lich")
// A lich is marked ok only when every goal is met to under 2 cm; the others do not stoop in play.
import {createCreature} from '../creatures.js';
import {restPose, rests} from '../lich-rest.js';

// the four liches of src/monst.c, with the cell colour the engine sends for each
export const LICH_NAMES = [['lich', 2], ['demilich', 1], ['master lich', 5], ['arch-lich', 6]];
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../lich-rest-poses.js')).REST_POSES} : {};
for (const [name, color] of LICH_NAMES) {
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 76, color});
  a.g.updateMatrixWorld(true);
  if (!rests(a)) continue;
  const t0 = Date.now(), r = restPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') continue; const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(12), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../lich-rest-poses.js', import.meta.url), `// Baked by tools/bake-lich-rest.mjs from lich-rest.js: each lich's stoop, by name, as radians added to the standing
// frame. \`ok\`: every goal met to under 2 cm (only those stoop in play); \`worst\`: the worst goal residual, in metres.
// Do not edit by hand: re-bake.
export const REST_POSES = ${JSON.stringify(out)};
`);
