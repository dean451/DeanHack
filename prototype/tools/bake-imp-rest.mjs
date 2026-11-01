// Bakes every imp's squat (imp-rest.js restPose) into imp-rest-poses.js, so the game never solves one
// mid-play (a solve takes 1 to 17 s). Run from prototype/ after changing a imp's body or the curl goals:
//   node tools/bake-imp-rest.mjs   (or names to re-bake just those: node tools/bake-imp-rest.mjs wolf jackal)
// An imp is marked ok only when every goal is met to under 2 cm; the others do not squat in play.
import {createCreature} from '../creatures.js';
import {restPose, rests} from '../imp-rest.js';

const COLORS = {imp: 1, 'uranium imp': 2, homunculus: 2, quasit: 9, tengu: 6};
const NAMES = Object.keys(COLORS);
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../imp-rest-poses.js')).REST_POSES} : {};
for (const name of NAMES) {
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 105, color: COLORS[name]});
  if (!rests(a)) continue;
  const t0 = Date.now(), r = restPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') { if (n === 'hipsY') pose.hipsY = round(o); continue; } const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(18), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../imp-rest-poses.js', import.meta.url), `// Baked by tools/bake-imp-rest.mjs from imp-rest.js: each imp's squat, by name, as radians added to
// the standing frame. \`ok\`: every goal met to under 2 cm (only those squat in play); \`worst\`: the worst goal
// residual, in metres. Do not edit by hand: re-bake.
export const REST_POSES = ${JSON.stringify(out)};
`);
