// Bakes each heavy quadruped's lying rest (quadruped-rest.js restPose) into quadruped-rest-poses.js, so the game
// never solves one mid-play (a solve takes seconds). Run from prototype/ after changing a body or the lying goals:
//   node tools/bake-quadruped-rest.mjs   (or names to re-bake just those: node tools/bake-quadruped-rest.mjs rothe)
// A beast is marked ok only when every goal is met to under 2 cm; the others do not lie down in play.
import {createCreature} from '../creatures.js';
import {restPose, rests} from '../quadruped-rest.js';

const FAMILY = ['rothe', 'mumak', 'mastodon', 'titanothere', 'baluchitherium', 'leocrotta', 'wumpus'];
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../quadruped-rest-poses.js')).REST_POSES} : {};
for (const name of FAMILY) {
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 113, color: 7});
  a.g.updateMatrixWorld(true);
  if (!rests(a)) continue;
  const t0 = Date.now(), r = restPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') { if (n === 'hipsY') pose.hipsY = round(o); continue; } const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(16), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../quadruped-rest-poses.js', import.meta.url), `// Baked by tools/bake-quadruped-rest.mjs from quadruped-rest.js: each heavy quadruped's lying rest, by name, as
// radians added to the standing frame. \`ok\`: every goal met to under 2 cm (only those lie down in play); \`worst\`:
// the worst goal residual, in metres. Do not edit by hand: re-bake.
export const REST_POSES = ${JSON.stringify(out)};
`);
