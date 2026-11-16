// Bakes every mummy's lurch (mummy-lurch.js lurchPose) into mummy-lurch-poses.js, so the game never solves one
// mid-play. Run from prototype/ after changing a mummy's body or the lurch's goals:
//   node tools/bake-mummy-lurch.mjs   (or names to re-bake just those: node tools/bake-mummy-lurch.mjs "ettin mummy")
// A mummy is marked ok only when every goal is met to under 2 cm; the others do not lurch in play.
import {createCreature} from '../creatures.js';
import {MUMMIES} from '../mummy.js';
import {lurchPose, lurches} from '../mummy-lurch.js';

const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../mummy-lurch-poses.js')).LURCH_POSES} : {};
for (const name of Object.keys(MUMMIES)) {
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 77, color: 7});
  a.g.updateMatrixWorld(true);
  if (!lurches(a)) continue;
  const t0 = Date.now(), r = lurchPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) {
    if (typeof o !== 'object') { if (Math.abs(o) > 1e-5) pose[n] = round(o); continue; }
    const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val);
    if (Object.keys(q).length) pose[n] = q;
  }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(16), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../mummy-lurch-poses.js', import.meta.url), `// Baked by tools/bake-mummy-lurch.mjs from mummy-lurch.js: each mummy's lurch at the top of its stiff-knee swing,
// by name, as radians added to the standing frame, the body's drop (hipsY) and its roll (body.z). \`ok\`: every goal
// met to under 2 cm (only those lurch in play); \`worst\`: the worst goal residual, in metres. Do not edit by hand: re-bake.
export const LURCH_POSES = ${JSON.stringify(out)};
`);
