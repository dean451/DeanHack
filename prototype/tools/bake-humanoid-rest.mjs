// Bakes every sitting humanoid's slump (humanoid-rest.js restPose) into humanoid-rest-poses.js, so the game never
// solves one mid-play (a solve takes seconds). Run from prototype/ after changing a body or the sit goals:
//   node tools/bake-humanoid-rest.mjs   (or names to re-bake just those: node tools/bake-humanoid-rest.mjs hobbit)
// A member is marked ok only when every goal is met to under 2 cm; the others do not sit in play.
import {createHobbit} from '../hobbit.js';
import {createBugbear} from '../bugbear.js';
import {DWARVES, createDwarf} from '../dwarf.js';
import {GOBLINS, createGoblin} from '../goblin.js';
import {ORCS, createOrc} from '../orc.js';
import {restPose, rests} from '../humanoid-rest.js';

const MEMBERS = [['hobbit', createHobbit], ['bugbear', createBugbear], ...DWARVES.map(n => [n, () => createDwarf(n)]),
  ...GOBLINS.map(n => [n, () => createGoblin(n)]), ...ORCS.map(n => [n, () => createOrc(n)])];
const only = process.argv.slice(2).map(n => n.toLowerCase());
const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = only.length ? {...(await import('../humanoid-rest-poses.js')).REST_POSES} : {};
for (const [name, build] of MEMBERS) {
  if (only.length && !only.includes(name)) continue;
  const a = build();
  a.g.updateMatrixWorld(true);
  if (!rests(a)) continue;
  const t0 = Date.now(), r = restPose(a), worst = Math.max(...r.residuals.flat().map(Math.abs));
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') { if (n === 'hipsY') pose.hipsY = round(o); continue; } const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02, worst: round(worst), pose};
  console.log(name.padEnd(18), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../humanoid-rest-poses.js', import.meta.url), `// Baked by tools/bake-humanoid-rest.mjs from humanoid-rest.js: each humanoid's slumped sit, by name, as radians added
// to the standing frame. \`ok\`: every goal met to under 2 cm (only those sit in play); \`worst\`: the worst goal
// residual, in metres. Do not edit by hand: re-bake.
export const REST_POSES = ${JSON.stringify(out)};
`);
