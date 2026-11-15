// Bakes every lich's upright shuffle (lich-turn.js shufflePose with `upright`), over the left and the right foot, into
// lich-turn-poses.js, so the game never solves one mid-play (lich-turning.js plays them).
// Run from prototype/ after changing a lich's body or the shuffle's goals:  node tools/bake-lich-turn.mjs
// A lich is marked ok only when both shuffles meet every goal to under 2 cm; the others turn without the shuffle.
import {createCreature} from '../creatures.js';
import {shufflePose, turns} from '../lich-turn.js';
// the four liches of src/monst.c, with the cell colour the engine sends for each (as tools/bake-lich-rest.mjs)
const LICH_NAMES = [['lich', 2], ['demilich', 1], ['master lich', 5], ['arch-lich', 6]];

const round = v => Math.round(v * 1e4) / 1e4;
const {writeFileSync} = await import('node:fs');
const out = {};
for (const [name, color] of LICH_NAMES) {
  const a = createCreature({name, symbol: 76, color});
  a.g.updateMatrixWorld(true);
  if (!turns(a)) continue;
  const entry = {ok: true, worst: 0};
  for (const [key, side] of [['l', -1], ['r', 1]]) {
    const r = shufflePose(a, side, {upright: true}), worst = Math.max(...r.residuals.flat().map(Math.abs)), pose = {};
    for (const [n, o] of Object.entries(r.pose)) { if (typeof o !== 'object') continue; const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5) q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
    entry[key] = pose; entry.worst = Math.max(entry.worst, round(worst)); entry.ok &&= worst < .02;
  }
  out[name] = entry;
  console.log(name.padEnd(12), entry.ok ? 'ok ' : 'NO ', `worst ${(entry.worst * 100).toFixed(1)} cm`);
}
writeFileSync(new URL('../lich-turn-poses.js', import.meta.url), `// Baked by tools/bake-lich-turn.mjs from lich-turn.js: each lich's upright shuffle over the left (l) and right (r)
// foot, by name, as radians added to the standing frame. \`ok\`: both met every goal to under 2 cm; \`worst\`: the worst
// goal residual, in metres. Do not edit by hand: re-bake.
export const TURN_POSES = ${JSON.stringify(out)};
`);
