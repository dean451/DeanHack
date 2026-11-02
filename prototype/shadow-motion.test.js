import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createShadowMotion, positionSignature, IDLE_HZ} from './shadow-motion.js';
import {liveSource} from './live-source.js';

test('shadows follow at the tier\'s rate while something moves and drop to the idle rate while nothing does', () => {
  const s = createShadowMotion();
  let drawn = 0;
  for (let ms = 0; ms < 1000; ms += 1000 / 30) if (s.due(ms, `sig${Math.floor(ms)}`, true)) drawn++;
  assert.ok(drawn >= 29, `moving: every allowed redraw (${drawn})`);
  drawn = 0;
  for (let ms = 1000; ms < 2000; ms += 1000 / 30) if (s.due(ms, 'still', true)) drawn++;
  assert.ok(drawn <= IDLE_HZ + 2 && drawn >= IDLE_HZ - 2, `still: about ${IDLE_HZ} a second (${drawn})`);
  assert.equal(s.due(5000, 'still', false), false, 'never more often than the tier allows');
  assert.equal(s.due(6000, null, true), true, 'no signature (the demo room): the tier decides');
});

test('a position signature ignores float noise but sees a step', () => {
  const at = (x, z) => ({position: {x, y: 0, z}});
  assert.equal(positionSignature([at(1, 2), at(3, 4)]), positionSignature([at(1.0000001, 2), at(3, 4)]));
  assert.notEqual(positionSignature([at(1, 2), at(3, 4)]), positionSignature([at(1.01, 2), at(3, 4)]));
  assert.notEqual(positionSignature([at(1, 2)]), positionSignature([at(1, 2), at(3, 4)]), 'a monster arriving counts');
});

test('main.js gates the shadow redraw on live.js\'s motion signature', () => {
  const main = readFileSync(new URL('./main.js', import.meta.url), 'utf8'), live = liveSource();
  assert.match(main, /renderer\.shadowMap\.needsUpdate=shadowMotion\.due\(ms,live\.motionSignature,pacer\.shadowDue\(ms,quality\.tier\)\);/);
  assert.match(live, /get motionSignature\(\)\{if\(!active\|\|!hero\.target\)return null;/);
});
