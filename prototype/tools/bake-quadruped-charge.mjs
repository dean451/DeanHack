// Bakes each heavy quadruped's thrown head (quadruped-charge.js chargePose) into quadruped-charge-poses.js, so the
// game never solves one mid-play. Run from prototype/ after changing a body or the charge goals:
//   node tools/bake-quadruped-charge.mjs   (or names to re-bake just those)
// A beast is marked ok only when every goal is met to under 2 cm; the others do not throw the head in play.
import {createCreature} from '../creatures.js';
import {chargePose, charges} from '../quadruped-charge.js';

const FAMILY = ['rothe', 'mumak', 'mastodon', 'titanothere', 'baluchitherium', 'leocrotta', 'wumpus'];
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../quadruped-charge-poses.js')).CHARGE_POSES} : {};
for (const name of FAMILY) {
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 113, color: 7});
  a.g.updateMatrixWorld(true);
  if (!charges(a)) continue;
  const t0 = Date.now(), r = chargePose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(16), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../quadruped-charge-poses.js', import.meta.url), `// Baked by tools/bake-quadruped-charge.mjs from quadruped-charge.js: each heavy quadruped's thrown head, by name, as
// radians added to the standing frame (only the neck moves). \`ok\`: every goal met to under 2 cm (only those throw the
// head in play); \`worst\`: the worst goal residual, in metres. Do not edit by hand: re-bake.
export const CHARGE_POSES = ${JSON.stringify(out)};
`);
