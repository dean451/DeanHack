import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

test('the ghost wails: its mouth is dragged open into a long black slot', () => {
  const c = createCreature({name: 'ghost', symbol: 32, color: 7});
  let face = null;
  c.g.traverse(o => { if (o.isMesh && o.userData.part === 'face') face = o; });
  face.geometry.computeBoundingBox();
  const b = face.geometry.boundingBox;
  assert(b.min.y < -0.12, 'the mouth hangs well below the sockets, not a small round hole');
});
