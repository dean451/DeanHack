// Bakes every kobold's crouch (kobold-rest.js restPose) into kobold-rest-poses.js, so the game never solves one
// mid-play (a solve takes 1 to 17 s). Run from prototype/ after changing a kobold's body or the crouch goals:
//   node tools/bake-kobold-rest.mjs   (or names to re-bake just those: node tools/bake-kobold-rest.mjs wolf jackal)
// A kobold is marked ok only when every goal is met to under 2 cm; the others do not squat in play.
import {KOBOLDS, createKobold} from '../kobold.js';
import {restPose, rests} from '../kobold-rest.js';

const NAMES = KOBOLDS;
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../kobold-rest-poses.js')).REST_POSES} : {};
for (const name of NAMES) {
  if (only.length && !only.includes(name)) continue;
  const a = createKobold(name);
  if (!rests(a)) continue;
  const t0 = Date.now(), r = restPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') { if (n === 'hipsY') pose.hipsY = round(o); continue; } const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(18), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../kobold-rest-poses.js', import.meta.url), `// Baked by tools/bake-kobold-rest.mjs from kobold-rest.js: each kobold's crouch, by name, as radians added to
// the standing frame. \`ok\`: every goal met to under 2 cm (only those crouch in play); \`worst\`: the worst goal
// residual, in metres. Do not edit by hand: re-bake.
export const REST_POSES = ${JSON.stringify(out)};
`);
