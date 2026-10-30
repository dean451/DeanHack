import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hallucinating, remodelBudget, REMODEL_BUDGET} from './hallu-budget.js';
import {hueAt, createHuePass, HUE_PERIOD} from './hue-pass.js';

test('only hallucination caps how many monsters a frame are rebuilt', () => {
  assert.ok(hallucinating(['Hallu']) && hallucinating(['Stun', 'Hallucinating']));
  for (const c of [[], ['Stun'], null, undefined]) assert.ok(!hallucinating(c));
  assert.equal(remodelBudget(['Hallu']), REMODEL_BUDGET);
  assert.equal(remodelBudget(['Blind']), Infinity);
  assert.ok(REMODEL_BUDGET >= 1 && REMODEL_BUDGET <= 4);
});

test('live.js lets a re-glyphed monster keep its model once the frame\'s budget is spent', () => {
  const src = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  const reset = src.indexOf('remodels=remodelBudget(frame.player?.conditions)'), reuse = src.indexOf('if(!a&&remodels<=0)'), spend = src.indexOf('if(!a)remodels--;');
  const sweep = src.indexOf("const key=`${id}:${cell.glyph}`;seenActors.add(key)");
  assert.ok(reset > 0 && reset < sweep && sweep < reuse && reuse < spend, 'budget set per frame, then reuse, then spend');
});

test('the colour slide is a post pass that follows the old keyframes and is off when not hallucinating', () => {
  assert.deepEqual(hueAt(0), {hue: 0, sat: 1.4});
  const at = hueAt(.22 * HUE_PERIOD);
  assert.ok(Math.abs(at.hue - 95) < 1e-6 && Math.abs(at.sat - 1.9) < 1e-6);
  for (let t = 0; t < 2 * HUE_PERIOD; t += .05) { const {hue, sat} = hueAt(t); assert.ok(hue >= 0 && hue < 360 && sat >= 1.3 && sat <= 2, `${t}`); }
  const pass = createHuePass();
  assert.equal(pass.enabled, false);
  pass.update(true, .22 * HUE_PERIOD);
  assert.ok(pass.enabled && Math.abs(pass.uniforms.hue.value - 95) < 1e-6);
  pass.update(false, 1);
  assert.equal(pass.enabled, false);
  const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');
  assert.ok(!/status-hallu[^}]*backdrop-filter/.test(css), 'no full-window backdrop-filter while hallucinating');
});
