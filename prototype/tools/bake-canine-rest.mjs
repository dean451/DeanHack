// Bakes every canine's curled sleep (canine-rest.js restPose) into canine-rest-poses.js, so the game never solves one
// mid-play (a solve takes 0.2 to 2 s). Run from prototype/ after changing a canine's body or the curl goals:
//   node tools/bake-canine-rest.mjs   (or names to re-bake just those: node tools/bake-canine-rest.mjs wolf jackal)
// A canine is marked ok only when every goal is met to under 2 cm; the others do not sleep in play.
import {createCreature} from '../creatures.js';
import {restPose, rests} from '../canine-rest.js';

const NAMES = ['jackal', 'werejackal', 'coyote', 'fox', 'wolf', 'warg', 'little dog', 'dog', 'large dog', 'dingo', 'werewolf', 'winter wolf cub', 'winter wolf', 'hell hound pup', 'hell hound'];
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../canine-rest-poses.js')).REST_POSES} : {};
for (const name of NAMES) {
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 100, color: 11});
  if (!rests(a)) continue;
  const t0 = Date.now(), r = restPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') { if (n === 'hipsY') pose.hipsY = round(o); continue; } const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(18), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../canine-rest-poses.js', import.meta.url), `// Baked by tools/bake-canine-rest.mjs from canine-rest.js: each canine's curled sleep, by name, as radians added to
// the standing frame. \`ok\`: every goal met to under 2 cm (only those sleep in play); \`worst\`: the worst goal
// residual, in metres. Do not edit by hand: re-bake.
export const REST_POSES = ${JSON.stringify(out)};
`);
