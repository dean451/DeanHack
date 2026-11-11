// Bakes each rat's face wash (rat-wash.js washPose) into rat-wash-poses.js, so the game never solves one mid-play
// (the enormous rat's solve takes about 14 s). Run from prototype/ after changing a rat's body or the wash's goals:
//   node tools/bake-rat-wash.mjs   (or names to re-bake just those: node tools/bake-rat-wash.mjs "sewer rat")
// A rat is marked ok only when every goal is met to under 2 cm; the others do not wash in play.
import {createCreature} from '../creatures.js';
import {washPose, washes} from '../rat-wash.js';

const FAMILY = ['enormous rat', 'giant rat', 'rabid rat', 'sewer rat'];
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../rat-wash-poses.js')).WASH_POSES} : {};
for (const name of FAMILY) {
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 114, color: 7});
  a.g.updateMatrixWorld(true);
  if (!washes(a)) continue;
  const t0 = Date.now(), r = washPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) {
    if (typeof o !== 'object') { if (Math.abs(o) > 1e-5) pose[n] = round(o); continue; }
    const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val);
    if (Object.keys(q).length) pose[n] = q;
  }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(16), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../rat-wash-poses.js', import.meta.url), `// Baked by tools/bake-rat-wash.mjs from rat-wash.js: each rat's face wash, by name, as radians added to the standing
// frame, the body's drop and slide (hipsY, hipsZ) and its pitch (body.x). \`ok\`: every goal met to under 2 cm (only
// those wash in play); \`worst\`: the worst goal residual, in metres. Do not edit by hand: re-bake.
export const WASH_POSES = ${JSON.stringify(out)};
`);
