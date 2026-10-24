// Bakes every dragon's sleeping pose (dragon-rest.js sleepPose) into dragon-sleep-poses.js, so the game
// never solves one mid-play (a solve takes 1 to 9 s a form). Run from prototype/ after changing a dragon's
// body or the sleep goals:  node tools/bake-dragon-sleep.mjs   (or name forms to re-bake just those:
// node tools/bake-dragon-sleep.mjs tiamat "baby draken")
// A form is marked ok only when every goal is met to under 2 cm and nothing is through the floor; the game
// lets only those fall asleep (dragon-sleep.js).
import {readFileSync, writeFileSync} from 'node:fs';
import * as THREE from 'three';
import {createCreature} from '../creatures.js';
import {sleepPose} from '../dragon-rest.js';
import {menaces} from '../dragon-menace.js';

const only = process.argv.slice(2).map(n => n.toLowerCase());
const names = JSON.parse(readFileSync(new URL('./creature-names.json', import.meta.url))).filter(m => m.letter === 'D');
const round = v => Math.round(v * 1e4) / 1e4;
const out = only.length ? {...(await import('../dragon-sleep-poses.js')).SLEEP_POSES} : {};
// each with its own glyph colour, as the game sends it (the colour picks the element, whose dressing changes the body)
for (const {name: n, color} of names) {
  const name = n.toLowerCase();
  if (only.length && !only.includes(name)) continue;
  const a = createCreature({name, symbol: 68, color});
  if (!menaces(a) || !a.joints) continue;
  const t0 = Date.now(), r = sleepPose(a, name);
  r.apply(r.pose); a.g.updateMatrixWorld(true);
  let worst = 0; for (const g of Object.values(r.goals)) worst = Math.max(worst, ...[g(r.points)].flat(2).map(Math.abs));
  let low = Infinity; const v = new THREE.Vector3();
  a.g.traverse(o => { if (!o.isMesh) return; if (o.isSkinnedMesh) o.skeleton.update(); const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); low = Math.min(low, v.y); } });
  const pose = {};
  for (const [n, o] of Object.entries(r.pose)) { const q = {}; for (const [ax, val] of Object.entries(o)) if (Math.abs(val) > 1e-5 || ax === 's') q[ax] = round(val); if (Object.keys(q).length) pose[n] = q; }
  out[name] = {ok: worst < .02 && low > -.012, worst: round(worst), low: round(low), pose};
  console.log(name.padEnd(24), out[name].ok ? 'ok ' : 'NO ', `worst ${(worst * 100).toFixed(1)} cm, lowest ${(low * 100).toFixed(1)} cm, ${Date.now() - t0} ms`);
}
writeFileSync(new URL('../dragon-sleep-poses.js', import.meta.url), `// Baked by tools/bake-dragon-sleep.mjs from dragon-rest.js: each dragon's sleeping pose, by species name.
// \`ok\`: every goal met to under 2 cm and nothing through the floor (only those fall asleep in play);
// \`worst\`, \`low\`: the worst goal residual and the lowest point, in metres. Do not edit by hand: re-bake.
export const SLEEP_POSES = ${JSON.stringify(out)};
`);
