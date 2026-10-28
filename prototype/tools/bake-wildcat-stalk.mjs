// Bakes every wild cat's stalking crouch (wildcat-stalk.js stalkPose) into wildcat-stalk-poses.js, so the game
// never solves one mid-play (a solve takes seconds). Run from prototype/ after changing a wild cat's body or the
// crouch goals:
//   node tools/bake-wildcat-stalk.mjs   (or names to re-bake just those: node tools/bake-wildcat-stalk.mjs tiger)
// A cat is marked ok only when every goal is met to under 2 cm; the others do not stalk in play.
import {createFeline} from '../feline.js';
import {stalkPose, stalks} from '../wildcat-stalk.js';

const NAMES = ['jaguar', 'lynx', 'panther', 'tiger', 'displacer beast'];
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../wildcat-stalk-poses.js')).STALK_POSES} : {};
for (const name of NAMES) {
  if (only.length && !only.includes(name)) continue;
  const a = createFeline(name);
  if (!stalks(a)) continue;
  a.g.updateMatrixWorld(true); const t0 = Date.now(), r = stalkPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') { if (n === 'hipsY') pose.hipsY = round(o); continue; } const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(18), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../wildcat-stalk-poses.js', import.meta.url), `// Baked by tools/bake-wildcat-stalk.mjs from wildcat-stalk.js: each wild cat's stalking crouch, by name, as radians
// added to the standing frame. \`ok\`: every goal met to under 2 cm (only those stalk in play); \`worst\`: the worst
// goal residual, in metres. Do not edit by hand: re-bake.
export const STALK_POSES = ${JSON.stringify(out)};
`);
