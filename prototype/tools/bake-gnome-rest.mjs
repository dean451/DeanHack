// Bakes every gnome's slump (gnome-rest.js restPose) into gnome-rest-poses.js, so the game never solves one mid-play
// (a gnome's solve takes about 30 s in a browser). Run from prototype/ after changing a gnome's body or the sit goals:
//   node tools/bake-gnome-rest.mjs   (or names to re-bake just those: node tools/bake-gnome-rest.mjs "gnome lord")
// A member is marked ok only when every goal is met to under 2 cm; the others do not sit in play.
import {GNOMES, createGnome} from '../gnome.js';
import {restPose, rests} from '../gnome-rest.js';

const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../gnome-rest-poses.js')).REST_POSES} : {};
for (const name of GNOMES) {
  if (only.length && !only.includes(name)) continue;
  const a = createGnome(name);
  a.g.updateMatrixWorld(true);
  if (!rests(a)) continue;
  const t0 = Date.now(), r = restPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') { if (n === 'hipsY') pose.hipsY = round(o); continue; } const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(16), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../gnome-rest-poses.js', import.meta.url), `// Baked by tools/bake-gnome-rest.mjs from gnome-rest.js: each gnome's slumped sit, by name, as radians added to the
// standing frame. \`ok\`: every goal met to under 2 cm (only those sit in play); \`worst\`: the worst goal residual, in
// metres. Do not edit by hand: re-bake.
export const REST_POSES = ${JSON.stringify(out)};
`);
